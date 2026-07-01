---
phase: 03a
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - schemas/product.schema.json
  - schemas/ingredient.schema.json
  - lib/reverse-index.mjs
  - lib/referential.mjs
  - scripts/validate-data.mjs
  - .eleventy.js
  - test/reverse-index.test.js
  - test/schema.test.js
  - test/referential.test.js
  - test/fixtures/valid/ingredient-authority.json
  - test/fixtures/invalid/product-dangling-ingredient-ref.json
autonomous: true
requirements: [INGR-02, INGR-04]
must_haves:
  truths:
    - "An optional plain-scalar `ingredients: [ingredientId]` array on the product schema validates; every existing product record (spike-01/02/03) still validates unchanged (migration-safe)"
    - "An optional fact-bearing `authorityPosition` SourcedValue on the ingredient schema validates and is auto-discovered by collectFacts, so it derives and gates with no other code change"
    - "A product citing an ingredient id that resolves to no ingredient record fails the build (checkIngredientRefs), and a resolvable id passes"
    - "The pure productsByIngredient / timelineByProduct reverse indices are exposed to templates as plain objects keyed by id (Nunjucks bracket-accessible), returning an honest empty result for an id with no matches"
  artifacts:
    - path: "lib/reverse-index.mjs"
      provides: "Pure productsByIngredient(products) and timelineByProduct(events), unit-tested"
      exports: ["productsByIngredient", "timelineByProduct"]
    - path: "schemas/product.schema.json"
      provides: "Optional plain-scalar ingredients id array"
      contains: "ingredients"
    - path: "schemas/ingredient.schema.json"
      provides: "Optional authorityPosition SourcedValue"
      contains: "authorityPosition"
  key_links:
    - from: ".eleventy.js addGlobalData productsByIngredient / timelineByProduct"
      to: "lib/reverse-index.mjs pure functions over the on-disk product/timeline JSON"
      via: "config-load disk read (mirroring the verdict-cache read) then Object-of-arrays exposure"
      pattern: "addGlobalData"
    - from: "scripts/validate-data.mjs Gate 2-4 error array"
      to: "lib/referential.mjs checkIngredientRefs"
      via: "a dangling product->ingredient reference fails the build"
      pattern: "checkIngredientRefs"
---

<objective>
Settle the two blocking schema gaps (D-14, D-15) and build the pure data-relationship layer the templates depend on, as an interface-first Wave 0. This plan owns the schema fields, the reverse-index library, the new referential gate, and the Eleventy wiring that exposes the indices to templates. Downstream template plans (03, 04, 05) build against these shapes rather than exploring for them.

Purpose: INGR-04 (products that contain an ingredient) and product->ingredient cross-links need a structured relationship, not free-text matching; INGR-02 (an authority safety opinion) needs its own fact-bearing field so it is never folded into the GB regulatory status. Both are data-model decisions locked here so they cannot drift mid-execution.
Output: Two optional, migration-safe schema fields; a pure unit-tested reverse-index module; a dangling-reference build gate; and the addGlobalData wiring that hands templates a bracket-accessible index object.
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

<interfaces>
<!-- The exact JSON blocks to author are specified in 03a-RESEARCH.md "Blocking Schema Decisions - Resolutions". Extracted contracts the executor needs: -->

D-15 product `ingredients` (add to schemas/product.schema.json properties, keep additionalProperties:false):
- type array, uniqueItems true, items { type string, pattern "^[a-z0-9][a-z0-9-]*$" }
- PLAIN metadata scalar, NOT a SourcedValue: it holds no `value`/`sources`, so it never trips check-render-safety and never asserts an unsourced recipe. Distinct from the sourced free-text ingredientsText (the declared-recipe fact of record).
- Optional (NOT in `required`) so spike-01/02/03 validate unchanged.

D-14 ingredient `authorityPosition` (add to schemas/ingredient.schema.json properties, keep additionalProperties:false):
- a bare { "$ref": "sourced-value.schema.json" } (copy the functionDescription shape at ingredient.schema.json L33-36), NOT the regulatoryStatus allOf+claimDomain const.
- Deliberately NOT claimDomain "regulatory": an EFSA/SACN opinion is not the GB regulatory status and must not trip checkRegulatoryJurisdiction (lib/referential.mjs L84-98).
- collectFacts (lib/referential.mjs L45-51) auto-discovers any {sources[], claimType} node, so no validation/derivation wiring is needed beyond this property declaration.

