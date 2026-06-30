# Requirements: Food Transparency UK

**Defined:** 2026-06-30
**Core Value:** Every published fact is traceable to a primary source, independently verified to a standard matched to the claim, and honest about its uncertainty — transparency over persuasion.

## v1 Requirements

Requirements for the MVP release. Each maps to roadmap phases during roadmap creation.

### Trust Layer

- [ ] **TRUST-01**: Every fact-bearing field (as designated by DATA-09) carries at least one cited source, a confidence level, an evidence level, and a last-updated date
- [ ] **TRUST-02**: Confidence and evidence are two separate fields — (a) evidence level: the strength of the underlying scientific/regulatory evidence for the claim, on a four-point scale (High / Moderate / Low / Very Low, GRADE convention); (b) confidence level: the curator's certainty that this specific record is correct and current, on the same four-point scale. Source type (primary/secondary/tertiary/grey) lives in the source registry (DATA-01), not here
- [ ] **TRUST-03**: A reader can see the source(s) behind any displayed claim (inline citation referencing the source record)
- [ ] **TRUST-04**: A reader can see the confidence level, evidence level and last-updated date for any displayed claim, expressed as text (colour-independence per SITE-04)
- [ ] **TRUST-05**: Provenance-completeness gate — the build fails if any fact-bearing field is missing a source, confidence level, evidence level, or update date
- [ ] **TRUST-06**: Regulatory facts record a GB-specific source and a checked-on date (the EU/EFSA position is not assumed to be the GB/FSA position)

### Verification

- [ ] **VRFY-01**: A fact is publishable only when verified to the standard matched to its claim type: a **corroborable** fact (an empirical claim about the world, e.g. a past or declared formulation) requires two confirming verifications against two distinct-lineage sources, at least one primary; an **authoritative** fact (what a named authority states, e.g. current GB regulatory status, or the current official label) requires one authority plus an independent re-read for transcription fidelity
- [ ] **VRFY-02**: When the recorded verifications disagree, the fact is flagged for human approval and withheld from publication until a human resolves it; AI may never adjudicate a disagreement
- [ ] **VRFY-03**: Every fact carries a verification status (confirmed / stale / wrong / uncertain / disputed) and the date it was last (re-)verified
- [ ] **VRFY-04**: Verification-sufficiency gate — publication is blocked if a published fact lacks the passes required for its claim type, has an open disagreement, or any pass returned inaccessible / not-found (an inaccessible source never satisfies a pass)
- [ ] **VRFY-05**: A reviewer can invoke a re-verification audit command that, for each published fact, outputs its status, the recorded verdicts, and flags facts whose last-verified date exceeds their staleness threshold or whose citation no longer resolves; results are written to a dated audit record in the VRFY-06 format
- [ ] **VRFY-06**: The audit record lists each fact's status, the recorded verdicts, and disagreements ordered worst-first (ascending confidence: wrong → uncertain → stale, then oldest last-verified first); no value changes without human approval
- [ ] **VRFY-07**: Every recorded citation passes an automated existence/resolves check (URL/DOI) before any verification pass counts; a citation that does not resolve is recorded as not-found and blocks publication
- [ ] **VRFY-08**: Each verification pass records the exact measure/definition it checked (e.g. "per 100g as sold", "GB legal status 2026"); a measure mismatch between passes auto-raises a disagreement even when the values look close
- [ ] **VRFY-09**: Each published fact carries a staleness threshold configurable by fact class (e.g. ~6–12 months for regulatory positions, ~12 months for current nutrition/ingredients, ~24 months for historical recipe records); the VRFY-05 audit flags exceeded thresholds for re-verification
- [ ] **VRFY-10**: An Open Food Facts revision-diff (or similar import signal) is treated as a lead, not a verified reformulation; a detected change must be human-confirmed as a genuine recipe change (not a record correction) before it can publish as a reformulation

### Data Model & Sourcing

- [ ] **DATA-01**: A source registry stores each source as a citable record (id, name, publisher, URL/reference, what it covers, update frequency, retrieved date, source type [primary/secondary/tertiary/grey], licence/rights), mirroring DEBT's sources.json
- [ ] **DATA-02**: Each source record carries its licence and rights status so re-use obligations (e.g. ODbL attribution/share-alike) are auditable
- [ ] **DATA-03**: Dates support ranged/uncertain values (e.g. "circa 2015", "between 2012 and 2014") rather than forcing false precision
- [ ] **DATA-04**: Recipe-change records separate documented change, manufacturer's stated reason, and labelled analyst inference — motive is never stored as fact
- [ ] **DATA-05**: Open Food Facts and other imported data are stored as unverified leads (draft) until verified, never as authority
- [ ] **DATA-06**: An ingestion process can import product/ingredient data from Open Food Facts into the draft store with provenance tagged at field level
- [ ] **DATA-07**: The product schema includes a structured allergen record — a typed field per GB-regulated major allergen (the 14) — distinct from the free-text ingredients list
- [ ] **DATA-08**: The model records product price as a sourced, dated fact (retailer, price, currency, retrieved date, source record) under the same trust-layer attributes as any other fact; live/continuous price tracking is out of scope for v1
- [ ] **DATA-09**: The schema designates each field as fact-bearing (makes an empirical claim; subject to the trust layer) or metadata (structural/administrative; exempt); the designation lives in the schema and is enforced by TRUST-05
- [ ] **DATA-10**: Every image used (product packaging, historic labels) is recorded in the registry with its rights/licence status and attribution requirement; the build fails if a referenced image has an unresolved rights status
- [ ] **DATA-11**: The product, ingredient, brand and additive entity schemas and the TimelineEvent schema (with ranged dates and the DATA-04 separation) are defined in the foundation, before ingestion writes into them, and reserve verification-status and publication-status fields for the verification gate to populate

