import { apiClient } from "@/lib/apiClient";
import type {
  CreateDiaryDto,
  DiaryEntry,
  FoodCorrelation,
  UpdateDiaryDto,
} from "@poo-diary/shared";

export const diaryApi = {
  getAll: async (): Promise<DiaryEntry[]> => {
    const { data } = await apiClient.get<DiaryEntry[]>("/diary");
    return Array.isArray(data) ? data : [];
  },

  getById: async (id: string): Promise<DiaryEntry> => {
    const { data } = await apiClient.get<DiaryEntry>(`/diary/${id}`);
    return data;
  },

  getFoodCorrelation: async (): Promise<FoodCorrelation[]> => {
    const { data } = await apiClient.get<FoodCorrelation[]>(
      "/diary/stats/food-correlation",
    );
    return Array.isArray(data) ? data : [];
  },

  create: async (dto: CreateDiaryDto): Promise<DiaryEntry> => {
    const { data } = await apiClient.post<DiaryEntry>("/diary", dto);
    return data;
  },

  update: async (id: string, dto: UpdateDiaryDto): Promise<DiaryEntry> => {
    const { data } = await apiClient.patch<DiaryEntry>(`/diary/${id}`, dto);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/diary/${id}`);
  },
};
