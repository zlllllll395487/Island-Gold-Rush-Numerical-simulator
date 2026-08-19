# Random Runs and Score Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every normal simulation run use a fresh seed, preserve deterministic replay, record battle/occupation score events, and synchronize lightweight score analysis with the existing map timeline.

**Architecture:** Keep `runSimulation` deterministic and synchronous. Add small pure helpers for run-session seed/workload behavior and score-event math, extend hourly snapshots with cumulative alliance scores, then let the dashboard select data from the existing global replay hour. UI additions stay inside the existing overview and ranking layouts; the map remains the largest card.

**Tech Stack:** TypeScript 5.9, React 19, Vinext/Vite, Vitest 4, Testing Library, existing SVG/CSS (no new dependency).

## Global Constraints

- Normal “运行仿真” generates a fresh non-zero 32-bit seed every time.
- “按当前种子复现” must remain deterministic for population, replay, rankings, and score events.
- Score events include only battle merit and occupation points.
- Do not change task/reward scoring, combat, AP, occupation, morale, targeting, navigation, parameter panel, or map rendering rules.
- The map remains the primary visual; charts are compact, low-contrast helpers.
- Do not add artificial delay; display real event counts and measured compute time.
- Batch runs remain the deterministic `base seed + index` sequence.
- Do not add external dependencies.

## File Structure

- Create `src/simulation/run-session.ts`: random seed generation and workload summary only.
- Create `src/simulation/score-events.ts`: score-event types and pure battle threshold delta helper.
- Create `src/analytics/replay-analysis.ts`: replay snapshot and per-player event selectors.
- Create `src/components/ReplayScoreSummary.tsx`: compact alliance score values and SVG trend.
- Modify `src/simulation/engine.ts`: emit score events and cumulative score snapshots.
- Modify `src/components/SimulationDashboardV2.tsx`: random/replay controls, measured workload, timeline-linked score helper, selected-player detail.
- Modify `src/components/simulator-v2.css`: compact additions without changing the existing grid hierarchy.
- Modify focused tests under `tests/simulation`, `tests/analytics`, and `tests/components`.

---

### Task 1: Fresh Random Runs, Deterministic Replay, and Workload Evidence

**Files:**
- Create: `src/simulation/run-session.ts`
- Create: `tests/simulation/run-session.test.ts`
- Modify: `src/components/SimulationDashboardV2.tsx`
- Modify: `tests/components/dashboard.test.tsx`
- Modify: `src/components/simulator-v2.css`

**Interfaces:**
- Produces: `nextSimulationSeed(previousSeed: number, fill?: (target: Uint32Array) => Uint32Array): number`
- Produces: `summarizeSimulationWorkload(result: SimulationResult, battleHours: number, elapsedMs: number): SimulationWorkload`
- `SimulationWorkload` contains `tenSecondTicks`, `timelineEvents`, `dispatches`, `battles`, `captures`, and `elapsedMs`.

- [ ] **Step 1: Write failing pure helper tests**

```ts
import { nextSimulationSeed, summarizeSimulationWorkload } from "../../src/simulation/run-session";

it("rejects zero and the immediately previous seed", () => {
  const values = [0, 41, 99];
  expect(nextSimulationSeed(41, (target) => {
    target[0] = values.shift()!;
    return target;
  })).toBe(99);
});

it("derives workload counts from the real result timeline", () => {
  const result = {
    timeline: [
      { type: "dispatch" }, { type: "battle" }, { type: "capture" }, { type: "recovery" },
    ],
  } as SimulationResult;
  expect(summarizeSimulationWorkload(result, 48, 12.5)).toEqual({
    tenSecondTicks: 17_280,
    timelineEvents: 4,
    dispatches: 1,
    battles: 1,
    captures: 1,
    elapsedMs: 12.5,
  });
});
```

- [ ] **Step 2: Run the helper test and verify RED**

Run: `npm test -- tests/simulation/run-session.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because `src/simulation/run-session.ts` does not exist.

- [ ] **Step 3: Implement the pure helpers**

```ts
export interface SimulationWorkload {
  tenSecondTicks: number;
  timelineEvents: number;
  dispatches: number;
  battles: number;
  captures: number;
  elapsedMs: number;
}

const defaultFill = (target: Uint32Array) => {
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(target);
  target[0] = (Date.now() ^ Math.round(performance.now() * 1000)) >>> 0;
  return target;
};

