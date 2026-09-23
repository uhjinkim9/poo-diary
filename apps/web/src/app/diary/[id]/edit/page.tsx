"use client";

import { DiaryForm } from "@/components/DiaryForm";
import {
  useDeleteDiary,
  useDiaryDetail,
  useUpdateDiary,
} from "@/hooks/useDiary";
import type { CreateDiaryDto } from "@poo-diary/shared";
import { useParams, useRouter } from "next/navigation";

export default function EditDiaryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data: entry, isLoading, isError } = useDiaryDetail(id);
  const { mutate: updateDiary, isPending } = useUpdateDiary(id);
  const {
    mutate: deleteDiary,
    isPending: isDeleting,
    isError: isDeleteError,
  } = useDeleteDiary();

  function remove() {
    if (!confirm("이 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.")) {
      return;
    }
    deleteDiary(id, { onSuccess: () => router.replace("/diary") });
  }

  if (isLoading) {
    return (
      <main className="min-h-[100dvh] p-5 max-w-md mx-auto flex flex-col items-center justify-center gap-3 text-amber-600">
        <span className="text-4xl animate-bounce">💩</span>
        <p className="text-sm">기록을 불러오는 중...</p>
      </main>
    );
  }

  if (isError || !entry) {
    return (
      <main className="min-h-[100dvh] p-5 max-w-md mx-auto flex flex-col items-center justify-center gap-4">
        <div className="card p-6 text-center text-red-400 w-full">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="text-sm">기록을 불러오지 못했어요.</p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-amber-700"
        >
          ← 돌아가기
        </button>
      </main>
    );
  }

  const initialValue: CreateDiaryDto = {
    bristolType: entry.bristolType,
    color: entry.color,
    hasPain: entry.hasPain,
    painLevel: entry.painLevel,
    foods: entry.foods,
    mealNote: entry.mealNote,
    menstrualDay: entry.menstrualDay,
    hadEnoughSleep: entry.hadEnoughSleep,
    overate: entry.overate,
    hadUrgency: entry.hadUrgency,
    wasHardToHold: entry.wasHardToHold,
    hadToStrain: entry.hadToStrain,
    feltIncomplete: entry.feltIncomplete,
    feltRelieved: entry.feltRelieved,
    spentLongInToilet: entry.spentLongInToilet,
    memo: entry.memo,
    recordedAt: entry.recordedAt,
  };

  return (
    <main className="min-h-[100dvh] p-5 max-w-md mx-auto">
      <header className="pt-10 pb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-amber-600 text-sm mb-3 flex items-center gap-1"
        >
          ← 뒤로
        </button>
        <p className="text-xs font-medium text-amber-500 tracking-widest uppercase mb-1">
          Edit Record
        </p>
        <h1 className="text-3xl font-black text-amber-900">기록 수정하기</h1>
      </header>

      <DiaryForm
        initialValue={initialValue}
        isPending={isPending || isDeleting}
        allowRecordedAtEdit
        submitLabel="✏️ 수정 완료"
        onSubmit={(value) =>
          updateDiary(value, { onSuccess: () => router.push("/diary") })
        }
      />

      <section className="mt-8 border-t border-red-100 pt-5 pb-8">
        <p className="mb-3 text-xs leading-relaxed text-gray-400">
          삭제한 기록은 복구할 수 없어요.
        </p>
        {isDeleteError && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-500">
            기록을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <button
          type="button"
          disabled={isDeleting || isPending}
          onClick={remove}
          className="w-full rounded-2xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-500 transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          {isDeleting ? "삭제하는 중..." : "이 기록 삭제하기"}
        </button>
      </section>
    </main>
  );
}
