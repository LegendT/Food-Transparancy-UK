# Phase 3a: Core Entity Pages & Trust Rendering - Research

**Researched:** 2026-07-01
**Domain:** Static-site entity-page generation (Eleventy 3.1.6 + Nunjucks) over a flat-JSON trust-layer corpus; reader-facing rendering of derived verification states
**Confidence:** HIGH (every mechanism below is verified against the live codebase, not assumed; the one external API fact - Eleventy pagination - is cited from official docs via Context7)

## Summary

Phase 3a is a pure rendering/content phase. There are **no new runtime dependencies** and there should be none: everything needed is already installed (`@11ty/eleventy@3.1.6`, `ajv`, `pa11y-ci`, `node:test`). The heart of the work is (a) generating one server-rendered page per product and per ingredient by paginating the existing `_data` cascade, and (b) extending the *already-built, already-safe* `sourcedValue` macro and its CSS so the seven derived verification states read honestly to a non-expert. The Phase 2 trust engine (`lib/verification.mjs` + `lib/render-state.mjs` + the `factState` filter) is LOCKED and correct; 3a consumes it and never re-derives status.

Two blocking schema gaps must be settled before templates are built. **D-15** (product to ingredient link, gating INGR-04 and cross-links): add an **optional, plain-scalar `ingredients: [ingredientId]` metadata array** to the product schema, plus a pure, unit-tested reverse index. **D-14** (INGR-02 authority opinion): add an **optional fact-bearing `authorityPosition` SourcedValue field** to the ingredient schema - which requires *only* a schema property declaration because `collectFacts` auto-discovers any SourcedValue-shaped node, so the validation/derivation pipeline needs no other change.

The single highest-risk implementation detail is the **nutrition table (D-06/F4) versus the render-safety gate**: `scripts/check-render-safety.mjs` fails the build on any `.value` render outside `src/_includes/components/macros.njk`, so the table cannot print a figure's value directly. The resolution is to add a small **inline value/status cell macro inside `macros.njk`** (the single allowlisted file) that gates on `factState` exactly as the block macro does. This keeps the "one renderer" invariant intact while giving the table a scannable cell.

**Primary recommendation:** Resolve D-15 as an optional plain-scalar `ingredients` id array (migration-safe, reusable for Phases 4/6) and D-14 as an optional `authorityPosition` SourcedValue field; paginate `products`/`ingredients` objects with `resolve: values`; extend `macros.njk` (contested-with-sources branch + an inline cell macro) and `styles.css` (state accent bars) rather than writing any new render path; build the ingredient reverse index and timeline-by-product join as pure `lib/` functions exposed through `.eleventy.js` (never a `_data` JS file, which the gate forbids).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Emit one HTML page per entity | Build (Eleventy pagination) | - | Static generation at editorial cadence; no server |
| Derive a fact's publishable state | Pure `lib/` derivation | Build filter (`factState`) | LOCKED Phase 2 logic; runs identically under `node:test` and at render time |
| Gate value-to-reader boundary | `macros.njk` (sole renderer) | `check-render-safety` build gate | R-31: the one point the trust model could be silently defeated |
| Product to ingredient linking | Data model (schema) + pure reverse index | Template navigation | A structured relationship is reusable for Phase 4/6; free text is not linkable |
| Allergen fail-safe rendering | Template branching on `presence` + `factState` | CSS second cue (red bar) | Safety-critical; must never reassure on unverified absence |
| Accessibility conformance | Template semantics + CSS | `pa11y-ci` build/CI check | WCAG 2.2 AA verified, not assumed (standing rule) |

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 .. D-15 - do not re-open)

- **D-01** Honest-first, conspicuous: withheld/contested/stale are visually distinct and impossible to miss.
- **D-02** `published-contested` renders a dedicated both-sides treatment, each position with its OWN sources.
- **D-03** `published-stale` renders an inline "last verified {date}; review due" indicator.
- **D-04** All trust states consumed from the Phase 2 derivation via `factState`/`factForRender`; template NEVER re-derives status and never reads `fact.value`. Exact pixels deferred to `/gsd:ui-phase 3a` (already produced: `03a-UI-SPEC.md`).
- **D-05** Product page: grouped labelled `h2` sections in order - Ingredients, Nutrition, Allergens, Manufacturer, Sources, Recipe history.
- **D-06** Nutrition renders as an accessible table of the nine `nutritionValue` figures; the block macro does not drop into a `<td>`; per-cell provenance + the withheld/absent distinction must be resolved (see F4 resolution below).
- **D-07** Sources section is the page-level roll-up of references (PROD-04); per-fact disclosure remains.
- **D-08** Ingredient page: two distinct, clearly-headed, cited+dated blocks - (a) current GB regulatory position (INGR-03), (b) optional named-authority safety opinion (INGR-02). Both carry a standing "not dietary advice" note. Never fold INGR-02 into `regulatoryStatus`.
- **D-09** Ingredient page shape: name + synonyms + function (>=1 sentence) + E-number (INGR-01); regulatory block; optional authority block; products-containing list.
- **D-10** Templates-first is a *sequencing* decision only; SC4 (>=20 products / >=40 ingredients published) remains a fixed exit criterion filled by the human sourcing track.
- **D-11** Proof set is human-authored through a blocking checkpoint (01-10 / 02-07 pattern); AI never authors passes/adjudications.
- **D-12** Allergen safety (highest-stakes): three-state `presence` with per-item withholdable provenance. A withheld `absent` MUST NEVER read as "does not contain X"; a withheld `present`/`may-contain` MUST NEVER be hidden. Standing allergen-safety caveat on any page showing allergens. Allergens fail safe toward warning.
- **D-13** A fully/mostly-withheld page is the PRIMARY case at launch; never blocked or 404'd; templates designed for the mostly-withheld page first.
- **D-14** (BLOCKING) INGR-02 has no schema field - add a distinct `authorityPosition` field (recommended) or defer INGR-02 rendering. Never fold into `regulatoryStatus`.
- **D-15** (BLOCKING) INGR-04 + cross-links have no structured path - add a structured `ingredients: [ingredientId]` field to the product schema (recommended) or fall back to fragile free-text name matching (must be flagged best-effort).

