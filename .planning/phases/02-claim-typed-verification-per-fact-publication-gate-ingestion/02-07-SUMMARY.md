---
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
plan: 07
subsystem: database
tags: [verification-gate, provenance, sourced-value, corroborable, contested, citation-cache]

requires:
  - phase: 02-01
    provides: the SourcedValue verification/passes/adjudication/contested shapes and the derivedFrom lineage field
  - phase: 02-02
    provides: lib/verification.mjs deriveVerificationState precedence and the claim-typed sufficiency rules
  - phase: 02-03
    provides: the build-failing internal-consistency gate and the R-02 withhold-not-fail split in validate-data.mjs
provides:
  - a real corroborable fact demonstrated at published-confirmed on live corpus data (Companies House primary + Suntory corporate site, distinct lineage)
  - the Lucozade pre-2017 sugar figure as a worked published-contested example with its singular value withheld and two positions carried
  - a committed .cache/citation-verdicts.json seeded with the four human-confirmed RESOLVES existence records
  - the Companies House statutory-register primary source in the registry
affects: [phase-03a rendering the derived publication state, phase-04 Tier A verification track, verification audit]

tech-stack:
  added: []
  patterns:
    - "A human authors verdicts at a blocking checkpoint; the autonomous follow-on transcribes only the approved values into src/_data (mirrors 01-10 Task 1)"
    - "A worked corroborable published-confirmed record on real data uses two distinct-lineage primary sources, each its own derivedFrom root"

key-files:
  created:
    - .cache/citation-verdicts.json
  modified:
    - src/_data/sources.json
    - src/_data/products/spike-01.json
    - src/_data/timeline/spike-lucozade-2017-sugar-cut.json

key-decisions:
  - "The corroborable standard is now demonstrated on real corpus data, not only fixtures (R-27 satisfied by a genuine worked example, not a no-pair rationale)"
  - "evidence: 'strong' in the approved values was transcribed as the schema token 'high' (the top GRADE grade, whose own definition reads 'A strong regulatory position...'); no other token validates against the 4-point grade enum"
  - "No source.schema.json edit was needed: licence.id is an unconstrained string and OGL-3.0 already exists in the registry, so the Companies House record reuses the existing OGL-3.0 licence object verbatim"

patterns-established:
  - "Pattern 1: a corroborable published-confirmed record on live data cites two independent primary sources (statutory register + corporate site) whose distinct null-derivedFrom roots satisfy checkDistinctLineage"
  - "Pattern 2: a contested fact withholds its singular value (null) and carries verification.contested.positions[] with a human adjudication.outcome 'contested'"

requirements-completed: [VRFY-01, VRFY-02, VRFY-11]

duration: 18min
completed: 2026-07-01
---

# Phase 02 Plan 07: Exercise the gate on real data Summary

**The whole publication gate is now demonstrated over the spike corpus: one real corroborable fact derives to published-confirmed on live data, the Lucozade sugar figure is a worked published-contested example with its value withheld, and every other spike fact correctly stays withheld-unverified.**

## Performance

- **Duration:** 18 min (Task 3 continuation from the Task 2 human checkpoint)
- **Completed:** 2026-07-01
- **Tasks:** Task 3 of 3 (Task 1 committed bd99aca; Task 2 was the blocking human-action checkpoint)
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments

