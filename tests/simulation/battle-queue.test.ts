import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import type { SeededRng } from "../../src/population/rng";
import { enqueueTroop, resolveTileBattleTick } from "../../src/simulation/battle-queue";
import { syncOccupation } from "../../src/simulation/occupation";
import type { TileRuntimeState, TroopState } from "../../src/simulation/state";

const attackerWins: SeededRng = { next: () => 0, normal: () => 0, pick: (values) => values[0] };

function troop(id: string, allianceId: 1 | 2 | 3, power: number, order: number): TroopState {
  return {
    id,
    playerId: id,
    allianceId,
    formationSlot: 0,
    basePower: power,
    troops: 100_000,
    distance: 6,
    consecutiveWins: 0,
    morale: 148,
    entryOrder: order,
  };
}

function tile(): TileRuntimeState {
  return {
    tileId: 99,
    ownerCamp: 1,
    defenseCamp: 1,
    defenseQueue: [],
    attackQueue: [],
    lastBattleAt: 0,
    occupation: null,
    ownerVersion: 0,
  };
}

describe("tile battle queue", () => {
  test("waits 10 seconds, resolves FIFO, eliminates one side, and promotes the winning camp", () => {
    const state = tile();
    enqueueTroop(state, troop("defender", 1, 100_000, 1));
    enqueueTroop(state, troop("attacker-a", 2, 2_000_000, 2));
    enqueueTroop(state, troop("attacker-b", 2, 1_000_000, 3));
    enqueueTroop(state, troop("third-camp", 3, 1_000_000, 4));

    expect(resolveTileBattleTick(state, 9, DEFAULT_CONFIG, attackerWins).battle).toBeNull();
    const result = resolveTileBattleTick(state, 10, DEFAULT_CONFIG, attackerWins);

    expect(result.battle?.winner).toBe("attacker");
    expect(result.releasedTroopIds).toEqual(["defender"]);
    expect(result.killsByPlayer.get("attacker-a")).toBe(100_000);
    expect(state.defenseCamp).toBe(2);
    expect(state.defenseQueue.map((unit) => unit.id)).toEqual(["attacker-a", "attacker-b"]);
    expect(state.attackQueue.map((unit) => unit.id)).toEqual(["third-camp"]);
    expect(state.defenseQueue[0].consecutiveWins).toBe(1);
    expect(state.defenseQueue[0].morale).toBe(146);
  });

  test("keeps a surviving defender at the queue head and releases the defeated attacker", () => {
    const state = tile();
    enqueueTroop(state, troop("defender", 1, 2_000_000, 1));
    enqueueTroop(state, troop("attacker", 2, 100_000, 2));
    const defenderWins: SeededRng = { ...attackerWins, next: () => 1 };

    const result = resolveTileBattleTick(state, 10, DEFAULT_CONFIG, defenderWins);

    expect(result.battle?.winner).toBe("defender");
    expect(result.releasedTroopIds).toEqual(["attacker"]);
    expect(state.defenseQueue[0].id).toBe("defender");
    expect(state.attackQueue).toHaveLength(0);
  });
});

describe("occupation lifecycle", () => {
  test("keeps the timer for same-camp reinforcements, resets on camp change, and clears without defenders", () => {
    const state = tile();
    state.defenseCamp = 2;
    state.defenseQueue.push(troop("occupier", 2, 1_000_000, 1));

    expect(syncOccupation(state, 0, 60)).toEqual({ captured: false, ownerChanged: false });
    expect(state.occupation?.endsAt).toBe(60);
    syncOccupation(state, 10, 60);
    expect(state.occupation?.endsAt).toBe(60);

    state.defenseCamp = 3;
    state.defenseQueue = [troop("new-occupier", 3, 1_000_000, 2)];
    syncOccupation(state, 20, 60);
    expect(state.occupation?.endsAt).toBe(80);

    state.defenseQueue = [];
    syncOccupation(state, 30, 60);
    expect(state.occupation).toBeNull();
  });

  test("changes ownership and owner version only when the timer completes", () => {
    const state = tile();
    state.defenseCamp = 2;
    state.defenseQueue.push(troop("occupier", 2, 1_000_000, 1));

    syncOccupation(state, 0, 60);
    expect(syncOccupation(state, 59, 60).captured).toBe(false);
    expect(state.ownerCamp).toBe(1);
    expect(syncOccupation(state, 60, 60)).toEqual({ captured: true, ownerChanged: true });
    expect(state.ownerCamp).toBe(2);
    expect(state.ownerVersion).toBe(1);
  });
});
