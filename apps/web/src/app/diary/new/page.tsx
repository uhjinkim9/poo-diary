"use client";

import { useCreateDiary } from "@/hooks/useDiary";
import {
  BRISTOL_LABELS,
  FOOD_TAG_META,
  type BristolType,
  type CreateDiaryDto,
  type FoodTag,
  type StoolColor,
} from "@poo-diary/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

const BRISTOL_ITEMS: { type: BristolType; emoji: string }[] = [
  { type: 1, emoji: "🪨" },
  { type: 2, emoji: "🟤" },
  { type: 3, emoji: "💪" },
  { type: 4, emoji: "✨" },
  { type: 5, emoji: "💧" },
  { type: 6, emoji: "🌊" },
  { type: 7, emoji: "🚿" },
];

const COLOR_OPTIONS: { value: StoolColor; label: string; hex: string }[] = [
  { value: "brown", label: "갈색", hex: "#8B4513" },
  { value: "dark-brown", label: "진갈색", hex: "#3E1A08" },
  { value: "yellow", label: "노란색", hex: "#F4D03F" },
  { value: "green", label: "녹색", hex: "#27AE60" },
  { value: "red", label: "붉은색", hex: "#C0392B" },
  { value: "black", label: "검은색", hex: "#1A1A1A" },
  { value: "white", label: "흰색", hex: "#D5D8DC" },
];

const FOOD_TAGS = Object.keys(FOOD_TAG_META) as FoodTag[];

export default function NewDiaryPage() {
  const router = useRouter();
  const { mutate: createDiary, isPending } = useCreateDiary();

  const [form, setForm] = useState<CreateDiaryDto>({
    bristolType: 4,
    color: "brown",
    hasPain: false,
    foods: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDiary(form, { onSuccess: () => router.push("/diary") });
  };

  return (
    <main className="min-h-[100dvh] p-5 max-w-md mx-auto">
      <header className="pt-10 pb-6">
        <button
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 브리스톨 척도 */}
        <section className="card p-5">
          <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-4">
            형태 선택 (브리스톨 척도)
          </h2>
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {BRISTOL_ITEMS.map(({ type, emoji }) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, bristolType: type }))}
                className={`flex flex-col items-center py-2 rounded-2xl border-2 transition-all duration-150 ${
                  form.bristolType === type
                    ? "border-amber-700 bg-amber-50 scale-105 shadow-sm"
                    : "border-transparent bg-gray-50"
                }`}
              >
                <span className="text-2xl leading-none mb-1">{emoji}</span>
                <span className="text-[10px] font-bold text-amber-800">
                  {type}
                </span>
              </button>
            ))}
          </div>
          <div className="bg-amber-50 rounded-xl px-3 py-2 text-center">
            <span className="text-xs text-amber-700 font-medium">
              {BRISTOL_LABELS[form.bristolType]}
            </span>
          </div>
        </section>

        {/* 색상 */}
        <section className="card p-5">
          <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-4">
            색상 선택
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {COLOR_OPTIONS.map(({ value, label, hex }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: value }))}
                className="flex flex-col items-center gap-1.5"
                title={label}
              >
                <span
                  className={`w-9 h-9 rounded-full border-4 transition-all duration-150 ${
                    form.color === value
                      ? "border-amber-700 scale-110 shadow-md"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: hex }}
                />
                <span
                  className={`text-[10px] font-medium ${form.color === value ? "text-amber-800" : "text-gray-400"}`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 식단 */}
        <section className="card p-5">
          <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-1">
            오늘 먹은 것 (선택)
          </h2>
          <p className="text-[11px] text-gray-400 mb-4">
            선택하면 나중에 식단-배변 상관관계를 분석해드려요
          </p>
          <div className="grid grid-cols-4 gap-2">
            {FOOD_TAGS.map((tag) => {
              const { label, emoji } = FOOD_TAG_META[tag];
              const selected = (form.foods ?? []).includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      foods: selected
                        ? (f.foods ?? []).filter((t) => t !== tag)
                        : [...(f.foods ?? []), tag],
                    }))
                  }
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-2xl border-2 text-center transition-all duration-150 ${
                    selected
                      ? "border-amber-600 bg-amber-50 scale-105"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  <span
                    className={`text-[10px] font-medium leading-tight ${selected ? "text-amber-800" : "text-gray-400"}`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          {(form.foods ?? []).length > 0 && (
            <p className="text-xs text-amber-600 mt-3">
              선택됨:{" "}
              {(form.foods ?? []).map((t) => FOOD_TAG_META[t].emoji).join(" ")}
            </p>
          )}
        </section>

        {/* 통증 여부 */}
        <section className="card p-5">
          <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-4">
            통증 여부
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {([false, true] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setForm((f) => ({ ...f, hasPain: val }))}
                className={`py-3 rounded-2xl border-2 font-semibold text-sm transition-all duration-150 ${
                  form.hasPain === val
                    ? val
                      ? "border-red-400 bg-red-50 text-red-600"
                      : "border-green-400 bg-green-50 text-green-700"
                    : "border-gray-200 bg-gray-50 text-gray-400"
                }`}
              >
                {val ? "😣 통증 있음" : "😊 괜찮아요"}
              </button>
            ))}
          </div>
          {form.hasPain && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">통증 강도</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, painLevel: level }))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                      form.painLevel === level
                        ? "border-red-400 bg-red-50 text-red-600"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">약함</span>
                <span className="text-[10px] text-gray-400">심함</span>
              </div>
            </div>
          )}
        </section>

        {/* 메모 */}
        <section className="card p-5">
          <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-4">
            메모 (선택)
          </h2>
          <textarea
            value={form.memo ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            placeholder="식단, 컨디션 등 특이사항..."
            rows={3}
            maxLength={300}
            className="w-full bg-gray-50 border border-amber-100 rounded-2xl p-3 text-sm resize-none focus:outline-none focus:border-amber-400 placeholder:text-gray-300 transition-colors"
          />
          <p className="text-right text-[10px] text-gray-300 mt-1">
            {(form.memo ?? "").length}/300
          </p>
        </section>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary w-full py-4 text-lg"
        >
          {isPending ? "저장 중..." : "💾 저장하기"}
        </button>
        <div className="h-2" />
      </form>
    </main>
  );
}
