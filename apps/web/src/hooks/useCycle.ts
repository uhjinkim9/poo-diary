import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMenstrualCycleDto, FinishMenstrualCycleDto } from "@poo-diary/shared";
import { cycleApi } from "@/lib/cycleApi";

export const CYCLE_QUERY_KEY = ["menstrual-cycles"] as const;
export function useCycles() { return useQuery({ queryKey: CYCLE_QUERY_KEY, queryFn: cycleApi.getAll }); }
export function useCreateCycle() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (dto: CreateMenstrualCycleDto) => cycleApi.create(dto), onSuccess: () => client.invalidateQueries({ queryKey: CYCLE_QUERY_KEY }) });
}
export function useFinishCycle() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, dto }: { id: string; dto: FinishMenstrualCycleDto }) => cycleApi.finish(id, dto), onSuccess: () => client.invalidateQueries({ queryKey: CYCLE_QUERY_KEY }) });
}
export function useDeleteCycle() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => cycleApi.remove(id), onSuccess: () => client.invalidateQueries({ queryKey: CYCLE_QUERY_KEY }) });
}
