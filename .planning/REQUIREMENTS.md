# Requirements: Food Transparency UK

**Defined:** 2026-06-30
**Core Value:** Every published fact is traceable to a primary source, independently verified to a standard matched to the claim, and honest about its uncertainty — transparency over persuasion.

## v1 Requirements

Requirements for the MVP release. Each maps to roadmap phases during roadmap creation.

### Trust Layer

- [x] **TRUST-01**: Every fact-bearing field (as designated by DATA-09) carries at least one cited source, a confidence level, an evidence level, and a last-updated date
- [x] **TRUST-02**: Confidence and evidence are two separate fields — (a) evidence level: the strength of the underlying scientific/regulatory evidence for the claim, on a four-point scale (High / Moderate / Low / Very Low, GRADE convention); (b) confidence level: the curator's certainty that this specific record is correct and current, on the same four-point scale. Source type (primary/secondary/tertiary/grey) lives in the source registry (DATA-01), not here
- [x] **TRUST-03**: A reader can see the source(s) behind any displayed claim (inline citation referencing the source record)
- [x] **TRUST-04**: A reader can see the confidence level, evidence level and last-updated date for any displayed claim, expressed as text (colour-independence per SITE-04); per-fact metadata uses progressive disclosure — a brief inline text token for confidence/evidence, with source/date/rationale behind footnote-style references to the page's sources section or a `<details>` element — never four metadata items repeated inline on every value on a dense page
- [x] **TRUST-05**: Provenance-completeness gate — the build fails if any fact-bearing field is missing a source, confidence level, evidence level, or update date
- [x] **TRUST-06**: Regulatory facts record a GB-specific source and a checked-on date (the EU/EFSA position is not assumed to be the GB/FSA position)

### Verification

- [ ] **VRFY-01**: A fact is publishable only when verified to the standard matched to its claim type: a **corroborable** fact (an empirical claim about the world, e.g. a past or declared formulation) requires two confirming verifications against two distinct-lineage sources, at least one primary; an **authoritative** fact (what a named authority states, e.g. current GB regulatory status, or the current official label) requires one authority plus an independent re-read for transcription fidelity
- [ ] **VRFY-02**: When the recorded verifications disagree, the fact is withheld from publication and routed to human adjudication, which resolves to exactly one of: confirmed, corrected (value amended then re-verified), or contested (see VRFY-11); AI may never adjudicate a disagreement, and no value changes without human approval
- [ ] **VRFY-03**: Every fact carries a verification status — workflow states (unverified / in-review / open-disagreement-withheld) and published states (confirmed / contested / stale / wrong) — plus the date it was last (re-)verified
- [ ] **VRFY-04**: Verification-sufficiency gate, enforced at the level of the individual fact: a fact is published only if it has the passes its claim type requires, has no open disagreement, and no pass returned inaccessible / not-found (an inaccessible source never satisfies a pass). A page publishes its verified subset; any unverified or withheld fact is rendered as an explicit "not yet verified — withheld" placeholder, never asserted. A fact whose audit status later becomes `wrong` is automatically withheld (the gate is continuous, not only at publish time)
- [ ] **VRFY-05**: A reviewer can invoke a re-verification audit command that, for each published fact, outputs its status, the recorded verdicts, and flags facts whose last-verified date exceeds their staleness threshold or whose citation no longer resolves; results are written to a dated audit record in the VRFY-06 format
- [ ] **VRFY-06**: The audit record lists each fact's status, the recorded verdicts, and disagreements ordered worst-first (wrong → uncertain → stale, then oldest last-verified first); no value changes without human approval
- [ ] **VRFY-07**: Every recorded citation passes an automated existence/resolves check (URL/DOI) before any verification pass counts; a citation that does not resolve is recorded as not-found and blocks publication
- [ ] **VRFY-08**: Each verification pass records the exact measure/definition it checked (e.g. "per 100g as sold", "GB legal status 2026"); a measure mismatch between passes auto-raises a disagreement even when the values look close
- [ ] **VRFY-09**: Each published fact carries a staleness threshold (a small set of global classes for v1 — e.g. regulatory vs current vs historical); the VRFY-05 audit flags exceeded thresholds for re-verification
- [ ] **VRFY-10**: An Open Food Facts revision-diff (or similar import signal) is treated as a lead, not a verified reformulation; a detected change must be human-confirmed as a genuine recipe change (not a record correction) before it can publish as a reformulation
- [ ] **VRFY-11**: A genuinely contested fact (two credible authorities durably disagree, resolved by a human as contested rather than as a transcription error) is publishable with a visible "contested" treatment showing both positions with their sources — distinct from "unverified — withheld". This is how genuine disputes are shown honestly rather than hidden
- [ ] **VRFY-12**: A fact past its staleness threshold renders a visible, reader-facing "last verified {date} — review due" indicator, not only an internal audit flag

