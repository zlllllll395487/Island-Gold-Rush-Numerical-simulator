import type { ActiveAllianceId, AllianceId, NormalizedMap, SimulationConfig, TileId } from "../domain/types";
import { cubeDistance } from "../map/hex";
import { initialOwners, legalTargets } from "../map/connectivity";
import type { MatchedPopulation } from "../population/match-alliances";
import type { Player } from "../population/generate-players";
import { createRng } from "../population/rng";
import { occupationSeconds } from "./occupation";

export interface ReplaySnapshot {
  hour: number;
  owners: Record<number, AllianceId>;
  scores: [number, number, number];
  territory: [number, number, number];
  pvpEvents: number;
}

export interface SimulationEvent {
  hour: number;
  type: "capture" | "pvp";
  allianceId: ActiveAllianceId;
  tileId: TileId;
  previousOwner: AllianceId;
  playerId: string;
}

export interface AllianceResult {
  id: ActiveAllianceId;
  name: string;
  effectivePower: number;
  contributionScore: number;
  snapshotScore: number;
  tileCount: number;
  rank: number;
}

export interface SimulationResult {
  seed: number;
  snapshots: ReplaySnapshot[];
  events: SimulationEvent[];
  players: Player[];
  alliances: AllianceResult[];
  finalOwners: Record<number, AllianceId>;
  firstPvpHour: number | null;
}

export interface SimulationInput {
  map: NormalizedMap;
  config: SimulationConfig;
  population: MatchedPopulation;
  seed: number;
}

function tileValue(configId: number, config: SimulationConfig): number {
  if (configId === 30003) return config.scoring.occupation.core;
  if (configId === 30002) return config.scoring.occupation.resource;
  if (configId === 30001) return config.scoring.occupation.normal;
  return 0;
}

function snapshot(map: NormalizedMap, owners: Map<TileId, AllianceId>, hour: number, pvpEvents: number, config: SimulationConfig): ReplaySnapshot {
  const scores: [number, number, number] = [0, 0, 0];
  const territory: [number, number, number] = [0, 0, 0];
  for (const tile of map.tiles) {
    const owner = owners.get(tile.tileId) ?? 0;
    if (owner > 0) {
      scores[owner - 1] += tileValue(tile.configId, config);
      if (tileValue(tile.configId, config) > 0) territory[owner - 1] += 1;
    }
  }
  return { hour, owners: Object.fromEntries(owners), scores, territory, pvpEvents };
}

function choosePlayer(players: Player[], rng: ReturnType<typeof createRng>): Player {
  const total = players.reduce((sum, player) => sum + player.apUsagePropensity * Math.sqrt(player.power), 0);
  let roll = rng.next() * total;
  for (const player of players) {
    roll -= player.apUsagePropensity * Math.sqrt(player.power);
    if (roll <= 0) return player;
  }
  return players.at(-1)!;
}

export function runSimulation({ map, config, population, seed }: SimulationInput): SimulationResult {
  const rng = createRng(seed);
  const owners = initialOwners(map);
  const players = structuredClone(population.players) as Player[];
  const byAlliance = new Map<ActiveAllianceId, Player[]>([1, 2, 3].map((id) => [id as ActiveAllianceId, players.filter((player) => player.allianceId === id)]));
  const bases = new Map<ActiveAllianceId, ReturnType<NormalizedMap["byId"]["get"]>>();
  for (const allianceId of [1, 2, 3] as const) bases.set(allianceId, map.byConfigId.get(10001)!.find((tile) => tile.camp === allianceId));
  const events: SimulationEvent[] = [];
  const snapshots: ReplaySnapshot[] = [snapshot(map, owners, 0, 0, config)];
  let firstPvpHour: number | null = null;
  let pvpCount = 0;
  const stepsPerHour = 2;
  const totalSteps = config.battleHours * stepsPerHour;

  for (let step = 1; step <= totalSteps; step++) {
    const hour = step / stepsPerHour;
    const order = ([1, 2, 3] as ActiveAllianceId[]).slice(step % 3).concat(([1, 2, 3] as ActiveAllianceId[]).slice(0, step % 3));
    for (const allianceId of order) {
      const roster = byAlliance.get(allianceId)!;
      const averageUse = roster.reduce((sum, player) => sum + player.apUsagePropensity, 0) / roster.length;
      const activity = config.activity.allianceMultipliers[allianceId - 1];
      const apFactor = 10 / config.ap.attackCost;
      const attempts = Math.max(1, Math.round((1.5 + averageUse * 3.2) * activity * apFactor));
      for (let attempt = 0; attempt < attempts; attempt++) {
        const targets = legalTargets(map, owners, allianceId);
        if (!targets.length) break;
        const base = bases.get(allianceId)!;
        const ranked = targets.map((tileId) => {
          const tile = map.byId.get(tileId)!;
          const distance = cubeDistance(base!, tile);
          const value = tileValue(tile.configId, config);
          const enemyBonus = (owners.get(tileId) ?? 0) > 0 ? 70 : 0;
          const centerPull = 30 - cubeDistance({ x: 0, y: 0, z: 0 }, tile) * 2;
          return { tileId, score: value + enemyBonus + centerPull - occupationSeconds(tile, distance, config) * 0.12 + rng.next() * 35 };
        }).sort((a, b) => b.score - a.score || a.tileId - b.tileId);
        const targetId = ranked[0].tileId;
        const tile = map.byId.get(targetId)!;
        const previousOwner = owners.get(targetId) ?? 0;
        const player = choosePlayer(roster, rng);
        const distance = cubeDistance(base!, tile);
        const occupy = occupationSeconds(tile, distance, config);
        const pvp = previousOwner > 0 && previousOwner !== allianceId;
        player.actions += 1;
        if (pvp) {
          pvpCount += 1;
          if (firstPvpHour === null) firstPvpHour = hour;
          const battlePoints = Math.max(1, Math.round((player.power / 100_000) * (0.6 + rng.next() * 0.8)));
          player.battleScore += battlePoints;
          player.personalScore += battlePoints;
        }
        const successChance = pvp ? Math.max(0.22, 0.72 - occupy / 1800) : Math.max(0.55, 0.96 - occupy / 2400);
        if (rng.next() > successChance) continue;
        owners.set(targetId, allianceId);
        const points = tileValue(tile.configId, config);
        player.occupationScore += points;
        player.personalScore += points;
        player.occupations += 1;
        events.push({ hour, type: pvp ? "pvp" : "capture", allianceId, tileId: targetId, previousOwner, playerId: player.id });
      }
    }
    if (step % stepsPerHour === 0) snapshots.push(snapshot(map, owners, hour, pvpCount, config));
  }

  const final = snapshots.at(-1)!;
  const allianceResults = population.alliances.map((alliance) => {
    const members = players.filter((player) => player.allianceId === alliance.id);
    return {
      id: alliance.id,
      name: alliance.name,
      effectivePower: alliance.members.reduce((sum, player) => sum + player.power, 0),
      contributionScore: members.reduce((sum, player) => sum + player.personalScore, 0),
      snapshotScore: final.scores[alliance.id - 1],
      tileCount: final.territory[alliance.id - 1],
      rank: 0,
    };
  });
  [...allianceResults].sort((a, b) => b.snapshotScore - a.snapshotScore || b.tileCount - a.tileCount).forEach((alliance, index) => { alliance.rank = index + 1; });
  players.sort((a, b) => b.personalScore - a.personalScore || a.id.localeCompare(b.id));
  return { seed, snapshots, events, players, alliances: allianceResults, finalOwners: final.owners, firstPvpHour };
}
