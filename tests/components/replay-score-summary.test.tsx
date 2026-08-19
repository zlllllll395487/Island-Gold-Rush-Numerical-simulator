import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PlayerScoreLedger, ReplayScoreSummary } from "../../src/components/ReplayScoreSummary";
import type { ReplaySnapshot, SimulationResult } from "../../src/simulation/engine";
import type { Player } from "../../src/population/generate-players";

const scoreTotals = (total: number) => [
  { battle: total - 10, occupation: 10, total },
  { battle: total - 8, occupation: 8, total },
  { battle: total - 6, occupation: 6, total },
] as ReplaySnapshot["scoreTotals"];

const snapshot = (hour: number, total: number, scores: [number, number, number]) => ({
  hour,
  second: hour * 3600,
  scores,
  scoreTotals: scoreTotals(total),
}) as ReplaySnapshot;

const player = {
  id: "P001",
  name: "远征者001",
  allianceId: 1,
  powerTier: "high",
  power: 2_000_000,
  activityTier: "active",
  apUsagePropensity: 0.8,
  heroCount: 22,
  formationProfiles: [],
  strategy: "value",
  behaviorStrategy: "centerRush",
  personalScore: 60,
  battleScore: 50,
  occupationScore: 10,
  actions: 5,
  occupations: 1,
  kills: 500_000,
  apSpent: 50,
  apOverflow: 0,
  apSupply: 100,
  maxActiveFormations: 3,
  maxWinStreak: 2,
} satisfies Player;

const snapshots = [snapshot(0, 10, [5, 4, 3]), snapshot(1, 30, [7, 6, 5])];
const result = {
  snapshots,
  players: [player],
  scoreEvents: Array.from({ length: 60 }, (_, index) => ({
    second: (index + 1) * 10,
    playerId: player.id,
    allianceId: 1 as const,
    source: index % 2 === 0 ? "battle" as const : "occupation" as const,
    delta: 1,
    totalAfter: index + 1,
    tileId: 1,
  })),
} as SimulationResult;

describe("lightweight score replay visuals", () => {
  test("keeps alliance cumulative score and occupied value synchronized with the selected snapshot", () => {
    const view = render(<ReplayScoreSummary result={result} snapshot={snapshots[1]} />);
    expect(screen.getByRole("img", { name: "联盟累计积分走势" })).toBeInTheDocument();
    expect(screen.getByText("赤潮联邦")).toBeInTheDocument();
    expect(view.container.querySelector(".score-sparkline polyline")?.getAttribute("stroke")).toBe("#a55b56");
    expect(view.container.querySelectorAll(".score-chart-grid")).toHaveLength(4);
    expect(view.container.querySelectorAll(".score-chart-axis-label")).toHaveLength(4);
    expect(screen.getByTestId("alliance-score-1")).toHaveTextContent("30");
    expect(screen.getByTestId("occupied-value-1")).toHaveTextContent("7");

    view.rerender(<ReplayScoreSummary result={result} snapshot={snapshots[0]} />);
    expect(screen.getByTestId("alliance-score-1")).toHaveTextContent("10");
    expect(screen.getByTestId("occupied-value-1")).toHaveTextContent("5");
  });

  test("shows score events only up to replay time and expands in batches of fifty", () => {
    const view = render(<PlayerScoreLedger result={result} player={player} second={600} />);
    expect(view.container.querySelectorAll("[data-score-event]")).toHaveLength(50);
    expect(screen.getByRole("button", { name: "再显示 10 条" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "再显示 10 条" }));
    expect(view.container.querySelectorAll("[data-score-event]")).toHaveLength(60);

    view.rerender(<PlayerScoreLedger result={result} player={player} second={90} />);
    expect(view.container.querySelectorAll("[data-score-event]")).toHaveLength(9);
    expect(screen.getByText("战功 5 · 占领 4 · 总分 9")).toBeInTheDocument();
  });
});