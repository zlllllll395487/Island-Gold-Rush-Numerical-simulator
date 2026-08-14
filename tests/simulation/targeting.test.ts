import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { createRng } from "../../src/population/rng";
import {
  chooseCenterRushTarget,
  chooseMultiFrontTarget,
  chooseSupportExpandTarget,
  chooseTarget,
  type StrategyTargetingConfig,
  type TargetCandidate,
} from "../../src/simulation/targeting";

const strategyConfig: StrategyTargetingConfig = {
  centerWeight: DEFAULT_CONFIG.strategy.centerWeight,
  resourceWeight: DEFAULT_CONFIG.strategy.resourceWeight,
  normalWeight: DEFAULT_CONFIG.strategy.normalWeight,
  congestionAvoidance: DEFAULT_CONFIG.strategy.congestionAvoidance,
  supportQueueGap: DEFAULT_CONFIG.fronts.supportQueueGap,
};

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
describe("behavior strategy targeting", () => {
  test("center rush selects the legal candidate closest to the core", () => {
    const candidates = [
      candidate({ tileId: 1, distance: 5, centerDistance: 5 }),
      candidate({ tileId: 2, distance: 2, centerDistance: 2 }),
      candidate({ tileId: 3, distance: 4, centerDistance: 4, tileType: "resource" }),
    ];
    expect(chooseCenterRushTarget(candidates, strategyConfig, createRng(1))).toBe(2);
  });

  test("center rush does not use base distance when center distance is absent", () => {
    const candidates = [
      candidate({ tileId: 1, distance: 1 }),
      candidate({ tileId: 2, distance: 6, centerDistance: 4 }),
    ];
    expect(chooseCenterRushTarget(candidates, strategyConfig, createRng(11))).toBe(2);
  });

  test("center rush measures closeness from the core rather than the player base", () => {
    const candidates = [
      candidate({ tileId: 1, distance: 1, centerDistance: 6 }),
      candidate({ tileId: 2, distance: 6, centerDistance: 1 }),
    ];
    expect(chooseCenterRushTarget(candidates, strategyConfig, createRng(12))).toBe(2);
  });

  test("center rush chooses a legal core immediately", () => {
    const candidates = [candidate({ tileId: 1, distance: 1 }), candidate({ tileId: 2, distance: 8, tileType: "core" })];
    expect(chooseCenterRushTarget(candidates, strategyConfig, createRng(2))).toBe(2);
  });

  test("center rush breaks equal distances by motivation before congestion", () => {
    const candidates = [
      candidate({ tileId: 1, distance: 3, centerDistance: 3, tileType: "normal", congestion: 0 }),
      candidate({ tileId: 2, distance: 3, centerDistance: 3, tileType: "resource", congestion: 4 }),
      candidate({ tileId: 3, distance: 3, centerDistance: 3, tileType: "resource", congestion: 1 }),
    ];
    expect(chooseCenterRushTarget(candidates, strategyConfig, createRng(3))).toBe(3);
  });

  test("support expansion chooses the smallest supportable queue difference globally", () => {
    const candidates = [
      candidate({ tileId: 1, frontId: "A1-F0", fighting: true, friendlyQueue: 2, enemyQueue: 1 }),
      candidate({ tileId: 2, frontId: "A1-F1", fighting: true, friendlyQueue: 1, enemyQueue: 3 }),
      candidate({ tileId: 3, frontId: "A1-F0" }),
    ];
    expect(chooseSupportExpandTarget(candidates, strategyConfig, createRng(4))).toBe(2);
  });

  test("support expansion idles when fights exist but none meet the queue gap", () => {
    const candidates = [candidate({ tileId: 1, fighting: true, friendlyQueue: 4, enemyQueue: 1 }), candidate({ tileId: 2, fighting: true, friendlyQueue: 5, enemyQueue: 1 }), candidate({ tileId: 3 })];
    expect(chooseSupportExpandTarget(candidates, strategyConfig, createRng(5))).toBeNull();
  });

  test("support expansion idles when an occupied fight is the only fight", () => {
    const candidates = [
      candidate({ tileId: 1, fighting: true, ownTroopPresent: true, friendlyQueue: 0, enemyQueue: 2 }),
      candidate({ tileId: 2, ownerCamp: 0 }),
    ];
    expect(chooseSupportExpandTarget(candidates, strategyConfig, createRng(13))).toBeNull();
  });

  test("multi-front changes target when alliance and personal strategy weights are swapped", () => {
    const candidates = [
      candidate({ tileId: 1, tileType: "core", ownerCamp: 0, distance: 0 }),
      candidate({ tileId: 2, tileType: "normal", ownerCamp: 0, distance: 0, enemyQueue: 10 }),
    ];
    const allianceOnly = { ...DEFAULT_CONFIG.fronts, allianceObjectiveWeight: 1, personalStrategyWeight: 0 };
    const personalOnly = { ...DEFAULT_CONFIG.fronts, allianceObjectiveWeight: 0, personalStrategyWeight: 1 };

    expect([
      chooseMultiFrontTarget(candidates, "A1-F0", strategyConfig, createRng(1), "defensive", allianceOnly),
      chooseMultiFrontTarget(candidates, "A1-F0", strategyConfig, createRng(1), "defensive", personalOnly),
    ]).toEqual([1, 2]);
  });

  test("multi-front expansion stays on its assigned front when it has a valid target", () => {
    const candidates = [candidate({ tileId: 1, frontId: "A1-F0", tileType: "normal" }), candidate({ tileId: 2, frontId: "A1-F1", tileType: "core" })];
    expect(chooseMultiFrontTarget(candidates, "A1-F0", strategyConfig, createRng(6), "frontier", DEFAULT_CONFIG.fronts)).toBe(1);
  });

  test("multi-front falls back when its assigned-front fight fails the queue rule", () => {
    const candidates = [
      candidate({ tileId: 1, frontId: "A1-F0", fighting: true, friendlyQueue: 5, enemyQueue: 1 }),
      candidate({ tileId: 2, frontId: "A1-F1", tileType: "resource" }),
    ];
    expect(chooseMultiFrontTarget(candidates, "A1-F0", strategyConfig, createRng(14), "frontier", DEFAULT_CONFIG.fronts)).toBe(2);
  });

  test("multi-front expansion falls back only when its assigned front has no valid target", () => {
    const candidates = [candidate({ tileId: 1, frontId: "A1-F0", ownTroopPresent: true }), candidate({ tileId: 2, frontId: "A1-F1", tileType: "resource" })];
    expect(chooseMultiFrontTarget(candidates, "A1-F0", strategyConfig, createRng(7), "frontier", DEFAULT_CONFIG.fronts)).toBe(2);
  });
});