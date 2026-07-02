---
phase: 03a-core-entity-pages-trust-rendering
verified: 2026-07-02T10:20:00Z
status: complete_with_acknowledged_gaps
score: 4/5 must-haves verified
overrides_applied: 0
sc4_acknowledged: 2026-07-02
gaps:
  - truth: "SC4 — the seed publishable subset is reached: >=20 products and >=40 ingredients have their core current-state facts through the verification gate and published"
    status: failed
    reason: "The rendering, gating and reverse-index machinery is complete and correct, but the corpus is not populated: src/_data/products holds 3 records (spike-01/02/03) and src/_data/ingredients holds 1 record (sucralose). The numeric exit gate (>=20 / >=40) is a content/editorial deliverable (D-10), not a code defect. Requires a human go/no-go on treating the editorial corpus build as a parallel workstream. Numeric target is superseded by Phase 4 SC5 (~100 products / ~200 ingredients)."
    artifacts:
      - path: "src/_data/products/"
        issue: "3 product records; SC4 requires >=20 published"
      - path: "src/_data/ingredients/"
        issue: "1 ingredient record (sucralose); SC4 requires >=40 published"
    missing:
      - "Author and verify >=20 product records and >=40 ingredient records through the Phase 2 gate (editorial/historic-sourcing track), OR accept an override that the code phase is complete and the corpus build proceeds in parallel."
deferred:
  - truth: "SC4 corpus-scale numeric target"
    addressed_in: "Phase 4"
    evidence: "Phase 4 SC5: 'The MVP publishes pages for the SPIKE-01-sized launch corpus (target ~100 UK packaged products ...) and the ~200 ingredients in the launch corpus, each fully verified (INGR-05)'. Note: the Phase 3a >=20/>=40 seed is a distinct intermediate gate, so this is a partial (superseding) deferral, not a clean one — surfaced as a gap requiring a human decision rather than silently deferred."
---

# Phase 3a: Core Entity Pages & Trust Rendering Verification Report

**Phase Goal:** A non-expert visitor can browse server-rendered current-state product and ingredient pages over a seed corpus, with every claim rendered through the trust component and every unverified fact shown as an explicit "not yet verified — withheld" placeholder. Ingredient pages are descriptive: they explain the ingredient and cite an authoritative regulatory/safety position, without synthesising primary studies. The page can ship before every fact on it is verified — the per-fact gate is the relief valve.
**Verified:** 2026-07-02T10:20:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

The trust-rendering machinery — the load-bearing purpose of this phase — is fully built, wired, and demonstrably correct on live built HTML. Every rendering must-have across all six plans passed all four verification levels (exists, substantive, wired, data flows). The single gap is SC4: the corpus is not populated to the >=20/>=40 seed threshold (a content/editorial deliverable), so the phase's numeric exit gate is unmet.

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| SC1 | Product page shows current ingredients, nutrition, manufacturer through the trust component; unverified facts show an explicit "not yet verified — withheld" placeholder (PROD-01); GB allergens via structured field, not free text (PROD-09) | VERIFIED | `src/product.njk` renders Ingredients, Nutrition (accessible `<table>` via `factCell`), Allergens, Manufacturer through `sourcedValue`/`factCell`. Built HTML: manufacturer publishes a real value ("Lucozade Ribena Suntory Limited..."); `fact__withheld` "Not yet verified; withheld." appears across all product pages; allergens iterate the structured `product.allergens` array with `allergenLine` fail-safe copy. |
| SC2 | Ingredient page explains name/synonyms/function/E-number (INGR-01); states an authority position cited+dated with no study synthesis (INGR-02); states current GB regulatory position with source and checked-on date (INGR-03); lists products containing it (INGR-04) | VERIFIED | `src/ingredient.njk` + built `sucralose/index.html`: synonyms + E955 render; `functionDescription` renders (correctly withheld pending proof passes — the per-fact relief valve); `regulatoryStatus` renders as published-stale with source + checkedOn; `authorityPosition` (EFSA) renders in a distinct labelled block only when present; products-containing list links Lucozade Energy via `productsByIngredient`. See finding W-2 re: INGR-01 content. |
| SC3 | Product page lists references/sources (PROD-04); embedded recipe-history of sourced change events (PROD-02/03) rendered for Tier A, honest empty state (not broken stub) elsewhere; conditional timeline link | VERIFIED | `src/product.njk` Sources roll-up dedups cited ids; recipe-history joins `timelineByProduct[product.id]` — Lucozade renders a real change event, other products render "No recipe changes recorded yet" empty state; full-timeline link omitted (no Phase 8 pages exist yet). |
| SC4 | Seed publishable subset reached: >=20 products and >=40 ingredients through the gate and published, remainder shown as withheld | FAILED | Only 3 product records and 1 ingredient record on disk. Machinery to publish/withhold is correct; the corpus is unpopulated. Content/editorial deliverable (D-10), not a code failure. See Gaps Summary. |
| SC5 | VRFY-11 render half: published-contested renders a visible both-sides treatment with each position's sources, distinct from withheld. VRFY-12 render half: published-stale renders "last verified {date} — review due". Both consume Phase-2-derived state; templates never re-derive | VERIFIED | Built Lucozade page: `fact__positions` with two `fact__position` items, each carrying its own resolved source link. Built sucralose page: "Last verified 1 June 2023; review due." — reads the verification clock (checkedOn 2023-06-01), NOT `fact.updated` (2026-07-02), confirming fix commit 8687515. Templates call the `factState` filter (`.eleventy.js`) which delegates to `lib/render-state.mjs`; no status re-derivation in templates. |

