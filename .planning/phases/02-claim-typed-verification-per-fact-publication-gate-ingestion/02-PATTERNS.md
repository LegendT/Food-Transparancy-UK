# Phase 2: Claim-Typed Verification, Per-Fact Publication Gate & Ingestion - Pattern Map

**Mapped:** 2026-07-01
**Files analysed:** 20 (10 new, 6 modified, plus data-edit and fixture groups)
**Analogs found:** 18 / 20 (2 network surfaces have structural analogs only; native `fetch` calls have no in-repo precedent)

This is an extension phase. Almost every new file copies an existing Phase 1 analog in the same repo. The one genuinely new capability - server-side `fetch` against public REST APIs - has no codebase analog and must follow the verified snippets in `02-RESEARCH.md` §"Code Examples" instead.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/verification.mjs` (new) | utility (pure gate logic) | transform | `lib/referential.mjs` | exact |
| `lib/citation-status.mjs` (new) | utility (pure classifier) | transform | `lib/referential.mjs` / `lib/validate.mjs` | exact |
| `scripts/check-citations.mjs` (new) | script (network + cache) | request-response + file-I/O | `scripts/check-editorial.mjs` (shell) | role-match (network has no analog) |
| `scripts/ingest-off.mjs` (new) | script (ingestion) | request-response + file-I/O | `scripts/check-editorial.mjs` (shell) | role-match (network has no analog) |
| `scripts/audit-verification.mjs` (new) | script (read-only reporting) | transform + file-I/O | `scripts/check-editorial.mjs` + DEBT `DATA-AUDIT.md` | role-match |
| `schemas/sourced-value.schema.json` (modify) | schema/config | n/a | itself (self-extend) | exact |
| `schemas/source.schema.json` (modify) | schema/config | n/a | itself, `driver` nullable pattern | exact |
| `schemas/lead.schema.json` (new) | schema/config | n/a | `schemas/source.schema.json` | exact |
| `scripts/validate-data.mjs` (modify) | script (build gate) | transform | itself (self-extend) | exact |
| `ingestion/leads/*.json` (new) | data/draft store | n/a (outside cascade) | `src/_data/sources.json` shape (registry-style, NOT SourcedValue) | role-match |
| `ingestion/barcodes.json` (new) | config/worklist | n/a | `src/_data/meta.json` (vocab list) | partial |
| `.cache/citation-verdicts.json` (new) | build artefact | n/a | none (new; diffable cache) | none |
| `test/verification.test.js` (new) | test | transform | `test/referential.test.js` | exact |
| `test/citation-status.test.js` (new) | test | transform | `test/referential.test.js` / `test/schema.test.js` | exact |
| `test/lead.test.js` (new, optional) | test | transform | `test/corpus-gate.test.js` (spawnSync) | exact |
| `test/fixtures/invalid/*` (new) | test fixture | n/a | `test/fixtures/invalid/*` | exact |
| `src/_data/products/spike-0{1,2,3}.json` (data-edit) | data | n/a | itself (add `verification.passes`) | exact |
| `src/_data/timeline/*.json` (data-edit) | data | n/a | itself | exact |
| `src/_data/sources.json` (data-edit) | data | n/a | itself (add `derivedFrom`) | exact |
| `package.json` (modify) | config | n/a | itself (existing `scripts` chain) | exact |

## Shared Patterns

These cross-cutting patterns apply to nearly every file this phase touches. The planner should reference them from each plan rather than re-describing them.

### The pure `{ errors }` / `{ warnings }` gate function

**Source:** `lib/referential.mjs`
**Apply to:** `lib/verification.mjs` (every check), `lib/citation-status.mjs`, the consistency checks read by `scripts/validate-data.mjs`.

Every cross-file rule is a pure exported function that takes already-structurally-valid input and returns `{ errors }` (build-failing) or `{ warnings }` (non-failing). No `fs`, no network, no `process.exit` inside `lib/`. This is what makes the same function callable from both the script wrapper and `node:test`. The header comment states the invariant explicitly (lib/referential.mjs lines 1-7):

```js
// Every function is pure and returns { errors }, except findOrphanSources which
// returns a non-failing { warnings } (research Pattern 4). All inputs are assumed
// structurally valid: the Ajv gate runs first, so no bound here is ever undefined
// or malformed.
```

The `byId` registry-lookup map is the idiom for any check needing source metadata (lib/referential.mjs line 80 and 125-126):

```js
const byId = new Map(sources.map((source) => [source.id, source]));
// ...
const shareAlikeIds = new Set(
  sources.filter((source) => source.licence?.shareAlike === true).map((source) => source.id)
);
```

`checkDistinctLineage` (D-12) copies `checkRegulatoryJurisdiction`'s shape exactly (lib/referential.mjs lines 78-92): iterate facts, skip the ones the rule does not apply to (`if (fact.claimType !== "corroborable") continue;`), push a `${path}: ...` error string keyed on the instance path.

### Fact traversal by instance path (no fact-id system)

**Source:** `lib/referential.mjs` lines 11-51
**Apply to:** `lib/verification.mjs`, `scripts/audit-verification.mjs`, the new gates in `scripts/validate-data.mjs`.

`collectFacts` is reused as-is (D-01 chose inline `verification` records precisely so no new traversal or id system is needed). The `isSourcedValue` signature is the load-bearing detector - note it keys on `sources` + `claimType`, so a `lead` that avoids the `sources` key is invisible to it (this is why D-19 works):

```js
function isSourcedValue(node) {
  return (
    node !== null &&
    typeof node === "object" &&
    Array.isArray(node.sources) &&
    typeof node.claimType === "string"
  );
}

export function collectFacts(data, path = "") {
  const facts = [];
  walk(data, path, (node, nodePath) => {
    if (isSourcedValue(node)) facts.push({ path: nodePath, fact: node });
  });
  return facts;
}
```

Consuming facts (the shape every consumer iterates - `scripts/validate-data.mjs` lines 199-204):

```js
const facts = [];
for (const { path, data } of factBearing) {
  facts.push(...collectFacts(data, path));
}
```

### The prebuild gate chain: script shell + exit-non-zero

**Source:** `scripts/validate-data.mjs`, `scripts/check-editorial.mjs`, `package.json`
**Apply to:** every new `scripts/*.mjs`.

The offline gates run in `prebuild`; the three network-touching scripts (`check-citations`, `ingest-off`, `audit-verification`) are SEPARATE, never wired into `prebuild` (research Pitfall 3). Current chain (package.json):

```json
"validate": "node scripts/validate-data.mjs",
"lint:editorial": "node scripts/check-editorial.mjs",
"check:images": "node scripts/check-images.mjs",
"prebuild": "npm run validate && npm run lint:editorial && npm run check:images",
"test": "node --test 'test/**/*.test.js'"
```

New scripts add `"check:citations"`, `"ingest:off"`, `"audit"` as standalone entries - NOT appended to `prebuild`. Every script shell copies the same skeleton: shebang + intent-stating header comment, `dirname(fileURLToPath(import.meta.url))` root resolution, optional `process.argv[2]` target, a non-zero-corpus assertion, then collect -> check -> `console.error` the list -> `process.exit(1)`. The gate-chaining + exit idiom (scripts/validate-data.mjs lines 216-225):

```js
const errors = [
  ...checkReferences(facts, sourceRecords).errors,
  ...checkRegulatoryJurisdiction(facts, sourceRecords).errors,
  ...checkDateRanges(ranges).errors
];
if (errors.length > 0) {
  console.error("Referential validation failed:");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
```

Root-resolution + JSON-read helpers every script reuses (scripts/validate-data.mjs lines 28-31, 50):

```js
const here = dirname(fileURLToPath(import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
```

The non-zero-corpus / false-green assertion is a hard convention - copy it into `check-citations` (assert it checked >0 citations) and `audit-verification` (assert >0 facts):

```js
if (factBearing.length === 0) {
  console.error(`Validation failed: no fact-bearing files found under ${target} (empty corpus).`);
  process.exit(1);
}
```

### Ajv compile + validate (for the new `verification` shape and `lead` schema)

**Source:** `lib/validate.mjs`
**Apply to:** `scripts/validate-data.mjs` (already imports it; the new `verification` sub-schema validates for free), an optional standalone lead validator.

The import specifier MUST keep the `.js` extension - a recorded STATE constraint (lib/validate.mjs lines 6-10):

```js
// Import note: the specifier is "ajv/dist/2020.js" WITH the .js extension.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
```

`compile()` registers every `*.schema.json` in `schemas/` by `$id` (lines 18-25), so a new `lead.schema.json` dropped into `schemas/` is picked up automatically. The new `verification` object added to `sourced-value.schema.json` validates with zero code change because facts already validate against that schema.

## Pattern Assignments

### `lib/verification.mjs` (utility, transform) - NEW

**Analog:** `lib/referential.mjs` (exact - same pure-function module, same `{ errors }` contract, same `byId` map idiom, same instance-path error strings).

This module holds `deriveVerificationState()`, `checkDistinctLineage()`, `checkMeasureMismatch()`, `meetsCorroborable()`, `meetsAuthoritative()`, and the staleness classifier. All PURE. The exact function signatures are given in `02-RESEARCH.md` §"Pattern 2" (deriveVerificationState) and §"Pattern 5" (lineage + measure-mismatch).

**Copy the module header + purity invariant** from `lib/referential.mjs` lines 1-7.

**Copy the fact-iteration + skip-inapplicable + push-path-keyed-error shape** from `checkRegulatoryJurisdiction` (lib/referential.mjs lines 78-92) for `checkDistinctLineage` (fires only for `claimType === "corroborable"`, D-05/D-12):

```js
export function checkRegulatoryJurisdiction(facts, sources) {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const errors = [];
  for (const { path, fact } of facts) {
    if (fact.claimDomain !== "regulatory") continue;      // <- skip-inapplicable idiom
    const citesGb = fact.sources.some((id) => byId.get(id)?.jurisdiction === "GB");
    if (!citesGb) errors.push(`${path}: ...`);
    // ...
  }
  return { errors };
}
```

**Copy the non-blocking `{ warnings }` shape** from `findOrphanSources` (lib/referential.mjs lines 135-144) for the D-12 lineage-similarity heuristic (same publisher / eTLD+1 -> warn, never fail).

**Note:** `deriveVerificationState()` is called both by the Phase 2 gate (for internal-consistency assertions + a build-report breakdown) and, in Phase 3a, at render time. It MUST stay a pure `.mjs` in `lib/`, never an Eleventy `_data` module - the JSON-only-data invariant (scripts/validate-data.mjs lines 167-184) forbids `.js/.mjs` under `src/_data`.

---

### `lib/citation-status.mjs` (utility, transform) - NEW

**Analog:** `lib/referential.mjs` / `lib/validate.mjs` (exact - a tiny pure module, same ESM export style).

Holds only `classifyStatus(statusCode, errorClass)` -> the four-verdict enum. The verified implementation is in `02-RESEARCH.md` §"Code Examples" (a ~10-line switch over the status-code table). PURE, no network - the IO lives in `scripts/check-citations.mjs`. This split (pure decision in `lib/`, IO in `scripts/`) mirrors the existing `lib/editorial-rules.mjs` (pure `lint`) vs `scripts/check-editorial.mjs` (file IO) split.

---

### `scripts/check-citations.mjs` (script, network + cache) - NEW

**Analog:** `scripts/check-editorial.mjs` for the SHELL (header comment, root resolution, walk, non-zero assertion, exit-non-zero). **No analog for the `fetch` calls** - copy the verified HEAD->GET-Range->Wayback-CDX->Crossref/Handle snippets from `02-RESEARCH.md` §"Pattern 3" and §"Code Examples" (`checkDoi`, `waybackSnapshot`).

**Copy from `scripts/check-editorial.mjs`:** the script header stating intent + the ALLOWLIST-not-repo-walk discipline (lines 1-22), root resolution (lines 28-33), the offender-accumulate-then-report loop (lines 112-125), and the non-zero-corpus assertion (lines 106-109).

**New behaviour with no analog:** writes `.cache/citation-verdicts.json` keyed by source id -> `{ verdict, resolvedVia, checkedAt, statusCode }`. Serialise / cap ~1-2 req/s (D-10). This script NEVER enters `prebuild`; it is a manual/scheduled job that commits the cache (research Pitfall 2). Guard against SSRF (research Pitfall 6): restrict to `https:` + the Wayback host, refuse private/loopback/link-local hosts.

---

### `scripts/ingest-off.mjs` (script, ingestion) - NEW

**Analog:** `scripts/check-editorial.mjs` for the shell. **No analog for the OFF `fetch`** - copy the verified OFF v2 request/response shape from `02-RESEARCH.md` §"Pattern 4".

Reads `ingestion/barcodes.json`, fetches `world.openfoodfacts.org/api/v2/product/{barcode}.json?fields=...`, writes leads to `ingestion/leads/*.json` (the `lead` shape in §"Pattern 4"). Records OFF's `basis: per-100g` in field-level provenance so a later promotion carries the correct structured measure (research Pitfall 5). Writes OUTSIDE `src/_data` (D-19). Standalone script, not in `prebuild`.

---

### `scripts/audit-verification.mjs` (script, read-only reporting) - NEW

**Analog (structure):** `scripts/check-editorial.mjs` (walk the corpus, accumulate, report). **Analog (output document):** DEBT `docs/DATA-AUDIT.md` (read-only, do not modify) - the exact template for the emitted markdown.

Walks the corpus with `collectFacts`, derives each fact's state + staleness via `lib/verification.mjs`, reads `.cache/citation-verdicts.json`, and emits a dated `docs/DATA-AUDIT-{date}.md`. READ-ONLY - never writes a verdict or value ("AI never adjudicates", D-17).

**Copy the document shape** from DEBT `DATA-AUDIT.md` (canonical template):

```markdown
# ... Data Verification Audit
**Date:** 11 June 2026
## Counts by status
| Status | Count |
| --- | ---: |
| Confirmed | 13 |
| ...     | ...  |
## Discrepancies to approve
Ordered worst-first: wrong, then stale, then uncertain.
### Wrong (7)
#### <fact>
- **Current site value:** ...
- **Verified value:** ...
- **Measure:** <the fact's recorded structured measure>
- **Re-check:** Disagreed - flagged for extra scrutiny (see below)
```

Map DEBT's status vocabulary to the D-15 derived states: worst-first ordering `withheld-wrong` -> `withheld-open-disagreement` -> `published-stale` (then oldest `lastVerified` first), each entry carrying the fact's recorded structured `measure`, plus a separate "reviewer disagreements - flag for extra human scrutiny" section (D-17). `lastVerified = max(confirms passes' checkedOn)`.

---

### `schemas/sourced-value.schema.json` (schema/config, modify) - MODIFY

**Analog:** itself (exact self-extend). The recommended `verification` object shape + `$defs/measure` are fully specified in `02-RESEARCH.md` §"Pattern 1".

**Copy the envelope conventions already in the file:** `additionalProperties: false` (line 8), the `$defs`-with-`$ref` idiom (`grade` at lines 58-62; add `measure` alongside it), and the `allOf` `if`/`then` claim-type conditional (lines 63-75) as the template for any claim-type-conditional constraint on `verification`.

**Constrain the reserved status fields (D-03).** They are currently `["string", "null"]` (lines 49-56). Change both to reject any author-set value so publication status is derived-only (research Assumption A1 - flag for the user in plan-check):

```json
"verificationStatus": { "type": ["string", "null"], ... }   // current
"publicationStatus":  { "type": ["string", "null"], ... }   // current
// -> constrain to { "enum": [null] } (or drop), per D-03
```

---

### `schemas/source.schema.json` (schema/config, modify) - MODIFY

**Analog:** itself - the existing nullable `driver` property (lines 85-105) is the EXACT pattern for the new nullable `derivedFrom` (D-12):

```json
"driver": {
  "description": "...",
  "oneOf": [
    { "type": "null" },
    { "type": "object", ... }
  ]
}
```

`derivedFrom` is simpler - a nullable source-id string. Copy the `id` pattern constraint (lines 21-25, `"pattern": "^[a-z0-9][a-z0-9-]*$"`) and make it `oneOf` `[{ "type": "null" }, { "type": "string", "pattern": ... }]`.

---

### `schemas/lead.schema.json` (schema/config, new) - NEW

**Analog:** `schemas/source.schema.json` (exact - a flat registry-style record with a nested object, `additionalProperties: false`, `$id` + `$schema` header, `required` array, enum-constrained fields). The recommended `lead` shape is in `02-RESEARCH.md` §"Pattern 4".

**Copy the header + nested-object idiom** from `source.schema.json` lines 1-19 and the `licence` nested object (lines 60-84) as the template for the lead's `provenance` object. **Critical (D-19/C4):** the lead schema MUST NOT use the key `sources` - use `provenance` (dataset-level) + `fields[]` (field-level) - so even a misplaced lead never trips `hasSourcedShape`.

---

### `scripts/validate-data.mjs` (script, build gate, modify) - MODIFY

**Analog:** itself (exact self-extend).

Wire the new offline gates into the existing gate chain (lines 216-225): add `checkDistinctLineage`, `checkMeasureMismatch`, and `deriveVerificationState`-based internal-consistency assertions to the imported set (lines 18-26) and the error array. Read `.cache/citation-verdicts.json` (never the network - Pitfall 3). Import from the new `lib/verification.mjs` alongside the existing `lib/referential.mjs` imports.

**The corpus-escape guard already protects the lead store for free** (lines 129-161): its walk targets `src/_data` only, and `ingestion/leads/` is outside that tree, so leads are never scanned. The `hasSourcedShape` detector (lines 137-144) is the belt to the `lead`-schema-avoids-`sources` braces:

```js
const hasSourcedShape = (node) => {
  if (Array.isArray(node)) return node.some(hasSourcedShape);
  if (node && typeof node === "object") {
    if (Array.isArray(node.sources)) return true;   // <- leads avoid `sources`, so never trip this
    return Object.values(node).some(hasSourcedShape);
  }
  return false;
};
```

A **withheld fact does NOT fail the build** - the gate fails only on structural / internal-consistency violations (research Pattern 2). Do not treat `withheld-*` as an error.

---

### `test/verification.test.js` (test, new) - NEW

**Analog:** `test/referential.test.js` (exact) + `test/corpus-gate.test.js` (for the spawn-the-real-gate cases).

**Copy the harness scaffold** from `test/referential.test.js` lines 5-27: `import { test } from "node:test"; import assert from "node:assert/strict";`, the `load` helper, `const registry = load("../src/_data/sources.json").sources;`, and the valid-then-negative fixture structure. Each new failure path gets a negative fixture proving the gate that owns it (lines 49-88 are the template: one surgical fixture per rule, asserting the RIGHT rule fires and adjacent rules do NOT).

**Copy the spawn-the-gate-against-a-temp-dir idiom** from `test/corpus-gate.test.js` lines 28-44 for end-to-end build-fails assertions:

```js
const runGate = (dir) => spawnSync(process.execPath, [GATE, dir], { encoding: "utf8" });
// ...
const r = runGate(dir);
assert.notEqual(r.status, 0);
assert.match(r.stderr, /outside the validated corpus/);
```

Cases to cover (each mirrors a Phase 1 fixture): insufficient passes, `disputes`/measure-mismatch disagreement, shared lineage on a corroborable fact, a `DOES_NOT_RESOLVE` citation, `markedWrong` withholds, contested publishes.

---

### `test/citation-status.test.js` (test, new) - NEW

**Analog:** `test/referential.test.js` / `test/schema.test.js` (exact). A pure table-driven test over `classifyStatus` - assert each row of the D-07 status-code table maps to the right verdict (2xx->RESOLVES, 404/410->DOES_NOT_RESOLVE, 403/429/451/999->ACCESS_BLOCKED, 5xx/timeout->INDETERMINATE). No network, no fixtures - inline the cases.

---

### `test/fixtures/invalid/*` (test fixture, new) - NEW

**Analog:** `test/fixtures/invalid/*` (exact). Each Phase 1 failure path has one surgical negative fixture (`corroborable-one-source.json`, `regulatory-gb-no-checkedon.json`, `inference-as-sourcedvalue.json`, etc.). Add one per new failure path: insufficient-passes, measure-mismatch, shared-lineage, does-not-resolve-citation, and a SourcedValue-shaped lead placed outside the corpus (proves the D-19/C4 isolation).

---

### `ingestion/leads/*.json` + `ingestion/barcodes.json` (data/config, new) - NEW

**Analog:** `src/_data/sources.json` for the registry-style record shape (a top-level `note` + an array), but these live OUTSIDE `src/_data` (D-19) and are NOT `SourcedValue`-shaped. `barcodes.json` is a flat worklist (weak analog: `src/_data/meta.json` controlled vocab). Lead record shape is fully given in `02-RESEARCH.md` §"Pattern 4".

---

### Data edits: `src/_data/products/spike-0{1,2,3}.json`, `src/_data/timeline/*.json`, `src/_data/sources.json`

**Analog:** the files themselves (exact). Add a `verification.passes[]` object to each fact an editor verifies (most stay `withheld-unverified` initially - matches SPIKE-01's 0/3, this is correct, not a failure). Add `derivedFrom` to each `sources.json` record (root sources get `null`; the Cadbury co-derived pair points at a shared press-release source, per D-12). The Lucozade contested sugar figure (`spike-lucozade-2017-sugar-cut.json`) moves its positions into `verification.contested.positions[]` only on human adjudication (D-14). Current fact shape to extend (src/_data/products/spike-01.json lines 26-37 - the `nutrition.sugars` fact carrying the exact per-100g/per-100ml measure-mismatch case D-13 targets).

## No Analog Found

| File | Role | Data Flow | Reason / Guidance |
|------|------|-----------|-------------------|
| the `fetch` calls inside `scripts/check-citations.mjs` and `scripts/ingest-off.mjs` | network IO | request-response | No server-side HTTP exists anywhere in the repo (static-build, local-first project). Copy the VERIFIED snippets in `02-RESEARCH.md` §"Code Examples" (`checkDoi`, `waybackSnapshot`) and §"Pattern 3/4" verbatim - each was confirmed live 2026-07-01. Native `fetch` + `AbortSignal.timeout()` only; no new dependency. |
| `.cache/citation-verdicts.json` | build artefact | n/a | New diffable cache; no prior cache artefact in the repo. Recommend COMMIT (research Runtime State). |

## Metadata

**Analog search scope:** `lib/`, `scripts/`, `schemas/`, `test/` (incl. `test/fixtures/`), `src/_data/`, `package.json`, and the read-only DEBT `docs/DATA-AUDIT.md` template.
**Files scanned:** 13 read in full (referential.mjs, validate.mjs, validate-data.mjs, check-editorial.mjs, sourced-value/source schemas, referential/corpus-gate tests, spike-01.json, sources.json, DEBT DATA-AUDIT.md head) plus directory listings of all analog dirs.
**Pattern extraction date:** 2026-07-01
