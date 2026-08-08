import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { BottomNav } from "@/components/BottomNav";
import { UserSetup } from "@/components/UserSetup";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "💩 Poo Diary",
  description: "나의 배변 활동을 기록하고 건강을 관리해요",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Poo Diary",
  },
};

export const viewport: Viewport = {
  themeColor: "#fdf6ee",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} font-pretendard pb-20`}>
        <QueryProvider>
          <UserSetup />
          {children}
          <BottomNav />
        </QueryProvider>
      </body>
    </html>
  );
}
