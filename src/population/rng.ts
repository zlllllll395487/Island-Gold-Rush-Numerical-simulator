export interface SeededRng {
  next(): number;
  normal(mean?: number, stdDev?: number): number;
  pick<T>(values: readonly T[]): T;
}

export function createRng(seed: number): SeededRng {
  let state = seed >>> 0;
  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    next,
    normal(mean = 0, stdDev = 1) {
      const u = Math.max(next(), Number.EPSILON);
      const v = next();
      return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * stdDev;
    },
    pick<T>(values: readonly T[]): T {
      return values[Math.min(values.length - 1, Math.floor(next() * values.length))];
    },
  };
}
