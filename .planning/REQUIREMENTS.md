# Requirements: Food Transparency UK

**Defined:** 2026-06-30
**Core Value:** Every fact is traceable to a primary source with an explicit confidence level — transparency over persuasion.

## v1 Requirements

Requirements for the MVP release. Each maps to roadmap phases during roadmap creation.

### Trust Layer

- [ ] **TRUST-01**: Every fact-bearing field carries at least one cited source, a confidence level, an evidence level, and a last-updated date
- [ ] **TRUST-02**: Confidence level and evidence level are recorded as two separate axes (evidence = source type; confidence = curator judgement)
- [ ] **TRUST-03**: A reader can see the source(s) behind any displayed claim (inline citation with reference to the source record)
- [ ] **TRUST-04**: A reader can see the confidence level, evidence level and last-updated date for any displayed claim, expressed as text (not colour alone)
- [ ] **TRUST-05**: The build fails if any fact-bearing field is missing a source, confidence level, evidence level, or update date
- [ ] **TRUST-06**: Regulatory facts record a GB-specific source and a checked-on date (EU/EFSA position is not assumed to be the GB/FSA position)

### Data Model & Sourcing

- [ ] **DATA-01**: A source registry stores each primary/secondary source as a citable record (title, publisher, URL/reference, retrieved date, licence/rights)
- [ ] **DATA-02**: Each source field records its licence and rights status so re-use obligations (e.g. ODbL attribution/share-alike) are auditable
- [ ] **DATA-03**: Dates support ranged/uncertain values (e.g. "circa 2015", "between 2012 and 2014") rather than forcing false precision
- [ ] **DATA-04**: Recipe-change records separate documented change, manufacturer's stated reason, and labelled analyst inference — motive is never stored as fact
- [ ] **DATA-05**: Open Food Facts and other imported data are stored as unverified leads (draft) until a curator verifies them, never as authority
- [ ] **DATA-06**: An ingestion process can import product/ingredient data from Open Food Facts into the draft store with provenance tagged at field level

### Product Pages

- [ ] **PROD-01**: A user can view a product page showing current ingredients, nutrition, and manufacturer
- [ ] **PROD-02**: A product page shows the product's historical timeline of recipe/formulation changes
- [ ] **PROD-03**: A product page shows the product's recipe evolution (what changed and when, with sources)
- [ ] **PROD-04**: A product page lists the references/sources behind its claims
- [ ] **PROD-05**: The MVP covers 100 iconic UK products with product pages

### Ingredient Explorer

- [ ] **INGR-01**: A user can view an ingredient page explaining what it is and why it is used
- [ ] **INGR-02**: An ingredient page summarises the scientific evidence about it, with citations
- [ ] **INGR-03**: An ingredient page states the current UK/GB regulatory position, with source and checked-on date
- [ ] **INGR-04**: An ingredient page lists products that contain the ingredient
- [ ] **INGR-05**: The MVP covers 500 ingredient pages

### Search

- [ ] **SRCH-01**: A user can search across products, ingredients and brands from any page
- [ ] **SRCH-02**: Search returns ranked results linking to the relevant product, ingredient or brand pages
- [ ] **SRCH-03**: A user can filter/facet search results (e.g. by category)

### Comparison Engine

- [ ] **COMP-01**: A user can compare two or more products side by side
- [ ] **COMP-02**: The comparison shows ingredient count, additives, nutrition, processing characteristics and price
- [ ] **COMP-03**: The comparison presents differences neutrally and never emits an overall "winner" ranking
- [ ] **COMP-04**: A user can view an "Expectation vs Reality" comparison contrasting a traditional recipe with the current formulation, with sources

### Processing Explorer

- [ ] **PROC-01**: A user can view a product's processing characteristics across multiple named dimensions
- [ ] **PROC-02**: Processing is never reduced to a single composite score
- [ ] **PROC-03**: Each processing dimension shows its source and the basis for its classification

