"use client";

import {
  useDailyBowelStatuses,
  useDiaryList,
  useSetNoBowelMovement,
} from "@/hooks/useDiary";
import Link from "next/link";
import { useState } from "react";

const TIPS = [
  "4형이 가장 이상적인 형태예요 💩",
  "매일 기록하면 건강 패턴을 파악할 수 있어요",
  "수분을 충분히 섭취하면 도움이 돼요",
  "갈색이 가장 정상적인 색상이에요",
];

const LEVELS = [
  { min: 0, emoji: "🌱", label: "새싹", desc: "첫 발걸음!" },
  { min: 5, emoji: "💧", label: "수련생", desc: "기록 5개 달성" },
  { min: 15, emoji: "💪", label: "열심이", desc: "기록 15개 달성" },
  { min: 30, emoji: "⭐", label: "장인", desc: "기록 30개 달성" },
  { min: 60, emoji: "🏆", label: "전설", desc: "기록 60개 달성" },
];

function calcLevel(count: number) {
  let lv = LEVELS[0];
  for (const l of LEVELS) {
    if (count >= l.min) lv = l;
  }
  const next = LEVELS[LEVELS.indexOf(lv) + 1];
  return { ...lv, next, count };
}

function calcBestStreak(recordedDates: string[]): number {
  const days = Array.from(
    new Set(
      recordedDates.map((value) => {
        const date = new Date(value);
        return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
          86_400_000;
      }),
    ),
  ).sort((a, b) => a - b);

  let best = 0;
  let current = 0;
  let previous: number | undefined;
  for (const day of days) {
    current = previous !== undefined && day === previous + 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }
  return best;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HomePage() {
  const { data: entries = [] } = useDiaryList();
  const { data: dailyStatuses = [] } = useDailyBowelStatuses();
  const { mutate: setNoBowelMovement, isPending: isSettingNoBowel } =
    useSetNoBowelMovement();
  const [noBowelError, setNoBowelError] = useState(false);
  const lv = calcLevel(entries.length);
  const bestStreak = calcBestStreak(entries.map((entry) => entry.recordedAt));
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const today = localDateKey(new Date());
  const hasNoBowelMovement = dailyStatuses.some(
    (status) => status.date === today && status.noBowelMovement,
  );

  function toggleNoBowelMovement() {
    setNoBowelError(false);
    setNoBowelMovement(
      { date: today, noBowelMovement: !hasNoBowelMovement },
      { onError: () => setNoBowelError(true) },
    );
  }

  return (
    <main className="min-h-[100dvh] flex flex-col p-5 max-w-md mx-auto">
      {/* 헤더 */}
      <header className="pt-10 pb-6">
        <p className="text-xs font-medium text-amber-500 tracking-widest uppercase mb-1">
          My Health Log
        </p>
        <h1 className="text-4xl font-black text-amber-900">
          Poo Diary <span className="inline-block animate-bounce">💩</span>
        </h1>
      </header>

      {/* 팀 카드 */}
      <div className="card p-4 mb-6 bg-gradient-to-r from-amber-50 to-orange-50">
        <p className="text-xs font-semibold text-amber-500 mb-1">오늘의 팁</p>
        <p className="text-sm text-amber-800">{tip}</p>
      </div>

      {/* 메인 CTA */}
      <Link
        href="/diary/new"
        className="btn-primary w-full py-5 text-center text-xl mb-4 block"
      >
        기록하기 💩
      </Link>

      <div className="mb-6">
        <button
          type="button"
          disabled={isSettingNoBowelMovement}
          onClick={toggleNoBowelMovement}
          className={`w-full rounded-2xl border py-3 text-sm font-bold transition-colors disabled:opacity-50 ${
            hasNoBowelMovement
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-gray-200 bg-white text-gray-500"
          }`}
        >
          {isSettingNoBowelMovement
            ? "저장하는 중..."
            : hasNoBowelMovement
              ? "오늘 배변 없음을 기록했어요 · 취소하기"
              : "오늘 배변 없었어요"}
        </button>
        {noBowelError && (
          <p className="mt-2 text-center text-xs text-red-500">
            오늘 배변 기록이 있으면 ‘배변 없음’으로 표시할 수 없어요.
          </p>
        )}
      </div>

      {/* 퀘 이모지 그리드 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 flex flex-col items-center gap-1">
          <span className="text-2xl">{lv.emoji}</span>
          <span className="text-xs font-bold text-amber-700">{lv.label}</span>
          {lv.next ? (
            <span className="text-[10px] text-gray-400">
              {lv.next.min - lv.count}개 더
            </span>
          ) : (
            <span className="text-[10px] text-amber-500">최고 레벨!</span>
          )}
        </div>
        {[
          { emoji: "📊", label: "통계", value: undefined, href: "/stats" },
          {
            emoji: "🏆",
            label: "최고 연속",
            value: `${bestStreak}일`,
            href: "/stats",
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="card p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform"
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-xs font-medium text-amber-700">
              {item.label}
            </span>
            {item.value && (
              <span className="text-[10px] font-bold text-amber-500">
                {item.value}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* 브리스톨 차트 미니 가이드 */}
      <div className="card p-4">
        <p className="text-xs font-bold text-amber-700 mb-3">
          💩 브리스톨 체크
        </p>
        <div className="grid grid-cols-7 gap-1">
          {["🪨", "🟤", "💪", "✨", "💧", "🌊", "🚿"].map((e, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-lg">{e}</span>
              <span className="text-[10px] text-amber-600 font-bold">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">변비</span>
          <span className="text-[10px] text-amber-600 font-medium">
            ← 이상적 (4형) →
          </span>
          <span className="text-[10px] text-gray-400">설사</span>
        </div>
      </div>
    </main>
  );
}
