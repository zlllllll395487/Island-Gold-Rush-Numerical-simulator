import rawMap from "../../src/data/tilerush-map.json";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { buildMatchedPopulation } from "../../src/population/match-alliances";
import { runSimulation } from "../../src/simulation/engine";

describe("deterministic match simulation", () => {
  const map = loadCanonicalMap(rawMap);

  test("replays identically for the same input and seed", () => {
    const population = buildMatchedPopulation(DEFAULT_CONFIG, 41);
    const input = { map, config: DEFAULT_CONFIG, population, seed: 41 };
    expect(runSimulation(input)).toEqual(runSimulation(input));
  });

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
});
