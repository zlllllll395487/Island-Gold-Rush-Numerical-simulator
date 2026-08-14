import type { ActiveAllianceId, AllianceId, MapTile, NormalizedMap, SimulationConfig, TileId } from "../domain/types";
import { cubeDistance } from "../map/hex";
import { connectedTerritory, initialOwners, legalTargets } from "../map/connectivity";
import type { MatchedPopulation } from "../population/match-alliances";
import type { Player } from "../population/generate-players";
import { createRng } from "../population/rng";
import { recoverAp, spendSquadAp } from "./ap";
import { enqueueTroop, resolveTileBattleTick } from "./battle-queue";
import { assignPlayerFronts, buildAllianceFronts, frontForTile } from "./fronts";
import { calculateMorale } from "./morale";
import { occupationSeconds, syncOccupation } from "./occupation";
import type { TileRuntimeState, TroopState } from "./state";
import {
  chooseCenterRushTarget,
  chooseMultiFrontTarget,
  chooseSupportExpandTarget,
  type StrategyTargetingConfig,
  type TargetCandidate,
} from "./targeting";

const ALLIANCE_IDS: readonly ActiveAllianceId[] = [1, 2, 3];

export interface ReplayTileStatus {
  defenseCamp: AllianceId;
  defenderCount: number;
  attackerCount: number;
  occupationProgress: number;
  frontMorale: number | null;
}

export interface ReplaySnapshot {
  second: number;
  hour: number;
  owners: Record<number, AllianceId>;
  scores: [number, number, number];
  territory: [number, number, number];
  pvpEvents: number;
  activeBattles: number;
  activeFronts: number;
  contestedTiles: number;
  tileStatus: Record<number, ReplayTileStatus>;
}

export interface SimulationEvent {
  hour: number;
  type: "capture" | "pvp";
  allianceId: ActiveAllianceId;
  tileId: TileId;
  previousOwner: AllianceId;
  playerId: string;
}

export interface TimelineEvent {
  second: number;
  type: "dispatch" | "battle" | "capture" | "recovery";
  tileId?: TileId;
  allianceId?: ActiveAllianceId;
  opponentAllianceId?: ActiveAllianceId;
  playerId?: string;
  troopsKilled?: number;
  winnerTroops?: number;
  defensiveSupport?: boolean;
  garrison?: boolean;
  apCost?: number;
  attackerPlayerId?: string;
  defenderPlayerId?: string;
  retainedCenterGarrison?: boolean;
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
  timeline: TimelineEvent[];
  players: Player[];
  alliances: AllianceResult[];
  finalOwners: Record<number, AllianceId>;
  firstPvpHour: number | null;
  contestedTileCounts: Record<number, number>;
  centerTileIds: TileId[];
  activeFrontIds: string[];
}

export interface SimulationInput {
  map: NormalizedMap;
  config: SimulationConfig;
  population: MatchedPopulation;
  seed: number;
}

interface RuntimePlayer {
  player: Player;
  heroAp: number[];
  activeSlots: Map<number, { troopId: string; tileId: TileId }>;
  primaryFrontId: string;
}

function tileValue(configId: number, config: SimulationConfig): number {
  if (configId === 30003) return config.scoring.occupation.core;
  if (configId === 30002) return config.scoring.occupation.resource;
  if (configId === 30001) return config.scoring.occupation.normal;
  return 0;
}

function tileType(tile: MapTile): "normal" | "resource" | "core" {
  if (tile.configId === 30003) return "core";
  if (tile.configId === 30002) return "resource";
  return "normal";
}

function createSnapshot(
  map: NormalizedMap,
  owners: Map<TileId, AllianceId>,
  states: Map<TileId, TileRuntimeState>,
  second: number,
  pvpEvents: number,
  activeFrontIds: Set<string>,
  contestedTileCounts: Map<TileId, number>,
  config: SimulationConfig,
): ReplaySnapshot {
  const scores: [number, number, number] = [0, 0, 0];
  const territory: [number, number, number] = [0, 0, 0];
  for (const tile of map.tiles) {
    const owner = owners.get(tile.tileId) ?? 0;
    if (owner > 0) {
      scores[owner - 1] += tileValue(tile.configId, config);
      if (tileValue(tile.configId, config) > 0) territory[owner - 1] += 1;
    }
  }
  const activeBattles = [...states.values()].filter((state) => state.defenseQueue.length > 0 && state.attackQueue.length > 0).length;
  const tileStatus: Record<number, ReplayTileStatus> = {};
  for (const state of states.values()) {
    if (state.defenseQueue.length === 0 && state.attackQueue.length === 0 && state.occupation === null) continue;
    const duration = state.occupation ? Math.max(1, state.occupation.endsAt - state.occupation.startedAt) : 1;
    tileStatus[state.tileId] = {
      defenseCamp: state.defenseCamp,
      defenderCount: state.defenseQueue.length,
      attackerCount: state.attackQueue.length,
      occupationProgress: state.occupation ? Math.max(0, Math.min(1, (second - state.occupation.startedAt) / duration)) : 0,
      frontMorale: state.defenseQueue[0]?.morale ?? state.attackQueue[0]?.morale ?? null,
    };
  }
  return {
    second,
    hour: second / 3600,
    owners: Object.fromEntries(owners),
    scores,
    territory,
    pvpEvents,
    activeBattles,
    activeFronts: activeFrontIds.size,
    contestedTiles: contestedTileCounts.size,
    tileStatus,
  };
}

