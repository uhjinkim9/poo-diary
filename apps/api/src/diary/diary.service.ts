import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, IsNull, Repository } from "typeorm";
import type { FoodCorrelation, FoodTag } from "@poo-diary/shared";
import type { AuthPrincipal } from "../auth/auth.types";
import { CreateDiaryDto } from "./dto/create-diary.dto";
import { UpdateDiaryDto } from "./dto/update-diary.dto";
import { DiaryEntryEntity } from "./diary.entity";

@Injectable()
export class DiaryService {
  constructor(
    @InjectRepository(DiaryEntryEntity)
    private readonly repo: Repository<DiaryEntryEntity>,
  ) {}

  private ownerWhere(principal: AuthPrincipal): FindOptionsWhere<DiaryEntryEntity> {
    return principal.kind === "mercury"
      ? { mercuryUserId: principal.mercuryUserId }
      : { userId: principal.legacyDeviceUserId, mercuryUserId: IsNull() };
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

  create(principal: AuthPrincipal, dto: CreateDiaryDto): Promise<DiaryEntryEntity> {
    const entry = this.repo.create({
      userId: principal.kind === "legacy" ? principal.legacyDeviceUserId : null,
      mercuryUserId: principal.kind === "mercury" ? principal.mercuryUserId : null,
      bristolType: dto.bristolType,
      color: dto.color,
      hasPain: dto.hasPain,
      painLevel: dto.painLevel ?? null,
      foods: dto.foods ?? [],
      mealNote: dto.mealNote ?? null,
      menstrualDay: dto.menstrualDay ?? null,
      hadEnoughSleep: dto.hadEnoughSleep ?? false,
      overate: dto.overate ?? false,
      memo: dto.memo ?? null,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
    });
    return this.repo.save(entry);
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
    return this.repo.save(merged);
  }

  async remove(id: string, principal: AuthPrincipal): Promise<void> {
    const entry = await this.findOne(id, principal);
    await this.repo.remove(entry);
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
