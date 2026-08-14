import type { BehaviorStrategy, SimulationConfig } from "../domain/types";
import type { Player } from "./generate-players";
import type { SeededRng } from "./rng";

const STRATEGIES = ["centerRush", "supportExpand", "multiFront"] as const satisfies readonly BehaviorStrategy[];
const POWER_TIER_SCORES = { low: 0, mid: 0.35, high: 0.7, super: 1 } as const;

function normalizedActivity(players: readonly Player[]): Map<string, number> {
  const propensities = players.map((player) => player.apUsagePropensity);
  const minimum = Math.min(...propensities);
  const maximum = Math.max(...propensities);
  const range = maximum - minimum;
  return new Map(players.map((player) => [player.id, range === 0 ? 0.5 : (player.apUsagePropensity - minimum) / range]));
}

function quotaByStrategy(count: number, shares: SimulationConfig["strategy"]["shares"]): Record<BehaviorStrategy, number> {
  const shareTotal = STRATEGIES.reduce((sum, strategy) => sum + shares[strategy], 0);
  const exactQuotas = STRATEGIES.map((strategy) => ({ strategy, exact: count * shares[strategy] / shareTotal }));
  const quotas = Object.fromEntries(exactQuotas.map(({ strategy, exact }) => [strategy, Math.floor(exact)])) as Record<BehaviorStrategy, number>;
  const remaining = count - STRATEGIES.reduce((sum, strategy) => sum + quotas[strategy], 0);
  exactQuotas
    .sort((left, right) => (right.exact % 1) - (left.exact % 1) || STRATEGIES.indexOf(left.strategy) - STRATEGIES.indexOf(right.strategy))
    .slice(0, remaining)
    .forEach(({ strategy }) => { quotas[strategy] += 1; });
  return quotas;
}

function assignAlliance(players: Player[], config: SimulationConfig, rng: SeededRng): void {
  const quotas = quotaByStrategy(players.length, config.strategy.shares);
  const activity = normalizedActivity(players);
  const rankedForCenter = players
    .map((player) => ({
      player,
      score: activity.get(player.id)! * config.strategy.activityWeight
        + POWER_TIER_SCORES[player.powerTier] * config.strategy.powerWeight
        + rng.next() * config.strategy.randomWeight,
    }))
    .sort((left, right) => right.score - left.score || left.player.id.localeCompare(right.player.id));
  const centerPlayers = rankedForCenter.slice(0, quotas.centerRush).map(({ player }) => player);
  const rankedForSupport = rankedForCenter
    .slice(quotas.centerRush)
    .map(({ player }) => ({ player, score: activity.get(player.id)! + rng.next() * config.strategy.randomWeight }))
    .sort((left, right) => right.score - left.score || left.player.id.localeCompare(right.player.id));
  const supportPlayerIds = new Set(rankedForSupport.slice(0, quotas.supportExpand).map(({ player }) => player.id));
  const centerPlayerIds = new Set(centerPlayers.map((player) => player.id));

  centerPlayers.forEach((player) => { player.behaviorStrategy = "centerRush"; });
  rankedForSupport.slice(0, quotas.supportExpand).forEach(({ player }) => { player.behaviorStrategy = "supportExpand"; });
  players
    .filter((player) => !centerPlayerIds.has(player.id) && !supportPlayerIds.has(player.id))
    .forEach((player) => { player.behaviorStrategy = "multiFront"; });
}

export function assignBehaviorStrategies(players: Player[], config: SimulationConfig, rng: SeededRng): Player[] {
  for (const allianceId of [1, 2, 3] as const) {
    assignAlliance(players.filter((player) => player.allianceId === allianceId).sort((left, right) => left.id.localeCompare(right.id)), config, rng);
  }
  return players;
}
