"use client";

import { DiaryForm } from "@/components/DiaryForm";
import { useCreateDiary } from "@/hooks/useDiary";
import { useRouter } from "next/navigation";

export default function NewDiaryPage() {
  const router = useRouter();
  const { mutate: createDiary, isPending } = useCreateDiary();

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
          New Record
        </p>
        <h1 className="text-3xl font-black text-amber-900">오늘 기록하기</h1>
      </header>

      <DiaryForm
        isPending={isPending}
        submitLabel="💾 저장하기"
        onSubmit={(value) =>
          createDiary(value, { onSuccess: () => router.push("/diary") })
        }
      />
    </main>
  );
}
