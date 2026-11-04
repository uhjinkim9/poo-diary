"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

type Preference = {
  morningEnabled: boolean;
  morningHour: number;
  inactivityEnabled: boolean;
  inactivityDays: number;
};

type PushConfig = {
  enabled: boolean;
  vapidPublicKey: string;
  preference: Preference;
};

function toApplicationServerKey(value: string): ArrayBuffer {
  const base64 = `${value.replace(/-/g, "+").replace(/_/g, "/")}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const decoded = window.atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes.buffer;
}

export function PushNotificationSettings() {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<PushConfig>("/notifications/config")
      .then(({ data }) => setConfig(data))
      .catch(() => setConfig(null));
  }, []);

  async function ensureSubscription(): Promise<boolean> {
    if (!config?.vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMessage("이 브라우저에서는 푸시 알림을 지원하지 않아요.");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage("브라우저 설정에서 알림 권한을 허용해 주세요.");
      return false;
    }
    // ServiceWorkerContainer.ready는 활성 워커가 생길 때까지 끝나지 않을 수 있다.
    // 설정 버튼이 계속 비활성화된 채 남는 일을 막기 위해 준비 시간을 제한한다.
    const registration = await Promise.race<ServiceWorkerRegistration | null>([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), 10_000);
      }),
    ]);
    if (!registration) {
      setMessage("알림 준비에 시간이 걸리고 있어요. 화면을 새로고침한 뒤 다시 시도해 주세요.");
      return false;
    }
    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toApplicationServerKey(config.vapidPublicKey),
      });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      setMessage("푸시 구독 정보를 만들지 못했어요.");
      return false;
    }
    await apiClient.post("/notifications/subscriptions", {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      expirationTime: subscription.expirationTime
        ? new Date(subscription.expirationTime).toISOString()
        : null,
    });
    return true;
  }

  async function update(next: Partial<Preference>) {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      if ((next.morningEnabled || next.inactivityEnabled) && !(await ensureSubscription())) return;
      const { data } = await apiClient.put<Preference>("/notifications/preferences", next);
      setConfig({ ...config, preference: data });
      setMessage("알림 설정을 저장했어요.");
    } catch {
      setMessage("알림 설정을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  if (!config?.enabled) return null;
  const preference = config.preference;
  return (
    <section className="card mb-4 p-5">
      <p className="text-xs font-medium text-amber-500">알림</p>
      <h2 className="mt-1 text-lg font-black text-amber-900">나에게 맞는 리마인더</h2>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        알림은 직접 켠 경우에만 전송되며, 잠금화면에는 민감한 건강 정보를 표시하지 않아요.
      </p>

      <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 p-3">
        <span><span className="block text-sm font-bold text-amber-950">아침 응원</span><span className="block text-[11px] text-gray-500">매일 선택한 시각에 가볍게 알려드려요.</span></span>
        <input type="checkbox" checked={preference.morningEnabled} disabled={saving} onChange={(event) => void update({ morningEnabled: event.target.checked })} className="h-5 w-5 accent-amber-700" />
      </label>
      {preference.morningEnabled && <label className="mt-2 flex items-center justify-between px-3 text-xs text-amber-900">알림 시각<select value={preference.morningHour} disabled={saving} onChange={(event) => void update({ morningHour: Number(event.target.value) })} className="rounded-lg border border-amber-200 bg-white px-2 py-1">{Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>오전/오후 {hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}시</option>)}</select></label>}

      <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 p-3">
        <span><span className="block text-sm font-bold text-amber-950">기록 리마인드</span><span className="block text-[11px] text-gray-500">최근 접속이 없을 때 한 번만 알려드려요.</span></span>
        <input type="checkbox" checked={preference.inactivityEnabled} disabled={saving} onChange={(event) => void update({ inactivityEnabled: event.target.checked })} className="h-5 w-5 accent-amber-700" />
      </label>
      {preference.inactivityEnabled && <label className="mt-2 flex items-center justify-between px-3 text-xs text-amber-900">리마인드 기준<select value={preference.inactivityDays} disabled={saving} onChange={(event) => void update({ inactivityDays: Number(event.target.value) })} className="rounded-lg border border-amber-200 bg-white px-2 py-1">{[3, 5, 7, 14].map((day) => <option key={day} value={day}>{day}일 미접속</option>)}</select></label>}
      {message && <p className="mt-3 text-xs font-medium text-amber-700">{message}</p>}
    </section>
  );
}
