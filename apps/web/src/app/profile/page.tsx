"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [nickname, setNickname] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNickname(localStorage.getItem("poo-user-name") ?? "");
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
    location.reload();
  }

  return (
    <main className="min-h-[100dvh] p-5 max-w-md mx-auto">
      <header className="pt-10 pb-6">
        <p className="text-xs font-medium text-amber-500 tracking-widest uppercase mb-1">
          Profile
        </p>
        <h1 className="text-3xl font-black text-amber-900">내 정보</h1>
      </header>

      <div className="card p-5 mb-4">
        <label className="block text-xs font-semibold text-amber-800 mb-2">
          닉네임
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            maxLength={20}
            className="flex-1 border border-amber-200 rounded-2xl px-4 py-2.5 text-sm text-amber-900 outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button onClick={save} className="btn-primary px-4 py-2.5 text-sm">
            {saved ? "✓" : "저장"}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-xs font-semibold text-amber-800 mb-1">내 기기 ID</p>
        <p className="text-[11px] text-gray-400 font-mono break-all">
          {typeof window !== "undefined"
            ? (localStorage.getItem("poo-user-id") ?? "-")
            : "-"}
        </p>
        <p className="text-[10px] text-amber-400 mt-2">
          이 ID로 내 기록이 구분돼요. 기기를 바꾸면 데이터가 보이지 않아요.
        </p>
      </div>

      <button
        onClick={reset}
        className="mt-4 w-full py-3 rounded-2xl text-sm font-semibold text-red-400 border border-red-100 bg-red-50 active:scale-95 transition-all"
      >
        새 계정으로 시작하기
      </button>
    </main>
  );
}
