# Roadmap: Food Transparency UK

## Overview

Food Transparency UK is a curated, citation-first reference archive — not a web application — built fresh in Eleventy 3.x to mirror the proven conventions of the DEBT / UK Public Finances Explorer blueprint (JSON `_data/` as the single source of truth, per-record provenance, a confidence/evidence enum in `meta.json` enforced by tests, a `sources.json` catalogue, reusable Nunjucks macros, hand-rolled inline-SVG charts with a full `<table>` fallback, GOV.UK-neutral plain-English editorial, pa11y-ci WCAG 2.2 AA across every route, a `no-emdash` British-style test, ESM unit-tested tool maths, and Netlify static deploy with CSP). DEBT is the pattern to reuse, not a codebase to fork.

The journey is sequenced by the project's two highest priorities, with two long-lead editorial workstreams running in parallel underneath the phases.

**The thesis is honest about its own scope.** The universal product-page spine is the trust-rendered current-state record: every fact carries a source, confidence, evidence level and update date, and publishes only behind a per-fact verification gate. The "what it used to be vs what it is now" comparison is a **flagship layer** (PROD-05/06/07/10/11), not a promise made on every page — a genuinely sourced historical formulation exists for only ~15–20 of the 100 products. The home page frames the curated flagship collection as the then-vs-now showcase and the rest as the reference archive, and the corpus publishes its own coverage figure (PROD-13, e.g. "X of 100 products carry sourced historical context") so the gap is stated rather than implied.

First, the **foundation** (Phase 1) makes the trust layer a structural invariant before any content exists. A per-field `SourcedValue` schema carries two separate axes — evidence level and confidence — plus the provenance-completeness build gate (TRUST-05). The foundation also defines the **entity schemas** (product, ingredient, brand, additive) and the **TimelineEvent** schema with ranged dates, so ingestion has somewhere to field-tag into; it reserves the verification-status and publication-status fields the gate will later populate; and it shapes the `SourcedValue` verification sub-schema for the corroborable-vs-authoritative split. The source/rights registry, the structured allergen field, the **image-rights gate (DATA-10, default "not cleared — do not publish")**, and the **British-English + neutral-editorial CI lint (UX-06, banning superlative/denigratory framing and causal-motive verbs)** all land here, alongside a Methodology stub so every confidence/evidence badge links to a real page from day one. Per-fact metadata uses progressive disclosure (TRUST-04) so a dense page is never four metadata items repeated inline on every value.

Second — and before any product or ingredient fact reaches a published page — the **verification phase** (Phase 2) builds the claim-typed two-pass workflow and the verification-sufficiency gate. The gate is enforced **at the level of the individual fact** (VRFY-04): a page publishes its verified subset and renders every unverified fact as an explicit "not yet verified — withheld" placeholder; a fact later found `wrong` auto-withdraws (the gate is continuous, not only at publish time). Disagreements are withheld and routed to human adjudication, which resolves to **confirmed, corrected, or contested** (VRFY-11) — a genuinely contested fact publishes *with* a visible both-sides treatment, distinct from withheld. A non-resolving citation blocks publication (VRFY-07); an inaccessible pass never counts; a measure mismatch auto-raises a disagreement (VRFY-08); staleness is computed per fact class (VRFY-09); and an Open Food Facts revision-diff is a lead until a human confirms a genuine recipe change (VRFY-10). AI never adjudicates.

Content then lands in two split phases. **Phase 3a — Core entity pages + trust rendering** ships server-rendered current-state product and ingredient pages over a seed corpus, with the trust/withheld rendering component (every claim through the trust component, every unverified fact as a withheld placeholder). **Phase 3b — Site shell, accessibility, crawlability, non-expert UX** delivers the site chrome (/404, /privacy, /sources index), crawlability (sitemap.xml, robots.txt, JSON-LD), plain-English UX with inline glossary and chart-to-table fallbacks, and the **pa11y-ci automated WCAG 2.2 AA floor across every route (SITE-04)**. Splitting these keeps each phase a coherent, verifiable capability rather than one ~17-requirement mega-phase.

