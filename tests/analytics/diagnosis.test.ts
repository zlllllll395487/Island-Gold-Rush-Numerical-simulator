import { diagnoseMatch } from "../../src/analytics/diagnosis";
import type { MatchMetrics } from "../../src/analytics/metrics";

const baseMetrics = {
  firstPvpHour: 4,
  firstPvpStatus: "target",
  mapValueGap: 0.2,
  apWasteRate: 0.15,
  scoreConcentrationTop10: 0.3,
  powerScoreCorrelation: 0.4,
  centerContestIntensity: { score: 0.4, battles: 10, captures: 2, controlHours: 8 },
} as MatchMetrics;

describe("match diagnosis", () => {
  test("prioritizes a late PvP onset and cites the actual result", () => {
    const diagnosis = diagnoseMatch({ ...baseMetrics, firstPvpHour: 8, firstPvpStatus: "late" }, [3, 6]);

    expect(diagnosis.primary.code).toBe("pvp-late");
    expect(diagnosis.primary.detail).toContain("8.00");
    expect(diagnosis.primary.detail).toContain("3\u20136");
  });

  test("surfaces map imbalance before secondary AP and reward risks", () => {
    const diagnosis = diagnoseMatch({
      ...baseMetrics,
      mapValueGap: 0.8,
      apWasteRate: 0.5,
      scoreConcentrationTop10: 0.65,
    }, [3, 6]);

    expect(diagnosis.primary.code).toBe("map-imbalance");
    expect(diagnosis.secondary.map((signal) => signal.code)).toEqual(["ap-waste", "score-concentration"]);
  });

  test("returns a data-backed balanced conclusion when no threshold is breached", () => {
    const diagnosis = diagnoseMatch(baseMetrics, [3, 6]);

    expect(diagnosis.primary.code).toBe("balanced");
    expect(diagnosis.primary.detail).toContain("4.00");
    expect(diagnosis.secondary).toEqual([]);
  });
});
