import type { NextConfig } from "next";
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  // standalone은 Docker 빌드 시에만 활성화 (Windows 심링크 권한 문제 회피)
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  reactStrictMode: true,
  transpilePackages: ["@poo-diary/shared"],
  // /api/* → 파드 내부 백엔드로 프록시 (브라우저가 localhost를 쓸 수 없는 문제 해결)
  async rewrites() {
    const dest = process.env.INTERNAL_API_URL ?? "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${dest}/:path*`,
      },
    ];
  },
};

export default pwaConfig(nextConfig);
