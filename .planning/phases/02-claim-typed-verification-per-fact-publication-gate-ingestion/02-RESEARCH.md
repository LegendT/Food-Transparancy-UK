# Phase 2: Claim-Typed Verification, Per-Fact Publication Gate & Ingestion - Research

**Researched:** 2026-07-01
**Domain:** Build-time data-verification gating (Node 24 + Ajv), server-side citation-existence checking (native fetch against public REST APIs), and provenance-tagged data ingestion (Open Food Facts).
**Confidence:** HIGH

## Summary

Phase 2 is almost entirely an extension of code that already exists. The Phase 1 harness (`lib/validate.mjs`, `lib/referential.mjs`, `scripts/validate-data.mjs`) already walks every `SourcedValue` by signature via `collectFacts`, already runs a pure-function `{ errors }` / `{ warnings }` gate chain, already has a corpus-escape guard, and already reserves the two nullable status fields the gate will now compute. There is no new framework, no new runtime, and (importantly) no new npm dependency required: everything Phase 2 needs is Node 24's built-in `fetch`, the `node:test` runner, and the Ajv instance already compiled. The single most important modelling rule - a "pass" is a verification *event*, never a source (D-02) - is a data-shape decision, not a library decision. [VERIFIED: codebase grep]

The three network-touching capabilities (the four-verdict citation-existence checker, the OFF ingestion, and the audit command's live re-check) are all reachable server-side and were confirmed live this session. The Crossref REST API, the Handle proxy, the Wayback CDX server, and the Open Food Facts v2 product API all responded with exactly the shapes D-07 through D-10 and DATA-06 assume. [VERIFIED: live curl 2026-07-01] The one surprise strengthens the design rather than breaking it: the Wayback **availability** API (`archive.org/wayback/available`) rate-limited this session's IP with HTTP 429 on every call, while the Wayback **CDX** server (`web.archive.org/cdx/search/cdx`) answered normally. That is the four-verdict model demonstrating itself - a live host refusing a bot is `ACCESS_BLOCKED`, not a dead link - and it tells the planner to prefer CDX as the primary archival probe, cache aggressively, and honour `Retry-After`.

**Primary recommendation:** Model the `verification` record as an inline sibling object holding a `passes[]` array of events plus optional `adjudication` / `contested` / `markedWrong` sub-objects; make publication status a build-time *derived* value (never a stored flag) computed by a new pure function in `lib/`; split the network-touching existence check and OFF ingestion into separate cached scripts that the offline prebuild gate reads from a diffable cache; and keep OFF leads in `ingestion/leads/` under a distinct `lead` schema that never uses the key `sources`, so the corpus-escape guard never sees them. Introduce zero new dependencies.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Inline verification record + claim-typed pass rules | Data model (schemas) | Build gate (`lib/`) | The shape lives in `sourced-value.schema.json`; the counting/derivation logic lives in `lib/referential.mjs` as pure functions. |
| Per-fact publication-state derivation | Build gate (`lib/`) | Render (Phase 3a) | Phase 2 produces the pure `deriveVerificationState()` function and stamps a build report; Phase 3a renders the withheld/contested/stale treatments. |
| Distinct-lineage + measure-mismatch checks | Build gate (`lib/`) | Source registry (`sources.json`) | Mechanical checks over facts; the authoritative lineage tag lives on source records. |
| Four-verdict citation-existence check | Build-time network script + cache | Build gate (reads cache) | Network is non-deterministic; it runs as a separate cached script so the prebuild stays offline and reproducible. |
| OFF ingestion into leads | Build-time network script (ingestion) | Draft/lead store (outside cascade) | Reads OFF v2 API; writes leads outside `src/_data`, never touching the published corpus. |
| Audit / staleness / adjudication queue | Read-only reporting script | Build gate (shares `lib/`) | Reads the derived model + staleness classes; emits a dated worst-first markdown; never mutates values. |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The `verification` record lives INLINE in each `SourcedValue`, as a sibling of `value` / `sources` / `confidence`. Reuses `collectFacts`; keeps a fact's value and its verification in one git diff. Accepted cost: every fact grows.
- **D-02 (load-bearing):** A "pass" is a verification EVENT, not a source. The gate counts passes that meet the standard, never `sources[]` length. A pass records `{ reviewerKind, sourcesChecked[], measure, checkedValue, verdict, checkedOn }` where `reviewerKind` is `human` / `ai` / `blinded-reread` and `verdict` is `confirms` / `disputes` / `inaccessible`. A fact may cite two sources yet have zero passes.
- **D-03:** Publication status is DERIVED at build time from the `verification` record every build, never a hand-authored flag. The reserved stored `publicationStatus` becomes validated-only or is dropped, so a fact marked `wrong` cannot stay published through author drift (makes VRFY-04 continuous).
- **D-04:** A fact's adjudication verdict is recorded INLINE (an `adjudication` sub-object: outcome confirmed / corrected / contested, plus a required note and date). AI never writes a verdict; only a human edits it.
- **D-05:** Corroborable fact: publishable only with >=2 `confirms` passes, citing >=2 DISTINCT-lineage sources (D-14 lineage rule), at least one a primary source (per registry `sourceType`). Distinct-lineage enforcement applies HERE.
- **D-06:** Authoritative fact: publishable only with 1 authority pass plus an independent RE-READ pass. Both passes cite the SAME authority by design, so distinct-lineage does NOT apply; instead the two passes must have distinct `reviewerKind` (human then different human, human then blinded-reread, or human then ai).
- **D-07:** Every cited URL/DOI is checked for existence before any pass counts, using a FOUR-value verdict: `RESOLVES` (the only value that satisfies the precondition) / `DOES_NOT_RESOLVE` (404/410/NXDOMAIN/hard-refused-with-no-archive) / `ACCESS_BLOCKED` (401/403/407/429/451/999/CDN challenge/timeout) / `INDETERMINATE` (5xx/transient/ambiguous soft-404). Only 404/410/NXDOMAIN are affirmative non-existence.
- **D-08:** Escalation order: (1) live check with a realistic browser UA, HEAD then retry once with GET `Range: bytes=0-0` on 403/405/429, follow redirects (cap ~10), honour `Retry-After` once; (2) on ACCESS_BLOCKED/INDETERMINATE auto-query Wayback and if a 200 snapshot exists promote to RESOLVES using the snapshot URL+timestamp as the stored citation; (3) only if blocked AND no snapshot reaches a human as `ACCESS_BLOCKED - needs-human-check`. Store per citation `statusCode`/errorClass -> `verdict` -> `resolvedVia` (`live` | `wayback:<timestamp>` | `crossref` | `handle`) -> `checkedAt`.
- **D-09:** DOI existence via two independent registrar APIs: Crossref REST (`https://api.crossref.org/works/{doi}`, 200=exists, 404=not a Crossref DOI) and the Handle proxy (`https://doi.org/api/handles/{doi}`, `responseCode` 1=exists, 100=not found). Exists if Crossref 200 OR Handle 1; does-not-exist only if Crossref 404 AND Handle 100; else INDETERMINATE. Send a polite UA with a contact mailto to Crossref.
- **D-10:** All existence checks run server-side in Node build/audit tooling. Keep a small "known bot-hostile hosts" set (tesco.com, ocado.com, asda.com, sainsburys.co.uk, web.archive.org) that biases refusals to ACCESS_BLOCKED + Wayback fallback. Cap ~1-2 req/s, cache results (diffable in git), and do NOT add proxies, headless browsers, or TLS-fingerprint spoofing.
- **D-11:** Phase 2 builds the GATE and cheap mechanical checks, NOT automated verification passes. The two verification passes stay editor-authored. A raw automated fetch is NEVER promoted to a satisfied pass on its own.
- **D-12:** Distinct-lineage is HYBRID. A human-declared lineage tag on source records (`lineageId` or `derivedFrom` parent pointer extending `sources.json` / `source.schema.json`) is AUTHORITATIVE for the gate. A separate automated similarity heuristic raises a NON-BLOCKING warning for undeclared co-derivation. `derivedFrom` is preferred if cleaner (computes lineage groups transitively).
- **D-13:** Each pass records a STRUCTURED measure `{ basis: per-100g | per-100ml | per-serving, state: as-sold | as-prepared, jurisdiction?, asOf? }`. Rule is exact-match-or-disagree: unequal structured measures auto-raise a disagreement even when values look close.
- **D-14:** A contested fact needs a `contested` sub-shape: an array of positions, each with its own value + sources + note, populated only when a human adjudicates `contested`. The singular `value` is withheld/null while contested.
- **D-15:** The gate derives exactly one publication state per fact (the STALE-still-publishes / WRONG-and-DISAGREEMENT-withhold table - see Architecture Patterns Seam 1).
- **D-16:** Three staleness classes: regulatory 12 months / current 24 months / historical static (no threshold). Derivation: `regulatory` if `claimDomain === "regulatory"`; `historical` if it belongs to a timeline-event entity or is an explicitly-tagged past-formulation fact; otherwise `current`. A product-embedded past-formulation fact that is not a timeline event carries an explicit `stalenessClass` override.
- **D-17:** The VRFY-05 audit command generates a dated, worst-first queue document modelled on DEBT's `DATA-AUDIT.md` (counts-by-status table, discrepancy sections ordered wrong -> stale -> oldest-first each carrying the recorded structured measure, plus a separate "reviewer disagreements" section). The human adjudicates by editing the fact inline. AI never writes a verdict.
- **D-18:** `claimType` / `claimDomain` stay author-self-classified; the gate enforces only the structural / pass-count consequences of the declared `claimType`. No automated semantic classifier.
- **D-19:** An OFF lead is NOT a fact. Leads are raw imported data with field-level OFF provenance under a DISTINCT `lead` schema (not the `SourcedValue` envelope), living OUTSIDE the published data directory (e.g. `ingestion/leads/`), outside the Eleventy cascade. Promotion is the explicit human step. The OFF revision-diff is recorded as a `lead`; Phase 2 does NOT build a full automated revision differ.

### Claude's Discretion

- Exact field names and JSON shape of the inline `verification` record (passes array, structured measure, `contested` and `adjudication` sub-objects), consistent with `schemas/sourced-value.schema.json` style.
- `derivedFrom` parent pointer vs flat `lineageId` for D-12.
- The lineage-similarity heuristic's specific signals and warning threshold.
- Exact draft-store path and its exclusion from the Eleventy cascade and the validation corpus.
- Whether the audit queue doc is committed or generated on demand (a dated artefact either way).
- Whether to build the ~120-line vanilla-Node existence checker as one module or fold it into `lib/`.

### Deferred Ideas (OUT OF SCOPE)

- Robust archival/primary fetch automation (Wayback CDX capture, manufacturer pack-image capture) as a first-class verification source. Phase 2 keeps it as a thin editor aid plus the existence-check Wayback fallback only.
- Automated OFF revision differ (continuous diffing of OFF snapshots). Phase 2 records the lead status and never-publish guard only.
- Rendering of the withheld placeholder, the contested both-sides treatment, and the reader-facing review-due indicator (Phase 3a produces these from the data/status Phase 2 emits).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VRFY-01 | Claim-typed publish standard (corroborable 2-pass/distinct-lineage/>=1 primary; authoritative 1+re-read) | Seam 1: verification record + `deriveVerificationState()` + `checkDistinctLineage()`. |
| VRFY-02 | Disagreement withholds + routes to human (confirmed/corrected/contested); AI never adjudicates | Seam 1 derived state `withheld-open-disagreement`; Seam 3 audit queue; `adjudication` sub-object (human-only). |
| VRFY-03 | Every fact carries workflow + published status plus last-(re)verified date | Derived states table (D-15) + last-verified = max `confirms` pass `checkedOn`. |
| VRFY-04 | Continuous per-fact gate; `wrong` auto-withholds on next build | Derived (never stored) status (D-03) + `markedWrong` precedence in the derivation. |
| VRFY-05 | Re-verification audit command outputs status/verdicts, flags stale + non-resolving | Seam 3 `scripts/audit-verification.mjs` reading the model + existence cache. |
| VRFY-06 | Dated audit record, worst-first ordering, no value changes without human approval | Seam 3 queue modelled on DEBT `DATA-AUDIT.md`. |
| VRFY-07 | Automated existence/resolves check before any pass counts | Seam 1 four-verdict checker (verified live); gate reads cached verdicts. |
| VRFY-08 | Measure-mismatch auto-raises a disagreement | Seam 1 structured measure + `checkMeasureMismatch()`. |
| VRFY-09 | Per-class staleness thresholds; audit flags exceeded | Seam 3 staleness-class derivation (D-16). |
| VRFY-10 | OFF revision-diff treated as a lead, human-confirmed before publishing as reformulation | Seam 2 `off-revision-diff` lead type; promotion is human. |
| VRFY-11 | Contested fact publishes with visible both-sides treatment | Seam 1 `contested.positions[]` shape; render deferred to 3a. |
| VRFY-12 | Reader-facing "last verified {date} - review due" indicator | Derived `published-stale` state exposes date; render deferred to 3a. |
| DATA-05 | OFF/imported data stored as unverified leads, never authority | Seam 2 lead store outside the cascade (D-19). |
| DATA-06 | Ingestion imports OFF product/ingredient data into the draft store with field-level provenance | Seam 2 `scripts/ingest-off.mjs` + field-level `provenance` (verified OFF v2 shape). |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `fetch` (undici) | Node 24.16.0 (project pin) | All server-side existence checks + OFF ingestion | Native since Node 18, stable in 24; no dependency. Supports HEAD/GET, custom headers (`User-Agent`, `Range`), redirect control, `AbortSignal.timeout()`. [VERIFIED: node --version 24.16.0; live curl of all four target APIs] |
| `node:test` + `node:assert/strict` | built-in | Unit tests for the new pure gate functions and the pure status-classifier | Already the project's test runner (`npm test` -> `node --test`). [VERIFIED: package.json] |
| Ajv 2020 + ajv-formats | ajv 8.20.0 / ajv-formats 3.0.1 | Structural validation of the new `verification` shape and the `lead` schema | Already compiled in `lib/validate.mjs`; extend, do not add. Import specifier stays `ajv/dist/2020.js` WITH extension (recorded STATE constraint). [VERIFIED: package.json + STATE.md] |

### Supporting

No supporting libraries. The existence checker, the OFF ingester, and the audit reporter are all plain Node modules using only `node:fs`, `node:path`, and global `fetch`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch` | `node-fetch` / `axios` / `got` | Adds a dependency for zero capability gain; native fetch covers HEAD, Range, redirect cap, timeout. Against the no-new-deps constraint. |
| Hand-rolled status classifier | `lychee` (Rust link checker) | `lychee` is prior art for the status taxonomy and HEAD->GET fallback (cite it in the Methodology page), but shelling out to a Rust binary in CI is heavier than a ~40-line pure classifier and cannot express the project's Wayback-promotion rule. Note as prior art only (D-07/D-08). |
| Per-barcode OFF API calls | OFF full JSONL/Parquet dump | At ~35-100 products the dump (multi-GB) is absurd overkill; per-barcode `api/v2/product/{barcode}.json` is simplest and gives the `rev` field needed for revision-diff leads. [VERIFIED: live OFF v2 response] |
| `derivedFrom` transitive lineage | flat `lineageId` | `lineageId` is simpler to author but cannot express a chain (A derived from B derived from press-release); `derivedFrom` computes groups transitively. Recommend `derivedFrom` (D-12 permits either). |

**Installation:**

```bash
# No installation required. Phase 2 introduces zero new runtime or dev dependencies.
```

**Version verification:** [VERIFIED: live 2026-07-01]
- Node: `node --version` -> `v24.16.0`.
- Ajv 8.20.0 / ajv-formats 3.0.1 already pinned (`package.json`).
- All external APIs are versionless public REST endpoints, each confirmed live this session (see Sources).

## Package Legitimacy Audit

**No external packages introduced by this phase.** Every capability uses Node 24 built-ins (`fetch`, `node:test`, `node:fs`, `node:path`) or the already-pinned `ajv` / `ajv-formats`. slopcheck was therefore not run - there is nothing to install. The four external *services* the phase calls (Open Food Facts, Crossref, the Handle proxy, the Internet Archive) are data endpoints, not code dependencies, and each was reached live this session against its documented shape.

| Dependency | Type | Verified | Note |
|------------|------|----------|------|
| Node `fetch` (undici) | built-in | Yes (Node 24.16.0) | No install. |
| `node:test` | built-in | Yes (in use) | No install. |
| `ajv` / `ajv-formats` | already pinned | Yes (package.json) | No change. |

**Packages removed due to slopcheck [SLOP] verdict:** none (no packages).
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                          EDITOR (human) authors facts + verification passes inline
                                          |
                                          v
   src/_data/**.json  (SourcedValue facts, each now carrying a `verification` object)
   src/_data/sources.json (registry, now carrying `derivedFrom` lineage tags)
                                          |
        +---------------------------------+----------------------------------+
        |                                 |                                  |
        v (offline, deterministic)        v (network, cached)                v (network, cached)
  PREBUILD GATE                     EXISTENCE CHECK SCRIPT             OFF INGESTION SCRIPT
  scripts/validate-data.mjs         scripts/check-citations.mjs        scripts/ingest-off.mjs
   |  Ajv structural (incl.          |  HEAD -> GET Range ->            |  GET off/api/v2/product
   |   new verification shape)       |   Wayback CDX -> Crossref/Handle |   {barcode}.json?fields=
   |  collectFacts walk              |  classifyStatus() [PURE]         |  field-level provenance
   |  checkReferences (DATA-01)      |  four-verdict per citation       |
   |  checkDistinctLineage (D-12)    v                                  v
   |  checkMeasureMismatch (D-13)   .cache/citation-verdicts.json   ingestion/leads/*.json
   |  deriveVerificationState() <----------(reads cache)             (lead schema; NOT SourcedValue;
   |    per fact -> one state (D-15)                                  key `sources` never used;
   v                                                                 outside cascade + corpus walk)
  Build report + non-zero-corpus assert                                    |
        |                                                                  | human promotion
        v                                                                  v
  ELEVENTY BUILD (Phase 3a renders derived state:                    mints SourcedValue facts
   withheld / contested / stale / confirmed)                          back into src/_data/**
        ^
        |
  AUDIT COMMAND scripts/audit-verification.mjs (read-only)
   reads facts + .cache verdicts -> deriveVerificationState + staleness
   -> dated worst-first docs/DATA-AUDIT-{date}.md (never mutates values)
```

### Recommended Project Structure

```
lib/
  verification.mjs      # NEW: deriveVerificationState, checkDistinctLineage,
                        #      checkMeasureMismatch, staleness classifier - all PURE
  citation-status.mjs   # NEW: classifyStatus(statusCode, errorClass) - PURE, unit-testable
  referential.mjs       # extend: collectFacts already reused as-is
scripts/
  check-citations.mjs   # NEW: network existence check -> writes .cache/citation-verdicts.json
  ingest-off.mjs        # NEW: OFF v2 fetch -> writes ingestion/leads/*.json
  audit-verification.mjs# NEW: read-only worst-first audit -> docs/DATA-AUDIT-{date}.md
  validate-data.mjs     # extend: add verification gates; read the cache, never the network
schemas/
  sourced-value.schema.json  # extend: add `verification` object; constrain status fields to null
  source.schema.json         # extend: add nullable `derivedFrom`
  lead.schema.json           # NEW: the OFF lead envelope (no `sources` key)
ingestion/
  leads/                # NEW: draft store, OUTSIDE src/_data (not in the Eleventy cascade)
  barcodes.json         # NEW: the ~35-100 barcode -> product-id worklist
.cache/
  citation-verdicts.json# NEW: diffable existence-verdict cache the offline gate reads
test/
  verification.test.js  # NEW: pass-counting, derivation, lineage, measure-mismatch
  citation-status.test.js# NEW: pure classifier over the status-code table
  fixtures/invalid/     # NEW negative fixtures (one per new failure path)
```

### Pattern 1: The inline `verification` record (Seam 1, D-01/02/04/13/14)

**What:** A `verification` object nested inside every `SourcedValue`, holding pass *events* and the human adjudication surface. Recommended shape (Claude's discretion, kept consistent with the envelope's `additionalProperties: false` style):

```jsonc
// Extends schemas/sourced-value.schema.json (a new optional property on the envelope)
"verification": {
  "type": "object",
  "additionalProperties": false,
  "required": ["passes"],
  "properties": {
    "passes": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["reviewerKind", "sourcesChecked", "measure", "verdict", "checkedOn"],
        "properties": {
          "reviewerKind": { "enum": ["human", "ai", "blinded-reread"] },
          "sourcesChecked": { "type": "array", "minItems": 1, "items": { "type": "string" } },
          "measure": { "$ref": "#/$defs/measure" },
          "checkedValue": {},               // what THIS pass actually read (any type)
          "verdict": { "enum": ["confirms", "disputes", "inaccessible"] },
          "checkedOn": { "type": "string", "format": "date" }
        }
      }
    },
    "adjudication": {                        // human-only (D-04); absent until adjudicated
      "type": "object",
      "additionalProperties": false,
      "required": ["outcome", "note", "date"],
      "properties": {
        "outcome": { "enum": ["confirmed", "corrected", "contested"] },
        "note": { "type": "string", "minLength": 1 },
        "date": { "type": "string", "format": "date" }
      }
    },
    "contested": {                           // present only when adjudication.outcome === "contested" (D-14)
      "type": "object",
      "additionalProperties": false,
      "required": ["positions"],
      "properties": {
        "positions": {
          "type": "array", "minItems": 2,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["value", "sources", "note"],
            "properties": {
              "value": {},
              "sources": { "type": "array", "minItems": 1, "items": { "type": "string" } },
              "note": { "type": "string" }
            }
          }
        }
      }
    },
    "markedWrong": {                         // human-only; forces withdrawal (D-03/VRFY-04)
      "type": "object",
      "additionalProperties": false,
      "required": ["note", "date"],
      "properties": {
        "note": { "type": "string", "minLength": 1 },
        "date": { "type": "string", "format": "date" }
      }
    },
    "stalenessClass": { "enum": ["regulatory", "current", "historical"] } // optional override (D-16)
  }
},
"$defs": {
  "measure": {
    "type": "object",
    "additionalProperties": false,
    "required": ["basis", "state"],
    "properties": {
      "basis": { "enum": ["per-100g", "per-100ml", "per-serving", "n/a"] },
      "state": { "enum": ["as-sold", "as-prepared", "n/a"] },
      "jurisdiction": { "enum": ["GB", "EU", "international"] },
      "asOf": { "type": "string", "format": "date" }
    }
  }
}
```

**Why `checkedValue` and `measure` sit on each pass, not on the fact:** the measure-mismatch detector (D-13, VRFY-08) compares the *two passes'* structured measures, and the disagreement detector compares the *two passes'* `checkedValue`s. Both are pass-level properties by definition. The fact's singular `value` is the published answer; the passes are the evidence trail.

**Status field decision (D-03):** the reserved `verificationStatus` / `publicationStatus` on the envelope must NOT be hand-authored. Recommended: constrain both to `{"type": "null"}` (or `{"enum": [null]}`) in the schema so any author-set value fails Ajv, and let the derived state be computed at build. This makes "a fact marked wrong cannot stay published through author drift" structurally true - there is no author-writable publish flag at all. **Note for the planner:** this is a slightly stronger reading of D-03 than "validated-only"; confirm with the user during plan-check if they prefer to keep a nullable-but-ignored field instead.

**Anti-pattern:** counting `sources[].length` to decide publishability. This is exactly the C1 conflation D-02 forbids. The gate must count `passes` whose `verdict === "confirms"` and whose `measure`s agree - never sources.

### Pattern 2: Build-time state derivation (Seam 1, D-15)

**What:** One pure function in `lib/verification.mjs` maps a fact + the source registry + the cached existence verdicts + today's date to exactly one derived state. Precedence matters (STALE still publishes; WRONG and DISAGREEMENT withhold):

```js
// lib/verification.mjs  (PURE - no fs, no network; unit-testable)
// existenceByUrl: Map<sourceId, { verdict, resolvedVia, checkedAt }> loaded from the cache.
export function deriveVerificationState(fact, sourcesById, existenceBySourceId, today) {
  const v = fact.verification;
  // 1. Highest precedence: human marked it wrong (D-03/VRFY-04, continuous).
  if (v?.markedWrong) return { state: "withheld-wrong", reasons: ["marked wrong by editor"] };
  // 2. Human adjudicated contested -> publish both sides (D-14/VRFY-11).
  if (v?.adjudication?.outcome === "contested") {
    return { state: "published-contested", reasons: ["adjudicated contested"] };
  }
  const passes = v?.passes ?? [];
  // 3. Any citation a counting pass rests on must RESOLVE (VRFY-07). One non-resolving citation withholds.
  const citedIds = new Set(passes.flatMap(p => p.sourcesChecked));
  for (const id of citedIds) {
    const ex = existenceBySourceId.get(id);
    if (!ex || ex.verdict !== "RESOLVES") {
      return { state: "withheld-unverified", reasons: [`citation ${id} verdict ${ex?.verdict ?? "UNCHECKED"}`] };
    }
  }
  // 4. Open disagreement: any disputes verdict, or a measure mismatch among confirming passes (D-13/VRFY-08).
  if (passes.some(p => p.verdict === "disputes") || hasMeasureMismatch(passes)) {
    return { state: "withheld-open-disagreement", reasons: ["passes disagree or measures mismatch"] };
  }
  // 5. Claim-typed sufficiency (D-05 / D-06).
  const confirms = passes.filter(p => p.verdict === "confirms");
  const sufficient = fact.claimType === "corroborable"
    ? meetsCorroborable(confirms, fact, sourcesById)   // >=2 confirms, >=2 distinct lineages, >=1 primary
    : meetsAuthoritative(confirms);                     // 1 authority + 1 re-read, distinct reviewerKind
  if (!sufficient) return { state: "withheld-unverified", reasons: ["insufficient passes for claim type"] };
  // 6. Sufficient: stale still publishes (D-16).
  if (isPastStaleness(fact, lastVerified(confirms), today)) {
    return { state: "published-stale", reasons: ["past staleness threshold"] };
  }
  return { state: "published-confirmed", reasons: [] };
}
```

Derived-state table (D-15), reproduced for the planner and verifier:

| Derived state | Condition | Reader sees (Phase 3a) |
|---|---|---|
| `published-confirmed` | passes meet the standard, no open disagreement, existence RESOLVES, not stale | value + trust chip |
| `published-contested` | human adjudicated `contested` | both-sides treatment |
| `published-stale` | otherwise-confirmed but past staleness threshold | value + "last verified {date} - review due" |
| `withheld-unverified` | insufficient passes, or existence ACCESS_BLOCKED / INDETERMINATE / DOES_NOT_RESOLVE | "not yet verified - withheld" placeholder |
| `withheld-open-disagreement` | passes disagree, or a measure mismatch, awaiting adjudication | withheld placeholder |
| `withheld-wrong` | human marked the fact `wrong` | withheld placeholder |

**Where derivation runs at render time:** the `validate-data.mjs` JSON-only invariant forbids `.js/.mjs` files under `src/_data`, so the derivation CANNOT be an Eleventy `_data` module. Wire it into Phase 3a via `eleventy.addGlobalData` / a computed-data layer / a filter defined in `.eleventy.js` (which lives outside `src/_data` and is therefore permitted). Phase 2's own gate calls the same pure function to (a) assert each record is internally consistent - `contested` requires `positions`, passes' `sourcesChecked` are a subset of the fact's `sources`, `markedWrong` well-formed - and (b) print a build-report status breakdown. **A withheld fact does NOT fail the build** - withholding is the normal, correct outcome. The build fails only on structural/consistency violations, not on unverified content.

### Pattern 3: The four-verdict citation-existence checker (Seam 1, D-07..D-10, VRFY-07)

**What:** Split the PURE decision from the IO. `classifyStatus()` is a pure function over the status-code table (unit-testable, no network); `checkCitation()` performs the fetch and escalation. Verified status-code decision table:

| Observed | Verdict | Next action |
|----------|---------|-------------|
| 2xx / 206 / 304 | `RESOLVES` | done |
| 404 / 410 | `DOES_NOT_RESOLVE` | try Wayback; if a 200 snapshot exists -> `RESOLVES` via snapshot, else stays DOES_NOT_RESOLVE |
| DNS NXDOMAIN / hard ECONNREFUSED (no archive) | `DOES_NOT_RESOLVE` | try Wayback; else human |
| 401 / 403 / 407 / 429 / 451 / 999 / CDN challenge | `ACCESS_BLOCKED` | retry once GET `Range: bytes=0-0`; then Wayback; else human |
| 5xx / timeout / transient / soft-404 | `INDETERMINATE` | Wayback; else human |

Escalation order (D-08), each step confirmed reachable this session:

```js
// 1. LIVE: HEAD first (cheap), realistic UA, redirect cap ~10, AbortSignal.timeout(8000).
const res = await fetch(url, { method: "HEAD", redirect: "follow",
  headers: { "user-agent": BROWSER_UA }, signal: AbortSignal.timeout(8000) });
// 2. On 403/405/429 retry once as GET Range: bytes=0-0 (some CDNs refuse HEAD only).
//    Honour Retry-After once, bounded.
// 3. ACCESS_BLOCKED / INDETERMINATE / DOES_NOT_RESOLVE -> Wayback:
//    PREFER the CDX server (verified working this session):
//      https://web.archive.org/cdx/search/cdx?url={url}&output=json&limit=1&filter=statuscode:200
//    (availability API archive.org/wayback/available RATE-LIMITED us with 429 this session - use as fallback only)
//    A 200 snapshot row -> verdict RESOLVES, resolvedVia "wayback:{timestamp}", store the snapshot URL.
// 4. DOI (starts with 10.): Crossref works {200|404} AND Handle {responseCode 1|100}, per D-09.
```

Verified endpoint shapes (all live 2026-07-01):
- **Crossref:** `GET https://api.crossref.org/works/10.1038/nature12373` -> `HTTP 200`; bogus DOI -> `HTTP 404`. Send `User-Agent: FoodTransparencyUK/0.1 (mailto:legendarytone@gmail.com)` for the polite pool.
- **Handle:** `GET https://doi.org/api/handles/10.1038/nature12373` -> `{"responseCode":1,"handle":...,"values":[...]}`; bogus -> `{"responseCode":100,"message":"HANDLE NOT FOUND"}`.
- **Wayback CDX:** `GET https://web.archive.org/cdx/search/cdx?url=nature.com&output=json&limit=2` -> `[["urlkey","timestamp","original","mimetype","statuscode","digest","length"], [...]]`. Empty array body = no capture. The `statuscode` column (index 4) filters to real 200 snapshots.
- **Wayback availability:** `GET http://archive.org/wayback/available?url=...&timestamp=...` -> **returned HTTP 429 on every call this session** (a live ACCESS_BLOCKED demonstration). Treat 429 from Wayback itself as "could not determine snapshot" (fall through to human), never as "no snapshot exists".

**Politeness / caching:** serialise or cap ~1-2 req/s (D-10), one shared cache keyed by source id -> `{ verdict, resolvedVia, checkedAt, statusCode }` written to `.cache/citation-verdicts.json` and committed (diffable). The offline prebuild reads the cache; a missing/expired entry means the citation is treated as UNCHECKED -> `withheld-unverified` until the next `check-citations` run refreshes it. **CI note:** GitHub Actions shared IP ranges are frequently rate-limited by archive.org - run the network check as a scheduled/manual job that commits the cache, not on every push.

### Pattern 4: OFF ingestion into the isolated lead store (Seam 2, DATA-05/06, VRFY-10, D-19)

**What:** A network script fetches per-barcode from the OFF v2 API and writes leads with field-level provenance into `ingestion/leads/`, structurally distinct from any `SourcedValue`. Verified OFF v2 response shape (Nutella barcode, live 2026-07-01):

```
GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json?fields=code,product_name,ingredients_text,nutriments,rev,last_modified_t
-> found:     {"code":"3017620422003","product":{"code":...,"ingredients_text":"...","nutriments":{"sugars_100g":..,"sugars_unit":"g",...},"last_modified_t":1782789797,...}}
-> not found: {"code":"<bc>","status":0,"status_verbose":"product not found"}   (HTTP 404)
```

Key OFF facts for the planner:
- **`nutriments` default to per-100g** (`*_100g`, plus `*_serving` when present). This is the direct source of the measure-mismatch case (OFF 4.16 g/100g vs a GB drink label's 4.5 g/100ml). Ingestion must record OFF's `basis: per-100g` in the lead's field provenance so a later promotion carries the correct structured measure and the mismatch is caught, not silently merged. [VERIFIED: live OFF v2 nutriments]
- **`rev`** is the revision number; two captures with different `rev` are the basis of an `off-revision-diff` lead (VRFY-10). Phase 2 records the diff as a lead; it does NOT build the automated differ.

Recommended `lead` schema (NOTE: it deliberately does NOT use the key `sources`, so even if a lead ever lands under `src/_data` the corpus-escape guard's `hasSourcedShape` - "any object with a `sources` array" - never trips; the primary guarantee is that leads live outside `src/_data` entirely):

```jsonc
{
  "leadId": "off-3017620422003-r30",
  "leadType": "off-import",              // or "off-revision-diff"
  "barcode": "3017620422003",
  "capturedAt": "2026-07-01",
  "offRevision": 30,
  "provenance": {                        // dataset-level ODbL provenance (DATA-02)
    "dataset": "open-food-facts",
    "licence": "ODbL-1.0",
    "url": "https://world.openfoodfacts.org/product/3017620422003",
    "retrievedAt": "2026-07-01T09:00:00Z"
  },
  "fields": [                            // field-level provenance (DATA-06)
    { "path": "ingredientsText", "offField": "ingredients_text", "value": "Sucre, huile de palme, ...", "offRevision": 30 },
    { "path": "nutrition.sugars", "offField": "sugars_100g", "value": 56.3, "measure": { "basis": "per-100g", "state": "as-sold" }, "offRevision": 30 }
  ],
  "promotion": { "status": "pending", "note": "", "promotedTo": null, "by": null, "date": null },
  "revisionDiff": null                   // for off-revision-diff leads: { fromRev, toRev, changedFields[] }
}
```

**Isolation (D-19), three layers:** (1) `ingestion/leads/` is outside `src/_data`, so it is outside the Eleventy data cascade and never rendered; (2) `scripts/validate-data.mjs`'s corpus walk targets `src/_data` only, so leads are never validated as facts; (3) the `lead` schema avoids the `sources` key as belt-and-braces. Optionally validate leads against `lead.schema.json` in a SEPARATE non-prebuild script so malformed leads are caught without coupling to the fact gate.

**Promotion (the human step):** promotion reads a lead, an editor authors a real `SourcedValue` under `src/_data` citing the `off` source id (already in `sources.json`, already `shareAlike: true`), and sets `promotion.status = "promoted"`. The minted fact is then automatically flagged OFF-derived by the existing `listOffDerived` and must still pass the full verification gate before it publishes - OFF alone (tertiary) can never satisfy the corroborable standard.

**ODbL (DATA-02):** OFF is `ODbL-1.0`, attribution AND share-alike, already recorded in `sources.json`. Two implications the planner must carry: (a) any page rendering an OFF-derived value must attribute OFF (Phase 3a); (b) **share-alike bites the open dataset** - the git-published dataset (DATA-12) and the per-record JSON export (SITE-11) redistribute OFF-derived facts, so the derived database inherits an ODbL obligation. Flag this for the licensing note; it is not code, but it constrains DATA-12's licence choice downstream. [CITED: opendatacommons.org/licenses/odbl/1-0]

### Pattern 5: Distinct-lineage + measure-mismatch (Seam 1, D-12/D-13)

- **Lineage (`source.schema.json`):** add a nullable `derivedFrom` (a source id, or null for a root). Two sources share a lineage if they resolve to the same root by following `derivedFrom`. `checkDistinctLineage(fact, sourcesById)` (pure, `{ errors }`) fires only for corroborable facts: the confirming passes' cited sources must span >=2 distinct roots. The Cadbury case (cdm-grocer-2019 and cdm-confectionerynews-2019, both William Reed, both co-derived from one Mondelez press release) is the canonical failure - point both `derivedFrom` at a shared press-release source so the gate counts one lineage, not two.
- **Similarity heuristic (non-blocking `{ warnings }`):** compare registrable domain + `publisher` across the two sources; warn if they match but `derivedFrom` was not declared. Signals: same publisher string, same eTLD+1, or high title/URL similarity. The gate decision rests on the human declaration; the heuristic only prompts a human to look. (Recommended threshold: warn on exact publisher-string match OR shared eTLD+1; keep it deliberately loud, since a warning costs nothing.)
- **Measure-mismatch (`checkMeasureMismatch(passes)`):** deep-equal the structured `measure` objects across confirming passes; any inequality auto-raises `withheld-open-disagreement`. Exact-match-or-disagree - over-raising is safe because it routes to a human (D-13).

### Pattern 6: The audit command (Seam 3, VRFY-05/06/09/12, D-17)

**What:** `scripts/audit-verification.mjs` walks the corpus with `collectFacts`, derives each fact's state + staleness, reads the existence cache, and emits a dated markdown modelled exactly on DEBT's `DATA-AUDIT.md`:
1. Dated header.
2. Counts-by-status table (one row per derived state).
3. Discrepancy sections worst-first: `withheld-wrong` -> `withheld-open-disagreement` -> `published-stale` (then oldest last-verified first), each entry carrying the fact's recorded structured `measure` and its recorded pass verdicts.
4. A separate "reviewer disagreements - flag for extra human scrutiny" section listing facts with a `disputes` verdict or a measure mismatch.

Staleness derivation (D-16): `stalenessClass = verification.stalenessClass override ?? (claimDomain === "regulatory" ? "regulatory" : isTimelineEntity(fact) ? "historical" : "current")`. Thresholds: regulatory 12 months, current 24 months, historical none. `lastVerified = max(confirms passes' checkedOn)`. The audit is READ-ONLY - it never writes a verdict or a value (the "AI never adjudicates" hard rule); the human adjudicates by editing the fact inline (D-04). Whether the doc is committed or generated on demand is discretion; either way stamp it with a date.

### Anti-Patterns to Avoid

- **Counting `sources[]` instead of `passes`** - the load-bearing D-02 error; re-introduces the C1 conflation.
- **A stored, hand-authored `publicationStatus`** - lets a `wrong` fact stay published through drift; the status must be derived every build (D-03).
- **Treating `ACCESS_BLOCKED` as a dead link** - the exact SPIKE-01 false-block failure; a 403/429 means the host is UP and refused the bot.
- **Hitting the network in `prebuild`** - makes the build non-deterministic and CI-fragile; the offline gate must read a committed cache.
- **A boolean measure comparison on free text** - "per 100g as sold" vs "per 100g" is brittle; compare STRUCTURED measures (D-13).
- **A lead shaped like a `SourcedValue`** - trips the corpus-escape guard (C4); keep leads out of `src/_data` and avoid the `sources` key.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client with redirects, timeouts, Range | A socket/http wrapper | Node 24 global `fetch` + `AbortSignal.timeout()` | Native, zero-dep, handles redirect cap + HEAD/GET + custom headers. |
| DOI existence resolution | A publisher-page scraper | Crossref REST + Handle proxy (D-09) | Scraping publishers is bot-hostile and fragile; two registrar APIs give an independent-re-read pair, verified live. |
| Archival snapshot lookup | A Wayback HTML scraper | Wayback CDX JSON server | CDX returns structured `statuscode` rows; verified working when the availability API was rate-limited. |
| OFF product data | The multi-GB full dump + a parser | OFF v2 per-barcode API | ~35-100 products makes the dump absurd; the API gives `rev` for revision-diffs. |
| Fact traversal | A new fact-id system + walker | Existing `collectFacts` (instance-path keyed) | Already enumerates every `SourcedValue`; D-01 chose inline records precisely to reuse it. |
| Structural validation of the new shapes | Bespoke shape checks | The already-compiled Ajv instance | `additionalProperties: false` + enums catch malformed `verification` / `lead` records for free. |

**Key insight:** Phase 2 is a data-modelling and orchestration problem, not an integration problem. The temptation is to reach for a link-checker library or an HTTP client; the correct move is a ~40-line pure status classifier plus native fetch, so the decision logic is unit-testable offline and the four external services are called exactly as verified.

## Runtime State Inventory

> This phase changes the data model of existing published records (adds `verification` to every fact, `derivedFrom` to every source) and adds a build cache. It is a schema migration over live corpus data, so a state inventory applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Every existing fact in `src/_data/products/spike-0{1,2,3}.json` and `src/_data/timeline/*.json` currently has NO `verification` object and `verificationStatus: null` / `publicationStatus: null`. Once the gate derives status, these facts derive to `withheld-unverified` until an editor authors passes. | Data edit: add `verification.passes[]` to each fact an editor verifies; expect most to be withheld initially (matches SPIKE-01: 0/3 met the strict historic bar). This is editorial work, not a code migration - the gate correctly withholds unverified facts. |
| Stored data | The contested Lucozade pre-2017 sugar figure (13 vs 17 vs 12.4 g/100ml) already exists as prose in `spike-lucozade-2017-sugar-cut.json`'s `note`, with the singular `value` carrying an approximation. | Data edit on adjudication: when a human adjudicates `contested`, move the positions into `verification.contested.positions[]` and null the singular `value` (D-14). |
| Live service config | None - this is a static-build project with no running services, databases, or OS-registered jobs. Verified: no server, no DB (CLAUDE.md local-first; `package.json` has no server deps). | None. |
| Secrets/env vars | None required. Crossref wants a contact mailto in the User-Agent (`legendarytone@gmail.com`, already the git user email) - this is a politeness string, not a secret. OFF needs a descriptive User-Agent only. No API keys. | None - hardcode the polite User-Agent strings (contact email is already public in git config). |
| Build artifacts | New `.cache/citation-verdicts.json` (committed, diffable) and `ingestion/leads/*.json` (committed drafts). Both are new; no stale artifacts to clean. The reserved nullable status fields on existing facts become schema-constrained-to-null (or dropped). | Add `.cache/` handling; decide commit vs gitignore for the cache (recommend COMMIT so the offline gate and CI share verdicts). |

**Nothing found in "OS-registered state":** None - no scheduled tasks, no daemons, no registry entries. Verified by absence of any service/DB dependency in `package.json` and CLAUDE.md's local-first, static-build architecture.

## Common Pitfalls

### Pitfall 1: Counting sources, not passes
**What goes wrong:** the gate reads `fact.sources.length >= 2` and calls a corroborable fact verified, even with zero passes.
**Why it happens:** `sources[]` and "verification" feel synonymous; Phase 1's `allOf` rule already keys off `sources` length for the structural corroborable check.
**How to avoid:** the Phase 1 `sources.minItems: 2` rule stays a STRUCTURAL floor; the Phase 2 gate counts `passes` with `verdict === "confirms"`. Keep them separate functions with separate tests.
**Warning signs:** a fact with `sources: [a, b]` and `verification.passes: []` deriving to `published-confirmed`.

### Pitfall 2: Wayback / archive.org rate-limiting in CI
**What goes wrong:** the existence check treats archive.org's own 429 as "no snapshot exists" and withholds a fact that actually has a good archival citation.
**Why it happens:** shared cloud/CI IPs are aggressively rate-limited by the Internet Archive - demonstrated live this session (the availability API returned 429 on every call). [VERIFIED: live curl]
**How to avoid:** prefer the CDX server (worked when availability failed), honour `Retry-After`, cache verdicts to a committed file, and run the network check as a scheduled/manual job that commits the cache rather than on every push. A 429 from Wayback is `INDETERMINATE` -> human, never `DOES_NOT_RESOLVE`.
**Warning signs:** CI existence runs that pass locally but withhold everything in Actions.

### Pitfall 3: Network in the prebuild gate
**What goes wrong:** `npm run prebuild` hits Crossref/OFF/Wayback, so builds fail intermittently and offline builds are impossible.
**Why it happens:** it seems natural to check citations during validation.
**How to avoid:** the prebuild gate is OFFLINE and reads `.cache/citation-verdicts.json`; the network scripts (`check-citations`, `ingest-off`, `audit-verification`) are separate and cached. (Explicitly required by the code_context integration notes.)
**Warning signs:** `validate-data.mjs` importing `fetch` or `check-citations.mjs`.

### Pitfall 4: A lead trips the corpus-escape guard
**What goes wrong:** a draft placed under `src/_data` with a `sources` array fails the build via the `hasSourcedShape` guard (C4).
**Why it happens:** it is tempting to co-locate drafts with facts.
**How to avoid:** leads live in `ingestion/leads/` (outside `src/_data`) and the `lead` schema uses `provenance`, never `sources`.
**Warning signs:** the guard erroring on an `ingestion/` path (it should never scan there) or on a draft file.

### Pitfall 5: Measure merged silently
**What goes wrong:** OFF's per-100g sugar and a label's per-100ml sugar are averaged or treated as agreeing.
**Why it happens:** the numbers look close (4.16 vs 4.5).
**How to avoid:** structured `measure` on each pass; deep-equal or auto-disagree (D-13/VRFY-08). OFF nutriments are per-100g by default - record that basis at ingestion. [VERIFIED: live OFF v2]
**Warning signs:** a nutrition fact publishing from two passes whose `measure.basis` differ.

### Pitfall 6: SSRF via source URLs (security)
**What goes wrong:** the existence checker fetches whatever URL an editor put in `sources.json`; a malicious or mistaken internal URL (`http://169.254.169.254/`, `http://localhost:...`) lets CI probe internal network.
**Why it happens:** source URLs are trusted input today, but the checker turns them into outbound requests.
**How to avoid:** restrict to `https:` (and the `http:` Wayback/archive host), and refuse to fetch URLs that resolve to private / loopback / link-local ranges. See Security Domain.
**Warning signs:** a source URL with a raw IP, a non-standard port, or a private-range host.

## Code Examples

### Pure status classifier (unit-testable, no network)

```js
// lib/citation-status.mjs
// Maps an observed HTTP status (or a fetch error class) to the D-07 four-verdict enum.
export function classifyStatus(statusCode, errorClass) {
  if (errorClass === "nxdomain" || errorClass === "refused") return "DOES_NOT_RESOLVE";
  if (errorClass === "timeout" || errorClass === "network") return "INDETERMINATE";
  if (statusCode >= 200 && statusCode < 400) return "RESOLVES";       // 2xx/3xx incl. 206/304
  if (statusCode === 404 || statusCode === 410) return "DOES_NOT_RESOLVE";
  if ([401, 403, 407, 429, 451, 999].includes(statusCode)) return "ACCESS_BLOCKED";
  if (statusCode >= 500) return "INDETERMINATE";
  return "INDETERMINATE";                                             // unknown -> never scored dead
}
```

### DOI existence via two registrars (verified live)

```js
// Exists if Crossref 200 OR Handle responseCode 1; dead only if Crossref 404 AND Handle 100 (D-09).
async function checkDoi(doi) {
  const ua = { "user-agent": "FoodTransparencyUK/0.1 (mailto:legendarytone@gmail.com)" };
  const cr = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    { method: "HEAD", headers: ua, signal: AbortSignal.timeout(8000) });          // 200 | 404 (verified)
  const hres = await fetch(`https://doi.org/api/handles/${encodeURIComponent(doi)}`,
    { headers: ua, signal: AbortSignal.timeout(8000) });
  const handle = await hres.json();                                                // {responseCode: 1|100} (verified)
  if (cr.status === 200 || handle.responseCode === 1) return "RESOLVES";
  if (cr.status === 404 && handle.responseCode === 100) return "DOES_NOT_RESOLVE";
  return "INDETERMINATE";
}
```

### Wayback CDX snapshot probe (verified live)

```js
// Prefer CDX (worked when the availability API was rate-limited this session).
async function waybackSnapshot(url, atTimestamp) {
  const q = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}` +
            `&output=json&limit=1&filter=statuscode:200` + (atTimestamp ? `&closest=${atTimestamp}` : "");
  const res = await fetch(q, { headers: { "user-agent": "FoodTransparencyUK/0.1" }, signal: AbortSignal.timeout(12000) });
  if (res.status === 429 || res.status >= 500) return null;   // Wayback itself blocked -> INDETERMINATE upstream
  const rows = await res.json();                              // [header, ...dataRows] or [] when no capture
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const [, ts, original] = rows[1];                           // columns: urlkey,timestamp,original,...
  return { timestamp: ts, snapshotUrl: `https://web.archive.org/web/${ts}/${original}` };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `node-fetch` dependency for server HTTP | Native global `fetch` (undici) | Node 18 (2022), stable in 20/22/24 | Zero-dep HTTP in the build tooling; nothing to install or audit. |
| Boolean "does the link work" check | Four-verdict RESOLVES/BLOCKED/NOT_FOUND/INDETERMINATE | Project decision (D-07), informed by SPIKE-01 | Bot-hostile-but-live citations (retailers, archive.org) stop being false-scored dead. |
| OFF v1 `api/v0/product/{barcode}.json` | OFF v2 `api/v2/product/{barcode}.json?fields=` | OFF v2 GA | Field selection reduces payload; `rev` supports revision-diff leads. [VERIFIED: live v2] |

**Deprecated/outdated:**
- Do not add `node-fetch`, `axios`, or `got` - native fetch covers every need here.
- Do not rely on the Wayback availability API as the primary archival probe - it rate-limits shared IPs; CDX is the workhorse.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Constraining `verificationStatus`/`publicationStatus` to `null` in the schema (rather than keeping a nullable-but-ignored field) is the intended reading of D-03 | Pattern 1 | If the user wanted the field kept for external tooling, the stricter schema would reject their records; confirm in plan-check. Low risk, easily reversed. |
| A2 | OFF v2 `nutriments` are per-100g by default for the products in this corpus | Pattern 4 | If a product reports only per-serving, the ingested measure basis would be wrong; ingestion should read the actual OFF suffix (`_100g` vs `_serving`) present, not assume. [VERIFIED for Nutella; ASSUMED across the corpus] |
| A3 | Crossref/Handle/CDX rate limits are tolerable at ~1-2 req/s for ~35-100 citations from the build/CI IP | Pattern 3 | If CI IPs are hard-blocked, the cache-and-commit pattern (run locally) is the fallback already recommended. Low risk given the cache design. |
| A4 | `git` user email `legendarytone@gmail.com` is acceptable as the public Crossref contact mailto | Pattern 3 / Runtime State | If the user prefers a project inbox, swap the string; it is a politeness header, not a secret. |

**Note:** the four external API shapes are `[VERIFIED: live curl 2026-07-01]`, not assumed. The assumptions above are about corpus-wide generalisation and one schema-strictness reading, all low-risk and flagged for plan-check.

## Open Questions

1. **Where does the derived status surface to Eleventy templates?**
   - What we know: it cannot be an `src/_data/*.js` module (the JSON-only invariant forbids it); it can be a filter/global-data in `.eleventy.js`.
   - What's unclear: whether Phase 2 should stop at the pure function + gate report, leaving the render wiring wholly to Phase 3a.
   - Recommendation: Phase 2 delivers the pure `deriveVerificationState()` + tests + a build-report; Phase 3a wires it into rendering. Keep the seam clean.

2. **Commit vs gitignore the existence cache?**
   - What we know: the offline gate must read verdicts; CI IPs get rate-limited.
   - Recommendation: COMMIT `.cache/citation-verdicts.json` so verdicts are diffable (matches the provenance-in-diff ethos) and CI never needs the network to build.

3. **Does adjudication `corrected` require re-running the passes?**
   - What we know: VRFY-02 says "corrected (value amended then re-verified)".
   - Recommendation: model `corrected` as a normal edit - the human amends `value` and adds fresh `confirms` passes; the derivation then re-derives to `published-confirmed`. No special state needed; `corrected` is an adjudication note, not a terminal derived state.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (with global `fetch`) | All Phase 2 tooling | Yes | 24.16.0 | none needed |
| `node:test` runner | Unit tests | Yes | built-in | none needed |
| Ajv / ajv-formats | Structural gate | Yes | 8.20.0 / 3.0.1 | none needed |
| Open Food Facts v2 API | OFF ingestion (DATA-06) | Yes | v2 (live) | manual editorial entry per product |
| Crossref REST API | DOI existence (D-09) | Yes | live (200/404) | Handle proxy alone |
| Handle proxy (doi.org) | DOI re-read (D-09) | Yes | live (responseCode 1/100) | Crossref alone |
| Wayback CDX server | Archival fallback (D-08) | Yes | live | availability API (rate-limited); else human |
| Wayback availability API | Archival fallback (secondary) | Rate-limited (429 this session) | - | CDX server (primary) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** the Wayback availability API is unreliable from shared IPs; the CDX server is the working primary, and an unresolved citation routes to a human (D-08) - no hard block.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` + `node:assert/strict` (Node 24 built-in) |
| Config file | none - `npm test` runs `node --test 'test/**/*.test.js'` |
| Quick run command | `node --test test/verification.test.js test/citation-status.test.js` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VRFY-01 | corroborable needs 2 confirms / 2 lineages / 1 primary | unit | `node --test test/verification.test.js` | Wave 0 |
| VRFY-01 | authoritative needs 1 authority + distinct-reviewer re-read | unit | `node --test test/verification.test.js` | Wave 0 |
| VRFY-03/04 | derived state precedence (wrong > contested > disagreement > stale) | unit | `node --test test/verification.test.js` | Wave 0 |
| VRFY-04 | `markedWrong` forces `withheld-wrong` regardless of passes | unit | `node --test test/verification.test.js` | Wave 0 |
| VRFY-07 | non-RESOLVES citation withholds; four-verdict classifier | unit | `node --test test/citation-status.test.js` | Wave 0 |
| VRFY-08 | mismatched structured measures auto-disagree | unit | `node --test test/verification.test.js` | Wave 0 |
| VRFY-11 | `contested` requires `positions[]`; nulls singular value | unit | `node --test test/verification.test.js` | Wave 0 |
| VRFY-01 lineage | co-derived sources count as one lineage | unit | `node --test test/verification.test.js` | Wave 0 |
| DATA-05/19 | a `SourcedValue`-shaped lead under `src/_data` fails the guard; a `provenance`-keyed lead in `ingestion/` does not | integration | `node --test test/corpus-gate.test.js` (extend) | extend existing |
| DATA-06 | OFF field parsed to a lead with per-100g measure basis | unit | `node --test test/ingest-off.test.js` | Wave 0 |
| VRFY-05/06 | audit emits counts-by-status + worst-first order | unit | `node --test test/audit.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test` on the touched test file(s).
- **Per wave merge:** `npm test` (full suite) plus `npm run prebuild` (the offline gate over the real corpus).
- **Phase gate:** full suite green + `npm run prebuild` green before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `test/verification.test.js` - covers VRFY-01/03/04/08/11 and lineage (the derivation + counting functions).
- [ ] `test/citation-status.test.js` - covers VRFY-07 (the pure classifier over the status table).
- [ ] `test/ingest-off.test.js` - covers DATA-06 (OFF field -> lead, offline against a captured fixture, not the live API).
- [ ] `test/audit.test.js` - covers VRFY-05/06 (worst-first ordering, counts table).
- [ ] New negative fixtures under `test/fixtures/invalid/`: `insufficient-passes.json`, `measure-mismatch.json`, `shared-lineage.json`, `does-not-resolve-citation.json`, `sourcedvalue-shaped-lead.json` (one per new failure path, matching the Phase 1 convention).
- [ ] Extend `test/corpus-gate.test.js` to prove `ingestion/leads/` is never walked and a `sources`-keyed lead under `src/_data` is rejected.
- Framework install: none - `node:test` is built in.

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface - static-build tooling, no users, no login. |
| V3 Session Management | no | No sessions. |
| V4 Access Control | no | No runtime access control; git + human review is the control plane. |
| V5 Input Validation | yes | OFF API responses and cited URLs/DOIs are untrusted external input. Validate leads against `lead.schema.json`; parse DOIs/URLs defensively; never eval or interpolate OFF text into code. Ajv `additionalProperties: false` on the new shapes. |
| V6 Cryptography | no | No secrets, no crypto. The Crossref contact mailto is a public politeness string, not a credential. |
| V10/SSRF (server-side request) | yes | The existence checker turns editor-supplied source URLs into outbound requests. Restrict schemes to `https:` (plus the archive `http:` host), and refuse URLs resolving to private/loopback/link-local ranges (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `::1`). |

### Known Threat Patterns for the build-tooling + external-fetch stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF via a crafted source URL (internal-network probe from CI) | Information disclosure / EoP | https-only + private-range blocklist before fetch (Pitfall 6). |
| Untrusted OFF data promoted as authority | Tampering | Leads are isolated (D-19), never rendered; promotion is a human step; the minted fact still faces the full gate; OFF is tertiary and can never satisfy the corroborable standard alone. |
| ReDoS in URL/DOI/measure parsing | Denial of service | Avoid pathological regex; prefer `URL` parsing and simple prefix checks (`doi.startsWith("10.")`); the classifier is table-driven, not regex-driven. |
| Supply-chain injection via a new dependency | Tampering | None introduced - Phase 2 adds zero packages, so the phase's supply-chain delta is zero. |
| Cache poisoning of `.cache/citation-verdicts.json` | Tampering | The cache is committed and diff-reviewed like any data file; a bad verdict is a visible git diff, and the gate re-derives from it transparently. |

## Sources

### Primary (HIGH confidence)
- Codebase (grep/read 2026-07-01): `lib/validate.mjs`, `lib/referential.mjs`, `scripts/validate-data.mjs`, `schemas/sourced-value.schema.json`, `schemas/source.schema.json`, `src/_data/sources.json`, `src/_data/products/spike-0{1,2,3}.json`, `src/_data/timeline/*`, `package.json`, `test/referential.test.js`, `.planning/config.json` - the harness Phase 2 extends and the reserved status fields.
- `.planning/phases/02-.../02-CONTEXT.md` - the 19 locked decisions (binding).
- `docs/SPIKE-01-FINDINGS.md`, `docs/spike-findings.json` - the five gate requirements and the fetch blockers behind D-07/D-11.
- `/Users/anthonygeorge/Projects/DEBT/docs/DATA-AUDIT.md` - the audit-doc template for D-17 (counts-by-status, worst-first, reviewer-disagreement section).
- Live API verification 2026-07-01 (`curl`):
  - Crossref REST `https://api.crossref.org/works/{doi}` - 200 for a real DOI, 404 for a bogus one.
  - Handle proxy `https://doi.org/api/handles/{doi}` - `responseCode` 1 (found) / 100 (not found), full JSON body.
  - Wayback CDX `https://web.archive.org/cdx/search/cdx?url=...&output=json` - header + data rows incl. `statuscode` column.
  - Wayback availability `http://archive.org/wayback/available` - HTTP 429 (rate-limited; a live ACCESS_BLOCKED example).
  - Open Food Facts v2 `https://world.openfoodfacts.org/api/v2/product/{barcode}.json?fields=...` - product object with `ingredients_text`, `nutriments` (per-100g), `rev`, `last_modified_t`; `status:0` + HTTP 404 for unknown barcodes.
  - Tesco `https://www.tesco.com/` - HTTP 403 to a browser UA (confirms the retailer-block pitfall).
  - `node --version` - v24.16.0 (global fetch available).

### Secondary (MEDIUM confidence)
- ODbL v1.0 (`opendatacommons.org/licenses/odbl/1-0`) - attribution + share-alike obligations on redistributed OFF-derived data (already recorded in `sources.json`). [CITED]

### Tertiary (LOW confidence)
- `lychee` link checker - cited as prior art for the status taxonomy and HEAD->GET fallback only (D-07/D-08); not a dependency.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all built-ins and already-pinned packages; no new deps; versions verified.
- Architecture / verification model: HIGH - the shapes follow the locked decisions and the existing envelope conventions; the derivation function maps directly to the D-15 table.
- External APIs: HIGH - all four endpoints exercised live this session against the exact shapes the decisions assume.
- Pitfalls: HIGH - the Wayback rate-limit and retailer 403 pitfalls were reproduced live; the sources-vs-passes and corpus-escape pitfalls are grounded in the read code.
- Corpus-wide OFF generalisation (A2): MEDIUM - verified for one product; ingestion should read the actual measure suffix present.

**Research date:** 2026-07-01
**Valid until:** 2026-07-31 (stable - built-ins and public REST APIs; re-verify the Wayback/OFF endpoint shapes if ingestion is built more than ~30 days out).
