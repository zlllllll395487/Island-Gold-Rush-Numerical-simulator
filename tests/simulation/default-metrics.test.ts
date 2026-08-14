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
  });
});
