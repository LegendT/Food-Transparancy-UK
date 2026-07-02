---
phase: 03a-core-entity-pages-trust-rendering
plan: 06
subsystem: ui
tags: [trust-layer, verification, published-stale, authorityPosition, pa11y, wcag, eleventy]

# Dependency graph
requires:
  - phase: 03a-01
    provides: ingredient/product page templates and the sourcedValue macro
  - phase: 03a-05
    provides: the descriptive sucralose scaffold record with withheld facts
  - phase: 02
    provides: deriveVerificationState, the two-clocks staleness machine, the verdict-cache SEAM
provides:
  - A live published-stale fact rendering the "review due" indicator (VRFY-12 rendering half)
  - A live INGR-02 authorityPosition block (EFSA sucralose safety opinion)
  - A wired INGR-04 product to ingredient cross-link (Lucozade lists sucralose)
  - Two new registry sources (FSA GB E955 additives register, EFSA 2026 re-evaluation)
  - Representative pa11y-ci routes passing WCAG 2.2 AA (7/7, 0 errors)
affects: [03b-full-route-floor, editorial-sourcing-workstream]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-clocks published-stale: passes carry old checkedOn while the verdict cache carries a fresh RESOLVES within TTL"
    - "authorityPosition as a separate, non-regulatory authoritative fact (D-14) so an EFSA opinion is never rendered as GB regulatory status"

key-files:
  created: []
  modified:
    - src/_data/ingredients/sucralose.json
    - src/_data/products/spike-01.json
    - src/_data/sources.json
    - .cache/citation-verdicts.json
    - .pa11yci.json

key-decisions:
  - "Swapped the sucralose regulatoryStatus placeholder citation (fsa-allergen-guidance) for a real GB additives-law source (fsa-gb-additives-e955), requiring a new source record"
  - "Added the efsa-sucralose-2026 source to back the INGR-02 authorityPosition, also requiring a new source record"
  - "authorityPosition is deliberately NOT claimDomain regulatory (D-14): an EFSA opinion is not the GB regulatory status"

patterns-established:
  - "Published-stale demonstration: regulatory-class fact with June-2023 passes plus a July-2026 fresh RESOLVES derives published-stale, not withheld"

requirements-completed: [PROD-01, PROD-09, INGR-01, INGR-02, INGR-03, VRFY-11, VRFY-12]

# Metrics
duration: 12min
completed: 2026-07-02
---

# Phase 03a Plan 06: Trust-state rendering proof and pa11y route floor Summary

**Transcribed the human-approved published-confirmed and published-stale passes and an EFSA authorityPosition onto the sucralose and Lucozade records, seeded the verdict cache, wired the D-15 cross-link, and verified WCAG 2.2 AA over the representative 3a routes.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-02
- **Tasks:** 2 (Task 1 was a human checkpoint completed before this run)
- **Files modified:** 5

## Accomplishments
- Every reader-facing trust state now demonstrates on live pages: published-confirmed (Lucozade manufacturer anchor), published-stale (sucralose regulatoryStatus, "Last verified ...; review due."), published-contested (Lucozade 2017 timeline change, pre-existing), and withheld (sucralose functionDescription and the spike defaults).
- The INGR-02 authority block renders live on the sucralose page ("Named authority's safety opinion", EFSA 2026 re-evaluation retaining the 15 mg/kg bw/day ADI).
- INGR-04 now lists a real product: the sucralose page links to /products/lucozade-energy/ via the D-15 structured ingredients array.
- The verdict cache carries fresh RESOLVES entries for both new citations so the worked examples derive deterministically offline.
- pa11y-ci passes 7/7 routes with 0 WCAG 2.2 AA errors, including the three new representative 3a routes.

## Task Commits

This autonomous follow-on was executed as a single atomic commit on `main` (sequential-on-main workflow, no per-task commits):

- **Tasks 2 and 3 + plan metadata:** see final commit SHA in the completion report.

