# Editorial Simulator Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing simulator presentation as the approved restrained editorial analysis workspace without changing simulation behavior or parameter coverage.

**Architecture:** Keep the current React component and simulation boundaries. Add one isolated editorial stylesheet loaded after the legacy shell stylesheet, introduce one reusable accessible brand-mark component, simplify the parameter stylesheet, and recompose only the overview markup so the map becomes the first analytical figure. Existing draft/applied state, replay state, score transforms, tables, and result tabs remain the data source.

**Tech Stack:** React 19, TypeScript 5.9, CSS, Canvas, inline SVG, Vitest, Testing Library, Vinext, Vite, GitHub Pages.

## Global Constraints

- Do not change simulation formulas, defaults, player behavior, map data, scoring rules, or performance logic.
- Do not remove, hide, duplicate, or rename any of the 120 parameter paths.
- Keep the map as the only large dark surface and the dominant overview figure.
- Use whitespace, alignment, and typography before borders, fills, shadows, or cards.
- Use direct Chinese functional copy; do not add slogans, promotional language, metaphorical headings, emoji, or decorative English labels.
- Use serif 700 for major headings, sans 400-600 for UI text, and mono 400-500 for numeric metadata.
- Use only a small geometric brand mark and small teal square section markers.
- Preserve the existing accessible compact drawer, focus restoration, validation IDs, semantic controls, chart accessible names, and replay synchronization.
- Do not add a chart library, animation system, or proprietary reference-site asset.
- Keep desktop content within roughly 1.5-2 typical viewport heights and stack into a readable single column on compact screens.

---

### Task 1: Establish the editorial type, brand, and copy foundation

**Files:**
- Create: `src/components/SimulatorBrandMark.tsx`
- Create: `src/components/editorial-simulator.css`
- Modify: `app/page.tsx`
- Modify: `pages/main.tsx`
- Modify: `src/components/SimulationDashboardV2.tsx:223-264`
- Modify: `src/components/DecisionSummary.tsx`
- Modify: `tests/components/dashboard.test.tsx`
- Modify: `tests/components/decision-summary.test.tsx`

**Interfaces:**
- Consumes: existing `MatchMetrics`, `SimulationDashboardV2`, and the current app/page entrypoints.
- Produces: `SimulatorBrandMark(): JSX.Element`, the `.editorial-workspace` styling root, and the exact result heading `本局模拟结果` used by later tasks.

- [ ] **Step 1: Write failing semantic and copy tests**

Add these assertions to `tests/components/dashboard.test.tsx`:

```tsx
test("uses a restrained brand mark and factual result heading", () => {
  render(<SimulationDashboard />);

  expect(screen.getByTestId("simulator-brand-mark")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByRole("heading", { level: 1, name: "本局模拟结果" })).toBeInTheDocument();
  expect(screen.getByText("当前参数已应用")).toBeInTheDocument();
  expect(screen.queryByText(/从地图读懂|从差异判断|Simulation findings/i)).not.toBeInTheDocument();
});
```

Replace the heading assertions in `tests/components/decision-summary.test.tsx` with:

```tsx
const summary = screen.getByTestId("decision-summary");
expect(within(summary).getByRole("heading", { level: 1, name: "本局模拟结果" })).toBeInTheDocument();
expect(within(summary).getByText("关键指标")).toBeInTheDocument();
expect(within(summary).queryByText("Simulation findings")).not.toBeInTheDocument();
```


- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
npm test -- tests/components/dashboard.test.tsx tests/components/decision-summary.test.tsx --maxWorkers=1 --testTimeout=15000
```

Expected: failures for the missing brand mark, missing `本局模拟结果` level-one heading, and old decorative copy.

- [ ] **Step 3: Add the geometric brand component**

Create `src/components/SimulatorBrandMark.tsx`:

```tsx
export function SimulatorBrandMark() {
  return (
    <svg
      className="simulator-brand-mark"
      data-testid="simulator-brand-mark"
      viewBox="0 0 18 20"
      aria-hidden="true"
    >
      <path d="M5 14.5 8.6 3.5l4.8 13H6.8M7 10.5h5.2" />
      <circle cx="14.7" cy="4.1" r="1.35" />
    </svg>
  );
}
```

Import it in `SimulationDashboardV2.tsx` and replace the current `岛` product mark:

```tsx
<header className="product-brand">
  <SimulatorBrandMark />
  <div><strong>海岛夺金 · 数值模拟</strong><p>参数调整</p></div>
