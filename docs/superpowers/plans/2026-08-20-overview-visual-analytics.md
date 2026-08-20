# Overview Visual Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sparse overview with a single-screen map plus three readable, replay-synchronized analytical charts.

**Architecture:** Derive all chart-ready data in a pure replay analytics module, render three focused SVG components, and keep the dashboard responsible only for shared replay time and view-mode state. Extend the existing canvas map with explicit visual modes without changing simulation output.

**Tech Stack:** React 19, TypeScript, SVG, Canvas 2D, Vitest, Testing Library, CSS.

## Global Constraints

- Preserve all simulation rules, random behavior, parameter editing, rankings, and player score ledger behavior.
- Use existing `snapshots`, `timeline`, `scoreEvents`, players, map, and applied configuration only.
- Do not add a charting dependency.
- All time-derived views must exclude events after the selected replay second.
- Keep the overview within the existing single-screen body at 1920×1080; do not add another full viewport of scrolling.
- Alliance colors remain red for alliance 1, blue for alliance 2, and gold for alliance 3.

---

### Task 1: Replay analytics model

**Files:**
- Create: `src/analytics/overview-analytics.ts`
- Create: `tests/analytics/overview-analytics.test.ts`

**Interfaces:**
- Consumes: `SimulationResult`, `ReplaySnapshot`, and `Player`.
- Produces:
  - `overviewReplaySeries(result: SimulationResult): OverviewReplayPoint[]`
  - `overviewAt(result: SimulationResult, second: number): OverviewCurrentMetrics`
  - `tileBattleHeatAt(result: SimulationResult, second: number): Record<number, number>`
  - `playerContributionAt(result: SimulationResult, second: number): PlayerContributionPoint[]`
- `OverviewReplayPoint` contains `second`, `hour`, three alliance totals, three occupied values, three territory counts, hourly battles, hourly captures, and cumulative average battle points.
- `OverviewCurrentMetrics` contains `totalBattles`, `averageBattlePoints`, `rankChangeCount`, and `rankChangeSeconds`.
- `PlayerContributionPoint` contains player/alliance IDs, power, final AP utilization, and score accumulated through `second`.

- [ ] **Step 1: Write failing literal-fixture tests**

Create a small hand-built result with events at seconds 600, 3600, and 7200. Assert that a 3600-second cutoff yields exactly one battle, excludes later points, computes battle-only average score, groups same-second score changes before comparing alliance rank, returns stable tie order `[1,2,3]`, and produces per-tile heat counts.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/analytics/overview-analytics.test.ts --maxWorkers=1 --testTimeout=30000`

Expected: FAIL because `overview-analytics.ts` does not exist.

- [ ] **Step 3: Implement pure aggregators**

Group score events by second before rank comparison. Build hourly battle/capture buckets from `timeline`; sum only `source === "battle"` score deltas for average battle points. Sum each player's visible score events for scatter bubble size, while AP utilization remains `apSpent / max(1, apSupply)`.

- [ ] **Step 4: Run GREEN**

Run the Task 1 test and then `npm test -- tests/analytics --maxWorkers=1 --testTimeout=30000`.

---

### Task 2: Three analytical SVG charts

**Files:**
- Create: `src/components/OverviewAnalyticsCharts.tsx`
- Modify: `src/components/ReplayScoreSummary.tsx`
- Create: `tests/components/overview-analytics-charts.test.tsx`

**Interfaces:**
- Consumes the Task 1 interfaces plus `ReplaySnapshot`.
- Produces:
  - `StrategicTrendChart({ result, snapshot })` with score/value mode toggle.
  - `BattleRhythmChart({ result, snapshot })` with three current metrics in its header.
  - `PlayerContributionScatter({ result, snapshot })` with log-power x-axis, AP-utilization y-axis, score-sized bubbles, and alliance colors.

- [ ] **Step 1: Write failing component tests**

Render real chart components with the literal Task 1 fixture. Assert accessible chart names, mode controls, current cutoff text, exact three combat metrics, no future endpoint labels, and one accessible player point per player with power/AP/score in its label.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/components/overview-analytics-charts.test.tsx --maxWorkers=1 --testTimeout=30000`