### Claude's Discretion
- Permalink/URL scheme for product and ingredient pages, and the entity-to-entity linking model - **once D-15 fixes how the product-ingredient relationship is stored**.
- How the recipe-history "absent, not a broken stub" case renders (SC3) - within D-01.

### Deferred Ideas (OUT OF SCOPE)
- Health-effect evidence synthesis on ingredient pages (INGR-02 / EVID-SYNTH-01) - v1.x. A single study is labelled illustration only.
- Then-vs-now diff and corpus scale-up to ~100 products - Phase 4.
- Comparison view - Phase 6.
- Full timeline pages - Phase 8 (recipe-history links conditionally).
- Site shell, crawlability, non-expert UX polish, credibility surface, **the pa11y-ci route floor** - Phase 3b.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROD-01 | Product page: current ingredients, nutrition, manufacturer; each via trust component; unverified shows explicit withheld placeholder | Pagination over `products` (below) + `sourcedValue` per fact; the macro already renders the withheld floor |
| PROD-02 | Embedded recipe-history section; links to full timeline where one exists | Join `timeline` events by `productId` via a new `filterBy` filter or pure `timelineByProduct`; conditional Phase 8 link |
| PROD-03 | Each change event shows description, source, (ranged) date, confidence | `changes[].documentedChange` / `statedReason` are SourcedValues rendered via the macro; `labelledInference` is non-fact illustration |
| PROD-04 | Product lists references behind its claims | Page-level `sourceNote` roll-up (D-07) over cited source ids |
| PROD-09 | GB allergens via structured field, not free text | `product.allergens[]` (structured) with per-item `factState(provenance)`; allergen render rules |
| INGR-01 | Ingredient explainer: name, synonyms, function >=1 sentence, E-number | Ingredient schema fields + `functionDescription` SourcedValue |
| INGR-02 | May state an authority's cited/dated position; no synthesis | **D-14: add `authorityPosition` field** (optional); renders only if present |
| INGR-03 | Current GB regulatory position, source + checked-on | `ingredient.regulatoryStatus` (claimDomain regulatory) via the macro |
| INGR-04 | List products that contain the ingredient | **D-15: add `product.ingredients` refs** + pure reverse index; honest empty state when none |
| VRFY-11 (render half) | Contested both-sides treatment with per-position sources | **F6: extend the macro's contested branch** to resolve `p.sources` via `findBy` |
| VRFY-12 (render half) | Reader-facing "last verified {date}; review due" | Macro already emits it on `d.stale`; add the amber accent bar (UI-SPEC) |

## Standard Stack

