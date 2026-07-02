---
phase: 03a-core-entity-pages-trust-rendering
plan: 04
subsystem: ui
tags: [eleventy, nunjucks, nutrition-table, allergens, accessibility, wcag, trust-rendering]

# Dependency graph
requires:
  - phase: 03a-02
    provides: factCell inline macro and factState render boundary (R-31) inside macros.njk
  - phase: 03a-03
    provides: src/product.njk scaffold with the locked D-05 section order and Ingredients/Manufacturer/Sources/Recipe-history sections
provides:
  - Accessible per-100g Nutrition table (nine fixed figures, schema order) distinguishing Not recorded / Not yet verified / published, with focusable per-figure provenance blocks
  - Allergens fail-safe section with standing safety caveat, driven by the pure allergenLine helper
  - lib/allergen-copy.mjs pure helper and its exhaustive unit test guaranteeing "does not contain" can never be emitted
affects: [03a-06, phase-3b, phase-4, phase-6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Safety-critical reader copy extracted to a pure, exhaustively-tested lib helper registered as a Nunjucks filter, so the fail-safe wording is a build-time unit invariant rather than a hand-checked template branch"
    - "Metadata membership test (key in nutrition) to distinguish absent from withheld without touching .value, keeping R-31 intact"
    - "In-page provenance anchors carry tabindex=-1 so a status link moves focus, not just scroll (WCAG 2.4.3)"

key-files:
  created:
    - lib/allergen-copy.mjs
    - test/allergen-copy.test.js
  modified:
    - src/product.njk
    - .eleventy.js

key-decisions:
  - "allergenLine returns the exact UI-SPEC copy with a literal {allergen} placeholder; the template interpolates the human-readable name via the replace filter, so no allergen name is baked into the helper"
  - "F5 resolved to LOCK option (a): allergens with no record are not enumerated; the standing caveat covers the archive's silence, so a missing allergen never reads as absent"
  - "An unknown/unexpected presence value fails safe toward a treat-as-present warning, never toward any wording implying absence"
  - "The red #d4351c warning bar is applied to every allergen row except a published absent one (uncertainty about absence is treated as risk); all row text stays #0b0c0c black"

patterns-established:
  - "Nutrition table: a scannable value/status table plus an anchored per-figure provenance list, reusing the block sourcedValue macro unchanged"
  - "Fail-safe safety copy is a pure lib invariant, tested exhaustively over all cases"

requirements-completed: [PROD-01, PROD-09]

# Metrics
duration: 16min
completed: 2026-07-02
---

# Phase 03a Plan 04: Nutrition Table and Allergens Fail-Safe Summary

**Accessible per-100g Nutrition table distinguishing Not recorded / Not yet verified / published with focusable provenance anchors, and an allergen fail-safe section backed by a pure, exhaustively-tested allergenLine helper that makes "does not contain" unemittable.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-07-02
- **Completed:** 2026-07-02
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Added the Nutrition h2 to src/product.njk in the locked D-05 order: a real accessible `<table>` (caption, `thead` scope, per-row `th scope="row"`) over the nine fixed figures in schema order, with three visually and semantically distinct cell states and short, wrap-friendly status links.
- Each recorded nutrition figure has a full `sourcedValue` provenance block below the table at `id="nutrition-{key}"` carrying `tabindex="-1"`, so a "see source" / "sources being checked" status link moves focus there (G2, WCAG 2.4.3).
- Added the Allergens h2 (between Nutrition and Manufacturer) with the standing allergen-safety caveat and one fail-safe row per declared allergen, branching on presence AND derived `factState`, never on `provenance.value`.
- Extracted the fail-safe wording into `lib/allergen-copy.mjs` (`allergenLine`), registered as an `allergenLine` filter, and proved it exhaustively in `test/allergen-copy.test.js` (11 assertions, including that no return ever contains "does not contain").

## Task Commits

Executed as a single atomic commit per the sequential-on-main run instruction (not per-task):

1. **Task 1: Nutrition table + focusable provenance blocks (D-06)** - part of the plan commit (feat)
2. **Task 2: Allergens fail-safe section + allergenLine helper and test (D-12/PROD-09)** - part of the plan commit (feat, TDD: test authored, run RED-then-GREEN, then combined)

**Plan commit:** see completion report.

## Files Created/Modified
- `lib/allergen-copy.mjs` - Pure `allergenLine(presence, publishable)` returning the exact UI-SPEC fail-safe copy string with a `{allergen}` placeholder; fails safe toward a warning for any unexpected presence.
- `test/allergen-copy.test.js` - Exhaustive unit test over all six (presence x publishable) cases plus the D-12 "does not contain" safety invariant and the no-name-baked-in property.
- `src/product.njk` - Inserted the Nutrition and Allergens sections in D-05 order; imported `factCell`.
- `.eleventy.js` - Imported `allergenLine` and registered it as a Nunjucks filter.

## Decisions Made
- allergenLine returns the verbatim UI-SPEC copy carrying a literal `{allergen}` placeholder; the template interpolates the name from allergens.json via the `replace` filter. This satisfies both "exact copy string" and "no allergen name embedded in the helper".
- F5 resolved to LOCK option (a): allergens with no record are not enumerated; the always-present standing caveat covers the archive's silence, avoiding the false-completeness risk of 14 "no information" rows.
- The warning (red bar/border) second cue is applied to every allergen row except a published `absent` one, matching the UI-SPEC treatment table (uncertainty about absence is treated as risk).

## Deviations from Plan

None - plan executed exactly as written. The CSS classes the sections use (`.nutrition-table*`, `.allergen-list*`, `.fact__*` inline cell classes) and the `factCell` macro were already present from plan 03a-02, so no style or macro authoring was required in this plan.

## Issues Encountered
None. The build, the R-31 render-safety gate, and all 207 tests stay green.

## Known Stubs
None. The published-value nutrition state and the publishable-allergen provenance block are code-reachable via `factCell`/`sourcedValue` but are not exercised by the current corpus, because no nutrition figure or allergen provenance in spike-01/02/03 has passed the verification gate yet. This is the expected D-13 all-withheld launch reality, not a stub: Cadbury sugars correctly renders "Not yet verified" and its allergens render as "Possible ... Treat as present until confirmed. Check the pack." The published branches are proven by the plan-02 factCell tests and will light up when the human sourcing track authors verified figures.

## Verification Results
- `node --test test/allergen-copy.test.js` - 11/11 pass (all six cases exact, "does not contain" never emitted).
- `npm run build` - exits 0; render-safety gate passes (8 templates scanned, no raw `.value`).
- `node scripts/check-render-safety.mjs src` - PASS.
- `grep 'id="nutrition-sugars" tabindex="-1"'` on the Cadbury page - PASS.
- `grep "Treat as present until confirmed"` on the Cadbury page - PASS (spike-02 milk/nuts provenance is withheld, shown as a warning).
- `! grep -rq "does not contain" _site/products/` - PASS (phrase on no product page).
- `grep "Do not rely on this archive for allergy safety"` on the Cadbury page - PASS (standing caveat renders).
- `npm test` - 207/207 pass.

## Next Phase Readiness
- The product page spine (Ingredients, Nutrition, Allergens, Manufacturer, Sources, Recipe history) is complete for PROD-01/09.
- The consolidated manual AT check (screen reader + keyboard + 320px reflow of the nutrition table and allergen rows) is recorded as an end-of-phase human check per the plan; it is not a per-plan blocker.
- Ready for 03a-06 (pa11y route registration and phase verification).

## Self-Check: PASSED
- `lib/allergen-copy.mjs` - FOUND
- `test/allergen-copy.test.js` - FOUND
- `src/product.njk` nutrition + allergens sections - FOUND (built into _site)
- `.eleventy.js` allergenLine filter - FOUND

---
*Phase: 03a-core-entity-pages-trust-rendering*
*Completed: 2026-07-02*
