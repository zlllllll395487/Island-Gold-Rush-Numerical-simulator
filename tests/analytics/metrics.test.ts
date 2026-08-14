import rawMap from "../../src/data/tilerush-map.json";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
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
  });

  test("summarizes batch values with median and risk probabilities", () => {
    const summary = summarizeBatch([
      { firstPvpHour: 2, dominance: 0.7 },
      { firstPvpHour: 4, dominance: 0.45 },
      { firstPvpHour: 6, dominance: 0.4 },
    ]);
    expect(summary.firstPvpMedian).toBe(4);
    expect(summary.firstPvpTargetRate).toBeCloseTo(2 / 3);
    expect(summary.dominanceRisk).toBeCloseTo(1 / 3);
  });
});
