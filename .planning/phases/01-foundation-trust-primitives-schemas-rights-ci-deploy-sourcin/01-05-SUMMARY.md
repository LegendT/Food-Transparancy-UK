---
phase: 01-foundation-trust-primitives-schemas-rights-ci-deploy-sourcin
plan: 05
subsystem: validation-gate
tags: [ajv, json-schema, referential-integrity, trust-gate, negative-fixtures, prebuild]
requires: [01-02, 01-03, 01-04]
provides:
  - lib/validate.mjs
  - lib/referential.mjs
  - scripts/validate-data.mjs
  - src/_data/demoFact.json
  - test/schema.test.js
  - test/referential.test.js
  - test/fixtures/valid
  - test/fixtures/invalid
affects: [01-06, 01-07, 01-08]
tech-stack:
  added: []
  patterns:
    - ajv-2020-dist-js-import-node24
    - shared-lib-logic-script-and-test
    - schema-id-resolution-by-ref-filename
    - non-zero-corpus-assertion
    - ajv-first-then-imperative-checks
    - lexicographic-iso-date-order-check
    - one-failing-fixture-per-gate
key-files:
  created:
    - lib/validate.mjs
    - lib/referential.mjs
    - scripts/validate-data.mjs
    - src/_data/demoFact.json
    - test/schema.test.js
    - test/referential.test.js
    - test/fixtures/valid/product-valid.json
    - test/fixtures/valid/timeline-valid.json
    - test/fixtures/invalid/missing-provenance.json
    - test/fixtures/invalid/corroborable-one-source.json
    - test/fixtures/invalid/bad-ranged-date-structural.json
    - test/fixtures/invalid/bad-ranged-date-order.json
    - test/fixtures/invalid/inference-as-sourcedvalue.json
    - test/fixtures/invalid/bad-allergen.json
    - test/fixtures/invalid/unknown-source-id.json
    - test/fixtures/invalid/regulatory-non-gb.json
    - test/fixtures/invalid/bad-source.json
  modified: []
decisions:
  - "Ajv import uses ajv/dist/2020.js WITH the .js extension, overriding the plan's extensionless text, because ajv@8.20.0 has no exports map and Node 24's resolver rejects the bare specifier (recorded STATE decision, verified by the 01-01 smoke test and re-verified here)"
  - "A SourcedValue is identified anywhere in an entity by its signature (a sources array plus a claimType string), so one recursive walker mines facts from products, timeline changes, nutrition figures and nested allergen provenance alike"
  - "checkDateRanges normalises each bound to a full YYYY-MM-DD string (a 4-digit year becomes -01-01 on from and -12-31 on to) and compares lexicographically, with no Date objects, removing the string-versus-Date hazard"
  - "Ajv runs FIRST and exits before the imperative checks, so a malformed bound is rejected structurally and checkDateRanges never normalises an undefined value"
  - "listOffDerived keys on any source whose licence.shareAlike is true, not the literal off id, so a future ODbL source is tagged automatically"
  - "The non-zero-corpus assertion counts only fact-bearing files (demoFact plus entity records); sources.json and images.json are registry records and do not satisfy it"
metrics:
  duration: 14
  completed: 2026-06-30
---

# Phase 01 Plan 05: Data validation gate Summary

The trust gate that makes the core value a compile error. Four logical gates run in the prebuild chain: Ajv structural validation (TRUST-05 provenance, DATA-11 schemas, DATA-03 date structure, DATA-04 inference separation, DATA-07 allergens, the structural claim-type rule), then source-id resolution (DATA-01), the TRUST-06 GB-jurisdiction rule for regulatory facts, and the imperative ranged-date order check JSON Schema cannot express. Every failure mode is proved by a negative fixture, the gate refuses to pass on an empty corpus, and a bad fixture exits non-zero so the build stops.

## What was built

- **lib/validate.mjs** — `compile(schemaDir)` builds an Ajv 2020 instance (allErrors, strict) with ajv-formats and registers every `schemas/*.schema.json` by its `$id`; `validateDataset(ajv, files)` validates a list of `{ path, schemaId, data }` entries and returns `{ errors }` as readable strings. The import is `ajv/dist/2020.js` with the `.js` extension (see Deviations).
- **lib/referential.mjs** — pure functions returning `{ errors }`: `checkReferences` (every cited id resolves to the registry), `checkRegulatoryJurisdiction` (a claimDomain regulatory fact must cite a GB source and carry a checkedOn date), `checkDateRanges` (lexicographic ISO order, no Date objects), `listOffDerived` (share-alike tagging), and `findOrphanSources` (non-failing `{ warnings }`). Two exported walkers, `collectFacts` and `collectDateRanges`, mine facts and ranged dates from any entity shape and are shared by the script and the tests.
- **scripts/validate-data.mjs** — the prebuild CLI. Takes an optional target path (default `src/_data`), walks the pinned entity-directory map, asserts a non-zero fact-bearing corpus and prints the count, runs Ajv first then the three imperative checks, prints orphan-source warnings and the OFF-derived list, and `process.exit(1)` on the first failure. meta.json and allergens.json are deliberately omitted (controlled vocabularies, validated by the 01-04 consistency test).
- **src/_data/demoFact.json** — a provenance-complete authoritative SourcedValue, claimDomain general, citing one GB registry source, so the gate scans a non-zero corpus at wave 4 before any product or timeline records exist. Plan 01-07 renders this same file.
- **test/schema.test.js** — the two valid fixtures validate clean; six Ajv-level negative fixtures (missing provenance, corroborable-one-source, malformed ranged date, inference-as-SourcedValue, bad allergen, bad source) each produce Ajv errors.
- **test/referential.test.js** — the valid fixtures clear the referential and date-order checks; unknown-source-id, regulatory-non-gb and bad-ranged-date-order each fail their owning gate (the order fixture passing Ajv first, proving the division of labour); two child-process checks confirm the script exits non-zero on a bad fixture and on an empty corpus.

