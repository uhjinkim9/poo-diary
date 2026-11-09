"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

type ReminderConfig = { enabled: boolean; webhookConfigured: boolean; menstrualEnabled: boolean; bowelCheerEnabled: boolean };

export function DiscordReminderSettings() {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { apiClient.get<ReminderConfig>("/reminders/config").then(({ data }) => setConfig(data)).catch(() => setConfig(null)); }, []);
  async function save(next: Partial<Pick<ReminderConfig, "menstrualEnabled" | "bowelCheerEnabled">> & { webhookUrl?: string }, success: string) {
    if (!config) return; setSaving(true); setMessage(null);
    try { const { data } = await apiClient.put<ReminderConfig>("/reminders/config", next); setConfig(data); setWebhookUrl(""); setMessage(success); }
    catch { setMessage("설정을 저장하지 못했어요. Discord Incoming Webhook URL을 다시 확인해 주세요."); }
    finally { setSaving(false); }
  }
  async function test() {
    setSaving(true); setMessage(null);
    try { const { data } = await apiClient.post<{ sent: boolean }>("/reminders/test"); setMessage(data.sent ? "테스트 메시지를 Discord로 보냈어요. ✨" : "먼저 Discord Webhook URL을 저장해 주세요."); }
    catch { setMessage("테스트 메시지 전송에 실패했어요. Webhook URL을 확인해 주세요."); }
    finally { setSaving(false); }
  }
  if (!config?.enabled) return null;
  return <section className="card mb-4 p-5">
    <p className="text-xs font-medium text-amber-500">리마인더</p><h2 className="mt-1 text-lg font-black text-amber-900">Discord로 받아보기</h2>
    <p className="mt-2 text-xs leading-relaxed text-gray-500">Webhook URL은 암호화해 보관하며, 화면에 다시 표시하지 않아요.</p>
    <label className="mt-4 block text-xs font-bold text-amber-900">Discord Incoming Webhook URL</label>
    <input type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder={config.webhookConfigured ? "저장됨 · 새 URL로 교체하려면 입력" : "https://discord.com/api/webhooks/..."} className="mt-2 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 outline-none focus:ring-2 focus:ring-amber-400" />
    <button type="button" disabled={saving || !webhookUrl.trim()} onClick={() => void save({ webhookUrl: webhookUrl.trim() }, "Webhook URL을 안전하게 저장했어요.")} className="mt-2 w-full rounded-xl border border-amber-200 bg-white py-2 text-xs font-bold text-amber-800 disabled:opacity-50">{config.webhookConfigured ? "Webhook URL 교체" : "Webhook URL 저장"}</button>
    <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-rose-50 p-3"><span><span className="block text-sm font-bold text-rose-950">🌷 생리 예정 알림</span><span className="block text-[11px] text-gray-500">예정 7일 전 · 3일 전 · 예정 당일 오전 8시</span></span><input type="checkbox" checked={config.menstrualEnabled} disabled={saving || !config.webhookConfigured} onChange={(event) => void save({ menstrualEnabled: event.target.checked }, "생리 예정 알림을 저장했어요.")} className="h-5 w-5 accent-rose-600 disabled:opacity-50" /></label>
    <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 p-3"><span><span className="block text-sm font-bold text-amber-950">💩 배변 응원</span><span className="block text-[11px] text-gray-500">매일 오전 8시에 가볍게 응원해 드려요.</span></span><input type="checkbox" checked={config.bowelCheerEnabled} disabled={saving || !config.webhookConfigured} onChange={(event) => void save({ bowelCheerEnabled: event.target.checked }, "배변 응원을 저장했어요.")} className="h-5 w-5 accent-amber-700 disabled:opacity-50" /></label>
    {config.webhookConfigured && <button type="button" disabled={saving} onClick={() => void test()} className="mt-4 w-full rounded-2xl border border-amber-200 bg-white py-2.5 text-xs font-bold text-amber-800 disabled:opacity-50">🧪 Discord 테스트 메시지 보내기</button>}
    {message && <p className="mt-3 text-xs font-medium text-amber-700">{message}</p>}
  </section>;
}
