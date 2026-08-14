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
  const assignPlayer = (player: Player, alliance: AllianceRoster) => {
    player.allianceId = alliance.id;
    alliance.members.push(player);
  };
  const eligibleAlliances = () => alliances.filter((alliance) => alliance.members.length < config.playersPerAlliance);
  const superPlayers = players.filter((player) => player.powerTier === "super");
  const remainingPlayers = players.filter((player) => player.powerTier !== "super");

  for (const player of superPlayers) {
    const alliance = eligibleAlliances().sort((left, right) => {
      const leftSuperCount = left.members.filter((member) => member.powerTier === "super").length;
      const rightSuperCount = right.members.filter((member) => member.powerTier === "super").length;
      return leftSuperCount - rightSuperCount
        || effectiveAlliancePower(left) - effectiveAlliancePower(right)
        || left.id - right.id;
    })[0];
    assignPlayer(player, alliance);
  }

  for (const player of remainingPlayers) {
    const alliance = eligibleAlliances().sort((left, right) =>
      effectiveAlliancePower(left) - effectiveAlliancePower(right) || left.id - right.id,
    )[0];
    assignPlayer(player, alliance);
  }
  const powers = alliances.map(effectiveAlliancePower);
  if (Math.max(...powers) / Math.min(...powers) > config.matching.maxStrongestToWeakestRatio) {
    throw new Error("Unable to create alliances inside the configured matching boundary");
  }
  assignBehaviorStrategies(players, config, createRng(seed));
  return { players: players.slice().sort((a, b) => a.id.localeCompare(b.id)), alliances };
}
