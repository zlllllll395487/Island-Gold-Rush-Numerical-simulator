import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import { calculateMorale, moraleMultiplier } from "../../src/simulation/morale";

describe("morale model", () => {
  test("applies distance and consecutive-win losses inside configured bounds", () => {
    const config = DEFAULT_CONFIG.morale;
    expect(calculateMorale(5, 0, config)).toBe(150);
    expect(calculateMorale(8, 0, config)).toBe(144);
    expect(calculateMorale(8, 3, config)).toBe(138);
    expect(calculateMorale(100, 100, config)).toBe(20);
  });

  test("uses the approved GDD coefficient anchors", () => {
    const config = DEFAULT_CONFIG.morale;
    expect(moraleMultiplier(150, config)).toBeCloseTo(1, 8);
    expect(moraleMultiplier(20, config)).toBeCloseTo(0.6, 8);
    expect(moraleMultiplier(100, config)).toBeCloseTo(11 / 13, 8);
  });
});
