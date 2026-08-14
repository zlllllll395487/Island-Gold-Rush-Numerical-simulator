import type { SimulationConfig } from "../domain/types";
import type { SimulationResult } from "../simulation/engine";

export interface MatchMetrics {
  firstPvpHour: number | null;
  firstPvpStatus: "early" | "target" | "late" | "none";
  dominance: number;
  apUtilization: number;
  taskCoverage: number[];
  medianPersonalScore: number;
  pvpEvents: number;
}

export interface BatchSummary {
  firstPvpMedian: number | null;
  firstPvpTargetRate: number;
  dominanceRisk: number;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function calculateMatchMetrics(result: SimulationResult, config: SimulationConfig): MatchMetrics {
  const first = result.firstPvpHour;
  const [min, max] = config.targets.firstPvpHours;
  const firstPvpStatus = first === null ? "none" : first < min ? "early" : first <= max ? "target" : "late";
  const finalScores = result.alliances.map((alliance) => alliance.snapshotScore);
  const totalSnapshot = finalScores.reduce((sum, value) => sum + value, 0);
  const dominance = totalSnapshot ? Math.max(...finalScores) / totalSnapshot : 0;
  const totalActions = result.players.reduce((sum, player) => sum + player.actions, 0);
  const theoreticalCommands = result.players.length * 30;
  const personalScores = result.players.map((player) => player.personalScore).sort((a, b) => a - b);
  return {
    firstPvpHour: first,
    firstPvpStatus,
    dominance,
    apUtilization: Math.min(1, totalActions / theoreticalCommands),
    taskCoverage: config.tasks.thresholds.map((threshold) => result.players.filter((player) => player.personalScore >= threshold).length / result.players.length),
    medianPersonalScore: median(personalScores) ?? 0,
    pvpEvents: result.snapshots.at(-1)?.pvpEvents ?? 0,
  };
}

export function summarizeBatch(values: Array<{ firstPvpHour: number | null; dominance: number }>): BatchSummary {
  const firstPvp = values.flatMap((value) => value.firstPvpHour === null ? [] : [value.firstPvpHour]);
  return {
    firstPvpMedian: median(firstPvp),
    firstPvpTargetRate: values.length ? values.filter((value) => value.firstPvpHour !== null && value.firstPvpHour >= 3 && value.firstPvpHour <= 6).length / values.length : 0,
    dominanceRisk: values.length ? values.filter((value) => value.dominance >= 0.6).length / values.length : 0,
  };
}