### Data Model & Sourcing

- [x] **DATA-01**: A source registry stores each source as a citable record (id, name, publisher, URL/reference, what it covers, update frequency, retrieved date, source type [primary/secondary/tertiary/grey], licence/rights, and for policy drivers a mandate-vs-incentive flag), mirroring DEBT's sources.json
- [ ] **DATA-02**: Each source record carries its licence and rights status so re-use obligations (e.g. ODbL attribution/share-alike) are auditable
- [x] **DATA-03**: Dates support ranged/uncertain values (e.g. "circa 2015", "between 2012 and 2014") rather than forcing false precision
- [x] **DATA-04**: Recipe-change records separate documented change, manufacturer's stated reason, and labelled analyst inference — motive is never stored as fact
- [ ] **DATA-05**: Open Food Facts and other imported data are stored as unverified leads (draft) until verified, never as authority
- [ ] **DATA-06**: An ingestion process can import product/ingredient data from Open Food Facts into the draft store with provenance tagged at field level
- [x] **DATA-07**: The product schema includes a structured allergen record — a typed field per GB-regulated major allergen (the 14) — distinct from the free-text ingredients list
- [x] **DATA-09**: The schema designates each field as fact-bearing (makes an empirical claim; subject to the trust layer) or metadata (structural/administrative; exempt); the designation lives in the schema and is enforced by TRUST-05
- [x] **DATA-10**: Every image (product packaging, logos, historic labels, packshots) defaults to rights status "not cleared — do not publish"; the build blocks any referenced brand image unless it is an own-photographed artefact, has an explicit cleared licence, or carries a recorded, reviewed fair-dealing-for-criticism justification. Brand names used as identifiers are not images and are not gated here
- [x] **DATA-11**: The product, ingredient, brand and additive entity schemas and the TimelineEvent schema (with ranged dates and the DATA-04 separation) are defined in the foundation, before ingestion writes into them, and reserve verification-status and publication-status fields for the verification gate to populate

### Product Pages

