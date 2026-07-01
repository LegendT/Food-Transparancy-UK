---
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
plan: 01
subsystem: database
tags: [json-schema, ajv, verification, provenance, ingestion, node-test]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "SourcedValue envelope, source registry schema, five entity schemas, lib/validate.mjs compile, the node:test + negative-fixture convention"
provides:
  - "Inline verification object on every SourcedValue (passes events, adjudication with nullable correctedValue, contested positions, markedWrong, stalenessClass)"
  - "$defs/measure (basis, state, unit, jurisdiction, asOf) for the cross-pass measure-mismatch and value-divergence checks"
  - "Derived-only publication/verification status: enum [null] at both the SourcedValue and all five entity schemas (D-03/R-06)"
  - "Nullable derivedFrom lineage tag on source records for the distinct-lineage gate (D-12)"
  - "The OFF lead schema (provenance + fields[], never a sources key) isolating leads from the corpus-escape guard (D-19)"
  - "Ten fixtures (two valid samples plus the SEAM-pinned verdict-cache sample, and eight surgical negatives) every downstream gate proves itself against"
  - "Three standalone npm scripts (check:citations, ingest:off, audit) registered but never in prebuild"
affects: [02-02-verification-logic, 02-03-gate, 02-04-off-ingestion, 02-05-citation-checker, 02-06-audit, 03a-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verification is a sibling object on the SourcedValue envelope, keeping a fact's value and its evidence in one git diff (D-01)"
    - "A pass is a verification EVENT keyed on verdict, never a source (D-02)"
    - "Publication status is derived-only: enum [null] makes any author-set value an Ajv compile error, at both the fact and entity level (D-03/R-06)"
    - "Leads avoid the sources key entirely so hasSourcedShape never trips (D-19/C4)"
    - "The verdict-cache entry shape is a fixed cross-plan SEAM: { verdict, resolvedVia, checkedAt, statusCode, snapshotUrl }"

key-files:
  created:
    - "schemas/lead.schema.json"
    - "test/verification-schema.test.js"
    - "test/fixtures/valid/verification-confirmed.json"
    - "test/fixtures/valid/off-response.sample.json"
    - "test/fixtures/valid/citation-verdicts.sample.json"
    - "test/fixtures/invalid/insufficient-passes.json"
    - "test/fixtures/invalid/measure-mismatch.json"
    - "test/fixtures/invalid/shared-lineage.json"
    - "test/fixtures/invalid/does-not-resolve-citation.json"
    - "test/fixtures/invalid/sourcedvalue-shaped-lead.json"
    - "test/fixtures/invalid/contested-nonnull-value.json"
    - "test/fixtures/invalid/dangling-derivedfrom.json"
    - "test/fixtures/invalid/entity-status-set.json"
  modified:
    - "schemas/sourced-value.schema.json"
    - "schemas/source.schema.json"
    - "schemas/product.schema.json"
    - "schemas/ingredient.schema.json"
    - "schemas/brand.schema.json"
    - "schemas/additive.schema.json"
    - "schemas/timeline-event.schema.json"
    - "package.json"

key-decisions:
  - "Constrained verificationStatus/publicationStatus to enum [null] (RESEARCH assumption A1, the stronger reading of D-03) so there is no author-writable publish flag at all"
  - "Chose derivedFrom (transitive parent pointer) over a flat lineageId for D-12, per RESEARCH recommendation"
  - "Lead field measures reuse sourced-value #/$defs/measure by cross-schema $ref so a promotion carries the exact structured basis"

patterns-established:
  - "Inline verification record shape (passes/adjudication/contested/markedWrong/stalenessClass) is now the canonical contract for waves 02-02 to 02-06"
  - "The verdict-cache entry shape is SEAM-pinned by citation-verdicts.sample.json and must not diverge downstream"

requirements-completed: [VRFY-01, VRFY-02, VRFY-03, VRFY-04, VRFY-07, VRFY-08, VRFY-11, DATA-05, DATA-06]

# Metrics
duration: 6min
completed: 2026-07-01
---

# Phase 2 Plan 01: Verification Data Contracts Summary

**Interface-first Wave 0: the inline verification record, the derived-only status constraint at fact and entity level, the derivedFrom lineage tag, the isolated OFF lead schema, and the ten fixtures every downstream verification gate builds against.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-01T09:50:28Z
- **Completed:** 2026-07-01T09:56:44Z
- **Tasks:** 3
- **Files modified:** 21 (13 created, 8 modified)

## Accomplishments
- Extended the SourcedValue envelope with the inline `verification` object (pass events, human-only adjudication carrying a nullable `correctedValue`, contested positions, markedWrong, stalenessClass) plus `$defs/measure` with a `unit` for the cross-pass value-divergence check.
- Made publication status derived-only: `verificationStatus`/`publicationStatus` are now `enum [null]` at the SourcedValue level AND across all five entity schemas, so any author-set value is an Ajv failure (D-03/R-06).
- Added the nullable `derivedFrom` lineage tag to source records and created the isolated `lead` schema (provenance + fields[], no `sources` key), so leads can never trip the corpus-escape guard (D-19).
- Authored ten fixtures (a valid verification-confirmed fact, the OFF response sample, the SEAM-pinned verdict-cache sample, and eight surgical negatives) and a schema test proving the derived-only constraint at both levels; registered the three network scripts standalone, never in prebuild.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend sourced-value.schema.json with the inline verification object; constrain status fields derived-only across the envelope and all five entity schemas** - `9c9b2d6` (feat)
2. **Task 2: Add derivedFrom to source.schema.json and create the lead schema** - `f146e68` (feat)
3. **Task 3: Create the fixtures and the schema test; register the three standalone npm scripts** - `31694e3` (test)

**Plan metadata:** see final docs commit.

## Files Created/Modified
- `schemas/sourced-value.schema.json` - Added the `verification` object, `$defs/measure` (with `unit`), and the `enum [null]` status constraint.
- `schemas/source.schema.json` - Added the optional nullable `derivedFrom` lineage pointer.
- `schemas/lead.schema.json` - New OFF lead envelope; no `sources` key at any level (D-19).
- `schemas/{product,ingredient,brand,additive,timeline-event}.schema.json` - Entity-level status fields constrained to `enum [null]` (R-06).
- `test/verification-schema.test.js` - Proves the verification shape validates and author-set status is rejected at both the SourcedValue and entity level.
- `test/fixtures/valid/*` - `verification-confirmed`, `off-response.sample`, `citation-verdicts.sample` (the SEAM verdict-cache shape).
- `test/fixtures/invalid/*` - Eight surgical negatives, one per new failure path.
- `package.json` - Added `check:citations`, `ingest:off`, `audit` as standalone scripts (absent from prebuild).

## Decisions Made
- Adopted the stronger reading of D-03 (RESEARCH assumption A1): status fields are `enum [null]`, not merely nullable-and-ignored, so there is no author-writable publish flag anywhere.
- Chose `derivedFrom` (transitive parent pointer) over a flat `lineageId` for D-12.
- Lead field measures reuse `sourced-value #/$defs/measure` via cross-schema `$ref` (verified to resolve and validate at runtime, not just compile).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. All schemas compile under Ajv 2020 strict, the new schema test passes (3/3), the full suite passes (63/63), and `npm run prebuild` remains green over the live corpus.

## User Setup Required
None - no external service configuration required. Zero new npm dependencies were added (Node 24 native fetch, node:test, existing Ajv 8).

## Next Phase Readiness
- The data contracts are locked, so 02-02 (verification logic), 02-03 (gate), 02-04 (OFF ingestion), 02-05 (citation checker) and 02-06 (audit) can build against fixed shapes in parallel.
- The eight negative fixtures and the two valid samples are ready for the downstream gates to prove themselves against; the verdict-cache SEAM shape is pinned by `citation-verdicts.sample.json`.
- Note for downstream: the `shared-lineage` and `dangling-derivedfrom` fixtures assume the registry `derivedFrom` data edit (marking the Cadbury co-derived pair with a shared root) lands with the 02-03 gate work; `shared-lineage.json` cites the co-derived pair by id today.

## Self-Check: PASSED

All 13 created files verified present on disk; all three task commits (9c9b2d6, f146e68, 31694e3) verified in git history.

---
*Phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion*
*Completed: 2026-07-01*
