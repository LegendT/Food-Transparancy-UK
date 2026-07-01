---
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
plan: 03
subsystem: infra
tags: [verification, prebuild-gate, offline, node-test, spawnsync, provenance, publication-gate]

# Dependency graph
requires:
  - phase: 02-02-verification-gate-logic
    provides: "deriveVerificationState, lineageSimilarityWarnings, CITATION_TTL_DAYS - the pure D-15 precedence machine and the mechanical checks the offline gate wires in"
  - phase: 01-foundation
    provides: "scripts/validate-data.mjs (the Phase 1 prebuild gate, its corpus-escape guard and error chain), lib/referential.mjs collectFacts, the negative-fixture convention"
provides:
  - "The extended offline prebuild gate (scripts/validate-data.mjs) that derives each fact's D-15 publication state every build, reads the committed .cache/citation-verdicts.json (never the network), and prints a status breakdown"
  - "The five internal-consistency / referential build-failing assertions: contested without a matching adjudication, a contested non-null value (R-05), a pass sourcesChecked id absent from the fact's sources, malformed markedWrong, and a dangling derivedFrom (R-16)"
  - "The R-02 invariant made a build fact: distinct-lineage / measure-mismatch / value-divergence / non-RESOLVES are per-fact WITHHOLD reasons, never build failures; one bad fact never stops the rest of the corpus publishing"
  - "test/corpus-gate.test.js end-to-end proofs spawning the real gate for every withhold and build-fail path"