export function nextSimulationSeed(previousSeed: number, fill = defaultFill): number {
  const target = new Uint32Array(1);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = fill(target)[0] >>> 0;
    if (candidate !== 0 && candidate !== (previousSeed >>> 0)) return candidate;
  }
  return ((previousSeed >>> 0) + 1) || 1;
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
    elapsedMs,
  };
}
```

- [ ] **Step 4: Run the helper test and verify GREEN**

Run: `npm test -- tests/simulation/run-session.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: PASS.

- [ ] **Step 5: Write failing dashboard tests for new-run and reproduce semantics**

```tsx
+test("normal Run applies a fresh seed while reproduce keeps the current seed", async () => {
+  render(<SimulationDashboard />);
+  const initialSeed = screen.getByTestId("applied-seed").textContent;
+  fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
+  await waitFor(() => expect(screen.getByText("结果已应用")).toBeInTheDocument());
+  expect(screen.getByTestId("applied-seed")).not.toHaveTextContent(initialSeed!);
+  const randomSeed = screen.getByTestId("applied-seed").textContent;
+  fireEvent.click(screen.getByRole("button", { name: "按当前种子复现" }));
+  await waitFor(() => expect(screen.getByText("结果已应用")).toBeInTheDocument());
+  expect(screen.getByTestId("applied-seed")).toHaveTextContent(randomSeed!);
+});
+
+test("shows workload derived from the completed simulation", async () => {
+  render(<SimulationDashboard />);
+  fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
+  await waitFor(() => expect(screen.getByTestId("simulation-workload")).toHaveTextContent(/17,280 个时间步/));
+  expect(screen.getByTestId("simulation-workload")).toHaveTextContent(/出征 .* · 战斗 .* · 占领 .* · .*ms/);
+});
```

Use a deterministic crypto stub in `beforeEach` so the first test expects known seed values without asserting random output in production.

- [ ] **Step 6: Run dashboard tests and verify RED**

Run: `npm test -- tests/components/dashboard.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because the seed remains fixed, the reproduce button is missing, and no workload summary is rendered.

- [ ] **Step 7: Implement one shared run path with explicit mode**

```ts
const runSingle = (mode: "random" | "reproduce") => {
  if (running || validation.length > 0) return;
  const next = structuredClone(draft);
  if (mode === "random") next.seed = nextSimulationSeed(applied.seed);
  setRunning(true);
  setTimeout(() => {
    const startedAt = performance.now();
    const nextResult = simulate(next);
    const elapsedMs = performance.now() - startedAt;
    setResult(nextResult);
    setApplied(next);
    setDraft(structuredClone(next));
    setWorkload(summarizeSimulationWorkload(nextResult, next.battleHours, elapsedMs));
    setHour(next.battleHours);
    setDirty(false);
    setBatch(null);
    setRunning(false);
  }, 0);
};
```

Render `data-testid="applied-seed"`, keep the existing primary button as random Run, add a low-emphasis `secondary-button` for reproduce, and render the compact workload line in the existing map card footer/header.

- [ ] **Step 8: Run focused dashboard/helper tests and verify GREEN**

Run: `npm test -- tests/simulation/run-session.test.ts tests/components/dashboard.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add src/simulation/run-session.ts src/components/SimulationDashboardV2.tsx src/components/simulator-v2.css tests/simulation/run-session.test.ts tests/components/dashboard.test.tsx
git commit -m "feat: randomize individual simulation runs"
```

---

### Task 2: Battle and Occupation Score Events

**Files:**
- Create: `src/simulation/score-events.ts`
- Create: `tests/simulation/score-events.test.ts`
- Modify: `src/simulation/engine.ts`
- Modify: `tests/simulation/engine.test.ts`

**Interfaces:**
- Produces: `PlayerScoreEvent`
- Produces: `battleScoreDelta(previousKills: number, nextKills: number, killsPerPoint: number): number`
- Extends: `SimulationResult.scoreEvents: PlayerScoreEvent[]`

- [ ] **Step 1: Write failing score-event math tests**

```ts
import { battleScoreDelta } from "../../src/simulation/score-events";

