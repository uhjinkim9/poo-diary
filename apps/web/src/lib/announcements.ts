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

export const ANNOUNCEMENTS: Announcement[] = [];

export function activeAnnouncements(now = new Date()): Announcement[] {
  const current = now.getTime();
  return ANNOUNCEMENTS.filter(({ startsAt, endsAt }) => {
    return current >= Date.parse(startsAt) && current < Date.parse(endsAt);
  });
}
