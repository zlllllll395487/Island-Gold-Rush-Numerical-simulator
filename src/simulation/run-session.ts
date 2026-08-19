import type { SimulationResult } from "./engine";

export interface SimulationWorkload {
  tenSecondTicks: number;
  timelineEvents: number;
  dispatches: number;
  battles: number;
  captures: number;
  scoreEvents: number;
  elapsedMs: number;
}

type RandomFill = (target: Uint32Array) => Uint32Array;

const defaultFill: RandomFill = (target) => {
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(target);
  const clock = typeof performance === "undefined" ? 0 : Math.round(performance.now() * 1_000);
  target[0] = (Date.now() ^ clock) >>> 0;
  return target;
};

export function nextSimulationSeed(previousSeed: number, fill: RandomFill = defaultFill): number {
  const target = new Uint32Array(1);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = fill(target)[0] >>> 0;
    if (candidate !== 0 && candidate !== (previousSeed >>> 0)) return candidate;
  }
  return (((previousSeed >>> 0) + 1) >>> 0) || 1;
}

export function summarizeSimulationWorkload(
  result: SimulationResult,
  battleHours: number,
  elapsedMs: number,
): SimulationWorkload {
  return {
    tenSecondTicks: Math.round(battleHours * 360),
    timelineEvents: result.timeline.length,
    dispatches: result.timeline.filter((event) => event.type === "dispatch").length,
    battles: result.timeline.filter((event) => event.type === "battle").length,
    captures: result.timeline.filter((event) => event.type === "capture").length,
    scoreEvents: result.scoreEvents.length,
    elapsedMs,
  };
}
