import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { CreateMenstrualCycleDto, FinishMenstrualCycleDto, MenstrualCycle } from "@poo-diary/shared";
import { FindOptionsWhere, IsNull, Repository } from "typeorm";
import type { AuthPrincipal } from "../auth/auth.types";
import { MenstrualCycleEntity } from "./menstrual-cycle.entity";

@Injectable()
export class CycleService {
  constructor(
    @InjectRepository(MenstrualCycleEntity)
    private readonly repo: Repository<MenstrualCycleEntity>,
  ) {}

  private ownerWhere(principal: AuthPrincipal): FindOptionsWhere<MenstrualCycleEntity> {
    return principal.kind === "mercury"
      ? { mercuryUserId: principal.mercuryUserId }
      : { userId: principal.legacyDeviceUserId, mercuryUserId: IsNull() };
  }

  private assertDate(value: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
      throw new BadRequestException("날짜는 YYYY-MM-DD 형식이어야 합니다.");
    }
  }

  private toDto(cycle: MenstrualCycleEntity): MenstrualCycle {
    return {
      id: cycle.id,
      startedAt: cycle.startedAt,
      endedAt: cycle.endedAt,
      createdAt: cycle.createdAt.toISOString(),
      updatedAt: cycle.updatedAt.toISOString(),
    };
  }

  async findAll(principal: AuthPrincipal): Promise<MenstrualCycle[]> {
    const cycles = await this.repo.find({
      where: this.ownerWhere(principal),
      order: { startedAt: "DESC" },
    });
    return cycles.map((cycle) => this.toDto(cycle));
  }

  async create(principal: AuthPrincipal, dto: CreateMenstrualCycleDto): Promise<MenstrualCycle> {
    this.assertDate(dto.startedAt);
    const openCycle = await this.repo.findOne({
      where: { ...this.ownerWhere(principal), endedAt: IsNull() },
      order: { startedAt: "DESC" },
    });
    if (openCycle) {
      throw new ConflictException("진행 중인 생리 기록을 먼저 종료해 주세요.");
    }
    const existing = await this.repo.findOne({
      where: { ...this.ownerWhere(principal), startedAt: dto.startedAt },
    });
    if (existing) return this.toDto(existing);
    const saved = await this.repo.save(this.repo.create({
      userId: principal.kind === "legacy" ? principal.legacyDeviceUserId : null,
      mercuryUserId: principal.kind === "mercury" ? principal.mercuryUserId : null,
      startedAt: dto.startedAt,
      endedAt: null,
    }));
    return this.toDto(saved);
  }

  async finish(principal: AuthPrincipal, id: string, dto: FinishMenstrualCycleDto): Promise<MenstrualCycle> {
    this.assertDate(dto.endedAt);
    const cycle = await this.repo.findOne({ where: { id, ...this.ownerWhere(principal) } });
    if (!cycle) throw new NotFoundException("생리 기록을 찾을 수 없습니다.");
    if (dto.endedAt < cycle.startedAt) {
      throw new BadRequestException("종료일은 시작일보다 빠를 수 없습니다.");
    }
    cycle.endedAt = dto.endedAt;
    return this.toDto(await this.repo.save(cycle));
  }

  async remove(principal: AuthPrincipal, id: string): Promise<void> {
    const cycle = await this.repo.findOne({ where: { id, ...this.ownerWhere(principal) } });
    if (!cycle) throw new NotFoundException("생리 기록을 찾을 수 없습니다.");
    await this.repo.remove(cycle);
  }
}