Zero new dependencies. Everything below is already present and version-pinned.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@11ty/eleventy` | 3.1.6 (installed) | Static generation + data cascade + pagination | Project default; ESM; `_data` is a queryable cascade [VERIFIED: package.json] |
| Nunjucks | bundled with 11ty | Page templates + the `sourcedValue` macro | `njk` set as `htmlTemplateEngine`/`markdownTemplateEngine` [VERIFIED: .eleventy.js] |
| `ajv` + `ajv-formats` | 8.20.0 / 3.0.1 (installed) | Build-time schema gate for the new fields | Already the trust-layer gate [VERIFIED: package.json] |
| `node:test` | Node 24 built-in | Unit tests for new pure logic | Existing test suite uses it [VERIFIED: test/*.test.js] |
| `pa11y-ci` | 4.1.1 (installed) | WCAG 2.2 AA verification of new routes | Already wired (`.pa11yci.json`, `a11y:*` scripts) [VERIFIED: package.json, .pa11yci.json] |

### Supporting (build tooling, not shipped)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `http-server` + `start-server-and-test` | 14.1.1 / 3.0.11 | Serve `_site` for pa11y | Existing `a11y:all` chain [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Eleventy pagination | Eleventy `addCollection` + explicit permalinks | Pagination is the documented, idiomatic "pages from data" path; collections add code for no gain here |
| Pure `lib/` reverse index via `addGlobalData` | A `_data/*.js` computed-data file | **FORBIDDEN**: `validate-data.mjs` fails the build on any `.js/.cjs/.mjs` under `src/_data` and any `*.11tydata.*` in `src` (the gate cannot see non-JSON data) [VERIFIED: scripts/validate-data.mjs L187-204] |
| Nunjucks `selectattr(..., "equalto", ...)` | existing `findBy` filter / a new `filterBy` | `.eleventy.js` explicitly documents `selectattr equalto` as unreliable; `findBy` is the sanctioned lookup [VERIFIED: .eleventy.js L36-39] |

**Installation:** none. `npm install` of the existing lockfile is sufficient. Do NOT add lodash, a slug library, or a templating helper - Eleventy ships `slugify` and the codebase is deliberately vanilla.

## Package Legitimacy Audit

**No external packages are installed by this phase.** Phase 3a adds only first-party templates, CSS, `lib/` functions, schema properties, and tests using already-pinned, already-audited dependencies. The Package Legitimacy Gate is therefore not applicable. If planning surfaces a temptation to add a slug/date/collection helper, treat it as a violation of the standing "vanilla unless told otherwise" and "zero new dependencies" rules and reject it.

## Architecture Patterns

### System Architecture Diagram

```
                         BUILD TIME (Eleventy)
  src/_data/products/*.json ─┐
  src/_data/ingredients/*.json (NEW dir) ─┐
  src/_data/timeline/*.json ─┐            │
  src/_data/sources.json ────┼── data ────┤
  .cache/citation-verdicts.json (committed, READ-only) ──┐
                             │                            │
        ┌────────────────────▼────────────┐              │
        │ .eleventy.js                      │             │
        │  • factState filter ──────────────┼─ calls ─────┼─▶ lib/render-state.mjs
        │  • findBy / (NEW) filterBy filter │             │      └▶ lib/verification.mjs
        │  • (NEW) addGlobalData: reverse   │             │         (deriveVerificationState)
        │    index productsByIngredient ────┼─ calls ─────┴─▶ lib/reverse-index.mjs (NEW, pure)
        │  • prebuild GATE chain (throws)   │
        └───────────┬───────────────────────┘
                    │ pagination (size 1, resolve: values)
        ┌───────────▼───────────────────────────────────┐
        │ src/product.njk   → /products/{slug}/          │
        │ src/ingredient.njk → /ingredients/{slug}/       │
        │   each imports macros.njk                       │
        │     sourcedValue(fact, sources.sources, ...)    │  ◀── the SOLE value renderer
        │     (NEW) inline cell macro for nutrition <td>  │      (R-31 boundary; allowlisted)
        └───────────┬───────────────────────────────────┘
                    │ prebuild gates run FIRST, fail build on violation
        ┌───────────▼───────────┐   ┌──────────────────────┐
        │ validate-data.mjs      │   │ check-render-safety   │  no raw .value outside macros.njk
        │ (Ajv + referential +   │   │ .mjs                  │
        │  NEW ingredient-ref     │   └──────────────────────┘
        │  integrity check)       │
        └───────────┬───────────┘
                    ▼
              _site/*.html ──▶ pa11y-ci (WCAG2AA) on representative routes
```

### Recommended Project Structure (additions only)
```
src/
├── product.njk              # NEW: paginates products → one page each
├── ingredient.njk           # NEW: paginates ingredients → one page each
├── _data/
│   └── ingredients/         # NEW dir (does not exist yet) - one JSON per ingredient
├── _includes/components/
│   └── macros.njk           # EXTEND: contested-with-sources branch + inline cell macro + allergen row
└── assets/styles.css        # EXTEND: state accent bars, nutrition table, allergen list
lib/
└── reverse-index.mjs        # NEW: pure productsByIngredient() + timelineByProduct()
test/
├── reverse-index.test.js    # NEW
└── schema.test.js           # EXTEND: new product/ingredient fields
schemas/
├── product.schema.json      # EXTEND: optional `ingredients` scalar-id array
└── ingredient.schema.json   # EXTEND: optional `authorityPosition` SourcedValue
```

### Pattern 1: Pages from data (Eleventy pagination)
**What:** Emit one page per entity by paginating the auto-loaded data object.
**Critical gotcha:** `src/_data/products/spike-01.json` is namespaced as `products["spike-01"]` - the *subfolder* becomes the top-level key and each *filename* a nested key, so `products` is an **object keyed by filename, not an array** [CITED: 11ty docs "Access Nested Global Data" via Context7; VERIFIED: components-demo.njk uses `sources.sources` from the same cascade]. Two consequences:
1. Pagination MUST use `resolve: values` (default pagination over an object iterates its *keys* - strings - which would break every template).
2. Hyphenated keys (`products.spike-01`) are invalid Nunjucks dot-notation; only bracket access or paginate-over-values works. Paginating values sidesteps this entirely.

```njk
---
# src/product.njk  [pattern CITED: 11ty pages-from-data]
pagination:
  data: products
  size: 1
  alias: product
  resolve: values
permalink: "/products/{{ product.slug }}/"
layout: layouts/base.njk
---
{% from "components/macros.njk" import sourcedValue, sourceNote, caveatBox %}
<h1>{{ product.name }}</h1>
{# ... labelled h2 sections, each fact via sourcedValue(fact, sources.sources, ...) #}
```
Same shape for `src/ingredient.njk` over `ingredients`. **Prerequisite:** create `src/_data/ingredients/` (absent today) with at least one record, or the pagination target is undefined.

### Pattern 2: Entity joins without a `_data` JS file
**What:** Recipe-history (timeline events by `productId`) and INGR-04 (products by ingredient id) both need *all* matches, but `findBy` returns only the first, and `selectattr equalto` is documented-unreliable.
**When to use:** any one-to-many join at render time.
**How:** two complementary mechanisms, both legal under the gate (which forbids JS in `_data` but not in `.eleventy.js` or `lib/`):
- A new array-returning filter `filterBy(arr, key, value)` in `.eleventy.js`, mirroring `findBy`, for the simple timeline join: `timeline | dictValues | filterBy("productId", product.id)` (add a `dictValues` filter or expose `Object.values` since `timeline` is also a filename-keyed object).
- A pure `lib/reverse-index.mjs` for the ingredient reverse index (it carries matching logic worth unit-testing), exposed via `eleventyConfig.addGlobalData("productsByIngredient", () => productsByIngredient(products))`.

```javascript
// lib/reverse-index.mjs  [NEW - pure, node:test-friendly, mirrors lib/verification.mjs style]
export function productsByIngredient(products) {
  const map = new Map(); // ingredientId -> [{ id, name, slug }]
  for (const p of Object.values(products ?? {})) {
    for (const ingId of p.ingredients ?? []) {          // the D-15 structured field
      if (!map.has(ingId)) map.set(ingId, []);
      map.get(ingId).push({ id: p.id, name: p.name, slug: p.slug });
    }
  }
  return map; // INGR-04 reads map.get(ingredient.id) ?? []  → honest empty state when absent
}
export function timelineByProduct(events) {
  const map = new Map();
  for (const e of Object.values(events ?? {})) {
    if (!map.has(e.productId)) map.set(e.productId, []);
    map.get(e.productId).push(e);
  }
  return map;
}
```

### Pattern 3: Extending the SOLE renderer, not adding a new one
**What:** All value rendering must stay inside `src/_includes/components/macros.njk` (the only path `check-render-safety.mjs` allowlists) so the R-31 invariant holds.
**When to use:** any time a template needs to show a value, including a table cell.
**How:** add primitives *inside* `macros.njk`; never render `.value` in a page template.

### Anti-Patterns to Avoid
- **Rendering a figure's value in a `<td>` directly** (`{{ nutrition.sugars.value }}`) - fails `check-render-safety` (regex `/\.value\b/`) and defeats R-31. Use an inline cell macro inside `macros.njk` instead.
- **A `_data/*.js` computed-data file** for the reverse index - fails `validate-data.mjs` (non-JSON data bypasses the gate).
- **Re-deriving status in a template** (checking `fact.verification.passes.length`, `fact.value !== null`, etc.) - forbidden by D-04; the derived value carries by design in every withheld/contested record.
- **Paginating `products` without `resolve: values`** - iterates keys, not records.
- **Folding INGR-02 into `regulatoryStatus`** - D-08/D-14 forbid it; a SACN/EFSA opinion is not the GB regulatory status.
- **Enumerating an ingredient list from the `ingredients` metadata array as if it were the declared recipe** - the sourced declared list is `ingredientsText`; the metadata array is navigation only (see D-15 resolution).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One page per entity | A custom loop writing files | Eleventy pagination `size: 1` | Idiomatic, handles permalinks/collections/incremental builds [CITED: 11ty docs] |
| URL slugs | A slug function / a slug package | The entity's own `slug` field (schema-validated `^[a-z0-9][a-z0-9-]*$`) | Slugs are already curated and validated; no runtime slugification needed [VERIFIED: product/ingredient schema] |
| Fact-to-reader gating | Any new render branch | The `sourcedValue` macro + `factState` filter | The whole trust model rests on one boundary [VERIFIED: macros.njk, render-state.mjs] |
| Staleness / sufficiency logic | Any template or new script logic | `deriveVerificationState` (LOCKED) | Phase 2 owns it; re-deriving risks divergence [VERIFIED: lib/verification.mjs] |
| Discovering fact-bearing fields for a new field | Registering the new field anywhere | Just declare the property in the schema | `collectFacts` walks every node; a SourcedValue = `{sources[], claimType}` is auto-mined [VERIFIED: lib/referential.mjs L11-49] |

**Key insight:** the codebase is built so that adding a new fact-bearing field (D-14's `authorityPosition`) needs *only* a schema property declaration - Ajv validation, referential checks, state derivation, and the withheld/contested render all follow automatically. Do not add bespoke handling for it.

## Blocking Schema Decisions - Resolutions

### D-15 (INGR-04 + product-to-ingredient cross-links) - RECOMMEND Option A (structured, optional, scalar)

**Add to `product.schema.json` `properties` (keeps `additionalProperties: false`):**
```json
"ingredients": {
  "type": "array",
  "uniqueItems": true,
  "items": { "type": "string", "pattern": "^[a-z0-9][a-z0-9-]*$" },
  "description": "Ordered ingredient-id references into the ingredients corpus, for cross-linking and the INGR-04 reverse index. Plain metadata (NOT a SourcedValue): it is a navigation/relationship layer, distinct from the sourced free-text ingredientsText which remains the declared-recipe fact of record. Optional so existing records validate unchanged (migration-safe)."
}
```
- **Optional, not required** → the field is additive; every existing product record (spike-01/02/03) still validates with no edit. Only records that want cross-links/INGR-04 add it. This de-risks the "touches every product" migration flagged in D-15 to "touches only records you choose to wire".
- **Plain scalar, not a SourcedValue** → it is a relationship/navigation layer. This is the clean answer to the UI-SPEC F4 concern that `ingredientsText` "has nothing to linkify per-ingredient": the declared recipe stays the single sourced free-text fact; the structured `ingredients` array is a *separate* affordance rendered as a "linked ingredient pages" list. Because it holds no `.value`, it never trips `check-render-safety`, and it never asserts an unsourced recipe.
- **New referential-integrity check in `validate-data.mjs`**: each id in `product.ingredients` must resolve to an ingredient record id (mirror the pattern of `checkReferences`/`checkRegulatoryJurisdiction` in `lib/referential.mjs`; a dangling ref fails the build). Add a `checkIngredientRefs(products, ingredients).errors` and wire it into the Gate 2-4 error array. Unit-test it.
- **Reverse index**: `productsByIngredient` (Pattern 2). INGR-04 renders `map.get(ingredient.id) ?? []`; empty → the honest empty state, never a broken stub.
- **Cross-links** (Claude's-discretion, now unblocked): render the structured `ingredients` array as a definition/nav list of "View this ingredient" links to `/ingredients/{id}/`, visually separate from the sourced `ingredientsText` block. Only ids that resolve are linked (guaranteed by the new referential check).

**Option B (free-text name/synonym matching)** is NOT recommended: substring matching false-positives ("milk" in "milk chocolate", "salt" as a substring), is fragile against British spellings and E-number forms, and per the UI-SPEC mandates a "best-effort, may be incomplete" caveat that undercuts the core-value trust proposition. If it were ever chosen, it must be a pure `lib/` matcher with word-boundary + synonym normalisation and adversarial unit fixtures, plus the mandatory caveat copy. Prefer A.

**Migration note (not a runtime-state issue, but a data-model change):** adding an optional field is backward-compatible; no existing file must change to keep validating. The *proof set* (D-11) is where `ingredients` arrays first get authored, wiring proof products to proof ingredients so INGR-04 and cross-links are live.

### D-14 (INGR-02 authority safety opinion) - RECOMMEND a distinct optional `authorityPosition` field

**Add to `ingredient.schema.json` `properties` (keeps `additionalProperties: false`):**
```json
"authorityPosition": {
  "$ref": "sourced-value.schema.json",
  "description": "Optional (INGR-02 'may state'): a named authority's published safety opinion (FSA/EFSA/SACN), cited and dated. A fact-bearing SourcedValue, DISTINCT from regulatoryStatus. Deliberately NOT claimDomain 'regulatory' - an EFSA/SACN opinion is not the GB regulatory status and may not be GB-jurisdiction, so it must not trigger the TRUST-06 GB-source + checkedOn referential rule. Ingredient pages stay descriptive: this cites a position, it does not synthesise studies (EVID-SYNTH-01 deferred)."
}
```
- **Only this schema edit is required.** Because `collectFacts` auto-discovers any `{sources[], claimType}` node [VERIFIED: lib/referential.mjs], the field is automatically Ajv-validated, referential-checked, state-derived, and render-safe - `validate-data.mjs` needs no change.
- **Keep it out of `claimDomain: regulatory`.** The regulatory referential gate (`checkRegulatoryJurisdiction`) requires a GB-jurisdiction source and a `checkedOn` date; an authority opinion may be EFSA (EU). Leave `claimDomain` absent (defaults to general) or set `general`.
- **Renders** under the `h2` "Named authority's safety opinion" via `sourcedValue`, guarded by `{% if ingredient.authorityPosition %}` so an absent field produces no empty stub (UI-SPEC D-14 rule).
- **Distinct from `regulatoryStatus`** structurally (separate property) and visually (separate labelled block), preserving the INGR-02 no-synthesis line and not misrepresenting an opinion as regulatory status.

### F6 - Extending the contested branch to carry per-position sources

The macro's contested branch today renders bare `p.value`/`p.note` (macros.njk L74-80) [VERIFIED]. D-02 requires each position's own sources. The positions come from `fact.verification.contested.positions`, each `{ value, sources[], note }` [VERIFIED: sourced-value.schema.json L114-141; render-state.mjs L33]. Extend the loop to resolve `p.sources` against the sources array with the existing `findBy`, reusing the same name/url pattern as the disclosure `fact__sources` list:
```njk
{%- for p in d.positions %}
<li class="fact__position">
  {{ p.value }}{% if unit %}{{ unit }}{% endif %} -
  {%- for id in p.sources %}{% set s = sources | findBy("id", id) %}
    {% if s %}{% if s.url %}<a href="{{ s.url }}" rel="noopener">{{ s.name }}</a>{% else %}{{ s.name }}{% endif %}{% else %}Unresolved source {{ id }}{% endif %}{% if not loop.last %}; {% endif %}
  {%- endfor %}
  {%- if p.note %} ({{ p.note }}){% endif %}
</li>
{%- endfor %}
```
- **Render-safe:** this edit is *inside* `macros.njk`, the sole allowlisted path, so `p.value` is exempt by the path allowlist; and `d.positions` is populated only when `state === "published-contested"` [VERIFIED: render-state.mjs L33], so no unadjudicated value leaks.
- **Heading discipline (UI-SPEC G4):** keep the "Contested; sources disagree:" label a `<span>`, not a heading. The UI-SPEC states the macro "emits no heading of its own, so it never disturbs the outline" (line 262) - preserve that. Flag for the plan: if a page section wants an `h3` around a contested group it adds it in the page template, not the macro.

### D-06 / F4 - Nutrition table versus the render-safety gate (the highest-risk detail)

The UI-SPEC prescribes a scannable value table plus an anchored per-figure provenance list. The trap: a `<td>` cannot use the block macro (it emits a `<details>`), yet printing `{{ figure.value }}` in the cell fails `check-render-safety` (regex `/\.value\b/`, any file except `macros.njk`) [VERIFIED: scripts/check-render-safety.mjs L53]. **Resolution:** add an inline value/status cell macro *inside* `macros.njk` so the value still flows through the one allowlisted renderer and still gates on `factState`:
```njk
{# in macros.njk - inline, no <details>, safe for a <td> #}
{% macro factCell(fact, sources, unit, entityType) %}
{% set d = fact | factState(sources, entityType) %}
{%- if d.publishable %}<span class="fact__value">{{ d.value }}{{ unit }}</span>{% if d.stale %} <span class="fact__review-due">review due</span>{% endif %}
{%- elif d.contested %}<span class="fact__contested-inline">Contested</span>
{%- else %}<span class="fact__withheld">Not yet verified</span>{%- endif %}
{% endmacro %}
```
- The table template checks **`{% if key in product.nutrition %}`** (metadata, no `.value`) to distinguish the three conditions the UI-SPEC demands: **absent key** → "Not recorded" (never calls the macro), **present** → `factCell` for the value/status, plus a status link to the `id="nutrition-{key}"` provenance anchor below.
- Below the table, the **full block `sourcedValue`** renders per recorded figure inside `id="nutrition-{key}"` targets carrying `tabindex="-1"` (UI-SPEC G2, WCAG 2.4.3 focus management).
- This keeps R-31 intact (all value rendering in `macros.njk`), stays no-JS accessible, and reflows at 320px (three short columns, no `nowrap`) per UI-SPEC G1.

### Allergen render (D-12) - render-safe branching

`product.allergens[]` items carry `presence` (metadata enum) + `provenance` (a SourcedValue) [VERIFIED: product.schema.json L67-104; spike-02/03 data]. Render each row by branching on `presence` **and** `factState(provenance).state` - never on `provenance.value`:
- The presence wording (UI-SPEC allergen copy table) is chosen from `presence` + whether the provenance `publishable`/withheld. All text is black; red is a CSS bar only.
- The provenance `.value` (e.g. "Declared on the current GB label") appears only through the block/inline macro when publishable.
- Hard invariants enforced by branch, not by data: withheld `absent` → "Not yet verified... Check the pack." (never "does not contain"); withheld `present`/`may-contain` → shown, never hidden. Standing `caveatBox` at the top of the section. Recommend UI-SPEC option (a): rely on the standing caveat for allergens with no record rather than enumerating 14 "no information" rows (which risks implying false completeness).

## Runtime State Inventory

Not a rename/refactor/migration phase in the runtime-state sense - it is greenfield templates plus additive optional schema fields. Explicitly checked:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | The committed `.cache/citation-verdicts.json` (4 fresh RESOLVES entries) is READ at build to derive publishable state; it is NOT gitignored [VERIFIED]. Nothing publishes for a citation absent from it. | Proof set (D-11) must add fresh RESOLVES entries for its citations, else every proof page is all-withheld and no *published* state can be demonstrated. |
| Live service config | None - static build, no external runtime services. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | `PATH_PREFIX` (pathPrefix), `CITATION_VERDICTS_CACHE` (test override) only; no new secrets. | None. |
| Build artifacts | `_site/` output; the new `src/_data/ingredients/` directory does not yet exist and must be created. | Create `src/_data/ingredients/`; add proof ingredient records. |

## Common Pitfalls

### Pitfall 1: The nutrition-cell value trips the render-safety gate
**What goes wrong:** `{{ figure.value }}` (or any `.value`) in `product.njk`/`ingredient.njk` fails `check-render-safety` and the build stops.
**Why:** the gate default-denies `.value` outside `macros.njk` to protect R-31.
**How to avoid:** route every value through a macro in `macros.njk` (block `sourcedValue` or the new inline `factCell`); use `{% if key in nutrition %}` for the absent/recorded distinction.
**Warning signs:** build error "Render-safety failed: ... renders a raw '.value'".

### Pitfall 2: Pagination over `products`/`ingredients` yields strings, not records
**What goes wrong:** iterating keys ("spike-01") instead of records; templates read `.name` off a string.
**Why:** subfolder `_data` files namespace to a filename-keyed **object**, and default pagination iterates object keys.
**How to avoid:** `resolve: values` in the pagination block. Never rely on `products.spike-01` dot access (hyphen breaks it).
**Warning signs:** blank pages, `undefined` names, one page per filename-string.

### Pitfall 3: Staleness threshold vs citation-existence TTL are different clocks
**What goes wrong:** authoring a `published-stale` proof fact by only backdating dates, and it renders withheld instead.
**Why:** two independent freshness checks. A citation must be a **fresh RESOLVES within `CITATION_TTL_DAYS` (180d)** for the fact to publish at all; *separately*, fact staleness fires when `lastVerified` (max confirms `checkedOn`) is older than 12 months (regulatory) or 24 months (current) [VERIFIED: lib/verification.mjs L18, L209-217, L326-328].
**How to avoid (proof-set recipe for published-stale):** author a fact that MEETS sufficiency (corroborable: >=2 confirms passes spanning >=2 distinct lineage roots incl. >=1 primary origin; authoritative: authority pass + distinct-`reviewerKind` re-read of the same source) with pass `checkedOn` dated > 24 months before today (e.g. 2023-06-01), while its cited sources have **recent** `checkedAt` RESOLVES entries in the verdict cache. Optionally set `verification.stalenessClass` to force the class. Result: sufficient + `isPastStaleness` true → `published-stale`.
**Warning signs:** proof "stale" fact shows the withheld placeholder; check the verdict cache has fresh entries for its sources.

### Pitfall 4: The default page is mostly-withheld and must still read as trustworthy (D-13)
**What goes wrong:** designing for the fully-verified page; the launch reality (spike-02/03 are entirely withheld [VERIFIED]) looks broken.
**Why:** most facts start unverified; withheld is the normal, correct outcome (R-02).
**How to avoid:** build and screenshot-review the mostly-withheld product first; withheld cards are calm grey with a dashed border and an explicit label, not alarm colour (UI-SPEC).
**Warning signs:** a reviewer reading an all-withheld page as an error state.

### Pitfall 5: Allergen absence rendered as reassurance
**What goes wrong:** a withheld `absent` allergen reads as "does not contain X" - a safety hazard.
**Why:** naive rendering of `presence: absent` without gating on the provenance's derived state.
**How to avoid:** branch on `presence` AND `factState(provenance).state`; a withheld absent shows "cannot confirm... check the pack"; hard invariants are template logic, not data trust.
**Warning signs:** any allergen wording asserting absence without a publishable provenance.

### Pitfall 6: Re-deriving status in a template
**What goes wrong:** a template reads `fact.value`/`fact.verification` to decide what to show, diverging from the derivation.
**Why:** every withheld/contested record still carries its raw value by design.
**How to avoid:** only ever consume `factState` output (`state/publishable/stale/contested/value/positions`); D-04.
**Warning signs:** `check-render-safety` failure, or `.verification`/`.passes` referenced in a page template.

## Code Examples

### Recipe-history section (PROD-02/03, SC3 empty state)
```njk
{# product.njk - timeline join via the reverse map or a filterBy filter #}
<h2>Recipe history</h2>
{% set events = timelineByProduct[product.id] %}
{% if events and events.length %}
  {% for e in events %}{% for c in e.changes %}
    {{ sourcedValue(c.documentedChange, sources.sources, "Change", "", "timeline") }}
    {{ sourcedValue(c.statedReason, sources.sources, "Stated reason", "", "timeline") }}
    {% if c.labelledInference %}<p class="example"><strong>Labelled inference:</strong> {{ c.labelledInference.text }}</p>{% endif %}
  {% endfor %}{% endfor %}
{% else %}
  <div class="empty-state">
    <h3>No recipe changes recorded yet</h3>
    <p>We have not yet sourced and verified any formulation changes for this product. When we do, they will appear here, each with its source and date.</p>
  </div>
{% endif %}
```
Note: `entityType: "timeline"` threads historical-staleness (never-stale) into the derivation for change events [VERIFIED: lib/verification.mjs L185-199]. `labelledInference` is NOT a fact (no `sources`/`claimType`) - render as labelled illustration only, never through the trust component.

### Ingredient authority block (INGR-02, conditional on D-14)
```njk
{% if ingredient.authorityPosition %}
<h2>Named authority's safety opinion</h2>
{{ sourcedValue(ingredient.authorityPosition, sources.sources) }}
{{ caveatBox("This describes a regulatory or authority position. It is not medical or dietary advice.") }}
{% endif %}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Eleventy 2 CommonJS config | Eleventy 3 ESM-first config | v3 (2024) | Config and `lib/` are ESM (`import`) [VERIFIED: .eleventy.js is ESM] |
| `selectattr equalto` for lookups | project `findBy` filter (+ new `filterBy`) | project convention | Reliable joins [VERIFIED: .eleventy.js] |

**Deprecated/outdated:** none relevant. Do not adopt Eleventy 4.0 alpha (CLAUDE.md rule).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `resolve: values` is the correct Eleventy 3.1.6 pagination option to iterate an object's values | Pattern 1 | LOW - documented behaviour; verify with a one-record smoke build first. If the API differs, fall back to an `addCollection` that returns `Object.values(products)`. |
| A2 | The proof set can demonstrate `published-contested` on existing data | D-11 / Testing | MEDIUM - I confirmed `published-confirmed` (spike-01 manufacturer, fresh cache) and withheld (spike-02/03) are live, but did not independently confirm a live contested fact. The human author must confirm/author one; the R-31 test fixture proves the render path works. |
| A3 | Adding an optional field keeps `additionalProperties:false` schemas valid for existing records | D-14/D-15 | LOW - optional additive properties are backward-compatible by JSON Schema semantics; the schema.test.js extension will confirm. |

**Note:** A1-A3 are the only unverified-in-session items; all render/gate/derivation mechanics are VERIFIED against the live codebase.

## Open Questions

1. **Timeline data exposure key.** `src/_data/timeline/*.json` namespaces to a `timeline` object; the recipe-history join needs `Object.values(timeline)`. Confirm whether to expose it via a `filterBy` filter + a `dictValues`/`values` filter, or via an `addGlobalData` `timelineByProduct` map (recommended for symmetry with the ingredient reverse index). Either is a small, testable addition.
2. **pa11y route selection (3a vs 3b boundary).** 3b owns the full route floor; 3a should register a *representative* set (one mostly-withheld product, one with published + contested + allergens, one ingredient with `authorityPosition`, one `published-stale` proof page). Confirm the exact URLs once proof slugs are authored.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build + tests | ✓ | 24 (pinned `.node-version`, netlify NODE_VERSION=24) | - |
| `@11ty/eleventy` | page generation | ✓ | 3.1.6 | - |
| `ajv`/`ajv-formats` | schema gate | ✓ | 8.20.0 / 3.0.1 | - |
| `pa11y-ci` | WCAG check | ✓ | 4.1.1 | - |
| Headless Chrome/Chromium | pa11y-ci runtime | Assumed present (a11y:* scripts pre-exist and pass Chrome launch args) | - | If CI lacks Chrome, install `puppeteer`'s bundled Chromium or use the CI's browser image; do NOT add it as a project dep |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** headless Chrome for pa11y is an environment concern, not a package to add.

## Validation Architecture

`nyquist_validation: true` [VERIFIED: .planning/config.json]. Every phase requirement maps to an automated check runnable in seconds.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 24 built-in) + Ajv gate scripts + `pa11y-ci` |
| Config file | none for node:test; `.pa11yci.json` for a11y (WCAG2AA) |
| Quick run command | `node --test test/reverse-index.test.js` (new pure logic) |
| Full suite command | `npm test` then `npm run prebuild` then `npm run a11y:all` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROD-01 | Every fact via trust component; unverified shows withheld placeholder | integration (build + grep) | `npm run build && grep -L "Not yet verified" _site/products/*/index.html` for all-withheld pages; render-safety gate | ❌ Wave 0 (templates) |
| PROD-01 | No raw `.value` leaks in new templates | build gate | `node scripts/check-render-safety.mjs src` | ✅ exists |
| PROD-02/03 | Recipe-history renders events or honest empty state | unit + build | `node --test test/reverse-index.test.js` (timelineByProduct) | ❌ Wave 0 |
| PROD-04 | Sources roll-up lists cited sources | integration | assert product page contains each cited source name | ❌ Wave 0 |
| PROD-09 | Allergens via structured field; fail-safe wording | unit + integration | test that withheld `absent` never emits "does not contain"; withheld `present` never hidden | ❌ Wave 0 |
| INGR-01 | Ingredient explainer fields present | integration | assert ingredient page has name/synonyms/function/E-number | ❌ Wave 0 |
| INGR-02 | Authority block renders only when field present | schema + integration | `node --test test/schema.test.js` (authorityPosition valid/invalid); page-presence assertion | ⚠️ extend schema.test.js |
| INGR-03 | GB regulatory block via macro, checkedOn present | build gate | existing `checkRegulatoryJurisdiction` in validate-data | ✅ exists |
| INGR-04 | Products-containing list correct; empty state honest | unit | `node --test test/reverse-index.test.js` (productsByIngredient: empty, single, multi, dangling-excluded) | ❌ Wave 0 |
| INGR-04 | Dangling ingredient ref fails build | build gate | new `checkIngredientRefs` in validate-data.mjs + `node --test test/referential.test.js` | ⚠️ extend |
| VRFY-11 | Contested shows both positions WITH sources | unit + integration | render-state test asserts positions carry sources; page assertion for both-sides + source names | ⚠️ extend render-state.test.js |
| VRFY-12 | Stale shows "last verified {date}; review due" | unit + integration | derivation test (published-stale); page assertion for the indicator | ✅ derivation covered; ❌ page assertion Wave 0 |
| All routes | WCAG 2.2 AA | a11y | `npm run a11y:all` (pa11y-ci over representative new routes) | ⚠️ extend `.pa11yci.json` urls |

### Sampling Rate
- **Per task commit:** `node --test test/<touched>.test.js` + `node scripts/check-render-safety.mjs src` + `node scripts/validate-data.mjs`.
- **Per wave merge:** `npm test && npm run prebuild`.
- **Phase gate:** `npm run build && npm run a11y:all` green over the representative route set before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/_data/ingredients/` directory + >=1 proof ingredient record (INGR-01/03; >=1 with `authorityPosition`).
- [ ] `test/reverse-index.test.js` — covers INGR-04 + recipe-history join (empty/single/multi/dangling).
- [ ] Extend `test/schema.test.js` — product `ingredients` field + ingredient `authorityPosition` (valid + additionalProperties rejection).
- [ ] Extend `test/referential.test.js` — new `checkIngredientRefs` dangling-ref failure.
- [ ] Extend `.pa11yci.json` — representative product/ingredient/stale routes (3a subset; 3b owns the floor).
- [ ] Proof-set verdict-cache entries (fresh RESOLVES) so a `published`/`published-stale`/`published-contested` example is demonstrable (human checkpoint).

