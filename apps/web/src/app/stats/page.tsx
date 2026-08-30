"use client";

import { useDiaryList } from "@/hooks/useDiary";
import { FOOD_TAG_META } from "@poo-diary/shared";
import type { DiaryEntry, FoodTag } from "@poo-diary/shared";
import { useMemo, useState } from "react";

type PeriodType = "day" | "week" | "month" | "all";

const PERIOD_LABELS: Record<PeriodType, string> = {
  day: "일간",
  week: "주간",
  month: "월간",
  all: "전체",
};

function startOfPeriod(type: Exclude<PeriodType, "all">, date: Date): Date {
  if (type === "day") {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  if (type === "week") {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  }
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getPeriodRange(
  type: Exclude<PeriodType, "all">,
  date: Date,
): { start: Date; end: Date } {
  const start = startOfPeriod(type, date);
  const end = new Date(start);
  if (type === "day") end.setDate(end.getDate() + 1);
  if (type === "week") end.setDate(end.getDate() + 7);
  if (type === "month") end.setMonth(end.getMonth() + 1);
  return { start, end };
}

function movePeriod(
  type: Exclude<PeriodType, "all">,
  date: Date,
  amount: number,
): Date {
  const next = new Date(date);
  if (type === "day") next.setDate(next.getDate() + amount);
  if (type === "week") next.setDate(next.getDate() + amount * 7);
  if (type === "month") next.setMonth(next.getMonth() + amount);
  return next;
}

function formatPeriod(type: PeriodType, date: Date): string {
  if (type === "all") return "전체";
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: type === "month" ? undefined : "numeric",
  });
  if (type !== "week") return formatter.format(date);
  const { start, end } = getPeriodRange("week", date);
  const lastDay = new Date(end.getTime() - 1);
  return `${formatter.format(start)} – ${new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(lastDay)}`;
}

