"use client";

import {
  BRISTOL_LABELS,
  FOOD_TAG_META,
  type BristolType,
  type CreateDiaryDto,
  type FoodTag,
  type StoolColor,
} from "@poo-diary/shared";
import { useState, type FormEvent } from "react";

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
  { value: "tan", label: "황토색", hex: "#C8922A" },
  { value: "dark-brown", label: "진갈색", hex: "#3E1A08" },
  { value: "yellow", label: "노란색", hex: "#F4D03F" },
  { value: "green", label: "녹색", hex: "#27AE60" },
  { value: "red", label: "붉은색", hex: "#C0392B" },
  { value: "black", label: "검은색", hex: "#1A1A1A" },
];

const FOOD_TAGS = Object.keys(FOOD_TAG_META) as FoodTag[];

type DiaryFormProps = {
  initialValue?: CreateDiaryDto;
  isPending?: boolean;
  submitLabel: string;
  onSubmit: (value: CreateDiaryDto) => void;
};

export function DiaryForm({
  initialValue,
  isPending = false,
  submitLabel,
  onSubmit,
}: DiaryFormProps) {
  const [form, setForm] = useState<CreateDiaryDto>(
    initialValue ?? {
      bristolType: 4,
      color: "brown",
      hasPain: false,
      foods: [],
    },
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <section className="card p-5">
        <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-4">
          형태 선택 (브리스톨 척도)
        </h2>
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {BRISTOL_ITEMS.map(({ type, emoji }) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                setForm((value) => ({ ...value, bristolType: type }))
              }
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

      <section className="card p-5">
        <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-4">
          색상 선택
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {COLOR_OPTIONS.map(({ value, label, hex }) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setForm((formValue) => ({ ...formValue, color: value }))
              }
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

      <section className="card p-5">
        <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-1">
          오늘 먹은 것 (선택)
        </h2>
        <p className="text-[11px] text-gray-400 mb-4">
          선택하면 식단과 배변 상태의 관계를 분석할 수 있어요
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
                  setForm((value) => ({
                    ...value,
                    foods: selected
                      ? (value.foods ?? []).filter((food) => food !== tag)
                      : [...(value.foods ?? []), tag],
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
            {(form.foods ?? [])
              .map((tag) => FOOD_TAG_META[tag].emoji)
              .join(" ")}
          </p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-1">
          오늘 먹은 메뉴 (선택)
        </h2>
        <p className="text-[11px] text-gray-400 mb-3">
          구체적인 메뉴를 쉼표로 구분해 적으면 월별 통계에서 확인할 수 있어요
        </p>
        <input
          type="text"
          value={form.mealNote ?? ""}
          onChange={(event) =>
            setForm((value) => ({
              ...value,
              mealNote: event.target.value || undefined,
            }))
          }
          placeholder="예: 김치찌개, 삼겹살, 아메리카노"
          maxLength={200}
          className="w-full bg-gray-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 placeholder:text-gray-300 transition-colors"
        />
        <p className="text-right text-[10px] text-gray-300 mt-1">
          {(form.mealNote ?? "").length}/200
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-4">
          통증 여부
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {([false, true] as const).map((hasPain) => (
            <button
              key={String(hasPain)}
              type="button"
              onClick={() =>
                setForm((value) => ({
                  ...value,
                  hasPain,
                  painLevel: hasPain ? value.painLevel : undefined,
                }))
              }
              className={`py-3 rounded-2xl border-2 font-semibold text-sm transition-all duration-150 ${
                form.hasPain === hasPain
                  ? hasPain
                    ? "border-red-400 bg-red-50 text-red-600"
                    : "border-green-400 bg-green-50 text-green-700"
                  : "border-gray-200 bg-gray-50 text-gray-400"
              }`}
            >
              {hasPain ? "😣 통증 있음" : "😊 괜찮아요"}
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
                  onClick={() =>
                    setForm((value) => ({ ...value, painLevel: level }))
                  }
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

      <section className="card p-5">
        <h2 className="text-xs font-bold text-amber-500 tracking-widest uppercase mb-4">
          메모 (선택)
        </h2>
        <textarea
          value={form.memo ?? ""}
          onChange={(event) =>
            setForm((value) => ({ ...value, memo: event.target.value }))
          }
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
        className="btn-primary w-full py-4 text-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "저장 중..." : submitLabel}
      </button>
      <div className="h-2" />
    </form>
  );
}
