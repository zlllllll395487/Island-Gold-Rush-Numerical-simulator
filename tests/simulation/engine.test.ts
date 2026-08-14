import rawMap from "../../src/data/tilerush-map.json";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { cubeDistance } from "../../src/map/hex";
import { connectedTerritory, initialOwners, legalTargets } from "../../src/map/connectivity";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { buildMatchedPopulation } from "../../src/population/match-alliances";
import { runSimulation } from "../../src/simulation/engine";

describe("deterministic match simulation", () => {
  const map = loadCanonicalMap(rawMap);

  test("replays identically for the same input and seed", () => {
    const population = buildMatchedPopulation(DEFAULT_CONFIG, 41);
    const input = { map, config: DEFAULT_CONFIG, population, seed: 41 };
    expect(runSimulation(input)).toEqual(runSimulation(input));
  }, 15000);

  test("produces a complete 48-hour replay without changing permanent or blocked tiles", () => {
    const population = buildMatchedPopulation(DEFAULT_CONFIG, 42);
    const result = runSimulation({ map, config: DEFAULT_CONFIG, population, seed: 42 });

    expect(result.snapshots[0].hour).toBe(0);
    expect(result.snapshots.at(-1)?.hour).toBe(48);
    expect(result.players).toHaveLength(300);
    for (const tile of map.tiles.filter((item) => item.blocked || item.configId === 10001 || item.configId === 20001)) {
      expect(result.finalOwners[tile.tileId]).toBe(tile.camp);
    }
  });

  test("keeps snapshot score separate from accumulated contribution", () => {
    const population = buildMatchedPopulation(DEFAULT_CONFIG, 43);
    const result = runSimulation({ map, config: DEFAULT_CONFIG, population, seed: 43 });
    expect(result.alliances.some((alliance) => alliance.contributionScore !== alliance.snapshotScore)).toBe(true);
    expect(result.players.every((player) => player.personalScore === player.battleScore + player.occupationScore)).toBe(true);
  });

  test("derives battle merit from cumulative actual kills and tracks AP lifecycle", () => {
    const population = buildMatchedPopulation(DEFAULT_CONFIG, 44);
    const result = runSimulation({ map, config: DEFAULT_CONFIG, population, seed: 44 });
    expect(result.players.every((player) => player.battleScore === Math.floor(player.kills / DEFAULT_CONFIG.scoring.killsPerPoint))).toBe(true);
    expect(result.players.some((player) => player.kills >= 100_000 && player.battleScore >= 10)).toBe(true);
    expect(result.players.every((player) => player.apSpent >= 0 && player.apOverflow >= 0)).toBe(true);
    expect(result.players.every((player) => player.maxActiveFormations <= 6)).toBe(true);
    expect(result.timeline.some((event) => event.type === "battle" && event.second % 10 === 0)).toBe(true);
  });

  test("awards battle merit only for each completed kills-per-point block", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.playersPerAlliance = 20;
    config.battleHours = 0.001;
    const population = buildMatchedPopulation(config, 72);
    const boundaries = [9_999, 10_000, 19_999, 20_000];
    const expected = [0, 1, 1, 2];
    boundaries.forEach((kills, index) => { population.players[index].kills = kills; });

    const result = runSimulation({ map, config, population, seed: 72 });
    const playersById = new Map(result.players.map((player) => [player.id, player]));

    expect(boundaries.map((_, index) => playersById.get(population.players[index].id)!.battleScore)).toEqual(expected);
  });

  test("stores active queue and occupation state in replay snapshots", () => {
    const result = runSimulation({ map, config: DEFAULT_CONFIG, population: buildMatchedPopulation(DEFAULT_CONFIG, 45), seed: 45 });
    expect(result.snapshots.some((snapshot) => Object.keys(snapshot.tileStatus).length > 0)).toBe(true);
  });

  test("dispatches only to the current legal frontier or a connected friendly defensive fight", () => {
    const result = runSimulation({
      map,
      config: DEFAULT_CONFIG,
      population: buildMatchedPopulation(DEFAULT_CONFIG, DEFAULT_CONFIG.seed),
      seed: DEFAULT_CONFIG.seed,
    });
    const owners = initialOwners(map);
    let dispatches = 0;
    let illegalDispatches = 0;

    for (const event of result.timeline) {
      if (event.type === "capture") {
        owners.set(event.tileId!, event.allianceId!);
        continue;
      }
      if (event.type !== "dispatch") continue;
      dispatches += 1;
      const allianceId = event.allianceId!;
      const tileId = event.tileId!;
      const legalFrontier = legalTargets(map, owners, allianceId).includes(tileId);
      const connectedFriendly = owners.get(tileId) === allianceId
        && connectedTerritory(map, owners, allianceId).has(tileId);
      const defensiveSupport = event.defensiveSupport === true && connectedFriendly;
      const quietCoreGarrison = event.garrison === true
        && event.defensiveSupport !== true
        && connectedFriendly
        && map.byId.get(tileId)?.configId === 30003;
      if (!legalFrontier && !defensiveSupport && !quietCoreGarrison) illegalDispatches += 1;
    }

    expect(dispatches).toBeGreaterThan(0);
    expect(illegalDispatches).toBe(0);
  }, 15000);

  test("selects quiet friendly cores before formation eligibility and charges the garrison AP cost", () => {
    const quietCoreMap = loadCanonicalMap(structuredClone(rawMap));
    for (const tile of quietCoreMap.tiles) {
      if (!tile.blocked && tile.configId !== 10001 && tile.configId !== 20001) tile.camp = 1;
    }
    const config = structuredClone(DEFAULT_CONFIG);
    config.playersPerAlliance = 20;
    config.battleHours = 0.25;
    config.ap.initial = 50;
    config.ap.cap = 50;
    config.ap.attackCost = 60;
    config.ap.garrisonCost = 10;
    config.activity.bands = config.activity.bands.map((band) => ({ ...band, usage: 1 }));
    config.strategy.shares = { centerRush: 1, supportExpand: 0, multiFront: 0 };

    const result = runSimulation({
      map: quietCoreMap,
      config,
      population: buildMatchedPopulation(config, 71),
      seed: 71,
    });
    const playersById = new Map(result.players.map((player) => [player.id, player]));
    const garrisons = result.timeline.filter((event) => event.type === "dispatch" && event.garrison === true);

    console.info("TASK9_GARRISON", JSON.stringify({ dispatches: garrisons.length, apCost: config.ap.garrisonCost }));
    expect(garrisons.length).toBeGreaterThan(0);
    expect(garrisons.every((event) => event.apCost === config.ap.garrisonCost)).toBe(true);
    expect(garrisons.every((event) => playersById.get(event.playerId!)?.behaviorStrategy === "centerRush")).toBe(true);
    for (const player of result.players.filter((candidate) => candidate.actions > 0)) {
      const playerDispatches = result.timeline.filter((event) => event.type === "dispatch" && event.playerId === player.id);
      expect(player.apSpent).toBe(playerDispatches.reduce((sum, event) => sum + event.apCost! * 3, 0));
    }
  }, 15000);

  test("retains a center-rush capturer to defend the core without duplicate same-player dispatches", () => {
    const result = runSimulation({
      map,
      config: DEFAULT_CONFIG,
      population: buildMatchedPopulation(DEFAULT_CONFIG, DEFAULT_CONFIG.seed),
      seed: DEFAULT_CONFIG.seed,
    });
    const coreIds = new Set(map.byConfigId.get(30003)!.map((tile) => tile.tileId));
    const retainedCaptures = result.timeline.filter((event) =>
      event.type === "capture" && coreIds.has(event.tileId!) && event.retainedCenterGarrison === true,
    );
    const defendedCapture = retainedCaptures.find((capture) => result.timeline.some((event) =>
      event.type === "battle"
        && event.tileId === capture.tileId
        && event.second > capture.second
        && event.defenderPlayerId === capture.playerId,
    ));

    expect(retainedCaptures.length).toBeGreaterThan(0);
    expect(defendedCapture).toBeDefined();
    const laterDefense = result.timeline.find((event) =>
      event.type === "battle"
        && event.tileId === defendedCapture!.tileId
        && event.second > defendedCapture!.second
        && event.defenderPlayerId === defendedCapture!.playerId,
    )!;
    const duplicates = result.timeline.filter((event) =>
      event.type === "dispatch"
        && event.playerId === defendedCapture!.playerId
        && event.tileId === defendedCapture!.tileId
        && event.second > defendedCapture!.second
        && event.second <= laterDefense.second,
    );
    console.info("TASK9_CENTER_RETENTION", JSON.stringify({
      retainedCaptures: retainedCaptures.length,
      tileId: defendedCapture!.tileId,
      playerId: defendedCapture!.playerId,
      captureSecond: defendedCapture!.second,
      laterDefenseSecond: laterDefense.second,
      duplicateDispatches: duplicates.length,
    }));
    expect(duplicates).toHaveLength(0);
  }, 15000);

  test("routes the default strategy quotas toward their distinct objectives", () => {
    const result = runSimulation({
      map,
      config: DEFAULT_CONFIG,
      population: buildMatchedPopulation(DEFAULT_CONFIG, DEFAULT_CONFIG.seed),
      seed: DEFAULT_CONFIG.seed,
    });
    const playersById = new Map(result.players.map((player) => [player.id, player]));
    const coreTiles = map.byConfigId.get(30003)!;
    const strategyCounts = Object.fromEntries(
      ["centerRush", "supportExpand", "multiFront"].map((strategy) => [
        strategy,
        result.players.filter((player) => player.behaviorStrategy === strategy).length,
      ]),
    );
    const centerDirectedShare = (strategy: "centerRush" | "multiFront") => {
      const dispatches = result.timeline.filter((event) =>
        event.type === "dispatch" && event.playerId && playersById.get(event.playerId)?.behaviorStrategy === strategy,
      );
      const centerDirected = dispatches.filter((event) => {
        const tile = map.byId.get(event.tileId!)!;
        return Math.min(...coreTiles.map((core) => cubeDistance(tile, core))) <= 1;
      });
      return centerDirected.length / dispatches.length;
    };

    expect(strategyCounts).toEqual({ centerRush: 135, supportExpand: 75, multiFront: 90 });
    expect(centerDirectedShare("centerRush")).toBeGreaterThan(centerDirectedShare("multiFront"));
  }, 15000);
});
