export type AllianceId = 0 | 1 | 2 | 3;
export type ActiveAllianceId = 1 | 2 | 3;
export type TileId = number;
export type TileConfigId = 10001 | 20001 | 30001 | 30002 | 30003 | 40001 | 40002;
export type PowerTier = "low" | "mid" | "high" | "super";
export type ActivityTier = "minimal" | "casual" | "normal" | "active" | "core";

export type BehaviorStrategy = "centerRush" | "supportExpand" | "multiFront";
export interface ActivityBandConfig {
  id: ActivityTier;
  share: number;
  usage: number;
}

export interface MoraleConfig {
  base: number;
  max: number;
  min: number;
  safeDistance: number;
  lossPerExcessHex: number;
  lossPerWin: number;
  formulaMode: "gdd" | "linear";
  coefficientIntercept: number;
  coefficientSlope: number;
}

export interface CombatConfig {
  troopSize: number; battleIntervalSeconds: number; powerExponent: number; winProbabilitySlope: number;
  survivorMinRatio: number; survivorMaxRatio: number;
}

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
  population: { powerShares: Record<PowerTier, number>; basePower: Record<PowerTier, number>; powerSigma: Record<PowerTier, number>; mainFormationCounts: Record<PowerTier, number>; weakFormationScale: Record<PowerTier, number> };
  ap: { initial: number; cap: number; recoveryAmount: number; recoveryEveryHours: number; attackCost: number; garrisonCost: number };
  occupation: { baseSeconds: { normal: number; resource: number; core: number }; safeDistance: number; secondsPerExcessHex: number; paceMultiplier: number };
  matching: { maxStrongestToWeakestRatio: number };
  activity: { allianceMultipliers: [number, number, number]; bands: ActivityBandConfig[] };
  strategy: {
    shares: Record<BehaviorStrategy, number>;
    activityWeight: number;
    powerWeight: number;
    randomWeight: number;
    centerWeight: number;
    resourceWeight: number;
    normalWeight: number;
    congestionAvoidance: number;
  };
  morale: MoraleConfig;
  combat: CombatConfig;
  fronts: { countPerAlliance: number; allianceObjectiveWeight: number; personalStrategyWeight: number; supportQueueGap: number };
  scoring: { occupation: { normal: number; resource: number; core: number }; killsPerPoint: number };
  tasks: { thresholds: number[]; targetCoverage: number[] };
  rewards: { tierShares: [number, number, number, number]; multiplier: number; taskValues: number[] };
  targets: { firstPvpHours: [number, number] };
  batchRuns: 10 | 50 | 100;
}