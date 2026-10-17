"use client";

import { useEffect, useState } from "react";
import { activeAnnouncements, type Announcement } from "@/lib/announcements";

const dismissedKey = (id: string) => `poo-diary:announcement-dismissed:${id}`;

/** 접속 중 한 번만 보이는 운영 공지. 현재는 코드 설정, 이후 중앙 공지 API로 교체한다. */
export function AnnouncementPopup() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const next = activeAnnouncements().find(
      (item) => sessionStorage.getItem(dismissedKey(item.id)) !== "true",
    );
    setAnnouncement(next ?? null);
  }, []);

  if (!announcement) return null;

  const currentAnnouncement = announcement;

  function close() {
    sessionStorage.setItem(dismissedKey(currentAnnouncement.id), "true");
    setAnnouncement(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-amber-950/30 p-4 sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
    >
      <section className="w-full max-w-sm rounded-3xl border border-amber-100 bg-white p-6 shadow-2xl">
        <p className="text-2xl" aria-hidden="true">📢</p>
        <h2 id="announcement-title" className="mt-3 text-xl font-black text-amber-950">
          {currentAnnouncement.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          {currentAnnouncement.message}
        </p>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          점검 예정: 10월 18일 00:00 – 06:00 (한국 시간)
        </p>
        <button type="button" onClick={close} className="btn-primary mt-5 w-full py-3 text-sm">
          확인했어요
        </button>
      </section>
    </div>
  );
}