- [ ] **PROD-01**: A user can view a product page showing current ingredients, nutrition, and manufacturer; each fact is rendered through the trust component, and any unverified fact appears as an explicit "not yet verified — withheld" placeholder rather than an asserted value
- [ ] **PROD-02**: A product page includes an embedded recipe-history section showing recent sourced change events and linking to the full timeline page where one exists
- [ ] **PROD-03**: Each change event displays its description, source citation, (possibly ranged) date and confidence level
- [ ] **PROD-04**: A product page lists the references/sources behind its claims
- [ ] **PROD-05**: For a product with a sourced historical formulation (Tier A), the product page presents a "traditional vs current formulation" view as a primary section near the top
- [ ] **PROD-06**: The traditional-vs-current view conveys additions, removals and substitutions by leading text labels ("Removed:", "Added:", "Replaced X with Y"), never by colour, position or strikethrough alone; a linearised change list is the server-rendered no-JS baseline and the aligned two-column view is progressive enhancement
- [ ] **PROD-07**: Each ingredient difference in the traditional-vs-current view carries at least one cited source
- [ ] **PROD-08**: Where the DATA-04 change-record fields are populated, documented change, stated reason and labelled inference are displayed with their labels. A no-imputation-of-motive gate blocks publication of any change narrative that asserts a commercial or cynical motive as fact; a "why" is publishable only as cited regulatory context, an attributed manufacturer statement, or labelled opinion with its basis shown. A driver tagged "mandate" (legally compelled the change) may be stated as cause; a driver tagged "incentive/voluntary" (e.g. the 2018 SDIL, the FSA salt/sugar programmes) may appear only as context or attributed statement
- [ ] **PROD-09**: A product page displays the GB-regulated major allergens present, via the structured allergen field (DATA-07), not free text
- [ ] **PROD-10**: Each product carries a history-completeness / evidence-tier state — (A) sourced historical formulation; (B) reformulation documented at category level with a driver, but former per-product recipe not individually sourced; (C) current-only — rendered as a deliberate, sourced state (Tier C shows an explicit "no sourced historical formulation recorded for this product"); a former recipe is never inferred or fabricated to satisfy the template
- [ ] **PROD-11**: A user can browse a curated editorial collection of products illustrating significant, well-documented formulation changes — selected and explained with sources, framed neutrally ("significant, well-documented changes", never "most transformed" / "worst offenders"), and not ordered by any computed transformation metric — as a non-expert entry point
- [ ] **PROD-12**: The MVP publishes product pages for a curated launch corpus (target ~100 UK packaged food products, re-derived from the Phase 1 sourcing spike — see SPIKE-01), drawn from a recorded list agreed before the content phase
- [ ] **PROD-13**: The site publishes its own coverage figure (e.g. "X of N published products carry sourced historical context") so the corpus is honest about its own gaps rather than implying every product has a then-vs-now history
- [ ] **PROD-14**: The launch corpus and the Tier A flagship set follow recorded, named selection criteria (e.g. UK market ubiquity, coverage across the flagship anchor categories, sourceability of a historical formulation for Tier A) with a one-line recorded rationale per product; selection is never by a computed transformation metric

### Ingredient Explorer

- [ ] **INGR-01**: An ingredient page explains what it is and why it is used — name, common synonyms, function in food (at least one sentence), and E-number where applicable
- [ ] **INGR-02**: An ingredient page may state an authoritative body's published position on the ingredient (e.g. an FSA/EFSA/SACN safety opinion or regulatory status), cited and dated. It does NOT synthesise primary scientific studies into health-effect claims — health-effect evidence synthesis is deferred to v1.x (see deferred list). Any single study may appear only as labelled illustration, never as an evidence statement
- [ ] **INGR-03**: An ingredient page states the current UK/GB regulatory position, with source and checked-on date
- [ ] **INGR-04**: An ingredient page lists products that contain the ingredient
- [ ] **INGR-05**: The MVP covers the ingredients that appear in the 100-product launch corpus (approximately 200), each fully verified; the long tail of ingredients is deferred to v1.x (deep before broad)

### Search

- [ ] **SRCH-01**: A user can search across products, ingredients and brands from any page, including additive E-number synonyms
- [ ] **SRCH-02**: Search returns results ordered by text-relevance (never by health, quality or processing characteristics), linking to the relevant product, ingredient or brand page
- [ ] **SRCH-04**: The search index is built solely from published rendered output; withheld/unverified facts and the draft/lead store are never indexed
- [ ] **SRCH-03**: A user can filter/facet search results (e.g. by category)

### Comparison Engine

