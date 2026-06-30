# Roadmap: Food Transparency UK

## Overview

Food Transparency UK is a curated, citation-first reference archive, not a web application. The journey begins by making the trust layer a structural invariant — a `SourcedValue<T>` schema, an Ajv build-fail gate, a source/rights registry, and an editorial style guide — so that no fact can ever be authored or rendered without a source, confidence level, evidence level and update date. With that foundation locked, an offline ingestion pipeline pulls Open Food Facts data as provenance-tagged drafts; curators promote verified facts into product and ingredient pages; search, browse and the navigation/IA make the archive findable; the comparison and processing engines turn the sourced facts into neutral, multi-dimensional views; evidence and methodology pages make the trust model legible; and finally the timeline engine and historic curation deliver the flagship reformulation history. The stack is settled: Eleventy 3.x with a flat git-versioned JSON store, Pagefind for static search, and no database at MVP scale. The deferred v2 surface (public API, journalist export, community submissions) sits behind a licence and privacy review gate and is out of scope here.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation — Trust Primitives, Schema Gate & Rights Infrastructure** - The trust layer as an enforced, build-failing structural invariant before any content exists
- [ ] **Phase 2: Ingestion & Sourcing Pipeline** - Offline import of Open Food Facts data as provenance-tagged draft leads, never as authority
- [ ] **Phase 3: Core Content — Product & Ingredient Pages** - Sourced, accessible, crawlable pages for 100 products and 500 ingredients
- [ ] **Phase 4: Search, Navigation & Information Architecture** - Find and browse the archive via search and a coherent site IA
- [ ] **Phase 5: Comparison & Processing Explorer** - Neutral multi-axis product comparison and multi-dimensional processing, never a single score
- [ ] **Phase 6: Evidence & Methodology** - Trace any claim to its primary sources and make the confidence/evidence model legible
- [ ] **Phase 7: Timeline Engine & Historic Curation** - Explore recipe evolution over time with honest uncertainty, plus Expectation vs Reality

## Phase Details

### Phase 1: Foundation — Trust Primitives, Schema Gate & Rights Infrastructure
**Goal**: The trust layer is an enforced structural invariant — every fact-bearing field must carry source, confidence level, evidence level and update date — and the source/rights registry plus editorial-neutrality infrastructure exist before any content is authored.
**Depends on**: Nothing (first phase)
**Requirements**: TRUST-01, TRUST-02, TRUST-03, TRUST-04, TRUST-05, TRUST-06, DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. The build fails with a clear error if any fact-bearing field is missing a source, confidence level, evidence level, or update date.
  2. A sample rendered fact shows its source(s), a confidence level and an evidence level as two distinct labelled text values (not colour alone), plus a last-updated date.
  3. A source can be recorded once in the registry with its licence/rights status and cited by ID from many facts; Open Food Facts-derived values are tagged separately so they stay auditable and segregable (ODbL).
  4. A date can be stored as a ranged or "circa" value, and a recipe-change record keeps documented change, manufacturer's stated reason, and labelled analyst inference as separate fields (motive is never stored as fact).
  5. A regulatory fact records a GB-specific source and a checked-on date, distinct from the EU/EFSA position.
**Plans**: TBD

### Phase 2: Ingestion & Sourcing Pipeline
**Goal**: An offline pipeline imports Open Food Facts (and other) data as provenance-tagged draft leads with raw artefacts captured, pending curator verification against a primary source — never published as authority.
**Depends on**: Phase 1
**Requirements**: DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. Running the ingestion process imports Open Food Facts product/ingredient data into the draft store with provenance tagged at field level (evidence: tertiary, confidence: medium).
  2. Imported data stays in a draft state and cannot reach a published page until a curator verifies it against a primary source.
  3. Each ingested value retains its raw source artefact and capture timestamp, so any value can be reproduced from its evidence.
**Plans**: TBD

### Phase 3: Core Content — Product & Ingredient Pages
**Goal**: Users can browse correctly-sourced product and ingredient pages for the MVP corpus, every fact carrying its provenance, on crawlable, accessible pages.
**Depends on**: Phase 1 (Phase 2 ingestion feeds draft content)
**Requirements**: PROD-01, PROD-04, PROD-05, INGR-01, INGR-02, INGR-03, INGR-04, INGR-05, SITE-04, SITE-05
**Success Criteria** (what must be TRUE):
  1. A user can view a product page showing current ingredients, nutrition (per 100g) and manufacturer, with every value showing its source.
  2. A user can view an ingredient page explaining what it is, why it is used, its scientific evidence (with citations) and its current GB regulatory position with a checked-on date, plus a list of products that contain it.
  3. The MVP covers 100 product pages and 500 ingredient pages, each listing the references/sources behind its claims.
  4. Product and ingredient pages are server-rendered/static and crawlable, so an external citation resolves to an indexable page.
  5. All shipped pages pass automated WCAG 2.2 AA checks (semantic HTML, keyboard navigable, 4.5:1 contrast, visible focus, 44px targets), mobile-first.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Search, Navigation & Information Architecture
