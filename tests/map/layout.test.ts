import rawMap from "../../src/data/tilerush-map.json";
import { loadCanonicalMap } from "../../src/map/map-loader";
import { flatTopCenter, flatTopVertices, layoutFlatTopMap } from "../../src/map/layout";

describe("flat-top hex layout", () => {
  test("starts at the right-hand point and keeps adjacent centers exactly one hex apart", () => {
    const size = 20;
    const origin = flatTopCenter({ x: 0, y: 0, z: 0 }, size);
    const neighbor = flatTopCenter({ x: 1, y: -1, z: 0 }, size);
    const vertices = flatTopVertices(origin, size);

    expect(vertices[0]).toEqual({ x: 20, y: 0 });
    expect(Math.hypot(neighbor.x - origin.x, neighbor.y - origin.y)).toBeCloseTo(Math.sqrt(3) * size, 8);
    expect(vertices[1].y).toBeCloseTo(vertices[2].y, 8);
  });

  test("fits every real map hex inside the canvas with only stroke-sized gaps", () => {
    const map = loadCanonicalMap(rawMap);
    const layout = layoutFlatTopMap(map.tiles, 900, 720, 18);
    expect(layout.radius).toBeGreaterThan(10);
    for (const center of layout.centers.values()) {
      for (const vertex of flatTopVertices(center, layout.radius)) {
        expect(vertex.x).toBeGreaterThanOrEqual(17);
        expect(vertex.x).toBeLessThanOrEqual(883);
        expect(vertex.y).toBeGreaterThanOrEqual(17);
        expect(vertex.y).toBeLessThanOrEqual(703);
      }
    }
  });
});
