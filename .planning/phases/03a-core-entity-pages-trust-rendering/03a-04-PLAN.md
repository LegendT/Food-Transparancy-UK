---
phase: 03a
plan: 04
type: execute
wave: 3
depends_on: [03a-01, 03a-02, 03a-03]
files_modified:
  - src/product.njk
  - lib/allergen-copy.mjs
  - .eleventy.js
  - test/allergen-copy.test.js
autonomous: true
requirements: [PROD-01, PROD-09]
must_haves:
  truths:
    - "Nutrition renders as an accessible <table> (caption, thead, scope) of the nine fixed figures in schema order, distinguishing three conditions: absent key ('Not recorded'), present-publishable (value via factCell), present-withheld ('Not yet verified') (D-06)"
    - "Each recorded nutrition figure has a full sourcedValue provenance block below the table at id=\"nutrition-{key}\" carrying tabindex=\"-1\", so a status link moves focus there (WCAG 2.4.3, UI-SPEC G2)"
    - "The nutrition table reflows at 320px with no horizontal scroll (no white-space:nowrap, short status text) (UI-SPEC G1)"
    - "Allergen rendering fails safe: a withheld `absent` claim NEVER reads as 'does not contain X'; a withheld `present`/`may-contain` claim is NEVER hidden; red is a bar/border second cue only, all row text black; a standing allergen-safety caveat sits on any page showing allergens (D-12/PROD-09)"
  artifacts:
    - path: "lib/allergen-copy.mjs"
      provides: "Pure allergenLine(presence, publishable) returning the exact fail-safe copy string, exhaustively unit-tested"
      exports: ["allergenLine"]
    - path: "src/product.njk"
      provides: "The Nutrition table + per-figure provenance blocks and the Allergens fail-safe section, inserted in D-05 order"
      contains: "nutrition-"
  key_links:
    - from: "src/product.njk nutrition table status link"
      to: "id=\"nutrition-{key}\" provenance block with tabindex=\"-1\""
      via: "an in-page anchor that moves focus to a focusable target (G2)"
      pattern: "tabindex"
    - from: "src/product.njk allergen row"
      to: "allergenLine(presence, factState(provenance).publishable)"
      via: "a pure helper so the fail-safe wording is a unit invariant, never re-derived ad hoc"
      pattern: "allergenLine"
---

<objective>
Add the two data-dense, safety-critical surfaces to the product page: the accessible Nutrition table (D-06/F4, the highest-risk render detail) and the Allergens fail-safe section (D-12/PROD-09, the highest-stakes render). Both build against the plan-02 primitives (factCell) and the R-31 boundary. The allergen fail-safe wording is extracted into a pure, exhaustively unit-tested helper so "a withheld absent claim never reads as safe" is a build-time invariant, not a hand-checked template branch.

Purpose: PROD-01 (nutrition through the trust component, withheld shown as withheld) and PROD-09 (structured allergens, never free text) are the parts of the product spine where an accessible table and an allergy-safety failure mode make the render mechanics load-bearing.
Output: The Nutrition h2 table with per-figure provenance blocks and focus management, and the Allergens h2 section with the standing caveat and fail-safe rows, both inserted into src/product.njk in the locked D-05 order; a pure allergenLine helper and its exhaustive test.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-CONTEXT.md
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-RESEARCH.md
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-UI-SPEC.md
@src/_data/products/spike-02.json

<interfaces>
<!-- The nutrition and allergen patterns are locked in 03a-UI-SPEC.md; the render-safe resolutions in 03a-RESEARCH.md "D-06 / F4" and "Allergen render (D-12)". -->

