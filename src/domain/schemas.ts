import { z } from "zod";
import type { SimulationConfig } from "./types";

const positive = z.number().finite().positive();
const nonNegative = z.number().finite().nonnegative();

const schema = z.object({
  seed: z.number().int(), battleHours: positive.max(168), playersPerAlliance: z.number().int().min(20).max(300),
  population: z.object({ powerShares: z.object({ low: z.number().min(0).max(1), mid: z.number().min(0).max(1), high: z.number().min(0).max(1), super: z.number().min(0).max(1) }), basePower: z.object({ low: positive, mid: positive, high: positive, super: positive }), powerSigma: z.object({ low: nonNegative, mid: nonNegative, high: nonNegative, super: nonNegative }), mainFormationCounts: z.object({ low: z.number().int().min(0).max(6), mid: z.number().int().min(0).max(6), high: z.number().int().min(0).max(6), super: z.number().int().min(0).max(6) }), weakFormationScale: z.object({ low: positive.max(1), mid: positive.max(1), high: positive.max(1), super: positive.max(1) }) }).refine(({ powerShares }) => Math.abs(powerShares.low + powerShares.mid + powerShares.high + powerShares.super - 1) < 1e-6, "power shares must total 1"),
  ap: z.object({ initial: nonNegative, cap: positive, recoveryAmount: nonNegative, recoveryEveryHours: positive.max(48), attackCost: positive, garrisonCost: positive }).refine((ap) => ap.initial <= ap.cap, "initial AP cannot exceed cap"),
  occupation: z.object({ baseSeconds: z.object({ normal: positive, resource: positive, core: positive }), safeDistance: z.number().int().nonnegative().max(30), secondsPerExcessHex: nonNegative.max(3600), paceMultiplier: positive.max(100) }),
  matching: z.object({ maxStrongestToWeakestRatio: z.number().min(1).max(2) }),
  activity: z.object({ allianceMultipliers: z.tuple([positive, positive, positive]), bands: z.array(z.object({ id: z.enum(["minimal", "casual", "normal", "active", "core"]), share: z.number().min(0).max(1), usage: z.number().min(0).max(1) })).length(5) }).refine(({ bands }) => Math.abs(bands.reduce((sum, band) => sum + band.share, 0) - 1) < 1e-6, "activity shares must total 1"),
  strategy: z.object({ shares: z.object({ centerRush: z.number().min(0).max(1), supportExpand: z.number().min(0).max(1), multiFront: z.number().min(0).max(1) }).refine(({ centerRush, supportExpand, multiFront }) => Math.abs(centerRush + supportExpand + multiFront - 1) < 0.0001, "strategy shares must total 1"), activityWeight: nonNegative, powerWeight: nonNegative, randomWeight: nonNegative, centerWeight: nonNegative, resourceWeight: nonNegative, normalWeight: nonNegative, congestionAvoidance: z.number().min(0).max(2) }).refine((strategy) => Math.abs(strategy.activityWeight + strategy.powerWeight + strategy.randomWeight - 1) < 1e-6, "strategy assignment weights must total 1"),
  morale: z.object({ base: positive, max: positive, min: nonNegative, safeDistance: nonNegative, lossPerExcessHex: nonNegative, lossPerWin: nonNegative, formulaMode: z.enum(["gdd", "linear"]), coefficientIntercept: nonNegative, coefficientSlope: nonNegative }).refine((morale) => morale.min <= morale.base && morale.base <= morale.max, "morale must satisfy min <= base <= max"),
  combat: z.object({ troopSize: positive, battleIntervalSeconds: positive, powerExponent: positive, winProbabilitySlope: positive, survivorMinRatio: z.number().min(0).max(1), survivorMaxRatio: z.number().min(0).max(1) }).refine((combat) => combat.survivorMinRatio <= combat.survivorMaxRatio, "survivor ratio range must increase"),
  fronts: z.object({ countPerAlliance: z.number().int().min(3).max(6), allianceObjectiveWeight: z.number().min(0).max(1), personalStrategyWeight: z.number().min(0).max(1), supportQueueGap: z.number().int().min(0).max(20) }).refine((fronts) => Math.abs(fronts.allianceObjectiveWeight + fronts.personalStrategyWeight - 1) < 1e-6, "front weights must total 1"),
  scoring: z.object({ occupation: z.object({ normal: nonNegative, resource: nonNegative, core: nonNegative }), killsPerPoint: positive }),
  tasks: z.object({ thresholds: z.array(positive).length(10), targetCoverage: z.array(z.number().min(0).max(1)).length(10) }).refine(({ thresholds }) => thresholds.every((v, i) => i === 0 || v > thresholds[i - 1]), "task thresholds must be strictly increasing"),
  rewards: z.object({ tierShares: z.tuple([nonNegative, nonNegative, nonNegative, nonNegative]), multiplier: nonNegative.max(100), taskValues: z.array(nonNegative).length(10) }).refine(({ tierShares }) => Math.abs(tierShares.reduce((sum, v) => sum + v, 0) - 100) < 1e-6, "reward shares must total 100"),
  targets: z.object({ firstPvpHours: z.tuple([nonNegative, positive]) }).refine(({ firstPvpHours }) => firstPvpHours[0] < firstPvpHours[1], "first PvP range must increase"),
  batchRuns: z.union([z.literal(10), z.literal(50), z.literal(100)]),
});

export function parseSimulationConfig(input: unknown): SimulationConfig {
  return schema.parse(input) as SimulationConfig;
}
