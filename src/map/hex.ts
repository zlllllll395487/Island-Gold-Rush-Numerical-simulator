import type { CubeCoord } from "../domain/types";

export const CUBE_DIRECTIONS: readonly CubeCoord[] = [
  { x: 1, y: -1, z: 0 },
  { x: 1, y: 0, z: -1 },
  { x: 0, y: 1, z: -1 },
  { x: -1, y: 1, z: 0 },
  { x: -1, y: 0, z: 1 },
  { x: 0, y: -1, z: 1 },
];

export function cubeKey(coord: CubeCoord): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

export function cubeDistance(a: CubeCoord, b: CubeCoord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

export function cubeNeighbors(coord: CubeCoord): CubeCoord[] {
  return CUBE_DIRECTIONS.map((direction) => ({
    x: coord.x + direction.x,
    y: coord.y + direction.y,
    z: coord.z + direction.z,
  }));
}