**Score:** 4/5 truths verified

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | SC4 corpus-scale numeric target (partial/superseding deferral only) | Phase 4 | Phase 4 SC5 publishes the ~100-product / ~200-ingredient launch corpus, each fully verified (INGR-05). The 3a >=20/>=40 seed remains a distinct intermediate gate, so this is surfaced as a gap needing a human decision, not silently deferred. |

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `lib/reverse-index.mjs` | Pure productsByIngredient / timelineByProduct | VERIFIED | 37 lines; both exported, pure, unit-tested; wired via `.eleventy.js addGlobalData`. |
| `lib/allergen-copy.mjs` | Pure allergenLine fail-safe copy | VERIFIED | 33 lines; exported; exhaustive test; "does not contain" absent from all built HTML (confirmed). |
| `lib/render-state.mjs` | Render-safe factState projection (R-31); lastVerified = verification clock | VERIFIED | 49 lines; `factForRenderFromData` wired as `factState` filter; `lastVerified` uses max confirms-pass checkedOn, not `fact.updated`. |
| `lib/referential.mjs` | checkIngredientRefs + checkTimelineRefs build gates | VERIFIED | Both exported (lines 86, 106) alongside checkReferences/checkRegulatoryJurisdiction/checkDateRanges. |
| `src/_includes/components/macros.njk` | factCell inline macro + contested per-position sources | VERIFIED | 141 lines; `factCell` (spans-only, R-31-gated) + `sourcedValue` contested branch resolves per-position sources via `findBy`. |
| `src/product.njk` | Paginated product page, D-05 sections | VERIFIED | 249 lines; pagination resolve:values; all D-05 sections present. See W-1 (stray closing tag). |
| `src/ingredient.njk` | Paginated ingredient page, INGR-01..04 | VERIFIED | 113 lines; explainer, regulatory, optional authority, products-containing. |
| `schemas/product.schema.json` | Optional plain-scalar ingredients array (D-15) | VERIFIED | `ingredients` field present, optional, non-fact-bearing. |
| `schemas/ingredient.schema.json` | Optional authorityPosition SourcedValue (D-14) | VERIFIED | `authorityPosition` field present. |
| `src/_data/ingredients/sucralose.json` | First ingredient record | VERIFIED | functionDescription (withheld), regulatoryStatus (stale), authorityPosition (EFSA, published). |
| `.cache/citation-verdicts.json` | Fresh RESOLVES entries for proof citations | VERIFIED | 6 RESOLVES entries incl. fsa-gb-additives-e955 and efsa-sucralose-2026. |
| `.pa11yci.json` | Representative 3a route subset | VERIFIED | 7 routes incl. product and ingredient pages. |
| `src/_data/sources.json` | Two new source records | VERIFIED | 40 source ids incl. efsa-sucralose-2026 and fsa-gb-additives-e955. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `.eleventy.js addGlobalData` | `lib/reverse-index.mjs` | disk read → pure fns → plain objects | WIRED | productsByIngredient / timelineByProduct exposed to templates. |
| `scripts/validate-data.mjs` | `checkIngredientRefs` / `checkTimelineRefs` | build gate on dangling refs | WIRED | Both exported and referenced; render-safety + build gates pass. |
| `src/ingredient.njk` products list | `productsByIngredient[ingredient.id]` | reverse index | WIRED | Built HTML lists Lucozade Energy under sucralose. |
| `src/product.njk` recipe-history | `timelineByProduct[product.id]` | reverse index | WIRED | Lucozade renders event; others render empty state. |
| macros.njk contested branch | per-position `p.sources` | `findBy` per position | WIRED | Built HTML: two positions, each with a resolved `<a>` source link. |
| product.njk allergen row | `allergenLine(presence, publishable)` | pure helper | WIRED | Fail-safe copy renders; no "does not contain" leaks. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| product.njk | product.manufacturer | `_data/products/*` via cascade | Yes — publishes "Lucozade Ribena Suntory Limited..." | FLOWING |
| product.njk | timelineByProduct[id] | `_data/timeline/*` via reverse index | Yes — Lucozade contested event | FLOWING |
| ingredient.njk | productsByIngredient[id] | `_data/products/*` D-15 array | Yes — Lucozade linked | FLOWING |
| ingredient.njk | authorityPosition | sucralose.json | Yes — EFSA opinion published | FLOWING |
| ingredient.njk | regulatoryStatus | sucralose.json + verdict cache | Yes — published-stale, real "1 June 2023" verification date | FLOWING |

### Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full test suite | `node --test` | tests 209 / pass 209 / fail 0 | PASS |
| Production build | `npm run build` | exit 0; 8 files written incl. 3 products + 1 ingredient | PASS |
| Render-safety gate | `node scripts/check-render-safety.mjs` | exit 0; 8 templates scanned, no raw fact-value renders | PASS |
| published-stale renders verification clock | grep built sucralose HTML | "Last verified 1 June 2023; review due" (not 2 July 2026) | PASS |
| published-contested both-sides | grep built Lucozade HTML | 2 positions, each with resolved source link | PASS |
| Allergen fail-safe | grep all built HTML for "does not contain" | NONE (fail-safe holds) | PASS |
| INGR-04 cross-link | grep built sucralose HTML | links /products/lucozade-energy/ | PASS |
| pa11y WCAG 2.2 AA (7 routes) | `npm run a11y:all` | Not re-run this pass (needs Chrome + served build); parent verified 7/7, 0 errors this session; `.pa11yci.json` routes correct | SKIP (see Human Verification) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| PROD-01 | 03a-02/03/04 | Product page facts through trust component; unverified → withheld | SATISFIED | Render machinery verified on built HTML. |
| PROD-09 | 03a-04 | GB allergens via structured field, not free text | SATISFIED | Structured `product.allergens` array + allergenLine fail-safe. |
| PROD-02/03 | 03a-03 | Embedded recipe-history of sourced change events | SATISFIED | timelineByProduct join; contested event + empty state. |
| PROD-04 | 03a-03 | Product lists references/sources | SATISFIED | Sources roll-up section with dedup. |
| INGR-01 | 03a-05 | Ingredient explains name/synonyms/function/E-number | SATISFIED (render); content pending | Structure + synonyms/E-number render; the sole ingredient's function currently withheld by design (W-2). |
| INGR-02 | 03a-05/06 | Authority position cited+dated, no study synthesis | SATISFIED | EFSA authorityPosition renders in distinct block, only when present. |
| INGR-03 | 03a-05 | Current GB regulatory position, source + checked-on | SATISFIED | regulatoryStatus renders published-stale with checkedOn. |
| INGR-04 | 03a-01/05 | Lists products containing the ingredient | SATISFIED | productsByIngredient reverse index; Lucozade listed. |
| VRFY-11 (render half) | 03a-02/06 | Contested both-sides treatment with sources | SATISFIED | Two positions with resolved links on built Lucozade page. |
| VRFY-12 (render half) | 03a-02/06 | "last verified {date} — review due" from verification clock | SATISFIED | "Last verified 1 June 2023; review due" (fix commit 8687515). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `src/product.njk` | 249 | Stray unmatched `</content>` closing tag (no `<content>` opening; layout uses `{{ content \| safe }}`) | Warning | Emits one literal invalid `</content>` end tag into every built product page. Browsers ignore unknown end tags and pa11y passed, so not goal-blocking, but it is invalid markup that should be removed. Ingredient page is clean. |
| — | — | Debt markers (TBD/FIXME/XXX/TODO/HACK) | None | None found in any phase-modified file. |