### Product Pages

- [ ] **PROD-01**: A user can view a product page showing current ingredients, nutrition, and manufacturer
- [ ] **PROD-02**: A product page includes an embedded recipe-history section showing recent sourced change events and linking to the full timeline (TIME-01)
- [ ] **PROD-03**: Each change event displays its description, source citation, (possibly ranged) date and confidence level
- [ ] **PROD-04**: A product page lists the references/sources behind its claims
- [ ] **PROD-05**: A product page presents a "traditional vs current formulation" view as a primary section near the top, for products where a sourced historical formulation exists (Tier A)
- [ ] **PROD-06**: The traditional-vs-current view displays each ingredient aligned between the two versions so additions, removals and substitutions are visible
- [ ] **PROD-07**: Each ingredient difference in the traditional-vs-current view carries at least one cited source
- [ ] **PROD-08**: Where the DATA-04 change-record fields are populated, all three (documented change / stated reason / labelled inference) are displayed with their labels so readers distinguish established fact from attributed motive; the "why" is anchored to documented policy/regulatory drivers (e.g. the 2015 ice-cream compositional rule, the 2018 Soft Drinks Industry Levy, the salt/sugar reduction programmes) where available
- [ ] **PROD-09**: A product page displays the GB-regulated major allergens present, via the structured allergen field (DATA-07), not free text
- [ ] **PROD-10**: Each product carries a history-completeness / evidence-tier state — (A) sourced historical formulation; (B) reformulation documented at category level with a driver, but former per-product recipe not individually sourced; (C) current-only — and the page renders the appropriate state honestly; a former recipe is never inferred or fabricated to satisfy the template
- [ ] **PROD-11**: A user can browse a curated editorial collection of products illustrating significant, well-documented formulation changes — selected and explained with sources, not ranked by any computed transformation metric — as a non-expert entry point
- [ ] **PROD-12**: The MVP publishes product pages for at least 100 UK packaged food products, drawn from a curated list agreed before the content phase and recorded in the project data

### Ingredient Explorer

- [ ] **INGR-01**: An ingredient page explains what it is and why it is used — name, common synonyms, function in food (at least one sentence), and E-number where applicable
- [ ] **INGR-02**: An ingredient page summarises the scientific evidence with at least one cited evidence statement carrying an evidence level (TRUST-02), or an explicit "no adequate evidence found" with the same fields populated
- [ ] **INGR-03**: An ingredient page states the current UK/GB regulatory position, with source and checked-on date
- [ ] **INGR-04**: An ingredient page lists products that contain the ingredient
- [ ] **INGR-05**: The MVP covers 500 ingredient pages

### Search

- [ ] **SRCH-01**: A user can search across products, ingredients and brands from any page, including additive E-number synonyms
- [ ] **SRCH-02**: Search returns results ordered by text-relevance (never by health, quality or processing characteristics), linking to the relevant product, ingredient or brand page
- [ ] **SRCH-03**: A user can filter/facet search results (e.g. by category)

### Comparison Engine

- [ ] **COMP-01**: A user can compare two or more products side by side
- [ ] **COMP-02**: The comparison shows ingredient count, additives, nutrition, processing characteristics, and price where a sourced dated price exists (the price axis is omitted, with a last-sourced date shown, when none is available)
- [ ] **COMP-03**: The comparison presents differences neutrally, flags where axes differ in certainty, and never emits an overall "winner" ranking
- [ ] **COMP-04**: A dedicated "Expectation vs Reality" page contrasts a product's recorded original recipe with its current formulation, reusing the PROD-05/06 then-vs-now component and timeline snapshots, with sources, at a permanent URL distinct from the product page

### Processing Explorer

- [ ] **PROC-01**: A processing-dimension taxonomy (at least four named dimensions, defined in meta.json before the explorer is built) is the authoritative enumeration for the processing requirements
- [ ] **PROC-02**: A user can view a product's processing characteristics across the named dimensions, each showing its source and the basis for its classification
- [ ] **PROC-03**: Processing is never reduced to a single composite score

### Timeline Engine