**Phase 4 — Then-vs-Now + corpus scale** adds the tiered flagship layer (Tier A sourced / Tier B documented-category / Tier C current-only, never fabricated), the curated editorial collection (PROD-11, neutrally framed, never metric-ranked), the **no-imputation-of-motive publication gate with mandate-vs-incentive driver tagging (PROD-08)**, the home-page framing (UX-04), the glossary index, the coverage figure (PROD-13), and the full corpus (100 products, ~200 launch-corpus ingredients). This phase **must not start until ≥ 15 Tier A products with sourced historical formulations have passed the verification gate** (entry gate below). The then-vs-now diff conveys add/remove/substitute in **text** (PROD-06), not colour or position alone.

The remaining phases make the archive findable and legible: **Phase 5 — Search & IA**; **Phase 6 — Comparison** (neutral, never a winner; ingredient count, additives, nutrition only — price and processing axes are deferred to v1.x — with a 320px responsive strategy and programmatic header associations per COMP-01, and Expectation vs Reality reusing the Phase 4 then-vs-now component); **Phase 7 — Evidence & Methodology** (parallelisable from Phase 3 onward; it depends on the foundation registry and the verification model, not on content, and the Methodology page documents the contested-fact treatment and a right-of-reply/takedown + corrections register per SITE-02); and **Phase 8 — Timeline & historic curation**, which renders the already-populated reformulation history the historic-sourcing workstream has been building since Phase 1, with explicit text gap items (TIME-03). Phase 8 **must not start until ≥ 15 products carry at least one sourced, verified timeline event** (entry gate below).

Finally, **Phase 9 — Launch Readiness** holds the two safeguard gates as hard release blockers: **GATE-01** (pre-launch media/IP solicitor review of the style guide, sample "why changed" narratives, the PROD-11 collection framing, and the image-rights ledger) and **GATE-02** (manual screen-reader + keyboard + 320px-reflow verification of the data-dense widgets — the then-vs-now diff, comparison table and timeline — pa11y-ci being the floor, not the ceiling).

The deferred v1.x surface — the **processing explorer (PROC-*)**, **price comparison/axis**, and the **ingredient long tail** beyond ~200 — is out of scope here and appears in no v1 phase.

## Workstreams

Two editorial tracks run in parallel underneath the phase sequence. They are labour, not code, and they start early because they are the long poles. Their progress is gated by **measurable numeric thresholds**, not by the adjective "twice-verified" hidden in a phase goal.

