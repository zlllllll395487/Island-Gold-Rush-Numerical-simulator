import type { AllianceId, MapTile, NormalizedMap, TileConfigId } from "../domain/types";
import { cubeKey, cubeNeighbors } from "./hex";

const CONFIG_COUNTS: ReadonlyMap<TileConfigId, number> = new Map([
  [10001, 3],
  [20001, 6],
  [30001, 201],
  [30002, 15],
  [30003, 4],
  [40001, 24],
  [40002, 18],
]);

const CONFIG_IDS = new Set(CONFIG_COUNTS.keys());
const BLOCKED_IDS = new Set<TileConfigId>([40001, 40002]);

interface RawTile {
  tile_id: unknown;
  tile_config_id: unknown;
  camp: unknown;
  x: unknown;
  y: unknown;
  z: unknown;
}

export class MapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapValidationError";
  }
}

function requireInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value)) {
    throw new MapValidationError(`${field} must be an integer`);
  }
  return value as number;
}

function normalizeTile(raw: RawTile, index: number): MapTile {
  const tileId = requireInteger(raw.tile_id, `tiles[${index}].tile_id`);
  const configId = requireInteger(raw.tile_config_id, `tiles[${index}].tile_config_id`);
  const camp = requireInteger(raw.camp, `tiles[${index}].camp`);
  const x = requireInteger(raw.x, `tiles[${index}].x`);
  const y = requireInteger(raw.y, `tiles[${index}].y`);
  const z = requireInteger(raw.z, `tiles[${index}].z`);

  if (!CONFIG_IDS.has(configId as TileConfigId)) {
    throw new MapValidationError(`unsupported tile_config_id ${configId}`);
  }
  if (![0, 1, 2, 3].includes(camp)) {
    throw new MapValidationError(`camp must be 0, 1, 2, or 3; received ${camp}`);
  }
  if (x + y + z !== 0) {
    throw new MapValidationError(`tile_id ${tileId} violates x + y + z = 0`);
  }

  return {
    tileId,
    configId: configId as TileConfigId,
    camp: camp as AllianceId,
    x,
    y,
    z,
    blocked: BLOCKED_IDS.has(configId as TileConfigId),
  };
}

export function loadCanonicalMap(raw: unknown): NormalizedMap {
  if (!Array.isArray(raw)) {
    throw new MapValidationError("map must be an array");
  }

  const tiles = raw.map((item, index) => normalizeTile(item as RawTile, index));
  const byId = new Map<number, MapTile>();
  const byCoord = new Map<string, MapTile>();
  const byConfigId = new Map<TileConfigId, MapTile[]>();

  for (const configId of CONFIG_COUNTS.keys()) byConfigId.set(configId, []);

  for (const tile of tiles) {
    if (byId.has(tile.tileId)) {
      throw new MapValidationError(`duplicate tile_id ${tile.tileId}`);
    }
    const key = cubeKey(tile);
    if (byCoord.has(key)) {
      throw new MapValidationError(`duplicate cube coordinate ${key}`);
    }
    byId.set(tile.tileId, tile);
    byCoord.set(key, tile);
    byConfigId.get(tile.configId)!.push(tile);
  }

  if (tiles.length !== 271) {
    throw new MapValidationError(`expected 271 tiles, received ${tiles.length}`);
  }
  for (const [configId, expected] of CONFIG_COUNTS) {
    const actual = byConfigId.get(configId)!.length;
    if (actual !== expected) {
      throw new MapValidationError(`tile_config_id ${configId} expected ${expected}, received ${actual}`);
    }
  }

  const neighborsById = new Map<number, number[]>();
  for (const tile of tiles) {
    const neighborIds = cubeNeighbors(tile)
      .map((coord) => byCoord.get(cubeKey(coord))?.tileId)
      .filter((tileId): tileId is number => tileId !== undefined);
    neighborsById.set(tile.tileId, neighborIds);
  }

  return { tiles, byId, byCoord, byConfigId, neighborsById };
}
