"use client";

import { useEffect, useState } from "react";

export function UserSetup() {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("poo-user-id")) setOpen(true);
  }, []);

  function submit() {
    const name = nickname.trim() || "익명";
    localStorage.setItem("poo-user-id", crypto.randomUUID());
    localStorage.setItem("poo-user-name", name);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-xs text-center">
        <p className="text-5xl mb-4">💩</p>
        <h1 className="text-xl font-black text-amber-900 mb-1">Poo Diary</h1>
        <p className="text-xs text-amber-500 mb-6">
          나만의 배변 일기를 시작해요
        </p>

        <label className="block text-left text-xs font-semibold text-amber-800 mb-1.5">
          닉네임
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="예: 건강한토끼"
          maxLength={20}
          className="w-full border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-900 placeholder-amber-300 outline-none focus:ring-2 focus:ring-amber-400 mb-4"
          autoFocus
        />
        <button onClick={submit} className="btn-primary w-full py-3 text-sm">
          시작하기
        </button>
      </div>
    </div>
  );
}
