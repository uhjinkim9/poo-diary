"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MenstrualCycle } from "@poo-diary/shared";
import { useCreateCycle, useCycles, useDeleteCycle, useFinishCycle } from "@/hooks/useCycle";

const DAY = 86_400_000;
const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const utc = (value: string) => new Date(`${value}T00:00:00Z`);
const between = (from: string, to: string) => Math.round((utc(to).getTime() - utc(from).getTime()) / DAY);
const add = (value: string, days: number) => { const date = utc(value); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };

function summary(cycles: MenstrualCycle[]) {
  const ordered = [...cycles].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const intervals = ordered.slice(1).map((item, i) => between(ordered[i].startedAt, item.startedAt)).filter((days) => days > 0 && days <= 90).slice(-6);
  const average = intervals.length ? Math.round(intervals.reduce((sum, days) => sum + days, 0) / intervals.length) : null;
  const periodDays = ordered.filter((item) => item.endedAt).map((item) => between(item.startedAt, item.endedAt!) + 1).filter((days) => days > 0 && days <= 14);
  return { ordered, average, averagePeriod: periodDays.length ? Math.round(periodDays.reduce((sum, days) => sum + days, 0) / periodDays.length) : 5 };
}

function bowelPhase(cycles: MenstrualCycle[], today: string) {
  const { ordered, average } = summary(cycles);
  const latest = ordered.at(-1);
  if (!latest) return null;
  if (latest.startedAt <= today && (!latest.endedAt || latest.endedAt >= today)) return { title: `생리 중 · ${between(latest.startedAt, today) + 1}일차`, text: "일부 사람은 이 시기에 배변 횟수가 늘거나 묽은 변·복부 불편을 경험할 수 있어요. 평소 패턴과 비교해 보세요." };
  if (!average || !latest.endedAt || today < latest.endedAt) return null;
  const day = between(latest.startedAt, today) + 1;
  if (day > average + 7) return null;
  if (day >= average - 6) return { title: "월경 전 추정 단계", text: "일부 사람은 호르몬 변화와 함께 변비나 복부 팽만을 느껴요. 수분·식사·배변 경험을 함께 기록해 내 패턴을 살펴보세요." };
  if (day >= 12 && day <= 16) return { title: "배란 전후 추정 단계", text: "몸의 변화는 개인차가 커요. 변비·설사 여부를 단정하기보다 이번 주 장 컨디션을 가볍게 관찰해 보세요." };
  return { title: "생리 후 추정 단계", text: "주기 추정은 기록이 쌓일수록 더 가까워져요. 생리 시작일과 종료일을 계속 기록해 주세요." };
}

