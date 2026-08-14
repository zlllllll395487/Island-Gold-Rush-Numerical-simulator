import type { MapTile, SimulationConfig } from "../domain/types";
import type { TileRuntimeState } from "./state";

export function occupationSeconds(tile: MapTile, baseDistance: number, config: SimulationConfig): number {
  const kind = tile.configId === 30003 ? "core" : tile.configId === 30002 ? "resource" : "normal";
  return (config.occupation.baseSeconds[kind] + Math.max(0, baseDistance - config.occupation.safeDistance) * config.occupation.secondsPerExcessHex) * config.occupation.paceMultiplier;
}

export interface OccupationUpdate {
  captured: boolean;
  ownerChanged: boolean;
}

export function syncOccupation(tile: TileRuntimeState, nowSeconds: number, durationSeconds: number): OccupationUpdate {
  if (tile.defenseCamp === 0 || tile.defenseCamp === tile.ownerCamp || tile.defenseQueue.length === 0) {
    tile.occupation = null;
    return { captured: false, ownerChanged: false };
  }

  if (!tile.occupation || tile.occupation.camp !== tile.defenseCamp) {
    tile.occupation = {
      camp: tile.defenseCamp,
      startedAt: nowSeconds,
      endsAt: nowSeconds + durationSeconds,
    };
  }

  if (nowSeconds < tile.occupation.endsAt) return { captured: false, ownerChanged: false };
  const ownerChanged = tile.ownerCamp !== tile.defenseCamp;
  tile.ownerCamp = tile.defenseCamp;
  if (ownerChanged) tile.ownerVersion += 1;
  tile.occupation = null;
  return { captured: ownerChanged, ownerChanged };
}
