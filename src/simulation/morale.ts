import type { MoraleConfig } from "../domain/types";

export function calculateMorale(distance: number, consecutiveWins: number, config: MoraleConfig): number {
  const distanceLoss = Math.max(0, distance - config.safeDistance) * config.lossPerExcessHex;
  const winLoss = Math.max(0, consecutiveWins) * config.lossPerWin;
  return Math.max(config.min, Math.min(config.max, config.base - distanceLoss - winLoss));
}

export function moraleMultiplier(morale: number, config: MoraleConfig): number {
  const bounded = Math.max(config.min, Math.min(config.max, morale));
  return config.coefficientIntercept + config.coefficientSlope * (bounded / 100);
}
