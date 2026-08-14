import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { createRng } from "../../src/population/rng";
import { resolveDuel } from "../../src/simulation/combat";
import { calculateMorale, moraleMultiplier } from "../../src/simulation/morale";

describe("morale model", () => {
  test("applies distance and consecutive-win losses inside configured bounds", () => {
    const config = DEFAULT_CONFIG.morale;
    expect(calculateMorale(5, 0, config)).toBe(150);
    expect(calculateMorale(8, 0, config)).toBe(144);
    expect(calculateMorale(8, 3, config)).toBe(138);
    expect(calculateMorale(100, 100, config)).toBe(20);
  });

  test("uses the approved GDD coefficient anchors", () => {
    const config = DEFAULT_CONFIG.morale;
    expect(moraleMultiplier(150, config)).toBeCloseTo(1, 8);
    expect(moraleMultiplier(20, config)).toBeCloseTo(0.6, 8);
    expect(moraleMultiplier(100, config)).toBeCloseTo(11 / 13, 8);
  });

  test("uses bounded morale divided by 100 in linear mode", () => {
    const linear = { ...DEFAULT_CONFIG.morale, formulaMode: "linear" as const };

    expect(moraleMultiplier(20, linear)).toBeCloseTo(0.2, 8);
    expect(moraleMultiplier(100, linear)).toBeCloseTo(1, 8);
    expect(moraleMultiplier(150, linear)).toBeCloseTo(1.5, 8);
  });

  test("formula mode changes the combat probability for the same units", () => {
    const attacker = { basePower: 1_000_000, troops: 100_000, morale: 20 };
    const defender = { basePower: 1_000_000, troops: 100_000, morale: 100 };
    const gdd = resolveDuel(attacker, defender, DEFAULT_CONFIG.combat, DEFAULT_CONFIG.morale, createRng(9));
    const linear = resolveDuel(
      attacker,
      defender,
      DEFAULT_CONFIG.combat,
      { ...DEFAULT_CONFIG.morale, formulaMode: "linear" },
      createRng(9),
    );

    expect(linear.attackerWinProbability).toBeLessThan(gdd.attackerWinProbability);
  });
});
