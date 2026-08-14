import type { Metadata } from "next";
import { buildMetadata, SITE_ORIGIN } from "./site-metadata";
import "./globals.css";

export const metadata: Metadata = buildMetadata(SITE_ORIGIN);

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
