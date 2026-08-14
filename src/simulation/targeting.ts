import type { AllianceId } from "../domain/types";
import type { SeededRng } from "../population/rng";
import type { PlayerStrategy } from "../population/generate-players";

export interface TargetCandidate {
  tileId: number;
  frontId: string;
  ownerCamp: AllianceId;
  tileType: "normal" | "resource" | "core";
  distance: number;
  fighting: boolean;
  ownTroopPresent: boolean;
  friendlyQueue: number;
  enemyQueue: number;
  congestion: number;
  recentContests: number;
}

export interface FrontTargetingConfig {
  allianceObjectiveWeight: number;
  personalStrategyWeight: number;
  supportQueueGap: number;
}

function weightedChoice(candidates: readonly TargetCandidate[], scores: readonly number[], rng: SeededRng): number {
  const maxScore = Math.max(...scores);
  const weights = scores.map((score) => Math.exp((score - maxScore) / 8));
  let roll = rng.next() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < candidates.length; index++) {
    roll -= weights[index];
    if (roll <= 0) return candidates[index].tileId;
  }
  return candidates.at(-1)!.tileId;
}

function score(candidate: TargetCandidate, strategy: PlayerStrategy, config: FrontTargetingConfig): number {
  const objective = (candidate.tileType === "core" ? 18 : candidate.tileType === "resource" ? 10 : 2)
    - candidate.distance * 0.45
    - candidate.congestion * 3
    - candidate.recentContests * 2.5;
  let personal = candidate.ownerCamp === 0 ? 7 : 0;
  if (strategy === "value") personal += candidate.tileType === "core" ? 24 : candidate.tileType === "resource" ? 16 : 0;
  if (strategy === "aggressive" && candidate.ownerCamp !== 0) personal += 12;
  if (strategy === "defensive") personal += Math.max(0, candidate.enemyQueue - candidate.friendlyQueue) * 3;
  if (strategy === "frontier") personal += Math.max(0, 8 - candidate.distance);
  return objective * config.allianceObjectiveWeight + personal * config.personalStrategyWeight;
}

export function chooseTarget(
  candidates: readonly TargetCandidate[],
  strategy: PlayerStrategy,
  primaryFrontId: string,
  config: FrontTargetingConfig,
  rng: SeededRng,
): number | null {
  const local = candidates.filter((candidate) => candidate.frontId === primaryFrontId);
  const localFights = local.filter((candidate) => candidate.fighting);
  if (localFights.length > 0) {
    const supportable = localFights.filter((candidate) =>
      !candidate.ownTroopPresent && candidate.friendlyQueue - candidate.enemyQueue < config.supportQueueGap,
    );
    if (supportable.length === 0) return null;
    return weightedChoice(supportable, supportable.map((candidate) => score(candidate, strategy, config) + 20), rng);
  }

  const expansion = local.filter((candidate) => !candidate.fighting);
  if (expansion.length === 0) return null;
  const neutral = expansion.filter((candidate) => candidate.ownerCamp === 0);
  const pool = neutral.length > 0 ? neutral : expansion;
  return weightedChoice(pool, pool.map((candidate) => score(candidate, strategy, config)), rng);
}
