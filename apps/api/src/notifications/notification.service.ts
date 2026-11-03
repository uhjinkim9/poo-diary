import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import webpush from "web-push";
import { IsNull, Repository } from "typeorm";
import type { AuthPrincipal } from "../auth/auth.types";
import { LegacyDeviceUserEntity, MercuryUserEntity } from "../auth/auth.entities";
import { SavePushSubscriptionDto } from "./dto/save-push-subscription.dto";
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";
import {
  NotificationDeliveryEntity,
  NotificationPreferenceEntity,
  PushSubscriptionEntity,
} from "./notification.entities";

export type NotificationMessage = {
  type: "morning-cheer" | "inactivity" | string;
  title: string;
  body: string;
  url?: string;
};

type NotificationPreference = Pick<
  NotificationPreferenceEntity,
  "morningEnabled" | "morningHour" | "inactivityEnabled" | "inactivityDays"
>;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PushSubscriptionEntity)
    private readonly subscriptions: Repository<PushSubscriptionEntity>,
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferences: Repository<NotificationPreferenceEntity>,
    @InjectRepository(NotificationDeliveryEntity)
    private readonly deliveries: Repository<NotificationDeliveryEntity>,
    @InjectRepository(LegacyDeviceUserEntity)
    private readonly legacyUsers: Repository<LegacyDeviceUserEntity>,
    @InjectRepository(MercuryUserEntity)
    private readonly mercuryUsers: Repository<MercuryUserEntity>,
  ) {}

  private get enabled(): boolean {
    return this.config.get<string>("PUSH_NOTIFICATIONS_ENABLED", "false") === "true";
  }

  private owner(principal: AuthPrincipal) {
    return principal.kind === "mercury"
      ? { userId: null, mercuryUserId: principal.mercuryUserId }
      : { userId: principal.legacyDeviceUserId, mercuryUserId: null };
  }

  private preferenceWhere(principal: AuthPrincipal) {
    return principal.kind === "mercury"
      ? { mercuryUserId: principal.mercuryUserId }
      : { userId: principal.legacyDeviceUserId, mercuryUserId: IsNull() };
  }

  private defaultPreference(): NotificationPreference {
    return {
      morningEnabled: false,
      morningHour: 8,
      inactivityEnabled: false,
      inactivityDays: 3,
    };
  }

  private koreaNow(now = new Date()): { date: string; hour: number } {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const value = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
    return { date: `${value("year")}-${value("month")}-${value("day")}`, hour: Number(value("hour")) };
  }

  private configureWebPush(): void {
    const publicKey = this.config.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.config.get<string>("VAPID_PRIVATE_KEY");
    const subject = this.config.get<string>("VAPID_SUBJECT", "mailto:admin@mercury-lab.uk");
    if (!publicKey || !privateKey) {
      throw new ServiceUnavailableException("Web Push VAPID key is not configured");
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  async getClientConfig(principal: AuthPrincipal) {
    // migration이 아직 적용되지 않은 배포 단계에서는 Profile 진입 자체가
    // 실패하지 않도록, 기능이 꺼진 동안 DB 알림 테이블을 조회하지 않는다.
    if (!this.enabled) {
      return {
        enabled: false,
        vapidPublicKey: "",
        preference: this.defaultPreference(),
      };
    }
    const preference = await this.getPreference(principal);
    return {
      enabled: this.enabled,
      vapidPublicKey: this.enabled
        ? this.config.get<string>("VAPID_PUBLIC_KEY", "")
        : "",
      preference,
    };
  }

  async getPreference(principal: AuthPrincipal): Promise<NotificationPreference> {
    const saved = await this.preferences.findOne({ where: this.preferenceWhere(principal) });
    return saved ?? this.defaultPreference();
  }

  async updatePreference(
    principal: AuthPrincipal,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    const existing = await this.preferences.findOne({ where: this.preferenceWhere(principal) });
    const saved = await this.preferences.save(
      this.preferences.create({
        ...(existing ?? this.owner(principal)),
        ...existing,
        ...dto,
      }),
    );
    return saved;
  }

  async saveSubscription(principal: AuthPrincipal, dto: SavePushSubscriptionDto): Promise<void> {
    const existing = await this.subscriptions.findOne({ where: { endpoint: dto.endpoint } });
    const expiration = dto.expirationTime ? new Date(dto.expirationTime) : null;
    await this.subscriptions.save(
      this.subscriptions.create({
        ...(existing ?? this.owner(principal)),
        ...existing,
        ...this.owner(principal),
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        expirationTime: expiration && !Number.isNaN(expiration.getTime()) ? expiration : null,
        enabled: true,
      }),
    );
  }

  async removeSubscription(principal: AuthPrincipal, endpoint: string): Promise<void> {
    await this.subscriptions.delete({ endpoint, ...this.preferenceWhere(principal) });
  }

  /** 다른 도메인 모듈이 주입받아 호출하는 단일 Web Push 발송 진입점이다. */
  async send(
    principal: AuthPrincipal,
    message: NotificationMessage,
    idempotencyKey: string,
  ): Promise<{ sent: number; skipped: boolean }> {
    if (!this.enabled) return { sent: 0, skipped: true };

    const alreadySent = await this.deliveries.findOne({ where: { idempotencyKey } });
    if (alreadySent) return { sent: alreadySent.subscriptionCount, skipped: true };

    const targets = await this.subscriptions.find({
      where: { ...this.preferenceWhere(principal), enabled: true },
    });
    if (targets.length === 0) return { sent: 0, skipped: true };

    let delivery: NotificationDeliveryEntity;
    try {
      delivery = await this.deliveries.save(
        this.deliveries.create({
          ...this.owner(principal),
          notificationType: message.type,
          idempotencyKey,
          status: "skipped",
          subscriptionCount: 0,
          lastError: null,
        }),
      );
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        return { sent: 0, skipped: true };
      }
      throw error;
    }

    try {
      this.configureWebPush();
      const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url ?? "/" });
      const outcomes = await Promise.allSettled(
        targets.map(async (target) => {
          try {
            await webpush.sendNotification(
              { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
              payload,
              { TTL: 60 * 60 * 12 },
            );
            return true;
          } catch (error) {
            const statusCode = typeof error === "object" && error && "statusCode" in error
              ? Number(error.statusCode)
              : 0;
            if (statusCode === 404 || statusCode === 410) {
              await this.subscriptions.update({ id: target.id }, { enabled: false });
            }
            throw error;
          }
        }),
      );
      const sent = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
      const failed = outcomes.find((outcome) => outcome.status === "rejected");
      await this.deliveries.update(
        { id: delivery.id },
        {
          status: sent > 0 ? "sent" : "failed",
          subscriptionCount: sent,
          lastError: failed && failed.status === "rejected" ? String(failed.reason).slice(0, 500) : null,
        },
      );
      return { sent, skipped: false };
    } catch (error) {
      await this.deliveries.update(
        { id: delivery.id },
        { status: "failed", lastError: String(error).slice(0, 500) },
      );
      throw error;
    }
  }

  async runScheduledNotifications(now = new Date()): Promise<{ morning: number; inactivity: number }> {
    if (!this.enabled) return { morning: 0, inactivity: 0 };
    const { date, hour } = this.koreaNow(now);
    const preferences = await this.preferences.find({
      where: [{ morningEnabled: true }, { inactivityEnabled: true }],
    });
    let morning = 0;
    let inactivity = 0;

    for (const preference of preferences) {
      const principal: AuthPrincipal = preference.mercuryUserId
        ? { kind: "mercury", mercuryUserId: preference.mercuryUserId }
        : { kind: "legacy", legacyDeviceUserId: preference.userId! };
      if (preference.morningEnabled && preference.morningHour === hour) {
        const result = await this.send(
          principal,
          { type: "morning-cheer", title: "Poo Diary", body: "오늘도 내 몸의 리듬을 가볍게 확인해 볼까요?", url: "/diary/new" },
          `morning-cheer:${preference.id}:${date}`,
        );
        morning += result.sent;
      }

      if (preference.inactivityEnabled) {
        const lastActiveAt = await this.lastActiveAt(principal);
        if (!lastActiveAt) continue;
        const inactiveForDays = Math.floor((now.getTime() - lastActiveAt.getTime()) / 86_400_000);
        if (inactiveForDays >= preference.inactivityDays) {
          const result = await this.send(
            principal,
            { type: "inactivity", title: "Poo Diary", body: "필요할 때 오늘의 기록을 편하게 남겨 주세요.", url: "/diary/new" },
            `inactivity:${preference.id}:${lastActiveAt.toISOString()}`,
          );
          inactivity += result.sent;
        }
      }
    }
    this.logger.log(`Scheduled push complete: morning=${morning}, inactivity=${inactivity}`);
    return { morning, inactivity };
  }

  private async lastActiveAt(principal: AuthPrincipal): Promise<Date | null> {
    if (principal.kind === "mercury") {
      const user = await this.mercuryUsers.findOne({ where: { id: principal.mercuryUserId } });
      return user?.lastActiveAt ?? user?.createdAt ?? null;
    }
    const user = await this.legacyUsers.findOne({ where: { id: principal.legacyDeviceUserId } });
    return user?.lastActiveAt ?? user?.createdAt ?? null;
  }
}
