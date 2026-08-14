import type { ActiveAllianceId, AllianceId, NormalizedMap, TileId } from "../domain/types";

export type TileOwners = Map<TileId, AllianceId>;

export function initialOwners(map: NormalizedMap): TileOwners {
  return new Map(map.tiles.map((tile) => [tile.tileId, tile.camp]));
}

export function connectedTerritory(map: NormalizedMap, owners: TileOwners, allianceId: ActiveAllianceId): Set<TileId> {
  const sources = map.tiles.filter((tile) => (tile.configId === 10001 || tile.configId === 20001) && tile.camp === allianceId);
  const connected = new Set<TileId>();
  const queue = sources.map((tile) => tile.tileId);
  while (queue.length) {
    const tileId = queue.shift()!;
    if (connected.has(tileId) || owners.get(tileId) !== allianceId) continue;
    connected.add(tileId);
    for (const neighbor of map.neighborsById.get(tileId) ?? []) {
      if (!connected.has(neighbor) && owners.get(neighbor) === allianceId) queue.push(neighbor);
    }
  }
  return connected;
}

export function legalTargets(map: NormalizedMap, owners: TileOwners, allianceId: ActiveAllianceId): TileId[] {
  const connected = connectedTerritory(map, owners, allianceId);
  const targets = new Set<TileId>();
  for (const tileId of connected) {
    for (const neighborId of map.neighborsById.get(tileId) ?? []) {
      const tile = map.byId.get(neighborId)!;
      if (!tile.blocked && owners.get(neighborId) !== allianceId && tile.configId !== 10001 && tile.configId !== 20001) targets.add(neighborId);
    }
  }
  return [...targets].sort((a, b) => a - b);
}