lib/reverse-index.mjs (pure, node:test friendly; analog lib/referential.mjs + lib/render-state.mjs factForRenderFromData):
- productsByIngredient(products): iterate Object.values(products ?? {}), for each ingredient id in p.ingredients ?? [], push { id, name, slug }. RETURN A PLAIN OBJECT keyed by ingredientId to an array (NOT a Map): Nunjucks bracket access `productsByIngredient[ingredient.id]` does not work on a Map. Missing id -> undefined, treated as empty in-template.
- timelineByProduct(events): iterate Object.values(events ?? {}), group by e.productId, return a plain object keyed by productId to an array of events.

checkIngredientRefs(products, ingredients) in lib/referential.mjs (analog checkReferences L66-80):
- known = new Set(ingredients.map(i => i.id)); for each product, for each id in product.ingredients ?? [], error when !known.has(id). Return { errors }.

validate-data.mjs wiring (L221-240): factBearing carries { data, entityType }. Derive
products = factBearing.filter(f => f.entityType === "product").map(f => f.data) and the same for "ingredient", then spread ...checkIngredientRefs(products, ingredients).errors into the Gate 2-4 errors array. ENTITY_DIRS already lists ["ingredients","ingredient"] (L56-62), so no gather change is needed.

.eleventy.js: addGlobalData functions do NOT receive the _data cascade, so read the product and timeline JSON from disk at config load exactly as the VERDICTS cache is read (L45-51: readFileSync + resolve(HERE, ...)). Build a { filename: record } object from src/_data/products/*.json (and timeline/*.json), pass Object.values(...) through the pure functions, and expose the results via addGlobalData("productsByIngredient", obj) and addGlobalData("timelineByProduct", obj). Keep the existing findBy filter; no filterBy filter is added (YAGNI).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add the optional product `ingredients` array and ingredient `authorityPosition` fields with valid/invalid fixtures and schema tests</name>
  <files>schemas/product.schema.json, schemas/ingredient.schema.json, test/schema.test.js, test/fixtures/valid/ingredient-authority.json, test/fixtures/invalid/product-dangling-ingredient-ref.json</files>
  <read_first>
    - schemas/product.schema.json (all 126 lines; note additionalProperties:false L7, required only id/slug/name L8, the allergens array pattern L67-104, the id pattern L13)
    - schemas/ingredient.schema.json (all 57 lines; note functionDescription bare $ref L33-36 and the regulatoryStatus allOf+claimDomain const L37-47 which must NOT be copied)
    - test/schema.test.js (the validate(name, data) helper L17-21 and the valid/invalid fixture pairs L24-55)
    - test/fixtures/valid/product-valid.json and ingredient fixtures if present (the shape the new fixtures mirror)
    - 03a-RESEARCH.md "Blocking Schema Decisions - Resolutions" (the exact JSON for both fields, and assumption A3 on optional-additive backward compatibility)
  </read_first>
  <behavior>
    - A product record with a valid `ingredients` array of id-pattern strings validates; existing spike products with NO ingredients field still validate (optional-additive).
    - A product with an `ingredients` item that is not the id pattern (e.g. uppercase or a space) is rejected by Ajv.
    - An ingredient record carrying an `authorityPosition` SourcedValue validates; one without it validates (optional).
    - authorityPosition carries no claimDomain "regulatory", so it does not require a GB source or checkedOn.
  </behavior>
  <action>
    Add the optional `ingredients` property to product.schema.json exactly as the RESEARCH D-15 block specifies (type array, uniqueItems true, items string with pattern "^[a-z0-9][a-z0-9-]*$", the migration-safe description), keeping it OUT of the `required` array and preserving additionalProperties:false. Add the optional `authorityPosition` property to ingredient.schema.json as a bare `{ "$ref": "sourced-value.schema.json" }` with a description that states it is a named-authority safety opinion, distinct from regulatoryStatus, deliberately NOT claimDomain regulatory (per D-14); copy the functionDescription shape, NOT the regulatoryStatus allOf. Author test/fixtures/valid/ingredient-authority.json: a minimal valid ingredient (id/slug/name) carrying a functionDescription, a regulatoryStatus (claimDomain regulatory, a GB source, checkedOn), and an authorityPosition SourcedValue with claimType authoritative and no claimDomain, so it exercises the new field through the schema. Author test/fixtures/invalid/product-dangling-ingredient-ref.json for Task 3's referential test: a minimal product citing an `ingredients` id that no ingredient defines. Extend test/schema.test.js with: a test that ingredient-authority.json validates against the ingredient schema with zero errors; a test that a product with an ingredients item of "Bad Id" (space/uppercase) is rejected; and a test that the existing spike products still validate (guarding the migration-safe claim, A3). Keep British English, no em-dashes.
  </action>
  <verify>
    <automated>node --test test/schema.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `node --test test/schema.test.js` exits 0 with the new tests present
    - `grep -c '"ingredients"' schemas/product.schema.json` is >= 1 and `grep -c '"authorityPosition"' schemas/ingredient.schema.json` is >= 1
    - authorityPosition is a bare $ref, not an allOf: `node -e "const s=require('./schemas/ingredient.schema.json').properties.authorityPosition;if(s.allOf||s.claimDomain){process.exit(1)}console.log('bare-ref-ok')"` prints bare-ref-ok
    - the schema test asserts the existing spike products still validate unchanged (A3 migration-safe)
    - `node -e "import('./lib/validate.mjs').then(m=>{m.compile('./schemas');console.log('compile-ok')})"` prints compile-ok
  </acceptance_criteria>
  <done>Both optional fields exist, compile, validate a well-formed record, reject a bad ingredients id, and leave every existing product valid; the two new fixtures exist for Task 2/3.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build the pure reverse-index library (productsByIngredient, timelineByProduct) with unit tests</name>
  <files>lib/reverse-index.mjs, test/reverse-index.test.js</files>
  <read_first>
    - lib/referential.mjs (the pure-module docstring, walk/collect style, Object.values(... ?? {}) guarding)
    - lib/render-state.mjs (factForRenderFromData L39-43, the Map/plain-object build convenience the reverse index mirrors)
    - test/render-state.test.js (the node:test harness L1-14 and the pure-function unit-test shape L33-39)
    - 03a-RESEARCH.md Pattern 2 (the target function bodies) and 03a-PATTERNS.md "lib/reverse-index.mjs" section
  </read_first>
  <behavior>
    - productsByIngredient({}) returns an empty object; an unknown ingredient id yields undefined (empty in-template).
    - A single product listing one ingredient id maps that id to a one-element array of { id, name, slug }.
    - A product listing multiple ingredient ids appears under each id; two products listing the same id both appear under it (multi).
    - A product with no `ingredients` field contributes nothing and does not throw.
    - timelineByProduct groups events by productId; a product with no events has no key (undefined in-template).
  </behavior>
  <action>
    Create lib/reverse-index.mjs as an ESM module exporting two pure functions. productsByIngredient(products) iterates Object.values(products ?? {}), and for each id in (p.ingredients ?? []) pushes { id: p.id, name: p.name, slug: p.slug } onto a plain object keyed by that ingredient id; RETURN A PLAIN OBJECT (not a Map) so Nunjucks bracket access works downstream. timelineByProduct(events) iterates Object.values(events ?? {}) and groups each event under e.productId in a plain object. Mirror the referential.mjs pure-module docstring style and the nullish-coalescing guards. Author test/reverse-index.test.js covering, for productsByIngredient: empty input, single, multi (one product with several ids and two products sharing an id), and a product missing the ingredients field; and for timelineByProduct: empty, single-event, and multiple events for one product versus a product with none. Assert the returned shape is a plain object keyed by id (not a Map). Keep British English, no em-dashes.
  </action>
  <verify>
    <automated>node --test test/reverse-index.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `node --test test/reverse-index.test.js` exits 0
    - the module exports named `productsByIngredient` and `timelineByProduct`: `node -e "import('./lib/reverse-index.mjs').then(m=>{if(!m.productsByIngredient||!m.timelineByProduct)process.exit(1);console.log('exports-ok')})"` prints exports-ok
    - the return value is a plain object, bracket-accessible: `node -e "import('./lib/reverse-index.mjs').then(m=>{const o=m.productsByIngredient({a:{id:'p1',name:'P',slug:'p',ingredients:['sugar']}});if(o.constructor!==Object||o['sugar'].length!==1)process.exit(1);console.log('plain-object-ok')})"` prints plain-object-ok
  </acceptance_criteria>
  <done>The pure reverse-index module returns bracket-accessible plain objects with correct empty/single/multi behaviour, fully unit-tested.</done>
</task>

<task type="auto">
  <name>Task 3: Wire the checkIngredientRefs build gate and expose the reverse indices to templates via .eleventy.js</name>
  <files>lib/referential.mjs, scripts/validate-data.mjs, .eleventy.js, test/referential.test.js</files>
  <read_first>
    - lib/referential.mjs (checkReferences L66-80, the exact { errors } shape to mirror)
    - scripts/validate-data.mjs (the imports L18-26, the factBearing gather carrying entityType L96-104, and the Gate 2-4 errors array L236-240)
    - .eleventy.js (the VERDICTS disk-read pattern L45-51, addFilter usage L36-39, and the config return L117-128; addGlobalData is the wiring to add)
    - test/referential.test.js (the load helper L24-25, the valid-then-negative fixture structure, and the spawn/execFileSync gate pattern L5-27)
    - test/fixtures/invalid/product-dangling-ingredient-ref.json (authored in Task 1)
    - 03a-RESEARCH.md D-15 "New referential-integrity check" and 03a-PATTERNS.md "checkIngredientRefs" + "The data-JS gate" (why the index must be a lib module surfaced via addGlobalData, never a _data/*.js file)
  </read_first>
  <action>
    Add checkIngredientRefs(products, ingredients) to lib/referential.mjs mirroring checkReferences: build a Set of ingredient ids, iterate each product's (ingredients ?? []), push a readable error for any id not in the set, return { errors }. Import it into scripts/validate-data.mjs and, in the Gate 2-4 error array, derive products and ingredients from factBearing by entityType and spread ...checkIngredientRefs(products, ingredients).errors alongside the existing checks; a dangling reference must fail the build (process.exit(1) via the existing errors path). In .eleventy.js, at config load, read src/_data/products/*.json and src/_data/timeline/*.json from disk into filename-keyed objects using the same readFileSync/resolve(HERE, ...) pattern as the VERDICTS cache (absent dir tolerated), pass them through the pure reverse-index functions, and expose the results via eleventyConfig.addGlobalData("productsByIngredient", obj) and addGlobalData("timelineByProduct", obj); do NOT create any _data/*.js file (forbidden by validate-data.mjs L187-204). Extend test/referential.test.js with a test that checkIngredientRefs returns a non-empty errors array for the dangling-ref fixture and an empty array when the id resolves, plus a spawn test that running validate-data.mjs over a temp corpus containing the dangling reference exits non-zero. Keep British English, no em-dashes.
  </action>
  <verify>
    <automated>node --test test/referential.test.js && npm run prebuild</automated>
  </verify>
  <acceptance_criteria>
    - `node --test test/referential.test.js` exits 0 including the dangling-ref and resolvable-ref cases
    - `npm run prebuild` exits 0 over the real corpus (no product yet cites a dangling ingredient id)
    - a dangling product->ingredient reference fails the build: the spawn test asserts validate-data.mjs exits non-zero on the fixture corpus
    - the reverse index is exposed as global data, not a _data JS file: `grep -c 'addGlobalData' .eleventy.js` is >= 2 and `npm run validate` does not report a non-JSON data file
    - `node -e "import('./lib/referential.mjs').then(m=>{if(!m.checkIngredientRefs)process.exit(1);console.log('gate-exported')})"` prints gate-exported
  </acceptance_criteria>
  <done>A dangling product->ingredient reference fails the build; the reverse indices are available to templates as bracket-accessible global objects sourced from the pure library; prebuild stays green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| editor -> repo JSON | Author-supplied schema fields and ingredient references enter the validated corpus via git; the build is the only consumer (static site, no runtime server) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03a-01-01 | Tampering | A product citing a fabricated or mistyped ingredient id that would render a broken cross-link or a false "contained in" relationship | mitigate | checkIngredientRefs fails the build on any dangling product->ingredient reference (referential integrity, mirrors checkReferences); a resolvable id is a precondition for a cross-link |
| T-03a-01-02 | Elevation of Privilege | An authority opinion authored as the GB regulatory status, bypassing the TRUST-06 GB-source + checkedOn gate | mitigate | authorityPosition is a separate field, deliberately NOT claimDomain "regulatory", so it is never mistaken for regulatoryStatus; the two blocks stay structurally and visually distinct (D-08/D-14) |
| T-03a-01-03 | Tampering | Injecting build logic via a non-JSON `_data/*.js` file the validation gate cannot see | mitigate | The reverse index is a pure lib module surfaced through addGlobalData; validate-data.mjs (L187-204) fails the build on any .js/.cjs/.mjs under src/_data |
| T-03a-01-SC | Tampering | npm/pip/cargo installs | accept | Zero new dependencies this phase (RESEARCH Package Legitimacy Audit); supply-chain delta is zero, so no install checkpoint applies |
</threat_model>

<verification>
- `node --test test/schema.test.js test/reverse-index.test.js test/referential.test.js` passes: both fields validate, the reverse index behaves, and the dangling-ref gate fires.
- `npm run prebuild` stays green over the existing corpus (both fields are optional-additive; no product cites a dangling id).
- The reverse indices are exposed as bracket-accessible global objects, not a forbidden _data JS file.
</verification>

<success_criteria>
- The optional product `ingredients` array and ingredient `authorityPosition` fields exist, compile, and are migration-safe (every existing record still validates).
- A dangling product->ingredient reference fails the build.
- Templates can read productsByIngredient[ingredient.id] and timelineByProduct[product.id] as plain objects.
</success_criteria>

<output>
Create `.planning/phases/03a-core-entity-pages-trust-rendering/03a-01-SUMMARY.md` when done.
</output>
