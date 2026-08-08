import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { FoodCorrelation, FoodTag } from "@poo-diary/shared";
import { CreateDiaryDto } from "./dto/create-diary.dto";
import { UpdateDiaryDto } from "./dto/update-diary.dto";
import { DiaryEntryEntity } from "./diary.entity";

@Injectable()
export class DiaryService {
  constructor(
    @InjectRepository(DiaryEntryEntity)
    private readonly repo: Repository<DiaryEntryEntity>,
  ) {}

  findAll(userId: string): Promise<DiaryEntryEntity[]> {
    return this.repo.find({ where: { userId }, order: { recordedAt: "DESC" } });
  }

  async findOne(id: string, userId: string): Promise<DiaryEntryEntity> {
    const entry = await this.repo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException(`일지를 찾을 수 없습니다: ${id}`);
    return entry;
  }

  create(userId: string, dto: CreateDiaryDto): Promise<DiaryEntryEntity> {
    const entry = this.repo.create({
      userId,
      bristolType: dto.bristolType,
      color: dto.color,
      hasPain: dto.hasPain,
      painLevel: dto.painLevel ?? null,
      foods: dto.foods ?? [],
      memo: dto.memo ?? null,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
    });
    return this.repo.save(entry);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateDiaryDto,
  ): Promise<DiaryEntryEntity> {
    const existing = await this.findOne(id, userId);
    const merged = this.repo.merge(existing, {
      ...dto,
      recordedAt: dto.recordedAt
        ? new Date(dto.recordedAt)
        : existing.recordedAt,
    });
    return this.repo.save(merged);
  }

  async remove(id: string, userId: string): Promise<void> {
    const entry = await this.findOne(id, userId);
    await this.repo.remove(entry);
  }

  /** 식품 태그별 배변 상관관계 집계 */
  async getFoodCorrelation(userId: string): Promise<FoodCorrelation[]> {
    const entries = await this.repo.find({ where: { userId } });
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
