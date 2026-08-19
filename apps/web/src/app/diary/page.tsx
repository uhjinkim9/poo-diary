"use client";

import React from "react";
import { useDiaryList } from "@/hooks/useDiary";
import type { DiaryEntry, StoolColor } from "@poo-diary/shared";
import Link from "next/link";

const COLOR_SWATCHES: Record<StoolColor, string> = {
  brown: "#8B4513",
  "dark-brown": "#3E1A08",
  yellow: "#F4D03F",
  green: "#27AE60",
  red: "#C0392B",
  black: "#1A1A1A",
  white: "#D5D8DC",
};

const BRISTOL_EMOJIS: Record<number, string> = {
  1: "🪨",
  2: "🟤",
  3: "💪",
  4: "✨",
  5: "💧",
  6: "🌊",
  7: "🚿",
};

function EntryCard({ entry }: { entry: DiaryEntry }) {
  const date = new Date(entry.recordedAt);
  return (
    <li>
      <div className="card p-4 flex gap-4 items-start">
        <div
          className="w-10 h-10 rounded-2xl flex-shrink-0 mt-0.5 shadow-inner"
          style={{ backgroundColor: COLOR_SWATCHES[entry.color] }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-base font-bold text-amber-900">
              {BRISTOL_EMOJIS[entry.bristolType]} {entry.bristolType}유형
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {entry.hasPain && (
                <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full">
                  통증 있음
                </span>
              )}
              <Link
                href={`/diary/${entry.id}/edit`}
                aria-label="기록 수정"
                className="text-xs text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-50"
              >
                수정
              </Link>
            </div>
          </div>
          <p className="text-xs text-amber-500 mb-1">
            {date.toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "short",
            })}{" "}
            {date.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {entry.mealNote && (
            <p className="text-xs text-amber-700 font-medium truncate mb-0.5">
              🍽️ {entry.mealNote}
            </p>
          )}
          {entry.memo && (
            <p className="text-xs text-gray-500 truncate">{entry.memo}</p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function DiaryListPage() {
  const { data: entries, isLoading, isError } = useDiaryList();

  return (
    <main className="min-h-[100dvh] p-5 max-w-md mx-auto">
      <header className="pt-10 pb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-amber-500 tracking-widest uppercase mb-1">
            History
          </p>
          <h1 className="text-3xl font-black text-amber-900">기록 목록</h1>
        </div>
        <Link href="/diary/new" className="btn-primary px-4 py-2 text-sm">
          + 기록
        </Link>
      </header>

      {isLoading && (
        <div className="flex flex-col items-center gap-3 mt-24 text-amber-600">
          <span className="text-4xl animate-bounce">💩</span>
          <p className="text-sm">불러오는 중...</p>
        </div>
      )}

      {isError && (
        <div className="card p-6 text-center text-red-400 mt-8">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="text-sm">데이터를 불러오지 못했어요.</p>
        </div>
      )}

      {!isLoading && !isError && entries?.length === 0 && (
        <div className="flex flex-col items-center gap-3 mt-24 text-amber-600">
          <span className="text-5xl">💩</span>
          <p className="font-semibold">첫 기록을 남겨보세요!</p>
          <Link href="/diary/new" className="btn-primary px-6 py-2 text-sm">
            지금 기록하기
          </Link>
        </div>
      )}

      {!isLoading && !isError && entries && entries.length > 0 && (
        <>
          <p className="text-xs text-amber-500 mb-3">
            총 {entries.length}개의 기록
          </p>
          <ul className="flex flex-col gap-3">
            {entries.reduce<React.ReactNode[]>((acc, entry, i) => {
              const date = new Date(entry.recordedAt).toLocaleDateString(
                "ko-KR",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              );
              const prevDate =
                i > 0
                  ? new Date(entries[i - 1].recordedAt).toLocaleDateString(
                      "ko-KR",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )
                  : null;

              if (date !== prevDate) {
                acc.push(
                  <li
                    key={`sep-${date}`}
                    className="flex items-center gap-3 py-1"
                  >
                    <span className="flex-1 h-px bg-amber-100" />
                    <span className="text-[11px] font-semibold text-amber-400 whitespace-nowrap">
                      {date}
                    </span>
                    <span className="flex-1 h-px bg-amber-100" />
                  </li>,
                );
              }
              acc.push(<EntryCard key={entry.id} entry={entry} />);
              return acc;
            }, [])}
          </ul>
        </>
      )}
    </main>
  );
}
