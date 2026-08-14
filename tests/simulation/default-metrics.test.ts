import rawMap from "../../src/data/tilerush-map.json";
import { calculateMatchMetrics } from "../../src/analytics/metrics";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { buildMatchedPopulation } from "../../src/population/match-alliances";
import { runSimulation } from "../../src/simulation/engine";

describe("default scenario calibration", () => {
  it("reaches meaningful PvP in the intended 3–6 hour window", () => {
    const map = loadCanonicalMap(rawMap);
    const population = buildMatchedPopulation(DEFAULT_CONFIG, DEFAULT_CONFIG.seed);
    const result = runSimulation({ map, config: DEFAULT_CONFIG, population, seed: DEFAULT_CONFIG.seed });
    const metrics = calculateMatchMetrics(result, DEFAULT_CONFIG);

    console.info("DEFAULT_METRICS", JSON.stringify({ metrics, alliances: result.alliances }));
    expect(metrics.firstPvpHour).not.toBeNull();
    expect(metrics.firstPvpHour!).toBeGreaterThanOrEqual(3);
    expect(metrics.firstPvpHour!).toBeLessThanOrEqual(6);
    expect(metrics.apUtilization).toBeGreaterThanOrEqual(0.4);
    expect(metrics.apUtilization).toBeLessThanOrEqual(0.6);
    expect(metrics.activeFronts).toBeGreaterThanOrEqual(3);
    expect(metrics.uniqueContestedTiles).toBeGreaterThanOrEqual(8);
    expect(metrics.contestConcentration).toBeLessThan(0.35);
    const alliancePowers = result.alliances.map((alliance) => alliance.effectivePower);
    expect(Math.max(...alliancePowers) / Math.min(...alliancePowers)).toBeLessThanOrEqual(1.25);
    expect(metrics.strategyMetrics.map((row) => row.players)).toEqual([135, 75, 90]);
    expect(metrics.centerContestShare).toBeGreaterThanOrEqual(0);
    expect(metrics.centerContestShare).toBeLessThanOrEqual(1);
  });
});
