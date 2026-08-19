# Continuous Parameter Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move global navigation into a fixed top bar, render all simulation parameters as one continuous structured document, and keep result content visible in a map-led block layout without collapsible sections.

**Architecture:** `SimulationDashboardV2` owns the global top bar and the analysis view. `ParameterPanel` remains the only configuration editor, but changes from active-category switching to an anchored continuous document with specialized population and task tables. Existing catalog paths and immutable update functions remain the data contract.

**Tech Stack:** React 19, TypeScript, CSS, Testing Library, Vitest, Vinext/Vite.

## Global Constraints

- Preserve all 120 catalog paths and existing configuration semantics.
- Do not introduce `details`, `summary`, accordion, dropdown, or hidden result sections.
- Keep the map as the only large dark surface and the dominant result block.
- Use concise factual Chinese copy only.
- Preserve search, validation, reset, random run, seed reproduction, replay, ranking, and batch functions.
- Desktop parameter layout is left index plus right continuous document; narrow screens use a horizontal anchor index plus a single-column document.

---

### Task 1: Move global navigation into a top bar

**Files:**
- Modify: `src/components/SimulationDashboardV2.tsx`
- Modify: `src/components/editorial-simulator.css`
- Test: `tests/components/dashboard.test.tsx`
- Test: `tests/components/editorial-ui-contract.test.tsx`

**Interfaces:**
- Consumes: `TABS`, `tab`, `setTab`, `runSingle`, `drawerOpen`, `compactLayout`.
- Produces: `.simulation-topbar`, `.simulation-topbar__tabs`, `.simulation-topbar__actions`; the sidebar contains only `ParameterPanel`.

- [ ] **Step 1: Write the failing top-bar tests**

```tsx
const topbar = screen.getByRole("banner", { name: "模拟器导航" });
expect(within(topbar).getByText("海岛夺金 · 数值模拟")).toBeInTheDocument();
expect(within(topbar).getAllByRole("tab")).toHaveLength(6);
expect(within(screen.getByTestId("parameter-sidebar")).queryByRole("tab")).toBeNull();
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/components/dashboard.test.tsx tests/components/editorial-ui-contract.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because no `banner` named `模拟器导航` exists and tabs still live in the sidebar.

- [ ] **Step 3: Implement the top bar**

Move the existing brand, six tab buttons, applied-seed state, reproduce button, and run button into:

```tsx
<header className="simulation-topbar" aria-label="模拟器导航">
  <div className="simulation-topbar__brand">…</div>
  <div className="simulation-topbar__tabs" role="tablist" aria-label="分析页面">…</div>
  <div className="simulation-topbar__actions">…</div>
</header>
```

Keep the compact parameter drawer toggle separate and remove product/navigation markup from `.parameter-sidebar`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: both files PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SimulationDashboardV2.tsx src/components/editorial-simulator.css tests/components/dashboard.test.tsx tests/components/editorial-ui-contract.test.tsx
git commit -m "feat: move simulator navigation to top bar"
```

### Task 2: Render all parameter chapters as one continuous document

**Files:**
- Modify: `src/components/ParameterPanel.tsx`
- Modify: `src/components/parameter-panel.css`
- Test: `tests/components/parameter-panel.test.tsx`
- Test: `tests/components/editorial-ui-contract.test.tsx`

**Interfaces:**
- Consumes: `PARAMETER_GROUPS`, `PARAMETER_CATALOG`, `getParameterValue`, `updateParameterValue`, `normalizeParameterInput`.
- Produces: chapter section ids `parameter-section-${group.id}` and anchor links/buttons with `aria-controls` pointing to those ids.

- [ ] **Step 1: Write failing continuous-document tests**

```tsx
expect(screen.getAllByTestId(/^parameter-section-/)).toHaveLength(11);
expect(screen.getByTestId("parameter-section-basic")).toBeVisible();
expect(screen.getByTestId("parameter-section-tasksRewards")).toBeVisible();
expect(document.querySelector("details, summary")).toBeNull();
```

Add a test that stubs `HTMLElement.prototype.scrollIntoView`, clicks “任务与奖励”, and expects the `tasksRewards` section to receive `{ behavior: "smooth", block: "start" }`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/components/parameter-panel.test.tsx tests/components/editorial-ui-contract.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because only the active chapter is currently rendered.

- [ ] **Step 3: Implement continuous rendering and anchors**

Remove `activeGroup` filtering. Build `visibleByGroup` from every group, filtering entries only when `normalizedQuery` is non-empty. Render each matching group as:

```tsx
<section id={`parameter-section-${group.id}`} data-testid={`parameter-section-${group.id}`} className="parameter-group">
  …
</section>
```

Category buttons call `document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })`. Use an `IntersectionObserver` when available to update `aria-current`; keep `basic` as the deterministic fallback in tests and unsupported browsers.

- [ ] **Step 4: Refine continuous document CSS**

