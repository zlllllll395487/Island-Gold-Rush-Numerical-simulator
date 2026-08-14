import type { SimulationConfig } from "./types";

export const DEFAULT_CONFIG: SimulationConfig = {
  seed: 20260813,
  battleHours: 48,
  playersPerAlliance: 100,
  population: {
    powerShares: { low: 0.75, mid: 0.2, high: 0.04, super: 0.01 },
    basePower: { low: 460_000, mid: 1_000_000, high: 2_800_000, super: 6_900_000 },
    powerSigma: { low: 0.18, mid: 0.18, high: 0.22, super: 0.2 },
    mainFormationCounts: { low: 1, mid: 2, high: 3, super: 3 },
    weakFormationScale: { low: 0.45, mid: 0.52, high: 0.58, super: 0.6 },
  },
  ap: { initial: 50, cap: 100, recoveryAmount: 50, recoveryEveryHours: 8, attackCost: 10, garrisonCost: 10 },
  occupation: { baseSeconds: { normal: 60, resource: 90, core: 120 }, safeDistance: 5, secondsPerExcessHex: 30, paceMultiplier: 30 },
  matching: { maxStrongestToWeakestRatio: 1.25 },
  activity: {
    allianceMultipliers: [1, 0.96, 1.04],
    bands: [
      { id: "minimal", share: 0.1, usage: 0.1 },
      { id: "casual", share: 0.2, usage: 0.3 },
      { id: "normal", share: 0.4, usage: 0.5 },
      { id: "active", share: 0.2, usage: 0.7 },
      { id: "core", share: 0.1, usage: 0.9 },
    ],
  },
  strategy: {
    shares: { centerRush: 0.45, supportExpand: 0.25, multiFront: 0.3 },
    activityWeight: 0.55,
    powerWeight: 0.35,
    randomWeight: 0.1,
    centerWeight: 4,
    resourceWeight: 2,
    normalWeight: 1,
    congestionAvoidance: 0.65,
  },
  morale: {
    base: 150, max: 150, min: 20, safeDistance: 5,
    lossPerExcessHex: 2, lossPerWin: 2, formulaMode: "gdd",
    coefficientIntercept: 7 / 13, coefficientSlope: 4 / 13,
  },
  combat: {
    troopSize: 100_000, battleIntervalSeconds: 10, powerExponent: 1,
    winProbabilitySlope: 1.35, survivorMinRatio: 0.08, survivorMaxRatio: 0.72,
  },
  fronts: { countPerAlliance: 4, allianceObjectiveWeight: 0.6, personalStrategyWeight: 0.4, supportQueueGap: 3 },
  scoring: { occupation: { normal: 50, resource: 100, core: 200 }, killsPerPoint: 10_000 },
  tasks: {
    thresholds: [200, 290, 400, 520, 650, 780, 940, 1140, 1390, 1750],
    targetCoverage: [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.12, 0.06, 0.02],
  },
  rewards: { tierShares: [40, 35, 20, 5], multiplier: 1, taskValues: [20, 25, 30, 40, 50, 65, 85, 110, 145, 200] },
  targets: { firstPvpHours: [3, 6] },
  batchRuns: 50,
};
