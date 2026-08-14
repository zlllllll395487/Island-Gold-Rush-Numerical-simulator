import rawMap from "../../src/data/tilerush-map.json";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { cubeDistance } from "../../src/map/hex";
import { initialOwners, legalTargets } from "../../src/map/connectivity";
import { recoverAp, spendSquadAp } from "../../src/simulation/ap";
import { occupationSeconds } from "../../src/simulation/occupation";

describe("AP, connectivity, and occupation rules", () => {
  test("recovers to cap and spends AP from every hero", () => {
    expect(recoverAp(80, 50, 100)).toEqual({ current: 100, overflow: 30 });
    expect(spendSquadAp([50, 25, 10], 10)).toEqual({ ok: true, remaining: [40, 15, 0] });
    expect(spendSquadAp([50, 9, 10], 10)).toEqual({ ok: false, remaining: [50, 9, 10] });
  });

  test("uses vanguard camps as connectivity sources", () => {
    const map = loadCanonicalMap(rawMap);
    const owners = initialOwners(map);
    const targets = legalTargets(map, owners, 1);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.some((id) => map.neighborsById.get(id)!.some((neighbor) => map.byId.get(neighbor)?.configId === 20001 && map.byId.get(neighbor)?.camp === 1))).toBe(true);
  });

  test("always calculates occupation penalty from the alliance base", () => {
    const map = loadCanonicalMap(rawMap);
    const base = map.byConfigId.get(10001)!.find((tile) => tile.camp === 1)!;
    const target = map.tiles.filter((tile) => tile.configId === 30001).sort((a, b) => cubeDistance(base, b) - cubeDistance(base, a))[0];
    const distance = cubeDistance(base, target);
    expect(occupationSeconds(target, distance, DEFAULT_CONFIG)).toBe(60 + Math.max(0, distance - 5) * 30);
  });
});