### Timeline Engine

- [ ] **TIME-01**: A user can view a timeline of a product's formulation changes over time
- [ ] **TIME-02**: Each timeline event cites its source and shows its (possibly ranged) date and confidence
- [ ] **TIME-03**: Timeline gaps are shown honestly (absence of evidence is not presented as "no change")

### Evidence Pages

- [ ] **EVID-01**: A user can view an evidence page that links a claim to its primary sources and evidence level
- [ ] **EVID-02**: Evidence pages explain the basis and any uncertainty behind a claim in plain language

### Site & Information Architecture

- [ ] **SITE-01**: The site provides the navigation/IA: Home, Search, Products, Ingredients, Brands, Categories, Timelines, Evidence, Methodology, About
- [ ] **SITE-02**: A Methodology page explains sourcing, the confidence/evidence model, and how uncertainty is represented
- [ ] **SITE-03**: A user can browse products by brand and by category
- [ ] **SITE-04**: All pages meet WCAG 2.2 AA (semantic HTML, keyboard navigable, 4.5:1 contrast, visible focus, 44px targets), mobile-first
- [ ] **SITE-05**: Product and ingredient pages are server-rendered/static and crawlable so external citations resolve to indexable pages

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
| "Switch to a healthier product" recommendations | Forces a normative verdict; conflicts with transparency-over-persuasion |
| Anti-brand / campaigning framing | Project is a public archive, not advocacy |
| Open user submissions before provenance tooling | Needs moderation + rights tooling not justified for MVP (deferred to v2) |
| Public API / data export | ODbL share-alike obligations require a licence + privacy review gate first (deferred to v2) |
| Barcode scanning, mobile app, AI assistant, shopping integrations | PRD Phase 3; premature before the core archive exists |

## Traceability

Each requirement maps to exactly one phase. See ROADMAP.md for phase detail.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRUST-01 | Phase 1 | Pending |
| TRUST-02 | Phase 1 | Pending |
| TRUST-03 | Phase 1 | Pending |
| TRUST-04 | Phase 1 | Pending |
| TRUST-05 | Phase 1 | Pending |
| TRUST-06 | Phase 1 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 2 | Pending |
| DATA-06 | Phase 2 | Pending |
| PROD-01 | Phase 3 | Pending |
| PROD-04 | Phase 3 | Pending |
| PROD-05 | Phase 3 | Pending |
| INGR-01 | Phase 3 | Pending |
| INGR-02 | Phase 3 | Pending |
| INGR-03 | Phase 3 | Pending |
| INGR-04 | Phase 3 | Pending |
| INGR-05 | Phase 3 | Pending |
| SITE-04 | Phase 3 | Pending |
| SITE-05 | Phase 3 | Pending |
| SRCH-01 | Phase 4 | Pending |
| SRCH-02 | Phase 4 | Pending |
| SRCH-03 | Phase 4 | Pending |
| SITE-01 | Phase 4 | Pending |
| SITE-03 | Phase 4 | Pending |
| COMP-01 | Phase 5 | Pending |
| COMP-02 | Phase 5 | Pending |
| COMP-03 | Phase 5 | Pending |
| PROC-01 | Phase 5 | Pending |
| PROC-02 | Phase 5 | Pending |
| PROC-03 | Phase 5 | Pending |
| EVID-01 | Phase 6 | Pending |
| EVID-02 | Phase 6 | Pending |
| SITE-02 | Phase 6 | Pending |
| TIME-01 | Phase 7 | Pending |
| TIME-02 | Phase 7 | Pending |
| TIME-03 | Phase 7 | Pending |
| PROD-02 | Phase 7 | Pending |
| PROD-03 | Phase 7 | Pending |
| COMP-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 42 total (note: the earlier "40" count was a miscount; the enumerated list is 42)
- Mapped to phases: 42 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-30*
*Last updated: 2026-06-30 after roadmap traceability mapping*
