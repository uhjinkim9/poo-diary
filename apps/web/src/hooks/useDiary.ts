import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateDiaryDto, UpdateDiaryDto } from "@poo-diary/shared";
import { diaryApi } from "@/lib/diaryApi";

export const DIARY_QUERY_KEYS = {
  all: ["diary"] as const,
  detail: (id: string) => ["diary", id] as const,
  foodCorrelation: ["diary", "stats", "food-correlation"] as const,
};

/** 전체 배변 일지 목록 조회 */
export function useDiaryList() {
  return useQuery({
    queryKey: DIARY_QUERY_KEYS.all,
    queryFn: diaryApi.getAll,
  });
}

/** 단건 배변 일지 조회 */
export function useDiaryDetail(id: string) {
  return useQuery({
    queryKey: DIARY_QUERY_KEYS.detail(id),
    queryFn: () => diaryApi.getById(id),
    enabled: !!id,
  });
}

/** 배변 일지 생성 */
export function useCreateDiary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDiaryDto) => diaryApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DIARY_QUERY_KEYS.all });
    },
  });
}

/** 배변 일지 수정 */
export function useUpdateDiary(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateDiaryDto) => diaryApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DIARY_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DIARY_QUERY_KEYS.detail(id) });
    },
  });
}

/** 배변 일지 삭제 */
export function useDeleteDiary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => diaryApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DIARY_QUERY_KEYS.all });
    },
  });
}

/** 식품별 배변 상관관계 통계 */
export function useFoodCorrelation() {
  return useQuery({
    queryKey: DIARY_QUERY_KEYS.foodCorrelation,
    queryFn: diaryApi.getFoodCorrelation,
  });
}
