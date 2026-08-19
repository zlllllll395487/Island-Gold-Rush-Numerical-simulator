import { calculateMatchMetrics, summarizeBatch } from "../../src/analytics/metrics";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import type { SimulationResult } from "../../src/simulation/engine";

function decisionFixture(): SimulationResult {
  const scores = [90, 20, 15, 12, 10, 9, 8, 6, 5, 5];
  const players = scores.map((personalScore, index) => ({
    id: `P${index + 1}`,
    allianceId: ((index % 3) + 1) as 1 | 2 | 3,
    activityTier: "normal",
    behaviorStrategy: index < 4 ? "centerRush" : index < 7 ? "supportExpand" : "multiFront",
    power: (index + 1) * 100,
    personalScore,
    battleScore: personalScore,
    occupationScore: 0,
    kills: personalScore * 10_000,
    occupations: 0,
    apSpent: 6,
    apSupply: 10,
    apOverflow: 1,
  }));

  return {
    seed: 1,
    firstPvpHour: 3,
    centerTileIds: [101, 102],
    activeFrontIds: ["1-a", "2-a"],
    contestedTileCounts: { 101: 2, 102: 1, 201: 1 },
    finalOwners: { 101: 1, 102: 2, 201: 3 },
    events: [],
    scoreEvents: [],
    players,
    alliances: [
      { id: 1, name: "Red", effectivePower: 1, contributionScore: 1, snapshotScore: 30, tileCount: 3, rank: 1 },
      { id: 2, name: "Blue", effectivePower: 1, contributionScore: 1, snapshotScore: 10, tileCount: 1, rank: 3 },
      { id: 3, name: "Gold", effectivePower: 1, contributionScore: 1, snapshotScore: 20, tileCount: 2, rank: 2 },
    ],
    timeline: [
      { second: 600, type: "battle", tileId: 101 },
      { second: 900, type: "battle", tileId: 101 },
      { second: 1200, type: "capture", tileId: 102 },
      { second: 1500, type: "battle", tileId: 201 },
    ],
    snapshots: [
      {
        second: 0,
        hour: 0,
        owners: { 101: 1, 102: 0, 201: 0 },
        scores: [10, 10, 10],
        scoreTotals: [
          { battle: 0, occupation: 0, total: 0 },
          { battle: 0, occupation: 0, total: 0 },
          { battle: 0, occupation: 0, total: 0 },
        ],
        territory: [1, 1, 1],
        pvpEvents: 0,
        activeBattles: 0,
        activeFronts: 0,
        contestedTiles: 0,
        tileStatus: {},
      },
      {
        second: 3600,
        hour: 1,
        owners: { 101: 1, 102: 2, 201: 3 },
        scores: [30, 10, 20],
        scoreTotals: [
          { battle: 90, occupation: 0, total: 90 },
          { battle: 35, occupation: 0, total: 35 },
          { battle: 55, occupation: 0, total: 55 },
        ],
        territory: [3, 1, 2],
        pvpEvents: 4,
        activeBattles: 1,
        activeFronts: 2,
        contestedTiles: 3,
        tileStatus: {},
      },
    ],
  } as SimulationResult;
}

describe("decision-oriented metrics", () => {
  test("derives balance, AP waste, center intensity, and score concentration from results", () => {
    const metrics = calculateMatchMetrics(decisionFixture(), DEFAULT_CONFIG);

    expect(metrics.mapValueGap).toBe(1);
    expect(metrics.apWasteRate).toBeCloseTo(0.4);
    expect(metrics.centerContestIntensity).toMatchObject({
      battles: 2,
      captures: 1,
      controlHours: 1.5,
    });
    expect(metrics.centerContestIntensity.score).toBeGreaterThan(0);
    expect(metrics.centerContestIntensity.score).toBeLessThanOrEqual(1);
    expect(metrics.scoreConcentrationTop10).toBeCloseTo(0.5);
    expect(metrics.powerScoreCorrelation).toBeLessThan(0);
  });

  test("reports first-PvP uncertainty instead of only a median", () => {
    const summary = summarizeBatch([
      { firstPvpHour: 1, dominance: 0.4 },
      { firstPvpHour: 2, dominance: 0.4 },
      { firstPvpHour: 3, dominance: 0.4 },
      { firstPvpHour: 4, dominance: 0.4 },
      { firstPvpHour: 5, dominance: 0.4 },
    ], [2, 4]);

    expect(summary.firstPvpP10).toBeCloseTo(1.4);
    expect(summary.firstPvpMedian).toBe(3);
    expect(summary.firstPvpP90).toBeCloseTo(4.6);
    expect(summary.firstPvpTargetRate).toBe(0.6);
  });
});
