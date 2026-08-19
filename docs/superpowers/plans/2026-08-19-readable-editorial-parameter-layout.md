# Readable Editorial Parameter Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a more readable editorial simulator UI with a fixed category-to-editor parameter workspace and score views that expose small alliance differences.

**Architecture:** Keep the existing simulation and catalog as data sources. Refactor `ParameterPanel` presentation state into a category navigator plus current editor, derive chart display series through pure functions in `ReplayScoreSummary`, and apply the approved visual hierarchy through scoped CSS without changing simulation results.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS, SVG, Vite/Vinext, GitHub Pages.

## Global Constraints

- Preserve all 120 configurable catalog leaves, their ranges, scaling, validation, reset behavior, and immutable draft updates.
- Preserve simulation formulas, defaults, map geometry, replay semantics, ranking rules, and player behavior.
- Keep the map as the dominant analytical scene.
- Use a 12–13px body/control baseline, 450–500 body weight, 500–550 label/table weight, and 600 heading weight.
- Do not add a chart, animation, icon, or font dependency.
- Preserve compact drawer inert and focus behavior.

---

### Task 1: Category-to-editor parameter workspace

**Files:**
- Modify: `src/components/ParameterPanel.tsx`
- Modify: `src/components/parameter-panel.css`
- Modify: `src/components/parameter-catalog.ts`
- Test: `tests/components/parameter-panel.test.tsx`
- Test: `tests/components/parameter-inspector.test.tsx`

**Interfaces:**
- Consumes: `PARAMETER_GROUPS`, `PARAMETER_CATALOG`, `ParameterGroupId`, `SimulationConfig`.
- Produces: selected category navigation with `data-testid="parameter-category-nav"`, current editor with `data-testid="parameter-category-editor"`, and a category heading/description/count derived from catalog data.

- [ ] **Step 1: Write failing category workspace tests**

Add assertions that initial render exposes exactly the basic group controls, does not render another group input, and marks the basic category current:

```tsx
expect(screen.getByTestId("parameter-category-editor")).toHaveTextContent("基础参数");
expect(screen.getByLabelText("随机种子")).toBeInTheDocument();
expect(screen.queryByLabelText("低战力玩家占比")).not.toBeInTheDocument();
expect(within(screen.getByTestId("parameter-category-nav"))
  .getByRole("button", { name: /基础参数/ })).toHaveAttribute("aria-current", "page");
```

After selecting population, assert the editor replaces rather than appends content:

```tsx
selectGroup("population");
expect(screen.getByTestId("parameter-category-editor")).toHaveTextContent("人口与战力");
expect(screen.getByLabelText("低战力玩家占比")).toBeInTheDocument();
expect(screen.queryByLabelText("随机种子")).not.toBeInTheDocument();
expect(document.querySelector("details")).toBeNull();
```

Keep the existing cross-group search, 120-leaf, input normalization, validation, reset, and task-row tests.

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
npm test -- tests/components/parameter-panel.test.tsx tests/components/parameter-inspector.test.tsx --maxWorkers=1 --testTimeout=35000
```

Expected: failures for missing category editor test IDs and legacy `details` markup.

- [ ] **Step 3: Add concise category descriptions**

Extend the group definition with a required `description` string, for example:

```ts
export interface ParameterGroup {
  id: ParameterGroupId;
  label: string;
  description: string;
}
```

Use practical copy such as “本局规模、随机性与目标时间” and “玩家数量、战力分层与编队强度”. Do not duplicate field definitions.

- [ ] **Step 4: Replace accordion rendering with the current editor**

Render the navigator independently, then render each visible group in a section instead of `details`:

```tsx
<nav data-testid="parameter-category-nav" aria-label="参数分类">...</nav>
<div className="parameter-category-editor" data-testid="parameter-category-editor">
  <header>
    <p>{activeGroupDefinition.description}</p>
    <h3>{activeGroupDefinition.label}</h3>
    <span>{entries.length} 项参数</span>
  </header>
  <div className="parameter-group__controls">...</div>
