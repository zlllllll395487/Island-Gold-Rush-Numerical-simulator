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
});