</header>
```

Add `editorial-workspace` to the existing main root:

```tsx
<main className="simulation-app editorial-workspace">
```

- [ ] **Step 4: Make the decision summary the factual page heading**

In `DecisionSummary.tsx`, keep the metric calculations and diagnosis logic, but replace the heading markup with:

```tsx
<header className="decision-summary__heading">
  <div>
    <p>关键指标</p>
    <h1>本局模拟结果</h1>
  </div>
  <span>当前参数已应用</span>
</header>
```

Keep these four summary metrics in this order: `首次有效 PvP`, `地图价值差`, `行动力浪费率`, and `积分集中度`. Move `中心争夺强度` into the map finding column in Task 3. Preserve the existing diagnosis aside and factual diagnosis strings.

- [ ] **Step 5: Create and load the editorial stylesheet foundation**

Create `src/components/editorial-simulator.css` with these initial tokens and primitives:

```css
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@500;600;700&display=swap");

.editorial-workspace {
  --paper: #f4f3ee;
  --paper-raised: #f8f7f3;
  --ink: #18211e;
  --muted-ink: #707771;
  --fine-rule: #d6d4cb;
  --editorial-accent: #079c89;
  --map-ink: #11242d;
  --font-display: "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif;
  --font-ui: "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif;
  --font-numeric: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
  --weight-display: 700;
  --weight-label: 600;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-ui);
  font-weight: 400;
}

.editorial-workspace .simulator-brand-mark {
  width: 18px;
  height: 20px;
  flex: 0 0 auto;
}

.editorial-workspace .simulator-brand-mark path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.editorial-workspace .simulator-brand-mark circle { fill: var(--editorial-accent); }
.editorial-workspace h1,
.editorial-workspace h2,
.editorial-workspace h3 { font-family: var(--font-display); font-weight: var(--weight-display); }
.editorial-workspace button,
.editorial-workspace input,
.editorial-workspace select { font-family: var(--font-ui); }
```

Import it after `simulator-v2.css` in both entrypoints:

```tsx
import "../src/components/simulator-v2.css";
import "../src/components/editorial-simulator.css";
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 2 command again.

Expected: all focused tests pass; existing metric values and simulation behavior remain unchanged.

- [ ] **Step 7: Commit Task 1**

```powershell
git add -- app/page.tsx pages/main.tsx src/components/SimulatorBrandMark.tsx src/components/editorial-simulator.css src/components/SimulationDashboardV2.tsx src/components/DecisionSummary.tsx tests/components/dashboard.test.tsx tests/components/decision-summary.test.tsx
git diff --cached --check
git commit -m "feat: establish editorial simulator identity"
```

---

### Task 2: Replace parameter chrome with a quiet category and editor workspace

**Files:**
- Modify: `src/components/ParameterPanel.tsx:231-323`
- Rewrite: `src/components/parameter-panel.css`
- Modify: `tests/components/parameter-inspector.test.tsx`
- Modify: `tests/components/parameter-panel.test.tsx`

**Interfaces:**
- Consumes: existing `ParameterPanelProps`, `PARAMETER_GROUPS`, `PARAMETER_CATALOG`, validation issues, and immutable path-update callbacks.
- Produces: the same `ParameterPanel` public interface, plus `data-variant="editorial"` and the approved quiet category/editor visual contract.

- [ ] **Step 1: Write a failing parameter-workspace behavior test**

Add to `tests/components/parameter-inspector.test.tsx`:

```tsx
test("marks the parameter workspace as editorial without adding category chrome", () => {
  render(
    <ParameterPanel
      draft={structuredClone(DEFAULT_CONFIG)}
      validation={[]}
      onChange={vi.fn()}
      onReset={vi.fn()}
    />,
  );

  expect(screen.getByTestId("parameter-panel")).toHaveAttribute("data-variant", "editorial");
  const nav = screen.getByTestId("parameter-category-nav");
  expect(within(nav).getByRole("button", { name: /基础参数/ })).toHaveAttribute("aria-current", "page");
  expect(document.querySelector("details, summary")).toBeNull();
});
```


- [ ] **Step 2: Run parameter tests and verify RED**

```powershell
npm test -- tests/components/parameter-inspector.test.tsx tests/components/parameter-panel.test.tsx --maxWorkers=1 --testTimeout=15000
```

Expected: a failure for the missing `data-variant`; all existing category, search, reset, validation, and immutable-update behavior remains green.