</div>
```

When search is non-empty, render matching groups as labeled result sections in the same editor column. Preserve totals beside their owning group.

- [ ] **Step 5: Implement desktop and compact parameter layout CSS**

Use a grid with a narrow category column and a wider editor:

```css
.parameter-panel {
  display: grid;
  grid-template-columns: 118px minmax(220px, 1fr);
}
.parameter-panel__header,
.parameter-search,
.parameter-validation { grid-column: 1 / -1; }
.parameter-category-editor { border-left: 1px solid var(--sidebar-border); }
```

At `max-width: 900px`, switch to one column and make the category navigator horizontally scrollable. Use 12px minimum labels/controls and visible focus styles.

- [ ] **Step 6: Run focused tests to verify GREEN**

Run the command from Step 2. Expected: all focused tests pass.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/components/ParameterPanel.tsx src/components/parameter-panel.css src/components/parameter-catalog.ts tests/components/parameter-panel.test.tsx tests/components/parameter-inspector.test.tsx
git commit -m "feat: add category parameter workspace"
```

### Task 2: Distinguishable alliance score views

**Files:**
- Modify: `src/components/ReplayScoreSummary.tsx`
- Modify: `src/components/simulator-v2.css`
- Test: `tests/components/replay-score-summary.test.tsx`
- Test: `tests/components/dashboard.test.tsx`

**Interfaces:**
- Produces: exported `ScoreViewMode = "relative" | "cumulative" | "gain"` and pure `buildScoreView(series, mode)` display transformation.
- Consumes: the unchanged `allianceScoreSeries(result)` cumulative timeline and global `ReplaySnapshot` cutoff.

- [ ] **Step 1: Write failing pure transformation tests**

Use a three-point fixture and assert:

```ts
expect(buildScoreView(series, "relative")[1].values).toEqual([-10, 0, 10]);
expect(buildScoreView(series, "cumulative")[1].values).toEqual([90, 100, 110]);
expect(buildScoreView(series, "gain")[1].values).toEqual([30, 40, 50]);
expect(buildScoreView(series.slice(0, 1), "gain")[0].values).toEqual([0, 0, 0]);
```

The relative fixture must subtract the point mean, not the current leader, so all alliances remain comparable around zero.

- [ ] **Step 2: Write failing component interaction tests**

Assert default relative mode, three labeled mode controls, zero baseline, direct end labels, and mode switching:

```tsx
expect(screen.getByRole("radio", { name: "相对均值差" })).toBeChecked();
expect(screen.getByTestId("score-zero-baseline")).toBeInTheDocument();
expect(screen.getAllByTestId(/^score-end-label-/)).toHaveLength(3);
fireEvent.click(screen.getByRole("radio", { name: "累计积分" }));
expect(screen.getByRole("img", { name: "联盟累计积分走势" })).toBeInTheDocument();
```

Keep absolute score cards below the chart unchanged in all modes and assert replay-hour synchronization after rerender.

- [ ] **Step 3: Run replay score tests to verify RED**

```bash
npm test -- tests/components/replay-score-summary.test.tsx tests/components/dashboard.test.tsx --maxWorkers=1 --testTimeout=35000
```

Expected: missing transform export, controls, baseline, and end labels.

- [ ] **Step 4: Implement pure score transformations**

Define a display point with `{ hour, values: [number, number, number] }`. For relative mode subtract the per-point mean. For cumulative copy totals. For gain subtract the previous point and return zeros for the first point.

Filter the source series to `point.hour <= snapshot.hour` for plotted lines and end labels while retaining the full-duration x-domain so replay movement remains spatially stable.

- [ ] **Step 5: Implement mode controls and SVG domains**

Use an accessible radio group. Relative mode uses `maxAbs = Math.max(1, ...abs(values))` and maps `[-maxAbs, maxAbs]` symmetrically. Cumulative and gain use zero-to-max domains. Render a zero baseline only in relative mode. Add end labels with alliance name and signed compact values.

- [ ] **Step 6: Style the restrained score controls and labels**

Use text buttons with a 1px bottom indicator, no filled dashboard pills. Keep 1.8px lines, stronger color contrast, 12px chart metadata, and direct labels that do not obscure the map-first layout.

- [ ] **Step 7: Run replay score tests to verify GREEN**