**Goal**: Users can find and browse content across the whole archive via full-text search and a coherent site navigation.
**Depends on**: Phase 3
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SITE-01, SITE-03
**Success Criteria** (what must be TRUE):
  1. A user can search across products, ingredients and brands from any page (including additive E-number synonyms) and get ranked results linking to the relevant pages.
  2. A user can filter/facet search results (e.g. by category).
  3. The site provides the full navigation/IA: Home, Search, Products, Ingredients, Brands, Categories, Timelines, Evidence, Methodology, About.
  4. A user can browse products by brand and by category.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Comparison & Processing Explorer
**Goal**: Users can compare products neutrally across multiple axes and explore processing as multiple named dimensions, never reduced to a single score.
**Depends on**: Phase 3
**Requirements**: COMP-01, COMP-02, COMP-03, PROC-01, PROC-02, PROC-03
**Success Criteria** (what must be TRUE):
  1. A user can compare two or more products side by side across ingredient count, additives, nutrition (per 100g), processing characteristics and price.
  2. The comparison presents differences neutrally, flags where axes differ in certainty, and never declares an overall "winner".
  3. A user can view a product's processing characteristics across multiple named dimensions, each showing its source and the basis for its classification, with no composite score anywhere.
  4. The comparison and processing widgets each pass automated WCAG 2.2 AA checks, are keyboard operable, and offer a text-equivalent representation of the data.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Evidence & Methodology
**Goal**: Users can trace any claim to its primary sources and learn how the confidence/evidence model and uncertainty are represented.
**Depends on**: Phase 3
**Requirements**: EVID-01, EVID-02, SITE-02
**Success Criteria** (what must be TRUE):
  1. A user can view an evidence page that links a claim to its primary sources and evidence level.
  2. An evidence page explains the basis and any uncertainty behind a claim in plain language.
  3. A user can read a Methodology page that explains sourcing, the confidence/evidence model and how uncertainty is represented, and it accurately mirrors what the system does.
**Plans**: TBD
**UI hint**: yes

### Phase 7: Timeline Engine & Historic Curation
**Goal**: Users can explore how a product's formulation changed over time, with honest uncertainty, and contrast a traditional recipe with the current one.
**Depends on**: Phase 3 (TimelineEvent schema exists from Phase 1; historic curation runs as a parallel editorial track from Phase 3 onwards)
**Requirements**: TIME-01, TIME-02, TIME-03, PROD-02, PROD-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. A user can view a product's timeline of formulation changes over time, and the product page shows its recipe evolution (what changed and when, with sources).
  2. Each timeline event cites its source and shows its (possibly ranged or "circa") date and confidence, rendering uncertainty rather than false precision.
  3. Timeline gaps are shown honestly via a per-product history-completeness indicator (absence of evidence is not presented as "no change").
  4. A user can view an "Expectation vs Reality" comparison contrasting a traditional recipe with the current formulation, with sources.
  5. The timeline widget passes automated WCAG 2.2 AA checks and is keyboard operable.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Trust Primitives, Schema Gate & Rights Infrastructure | 0/TBD | Not started | - |
| 2. Ingestion & Sourcing Pipeline | 0/TBD | Not started | - |
| 3. Core Content — Product & Ingredient Pages | 0/TBD | Not started | - |
| 4. Search, Navigation & Information Architecture | 0/TBD | Not started | - |
| 5. Comparison & Processing Explorer | 0/TBD | Not started | - |
| 6. Evidence & Methodology | 0/TBD | Not started | - |
| 7. Timeline Engine & Historic Curation | 0/TBD | Not started | - |

## Research Flags

Phases needing a deeper research pass during planning (`/gsd:plan-phase --research-phase`):

- **Phase 5 — processing-dimension taxonomy:** no single authoritative source defines the correct multi-dimensional processing model for UK food. Stub `ProcessingProfile` with a small initial set in Phase 3; treat the taxonomy as a research deliverable before Phase 5 is planned in detail. Risk: wrong taxonomy forces a remodel of all product records.
- **Phase 7 — historic curation scope and sources:** map Wayback coverage for the target 100 products by category and identify supplementary sources (packaging collections, newspaper archives, Which?/ONS reporting) before scoping. Historic data is the long-lead constraint; the UI can ship before there is enough data to demonstrate the feature's value.

Phases with well-established patterns (skip research): Phases 1, 2, 3, 4, 6.
