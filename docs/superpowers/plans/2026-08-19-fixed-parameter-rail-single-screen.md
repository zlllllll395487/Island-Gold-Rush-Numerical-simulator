# Fixed Parameter Rail and Single-Screen Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wide persistent parameter editor and long overview report with a permanent category rail, an overlay editor drawer, and a compact map-led single-screen overview.

**Architecture:** `SimulationDashboardV2` owns the selected parameter group, drawer visibility, focus restoration, and draft/applied state. A new `ParameterCategoryRail` renders only the permanent 11-category index. `ParameterPanel` becomes the editor for one supplied category. Existing analytics and map components remain the data source; the overview is recomposed with existing `HexMapCanvasV2` and `ReplayScoreSummary` rather than introducing new simulation logic.

**Tech Stack:** React 19, TypeScript, CSS Grid, Vitest, Testing Library, Vinext/Vite.

## Global Constraints

- Preserve the current editorial visual language, typography hierarchy, thin dividers, restrained colors, and existing map rendering.
- Desktop category rail width is `158px`; desktop parameter drawer width is `430px`.
- Category labels and counts remain on one line.
- The drawer renders only one category and never uses `details`, `summary`, or a dropdown category selector.
- The drawer overlays results and never changes the result grid width.
- No simulation algorithm, default value, map data, or third-party dependency changes.
- Do not push to GitHub until the user approves the local preview.

---

### Task 1: Permanent Parameter Category Rail and Single-Category Editor

**Files:**
- Create: `src/components/ParameterCategoryRail.tsx`
- Modify: `src/components/ParameterPanel.tsx`
- Modify: `src/components/parameter-panel.css`
- Test: `tests/components/parameter-panel.test.tsx`
- Test: `tests/components/parameter-inspector.test.tsx`

**Interfaces:**
- Consumes: `PARAMETER_GROUPS`, `PARAMETER_CATALOG`, and `ParameterGroupId` from `src/components/parameter-catalog.ts`.
- Produces: `ParameterCategoryRail({ activeGroup, onSelect })` and `ParameterPanel({ activeGroup, draft, validation, onChange, onReset, onClose, searchInputRef })`.

- [ ] **Step 1: Write failing tests for the permanent rail and single-category editor**

Add assertions equivalent to:

```tsx
render(<ParameterCategoryRail activeGroup="population" onSelect={onSelect} />);
expect(screen.getByRole("navigation", { name: "参数分类" })).toBeInTheDocument();
expect(screen.getAllByRole("button")).toHaveLength(11);
expect(screen.getByRole("button", { name: /人口与战力/ })).toHaveAttribute("aria-current", "page");
fireEvent.click(screen.getByRole("button", { name: /士气/ }));
expect(onSelect).toHaveBeenCalledWith("morale");

render(<ParameterPanel activeGroup="population" ...props />);
expect(screen.getByRole("heading", { name: "人口与战力" })).toBeInTheDocument();
expect(screen.getByRole("table", { name: "人口与战力参数" })).toBeInTheDocument();
expect(screen.queryByLabelText("随机种子")).not.toBeInTheDocument();
expect(document.querySelector("details, summary")).toBeNull();
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```powershell
npm test -- tests/components/parameter-panel.test.tsx tests/components/parameter-inspector.test.tsx --maxWorkers=1 --testTimeout=30000
```

Expected: FAIL because `ParameterCategoryRail` does not exist and `ParameterPanel` still renders every group and its own directory.

- [ ] **Step 3: Implement `ParameterCategoryRail`**

Create a semantic navigation that maps the existing catalog metadata:

```tsx
export function ParameterCategoryRail({ activeGroup, onSelect }: {
  activeGroup: ParameterGroupId;
  onSelect: (group: ParameterGroupId) => void;
}) {
  return (
    <nav className="parameter-category-rail" aria-label="参数分类">
      <h2>参数调整</h2>
      {PARAMETER_GROUPS.map((group) => {
        const count = PARAMETER_CATALOG.filter((entry) => entry.group === group.id).length;
        return (
          <button key={group.id} type="button" aria-current={activeGroup === group.id ? "page" : undefined} onClick={() => onSelect(group.id)}>
            <span>{group.label}</span><small>{count}</small>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Convert `ParameterPanel` to one supplied category**

Add `activeGroup`, `onClose`, and `searchInputRef` props. Remove its internal category navigation and compute entries from the supplied group:

```tsx
const group = PARAMETER_GROUPS.find((candidate) => candidate.id === activeGroup)!;
const entries = PARAMETER_CATALOG.filter((entry) => entry.group === activeGroup && matchesSearch(entry, search));
```

Preserve the existing immutable path update, validation rendering, population matrix, task table, totals, reset behavior, and 120-entry catalog metadata.

- [ ] **Step 5: Style the rail and editor without wrapped category labels**

Use a `158px` rail, `white-space: nowrap`, right-aligned tabular counts, and an active `6px` accent square. Remove obsolete continuous-page group spacing while preserving the population and task table internals.

- [ ] **Step 6: Run focused tests and confirm GREEN**

Run the Step 2 command. Expected: both files pass.

- [ ] **Step 7: Commit the scoped task when Git safety authority is available**

```powershell
git add src/components/ParameterCategoryRail.tsx src/components/ParameterPanel.tsx src/components/parameter-panel.css tests/components/parameter-panel.test.tsx tests/components/parameter-inspector.test.tsx
git commit -m "feat: add permanent parameter category rail"
```

---

### Task 2: Overlay Parameter Drawer with Accessible Focus Lifecycle

**Files:**
- Modify: `src/components/SimulationDashboardV2.tsx`
- Modify: `src/components/editorial-simulator.css`
- Test: `tests/components/dashboard.test.tsx`
- Test: `tests/components/editorial-ui-contract.test.tsx`

**Interfaces:**
- Consumes: `ParameterCategoryRail`, the single-category `ParameterPanel`, and `ParameterGroupId`.
- Produces: permanent category selection plus an overlay `role="dialog"` editor with stable open/close behavior.

- [ ] **Step 1: Write failing dashboard behavior tests**

Cover these exact behaviors:

```tsx
expect(screen.getByRole("navigation", { name: "参数分类" })).toBeVisible();
expect(screen.queryByRole("dialog", { name: "人口与战力参数配置" })).not.toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: /人口与战力/ }));
expect(screen.getByRole("dialog", { name: "人口与战力参数配置" })).toBeVisible();
expect(screen.getByLabelText("低战力基础战力")).toBeVisible();
expect(screen.queryByLabelText("随机种子")).not.toBeInTheDocument();
fireEvent.click(screen.getByRole("button", { name: /士气/ }));
expect(screen.getByRole("dialog", { name: "士气参数配置" })).toBeVisible();
expect(screen.getByLabelText("士气上限")).toBeVisible();
fireEvent.keyDown(document, { key: "Escape" });
expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
```

Also assert that editing a drawer control changes `draft` but not the applied result until “运行仿真” is pressed.

- [ ] **Step 2: Run dashboard tests and confirm RED**

```powershell
npm test -- tests/components/dashboard.test.tsx tests/components/editorial-ui-contract.test.tsx --maxWorkers=1 --testTimeout=30000
```

Expected: FAIL because the existing sidebar is the editor itself and no desktop overlay dialog exists.

- [ ] **Step 3: Add dashboard state and focus restoration**

Use:

```tsx
const [activeParameterGroup, setActiveParameterGroup] = useState<ParameterGroupId>("basic");
const [parameterDrawerOpen, setParameterDrawerOpen] = useState(false);
const parameterTriggerRef = useRef<HTMLButtonElement | null>(null);
const parameterSearchRef = useRef<HTMLInputElement>(null);
```

Selecting a category records its button, updates the group, opens the drawer, and focuses the search input on the next frame. Closing through Escape, backdrop, or close button restores focus to the triggering category.

- [ ] **Step 4: Replace the wide editor sidebar with rail + overlay dialog**

Render the category rail as the first grid column. Render the drawer after the result shell:

```tsx
<aside className="parameter-editor-drawer" role="dialog" aria-modal="true" aria-label={`${group.label}参数配置`} data-open={parameterDrawerOpen}>
  <ParameterPanel activeGroup={activeParameterGroup} ... />
</aside>
```

Only mount the dialog and backdrop while open so closed inputs are absent from tab order and the accessibility tree.

- [ ] **Step 5: Implement the overlay geometry**

Set the app body grid to `158px minmax(0, 1fr)`. Position the drawer at `left: 158px`, `width: 430px`, beneath the top bar, with a restrained right shadow and translucent backdrop over results. The result column width must be identical whether the drawer is open or closed.

- [ ] **Step 6: Run the focused dashboard tests and confirm GREEN**

Run the Step 2 command. Expected: both files pass.

- [ ] **Step 7: Commit the scoped task when Git safety authority is available**

```powershell
git add src/components/SimulationDashboardV2.tsx src/components/editorial-simulator.css tests/components/dashboard.test.tsx tests/components/editorial-ui-contract.test.tsx
git commit -m "feat: open parameter categories in overlay drawer"
```

---

### Task 3: Compact Map-Led Single-Screen Overview and Responsive Verification

**Files:**
- Modify: `src/components/SimulationDashboardV2.tsx`
- Modify: `src/components/editorial-simulator.css`
- Modify: `src/components/simulator-v2.css` only if a legacy rule cannot be overridden cleanly
- Test: `tests/components/dashboard.test.tsx`
- Test: `tests/components/editorial-ui-contract.test.tsx`

**Interfaces:**
- Consumes: existing `DecisionSummary`, `HexMapCanvasV2`, `ReplayScoreSummary`, metrics, snapshots, and four-tier rows.
- Produces: a compact `overview-report` with KPI strip, reduced map/current-state row, and bottom score/power row.

- [ ] **Step 1: Write failing structural and CSS contract tests**

Assert the overview contains these ordered regions:

```tsx
const overview = screen.getByTestId("overview-report");
expect(within(overview).getByTestId("overview-map-row")).toBeInTheDocument();
expect(within(overview).getByRole("complementary", { name: "当前战况" })).toBeInTheDocument();
expect(within(overview).getByTestId("overview-bottom-row")).toContainElement(within(overview).getByLabelText("联盟积分比较"));
expect(within(overview).getByRole("heading", { name: "玩家战力分布" })).toBeInTheDocument();
```

Read the CSS asset and assert `grid-template-columns: 158px minmax(0, 1fr)`, `.parameter-editor-drawer`, and a map maximum height no greater than `430px`.

- [ ] **Step 2: Run focused tests and confirm RED**

Run the Task 2 focused command. Expected: FAIL because the overview is still a vertical map plus three long analysis cards.

- [ ] **Step 3: Recompose the overview with existing data**

Keep `DecisionSummary` as the KPI strip. Inside `overview-report`, create:

1. `overview-map-row`: reduced map figure plus “当前战况” aside.
2. `overview-bottom-row`: existing `ReplayScoreSummary` plus a compact four-tier distribution using `tierRows`.

Move the detailed strategy table and detailed behavior tables out of the overview’s first screen; keep them available in the relevant existing result tabs rather than duplicating them in the overview.

- [ ] **Step 4: Apply single-screen desktop geometry**

Use `min-height: calc(100vh - var(--topbar-height))`, a map canvas wrapper height of `min(40vh, 430px)`, a compact bottom row, and no fixed internal vertical scroller in the result column. Preserve existing serif headings, sans body text, thin rules, map colors, and square/low-radius surfaces.

- [ ] **Step 5: Add the responsive category strip and drawer behavior**

At `max-width: 900px`, convert the `158px` rail to a horizontal, single-line, overflowable category strip; position the drawer from the left viewport edge; stack map/current-state and bottom chart regions naturally. Do not hide category labels behind icons.

- [ ] **Step 6: Run all focused tests, then full verification**

```powershell
npm test -- tests/components/dashboard.test.tsx tests/components/parameter-panel.test.tsx tests/components/parameter-inspector.test.tsx tests/components/editorial-ui-contract.test.tsx --maxWorkers=1 --testTimeout=30000
npm test -- --maxWorkers=1 --testTimeout=30000
npm run lint
npm run build
npm run build:pages
npm run verify:pages
```

Expected: all commands exit 0. Known jsdom Canvas `getContext` notices may appear without failing tests.

- [ ] **Step 7: Start the local Pages preview for user acceptance**

Serve the current `dist-pages` under the repository base path and verify HTTP 200 for the page, JavaScript, and CSS. Provide the local URL to the user; do not push the branch.

- [ ] **Step 8: Commit the scoped task when Git safety authority is available**

```powershell
git add src/components/SimulationDashboardV2.tsx src/components/editorial-simulator.css src/components/simulator-v2.css tests/components/dashboard.test.tsx tests/components/editorial-ui-contract.test.tsx docs/superpowers/specs/2026-08-19-fixed-parameter-rail-single-screen-design.md docs/superpowers/plans/2026-08-19-fixed-parameter-rail-single-screen.md
git commit -m "feat: compact simulation workspace around parameter rail"
```