- [ ] **Step 3: Add the stable variant hook without changing behavior**

Change the root of `ParameterPanel.tsx` to:

```tsx
<section
  className="parameter-panel"
  data-layout="vertical"
  data-variant="editorial"
  data-testid="parameter-panel"
>
```

Do not change search, category selection, task rows, validation, total checks, reset, or `onChange` calls.

- [ ] **Step 4: Rewrite the parameter stylesheet around whitespace**

Replace `parameter-panel.css` with selectors that retain existing control layout while using this structural foundation:

```css
.parameter-panel {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  align-content: start;
  column-gap: 0;
}

.parameter-panel__header,
.parameter-search,
.parameter-validation,
.parameter-search-results,
.parameter-empty { grid-column: 1 / -1; }

.parameter-chapter-index {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 28px 20px 44px;
}

.parameter-chapter-index button {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px 8px;
  border: 0;
  padding: 12px 4px 12px 20px;
  background: transparent;
  color: var(--muted-ink);
  text-align: left;
}

.parameter-chapter-index button[aria-current="page"] {
  color: var(--ink);
  font-weight: 700;
}

.parameter-chapter-index button[aria-current="page"]::before {
  position: absolute;
  top: 17px;
  left: 0;
  width: 9px;
  height: 9px;
  content: "";
  background: var(--editorial-accent);
}

.parameter-panel__groups {
  min-width: 0;
  border-left: 1px solid var(--fine-rule);
  padding: 34px 24px 52px;
}

.parameter-group { border: 0; background: transparent; }
.parameter-group__header { margin-bottom: 30px; }
.parameter-group__controls { display: grid; gap: 24px; }
.parameter-control input[type="number"],
.parameter-control input[type="text"],
.parameter-control select {
  border: 0;
  border-bottom: 1px solid var(--fine-rule);
  border-radius: 0;
  background: transparent;
}
```

Re-add the existing native-input sizing, range styling, compact task-row grid, validation colors, and total-state styles after this foundation. Do not reduce text below 11 px.

- [ ] **Step 5: Add the compact category-row adaptation**

```css
@media (max-width: 900px) {
  .parameter-panel { grid-template-columns: minmax(0, 1fr); }
  .parameter-chapter-index {
    grid-auto-flow: column;
    grid-auto-columns: minmax(118px, 1fr);
    overflow-x: auto;
    padding: 16px 0 22px;
  }
  .parameter-panel__groups {
    grid-column: 1;
    border-top: 1px solid var(--fine-rule);
    border-left: 0;
    padding: 28px 0 42px;
  }
}
```

- [ ] **Step 6: Run focused and catalog-integrity tests**

Run:

```powershell
npm test -- tests/components/parameter-inspector.test.tsx tests/components/parameter-panel.test.tsx tests/domain/config.test.ts --maxWorkers=1 --testTimeout=15000
```

Expected: all tests pass, including 120-path coverage, native validity, exact value re-entry, search, reset, validation, and immutable draft updates.

- [ ] **Step 7: Commit Task 2**

```powershell
git add -- src/components/ParameterPanel.tsx src/components/parameter-panel.css tests/components/parameter-inspector.test.tsx tests/components/parameter-panel.test.tsx
git diff --cached --check
git commit -m "style: simplify parameter workspace"
```

---

### Task 3: Recompose the overview around the map and factual findings

**Files:**
- Modify: `src/components/SimulationDashboardV2.tsx:250-298`
- Modify: `src/components/editorial-simulator.css`
- Modify: `tests/components/dashboard.test.tsx`


**Interfaces:**
- Consumes: existing `snapshot`, `metrics`, `workload`, `centerShareByActivity`, `centerShareByPower`, `tierRows`, and replay state.
- Produces: `.overview-report`, `.overview-map-figure`, `.map-findings`, and `.overview-supporting-analysis`; later score and table styling targets these classes.

- [ ] **Step 1: Write the failing map-order and copy tests**

Add to `dashboard.test.tsx`:

```tsx
test("places the synchronized map before supporting overview analysis", () => {
  const { container } = render(<SimulationDashboard />);
  const overview = screen.getByTestId("overview-report");
  const map = within(overview).getByRole("heading", { name: /地图回放/ }).closest("section")!;
  const strategy = within(overview).getByRole("heading", { name: "策略分布与实际表现" }).closest("section")!;

  expect(map).toHaveClass("overview-map-figure");
  expect(map.compareDocumentPosition(strategy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(container.querySelector(".overview-map-figure .map-canvas-wrap")).toBeInTheDocument();
  expect(screen.queryByText(/共用同一实验上下文|唯一强视觉|读懂战局/)).not.toBeInTheDocument();
});
```


