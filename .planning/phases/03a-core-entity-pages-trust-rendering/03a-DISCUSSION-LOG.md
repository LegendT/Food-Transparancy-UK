# Phase 3a: Core Entity Pages & Trust Rendering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 3a-core-entity-pages-trust-rendering
**Areas discussed:** Trust-state visual treatment, Product page layout & IA, Ingredient page & descriptive boundary, Seed corpus sourcing approach

---

## Trust-state visual treatment (SC5 / VRFY-11/12)

| Option | Description | Selected |
|--------|-------------|----------|
| Honest-first, conspicuous | Withheld/contested/stale visually distinct and impossible to miss; contested gets a dedicated both-sides treatment | ✓ |
| Calm / inline | Trust states render quietly inline with detail behind disclosure | |
| Confidence-forward | Verified facts lead; withheld/contested/stale styled as secondary | |

**User's choice:** Honest-first, conspicuous
**Notes:** The reader-facing expression of the core value. Exact visual spec deferred to /gsd:ui-phase 3a.

---

## Product page layout & IA

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped sections | Distinct labelled sections (Ingredients, Nutrition table, Allergens, Manufacturer, Sources, Recipe history), each fact through the trust component | ✓ |
| Single fact stream | One continuous list of trust-component facts under light headings | |
| Summary + detail | Top summary then expandable detail sections | |

**User's choice:** Grouped sections
**Notes:** Nutrition as a table; GB allergens via the structured field (PROD-09), not free text.

---

## Ingredient page & descriptive boundary (INGR-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Separated 'regulatory position' block | Clearly-headed cited+dated authority block, visually separate from the plain-English explainer, with a standing "not dietary advice" note | ✓ |
| Inline within the explainer | Authority position woven into descriptive prose with inline citation | |
| Structured labelled fields | What it is / Why used / E-number / Regulatory status / Authority position as labelled fields | |

**User's choice:** Separated 'regulatory position' block
**Notes:** Keeps the INGR-02 no-synthesis line unmistakable; the block reads as a cited factual statement, never advice.

---

## Seed corpus sourcing approach (SC4)

| Option | Description | Selected |
|--------|-------------|----------|
| Templates-first; data as parallel track | Phase code done when templates + trust rendering work on the verified subset; >=20/>=40 met by the human sourcing track in parallel, not blocking | ✓ |
| Data-and-templates together | Phase not done until >=20/>=40 are authored and published | |
| Prove all states on a small set; threshold gates 3b | >=20/>=40 as the exit gate into Phase 3b, tracked not blocking template completion | |

**User's choice:** Templates-first; data as parallel track

### Follow-up: minimum proof set

| Option | Description | Selected |
|--------|-------------|----------|
| Full state matrix + a few ingredients | Author >=1 of each renderable state (incl. the missing published-stale) + ~3-5 ingredients with an authoritative position, proving SC1/2/3/5 on live data | ✓ |
| Whatever exists + synthetic fixtures for gaps | Prove missing states with marked test fixtures outside the corpus | |
| Only what's already verified | Build against current data; stale + ingredient pages demonstrated only by unit tests | |

**User's choice:** Full state matrix + a few ingredients
**Notes:** Requires authoring a published-stale example (none exists today) and ~3-5 ingredient records through the human checkpoint. AI never authors passes.

---

## Claude's Discretion

- Permalink/URL scheme and the entity-to-entity linking model (product ingredient list -> ingredient page; INGR-04 back-links).
- How the recipe-history "absent, not a broken stub" case renders, within the honest-first direction.

## Deferred Ideas

- Health-effect evidence synthesis (v1.x, INGR-02 / EVID-SYNTH-01).
- Then-vs-now diff + corpus scale (Phase 4); comparison view (Phase 6); full timeline pages (Phase 8); site shell + crawlability + credibility surface + pa11y-ci route floor (Phase 3b).

No scope-creep requests; discussion stayed within the phase boundary.
