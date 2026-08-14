import rawMap from "../../src/data/tilerush-map.json";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { cubeDistance } from "../../src/map/hex";
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
    expect(result.players.every((player) => player.battleScore === Math.round(player.kills / DEFAULT_CONFIG.scoring.killsPerPoint))).toBe(true);
    expect(result.players.some((player) => player.kills >= 100_000 && player.battleScore >= 10)).toBe(true);
    expect(result.players.every((player) => player.apSpent >= 0 && player.apOverflow >= 0)).toBe(true);
    expect(result.players.every((player) => player.maxActiveFormations <= 6)).toBe(true);
    expect(result.timeline.some((event) => event.type === "battle" && event.second % 10 === 0)).toBe(true);
  });

  test("stores active queue and occupation state in replay snapshots", () => {
    const result = runSimulation({ map, config: DEFAULT_CONFIG, population: buildMatchedPopulation(DEFAULT_CONFIG, 45), seed: 45 });
    expect(result.snapshots.some((snapshot) => Object.keys(snapshot.tileStatus).length > 0)).toBe(true);
  });

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
