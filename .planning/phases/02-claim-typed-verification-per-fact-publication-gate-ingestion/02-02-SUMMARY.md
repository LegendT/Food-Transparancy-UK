---
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
plan: 02
subsystem: testing
tags: [verification, node-test, pure-functions, precedence, staleness, lineage, tdd]

# Dependency graph
requires:
  - phase: 02-01-verification-data-contracts
    provides: "The inline verification record (passes/adjudication/contested/markedWrong/stalenessClass), $defs/measure with unit, the derivedFrom lineage tag, and the SEAM-pinned verdict-cache entry shape { verdict, resolvedVia, checkedAt, statusCode, snapshotUrl }"
provides:
  - "deriveVerificationState(fact, sourcesById, existenceBySourceId, today, entityType) -> { state, reasons, value? }: the D-15 precedence machine mapping a fact to exactly one of the seven publication states"
  - "CITATION_TTL_DAYS = 180: the single-source-of-truth staleness ceiling for cached RESOLVES verdicts (02-03 gate and 02-06 audit import it, never redefine)"
  - "meetsCorroborable / meetsAuthoritative: the two DISTINCT claim standards (D-05 source-axis, D-06 reader-axis)"
  - "checkDistinctLineage (with deterministic cycle canonicalisation, R-16), lineageSimilarityWarnings (non-blocking), checkMeasureMismatch, checkValueDivergence (R-04)"
  - "classifyStaleness / isPastStaleness / lastVerified: the D-16 staleness derivation with a future-date guard (R-25a)"
