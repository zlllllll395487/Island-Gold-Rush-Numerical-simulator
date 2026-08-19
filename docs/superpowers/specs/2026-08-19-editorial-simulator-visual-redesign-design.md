# Editorial Simulator Visual Redesign

## Goal

Move the simulator from a conventional dashboard aesthetic to a restrained editorial analysis workspace while preserving its full parameter-editing and simulation capabilities. The approved visual direction is the third browser mockup from the design session.

## Scope

- Redesign the existing simulator shell, parameter workspace, result sections, typography, icons, spacing, borders, and chart presentation.
- Keep the map as the single dominant visual area.
- Keep the parameter workspace permanently available on desktop and in the existing accessible drawer on compact screens.
- Keep all existing simulation behavior, parameters, validation, replay synchronization, rankings, score events, and deployment behavior.

This is a presentation and information-hierarchy change. It does not change formulas, defaults, player behavior, map data, scoring rules, or simulation performance.

## Design Principles

1. Use whitespace, indentation, alignment, and type weight before borders or filled containers.
2. Give only one area strong visual weight: the dark map canvas.
3. Present charts as report figures, not dashboard cards.
4. Use icons only for identity or section recognition. Do not add decorative icon rows.
5. Use direct functional language. Avoid slogans, promotional copy, metaphorical headings, and decorative English labels.
6. Keep the complete experience within roughly one and a half to two desktop viewport heights under typical results.

## Layout

Desktop keeps two primary zones:

- A 360-400 px persistent left workspace with a quiet category index and the current parameter editor. It scrolls independently.
- A bounded analysis document on the right. It uses a stable reading width rather than filling every available horizontal pixel.

The right workspace is ordered as follows:

1. Compact product header with simulator name, current seed, applied-state indication, and the primary run action.
2. Plain page heading such as `本局模拟结果` and a short functional description.
3. Four decision-relevant summary metrics separated by whitespace and fine rules.
4. The map replay as the dominant figure, with only a compact current-time finding column.
5. Alliance score comparison and player contribution data as the second analysis section.
6. Existing task, reward, ranking, and experiment views remain available through the current result navigation without introducing new modules.

## Parameter Workspace

The category index resembles a quiet document table of contents:

- No box around each category.
- No separator under every category.
- Generous vertical spacing and clear indentation establish grouping.
- The current category is indicated by heavier type and one small teal square.
- A single subtle structural divider may separate the category index from the editor.

The editor avoids stacked card chrome:

- Group titles use whitespace and stronger type rather than bordered containers.
- Number fields are unframed or minimally underlined only where native affordance is otherwise unclear.
- Range controls retain a thin track and visible value.
- Draft, validation, reset, search, and immutable update behavior remain unchanged.
- All catalogued parameter paths remain reachable.

## Typography

Use a three-role type system:

- Major headings and current navigation items: a high-quality Chinese serif family, weight 700.
- Body copy, controls, labels, tables, and buttons: a high-quality Chinese sans family, weights 400-600.
- Seeds, timestamps, percentages, score values, and chart axes: a restrained monospaced family, weights 400-500 with tabular figures.

Weight contrast is deliberate:

- Page title: 700.
- Section heading: 700.
- Active category and important labels: 600-700.
- Ordinary labels and table text: 500.
- Body and supporting descriptions: 400.

Do not make the entire interface bold. Hierarchy must remain visible through contrast between normal and heavy text.

## Iconography

- Add one small custom line mark beside the simulator name. It should use simple geometric strokes and one restrained teal point.
- Use a small solid teal square before selected navigation or major analysis section headings when recognition benefits from it.
- Do not use oversized illustrations, icon backgrounds, gradients, emoji, or decorative icon collections.
- Every non-decorative icon must have an accessible label; decorative marks are hidden from assistive technology.

## Color and Surfaces

- Warm off-white page background.
- Near-black green-tinted text.
- Teal as the sole interface accent.
- Stable red, blue, and gold only where alliance identity is encoded.
- Dark blue-green map canvas as the only large dark surface.
- Fine neutral rules, almost no shadow, and little or no corner radius outside actual interactive controls.

## Charts and Tables

- Charts sit directly on the page without card shadows or heavy frames.
- Use thin neutral grid lines, directly labeled endpoints, restrained series colors, and readable axis text.
- Keep the existing relative mean difference, cumulative score, and stage gain views.
- Use quiet horizontal rules for tables; avoid vertical cell borders and filled header bars.
- Preserve alliance color identity and the replay-time cutoff in every result view.

## Copy Rules

Copy must describe function or state directly.

Preferred examples:

- `本局模拟结果`
- `T+32h · 地图回放`
- `当前参数已应用`
- `查看各联盟相对整体均值的领先或落后幅度。`

Avoid examples:

- `从地图读懂战局`
- `从差异判断数值`
- `数值指挥中心`
- Decorative labels such as `Simulation report` when a Chinese functional label is sufficient.

## Interaction and Data Flow

- Category selection changes only the current parameter editor.
- Parameter edits update the draft but not the displayed results.
- `运行仿真` applies the validated draft, generates a new random run, and refreshes all result views together.
- The global replay time controls the map, score curves, territory value, and player score events consistently.
- Existing empty, loading, validation, and no-PvP states remain explicit and factual.

## Responsive Behavior

- At compact widths, the parameter workspace becomes the existing focus-managed drawer.
- The category index becomes a horizontal row above the editor or a compact vertical list within the drawer.
- Analysis sections stack into one column.
- The map remains readable and is not reduced to a thumbnail.
- Text never drops below the current accessible minimum; controls retain native keyboard behavior and focus visibility.

## Accessibility

- Preserve semantic headings, navigation landmarks, named controls, validation issue IDs, inert drawer behavior, and focus restoration.
- Maintain readable contrast for normal, muted, active, and alliance-coded text.
- Do not use color alone to communicate selected state or alliance meaning.
- Charts retain accessible names and textual numeric summaries.

## Verification

- Add structural tests for the quiet category index, single current editor, functional copy, brand mark, and section markers.
- Add CSS contract tests for typography roles, weight hierarchy, bounded reading width, restrained borders, map dominance, and responsive stacking.
- Preserve all existing parameter, dashboard, map, score replay, simulation, analytics, and deployment tests.
- Run focused component tests, the full serial Vitest suite, lint, production build, Pages build, Pages artifact verification, and the existing public-repository privacy scan.
- Perform a desktop and compact-width browser review before deployment.

## Non-goals

- No simulation-model changes.
- No new metrics, pages, chart libraries, or animation system.
- No long-form marketing page.
- No removal or hiding of existing parameter controls.
- No reproduction of another site's branding or proprietary assets.