- **Historic-sourcing track (opens in Phase 1):** flagship-first hand-sourcing of historical formulations — ice cream, soft drinks, chocolate, bread — anchored to documented drivers (the 2015 ice-cream compositional rule, the 2018 Soft Drinks Industry Levy, the FSA salt 2006+ / sugar 2015+ reduction programmes). Depth comes from OFF revision-diffs (treated as leads), flagship hand-sourcing, and government programme data — **not** bulk archive crawling (Wayback is unreliable for UK supermarket product ingredient panels). **Phase 1 exit on this track is measurable:** a recorded sourcing backlog of **≥ 20 flagship targets, each with an assigned documented driver**, exists in the project data. This track feeds Phase 3a's embedded recipe-history sections, populates Tier A for Phase 4 (**entry gate: ≥ 15 Tier A products through the verification gate**), and the timelines for Phase 8 (**entry gate: ≥ 15 products with ≥ 1 sourced, verified change event**), so those phases render an already-populated dataset rather than supplying first data.
- **Verification editorial track (continuous from Phase 2 onward):** verifying ~100 products' and ~200 ingredients' worth of facts under two claim-typed passes is ongoing editorial work spanning the content phases. It runs against **per-content-phase "publishable subset" numeric targets**, with a defined disagreement-resolution path (auto-raised disagreement → withheld from publication → human adjudication → recorded verdict: confirmed / corrected / contested):
  - **Phase 3a seed:** ≥ 20 products and ≥ 40 ingredients have their core current-state facts through the gate and published, the rest shown as withheld placeholders.
  - **Phase 4 scale:** 100 products and ~200 launch-corpus ingredients reach their publishable subset; ≥ 15 carry a verified Tier A then-vs-now.
  - **Phase 8 timeline:** ≥ 15 products carry ≥ 1 verified, sourced change event.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work. Phase 3 is split into 3a and 3b because the original single phase mixed two entity-page types, the whole site shell, accessibility, crawlability and non-expert UX into one ~17-requirement block; the split keeps each phase one coherent capability.
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED).

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation — Trust Primitives, Entity & Timeline Schemas, Rights & CI** - The two-axis trust layer, the entity/TimelineEvent schemas, the source/rights registry, the image-rights default-deny gate and the British-English + neutral-editorial CI lint, as build-failing invariants before any content exists
- [ ] **Phase 2: Claim-Typed Verification, Per-Fact Publication Gate & Ingestion** - No fact publishes without the passes its claim type demands; unverified facts render as withheld placeholders; contested facts publish with a both-sides treatment; OFF data enters only as draft leads
- [ ] **Phase 3a: Core Entity Pages & Trust Rendering** - Server-rendered current-state product and ingredient pages over a seed corpus, every claim through the trust component, every unverified fact as an explicit withheld placeholder
- [ ] **Phase 3b: Site Shell, Accessibility, Crawlability & Non-Expert UX** - The site chrome, the pa11y-ci WCAG 2.2 AA floor across every route, crawlability (sitemap/robots/JSON-LD), and plain-English UX with inline glossary and chart-to-table fallbacks
- [ ] **Phase 4: Then-vs-Now Flagship Layer & Corpus Scale** - The tiered then-vs-now flagship layer (never fabricated), the curated collection, the motive gate, the coverage figure, and the 100-product / ~200-ingredient corpus — entry gate: ≥ 15 Tier A products verified
- [ ] **Phase 5: Search, Navigation & Information Architecture** - Find and browse the archive via text-relevance search and a coherent site IA
- [ ] **Phase 6: Comparison Engine (no processing)** - Neutral multi-axis comparison (ingredient count, additives, nutrition), never a winner, with a 320px strategy and the Expectation vs Reality route — price and processing deferred to v1.x
- [ ] **Phase 7: Evidence & Methodology** - Trace any claim to its primary sources and make the confidence/evidence/verification model, the contested-fact treatment and the corrections policy legible (parallelisable early)
- [ ] **Phase 8: Timeline Engine & Historic Curation** - Explore sourced recipe evolution over time with honest text gaps, fed by the historic-sourcing track — entry gate: ≥ 15 products with a verified change event
- [ ] **Phase 9: Launch Readiness — Legal & Accessibility Release Gates** - The pre-launch solicitor review (GATE-01) and the manual screen-reader / keyboard / 320px verification of the data-dense widgets (GATE-02) as hard release blockers

## Phase Details

### Phase 1: Foundation — Trust Primitives, Entity & Timeline Schemas, Rights & CI
**Goal**: The trust layer is an enforced, build-failing structural invariant built on DEBT's conventions; the product, ingredient, brand, additive and TimelineEvent entity schemas exist before any ingestion writes into them — reserving the verification-status and publication-status fields the Phase 2 gate will populate and shaping the `SourcedValue` corroborable/authoritative sub-schema; the source/rights registry, structured allergen field, image-rights default-deny gate, British-English + neutral-editorial CI lint and a Methodology stub are all in place; and the historic-sourcing editorial track opens with a measurable backlog.
**Depends on**: Nothing (first phase)
**Requirements**: TRUST-01, TRUST-02, TRUST-03, TRUST-04, TRUST-05, TRUST-06, DATA-01, DATA-02, DATA-03, DATA-04, DATA-07, DATA-09, DATA-10, DATA-11, UX-06
**Success Criteria** (what must be TRUE):
  1. The build fails with a clear error if any field designated fact-bearing (per DATA-09) is missing a source, confidence level, evidence level or update date (TRUST-05); confidence and evidence are stored and rendered as two separate labelled text values (not colour alone), and per-fact metadata uses progressive disclosure (a brief inline token, source/date/rationale behind a `<details>` or footnote reference), never four metadata items repeated inline on every value (TRUST-04).
  2. The product, ingredient, brand, additive and TimelineEvent schemas validate; they support ranged/"circa" dates (DATA-03), keep documented change / stated reason / labelled inference as separate fields (DATA-04), carry a structured 14-allergen field (DATA-07), and expose empty verification-status and publication-status fields for Phase 2 to populate; the `SourcedValue` verification sub-schema distinguishes corroborable from authoritative facts (DATA-11).
  3. A source is recorded once in the registry with its licence/rights status and a mandate-vs-incentive flag for policy drivers, and is cited by ID from many facts (DATA-01/02/TRUST-03); a regulatory fact records a GB-specific source and a checked-on date distinct from any EU/EFSA position (TRUST-06); OFF-derived values are tagged separably for ODbL.
  4. The image-rights gate blocks the build for any referenced brand image whose status is not own-photographed, explicitly cleared, or a recorded fair-dealing-for-criticism justification — the default is "not cleared — do not publish" — while brand names used as identifiers are not gated (DATA-10); a deliberately uncleared packshot fails the build.
  5. The CI lint fails the build on an em-dash, a non-en-GB spelling, a superlative/denigratory term ("worst", "scandal", "shocking") or a causal-motive verb ("to boost margins", "to cut costs") in a change narrative (UX-06); a Methodology stub page exists so every confidence/evidence badge links to a real page from day one.
  6. The historic-sourcing editorial track is open with a measurable exit: a recorded sourcing backlog of ≥ 20 flagship targets (ice cream, soft drinks, chocolate, bread), each with an assigned documented driver, exists in the project data so later phases render an already-populated dataset.