- [ ] **Step 2: Run dashboard tests and verify RED**

```powershell
npm test -- tests/components/dashboard.test.tsx --maxWorkers=1 --testTimeout=15000
```

Expected: missing `overview-report` and the map still appears after supporting tables.

- [ ] **Step 3: Reorder overview markup without changing data**

Change the overview wrapper and place the existing map section first:

```tsx
<div className="overview-report" data-testid="overview-report">
  <section className="overview-map-figure map-panel map-plate-primary">
    <header className="figure-heading">
      <div><p>地图回放</p><h2>T+{snapshot.hour.toFixed(0)}h · 地图回放</h2></div>
      <span>{snapshot.activeBattles} 场交战 · {snapshot.contestedTiles} 个争夺地格</span>
    </header>
    <div className="map-figure-layout">
      <div>
        <HexMapCanvasV2 map={MAP} snapshot={snapshot} />
      </div>
      <aside className="map-findings" aria-label="当前时刻指标">
        <h3>当前时刻</h3>
        <p><strong>{percent(metrics.centerContestIntensity.score)}</strong><span>中心争夺强度</span></p>
        <p><strong>{metrics.centerContestIntensity.battles}</strong><span>中心战斗</span></p>
        <p><strong>{metrics.centerContestIntensity.captures}</strong><span>中心易手</span></p>
      </aside>
    </div>
  </section>

  <div className="overview-supporting-analysis">
    {strategyAnalysis}
    {powerAnalysis}
    {tendencyAnalysis}
  </div>
</div>
```

Move the existing replay timeline, workload summary, and map legend directly below the map canvas inside the first column. Move the existing strategy table, power table, tendency section, and the single existing `ReplayScoreSummary` instance into `overview-supporting-analysis` without changing their data or behavior. The names in the structural example stand for the existing JSX blocks; do not introduce placeholder variables. Do not recalculate any metric or duplicate the score summary.

- [ ] **Step 4: Add bounded editorial layout and map dominance**

Append to `editorial-simulator.css`:

```css
.editorial-workspace {
  grid-template-columns: clamp(360px, 27vw, 400px) minmax(0, 1fr);
}

.editorial-workspace .analysis-shell { min-width: 0; background: var(--paper); }
.editorial-workspace .analysis-workspace {
  width: min(100%, 1180px);
  max-width: 1180px;
  margin: 0 auto;
  padding: 40px clamp(28px, 5vw, 72px) 72px;
}

.editorial-workspace .overview-report { display: grid; gap: 54px; }
.editorial-workspace .overview-map-figure { grid-column: 1 / -1; }
.editorial-workspace .figure-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 24px;
  margin-bottom: 14px;
}
.editorial-workspace .figure-heading h2,
.editorial-workspace .overview-supporting-analysis h2 {
  display: flex;
  align-items: center;
  gap: 10px;
}
.editorial-workspace .figure-heading h2::before,
.editorial-workspace .overview-supporting-analysis h2::before {
  width: 8px;
  height: 8px;
  content: "";
  background: var(--editorial-accent);
}
.editorial-workspace .map-figure-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  border-top: 1px solid var(--fine-rule);
  border-bottom: 1px solid var(--fine-rule);
}
.editorial-workspace .map-canvas-wrap { min-height: 460px; background: var(--map-ink); }
.editorial-workspace .map-findings { padding: 28px 0 28px 28px; }
.editorial-workspace .overview-supporting-analysis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 44px;
}
```

- [ ] **Step 5: Run dashboard, map, and score synchronization tests**

```powershell
npm test -- tests/components/dashboard.test.tsx tests/components/decision-summary.test.tsx tests/components/replay-score-summary.test.tsx --maxWorkers=1 --testTimeout=15000
```

Expected: map-first order passes, the ResizeObserver map test still passes, replay time still updates the map and score view, and player ledger access remains intact.

- [ ] **Step 6: Commit Task 3**

```powershell
git add -- src/components/SimulationDashboardV2.tsx src/components/editorial-simulator.css tests/components/dashboard.test.tsx
git diff --cached --check
git commit -m "feat: make map the primary analysis figure"
```

---

### Task 4: Convert charts, tables, and result sections from cards to report figures

