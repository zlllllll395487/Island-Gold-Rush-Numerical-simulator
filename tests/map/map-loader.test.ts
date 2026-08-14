import rawMap from "../../src/data/tilerush-map.json";
import { cubeDistance } from "../../src/map/hex";
import { loadCanonicalMap } from "../../src/map/map-loader";

describe("TileRush canonical map", () => {
  test("loads the exact 271-tile topology", () => {
    const map = loadCanonicalMap(rawMap);

    expect(map.tiles).toHaveLength(271);
    expect(map.byConfigId.get(10001)).toHaveLength(3);
    expect(map.byConfigId.get(20001)).toHaveLength(6);
    expect(map.byConfigId.get(30001)).toHaveLength(201);
    expect(map.byConfigId.get(30002)).toHaveLength(15);
    expect(map.byConfigId.get(30003)).toHaveLength(4);
    expect(map.byConfigId.get(40001)).toHaveLength(24);
    expect(map.byConfigId.get(40002)).toHaveLength(18);
  });

  test("indexes all tile ids and cube coordinates uniquely", () => {
    const map = loadCanonicalMap(rawMap);

    expect(map.byId.size).toBe(271);
    expect(map.byCoord.size).toBe(271);
    expect([...map.neighborsById.values()].every((ids) => ids.length <= 6)).toBe(true);
  });

  test("uses integer cube distance", () => {
    expect(cubeDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: -5, z: 2 })).toBe(5);
  });

  test("rejects duplicate ids", () => {
    const invalid = structuredClone(rawMap);
    invalid[1].tile_id = invalid[0].tile_id;

    expect(() => loadCanonicalMap(invalid)).toThrow(/duplicate tile_id/i);
  });

  test("rejects invalid cube coordinates", () => {
    const invalid = structuredClone(rawMap);
    invalid[0].x = 99;

    expect(() => loadCanonicalMap(invalid)).toThrow(/x \+ y \+ z/i);
  });
});