function calcTopMenus(
  entries: DiaryEntry[],
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.mealNote) continue;
    for (const raw of entry.mealNote.split(",")) {
      const name = raw.trim();
      if (name) map.set(name, (map.get(name) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function calcStats(entries: DiaryEntry[]) {
  if (entries.length === 0) return { count: 0, avgBristol: 0, painCount: 0 };
  const avgBristol =
    Math.round(
      (entries.reduce((s, e) => s + e.bristolType, 0) / entries.length) * 10,
    ) / 10;
  const painCount = entries.filter((e) => e.hasPain).length;
  return { count: entries.length, avgBristol, painCount };
}

function calcFoodCorrelation(entries: DiaryEntry[]) {
  const map = new Map<
    FoodTag,
    { bristolSum: number; painCount: number; count: number }
  >();
  for (const entry of entries) {
    for (const food of (entry.foods ?? []) as FoodTag[]) {
      const cur = map.get(food) ?? { bristolSum: 0, painCount: 0, count: 0 };
      map.set(food, {
        bristolSum: cur.bristolSum + entry.bristolType,
        painCount: cur.painCount + (entry.hasPain ? 1 : 0),
        count: cur.count + 1,
      });
    }
  }
  return Array.from(map.entries())
    .map(([food, { bristolSum, painCount, count }]) => ({
      food,
      count,
      avgBristolType: Math.round((bristolSum / count) * 10) / 10,
      painRate: Math.round((painCount / count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);
}

/** 기록 시각 기준 평균 배변 간격(일). 하루 여러 기록도 각각 반영한다. */
function calcAvgInterval(entries: DiaryEntry[]): number | null {
  if (entries.length < 2) return null;

  const timestamps = entries
    .map((entry) => new Date(entry.recordedAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (timestamps.length < 2) return null;

  let totalMs = 0;
  for (let i = 1; i < timestamps.length; i++) {
    totalMs += timestamps[i] - timestamps[i - 1];
  }

  const avgDays = totalMs / (timestamps.length - 1) / 86_400_000;
  return Math.round(avgDays * 10) / 10;
}

function calcStreak(entries: DiaryEntry[]): number {
  const dates = new Set(
    entries.map((e) => new Date(e.recordedAt).toLocaleDateString("ko-KR")),
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (dates.has(cursor.toLocaleDateString("ko-KR"))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function bristolColor(avg: number) {
  if (avg <= 2) return "#3B82F6";
  if (avg <= 4.5) return "#22C55E";
  return "#EF4444";
}

function bristolLabel(avg: number) {
  if (avg <= 2) return "변비 경향";
  if (avg <= 4.5) return "정상 범위";
  return "설사 경향";
}

const MIN_CONDITION_SAMPLE = 3;

function conditionStats(entries: DiaryEntry[]) {
  const { count, avgBristol, painCount } = calcStats(entries);
  return {
    count,
    avgBristol,
    painRate: count === 0 ? 0 : Math.round((painCount / count) * 100),
  };
}

interface ComparisonGroup {
  label: string;
  entries: DiaryEntry[];
}

function ConditionComparison({
  emoji,
  title,
  left,
  right,
}: {
  emoji: string;
  title: string;
  left: ComparisonGroup;
  right: ComparisonGroup;
}) {
  const leftStats = conditionStats(left.entries);
  const rightStats = conditionStats(right.entries);
  const ready =
    leftStats.count >= MIN_CONDITION_SAMPLE &&
    rightStats.count >= MIN_CONDITION_SAMPLE;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{emoji}</span>
        <h4 className="font-bold text-sm text-amber-900">{title}</h4>
      </div>
      {ready ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            { group: left, stats: leftStats },
            { group: right, stats: rightStats },
          ].map(({ group, stats }) => (
            <div key={group.label} className="rounded-2xl bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-800 mb-2">
                {group.label}
              </p>
              <p className="text-xs text-gray-600">
                평균 <strong className="text-amber-900">{stats.avgBristol}형</strong>
              </p>
              <p className="text-xs text-gray-600">
                통증 <strong className="text-red-500">{stats.painRate}%</strong>
              </p>
              <p className="mt-1 text-[10px] text-gray-400">{stats.count}건 기준</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-gray-50 px-3 py-3">
          <p className="text-xs text-gray-600 mb-1">
            양쪽 조건이 각각 {MIN_CONDITION_SAMPLE}건 이상이면 비교해드려요.
          </p>
          <p className="text-[10px] text-gray-400">
            {left.label} {Math.min(leftStats.count, MIN_CONDITION_SAMPLE)}/
            {MIN_CONDITION_SAMPLE} · {right.label}{" "}
            {Math.min(rightStats.count, MIN_CONDITION_SAMPLE)}/
            {MIN_CONDITION_SAMPLE}
          </p>
        </div>
      )}
    </div>
  );
}

function ConditionAnalysis({ entries }: { entries: DiaryEntry[] }) {
  const menstrualGroups = Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;
    return {
      day,
      entries: entries.filter((entry) => entry.menstrualDay === day),
    };
  });
  const qualifiedMenstrualGroups = menstrualGroups.filter(
    (group) => group.entries.length >= MIN_CONDITION_SAMPLE,
  );

  return (
    <section className="mt-4 flex flex-col gap-3">
      <div>
        <p className="text-xs font-medium text-amber-500 tracking-widest uppercase mb-1">
          Condition
        </p>
        <h3 className="text-lg font-black text-amber-900">컨디션별 비교</h3>
        <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
          각 조건과 배변 기록의 관계를 비교한 참고 지표이며, 원인을 의미하지는 않아요.
        </p>
      </div>

      <ConditionComparison
        emoji="🩸"
        title="생리 중과 비생리 중"
        left={{
          label: "생리 중",
          entries: entries.filter((entry) => entry.menstrualDay != null),
        }}
        right={{
          label: "비생리 중",
          entries: entries.filter((entry) => entry.menstrualDay == null),
        }}
      />

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📅</span>
          <h4 className="font-bold text-sm text-amber-900">
            생리 일차별 배변 상태
          </h4>
        </div>
        {qualifiedMenstrualGroups.length > 0 ? (
          <div className="flex flex-col gap-2">
            {qualifiedMenstrualGroups.map((group) => {
              const stats = conditionStats(group.entries);
              return (
                <div
                  key={group.day}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl bg-rose-50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-xs font-bold text-rose-800">
                      {group.day === 7 ? "7일 이상" : `${group.day}일차`}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {stats.count}건 기준
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    평균 <strong className="text-amber-900">{stats.avgBristol}형</strong>
                  </p>
                  <p className="text-xs text-gray-600">
                    통증 <strong className="text-red-500">{stats.painRate}%</strong>
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-50 px-3 py-3">
            <p className="text-xs text-gray-600">
              같은 생리 일차의 기록이 {MIN_CONDITION_SAMPLE}건 이상이면 분석해드려요.
            </p>
            {menstrualGroups.some((group) => group.entries.length > 0) && (
              <p className="mt-1 text-[10px] text-gray-400">
                {menstrualGroups
                  .filter((group) => group.entries.length > 0)
                  .map(
                    (group) =>
                      `${group.day === 7 ? "7일 이상" : `${group.day}일차`} ${group.entries.length}/${MIN_CONDITION_SAMPLE}`,
                  )
                  .join(" · ")}
              </p>
            )}
          </div>
        )}
      </div>

      <ConditionComparison
        emoji="😴"
        title="수면 충분 여부"
        left={{
          label: "충분히 잔 날",
          entries: entries.filter((entry) => entry.hadEnoughSleep),
        }}
        right={{
          label: "부족하게 잔 날",
          entries: entries.filter((entry) => !entry.hadEnoughSleep),
        }}
      />

      <ConditionComparison
        emoji="🍽️"
        title="과식 여부"
        left={{
          label: "과식한 날",
          entries: entries.filter((entry) => entry.overate),
        }}
        right={{
          label: "과식하지 않은 날",
          entries: entries.filter((entry) => !entry.overate),
        }}
      />
    </section>
  );
}

interface Advice {
  emoji: string;
  title: string;
  message: string;
  color: string;
}

function buildAdvices(entries: DiaryEntry[]): Advice[] {
  if (entries.length === 0) return [];
  const advices: Advice[] = [];

  const { avgBristol, painCount } = calcStats(entries);
  const painRate = painCount / entries.length;
  const streak = calcStreak(entries);
  const foodCorr = calcFoodCorrelation(entries);

  if (avgBristol <= 2) {
    advices.push({
      emoji: "🪨",
      title: "변비 경향이에요",
      message:
        "식이섬유(채소·과일·통곡물)와 하루 2L 이상 수분 섭취를 늘려보세요. 규칙적인 운동도 도움이 돼요!",
      color: "bg-blue-50 border-blue-100",
    });
  } else if (avgBristol <= 4.5) {
    advices.push({
      emoji: "✨",
      title: "잘 배출하고 있어요!",
      message:
        "현재 배변 상태가 이상적인 범위예요. 지금의 식습관과 생활 패턴을 유지해보세요 👏",
      color: "bg-green-50 border-green-100",
    });
  } else if (avgBristol <= 6) {
    advices.push({
      emoji: "🌊",
      title: "설사 경향이 있어요",
      message:
        "자극적이거나 기름진 음식, 카페인·알코올을 줄여보세요. 충분한 휴식도 중요해요.",
      color: "bg-orange-50 border-orange-100",
    });
  } else {
    advices.push({
      emoji: "🚿",
      title: "심한 설사 경향이에요",
      message:
        "수분과 전해질 보충이 필요해요. 증상이 이틀 이상 지속되면 병원 방문을 권장해요.",
      color: "bg-red-50 border-red-100",
    });
  }

  if (painRate > 0.3) {
    advices.push({
      emoji: "😣",
      title: "통증이 잦아요",
      message: `전체 기록의 ${Math.round(painRate * 100)}%에서 통증이 있었어요. 식습관 점검이나 전문의 상담을 고려해보세요.`,
      color: "bg-red-50 border-red-100",
    });
  } else if (painRate === 0 && entries.length >= 3) {
    advices.push({
      emoji: "😊",
      title: "통증 없이 건강해요!",
      message: "지금까지 기록된 통증이 없어요. 훌륭한 장 건강이에요!",
      color: "bg-green-50 border-green-100",
    });
  }

  const worstFood = foodCorr.filter(
    (f) => f.count >= 2 && f.avgBristolType >= 5.5,
  )[0];
  if (worstFood) {
    const meta = FOOD_TAG_META[worstFood.food];
    advices.push({
      emoji: meta.emoji,
      title: `${meta.label}이(가) 소화에 영향을 줘요`,
      message: `${meta.label}을(를) 먹은 날의 평균 브리스톨 유형이 ${worstFood.avgBristolType}형이에요. 섭취량을 조절해보세요.`,
      color: "bg-orange-50 border-orange-100",
    });
  }

  const constipationFood = foodCorr.filter(
    (f) => f.count >= 2 && f.avgBristolType <= 2.5,
  )[0];
  if (constipationFood) {
    const meta = FOOD_TAG_META[constipationFood.food];
    advices.push({
      emoji: meta.emoji,
      title: `${meta.label} 후 변비 경향이 있어요`,
      message: `${meta.label}을(를) 먹은 날의 평균 브리스톨 유형이 ${constipationFood.avgBristolType}형이에요. 식이섬유와 함께 섭취해보세요.`,
      color: "bg-blue-50 border-blue-100",
    });
  }

  const waterCorr = foodCorr.find((f) => f.food === "water");
  if (
    waterCorr &&
    waterCorr.avgBristolType >= 3 &&
    waterCorr.avgBristolType <= 4.5
  ) {
    advices.push({
      emoji: "💧",
      title: "수분 섭취가 도움이 되고 있어요!",
      message:
        "충분한 수분을 마신 날의 배변 상태가 이상적이에요. 매일 충분히 드세요.",
      color: "bg-cyan-50 border-cyan-100",
    });
  }

  if (streak >= 7) {
    advices.push({
      emoji: "🏆",
      title: `${streak}일 연속 기록 중!`,
      message: "꾸준한 기록이 건강 패턴 파악의 핵심이에요. 대단해요!",
      color: "bg-amber-50 border-amber-100",
    });
  } else if (streak === 0) {
    advices.push({
      emoji: "📝",
      title: "오늘부터 다시 시작해요",
      message:
        "매일 기록하면 식단과 배변의 상관관계를 더 정확하게 파악할 수 있어요.",
      color: "bg-gray-50 border-gray-100",
    });
  }

  return advices;
}

function AnalysisView({ entries }: { entries: DiaryEntry[] }) {
  const { avgBristol } = calcStats(entries);
  const advices = buildAdvices(entries);
  const scoreColor = bristolColor(avgBristol);
  const avgInterval = calcAvgInterval(entries);

  if (entries.length < 3) {
    return (
      <div className="card p-8 text-center mt-4">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-bold text-amber-900 mb-2">
          분석하려면 기록이 더 필요해요
        </p>
        <p className="text-xs text-amber-500">
          3개 이상의 기록이 쌓이면 맞춤 분석을 제공해드려요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5 flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-xl flex-shrink-0"
          style={{ backgroundColor: scoreColor }}
        >
          {avgBristol}
        </div>
        <div>
          <p className="text-xs text-amber-500 mb-0.5">
            전체 평균 브리스톨 유형
          </p>
          <p className="font-black text-lg" style={{ color: scoreColor }}>
            {bristolLabel(avgBristol)}
          </p>
          <p className="text-xs text-gray-400">
            총 {entries.length}개의 기록 기반
          </p>
        </div>
      </div>

      {avgInterval !== null && (
        <div className="card p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🗓️</span>
          </div>
          <div>
            <p className="text-xs text-amber-500 mb-0.5">평균 배변 간격</p>
            <p className="font-black text-lg text-amber-900">
              {avgInterval}
              <span className="text-base font-normal text-amber-600 ml-1">
                일
              </span>
            </p>
            <p className="text-xs text-gray-400">
              {avgInterval < 0.5
                ? "하루에 여러 번 배변하는 패턴이에요"
                : avgInterval < 1
                  ? "하루 안팎의 간격으로 배변하고 있어요"
                  : avgInterval === 1
                    ? "평균 하루 간격으로 규칙적으로 배변하고 있어요 👍"
                    : avgInterval <= 2
                      ? "1~2일 주기로 배변하고 있어요"
                      : avgInterval <= 3
                        ? "2~3일 주기예요. 식이섬유 섭취를 늘려보세요"
                        : "주기가 긴 편이에요. 변비를 주의하세요"}
            </p>
          </div>
        </div>
      )}

      {advices.map((advice, i) => (
        <div key={i} className={`rounded-3xl border p-4 ${advice.color}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{advice.emoji}</span>
            <p className="font-bold text-sm text-gray-800">{advice.title}</p>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed pl-8">
            {advice.message}
          </p>
        </div>
      ))}

      <ConditionAnalysis entries={entries} />
    </div>
  );
}

export default function StatsPage() {
  const { data: allEntries = [] } = useDiaryList();
  const [periodType, setPeriodType] = useState<PeriodType>("week");
  const [cursor, setCursor] = useState(() => new Date());

  const filtered = useMemo(() => {
    if (periodType === "all") return allEntries;
    const { start, end } = getPeriodRange(periodType, cursor);
    return allEntries.filter((entry) => {
      const recordedAt = new Date(entry.recordedAt);
      return recordedAt >= start && recordedAt < end;
    });
  }, [allEntries, cursor, periodType]);

  const isCurrentPeriod =
    periodType === "all" ||
    startOfPeriod(periodType, cursor).getTime() ===
      startOfPeriod(periodType, new Date()).getTime();
  const periodTitle = formatPeriod(periodType, cursor);

  const { count, avgBristol, painCount } = calcStats(filtered);
  const streak = calcStreak(allEntries);
  const foodCorrelations = calcFoodCorrelation(filtered);
  const topMenus = calcTopMenus(filtered);

  return (
    <main className="min-h-[100dvh] p-5 max-w-md mx-auto">
      <header className="pt-10 pb-4">
        <p className="text-xs font-medium text-amber-500 tracking-widest uppercase mb-1">
          Analytics
        </p>
        <h1 className="text-3xl font-black text-amber-900">통계</h1>
      </header>

      <div className="flex gap-1 mb-4 bg-amber-100/60 p-1 rounded-2xl">
        {(["day", "week", "month", "all"] as PeriodType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setPeriodType(type);
              if (type !== "all") setCursor(new Date());
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
              periodType === type
                ? "bg-white text-amber-900 shadow-sm"
                : "text-amber-600"
            }`}
          >
            {PERIOD_LABELS[type]}
          </button>
        ))}
      </div>

      {periodType !== "all" ? (
        <div className="card mb-5 flex items-center justify-between px-3 py-2">
          <button
            type="button"
            aria-label="이전 기간"
            onClick={() =>
              setCursor((date) => movePeriod(periodType, date, -1))
            }
            className="h-10 w-10 rounded-xl text-xl text-amber-700 active:bg-amber-50"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-amber-900">{periodTitle}</p>
            {!isCurrentPeriod && (
              <button
                type="button"
                onClick={() => setCursor(new Date())}
                className="mt-0.5 text-[10px] font-semibold text-amber-500"
              >
                현재 기간으로 돌아가기
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="다음 기간"
            disabled={isCurrentPeriod}
            onClick={() => setCursor((date) => movePeriod(periodType, date, 1))}
            className="h-10 w-10 rounded-xl text-xl text-amber-700 active:bg-amber-50 disabled:opacity-20"
          >
            ›
          </button>
        </div>
      ) : (
        <p className="mb-5 text-center text-xs font-semibold text-amber-600">
          지금까지 작성한 모든 기록을 분석해요
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: "기록", value: count, unit: "회" },
          {
            label: "평균 유형",
            value: avgBristol || "-",
            unit: avgBristol ? "형" : "",
          },
          {
            label: "연속 기록",
            value: streak || "-",
            unit: streak ? "일" : "",
          },
          {
            label: "통증",
            value: painCount,
            unit: "회",
          },
        ].map((stat) => (
          <div key={stat.label} className="card min-w-0 p-4">
            <p
              className="truncate text-xs text-amber-500 mb-1"
              title={stat.label}
            >
              {stat.label}
            </p>
            <p className="text-3xl font-black text-amber-900">
              {stat.value}
              <span className="text-base font-normal text-amber-600 ml-1">
                {stat.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-sm font-bold text-amber-800 mb-3">
          🍽️ {periodTitle} 식단 영향 분석
        </h2>
        {filtered.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-semibold text-amber-800">
              선택한 기간에 기록이 없어요
            </p>
          </div>
        ) : foodCorrelations.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-3xl mb-2">🥗</p>
            <p className="text-xs text-amber-500">
              기록할 때 식단을 선택하면 분석해드려요
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {foodCorrelations.map((item) => {
              const meta = FOOD_TAG_META[item.food];
              const color = bristolColor(item.avgBristolType);
              return (
                <li key={item.food} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.emoji}</span>
                      <span className="font-semibold text-amber-900 text-sm">
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold" style={{ color }}>
                        {bristolLabel(item.avgBristolType)}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">
                        ({item.count}회)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((item.avgBristolType / 7) * 100, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">
                      평균 {item.avgBristolType}형
                    </span>
                    {item.painRate > 0 && (
                      <span className="text-[10px] text-red-400">
                        통증 {Math.round(item.painRate * 100)}%
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {topMenus.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold text-amber-800 mb-3">
            🍽️ {periodTitle} 자주 먹은 메뉴
          </h2>
          <div className="card p-4 flex flex-wrap gap-2">
            {topMenus.map((item, i) => (
              <span
                key={item.name}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  i === 0
                    ? "bg-amber-100 border-amber-300 text-amber-900"
                    : "bg-gray-50 border-gray-200 text-gray-600"
                }`}
              >
                {i === 0 && <span>🥇</span>}
                {item.name}
                <span className="ml-0.5 text-[10px] font-normal opacity-70">
                  {item.count}회
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {periodType === "all" && (
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-medium text-amber-500 tracking-widest uppercase mb-1">
              Insights
            </p>
            <h2 className="text-xl font-black text-amber-900">
              전체 기록 분석
            </h2>
          </div>
          <AnalysisView entries={allEntries} />
        </section>
      )}

      <div className="h-4" />
    </main>
  );
}