**Plans**: TBD

### Phase 2: Claim-Typed Verification, Per-Fact Publication Gate & Ingestion
**Goal**: The claim-typed two-pass verification workflow and the per-fact verification-sufficiency gate (an extension of the Phase 1 validation harness) exist and gate everything downstream: a page publishes its verified subset with every unverified fact shown as an explicit withheld placeholder, a contested fact publishes with a visible both-sides treatment, disagreements escalate to human approval, every fact carries a workflow/published status and a last-verified date, the gate is continuous (a fact found `wrong` auto-withdraws), and Open Food Facts data enters only as provenance-tagged draft leads. The continuous verification editorial track starts here.
**Depends on**: Phase 1
**Requirements**: VRFY-01, VRFY-02, VRFY-03, VRFY-04, VRFY-05, VRFY-06, VRFY-07, VRFY-08, VRFY-09, VRFY-10, VRFY-11, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. A corroborable fact (an empirical claim, e.g. a past or declared formulation) cannot publish with fewer than two confirming verifications against two distinct-lineage sources with at least one primary; an authoritative fact (what a named authority states, e.g. the current GB regulatory status) cannot publish without one authority plus an independent re-read (VRFY-01).
  2. The gate is per-fact: a test page with one verified and one unverified fact publishes the verified fact and renders the unverified one as an explicit "not yet verified — withheld" placeholder, never asserted; flipping a published fact's audit status to `wrong` automatically withdraws it on the next build (VRFY-04, continuous).
  3. A citation that does not resolve is recorded as not-found and blocks publication before any pass counts (VRFY-07); a pass returning inaccessible/not-found never satisfies the gate; and a measure/definition mismatch between two passes auto-raises a disagreement even when the values look close (VRFY-08).
  4. When passes disagree, the fact is withheld and routed to human adjudication, which resolves to exactly one of confirmed, corrected (value amended then re-verified) or contested; a fact resolved as contested publishes with a visible "contested" both-sides treatment showing each position and its sources, distinct from a withheld placeholder; AI never adjudicates and no value changes without human approval (VRFY-02/11).
  5. Every fact carries a workflow state (unverified / in-review / open-disagreement-withheld) or published state (confirmed / contested / stale / wrong) plus a last-(re-)verified date (VRFY-03); running the audit command produces a dated, worst-first audit record flagging facts past their per-class staleness threshold or whose citation no longer resolves (VRFY-05/06/09).
  6. Running ingestion imports OFF product/ingredient data into the draft store with field-level provenance (DATA-05/06); an OFF revision-diff is recorded as a lead and cannot publish as a reformulation until a human confirms a genuine recipe change (VRFY-10); draft data cannot reach a published page until it passes the gate.
**Plans**: TBD