- [ ] **COMP-01**: A user can compare two or more products side by side; any current-formulation/nutrition value shown carries an authoritative-verified status (VRFY-01) before it renders. The comparison specifies a 320px responsive strategy (a labelled horizontal-scroll region or stacked per-product cards) and uses programmatic header associations (scope/headers)
- [ ] **COMP-02**: The comparison shows ingredient count, additives and nutrition (price and processing axes are deferred to v1.x)
- [ ] **COMP-03**: The comparison presents differences neutrally, never emits an overall "winner" ranking, and renders any "certainty differs" flag as text (not a coloured cell or icon alone); per-cell provenance uses progressive disclosure rather than inline metadata on every cell. A contested value (VRFY-11) renders a "contested" marker linking to the both-sides treatment on the product page, and is never silently collapsed to one side
- [ ] **COMP-04**: A dedicated "Expectation vs Reality" page contrasts a product's recorded original recipe with its current formulation, reusing the PROD-05/06 then-vs-now component and timeline snapshots, with sources, at a permanent URL distinct from the product page

### Timeline Engine

- [ ] **TIME-01**: A dedicated timeline page per product shows all sourced formulation-change events in chronological order, as an ordered list (the server-rendered baseline); any SVG timeline is visual enhancement
- [ ] **TIME-02**: Each timeline event cites its source and shows its (possibly ranged) date and confidence, as text
- [ ] **TIME-03**: Where no sourced events exist for a period, the timeline renders an explicit text list item in chronological position ("no sourced changes recorded for this period"), never an implied continuity conveyed by spacing or a faded region alone

### Evidence Pages

- [ ] **EVID-01**: A user can view an evidence page that links a claim to its primary sources and evidence level
- [ ] **EVID-02**: An evidence page explains the basis behind a claim, the evidence-level rationale (TRUST-02), and any caveats on the cited sources

### Site & Information Architecture

