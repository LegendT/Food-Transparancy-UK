---
status: partial
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md, 02-07-SUMMARY.md]
started: 2026-07-01T15:00:31Z
updated: 2026-07-01T15:40:00Z
---

## Current Test

[testing paused — session redirected into the Review 3 deep adversarial pass
(02-REVIEW-3.md), which superseded manual UAT. Tests 1-2 were verified during
that pass; the two network scripts (4-5) are manual/off-build and were not run.]

## Tests

### 1. Per-fact publication gate: honest publish/withhold breakdown
expected: `npm run prebuild` exits 0 and prints a derived-state breakdown of 1 published-confirmed, 1 published-contested, 18 withheld-unverified (the honest outcome; most historic facts do not meet the strict bar).
result: pass

### 2. Full verification test suite green
expected: `node --test 'test/**/*.test.js'` runs with 0 failures, pinning the D-15 precedence, both claim standards, lineage/cycle canonicalisation, the four-verdict classifier, the SSRF host guard, and the corpus-escape belt.
result: pass
note: 175 pass / 0 fail after the Review 3 fixes (was 162 pre-review).

### 3. Worst-first audit report generation (offline)
expected: `npm run audit` reads the committed verdict cache (no network), asserts a non-zero fact count, and writes `docs/DATA-AUDIT-{date}.md` with a counts-by-status table that lists withheld-in-review and withheld-unverified as separate rows, worst-first discrepancies, a citations-due-for-recheck queue, and an OFF-derived (ODbL) section.
result: skipped
reason: not run as UAT; the audit is exercised by test/audit.test.js (green).

### 4. Four-verdict citation existence checker (network, optional)
expected: `npm run check:citations` performs HEAD/GET/Wayback/Crossref escalation with per-hop SSRF re-guarding, classifies each source as RESOLVES / DOES_NOT_RESOLVE / ACCESS_BLOCKED / INDETERMINATE, and writes only existence verdicts (never a value or pass) into `.cache/citation-verdicts.json`.
result: skipped
reason: manual, off-build network script; not run in this session.

### 5. OFF ingestion into the isolated lead store (network, optional)
expected: `npm run ingest:off` fetches the OFF v2 barcode API (host-constrained to world.openfoodfacts.org, 512 KB byte cap) and writes provenance-tagged leads into `ingestion/leads/`, OUTSIDE `src/_data`, each carrying `sourceRegistryId: "off"` for the ODbL link, `promotion.status: pending`.
result: skipped
reason: manual, off-build network script; not run in this session.

## Summary

total: 5
passed: 2
issues: 0
pending: 0
skipped: 3
blocked: 0

## Gaps

[none yet]