### Phase 3a: Core Entity Pages & Trust Rendering
**Goal**: A non-expert visitor can browse server-rendered current-state product and ingredient pages over a seed corpus, with every claim rendered through the trust component and every unverified fact shown as an explicit "not yet verified — withheld" placeholder. The page can ship before every fact on it is verified — the per-fact gate is the relief valve.
**Depends on**: Phase 2 (only verified facts may publish; ingestion feeds draft content), Phase 1 (entity schemas and trust component), historic-sourcing track (the embedded recipe-history section in PROD-02/03 renders only for the Tier A products the track has delivered)
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-09, INGR-01, INGR-02, INGR-03, INGR-04
**Success Criteria** (what must be TRUE):
  1. A user can view a product page showing current ingredients, nutrition and manufacturer, each rendered through the trust component, with any unverified fact appearing as an explicit "not yet verified — withheld" placeholder rather than an asserted value (PROD-01), and the GB-regulated major allergens shown via the structured allergen field, not free text (PROD-09).
  2. A user can view an ingredient page that explains what it is and why it is used (name, synonyms, function, E-number where applicable), summarises the scientific evidence with at least one cited evidence statement carrying an evidence level or an explicit "no adequate evidence found", states the current GB regulatory position with source and checked-on date, and lists the products that contain it (INGR-01/02/03/04).
  3. A product page lists the references/sources behind its claims (PROD-04), and renders an embedded recipe-history section of recent sourced change events — each with description, source citation, possibly-ranged date and confidence (PROD-02/03) — with the link to the full timeline page shown conditionally only where a timeline page exists; this section renders correctly for the Tier A products the historic-sourcing track has delivered and is absent (not a broken stub) elsewhere.
  4. The seed publishable subset is reached: ≥ 20 products and ≥ 40 ingredients have their core current-state facts through the verification gate and published, with the remainder shown as withheld placeholders rather than blocking the pages.
**Plans**: TBD
**UI hint**: yes

### Phase 3b: Site Shell, Accessibility, Crawlability & Non-Expert UX
**Goal**: The pages from Phase 3a sit on a complete, accessible, crawlable site shell written for a non-expert audience: the chrome (/404, /privacy, /sources index), the pa11y-ci WCAG 2.2 AA automated floor across every route, crawlability (sitemap.xml, robots.txt, JSON-LD), and plain-English UX with inline glossary terms and chart-to-table fallbacks.
**Depends on**: Phase 3a (pages to host and make accessible)
**Requirements**: SITE-04, SITE-05, SITE-07, SITE-08, UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Every route passes pa11y-ci WCAG 2.2 AA as the automated floor (semantic HTML, keyboard navigable, 4.5:1 contrast, visible focus, 44px targets, no information by colour alone), mobile-first (SITE-04).
  2. Product and ingredient pages are server-rendered/static and crawlable: the build generates sitemap.xml and robots.txt and embeds JSON-LD structured data so external citations resolve to indexable, machine-readable pages (SITE-05); a /sources index lists every registry record, filterable by publisher and source type, linking to each source URL (SITE-08); and /404 and /privacy (UK GDPR + PECR) pages exist (SITE-07).
  3. Pages are written in plain English (GOV.UK-style, neutral, fact kept separate from interpretation) so a reader who has only heard of "UPF" can follow them (UX-01), and unfamiliar terms (additives, processing terms, E-numbers) are defined inline via a glossary-term component (UX-02).
  4. Every chart/visualisation has a full server-rendered data-table fallback that conveys the widget's *relationships* in text — not merely a list of values — with no information by chart or colour alone (UX-03).
**Plans**: TBD
**UI hint**: yes

