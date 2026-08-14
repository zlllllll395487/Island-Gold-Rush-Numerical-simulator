import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { parseSimulationConfig } from "../../src/domain/schemas";

describe("simulation configuration", () => {
  test("encodes approved AP, occupation, task, and matching defaults", () => {
    expect(DEFAULT_CONFIG.ap).toEqual({
      initial: 50,
      cap: 100,
      recoveryAmount: 50,
      recoveryEveryHours: 8,
      attackCost: 10,
      garrisonCost: 10,
    });
    expect(DEFAULT_CONFIG.occupation).toEqual({
      baseSeconds: { normal: 60, resource: 90, core: 120 },
      safeDistance: 5,
      secondsPerExcessHex: 30,
      paceMultiplier: 30,
    });
    expect(DEFAULT_CONFIG.tasks.thresholds).toEqual([200, 290, 400, 520, 650, 780, 940, 1140, 1390, 1750]);
    expect(DEFAULT_CONFIG.matching.maxStrongestToWeakestRatio).toBe(1.25);
    expect(DEFAULT_CONFIG.activity.bands).toEqual([
      { id: "minimal", share: 0.1, usage: 0.1 },
      { id: "casual", share: 0.2, usage: 0.3 },
      { id: "normal", share: 0.4, usage: 0.5 },
      { id: "active", share: 0.2, usage: 0.7 },
      { id: "core", share: 0.1, usage: 0.9 },
    ]);
    expect(DEFAULT_CONFIG.morale).toEqual({
      base: 150,
      max: 150,
      min: 20,
      safeDistance: 5,
      lossPerExcessHex: 2,
      lossPerWin: 2,
      formulaMode: "gdd",
      coefficientIntercept: 7 / 13,
      coefficientSlope: 4 / 13,
    });
    expect(DEFAULT_CONFIG.combat.troopSize).toBe(100_000);
    expect(DEFAULT_CONFIG.combat.battleIntervalSeconds).toBe(10);
    expect(DEFAULT_CONFIG.population.powerShares).toEqual({ low: 0.75, mid: 0.2, high: 0.04, super: 0.01 });
    expect(Object.values(DEFAULT_CONFIG.population.powerShares).reduce((sum, share) => sum + share, 0)).toBe(1);
    expect(DEFAULT_CONFIG.population.basePower).toEqual({ low: 460_000, mid: 1_000_000, high: 2_800_000, super: 6_900_000 });
    expect(DEFAULT_CONFIG.population.basePower.super / DEFAULT_CONFIG.population.basePower.low).toBe(15);
    expect(DEFAULT_CONFIG.population.powerSigma).toEqual({ low: 0.18, mid: 0.18, high: 0.22, super: 0.2 });
    expect(DEFAULT_CONFIG.population.mainFormationCounts).toEqual({ low: 1, mid: 2, high: 3, super: 3 });
    expect(DEFAULT_CONFIG.population.weakFormationScale).toEqual({ low: 0.45, mid: 0.52, high: 0.58, super: 0.6 });
  });

  test("accepts the approved default configuration", () => {
    expect(parseSimulationConfig(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
  });

  test("parses the approved strategy defaults", () => {
    expect(parseSimulationConfig(DEFAULT_CONFIG).strategy).toEqual({
      shares: { centerRush: 0.45, supportExpand: 0.25, multiFront: 0.3 },
      activityWeight: 0.55,
      powerWeight: 0.35,
      randomWeight: 0.1,
      centerWeight: 4,
      resourceWeight: 2,
      normalWeight: 1,
      congestionAvoidance: 0.65,
    });
  });

  test("rejects strategy shares that do not total one", () => {
    const invalid = {
      ...DEFAULT_CONFIG,
      strategy: {
        shares: { centerRush: 0.5, supportExpand: 0.35, multiFront: 0.2 },
        activityWeight: 0.55,
        powerWeight: 0.35,
        randomWeight: 0.1,
        centerWeight: 4,
        resourceWeight: 2,
        normalWeight: 1,
        congestionAvoidance: 0.65,
      },
    };

    expect(() => parseSimulationConfig(invalid)).toThrow(/strategy shares must total 1/i);
  });

  test("rejects strategy assignment weights that do not total one", () => {
    const invalid = structuredClone(DEFAULT_CONFIG);
    invalid.strategy.activityWeight = 0.6;

    expect(() => parseSimulationConfig(invalid)).toThrow(/strategy assignment weights must total 1/i);
  });

  test("rejects non-integer or out-of-range main formation counts", () => {
    const fractional = structuredClone(DEFAULT_CONFIG);
    Object.assign(fractional.population, { mainFormationCounts: { low: 1, mid: 2, high: 2.5, super: 3 } });
    expect(() => parseSimulationConfig(fractional)).toThrow();

    const tooMany = structuredClone(DEFAULT_CONFIG);
    Object.assign(tooMany.population, { mainFormationCounts: { low: 1, mid: 2, high: 3, super: 7 } });
    expect(() => parseSimulationConfig(tooMany)).toThrow();
  });

  test("rejects non-increasing task thresholds", () => {
    const invalid = structuredClone(DEFAULT_CONFIG);
    invalid.tasks.thresholds[4] = invalid.tasks.thresholds[3];
    expect(() => parseSimulationConfig(invalid)).toThrow(/strictly increasing/i);
  });

  test("rejects reward shares that do not total 100", () => {
    const invalid = structuredClone(DEFAULT_CONFIG);
    invalid.rewards.tierShares = [40, 35, 20, 6];
    expect(() => parseSimulationConfig(invalid)).toThrow(/100/);
  });
});