## Security Domain

`security_enforcement: true`, ASVS L1, block-on high [VERIFIED: .planning/config.json]. This is a read-only static site with no auth, sessions, or server; most ASVS categories are not applicable. The live risks are input handling of untrusted ingested strings and the safety-integrity of allergen rendering.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface (public read-only archive) |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | All content is public |
| V5 Input Validation / Output Encoding | **yes** | Nunjucks autoescaping stays ON; NO `\| safe` on any fact value or source name (stored-XSS boundary T-07-01) [VERIFIED: macros.njk header comment]. New macros/templates must not introduce `safe` on ingested strings. `jsonScript` filter escapes `<` for any embedded JSON. |
| V6 Cryptography | no | No secrets/crypto in this phase |
| V12 Files/Resources | minor | External source URLs render with `rel="noopener"` (existing pattern) - preserve on all new links |
| V14 Config | minor | Netlify security headers (X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy) already set [VERIFIED: netlify.toml] |

### Known Threat Patterns for a static trust-archive
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via ingested `value`/source `name` (untrusted crowd data, e.g. OFF) | Tampering / EoP | Autoescape ON, never `safe`; render all values only through `macros.njk` [VERIFIED existing rule] |
| Unverified value reaching a reader (trust bypass) | Information Disclosure / Repudiation | R-31 render boundary + `check-render-safety` build gate (fail-closed) |
| **Allergen mis-render as reassurance** (safety integrity, not classic ASVS) | Tampering (of safety meaning) | D-12 hard invariants enforced in template branch + a dedicated unit test; red is a second cue only |
| Dangling/spoofed source or ingredient reference | Tampering | Referential integrity gates in `validate-data.mjs` (existing source check + new `checkIngredientRefs`) fail the build |
| Open-redirect / tabnabbing via external links | Tampering | `rel="noopener"` on all external `<a>` (existing convention) |

