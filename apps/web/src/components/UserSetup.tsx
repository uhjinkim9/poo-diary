"use client";

import { apiClient } from "@/lib/apiClient";
import { useEffect, useState } from "react";

export function UserSetup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkFirstVisit() {
      if (localStorage.getItem("poo-user-id")) return;
      try {
        const { data } = await apiClient.get<{ mode: "mercury" | "legacy" | "none" }>(
          "/auth/status",
        );
        if (active && data.mode !== "mercury") setOpen(true);
      } catch {
        if (active) setOpen(true);
      }
    }
    void checkFirstVisit();
    return () => {
      active = false;
    };
  }, []);

  function startWithMercury() {
    window.location.assign("/api/auth/oidc/login?fresh=1&returnTo=/");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-xs text-center">
        <p className="text-5xl mb-4">💩</p>
        <h1 className="text-xl font-black text-amber-900 mb-1">Poo Diary</h1>
        <p className="mb-6 text-xs leading-relaxed text-amber-500">
          Mercury Lab 통합계정으로 기록을 안전하게 보관하고 여러 기기에서
          이어서 사용할 수 있어요.
        </p>
        <button
          type="button"
          onClick={startWithMercury}
          className="btn-primary w-full py-3 text-sm"
        >
          통합계정으로 시작하기
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
          계정이 없다면 로그인 화면에서 새로 가입할 수 있어요.
        </p>
      </div>
    </div>
  );
}
