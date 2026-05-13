import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FundLens — 基金透镜",
  description:
    "个人基金分析平台。技术指标 + AI 解说,看清楚再下手。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Google Fonts: Instrument Serif (display) + Geist (sans) + JetBrains Mono (mono) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