### Human Verification Required

### 1. pa11y-ci WCAG 2.2 AA across the 7 representative routes

**Test:** Run `npm run a11y:all`.
**Expected:** 7/7 URLs pass with 0 WCAG 2.2 AA errors.
**Why human:** Requires a running Chrome instance and served build; not re-run in this verification pass. Parent reported 7/7 with 0 errors this session and `.pa11yci.json` routes are correct — flagged for confirmation only, not a suspected failure.

### 2. Visual/screen-reader confirmation of the new trust-state treatments

**Test:** With a screen reader and keyboard only, open the Lucozade product page (contested change event) and the sucralose ingredient page (published-stale regulatory status, published EFSA authority block, withheld function). Confirm the contested both-sides list, the "review due" indicator, and the withheld placeholders are each conveyed by text (not colour alone) and are navigable.
**Expected:** Each state is announced distinctly; accent-bar colour is a second cue only; the "see source"/nutrition anchors move focus to the `tabindex="-1"` provenance blocks.
**Why human:** Visual distinctness and assistive-technology announcement quality cannot be verified by grep; the automated floor (pa11y) checks contrast/structure but not comprehension of the new VRFY-11/12 visuals.

### Gaps Summary

The phase's core deliverable — server-rendered product and ingredient pages driving every claim through the derived-state trust component, with all four trust states (published-confirmed, published-stale, published-contested, withheld) rendering correctly on live built HTML — is fully achieved and independently confirmed (209/209 tests, green build, render-safety gate green, all states verified in `_site`). The VRFY-12 verification-clock fix (commit 8687515) is confirmed live.

The one gap is SC4: the corpus holds 3 products and 1 ingredient against the >=20/>=40 seed threshold. This is a content/editorial-track deliverable (D-10), not a code defect — the publish/withhold/gate machinery is complete and would render a populated corpus correctly. Because SC4 is a listed Phase 3a success criterion and is observably unmet, the honest status is gaps_found, surfaced for a developer go/no-go decision: either populate the seed corpus, or accept an override that the code phase is complete while the editorial corpus build (and Phase 4's ~100/~200 launch corpus) proceeds in parallel. INGR-01's reader-visible function sentence depends on the same corpus/verification work — the sole ingredient's function correctly renders withheld today.

**This looks like it may be intentional** (parallel editorial workstream). To accept the deviation, add to this file's frontmatter:

```yaml
overrides:
  - must_have: "SC4 seed publishable subset >=20 products and >=40 ingredients published"
    reason: "Corpus authoring is a parallel editorial/historic-sourcing workstream (D-10); the code phase delivers the rendering and gating machinery. Numeric target superseded by Phase 4 SC5."
    accepted_by: "{your name}"
    accepted_at: "{current ISO timestamp}"
```

Minor, non-blocking: remove the stray `</content>` closing tag at `src/product.njk:249`.

---

## Acknowledged Gaps

**SC4 (seed corpus >=20 products / >=40 ingredients) — acknowledged and deferred (human decision, 2026-07-02).**

The editor reviewed the sole verification gap and accepted it as an editorial/content deliverable, not a code defect. The trust-rendering machinery is complete and proven correct on the representative corpus (product/ingredient pages, all four trust states live, the allergen fail-safe, R-31 boundary, accessibility). The numeric corpus-scale gate (>=20 products / >=40 ingredients) is owned by the parallel historic-sourcing/editorial workstream (D-10) and its target is superseded by Phase 4 SC5 (~100 products / ~200 ingredients).

Decision: Phase 3a is marked complete; corpus population continues as a separate workstream. Phase 3b (site shell, accessibility, crawlability) does not depend on the seed count and can proceed. End-of-phase manual assistive-tech check was completed via the Chrome accessibility tree during UAT (03a-UAT.md, Test 9): correct table semantics, keyboard focus management, and a clean 320px reflow.

_Verified: 2026-07-02T10:20:00Z_
_Verifier: Claude (gsd-verifier)_
_SC4 acknowledged: 2026-07-02 (editor go-decision via verify-work)_
