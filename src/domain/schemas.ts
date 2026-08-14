import { z } from "zod";
import type { SimulationConfig } from "./types";

const positive = z.number().finite().positive();
const nonNegative = z.number().finite().nonnegative();

const schema = z.object({
  seed: z.number().int(), battleHours: positive.max(168), playersPerAlliance: z.number().int().min(20).max(300),
  ap: z.object({ initial: nonNegative, cap: positive, recoveryAmount: nonNegative, recoveryEveryHours: positive.max(48), attackCost: positive, garrisonCost: positive }).refine((ap) => ap.initial <= ap.cap, "initial AP cannot exceed cap"),
  occupation: z.object({ baseSeconds: z.object({ normal: positive, resource: positive, core: positive }), safeDistance: z.number().int().nonnegative().max(30), secondsPerExcessHex: nonNegative.max(3600) }),
  matching: z.object({ maxStrongestToWeakestRatio: z.number().min(1).max(2) }),
  activity: z.object({ allianceMultipliers: z.tuple([positive, positive, positive]) }),
  scoring: z.object({ occupation: z.object({ normal: nonNegative, resource: nonNegative, core: nonNegative }), killsPerPoint: positive }),
  tasks: z.object({ thresholds: z.array(positive).length(10), targetCoverage: z.array(z.number().min(0).max(1)).length(10) }).refine(({ thresholds }) => thresholds.every((v, i) => i === 0 || v > thresholds[i - 1]), "task thresholds must be strictly increasing"),
  rewards: z.object({ tierShares: z.tuple([nonNegative, nonNegative, nonNegative, nonNegative]), multiplier: nonNegative.max(100) }).refine(({ tierShares }) => Math.abs(tierShares.reduce((sum, v) => sum + v, 0) - 100) < 1e-6, "reward shares must total 100"),
  targets: z.object({ firstPvpHours: z.tuple([nonNegative, positive]) }).refine(({ firstPvpHours }) => firstPvpHours[0] < firstPvpHours[1], "first PvP range must increase"),
  batchRuns: z.union([z.literal(10), z.literal(50), z.literal(100)]),
});

export function parseSimulationConfig(input: unknown): SimulationConfig {
  return schema.parse(input) as SimulationConfig;
}
