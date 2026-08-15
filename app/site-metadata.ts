import type { Metadata } from "next";

export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function buildMetadata(origin: string): Metadata {
  const title = "海岛夺金 数值模拟";
  const description = "可调整参数并重复运行，用于分析行动力、占领节奏、玩家战力、活跃度、士气、任务奖励与联盟竞争的交互式数值模拟器。";
  const image = "/og-v3.png";

  return {
    metadataBase: new URL(origin),
    title,
    description,
    icons: { icon: "/favicon.svg" },
    openGraph: {
      title,
      description,
      type: "website",
      url: origin,
      images: [{ url: image, width: 1536, height: 1024, alt: "海岛夺金数值模拟的策略与战况分析面板" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, width: 1536, height: 1024, alt: "海岛夺金数值模拟的策略与战况分析面板" }],
    },
  };
}
