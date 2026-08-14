import type { SimulationConfig } from "./types";

export const DEFAULT_CONFIG: SimulationConfig = {
  seed: 20260813,
  battleHours: 48,
  playersPerAlliance: 100,
  ap: { initial: 50, cap: 100, recoveryAmount: 50, recoveryEveryHours: 8, attackCost: 10, garrisonCost: 10 },
  occupation: { baseSeconds: { normal: 60, resource: 90, core: 120 }, safeDistance: 5, secondsPerExcessHex: 30 },
  matching: { maxStrongestToWeakestRatio: 1.25 },
  activity: { allianceMultipliers: [1, 0.96, 1.04] },
  scoring: { occupation: { normal: 50, resource: 100, core: 200 }, killsPerPoint: 10_000 },
  tasks: {
    thresholds: [200, 290, 400, 520, 650, 780, 940, 1140, 1390, 1750],
    targetCoverage: [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.12, 0.06, 0.02],
  },
  rewards: { tierShares: [40, 35, 20, 5], multiplier: 1 },
  targets: { firstPvpHours: [3, 6] },
  batchRuns: 50,
};
