import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DecisionSummary } from "../../src/components/DecisionSummary";
import type { MatchMetrics } from "../../src/analytics/metrics";

const metrics = {
  firstPvpHour: 3.25,
  firstPvpStatus: "target",
  mapValueGap: 0.24,
  apWasteRate: 0.18,
  centerContestIntensity: { score: 0.62, battles: 128, captures: 7, controlHours: 18.5 },
  scoreConcentrationTop10: 0.43,
  powerScoreCorrelation: 0.72,
} as MatchMetrics;

describe("editorial decision summary", () => {
  test("presents five decision metrics and a data-backed diagnosis without dashboard filler", () => {
    render(<DecisionSummary metrics={metrics} targetRange={[3, 6]} />);

    const summary = screen.getByTestId("decision-summary");
    for (const label of [
      "首次有效 PvP",
      "地图价值差",
      "行动力浪费率",
      "中心争夺强度",
      "积分集中度",
    ]) {
      expect(within(summary).getByText(label)).toBeInTheDocument();
    }
    expect(within(summary).getByText("3小时15分")).toBeInTheDocument();
    expect(within(summary).getByText("24%")).toBeInTheDocument();
    expect(within(summary).getByText("18%")).toBeInTheDocument();
    expect(within(summary).getByText("62%")).toBeInTheDocument();
    expect(within(summary).getByText("43%")).toBeInTheDocument();
    expect(within(summary).getByRole("note", { name: "本局诊断" })).toHaveTextContent("3.25");
    expect(within(summary).queryByText("活跃战线")).not.toBeInTheDocument();
    expect(within(summary).queryByText("本局计算")).not.toBeInTheDocument();
  });
});
