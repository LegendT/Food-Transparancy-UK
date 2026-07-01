---
phase: 02
slug: claim-typed-verification-per-fact-publication-gate-ingestion
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-01
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node 24 built-in runner) |
| **Config file** | none - tests are `test/*.test.js`, discovered by `node --test` |
| **Quick run command** | `node --test` |
| **Full suite command** | `npm test` (`node --test` + `npm run build` + `npm run a11y:all`) |
| **Estimated runtime** | ~10 seconds (unit); a11y adds ~30s |

---

## Sampling Rate

- **After every task commit:** Run `node --test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds (unit)

---

## Per-Plan Verification Map

Task IDs are `{plan}-{NN}`; each plan below ships its own `test/*.test.js` proving its requirements. All commands are offline (no network - the citation checker and OFF ingestion run out-of-band and the gate reads a committed cache).

| Plan | Wave | Requirements | Test Type | Automated Command | Status |
|------|------|--------------|-----------|-------------------|--------|
| 02-01 schema contracts + fixtures | 0 | VRFY-01/02/03/04/07/08/11, DATA-05/06 | unit | `node --test test/verification-schema.test.js` | ✅ green |
| 02-02 verification derivation library | 1 | VRFY-01/03/04/08/09/11/12 | unit (tdd) | `node --test test/verification.test.js` | ✅ green |
| 02-04 OFF ingestion + lead store | 1 | DATA-05/06, VRFY-10 | unit | `node --test test/ingest-off.test.js test/lead.test.js` | ✅ green |
| 02-05 four-verdict citation checker | 1 | VRFY-07 | unit (tdd) | `node --test test/citation-status.test.js` | ✅ green |
| 02-03 per-fact gate wiring | 2 | VRFY-01/04/07/08, DATA-05 | unit + build | `node --test test/corpus-gate.test.js` | ✅ green |
| 02-06 worst-first audit command | 2 | VRFY-03/05/06/09/12 | unit | `node --test test/audit.test.js` | ✅ green |
| 02-07 worked verification data | 3 | VRFY-01/02/11 | build + manual checkpoint | `npm run prebuild` (green) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `test/verification-schema.test.js` - schema-validity + status-null-constraint proof (02-01)
- [x] `test/fixtures/valid/*` and `test/fixtures/invalid/*` - surgical positive/negative fixtures for each gate failure path (02-01)

*node:test is a Node 24 built-in - no framework install task. No shared `conftest`-style fixture module; fixtures are JSON files under `test/fixtures/`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Human editor authors/approves the real pass verdicts and the Lucozade `adjudication.outcome: contested` note on `src/_data/**` | VRFY-02, VRFY-11 | "AI never adjudicates" (D-04/D-11) - verdicts and adjudication notes are human editorial work; 02-07 Task 2 is a `checkpoint:human-action` blocking gate mirroring the 01-10 precedent | Editor authors the two pass records + the contested positions/note; approves at the checkpoint; the autonomous follow-on transcribes only the approved values, then `npm run prebuild` must stay green |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (02-07's verdict-authoring is a required human checkpoint, not an automated gap)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (schemas + fixtures precede the library/gate work)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-01

---

## Validation Audit 2026-07-01

Retroactive audit against the completed phase. All seven per-plan test files exist and the full suite runs green (`node --test 'test/**/*.test.js'` → 162 pass / 0 fail; later 175 after the Review 3 regression tests, see `02-REVIEW-3.md`). Every phase requirement (VRFY-01..12, DATA-05/06) maps to at least one green automated test; the sole manual item (VRFY-02/VRFY-11 human adjudication authoring) remains correctly documented as Manual-Only. No MISSING or PARTIAL gaps — no auditor spawn required.

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
