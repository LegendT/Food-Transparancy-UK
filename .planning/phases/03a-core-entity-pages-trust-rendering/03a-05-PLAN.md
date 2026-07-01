---
phase: 03a
plan: 05
type: execute
wave: 2
depends_on: [03a-01, 03a-02]
files_modified:
  - src/ingredient.njk
  - src/_data/ingredients/sucralose.json
autonomous: true
requirements: [INGR-01, INGR-02, INGR-03, INGR-04]
must_haves:
  truths:
    - "One server-rendered page is emitted per ingredient by paginating the (newly created) ingredients object with resolve: values"
    - "The explainer renders name, synonyms, E-number where applicable and a >=1-sentence function (INGR-01); the GB regulatory-position block renders through the trust component with its source and checked-on date (INGR-03)"
    - "The optional authority-safety-opinion block (INGR-02) renders ONLY when authorityPosition is present, in a distinct labelled block visually separate from the regulatory status, with a standing not-advice note; it never appears as an empty stub"
    - "The products-containing list (INGR-04) renders the products whose D-15 ingredients array includes this ingredient's id, with an honest empty state when none, sourced from the productsByIngredient global"
  artifacts:
    - path: "src/ingredient.njk"
      provides: "The paginated ingredient page: explainer, GB regulatory block, optional authority block, products-containing list"
      contains: "pagination"
    - path: "src/_data/ingredients/sucralose.json"
      provides: "The first ingredient record (descriptive; renders withheld until human passes land), making the pagination target defined"
      contains: "functionDescription"
  key_links:
    - from: "src/ingredient.njk products-containing list"
      to: "productsByIngredient[ingredient.id]"
      via: "the global reverse index from 03a-01; honest empty state when absent"
      pattern: "productsByIngredient"
    - from: "src/ingredient.njk authority block"
      to: "ingredient.authorityPosition"
      via: "{% if ingredient.authorityPosition %} so an absent field produces no empty stub"
      pattern: "authorityPosition"
---

<objective>
Ship the descriptive server-rendered ingredient page: an explainer (name, synonyms, E-number, function), the current GB regulatory position, an optional named-authority safety opinion, and the list of products that contain the ingredient. Ingredient pages stay descriptive in v1 (INGR-02): they cite an authority's position, they never synthesise primary studies. This plan creates the ingredients data directory (absent today) with a first real record so the pagination target is defined, and owns src/ingredient.njk exclusively; it runs in parallel with the product-page plans (disjoint files).

Purpose: INGR-01/03 are the universal ingredient spine; INGR-02 is optional and gated on the D-14 field; INGR-04 uses the D-15 structured reverse index. The two authority/regulatory blocks stay distinct so a safety opinion is never misread as the GB regulatory status (D-08).
Output: src/ingredient.njk with pagination and the four blocks in the locked heading order, plus one descriptive ingredient record (rendering withheld by default, D-13) that makes the route buildable and testable. The fuller proof set and the verification passes that publish these facts are authored by the human checkpoint in plan 06.
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
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-PATTERNS.md
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-UI-SPEC.md
@schemas/ingredient.schema.json
@src/_data/products/spike-01.json

<interfaces>
<!-- Analogs: src/methodology.njk / src/components-demo.njk (front-matter + section wrappers + macro import); the same pagination pattern as src/product.njk from plan 03. -->

Pagination front-matter (mirror src/product.njk from plan 03, over the ingredients object): pagination { data: ingredients, size: 1, alias: ingredient, resolve: values }, permalink "/ingredients/{{ ingredient.slug }}/", layout layouts/base.njk. PREREQUISITE: src/_data/ingredients/ does not exist yet - it must be created with at least one record (Task 1) or the pagination target is undefined.

Ingredient fields (schemas/ingredient.schema.json, extended in 03a-01): id/slug/name (required, metadata), synonyms[] (metadata), eNumber (metadata), functionDescription (SourcedValue, INGR-01), regulatoryStatus (SourcedValue, allOf claimDomain "regulatory", INGR-03 - MUST cite a GB-jurisdiction source and carry checkedOn per TRUST-06/checkRegulatoryJurisdiction), authorityPosition (optional SourcedValue, INGR-02, NOT claimDomain regulatory).

Macro call signature: {% from "components/macros.njk" import sourcedValue, caveatBox %}; call sourcedValue(fact, sources.sources, ...) with the registry ARRAY, entityType "ingredient". Render metadata (name/synonyms/eNumber) as plain text; render facts (functionDescription/regulatoryStatus/authorityPosition) ONLY through sourcedValue (no raw .value - check-render-safety).

Heading outline (03a-UI-SPEC.md "Ingredient Page Rules", G4): one h1 (ingredient name). h2 sections: the explainer, "Current GB regulatory position", the optional "Named authority's safety opinion", "Products that list this ingredient". Both regulatory and authority blocks carry the standing localised note "This describes a regulatory or authority position. It is not medical or dietary advice." (via caveatBox) - complementary to, not a duplicate of, the Phase 3b site-wide SITE-09 disclaimer. The authority block renders ONLY under {% if ingredient.authorityPosition %} (no empty stub). A single study is labelled illustration only, never an evidence statement.

