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
};

export default pwaConfig(nextConfig);
