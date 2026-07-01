---
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
plan: 06
subsystem: verification-audit
tags: [audit, verification, staleness, citation-rot, odbl, read-only, worst-first]

# Dependency graph
requires:
  - phase: 02-01-verification-data-contracts
    provides: "The inline verification record and the SEAM-pinned verdict-cache entry shape { verdict, resolvedVia, checkedAt, statusCode, snapshotUrl }"
  - phase: 02-02-verification-gate-logic
    provides: "deriveVerificationState, classifyStaleness, lastVerified, checkMeasureMismatch, checkValueDivergence and the shared CITATION_TTL_DAYS = 180"
provides:
  - "scripts/audit-verification.mjs: the standalone, read-only, worst-first re-verification audit generator (never in prebuild, never mutates a value or verdict)"
  - "buildAuditReport(facts, verdictMap, sourceRecords, today) -> { markdown, counts }: the pure, IO-free report core the test drives directly"
  - "docs/DATA-AUDIT-{date}.md: a dated triage document modelled on DEBT DATA-AUDIT.md (counts-by-status, worst-first discrepancies, citation-rot and citation-staleness queues, future-date warnings, OFF-derived/ODbL, authoritative spot-check, reviewer disagreements)"
affects: [03a-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The audit reuses the check-editorial/validate-data shell (shebang, intent header, non-zero-corpus assertion, accumulate-then-emit) but writes ONLY under docs/, never under src/_data (read-only by construction, D-17)"
    - "The report core is factored into an exported PURE buildAuditReport so the test asserts ordering, counts and read-only behaviour without file IO; the only IO lives in a main() guarded by an import.meta direct-invocation check"
    - "CITATION_TTL_DAYS is imported from lib/verification.mjs, never redefined: the gate ENFORCES it, the audit SURFACES it (same constant, same 180-day semantics)"

key-files:
  created:
    - "scripts/audit-verification.mjs"
    - "test/audit.test.js"
  modified:
    - ".gitignore"

key-decisions:
  - "The dated audit doc (docs/DATA-AUDIT-{date}.md) is a generated-on-demand artefact and is gitignored, not committed; the script and its test are the durable outputs (D-17 discretion: a dated artefact either way)"
  - "R-09 lost-ODbL-link detection keys on a fact-level provenance.sourceRegistryId marker (mirroring the lead schema's promotion field): a fact whose provenance names a share-alike source it no longer cites in sources[] is flagged as a dropped attribution link"
  - "Citation-rot (R-18) and citation-staleness (R-07) iterate every id in fact.sources[] against the cached verdict, not just the confirms-pass-cited ids, so a citation that renders yet has rotted or aged past the TTL is surfaced even when no pass checks it"

patterns-established:
  - "Standalone read-only report generator convention: pure builder + thin IO main(), non-zero-corpus guard, docs-only writes, no network"

requirements-completed: [VRFY-03, VRFY-05, VRFY-06, VRFY-09, VRFY-12]

# Metrics
duration: 12min
completed: 2026-07-01
---

# Phase 2 Plan 06: Re-verification Audit Command Summary

**A standalone, read-only worst-first audit generator that derives every fact's publication state and staleness via lib/verification.mjs, reads the committed existence-verdict cache, and emits a dated DEBT-modelled triage document with the VRFY-03 in-review/unverified split kept distinct, the citation-rot (R-18) and citation-staleness (R-07) queues, future-date warnings (R-25b), an OFF-derived/ODbL section (R-09) and an authoritative spot-check listing (R-30), mutating nothing.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-01
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Built `scripts/audit-verification.mjs`: it walks the corpus with the same entity-directory allowlist the gate uses, threads the entityType into `classifyStaleness`, reads `.cache/citation-verdicts.json` (absent = {}), derives each fact's state via `deriveVerificationState`, asserts a non-zero fact count, and emits `docs/DATA-AUDIT-{date}.md`.
- Factored the report into an exported pure `buildAuditReport(facts, verdictMap, sourceRecords, today) -> { markdown, counts }` with all IO isolated in a direct-invocation-guarded `main()`, so the test drives the core without touching the filesystem.
- Emitted, in order: a counts-by-status table listing `withheld-in-review` and `withheld-unverified` as SEPARATE rows (VRFY-03); worst-first discrepancy sections (wrong -> open disagreement -> stale, stale sorted oldest last-verified first) each carrying the fact's recorded measure, pass verdicts and last-verified date; a "Citations no longer resolving" section (R-18); a "Citations due for re-check" queue against the shared `CITATION_TTL_DAYS` (R-07); a "Data warnings" section for future-dated passes/lastVerified (R-25b); an "OFF-derived facts (ODbL)" section via `listOffDerived` plus a dropped-attribution-link flag (R-09); an "Authoritative classification spot-check" listing (R-30, a listing only); and a "Reviewer disagreements" section.
- Wrote `test/audit.test.js` (13 tests) pinning the worst-first ordering, the counts table with the in-review/unverified split, the oldest-first stale ordering and exposed last-verified date, the R-18/R-07/R-25b/R-09/R-30 sections, the empty-corpus zero-total guard, the pure-core read-only guarantee, and a spawn integration test asserting the real script exits 0 and leaves `src/_data` unchanged.
- Imported `CITATION_TTL_DAYS` from `lib/verification.mjs` (never redefined) and kept the script out of prebuild and off the network (no `fetch`).

## Task Commits

1. **Task 1: the read-only worst-first audit generator** - `c331027` (feat)
2. **Task 2: audit ordering, citation-queue and read-only behaviour test** - `4c63148` (test)

**Plan metadata:** see final docs commit.

## Files Created/Modified
- `scripts/audit-verification.mjs` - the standalone read-only audit generator and its pure `buildAuditReport` core.
- `test/audit.test.js` - 13 `node:test` cases over ordering, counts, the citation queues, warnings, listings and read-only behaviour.
- `.gitignore` - ignores the generated dated artefact `docs/DATA-AUDIT-*.md`.

## Decisions Made
- The dated audit doc is generated on demand and gitignored; committing a fresh dated file every run would churn the repo and the editorial lint would scan it, so the script and test are the durable artefacts (the doc is reproducible from them).
- R-09 dropped-link detection keys on a fact-level `provenance.sourceRegistryId` marker (the same field the lead schema names as the promotion's mandatory ODbL link), flagging any fact that names a share-alike source it no longer cites.
- Citation-rot and citation-staleness iterate every cited source id in `fact.sources[]`, not only the confirms-pass-cited ids, so a rotted or TTL-aged citation is surfaced even when it renders without a pass checking it.

## Deviations from Plan

None - plan executed exactly as written. No deviation rules (1-4) were triggered; zero new dependencies (threat T-02-06-SC holds).

## Issues Encountered
None. `node --test test/audit.test.js` passes 13/13, the full suite passes 140/140, `npm run prebuild` remains green (the audit is not in it), `grep -E "fetch\(" scripts/audit-verification.mjs` returns no matches, and `git status --porcelain src/_data` is empty after running the audit.

## User Setup Required
None - no external service configuration and zero new npm dependencies. The audit runs offline against the committed verdict cache.

## Next Phase Readiness
- 03a can consume the same seven derived states and the VRFY-12 last-verified date the audit surfaces to render the review-due indicator and the withheld/contested treatments.
- The audit is the human triage surface for the D-17 adjudication workflow: it lists which facts to look at worst-first; the human edits the fact inline, and the next run reflects the change.

## Threat Flags

None - the audit introduces no new network endpoints, auth paths or trust-boundary schema changes; it reads the corpus and the committed verdict cache and writes only under docs/. The threat register's `mitigate` items are all honoured: T-02-06-01 (read-only, src/_data-unchanged test, R-30/R-09 are listings only), T-02-06-02 (dated, worst-first, both staleness queues), T-02-06-03 (non-zero-fact guard) and T-02-06-04 (future-date Data warnings) are implemented and tested.

## Self-Check: PASSED

Both created files and the modified `.gitignore` verified present; both task commits (c331027, 4c63148) verified in git history. Task file 13/13, full suite 140/140, prebuild green, purity grep clean, src/_data unchanged after run.

---
*Phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion*
*Completed: 2026-07-01*
