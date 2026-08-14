import type { ActiveAllianceId, SimulationConfig } from "../domain/types";
import { assignBehaviorStrategies } from "./assign-strategies";
import { generatePopulation, type Player } from "./generate-players";
import { createRng } from "./rng";

export interface AllianceRoster {
  id: ActiveAllianceId;
  name: string;
  members: Player[];
}

export interface MatchedPopulation {
  players: Player[];
  alliances: AllianceRoster[];
}

const ALLIANCE_NAMES = ["赤潮联邦", "蓝湾议会", "金帆同盟"] as const;

export function effectiveAlliancePower(alliance: AllianceRoster): number {
  return alliance.members.reduce((sum, player) => sum + player.power * (0.82 + player.heroCount * 0.03), 0);
}

export function buildMatchedPopulation(config: SimulationConfig, seed: number): MatchedPopulation {
  const players = generatePopulation(config, createRng(seed)).sort((a, b) => b.power - a.power || a.id.localeCompare(b.id));
  const alliances: AllianceRoster[] = ([1, 2, 3] as const).map((id, index) => ({ id, name: ALLIANCE_NAMES[index], members: [] }));
  const snake = [0, 1, 2, 2, 1, 0];
  players.forEach((player, index) => {
    const allianceIndex = snake[index % snake.length];
    player.allianceId = (allianceIndex + 1) as ActiveAllianceId;
    alliances[allianceIndex].members.push(player);
  });
  const powers = alliances.map(effectiveAlliancePower);
  if (Math.max(...powers) / Math.min(...powers) > config.matching.maxStrongestToWeakestRatio) {
    throw new Error("Unable to create alliances inside the configured matching boundary");
  }
  assignBehaviorStrategies(players, config, createRng(seed));
  return { players: players.slice().sort((a, b) => a.id.localeCompare(b.id)), alliances };
}
