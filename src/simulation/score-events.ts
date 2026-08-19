import type { ActiveAllianceId, TileId } from "../domain/types";

export type PlayerScoreSource = "battle" | "occupation";

export interface PlayerScoreEvent {
  second: number;
  playerId: string;
  allianceId: ActiveAllianceId;
  source: PlayerScoreSource;
  delta: number;
  totalAfter: number;
  tileId: TileId;
  kills?: number;
  cumulativeKills?: number;
  tileType?: "normal" | "resource" | "core";
}

export function battleScoreDelta(previousKills: number, addedKills: number, killsPerPoint: number): number {
  return Math.max(
    0,
    Math.floor((previousKills + addedKills) / killsPerPoint) - Math.floor(previousKills / killsPerPoint),
  );
}