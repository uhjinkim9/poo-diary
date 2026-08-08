import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poo Diary",
    short_name: "PooDiary",
    description: "나의 배변 활동을 기록하고 건강을 관리해요",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f0eb",
    theme_color: "#8b4513",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["health", "lifestyle"],
  };
}
