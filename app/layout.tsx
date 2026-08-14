import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "海岛夺金 · 数值实验室",
  description: "行动力、占领节奏、任务奖励与联盟排名的混合仿真决策工具。",
  icons: { icon: "/favicon.svg" },
  openGraph: { images: [{ url: "/og-v2.png", width: 1672, height: 941, alt: "三联盟海岛六边格战略态势" }] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}


