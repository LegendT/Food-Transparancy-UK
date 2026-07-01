# Phase 3a: Core Entity Pages & Trust Rendering - Pattern Map

**Mapped:** 2026-07-01
**Files analysed:** 11 new/modified
**Analogs found:** 11 / 11 (every new file has a first-party analog in this codebase; nothing is invented from RESEARCH alone)

This map is deliberately concrete. Every excerpt below is copied verbatim from a real file with its line range, so the planner and executor replicate the established pattern (autoescaping, path allowlists, pure `lib/` modules, `additionalProperties:false` schema hygiene, `node:test` fixtures) rather than reinventing one. The one hard invariant threaded through all of it: **no value reaches a reader except through `src/_includes/components/macros.njk`, gated on `factState`** (R-31).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/product.njk` (NEW) | route/page template | request-response (build-time render) | `src/methodology.njk` + `src/components-demo.njk` | role-match (no paginated template exists yet) |
| `src/ingredient.njk` (NEW) | route/page template | request-response | `src/methodology.njk` + `src/components-demo.njk` | role-match |
| `src/_includes/components/macros.njk` — `factCell` macro (EXTEND) | component (inline cell renderer) | transform (fact -> render-safe cell) | the existing `sourcedValue` macro, same file L60-105 | exact |
| `src/_includes/components/macros.njk` — contested branch (EXTEND) | component | transform | `sourcedValue` sources loop, same file L87-98 + contested branch L74-80 | exact |
| `lib/reverse-index.mjs` (NEW) | utility (pure module) | transform / batch | `lib/referential.mjs` (walk/collect) + `lib/render-state.mjs` (`factForRenderFromData` Map build) | exact |
| `schemas/product.schema.json` — `ingredients` array (EXTEND) | schema/config | n/a | existing `allergens`/`nutrition` optional properties, same file L40-104 | exact |
| `schemas/ingredient.schema.json` — `authorityPosition` (EXTEND) | schema/config | n/a | existing `regulatoryStatus` allOf, same file L37-47 | exact |
| `scripts/validate-data.mjs` — `checkIngredientRefs` wiring (EXTEND) | middleware (build gate) | request-response | `checkReferences` in `lib/referential.mjs` L66-80 + gate wiring L236-240 | exact |
| `src/assets/styles.css` — state accent bars, nutrition table, allergen list (EXTEND) | config (styling) | n/a | existing `.fact` / `.fact__*` rules + `.caveat` L107-216 | exact |
| `src/_data/ingredients/*.json` (NEW dir + proof records) | model (data) | n/a | `src/_data/products/spike-02.json` (SourcedValue envelopes) | role-match |
| `test/reverse-index.test.js`, `test/schema.test.js` (EXT), `test/referential.test.js` (EXT) | test | n/a | `test/render-state.test.js`, `test/referential.test.js`, `test/schema.test.js` | exact |

---

## Pattern Assignments

### `src/product.njk` and `src/ingredient.njk` (route/page template, request-response)

**Analogs:** `src/methodology.njk`, `src/components-demo.njk`, `src/index.njk`.

**Front-matter + macro-import pattern** (`components-demo.njk` L1-16) — copy the front-matter shape, `layout`, and the `{% from %}` import. The two macros to import for 3a are `sourcedValue`, `caveatBox`, `sourceNote` (+ the new `factCell`):
```njk
---
layout: layouts/base.njk
title: Trust component demonstration
description: A fixture page that renders the sourcedValue trust component...
permalink: /components-demo/
eleventyExcludeFromCollections: true
---
{% from "components/macros.njk" import sourcedValue %}

<h1>Trust component demonstration</h1>
...
{{ sourcedValue(demoFact, sources.sources, "Demonstration fact") }}
```

**Critical call-signature note (from `methodology.njk` L54 and the macro contract):** the macro is always called with `sources.sources` (the registry ARRAY inside the wrapper object), NEVER `sources`. The macro header comment (`macros.njk` L36-40) is explicit: `findBy` returns `undefined` for a non-array, silently rendering an empty source list and breaking TRUST-03. Every `sourcedValue(...)` / `factCell(...)` call in the new templates passes `sources.sources`.

**Pagination front-matter (NEW — no existing analog; from RESEARCH Pattern 1, cite 11ty docs).** The `_data/products/*` cascade is an object keyed by filename, so `resolve: values` is mandatory:
```njk
---
pagination:
  data: products
  size: 1
  alias: product
  resolve: values
permalink: "/products/{{ product.slug }}/"
layout: layouts/base.njk
---
```
Same shape for `ingredient.njk` over `ingredients`. Prerequisite: `src/_data/ingredients/` does not exist yet (verified) — create it with at least one record or the pagination target is undefined.

**Heading + section discipline (D-05, UI-SPEC G4):** exactly one `h1` (entity name), then `h2` sections. `methodology.njk` L20-40 shows the established `<section id="..." aria-labelledby="...-heading"><h2 id="...-heading">` pattern and the `dl` grade-list — reuse this section wrapper for the labelled product/ingredient blocks. The macro emits NO heading of its own (verified: `macros.njk` has no `h*`), so it never disturbs the outline.

**Content is injected via `base.njk` L33-34** (`<main id="main" ... tabindex="-1">{{ content | safe }}`). `| safe` there is on the layout's own composed content, not on any fact value — do not copy `| safe` onto any ingested string (see Shared Patterns / Output encoding).

**Recipe-history empty state (SC3)** — plain conditional, no macro, calm panel. Reuse the `.caveat`/`.example` panel styling class idiom (styles.css L210-216). RESEARCH Code Examples section gives the exact `{% if events and events.length %}...{% else %}<div class="empty-state">` block to lift.

---

### `src/_includes/components/macros.njk` — `factCell` inline macro (component, transform) [EXTEND, same file]

**Analog:** the existing `sourcedValue` macro in the SAME file, L60-105. `factCell` is a `<span>`-only sibling for table cells (the block macro emits a `<details>` and cannot sit in a `<td>` — D-06/F4).

**Copy the state-gating opening exactly** (`sourcedValue` L60-83) — derive through `factState`, branch on `d.publishable` / `d.contested` / else-withheld, never read `fact.value`:
```njk
{% macro sourcedValue(fact, sources, label, unit, entityType) %}
{% set d = fact | factState(sources, entityType) %}
<div class="fact" data-state="{{ d.state }}">
  <p class="fact__head">
    {%- if d.publishable %}
    <span class="fact__value">{{ d.value }}{% if unit %}{{ unit }}{% endif %}</span>
    ...
    {%- if d.stale %}
    <span class="fact__review-due">Last verified {{ fact.updated | readableDate }}; review due.</span>
    {%- endif %}
    {%- elif d.contested %}
    ...
    {%- else %}
    <span class="fact__withheld">Not yet verified; withheld.</span>
    {%- endif %}
```
`factCell` mirrors this branch structure (publishable / stale flag / contested / withheld) but emits only spans, no `<details>`. RESEARCH D-06/F4 gives the target body. Because it lives inside `macros.njk` (the sole allowlisted path in `check-render-safety.mjs` L26,57), its `d.value` is exempt from the `.value` regex — no other file may do this.

**Table-cell absent/recorded distinction:** the page template decides "Not recorded" vs calling `factCell` with `{% if key in product.nutrition %}` (metadata membership test, no `.value`), never inside the macro.

---

### `src/_includes/components/macros.njk` — contested branch per-position sources (component, transform) [EXTEND, F6]

**Analog:** two spots in the SAME file — the contested branch as it stands (L74-80) and the source-resolution loop it must borrow from (L87-98).

**Current contested branch** (L74-80) renders bare `p.value`/`p.note` only — the gap:
```njk
    {%- elif d.contested %}
    <span class="fact__contested">Contested; sources disagree:</span>
    <ul class="fact__positions">
      {%- for p in d.positions %}
      <li>{{ p.value }}{% if unit %}{{ unit }}{% endif %}{% if p.note %} ({{ p.note }}){% endif %}</li>
      {%- endfor %}
    </ul>
```

**Copy the source name/url resolution from the disclosure loop** (L88-97) into each position, so each side carries its OWN sources (D-02). This is the exact `findBy` + `s.url ? <a> : text` idiom to reuse:
```njk
      {%- for id in fact.sources %}
      {%- set s = sources | findBy("id", id) %}
      <li>
        {% if s %}
          {% if s.url %}<a href="{{ s.url }}" rel="noopener">{{ s.name }}</a>{% else %}{{ s.name }}{% endif %}{% if s.jurisdiction %} ({{ s.jurisdiction }}){% endif %}.
        {% else %}
          Unresolved source reference: {{ id }}.
        {% endif %}
      </li>
      {%- endfor %}
```
The positions come from `d.positions` (populated ONLY when `state === "published-contested"` — `render-state.mjs` L33), each `{ value, sources[], note }` (verified: `timeline/spike-lucozade-2017-sugar-cut.json` L26-39 carries exactly this shape live). Keep "Contested; sources disagree:" a `<span>`, not a heading (UI-SPEC G4). Preserve `rel="noopener"` on every external link.

---

### `lib/reverse-index.mjs` (utility, pure transform) [NEW]

**Analogs:** `lib/referential.mjs` (pure, `{ errors }`-returning, `walk`/`collect` style) and `lib/render-state.mjs` `factForRenderFromData` (Map-building convenience wrapper).

**Copy the pure-module docstring + `Object.values(... ?? {})` guarding style** from `referential.mjs` (the whole file is pure functions over corpus data). The Map-build convenience pattern to mirror is `render-state.mjs` L39-43:
```js
export function factForRenderFromData(fact, sourcesArray, verdictsObject, today, entityType) {
  const sourcesById = new Map((sourcesArray ?? []).map((s) => [s.id, s]));
  const verdictsById = new Map(Object.entries(verdictsObject ?? {}));
  return factForRender(fact, sourcesById, verdictsById, today, entityType);
}
```
`productsByIngredient(products)` / `timelineByProduct(events)` follow the same `Map` + nullish-coalescing shape (RESEARCH Pattern 2 gives the target bodies). Export as ESM named functions (`.eleventy.js` is ESM — L11-15 uses `import`). Expose to templates via `eleventyConfig.addGlobalData(...)`, NEVER a `_data/*.js` file (forbidden — see Shared Patterns / the data-JS gate).

---

### `schemas/product.schema.json` — optional `ingredients` id array (schema) [EXTEND, D-15]

**Analog:** the SAME file's existing optional fields. The schema is `additionalProperties: false` (L7) with only `id/slug/name` required (L8) — so an *optional* additive property is backward-compatible (every existing spike record still validates). Model the new array on the existing `allergens` array pattern (L67-104) for `type: array` + `items` object, and keep the `pattern: "^[a-z0-9][a-z0-9-]*$"` id form already used by `id`/`slug` (L13,17). RESEARCH D-15 gives the exact JSON block. Key discipline: it is a **plain scalar array, NOT a SourcedValue** — navigation metadata, distinct from the sourced `ingredientsText` (L36-39).

---

### `schemas/ingredient.schema.json` — optional `authorityPosition` (schema) [EXTEND, D-14]

**Analog:** the SAME file's `regulatoryStatus` (L37-47) and `functionDescription` (L33-36). `functionDescription` is a bare `{ "$ref": "sourced-value.schema.json" }` — copy that shape for `authorityPosition` (a plain SourcedValue). Do NOT copy the `regulatoryStatus` `allOf`+`claimDomain: regulatory const` (L38-47): RESEARCH D-14 is explicit that an EFSA/SACN opinion must NOT be `claimDomain regulatory` (it would trip the TRUST-06 GB-jurisdiction gate — `referential.mjs` `checkRegulatoryJurisdiction` L84-98). Because `collectFacts` (`referential.mjs` L45-51) auto-discovers any `{sources[], claimType}` node, this single property declaration is the ONLY change needed — validation, referential checks, and state derivation all follow.

---

### `scripts/validate-data.mjs` — `checkIngredientRefs` referential gate [EXTEND, D-15]

**Analog:** `checkReferences` in `lib/referential.mjs` L66-80 (the closest existing referential integrity check), and its wiring in `validate-data.mjs` L236-240.

**Copy the check shape** (`referential.mjs` L66-80) — build a `Set` of known ids, iterate, push readable errors, return `{ errors }`:
```js
export function checkReferences(facts, sources) {
  const known = new Set(sources.map((source) => source.id));
  const errors = [];
  for (const { path, fact } of facts) {
    ...
    for (const id of [...fact.sources, ...positionSources]) {
      if (!known.has(id)) {
        errors.push(`${path}: cites unknown source id "${id}"`);
      }
    }
  }
  return { errors };
}
```
`checkIngredientRefs(products, ingredients)` mirrors this: known = ingredient ids, iterate each product's `ingredients[]`, error on any id not resolving. **Wire it into the Gate 2-4 error array** exactly like the existing checks (`validate-data.mjs` L236-240):
```js
const errors = [
  ...checkReferences(facts, sourceRecords).errors,
  ...checkRegulatoryJurisdiction(facts, sourceRecords).errors,
  ...checkDateRanges(ranges).errors
];
```
Add `...checkIngredientRefs(products, ingredients).errors` to this array and import it at L18-26. Note: `products`/`ingredients` are already gathered via the `ENTITY_DIRS` map (L56-62) which already lists `["ingredients", "ingredient"]` — the directory is pre-registered, so no gather change is needed, only surfacing the entity objects to the new check.

---

### `src/assets/styles.css` — state accent bars, nutrition table, allergen list (styling) [EXTEND]

**Analog:** the existing `.fact` / `.fact__*` block (L107-202) and the `.caveat`/`.example` panel (L210-216).

**Reuse the border/accent idiom already present** — `.caveat`/`.example` (L210-216) already uses `border-inline-start: 4px solid ...` on a `#f3f2f1` background, which is exactly the logical-property accent-bar pattern the UI-SPEC state matrix wants:
```css
.caveat,
.example {
  margin-block: 1.5rem;
  padding: 1rem;
  border-inline-start: 4px solid #0b0c0c;
  background-color: #f3f2f1;
}
```
Style new state treatments by `data-state` selectors on the existing `.fact` card (`.fact` already sets `border: 2px solid #b1b4b6` L114). Use `[data-state^="withheld"]` (single prefix selector, UI-SPEC G5) so all four withheld sub-states are caught. Palette values are already declared as CSS custom properties in `:root` (L10-13) and the GOV.UK link colour `#1d4ed8` at L55 — the UI-SPEC locks the semantic state hex values (`#505a5f`, `#b45309`, `#1d70b8`, `#d4351c`, `#00703c`). Keep the `.visually-hidden` utility (L94-105), the 44px touch targets (`.fact__token` L139-144, `summary` L152-159), and mobile-first `@media (min-width: 40em)` (L195-202) conventions. Nutrition `<table>` needs `<caption>`/`<thead>`/`scope` and 320px reflow (no `white-space: nowrap`) per UI-SPEC G1.

---

### `src/_data/ingredients/*.json` (model/data) [NEW dir + proof records]

**Analog:** `src/_data/products/spike-02.json` (the SourcedValue envelope shape) and `timeline/spike-lucozade-2017-sugar-cut.json` (the live contested-block shape for the proof set).

**Copy the SourcedValue envelope** exactly as spike-02 uses it (L7-15 manufacturer, L26-37 nutrition figure) — every fact-bearing field carries `value, sources[], confidence, evidence, updated, claimType`, optional `claimDomain`/`checkedOn`/`note`:
```json
"manufacturer": {
  "value": "Mondelez International (Cadbury)",
  "sources": ["off"],
  "confidence": "high",
  "evidence": "moderate",
  "updated": "2026-06-30",
  "claimType": "authoritative",
  "note": "..."
},
```
Ingredient records need `id/slug/name` (required) + `synonyms[]`, `eNumber`, `functionDescription` (SourcedValue), `regulatoryStatus` (SourcedValue with `claimDomain: "regulatory"` + `checkedOn` + a GB-jurisdiction source, per TRUST-06), and optionally the new `authorityPosition`. The proof `published-contested` record copies the live `verification.contested.positions` shape from the Lucozade timeline file (L19-40). Set `verificationStatus`/`publicationStatus` to `null` (derived-only — spike-02 L79-80).

---

### `test/reverse-index.test.js` (NEW) + `test/schema.test.js` / `test/referential.test.js` (EXTEND)

**Analogs:** `test/render-state.test.js` (pure-fn + gate-lint), `test/referential.test.js` (referential fixtures), `test/schema.test.js` (Ajv valid/invalid pairs).

**`node:test` harness pattern** (all three analogs share it — `render-state.test.js` L7-14):
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { factForRenderFromData } from "../lib/render-state.mjs";
```
**Pure-function unit test shape** (`render-state.test.js` L33-39) — arrange a fixture object, call the pure fn, assert the projection:
```js
test("R-31: an unverified (no-pass) fact never exposes its raw value at the render boundary", () => {
  const fact = { value: "SECRET UNVERIFIED VALUE", sources: ["prim-a"], claimType: "authoritative", verification: { passes: [] } };
  const d = factForRenderFromData(fact, SOURCES, VERDICTS, TODAY, "product");
  assert.equal(d.publishable, false);
  assert.equal(d.value, undefined);
});
```
`reverse-index.test.js` mirrors this for `productsByIngredient` (empty / single / multi / dangling-excluded) and `timelineByProduct`.

**Ajv valid+invalid pair pattern** (`schema.test.js` L18-51) — a `validate(name, data)` helper returning `{ ok, errors }`, one test asserting a valid fixture passes, one asserting a bad one is rejected. Extend for the product `ingredients` field and ingredient `authorityPosition` (valid + `additionalProperties` rejection).

**Referential negative-fixture pattern** (`referential.test.js` L51-70) — build a fixture citing a bad id, assert `checkIngredientRefs(...).errors.length > 0`. The dangling-position-source test (L59-70) is the closest template for a dangling-ref failure.

**Build-gate spawn pattern** (`render-state.test.js` L73-95) — for asserting the gate SCRIPT fails on bad input, use `spawnSync(process.execPath, [SCRIPT, tmpFile])` in a `mkdtempSync` temp dir and assert `status !== 0` + a matching stderr string. Reuse for `checkIngredientRefs` wired into `validate-data.mjs`.

---

## Shared Patterns

### The single render boundary (R-31) — applies to ALL new templates and both macro edits
**Source:** `src/_includes/components/macros.njk` (sole renderer) + `scripts/check-render-safety.mjs` L26,53,57 (the gate) + `.eleventy.js` L59-61 (the `factState` filter).
The gate default-denies any `/\.value\b/` outside `macros.njk`:
```js
const SANCTIONED = resolve(here, "../src/_includes/components/macros.njk");
const RAW_VALUE = /\.value\b/;
function scan(path) {
  const violations = [];
  if (resolve(path) === SANCTIONED) return violations;
  ...
}
```
Consequence for the planner: every value (including nutrition cells) flows through a macro in `macros.njk`; page templates use `{% if key in obj %}` membership tests for absent/present distinctions, never `.value`. Templates consume ONLY the `factState` projection `{ state, publishable, stale, contested, value?, positions }` — never `.verification`/`.passes` (D-04).

### Reliable lookup filter — applies to both macro edits and any template join
**Source:** `.eleventy.js` L36-39 (`findBy`).
```js
eleventyConfig.addFilter("findBy", (arr, key, value) => {
  if (!Array.isArray(arr)) return undefined;
  return arr.find((item) => item && item[key] === value);
});
```
`selectattr(..., "equalto", ...)` is documented-unreliable (comment L37). Use `findBy` for single lookups; add a sibling `filterBy` (array-returning) in `.eleventy.js` for the one-to-many timeline join (RESEARCH Pattern 2). New joins live in `.eleventy.js`/`lib/`, never `_data`.

### The data-JS gate — applies to the reverse index (do NOT create a `_data/*.js` file)
**Source:** `scripts/validate-data.mjs` L183-204.
```js
else if (full.startsWith(DEFAULT_DATA_DIR) && /\.(js|cjs|mjs)$/.test(entry.name)) nonJsonData.push(full);
```
Any `.js/.cjs/.mjs` under `src/_data` (or any `*.11tydata.*` in `src`) fails the build. The reverse index MUST be a `lib/` module surfaced via `eleventyConfig.addGlobalData(...)`, not computed data under `_data`.

### Output encoding / stored-XSS boundary — applies to every new template and macro
**Source:** `macros.njk` L6-9 header comment; RESEARCH Security Domain V5.
Autoescaping stays ON. NEVER pipe a fact value or source name through `| safe`. The only `| safe` in the codebase is `base.njk` L34 on composed page content — do not extend it to ingested strings. Preserve `rel="noopener"` on every external `<a>` (existing convention, `macros.njk` L92).

### Referential integrity gate wiring — applies to `checkIngredientRefs`
**Source:** `lib/referential.mjs` (pure `{ errors }` functions) + `validate-data.mjs` L236-245 (aggregation + non-zero exit). New cross-file checks are pure functions in `referential.mjs`, imported and spread into the Gate 2-4 `errors` array; a non-empty array prints a readable list and `process.exit(1)`.

### Optional-additive schema change — applies to both schema edits
**Source:** `product.schema.json` L7-8 / `ingredient.schema.json` L7-8 (`additionalProperties: false`, minimal `required`).
Adding an OPTIONAL property to an `additionalProperties:false` schema is backward-compatible: every existing record validates unchanged. Confirm with a `schema.test.js` valid-record test after the edit (RESEARCH assumption A3).

### British English + no em-dashes + no emoji — applies to all copy and comments
**Source:** CLAUDE.md hard rules + UI-SPEC Copywriting Contract. The editorial lint (`scripts/check-editorial.mjs`, in the gate chain `.eleventy.js` L22-27) fails the build on em-dashes. Use the verbatim trust-state copy strings from UI-SPEC (e.g. "Not yet verified; withheld.", "Last verified {date}; review due.").

---

## No Analog Found

None. Every new file maps to a first-party analog. Two mechanics have NO existing in-repo precedent and must be taken from RESEARCH (cited to 11ty docs), not a codebase analog:

| Concern | Role | Data Flow | Reason / Source |
|---------|------|-----------|-----------------|
| Eleventy pagination `resolve: values` front-matter | route generation | build render | No paginated template exists in `src/` yet (only single-page `404`/`index`/`methodology`/`components-demo`). Pattern from RESEARCH Pattern 1 (11ty docs, Context7). Smoke-test with a one-record build (RESEARCH assumption A1). |
| Accessible nutrition `<table>` (caption/thead/scope + 320px reflow) | component | transform | No `<table>` exists in the codebase. Structure from UI-SPEC "Nutrition Table Pattern" + WCAG 2.2 AA. |

---

## Metadata

**Analog search scope:** `src/` (templates, includes, data, styles), `lib/`, `schemas/`, `scripts/`, `test/`.
**Files scanned (read in full or targeted range):** `macros.njk`, `methodology.njk`, `components-demo.njk`, `index.njk`, `base.njk`, `.eleventy.js`, `lib/referential.mjs`, `lib/render-state.mjs`, `scripts/validate-data.mjs`, `scripts/check-render-safety.mjs`, `schemas/product.schema.json`, `schemas/ingredient.schema.json`, `src/_data/products/spike-02.json`, `src/_data/timeline/spike-lucozade-2017-sugar-cut.json`, `src/_data/sources.json`, `src/assets/styles.css`, `test/render-state.test.js`, `test/referential.test.js`, `test/schema.test.js`.
**Pattern extraction date:** 2026-07-01
