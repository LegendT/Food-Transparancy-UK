---
phase: 03a
slug: core-entity-pages-trust-rendering
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-01
---

# Phase 03a - Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from the RESEARCH.md Validation Architecture; the Per-Task map is completed once plans exist (mirrors Phase 2).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node 24 built-in runner); pa11y-ci for WCAG 2.2 AA |
| **Config file** | none - tests are `test/*.test.js`, discovered by `node --test`; `.pa11yci` for a11y routes |
| **Quick run command** | `node --test` |
| **Full suite command** | `npm test` (`node --test`) + `npm run prebuild` (validate + editorial + image + render-safety) + `npm run a11y:all` (build + pa11y-ci) |
| **Estimated runtime** | ~2s unit; prebuild ~1s; a11y adds ~30s |

The offline gates (validate-data, check-editorial, check-images, check-render-safety) run in `prebuild`; the network scripts (check:citations, ingest:off, audit) stay standalone, never in the build (Phase 2 invariant).

---

## Sampling Rate

- **After every task commit:** Run `node --test`
- **After every plan wave:** Run `npm test` + `npm run prebuild`
- **Before `/gsd:verify-work`:** Full suite green, including `npm run a11y:all` (pa11y-ci 0 errors on the new routes)
- **Max feedback latency:** 15 seconds (unit)

---

## Per-Task Verification Map

Populated after planning (each plan maps its tasks -> requirement -> automated command), then finalised by `/gsd:validate-phase 3a`. The requirement-to-check mapping from RESEARCH.md Validation Architecture:

| Requirement | Test Type | Automated check |
|-------------|-----------|-----------------|
| PROD-01 (product page, trust component, withheld placeholder) | build + render-safety + a11y | product page renders per entity; `check-render-safety` green (no raw `.value`); a withheld fact shows the placeholder, not the value (unit on `factForRender` + rendered-HTML assertion) |
| PROD-09 (structured allergens, never free text) | unit + rendered-HTML | allergen rows render from the structured field; withheld-absent never reads "does not contain" (assert the D-12 invariants) |
| PROD-02/03 (recipe-history section + change events) | build + rendered-HTML | section renders for Tier A products, absent-not-stub elsewhere; each event shows description/source/date/confidence |
| PROD-04 (sources roll-up) | rendered-HTML | page lists the references behind its claims |
| INGR-01 (name/synonyms/function/E-number) | build + rendered-HTML | ingredient page renders the explainer fields |
| INGR-02 (authority position, optional) | schema + unit | new `authorityPosition` SourcedValue field validates and derives; renders only when present |
| INGR-03 (GB regulatory position, cited + dated) | rendered-HTML | regulatory-status block renders with source + checked-on |
| INGR-04 (products-containing list) | unit | reverse-index from the `ingredients: [ingredientId]` array; referential-integrity check fails on a dangling id |
| VRFY-11 rendering (contested both-sides) | unit + rendered-HTML | contested fact renders each position WITH its own sources (F6); distinct from withheld |
| VRFY-12 rendering (stale review-due) | unit + rendered-HTML | `published-stale` fact renders "last verified {date}; review due" |

---

## Wave 0 Requirements

- [ ] Additive schema fields (`ingredients: [ingredientId]` on product, `authorityPosition` on ingredient) land first with unit tests, since templates and the reverse-index depend on them (D-14/D-15).
- [ ] The proof-set fixtures/data are a human-checkpoint dependency, not a Wave 0 test artefact (see Manual-Only).

*node:test is a Node 24 built-in - no framework install task.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Human authors the proof-set verification passes/adjudications and the `published-stale` example (backdated `lastVerified` past the staleness threshold with a fresh in-TTL RESOLVES) and ~3-5 ingredient records | VRFY-11/12, INGR-01/02/03, D-11 | AI never authors verification passes or adjudications (D-04/D-11, the 01-10 / 02-07 checkpoint). The rendering is tested automatically; the underlying verified data is human editorial work | Editor authors the records + passes at a blocking checkpoint; then `npm run prebuild` stays green and the pages render each state |
| Manual AT / keyboard / 320px reflow check on the nutrition table and allergen list | PROD-01/09, UI-SPEC G1/G2 | pa11y-ci catches many but not all AT issues; the data-dense table + in-page focus need a human AT pass | Screen-reader read-through + keyboard-only nav + 320px render of a product page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (schema fields precede templates)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter (set once plans map every requirement to a check)

**Approval:** approved 2026-07-01 (plans map every phase requirement to an automated check; wave-0 schema work precedes templates; sampling continuity holds). `wave_0_complete` flips true once the wave-0 schema tests run green during execution.