affects: [02-03-gate, 02-06-audit, 03a-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The D-15 precedence is an ordered guard chain in one pure function; every insufficient-verification condition WITHHOLDS the single fact and returns a state, never throws (R-02)"
    - "The gate counts PASSES that meet the standard (confirms verdicts), never sources[].length (D-02, Pitfall 1)"
    - "Cached RESOLVES verdicts expire against CITATION_TTL_DAYS so a since-dead link stops publishing without re-running the checker (fail-safe, R-07)"
    - "Lineage roots resolve transitively; a cycle canonicalises to the lexicographically minimal id so co-cyclic sources collapse to ONE lineage (R-16)"

key-files:
  created:
    - "lib/verification.mjs"
    - "test/verification.test.js"
  modified: []

key-decisions:
  - "Scoped the existence (RESOLVES) precondition to the sources cited by the CONFIRMS passes only, so a stray inaccessible/disputes pass cannot falsely withhold an otherwise-sufficient fact (R-15)"
  - "Modelled corrected adjudication as substituting adjudication.correctedValue into the returned { value } while resuming normal sufficiency; confirmed just resumes (R-03)"
  - "Split the below-bar outcome on the VRFY-03 workflow axis: >=1 recorded pass -> withheld-in-review, zero passes -> withheld-unverified"
  - "Date arithmetic compares normalised YYYY-MM-DD strings (Date only to shift months), avoiding the string-versus-Date hazard flagged in referential.mjs; a future lastVerified reads as NOT fresh (R-25a)"

patterns-established:
  - "Pure gate module convention (purity-invariant header, byId Map idiom, { errors }/{ warnings } shapes) extended from lib/referential.mjs to lib/verification.mjs"
  - "TDD RED (test commit) -> GREEN (feat commit) per task, using the 02-01 fixtures plus small inline MINIMAL_SOURCES-style registries and inline existence Maps"

requirements-completed: [VRFY-01, VRFY-02, VRFY-03, VRFY-04, VRFY-08, VRFY-09, VRFY-11, VRFY-12]

# Metrics
duration: 8min
completed: 2026-07-01
---

# Phase 2 Plan 02: Verification Gate Logic Summary

**The pure D-15 precedence machine (wrong > contested > citation-TTL > disagreement > insufficient[split] > stale > confirmed) with the two claim standards, adjudication clearing, the 180-day citation fail-safe, distinct-lineage cycle canonicalisation, and the staleness classifier - all as zero-dependency pure functions with 32 unit tests.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-01T10:00:50Z
- **Completed:** 2026-07-01T10:09:03Z
- **Tasks:** 2 (each TDD: RED then GREEN)
- **Files modified:** 2 (2 created)

## Accomplishments
- Implemented `deriveVerificationState` as an ordered guard chain matching the refined D-15 precedence exactly: markedWrong wins over everything; contested publishes only when every position citation is a fresh RESOLVES (R-14); the RESOLVES precondition is scoped to the confirms passes (R-15); disagreement withholds unless a dated human adjudication clears it (R-03); the below-bar outcome splits into withheld-in-review vs withheld-unverified (VRFY-03); staleness still publishes (D-16).
- Pinned `CITATION_TTL_DAYS = 180` as the single source of truth: a RESOLVES verdict older than 180 days, an absent verdict, or any non-RESOLVES verdict is treated as UNCHECKED and withholds the fact (R-07/R-08).
- Implemented the two DISTINCT claim standards (`meetsCorroborable`: >=2 confirms / >=2 lineages / >=1 primary; `meetsAuthoritative`: distinct reviewerKind re-read) plus `checkDistinctLineage` with deterministic cycle canonicalisation (R-16), the non-blocking `lineageSimilarityWarnings`, `checkMeasureMismatch` and `checkValueDivergence` (R-04).
- Covered the full precedence, the in-review vs unverified split, adjudication clearing, TTL expiry, both claim standards, lineage/cycle handling, measure mismatch and value divergence in 32 `node:test` cases, asserting the fail-safe direction (non-RESOLVES/UNCHECKED/expired -> withheld) explicitly.

## Task Commits

Each task was committed atomically (TDD RED -> GREEN):

1. **Task 1: deriveVerificationState, claim-typed sufficiency, adjudication clearing, TTL, staleness** - `f394fd5` (test, RED) then `7709713` (feat, GREEN)
2. **Task 2: checkDistinctLineage with cycle canonicalisation, similarity warning, measure-mismatch and value-divergence** - `376a4aa` (test, RED) then `6b40342` (feat, GREEN)

**Plan metadata:** see final docs commit.

## Files Created/Modified
- `lib/verification.mjs` - The pure gate logic (332 lines): CITATION_TTL_DAYS, deriveVerificationState, meetsCorroborable, meetsAuthoritative, checkDistinctLineage, lineageSimilarityWarnings, checkMeasureMismatch, checkValueDivergence, classifyStaleness, isPastStaleness, lastVerified. No fs, no network, no process.exit.
- `test/verification.test.js` - 32 unit tests (469 lines) over the refined D-15 precedence, the VRFY-03 split, adjudication clearing, TTL expiry, both claim standards, lineage/cycle, measure-mismatch and value-divergence.

## Decisions Made
- Scoped the RESOLVES precondition to CONFIRMS-pass sources only (R-15) so a stray inaccessible/disputes pass citing a not-yet-resolving source cannot falsely withhold an otherwise-sufficient fact.
- `corrected` adjudication substitutes `adjudication.correctedValue` into the returned `{ value }`; `confirmed` just resumes sufficiency (R-03). Both must be dated on/after the latest disputing/mismatching pass to clear.
- The seven-state return uses `{ state, reasons }` with `value` added only on the published states (carrying the effective, possibly-corrected value), naming the in-review, TTL-expiry and adjudication-cleared reasons distinctly.
- Kept `checkMeasureMismatch` / `checkValueDivergence` in the Task 1 commit because `deriveVerificationState` depends on them; their dedicated unit assertions landed in Task 2 alongside the genuinely-new lineage gate.

## Deviations from Plan

None - plan executed exactly as written. No deviation rules (1-4) were triggered; zero new dependencies (threat T-02-02-SC holds).

## Issues Encountered
None. Task file passes 32/32, the full suite passes 95/95, `npm run prebuild` remains green, and `grep -E "node:fs|fetch\(" lib/verification.mjs` returns no matches (purity confirmed).

## User Setup Required
None - no external service configuration required. Zero new npm dependencies (Node 24 built-ins and node:test only).

## Next Phase Readiness
- 02-03 (the prebuild gate) can import `deriveVerificationState`, `checkDistinctLineage`, `CITATION_TTL_DAYS` and the mechanical checks to wire the offline gate over the real corpus, reading the committed `.cache/citation-verdicts.json`.
- 02-06 (audit) shares the same pure functions and the same `CITATION_TTL_DAYS` constant for staleness surfacing; 03a renders the seven derived states.
- Note for 02-03: the shared-lineage/dangling fixtures assume the registry `derivedFrom` data edit (marking the Cadbury co-derived pair with a shared root) lands with the gate work; this plan's tests exercise that behaviour against small inline registries, so the derivedFrom edit is still outstanding for the live corpus.

## Threat Flags

None - no new network endpoints, auth paths, file access or trust-boundary schema changes were introduced; the module is pure and reads only its arguments. The threat register's `mitigate` items (T-02-02-01 count-passes-not-sources, T-02-02-02 ReDoS-safe suffix match, T-02-02-03 cycle canonicalisation, T-02-02-04 TTL fail-safe) are all implemented and unit-tested.

## Self-Check: PASSED

Both created files verified present on disk; all four task commits (f394fd5, 7709713, 376a4aa, 6b40342) verified in git history. Task file 32/32, full suite 95/95, prebuild green, purity grep clean.

---
*Phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion*
*Completed: 2026-07-01*
