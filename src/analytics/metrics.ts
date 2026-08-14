import type { ActivityTier, BehaviorStrategy, SimulationConfig } from "../domain/types";
import type { SimulationResult } from "../simulation/engine";

export interface ActivityUtilizationMetric {
  tier: ActivityTier;
  players: number;
  utilization: number;
}

export interface StrategyMetric {
  strategy: BehaviorStrategy;
  players: number;
  apUtilization: number;
  score: number;
  kills: number;
  occupations: number;
  centerContestShare: number;
}

export interface MatchMetrics {
  firstPvpHour: number | null;
  firstPvpStatus: "early" | "target" | "late" | "none";
  dominance: number;
  apUtilization: number;
  apOverflowRate: number;
  activityUtilization: ActivityUtilizationMetric[];
  strategyMetrics: StrategyMetric[];
  centerContestShare: number;
  taskCoverage: number[];
  taskRewardValues: number[];
  rewardMarginalValue: number[];
  medianPersonalScore: number;
  pvpEvents: number;
  activeFronts: number;
  uniqueContestedTiles: number;
  contestConcentration: number;
}

const BEHAVIOR_STRATEGIES: readonly BehaviorStrategy[] = ["centerRush", "supportExpand", "multiFront"];

export interface BatchSummary {
  firstPvpMedian: number | null;
  firstPvpTargetRate: number;
  dominanceRisk: number;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function utilization(spent: number, supply: number): number {
  return supply > 0 ? Math.min(1, spent / supply) : 0;
}

export function calculateMatchMetrics(result: SimulationResult, config: SimulationConfig): MatchMetrics {
  const first = result.firstPvpHour;
  const [min, max] = config.targets.firstPvpHours;
  const firstPvpStatus = first === null ? "none" : first < min ? "early" : first <= max ? "target" : "late";
  const finalScores = result.alliances.map((alliance) => alliance.snapshotScore);
  const totalSnapshot = finalScores.reduce((sum, value) => sum + value, 0);
  const dominance = totalSnapshot ? Math.max(...finalScores) / totalSnapshot : 0;
  const totalSpent = result.players.reduce((sum, player) => sum + player.apSpent, 0);
  const totalSupply = result.players.reduce((sum, player) => sum + player.apSupply, 0);
  const totalOverflow = result.players.reduce((sum, player) => sum + player.apOverflow, 0);
  const personalScores = result.players.map((player) => player.personalScore).sort((left, right) => left - right);
  const contestCounts = Object.values(result.contestedTileCounts);
  const totalContests = contestCounts.reduce((sum, count) => sum + count, 0);
  const contestConcentration = totalContests
    ? contestCounts.reduce((sum, count) => sum + Math.pow(count / totalContests, 2), 0)
    : 0;
  const centerTileIds = new Set(result.centerTileIds);
  const centerContestCount = result.centerTileIds.reduce(
    (sum, tileId) => sum + (result.contestedTileCounts[tileId] ?? 0),
    0,
  );
  const centerContestShare = totalContests ? Math.min(1, centerContestCount / totalContests) : 0;
  const dispatches = result.timeline.filter(
    (event): event is typeof event & { playerId: string; tileId: number } =>
      event.type === "dispatch" && event.playerId !== undefined && event.tileId !== undefined,
  );
  const centerDispatches = dispatches.filter((event) => centerTileIds.has(event.tileId));
  const taskRewardValues = config.rewards.taskValues.map((value) => value * config.rewards.multiplier);

  const activityUtilization = config.activity.bands.map((band) => {
    const players = result.players.filter((player) => player.activityTier === band.id);
    return {
      tier: band.id,
      players: players.length,
      utilization: utilization(
        players.reduce((sum, player) => sum + player.apSpent, 0),
        players.reduce((sum, player) => sum + player.apSupply, 0),
      ),
    };
  });

  const strategyMetrics = BEHAVIOR_STRATEGIES.map((strategy): StrategyMetric => {
    const players = result.players.filter((player) => player.behaviorStrategy === strategy);
    const playerIds = new Set(players.map((player) => player.id));
    return {
      strategy,
      players: players.length,
      apUtilization: utilization(
        players.reduce((sum, player) => sum + player.apSpent, 0),
        players.reduce((sum, player) => sum + player.apSupply, 0),
      ),
      score: players.reduce((sum, player) => sum + player.personalScore, 0),
      kills: players.reduce((sum, player) => sum + player.kills, 0),
      occupations: players.reduce((sum, player) => sum + player.occupations, 0),
      centerContestShare: centerDispatches.length
        ? centerDispatches.filter((event) => playerIds.has(event.playerId)).length / centerDispatches.length
        : 0,
    };
  });

  return {
    firstPvpHour: first,
    firstPvpStatus,
    dominance,
    apUtilization: utilization(totalSpent, totalSupply),
    apOverflowRate: utilization(totalOverflow, totalSupply),
    activityUtilization,
    strategyMetrics,
    centerContestShare,
    taskCoverage: config.tasks.thresholds.map((threshold) => result.players.filter((player) => player.personalScore >= threshold).length / result.players.length),
    taskRewardValues,
    rewardMarginalValue: config.tasks.thresholds.map((threshold, index) => {
      const previousThreshold = index === 0 ? 0 : config.tasks.thresholds[index - 1];
      const previousValue = index === 0 ? 0 : taskRewardValues[index - 1];
      return (taskRewardValues[index] - previousValue) / Math.max(1, threshold - previousThreshold);
    }),
    medianPersonalScore: median(personalScores) ?? 0,
    pvpEvents: result.timeline.filter((event) => event.type === "battle").length,
    activeFronts: result.activeFrontIds.length,
    uniqueContestedTiles: contestCounts.length,
    contestConcentration,
  };
}

export function summarizeBatch(
  values: Array<{ firstPvpHour: number | null; dominance: number }>,
  targetRange: SimulationConfig["targets"]["firstPvpHours"],
): BatchSummary {
  const [targetMin, targetMax] = targetRange;
  const firstPvp = values.flatMap((value) => value.firstPvpHour === null ? [] : [value.firstPvpHour]);
  return {
    firstPvpMedian: median(firstPvp),
    firstPvpTargetRate: values.length ? values.filter((value) => value.firstPvpHour !== null && value.firstPvpHour >= targetMin && value.firstPvpHour <= targetMax).length / values.length : 0,
    dominanceRisk: values.length ? values.filter((value) => value.dominance >= 0.6).length / values.length : 0,
  };
}
