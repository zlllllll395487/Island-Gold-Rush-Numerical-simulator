import type { ActiveAllianceId, MapTile, NormalizedMap } from "../domain/types";
import type { Player } from "../population/generate-players";

export interface AllianceFront {
  id: string;
  allianceId: ActiveAllianceId;
  index: number;
  angle: number;
  rootTileId: number;
}

function planar(tile: MapTile): { x: number; y: number } {
  return { x: 1.5 * tile.x, y: Math.sqrt(3) * (tile.z + tile.x / 2) };
}

function angularDistance(left: number, right: number): number {
  const difference = Math.abs(left - right) % (Math.PI * 2);
  return Math.min(difference, Math.PI * 2 - difference);
}

export function buildAllianceFronts(map: NormalizedMap, allianceId: ActiveAllianceId, count: number): AllianceFront[] {
  const roots = map.tiles.filter((tile) => (tile.configId === 10001 || tile.configId === 20001) && tile.camp === allianceId);
  const base = roots.find((tile) => tile.configId === 10001)!;
  const basePoint = planar(base);

  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI + (index + 0.5) * (Math.PI * 2 / count);
    const root = roots
      .filter((tile) => tile.tileId !== base.tileId)
      .map((tile) => {
        const point = planar(tile);
        return { tile, difference: angularDistance(angle, Math.atan2(point.y - basePoint.y, point.x - basePoint.x)) };
      })
      .sort((left, right) => left.difference - right.difference || left.tile.tileId - right.tile.tileId)[0]?.tile ?? base;
    return { id: `A${allianceId}-F${index}`, allianceId, index, angle, rootTileId: root.tileId };
  });
}

export function frontForTile(map: NormalizedMap, tile: MapTile, fronts: readonly AllianceFront[]): string {
  const base = map.byConfigId.get(10001)!.find((candidate) => candidate.camp === fronts[0].allianceId)!;
  const origin = planar(base);
  const point = planar(tile);
  const angle = Math.atan2(point.y - origin.y, point.x - origin.x);
  return fronts.slice().sort((left, right) => angularDistance(angle, left.angle) - angularDistance(angle, right.angle))[0].id;
}

export function assignPlayerFronts(players: readonly Player[], fronts: readonly AllianceFront[]): Map<string, string> {
  const assignments = new Map<string, string>();
  players.slice().sort((left, right) => left.id.localeCompare(right.id)).forEach((player, index) => {
    assignments.set(player.id, fronts[index % fronts.length].id);
  });
  return assignments;
}
