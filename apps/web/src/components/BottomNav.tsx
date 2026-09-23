"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/diary", label: "기록", icon: "📋" },
  { href: "/diary/new", label: "", icon: "💩" },
  { href: "/stats", label: "분석", icon: "📊" },
  { href: "/cycle", label: "주기", icon: "🌙" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-amber-100 pb-safe">
      <div className="max-w-md mx-auto flex items-end justify-around px-2 h-16">
        {NAV_ITEMS.map((item) => {
          const isRecord = item.href === "/diary/new";
          const isActive = pathname === item.href;

          if (isRecord) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5"
              >
                <span className="w-14 h-14 bg-amber-800 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-amber-800/30 active:scale-90 transition-transform">
                  {item.icon}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 pt-2 w-16"
            >
              <span
                className={`text-xl transition-transform ${isActive ? "scale-110" : ""}`}
              >
                {item.icon}
              </span>
              <span
                className={`text-xs font-medium transition-colors ${isActive ? "text-amber-800" : "text-gray-400"}`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-amber-800 mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
