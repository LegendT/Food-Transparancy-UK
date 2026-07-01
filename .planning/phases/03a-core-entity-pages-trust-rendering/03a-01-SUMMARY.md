---
phase: 03a-core-entity-pages-trust-rendering
plan: 01
subsystem: database
tags: [json-schema, ajv, eleventy, reverse-index, referential-integrity, trust-layer]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: SourcedValue envelope, entity schemas, collectFacts auto-discovery, validate-data gate chain, factState render boundary
  - phase: 02-verification
    provides: deriveVerificationState, the offline verdict-cache read, the derived-state build report
provides:
  - Optional plain-scalar product `ingredients` id array (D-15), migration-safe
  - Optional fact-bearing ingredient `authorityPosition` SourcedValue (D-14), auto-discovered by collectFacts
  - Pure unit-tested reverse-index library (productsByIngredient, timelineByProduct) returning bracket-accessible plain objects
  - Symmetric referential build gates checkIngredientRefs and checkTimelineRefs (a dangling product->ingredient OR timeline->product reference fails the build)
  - addGlobalData wiring exposing both reverse indices to templates from disk (never a _data/*.js file)
affects: [03a-03, 03a-04, 03a-05, product-page, ingredient-page, recipe-history, INGR-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure lib module surfaced through addGlobalData (read from disk at config load), never a forbidden _data/*.js computed-data file"
    - "Symmetric referential-integrity gates: a relationship reference that cannot resolve fails the build loud, never silently dropped"
    - "Optional-additive schema fields: new capability added without touching any existing record (migration-safe)"

key-files:
  created:
    - lib/reverse-index.mjs
    - test/reverse-index.test.js
    - test/fixtures/valid/ingredient-authority.json
    - test/fixtures/invalid/product-dangling-ingredient-ref.json
    - test/fixtures/invalid/timeline-dangling-product-ref.json
  modified:
    - schemas/product.schema.json
    - schemas/ingredient.schema.json
    - lib/referential.mjs
    - scripts/validate-data.mjs
    - .eleventy.js
    - test/schema.test.js
    - test/referential.test.js

key-decisions:
  - "authorityPosition is a bare SourcedValue $ref, deliberately NOT claimDomain regulatory, so it never trips checkRegulatoryJurisdiction / the TRUST-06 gate"
  - "The reverse indices return plain objects keyed by id (not Maps) so Nunjucks bracket access works, with a missing id reading as an honest empty state"
  - "checkTimelineRefs is symmetric with checkIngredientRefs so a mis-keyed change event can never silently render as 'no recipe changes recorded yet'"

patterns-established:
  - "Pattern 1: reverse indices are pure lib functions exposed via addGlobalData, disk-read at config load like the verdict cache"
  - "Pattern 2: every author-supplied relationship reference is resolved at build time; a dangling reference is a build failure"

requirements-completed: [INGR-02, INGR-04]

# Metrics
duration: 20min
completed: 2026-07-01
---

# Phase 03a Plan 01: Schema Fields & Data-Relationship Layer Summary

**Two optional migration-safe schema fields (product `ingredients`, ingredient `authorityPosition`), a pure reverse-index library, and symmetric dangling-reference build gates that surface both product-ingredient and timeline-product joins to templates.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-01T20:01Z
- **Completed:** 2026-07-01T20:21Z
- **Tasks:** 3
- **Files modified:** 12 (5 created, 7 modified)

## Accomplishments

- Settled the two blocking schema gaps (D-14, D-15) as optional-additive fields: every existing spike product and ingredient still validates unchanged.
- `authorityPosition` is auto-discovered by `collectFacts` with no derivation wiring, so the INGR-02 authority opinion derives and gates like any other fact while staying distinct from `regulatoryStatus`.
- Built the pure `lib/reverse-index.mjs` (productsByIngredient, timelineByProduct) returning bracket-accessible plain objects, fully unit-tested for empty/single/multi/missing-field behaviour.
- Added both `checkIngredientRefs` and the symmetric `checkTimelineRefs` to the build gate: a dangling product->ingredient OR timeline->product reference now fails the build, upholding the never-silently-drop-a-provenance-link promise.
- Exposed both reverse indices to templates via `addGlobalData`, read from disk at config load (never a forbidden `_data/*.js` file).

## Task Commits

Each task was committed atomically (TDD tasks carry a test then feat commit):

1. **Task 1: schema fields + fixtures + schema tests** - `284fc46` (test), `512a1a4` (feat)
2. **Task 2: pure reverse-index library** - `4884928` (test), `e81b60c` (feat)
3. **Task 3: referential gates + addGlobalData wiring** - `f9b4df9` (feat)

**Plan metadata:** (final docs commit)

## Files Created/Modified

- `schemas/product.schema.json` - added the optional plain-scalar `ingredients` id array (D-15)
- `schemas/ingredient.schema.json` - added the optional `authorityPosition` bare-$ref SourcedValue (D-14)
- `lib/reverse-index.mjs` - NEW: pure productsByIngredient / timelineByProduct returning plain objects
- `lib/referential.mjs` - added checkIngredientRefs and the symmetric checkTimelineRefs
- `scripts/validate-data.mjs` - derives entity records by entityType and spreads both new gates into the error array
- `.eleventy.js` - reads products/timeline JSON from disk and exposes the reverse indices via addGlobalData
- `test/schema.test.js` - asserts authorityPosition validates, a bad ingredients id is rejected, and spike products stay valid
- `test/reverse-index.test.js` - NEW: unit coverage for both indices
- `test/referential.test.js` - unit and build-gate coverage for both dangling-reference gates
- `test/fixtures/valid/ingredient-authority.json` - a valid ingredient exercising authorityPosition
- `test/fixtures/invalid/product-dangling-ingredient-ref.json` - a product citing a missing ingredient id
- `test/fixtures/invalid/timeline-dangling-product-ref.json` - a timeline event citing a missing product id

## Decisions Made

- None beyond the plan: the plan pre-specified the field shapes, the plain-object return, and the symmetric timeline gate. All followed exactly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Verified before wiring `checkTimelineRefs` that both existing timeline productIds (`cadbury-dairy-milk`, `lucozade-energy`) resolve to real product records, so the new gate keeps the real corpus green rather than failing prebuild retroactively. No change required.

## Known Stubs

None. Both schema fields are optional and no placeholder data was introduced; the reverse indices return honest empty results for ids with no matches.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Downstream template plans (03a-03/04/05) can now build against fixed shapes: `product.ingredients` for cross-links, `ingredient.authorityPosition` for the INGR-02 block, `productsByIngredient[ingredient.id]` for INGR-04, and `timelineByProduct[product.id]` for recipe history.
- Prerequisite still open for the template plans: `src/_data/ingredients/` does not yet exist and must be created (with >=1 record carrying authorityPosition) before the ingredient pagination target is defined - flagged in RESEARCH Wave 0 gaps, out of scope for this interface-first plan.

## Self-Check: PASSED

All 6 created files exist on disk and all task commits (284fc46, 512a1a4, 4884928, e81b60c, f9b4df9) plus the summary commit (8fe4605) are present in git history.

---
*Phase: 03a-core-entity-pages-trust-rendering*
*Completed: 2026-07-01*
