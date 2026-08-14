import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { createRng } from "../../src/population/rng";
import { chooseTarget, type TargetCandidate } from "../../src/simulation/targeting";

function candidate(overrides: Partial<TargetCandidate> & Pick<TargetCandidate, "tileId">): TargetCandidate {
  return {
    tileId: overrides.tileId,
    frontId: "A1-F0",
    ownerCamp: 0,
    tileType: "normal",
    distance: 4,
    fighting: false,
    ownTroopPresent: false,
    friendlyQueue: 0,
    enemyQueue: 0,
    congestion: 0,
    recentContests: 0,
    ...overrides,
  };
}

describe("local player targeting", () => {
  test("supports only suitable fights inside the primary front", () => {
    const candidates = [
      candidate({ tileId: 1, fighting: true, friendlyQueue: 2, enemyQueue: 1 }),
      candidate({ tileId: 2, fighting: true, ownTroopPresent: true }),
      candidate({ tileId: 3 }),
    ];
    expect(chooseTarget(candidates, "frontier", "A1-F0", DEFAULT_CONFIG.fronts, createRng(1))).toBe(1);
  });

  test("idles when a local fight exists but no target satisfies the queue rule", () => {
    const candidates = [
      candidate({ tileId: 1, fighting: true, friendlyQueue: 5, enemyQueue: 1 }),
      candidate({ tileId: 2 }),
    ];
    expect(chooseTarget(candidates, "frontier", "A1-F0", DEFAULT_CONFIG.fronts, createRng(2))).toBeNull();
  });

  test("does not let a fight in another front block neutral expansion", () => {
    const candidates = [
      candidate({ tileId: 1, frontId: "A1-F1", fighting: true }),
      candidate({ tileId: 2, frontId: "A1-F0" }),
      candidate({ tileId: 3, frontId: "A1-F0", ownerCamp: 2 }),
    ];
    expect(chooseTarget(candidates, "frontier", "A1-F0", DEFAULT_CONFIG.fronts, createRng(3))).toBe(2);
  });

  test("spreads identical choices instead of sending everyone to one tile", () => {
    const candidates = [1, 2, 3, 4].map((tileId) => candidate({ tileId }));
    const counts = new Map<number, number>();
    for (let seed = 1; seed <= 400; seed++) {
      const target = chooseTarget(candidates, "frontier", "A1-F0", DEFAULT_CONFIG.fronts, createRng(seed))!;
      counts.set(target, (counts.get(target) ?? 0) + 1);
    }
    expect(counts.size).toBe(4);
    expect(Math.max(...counts.values())).toBeLessThan(140);
  });

  test("value players prefer resource and core tiles probabilistically", () => {
    const candidates = [
      candidate({ tileId: 1, tileType: "normal" }),
      candidate({ tileId: 2, tileType: "resource" }),
      candidate({ tileId: 3, tileType: "core" }),
    ];
    const counts = new Map<number, number>();
    for (let seed = 1; seed <= 400; seed++) {
      const target = chooseTarget(candidates, "value", "A1-F0", DEFAULT_CONFIG.fronts, createRng(seed))!;
      counts.set(target, (counts.get(target) ?? 0) + 1);
    }
    expect((counts.get(3) ?? 0) + (counts.get(2) ?? 0)).toBeGreaterThan(counts.get(1) ?? 0);
  });
});
