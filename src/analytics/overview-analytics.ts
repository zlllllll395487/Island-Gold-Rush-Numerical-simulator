import type { ActiveAllianceId, ActivityTier, PowerTier } from "../domain/types";
import type { SimulationResult } from "../simulation/engine";

const ALLIANCE_IDS = [1, 2, 3] as const satisfies readonly ActiveAllianceId[];

export interface OverviewReplayPoint {
  second: number;
  hour: number;
  allianceTotals: [number, number, number];
  occupiedValues: [number, number, number];
  territoryCounts: [number, number, number];
  hourlyBattles: number;
  hourlyCaptures: number;
  hourlyAverageBattlePoints: number;
}

export interface OverviewCurrentMetrics {
  totalBattles: number;
  averageBattlePoints: number;
  rankChangeCount: number;
  rankChangeSeconds: number[];
}

export interface PlayerContributionPoint {
  playerId: string;
  allianceId: ActiveAllianceId;
  powerTier: PowerTier;
  activityTier: ActivityTier;
  power: number;
  apUtilization: number;
  score: number;
}

function rankOrder(totals: readonly number[]): ActiveAllianceId[] {
  return [...ALLIANCE_IDS].sort((left, right) =>
    totals[right - 1] - totals[left - 1] || left - right,
  );
}


export function overviewAt(result: SimulationResult, second: number): OverviewCurrentMetrics {
  const totalBattles = result.timeline.filter((event) => event.type === "battle" && event.second <= second).length;
  const battlePoints = result.scoreEvents
    .filter((event) => event.source === "battle" && event.second <= second)
    .reduce((sum, event) => sum + event.delta, 0);

  const visibleSnapshots = result.snapshots
    .filter((snapshot) => snapshot.second <= second)
    .slice()
    .sort((left, right) => left.second - right.second);
  const rankChangeSeconds: number[] = [];
  let previousLeader: ActiveAllianceId | null = null;
  for (const snapshot of visibleSnapshots) {
    const leader = rankOrder(snapshot.scoreTotals.map((row) => row.total))[0];
    if (previousLeader !== null && leader !== previousLeader) rankChangeSeconds.push(snapshot.second);
    previousLeader = leader;
  }

  return {
    totalBattles,
    averageBattlePoints: totalBattles > 0 ? battlePoints / totalBattles : 0,
    rankChangeCount: rankChangeSeconds.length,
    rankChangeSeconds,
  };
}

export function overviewReplaySeries(result: SimulationResult): OverviewReplayPoint[] {
  const battlesByHour = new Map<number, number>();
  const capturesByHour = new Map<number, number>();
  const battlePointsByHour = new Map<number, number>();
  for (const event of result.timeline) {
    const hour = Math.floor(event.second / 3600);
    if (event.type === "battle") battlesByHour.set(hour, (battlesByHour.get(hour) ?? 0) + 1);
    if (event.type === "capture") capturesByHour.set(hour, (capturesByHour.get(hour) ?? 0) + 1);
  }
  for (const event of result.scoreEvents) {
    if (event.source !== "battle") continue;
    const hour = Math.floor(event.second / 3600);
    battlePointsByHour.set(hour, (battlePointsByHour.get(hour) ?? 0) + event.delta);
  }

  return result.snapshots.map((snapshot) => ({
    second: snapshot.second,
    hour: snapshot.hour,
    allianceTotals: snapshot.scoreTotals.map((row) => row.total) as OverviewReplayPoint["allianceTotals"],
    occupiedValues: [...snapshot.scores],
    territoryCounts: [...snapshot.territory],
    hourlyBattles: battlesByHour.get(Math.floor(snapshot.hour)) ?? 0,
    hourlyCaptures: capturesByHour.get(Math.floor(snapshot.hour)) ?? 0,
    hourlyAverageBattlePoints: (battlePointsByHour.get(Math.floor(snapshot.hour)) ?? 0) / Math.max(1, battlesByHour.get(Math.floor(snapshot.hour)) ?? 0),
  }));
}

export function tileBattleHeatAt(result: SimulationResult, second: number): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const event of result.timeline) {
    if (event.type !== "battle" || event.second > second || event.tileId === undefined) continue;
    counts[event.tileId] = (counts[event.tileId] ?? 0) + 1;
  }
  return counts;
}

export function playerContributionAt(result: SimulationResult, second: number): PlayerContributionPoint[] {
  const scores = new Map<string, number>();
  for (const event of result.scoreEvents) {
    if (event.second > second) continue;
    scores.set(event.playerId, (scores.get(event.playerId) ?? 0) + event.delta);
  }
  return result.players.map((player) => ({
    playerId: player.id,
    allianceId: player.allianceId,
    powerTier: player.powerTier,
    activityTier: player.activityTier,
    power: player.power,
    apUtilization: player.apSpent / Math.max(1, player.apSupply),
    score: scores.get(player.id) ?? 0,
  }));
}