Expected: FAIL because the chart module does not exist.

- [ ] **Step 3: Implement charts with shared primitives**

Use one internal SVG frame helper for plot bounds, grid lines, axes, and current-time marker. Keep labels outside dense plot regions. Reuse the existing alliance naming/color contract and preserve `PlayerScoreLedger` exports from `ReplayScoreSummary.tsx`.

- [ ] **Step 4: Run GREEN and mutation checks**

Run the focused component test. Confirm tests fail if a chart includes future points, if battle score includes occupation score, or if alliance colors are swapped.

---

### Task 3: Map visual modes

**Files:**
- Modify: `src/components/HexMapCanvasV2.tsx`
- Modify: `src/components/SimulationDashboardV2.tsx`
- Modify: `tests/components/dashboard.test.tsx`
- Create: `tests/components/hex-map-modes.test.tsx`

**Interfaces:**
- Add `export type HexMapMode = "ownership" | "battleHeat" | "tileValue"`.
- Extend map props with `mode`, `battleHeat`, and `tileValues`.
- Dashboard owns `mapMode` and supplies heat values from `tileBattleHeatAt(result, snapshot.second)` and tile values from applied scoring configuration.

- [ ] **Step 1: Write failing map-mode tests**

Assert the dashboard exposes exactly three mode buttons, changes the canvas `data-map-mode` without rerunning simulation, and retains the same replay slider value. Assert heat/value modes expose meaningful tooltip text for a controlled tile.

- [ ] **Step 2: Run RED**

Run the two focused component files and confirm missing controls/props cause the failures.

- [ ] **Step 3: Implement minimal mode drawing**

Ownership preserves current colors. Battle heat maps zero to the neutral dark fill and max visible count to a warm highlight while keeping owner outlines. Tile value uses applied normal/resource/core values and keeps owner outlines plus existing terrain glyphs where readable.

- [ ] **Step 4: Run GREEN**

Run map and dashboard tests; verify ResizeObserver and accessibility regressions remain green.

---

### Task 4: Single-screen analytical layout

**Files:**
- Modify: `src/components/SimulationDashboardV2.tsx`
- Modify: `src/components/overview-single-screen.css`
- Modify: `src/components/editorial-simulator.css`
- Modify: `tests/components/dashboard.test.tsx`
- Modify: `tests/components/editorial-layout.test.tsx`

**Interfaces:**
- First row: `overview-primary-grid` containing the map and `BattleRhythmChart`.
- Second row: `overview-analytics-grid` containing `StrategicTrendChart` and `PlayerContributionScatter`.
- Remove the standalone `overview-current-state` region.

- [ ] **Step 1: Write failing layout behavior tests**

Assert the real dashboard contains one map and exactly three analytical chart regions, has no standalone current-state aside, and the desktop computed layout uses two columns on both rows. Assert the map wrapper has a near-4:3 width/height contract and each chart has a minimum readable height.

- [ ] **Step 2: Run RED**

Run dashboard and editorial layout tests. Expected failures identify the old map/current-state/bottom-row structure.

- [ ] **Step 3: Implement layout and editorial styling**

Use a 58/42 first-row split and a 58/42 second-row split. Limit explanatory copy to titles, legends, axis labels, and metric values. Increase chart labels to at least 11px and chart plot heights to at least 190px while fitting the overview body at 1920×1080.

- [ ] **Step 4: Run focused GREEN**

Run analytics, charts, map modes, dashboard, parameter panel, and editorial layout tests.

- [ ] **Step 5: Full verification and local preview**

Run:

```powershell
npm test -- --maxWorkers=1 --testTimeout=30000
npm run lint
npm run build
npm run build:pages
npm run verify:pages
```

Refresh the existing local preview directory only after all commands pass. Do not commit or push until the user visually approves the result.
