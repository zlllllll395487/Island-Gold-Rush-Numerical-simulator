import type { SimulationConfig } from "../domain/types";
import type { SeededRng } from "../population/rng";
import { resolveDuel, type DuelResult } from "./combat";
import { calculateMorale } from "./morale";
import type { TileRuntimeState, TroopState } from "./state";

export interface BattleTickResult {
  battle: DuelResult | null;
  releasedTroopIds: string[];
  killsByPlayer: Map<string, number>;
}

export function enqueueTroop(tile: TileRuntimeState, troop: TroopState): void {
  const queue = tile.defenseCamp === troop.allianceId ? tile.defenseQueue : tile.attackQueue;
  queue.push(troop);
  queue.sort((left, right) => left.entryOrder - right.entryOrder);
}

function recordKill(target: Map<string, number>, playerId: string, kills: number): void {
  target.set(playerId, (target.get(playerId) ?? 0) + kills);
}

export function resolveTileBattleTick(
  tile: TileRuntimeState,
  nowSeconds: number,
  config: SimulationConfig,
  rng: SeededRng,
): BattleTickResult {
  const empty: BattleTickResult = { battle: null, releasedTroopIds: [], killsByPlayer: new Map() };
  if (nowSeconds - tile.lastBattleAt < config.combat.battleIntervalSeconds) return empty;
  const attacker = tile.attackQueue[0];
  const defender = tile.defenseQueue[0];
  if (!attacker || !defender || attacker.allianceId === tile.defenseCamp) return empty;

  const battle = resolveDuel(attacker, defender, config.combat, config.morale, rng);
  const releasedTroopIds: string[] = [];
  const killsByPlayer = new Map<string, number>();
  recordKill(killsByPlayer, attacker.playerId, battle.attackerKills);
  recordKill(killsByPlayer, defender.playerId, battle.defenderKills);
  tile.lastBattleAt = nowSeconds;

  if (battle.winner === "attacker") {
    attacker.troops = battle.attackerRemaining;
    attacker.consecutiveWins += 1;
    attacker.morale = calculateMorale(attacker.distance, attacker.consecutiveWins, config.morale);
    releasedTroopIds.push(defender.id);
    tile.defenseQueue.shift();

    if (tile.defenseQueue.length === 0) {
      tile.defenseCamp = attacker.allianceId;
      const remainingAttackers: TroopState[] = [];
      for (const unit of tile.attackQueue) {
        if (unit.allianceId === tile.defenseCamp) tile.defenseQueue.push(unit);
        else remainingAttackers.push(unit);
      }
      tile.attackQueue = remainingAttackers;
    }
  } else {
    defender.troops = battle.defenderRemaining;
    defender.consecutiveWins += 1;
    defender.morale = calculateMorale(defender.distance, defender.consecutiveWins, config.morale);
    releasedTroopIds.push(attacker.id);
    tile.attackQueue.shift();
  }

  return { battle, releasedTroopIds, killsByPlayer };
}