Make `.parameter-panel__body` a two-column grid with a 132px sticky index and a wide document. Remove chapter outer borders. Use section spacing plus a single top divider. Make `.parameter-panel__groups` the only independently scrolling region on desktop.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: both files PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ParameterPanel.tsx src/components/parameter-panel.css tests/components/parameter-panel.test.tsx tests/components/editorial-ui-contract.test.tsx
git commit -m "feat: render continuous parameter chapters"
```

### Task 3: Structure population and task parameters as readable tables

**Files:**
- Modify: `src/components/ParameterPanel.tsx`
- Modify: `src/components/parameter-panel.css`
- Test: `tests/components/parameter-panel.test.tsx`

**Interfaces:**
- Consumes: catalog entries whose paths start with `population.` and indexed paths under `tasks.thresholds`, `tasks.targetCoverage`, and `rewards.taskValues`.
- Produces: `role="table"` regions named `人口与战力参数` and `任务参数`; all controls retain their catalog labels.

- [ ] **Step 1: Write failing semantic table tests**

```tsx
const populationTable = screen.getByRole("table", { name: "人口与战力参数" });
expect(within(populationTable).getAllByRole("row")).toHaveLength(5);
const taskTable = screen.getByRole("table", { name: "任务参数" });
expect(within(taskTable).getAllByRole("row")).toHaveLength(11);
expect(screen.getByLabelText("超高战力普通编队强度")).toBeInTheDocument();
expect(screen.getByLabelText("任务 10 奖励值")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/components/parameter-panel.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: FAIL because both groups are generic control grids rather than semantic tables.

- [ ] **Step 3: Add reusable control rendering**

Extract the existing label/input/select/range markup into a local `renderControl(entry, compactMode)` function so generic chapters and tables share the same `onChange`, normalization, scale, min/max/step, and validation behavior.

- [ ] **Step 4: Render the population matrix**

Use four tier rows (`low`, `mid`, `high`, `super`) and five catalog columns (`powerShares`, `basePower`, `powerSigma`, `mainFormationCounts`, `weakFormationScale`). Render any remaining population controls below the matrix as ordinary horizontal rows.

- [ ] **Step 5: Render the task table**

Use ten task rows and columns for threshold, target coverage, and reward value. Render reward tier shares and reward multiplier below the task table as ordinary horizontal rows.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: PASS, including all immutable update, bounds, search, and validation tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/ParameterPanel.tsx src/components/parameter-panel.css tests/components/parameter-panel.test.tsx
git commit -m "style: organize parameter matrices and task table"
```

### Task 4: Complete block layout and responsive behavior

**Files:**
- Modify: `src/components/editorial-simulator.css`
- Modify: `src/components/parameter-panel.css`
- Test: `tests/components/dashboard.test.tsx`
- Test: `tests/components/editorial-ui-contract.test.tsx`

**Interfaces:**
- Consumes: existing `.overview-map-figure`, `.overview-supporting-analysis`, `.analysis-card`, `.simulation-topbar`, and continuous parameter section classes.
- Produces: a map-led block grid with no collapsible content and responsive top navigation/parameter anchors.

- [ ] **Step 1: Write failing result-layout contract tests**

```tsx
expect(screen.getByTestId("overview-report").firstElementChild).toHaveClass("overview-map-figure");
expect(screen.getByRole("banner", { name: "模拟器导航" })).toBeInTheDocument();
expect(container.querySelector("details, summary")).toBeNull();
expect(screen.getAllByTestId(/^parameter-section-/)).toHaveLength(11);
```

Add DOM assertions for the map block plus at least three visible supporting analysis blocks.

- [ ] **Step 2: Run focused tests and verify RED if any contract is missing**

Run: `npm test -- tests/components/dashboard.test.tsx tests/components/editorial-ui-contract.test.tsx --maxWorkers=1 --testTimeout=15000`

Expected: any missing block semantics fail before CSS finalization; existing map-first assertions remain green.

- [ ] **Step 3: Implement final responsive CSS**

Desktop: fixed top bar, parameter sidebar below it, wide continuous editor, map-led result grid. At `max-width: 900px`, make top tabs horizontally scrollable and category anchors a horizontal strip. At `max-width: 640px`, use single-column parameter rows and horizontally scrollable tables without hiding controls.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
npm test -- tests/components/dashboard.test.tsx tests/components/parameter-panel.test.tsx tests/components/editorial-ui-contract.test.tsx --maxWorkers=1 --testTimeout=15000
npm test -- --maxWorkers=1 --testTimeout=15000
npm run lint
npm run build
npm run build:pages
npm run verify:pages
```

Expected: all commands exit 0; only the known jsdom canvas notice may appear.

- [ ] **Step 5: Commit**

```bash
git add src/components/editorial-simulator.css src/components/parameter-panel.css tests/components/dashboard.test.tsx tests/components/editorial-ui-contract.test.tsx
git commit -m "fix: complete continuous workspace layout"
```