INGR-04 (03a-RESEARCH.md D-15): set matches = productsByIngredient[ingredient.id] (global from 03a-01). Render "Products that list this ingredient" (verbatim UI-SPEC heading) as links to /products/{slug}/ for each match; when empty, an honest empty state ("No published products list this ingredient yet."), never a broken stub. Because D-15 resolved to structured refs (not name-matching), the best-effort caveat is NOT used.

First ingredient record (Task 1): pick a real additive already present in the corpus ingredient lists (e.g. sucralose / E955, listed in spike-01 Lucozade). Author id/slug/name, synonyms, eNumber "E955", a >=1-sentence functionDescription (SourcedValue citing an existing registry source), and a regulatoryStatus SourcedValue (claimDomain "regulatory") citing an existing GB-jurisdiction source from src/_data/sources.json with a checkedOn date (required by checkRegulatoryJurisdiction). Set verificationStatus/publicationStatus null (derived-only). Author NO verification passes - the facts correctly render withheld until the human authors passes in plan 06 (D-11/D-13). Do NOT author an authorityPosition here (that is proof-set editorial work in plan 06).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create the ingredients data directory with a first descriptive record; scaffold src/ingredient.njk with the explainer and the GB regulatory block</name>
  <files>src/_data/ingredients/sucralose.json, src/ingredient.njk</files>
  <read_first>
    - schemas/ingredient.schema.json (the required and fact-bearing fields; regulatoryStatus needs claimDomain regulatory + a GB source + checkedOn)
    - src/_data/sources.json (choose an existing GB-jurisdiction source id for the regulatoryStatus citation; confirm its jurisdiction is "GB")
    - src/_data/products/spike-01.json (Lucozade lists Sucralose/E955 - the ingredient to seed) and src/_data/products/spike-02.json (Cadbury emulsifiers, alternatives)
    - src/product.njk (the plan-03 pagination front-matter shape to mirror) and src/methodology.njk (the section wrapper)
    - lib/referential.mjs checkRegulatoryJurisdiction L84-98 (why the regulatory fact needs a GB source + checkedOn), 03a-UI-SPEC.md "Ingredient Page Rules"
  </read_first>
  <action>
    Create src/_data/ingredients/sucralose.json (or another real corpus additive) with id/slug/name (e.g. "sucralose"), synonyms, eNumber "E955", a functionDescription SourcedValue with a >=1-sentence plain-English account of what it does and why it is used (citing an existing registry source, claimType authoritative or corroborable as appropriate), and a regulatoryStatus SourcedValue (claimDomain "regulatory") stating the current GB regulatory position, citing an existing GB-jurisdiction source from sources.json and carrying a checkedOn date. Set verificationStatus and publicationStatus to null. Author no verification passes (the facts render withheld by default, which is correct - D-13). Create src/ingredient.njk paginating the ingredients object (resolve: values), permalink "/ingredients/{{ ingredient.slug }}/", layout base. Import sourcedValue and caveatBox. Render one h1 (ingredient.name); an explainer section rendering the plain-text name/synonyms/eNumber and the functionDescription through sourcedValue with entityType "ingredient" (INGR-01); and a "Current GB regulatory position" section (h2) rendering regulatoryStatus through sourcedValue, followed by the standing not-advice note via caveatBox (INGR-03/D-08). No raw .value. British English, no em-dashes; use the verbatim UI-SPEC headings and not-advice copy.
  </action>
  <verify>
    <automated>npm run prebuild && npm run build && test -f _site/ingredients/sucralose/index.html && node scripts/check-render-safety.mjs src</automated>
  </verify>
  <acceptance_criteria>
    - `npm run prebuild` exits 0 (the new ingredient record validates; the regulatory fact passes the TRUST-06 GB-source + checkedOn gate)
    - `npm run build` exits 0 and one page per ingredient exists: `test -f _site/ingredients/sucralose/index.html`
    - the explainer renders name, E-number and a function description; the page shows exactly one h1: `grep -c '<h1' _site/ingredients/sucralose/index.html` is 1
    - the GB regulatory block and the not-advice note render: `grep -q "Current GB regulatory position" _site/ingredients/sucralose/index.html` and `grep -q "not medical or dietary advice" _site/ingredients/sucralose/index.html`
    - the facts render withheld by default (no passes authored): `grep -q "Not yet verified" _site/ingredients/sucralose/index.html` and `node scripts/check-render-safety.mjs src` passes
  </acceptance_criteria>
  <done>The ingredients directory exists with a first descriptive record; the ingredient page paginates, renders the INGR-01 explainer and the INGR-03 GB regulatory block with its not-advice note, and the facts correctly render withheld until human passes land.</done>