### Phase 4: Then-vs-Now Flagship Layer & Corpus Scale
**Goal**: The tiered then-vs-now comparison is delivered as a flagship layer on the products where a historical formulation is genuinely sourceable — not a claim made on every page — the curated editorial collection gives the non-expert a way in, the no-imputation-of-motive gate protects the "why", the corpus publishes its own coverage figure, and the full corpus (100 products, ~200 launch-corpus ingredients) plus the glossary index ship. A former recipe is never inferred or fabricated.
**Depends on**: Phase 3a/3b (page templates, trust rendering, site shell), historic-sourcing track. **Entry gate: this phase must not start until ≥ 15 Tier A products with sourced historical formulations have passed the verification gate.**
**Requirements**: PROD-05, PROD-06, PROD-07, PROD-08, PROD-10, PROD-11, PROD-12, PROD-13, INGR-05, UX-04, UX-05
**Success Criteria** (what must be TRUE):
  1. For a Tier A product the page presents a "traditional vs current formulation" view as a primary section near the top (PROD-05); it conveys additions, removals and substitutions by leading text labels ("Removed:", "Added:", "Replaced X with Y"), never by colour, position or strikethrough alone — a linearised change list is the no-JS baseline and the aligned two-column view is progressive enhancement (PROD-06) — and each difference carries at least one cited source (PROD-07).
  2. Each product carries and renders a history-completeness state — (A) sourced historical formulation, (B) category-level reformulation documented with a driver, (C) current-only with an explicit "no sourced historical formulation recorded for this product" — and a product without a sourced former recipe is shown as (B) or (C), never given an invented former recipe (PROD-10).
  3. Where the change-record fields are populated, documented change, stated reason and labelled inference display with their labels (PROD-08); a no-imputation-of-motive gate blocks publication of any change narrative asserting a commercial or cynical motive as fact — a cynical-motive narrative fails the gate — and a "mandate" driver may be stated as cause while an "incentive/voluntary" driver (e.g. the 2018 SDIL, the FSA salt/sugar programmes) may appear only as context or attributed statement.
  4. A user can browse a curated editorial collection of well-documented formulation changes, framed neutrally ("significant, well-documented changes", never "most transformed"/"worst offenders") and not ordered by any computed transformation metric (PROD-11); a first-time visitor reaches a concrete then-vs-now example within one step of the home page, which frames the flagship collection as the showcase and the rest as the reference archive (UX-04).
  5. The MVP publishes pages for ≥ 100 UK packaged products (from a curated list agreed and recorded before the content phase, PROD-12) and the ~200 ingredients in the launch corpus, each fully verified (INGR-05); the site publishes its own coverage figure (e.g. "X of 100 products carry sourced historical context", PROD-13); and a /glossary page lists all defined terms alphabetically, machine-generated from the same source as the inline glossary terms (UX-05).
**Plans**: TBD
**UI hint**: yes

### Phase 5: Search, Navigation & Information Architecture
**Goal**: Users can find and browse content across the whole archive via text-relevance search and a coherent site navigation.
**Depends on**: Phase 3a (pages to index and link), Phase 3b (site shell)
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SITE-01, SITE-03
**Success Criteria** (what must be TRUE):
  1. A user can search across products, ingredients and brands from any page, including additive E-number synonyms, with results linking to the relevant product, ingredient or brand page (SRCH-01).
  2. Search results are ordered by text-relevance only — never by health, quality or processing characteristics — and can be filtered/faceted, e.g. by category (SRCH-02/03).
  3. The site provides the full navigation/IA: Home, Search, Products, Ingredients, Brands, Categories, Timelines, Evidence, Methodology, About (SITE-01).
  4. A user can browse products by brand and by category, with brand pages being filtered product lists only for v1 (SITE-03).
**Plans**: TBD
**UI hint**: yes

### Phase 6: Comparison Engine (no processing)
**Goal**: Users can compare products neutrally across ingredient count, additives and nutrition — never reduced to a "winner" — with a standalone Expectation vs Reality route that reuses the Phase 4 then-vs-now component. Price and processing axes are deferred to v1.x and are not built here.
**Depends on**: Phase 3a (normalised product data), Phase 4 (the then-vs-now component and Tier A snapshots that COMP-04 reuses)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. A user can compare two or more products side by side; any current-formulation/nutrition value rendered carries an authoritative-verified status (VRFY-01) first (COMP-01), and the comparison covers ingredient count, additives and nutrition (COMP-02).
  2. The comparison uses a defined 320px responsive strategy (a labelled horizontal-scroll region or stacked per-product cards) and programmatic header associations (scope/headers), with per-cell provenance behind progressive disclosure rather than inline metadata on every cell (COMP-01/03).
  3. The comparison presents differences neutrally, never emits an overall "winner" ranking, and renders any "certainty differs" flag as text, not a coloured cell or icon alone (COMP-03).
  4. A dedicated "Expectation vs Reality" page at a permanent URL distinct from the product page contrasts a product's recorded original recipe with its current formulation, reusing the PROD-05/06 then-vs-now component and timeline snapshots, with sources (COMP-04).
**Plans**: TBD
**UI hint**: yes