**Files:**
- Modify: `src/components/ReplayScoreSummary.tsx:90-176`
- Modify: `src/components/editorial-simulator.css`
- Modify: `tests/components/replay-score-summary.test.tsx`


**Interfaces:**
- Consumes: `buildScoreView`, existing alliance series/color mapping, replay cutoff, score mode state, and existing result tables.
- Produces: `data-mode` on `.score-replay-summary`, a factual score figure caption, and unframed report-table styling. No score-transform signature changes.

- [ ] **Step 1: Write a failing semantic figure-state test**

Add to `replay-score-summary.test.tsx`:

```tsx
test("exposes the active score mode as a report figure state", () => {
  render(<ReplayScoreSummary result={result} snapshot={snapshots[1]} />);
  const figure = screen.getByRole("figure", { name: "联盟积分比较" });
  expect(figure).toHaveAttribute("data-mode", "relative");
  expect(within(figure).getByText("联盟积分比较")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: "阶段增量" }));
  expect(figure).toHaveAttribute("data-mode", "gain");
});
```

- [ ] **Step 2: Run score and contract tests to verify RED**

```powershell
npm test -- tests/components/replay-score-summary.test.tsx --maxWorkers=1 --testTimeout=15000
```

Expected: score root is not yet an accessible figure and does not expose the active mode.

- [ ] **Step 3: Give the score summary figure semantics without changing transforms**

Change the root of `ReplayScoreSummary` to:

```tsx
<figure
  className="score-replay-summary"
  data-mode={mode}
  aria-label="联盟积分比较"
>
  <figcaption className="score-replay-title">
    <div><p>积分变化</p><h2>联盟积分比较</h2></div>
    <span data-testid="score-replay-hour">T+{snapshot.hour.toFixed(0)}h</span>
  </figcaption>
  {scoreViewControlsAndChart}
</figure>
```

The structural example stands for the existing radio group, SVG, absolute totals, occupied values, and ledger; move that JSX inside the figure without introducing a placeholder variable. Keep alliance 1 red, alliance 2 blue, and alliance 3 gold. Keep the replay cutoff for both chart series and player ledger totals. Keep direct endpoint labels and the relative zero baseline.

- [ ] **Step 4: Add report-figure, table, and control styling**

Append:

```css
.editorial-workspace .analysis-card,
.editorial-workspace .result-card,
.editorial-workspace .alliance-ranking article {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.editorial-workspace .score-replay-summary { margin: 0; border-top: 1px solid var(--fine-rule); padding-top: 18px; }
.editorial-workspace .score-view-switch { border: 0; padding: 0; }
.editorial-workspace .score-view-switch label { background: transparent; }
.editorial-workspace .score-sparkline { width: 100%; overflow: visible; }
.editorial-workspace .score-chart-grid { stroke: var(--fine-rule); stroke-width: 1; }
.editorial-workspace .score-zero-baseline { stroke: var(--ink); stroke-width: 1; }
.editorial-workspace .score-end-label { fill: var(--ink); font-family: var(--font-ui); font-weight: 600; }

.editorial-workspace table { width: 100%; border-collapse: collapse; background: transparent; }
.editorial-workspace th,
.editorial-workspace td { border: 0; border-bottom: 1px solid var(--fine-rule); padding: 12px 8px; }
.editorial-workspace thead th { background: transparent; color: var(--muted-ink); font-weight: 600; }
.editorial-workspace td,
.editorial-workspace .score-current-grid b,
.editorial-workspace .alliance-ranking strong { font-family: var(--font-numeric); font-variant-numeric: tabular-nums; }
```

Retain alliance colors only on paths, dots, and direct identity marks. Do not color axis labels or entire table rows.

- [ ] **Step 5: Run all result-component tests**

```powershell
npm test -- tests/components/replay-score-summary.test.tsx tests/components/dashboard.test.tsx tests/components/decision-summary.test.tsx --maxWorkers=1 --testTimeout=15000
```

Expected: all tests pass, all three score modes work, endpoint labels preserve identity, and T+0 ledger totals remain zero. Verify the no-card presentation manually in the browser during Task 5.

- [ ] **Step 6: Commit Task 4**

```powershell
git add -- src/components/ReplayScoreSummary.tsx src/components/editorial-simulator.css tests/components/replay-score-summary.test.tsx
git diff --cached --check
git commit -m "style: present results as editorial figures"
```

---