export default function CyclePage() {
  const today = todayKey();
  const [cursor, setCursor] = useState(() => utc(today));
  const [selected, setSelected] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const { data: cycles = [], isLoading } = useCycles();
  const create = useCreateCycle(); const finish = useFinishCycle(); const remove = useDeleteCycle();
  const data = useMemo(() => summary(cycles), [cycles]);
  const phase = useMemo(() => bowelPhase(cycles, today), [cycles, today]);
  const active = cycles.find((item) => !item.endedAt);
  const predicted = data.average && data.ordered.length ? add(data.ordered.at(-1)!.startedAt, data.average) : null;
  const year = cursor.getUTCFullYear(); const month = cursor.getUTCMonth(); const offset = new Date(Date.UTC(year, month, 1)).getUTCDay(); const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array.from({ length: offset + count }, (_, index) => index < offset ? null : `${year}-${String(month + 1).padStart(2, "0")}-${String(index - offset + 1).padStart(2, "0")}`);
  const isPeriod = (date: string) => cycles.some((item) => date >= item.startedAt && date <= (item.endedAt ?? today));
  const start = async () => { setError(null); try { await create.mutateAsync({ startedAt: selected }); } catch { setError("진행 중인 생리 기록이 있다면 먼저 종료해 주세요."); } };
  const end = async () => { if (!active) return; setError(null); try { await finish.mutateAsync({ id: active.id, dto: { endedAt: selected } }); } catch { setError("종료일은 시작일보다 빠를 수 없어요."); } };
  return <main className="min-h-[100dvh] max-w-md mx-auto p-5 pb-28">
    <header className="pt-10 pb-6"><p className="mb-1 text-xs font-medium uppercase tracking-widest text-rose-400">Cycle</p><h1 className="text-3xl font-black text-amber-900">주기</h1></header>
    <section className="card border border-rose-100 bg-gradient-to-br from-rose-50 to-amber-50 p-5"><div className="flex justify-between"><div><p className="text-xs font-bold text-rose-500">평균 생리 주기</p><p className="mt-1 text-3xl font-black text-rose-900">{data.average ? `${data.average}일` : "기록 중"}</p></div><span className="text-3xl">🌙</span></div><p className="mt-3 text-xs leading-relaxed text-gray-600">{data.average ? `최근 ${Math.min(cycles.length - 1, 6)}개 간격 기준이에요. 다음 시작일은 ${predicted?.replaceAll("-", ".")} 전후로 예상돼요.` : "생리 시작일을 두 번 이상 기록하면 평균 주기와 다음 예상일을 보여드려요."}</p></section>
    <section className="card mt-4 p-4"><div className="mb-4 flex items-center justify-between"><button aria-label="이전 달" onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))} className="px-2 text-xl text-amber-900">‹</button><h2 className="font-black text-amber-900">{year}년 {month + 1}월</h2><button aria-label="다음 달" onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))} className="px-2 text-xl text-amber-900">›</button></div><div className="grid grid-cols-7 text-center text-[11px] font-bold text-gray-400">{"일월화수목금토".split("").map((day) => <span key={day}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-sm">{cells.map((date, index) => date ? <button key={date} onClick={() => setSelected(date)} className={`mx-auto grid h-8 w-8 place-items-center rounded-full ${isPeriod(date) ? "bg-rose-200 font-black text-rose-900" : "text-gray-700"} ${date === selected ? "ring-2 ring-amber-400 ring-offset-1" : ""} ${date === predicted ? "border border-dashed border-rose-500" : ""}`}>{index - offset + 1}</button> : <span key={index} />)}</div><p className="mt-4 text-[10px] text-gray-500">● 생리 기록　◌ 예상 시작일</p></section>
    <section className="card mt-4 p-5"><label className="text-sm font-bold text-amber-900">날짜 선택</label><input type="date" value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-2 w-full rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm" />{active ? <button disabled={finish.isPending} onClick={end} className="btn-primary mt-3 w-full py-3 text-sm">{finish.isPending ? "저장 중..." : "이 날로 생리 종료 기록"}</button> : <button disabled={create.isPending} onClick={start} className="btn-primary mt-3 w-full py-3 text-sm">{create.isPending ? "저장 중..." : "이 날로 생리 시작 기록"}</button>}{error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}</section>
    {phase && <section className="card mt-4 border border-violet-100 bg-violet-50 p-5"><p className="text-xs font-bold text-violet-500">내 주기와 장 컨디션</p><h2 className="mt-1 text-base font-black text-violet-950">{phase.title}</h2><p className="mt-2 text-xs leading-relaxed text-violet-900/70">{phase.text}</p><p className="mt-3 text-[10px] text-violet-700/70">참고용 안내이며 진단이 아니에요.</p></section>}
    <section className="card mt-4 p-5"><div className="flex justify-between"><h2 className="font-black text-amber-900">최근 생리 기록</h2><span className="text-xs text-gray-400">평균 기간 {data.averagePeriod}일</span></div>{isLoading ? <p className="mt-3 text-xs text-gray-400">불러오는 중...</p> : cycles.length === 0 ? <p className="mt-3 text-xs text-gray-500">아직 생리 기록이 없어요.</p> : <ul className="mt-3 space-y-2">{cycles.slice(0, 5).map((item) => <li key={item.id} className="flex justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs"><span>{item.startedAt.replaceAll("-", ".")} {item.endedAt ? `– ${item.endedAt.replaceAll("-", ".")}` : "· 진행 중"}</span><button onClick={() => { if (window.confirm("이 생리 기록을 삭제할까요?")) remove.mutate(item.id); }} className="text-rose-500">삭제</button></li>)}</ul>}</section>
    <Link href="/diary/new" className="btn-secondary mt-4 block w-full py-3 text-center text-sm">💩 배변 기록으로 장 컨디션 남기기</Link>
  </main>;
}
