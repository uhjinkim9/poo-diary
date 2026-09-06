"use client";

import { apiClient } from "@/lib/apiClient";
import { useEffect, useState } from "react";

interface AuthStatus {
  authenticated: boolean;
  mode: "mercury" | "legacy" | "none";
  mercuryUserId?: string;
  canLink: boolean;
  linkedDevice: boolean;
}

export default function ProfilePage() {
  const [nickname, setNickname] = useState("");
  const [saved, setSaved] = useState(false);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [oidcError, setOidcError] = useState(false);
  const [linkPending, setLinkPending] = useState(false);

  useEffect(() => {
    setNickname(localStorage.getItem("poo-user-name") ?? "");
    setOidcError(new URLSearchParams(window.location.search).has("oidc_error"));
    apiClient
      .get<AuthStatus>("/auth/status")
      .then(({ data }) => setAuth(data))
      .catch(() => setAuth(null));
  }, []);

  function save() {
    const name = nickname.trim() || "익명";
    localStorage.setItem("poo-user-name", name);
    setNickname(name);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function reset() {
    if (
      !confirm(
        "새 계정으로 시작하면 기존 데이터에 접근할 수 없어요. 계속할까요?",
      )
    )
      return;
    localStorage.removeItem("poo-user-id");
    localStorage.removeItem("poo-user-name");
    localStorage.removeItem("poo-mercury-link-remind-after");
    window.location.assign("/api/auth/oidc/login?fresh=1&returnTo=/profile");
  }

  async function beginMercuryLogin() {
    setLinkPending(true);
    const deviceUserId = localStorage.getItem("poo-user-id");
    try {
      const currentAuth =
        auth ?? (await apiClient.get<AuthStatus>("/auth/status")).data;
      setAuth(currentAuth);
      if (
        deviceUserId &&
        currentAuth.mode !== "mercury" &&
        !currentAuth.linkedDevice
      ) {
        await apiClient.post("/auth/device-session", { deviceUserId });
        const { data } = await apiClient.post<{ authorizationUrl: string }>(
          "/auth/oidc/link-account",
          { returnUrl: "/profile" },
        );
        window.location.assign(data.authorizationUrl);
        return;
      }
      window.location.assign("/api/auth/oidc/login?returnTo=/profile");
    } catch {
      setOidcError(true);
      setLinkPending(false);
    }
  }

  function logoutMercury() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/logout";
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <main className="min-h-[100dvh] w-full min-w-0 max-w-md mx-auto overflow-x-hidden p-5">
      <header className="pt-10 pb-6">
        <p className="text-xs font-medium text-amber-500 tracking-widest uppercase mb-1">
          Profile
        </p>
        <h1 className="text-3xl font-black text-amber-900">내 정보</h1>
      </header>

      {oidcError && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-600">계정 연결을 완료하지 못했어요</p>
          <p className="mt-1 text-xs leading-relaxed text-red-400">
            기존 기기 기록은 그대로 보존되어 있어요. 잠시 후 다시 로그인하거나,
            문제가 계속되면 기기 ID와 함께 관리자에게 문의해 주세요.
          </p>
        </div>
      )}

      <div className="card min-w-0 p-5 mb-4">
        <label className="block text-xs font-semibold text-amber-800 mb-2">
          닉네임
        </label>
        <div className="flex w-full min-w-0 gap-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            maxLength={20}
            className="w-0 min-w-0 flex-1 border border-amber-200 rounded-2xl px-4 py-2.5 text-sm text-amber-900 outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={save}
            className="btn-primary shrink-0 px-4 py-2.5 text-sm"
          >
            {saved ? "✓" : "저장"}
          </button>
        </div>
      </div>

      <div className="card p-5 mb-4 border border-amber-100">
        {auth?.mode === "mercury" ? (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl">
                ✓
              </span>
              <div>
                <p className="text-sm font-bold text-amber-900">
                  Mercury 계정 연결 완료
                </p>
                <p className="text-[11px] text-gray-400">
                  데이터가 보호되며 여러 기기에서 사용할 수 있어요.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logoutMercury}
              className="mt-4 w-full rounded-2xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-500"
            >
              Mercury 계정 로그아웃
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-amber-500 mb-1">
              데이터 보호 · 여러 기기에서 사용
            </p>
            <h2 className="text-lg font-black text-amber-900 mb-2">
              Mercury 계정으로 안전하게 보관하세요
            </h2>
            <p className="text-xs leading-relaxed text-gray-500 mb-4">
              가입하거나 로그인하면 이 기기의 기존 기록을 계정에 안전하게 연결해요.
              사용자의 확인 없이 계정을 만들거나 데이터를 합치지 않아요.
            </p>
            <button
              type="button"
              disabled={linkPending}
              onClick={() => void beginMercuryLogin()}
              className="btn-primary w-full py-3 text-sm disabled:opacity-60"
            >
              {linkPending ? "기기 데이터 확인 중..." : "Mercury 계정 가입 또는 로그인"}
            </button>
          </>
        )}
      </div>

      <div className="card p-5">
        <p className="text-xs font-semibold text-amber-800 mb-1">내 기기 ID</p>
        <p className="text-[11px] text-gray-400 font-mono break-all">
          {typeof window !== "undefined"
            ? (localStorage.getItem("poo-user-id") ?? "-")
            : "-"}
        </p>
        <p className="text-[10px] text-amber-400 mt-2">
          {auth?.mode === "mercury"
            ? "기존 데이터의 출처 확인을 위해 보존되며 로그인에는 사용되지 않아요."
            : "이 ID로 내 기록이 구분돼요. Mercury 계정 연결 전에는 기기를 바꾸면 데이터가 보이지 않아요."}
        </p>
      </div>

      {auth?.mode !== "mercury" && (
        <button
          onClick={reset}
          className="mt-4 w-full py-3 rounded-2xl text-sm font-semibold text-red-400 border border-red-100 bg-red-50 active:scale-95 transition-all"
        >
          통합계정으로 새로 시작하기
        </button>
      )}
    </main>
  );
}
