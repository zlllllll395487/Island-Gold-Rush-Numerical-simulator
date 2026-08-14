import type { ActiveAllianceId, SimulationConfig } from "../domain/types";
import type { SeededRng } from "./rng";

export type PowerTier = "low" | "mid" | "high";
export type ActivityTier = "minimal" | "casual" | "normal" | "active" | "core";
export type PlayerStrategy = "frontier" | "value" | "aggressive" | "defensive";

export interface Player {
  id: string;
  name: string;
  allianceId: ActiveAllianceId;
  powerTier: PowerTier;
  power: number;
  activityTier: ActivityTier;
  apUsagePropensity: number;
  heroCount: number;
  strategy: PlayerStrategy;
  personalScore: number;
  battleScore: number;
  occupationScore: number;
  actions: number;
  occupations: number;
}

const ACTIVITIES: readonly ActivityTier[] = ["minimal", "casual", "normal", "active", "core"];
const USAGE: Record<ActivityTier, number> = { minimal: 0.1, casual: 0.3, normal: 0.5, active: 0.7, core: 0.9 };
const STRATEGIES: readonly PlayerStrategy[] = ["frontier", "value", "aggressive", "defensive"];

export function generatePopulation(config: SimulationConfig, rng: SeededRng): Player[] {
  const count = config.playersPerAlliance * 3;
  return Array.from({ length: count }, (_, index) => {
    const tierSlot = index % 20;
    const powerTier: PowerTier = tierSlot === 0 ? "high" : tierSlot < 5 ? "mid" : "low";
    const base = powerTier === "high" ? 1_600_000 : powerTier === "mid" ? 900_000 : 460_000;
    const sigma = powerTier === "high" ? 0.22 : 0.18;
    const activityTier = ACTIVITIES[index % ACTIVITIES.length];
    return {
      id: `P${String(index + 1).padStart(3, "0")}`,
      name: `远征者${String(index + 1).padStart(3, "0")}`,
      allianceId: 1,
      powerTier,
      power: Math.round(base * Math.exp(rng.normal(0, sigma))),
      activityTier,
      apUsagePropensity: Math.min(0.98, Math.max(0.03, USAGE[activityTier] + rng.normal(0, 0.05))),
      heroCount: powerTier === "high" ? 6 : powerTier === "mid" ? 5 : 4 + (rng.next() > 0.72 ? 1 : 0),
      strategy: rng.pick(STRATEGIES),
      personalScore: 0,
      battleScore: 0,
      occupationScore: 0,
      actions: 0,
      occupations: 0,
    };
  });
}
