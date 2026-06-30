# Project Research Summary

**Project:** Food Transparency UK
**Domain:** Provenance-first, citation-heavy, read-heavy public reference archive (UK packaged food)
**Researched:** 2026-06-30
**Confidence:** HIGH

## Executive Summary

Food Transparency UK is a curated, citation-first reference archive — not a web application. The architecture that fits is a static, content-as-data system with strictly one-way data flow: external sources → editorial curation → git-versioned canonical store → build-time derivation → static CDN. All four research files agree on the deep architecture: flat structured JSON files as the canonical store (no database at MVP scale), Pagefind for static search, and a build-failing schema validation gate that enforces the trust layer — no fact without source, confidence, evidence level, and update date. What makes this product distinctive is not a feature; it is a structural invariant enforced in the data model before any page is written.

The highest-priority engineering decision is the trust layer primitive — a typed `SourcedValue` envelope wrapping every fact-bearing field with ≥1 source reference, a confidence rating (the curator's judgement the claim is correct), an evidence level (an objective classification of the source type), and a last-reviewed date. These two axes — confidence and evidence level — must be modelled and displayed as two separate fields. They can diverge: a partial 1990s packaging photograph is a primary source but may warrant only medium confidence because the ingredients list is hard to read. This separation is what makes historical recipe gaps honest rather than falsely certain. This primitive must exist before any page template is authored, because retrofitting per-claim provenance onto pages built without it is a near-complete rewrite. The timeline, comparison engine, processing explorer, and "Expectation vs Reality" feature all depend on this foundation and cannot be built correctly without it.

The principal risks are legal and data-quality rather than technical. Open Food Facts data triggers ODbL share-alike obligations if redistributed as a derivative database (not just rendered on pages); manufacturer and packaging content carries trademark and copyright exposure; "why a recipe changed" claims carry defamation risk if presented as fact rather than labelled inference; historical dating must model uncertainty explicitly (date ranges, not point-dates from Wayback capture timestamps); and rule-derived, freshness-aware confidence must be defined from the start rather than hand-entered. These risks are cheap to design out in Phase 1 and expensive to retrofit. The timeline is the flagship differentiator but is bottlenecked on slow, manual historic curation rather than code — the entity schema lands in Phase 1, the UI and data trail behind.

---

## Key Findings

### SSG Decision — Explicit Recommendation

**Recommendation: Eleventy 3.1.6. Use this. Do not leave the choice open.**

The STACK.md researcher recommends Eleventy 3.x. The ARCHITECTURE.md researcher recommends Astro (Content Layer + Zod). Both agree on the deeper architecture — flat git-versioned JSON canonical store, no database at MVP, Pagefind, a build-failing validation gate, one-way data flow — so the disagreement is SSG only.

**Why Eleventy over Astro:**

The user's standing defaults settle it. Eleventy is bundler-free, ships no client-side framework, is the textbook fit for a read-heavy citation-first archive, and aligns with the vanilla / progressive-enhancement / minimal-dependencies defaults. The interactive engines (comparison, timeline, processing explorer) are designed as progressively-enhanced HTML/CSS/SVG with vanilla JS islands — Eleventy's model is the natural fit and does not require a framework to structure that pattern.

**The trade-off — stated plainly:** Astro's Content Layer + Zod provides TypeScript-native schema validation that is more ergonomic for the `SourcedValue<T>` generic type hierarchy. Astro's islands pattern is also more formally structured than vanilla JS progressive enhancement on Eleventy. These are real ergonomic advantages. The mitigation: the Zod schema shapes from ARCHITECTURE.md are directly translatable to JSON Schema; author them as TypeScript interfaces for type safety in ingestion scripts and generate/maintain the corresponding JSON Schema for Ajv. The canonical store (flat JSON files) is SSG-agnostic, so migrating to Astro later — if the interactive engines grow significantly in complexity or the Ajv maintenance cost proves burdensome — is a presentation-layer swap, not a data-model rewrite.

**Roadmapper instruction:** Treat Eleventy 3.x as the chosen SSG for all phases. Revisit only if a specific feature genuinely demands Astro's capabilities.

### Recommended Stack

A mostly-static archive on a CDN. No server at runtime. Writes happen at editorial cadence via the ingestion pipeline, not at request time.

**Core technologies:**

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Eleventy (11ty)** | 3.1.6 | Static site generator + build-time data layer | Bundler-free ESM; data cascade for build-time joins; pre-renders crawlable HTML; no client framework |
| **Node.js** | 22 LTS | Build runtime + ingestion scripts | Required by Eleventy 3; LTS for long-term archive maintainability |
| **Nunjucks / WebC** | bundled | Page templating + components | Nunjucks for pages/layouts; WebC for the `SourcedFact` component and citation footnotes |
| **Flat JSON files (git-versioned)** | — | Canonical content store | Local-first; provenance auditing via git diff; no database at MVP scale; zero infrastructure |
| **Ajv 8 + JSON Schema** | Ajv 8.x | Build-failing trust-layer validation gate | Every fact lacking source/confidence/evidence/date fails the build; the core value as a compile error |
| **Pagefind** | 1.x (1.3.x stable) | Static full-text + faceted search | Indexes built HTML post-build; no server; ~<100 KB index at MVP scale; accessible drop-in UI |
| **Vanilla JS** | — | Comparison engine, timeline interactivity, processing explorer | Progressive enhancement over server-rendered baseline; no framework shipped |
| **CUBE CSS** | methodology | Styling | Mobile-first; vanilla; no dependency |
| **pa11y-ci + axe-core** | latest | WCAG 2.2 AA verification in CI | Compliance verified, not assumed; wired into the build pipeline |
| **GitHub Actions** | — | CI: validate → build → a11y → deploy | Keeps archive integrity automated |

**Optional / deferred:**

- **Observable Plot 0.6.x** — only if a specific visual cannot be expressed as semantic HTML + CSS; rendered to static SVG at build via jsdom, no client JS shipped.
- **better-sqlite3 12.x** — disposable build-time query cache only; never the canonical store; only if cross-entity joins become slow past ~5–10k entities.
- **Sveltia CMS** — git-based editorial UI; only when non-technical contributors need one; deferred past MVP.

**What to avoid without exception:** any relational/document database as the canonical store; Algolia or hosted search SaaS; Chart.js (canvas, inherently inaccessible); any single composite "processing score" widget; Next.js or SSR; Eleventy 4.0 alpha; Sanity or any hosted CMS as canonical store; Lunr.js.

### Expected Features

The product sits between Open Food Facts (breadth + open data, weak provenance) and Examine.com (strong evidence grading, no food-product focus), with the unique differentiator of a versioned reformulation timeline that does not exist anywhere centrally.

**Must have (table stakes — without these the product is incomplete or untrustworthy):**
- Product detail pages (ingredients, nutrition per 100g, manufacturer, allergens)
- Ingredient detail pages (what it is, why used, regulatory position)
- Full-text search across products, ingredients, brands — including E-number synonyms
- Additives list with E-number decoding
- Allergen flagging (14 EU-regulated allergens)
- Category and brand browse with filtering
- Legible nutrition display — UK traffic-light colours acceptable as data display, distinct from a health verdict
- Source citations on every factual claim — this is table stakes for credibility
- Mobile-responsive, accessible pages (WCAG 2.2 AA, keyboard operable, 4.5:1 contrast, 44px touch targets)

**Should have (differentiators — competitive advantage):**
- Trust layer: per-claim source + confidence + evidence level + update date — the moat; no comparable product attaches provenance to individual facts
- Recipe/formulation evolution timeline — no centralised UK database exists; genuine information gap confirmed by Which? and ONS reporting
- Multi-dimensional processing explorer — deliberately rejects NOVA's single-score approach; each dimension individually sourced
- "Expectation vs Reality" comparison — original recipe vs current formulation; depends on the timeline data model
- Product comparison engine — neutral multi-axis (ingredient count, additives, nutrition, processing dimensions, price); no winner declared
- Evidence pages — GRADE-style evidence synthesis linking claims to primary sources
- Methodology page — makes the confidence model learnable; YMYL trust requirement as well as editorial one
- Honest "we don't know" states — where data is missing or weak, say so; this is itself a trust signal

**Anti-features — never build these:**
- Single overall health or processing score — documented to oversimplify and mislead; explicitly rejected
- "Switch to this healthier product" recommendations — requires a normative verdict this project refuses to make
- Anti-brand / outrage / campaigning framing — erodes neutrality and trust with journalists and researchers
- AI-generated summaries presented as fact — breaks traceability; no primary source
- Community submissions or open editing at MVP — provenance and moderation tooling not yet present; explicit Phase 2 item
- Personalised scoring (diet, allergies, goals) — turns a reference archive into health-advice with regulatory exposure
- Public API deferred — behind a licence and privacy review gate (Phase 2)

**Defer to v2+:**
- Recipe-change notifications (needs eventing/subscription layer)
- Public API + journalist toolkit (after data model is proven stable by MVP usage)
- Community-contributed historic packaging (needs moderation + provenance tooling)
- Barcode scanning / native mobile app (Phase 3; premature before archive depth)

**Trust layer UI patterns** (synthesised from GRADE, Examine.com, Wikipedia conventions):
- Per-claim inline markers, not per-page — each factual statement carries its own reference
- Confidence and evidence level displayed as two separate, labelled badges — never colour-only (WCAG 2.2 AA; labelled judgements drive trust per consumer-health research)
- For health/science claims, evidence level expressed using GRADE-aligned vocabulary (High/Moderate/Low/Very Low certainty); for recipe/sourcing claims, the source classification (primary/secondary/tertiary/inferred)
- Hover/expand for source detail, date, and plain-language confidence note
- Explicit "we don't know" gap state rather than silent omission
- "Last reviewed" date visible per fact
- Methodology page as the anchor — linked from every badge so the vocabulary is learnable

### Architecture Approach

A content-as-data, build-time-derived static archive with strictly one-way data flow. Nothing writes back at runtime. Every projection (search, comparison, timeline) is derived read-only from the same sourced facts, so views cannot drift from citations.

The atomic unit is the **sourced fact** (`SourcedValue<T>`): a typed envelope wrapping every fact-bearing field. Sources are normalised into a registry (one record per source, referenced by ID from many facts), which makes the Evidence pages a simple projection and the rights ledger a queryable data structure.

**Major components:**

| Component | Responsibility |
|-----------|----------------|
| **Ingestion & curation pipeline** | Offline Node scripts; pulls from OFF, Wayback CDX, FSA/EFSA; attaches provisional provenance; human review promotes drafts to published; never part of the live site build |
| **Canonical content store** | `content/` directory; git-versioned JSON files; local-first; git history = dataset provenance audit trail |
| **Schema validation gate** | Ajv + JSON Schema enforces `SourcedValue` on every fact; build fails on any missing provenance field |
| **Source registry** | `content/sources/*.json`; first-class normalised record per source including licence field; the rights ledger lives here |
| **Derivation/build layer** | Read-only over the store; computes Pagefind index, comparison matrix (normalised per 100g/ml), timeline diffs, back-links (ingredient → products, source → facts) |
| **`SourcedFact` component** | Render-time provenance gate; every value on every page goes through it; outputs source chip, confidence badge, evidence level, updated date, and citation footnote |
| **Presentation layer** | Eleventy templates; zero-JS default; vanilla JS progressive enhancement for interactive engines |

**Key schema shapes** (implement as TypeScript interfaces + corresponding JSON Schema for Ajv):

```typescript
// The trust envelope — every fact-bearing field is this shape
SourcedValue<T> = {
  value: T,
  sources: SourceRef[],        // >=1 — mandatory
  confidence: 'high' | 'medium' | 'low',          // curator's judgement the claim is correct
  evidence: 'primary' | 'secondary' | 'tertiary' | 'inferred',  // source type — objective
  updated: Date,               // last review/update date
  validFrom?: Date,            // temporal scope — powers timelines
  validTo?: Date,
  note?: string,               // honest caveat where data is uneven
}

// Timeline events — date ranges, not point-dates
TimelineEvent = {
  date?: Date,
  dateRange?: { from: Date, to?: Date },    // ranged/uncertain dates from day one
  type: 'reformulation' | 'size_change' | 'rebrand' | 'discontinuation' | 'claim_change',
  changes: SourcedValue<{ field: string, before: any, after: any }>[],
  reason?: SourcedValue<string>,            // only where evidence exists; NOT inferred motive
  sources: SourceRef[],
  confidence: 'high' | 'medium' | 'low',
  evidence: 'primary' | 'secondary' | 'tertiary' | 'inferred',
}
```

**Build order (strict dependency chain):**

| Step | What | Depends on |
|------|------|-----------|
| 0 | Trust-layer schema — `SourcedValue<T>`, confidence/evidence enums, Ajv gate | nothing |
| 1 | Source registry + `SourcedFact` rendering component | 0 |
| 2 | Ingredient, Brand, Additive vocabularies | 0, 1 |
| 3 | Product entity + product pages (parallel with OFF ingestion) | 0, 1, 2 |
| 4 | Search (Pagefind) — indexes built HTML | 3 |
| 5 | Comparison engine | 3 + normalised metrics |
| 6 | Processing explorer | 3 + processing-dimension taxonomy (research flag) |
| 7 | Timeline engine | 3 + `TimelineEvent` + curated historic data (long-lead) |
| 8 | Evidence + Methodology pages | 1 (naturally late; synthesis views) |

### Critical Pitfalls

**1. ODbL share-alike silently contaminates the dataset**

Open Food Facts is ODbL. Rendering OFF data on product pages is a "Produced Work" — attribution notice required, no share-alike. Building a public API or bulk export that serves the underlying OFF-derived database is a "Derivative Database" — share-alike attaches, potentially forcing release of the entire curated dataset (including editorial work, if commingled with OFF data). This is invisible during the MVP display phase and only surfaces at the Phase 2 API milestone — by which point OFF fields may be entangled with proprietary editorial content.

Prevention: tag every field with its source at ingestion (the trust layer's source field does this); keep OFF-derived values architecturally separable from editorial facts; add the required ODbL attribution notice on all rendered pages; decide the API/export licence strategy before the data model is frozen, not after.

**2. Defamation risk in "why a recipe changed"**

Asserting manufacturer motive ("they replaced butter with palm oil to cut costs") is a factual claim that must be provable in court, not merely believed. UK Defamation Act 2013 applies — corporations must show serious financial harm, but a public reference site is reachable. The schema must separate three things as distinct fields: (a) the documented change (datable, sourceable fact), (b) the manufacturer's or press's stated reason (quoted attribution), and (c) analyst inference — which must be labelled as inference/opinion, never stored or displayed as fact. When motive is unknown, say so explicitly.

**3. Trademark and packaging-image IP**

Brand names used referentially are generally lawful (UK Trade Marks Act 1994 s11). Framing that editorialises against a brand drifts toward denigration. Separately, packaging artwork and logos carry copyright and design rights independent of the Internet Archive hosting them — the Archive's hosting is not a licence to republish. Establish an image-rights policy and per-asset rights ledger (source URL, licence, date captured, rights holder) before ingesting any image. Prefer text + structured data over packshots. Keep all editorial copy referential and neutral.

**4. Historical false precision**

Wayback capture dates are not recipe change dates. "Reformulated in 2014" based on a single March 2014 snapshot is false precision; the change happened somewhere between the preceding and following captures. The `TimelineEvent` schema must support `dateRange`, not just `date`; the timeline UI must render uncertainty (circa, ranges, confidence shading) rather than crisp false dates; a history-completeness indicator per product is required.

**5. Confidence model decay**

"Every fact has a confidence level" becomes meaningless without: (a) a documented rubric tying confidence to source tier + evidence type + recency — otherwise contributors default to "medium" and the scale loses calibration; (b) a `last_verified_date` field separate from `updated` — freshness is not the same as confidence; (c) rule-derived confidence rather than hand-entered values; (d) decay logic that flags facts ageing past a volatility-tier threshold. Define the rubric before any content is authored.

**6. GB vs EU regulatory divergence**

Post-Brexit, EFSA authorisations do not automatically apply in Great Britain. The FSA and GB additive/health-claims register is the GB authority. Every regulatory fact must cite its GB source with a checked-on date; the source registry type enum should distinguish `fsa` from `efsa`; the methodology page must explain this distinction.

---

## Implications for Roadmap

The build order is determined by strict data-model dependencies. The trust layer and schema gate are not a Phase 1 feature — they are a precondition for every other phase. The timeline is architecturally straightforward but editorially slow; the entity schema lands in Phase 1, the UI and data land in Phase 4.

### Phase 1: Foundation — Trust Primitives, Schema Gate & Rights Infrastructure

**Rationale:** The `SourcedValue<T>` schema, Ajv build gate, source registry, and rights/licensing infrastructure must exist before any content is authored. Without the schema, no fact can be created correctly. Without the rights ledger and ODbL strategy, the data model may need to be rebuilt at the API milestone. This is architectural groundwork, not editorial work.

**Delivers:**
- `SourcedValue<T>` TypeScript interfaces + JSON Schema for Ajv; confidence and evidence level as two separate non-nullable fields with distinct controlled vocabularies
- `TimelineEvent` schema with `dateRange` support (entity only — no UI; the data will trail)
- Ajv build gate wired into CI: build fails if any fact lacks source/confidence/evidence/updated date
- Source registry schema with `licence` as a required field
- Rights ledger as part of the source registry (source URL, licence, date captured, rights holder per asset)
- `SourcedFact` Eleventy/WebC component (render-time provenance gate — every value on every page goes through this)
- Confidence rubric: rule-derived from source tier × evidence type × recency; documented on the methodology page draft
- `last_verified_date` field separate from `updated`; decay threshold logic per volatility tier drafted
- ODbL attribution strategy locked: OFF fields tagged and separable; attribution notice wording confirmed
- Image-rights policy: per-asset licence record required before any image is ingested
- Editorial style guide: referential brand use, no motive inference stored as fact, neutrality rules, no causal verbs without systematic-review-or-stronger source
- Eleventy 3.1.6 project scaffold with pa11y-ci, Ajv CLI gate, GitHub Actions CI pipeline

**Pitfalls addressed:** ODbL contamination, trademark/image IP, confidence model decay, defamation in "why changed" (schema separates change/stated-reason/inference from the start), historical false precision (date ranges in schema from day one), GB/EU regulatory tagging

**Research flag:** No deep research phase needed. Well-documented patterns throughout.

---

### Phase 2: Core Content Architecture — Entity Vocabularies & Product Pages

**Rationale:** With the trust layer in place, entity vocabularies and core pages can be authored correctly from the start. The OFF ingestion pipeline runs in parallel (it depends only on the schema, not on pages) and produces drafts that flow through the schema gate.

**Delivers:**
- Ingredient entity — 500 ingredient pages: what it is, why used, regulatory position, evidence — all `SourcedValue` fields
- Brand and Additive vocabularies (scaffolded; Additive includes E-number, functional class, GB regulatory position with checked-on date)
- Product entity — 100 product pages: ingredients, nutrition per 100g, allergens — all `SourcedValue` fields; `NutritionPanel` as per-100g `SourcedValue<number>` fields
- `ProcessingProfile` as multi-dimensional `SourcedValue` fields — processing-dimension taxonomy stubbed in Phase 2, finalised in Phase 3
- OFF ingestion pipeline (`evidence: tertiary`, `confidence: medium`; drafts pending human verification against a primary source before publishing)
- Pagefind search (indexes built HTML; full-text + faceted by category, brand, additive, evidence level)
- Navigation scaffold: Home, Products, Ingredients, Brands, Categories, Search
- Methodology + About pages (editorial; documents the confidence rubric publicly; must accurately mirror the implemented schema)
- `last_verified_date` displayed per fact in the UI; stale-fact flag drafted

**Features addressed:** Product pages, ingredient pages, search (E-number synonyms), allergen/additive flagging, category/brand browse, nutrition display, methodology page

**Pitfalls addressed:** Scraping legal/technical risk (OFF as first-resort licensed source; raw artefacts stored with capture timestamps), misrepresenting evidence (evidence-level vocabulary enforced), GB/EU tagging on regulatory facts

**Research flag:** No deep research phase needed. Standard patterns throughout.

---

### Phase 3: Interactive Discovery Engines

**Rationale:** The comparison engine, processing explorer, and evidence pages are projections of the normalised data built in Phase 2. They require multiple products with complete data to be meaningful. All three engines are progressively-enhanced vanilla JS islands over a server-rendered HTML baseline — accessibility of each widget must be verified independently with axe-core/pa11y.

**Delivers:**
- Product comparison engine — neutral multi-axis (ingredient count, additives, nutrition per 100g, processing dimensions, price); confidence flagged where axes differ in certainty; no winner declared; pre-computed comparison matrix at build time
- Multi-dimensional processing explorer — processing-dimension taxonomy finalised; each dimension its own `SourcedValue`; no composite roll-up ever; non-visual text-equivalent representation designed before the visual; labelled bars, not a score
- Evidence pages — projection of the source registry; GRADE-aligned evidence-strength vocabulary for health/science claims
- "Expectation vs Reality" feature — two-snapshot timeline comparison (original vs current recipe); relies on Phase 1 `TimelineEvent` schema and curated historic snapshots
- Schema.org `Article`/`Dataset` structured data and E-E-A-T signals (authorship, methodology links, source dates) for YMYL search ranking
- WCAG 2.2 AA verified on each interactive widget via axe-core/pa11y — data-dense widgets are the highest-risk surface

**Features addressed:** Comparison engine, processing explorer, evidence pages, Expectation vs Reality

**Pitfalls addressed:** Single processing score (multi-dimensional by schema design), SEO/E-E-A-T failure (structured data + server-rendered citations), accessibility of data-dense widgets (verified per widget, not just static pages)

**Research flag:** The processing-dimension taxonomy needs domain and literature research before Phase 3 is planned in detail. No single authoritative source defines the correct multi-dimensional processing model for UK food. Risk: building the wrong taxonomy and having to remodel `ProcessingProfile` and all 100 product records. Flag Phase 3 for `/gsd:plan-phase --research-phase`.

---

### Phase 4: Timeline Engine & Historic Curation

**Rationale:** The `TimelineEvent` schema is in place since Phase 1. Phase 4 builds the timeline UI and the curation workflow, and begins the long-lead data work. Historic data is the bottleneck, not code — the timeline UI can be built quickly; the data to demonstrate the feature's value accrues slowly through manual curation. Starting historic curation alongside Phase 2 and 3 as a parallel editorial track is recommended; it does not depend on phases 3 or 4 being complete.

**Delivers:**
- Timeline explorer UI — ordered `TimelineEvent[]`, before/after diffs, date-range uncertainty rendering (circa, ranges, confidence shading), keyboard operable
- History-completeness indicator per product — sparse histories honestly flagged, not hidden
- Wayback CDX curation workflow — Wayback snapshot URL and capture timestamp stored as evidence; change date modelled as a range between nearest captures, never equal to a single capture date
- "Why it changed" editorial review gate — schema's fact/stated-reason/inference separation enforced; no inferred motive stored or displayed as fact; FSA reformulation programme and sugar tax policy timeline cited as honest motive anchors where available
- Volatility-tiered re-verification cadence and staleness dashboard — nutrition/ingredients (high churn): short cycle; brand history (low churn): infrequent; automated diff flagging candidates for human re-verification
- Ongoing historic data curation for the 100 target products (this is the bulk of the Phase 4 effort)

**Features addressed:** Reformulation timeline, recipe evolution history, Expectation vs Reality (enriched with more historic data), honest uncertainty rendering, staleness/maintenance

**Pitfalls addressed:** Historical false precision (date-range rendering with uncertainty; completeness indicators), defamation in "why changed" (schema enforcement + editorial review gate), staleness/maintenance (freshness-aware staleness dashboard; volatility-tiered cadence)

**Research flag:** Historic curation scope and sources need a dedicated research pass before Phase 4 is scoped. Map Wayback coverage for the target 100 products by category; identify supplementary sources (packaging museum collections, newspaper archives, Which? reporting, ONS data); produce a realistic data schedule. Without this, Phase 4 timelines will be unreliable. Flag for `/gsd:plan-phase --research-phase`.

---

### Phase Ordering Rationale

- Trust-layer schema and rights infrastructure gate everything: authoring a single fact correctly is impossible without the schema; ODbL contamination is invisible without per-field source tagging; the confidence rubric must exist before any confidence level is assigned.
- Phase 2 depends on Phase 1's schema but is otherwise independent of Phases 3 and 4.
- Phase 3 requires enough Phase 2 content (multiple products with complete, normalised data) to be meaningful.
- Phase 4's UI depends only on the Phase 1 `TimelineEvent` schema; Phase 4's data is bottlenecked on manual curation regardless of when the code is ready. Beginning historic curation as a parallel editorial track during Phase 2 is strongly recommended.
- Maintenance infrastructure (staleness dashboard, re-verification cadence) arrives in Phase 4 rather than later because the product's strategy is curated depth — that depth decays without freshness tracking.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 — processing-dimension taxonomy:** No single authoritative source defines the correct multi-dimensional processing model for UK food. Risk: wrong taxonomy, remodel required.
- **Phase 4 — historic curation scope and sources:** Manual curation of 100 product timelines is the long-lead constraint. Risk: the timeline UI ships before there is enough data to demonstrate the feature's value.

**Phases with well-established patterns (skip research phase):**
- **Phase 1:** JSON Schema / Ajv validation, Eleventy 3 project setup, ODbL attribution requirements, git-based rights ledger design — all well-documented.
- **Phase 2:** OFF ingestion workflow, Pagefind + Eleventy integration, entity page generation — standard patterns with documented examples.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Eleventy + Ajv + Pagefind + flat files is well-documented and battle-tested. SSG recommendation is explicit. |
| Features | MEDIUM-HIGH | Table stakes and anti-features verified against multiple live products. Trust-layer UI patterns drawn from analogous reference sites (GRADE, Examine, Wikipedia) rather than a direct competitor implementing the full model. |
| Architecture | HIGH | Data model and component structure well-researched; one-way data flow + provenance-first schema analogous to Wikidata statement model and nanopublication architecture. Zod shapes from ARCHITECTURE.md translate cleanly to JSON Schema for Ajv. |
| Pitfalls | HIGH on licensing/IP; MEDIUM on data-quality failure modes | ODbL obligations verified against primary licence text. UK legal framework based on established domain knowledge — verify with current legal guidance before publishing motive claims or planning the API. |

**Overall confidence:** HIGH

### Gaps to Address

- **Processing-dimension taxonomy (Phase 3):** The correct set of processing dimensions for the multi-dimensional explorer is unresolved. Stub the `ProcessingProfile` schema in Phase 2 with a small initial set (e.g. ingredient transformation, additive count by functional class, cosmetic additives, physical refining) and treat the taxonomy as a research deliverable at the start of Phase 3.

- **Confidence vs evidence level vocabulary reconciliation (Phase 1):** FEATURES.md recommends GRADE's High/Moderate/Low/Very Low for science-strength evidence claims; ARCHITECTURE.md uses primary/secondary/tertiary/inferred for source-type classification. These framings are compatible but distinct. Phase 1 schema design must decide: does one `evidence` field cover both (with context-dependent vocabulary), or are there two separate fields for source type and science strength? Settle this before authoring any content.

- **ODbL exact obligations at API/export time:** The Produced Work / Derivative Database analysis is accurate but the precise practical boundary for the Phase 2 public API should be verified with specialist licence guidance before any data distribution is planned.

- **UK defamation threshold for motive claims:** The schema safeguard (labelled inference, not stored as fact) is the correct mitigation. Verify its adequacy with legal guidance before publishing any claim about manufacturer intent.

- **Wayback historic coverage per product (Phase 4):** Research has not yet mapped which of the 100 target products have sufficient Wayback and archival coverage. This is a Phase 4 planning dependency.

- **GB vs EU additive divergence cases:** The principle is established. Specific divergence cases need a lookup at the evidence-authoring stage, not a design decision now.

---

## Sources

### Primary (HIGH confidence)
- `/11ty/11ty-website` (Context7) — Eleventy 3 data cascade, ESM, build hooks
- https://www.11ty.dev/blog/eleventy-v3-1/ — Eleventy 3.1.6 current stable
- https://pagefind.app/ + GitHub Discussions — Pagefind faceted/static search, 1.x status
- https://world.openfoodfacts.org/terms-of-use — ODbL, DBCL, CC BY-SA licence obligations (verified 2026-06-30)
- https://opendatacommons.org/licenses/odbl/1-0/ — ODbL 1.0 full text; Produced Work vs Derivative Database definitions
- https://docs.astro.build/en/guides/content-collections/ — Astro Content Layer + Zod schemas (considered for SSG; Zod schema patterns inform JSON Schema design)
- https://www.wikidata.org/wiki/Wikidata:Data_model — statement model: value + references + qualifiers
- https://nanopub.net/guidelines/working_draft/ — assertion + provenance + publication-info model
- https://examine.com/glossary/certainty-of-evidence/ — GRADE evidence vocabulary
- https://gradepro.org/handbook/ — GRADE handbook

### Secondary (MEDIUM confidence)
- https://world.openfoodfacts.org/data — OFF data fields, NOVA, Nutri-Score, additives, allergens
- https://yuka.io/en/ and GreenChoice expert review — scoring weighting and oversimplification critiques
- https://www.which.co.uk/news and ONS shrinkflation analysis — confirm no centralised UK reformulation database exists
- https://www.cambridge.org/core — critical review of NOVA classification (supports single-score anti-feature)
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6521213/ — consumer trust indicators in online health information
- https://en.wikipedia.org/wiki/Wikipedia:Inline_citation — inline citation and tooltip UI conventions
- Google E-E-A-T / YMYL guidance and WCAG 2.2 AA

### Tertiary (MEDIUM — domain knowledge, not re-verified this session)
- UK Defamation Act 2013, Trade Marks Act 1994 s10/s11, UK fair-dealing exceptions, sui generis database right
- EFSA health-claims register and FSA / GB additive authorisation regime, including post-Brexit GB/EU divergence
- Internet Archive Wayback CDX API — historic snapshot sourcing patterns

---
*Research completed: 2026-06-30*
*Ready for roadmap: yes*
