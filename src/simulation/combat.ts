import type { CombatConfig, MoraleConfig } from "../domain/types";
import type { SeededRng } from "../population/rng";
import { moraleMultiplier } from "./morale";

export interface Duelant {
  basePower: number;
  troops: number;
  morale: number;
}

export interface DuelResult {
  winner: "attacker" | "defender";
  attackerWinProbability: number;
  attackerRemaining: number;
  defenderRemaining: number;
  attackerKills: number;
  defenderKills: number;
}

function effectiveStrength(unit: Duelant, combat: CombatConfig, morale: MoraleConfig): number {
  const troopRatio = Math.max(0, unit.troops) / combat.troopSize;
  return Math.pow(Math.max(1, unit.basePower), combat.powerExponent) * troopRatio * moraleMultiplier(unit.morale, morale);
}

export function resolveDuel(
  attacker: Duelant,
  defender: Duelant,
  combat: CombatConfig,
  morale: MoraleConfig,
  rng: SeededRng,
): DuelResult {
  const attackerStrength = effectiveStrength(attacker, combat, morale);
  const defenderStrength = effectiveStrength(defender, combat, morale);
  const logRatio = Math.log(Math.max(Number.EPSILON, attackerStrength) / Math.max(Number.EPSILON, defenderStrength));
  const attackerWinProbability = 1 / (1 + Math.exp(-combat.winProbabilitySlope * logRatio));
  const winner = rng.next() < attackerWinProbability ? "attacker" : "defender";
  const totalStrength = Math.max(Number.EPSILON, attackerStrength + defenderStrength);
  const winnerShare = (winner === "attacker" ? attackerStrength : defenderStrength) / totalStrength;
  const survivorRatio = Math.max(
    combat.survivorMinRatio,
    Math.min(combat.survivorMaxRatio, combat.survivorMinRatio + (combat.survivorMaxRatio - combat.survivorMinRatio) * winnerShare),
  );
  const attackerRemaining = winner === "attacker" ? Math.max(1, Math.round(attacker.troops * survivorRatio)) : 0;
  const defenderRemaining = winner === "defender" ? Math.max(1, Math.round(defender.troops * survivorRatio)) : 0;

  return {
    winner,
    attackerWinProbability,
    attackerRemaining,
    defenderRemaining,
    attackerKills: defender.troops - defenderRemaining,
    defenderKills: attacker.troops - attackerRemaining,
  };
}
