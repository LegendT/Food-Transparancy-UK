---
phase: 03a-core-entity-pages-trust-rendering
plan: 02
subsystem: ui
tags: [nunjucks, cube-css, eleventy, trust-rendering, wcag, accessibility]

# Dependency graph
requires:
  - phase: 03a-01
    provides: factState render boundary, reverse indices, entity data cascade
  - phase: 02
    provides: deriveVerificationState, the seven derived verification states, contested positions shape
provides:
  - factCell inline macro (table-cell renderer, spans only, gates on factState, R-31-safe)
  - contested branch that resolves each position's OWN sources via findBy (VRFY-11 render half, F6)
  - locked state accent-bar CSS (withheld grey, stale amber, contested blue) via a single [data-state^="withheld"] rule
  - nutrition-table and allergen-list CSS primitives (320px reflow, red as bar/border second cue only)
  - unit test pinning contested positions carry their sources across the render boundary
affects: [03a-03, 03a-04, 03a-05, product-page-template, ingredient-page-template]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline table-cell renderer lives INSIDE macros.njk (the sole check-render-safety allowlisted path); it is not a second render path"
    - "All four withheld sub-states caught by one [data-state^=\"withheld\"] prefix selector so no sub-state falls through to the confirmed treatment"
    - "State colour is always a SECOND cue to a mandatory text label; accent bars use border-inline-start (logical property)"

key-files:
  created: []
  modified:
    - src/_includes/components/macros.njk
    - src/assets/styles.css
    - test/render-state.test.js

key-decisions:
  - "factCell emits spans only and never a <details>, so it is valid inside a <td> and never leaks a withheld or contested value"
  - "Contested positions resolve their own sources with the disclosure loop's findBy + s.url ? <a rel=noopener> : text idiom, per position"
  - "Locked palette applied verbatim: withheld #505a5f, stale amber #b45309, contested #1d70b8, allergen red #d4351c bar/border only"

patterns-established:
  - "Table-cell fact rendering: factCell(fact, sources, unit, entityType) gating on factState, spans only"
  - "State treatment by data-state attribute on the .fact card, withheld matched by prefix"

requirements-completed: [VRFY-11, VRFY-12, PROD-01]

# Metrics
duration: 12min
completed: 2026-07-01
---

# Phase 03a Plan 02: Trust-Rendering Primitives Summary

**An inline factCell table-cell renderer, a contested branch that shows both sides with their own resolved sources, and the locked state accent-bar / nutrition-table / allergen-list CSS, all render-safe inside the single sanctioned macro.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-01
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added the `factCell(fact, sources, unit, entityType)` macro inside `macros.njk`: it mirrors the `sourcedValue` state gate (derives `d = fact | factState(...)`) but emits only spans and never a `<details>`, so it is valid in a `<td>` and exposes `d.value` only when the fact publishes. R-31 stays intact because it lives in the sole allowlisted renderer.
- Extended the contested branch to render each position with its OWN resolved sources (VRFY-11 render half, F6), reusing the disclosure loop's `findBy` + `s.url ? <a rel="noopener"> : text` idiom per position. The "Contested; sources disagree:" label stays a `<span>`, not a heading (UI-SPEC G4).
- Added the locked state accent-bar CSS: a single `[data-state^="withheld"]` rule (grey `#505a5f` bar + dashed border) catches all four withheld sub-states; stale amber `#b45309`, contested blue `#1d70b8`; allergen red `#d4351c` as a bar/border second cue only. Every cue pairs with a text label.
- Added the nutrition-table pattern (real `<table>`, `#f3f2f1` header/zebra, 320px reflow, no cell `nowrap`) and the allergen-list block (black text, red bar as second cue).
- Pinned a unit test asserting a contested projection carries each position's own `sources` array to the render boundary.

## Task Commits

Each task was committed atomically:

1. **Task 1: inline factCell macro + per-position contested sources** - `aafcd8a` (feat)
2. **Task 2: state accent-bar, nutrition-table, allergen-list CSS + unit test** - `5ba3edb` (feat)

**Plan metadata:** committed with this SUMMARY (docs)

## Files Created/Modified
- `src/_includes/components/macros.njk` - Added `factCell` inline macro; extended the contested branch to resolve per-position sources via `findBy`.
- `src/assets/styles.css` - State accent bars keyed on `data-state`, inline cell classes, nutrition-table and allergen-list blocks, using only the locked palette.
- `test/render-state.test.js` - New assertion that contested positions carry their own sources across the boundary (VRFY-11 render-half floor).

## Decisions Made
- None beyond the plan. factCell body and the contested-branch extension follow the verbatim 03a-RESEARCH.md D-06/F4 and F6 snippets; colours are the verbatim UI-SPEC computed-contrast palette.

## Deviations from Plan

None - plan executed exactly as written.

Two acceptance-criteria greps were written naively and match pre-existing prose rather than new code; the load-bearing intent behind each is fully met:
- `grep -c 'safe' macros.njk` expected `0` but returns `4` - all four matches are pre-existing documentation comments (e.g. "check-render-safety.mjs", "safe floor"), not filter pipes. The actual intent (no `| safe` autoescaping bypass) is verified: `grep -c '| safe' macros.njk` is `0`.
- `grep -c 'nowrap' styles.css` expected `0` but returns `1` - the sole match is the pre-existing `.visually-hidden` accessibility utility (`white-space: nowrap`, the standard sr-only pattern), which predates this plan and is unrelated to the nutrition table. The nutrition-table block sets no `nowrap`. My own comment was reworded to avoid contributing a false positive.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The component contract is stable for the template plans (03a-03/04/05): `factCell` for nutrition cells, the extended `sourcedValue` contested branch, and the state/nutrition/allergen CSS classes.
- `node --test` (196 tests) and `npm run prebuild` (validate, editorial lint, image-rights, render-safety) are green.

## Self-Check: PASSED
- macros.njk factCell present, contested branch resolves per-position sources via findBy - FOUND
- styles.css state selectors, nutrition-table, allergen-list present - FOUND
- test/render-state.test.js new contested-sources assertion passes (5 tests in file, 196 suite-wide) - FOUND
- Commits aafcd8a, 5ba3edb - FOUND

---
*Phase: 03a-core-entity-pages-trust-rendering*
*Completed: 2026-07-01*
