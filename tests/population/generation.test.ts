import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { buildMatchedPopulation, effectiveAlliancePower } from "../../src/population/match-alliances";

describe("matched virtual population", () => {
  test("generates the same 300 players for the same seed", () => {
    const first = buildMatchedPopulation(DEFAULT_CONFIG, 20260813);
    const second = buildMatchedPopulation(DEFAULT_CONFIG, 20260813);

    expect(first).toEqual(second);
    expect(first.players).toHaveLength(300);
    expect(new Set(first.players.map((player) => player.id)).size).toBe(300);
  });

  test("creates three 100-player alliances within the 1.25 matching boundary", () => {
    const population = buildMatchedPopulation(DEFAULT_CONFIG, 17);
    expect(population.alliances.map((alliance) => alliance.members.length)).toEqual([100, 100, 100]);
    const powers = population.alliances.map(effectiveAlliancePower);
    expect(Math.max(...powers) / Math.min(...powers)).toBeLessThanOrEqual(1.25);
  });

  test("preserves multiple power and activity segments in every alliance", () => {
    const { alliances } = buildMatchedPopulation(DEFAULT_CONFIG, 99);
    for (const alliance of alliances) {
      expect(new Set(alliance.members.map((player) => player.powerTier)).size).toBe(3);
      expect(new Set(alliance.members.map((player) => player.activityTier)).size).toBe(5);
    }
  });

  test("uses the approved activity mix and gives every player six formations from 22 heroes", () => {
    const { players } = buildMatchedPopulation(DEFAULT_CONFIG, 20260813);
    const activityCounts = Object.fromEntries(
      ["minimal", "casual", "normal", "active", "core"].map((tier) => [
        tier,
        players.filter((player) => player.activityTier === tier).length,
      ]),
    );

    expect(activityCounts).toEqual({ minimal: 30, casual: 60, normal: 120, active: 60, core: 30 });
    expect(players.every((player) => player.heroCount === 22)).toBe(true);
    expect(players.every((player) => player.formationProfiles.length === 6)).toBe(true);
  });

  test("uses the approved 75/20/5 power population split", () => {
    const { players } = buildMatchedPopulation(DEFAULT_CONFIG, 8);
    expect(players.filter((player) => player.powerTier === "low")).toHaveLength(225);
    expect(players.filter((player) => player.powerTier === "mid")).toHaveLength(60);
    expect(players.filter((player) => player.powerTier === "high")).toHaveLength(15);
  });

  test("honors editable power-tier shares", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.population.powerShares = { low: 0.6, mid: 0.3, high: 0.1 };
    const { players } = buildMatchedPopulation(config, 11);
    expect(players.filter((player) => player.powerTier === "low")).toHaveLength(180);
    expect(players.filter((player) => player.powerTier === "mid")).toHaveLength(90);
    expect(players.filter((player) => player.powerTier === "high")).toHaveLength(30);
  });
});
