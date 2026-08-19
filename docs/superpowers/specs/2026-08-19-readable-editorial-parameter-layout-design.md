# Readable Editorial Parameter Workspace Design

## Goal

Improve readability and parameter-editing efficiency while preserving the map as the main analytical scene. The redesign adopts the approved editorial reference: stronger typography, restrained lines and surfaces, and a persistent category-to-editor relationship instead of a long expanding form.

## Scope

- Restyle the complete simulator workspace for stronger readability and visual consistency.
- Replace the parameter accordion stack with a fixed category navigator and a current-category editor.
- Improve the alliance score chart so close cumulative totals remain analytically distinguishable.
- Preserve simulation behavior, parameter coverage, map semantics, replay synchronization, rankings, and GitHub Pages deployment.

## Layout

Desktop uses three functional zones:

1. Product/navigation rail: simulator identity and six result-page tabs.
2. Parameter workspace: a narrow category index beside a wider editor for the selected category.
3. Analysis workspace: header, map-first results, supporting tables, and restrained charts.

The combined left workspace remains bounded so the map stays visually dominant. Only the selected parameter group renders in the editor when no search is active. Search may show matching parameters across groups, with the group name attached to each result. The editor header always shows the selected category name, a short practical description, the number of fields, and reset access.

On compact screens, the existing parameter drawer behavior remains. The category index becomes a horizontally scrollable row above the current editor, preventing a narrow two-column squeeze.

## Typography and Visual System

- Use a high-legibility Chinese sans stack for body copy and controls, with a restrained serif stack for major analytical headings and large numeric summaries.
- Raise body/control sizes from the current 9–11px range to a practical 12–13px baseline.
- Use body weights around 450–500, labels and table text around 500–550, and headings around 600.
- Increase text contrast, especially metadata, input labels, legends, and table headers.
- Retain the warm off-white editorial background, dark map canvas, teal accent, fine borders, and limited corner radius.
- Avoid decorative shadows, oversized icons, saturated panels, or dashboard-style visual noise.
- Use tabular numerals for metrics, parameters, timestamps, and rankings.

## Parameter Interaction

The parameter catalog remains the single source of truth. The panel derives category counts and visible controls from the catalog, so all 120 configurable leaves remain available.

- Selecting a category changes the editor without expanding or collapsing content.
- Draft edits retain the existing immutable update path and validation behavior.
- Invalid drafts continue to disable simulation runs.
- Reset restores the complete default draft.
- Search retains direct access to any parameter and never creates duplicate controls.
- Task rows remain compact, but labels and inputs must meet the new readable type scale.

The redesign changes presentation only; parameter meanings, ranges, scaling, and simulation wiring remain unchanged.

## Alliance Score Analysis

The alliance score card gains three modes synchronized to the global replay time:

1. Relative gap (default): each alliance total minus the three-alliance mean at each sample. A visible zero baseline reveals separation, reversals, and convergence while keeping all three series active.
2. Cumulative score: the existing absolute totals for magnitude and final-score validation.
3. Stage gain: score gained during each sampling interval, revealing momentum and burst periods.

Each mode uses the same alliance identity/color mapping as the map and rankings. Lines receive direct end labels containing the alliance name and current value or signed gap. The existing numeric totals below the chart remain absolute values in every mode, so relative views never hide real scores.

Empty or single-sample timelines render a stable zero/empty state rather than invalid axes. Relative values use a symmetric domain around zero. Stage gain starts at zero and never invents pre-simulation points.

## Components and Data Flow

- `ParameterPanel` owns selected-category and search UI state and exposes the existing draft/reset callbacks.
- The parameter catalog gains optional concise group descriptions, or a colocated description map provides them without duplicating field definitions.
- The score replay component owns chart-mode UI state and derives display series from the existing cumulative alliance timeline. It does not mutate simulation results.
- Dashboard layout and CSS provide the desktop three-zone structure and compact drawer adaptation.

## Accessibility

- Category controls use a named navigation region and `aria-current`.
- Score modes use a labeled tablist or radio group with an explicit selected state.
- Focus remains visible against the light editorial palette.
- Text contrast and font size are increased rather than relying only on color.
- Mobile drawer inert/focus behavior from the current implementation is preserved.

## Verification

- Component tests prove only the selected parameter category is rendered, category switching works, search still reaches cross-category fields, all catalog paths remain addressable, validation/reset behavior is unchanged, and compact layout semantics remain accessible.
- Score tests cover all three transforms, default relative mode, signed end values, replay cutoff synchronization, alliance color identity, zero baseline, and empty/single-sample behavior.
- Dashboard tests verify the map-first layout and absence of legacy accordion behavior.
- Run focused component tests, the complete Vitest suite, lint, Vinext build, Pages build, Pages artifact verification, and the existing privacy scan before pushing to `main`.

## Non-goals

- No simulation formula, parameter default, map geometry, ranking rule, or player behavior change.
- No new chart library or animation system.
- No return to a dense dark admin-dashboard visual style.
