import rawMap from "../../src/data/tilerush-map.json";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { buildMatchedPopulation } from "../../src/population/match-alliances";
import { runSimulation } from "../../src/simulation/engine";
import { battleScoreDelta } from "../../src/simulation/score-events";

describe("player score events", () => {
  const map = loadCanonicalMap(rawMap);

  test("awards aggregated battle merit only when cumulative kill thresholds are crossed", () => {
    expect(battleScoreDelta(9_999, 1, 10_000)).toBe(1);
    expect(battleScoreDelta(9_999, 20_002, 10_000)).toBe(3);
    expect(battleScoreDelta(10_000, 9_999, 10_000)).toBe(0);
  });

  test("reconstructs every player's battle and occupation score from deterministic events", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.battleHours = 6;
    const input = { map, config, population: buildMatchedPopulation(config, 46), seed: 46 };
    const first = runSimulation(input);
    const second = runSimulation(input);

    expect(first.scoreEvents.length).toBeGreaterThan(0);
    expect(first.scoreEvents).toEqual(second.scoreEvents);
    expect(first.scoreEvents.every((event) => event.delta > 0 && event.second >= 0)).toBe(true);
    expect(first.scoreEvents.every((event) => event.source === "battle" || event.source === "occupation")).toBe(true);

    for (const player of first.players) {
      const events = first.scoreEvents.filter((event) => event.playerId === player.id);
      const battle = events.filter((event) => event.source === "battle").reduce((sum, event) => sum + event.delta, 0);
      const occupation = events.filter((event) => event.source === "occupation").reduce((sum, event) => sum + event.delta, 0);
      expect(battle).toBe(player.battleScore);
      expect(occupation).toBe(player.occupationScore);
      expect(events.at(-1)?.totalAfter ?? 0).toBe(player.personalScore);
    }
  }, 15000);
});