function scheduleOpportunities(players: RuntimePlayer[], totalSeconds: number, config: SimulationConfig, rng: ReturnType<typeof createRng>): Map<number, RuntimePlayer[]> {
  const schedule = new Map<number, RuntimePlayer[]>();
  const recoveryCount = Math.max(0, Math.ceil(config.battleHours / config.ap.recoveryEveryHours) - 1);
  const apPerHero = config.ap.initial + recoveryCount * config.ap.recoveryAmount;
  const potentialCommands = Math.floor((6 * apPerHero) / Math.min(config.ap.attackCost, config.ap.garrisonCost));
  for (const runtime of players) {
    runtime.player.apSupply = 18 * apPerHero;
    const count = Math.max(1, Math.round(potentialCommands * runtime.player.apUsagePropensity));
    const interval = totalSeconds / count;
    for (let index = 0; index < count; index++) {
      const jitter = (rng.next() - 0.5) * Math.min(interval * 0.45, 600);
      const second = Math.max(10, Math.min(totalSeconds - 10, Math.round(((index + 0.5) * interval + jitter) / 10) * 10));
      const list = schedule.get(second) ?? [];
      list.push(runtime);
      schedule.set(second, list);
    }
  }
  return schedule;
}

export function runSimulation({ map, config, population, seed }: SimulationInput): SimulationResult {
  const rng = createRng(seed);
  const owners = initialOwners(map);
  const players = structuredClone(population.players) as Player[];
  const states = new Map<TileId, TileRuntimeState>(map.tiles.map((tile) => [tile.tileId, {
    tileId: tile.tileId,
    ownerCamp: tile.camp,
    defenseCamp: tile.camp,
    defenseQueue: [],
    attackQueue: [],
    lastBattleAt: 0,
    occupation: null,
    ownerVersion: 0,
  }]));

  const activeTileIds = new Set<TileId>();
  const frontByAllianceTile = new Map<ActiveAllianceId, Map<TileId, string>>();
  const assignmentByPlayer = new Map<string, string>();
  for (const allianceId of ALLIANCE_IDS) {
    const fronts = buildAllianceFronts(map, allianceId, config.fronts.countPerAlliance);
    const roster = players.filter((player) => player.allianceId === allianceId);
    for (const [playerId, frontId] of assignPlayerFronts(roster, fronts)) assignmentByPlayer.set(playerId, frontId);
    frontByAllianceTile.set(allianceId, new Map(map.tiles.map((tile) => [tile.tileId, frontForTile(map, tile, fronts)])));
  }

  const runtimes = players.map((player): RuntimePlayer => ({
    player,
    heroAp: Array.from({ length: 18 }, () => config.ap.initial),
    activeSlots: new Map(),
    primaryFrontId: assignmentByPlayer.get(player.id)!,
  }));
  const runtimeByPlayer = new Map(runtimes.map((runtime) => [runtime.player.id, runtime]));
  const troopRegistry = new Map<string, { runtime: RuntimePlayer; slot: number }>();
  const totalSeconds = config.battleHours * 3600;
  const opportunities = scheduleOpportunities(runtimes, totalSeconds, config, rng);
  const bases = new Map<ActiveAllianceId, MapTile>(ALLIANCE_IDS.map((allianceId) => [
    allianceId,
    map.byConfigId.get(10001)!.find((tile) => tile.camp === allianceId)!,
  ]));
  const centerTiles = map.byConfigId.get(30003) ?? [];
  const targetingConfig: StrategyTargetingConfig = {
    centerWeight: config.strategy.centerWeight,
    resourceWeight: config.strategy.resourceWeight,
    normalWeight: config.strategy.normalWeight,
    congestionAvoidance: config.strategy.congestionAvoidance,
    supportQueueGap: config.fronts.supportQueueGap,
  };
  const legalCache = new Map<ActiveAllianceId, TileId[]>();
  const connectedCache = new Map<ActiveAllianceId, Set<TileId>>();
  const contestedTileCounts = new Map<TileId, number>();
  const activeFrontIds = new Set<string>();
  const events: SimulationEvent[] = [];
  const timeline: TimelineEvent[] = [];
  const snapshots: ReplaySnapshot[] = [createSnapshot(map, owners, states, 0, 0, activeFrontIds, contestedTileCounts, config)];
  let troopSequence = 0;
  let pvpCount = 0;
  let firstPvpHour: number | null = null;

  const releaseTroop = (troopId: string) => {
    const record = troopRegistry.get(troopId);
    if (!record) return;
    record.runtime.activeSlots.delete(record.slot);
    troopRegistry.delete(troopId);
  };

  const releaseNonCenterDefenders = (state: TileRuntimeState): TroopState[] => {
    const tile = map.byId.get(state.tileId)!;
    const retained = tileType(tile) === "core"
      ? state.defenseQueue.filter((unit) => runtimeByPlayer.get(unit.playerId)!.player.behaviorStrategy === "centerRush")
      : [];
    const retainedIds = new Set(retained.map((unit) => unit.id));
    for (const unit of state.defenseQueue) {
      if (!retainedIds.has(unit.id)) releaseTroop(unit.id);
    }
    state.defenseQueue = retained;
    return retained;
  };

  const legalFor = (allianceId: ActiveAllianceId) => {
    const cached = legalCache.get(allianceId);
    if (cached) return cached;
    const targets = legalTargets(map, owners, allianceId);
    legalCache.set(allianceId, targets);
    return targets;
  };

  const connectedFor = (allianceId: ActiveAllianceId) => {
    const cached = connectedCache.get(allianceId);
    if (cached) return cached;
    const connected = connectedTerritory(map, owners, allianceId);
    connectedCache.set(allianceId, connected);
    return connected;
  };

  const candidatesFor = (runtime: RuntimePlayer): TargetCandidate[] => {
    const allianceId = runtime.player.allianceId;
    const ids = new Set<TileId>(legalFor(allianceId));
    const connected = connectedFor(allianceId);
    for (const tileId of activeTileIds) {
      const state = states.get(tileId)!;
      const friendlyDefensiveFight = state.ownerCamp === allianceId
        && connected.has(tileId)
        && state.defenseQueue.length > 0
        && state.attackQueue.length > 0;
      if (friendlyDefensiveFight) ids.add(tileId);
    }
    if (runtime.player.behaviorStrategy === "centerRush") {
      for (const core of centerTiles) {
        const state = states.get(core.tileId)!;
        const quietFriendlyCore = state.ownerCamp === allianceId
          && state.defenseCamp === allianceId
          && connected.has(core.tileId)
          && state.attackQueue.length === 0
          && state.occupation === null;
        if (quietFriendlyCore) ids.add(core.tileId);
      }
    }
    return [...ids].map((tileId) => {
      const state = states.get(tileId)!;
      const tile = map.byId.get(tileId)!;
      const allUnits = state.defenseQueue.concat(state.attackQueue);
      const friendlyQueue = allUnits.filter((unit) => unit.allianceId === allianceId).length;
      const enemyQueue = allUnits.length - friendlyQueue;
      return {
        tileId,
        frontId: frontByAllianceTile.get(allianceId)!.get(tileId)!,
        ownerCamp: state.ownerCamp,
        tileType: tileType(tile),
        distance: cubeDistance(bases.get(allianceId)!, tile),
        centerDistance: centerTiles.length > 0
          ? Math.min(...centerTiles.map((centerTile) => cubeDistance(centerTile, tile)))
          : undefined,
        fighting: state.defenseQueue.length > 0 && state.attackQueue.length > 0,
        ownTroopPresent: [...runtime.activeSlots.values()].some((active) => active.tileId === tileId),
        friendlyQueue,
        enemyQueue,
        congestion: allUnits.length,
        recentContests: contestedTileCounts.get(tileId) ?? 0,
      };
    });
  };

  const dispatch = (runtime: RuntimePlayer, second: number) => {
    const player = runtime.player;
    const candidates = candidatesFor(runtime);
    const targetId = player.behaviorStrategy === "centerRush"
      ? chooseCenterRushTarget(candidates, targetingConfig, rng)
      : player.behaviorStrategy === "supportExpand"
        ? chooseSupportExpandTarget(candidates, targetingConfig, rng)
        : chooseMultiFrontTarget(candidates, runtime.primaryFrontId, targetingConfig, rng, player.strategy, config.fronts);
    if (targetId === null) return;

    const target = states.get(targetId)!;
    const tile = map.byId.get(targetId)!;
    const wasFighting = target.defenseQueue.length > 0 && target.attackQueue.length > 0;
    const defensiveSupport = wasFighting && target.ownerCamp === player.allianceId;
    const quietFriendlyCoreGarrison = player.behaviorStrategy === "centerRush"
      && tileType(tile) === "core"
      && target.ownerCamp === player.allianceId
      && target.defenseCamp === player.allianceId
      && target.attackQueue.length === 0
      && target.occupation === null;
    const garrison = defensiveSupport || quietFriendlyCoreGarrison;
    const apCost = garrison ? config.ap.garrisonCost : config.ap.attackCost;
    const profile = player.formationProfiles.find((formation) => {
      if (runtime.activeSlots.has(formation.slot)) return false;
      const heroAp = runtime.heroAp.slice(formation.slot * 3, formation.slot * 3 + 3);
      return heroAp.length === 3 && heroAp.every((ap) => ap >= apCost);
    });
    if (!profile) return;
    const spent = spendSquadAp(runtime.heroAp.slice(profile.slot * 3, profile.slot * 3 + 3), apCost);
    if (!spent.ok) return;
    spent.remaining.forEach((value, index) => { runtime.heroAp[profile.slot * 3 + index] = value; });

    const troop: TroopState = {
      id: player.id + "-" + profile.slot + "-" + (++troopSequence),
      playerId: player.id,
      allianceId: player.allianceId,
      formationSlot: profile.slot,
      basePower: player.power * profile.powerMultiplier,
      troops: config.combat.troopSize,
      distance: cubeDistance(bases.get(player.allianceId)!, tile),
      consecutiveWins: 0,
      morale: calculateMorale(cubeDistance(bases.get(player.allianceId)!, tile), 0, config.morale),
      entryOrder: troopSequence,
    };
    if (target.defenseQueue.length === 0 && target.attackQueue.length === 0 && target.defenseCamp !== troop.allianceId) {
      target.defenseCamp = troop.allianceId;
      target.defenseQueue.push(troop);
    } else {
      enqueueTroop(target, troop);
    }
    if (!wasFighting && target.defenseQueue.length > 0 && target.attackQueue.length > 0) {
      target.lastBattleAt = second;
      contestedTileCounts.set(targetId, (contestedTileCounts.get(targetId) ?? 0) + 1);
    }
    runtime.activeSlots.set(profile.slot, { troopId: troop.id, tileId: targetId });
    activeTileIds.add(targetId);
    troopRegistry.set(troop.id, { runtime, slot: profile.slot });
    player.actions += 1;
    player.apSpent += apCost * 3;
    player.maxActiveFormations = Math.max(player.maxActiveFormations, runtime.activeSlots.size);
    timeline.push({
      second,
      type: "dispatch",
      tileId: targetId,
      allianceId: player.allianceId,
      playerId: player.id,
      defensiveSupport,
      garrison,
      apCost,
    });
  };

  for (let second = 10; second <= totalSeconds; second += 10) {
    const recoverySeconds = config.ap.recoveryEveryHours * 3600;
    if (second < totalSeconds && second % recoverySeconds === 0) {
      for (const runtime of runtimes) {
        for (let index = 0; index < runtime.heroAp.length; index++) {
          const recovered = recoverAp(runtime.heroAp[index], config.ap.recoveryAmount, config.ap.cap);
          runtime.heroAp[index] = recovered.current;
          runtime.player.apOverflow += recovered.overflow;
        }
      }
      timeline.push({ second, type: "recovery" });
    }

    for (const runtime of opportunities.get(second) ?? []) {
      const actionsBefore = runtime.player.actions;
      dispatch(runtime, second);
      if (runtime.player.actions === actionsBefore && second + 300 < totalSeconds) {
        const retryAt = second + 300;
        const retries = opportunities.get(retryAt) ?? [];
        retries.push(runtime);
        opportunities.set(retryAt, retries);
      }
    }

    for (const tileId of [...activeTileIds]) {
      const state = states.get(tileId)!;
      if (state.defenseQueue.length === 0 || state.attackQueue.length === 0) continue;
      const attackerCamp = state.attackQueue[0].allianceId;
      const defenderCamp = state.defenseQueue[0].allianceId;
      const attackerPlayerId = state.attackQueue[0].playerId;
      const defenderPlayerId = state.defenseQueue[0].playerId;
      const result = resolveTileBattleTick(state, second, config, rng);
      if (!result.battle) continue;
      pvpCount += 1;
      if (firstPvpHour === null) firstPvpHour = second / 3600;

      activeFrontIds.add(frontByAllianceTile.get(attackerCamp)!.get(state.tileId)!);
      activeFrontIds.add(frontByAllianceTile.get(defenderCamp)!.get(state.tileId)!);
      for (const [playerId, kills] of result.killsByPlayer) runtimeByPlayer.get(playerId)!.player.kills += kills;
      for (const troopId of result.releasedTroopIds) releaseTroop(troopId);
      const winner = result.battle.winner === "attacker" ? state.defenseQueue.find((unit) => unit.allianceId === attackerCamp) ?? state.attackQueue[0] : state.defenseQueue[0];
      if (winner) runtimeByPlayer.get(winner.playerId)!.player.maxWinStreak = Math.max(runtimeByPlayer.get(winner.playerId)!.player.maxWinStreak, winner.consecutiveWins);
      timeline.push({
        second,
        type: "battle",
        tileId: state.tileId,
        allianceId: result.battle.winner === "attacker" ? attackerCamp : defenderCamp,
        opponentAllianceId: result.battle.winner === "attacker" ? defenderCamp : attackerCamp,
        troopsKilled: result.battle.winner === "attacker" ? result.battle.attackerKills : result.battle.defenderKills,
        winnerTroops: Math.max(result.battle.attackerRemaining, result.battle.defenderRemaining),
        attackerPlayerId,
        defenderPlayerId,
      });
      events.push({ hour: second / 3600, type: "pvp", allianceId: attackerCamp, tileId: state.tileId, previousOwner: state.ownerCamp, playerId: state.defenseQueue[0]?.playerId ?? "" });

      if (state.attackQueue.length === 0 && state.defenseCamp === state.ownerCamp && state.occupation === null) {
        releaseNonCenterDefenders(state);
      }
    }

    for (const tileId of [...activeTileIds]) {
      const state = states.get(tileId)!;
      if (state.defenseCamp === 0 || state.defenseCamp === state.ownerCamp || state.defenseQueue.length === 0) {
        if (state.occupation) syncOccupation(state, second, 0);
        if (state.defenseQueue.length === 0 && state.attackQueue.length === 0 && state.occupation === null) activeTileIds.delete(tileId);
        continue;
      }
      const tile = map.byId.get(state.tileId)!;
      const camp = state.defenseCamp as ActiveAllianceId;
      const duration = occupationSeconds(tile, cubeDistance(bases.get(camp)!, tile), config);
      const previousOwner = state.ownerCamp;
      const occupier = state.defenseQueue[0];
      const update = syncOccupation(state, second, duration);
      if (!update.captured) continue;
      owners.set(state.tileId, state.ownerCamp);
      legalCache.clear();
      connectedCache.clear();
      const points = tileValue(tile.configId, config);
      const player = runtimeByPlayer.get(occupier.playerId)!.player;
      player.occupationScore += points;
      player.occupations += 1;
      events.push({ hour: second / 3600, type: "capture", allianceId: camp, tileId: state.tileId, previousOwner, playerId: player.id });
      let retainedCenterGarrison = false;
      if (state.attackQueue.length === 0) {
        const retained = releaseNonCenterDefenders(state);
        retainedCenterGarrison = retained.some((unit) => unit.id === occupier.id);
      }
      timeline.push({
        second,
        type: "capture",
        tileId: state.tileId,
        allianceId: camp,
        playerId: player.id,
        retainedCenterGarrison,
      });
      if (state.defenseQueue.length === 0 && state.attackQueue.length === 0 && state.occupation === null) activeTileIds.delete(tileId);
    }

    if (second % 3600 === 0) {
      snapshots.push(createSnapshot(map, owners, states, second, pvpCount, activeFrontIds, contestedTileCounts, config));
    }
  }

  for (const player of players) {
    player.battleScore = Math.floor(player.kills / config.scoring.killsPerPoint);
    player.personalScore = player.battleScore + player.occupationScore;
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
  [...allianceResults].sort((left, right) => right.snapshotScore - left.snapshotScore || right.tileCount - left.tileCount)
    .forEach((alliance, index) => { alliance.rank = index + 1; });
  players.sort((left, right) => right.personalScore - left.personalScore || left.id.localeCompare(right.id));

  return {
    seed,
    snapshots,
    events,
    timeline,
    players,
    alliances: allianceResults,
    finalOwners: final.owners,
    firstPvpHour,
    contestedTileCounts: Object.fromEntries(contestedTileCounts),
    centerTileIds: centerTiles.map((tile) => tile.tileId).sort((left, right) => left - right),
    activeFrontIds: [...activeFrontIds].sort(),
  };
}
