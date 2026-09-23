import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, IsNull, Repository } from "typeorm";
import type {
  DailyBowelStatus,
  FoodCorrelation,
  FoodTag,
} from "@poo-diary/shared";
import type { AuthPrincipal } from "../auth/auth.types";
import { CreateDiaryDto } from "./dto/create-diary.dto";
import { UpdateDiaryDto } from "./dto/update-diary.dto";
import { DiaryEntryEntity } from "./diary.entity";
import { DailyBowelStatusEntity } from "./daily-bowel-status.entity";
import { MenstrualCycleEntity } from "../cycle/menstrual-cycle.entity";

@Injectable()
export class DiaryService {
  constructor(
    @InjectRepository(DiaryEntryEntity)
    private readonly repo: Repository<DiaryEntryEntity>,
    @InjectRepository(DailyBowelStatusEntity)
    private readonly dailyStatusRepo: Repository<DailyBowelStatusEntity>,
    @InjectRepository(MenstrualCycleEntity)
    private readonly cycleRepo: Repository<MenstrualCycleEntity>,
  ) {}

  private ownerWhere(principal: AuthPrincipal): FindOptionsWhere<DiaryEntryEntity> {
    return principal.kind === "mercury"
      ? { mercuryUserId: principal.mercuryUserId }
      : { userId: principal.legacyDeviceUserId, mercuryUserId: IsNull() };
  }

  private dailyStatusOwnerWhere(
    principal: AuthPrincipal,
  ): FindOptionsWhere<DailyBowelStatusEntity> {
    return principal.kind === "mercury"
      ? { mercuryUserId: principal.mercuryUserId }
      : { userId: principal.legacyDeviceUserId, mercuryUserId: IsNull() };
  }