- Reclassified the spike-01 manufacturer fact from authoritative to corroborable and encoded the two human-authored `confirms` passes (Companies House statutory register, primary; Suntory corporate site) so it derives to **published-confirmed** on real data, satisfying R-27 with a genuine worked example rather than a "no resolvable pair" rationale.
- Added the Companies House register (08603549) as a primary GB source under OGL-3.0.
- Adjudicated the genuinely contested Lucozade pre-2017 sugar figure to **contested**: the singular `documentedChange.value` is now `null` (withheld while contested), with two positions carried in `verification.contested.positions[]` (about 13 g sugar/100ml Energy Orange, The Grocer; about 17 g carbohydrate/100ml Original, diabetes.co.uk).
- Deep-linked the two Lucozade article URLs (previously homepages) and seeded `.cache/citation-verdicts.json` with the four human-confirmed RESOLVES existence records so the worked examples derive deterministically and offline.
- Confirmed the honest outcome: derived states are `published-confirmed=1 published-contested=1` with the remaining 18 facts `withheld-unverified` (SPIKE-01's finding that most historic facts do not meet the strict bar).

## Task Commits

1. **Task 1: derivedFrom lineage tags with shared Cadbury press-release root** - `bd99aca` (feat) [committed before this session]
2. **Task 2: human editor authored/approved the verdicts** - blocking checkpoint (no commit; editorial act)
3. **Task 3: transcribe approved verdicts, seed resolves-cache** - `4e9613d` (feat)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `.cache/citation-verdicts.json` - seeded RESOLVES existence records for the four human-confirmed sources (SEAM shape { verdict, resolvedVia, checkedAt, statusCode, snapshotUrl }); the real network check (02-05) may overwrite it.
- `src/_data/sources.json` - added the Companies House primary source; deep-linked the Grocer and diabetes.co.uk article URLs.
- `src/_data/products/spike-01.json` - manufacturer fact reclassified corroborable with two human-authored confirms passes; derives published-confirmed.
- `src/_data/timeline/spike-lucozade-2017-sugar-cut.json` - documentedChange value withheld (null); human contested adjudication and two positions added.

## Decisions Made

- **R-27 satisfied by a real worked example.** The corroborable standard is now proven on live corpus data (Companies House statutory register + Suntory corporate site, distinct lineage, both resolving), not merely fixture/unit-tested. The superseded "no resolvable distinct-lineage pair" rationale is deliberately not recorded.
- **No schema change was required.** `licence.id` in source.schema.json is an unconstrained string (not an enum), and OGL-3.0 is already used by the FSA and SDIL records, so the Companies House record reuses the existing OGL-3.0 licence object shape verbatim. The plan's contingency to minimally extend a licence enum did not apply.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Normalised approved `evidence: "strong"` to the schema token `"high"`**
- **Found during:** Task 3 (transcribing the spike-01 manufacturer fact)
- **Issue:** The approved value stated `evidence: "strong"`, but the SourcedValue `grade` enum is `["high","moderate","low","very-low"]`; the literal token `"strong"` fails Ajv structural validation, which would break `npm run prebuild`.
- **Fix:** Transcribed the evidence grade as `"high"` - the top grade in the controlled vocabulary, whose own meta.json definition reads "A strong regulatory position or systematic-review-grade evidence underpins the claim." This is a faithful mapping of the human's prose label ("strong", justified as "primary statutory register corroborated by the corporate site") onto the schema's controlled-vocabulary token for the top evidence grade, not a change to the substantive editorial decision. Confidence (`high`) transcribed verbatim.
- **Files modified:** src/_data/products/spike-01.json
- **Verification:** `npm run prebuild` exits 0; the fact derives published-confirmed.
- **Committed in:** `4e9613d` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, a controlled-vocabulary normalisation).
**Impact on plan:** No scope creep. The passes, adjudication, positions, sources, notes, dates and cache records were all transcribed verbatim; only the out-of-vocabulary evidence label was mapped to its valid schema token to keep the build green.

## Issues Encountered

None beyond the evidence-token normalisation documented above. The full `node --test` suite is green (140/140). `test/audit.test.js` briefly failed while run mid-edit because it asserts `git status --porcelain src/_data` is empty (the audit must be read-only); it passed once Task 3 was committed and the working tree was clean - this is a test-ordering artefact, not a data defect.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The gate is now a demonstrated invariant over real records: both claim standards (authoritative re-read independence in fixtures/units, corroborable distinct-lineage on live data) are exercised, and contested/withheld outcomes are proven on the corpus.
- Phase 3a can render the derived publication state directly: a published-confirmed record, a published-contested record (both-sides treatment), and withheld placeholders all exist in the live corpus to render against.
- The seeded `.cache/citation-verdicts.json` is a committed, diffable stand-in the real 02-05 network check can overwrite.

## Self-Check: PASSED

- Files verified present: `.cache/citation-verdicts.json`, `src/_data/sources.json`, `src/_data/products/spike-01.json`, `src/_data/timeline/spike-lucozade-2017-sugar-cut.json`, `02-07-SUMMARY.md`.
- Commits verified in git log: `bd99aca` (Task 1), `4e9613d` (Task 3).

---
*Phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion*
*Completed: 2026-07-01*