### Phase 7: Evidence & Methodology
**Goal**: Users can trace any claim to its primary sources and read an honest account of the confidence/evidence model, the verification model, the contested-fact treatment and the corrections policy. This phase finalises the Phase 1 Methodology stub; it depends on the foundation registry and the verification model rather than on content, so it can run in parallel with Phases 3–6.
**Depends on**: Phase 1 (source registry, Methodology stub), Phase 2 (the verification model and contested-fact treatment it documents)
**Requirements**: EVID-01, EVID-02, SITE-02
**Success Criteria** (what must be TRUE):
  1. A user can view an evidence page that links a claim to its primary sources and its evidence level (EVID-01).
  2. An evidence page explains the basis behind a claim, the evidence-level rationale (TRUST-02) and any caveats on the cited sources (EVID-02).
  3. A user can read a Methodology page that explains sourcing, the confidence/evidence model, the verification model stated honestly (source-axis independence; human/AI or blinded-same-human passes, not two independent reviewers), the contested-fact treatment, and the limits of automated accessibility testing; it publishes a corrections policy with a right-of-reply / takedown process (named contact, target response time) backed by a dated corrections register, and accurately reflects the schema enums and gate rules (SITE-02).
**Plans**: TBD
**UI hint**: yes

### Phase 8: Timeline Engine & Historic Curation
**Goal**: Users can explore a product's sourced formulation-change history over time with honest, explicit text gaps, fed by the historic-sourcing track that has run since Phase 1, and find every product that has a timeline via a /timelines index.
**Depends on**: Phase 1 (TimelineEvent schema), Phase 3a (product pages and the embedded recipe-history section), historic-sourcing track. **Entry gate: this phase must not start until ≥ 15 products carry at least one sourced, verified timeline event.**
**Requirements**: TIME-01, TIME-02, TIME-03, SITE-06
**Success Criteria** (what must be TRUE):
  1. A dedicated timeline page per product shows all sourced formulation-change events in chronological order as an ordered list (the server-rendered baseline); any SVG timeline is visual enhancement only (TIME-01).
  2. Each timeline event cites its source and shows its possibly-ranged date and confidence as text, rendering uncertainty rather than false precision (TIME-02).
  3. Where no sourced events exist for a period, the timeline renders an explicit text list item in chronological position ("no sourced changes recorded for this period"), never an implied continuity conveyed by spacing or a faded region alone (TIME-03).
  4. A /timelines index lists every product that has at least one sourced change event, linking to each product's timeline page (SITE-06).
**Plans**: TBD
**UI hint**: yes

### Phase 9: Launch Readiness — Legal & Accessibility Release Gates
**Goal**: The two safeguard gates are satisfied as hard release blockers before public launch: an external solicitor sign-off on the legal-exposure surface, and a manual assistive-technology pass over the data-dense widgets that pa11y-ci cannot fully cover.
**Depends on**: Phase 4 (motive narratives, PROD-11 framing, then-vs-now diff), Phase 6 (comparison table), Phase 8 (timeline), Phase 7 (corrections policy / methodology) — all the surfaces the gates review must exist first.
**Requirements**: GATE-01, GATE-02
**Success Criteria** (what must be TRUE):
  1. Before public launch, a media/IP solicitor has reviewed the editorial style guide, a representative sample of "why changed" narratives, the PROD-11 collection framing and the image-rights ledger, and a recorded sign-off exists; launch is blocked until that sign-off is recorded (GATE-01).
  2. The then-vs-now diff, the comparison table and the timeline have each been manually verified with at least one screen reader (NVDA or VoiceOver), keyboard-only, and at 320px reflow, with the result recorded as a release-checklist item; pa11y-ci is treated as the floor, not the ceiling (GATE-02).
  3. A failing solicitor review or a failed manual AT check on any data-dense widget blocks the release until remediated and re-checked.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3a → 3b → 4 → 5 → 6 → 7 → 8 → 9. Phase 7 (Evidence & Methodology) is parallelisable from Phase 3a onward. Phase 4 and Phase 8 each carry an explicit numeric **entry gate** (≥ 15 verified Tier A products; ≥ 15 products with a verified change event) and must not start until it is met. The historic-sourcing and verification editorial workstreams run continuously underneath the content phases against the numeric "publishable subset" targets in the Workstreams section. GATE-02 (manual AT verification) is referenced as a release check on the Phase 4 diff, Phase 6 comparison and Phase 8 timeline, but is consolidated and enforced as a hard launch blocker in Phase 9.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Trust Primitives, Entity & Timeline Schemas, Rights & CI | 0/TBD | Not started | - |
