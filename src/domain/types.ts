export type AllianceId = 0 | 1 | 2 | 3;
export type ActiveAllianceId = 1 | 2 | 3;
export type TileId = number;
export type TileConfigId = 10001 | 20001 | 30001 | 30002 | 30003 | 40001 | 40002;

export interface CubeCoord {
  x: number;
  y: number;
  z: number;
}

export interface MapTile extends CubeCoord {
  tileId: TileId;
  configId: TileConfigId;
  camp: AllianceId;
  blocked: boolean;
}

export interface NormalizedMap {
  tiles: MapTile[];
  byId: Map<TileId, MapTile>;
  byCoord: Map<string, MapTile>;
  byConfigId: Map<TileConfigId, MapTile[]>;
  neighborsById: Map<TileId, TileId[]>;
}

export interface SimulationConfig {
  seed: number;
  battleHours: number;
  playersPerAlliance: number;
  ap: { initial: number; cap: number; recoveryAmount: number; recoveryEveryHours: number; attackCost: number; garrisonCost: number };
  occupation: { baseSeconds: { normal: number; resource: number; core: number }; safeDistance: number; secondsPerExcessHex: number };
  matching: { maxStrongestToWeakestRatio: number };
  activity: { allianceMultipliers: [number, number, number] };
  scoring: { occupation: { normal: number; resource: number; core: number }; killsPerPoint: number };
  tasks: { thresholds: number[]; targetCoverage: number[] };
  rewards: { tierShares: [number, number, number, number]; multiplier: number };
  targets: { firstPvpHours: [number, number] };
  batchRuns: 10 | 50 | 100;
}