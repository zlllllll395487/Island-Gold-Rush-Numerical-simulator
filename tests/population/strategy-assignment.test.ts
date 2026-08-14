import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import type { ActiveAllianceId } from "../../src/domain/types";
import { assignBehaviorStrategies } from "../../src/population/assign-strategies";
import type { Player } from "../../src/population/generate-players";
import { buildMatchedPopulation } from "../../src/population/match-alliances";
import { createRng } from "../../src/population/rng";

const strategies = ["centerRush", "supportExpand", "multiFront"] as const;

function countsByStrategy(players: readonly Player[]) {
  return Object.fromEntries(
    strategies.map((strategy) => [strategy, players.filter((player) => player.behaviorStrategy === strategy).length]),
  );
}

function median(values: readonly number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function makeEqualMotivationPlayers(playersPerAlliance: number): Player[] {
  return ([1, 2, 3] as const).flatMap((allianceId) =>
    Array.from({ length: playersPerAlliance }, (_, index) => ({
      id: `A${allianceId}-P${String(index + 1).padStart(3, "0")}`,
      name: `Player ${allianceId}-${index + 1}`,
      allianceId: allianceId as ActiveAllianceId,
      powerTier: "mid" as const,
      power: 900_000,
      activityTier: "normal" as const,
      apUsagePropensity: 0.5,
      heroCount: 22,
      formationProfiles: [],
      strategy: "frontier" as const,
      behaviorStrategy: "multiFront" as const,
      personalScore: 0,
      battleScore: 0,
      occupationScore: 0,
      actions: 0,
      occupations: 0,
      kills: 0,
      apSpent: 0,
      apOverflow: 0,
      apSupply: 0,
      maxActiveFormations: 0,
      maxWinStreak: 0,
    })),
  );
}

describe("behavior strategy assignment", () => {
  test("assigns the default 45/25/30 quota within every 100-player alliance", () => {
    const matched = buildMatchedPopulation(DEFAULT_CONFIG, 20260813);
    const assigned = assignBehaviorStrategies(matched.players, DEFAULT_CONFIG, createRng(20260813));

    for (const allianceId of [1, 2, 3] as const) {
      expect(countsByStrategy(assigned.filter((player) => player.allianceId === allianceId))).toEqual({
        centerRush: 45,
        supportExpand: 25,
        multiFront: 30,
      });
    }
  });

  test("uses largest-remainder quotas for alliance sizes that do not divide strategy shares", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    const assigned = assignBehaviorStrategies(makeEqualMotivationPlayers(7), config, createRng(20));

    for (const allianceId of [1, 2, 3] as const) {
      expect(countsByStrategy(assigned.filter((player) => player.allianceId === allianceId))).toEqual({
        centerRush: 3,
        supportExpand: 2,
        multiFront: 2,
      });
    }
  });

  test("repeats assignments for the same seed and changes equal-motivation tie breaks for a different seed", () => {
    const players = makeEqualMotivationPlayers(100);
    const first = assignBehaviorStrategies(structuredClone(players), DEFAULT_CONFIG, createRng(11));
    const second = assignBehaviorStrategies(structuredClone(players), DEFAULT_CONFIG, createRng(11));
    const differentSeed = assignBehaviorStrategies(structuredClone(players), DEFAULT_CONFIG, createRng(12));

    expect(first).toEqual(second);
    expect(first.map((player) => player.behaviorStrategy)).not.toEqual(differentSeed.map((player) => player.behaviorStrategy));
    for (const allianceId of [1, 2, 3] as const) {
      expect(countsByStrategy(differentSeed.filter((player) => player.allianceId === allianceId))).toEqual({
        centerRush: 45,
        supportExpand: 25,
        multiFront: 30,
      });
    }
  });

  test("selects center-rush players with higher median activity and power than the roster", () => {
    const matched = buildMatchedPopulation(DEFAULT_CONFIG, 42);
    const assigned = assignBehaviorStrategies(matched.players, DEFAULT_CONFIG, createRng(42));
    const centerPlayers = assigned.filter((player) => player.behaviorStrategy === "centerRush");

    expect(median(centerPlayers.map((player) => player.apUsagePropensity))).toBeGreaterThan(
      median(assigned.map((player) => player.apUsagePropensity)),
    );
    expect(median(centerPlayers.map((player) => player.power))).toBeGreaterThan(median(assigned.map((player) => player.power)));
  });
});
