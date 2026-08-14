import rawMap from "../../src/data/tilerush-map.json";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import type { BehaviorStrategy } from "../../src/domain/types";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { buildMatchedPopulation } from "../../src/population/match-alliances";
import { summarizeBatch, calculateMatchMetrics } from "../../src/analytics/metrics";
import { runSimulation } from "../../src/simulation/engine";

describe("decision metrics", () => {
  test("calculates ten task coverage rates and first PvP status", () => {
    const map = loadCanonicalMap(rawMap);
    const population = buildMatchedPopulation(DEFAULT_CONFIG, 7);
    const result = runSimulation({ map, config: DEFAULT_CONFIG, population, seed: 7 });
    const metrics = calculateMatchMetrics(result, DEFAULT_CONFIG);
    expect(metrics.taskCoverage).toHaveLength(10);
    expect(metrics.taskCoverage.every((value, index) => index === 0 || value <= metrics.taskCoverage[index - 1])).toBe(true);
    expect(metrics.firstPvpStatus).toMatch(/early|target|late|none/);
    expect(metrics.activityUtilization).toHaveLength(5);
    expect(metrics.activityUtilization[0].utilization).toBeLessThan(metrics.activityUtilization[4].utilization);
    expect(metrics.apOverflowRate).toBeGreaterThanOrEqual(0);
    expect(metrics.rewardMarginalValue).toHaveLength(10);
    expect(metrics.uniqueContestedTiles).toBeGreaterThan(0);
  });

  test("reports bounded metrics from the actual results of all three strategies", () => {
    const map = loadCanonicalMap(rawMap);
    const result = runSimulation({
      map,
      config: DEFAULT_CONFIG,
      population: buildMatchedPopulation(DEFAULT_CONFIG, 17),
      seed: 17,
    });
    const metrics = calculateMatchMetrics(result, DEFAULT_CONFIG);
    const strategies: BehaviorStrategy[] = ["centerRush", "supportExpand", "multiFront"];

    expect(metrics.strategyMetrics.map((row) => row.strategy)).toEqual(strategies);
    expect(metrics.centerContestShare).toBeGreaterThanOrEqual(0);
    expect(metrics.centerContestShare).toBeLessThanOrEqual(1);
    for (const row of metrics.strategyMetrics) {
      const players = result.players.filter((player) => player.behaviorStrategy === row.strategy);
      expect(row.players).toBe(players.length);
      expect(row.apUtilization).toBeGreaterThanOrEqual(0);
      expect(row.apUtilization).toBeLessThanOrEqual(1);
      expect(row.score).toBe(players.reduce((sum, player) => sum + player.personalScore, 0));
      expect(row.kills).toBe(players.reduce((sum, player) => sum + player.kills, 0));
      expect(row.occupations).toBe(players.reduce((sum, player) => sum + player.occupations, 0));
      expect(row.centerContestShare).toBeGreaterThanOrEqual(0);
      expect(row.centerContestShare).toBeLessThanOrEqual(1);
    }
  });

  test("uses the applied first PvP target range for batch hit rate", () => {
    const summarizeWithRange = summarizeBatch as unknown as (
      values: Array<{ firstPvpHour: number | null; dominance: number }>,
      targetRange: readonly [number, number],
    ) => ReturnType<typeof summarizeBatch>;
    const summary = summarizeWithRange([
      { firstPvpHour: 3, dominance: 0.4 },
      { firstPvpHour: 4, dominance: 0.4 },
      { firstPvpHour: 5, dominance: 0.4 },
      { firstPvpHour: 8, dominance: 0.4 },
      { firstPvpHour: 9, dominance: 0.4 },
    ], [5, 8]);

    expect(summary.firstPvpTargetRate).toBe(0.4);
  });
  test("summarizes batch values with median and risk probabilities", () => {
    const summary = summarizeBatch([
      { firstPvpHour: 2, dominance: 0.7 },
      { firstPvpHour: 4, dominance: 0.45 },
      { firstPvpHour: 6, dominance: 0.4 },
    ], DEFAULT_CONFIG.targets.firstPvpHours);
    expect(summary.firstPvpMedian).toBe(4);
    expect(summary.firstPvpTargetRate).toBeCloseTo(2 / 3);
    expect(summary.dominanceRisk).toBeCloseTo(1 / 3);
  });
});
