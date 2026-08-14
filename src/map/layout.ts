import type { CubeCoord, MapTile, TileId } from "../domain/types";

export interface Point {
  x: number;
  y: number;
}

export interface FlatTopLayout {
  radius: number;
  centers: Map<TileId, Point>;
}

export function flatTopCenter(coord: CubeCoord, size: number): Point {
  return {
    x: size * 1.5 * coord.x,
    y: size * Math.sqrt(3) * (coord.z + coord.x / 2),
  };
}

export function flatTopVertices(center: Point, size: number): Point[] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = index * Math.PI / 3;
    return {
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    };
  });
}

export function layoutFlatTopMap(tiles: readonly MapTile[], width: number, height: number, padding: number): FlatTopLayout {
  const rawCenters = new Map(tiles.map((tile) => [tile.tileId, flatTopCenter(tile, 1)]));
  const vertices = [...rawCenters.values()].flatMap((center) => flatTopVertices(center, 1));
  const minX = Math.min(...vertices.map((point) => point.x));
  const maxX = Math.max(...vertices.map((point) => point.x));
  const minY = Math.min(...vertices.map((point) => point.y));
  const maxY = Math.max(...vertices.map((point) => point.y));
  const radius = Math.min(
    (width - padding * 2) / (maxX - minX),
    (height - padding * 2) / (maxY - minY),
  );
  const offsetX = padding - minX * radius + (width - padding * 2 - (maxX - minX) * radius) / 2;
  const offsetY = padding - minY * radius + (height - padding * 2 - (maxY - minY) * radius) / 2;
  const centers = new Map<TileId, Point>();
  for (const tile of tiles) {
    const raw = rawCenters.get(tile.tileId)!;
    centers.set(tile.tileId, { x: raw.x * radius + offsetX, y: raw.y * radius + offsetY });
  }
  return { radius, centers };
}