| 2. Claim-Typed Verification, Per-Fact Publication Gate & Ingestion | 0/TBD | Not started | - |
| 3a. Core Entity Pages & Trust Rendering | 0/TBD | Not started | - |
| 3b. Site Shell, Accessibility, Crawlability & Non-Expert UX | 0/TBD | Not started | - |
| 4. Then-vs-Now Flagship Layer & Corpus Scale | 0/TBD | Not started | - |
| 5. Search, Navigation & Information Architecture | 0/TBD | Not started | - |
| 6. Comparison Engine (no processing) | 0/TBD | Not started | - |
| 7. Evidence & Methodology | 0/TBD | Not started | - |
| 8. Timeline Engine & Historic Curation | 0/TBD | Not started | - |
| 9. Launch Readiness — Legal & Accessibility Release Gates | 0/TBD | Not started | - |

## Research Flags

Phases needing a deeper research pass during planning (`/gsd:plan-phase --research-phase`):

- **Phase 8 — historic curation scope and sources:** the historic-sourcing workstream (open since Phase 1) is the long pole. Depth comes from OFF revision-diffs treated as leads, flagship hand-sourcing, and government programme data, not bulk Wayback crawling (unreliable for UK supermarket ingredient panels). Map flagship coverage and supplementary sources before scoping Phase 8 in detail, and confirm the ≥ 15-product entry gate is reachable.

**Deferred research (NOT a v1 phase):**
- **Processing-dimension taxonomy** was previously a Phase 6 research flag. The processing explorer (PROC-*) is now **deferred to v1.x**, so this is no longer a v1 roadmap concern — there is no authoritative UK multi-dimensional processing taxonomy yet, which is exactly why it is deferred. It is tracked in REQUIREMENTS.md under "v2 / v1.x".

Phases with well-established patterns (skip research): Phases 1, 2, 3a, 3b, 4, 5, 6, 7, 9.

### Cross-phase data dependencies

A one-phase requirement mapping is **not** one-phase independence. Some requirements are owned by one phase but depend on data produced by another phase or an editorial workstream:

- **PROD-02/03** (embedded recipe-history) are owned by Phase 3a but their data comes from the historic-sourcing workstream and they link to Phase 8 timeline pages — the section renders only for the Tier A products the track has delivered, and the timeline link is conditional on a timeline page existing.
- **PROD-05/06/07/10/11** (Phase 4) depend on the historic-sourcing track having pushed ≥ 15 Tier A products through the verification gate (the Phase 4 entry gate).
- **COMP-04** (Phase 6) reuses the Phase 4 then-vs-now component and Tier A snapshots.
- **TIME-* / SITE-06** (Phase 8) depend on ≥ 15 products carrying a verified change event (the Phase 8 entry gate).
- **GATE-02** (Phase 9) reviews widgets built in Phases 4, 6 and 8; **GATE-01** reviews narratives, framing and the image ledger from Phases 4 and 1.

### Research-to-roadmap phase mapping

The research files (SUMMARY.md, ARCHITECTURE.md, PITFALLS.md) used an original 4-phase numbering. It maps to this roadmap as follows, to prevent mis-routing:

| Research phase | Roadmap phase(s) |
|----------------|------------------|
| Research Phase 1 — Foundation (trust primitives, schema gate, rights) | Phase 1 |
| Research Phase 2 — Core Content Architecture (entity vocabularies, product/ingredient pages, OFF ingestion, search) | Phase 2 (verification + ingestion), Phase 3a (core pages), Phase 3b (shell/a11y/crawl/UX), Phase 4 (scale), Phase 5 (search) |
| Research Phase 3 — Interactive Discovery Engines (comparison, evidence, Expectation vs Reality; processing now deferred to v1.x) | Phase 6 (comparison + ExR), Phase 7 (evidence) |
| Research Phase 4 — Timeline Engine & Historic Curation | Phase 8 |
| (new) Legal & accessibility release gates | Phase 9 |
