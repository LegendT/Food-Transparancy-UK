# Phase 3a: Core Entity Pages & Trust Rendering - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-rendered current-state **product** and **ingredient** pages over a seed corpus. Every claim renders through the trust component; every unverified fact appears as an explicit "not yet verified - withheld" placeholder, never an asserted value. Ingredient pages are **descriptive**: they explain the ingredient and cite an authoritative regulatory/safety position, without synthesising primary studies. Pages ship before every fact on them is verified - the per-fact gate is the relief valve.

**In scope:** product page (PROD-01/02/03/04/09), ingredient page (INGR-01/02/03/04), and the reader-facing halves of VRFY-11 (contested both-sides) and VRFY-12 (stale "review due"). The templates, the trust-state visual treatments, and a human-authored proof set that demonstrates every state on live data.

**Out of scope (own phases):** then-vs-now diff and corpus scale to ~100 products (Phase 4); comparison view (Phase 6); full timeline pages (Phase 8 - the recipe-history section links to them conditionally); site shell / crawlability / non-expert UX polish / credibility surface / the pa11y-ci route floor (Phase 3b); health-effect study synthesis (deferred, EVID-SYNTH-01 / INGR-02).
</domain>

<decisions>
## Implementation Decisions

### Trust-state visual treatment (SC5 / VRFY-11/12)
- **D-01:** Honest-first, conspicuous. Withheld, contested and stale facts are visually **distinct and impossible to miss** - uncertainty is a feature of the archive, not fine print. This is the reader-facing expression of the core value.
- **D-02:** A `published-contested` fact renders a **dedicated both-sides treatment** showing each position with its own sources, visibly distinct from a withheld placeholder (VRFY-11 rendering half).
- **D-03:** A `published-stale` fact renders a reader-facing **"last verified {date}; review due"** indicator inline with the fact (VRFY-12 rendering half).
- **D-04:** All trust states are consumed from the Phase 2 derivation (`deriveVerificationState` via the `factState` filter / `factForRender`); the template **never re-derives status** and never reads `fact.value` directly. The exact visual/spacing/colour spec is deferred to `/gsd:ui-phase 3a` (this phase locks the *direction*, not the pixels).

### Product page layout & IA (PROD-01/04/09)
- **D-05:** **Grouped, labelled sections**: Ingredients, Nutrition, Allergens, Manufacturer, Sources, Recipe history. Each fact rendered through the trust component. Scannable for a non-expert; maps cleanly to the product schema.
- **D-06:** Nutrition renders as a **table** of the nine `nutritionValue` figures. **Design tension the plan/ui-phase MUST resolve (F4):** each figure is itself a `SourcedValue` fact needing the trust component, but the `sourcedValue` macro is a *block* `<div>` with a `<details>` disclosure (a `<span>` cannot hold the disclosure), so it does not drop into a `<td>` cleanly; and most figures are **absent** in real data (spike-02 carries only `sugars`). Decide how per-cell provenance and the withheld/absent distinction render inside an accessible table (e.g. row-level disclosure, or a table plus a separate provenance affordance) rather than assuming the block macro fits a cell.
- **D-07:** The Sources section lists the references behind the page's claims (PROD-04); the trust component's existing per-fact source disclosure remains, and this is the page-level roll-up.
- **D-12 (allergen safety - F3, highest-stakes render):** Allergens carry a three-state `presence` (`present` / `may-contain` / `absent`) with **per-item provenance that can be withheld**. Hard rules: a **withheld `absent`** claim MUST NEVER render as "does not contain X" (an allergy-safety hazard) - it renders as not-verified and explicitly not safe to rely on; a **withheld `present`/`may-contain`** claim MUST NEVER be hidden (hiding a possible allergen is the dangerous direction). A standing **allergen-safety caveat** ("always check the current pack; do not rely on this archive for allergy safety") sits on any page showing allergens. This rule overrides the general honest-first treatment where they would conflict - allergens fail safe toward warning, never toward reassurance.
- **D-13 (the default page state - F7):** A **fully- or mostly-withheld page is the PRIMARY case at launch**, not an edge case (spike-02/03 are entirely withheld today). An all-withheld product still gets a rendered page showing withheld placeholders and the sources being checked; the page is never blocked or 404'd for lack of verified facts. Templates and the ui-phase spec are designed for the mostly-withheld page first, the fully-verified page second.