### Task 5: Complete responsive behavior, integration verification, privacy checks, and deployment readiness

**Files:**
- Modify: `src/components/editorial-simulator.css`
- Modify only if verification exposes a real regression: the directly responsible component or test file.

**Interfaces:**
- Consumes: the existing `(max-width: 900px)` compact-layout state, drawer inert/focus contract, map ResizeObserver, and all Task 1-4 class hooks.
- Produces: the final responsive editorial workspace and a deployment-ready verified tree.

- [ ] **Step 1: Confirm the compact-layout regression baseline**

Run:

```powershell
npm test -- tests/components/dashboard.test.tsx --maxWorkers=1 --testTimeout=15000
```

Expected: the existing compact drawer test is green and proves the closed drawer is inert, hidden from assistive technology, and restores focus correctly. Responsive CSS is visual behavior and will be verified in real browser widths rather than by matching stylesheet source text.
- [ ] **Step 2: Add the final responsive rules**

Append:

```css
@media (max-width: 900px) {
  .editorial-workspace { grid-template-columns: minmax(0, 1fr); }
  .editorial-workspace .analysis-workspace { width: 100%; padding: 32px 22px 56px; }
  .editorial-workspace .map-figure-layout,
  .editorial-workspace .overview-supporting-analysis,
  .editorial-workspace .content-grid,
  .editorial-workspace .ranking-layout { grid-template-columns: minmax(0, 1fr); }
  .editorial-workspace .map-findings {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    padding: 24px 0 0;
  }
  .editorial-workspace .map-canvas-wrap { min-height: 360px; }
}

@media (max-width: 560px) {
  .editorial-workspace .decision-summary__metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .editorial-workspace .map-findings { grid-template-columns: minmax(0, 1fr); }
  .editorial-workspace .figure-heading { align-items: start; flex-direction: column; }
}
```

Do not change the React drawer state or focus code unless its existing test fails.

- [ ] **Step 3: Run focused behavior and accessibility verification**

```powershell
npm test -- tests/components/dashboard.test.tsx tests/components/parameter-inspector.test.tsx tests/components/parameter-panel.test.tsx tests/components/decision-summary.test.tsx tests/components/replay-score-summary.test.tsx --maxWorkers=1 --testTimeout=15000
```

Expected: all focused component, compact drawer, map resize, replay, and score ledger tests pass.

- [ ] **Step 4: Run the complete test suite**

```powershell
npm test -- --maxWorkers=1 --testTimeout=15000
```

Expected: every test file and test passes. Known jsdom canvas not-implemented notices may appear, but there must be no assertion or timeout failure.

- [ ] **Step 5: Run lint and both production builds**

```powershell
npm run lint
npm run build
npm run build:pages
npm run verify:pages
```

Expected: all commands exit 0; the Pages verifier reports bundled assets and public assets successfully.

- [ ] **Step 6: Run public-repository privacy and diff checks**

```powershell
git diff --check
git grep -l -I -E "(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|client_secret|app_secret|access_token)" -- . ":(exclude)package-lock.json"
rg -n -i "C:/Users|C:\\Users|feishu\.cn|TileRushBot|BALL|ballclient" --glob "!node_modules/**" --glob "!dist*/**" --glob "!docs/superpowers/**" .
```

Expected: `git diff --check` is clean. Credential scan returns no real secret. Internal-name scan returns no public product/source match; documentation exclusions are intentional.

- [ ] **Step 7: Perform browser review at desktop and compact widths**

Run:

```powershell
npm run dev
```

Verify at approximately 1440 px and 390 px widths:

- Serif 700 title and section hierarchy are visibly distinct from normal body copy.
- The geometric brand mark is crisp and no larger than adjacent brand text.
- Parameter categories have no repeated boxes or separator lines; active state uses one teal square.
- The map is the only large dark surface and remains larger than any individual table or chart.
- No slogan or decorative English label appears.
- Score labels do not overlap and all three modes remain usable.
- Compact drawer opens, closes, hides, and restores focus correctly.

Expected: no clipping, overlap, unreadable text, or unexpected horizontal page scroll.

- [ ] **Step 8: Commit Task 5**

```powershell
git add -- src/components/editorial-simulator.css
git diff --cached --check
git commit -m "fix: complete editorial workspace responsiveness"
```

- [ ] **Step 9: Confirm the final branch state**

```powershell
git status --short
git log -6 --oneline
```

Expected: clean worktree and the Task 1-5 commits appear in order after the approved design commit.





