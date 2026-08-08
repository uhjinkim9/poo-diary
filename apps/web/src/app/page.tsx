import Link from "next/link";

const TIPS = [
  "4형이 가장 이상적인 형태예요 💩",
  "매일 기록하면 건강 패턴을 파악할 수 있어요",
  "수분을 충분히 섭취하면 도움이 돼요",
  "갈색이 가장 정상적인 색상이에요",
];

export default function HomePage() {
  const tip = TIPS[new Date().getDate() % TIPS.length];

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
        <p className="text-xs font-semibold text-amber-500 mb-1">
          오늘의 퀘 팁
        </p>
        <p className="text-sm text-amber-800">{tip}</p>
      </div>

      {/* 메인 CTA */}
      <Link
        href="/diary/new"
        className="btn-primary w-full py-5 text-center text-xl mb-4 block"
      >
        기록하기 💩
      </Link>

      {/* 퀘 이모지 그리드 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { emoji: "1기본", label: "실력 1", href: "/diary" },
          { emoji: "📊", label: "통계", href: "/stats" },
          { emoji: "🏆", label: "연속기록", href: "/stats" },
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