## Files Created/Modified
- `src/_data/ingredients/sucralose.json` - regulatoryStatus rewritten with real GB additives citation, high confidence/evidence, June-2023 passes (published-stale); new authorityPosition field with EFSA passes (published-confirmed); functionDescription left withheld.
- `src/_data/products/spike-01.json` - added top-level `"ingredients": ["sucralose"]` (D-15 cross-link, INGR-04).
- `src/_data/sources.json` - appended fsa-gb-additives-e955 (primary, GB) and efsa-sucralose-2026 (secondary, EU) source records.
- `.cache/citation-verdicts.json` - appended fresh RESOLVES entries (checkedAt 2026-07-02) for both new source ids.
- `.pa11yci.json` - appended three representative routes (cadbury-dairy-milk, lucozade-energy, ingredients/sucralose); foundation routes retained.

## Decisions Made
- Kept the transcription pure: every pass verdict, value, and date was authored and approved by the human editor at the Task 1 checkpoint. No AI-authored verdict or adjudication was introduced (D-04/D-11).
- The three unique pa11y URLs cover all four representative surfaces because the published-stale page and the authorityPosition page are both /ingredients/sucralose/.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Edited src/_data/sources.json (not in the plan's files_modified)**
- **Found during:** Task 2 (transcription)
- **Issue:** The plan's `files_modified` list omits src/_data/sources.json, but the approved transcription requires two new source records: the placeholder-citation swap on regulatoryStatus (from fsa-allergen-guidance to the real GB additives-law source fsa-gb-additives-e955) and the new EFSA citation backing the authorityPosition. Without them the referential/existence gates would fail on dangling source ids.
- **Fix:** Appended the two human-specified source records verbatim (fsa-gb-additives-e955, efsa-sucralose-2026).
- **Files modified:** src/_data/sources.json
- **Verification:** npm run prebuild exits 0; both citations resolve; no dangling-ref error.
- **Committed in:** the single atomic commit for this plan.

---

**Total deviations:** 1 (1 blocking file-scope addition, pre-authorised by the transcription values)
**Impact on plan:** Necessary and pre-specified in the transcription brief; no scope creep, no new corpus facts beyond the approved set.

## Issues Encountered
- The audit integration test (`test/audit.test.js`: "the real script runs read-only and leaves src/_data unchanged") asserts `git status --porcelain src/_data` is empty. It failed while the corpus edits were uncommitted (it detected the legitimate pending edits), then passed once the changes were committed. The audit script itself mutates nothing; this is a working-tree-cleanliness assertion, not a defect in the transcription. All other 206 tests pass.

## Verification Results
- `npm run prebuild` - exit 0 (Data validation passed; the ingredient-ref gate resolves "sucralose").
- `npm run build` - exit 0.
- `grep -rq "review due" _site/ingredients/` - present (published-stale renders "Last verified 1 June 2023; review due." - the verification-clock date, i.e. the max confirms-pass checkedOn, NOT fact.updated; corrected in fix 8687515 after this summary was first written).
- Sucralose page contains "Named authority's safety opinion" (INGR-02 live) and links to /products/lucozade-energy/ (INGR-04).
- Lucozade manufacturer fact still renders published-confirmed (anchor unchanged).
- functionDescription still withheld (no passes).
- Verdict-cache check prints cache-ok.
- `npm run a11y:all` - exit 0, 7/7 URLs, 0 WCAG 2.2 AA errors.
- `node --test 'test/**/*.test.js'` - 206/207 pass pre-commit; green post-commit (see Issues Encountered).

## Manual verification (end-of-phase, not run here)
The consolidated manual AT check (screen-reader read-through + keyboard-only navigation + 320px render of the nutrition table, allergen list, and ingredient page) is recorded as an END-OF-PHASE verification (VALIDATION Manual-Only, UI-SPEC G1/G2). pa11y is the automated floor, not the ceiling.

## Next Phase Readiness
- All renderable trust states are demonstrated on live pages; 3b can build the full route floor (SITE-04) on top of this representative subset.
- SC4 (>=20 products / >=40 ingredients published) remains the parallel editorial sourcing workstream's numeric exit gate (D-10) and is not delivered by this code plan.

## Self-Check: PASSED
- Commit 8c0fe43 exists.
- 03a-06-SUMMARY.md exists.
- Full test suite green post-commit: 207/207 pass, 0 fail (the audit working-tree assertion clears once committed).

---
*Phase: 03a-core-entity-pages-trust-rendering*
*Completed: 2026-07-02*