### Ingredient page & the descriptive boundary (INGR-01/02/03/04)
- **D-08:** Two **distinct**, clearly-headed, cited + dated blocks, visually separate from the plain-English "what it is / why it's used" explainer: (a) the **current GB regulatory position** (INGR-03, the `regulatoryStatus` field); and (b) where one exists, a **named authority's safety opinion** (INGR-02: FSA/EFSA/SACN) - **optional per the requirement**. Both carry a standing "describes a regulatory/authority position, not dietary advice" note. Keeping them separate preserves the INGR-02 no-synthesis line and does not misrepresent a safety opinion as the regulatory status.
- **D-14 (schema gap - F2, blocking):** INGR-02 has **no schema field today** - the ingredient schema holds `functionDescription` (INGR-01) and `regulatoryStatus` (INGR-03) only. Since INGR-02 is optional ("may state"), the plan MUST decide: add a distinct fact-bearing `authorityPosition` field (recommended - a SACN opinion is not the GB regulatory status), or defer INGR-02 rendering until such a field exists. Do NOT fold it into `regulatoryStatus`.
- **D-09:** Page shape: name + synonyms + function (>=1 sentence) + E-number where applicable (INGR-01); the GB regulatory-status block (INGR-03); the optional authority-position block (INGR-02, subject to D-14); and a **products-containing list** (INGR-04, subject to D-15). A single study may appear only as labelled illustration, never as an evidence statement.
- **D-15 (schema gap - F1, blocking):** INGR-04 ("list products that contain this ingredient") has **no structured data path** - the product schema references ingredients only as free-text `ingredientsText`, with no ingredient-id field. The plan MUST decide: add a structured `ingredients: [ingredientId]` reference field to the product schema (recommended - reliable, reusable for Phase 4/6; note it is a data-model change touching every product record and interacts with D-10), or build the reverse index by matching ingredient name/synonyms against free text (fragile, false-match risk, must be flagged as best-effort). This is a prerequisite, not a template detail.

### Seed corpus sourcing approach (SC4)
- **D-10:** **Templates-first** as a *sequencing* decision, not a redefinition of SC4. Phase 3a's template/rendering CODE can land and be reviewed against whatever verified subset exists (the rest shown as withheld placeholders, never blocking the pages). But **SC4 (>=20 products / >=40 ingredients published) remains a fixed exit criterion**: the phase is not VERIFIED complete until it is met. The threshold is filled by the parallel human historic-sourcing/verification track; templates-first only means the code does not wait on the data, not that the phase completes without it.
- **D-11:** **Proof set (human-authored through the checkpoint).** So every page type and trust state is demonstrated on *live* data before the corpus fills, the phase authors: at least one fact of each renderable state - `published-confirmed` (exists), `published-contested` (exists), `published-stale` (**missing today; must be authored, e.g. by backdating `lastVerified`/`checkedOn` past the staleness threshold or setting an explicit `stalenessClass`**), and withheld (exists) - plus **~3-5 ingredient records** with a regulatory position (and at least one with an authority position, pending D-14) so ingredient pages and INGR-04 linking are real rather than test-only. Pass verdicts and adjudications are authored by a human at a blocking checkpoint (the 01-10 / 02-07 pattern); AI never authors them.

