import { describe, expect, test } from "vitest";
import { buildMetadata } from "../app/site-metadata";

describe("site metadata", () => {
  test("uses the approved product name and versioned social preview", () => {
    const metadata = buildMetadata("https://simulator.example.test");

    expect(metadata.title).toBe("海岛夺金 数值模拟");
    expect(metadata.description).toMatch(/参数/);
    expect(metadata.icons).toEqual({ icon: "/favicon.svg" });
    expect(metadata.metadataBase?.href).toBe("https://simulator.example.test/");
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      title: "海岛夺金 数值模拟",
      images: [{
        url: "/og-v3.png",
        width: 1536,
        height: 1024,
        alt: "海岛夺金数值模拟的策略与战况分析面板",
      }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [{
        url: "/og-v3.png",
        width: 1536,
        height: 1024,
        alt: "海岛夺金数值模拟的策略与战况分析面板",
      }],
    });
  });
});
