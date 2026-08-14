import type { ActiveAllianceId, ActivityTier, PowerTier, SimulationConfig } from "../domain/types";
import type { SeededRng } from "./rng";

export type PlayerStrategy = "frontier" | "value" | "aggressive" | "defensive";
export type { ActivityTier, PowerTier } from "../domain/types";
export interface FormationProfile { slot: number; powerMultiplier: number }

export interface Player {
  id: string;
  name: string;
  allianceId: ActiveAllianceId;
  powerTier: PowerTier;
  power: number;
  activityTier: ActivityTier;
  apUsagePropensity: number;
  heroCount: number;
  formationProfiles: FormationProfile[];
  strategy: PlayerStrategy;
  personalScore: number;
  battleScore: number;
  occupationScore: number;
  actions: number;
  occupations: number;
  kills: number;
  apSpent: number;
  apOverflow: number;
  apSupply: number;
  maxActiveFormations: number;
  maxWinStreak: number;
}

const STRATEGIES: readonly PlayerStrategy[] = ["frontier", "value", "aggressive", "defensive"];

function formationProfiles(tier: PowerTier, config: SimulationConfig): FormationProfile[] {
  const mainCount = tier === "high" ? 3 : tier === "mid" ? 2 : 1;
  const weakScale = config.population.weakFormationScale[tier];
  return Array.from({ length: 6 }, (_, slot) => ({
    slot,
    powerMultiplier: slot < mainCount ? 1 - slot * 0.04 : weakScale * Math.max(0.72, 1 - (slot - mainCount) * 0.08),
  }));
}

export function generatePopulation(config: SimulationConfig, rng: SeededRng): Player[] {
  const count = config.playersPerAlliance * 3;
  const powerSlots = (["low", "mid", "high"] as const).flatMap((tier) =>
    Array.from({ length: Math.round(count * config.population.powerShares[tier]) }, () => tier),
  );
  while (powerSlots.length < count) powerSlots.push("low");
  powerSlots.length = count;
  for (let index = powerSlots.length - 1; index > 0; index--) {
    const swap = Math.floor(rng.next() * (index + 1));
    [powerSlots[index], powerSlots[swap]] = [powerSlots[swap], powerSlots[index]];
  }
  const activitySlots = config.activity.bands.flatMap((band) =>
    Array.from({ length: Math.round(count * band.share) }, () => band),
  );
  while (activitySlots.length < count) activitySlots.push(config.activity.bands.at(-1)!);
  activitySlots.length = count;
  for (let index = activitySlots.length - 1; index > 0; index--) {
    const swap = Math.floor(rng.next() * (index + 1));
    [activitySlots[index], activitySlots[swap]] = [activitySlots[swap], activitySlots[index]];
  }
  return Array.from({ length: count }, (_, index) => {
    const powerTier = powerSlots[index];
    const base = config.population.basePower[powerTier];
    const sigma = config.population.powerSigma[powerTier];
    const activity = activitySlots[index];
    return {
      id: `P${String(index + 1).padStart(3, "0")}`,
      name: `远征者${String(index + 1).padStart(3, "0")}`,
      allianceId: 1,
      powerTier,
      power: Math.round(base * Math.exp(rng.normal(0, sigma))),
      activityTier: activity.id,
      apUsagePropensity: Math.min(0.98, Math.max(0.03, activity.usage + rng.normal(0, 0.04))),
      heroCount: 22,
      formationProfiles: formationProfiles(powerTier, config),
      strategy: rng.pick(STRATEGIES),
      personalScore: 0,
      battleScore: 0,
      occupationScore: 0,
      actions: 0,
      occupations: 0,
      kills: 0,
      apSpent: 0,
      apOverflow: 0,
      apSupply: 0,
      maxActiveFormations: 0,
      maxWinStreak: 0,
    };
  });
}
