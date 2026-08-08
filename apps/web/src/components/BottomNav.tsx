"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/diary", label: "기록", icon: "📋" },
  { href: "/diary/new", label: "", icon: "💩" },
  { href: "/stats", label: "통계", icon: "📊" },
  { href: "/profile", label: "내 정보", icon: null },
];

export function BottomNav() {
  const pathname = usePathname();
  const [initial, setInitial] = useState("?");

  useEffect(() => {
    const name = localStorage.getItem("poo-user-name") ?? "?";
    setInitial(name.charAt(0).toUpperCase());
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-amber-100 pb-safe">
      <div className="max-w-md mx-auto flex items-end justify-around px-2 h-16">
        {NAV_ITEMS.map((item) => {
          const isRecord = item.href === "/diary/new";
          const isActive = pathname === item.href;
          const isProfile = item.href === "/profile";

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

          if (isProfile) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 pt-2 w-16"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? "bg-amber-800 text-white scale-110" : "bg-amber-100 text-amber-700"}`}
                >
                  {initial}
                </span>
                <span
                  className={`text-xs font-medium ${isActive ? "text-amber-800" : "text-gray-400"}`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-amber-800 mt-0.5" />
                )}
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
