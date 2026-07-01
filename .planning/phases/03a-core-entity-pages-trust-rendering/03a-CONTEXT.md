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
- **D-06:** Nutrition renders as a **table**; the GB-regulated major allergens render via the **structured allergen field** (PROD-09 / DATA-07), never free text.
- **D-07:** The Sources section lists the references behind the page's claims (PROD-04); the trust component's existing per-fact source disclosure remains, and this is the page-level roll-up.

### Ingredient page & the descriptive boundary (INGR-01/02/03/04)
- **D-08:** A **separated, clearly-headed "regulatory position" block** - the named authority (FSA/EFSA/SACN), cited and dated - kept **visually distinct** from the plain-English "what it is / why it's used" explainer, carrying a standing "describes a regulatory position, not dietary advice" note. This keeps the INGR-02 no-synthesis line unmistakable.
- **D-09:** Page shape: name + synonyms + function (>=1 sentence) + E-number where applicable (INGR-01); the authority position block (INGR-02); the current GB regulatory position with source + checked-on date (INGR-03); and a **products-containing list** (INGR-04). A single study may appear only as labelled illustration, never as an evidence statement.

### Seed corpus sourcing approach (SC4)
- **D-10:** **Templates-first.** Phase 3a's CODE is complete when the templates + trust rendering work correctly on whatever verified subset exists (the rest shown as withheld placeholders, never blocking the pages). The >=20 products / >=40 ingredients published threshold is a **parallel data milestone** met by the human historic-sourcing/verification track - tracked, not blocking the template work being called done.
- **D-11:** **Proof set (human-authored through the checkpoint).** So every page type and trust state is demonstrated on *live* data, the phase authors: at least one fact of each renderable state - `published-confirmed` (exists), `published-contested` (exists), `published-stale` (**missing today, must be authored**), and withheld (exists) - plus **~3-5 ingredient records** with an authoritative position, so ingredient pages and INGR-04 linking are real rather than test-only. Pass verdicts and adjudications are authored by a human at a blocking checkpoint (the 01-10 / 02-07 pattern); AI never authors them.

### Claude's Discretion
- Permalink/URL scheme for product and ingredient pages, and the entity-to-entity linking model (a product's ingredient list linking to ingredient pages; INGR-04 linking back), unless the planner surfaces a decision the user should make.
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
- **`sourcedValue` macro** (`src/_includes/components/macros.njk`): the trust component. It already gates on derived state and renders the withheld/contested/stale floor. Phase 3a extends its *visual treatment* (D-01/02/03), not its logic.
- **`factState` filter** (`.eleventy.js`): `fact | factState(sources, entityType)` returns `{ state, publishable, stale, contested, value?, positions }`. The only sanctioned way a template touches a fact's value.
- **`lib/render-state.mjs` / `lib/verification.mjs`**: pure, importable; unit-testable. `test/render-state.test.js` pins R-31 (a withheld/contested value never crosses the boundary).

### Established Patterns
- Eleventy 3.1.6 data cascade renders every `.json` under `src/_data`; entity pages are generated by paginating over `src/_data/products/*` and `src/_data/ingredients/*` (the ingredients dir does not exist yet - create it).
- CUBE CSS, vanilla JS, mobile-first, WCAG 2.2 AA, British English, no new dependencies unless asked. Nunjucks page templates + WebC components.
- No product/ingredient page templates exist yet (only `404`, `index`, `methodology`, `components-demo`) - built from scratch.
- The gate forbids `.js`/`.cjs` modules under `src/_data`; global data comes via `.eleventy.js` `addGlobalData`/filters.

### Integration Points
- Pages consume the Phase 2 verdict cache (`.cache/citation-verdicts.json`) through the `factState` filter's closure - the same offline read the gate uses.
- The recipe-history section (PROD-02/03) consumes timeline change events; the "full timeline" link is conditional on a Phase 8 timeline page existing (absent for now).
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