</task>

<task type="auto">
  <name>Task 2: Add the optional authority-safety-opinion block (INGR-02) and the products-containing list (INGR-04)</name>
  <files>src/ingredient.njk</files>
  <read_first>
    - src/ingredient.njk (the Task 1 scaffold and the heading order)
    - schemas/ingredient.schema.json (the optional authorityPosition field from 03a-01)
    - .eleventy.js (the productsByIngredient global exposed in 03a-01) and lib/reverse-index.mjs (the shape it returns: a plain object keyed by ingredient id to [{ id, name, slug }])
    - 03a-RESEARCH.md "Ingredient authority block (INGR-02, conditional on D-14)" (the {% if ingredient.authorityPosition %} block) and D-15 INGR-04 rendering; 03a-UI-SPEC.md "Ingredient Page Rules" + Copywriting Contract (verbatim headings and empty-state copy)
  </read_first>
  <action>
    Add a "Named authority's safety opinion" section (h2) to src/ingredient.njk guarded by {% if ingredient.authorityPosition %}: render ingredient.authorityPosition through sourcedValue (entityType "ingredient"), followed by the standing not-advice note via caveatBox; when the field is absent the section does not render at all (no empty stub, D-14). Keep it visually and structurally distinct from the regulatory block so a safety opinion is never misread as the GB regulatory status (D-08). Add a "Products that list this ingredient" section (h2, INGR-04): set matches = productsByIngredient[ingredient.id]; when matches exist, render a list of links to /products/{{ m.slug }}/ using each match's name; when empty, render the honest empty state "No published products list this ingredient yet." (never a broken stub). Because D-15 resolved to structured references, do NOT add the best-effort name-matching caveat. Keep the single-h1 outline and heading order; no raw .value; rel="noopener" is not needed for internal links but external source links keep it. British English, no em-dashes, verbatim copy.
  </action>
  <verify>
    <automated>npm run build && node scripts/check-render-safety.mjs src && grep -q "Products that list this ingredient" _site/ingredients/sucralose/index.html</automated>
  </verify>
  <acceptance_criteria>
    - `npm run build` exits 0 and `node scripts/check-render-safety.mjs src` passes
    - the authority block does NOT render for an ingredient without authorityPosition (no empty stub): the sucralose page (no authorityPosition yet) does not contain "Named authority's safety opinion"
    - the products-containing section renders with an honest empty state when no product references the ingredient: `grep -q "No published products list this ingredient yet" _site/ingredients/sucralose/index.html` (until plan 06 wires a product's ingredients array)
    - the INGR-04 heading is present verbatim: `grep -q "Products that list this ingredient" _site/ingredients/sucralose/index.html`
    - the authority and regulatory blocks are separate h2 sections (structural distinctness preserved)
  </acceptance_criteria>
  <done>The ingredient page renders the optional authority block only when the field is present, and a products-containing list that shows referencing products or an honest empty state, sourced from the structured D-15 reverse index.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| corpus JSON -> rendered ingredient page | Untrusted ingredient facts and source names are rendered to HTML at build; the reader is the consumer (static site, no runtime server) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03a-05-01 | Elevation of Privilege | An authority safety opinion presented as the GB regulatory status, or a study synthesised into a health-effect claim (out of v1 scope) | mitigate | authorityPosition is a separate, conditionally-rendered block distinct from regulatoryStatus (D-08); a single study is labelled illustration only; no synthesis is modelled (INGR-02 descriptive-only) |
| T-03a-05-02 | Information Disclosure | An unverified ingredient fact rendered as an asserted value | mitigate | Every fact renders through sourcedValue (gates on factState); facts render withheld until human passes land; no raw .value (check-render-safety) |
| T-03a-05-03 | Tampering | Stored XSS via an ingested ingredient value / synonym / source name | mitigate | Autoescaping ON, no `| safe`; external source links carry rel="noopener" (ASVS V5) |
| T-03a-05-SC | Tampering | npm/pip/cargo installs | accept | Zero new dependencies this phase; supply-chain delta is zero, so no install checkpoint applies |
</threat_model>

<verification>
- `npm run prebuild` + `npm run build` stay green: the ingredient record validates (regulatory GB-source + checkedOn) and the page renders.
- The authority block renders only when present (no empty stub); the products-containing list shows references or an honest empty state.
- `node scripts/check-render-safety.mjs src` passes: ingredient facts render only through the macro.
</verification>

<success_criteria>
- One server-rendered page per ingredient with a single h1 and the locked heading order.
- The explainer (INGR-01), GB regulatory block (INGR-03) and optional authority block (INGR-02) render descriptively with the not-advice note.
- The products-containing list (INGR-04) renders from the structured reverse index with an honest empty state.
</success_criteria>

<output>
Create `.planning/phases/03a-core-entity-pages-trust-rendering/03a-05-SUMMARY.md` when done.
</output>
