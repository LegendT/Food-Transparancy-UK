---
phase: 03a
plan: 05
subsystem: entity-pages
tags: [ingredient-page, trust-rendering, pagination, INGR-01, INGR-02, INGR-03, INGR-04]
requires:
  - "ingredients data cascade (created here)"
  - "productsByIngredient global (03a-01)"
  - "sourcedValue / caveatBox macros (Phase 2)"
  - "ingredient.schema.json regulatoryStatus + authorityPosition (03a-01)"
provides:
  - "src/ingredient.njk: the server-rendered ingredient page"
  - "src/_data/ingredients/: the ingredients cascade with a first descriptive record"
affects:
  - "plan 03a-06 (human proof-set: verification passes + authorityPosition content)"
tech-stack:
  added: []
  patterns:
    - "pagination over the filename-keyed ingredients object with resolve: values (mirrors src/product.njk)"
    - "optional fact-bearing block gated on {% if ingredient.authorityPosition %} (no empty stub)"
    - "INGR-04 join via the productsByIngredient structured reverse index (honest empty state)"
key-files:
  created:
    - "src/ingredient.njk"
    - "src/_data/ingredients/sucralose.json"
  modified: []
decisions:
  - "Cited fsa-allergen-guidance (the only existing FSA/GB source) as the scaffold regulatory citation; the value renders withheld and the authoritative additives-law citation lands with the plan-06 proof set, so no verification is fabricated"
  - "Explainer h2 titled 'What it is and why it is used'; the three required entity h2 blocks (explainer, Current GB regulatory position, Products that list this ingredient) render, with the optional authority h2 appearing only when authorityPosition is present"
metrics:
  duration: 14 min
  completed: 2026-07-01
---

# Phase 03a Plan 05: Ingredient Page and Trust Rendering Summary

Descriptive, server-rendered ingredient page (explainer, GB regulatory position, optional named-authority safety opinion, products-containing list) plus the first ingredient record, with every fact rendered through the trust component and withheld until human verification passes land.

## What Was Built

- **src/_data/ingredients/sucralose.json** — the first ingredient record (Sucralose, E955): id/slug/name, synonyms, eNumber, a >=1-sentence `functionDescription` (INGR-01) and a `regulatoryStatus` (INGR-03, claimDomain regulatory, GB source + checkedOn). `verificationStatus`/`publicationStatus` are null and no verification passes are authored, so both facts correctly render withheld (D-11/D-13). It creates the previously-absent ingredients cascade, making the pagination target defined.
- **src/ingredient.njk** — paginates the ingredients object with `resolve: values` (mirroring src/product.njk), permalink `/ingredients/{{ ingredient.slug }}/`. One h1 (ingredient name) and, in locked order, h2 blocks: the explainer (INGR-01), Current GB regulatory position (INGR-03), the optional Named authority's safety opinion (INGR-02, rendered only when `authorityPosition` is present), and Products that list this ingredient (INGR-04, from the `productsByIngredient` reverse index with an honest empty state). Every fact renders through `sourcedValue(..., sources.sources, ..., "ingredient")`; no raw `.value`. Both the regulatory and authority blocks carry the standing localised not-advice note via `caveatBox`, kept structurally distinct so a safety opinion is never misread as the regulatory status (D-08).

## Verification Results

- `npm run prebuild` exits 0: the new record validates and the regulatory fact passes the TRUST-06 GB-source + checkedOn gate.
- `npm run build` exits 0: one page per ingredient (`_site/ingredients/sucralose/index.html`).
- `node scripts/check-render-safety.mjs src` passes (8 templates scanned; no raw fact-value renders).
- `node --test`: 196 pass, 0 fail.
- Page assertions: exactly one h1; three h2 blocks (authority correctly absent, no `authorityPosition` yet); "Current GB regulatory position", "not medical or dietary advice", "Not yet verified; withheld", "Products that list this ingredient" and "No published products list this ingredient yet" all present; the regulatory value string is NOT leaked (withheld render, R-31 holds).

## Deviations from Plan

None - plan executed exactly as written. The `authorityPosition` field is deliberately absent from the scaffold record (that content is plan-06 proof-set editorial work), so the authority block correctly does not render.

## Known Stubs

- **src/_data/ingredients/sucralose.json** — the `functionDescription` and `regulatoryStatus` facts are descriptive placeholders that render withheld (no verification passes authored). This is intentional and correct per D-11/D-13: the proof set (authoritative citations, verification passes and any `authorityPosition`) is authored by the human checkpoint in plan 03a-06. The record's `note` fields state this explicitly. The page renders honestly (withheld placeholders, not asserted values), so the plan goal is met without fabricated verification.

## Self-Check: PASSED

- FOUND: src/ingredient.njk
- FOUND: src/_data/ingredients/sucralose.json
- FOUND commit: 10b99df (Task 1)
- FOUND commit: 7de5c4e (Task 2)
