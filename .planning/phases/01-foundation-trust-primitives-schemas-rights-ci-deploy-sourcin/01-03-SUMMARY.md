---
phase: 01-foundation-trust-primitives-schemas-rights-ci-deploy-sourcin
plan: 03
subsystem: trust-schemas
tags: [schema, provenance, dates, allergens, json-schema]
requires: [01-01, 01-02]
provides:
  - schemas/sourced-value.schema.json
  - schemas/date-value.schema.json
  - src/_data/allergens.json
affects: [01-04, 01-05, 01-07]
tech-stack:
  added: []
  patterns: [json-schema-draft-2020-12, reusable-$ref-envelope, structural-claim-type-rule]
key-files:
  created:
    - schemas/sourced-value.schema.json
    - schemas/date-value.schema.json
    - src/_data/allergens.json
  modified: []
decisions:
  - "Follow the canonical FSA term 'soya' (id soya) rather than the research seed 'soybeans'"
  - "Phase 1 encodes only the structural claim-type rule; pass-counting deferred to Phase 2"
metrics:
  duration: 7
  completed: 2026-06-30
---

# Phase 01 Plan 03: Trust primitives — SourcedValue envelope, ranged dates, allergen vocabulary Summary

The load-bearing trust contract defined once: a reusable SourcedValue provenance envelope ($ref'd by every fact-bearing field), a precise-or-ranged/circa date contract, and the closed 14-allergen controlled vocabulary — so entity schemas (01-04) and the validation gate (01-05) build against one contract that cannot drift per field.

## What was built

- **`schemas/sourced-value.schema.json`** — the reusable provenance envelope (TRUST-01, DATA-09, DATA-11). Required: `value, sources, confidence, evidence, updated, claimType`. Optional: `checkedOn` (date), `claimDomain` discriminator (general/regulatory/nutrition/allergen/ingredient-function), `note`. `additionalProperties: false`. `sources` is `uniqueItems: true` (a repeated id cannot fake two-source corroboration). Reserved nullable `verificationStatus`/`publicationStatus` for the Phase 2 gate (present-and-empty validates). `$defs.grade` enum `high/moderate/low/very-low`. An `allOf` if/then encodes the STRUCTURAL claim-type rule: a corroborable fact requires `sources.minItems: 2`; an authoritative fact keeps the base `minItems: 1`. Both branches restate `type` to keep Ajv strictTypes quiet.
- **`schemas/date-value.schema.json`** — ranged/circa date contract (DATA-03). A `oneOf` admitting a precise ISO date, a `from/to` range (each bound a full ISO date or a bare 4-digit year via `anyOf`, with optional `basis`), or a `circa` form. `additionalProperties: false` on the object branches. The `to >= from` order check is documented as deferred to the imperative `checkDateRanges()` in plan 01-05 (JSON Schema cannot express it).
- **`src/_data/allergens.json`** — the closed 14 GB-regulated allergen controlled vocabulary (DATA-07) with stable ids and display names, plus a top-level `note` recording the verify-against-FSA requirement. This is the enum source the product schema (01-04) is kept in sync with.

## Key links

- The envelope's `$defs.grade` enum (`high/moderate/low/very-low`) is kept in sync with `meta.json` `confidenceLevels`/`evidenceLevels` keys — verified by the schema-consistency test in plan 01-04. Confirmed matching at write time.

## DATA-09 boundary note

"Fact-bearing iff the schema uses the SourcedValue `$ref`" enforces provenance only on fields already declared as the `$ref`. It cannot catch an empirical field mistakenly modelled as a bare scalar; that omission is caught by the per-entity DATA-09 guard test in plan 01-04, not by the envelope.

## Allergen FSA reconciliation

Per the flagged DATA-07 directive, the 14 ids were verified against the canonical GB/FSA 14 major allergens. One reconciliation against the research seed list:

- Research/plan seed used `soybeans`; the canonical FSA term is **soya**. Followed the canonical FSA set: id `soya`, display name "Soya".

All other 13 ids match the canonical set with British-English spellings (`sulphur-dioxide-and-sulphites`, not sulfur). Count is exactly 14. The `note` field flags that wording must be re-verified against live FSA guidance before publish (research Assumption A2).

## Deviations from Plan

### Auto-fixed Issues

None.

### Other deviations

**1. [Directive override] Allergen id `soya` instead of `soybeans`**
- **Found during:** Task 3
- **Issue:** The plan/research seed list used `soybeans`; the spawn directive mandates the canonical FSA term and British-English spelling.
- **Fix:** Used id `soya` / name "Soya". Documented above. Does not affect the Task 3 verify check (which does not assert `soybeans`); plan 01-04 will key its product-schema allergen enum off this file.

## Threat coverage

All four T-03-* register mitigations are structurally present: full-provenance required fields + `additionalProperties: false` (T-03-01), ranged/circa with basis (T-03-02), closed 14-id enum (T-03-03), `sources.uniqueItems` (T-03-04). End-to-end failure-path proof lands in the Ajv gate (plan 01-05).

## Commits

- `3b8b07e` feat(01-03): add SourcedValue provenance envelope with structural claim-type rule
- `2ae7d84` feat(01-03): add ranged/circa date contract (DATA-03)
- `d43b836` feat(01-03): add 14-allergen controlled vocabulary (DATA-07)

## Self-Check: PASSED

- schemas/sourced-value.schema.json — FOUND, verify script passes
- schemas/date-value.schema.json — FOUND, verify script passes
- src/_data/allergens.json — FOUND, 14 ids, verify script passes
- Commits 3b8b07e, 2ae7d84, d43b836 — present in git log
