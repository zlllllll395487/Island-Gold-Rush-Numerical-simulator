import rawMap from "../../src/data/tilerush-map.json";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { buildMatchedPopulation } from "../../src/population/match-alliances";
import { assignPlayerFronts, buildAllianceFronts, candidatesInFront, frontForTile, type TargetCandidate } from "../../src/simulation/fronts";

describe("alliance fronts", () => {
  const map = loadCanonicalMap(rawMap);

  test("builds the configured number of directional fronts from permanent alliance roots", () => {
    const fronts = buildAllianceFronts(map, 1, 4);
    expect(fronts).toHaveLength(4);
    expect(new Set(fronts.map((front) => front.id)).size).toBe(4);
    expect(fronts.every((front) => [10001, 20001].includes(map.byId.get(front.rootTileId)!.configId))).toBe(true);
    expect(fronts.every((front) => map.byId.get(front.rootTileId)!.camp === 1)).toBe(true);
  });

  test("assigns every alliance player to one stable primary front", () => {
    const fronts = buildAllianceFronts(map, 1, DEFAULT_CONFIG.fronts.countPerAlliance);
    const roster = buildMatchedPopulation(DEFAULT_CONFIG, 19).alliances[0].members;
    const first = assignPlayerFronts(roster, fronts);
    const second = assignPlayerFronts(roster, fronts);

    expect(first).toEqual(second);
    expect(first.size).toBe(100);
    expect(new Set(first.values()).size).toBe(4);
    expect(frontForTile(map, map.byId.get(1)!, fronts)).toBeTruthy();
  });

  test("keeps the legal candidates from an assigned front in their original order", () => {
    const candidates: Array<Pick<TargetCandidate, "tileId" | "frontId">> = [
      { tileId: 1, frontId: "A1-F1" },
      { tileId: 2, frontId: "A1-F0" },
      { tileId: 3, frontId: "A1-F0" },
    ];
    expect(candidatesInFront(candidates, "A1-F0").map((candidate) => candidate.tileId)).toEqual([2, 3]);
  });
});