Nutrition table (03a-UI-SPEC.md "Nutrition Table Pattern"): a <table> with <caption> "Nutrition per 100g", <thead scope="col"> columns Nutrient | Per 100g | Status. One <tr> per nutrient over the nine FIXED keys in schema order: energyKj, energyKcal, fat, saturates, carbohydrate, sugars, fibre, protein, salt, each with <th scope="row">. Cell conditions, driven by membership + factState:
- key NOT in product.nutrition -> "Not recorded" (muted #505a5f), Status empty/"-". Use `{% if key in product.nutrition %}` (metadata test, NO .value).
- key present -> Per-100g cell = factCell(product.nutrition[key], sources.sources, unit, "product"); Status = a short link ("see source" / "sources being checked") to the figure's provenance anchor.
Below the table, a "Nutrition sources" region (h3) renders the FULL sourcedValue block for EACH recorded figure inside an element with id="nutrition-{key}" carrying tabindex="-1" (G2 focus management). Absent figures produce no provenance block. Units: energy kJ/kcal, macros g, salt g (per 100g). 320px reflow: three short columns, cells wrap, NO white-space:nowrap, short status text (UI-SPEC G1).

factCell (from plan 02, inside macros.njk): factCell(fact, sources, unit, entityType) emits spans only; publishable -> value+unit (+review-due if stale), contested -> "Contested", withheld -> "Not yet verified". The table cell NEVER prints product.nutrition[key].value directly (check-render-safety).

Allergen fail-safe (03a-UI-SPEC.md "Allergen Render Rules", 03a-RESEARCH.md "Allergen render (D-12)"): iterate product.allergens[] (each { allergen, presence, provenance }). Branch on presence AND factState(provenance) - never on provenance.value. The exact copy per (presence, provenance publishable/withheld) is in the UI-SPEC allergen copy table:
- present+publishable -> "Contains {allergen}."; may-contain+publishable -> "May contain {allergen}."; absent+publishable -> "Not declared on the sourced label."
- present/may-contain + withheld -> "Possible {allergen}, not yet verified. Treat as present until confirmed. Check the pack." (NEVER hidden)
- absent + withheld -> "Not yet verified. We cannot confirm whether this product contains {allergen}. Check the pack." (NEVER "does not contain")
All row text is #0b0c0c black; #d4351c red is a bar/border SECOND cue only (fails 4.5:1 as text on the panel, F1). The provenance .value renders only through the block/inline macro when publishable. A standing allergen-safety caveat via caveatBox sits at the top of the section on ANY page showing allergens. F5 decision (LOCK option a): an allergen with NO record is simply not listed and is covered by the standing caveat - do NOT enumerate 14 "no information" rows (which risks implying false completeness); a missing allergen must never read as "absent".

lib/allergen-copy.mjs (NEW pure helper): allergenLine(presence, publishable) returns the exact fail-safe copy string above ({allergen} interpolated in-template). Register it in .eleventy.js as a filter allergenLine so the template calls a tested pure function; the human-readable allergen name comes from src/_data/allergens.json.

Section order: insert the Nutrition h2 and Allergens h2 into src/product.njk in the locked D-05 order (Ingredients, Nutrition, Allergens, Manufacturer, Sources, Recipe history), between the Ingredients and Manufacturer sections plan 03 authored.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add the accessible Nutrition table and per-figure provenance blocks with focus management (D-06)</name>
  <files>src/product.njk</files>
  <read_first>
    - src/product.njk (the plan-03 scaffold and the marked insertion point for the Nutrition h2 in D-05 order)
    - src/_includes/components/macros.njk (the factCell macro from plan 02 and the block sourcedValue)
    - schemas/product.schema.json (the nine nutritionValue keys and schema order L45-53; each is a SourcedValue with a numeric value)
    - src/_data/products/spike-02.json (nutrition carries ONLY sugars - the "most figures absent" reality D-06 targets) and spike-01.json (sugars 4.16)
    - 03a-UI-SPEC.md "Nutrition Table Pattern" (the full structure, the three cell conditions, G1 320px reflow, G2 tabindex focus management)
  </read_first>
  <action>
    Insert the Nutrition section (h2) into src/product.njk in D-05 order. Render a <table> with a <caption> "Nutrition per 100g" and a <thead> of three scope="col" columns (Nutrient, Per 100g, Status). Iterate the nine fixed nutrient keys in schema order with a <th scope="row"> nutrient name. For each key use `{% if key in product.nutrition %}` (a metadata membership test, never .value) to choose: absent -> a muted "Not recorded" cell and an empty/"-" status; present -> a Per-100g cell rendered via factCell(product.nutrition[key], sources.sources, unit, "product") and a short Status link ("see source" when publishable, "sources being checked" when withheld) pointing to the figure's provenance anchor href="#nutrition-{key}". Map each key to its unit (kJ, kcal, g). Below the table add a "Nutrition sources" region (h3) that, for each RECORDED figure only, renders the full sourcedValue block wrapped in an element with id="nutrition-{key}" and tabindex="-1" so activating a status link moves focus there (G2). Keep the table reflow-safe: no white-space:nowrap, short status text, cells wrap. No raw .value anywhere. British English, no em-dashes.
  </action>
  <verify>
    <automated>npm run build && node scripts/check-render-safety.mjs src && grep -q 'id="nutrition-sugars"' _site/products/cadbury-dairy-milk/index.html && grep -q 'tabindex="-1"' _site/products/cadbury-dairy-milk/index.html</automated>
    <human-check>At end-of-phase (consolidated AT check, UI-SPEC G1/G2): with a screen reader and keyboard only, confirm the nutrition table reads row/column headers correctly, a "see source" link moves focus to the provenance block, and the table reflows with no horizontal scroll at 320px / 400% zoom.</human-check>
  </verify>
  <acceptance_criteria>
    - `npm run build` exits 0 and `node scripts/check-render-safety.mjs src` passes (no raw .value in the table)
    - the table shows "Not recorded" for absent figures and the value for a recorded one: the Cadbury page shows a sugars value and "Not recorded" for keys spike-02 omits
    - each recorded figure has a focusable provenance anchor: `grep -q 'id="nutrition-sugars" tabindex="-1"' _site/products/cadbury-dairy-milk/index.html` (attribute order tolerant: both `id="nutrition-sugars"` and `tabindex="-1"` present on the target element)
    - no white-space:nowrap is introduced and status link text is short ("see source" / "sources being checked")
    - the three cell conditions are visually distinct (Not recorded vs Not yet verified vs a value): assert both "Not recorded" and a rendered value appear on the page
  </acceptance_criteria>
  <done>Nutrition renders as an accessible per-100g table distinguishing absent/withheld/published figures, with focusable per-figure provenance blocks and a 320px-safe reflow.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add the Allergens fail-safe section backed by a pure, exhaustively-tested allergenLine helper (D-12/PROD-09)</name>
  <files>src/product.njk, lib/allergen-copy.mjs, .eleventy.js, test/allergen-copy.test.js</files>
  <read_first>
    - src/product.njk (the marked Allergens h2 insertion point in D-05 order)
    - src/_data/products/spike-02.json (allergens: milk present, tree-nuts/cereals may-contain, all with provenance that is currently WITHHELD - the live present/may-contain+withheld case)
    - src/_data/allergens.json (the 14 allergen ids and their human-readable names)
    - src/_includes/components/macros.njk (caveatBox for the standing caveat; sourcedValue for a publishable provenance value) and .eleventy.js (the addFilter pattern L36-39 to register allergenLine)
    - 03a-UI-SPEC.md "Allergen Render Rules" (the copy table and the four hard invariants) and Copywriting Contract "Allergen copy" (verbatim strings)
  </read_first>
  <behavior>
    - allergenLine("absent", false) returns the "Not yet verified. We cannot confirm whether this product contains" wording and NEVER contains "does not contain" (the safety invariant).
    - allergenLine("present", false) and allergenLine("may-contain", false) return "Possible ... Treat as present until confirmed. Check the pack." (never hidden, treated as present).
    - allergenLine("present", true) -> "Contains"; allergenLine("may-contain", true) -> "May contain"; allergenLine("absent", true) -> "Not declared on the sourced label." (never an absolute "does not contain").
    - Every returned string is plain wording with no allergen name baked in (the template interpolates the name), and none of the six returns includes the phrase "does not contain".
  </behavior>
  <action>
    Create lib/allergen-copy.mjs exporting a pure allergenLine(presence, publishable) returning the exact UI-SPEC fail-safe copy string for each of the six (presence x publishable) cases, with no allergen name embedded (the template interpolates {allergen}). Register it in .eleventy.js as an addFilter("allergenLine", ...). Insert the Allergens section (h2) into src/product.njk in D-05 order: render the standing allergen-safety caveat via caveatBox at the top of the section on any page that has product.allergens; then one row per declared allergen (a definition-style list), choosing the line via allergenLine(item.presence, (item.provenance | factState(sources.sources, "product")).publishable) and interpolating the human-readable allergen name from allergens.json; render the provenance .value only through sourcedValue when publishable. All row text is black; the #d4351c red is a CSS bar/border second cue only (styles from plan 02). Do NOT enumerate allergens with no record (F5 option a - the standing caveat covers silence); a missing allergen must never read as absent. Author test/allergen-copy.test.js asserting all six cases return the exact expected wording AND that NONE of the six returns contains the substring "does not contain" (the D-12 safety invariant, exhaustive). British English, no em-dashes, verbatim copy.
  </action>
  <verify>
    <automated>node --test test/allergen-copy.test.js && npm run build && node scripts/check-render-safety.mjs src && grep -q "Treat as present until confirmed" _site/products/cadbury-dairy-milk/index.html</automated>
    <human-check>At end-of-phase (consolidated AT check): with a screen reader confirm each allergen row's meaning is conveyed by its text alone (colour removed), a withheld allergen reads as a warning not a reassurance, and the standing caveat is announced.</human-check>
  </verify>
  <acceptance_criteria>
    - `node --test test/allergen-copy.test.js` exits 0 and asserts NO allergenLine return contains "does not contain" (the safety invariant)
    - a withheld present/may-contain allergen is shown as a warning, never hidden: `grep -q "Treat as present until confirmed" _site/products/cadbury-dairy-milk/index.html` (spike-02 milk/nuts provenance is withheld)
    - a withheld absent claim never asserts absence: no built product page contains the phrase "does not contain": `! grep -rq "does not contain" _site/products/`
    - the standing allergen-safety caveat renders on the allergens page: `grep -q "Do not rely on this archive for allergy safety" _site/products/cadbury-dairy-milk/index.html`
    - `node scripts/check-render-safety.mjs src` passes (provenance values render only through the macro)
  </acceptance_criteria>
  <done>Allergens render fail-safe from the structured field: a withheld absent never reads as safe, a withheld possible allergen is never hidden, red is a second cue only, and the fail-safe wording is a unit invariant via allergenLine.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| corpus JSON -> rendered product page | Untrusted structured allergen/nutrition data is rendered to HTML; a mis-rendered allergen absence is a real-world safety hazard, not just an information-disclosure issue |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03a-04-01 | Tampering (of safety meaning) | A withheld `absent` allergen claim rendering as "does not contain X" and being trusted for allergy safety | mitigate | Rendering branches on presence AND factState(provenance), never on provenance.value; the fail-safe wording is a pure allergenLine helper whose test asserts NO return contains "does not contain"; a built-HTML check asserts the phrase appears on no product page; a standing safety caveat is mandatory |
| T-03a-04-02 | Information Disclosure | A withheld or contested nutrition figure leaking as an asserted value in a table cell | mitigate | The cell uses factCell (gates on factState, inside macros.njk); the absent/present distinction uses a metadata membership test (`key in nutrition`), never .value; check-render-safety fails the build on any raw .value |
| T-03a-04-03 | Denial (of access) | A screen-reader or keyboard user unable to reach a figure's provenance, or a 320px reader facing horizontal scroll | mitigate | Real <table> semantics (caption/thead/scope), provenance targets carry tabindex="-1" for focus movement (G2), and the table reflows with no nowrap (G1); a consolidated manual AT check confirms it at end-of-phase |
| T-03a-04-SC | Tampering | npm/pip/cargo installs | accept | Zero new dependencies this phase; supply-chain delta is zero, so no install checkpoint applies |
</threat_model>

<verification>
- `node --test test/allergen-copy.test.js` proves the fail-safe wording exhaustively, including that no return ever asserts absence.
- `npm run build` + `node scripts/check-render-safety.mjs src` stay green; no built product page contains "does not contain".
- The nutrition table is a real accessible table with focusable provenance targets and a 320px-safe reflow; the consolidated manual AT check is recorded at end-of-phase.
</verification>

<success_criteria>
- Nutrition renders as an accessible per-100g table distinguishing Not recorded / Not yet verified / published, with focusable per-figure provenance.
- Allergens render fail-safe from the structured field with the standing caveat; a withheld absent never reads as safe and a withheld possible allergen is never hidden.
- The allergenLine helper's test guarantees the "does not contain" phrase can never be emitted for a withheld absence.
</success_criteria>

<output>
Create `.planning/phases/03a-core-entity-pages-trust-rendering/03a-04-SUMMARY.md` when done.
</output>
