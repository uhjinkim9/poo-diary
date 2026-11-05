"use client";

import { useEffect } from "react";

/**
 * next-pwa의 자동 등록은 Pages Router 엔트리 의존성이 있어 App Router에서
 * 누락될 수 있다. 앱을 열 때 직접 등록해 Push API가 항상 활성 워커를 찾게 한다.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
