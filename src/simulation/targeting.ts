import type { AllianceId } from "../domain/types";
import type { SeededRng } from "../population/rng";
import type { PlayerStrategy } from "../population/generate-players";
import { candidatesInFront } from "./fronts";

export interface TargetCandidate {
  tileId: number;
  frontId: string;
  ownerCamp: AllianceId;
  tileType: "normal" | "resource" | "core";
  distance: number;
  centerDistance?: number;
  fighting: boolean;
  ownTroopPresent: boolean;
  friendlyQueue: number;
  enemyQueue: number;
  congestion: number;
  recentContests: number;
}

export interface StrategyTargetingConfig {
  centerWeight: number;
  resourceWeight: number;
  normalWeight: number;
  congestionAvoidance: number;
  supportQueueGap: number;
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
function legalCandidates(candidates: readonly TargetCandidate[]): TargetCandidate[] {
  return candidates.filter((candidate) => !candidate.ownTroopPresent);
}

function motivation(candidate: TargetCandidate, config: StrategyTargetingConfig): number {
  if (candidate.tileType === "core") return config.centerWeight;
  if (candidate.tileType === "resource") return config.resourceWeight;
  return config.normalWeight;
}

function strategyScore(candidate: TargetCandidate, config: StrategyTargetingConfig): number {
  return motivation(candidate, config)
    - candidate.distance * 0.45
    - candidate.congestion * config.congestionAvoidance
    - candidate.recentContests * 2.5;
}

function chooseWeightedStrategyTarget(
  candidates: readonly TargetCandidate[],
  config: StrategyTargetingConfig,
  rng: SeededRng,
): number | null {
  if (candidates.length === 0) return null;
  return weightedChoice(candidates, candidates.map((candidate) => strategyScore(candidate, config)), rng);
}

function distanceToCore(candidate: TargetCandidate): number {
  return candidate.centerDistance ?? candidate.distance;
}

function deterministicCenterChoice(
  candidates: readonly TargetCandidate[],
  config: StrategyTargetingConfig,
  rng: SeededRng,
): number | null {
  if (candidates.length === 0) return null;
  const core = candidates.filter((candidate) => candidate.tileType === "core");
  const centerPool = core.length > 0
    ? core
    : candidates.filter((candidate) => distanceToCore(candidate) === Math.min(...candidates.map(distanceToCore)));
  const strongestMotivation = Math.max(...centerPool.map((candidate) => motivation(candidate, config)));
  const motivated = centerPool.filter((candidate) => motivation(candidate, config) === strongestMotivation);
  const lowestCongestion = Math.min(...motivated.map((candidate) => candidate.congestion));
  const uncongested = motivated.filter((candidate) => candidate.congestion === lowestCongestion);
  const fewestContests = Math.min(...uncongested.map((candidate) => candidate.recentContests));
  return chooseWeightedStrategyTarget(uncongested.filter((candidate) => candidate.recentContests === fewestContests), config, rng);
}

export function chooseCenterRushTarget(
  candidates: readonly TargetCandidate[],
  config: StrategyTargetingConfig,
  rng: SeededRng,
): number | null {
  return deterministicCenterChoice(legalCandidates(candidates), config, rng);
}

export function chooseSupportExpandTarget(
  candidates: readonly TargetCandidate[],
  config: StrategyTargetingConfig,
  rng: SeededRng,
): number | null {
  const legal = legalCandidates(candidates);
  const fights = legal.filter((candidate) => candidate.fighting);
  if (fights.length > 0) {
    const supportable = fights.filter((candidate) => candidate.friendlyQueue - candidate.enemyQueue < config.supportQueueGap);
    if (supportable.length === 0) return null;
    const smallestDifference = Math.min(...supportable.map((candidate) => candidate.friendlyQueue - candidate.enemyQueue));
    return chooseWeightedStrategyTarget(
      supportable.filter((candidate) => candidate.friendlyQueue - candidate.enemyQueue === smallestDifference),
      config,
      rng,
    );
  }

  const expansion = legal.filter((candidate) => !candidate.fighting);
  const neutral = expansion.filter((candidate) => candidate.ownerCamp === 0);
  return chooseWeightedStrategyTarget(neutral.length > 0 ? neutral : expansion, config, rng);
}

function chooseMultiFrontFromPool(
  candidates: readonly TargetCandidate[],
  config: StrategyTargetingConfig,
  rng: SeededRng,
): number | null {
  const fights = candidates.filter((candidate) => candidate.fighting);
  if (fights.length > 0) {
    const supportable = fights.filter((candidate) => candidate.friendlyQueue - candidate.enemyQueue < config.supportQueueGap);
    if (supportable.length === 0) return null;
    const smallestDifference = Math.min(...supportable.map((candidate) => candidate.friendlyQueue - candidate.enemyQueue));
    return chooseWeightedStrategyTarget(
      supportable.filter((candidate) => candidate.friendlyQueue - candidate.enemyQueue === smallestDifference),
      config,
      rng,
    );
  }
  const neutral = candidates.filter((candidate) => candidate.ownerCamp === 0);
  return chooseWeightedStrategyTarget(neutral.length > 0 ? neutral : candidates, config, rng);
}

export function chooseMultiFrontTarget(
  candidates: readonly TargetCandidate[],
  primaryFrontId: string,
  config: StrategyTargetingConfig,
  rng: SeededRng,
): number | null {
  const legal = legalCandidates(candidates);
  const local = candidatesInFront(legal, primaryFrontId);
  const localTarget = chooseMultiFrontFromPool(local, config, rng);
  if (localTarget !== null) return localTarget;
  return chooseMultiFrontFromPool(legal.filter((candidate) => candidate.frontId !== primaryFrontId), config, rng);
}