Run the command from Step 3. Expected: all focused tests pass.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/components/ReplayScoreSummary.tsx src/components/simulator-v2.css tests/components/replay-score-summary.test.tsx tests/components/dashboard.test.tsx
git commit -m "feat: add comparative alliance score views"
```

### Task 3: Readable editorial visual hierarchy

**Files:**
- Modify: `src/components/simulator-v2.css`
- Modify: `src/components/parameter-panel.css`
- Test: `tests/components/editorial-ui-contract.test.tsx`
- Test: `tests/components/dashboard.test.tsx`

**Interfaces:**
- Consumes: existing dashboard class names and Task 1 parameter layout hooks.
- Produces: readable typography tokens and a desktop layout that keeps map/results dominant.

- [ ] **Step 1: Write failing visual contract tests**

Read the CSS assets and assert explicit typography/layout contracts:

```ts
expect(styles).toMatch(/--body-size:\s*13px/);
expect(styles).toMatch(/--body-weight:\s*500/);
expect(styles).toMatch(/\.parameter-sidebar[^}]*width:\s*clamp\(390px,\s*29vw,\s*470px\)/s);
expect(styles).toMatch(/\.analysis-workspace[^}]*min-width:\s*0/s);
```

Render the dashboard and confirm the map card precedes supporting score/table content in document order and all existing navigation names remain unchanged.

- [ ] **Step 2: Run visual contract tests to verify RED**

```bash
npm test -- tests/components/editorial-ui-contract.test.tsx tests/components/dashboard.test.tsx --maxWorkers=1 --testTimeout=35000
```

Expected: missing typography variables and old 255px sidebar contract.

- [ ] **Step 3: Define readable typography tokens**

Add tokens to the simulator root:

```css
--body-size: 13px;
--body-weight: 500;
--label-size: 12px;
--label-weight: 550;
--heading-weight: 600;
```

Use a high-legibility sans stack for body/controls and the existing restrained serif stack only for major headings and large summary numbers. Replace 9–11px functional text with 12px minimum; leave only nonessential chart axis micro-labels at 10–11px.

- [ ] **Step 4: Rebalance desktop surfaces and spacing**

Set the parameter sidebar to `clamp(390px, 29vw, 470px)` and preserve `min-width: 0` on the analysis workspace. Strengthen borders and foreground contrast without adding shadows. Keep the map canvas dark and largest within its card. Use tabular numerals for metrics, tables, inputs, and rankings.

- [ ] **Step 5: Preserve responsive drawer behavior**

At the existing compact breakpoint, keep the sidebar off-canvas width bounded by the viewport and retain `inert`, `aria-hidden`, focus movement, and toggle behavior. Task 1’s category row remains horizontal in compact mode.

- [ ] **Step 6: Run visual and focused component tests to verify GREEN**

```bash
npm test -- tests/components/editorial-ui-contract.test.tsx tests/components/dashboard.test.tsx tests/components/parameter-panel.test.tsx tests/components/replay-score-summary.test.tsx --maxWorkers=1 --testTimeout=35000
```

Expected: all focused tests pass.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/components/simulator-v2.css src/components/parameter-panel.css tests/components/editorial-ui-contract.test.tsx tests/components/dashboard.test.tsx
git commit -m "style: improve simulator readability"
```

### Task 4: Final validation and public deployment

**Files:**
- Modify only if verification exposes a scoped regression.

**Interfaces:**
- Consumes: Tasks 1–3 final tree.
- Produces: verified GitHub Pages deployment from `main`.

- [ ] **Step 1: Run the complete test suite**

```bash
npm test -- --maxWorkers=1 --testTimeout=35000
```

Expected: all test files and tests pass; known jsdom Canvas notices are non-failing.

- [ ] **Step 2: Run lint and both production builds**

```bash
npm run lint
npm run build
npm run build:pages
npm run verify:pages
```

Expected: every command exits 0 and the Pages verifier reports bundled/public assets.

- [ ] **Step 3: Run repository hygiene checks**

```bash
git diff --check
git status --short
git grep -l -I -E "(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|client_secret|app_secret|access_token)" -- . ":(exclude)package-lock.json"
```

Expected: clean diff/status after commits and no real secret/internal-project matches; scan-pattern documentation matches are reviewed as non-secret text.

- [ ] **Step 4: Fast-forward deploy to main**

```bash
git fetch origin
git merge-base --is-ancestor origin/main HEAD
git push origin HEAD:main
```

Expected: ancestry check exits 0 and push is a fast-forward.

- [ ] **Step 5: Verify GitHub Actions and public assets**

Confirm the latest `Deploy GitHub Pages` run concludes `success`. Request the public URL and its emitted JS/CSS asset URLs; all must return HTTP 200 and the HTML title must be `海岛夺金 数值模拟`.
