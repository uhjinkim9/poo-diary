self.addEventListener("push", (event) => {
  let message = {
    title: "Poo Diary",
    body: "필요할 때 오늘의 기록을 편하게 남겨 주세요.",
    url: "/",
  };
  try {
    message = { ...message, ...(event.data ? event.data.json() : {}) };
  } catch {
    // 잘못된 Push payload는 기본 문구로 안전하게 처리한다.
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `poo-diary-${message.type ?? "reminder"}`,
      data: { url: message.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === target);
      return existing ? existing.focus() : self.clients.openWindow(target);
    }),
  );
});
