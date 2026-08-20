import { mapTileFill, tileStrategicValue } from "../../src/components/HexMapCanvasV2";
import type { MapTile } from "../../src/domain/types";

const tile = (configId: MapTile["configId"]): MapTile => ({ tileId: 1, configId, camp: 0, blocked: false, x: 0, y: 0, z: 0 });

describe("map analysis modes", () => {
  test("keeps ownership color in ownership mode", () => {
    expect(mapTileFill(tile(30001), 2, "ownership", 0, 1)).toBe("#3188d7");
  });

  test("increases heat color intensity with visible battle count", () => {
    expect(mapTileFill(tile(30001), 0, "heat", 1, 5)).not.toBe(mapTileFill(tile(30001), 0, "heat", 5, 5));
  });

  test("maps core and resource tiles to stronger strategic values than normal tiles", () => {
    expect(tileStrategicValue(tile(30003))).toBeGreaterThan(tileStrategicValue(tile(30002)));
    expect(tileStrategicValue(tile(30002))).toBeGreaterThan(tileStrategicValue(tile(30001)));
    expect(mapTileFill(tile(30003), 0, "value", 0, 1)).not.toBe(mapTileFill(tile(30001), 0, "value", 0, 1));
  });
});
