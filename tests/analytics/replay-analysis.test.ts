import rawMap from "../../src/data/tilerush-map.json";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { buildMatchedPopulation } from "../../src/population/match-alliances";
import { runSimulation } from "../../src/simulation/engine";
import { allianceScoreSeries, playerScoreEventsAt } from "../../src/analytics/replay-analysis";

describe("score replay analysis", () => {
  test("stores monotonic hourly alliance totals aligned with final contribution", () => {
    const map = loadCanonicalMap(rawMap);
    const config = structuredClone(DEFAULT_CONFIG);
    config.battleHours = 6;
    const result = runSimulation({ map, config, population: buildMatchedPopulation(config, 47), seed: 47 });
    const series = allianceScoreSeries(result);

    expect(series).toHaveLength(result.snapshots.length);
    expect(series[0].alliances.every((row) => row.total === 0)).toBe(true);
    for (let index = 1; index < series.length; index++) {
      for (let alliance = 0; alliance < 3; alliance++) {
        expect(series[index].alliances[alliance].total).toBeGreaterThanOrEqual(series[index - 1].alliances[alliance].total);
      }
    }
    const final = series.at(-1)!;
    for (const alliance of result.alliances) {
      expect(final.alliances[alliance.id - 1].total).toBe(alliance.contributionScore);
    }
  }, 15000);

  test("filters a player's latest events by the global replay second", () => {
    const map = loadCanonicalMap(rawMap);
    const config = structuredClone(DEFAULT_CONFIG);
    config.battleHours = 6;
    const result = runSimulation({ map, config, population: buildMatchedPopulation(config, 48), seed: 48 });
    const playerId = result.scoreEvents.find((event) => event.second > 0)!.playerId;
    const cutoff = result.scoreEvents.filter((event) => event.playerId === playerId).at(-1)!.second;

    const visible = playerScoreEventsAt(result, playerId, cutoff, 3);
    expect(visible.length).toBeLessThanOrEqual(3);
    expect(visible.every((event) => event.playerId === playerId && event.second <= cutoff)).toBe(true);
    expect(visible).toEqual([...visible].sort((left, right) => right.second - left.second));
  }, 15000);
});