- [ ] **SITE-01**: The site provides the navigation/IA: Home, Search, Products, Ingredients, Brands, Categories, Timelines, Evidence, Methodology, About
- [ ] **SITE-02**: A Methodology page explains sourcing, the confidence/evidence model, the verification model stated honestly (source-axis independence; human/AI or blinded-same-human passes, not two independent reviewers), the contested-fact treatment, and the limits of automated accessibility testing; it publishes a corrections policy with a right-of-reply / takedown process (named contact, target response time) backed by a dated corrections register, and accurately reflects the schema enums and gate rules
- [ ] **SITE-03**: A user can browse products by brand and by category (brand pages are filtered product lists only for v1)
- [ ] **SITE-04**: All pages meet WCAG 2.2 AA (semantic HTML, keyboard navigable, 4.5:1 contrast, visible focus, 44px targets, no information by colour alone), mobile-first, verified by pa11y-ci across every route as the automated floor
- [ ] **SITE-05**: Product and ingredient pages are server-rendered/static and crawlable; the build generates sitemap.xml and robots.txt, and pages include JSON-LD structured data so external citations resolve to indexable, machine-readable pages
- [ ] **SITE-06**: A /timelines index lists products that have at least one sourced change event, linking to each product's timeline page
- [ ] **SITE-07**: The site provides a /404 page and a /privacy page (compliant with UK GDPR and PECR)
- [ ] **SITE-08**: A /sources index lists all source-registry records, filterable by publisher and source type, linking to each source URL
- [ ] **SITE-09**: A persistent "not medical or dietary advice" disclaimer appears on ingredient and evidence pages and in the site footer
- [ ] **SITE-10**: An About page states the project's purpose, who runs it, its editorial-independence and conflict-of-interest stance (no brand sponsorship of specific records; corrections decided on evidence, not commercial pressure), how it is funded, and the named accountable editor for adjudication decisions
- [ ] **SITE-11**: Every product and ingredient page exposes a stable canonical citation ("cite this page", with the page's last-verified date) and a one-click single-record data export of the page's underlying JSON (a static file from the git store, not the deferred public API)
- [ ] **SITE-12**: The build generates an RSS/Atom feed of new and changed published records
- [ ] **SITE-13**: Every product and ingredient page carries a visible "report an error" link into the corrections process (SITE-02)

### Content & UX (non-expert audience)

- [ ] **UX-01**: Pages are written in plain English (GOV.UK-style, neutral, factual; interpretation kept separate from fact) so a reader who has only heard of "UPF" can follow them
- [ ] **UX-02**: Unfamiliar terms (additives, processing terms, E-numbers) are defined inline via a glossary term component
- [ ] **UX-03**: Every chart/visualisation has a full data-table fallback rendered server-side that conveys the widget's relationships (diff add/remove/substitute, timeline gaps, certainty differences) in text — not merely a list of values, and no information by chart or colour alone (per SITE-04)
- [ ] **UX-04**: A first-time visitor reaches a concrete "then vs now" product example within one step from the home page; the home page frames the curated flagship collection as the then-vs-now showcase and the rest as the reference archive (it does not imply every product has a then-vs-now history)
- [ ] **UX-05**: A /glossary page lists all defined terms alphabetically with definitions, machine-generated from the same source as the inline glossary terms (UX-02)
- [x] **UX-06**: A CI lint step enforces British English conventions (no em-dashes, en-GB spellings, sentence-case headings) and neutral editorial style (bans superlative/denigratory framing — "worst", "scandal", "shocking" — and causal-motive verbs such as "to boost margins"/"to cut costs" in change narratives), failing the build on violation

### Infrastructure, Validation & Sustainability

- [x] **INFRA-01**: The Netlify static deploy (with CSP headers) and the CI pipeline that executes the build-failing gates (TRUST-05, UX-06, DATA-10) and pa11y-ci (SITE-04) are established in the foundation, so every gate has a host from day one
- [ ] **SPIKE-01**: A foundation-phase spike sources three Tier A products end to end (historic formulation + two-pass verification + driver), measuring the real per-product effort and the dead-end rate; the launch corpus target (PROD-12) and the Tier A entry gate are re-derived from this evidence before the then-vs-now phase is scoped
- [ ] **DATA-12**: The canonical, git-versioned JSON dataset is published under an open licence so the archive can be reused and can outlive its maintainer (the graceful-degradation / bus-factor escape hatch)

### Release & Safeguard Gates

- [ ] **GATE-01**: A media/IP solicitor reviews the legal pattern early — the editorial style guide, 3–5 sample "why changed" narratives, the PROD-11 framing, and the image-rights fair-dealing rationale — when the then-vs-now pattern is first authored, before it is scaled; a full terminal sign-off then precedes public launch. Both reviews are a named, budgeted launch dependency, and launch is blocked until the terminal sign-off is recorded
- [ ] **GATE-02**: Each data-dense widget is manually verified with at least one screen reader (NVDA or VoiceOver), keyboard-only, and at 320px reflow when it is first built (the then-vs-now diff, the comparison table, the timeline), with a consolidated re-check before public launch; pa11y-ci is the automated floor, not the ceiling

## v2 / v1.x Requirements

Deferred. Tracked but not in the current roadmap.

### Processing Explorer (deferred v1.x)

- **PROC-01**: A processing-dimension taxonomy (at least four named dimensions) defined in meta.json, researched before any product is tagged
- **PROC-02**: A user can view a product's processing characteristics across the named dimensions, each showing its source and basis (per-dimension text classification; radar/spider and any shared-scale ranking visual prohibited as they imply a composite)
- **PROC-03**: Processing is never reduced to a single composite score

### Platform & Breadth (deferred)

- **PRICE-01**: Product price recorded as a sourced, dated fact and shown as a comparison axis
- **EVID-SYNTH-01**: Ingredient health-effect evidence synthesis (drawn from systematic reviews / meta-analyses / authoritative bodies, behind a qualified-reviewer sign-off gate) — deferred from v1 to keep the highest-risk editorial surface out of the initial scope
- **INGR-LONGTAIL**: Ingredient pages beyond the launch corpus (toward the original 500 target)
- **COMM-01 / COMM-02**: Community submission of historic packaging / corrections, with provenance + moderation
- **API-01 / API-02**: Public API and journalist export toolkit (behind a licence + privacy review gate)
- **NOTF-01**: Recipe-change notifications

## Out of Scope

Explicitly excluded for v1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Single composite health/processing score | Oversimplifies and misleads; contradicts the multi-dimensional design principle |
| Algorithmic ranking of products by degree of formulation change | A transformation "score" by another name; the flagship collection (PROD-11) is editorially curated and neutrally framed, not metric-ranked |
| "Switch to a healthier product" recommendations | Forces a normative verdict; conflicts with transparency-over-persuasion |
| Anti-brand / campaigning framing; imputation of commercial motive as fact | Project is a public archive, not advocacy; motive-as-fact is the defamation bright line (PROD-08) |
| Fabricated or inferred historical recipes | A former recipe that cannot be sourced is rendered as state (B) or (C) per PROD-10, never invented |
| Reproducing brand artwork/logos/packshots without cleared rights | Separate copyright regime; default is "not cleared — do not publish" (DATA-10). Brand names as identifiers are fine |
| Processing explorer, price comparison | Deferred to v1.x (processing has no authoritative taxonomy yet; price is volatile and tangential to the formulation thesis) |
| Brand editorial content beyond filtered product lists | v1 brand pages are filtered product lists only (SITE-03) |
| Open user submissions, public API/export | Need moderation/rights/licence-and-privacy review gates first (deferred) |
| Barcode scanning, mobile app, AI assistant, shopping integrations | PRD Phase 3; premature before the core archive exists |

## Traceability

Each requirement maps to exactly one phase. See ROADMAP.md for phase detail. Note: a one-phase mapping is **not** one-phase independence — some requirements have cross-phase *data* dependencies. SPIKE-01 (Phase 1) re-derives the PROD-12 corpus size and the Phase 4 Tier A entry gate; DATA-12 (Phase 1) is also the source the Phase 3b per-record export (SITE-11) serves; PROD-02/03 (Phase 3a) depend on the historic-sourcing workstream and link conditionally to Phase 8 timeline pages; PROD-05/06/07/10/11 (Phase 4) depend on the historic-sourcing track meeting the SPIKE-01-re-derived Tier A entry gate; COMP-04 (Phase 6) reuses the Phase 4 then-vs-now component; TIME-*/SITE-06 (Phase 8) depend on the ≥ 15-verified-change-event entry gate; GATE-01/02 are mapped to Phase 9 (their terminal sign-offs) but their early checks are success criteria of Phases 4, 6 and 8 (early-and-terminal).

Phase 3 is split into 3a (core entity pages + trust rendering) and 3b (site shell, accessibility, crawlability, non-expert UX and the trust/credibility surface).

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRUST-01 | Phase 1 | Complete |
| TRUST-02 | Phase 1 | Complete |
| TRUST-03 | Phase 1 | Complete |
| TRUST-04 | Phase 1 | Complete |
| TRUST-05 | Phase 1 | Complete |
| TRUST-06 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| DATA-09 | Phase 1 | Complete |
| DATA-10 | Phase 1 | Complete |
| DATA-11 | Phase 1 | Complete |
| DATA-12 | Phase 1 | Pending |
| PROD-14 | Phase 1 | Pending |
| UX-06 | Phase 1 | Complete |
| INFRA-01 | Phase 1 | Complete |
| SPIKE-01 | Phase 1 | Pending |
| VRFY-01 | Phase 2 | Pending |
| VRFY-02 | Phase 2 | Pending |
| VRFY-03 | Phase 2 | Pending |
| VRFY-04 | Phase 2 | Pending |
| VRFY-05 | Phase 2 | Pending |
| VRFY-06 | Phase 2 | Pending |
| VRFY-07 | Phase 2 | Pending |
| VRFY-08 | Phase 2 | Pending |
| VRFY-09 | Phase 2 | Pending |
| VRFY-10 | Phase 2 | Pending |
| VRFY-11 | Phase 2 | Pending |
| VRFY-12 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| DATA-06 | Phase 2 | Pending |
| PROD-01 | Phase 3a | Pending |
| PROD-02 | Phase 3a | Pending |
| PROD-03 | Phase 3a | Pending |
| PROD-04 | Phase 3a | Pending |
| PROD-09 | Phase 3a | Pending |
| INGR-01 | Phase 3a | Pending |
| INGR-02 | Phase 3a | Pending |
| INGR-03 | Phase 3a | Pending |
| INGR-04 | Phase 3a | Pending |
| SITE-04 | Phase 3b | Pending |
| SITE-05 | Phase 3b | Pending |
| SITE-07 | Phase 3b | Pending |
| SITE-08 | Phase 3b | Pending |
| SITE-09 | Phase 3b | Pending |
| SITE-10 | Phase 3b | Pending |
| SITE-11 | Phase 3b | Pending |
| SITE-12 | Phase 3b | Pending |
| SITE-13 | Phase 3b | Pending |
| UX-01 | Phase 3b | Pending |
| UX-02 | Phase 3b | Pending |
| UX-03 | Phase 3b | Pending |
| PROD-05 | Phase 4 | Pending |
| PROD-06 | Phase 4 | Pending |
| PROD-07 | Phase 4 | Pending |
| PROD-08 | Phase 4 | Pending |
| PROD-10 | Phase 4 | Pending |
| PROD-11 | Phase 4 | Pending |
| PROD-12 | Phase 4 | Pending |
| PROD-13 | Phase 4 | Pending |
| INGR-05 | Phase 4 | Pending |
| UX-04 | Phase 4 | Pending |
| UX-05 | Phase 4 | Pending |
| SRCH-01 | Phase 5 | Pending |
| SRCH-02 | Phase 5 | Pending |
| SRCH-03 | Phase 5 | Pending |
| SRCH-04 | Phase 5 | Pending |
| SITE-01 | Phase 5 | Pending |
| SITE-03 | Phase 5 | Pending |
| COMP-01 | Phase 6 | Pending |
| COMP-02 | Phase 6 | Pending |
| COMP-03 | Phase 6 | Pending |
| COMP-04 | Phase 6 | Pending |
| EVID-01 | Phase 7 | Pending |
| EVID-02 | Phase 7 | Pending |
| SITE-02 | Phase 7 | Pending |
| TIME-01 | Phase 8 | Pending |
| TIME-02 | Phase 8 | Pending |
| TIME-03 | Phase 8 | Pending |
| SITE-06 | Phase 8 | Pending |
| GATE-01 | Phase 9 | Pending |
| GATE-02 | Phase 9 | Pending |

**Coverage:**

- v1 requirements: 84 total
- Mapped to phases: 84 ✓
- Unmapped: 0
- Deferred to v1.x (not mapped): PROC-01/02/03, PRICE-01, EVID-SYNTH-01, INGR-LONGTAIL, COMM-01/02, API-01/02, NOTF-01

**Per-phase counts:** Phase 1: 19 · Phase 2: 14 · Phase 3a: 9 · Phase 3b: 12 · Phase 4: 11 · Phase 5: 6 · Phase 6: 4 · Phase 7: 3 · Phase 8: 4 · Phase 9: 2 — total 84.

---
*Requirements defined: 2026-06-30*
*Last updated: 2026-06-30 after Round 3 critique — 84/84 mapped across 9 phases. New: INFRA-01, SPIKE-01, DATA-12, PROD-14 (Phase 1); VRFY-12 (Phase 2); SRCH-04 (Phase 5); SITE-09/10/11/12/13 (Phase 3b). INGR-02 descriptive-only; GATE-01/02 early-and-terminal (early checks as Phase 4/6/8 success criteria). EVID-SYNTH-01 added to deferred list.*
