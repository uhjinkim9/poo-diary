import axios from "axios";

export const apiClient = axios.create({
  // 프로덕션: 기본값 /api → Next.js rewrites가 파드 내부로 프록시
  // 로컬 개발: .env.local의 NEXT_PUBLIC_API_URL=http://localhost:3001 로 오버라이드
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// localStorage의 userId를 모든 요청에 자동 첨부
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const userId = localStorage.getItem("poo-user-id");
    if (userId) config.headers["x-user-id"] = userId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);