it.each([
  [0, 9_999, 0],
  [9_999, 10_000, 1],
  [10_000, 19_999, 0],
  [19_999, 40_000, 3],
])("returns only newly crossed merit blocks", (before, after, expected) => {
  expect(battleScoreDelta(before, after, 10_000)).toBe(expected);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `npm test -- tests/simulation/score-events.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the score-event type and threshold helper**

```ts
export interface PlayerScoreEvent {
  second: number;
  playerId: string;
  allianceId: ActiveAllianceId;
  source: "battle" | "occupation";
  delta: number;
  totalAfter: number;
  tileId: TileId;
  kills?: number;
  cumulativeKills?: number;
  tileType?: "normal" | "resource" | "core";
}

export function battleScoreDelta(previousKills: number, nextKills: number, killsPerPoint: number) {
  return Math.floor(nextKills / killsPerPoint) - Math.floor(previousKills / killsPerPoint);
}
```

- [ ] **Step 4: Verify the pure test is GREEN**

Run: `npm test -- tests/simulation/score-events.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: PASS.

- [ ] **Step 5: Write failing engine integration assertions**

Add to the existing deterministic engine fixture:

```ts
expect(result.scoreEvents.length).toBeGreaterThan(0);
expect(result.scoreEvents.every((event) => event.source === "battle" || event.source === "occupation")).toBe(true);
for (const player of result.players) {
  const events = result.scoreEvents.filter((event) => event.playerId === player.id);
  expect(events.reduce((sum, event) => sum + event.delta, 0)).toBe(player.personalScore);
  expect(events.at(-1)?.totalAfter ?? 0).toBe(player.personalScore);
}
expect(runSimulation(input).scoreEvents).toEqual(runSimulation(input).scoreEvents);
```

Also assert at least one battle event has `delta > 1`, proving aggregation rather than one row per point.

- [ ] **Step 6: Run engine integration test and verify RED**

Run: `npm test -- tests/simulation/engine.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because `SimulationResult.scoreEvents` is absent.

- [ ] **Step 7: Emit compact events at existing settlement boundaries**

In the battle loop, replace the current direct kills update with before/after tracking:

```ts
for (const [playerId, kills] of result.killsByPlayer) {
  const player = runtimeByPlayer.get(playerId)!.player;
  const previousKills = player.kills;
  player.kills += kills;
  const delta = battleScoreDelta(previousKills, player.kills, config.scoring.killsPerPoint);
  if (delta > 0) scoreEvents.push({
    second,
    playerId,
    allianceId: player.allianceId,
    source: "battle",
    delta,
    totalAfter: Math.floor(player.kills / config.scoring.killsPerPoint) + player.occupationScore,
    tileId: state.tileId,
    kills,
    cumulativeKills: player.kills,
  });
}
```

After occupation score is awarded, append one occupation event using the existing `points`, `tile`, `camp`, and `occupier` values. Return `scoreEvents` from `runSimulation` without changing existing `timeline` semantics.

- [ ] **Step 8: Run score-event and engine tests and verify GREEN**

Run: `npm test -- tests/simulation/score-events.test.ts tests/simulation/engine.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: PASS.

- [ ] **Step 9: Commit Task 2**

```bash
git add src/simulation/score-events.ts src/simulation/engine.ts tests/simulation/score-events.test.ts tests/simulation/engine.test.ts
git commit -m "feat: record player score events"
```

---

### Task 3: Hourly Alliance Score Snapshots and Replay Selectors

**Files:**
- Create: `src/analytics/replay-analysis.ts`
- Create: `tests/analytics/replay-analysis.test.ts`
- Modify: `src/simulation/engine.ts`
- Modify: `tests/simulation/engine.test.ts`

**Interfaces:**
- Adds: `ReplaySnapshot.scoreTotals: { battle: [number, number, number]; occupation: [number, number, number]; total: [number, number, number] }`
- Produces: `snapshotForHour(snapshots: ReplaySnapshot[], hour: number): ReplaySnapshot`
- Produces: `playerScoreEventsAt(result: SimulationResult, playerId: string, second: number, limit?: number): PlayerScoreEvent[]`

- [ ] **Step 1: Write failing replay selector tests**

```ts
it("selects the nearest replay hour and limits current-player events", () => {
  expect(snapshotForHour([{ hour: 0 }, { hour: 1 }, { hour: 2 }] as ReplaySnapshot[], 1.4).hour).toBe(1);
  const events = playerScoreEventsAt(result, "P1", 3600, 2);
  expect(events).toHaveLength(2);
  expect(events.every((event) => event.playerId === "P1" && event.second <= 3600)).toBe(true);
  expect(events[0].second).toBeGreaterThanOrEqual(events[1].second);
});
```

- [ ] **Step 2: Run selector test and verify RED**

Run: `npm test -- tests/analytics/replay-analysis.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement pure selectors**

```ts
export function snapshotForHour(snapshots: ReplaySnapshot[], hour: number) {
  return snapshots[Math.min(snapshots.length - 1, Math.max(0, Math.round(hour)))];
}

export function playerScoreEventsAt(result: SimulationResult, playerId: string, second: number, limit = 50) {
  return result.scoreEvents
    .filter((event) => event.playerId === playerId && event.second <= second)
    .slice(-limit)
    .reverse();
}
```

- [ ] **Step 4: Verify selector tests are GREEN**

Run: `npm test -- tests/analytics/replay-analysis.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: PASS.

- [ ] **Step 5: Write failing hourly snapshot assertions**

```ts
expect(result.snapshots[0].scoreTotals).toEqual({ battle: [0, 0, 0], occupation: [0, 0, 0], total: [0, 0, 0] });
const finalScores = result.snapshots.at(-1)!.scoreTotals.total;
for (const allianceId of [1, 2, 3] as const) {
  expect(finalScores[allianceId - 1]).toBe(
    result.players.filter((player) => player.allianceId === allianceId).reduce((sum, player) => sum + player.personalScore, 0),
  );
}
for (let index = 1; index < result.snapshots.length; index++) {
  result.snapshots[index].scoreTotals.total.forEach((score, allianceIndex) => {
    expect(score).toBeGreaterThanOrEqual(result.snapshots[index - 1].scoreTotals.total[allianceIndex]);
  });
}
```

- [ ] **Step 6: Run engine test and verify RED**

Run: `npm test -- tests/simulation/engine.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because snapshots do not expose cumulative score totals.

- [ ] **Step 7: Compute score totals inside snapshot creation**

Pass `players` into `createSnapshot`. For every player, accumulate:

```ts
battle[player.allianceId - 1] += Math.floor(player.kills / config.scoring.killsPerPoint);
occupation[player.allianceId - 1] += player.occupationScore;
total[index] = battle[index] + occupation[index];
```

Keep the existing `scores` array unchanged as current held-tile value.

- [ ] **Step 8: Run engine and analytics tests and verify GREEN**

Run: `npm test -- tests/simulation/engine.test.ts tests/analytics/replay-analysis.test.ts --maxWorkers=1 --testTimeout=15000`

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

```bash
git add src/simulation/engine.ts src/analytics/replay-analysis.ts tests/simulation/engine.test.ts tests/analytics/replay-analysis.test.ts
git commit -m "feat: add replay score snapshots"
```

---

### Task 4: Map-First Replay Score UI and Player Detail

**Files:**
- Create: `src/components/ReplayScoreSummary.tsx`
- Create: `tests/components/replay-score-summary.test.tsx`
- Modify: `src/components/SimulationDashboardV2.tsx`
- Modify: `src/components/simulator-v2.css`
- Modify: `tests/components/dashboard.test.tsx`

**Interfaces:**
- Consumes: `ReplaySnapshot[]`, current `ReplaySnapshot`, and existing alliance colors/names.
- Consumes: `playerScoreEventsAt(result, selectedPlayerId, snapshot.second, visibleEventCount)`.
- Produces: compact `ReplayScoreSummary` with `data-testid="replay-score-summary"` and SVG `aria-label="联盟累计积分趋势"`.

- [ ] **Step 1: Write a failing compact component test**

```tsx
+test("renders current cumulative scores with a timeline cursor", () => {
+  render(<ReplayScoreSummary snapshots={snapshots} current={snapshots[1]} allianceNames={["蓝方", "红方", "黄方"]} />);
+  expect(screen.getByTestId("replay-score-summary")).toHaveTextContent("蓝方 120");
+  expect(screen.getByRole("img", { name: "联盟累计积分趋势" })).toBeInTheDocument();
+  expect(screen.getByTestId("score-trend-cursor")).toHaveAttribute("data-hour", "1");
+});
```

- [ ] **Step 2: Run component test and verify RED**

Run: `npm test -- tests/components/replay-score-summary.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement the lightweight SVG summary**

Use a fixed `viewBox`, three unfilled polylines derived from `snapshot.scoreTotals.total`, and a single vertical cursor at `current.hour / last.hour`. Do not add chart libraries, tooltips, icons, gradients, or large headings.

- [ ] **Step 4: Verify the component test is GREEN**

Run: `npm test -- tests/components/replay-score-summary.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: PASS.

- [ ] **Step 5: Write failing dashboard replay-link and player-detail tests**

```tsx
+test("keeps the map primary while the replay slider updates score and held-tile values", () => {
+  render(<SimulationDashboard />);
+  const map = screen.getByRole("img", { name: /海岛地图/ });
+  expect(map.closest(".map-panel")).toBeInTheDocument();
+  const initial = screen.getByTestId("replay-score-summary").textContent;
+  fireEvent.change(screen.getByRole("slider", { name: "回放时间" }), { target: { value: "0" } });
+  expect(screen.getByTestId("current-held-value")).toHaveTextContent(/蓝 0.*红 0.*黄 0/);
+  expect(screen.getByTestId("replay-score-summary").textContent).not.toBe(initial);
+});
+
+test("opens a ranked player and limits score events to the replay time", () => {
+  render(<SimulationDashboard />);
+  fireEvent.change(screen.getByRole("slider", { name: "回放时间" }), { target: { value: "12" } });
+  fireEvent.click(screen.getByRole("tab", { name: "玩家与联盟排名" }));
+  fireEvent.click(screen.getAllByRole("button", { name: /查看.*积分流水/ })[0]);
+  expect(screen.getByRole("region", { name: "玩家积分流水" })).toBeInTheDocument();
+  for (const row of screen.getAllByTestId("player-score-event")) {
+    expect(Number(row.getAttribute("data-second"))).toBeLessThanOrEqual(12 * 3600);
+  }
+});
```

- [ ] **Step 6: Run dashboard tests and verify RED**

Run: `npm test -- tests/components/dashboard.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because the summary, held-value readout, selectable player row, and player event detail are missing.

- [ ] **Step 7: Integrate with the existing layout only**

- Keep `.map-panel` in grid column 1 and its existing canvas height.
- Add `data-testid="current-held-value"` using `snapshot.scores`, labeled as current held-tile value.
- Add `<ReplayScoreSummary>` as a compact card in the existing right column after the current support cards.
- Replace plain player names with low-emphasis buttons that set `selectedPlayerId`.
- Add a player detail card below the ranking table; render score totals and the latest 50 `playerScoreEventsAt(...)` rows.
- Add “继续加载” only when additional rows exist; increase by 50.
- Reset selected player and visible row count after each new simulation result.
- Keep `hour` as the sole time source for map, held value, trend cursor, and player event filtering.

- [ ] **Step 8: Add minimal CSS without altering existing navigation or map hierarchy**

```css
.replay-score-card { grid-column: 2; }
.replay-score-summary svg { width: 100%; height: 112px; }
.replay-score-line { fill: none; stroke-width: 1.5; }
.player-link { border: 0; padding: 0; background: transparent; color: inherit; font: inherit; }
.player-score-detail { margin-top: 14px; }
.player-score-events { max-height: 320px; overflow: auto; }
```

At `max-width: 1180px`, set `.replay-score-card { grid-column: 1; }`. Do not change `.map-canvas`, `.overview-layout`, sidebar, tabs, or parameter controls.

- [ ] **Step 9: Run all focused tests and verify GREEN**

Run: `npm test -- tests/simulation/run-session.test.ts tests/simulation/score-events.test.ts tests/simulation/engine.test.ts tests/analytics/replay-analysis.test.ts tests/components/replay-score-summary.test.tsx tests/components/dashboard.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: PASS.

- [ ] **Step 10: Run fresh full verification**

Run:

```bash
npm test -- --maxWorkers=1 --testTimeout=15000
npm run lint
npm run build
node --test tests/site-readiness.test.mjs
```

Expected: all tests pass, lint exits 0, production build exits 0, and public-site readiness passes.

- [ ] **Step 11: Run privacy and diff checks**

Run:

```bash
git diff --check
git status --short
rg -n -i --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!.superpowers/**' \
  'C:/Users|C:\\Users|client_secret|app_secret|access_token|api[_-]?key|BEGIN .* PRIVATE KEY' .
```

Expected: no sensitive-pattern matches; only planned simulator files are modified.

- [ ] **Step 12: Commit Task 4**

```bash
git add src/components/ReplayScoreSummary.tsx src/components/SimulationDashboardV2.tsx src/components/simulator-v2.css tests/components/replay-score-summary.test.tsx tests/components/dashboard.test.tsx docs/superpowers/specs/2026-08-19-random-runs-score-replay-design.md docs/superpowers/plans/2026-08-19-random-runs-score-replay.md .gitignore
git commit -m "feat: add random score replay analysis"
```
