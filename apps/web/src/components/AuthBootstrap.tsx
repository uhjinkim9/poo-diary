"use client";

import { apiClient } from "@/lib/apiClient";
import { useEffect, useState } from "react";

interface AuthStatus {
  authenticated: boolean;
  mode: "mercury" | "legacy" | "none";
  canLink: boolean;
  linkedDevice: boolean;
  shouldAttemptSso: boolean;
  migrationMode: "off" | "prompt" | "required";
  reminderDays: number;
}

const DISMISS_KEY = "poo-mercury-link-remind-after";

export function AuthBootstrap() {
  const [showMigration, setShowMigration] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(false);
  const [required, setRequired] = useState(false);
  const [reminderDays, setReminderDays] = useState(3);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        let { data: status } = await apiClient.get<AuthStatus>("/auth/status");
        const deviceUserId = localStorage.getItem("poo-user-id");

        if (status.mode === "legacy" && deviceUserId) {
          await apiClient.post("/auth/device-session", { deviceUserId });
        }

        if (
          status.mode === "none" &&
          deviceUserId &&
          !status.linkedDevice &&
          !status.shouldAttemptSso
        ) {
          await apiClient.post("/auth/device-session", { deviceUserId });
          ({ data: status } = await apiClient.get<AuthStatus>("/auth/status"));
        }

        if (active && status.shouldAttemptSso) {
          window.location.assign("/api/auth/login?silent=1&returnTo=/");
          return;
        }

        const remindAfter = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
        if (
          active &&
          status.mode === "legacy" &&
          status.canLink &&
          status.migrationMode !== "off" &&
          Date.now() >= remindAfter
        ) {
          setRequired(status.migrationMode === "required");
          setReminderDays(status.reminderDays);
          setShowMigration(true);
        }
      } catch {
        // 기존 헤더 인증은 전환 기간 동안 계속 동작하므로 앱 사용을 막지 않는다.
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  function remindLater() {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + reminderDays * 24 * 60 * 60 * 1000),
    );
    setShowMigration(false);
  }

  async function connect() {
    setIsConnecting(true);
    setError(false);
    const deviceUserId = localStorage.getItem("poo-user-id");
    try {
      if (!deviceUserId) throw new Error("missing device identity");
      await apiClient.post("/auth/device-session", { deviceUserId });
      const { data } = await apiClient.post<{ authorizationUrl: string }>(
        "/auth/oidc/link-account",
        { returnUrl: "/profile" },
      );
      window.location.assign(data.authorizationUrl);
    } catch {
      setError(true);
      setIsConnecting(false);
    }
  }

  if (!showMigration) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mercury-migration-title"
        className="w-full max-w-xs rounded-3xl bg-white p-7 shadow-xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          🛡️
        </div>
        <h2
          id="mercury-migration-title"
          className="mb-2 text-xl font-black text-amber-900"
        >
          통합계정으로 더 안전하게 이용하세요
        </h2>
        <p className="mb-5 text-xs leading-relaxed text-gray-500">
          현재 푸다이어리 기록은 그대로 유지됩니다. Mercury Lab 통합계정을
          만들거나 로그인하면 기존 계정에 안전하게 연결해 드려요.
        </p>
        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-500">
            기기 세션을 확인하지 못했어요. 기존 기록은 그대로이며 잠시 후 다시
            시도할 수 있어요.
          </p>
        )}
        <button
          type="button"
          disabled={isConnecting}
          onClick={() => void connect()}
          className="btn-primary w-full py-3 text-sm disabled:opacity-60"
        >
          {isConnecting ? "기존 기록 확인 중..." : "통합계정 연결하기"}
        </button>
        {!required && (
          <button
            type="button"
            disabled={isConnecting}
            onClick={remindLater}
            className="mt-2 w-full py-2.5 text-xs font-semibold text-gray-400"
          >
            나중에 하기
          </button>
        )}
      </div>
    </div>
  );
}
