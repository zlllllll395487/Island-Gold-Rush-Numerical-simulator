import type { SimulationResult } from "../../src/simulation/engine";
import { nextSimulationSeed, summarizeSimulationWorkload } from "../../src/simulation/run-session";

describe("single simulation run session", () => {
  test("rejects zero and the immediately previous seed", () => {
    const values = [0, 41, 99];

    expect(nextSimulationSeed(41, (target) => {
      target[0] = values.shift()!;
      return target;
    })).toBe(99);
  });

  test("falls back to the next non-zero seed after repeated collisions", () => {
    expect(nextSimulationSeed(0xffffffff, (target) => {
      target[0] = 0xffffffff;
      return target;
    })).toBe(1);
  });

  test("derives workload counts from the real result timeline", () => {
    const result = {
      timeline: [
        { type: "dispatch" },
        { type: "battle" },
        { type: "capture" },
        { type: "recovery" },
      ],
      scoreEvents: [{}, {}],
    } as SimulationResult;

    expect(summarizeSimulationWorkload(result, 48, 12.5)).toEqual({
      tenSecondTicks: 17_280,
      timelineEvents: 4,
      dispatches: 1,
      battles: 1,
      captures: 1,
      scoreEvents: 2,
      elapsedMs: 12.5,
    });
  });
});
