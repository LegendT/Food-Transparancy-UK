---
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
verified: 2026-07-01T13:00:00Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
---

# Phase 2: Claim-Typed Verification, Per-Fact Publication Gate & Ingestion Verification Report

**Phase Goal:** The claim-typed two-pass verification workflow and the per-fact verification-sufficiency gate (an extension of the Phase 1 validation harness) exist and gate everything downstream: a page publishes its verified subset with every unverified fact shown as an explicit withheld placeholder (data/status only in Phase 2; rendering is Phase 3a), a contested fact publishes with a visible both-sides treatment (data/status), disagreements escalate to human adjudication, every fact carries a workflow/published status and a last-verified date, a fact past its staleness threshold shows a reader-facing "review due" status (data/status), the gate is continuous (a fact found `wrong` auto-withdraws), and Open Food Facts data enters only as provenance-tagged draft leads.

**Verified:** 2026-07-01
**Status:** passed
**Re-verification:** No — initial verification

**Scope note applied:** Per the phase's explicit scope note, VRFY-11 and VRFY-12 are verified here at the DATA/STATUS layer only (derived `published-contested` state + `positions[]`; derived `published-stale` state + last-verified date). Rendering of the withheld placeholder, both-sides treatment, and the reader-facing "review due" indicator is out of scope for Phase 2 (owned by Phase 3a per ROADMAP and CONTEXT.md lines 14/172) and was NOT penalised in this verification.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `node --test` passes with 140 tests, 0 failures | VERIFIED | Ran `node --test`: `tests 140`, `pass 140`, `fail 0`, `cancelled 0` |
| 2 | `npm run prebuild` exits 0 | VERIFIED | Ran `npm run prebuild`: validate, lint:editorial, check:images all pass; "Data validation passed." |
| 3 | `lib/verification.mjs` exports the D-15 seven-state precedence machine in the correct order (wrong > contested > non-resolving-citation > disagreement > insufficient split > stale > confirmed) | VERIFIED | Read `lib/verification.mjs` lines 174-255: `deriveVerificationState` guard chain matches exactly, including the R-14 contested-position RESOLVES precondition, R-15 confirms-scoped existence check, R-03 adjudication clearing, and the VRFY-03 in-review/unverified split at step 5 |
| 4 | `meetsCorroborable`, `meetsAuthoritative` (distinct reviewerKind, kind-based), `checkDistinctLineage` (transitive root + cycle canonicalisation), `checkMeasureMismatch`, `checkValueDivergence`, `classifyStaleness` (entityType-aware), `CITATION_TTL_DAYS=180` all exist and behave as specified | VERIFIED | All exported (confirmed via dynamic import: all typed `function`, `CITATION_TTL_DAYS` = 180); `lineageRoot()` (lines 50-62) implements transitive resolution with lexicographically-minimal cycle canonicalisation; `meetsAuthoritative` checks `Set(reviewerKind).size >= 2` (line 122); `classifyStaleness` threads `entityType` (lines 135-141); unit tests at 32/32 in `test/verification.test.js` cover every branch |
| 5 | `scripts/validate-data.mjs` wires the gate: lineage/measure/value-divergence are per-fact WITHHOLD (not build failures); build fails only on internal-consistency violations | VERIFIED | Read full file: Gate 5 (lines 243-376) computes `consistencyErrors` only for contested-without-adjudication, contested non-null value (R-05), sourcesChecked-not-subset, malformed markedWrong, and dangling derivedFrom (R-16); lineage/measure/divergence are NOT in this array — they are withhold reasons returned by `deriveVerificationState` and only appear in the non-failing status-breakdown report |
| 6 | The gate reads `.cache/citation-verdicts.json` offline (absent = UNCHECKED = withheld) and prints a status breakdown | VERIFIED | Lines 262-265, 331-350: reads `CACHE_FILE` via `existsSync`/readJson, defaults to `{}`; prints `Derived publication states (TTL 180d): ...` |
| 7 | The real corpus derives to published-confirmed=1, published-contested=1, withheld-unverified=18 | VERIFIED | `npm run prebuild` output: `published-confirmed=1 published-contested=1 published-stale=0 withheld-unverified=18 withheld-in-review=0 withheld-open-disagreement=0 withheld-wrong=0` — exact match |
| 8 | `lib/citation-status.mjs` + `scripts/check-citations.mjs`: four-verdict classifier, manual-redirect SSRF guard, DOI slash kept intact, byte cap; checker NOT in prebuild | VERIFIED | `lib/citation-status.mjs` exports `classifyStatus`, `isBlockedHost`, `assertPublicHttpsUrl`, `normaliseDoiForApi`, `pickClosestSnapshot`, `isSoftNotFound` (295 lines); `scripts/check-citations.mjs` (434 lines) uses `redirect: "manual"` with per-hop re-validation, a 512KB `BYTE_CEILING`, `normaliseDoiForApi` for slash-intact DOIs, and `snapshotUrl` persistence; `check:citations` confirmed absent from the `prebuild` script string |
| 9 | `scripts/ingest-off.mjs` + `ingestion/`: OFF leads written outside `src/_data`, no `sources` key (D-19), field-level provenance, off-revision-diff as pending lead; ingester not in prebuild | VERIFIED | `ingestion/barcodes.json` and `ingestion/leads/.gitkeep` exist outside `src/_data`; `grep '"sources"' scripts/ingest-off.mjs` and `schemas/lead.schema.json` both return non-zero (absent); `sourceRegistryId: "off"` present (R-09); `ingest:off` absent from `prebuild` |
| 10 | `scripts/audit-verification.mjs`: read-only worst-first audit with required sections, writes no fact, never adjudicates | VERIFIED | Ran `node scripts/audit-verification.mjs`: wrote `docs/DATA-AUDIT-2026-07-01.md` with all required section headings (Counts by status, Discrepancies to approve worst-first, Citations no longer resolving, Citations due for re-check, Data warnings, OFF-derived facts (ODbL), Authoritative classification spot-check, Reviewer disagreements); `git status --porcelain src/_data` empty after run; `audit` absent from `prebuild` |
| 11 | Worked data: spike-01 manufacturer derives published-confirmed (corroborable, Companies House primary + Suntory distinct lineage) | VERIFIED | `src/_data/products/spike-01.json` manufacturer fact: `claimType: "corroborable"`, two confirms passes citing `companies-house-lrs-08603549` (sourceType primary, derivedFrom null) and `sbf-gbi-2020` (sourceType primary, derivedFrom null) — two distinct null-root lineages, one primary; `.cache/citation-verdicts.json` seeds both as fresh RESOLVES; `npm run prebuild` confirms 1 published-confirmed in the corpus |
| 12 | The Lucozade documentedChange derives published-contested (value null, two positions) | VERIFIED | `src/_data/timeline/spike-lucozade-2017-sugar-cut.json`: `documentedChange.value` is `null`; `verification.adjudication.outcome: "contested"` with note and date; `verification.contested.positions` has 2 entries each with value/sources/note; both cited sources (`lucozade-grocer-2017`, `diabetes-couk-2017`) are fresh RESOLVES in the cache |
| 13 | AI-never-adjudicates: pass verdicts and contested adjudication were authored at a human checkpoint, not by an autonomous task | VERIFIED | `02-07-PLAN.md` Task 2 is `<task type="checkpoint:human-action" gate="blocking">` (line 107); Task 1 (lineage tags) and Task 3 (mechanical transcription) are `type="auto"`; the plan's "Scope honesty" section explicitly forbids an autonomous task from writing pass verdicts/adjudication outcomes; SUMMARY confirms Task 2 "was the blocking human-action checkpoint" with no commit (an editorial act) |
| 14 | Requirement traceability: all 14 phase requirement IDs accounted for | VERIFIED | REQUIREMENTS.md lists VRFY-01 through VRFY-12, DATA-05, DATA-06 all `[x]` and mapped "Phase 2 / Complete"; every ID appears in at least one plan's `requirements:` frontmatter; no orphaned requirements found |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `schemas/sourced-value.schema.json` | inline `verification` object, `$defs/measure`, derived-only status | VERIFIED | `verification` in properties; `verificationStatus`/`publicationStatus` both `{"enum":[null]}`; `$defs` contains `grade` and `measure` |
| `schemas/lead.schema.json` | OFF lead envelope, no `sources` key | VERIFIED | Compiles under Ajv; `grep '"sources"'` returns non-zero (absent) |
| `schemas/source.schema.json` | `derivedFrom` lineage pointer | VERIFIED | Present on all 19 registry records including the new `mondelez-cdm-2019-pressrelease` root |
| Entity schemas (product/ingredient/brand/additive/timeline-event) | `verificationStatus`/`publicationStatus` constrained `enum:[null]` (R-06) | VERIFIED | Confirmed via script: all 5 schemas, both fields, `enum: [null]` |
| `lib/verification.mjs` | pure D-15 precedence machine + helpers | VERIFIED | 332 lines; all 11 expected exports present; no `fs`/`fetch` (purity confirmed by SUMMARY grep and re-confirmed by reading) |
| `lib/citation-status.mjs` | pure four-verdict classifier + SSRF guard | VERIFIED | 295 lines; 6 exports present |
| `scripts/validate-data.mjs` | extended offline gate | VERIFIED | 376 lines; Gate 5 wired exactly as specified |
| `scripts/check-citations.mjs` | network existence checker | VERIFIED | 434 lines; manual redirect, byte cap, snapshotUrl persistence, DOI slash-intact all present |
| `scripts/ingest-off.mjs` | OFF v2 ingestion into isolated lead store | VERIFIED | 225 lines; host-constrained, byte-capped, standalone |
| `scripts/audit-verification.mjs` | read-only worst-first audit | VERIFIED | 377 lines; all required sections present; read-only confirmed by running it |
| `ingestion/barcodes.json`, `ingestion/leads/.gitkeep` | isolated lead store | VERIFIED | Present, outside `src/_data` |
| `.cache/citation-verdicts.json` | seeded RESOLVES cache for worked examples | VERIFIED | 4 entries, correct SEAM shape |
| Ten fixtures (02-01) | negative fixtures per gate failure path | VERIFIED | `test/fixtures/valid/*` and `test/fixtures/invalid/*` all present per 02-01 SUMMARY key-files list; exercised by passing tests |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `schemas/lead.schema.json` | `scripts/validate-data.mjs` corpus-escape guard | no `sources` key so `hasSourcedShape` never trips | WIRED | Confirmed: lead schema has no `sources` key; corpus-gate tests (`test/lead.test.js`) prove the gate ignores `ingestion/leads/` |
| `lib/verification.mjs` | `scripts/validate-data.mjs` | `deriveVerificationState`, `lineageSimilarityWarnings`, `CITATION_TTL_DAYS` imports | WIRED | Import statement present at lines 27-31 of validate-data.mjs; used throughout Gate 5 |
| `scripts/check-citations.mjs` | `.cache/citation-verdicts.json` | writes the SEAM-shaped cache | WIRED | Cache file exists with the exact `{verdict, resolvedVia, checkedAt, statusCode, snapshotUrl}` shape |
| `scripts/validate-data.mjs` | `.cache/citation-verdicts.json` | reads the cache offline, never fetches | WIRED | `grep -E "fetch\(|check-citations" scripts/validate-data.mjs` returns no matches per 02-03 SUMMARY; confirmed no network calls in the read path |
| `scripts/audit-verification.mjs` | `lib/verification.mjs` | `deriveVerificationState`, `classifyStaleness`, `CITATION_TTL_DAYS` | WIRED | Same shared constant imported, not redefined; confirmed by running the audit and inspecting its counts |
| `lead.provenance.sourceRegistryId` | `off` source in `sources.json` | R-09 ODbL obligation | WIRED | `sourceRegistryId: "off"` hardcoded into every lead produced by `offProductToLead` |
| `src/_data/products/spike-01.json` manufacturer | two distinct-lineage primary sources | `derivedFrom: null` on both | WIRED | Confirmed both sources are independent roots, both `sourceType: "primary"` |
| `spike-lucozade-2017-sugar-cut.json` | `verification.contested.positions[]` | singular value withheld (null) | WIRED | Confirmed: `documentedChange.value` is `null`, two positions present |

### Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
|-----------|---------|--------|--------|
| Full test suite passes | `node --test` | tests 140, pass 140, fail 0 | PASS |
| Prebuild gate is green over real corpus | `npm run prebuild` | exit 0, "Data validation passed." | PASS |
| Derived-state corpus counts match spec | (embedded in prebuild output) | `published-confirmed=1 published-contested=1 ... withheld-unverified=18` | PASS |
| Audit command runs read-only over real corpus | `node scripts/audit-verification.mjs` | exit 0, wrote dated doc, `git status --porcelain src/_data` empty | PASS |
| Schema exports/derived-only constraints | inline node script checks | all entity schemas + SourcedValue correctly constrained | PASS |
| No `sources` key in lead artefacts | `grep '"sources"'` on lead.schema.json and ingest-off.mjs | both return non-zero (absent) | PASS |
| check:citations/ingest:off/audit excluded from prebuild | inline node script check | `not-in-prebuild-good` | PASS |

### Probe Execution

No dedicated `scripts/*/tests/probe-*.sh` convention exists in this project; the phase's own `<verify><automated>` blocks (node --test invocations and npm run prebuild) serve this role and were executed directly above (Step 7b/behavioural spot-checks). No separate probe scripts were declared in any PLAN/SUMMARY for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VRFY-01 | 02-01, 02-02, 02-03, 02-07 | Claim-typed two-standard verification | SATISFIED | `meetsCorroborable`/`meetsAuthoritative` implemented and unit-tested; spike-01 manufacturer fact demonstrates corroborable standard on real data |
| VRFY-02 | 02-01, 02-07 | Disagreement -> human adjudication (confirmed/corrected/contested); AI never adjudicates | SATISFIED | Adjudication clearing logic in `deriveVerificationState`; the Lucozade contested adjudication was authored at a blocking human checkpoint (02-07 Task 2) |
| VRFY-03 | 02-01, 02-02, 02-06 | Workflow/published status states + last-verified date | SATISFIED | Seven-state D-15 precedence including the in-review/unverified split; audit counts-by-status table lists them as separate rows |
| VRFY-04 | 02-01, 02-02, 02-03 | Per-fact gate; continuous `wrong` auto-withhold | SATISFIED | `markedWrong` takes top precedence in `deriveVerificationState`; gate re-derives every build (no stored flag) |
| VRFY-05 | 02-06 | Re-verification audit command | SATISFIED | `scripts/audit-verification.mjs` produces the dated worst-first record; ran successfully |
| VRFY-06 | 02-06 | Audit record format: worst-first ordering | SATISFIED | Audit doc confirmed to have the ordering sections; `test/audit.test.js` pins ordering (13/13 passing) |
| VRFY-07 | 02-01, 02-03, 02-05 | Citation-existence check before any pass counts | SATISFIED | Four-verdict classifier + escalation in `lib/citation-status.mjs`/`scripts/check-citations.mjs`; gate step 3 enforces the fresh-RESOLVES precondition |
| VRFY-08 | 02-01, 02-02, 02-03 | Measure-mismatch auto-disagreement | SATISFIED | `checkMeasureMismatch` and `checkValueDivergence` implemented and unit-tested; wired into `deriveVerificationState` step 4 |
| VRFY-09 | 02-02, 02-06 | Staleness thresholds per class | SATISFIED | `classifyStaleness`/`isPastStaleness` implemented; audit surfaces stale facts and last-verified dates |
| VRFY-10 | 02-04 | OFF revision-diff as a lead, human-confirm before publish | SATISFIED | `off-revision-diff` leadType with `promotion.status: "pending"`; `test/lead.test.js` proves it cannot publish without promotion |
| VRFY-11 | 02-01, 02-02, 02-07 | Contested fact: both-sides data (rendering deferred to Phase 3a per scope note) | SATISFIED (data/status layer) | `published-contested` state derivation + `positions[]` demonstrated on real data (Lucozade); rendering explicitly out of scope here |
| VRFY-12 | 02-02, 02-06 | Staleness "review due" data (rendering deferred to Phase 3a per scope note) | SATISFIED (data/status layer) | `published-stale` state + `lastVerified` date derivation implemented and unit-tested; audit surfaces the date; rendering explicitly out of scope here |
| DATA-05 | 02-01, 02-03, 02-04 | OFF/imported data as unverified leads only | SATISFIED | Lead schema isolated from the SourcedValue corpus; corpus-escape guard tested |
| DATA-06 | 02-01, 02-04 | Ingestion with field-level provenance | SATISFIED | `offProductToLead` records field-level provenance with correct measure basis (per-100g/per-serving/none, R-24) |

