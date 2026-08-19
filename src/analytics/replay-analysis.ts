import type { AllianceScoreTotals, SimulationResult } from "../simulation/engine";
import type { PlayerScoreEvent } from "../simulation/score-events";

export interface AllianceScorePoint {
  hour: number;
  alliances: [AllianceScoreTotals, AllianceScoreTotals, AllianceScoreTotals];
}

export function allianceScoreSeries(result: SimulationResult): AllianceScorePoint[] {
  return result.snapshots.map((snapshot) => ({
    hour: snapshot.hour,
    alliances: snapshot.scoreTotals.map((row) => ({ ...row })) as AllianceScorePoint["alliances"],
  }));
}

export function playerScoreEventsAt(
  result: SimulationResult,
  playerId: string,
  second: number,
  limit = 50,
): PlayerScoreEvent[] {
  return result.scoreEvents
    .filter((event) => event.playerId === playerId && event.second <= second)
    .slice()
    .sort((left, right) => right.second - left.second)
    .slice(0, Math.max(0, limit));
}