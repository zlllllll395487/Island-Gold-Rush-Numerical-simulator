import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  AllianceGapChart,
  BattleRhythmChart,
  PlayerContributionPareto,
  PlayerSegmentHeatmap,
} from "../../src/components/OverviewAnalyticsCharts";
import type { OverviewReplayPoint, PlayerContributionPoint } from "../../src/analytics/overview-analytics";

const points: OverviewReplayPoint[] = [
  { second: 0, hour: 0, allianceTotals: [0, 0, 0], occupiedValues: [5, 5, 5], territoryCounts: [1, 1, 1], hourlyBattles: 1, hourlyCaptures: 1, hourlyAverageBattlePoints: 10 },
  { second: 3600, hour: 1, allianceTotals: [20, 15, 0], occupiedValues: [12, 16, 6], territoryCounts: [3, 4, 2], hourlyBattles: 2, hourlyCaptures: 0, hourlyAverageBattlePoints: 12.5 },
  { second: 7200, hour: 2, allianceTotals: [20, 15, 50], occupiedValues: [12, 16, 30], territoryCounts: [3, 4, 6], hourlyBattles: 3, hourlyCaptures: 2, hourlyAverageBattlePoints: 9.5 },
];

const contributions: PlayerContributionPoint[] = [
  { playerId: "P1", allianceId: 1, powerTier: "low", activityTier: "core", power: 100_000, apUtilization: 0.75, score: 20 },
  { playerId: "P2", allianceId: 2, powerTier: "mid", activityTier: "normal", power: 1_000_000, apUtilization: 0.5, score: 15 },
  { playerId: "P3", allianceId: 3, powerTier: "super", activityTier: "casual", power: 10_000_000, apUtilization: 0.25, score: 0 },
];

describe("overview analytics charts", () => {
  test("renders each alliance as its gap from the same-time mean", () => {
    render(<AllianceGapChart points={points} currentSecond={3600} />);
    const chart = screen.getByRole("img", { name: "三联盟相对平均分差" });
    expect(within(chart).getAllByTestId(/alliance-gap-line-/)).toHaveLength(3);
    expect(within(chart).getByText("+8.3")).toBeInTheDocument();
    expect(within(chart).getByText("+3.3")).toBeInTheDocument();
    expect(within(chart).getByText("−11.7")).toBeInTheDocument();
  });

  test("shows battle rhythm with bars, average line and the three requested current metrics", () => {
    render(<BattleRhythmChart points={points} metrics={{ totalBattles: 3, averageBattlePoints: 12.5, rankChangeCount: 2, rankChangeSeconds: [1200, 3600] }} />);
    const chart = screen.getByRole("img", { name: "每小时战斗与占领节奏" });
    expect(within(chart).getAllByTestId("battle-bar")).toHaveLength(3);
    expect(within(chart).getAllByTestId("capture-bar")).toHaveLength(3);
    const averageLine = within(chart).getByTestId("average-battle-score-line");
    expect(averageLine).toBeInTheDocument();
    expect(new Set(averageLine.getAttribute("points")!.split(" ").map((point) => point.split(",")[1])).size).toBe(3);
    expect(screen.getAllByText("每小时场均战功")).toHaveLength(2);
    expect(screen.getByText("总战斗次数").querySelector("strong")).toHaveTextContent("3");
    expect(screen.getByTestId("overview-average-battle-score")).toHaveTextContent("9.5");
    expect(screen.getByText("领先联盟易手").querySelector("strong")).toHaveTextContent("2");
  });

  test("aggregates players into readable power and activity contribution cells", () => {
    render(<PlayerSegmentHeatmap points={contributions} />);
    const chart = screen.getByRole("img", { name: "玩家战力与活跃分层贡献" });
    expect(within(chart).getAllByTestId("player-segment-cell")).toHaveLength(20);
    expect(within(chart).getByLabelText("低战力·核心：1人，总积分20，人均20")).toBeInTheDocument();
    expect(within(chart).getAllByText("0人")).toHaveLength(17);
    expect(screen.getByText("格内为人均积分")).toBeInTheDocument();
  });

  test("shows how much score is contributed by the leading share of players", () => {
    render(<PlayerContributionPareto points={contributions} />);
    const chart = screen.getByRole("img", { name: "玩家积分贡献集中度" });
    const curve = within(chart).getByTestId("player-contribution-curve");
    expect(curve).toHaveAttribute("stroke", "#009c8d");
    expect(within(chart).getByTestId("player-contribution-area")).toBeInTheDocument();
    expect(within(chart).getByText(/前 10%/)).toBeInTheDocument();
  });
});