- [ ] **TIME-01**: A dedicated timeline page per product shows all sourced formulation-change events in chronological order
- [ ] **TIME-02**: Each timeline event cites its source and shows its (possibly ranged) date and confidence
- [ ] **TIME-03**: Where no sourced events exist for a period, the timeline renders an explicit gap indicator ("no sourced changes recorded for this period") rather than implied continuity

### Evidence Pages

- [ ] **EVID-01**: A user can view an evidence page that links a claim to its primary sources and evidence level
- [ ] **EVID-02**: An evidence page explains the basis behind a claim, the evidence-level rationale (TRUST-02), and any caveats on the cited sources

### Site & Information Architecture

- [ ] **SITE-01**: The site provides the navigation/IA: Home, Search, Products, Ingredients, Brands, Categories, Timelines, Evidence, Methodology, About
- [ ] **SITE-02**: A Methodology page explains sourcing, the confidence/evidence model, and the verification model stated honestly (source-axis independence; human/AI or blinded-same-human passes, not two independent reviewers), publishes a corrections policy, and explains how uncertainty is represented; it accurately reflects the schema enums and gate rules
- [ ] **SITE-03**: A user can browse products by brand and by category
- [ ] **SITE-04**: All pages meet WCAG 2.2 AA (semantic HTML, keyboard navigable, 4.5:1 contrast, visible focus, 44px targets, no information by colour alone), mobile-first, verified by pa11y-ci across every route
- [ ] **SITE-05**: Product and ingredient pages are server-rendered/static and crawlable; the build generates sitemap.xml and robots.txt, and pages include JSON-LD structured data so external citations resolve to indexable, machine-readable pages
- [ ] **SITE-06**: A /timelines index lists products that have at least one sourced change event, linking to each product's timeline page
- [ ] **SITE-07**: The site provides a /404 page and a /privacy page (compliant with UK GDPR and PECR)
- [ ] **SITE-08**: A /sources index lists all source-registry records, filterable by publisher and source type, linking to each source URL

### Content & UX (non-expert audience)

- [ ] **UX-01**: Pages are written in plain English (GOV.UK-style, neutral, factual; interpretation kept separate from fact) so a reader who has only heard of "UPF" can follow them
- [ ] **UX-02**: Unfamiliar terms (additives, processing terms, E-numbers) are defined inline via a glossary term component
- [ ] **UX-03**: Every chart/visualisation has a full data-table fallback rendered server-side (no information by chart or colour alone, per SITE-04)
- [ ] **UX-04**: A first-time visitor reaches a concrete "then vs now" product example within one step from the home page
- [ ] **UX-05**: A /glossary page lists all defined terms alphabetically with definitions, machine-generated from the same source as the inline glossary terms (UX-02)
- [ ] **UX-06**: A CI lint step enforces British English conventions (no em-dashes, en-GB spellings, sentence-case headings) and fails the build on violation

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Community

- **COMM-01**: A user can submit historic packaging / corrections for moderation
- **COMM-02**: Submissions carry provenance and pass a moderation workflow before publishing

### Platform

- **API-01**: A public API exposes product/ingredient data
- **API-02**: A journalist toolkit provides exportable, citable datasets
- **NOTF-01**: A user can subscribe to recipe-change notifications

## Out of Scope

Explicitly excluded for v1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Single composite health/processing score | Oversimplifies and misleads; contradicts the multi-dimensional design principle |
| Algorithmic ranking of products by degree of formulation change | A transformation "score" by another name; the flagship collection (PROD-11) is editorially curated, not metric-ranked |
| "Switch to a healthier product" recommendations | Forces a normative verdict; conflicts with transparency-over-persuasion |
| Anti-brand / campaigning framing | Project is a public archive, not advocacy |
| Fabricated or inferred historical recipes | A former recipe that cannot be sourced is rendered as state (B) or (C) per PROD-10, never invented to fill the then-vs-now template |
| Brand editorial content beyond filtered product lists | v1 brand pages are filtered product lists only (SITE-03); manufacturer histories deferred |
| Live/continuous price tracking | Price is a sourced, dated point fact (DATA-08); real-time price feeds are out of scope |
| Open user submissions before provenance tooling | Needs moderation + rights tooling not justified for MVP (deferred to v2) |
| Public API / data export | ODbL share-alike obligations require a licence + privacy review gate first (deferred to v2) |
| Barcode scanning, mobile app, AI assistant, shopping integrations | PRD Phase 3; premature before the core archive exists |

## Traceability

Each requirement maps to exactly one phase. See ROADMAP.md for phase detail.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (to be refilled by roadmapper after Round 1 refine) | — | Pending |

**Coverage:**
- v1 requirements: 73 total
- Mapped to phases: 0 (pending re-plan)
- Unmapped: 73 ⚠️

---
*Requirements defined: 2026-06-30*
*Last updated: 2026-06-30 after Round 1 critique (verification claim-typing, tiered then-vs-now, schema sequencing, requirement-quality gaps)*
