---
phase: 01-foundation-trust-primitives-schemas-rights-ci-deploy-sourcin
plan: 04
subsystem: entity-schemas
tags: [schema, json-schema, provenance, allergens, timeline, image-rights]
requires: [01-02, 01-03]
provides:
  - schemas/product.schema.json
  - schemas/ingredient.schema.json
  - schemas/brand.schema.json
  - schemas/additive.schema.json
  - schemas/image.schema.json
  - schemas/timeline-event.schema.json
  - test/schema-consistency.test.js
affects: [01-05, 01-06, 01-07]
tech-stack:
  added: []
  patterns: [json-schema-draft-2020-12, reusable-$ref-envelope, nested-provenance, allOf-const-claimdomain-marker, set-sync-test]
key-files:
  created:
    - schemas/product.schema.json
    - schemas/ingredient.schema.json
    - schemas/brand.schema.json
    - schemas/additive.schema.json
    - schemas/image.schema.json
    - schemas/timeline-event.schema.json
    - test/schema-consistency.test.js
  modified: []
decisions:
  - "Allergen provenance is nested under a single provenance $ref, never spread via allOf, so the envelope's additionalProperties false does not reject every allergen record"
  - "Regulatory-position fields combine the envelope $ref with an allOf const claimDomain regulatory, adding no new property, so the envelope additionalProperties false is satisfied"
  - "labelledInference is a distinct non-SourcedValue shape with a required basis; a SourcedValue-shaped inference is rejectable by additionalProperties false"
  - "The consistency test uses set/sorted comparisons, not deepEqual on key order, so a reorder of allergens.json or meta.json keys does not spuriously fail"
metrics:
  duration: 9
  completed: 2026-06-30
---

# Phase 01 Plan 04: Entity schemas, image-rights record and consistency test Summary

The six shapes the whole project writes into: product, ingredient, brand, additive, the image-rights record and the TimelineEvent. Fact-bearing fields route through the shared SourcedValue envelope by $ref (DATA-09); plain metadata fields stay scalar. Regulatory-position fields are marked claimDomain regulatory so the TRUST-06 gate has a key. TimelineEvent keeps documented change, stated reason and labelled inference separate (DATA-04). The image schema gives the DATA-10 gate a rights status to enforce. A node:test consistency guard locks the DATA-09 designation and the allergen/GRADE vocabulary sync.

## What was built

- **schemas/product.schema.json** — distinct $id including its filename. Plain metadata (id, slug, name, brandId, categoryId). Fact-bearing manufacturer, ingredientsText and a nutrition object whose nine per-100g figures each $ref the envelope. A regulatoryStatus field marked claimDomain regulatory via the allOf+const pattern. A structured 14-allergen array, distinct from the free-text ingredientsText, whose item nests its provenance under a single provenance $ref (NOT a spread allOf, which the envelope's additionalProperties false would reject). Reserved nullable verificationStatus/publicationStatus. additionalProperties false.
- **schemas/ingredient.schema.json** — metadata (id, slug, name, synonyms, eNumber); fact-bearing functionDescription; a regulatoryStatus field marked claimDomain regulatory. No health-effect synthesis modelled (INGR-02 descriptive-only in v1). Reserved status fields. additionalProperties false.
- **schemas/brand.schema.json** — deliberately minimal v1 identifier/filtered-list record: metadata id, slug, name; optional fact-bearing manufacturer via the envelope; reserved status fields. additionalProperties false.
- **schemas/additive.schema.json** — metadata (id, slug, name, eNumber, synonyms); fact-bearing function via the envelope; regulatory field marked claimDomain regulatory. Reserved status fields. additionalProperties false.
- **schemas/image.schema.json** — the DATA-10 rights contract. Required id, reference, rightsStatus (enum own-photographed/cleared/fair-dealing-criticism/not-cleared, default not-cleared). Optional justification (required-by-convention for fair-dealing-criticism, documented). additionalProperties false.
- **schemas/timeline-event.schema.json** — distinct $id. Required id, productId, date (date-value $ref for ranged/circa). A changes array whose item keeps documentedChange and statedReason as SourcedValues and labelledInference as a distinct non-SourcedValue shape with required basis and text. Reserved status fields. additionalProperties false.
- **test/schema-consistency.test.js** — node:test, pure JSON reads. Four guards: (a) every enumerated fact-bearing field resolves to the envelope $ref (direct or via allOf), plus the allergen item nests its provenance $ref; (b) the product allergen enum equals the allergens.json id set by set comparison; (c) meta.confidenceLevels/evidenceLevels key sets equal the GRADE enum by set comparison; (d) every claimDomain const used is a member of the envelope claimDomain enum.

## Key links

- Every fact-bearing field across the entity schemas $refs schemas/sourced-value.schema.json by filename; Ajv resolves against each schema's distinct $id (proved end to end in plan 01-05).
- The product allergen enum is kept in sync with src/_data/allergens.json; the GRADE keys in src/_data/meta.json are kept in sync with the envelope $defs.grade enum. Both are verified by the consistency test, not by hope.

## DATA-04 separation

The TimelineEvent change item is the defamation bright line. documentedChange (observable, sourced) and statedReason (manufacturer's attributed reason, sourced) are SourcedValues; labelledInference is a separate shape carrying only basis and text, with additionalProperties false so an inference shaped like a SourcedValue is rejectable. The negative fixture proving rejection lands in plan 01-05.

## Deviations from Plan

### Auto-fixed Issues

None.

### Other deviations

None. The plan was executed as written. Concrete field choices left to the executor: the product nutrition figures were modelled as the GB back-of-pack mandatory declaration plus fibre (energyKj, energyKcal, fat, saturates, carbohydrate, sugars, fibre, protein, salt), each a fact-bearing envelope $ref; the ingredient/additive fact field names are functionDescription and function respectively. The Task 4 test enumerates exactly these.

## Threat coverage

All four T-04-* register mitigations are present: labelledInference is a distinct non-SourcedValue shape (T-04-01); image rightsStatus defaults the gate to not-cleared (T-04-02); all fact-bearing fields use the envelope $ref, additionalProperties false blocks ad-hoc fields, and the DATA-09 guard test catches a scalar-modelled empirical field (T-04-03); each schema declares a distinct $id including its filename (T-04-04).

## Commits

- `a0e1e3c` feat(01-04): add product and ingredient entity schemas
- `2bd3063` feat(01-04): add brand, additive and image-rights schemas
- `54e8017` feat(01-04): add TimelineEvent schema with the DATA-04 separation
- `80314ff` test(01-04): guard DATA-09 designation and vocabulary sync

## Self-Check: PASSED

- schemas/product.schema.json — FOUND, Task 1 verify passes
- schemas/ingredient.schema.json — FOUND, Task 1 verify passes
- schemas/brand.schema.json — FOUND, Task 2 verify passes
- schemas/additive.schema.json — FOUND, Task 2 verify passes
- schemas/image.schema.json — FOUND, Task 2 verify passes
- schemas/timeline-event.schema.json — FOUND, Task 3 verify passes
- test/schema-consistency.test.js — FOUND, 5 tests pass; full suite 9/9 pass
- Commits a0e1e3c, 2bd3063, 54e8017, 80314ff — present in git log
