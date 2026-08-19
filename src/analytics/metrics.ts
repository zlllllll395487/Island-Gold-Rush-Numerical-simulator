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

export interface CenterContestIntensity {
  score: number;
  battles: number;
  captures: number;
  controlHours: number;
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
  mapValueGap: number;
  apWasteRate: number;
  centerContestIntensity: CenterContestIntensity;
  scoreConcentrationTop10: number;
  powerScoreCorrelation: number | null;
}

const BEHAVIOR_STRATEGIES: readonly BehaviorStrategy[] = ["centerRush", "supportExpand", "multiFront"];

export interface BatchSummary {
  firstPvpMedian: number | null;
  firstPvpP10: number | null;
  firstPvpP90: number | null;
  firstPvpTargetRate: number;
  dominanceRisk: number;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function quantile(values: number[], probability: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function correlation(pairs: Array<readonly [number, number]>): number | null {
  if (pairs.length < 2) return null;
  const meanX = pairs.reduce((sum, [value]) => sum + value, 0) / pairs.length;
  const meanY = pairs.reduce((sum, [, value]) => sum + value, 0) / pairs.length;
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (const [x, y] of pairs) {
    covariance += (x - meanX) * (y - meanY);
    varianceX += Math.pow(x - meanX, 2);
    varianceY += Math.pow(y - meanY, 2);
  }
  const denominator = Math.sqrt(varianceX * varianceY);
  return denominator > 0 ? Math.max(-1, Math.min(1, covariance / denominator)) : null;
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
  const averageMapValue = finalScores.reduce((sum, value) => sum + value, 0) / Math.max(1, finalScores.length);
  const mapValueGap = averageMapValue > 0
    ? (Math.max(...finalScores) - Math.min(...finalScores)) / averageMapValue
    : 0;
  const apUtilization = utilization(totalSpent, totalSupply);
  const apWasteRate = totalSupply > 0 ? Math.max(0, Math.min(1, 1 - apUtilization)) : 0;
  const centerIds = new Set(result.centerTileIds);
  const centerBattles = result.timeline.filter(
    (event) => event.type === "battle" && event.tileId !== undefined && centerIds.has(event.tileId),
  ).length;
  const centerCaptures = result.timeline.filter(
    (event) => event.type === "capture" && event.tileId !== undefined && centerIds.has(event.tileId),
  ).length;
  let centerControlHours = 0;
  for (let index = 1; index < result.snapshots.length; index++) {
    const previous = result.snapshots[index - 1];
    const current = result.snapshots[index];
    const previousOwned = result.centerTileIds.filter((tileId) => (previous.owners[tileId] ?? 0) > 0).length;
    const currentOwned = result.centerTileIds.filter((tileId) => (current.owners[tileId] ?? 0) > 0).length;
    centerControlHours += ((previousOwned + currentOwned) / 2) * (current.hour - previous.hour);
  }
  const totalBattles = result.timeline.filter((event) => event.type === "battle").length;
  const durationHours = Math.max(0, (result.snapshots.at(-1)?.hour ?? 0) - (result.snapshots[0]?.hour ?? 0));
  const controlCapacity = durationHours * result.centerTileIds.length;
  const centerContestIntensity: CenterContestIntensity = {
    battles: centerBattles,
    captures: centerCaptures,
    controlHours: centerControlHours,
    score: (
      Math.min(1, centerBattles / Math.max(1, totalBattles))
      + Math.min(1, centerCaptures / Math.max(1, result.centerTileIds.length))
      + (controlCapacity > 0 ? Math.min(1, centerControlHours / controlCapacity) : 0)
    ) / 3,
  };
  const descendingScores = [...personalScores].sort((left, right) => right - left);
  const topCount = descendingScores.length ? Math.max(1, Math.ceil(descendingScores.length * 0.1)) : 0;
  const totalPersonalScore = descendingScores.reduce((sum, score) => sum + score, 0);
  const scoreConcentrationTop10 = totalPersonalScore > 0
    ? descendingScores.slice(0, topCount).reduce((sum, score) => sum + score, 0) / totalPersonalScore
    : 0;
  const powerScoreCorrelation = correlation(result.players.map((player) => [player.power, player.personalScore] as const));
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
    apUtilization,
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
    mapValueGap,
    apWasteRate,
    centerContestIntensity,
    scoreConcentrationTop10,
    powerScoreCorrelation,
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
    firstPvpP10: quantile(firstPvp, 0.1),
    firstPvpP90: quantile(firstPvp, 0.9),
    firstPvpTargetRate: values.length ? values.filter((value) => value.firstPvpHour !== null && value.firstPvpHour >= targetMin && value.firstPvpHour <= targetMax).length / values.length : 0,
    dominanceRisk: values.length ? values.filter((value) => value.dominance >= 0.6).length / values.length : 0,
  };
}
