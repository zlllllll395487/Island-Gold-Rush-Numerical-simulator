import { overviewAt, overviewReplaySeries, playerContributionAt, tileBattleHeatAt } from "../../src/analytics/overview-analytics";
import type { Player } from "../../src/population/generate-players";
import type { ReplaySnapshot, SimulationResult } from "../../src/simulation/engine";

const player = (id: string, allianceId: 1 | 2 | 3, power: number, apSpent: number): Player => ({
  id,
  name: id,
  allianceId,
  powerTier: "low",
  power,
  activityTier: "normal",
  apUsagePropensity: 0.5,
  heroCount: 22,
  formationProfiles: [],
  strategy: "frontier",
  behaviorStrategy: "multiFront",
  personalScore: 0,
  battleScore: 0,
  occupationScore: 0,
  actions: 0,
  occupations: 0,
  kills: 0,
  apSpent,
  apOverflow: 0,
  apSupply: 100,
  maxActiveFormations: 1,
  maxWinStreak: 0,
});

const snapshot = (
  second: number,
  totals: [number, number, number],
  values: [number, number, number],
  territory: [number, number, number],
): ReplaySnapshot => ({
  second,
  hour: second / 3600,
  owners: {},
  scores: values,
  scoreTotals: totals.map((total) => ({ battle: total, occupation: 0, total })) as ReplaySnapshot["scoreTotals"],
  territory,
  pvpEvents: 0,
  activeBattles: 0,
  activeFronts: 0,
  contestedTiles: 0,
  tileStatus: {},
});

const result = {
  seed: 1,
  snapshots: [
    snapshot(0, [0, 0, 0], [5, 5, 5], [1, 1, 1]),
    snapshot(3600, [20, 15, 0], [12, 16, 6], [3, 4, 2]),
    snapshot(7200, [20, 15, 50], [12, 16, 30], [3, 4, 6]),
  ],
  timeline: [
    { second: 600, type: "battle", tileId: 10, allianceId: 1, opponentAllianceId: 2 },
    { second: 1200, type: "capture", tileId: 11, allianceId: 2 },
    { second: 3600, type: "battle", tileId: 10, allianceId: 1, opponentAllianceId: 2 },
    { second: 7200, type: "battle", tileId: 12, allianceId: 3, opponentAllianceId: 1 },
  ],
  scoreEvents: [
    { second: 600, playerId: "P2", allianceId: 2, source: "battle", delta: 5, totalAfter: 5, tileId: 10 },
    { second: 600, playerId: "P1", allianceId: 1, source: "battle", delta: 10, totalAfter: 10, tileId: 10 },
    { second: 1200, playerId: "P2", allianceId: 2, source: "occupation", delta: 10, totalAfter: 15, tileId: 11 },
    { second: 3600, playerId: "P1", allianceId: 1, source: "battle", delta: 10, totalAfter: 20, tileId: 10 },
    { second: 7200, playerId: "P3", allianceId: 3, source: "battle", delta: 50, totalAfter: 50, tileId: 12 },
  ],
  players: [player("P1", 1, 100_000, 75), player("P2", 2, 1_000_000, 50), player("P3", 3, 10_000_000, 25)],
  events: [],
  alliances: [],
  finalOwners: {},
  firstPvpHour: 600 / 3600,
  contestedTileCounts: { 10: 2, 12: 1 },
  centerTileIds: [],
  activeFrontIds: [],
} as SimulationResult;

describe("overview replay analytics", () => {
  test("cuts battle metrics at the selected second and excludes occupation score", () => {
    expect(overviewAt(result, 599)).toEqual({
      totalBattles: 0,
      averageBattlePoints: 0,
      rankChangeCount: 0,
      rankChangeSeconds: [],
    });
    expect(overviewAt(result, 3600)).toEqual({
      totalBattles: 2,
      averageBattlePoints: 12.5,
      rankChangeCount: 0,
      rankChangeSeconds: [],
    });
  });

  test("groups simultaneous score events before detecting alliance rank changes", () => {
    const atFirstBattle = overviewAt(result, 600);
    expect(atFirstBattle.rankChangeCount).toBe(0);
    expect(atFirstBattle.rankChangeSeconds).toEqual([]);
  });
  test("counts only leader changes visible in the hourly replay series", () => {
    expect(overviewAt(result, 7200)).toMatchObject({
      rankChangeCount: 1,
      rankChangeSeconds: [7200],
    });
  });

  test("builds hourly replay points and current tile battle heat without future events", () => {
    const series = overviewReplaySeries(result);
    expect(series.map((point) => ({
      hour: point.hour,
      battles: point.hourlyBattles,
      captures: point.hourlyCaptures,
      averageBattlePoints: point.hourlyAverageBattlePoints,
    }))).toEqual([
      { hour: 0, battles: 1, captures: 1, averageBattlePoints: 15 },
      { hour: 1, battles: 1, captures: 0, averageBattlePoints: 10 },
      { hour: 2, battles: 1, captures: 0, averageBattlePoints: 50 },
    ]);
    expect(tileBattleHeatAt(result, 3600)).toEqual({ 10: 2 });
  });

  test("derives visible player score while keeping final AP utilization", () => {
    expect(playerContributionAt(result, 3600)).toEqual([
      { playerId: "P1", allianceId: 1, powerTier: "low", activityTier: "normal", power: 100_000, apUtilization: 0.75, score: 20 },
      { playerId: "P2", allianceId: 2, powerTier: "low", activityTier: "normal", power: 1_000_000, apUtilization: 0.5, score: 15 },
      { playerId: "P3", allianceId: 3, powerTier: "low", activityTier: "normal", power: 10_000_000, apUtilization: 0.25, score: 0 },
    ]);
  });
});