affects: [02-06-audit, 03a-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The prebuild gate DERIVES publication state offline from the committed verdict cache; the network existence check is a separate, cached, non-prebuild concern (Pitfall 3)"
    - "R-02 split enforced at the gate boundary: verification INSUFFICIENCY withholds the single fact (report, exit 0); authoring CONTRADICTION fails the build (error, exit non-zero)"
    - "The cache path is overridable via CITATION_VERDICTS_CACHE so corpus-gate tests pin a per-temp-dir fixture cache while the default stays the repo-root .cache"

key-files:
  created: []
  modified:
    - "scripts/validate-data.mjs"
    - "test/corpus-gate.test.js"

key-decisions:
  - "Threaded the entity type (the ENTITY_DIRS name) through factBearing into collectFacts so classifyStaleness can detect timeline-event membership (D-16/R-17) without inventing a fact-id system"
  - "Made the verdict-cache path overridable via CITATION_VERDICTS_CACHE (default repo-root .cache/citation-verdicts.json) so tests inject a fixture cache offline without mutating shared global state"
  - "Scoped the R-15 unchecked-citation warning to facts that actually carry verification passes, so the whole no-pass real corpus does not drown the report in warnings"
  - "The derived-state breakdown is a build REPORT printed on success (never a failure), so lineage/measure/non-RESOLVES withholds are observable without blocking the build (R-02)"

patterns-established:
  - "Gate 5 (verification) extends the Phase 1 gate chain: build-failing consistency errors accumulate into one array and exit non-zero together, mirroring the referential error chain; withhold reasons never enter it"
  - "Corpus-gate tests spawn the real gate against temp dirs, pinning a fixture verdict cache via env, asserting exit 0 + a status-breakdown match for withholds and non-zero exit + stderr match for build failures"

requirements-completed: [VRFY-01, VRFY-04, VRFY-07, VRFY-08, DATA-05]

# Metrics
duration: 11min
completed: 2026-07-01
---

# Phase 2 Plan 03: Offline Per-Fact Verification Gate Summary

**The Phase 1 prebuild gate extended into a continuous, offline per-fact publication gate that derives each fact's D-15 state from the committed verdict cache, withholds (never fails on) lineage / measure / value / non-RESOLVES insufficiency, and fails the build only on five genuine internal-consistency or referential contradictions.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-01T11:33:00+01:00
- **Completed:** 2026-07-01T11:44:11+01:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Wired `deriveVerificationState`, `lineageSimilarityWarnings` and `CITATION_TTL_DAYS` into `scripts/validate-data.mjs` as Gate 5, reading `.cache/citation-verdicts.json` offline (absent = every citation UNCHECKED = withheld) and printing a per-fact derived-state status breakdown with withhold reasons.
- Enforced the load-bearing R-02 amendment: distinct-lineage, measure-mismatch and value-divergence are per-fact WITHHOLD reasons inside the derivation, never entries in the build-failing error array; the real corpus (all facts currently no-pass) derives cleanly to `withheld-unverified` and keeps `npm run prebuild` green.
- Added the five build-FAILING assertions JSON Schema cannot express: a contested block without a matching contested adjudication, a contested adjudication whose singular value is non-null (R-05), a pass `sourcesChecked` id absent from the fact's `sources[]`, a malformed `markedWrong`, and a non-null `derivedFrom` that does not resolve to a registry id (R-16).
- Proved every path end-to-end in `test/corpus-gate.test.js` by spawning the real gate against temp dirs: four withhold-at-exit-0 cases (shared lineage, measure mismatch, DOES_NOT_RESOLVE citation, no-pass baseline) and five build-fail cases, plus the D-19 SourcedValue-shaped-lead corpus-escape belt.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire the verification derivation, internal-consistency assertions and derived-state report into the offline gate** - `0d64aef` (feat)
2. **Task 2: End-to-end corpus-gate tests for the new build-failing and withhold paths** - `fef8357` (test)

**Plan metadata:** see final docs commit.

## Files Created/Modified
- `scripts/validate-data.mjs` - Added the offline verdict-cache read (with a `CITATION_VERDICTS_CACHE` override), threaded entityType through fact collection, added the five internal-consistency / R-16 referential build-failing assertions, and a non-failing derived-state status-breakdown report plus the R-15 unchecked-citation warning. The gate stays offline (no `fetch`, no citation-checker import).
- `test/corpus-gate.test.js` - Added nine Phase 2 cases spawning the real gate: the R-02 withhold-at-exit-0 proofs (shared lineage, measure mismatch, DOES_NOT_RESOLVE, no-pass baseline) and the five build-fail proofs (contested-without-adjudication, contested non-null value, sourcesChecked-not-in-sources, dangling derivedFrom, SourcedValue-shaped lead), with a per-corpus fixture verdict cache helper.

## Decisions Made
- Threaded the ENTITY_DIRS name as `entityType` through `factBearing` into `collectFacts` so `classifyStaleness` detects timeline-event membership (D-16/R-17) with no fact-id system.
- Made the verdict-cache path overridable via `CITATION_VERDICTS_CACHE` (default repo-root `.cache/citation-verdicts.json`) so tests inject a fixture cache offline without touching shared state.
- Scoped the R-15 unchecked-citation warning to facts that carry verification passes, avoiding a flood of warnings over the current no-pass corpus.
- Kept the derived-state breakdown a success-time report (never a failure) so lineage/measure/non-RESOLVES withholds are observable without blocking the build.

## Deviations from Plan

None - plan executed exactly as written. No deviation rules (1-4) were triggered; zero new dependencies (threat T-02-03-SC holds).

## Issues Encountered
- The R-02 baseline test initially wrote a bare SourcedValue to `products/p.json`, which is validated against the `product` entity schema (requiring id/slug/name), not the SourcedValue schema. Resolved by proving the no-pass baseline with a single `demoFact.json` (validated as a SourcedValue), which exercises the invariant cleanly.

## User Setup Required
None - no external service configuration required. Zero new npm dependencies (Node 24 built-ins and node:test only).

## Next Phase Readiness
- 02-06 (the re-verification audit command) shares the same `deriveVerificationState` and `CITATION_TTL_DAYS` to surface the worst-first staleness queue; the gate's status breakdown is the read-only counterpart.
- 03a (rendering) MUST gate the reader-facing value on the DERIVED state, not on the raw stored value: a withheld or contested record keeps its stored value populated by design (R-31, documented as a ponytail comment in the gate). This is the render-signal guard 03a asserts.
- The live corpus derives entirely to `withheld-unverified` today (no verification passes recorded yet); once editors author passes and `check-citations` commits the verdict cache, facts will begin deriving to published states with no gate change.

## Threat Flags

None - no new network endpoints, auth paths or trust-boundary schema changes. The gate reads only a committed local cache file and the corpus. The register's `mitigate` items are all implemented and tested: T-02-03-01 (withheld-unverified on any non-RESOLVES/uncached/expired citation), T-02-03-02 (offline; grep confirms no `fetch`/citation-checker import), T-02-03-03 (corpus-escape belt re-proven with a SourcedValue-shaped lead), T-02-03-04 (lineage/measure withholds are per-fact, never build failures), T-02-03-05 (dangling derivedFrom fails the build, R-16).

## Self-Check: PASSED

Both modified files verified present on disk; both task commits (0d64aef, fef8357) verified in git history. `node --test test/corpus-gate.test.js` passes 13/13, the full suite passes 127/127, `npm run prebuild` exits 0 over the real corpus (three consecutive runs), and `grep -E "fetch\(|check-citations" scripts/validate-data.mjs` returns no matches (offline confirmed).

---
*Phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion*
*Completed: 2026-07-01*
