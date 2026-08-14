import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { createRng } from "../../src/population/rng";
import { resolveDuel } from "../../src/simulation/combat";

describe("macro troop duel", () => {
  test("always eliminates exactly one side and retains survivors for the winner", () => {
    const result = resolveDuel(
      { basePower: 900_000, troops: 100_000, morale: 150 },
      { basePower: 850_000, troops: 100_000, morale: 150 },
      DEFAULT_CONFIG.combat,
      DEFAULT_CONFIG.morale,
      createRng(9),
    );

    expect([result.attackerRemaining, result.defenderRemaining].filter((troops) => troops === 0)).toHaveLength(1);
    expect(Math.max(result.attackerRemaining, result.defenderRemaining)).toBeGreaterThan(0);
    expect(Math.max(result.attackerRemaining, result.defenderRemaining)).toBeLessThanOrEqual(100_000);
    expect(result.attackerKills).toBe(100_000 - result.defenderRemaining);
    expect(result.defenderKills).toBe(100_000 - result.attackerRemaining);
  });

  test("higher power and morale win more often across deterministic seeds", () => {
    let strongWins = 0;
    let lowMoraleWins = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const strong = resolveDuel(
        { basePower: 1_200_000, troops: 100_000, morale: 150 },
        { basePower: 700_000, troops: 100_000, morale: 100 },
        DEFAULT_CONFIG.combat,
        DEFAULT_CONFIG.morale,
        createRng(seed),
      );
      if (strong.winner === "attacker") strongWins++;

      const tired = resolveDuel(
        { basePower: 1_200_000, troops: 100_000, morale: 20 },
        { basePower: 700_000, troops: 100_000, morale: 150 },
        DEFAULT_CONFIG.combat,
        DEFAULT_CONFIG.morale,
        createRng(seed),
      );
      if (tired.winner === "attacker") lowMoraleWins++;
    }

    expect(strongWins).toBeGreaterThan(lowMoraleWins);
    expect(strongWins).toBeGreaterThan(240);
  });
});
