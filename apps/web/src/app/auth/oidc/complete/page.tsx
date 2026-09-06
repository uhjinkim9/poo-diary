"use client";

import { apiClient } from "@/lib/apiClient";
import { useEffect, useState } from "react";

interface CurrentUser {
  mode: "mercury" | "legacy";
  name?: string | null;
}

function safeReturnUrl(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.origin === window.location.origin
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "/";
  } catch {
    return "/";
  }
}

export default function OidcCompletePage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function complete() {
      try {
        const { data: user } = await apiClient.post<CurrentUser>("/auth/refresh");
        if (!active || user.mode !== "mercury") throw new Error("invalid session");
        if (user.name) localStorage.setItem("poo-user-name", user.name);
        localStorage.removeItem("poo-mercury-link-remind-after");
        const returnUrl = safeReturnUrl(
          new URLSearchParams(window.location.search).get("returnUrl"),
        );
        window.location.replace(returnUrl);
      } catch {
        if (active) setFailed(true);
      }
    }
    void complete();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-6">
      <div className="card w-full max-w-xs p-7 text-center">
        <p className="mb-3 text-4xl">{failed ? "⚠️" : "🔐"}</p>
        <h1 className="text-lg font-black text-amber-900">
          {failed ? "로그인을 완료하지 못했어요" : "안전하게 로그인하는 중이에요"}
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          {failed
            ? "기존 데이터는 변경되지 않았어요. 내 정보 화면에서 다시 시도해 주세요."
            : "Mercury 계정과 기존 기록을 확인하고 있어요."}
        </p>
        {failed && (
          <button
            type="button"
            onClick={() => window.location.replace("/profile?oidc_error=complete_failed")}
            className="btn-primary mt-5 w-full py-3 text-sm"
          >
            내 정보로 돌아가기
          </button>
        )}
      </div>
    </main>
  );
}
