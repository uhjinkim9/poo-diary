/**
 * 임시 운영 공지 목록입니다.
 *
 * 추후 Mercury Lab Curation Space의 공지 API를 연결할 때 이 상수를
 * API 응답으로 교체하면 화면 컴포넌트는 그대로 재사용할 수 있습니다.
 */
export type Announcement = {
  id: string;
  title: string;
  message: string;
  startsAt: string;
  endsAt: string;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "poo-diary-server-migration-2026-10-18",
    title: "서버 이전 안내",
    message:
      "10월 18일 오전 12시부터 오전 6시까지 서버 이전 및 데이터 이관 작업이 진행됩니다. 이 시간에는 기록을 잠시 중지해 주세요.",
    startsAt: "2026-10-17T20:00:00+09:00",
    endsAt: "2026-10-18T06:00:00+09:00",
  },
];

export function activeAnnouncements(now = new Date()): Announcement[] {
  const current = now.getTime();
  return ANNOUNCEMENTS.filter(({ startsAt, endsAt }) => {
    return current >= Date.parse(startsAt) && current < Date.parse(endsAt);
  });
}