## Sources

### Primary (HIGH confidence)
- Live codebase (read this session): `macros.njk`, `.eleventy.js`, `lib/render-state.mjs`, `lib/verification.mjs`, `lib/referential.mjs` (collectFacts), `schemas/product.schema.json`, `schemas/ingredient.schema.json`, `schemas/sourced-value.schema.json`, `scripts/validate-data.mjs`, `scripts/check-render-safety.mjs`, `src/_data/products/spike-01/02/03.json`, `src/_data/timeline/*.json`, `src/_data/allergens.json`, `.cache/citation-verdicts.json`, `.pa11yci.json`, `package.json`, `netlify.toml`, `.planning/config.json`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`.
- `/11ty/11ty-website` (Context7) — Eleventy pagination "pages from data", `resolve: values`, permalink slugify, nested `_data` namespacing.

### Secondary (MEDIUM confidence)
- Phase 3a `03a-CONTEXT.md` and `03a-UI-SPEC.md` (locked design contract, three critique rounds).

### Tertiary (LOW confidence)
- None. No unverified web claims are relied on.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps installed and version-pinned; zero new packages.
- Architecture / render mechanics: HIGH — verified against the actual macro, filter, derivation, and gates.
- Schema resolutions (D-14/D-15): HIGH — verified that `collectFacts` auto-discovers SourcedValues and that optional additive fields are migration-safe.
- Eleventy pagination specifics: HIGH (cited) — confirm with a one-record smoke build (A1).
- Proof-set contested example availability: MEDIUM (A2) — human author confirms/authors.

**Research date:** 2026-07-01
**Valid until:** 2026-07-31 (stable stack; re-check only if Eleventy is upgraded or the Phase 2 derivation changes).
