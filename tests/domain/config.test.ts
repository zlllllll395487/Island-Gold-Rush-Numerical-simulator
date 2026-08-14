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
    });
    expect(DEFAULT_CONFIG.tasks.thresholds).toEqual([200, 290, 400, 520, 650, 780, 940, 1140, 1390, 1750]);
    expect(DEFAULT_CONFIG.matching.maxStrongestToWeakestRatio).toBe(1.25);
  });

  test("accepts the approved default configuration", () => {
    expect(parseSimulationConfig(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
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