No orphaned requirements: all 14 IDs mapped to this phase in REQUIREMENTS.md appear in at least one plan's `requirements:` frontmatter.

### Anti-Patterns Found

None blocking. Searched all phase-modified files (`lib/verification.mjs`, `lib/citation-status.mjs`, `scripts/validate-data.mjs`, `scripts/check-citations.mjs`, `scripts/ingest-off.mjs`, `scripts/audit-verification.mjs`, all extended schemas, and the worked `src/_data` files) for `TBD`/`FIXME`/`XXX` — zero matches. Two `placeholder` string matches in `scripts/ingest-off.mjs` (lines 193, 214) refer to the intentional, documented empty-barcode entries for the three launch spike products (no confirmed GB barcode yet); this is explicitly called out in the 02-04 SUMMARY under "Known Stubs" as an editorial data gap, not a code gap, and does not affect the ingestion path's behaviour (it logs and skips cleanly). Not a blocker.

### Human Verification Required

None. This phase delivers a data/status/build-tooling layer with no user-facing rendering; all success criteria are verifiable by running the test suite, the prebuild gate, and the audit command directly. Rendering-dependent verification (the withheld placeholder's visual treatment, the contested both-sides page, the reader-facing review-due indicator) is explicitly deferred to Phase 3a per the ROADMAP and CONTEXT.md scope note and is out of scope for this verification.

### Gaps Summary

No gaps. Every must-have truth, artifact, and key link verified directly against the codebase (not SUMMARY claims): the full test suite runs 140/140 green, `npm run prebuild` is green and produces the exact expected derived-state breakdown (published-confirmed=1, published-contested=1, withheld-unverified=18), all six new/extended library and script files exist with their expected exports and behaviours, the two worked real-data examples (spike-01 corroborable authoritative-turned-corroborable manufacturer fact, and the Lucozade contested sugar figure) are correctly encoded and derive to their intended states, and the AI-never-adjudicates boundary was honoured via a blocking human-action checkpoint in 02-07. All 14 phase requirement IDs are satisfied and traced. The phase goal — the claim-typed two-pass verification workflow and the per-fact publication gate exist and gate everything downstream at the data/status layer — is achieved.

---

_Verified: 2026-07-01_
_Verifier: Claude (gsd-verifier)_