  private dateInKorea(value: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  private assertStatusDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException("날짜는 YYYY-MM-DD 형식이어야 합니다.");
    }
  }

  private toDailyStatus(
    status: DailyBowelStatusEntity,
  ): DailyBowelStatus {
    return {
      date: status.statusDate,
      noBowelMovement: status.noBowelMovement,
    };
  }

  /** 주기 기록이 있는 경우에만 새 배변 기록의 생리 일차를 자동 보완한다. */
  private async menstrualDayFor(
    principal: AuthPrincipal,
    recordedAt: Date,
  ): Promise<number | null> {
    const recordDate = this.dateInKorea(recordedAt);
    const owner = principal.kind === "mercury"
      ? { mercuryUserId: principal.mercuryUserId }
      : { userId: principal.legacyDeviceUserId, mercuryUserId: IsNull() };
    const cycle = await this.cycleRepo
      .createQueryBuilder("cycle")
      .where(owner)
      .andWhere('cycle."startedAt" <= :recordDate', { recordDate })
      .andWhere('(cycle."endedAt" IS NULL OR cycle."endedAt" >= :recordDate)')
      .orderBy('cycle."startedAt"', "DESC")
      .getOne();
    if (!cycle) return null;
    const start = Date.parse(`${cycle.startedAt}T00:00:00Z`);
    const date = Date.parse(`${recordDate}T00:00:00Z`);
    return Math.min(7, Math.floor((date - start) / 86_400_000) + 1);
  }

  findAll(principal: AuthPrincipal): Promise<DiaryEntryEntity[]> {
    return this.repo.find({
      where: this.ownerWhere(principal),
      order: { recordedAt: "DESC" },
    });
  }

  async findOne(id: string, principal: AuthPrincipal): Promise<DiaryEntryEntity> {
    const entry = await this.repo.findOne({
      where: { id, ...this.ownerWhere(principal) },
    });
    if (!entry) throw new NotFoundException(`일지를 찾을 수 없습니다: ${id}`);
    return entry;
  }

  async create(
    principal: AuthPrincipal,
    dto: CreateDiaryDto,
  ): Promise<DiaryEntryEntity> {
    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();
    const entry = this.repo.create({
      userId: principal.kind === "legacy" ? principal.legacyDeviceUserId : null,
      mercuryUserId: principal.kind === "mercury" ? principal.mercuryUserId : null,
      bristolType: dto.bristolType,
      color: dto.color,
      hasPain: dto.hasPain,
      painLevel: dto.painLevel ?? null,
      foods: dto.foods ?? [],
      mealNote: dto.mealNote ?? null,
      menstrualDay:
        dto.menstrualDay === undefined
          ? await this.menstrualDayFor(principal, recordedAt)
          : dto.menstrualDay,
      hadEnoughSleep: dto.hadEnoughSleep ?? false,
      overate: dto.overate ?? false,
      hadUrgency: dto.hadUrgency ?? false,
      wasHardToHold: dto.wasHardToHold ?? false,
      hadToStrain: dto.hadToStrain ?? false,
      feltIncomplete: dto.feltIncomplete ?? false,
      feltRelieved: dto.feltRelieved ?? false,
      spentLongInToilet: dto.spentLongInToilet ?? false,
      memo: dto.memo ?? null,
      recordedAt,
    });
    const saved = await this.repo.save(entry);
    await this.clearNoBowelMovement(principal, this.dateInKorea(recordedAt));
    return saved;
  }

  async update(
    id: string,
    principal: AuthPrincipal,
    dto: UpdateDiaryDto,
  ): Promise<DiaryEntryEntity> {
    const existing = await this.findOne(id, principal);
    const merged = this.repo.merge(existing, {
      ...dto,
      recordedAt: dto.recordedAt
        ? new Date(dto.recordedAt)
        : existing.recordedAt,
    });
    const saved = await this.repo.save(merged);
    await this.clearNoBowelMovement(
      principal,
      this.dateInKorea(saved.recordedAt),
    );
    return saved;
  }

  async remove(id: string, principal: AuthPrincipal): Promise<void> {
    const entry = await this.findOne(id, principal);
    await this.repo.remove(entry);
  }

  async findDailyStatuses(
    principal: AuthPrincipal,
  ): Promise<DailyBowelStatus[]> {
    const statuses = await this.dailyStatusRepo.find({
      where: this.dailyStatusOwnerWhere(principal),
      order: { statusDate: "DESC" },
    });
    return statuses.map((status) => this.toDailyStatus(status));
  }

  async setNoBowelMovement(
    principal: AuthPrincipal,
    date: string,
    noBowelMovement: boolean,
  ): Promise<DailyBowelStatus | null> {
    this.assertStatusDate(date);
    if (!noBowelMovement) {
      await this.clearNoBowelMovement(principal, date);
      return null;
    }

    const entries = await this.repo.find({ where: this.ownerWhere(principal) });
    if (entries.some((entry) => this.dateInKorea(entry.recordedAt) === date)) {
      throw new ConflictException(
        "이 날짜에는 이미 배변 기록이 있어 ‘배변 없음’으로 표시할 수 없습니다.",
      );
    }

    const where = {
      ...this.dailyStatusOwnerWhere(principal),
      statusDate: date,
    };
    const existing = await this.dailyStatusRepo.findOne({ where });
    const saved = await this.dailyStatusRepo.save(
      existing ??
        this.dailyStatusRepo.create({
          userId: principal.kind === "legacy" ? principal.legacyDeviceUserId : null,
          mercuryUserId:
            principal.kind === "mercury" ? principal.mercuryUserId : null,
          statusDate: date,
          noBowelMovement: true,
        }),
    );
    return this.toDailyStatus(saved);
  }

  private async clearNoBowelMovement(
    principal: AuthPrincipal,
    date: string,
  ): Promise<void> {
    await this.dailyStatusRepo.delete({
      ...this.dailyStatusOwnerWhere(principal),
      statusDate: date,
    });
  }

  /** 식품 태그별 배변 상관관계 집계 */
  async getFoodCorrelation(principal: AuthPrincipal): Promise<FoodCorrelation[]> {
    const entries = await this.repo.find({ where: this.ownerWhere(principal) });
    const map = new Map<
      FoodTag,
      { bristolSum: number; painCount: number; count: number }
    >();

    for (const entry of entries) {
      for (const food of entry.foods as FoodTag[]) {
        const cur = map.get(food) ?? { bristolSum: 0, painCount: 0, count: 0 };
        map.set(food, {
          bristolSum: cur.bristolSum + entry.bristolType,
          painCount: cur.painCount + (entry.hasPain ? 1 : 0),
          count: cur.count + 1,
        });
      }
    }

    return Array.from(map.entries())
      .map(([food, { bristolSum, painCount, count }]) => ({
        food,
        count,
        avgBristolType: Math.round((bristolSum / count) * 10) / 10,
        painRate: Math.round((painCount / count) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
