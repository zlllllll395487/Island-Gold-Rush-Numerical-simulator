import type { MapTile, SimulationConfig } from "../domain/types";

export function occupationSeconds(tile: MapTile, baseDistance: number, config: SimulationConfig): number {
  const kind = tile.configId === 30003 ? "core" : tile.configId === 30002 ? "resource" : "normal";
  return config.occupation.baseSeconds[kind] + Math.max(0, baseDistance - config.occupation.safeDistance) * config.occupation.secondsPerExcessHex;
}
