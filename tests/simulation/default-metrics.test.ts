import rawMap from "../../src/data/tilerush-map.json";
import { calculateMatchMetrics } from "../../src/analytics/metrics";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { buildMatchedPopulation, effectiveAlliancePower } from "../../src/population/match-alliances";
import { createRng } from "../../src/population/rng";
import { resolveDuel } from "../../src/simulation/combat";
import { runSimulation } from "../../src/simulation/engine";

describe("default scenario calibration", () => {
  it("reaches meaningful PvP in the intended 3–6 hour window", () => {
    const map = loadCanonicalMap(rawMap);
    const population = buildMatchedPopulation(DEFAULT_CONFIG, DEFAULT_CONFIG.seed);
    const result = runSimulation({ map, config: DEFAULT_CONFIG, population, seed: DEFAULT_CONFIG.seed });
    const metrics = calculateMatchMetrics(result, DEFAULT_CONFIG);

    const tierCounts = Object.fromEntries(
      ["low", "mid", "high", "super"].map((tier) => [
        tier,
        population.players.filter((player) => player.powerTier === tier).length,
      ]),
    );
    const strategyCounts = Object.fromEntries(
      ["centerRush", "supportExpand", "multiFront"].map((strategy) => [
        strategy,
        population.players.filter((player) => player.behaviorStrategy === strategy).length,
      ]),
    );
    const superByAlliance = population.alliances.map(
      (alliance) => alliance.members.filter((player) => player.powerTier === "super").length,
    );
    const rosterPowers = population.alliances.map(effectiveAlliancePower);
    const allianceRatio = Math.max(...rosterPowers) / Math.min(...rosterPowers);
    const duel = resolveDuel(
      { basePower: DEFAULT_CONFIG.population.basePower.super, troops: 100_000, morale: 150 },
      { basePower: DEFAULT_CONFIG.population.basePower.low, troops: 100_000, morale: 150 },
      DEFAULT_CONFIG.combat,
      DEFAULT_CONFIG.morale,
      createRng(1),
    );

    console.info("DEFAULT_METRICS", JSON.stringify({
      firstPvpHour: metrics.firstPvpHour,
      allianceRatio,
      tierCounts,
      strategyCounts,
      superByAlliance,
      superVsLowWinProbability: duel.attackerWinProbability,
    }));
    expect(tierCounts).toEqual({ low: 225, mid: 60, high: 12, super: 3 });
    expect(superByAlliance).toEqual([1, 1, 1]);
    expect(duel.attackerWinProbability).toBeGreaterThan(0.95);
    expect(metrics.firstPvpHour).not.toBeNull();
    expect(metrics.firstPvpHour!).toBeGreaterThanOrEqual(3);
    expect(metrics.firstPvpHour!).toBeLessThanOrEqual(6);
    expect(metrics.apUtilization).toBeGreaterThanOrEqual(0.4);
    expect(metrics.apUtilization).toBeLessThanOrEqual(0.6);
    expect(metrics.activeFronts).toBeGreaterThanOrEqual(3);
    expect(metrics.uniqueContestedTiles).toBeGreaterThanOrEqual(20);
    expect(metrics.contestConcentration).toBeLessThan(0.5);
    const alliancePowers = result.alliances.map((alliance) => alliance.effectivePower);
    expect(Math.max(...alliancePowers) / Math.min(...alliancePowers)).toBeLessThanOrEqual(1.25);
    expect(metrics.strategyMetrics.map((row) => row.players)).toEqual([135, 75, 90]);
    expect(metrics.centerContestShare).toBeGreaterThanOrEqual(0);
    expect(metrics.centerContestShare).toBeLessThanOrEqual(1);
  });
});
