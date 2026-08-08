"use client";

import { useDiaryList } from "@/hooks/useDiary";
import { FOOD_TAG_META } from "@poo-diary/shared";
import type { DiaryEntry, FoodTag } from "@poo-diary/shared";
import { useState } from "react";

type Tab = "day" | "week" | "month" | "analysis";

const TAB_LABELS: Record<Tab, string> = {
  day: "오늘",
  week: "이번 주",
  month: "이번 달",
  analysis: "분석",
};

function getPeriodStart(tab: Exclude<Tab, "analysis">): Date {
  const now = new Date();
  if (tab === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (tab === "week") {
    const d = new Date(now);
    d.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function calcStats(entries: DiaryEntry[]) {
  if (entries.length === 0) return { count: 0, avgBristol: 0, painCount: 0 };
  const avgBristol =
    Math.round((entries.reduce((s, e) => s + e.bristolType, 0) / entries.length) * 10) / 10;
  const painCount = entries.filter((e) => e.hasPain).length;
  return { count: entries.length, avgBristol, painCount };
}

function calcFoodCorrelation(entries: DiaryEntry[]) {
  const map = new Map<FoodTag, { bristolSum: number; painCount: number; count: number }>();
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

function calcStreak(entries: DiaryEntry[]): number {
  const dates = new Set(entries.map((e) => new Date(e.recordedAt).toLocaleDateString("ko-KR")));
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
      message: "식이섬유(채소·과일·통곡물)와 하루 2L 이상 수분 섭취를 늘려보세요. 규칙적인 운동도 도움이 돼요!",
      color: "bg-blue-50 border-blue-100",
    });
  } else if (avgBristol <= 4.5) {
    advices.push({
      emoji: "✨",
      title: "잘 배출하고 있어요!",
      message: "현재 배변 상태가 이상적인 범위예요. 지금의 식습관과 생활 패턴을 유지해보세요 👏",
      color: "bg-green-50 border-green-100",
    });
  } else if (avgBristol <= 6) {
    advices.push({
      emoji: "🌊",
      title: "설사 경향이 있어요",
      message: "자극적이거나 기름진 음식, 카페인·알코올을 줄여보세요. 충분한 휴식도 중요해요.",
      color: "bg-orange-50 border-orange-100",
    });
  } else {
    advices.push({
      emoji: "🚿",
      title: "심한 설사 경향이에요",
      message: "수분과 전해질 보충이 필요해요. 증상이 이틀 이상 지속되면 병원 방문을 권장해요.",
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

  const worstFood = foodCorr.filter((f) => f.count >= 2 && f.avgBristolType >= 5.5)[0];
  if (worstFood) {
    const meta = FOOD_TAG_META[worstFood.food];
    advices.push({
      emoji: meta.emoji,
      title: `${meta.label}이(가) 소화에 영향을 줘요`,
      message: `${meta.label}을(를) 먹은 날의 평균 브리스톨 유형이 ${worstFood.avgBristolType}형이에요. 섭취량을 조절해보세요.`,
      color: "bg-orange-50 border-orange-100",
    });
  }

  const constipationFood = foodCorr.filter((f) => f.count >= 2 && f.avgBristolType <= 2.5)[0];
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
  if (waterCorr && waterCorr.avgBristolType >= 3 && waterCorr.avgBristolType <= 4.5) {
    advices.push({
      emoji: "💧",
      title: "수분 섭취가 도움이 되고 있어요!",
      message: "충분한 수분을 마신 날의 배변 상태가 이상적이에요. 매일 충분히 드세요.",
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
      message: "매일 기록하면 식단과 배변의 상관관계를 더 정확하게 파악할 수 있어요.",
      color: "bg-gray-50 border-gray-100",
    });
  }

  return advices;
}

function AnalysisView({ entries }: { entries: DiaryEntry[] }) {
  const { avgBristol } = calcStats(entries);
  const advices = buildAdvices(entries);
  const scoreColor = bristolColor(avgBristol);

  if (entries.length < 3) {
    return (
      <div className="card p-8 text-center mt-4">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-bold text-amber-900 mb-2">분석하려면 기록이 더 필요해요</p>
        <p className="text-xs text-amber-500">3개 이상의 기록이 쌓이면 맞춤 분석을 제공해드려요.</p>
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
          <p className="text-xs text-amber-500 mb-0.5">전체 평균 브리스톨 유형</p>
          <p className="font-black text-lg" style={{ color: scoreColor }}>
            {bristolLabel(avgBristol)}
          </p>
          <p className="text-xs text-gray-400">총 {entries.length}개의 기록 기반</p>
        </div>
      </div>

      {advices.map((advice, i) => (
        <div key={i} className={`rounded-3xl border p-4 ${advice.color}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{advice.emoji}</span>
            <p className="font-bold text-sm text-gray-800">{advice.title}</p>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed pl-8">{advice.message}</p>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const { data: allEntries = [] } = useDiaryList();
  const [tab, setTab] = useState<Tab>("week");

  const isAnalysis = tab === "analysis";
  const start = isAnalysis ? new Date(0) : getPeriodStart(tab as Exclude<Tab, "analysis">);
  const filtered = allEntries.filter((e) => new Date(e.recordedAt) >= start);

  const { count, avgBristol, painCount } = calcStats(filtered);
  const streak = calcStreak(allEntries);
  const foodCorrelations = calcFoodCorrelation(filtered);

  return (
    <main className="min-h-[100dvh] p-5 max-w-md mx-auto">
      <header className="pt-10 pb-4">
        <p className="text-xs font-medium text-amber-500 tracking-widest uppercase mb-1">Analytics</p>
        <h1 className="text-3xl font-black text-amber-900">통계</h1>
      </header>

      <div className="flex gap-1 mb-6 bg-amber-100/60 p-1 rounded-2xl">
        {(["day", "week", "month", "analysis"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
              tab === t ? "bg-white text-amber-900 shadow-sm" : "text-amber-600"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {isAnalysis ? (
        <AnalysisView entries={allEntries} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: `${TAB_LABELS[tab]} 기록`, value: count, unit: "회" },
              { label: "평균 유형", value: avgBristol || "-", unit: avgBristol ? "형" : "" },
              { label: "연속 기록", value: streak || "-", unit: streak ? "일" : "" },
              { label: `${TAB_LABELS[tab]} 통증`, value: painCount, unit: "회" },
            ].map((stat) => (
              <div key={stat.label} className="card p-4">
                <p className="text-xs text-amber-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-amber-900">
                  {stat.value}
                  <span className="text-base font-normal text-amber-600 ml-1">{stat.unit}</span>
                </p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="text-sm font-bold text-amber-800 mb-3">
              🍽️ {TAB_LABELS[tab]} 식단 영향 분석
            </h2>
            {filtered.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm font-semibold text-amber-800">{TAB_LABELS[tab]}에 기록이 없어요</p>
              </div>
            ) : foodCorrelations.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-3xl mb-2">🥗</p>
                <p className="text-xs text-amber-500">기록할 때 식단을 선택하면 분석해드려요</p>
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
                          <span className="font-semibold text-amber-900 text-sm">{meta.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold" style={{ color }}>
                            {bristolLabel(item.avgBristolType)}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1">({item.count}회)</span>
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
                        <span className="text-[10px] text-gray-400">평균 {item.avgBristolType}형</span>
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
        </>
      )}

      <div className="h-4" />
    </main>
  );
}
