import type { ActiveAllianceId, AllianceId, TileId } from "../domain/types";

export interface TroopState {
  id: string;
  playerId: string;
  allianceId: ActiveAllianceId;
  formationSlot: number;
  basePower: number;
  troops: number;
  distance: number;
  consecutiveWins: number;
  morale: number;
  entryOrder: number;
}

export interface OccupationRuntimeState {
  camp: ActiveAllianceId;
  startedAt: number;
  endsAt: number;
}

export interface TileRuntimeState {
  tileId: TileId;
  ownerCamp: AllianceId;
  defenseCamp: AllianceId;
  defenseQueue: TroopState[];
  attackQueue: TroopState[];
  lastBattleAt: number;
  occupation: OccupationRuntimeState | null;
  ownerVersion: number;
}
