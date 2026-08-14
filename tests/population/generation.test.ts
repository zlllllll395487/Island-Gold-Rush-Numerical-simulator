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
      expect(new Set(alliance.members.map((player) => player.powerTier)).size).toBe(4);
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

    const expectedMultipliers = {
      low: [1, 0.45, 0.414, 0.378, 0.342, 0.324],
      mid: [1, 0.96, 0.52, 0.4784, 0.4368, 0.3952],
      high: [1, 0.96, 0.92, 0.58, 0.5336, 0.4872],
      super: [1, 0.96, 0.92, 0.6, 0.552, 0.504],
    } as const;
    for (const tier of ["low", "mid", "high", "super"] as const) {
      const player = players.find((candidate) => candidate.powerTier === tier)!;
      player.formationProfiles.forEach((formation, index) => {
        expect(formation.powerMultiplier).toBeCloseTo(expectedMultipliers[tier][index]);
      });
    }

    const lowFirstMain = DEFAULT_CONFIG.population.basePower.low * expectedMultipliers.low[0];
    const superFirstMain = DEFAULT_CONFIG.population.basePower.super * expectedMultipliers.super[0];
    expect(superFirstMain / lowFirstMain).toBe(15);
  });

  test("honors configurable main formation counts while keeping six total slots", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    Object.assign(config.population, { mainFormationCounts: { low: 1, mid: 2, high: 3, super: 2 } });
    const superPlayer = buildMatchedPopulation(config, 31).players.find((player) => player.powerTier === "super")!;

    expect(superPlayer.formationProfiles).toHaveLength(6);
    const expectedMultipliers = [1, 0.96, 0.6, 0.552, 0.504, 0.456];
    superPlayer.formationProfiles.forEach((formation, index) => {
      expect(formation.powerMultiplier).toBeCloseTo(expectedMultipliers[index]);
    });
  });

  test("uses the approved 75/20/4/1 power population split", () => {
    const { players } = buildMatchedPopulation(DEFAULT_CONFIG, 8);
    expect(players.filter((player) => player.powerTier === "low")).toHaveLength(225);
    expect(players.filter((player) => player.powerTier === "mid")).toHaveLength(60);
    expect(players.filter((player) => player.powerTier === "high")).toHaveLength(12);
    expect(players.filter((player) => player.powerTier === "super")).toHaveLength(3);
  });

  test("distributes one super player to every deterministically matched alliance", () => {
    const { alliances } = buildMatchedPopulation(DEFAULT_CONFIG, 8);

    expect(alliances.map((alliance) => alliance.members.filter((player) => player.powerTier === "super").length)).toEqual([1, 1, 1]);
    const powers = alliances.map(effectiveAlliancePower);
    expect(Math.max(...powers) / Math.min(...powers)).toBeLessThanOrEqual(1.25);
  });

  test.each([50, 54])("keeps outlier super samples evenly and deterministically matched for seed %i", (seed) => {
    const first = buildMatchedPopulation(DEFAULT_CONFIG, seed);
    const second = buildMatchedPopulation(DEFAULT_CONFIG, seed);

    const superCounts = first.alliances.map(
      (alliance) => alliance.members.filter((player) => player.powerTier === "super").length,
    );
    const powers = first.alliances.map(effectiveAlliancePower);
    const allianceRatio = Math.max(...powers) / Math.min(...powers);

    console.info("MATCHING_CALIBRATION", JSON.stringify({ seed, superCounts, allianceRatio }));
    expect(first).toEqual(second);
    expect(first.alliances.map((alliance) => alliance.members.length)).toEqual([100, 100, 100]);
    expect(superCounts).toEqual([1, 1, 1]);
    expect(allianceRatio).toBeLessThanOrEqual(1.25);
  });

  test("uses largest-remainder power quotas for arbitrary population sizes", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.playersPerAlliance = 101;

    const { players } = buildMatchedPopulation(config, 11);

    expect(players).toHaveLength(303);
    expect(players.filter((player) => player.powerTier === "low")).toHaveLength(227);
    expect(players.filter((player) => player.powerTier === "mid")).toHaveLength(61);
    expect(players.filter((player) => player.powerTier === "high")).toHaveLength(12);
    expect(players.filter((player) => player.powerTier === "super")).toHaveLength(3);
  });

  test("honors editable power-tier shares", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.population.powerShares = { low: 0.6, mid: 0.25, high: 0.1, super: 0.05 };
    const { players } = buildMatchedPopulation(config, 11);
    expect(players.filter((player) => player.powerTier === "low")).toHaveLength(180);
    expect(players.filter((player) => player.powerTier === "mid")).toHaveLength(75);
    expect(players.filter((player) => player.powerTier === "high")).toHaveLength(30);
    expect(players.filter((player) => player.powerTier === "super")).toHaveLength(15);
  });
});
