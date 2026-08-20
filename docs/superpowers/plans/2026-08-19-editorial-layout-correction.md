# Editorial Layout Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the approved editorial workspace so a 1920×1080 desktop shows a compact 164px parameter rail, a 440px overlay editor, a fully visible map, and the complete overview without a long vertical report.

**Architecture:** Replace scattered stylesheet imports with one ordered entry stylesheet so legacy base rules cannot override the approved layout. Keep the category rail and drawer as independent components, then specialize table presentation inside the drawer and constrain the overview through explicit viewport-aware geometry.

**Tech Stack:** React, TypeScript, CSS Grid, Vitest, Testing Library, Vite/Vinext.

## Global Constraints

- Preserve the existing editorial paper, serif/sans/mono typography, restrained rules, and teal accent.
- Desktop parameter rail is exactly 164px; desktop drawer is exactly 440px and overlays the result area.
- Population and task parameters must not require horizontal scrolling in the drawer.
- The map must remain the dominant visual but be fully visible at 360px maximum desktop height.
- At 1920×1080 the overview must expose KPIs, map, current battle state, score comparison, and power distribution without a long report scroll.
- Mobile keeps the horizontal category strip and left overlay drawer.

---

### Task 1: Ordered style entry and fixed shell geometry

**Files:**
- Create: `src/components/simulation-entry.css`
- Modify: `app/page.tsx`
- Modify: `pages/main.tsx`
- Modify: `src/components/SimulationDashboardV2.tsx`
- Modify: `src/components/parameter-rail-drawer.css`
- Test: `tests/components/editorial-layout.test.tsx`

**Interfaces:**
- Consumes: existing editorial and layout stylesheets.
- Produces: one deterministic stylesheet order and desktop shell geometry.

- [ ] Write a CSS-cascade regression test that injects the real entry stylesheet and asserts the root rail custom property, two-column grid, overlay drawer width, and map-row placement.
- [ ] Run the focused test and confirm it fails because legacy editorial rules currently win.
- [ ] Import base, editorial, rail/drawer, and overview styles through `simulation-entry.css`; remove component-level layout imports.
- [ ] Set desktop tokens to `164px` and `440px`, increase rail text readability, and keep the mobile strip override.
- [ ] Run the focused test and confirm it passes.

### Task 2: Drawer-native parameter presentation

**Files:**
- Modify: `src/components/ParameterPanel.tsx`
- Modify: `src/components/parameter-rail-drawer.css`
- Test: `tests/components/parameter-inspector.test.tsx`

**Interfaces:**
- Consumes: selected parameter group and existing catalog entries.
- Produces: labeled matrix cells that can become compact cards inside the drawer.

- [ ] Add failing behavior tests requiring every population/task matrix cell to expose its visible field label and requiring no scroll-container presentation marker inside the drawer.
- [ ] Run the tests and confirm the labels/presentation are missing.
- [ ] Add `data-label` metadata to matrix cells and style population tiers/tasks as stacked cards only inside `.parameter-editor-drawer`.
- [ ] Remove horizontal overflow in the drawer while preserving table semantics and accessible labels.
- [ ] Run focused parameter tests and confirm they pass.

### Task 3: Single-screen overview geometry

**Files:**
- Modify: `src/components/overview-single-screen.css`
- Modify: `src/components/editorial-simulator.css`
- Test: `tests/components/dashboard.test.tsx`
- Test: `tests/components/editorial-layout.test.tsx`

**Interfaces:**
- Consumes: existing overview DOM (`overview-map-row`, `overview-current-state`, `overview-bottom-row`).
- Produces: a complete 360px map, fixed current-state rail, and balanced bottom analysis row.

- [ ] Add failing layout assertions for map canvas fit, map/current-state columns, bottom two-column layout, and compact decision-summary spacing.
- [ ] Run the focused tests and confirm legacy map height/grid-column rules cause failure.
- [ ] Override the canvas to fill its constrained wrapper, reset obsolete grid-column spans, widen the analysis canvas, and reduce report gaps/padding.
- [ ] Raise navigation and supporting text sizes one step without changing the editorial hierarchy.
- [ ] Run focused tests, then full tests, lint, production build, Pages build, and Pages verification.
- [ ] Refresh the local preview and verify HTML, CSS, and JavaScript return HTTP 200.
