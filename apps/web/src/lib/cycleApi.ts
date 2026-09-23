import { apiClient } from "@/lib/apiClient";
import type { CreateMenstrualCycleDto, FinishMenstrualCycleDto, MenstrualCycle } from "@poo-diary/shared";

export const cycleApi = {
  async getAll(): Promise<MenstrualCycle[]> {
    const { data } = await apiClient.get<MenstrualCycle[]>("/cycles");
    return Array.isArray(data) ? data : [];
  },
  async create(dto: CreateMenstrualCycleDto): Promise<MenstrualCycle> {
    const { data } = await apiClient.post<MenstrualCycle>("/cycles", dto);
    return data;
  },
  async finish(id: string, dto: FinishMenstrualCycleDto): Promise<MenstrualCycle> {
    const { data } = await apiClient.patch<MenstrualCycle>(`/cycles/${id}/end`, dto);
    return data;
  },
  async remove(id: string): Promise<void> { await apiClient.delete(`/cycles/${id}`); },
};
