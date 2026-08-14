export function recoverAp(current: number, amount: number, cap: number): { current: number; overflow: number } {
  const next = current + amount;
  return { current: Math.min(next, cap), overflow: Math.max(0, next - cap) };
}

export function spendSquadAp(current: readonly number[], cost: number): { ok: boolean; remaining: number[] } {
  if (current.some((value) => value < cost)) return { ok: false, remaining: [...current] };
  return { ok: true, remaining: current.map((value) => value - cost) };
}
