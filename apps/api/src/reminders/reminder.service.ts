import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { IsNull, Repository } from "typeorm";
import type { AuthPrincipal } from "../auth/auth.types";
import { MenstrualCycleEntity } from "../cycle/menstrual-cycle.entity";
import { UpdateDiscordReminderDto } from "./dto/update-discord-reminder.dto";
import { DiscordReminderDeliveryEntity, DiscordReminderSettingEntity } from "./reminder.entities";

type Owner = { userId: string | null; mercuryUserId: string | null };
type Config = { enabled: boolean; webhookConfigured: boolean; menstrualEnabled: boolean; bowelCheerEnabled: boolean };

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(DiscordReminderSettingEntity) private readonly settings: Repository<DiscordReminderSettingEntity>,
    @InjectRepository(DiscordReminderDeliveryEntity) private readonly deliveries: Repository<DiscordReminderDeliveryEntity>,
    @InjectRepository(MenstrualCycleEntity) private readonly cycles: Repository<MenstrualCycleEntity>,
  ) {}

  private get enabled() { return this.config.get<string>("DISCORD_REMINDERS_ENABLED", "false") === "true"; }
  private owner(principal: AuthPrincipal): Owner { return principal.kind === "mercury" ? { userId: null, mercuryUserId: principal.mercuryUserId } : { userId: principal.legacyDeviceUserId, mercuryUserId: null }; }
  private where(principal: AuthPrincipal) { return principal.kind === "mercury" ? { mercuryUserId: principal.mercuryUserId } : { userId: principal.legacyDeviceUserId, mercuryUserId: IsNull() }; }
  private toConfig(setting?: DiscordReminderSettingEntity | null): Config { return { enabled: this.enabled, webhookConfigured: Boolean(setting?.webhookCiphertext), menstrualEnabled: setting?.menstrualEnabled ?? false, bowelCheerEnabled: setting?.bowelCheerEnabled ?? false }; }

  private encryptionKey(): Buffer {
    const raw = this.config.get<string>("DISCORD_WEBHOOK_ENCRYPTION_KEY");
    if (!raw) throw new ServiceUnavailableException("Discord webhook encryption key is not configured");
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) throw new ServiceUnavailableException("Discord webhook encryption key is invalid");
    return key;
  }

  private assertDiscordWebhook(value: string) {
    const url = new URL(value);
    if (!/^(discord\.com|(?:canary|ptb)\.discord\.com|discordapp\.com)$/.test(url.hostname) || !url.pathname.startsWith("/api/webhooks/")) {
      throw new BadRequestException("Discord Incoming Webhook URL만 사용할 수 있어요.");
    }
  }

  private encrypt(value: string) {
    const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return { webhookCiphertext: ciphertext.toString("base64"), webhookIv: iv.toString("base64"), webhookAuthTag: cipher.getAuthTag().toString("base64") };
  }
  private decrypt(setting: DiscordReminderSettingEntity) {
    if (!setting.webhookCiphertext || !setting.webhookIv || !setting.webhookAuthTag) return null;
    const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey(), Buffer.from(setting.webhookIv, "base64"));
    decipher.setAuthTag(Buffer.from(setting.webhookAuthTag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(setting.webhookCiphertext, "base64")), decipher.final()]).toString("utf8");
  }

  async getConfig(principal: AuthPrincipal): Promise<Config> { return this.toConfig(await this.settings.findOne({ where: this.where(principal) })); }
  async update(principal: AuthPrincipal, dto: UpdateDiscordReminderDto): Promise<Config> {
    const existing = await this.settings.findOne({ where: this.where(principal) });
    if (dto.webhookUrl) this.assertDiscordWebhook(dto.webhookUrl);
    const saved = await this.settings.save(this.settings.create({ ...(existing ?? this.owner(principal)), ...existing, ...(dto.webhookUrl ? this.encrypt(dto.webhookUrl) : {}), menstrualEnabled: dto.menstrualEnabled ?? existing?.menstrualEnabled ?? false, bowelCheerEnabled: dto.bowelCheerEnabled ?? existing?.bowelCheerEnabled ?? false }));
    return this.toConfig(saved);
  }
  async test(principal: AuthPrincipal) { return this.send(principal, "test", "🧪 Poo Diary 테스트 알림", "Discord 리마인더 연결이 정상이에요.", `test:${Date.now()}`); }

  private async send(principal: AuthPrincipal, type: string, title: string, body: string, idempotencyKey: string) {
    if (!this.enabled) return { sent: false, skipped: true };
    const setting = await this.settings.findOne({ where: this.where(principal) });
    if (!setting) return { sent: false, skipped: true };
    try { await this.deliveries.insert({ ...this.owner(principal), reminderType: type, idempotencyKey, status: "skipped", lastError: null }); }
    catch (error) { if (typeof error === "object" && error && "code" in error && error.code === "23505") return { sent: false, skipped: true }; throw error; }
    try {
      const webhook = this.decrypt(setting);
      if (!webhook) return { sent: false, skipped: true };
      const response = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: `${title}\n${body}`, allowed_mentions: { parse: [] } }) });
      if (!response.ok) throw new Error(`Discord webhook returned ${response.status}`);
      await this.deliveries.update({ idempotencyKey }, { status: "sent" });
      return { sent: true, skipped: false };
    } catch (error) { await this.deliveries.update({ idempotencyKey }, { status: "failed", lastError: String(error).slice(0, 500) }); throw error; }
  }

  private koreaDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
  private add(date: string, days: number) { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
  private diff(from: string, to: string) { return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000); }

  async runScheduledReminders(now = new Date()) {
    if (!this.enabled || new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(now) !== "8") return { menstrual: 0, bowel: 0 };
    const today = this.koreaDate(now); let menstrual = 0; let bowel = 0;
    const settings = await this.settings.find({ where: [{ menstrualEnabled: true }, { bowelCheerEnabled: true }] });
    for (const setting of settings) {
      const principal: AuthPrincipal = setting.mercuryUserId ? { kind: "mercury", mercuryUserId: setting.mercuryUserId } : { kind: "legacy", legacyDeviceUserId: setting.userId! };
      if (setting.bowelCheerEnabled) { const sent = await this.send(principal, "bowel-cheer", "💩 오늘의 배변 응원", "오늘도 내 몸의 리듬을 가볍게 살펴볼까요?", `bowel-cheer:${setting.id}:${today}`); bowel += Number(sent.sent); }
      if (!setting.menstrualEnabled) continue;
      const cycles = await this.cycles.find({ where: this.where(principal), order: { startedAt: "ASC" } });
      const intervals = cycles.slice(1).map((cycle, index) => this.diff(cycles[index].startedAt, cycle.startedAt)).filter((days) => days > 0 && days <= 90).slice(-6);
      const average = intervals.length ? Math.round(intervals.reduce((sum, days) => sum + days, 0) / intervals.length) : null;
      const latest = cycles.at(-1); if (!latest || !average) continue;
      const expected = this.add(latest.startedAt, average); const remaining = this.diff(today, expected);
      if (![7, 3, 0].includes(remaining)) continue;
      const label = remaining === 0 ? "오늘" : `${remaining}일 전`;
      const sent = await this.send(principal, "menstrual", "🌷 생리 예정 알림", `평균 주기 기준 다음 생리 예정일이 ${label}이에요. (${expected.replace(/-/g, ".")})`, `menstrual:${setting.id}:${expected}:${remaining}`);
      menstrual += Number(sent.sent);
    }
    this.logger.log(`Discord reminders complete: menstrual=${menstrual}, bowel=${bowel}`);
    return { menstrual, bowel };
  }
}