### Claude's Discretion
- Permalink/URL scheme for product and ingredient pages, and the entity-to-entity linking model (a product's ingredient list linking to ingredient pages), **once D-15 fixes how the product-ingredient relationship is stored**.
- How the recipe-history "absent, not a broken stub" case renders when a product has no sourced change events (SC3) - within the D-01 honest-first direction.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 3a block (Goal, Depends on, the 5 Success Criteria). The phase boundary is FIXED here.
- `.planning/REQUIREMENTS.md` — PROD-01/02/03/04/09, INGR-01/02/03/04, VRFY-11, VRFY-12 (the rendering halves).

### The trust model this phase renders (Phase 2 - LOCKED, do not re-derive)
- `.planning/phases/02-claim-typed-verification-per-fact-publication-gate-ingestion/02-CONTEXT.md` — decisions D-01..D-19 (claim types, seven-state precedence, derived-only status).
- `.planning/phases/02-claim-typed-verification-per-fact-publication-gate-ingestion/02-REVIEW-3.md` — the R-31 render barrier and `factForRender`; the render-safety gate Phase 3a inherits.
- `lib/verification.mjs` — `deriveVerificationState` and the pure derivation heart (importable at render time).
- `lib/render-state.mjs` — `factForRender` / `factForRenderFromData`, the sanctioned render-safe projection.

### The trust component & render boundary (reuse, do not reinvent)
- `src/_includes/components/macros.njk` — the `sourcedValue` macro, now state-gated; the single fact-render primitive.
- `.eleventy.js` — the `factState` filter (sanctioned render boundary) and the verdict-cache read.
- `scripts/check-render-safety.mjs` — the prebuild gate forbidding any raw `.value` render outside the macro.

### Schemas
- `schemas/product.schema.json` — id, slug, name, brandId, categoryId, manufacturer, ingredientsText, nutrition, regulatoryStatus, allergens.
- `schemas/ingredient.schema.json` — id, slug, name, synonyms, eNumber, functionDescription, regulatoryStatus.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`sourcedValue` macro** (`src/_includes/components/macros.njk`): the trust component. It already gates on derived state and renders the withheld/contested/stale floor. Phase 3a extends its *visual treatment* (D-01/02/03), not its logic. **Concrete gap (F6):** the contested branch currently renders `p.value` + `p.note` only - D-02 requires **each position's own sources** (`p.sources`), so the branch must be extended to resolve and show them.
- **`factState` filter** (`.eleventy.js`): `fact | factState(sources, entityType)` returns `{ state, publishable, stale, contested, value?, positions }`. The only sanctioned way a template touches a fact's value.
- **`lib/render-state.mjs` / `lib/verification.mjs`**: pure, importable; unit-testable. `test/render-state.test.js` pins R-31 (a withheld/contested value never crosses the boundary).

### Established Patterns
- Eleventy 3.1.6 data cascade renders every `.json` under `src/_data`; entity pages are generated by paginating over `src/_data/products/*` and `src/_data/ingredients/*` (the ingredients dir does not exist yet - create it).
- CUBE CSS, vanilla JS, mobile-first, WCAG 2.2 AA, British English, no new dependencies unless asked. Nunjucks page templates + WebC components.
- No product/ingredient page templates exist yet (only `404`, `index`, `methodology`, `components-demo`) - built from scratch.
- The gate forbids `.js`/`.cjs` modules under `src/_data`; global data comes via `.eleventy.js` `addGlobalData`/filters.

### Integration Points
- Pages consume the Phase 2 verdict cache (`.cache/citation-verdicts.json`) through the `factState` filter's closure - the same offline read the gate uses.
- The recipe-history section (PROD-02/03) consumes timeline change events; the "full timeline" link is conditional on a Phase 8 timeline page existing (absent for now). Only the Tier A products the historic-sourcing track has delivered have any change events; every other product renders this section as **absent, not a broken stub** (SC3).

### Schema prerequisites the plan must settle first (blocking)
- **INGR-04 (F1/D-15):** product schema has no ingredient-id reference - decide structured field vs free-text matching before building the products-containing list.
- **INGR-02 (F2/D-14):** ingredient schema has no authority-position field - decide new `authorityPosition` field vs deferring INGR-02 rendering.
- Both are data-model changes that ripple into the seed/proof data (D-11) and the "templates-first" sequencing (D-10); resolve them in research/planning, not mid-execution.
- Relationship to Phase 3b (F8): the per-block "not dietary advice" note (D-08) is a *localised* context note; the *site-wide* "not medical or dietary advice" disclaimer is SITE-09 (Phase 3b). Keep them complementary, not duplicative.
</code_context>

<specifics>
## Specific Ideas

- The whole design language should make **uncertainty legible**: a reader (or a citing journalist) must be able to tell at a glance what is verified, what is withheld, what is contested, and what is due for re-verification. This is the reader-facing counterpart to the Phase 2 trust model.
- The ingredient "regulatory position" block should read like a **cited factual statement of what an authority says**, never advice - reinforced by the standing not-dietary-advice note (D-08).
</specifics>

<deferred>
## Deferred Ideas

- **Health-effect evidence synthesis** on ingredient pages - explicitly deferred to v1.x (INGR-02 / EVID-SYNTH-01). Any single study is labelled illustration only.
- **Then-vs-now diff** and the tiered corpus scale-up to ~100 products - Phase 4.
- **Comparison view** across products - Phase 6.
- **Full timeline pages** - Phase 8 (the recipe-history section links to them conditionally when they exist).
- **Site shell, crawlability, non-expert UX polish, credibility surface, and the pa11y-ci route floor** - Phase 3b.

None of these were scope-creep requests; the discussion stayed within the phase boundary.
</deferred>

---

*Phase: 3a-Core Entity Pages & Trust Rendering*
*Context gathered: 2026-07-01*
