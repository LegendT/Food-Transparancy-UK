---
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
plan: 04
subsystem: ingestion
tags: [off, ingestion, leads, provenance, odbl, ssrf, node-fetch, node-test]

# Dependency graph
requires:
  - phase: 02-01
    provides: "The lead schema (provenance + fields[], no sources key), the off-response.sample.json fixture, the sourcedvalue-shaped-lead negative fixture, and the ingest:off standalone npm script"
provides:
  - "scripts/ingest-off.mjs: standalone OFF v2 per-barcode ingestion writing field-level-provenance leads into the isolated ingestion/leads/ store, host-constrained and body-size-capped, never in prebuild"
  - "The exported pure offProductToLead(product, barcode, productId, now) mapping OFF responses to leads, reading the actual OFF measure suffix (R-24)"
  - "ingestion/barcodes.json worklist and the ingestion/leads/ isolated store outside src/_data"
  - "Offline proof (test/ingest-off.test.js, test/lead.test.js) of the per-100g / per-serving / no-measure branches, lead-schema validity, corpus isolation, and the off-revision-diff never-publish guard"
  - "provenance.sourceRegistryId added to lead.schema.json so a promotion is structurally obliged to keep the ODbL link (R-09)"
affects: [02-06-audit, 03a-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OFF ingestion is a standalone network job (npm run ingest:off), never wired into prebuild (research Pitfall 3)"
    - "The OFF-response-to-lead mapping is a pure exported function so both measure branches are provable offline (no live call in tests)"
    - "Measure basis is read from the ACTUAL OFF suffix (*_100g -> per-100g, *_serving -> per-serving, neither -> no measure), never assumed (R-24)"
    - "Response body is bounded in bytes via a 512 KB streamed ceiling AND in time via AbortSignal.timeout before JSON.parse (R-23)"
    - "The fetch host is constant-constrained to world.openfoodfacts.org with the barcode encodeURIComponent'd into the path (SSRF, T-02-04-02)"

key-files:
  created:
    - "scripts/ingest-off.mjs"
    - "ingestion/barcodes.json"
    - "ingestion/leads/.gitkeep"
    - "test/ingest-off.test.js"
    - "test/lead.test.js"
  modified:
    - "schemas/lead.schema.json"

key-decisions:
  - "Added the required provenance.sourceRegistryId to lead.schema.json, which 02-01 omitted despite this plan's interface and R-09 requiring it (Rule 3 deviation)"
  - "Grouped OFF nutriments by base name and preferred the *_100g suffix over *_serving, falling back to no measure for a suffix-less key (R-24)"
  - "All three launch spike products carry a documented empty-barcode placeholder (no confirmed GB barcode yet); Nutella is the research-verified worked entry"

requirements-completed: [DATA-05, DATA-06, VRFY-10]

# Metrics
duration: 14min
completed: 2026-07-01
---

# Phase 2 Plan 04: OFF Ingestion into the Isolated Lead Store Summary

**A standalone OFF v2 per-barcode ingester writes field-level-provenance leads into ingestion/leads/ outside src/_data, reading the actual OFF measure suffix, host-constrained and byte-capped, so crowd-sourced OFF data can never reach a published page without a human promotion that preserves its ODbL link.**

## Performance

- **Duration:** ~14 min
- **Completed:** 2026-07-01
- **Tasks:** 2
- **Files:** 6 (5 created, 1 modified)

## Accomplishments
- Built `scripts/ingest-off.mjs`: reads the `ingestion/barcodes.json` worklist, fetches the OFF v2 per-barcode API with field selection and a descriptive User-Agent, and writes provenance-tagged leads into the isolated `ingestion/leads/` store. It is standalone (never in prebuild) and writes outside `src/_data`, so leads are outside the Eleventy cascade and outside the validation corpus (D-19).
- Factored the OFF-response-to-lead mapping into the exported pure `offProductToLead()`, which reads the actual OFF suffix for the measure basis: `*_100g` -> per-100g, only `*_serving` -> per-serving (corroborated by `nutrition_data_per`), neither -> no measure (R-24). It never uses the key `sources`.
- Constrained the fetch host to `world.openfoodfacts.org` with the barcode `encodeURIComponent`'d into the path (SSRF, T-02-04-02) and bounded the streamed response body at a 512 KB ceiling before JSON.parse, alongside the time abort (R-23).
- Recorded `provenance.sourceRegistryId: "off"` on every lead so a later human promotion is obligated to cite `off` and keep the ODbL attribution/share-alike link (R-09).
- Proved the behaviour offline: the per-100g / per-serving / no-measure branches, lead-schema validity, the gate ignoring a sibling `ingestion/leads` directory while rejecting a SourcedValue-shaped file inside the corpus, and the off-revision-diff lead being pending and never publishable without human promotion (VRFY-10).

## Task Commits

1. **Task 1: OFF v2 ingestion script into the isolated lead store** - `6f86187` (feat)
2. **Task 2: Offline ingestion test and lead-isolation test** - `3a3f90f` (test)

**Plan metadata:** see final docs commit.

## Files Created/Modified
- `scripts/ingest-off.mjs` - The standalone ingester plus the pure `offProductToLead()` mapping; host guard, 512 KB byte ceiling, `~1.4` req/s cap, direct-invocation guard so the test import never fetches.
- `ingestion/barcodes.json` - The barcode -> productId worklist (Nutella worked entry plus three documented spike placeholders).
- `ingestion/leads/.gitkeep` - Keeps the isolated store present in git before any lead is ingested.
- `test/ingest-off.test.js` - Offline proof of the three measure branches and the no-`sources`-key invariant.
- `test/lead.test.js` - Lead-schema validity + R-09 link, sibling-directory isolation, in-corpus rejection, and the off-revision-diff never-publish guard.
- `schemas/lead.schema.json` - Added the required `provenance.sourceRegistryId` (deviation, see below).

## Decisions Made
- Preferred the `*_100g` suffix over `*_serving` when both are present (matching OFF's per-100g default) and grouped nutriments by base name so each nutrient yields one field with the correct basis.
- Made `provenance.sourceRegistryId` a **required** property (not merely optional) so the R-09 ODbL-link obligation is structurally enforced on every lead, consistent with the phase's "make the guarantee a compile error" ethos.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the required provenance.sourceRegistryId to lead.schema.json**
- **Found during:** Task 1 (validating the produced lead against the schema).
- **Issue:** The 02-01 `lead.schema.json` `provenance` block has `additionalProperties: false` and omitted `sourceRegistryId`, yet this plan's `<interfaces>`, its must-haves (R-09), and the Task 2 acceptance criteria all require a lead to carry `provenance.sourceRegistryId: "off"` AND validate against `lead.schema.json` with zero errors. As written those two requirements were mutually exclusive, blocking the task.
- **Fix:** Added `sourceRegistryId` (string) to `provenance.properties` and to `provenance.required`, with a description tying it to the R-09 ODbL obligation and the 02-06 audit. Minimal and additive; no existing test validates a lead against the schema, so nothing regressed.
- **Files modified:** `schemas/lead.schema.json`
- **Commit:** `6f86187`

## Known Stubs
- `ingestion/barcodes.json` carries an empty-barcode placeholder for each of the three launch spike products (`lucozade-energy`, `cadbury-dairy-milk`, `walls-soft-scoop-vanilla`) because no confirmed GB barcode exists for them yet. This is intentional and documented in the worklist note; the ingester skips empty barcodes with a logged message. It does not block the plan's goal (proving the ingestion path end to end against the research-verified Nutella entry); confirming the GB barcodes is editorial work, not a code gap.

## Issues Encountered
None beyond the schema deviation above. `node --test test/ingest-off.test.js test/lead.test.js` passes 7/7 offline, the full suite is 118/118 green, and `npm run prebuild` remains green (ingestion/ is outside the walked corpus).

## Next Phase Readiness
- The lead store and its provenance shape are in place for the 02-06 audit to surface any OFF-derived fact that has lost the `off` ODbL link.
- Promotion (lead -> SourcedValue) remains the explicit human step; a promoted OFF-derived fact will still face the full verification gate and, as tertiary crowd-sourced data, can never satisfy the corroborable standard alone.

## Self-Check: PASSED

All five created files and the modified schema verified present; both task commits (6f86187, 3a3f90f) verified in git history.

---
*Phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion*
*Completed: 2026-07-01*