## Negative-fixture coverage

Nine invalid fixtures, one failing gate each, every one proving rejection:

| Fixture | Gate | Requirement |
|---------|------|-------------|
| missing-provenance | Ajv required | TRUST-05 |
| corroborable-one-source | Ajv allOf if/then | structural claim-type |
| bad-ranged-date-structural | Ajv oneOf | DATA-03 structure |
| bad-ranged-date-order | checkDateRanges (NOT Ajv) | DATA-03 order |
| inference-as-sourcedvalue | Ajv additionalProperties | DATA-04 |
| bad-allergen | Ajv enum | DATA-07 |
| unknown-source-id | checkReferences | DATA-01 |
| regulatory-non-gb | checkRegulatoryJurisdiction | TRUST-06 |
| bad-source | Ajv enum | DATA-01/02 |

## Key links

- `scripts/validate-data.mjs` is `npm run validate`, the first link in the prebuild chain wired in plan 01-01, so a violation fails `npm run build` and therefore the Netlify deploy.
- The script and both test files import the same `lib/` functions, so the gate the tests prove is the exact gate the build runs (research Pattern 4).
- The seed `demoFact.json` is the corpus guarantor until plan 01-07 adds rendered entities; it is also consumed (rendered, not recreated) by 01-07.

## Threat coverage

All five T-05-* register mitigations are present and proved: provenance-required Ajv gate (T-05-01, missing-provenance fixture); inference separation (T-05-02, inference-as-sourcedvalue fixture); source resolution plus GB jurisdiction (T-05-03, unknown-source-id and regulatory-non-gb fixtures); the gate lives in the build path with a child-process exit-code test and a non-zero-corpus guard (T-05-04); the imperative order check catches a to-before-from range (T-05-05, bad-ranged-date-order fixture).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ajv import specifier uses the .js extension**
- **Found during:** Task 1
- **Issue:** The plan action text says `import Ajv2020 from "ajv/dist/2020"` without an extension. ajv@8.20.0 ships no package `exports` map, so under Node 24's ESM resolver the bare specifier does not resolve and `compile()` would throw at module load, blocking the whole gate.
- **Fix:** Used `import Ajv2020 from "ajv/dist/2020.js"` with the `.js` extension. This is the recorded STATE decision (line 79: "Ajv ESM import must use ajv/dist/2020.js (with .js) under Node 24") and was re-verified by a smoke test compiling all ten schemas before any code was written. The plan's own `read_first` predates the smoke-test finding; STATE takes precedence.
- **Files modified:** lib/validate.mjs
- **Commit:** 45454dd

### Other deviations

- **Child-process tests point the script at temporary directories, not at a single fixture file.** The plan describes pointing the script "at an invalid fixture". To exercise the real directory pipeline (and validate against the correct schema rather than guessing one from a lone file), the invalid-fixture test seeds a temp dir's `demoFact.json` with the missing-provenance fixture and the empty-corpus test points at an empty temp dir. Both are target-path arguments and both prove the non-zero exit. The script still accepts a single-file target (validated as one SourcedValue against the default registry) for ad-hoc use.
- **`listOffDerived` keys on `licence.shareAlike === true` rather than the literal `off` id.** The plan and research describe "facts citing the off source id"; keying on the share-alike flag is the same set today (off is the only share-alike source) and is correct automatically if another ODbL source is added. The `sources` parameter the plan specified is therefore used, not ignored.

## Known Stubs

None. `demoFact.json` is an intentional, documented corpus seed (provenance-complete and schema-valid), not a placeholder: plan 01-07 renders it. No empty-array or placeholder-text stubs were introduced.

## Commits

- `45454dd` feat(01-05): add Ajv validator, referential gate logic and corpus seed
- `a98bb49` test(01-05): add happy-path schema and referential tests with valid fixtures
- `c20162d` test(01-05): add negative fixtures proving every gate fails on bad input

## Self-Check: PASSED

- All 18 created files FOUND on disk.
- Commits 45454dd, a98bb49, c20162d present in git log.
- Full test suite 25/25 pass; `npm run validate` exits 0 on the real corpus.
