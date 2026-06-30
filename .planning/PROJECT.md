# Food Transparency UK

## What This Is

Food Transparency UK is an evidence-based, interactive database that explains what packaged foods contain, how their recipes have changed over time, and why those changes happened. (Multi-dimensional processing analysis and a synthesis of the scientific evidence on additives are deferred to v1.x; v1 ingredient pages stay descriptive and cite authoritative regulatory positions rather than synthesising primary studies.) Its editorial thesis is that many everyday "foods" have quietly become a manipulation of the idea of the original — ice cream that is no longer cream and flavouring but stabilisers, oils and additives. The site's job is to make the gap between *what a food used to be* and *what it is now* visible and traceable.

It is built first for the ordinary shopper who has heard of "ultra-processed food" but has never connected that phrase to the specific products in their cupboard or to what those products used to be. Journalists, researchers, teachers, nutrition professionals, students and policymakers are served by the same traceable, primary-source-backed records. The UX assumes no prior expertise: plain English, the "then vs now" comparison up front, jargon defined inline.

## Core Value

Every published fact is traceable to a primary source, independently verified to a standard matched to the claim, and honest about its uncertainty — transparency over persuasion. If everything else fails, a user must be able to trust that nothing on the site was published without the verification its claim type demands (corroborable facts: two distinct-lineage sources; authoritative facts: one authority plus an independent re-read), that disagreements are escalated for human approval, and that every claim shows its source, date, confidence and evidence level.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. MVP from the PRD. -->

- [ ] Claim-typed verification workflow: every published fact verified to its claim-type standard, with disagreements escalated and verification status recorded per fact
- [ ] Tiered "what it used to be vs what it is now": full ingredient-by-ingredient then-vs-now for a flagship set (~15–20 products) where a historical formulation is genuinely sourceable (Tier A); documented category-level reformulation with its driver for the bulk where no per-product old recipe exists (Tier B); current-only, honestly flagged, otherwise (Tier C) — never an inferred or fabricated old recipe
- [ ] A curated editorial collection of well-documented transformations as a way in for the non-expert (editorial selection, neutrally framed, not a metric ranking)
- [ ] A historic-sourcing editorial track started in the foundation phase (the long pole), flagship-first, anchored to documented drivers (2015 ice-cream rule, 2018 sugar levy, FSA salt/sugar reduction programmes)
- [ ] Product pages for 100 iconic UK products (current ingredients, nutrition, manufacturer, references), with each fact rendered through the trust component; the universal spine is the trust-rendered current-state record, with then-vs-now layered on where sourceable
- [ ] Ingredient explorer covering the ~200 ingredients in the launch corpus (what it is, why used, scientific evidence, regulatory position, products containing it) — deep before broad
- [ ] Search across products, ingredients and brands
- [ ] Product comparison engine (ingredient count, additives, nutrition) — neutral, never a winner; price and processing axes deferred to v1.x
- [ ] Timeline engine showing recipe/formulation change over time, with honest gaps
- [ ] Evidence pages linking claims to primary sources
- [ ] Trust layer: every fact carries source, confidence, evidence level and update date, published only behind a claim-typed verification gate
- [ ] Legal and accessibility safeguards: a no-imputation-of-motive gate, image-rights "not cleared by default", a pre-launch solicitor review, and manual screen-reader testing of data-dense widgets
- [ ] Information architecture: Home, Search, Products, Ingredients, Brands, Categories, Timelines, Evidence, Methodology, About
- [ ] Methodology page explaining sourcing, the confidence/evidence and verification model, the corrections policy, and how uncertainty (including contested facts) is represented

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Community submissions / user-contributed packaging — Phase 2 in the PRD; needs moderation and provenance tooling not justified for MVP
- Public API and journalist toolkit — Phase 2; depends on a stable data model proven by the MVP first
- Recipe-change notifications — Phase 2; requires a subscription/eventing layer
- Barcode scanning, mobile app, AI assistant, shopping integrations — Phase 3; large surface area, premature before the core archive exists
- Anti-brand / campaigning framing — contradicts the product philosophy; the project is a public archive of food evolution, not advocacy
- Single overall "processing score" — deliberately rejected in favour of multi-dimensional processing characteristics
- Processing explorer and price comparison — deferred to v1.x (processing has no authoritative UK taxonomy yet and risks re-tagging every record; price is volatile and tangential to the formulation-history thesis)
- Reproducing brand artwork/logos without cleared rights — separate copyright regime; images default to "not cleared — do not publish" (brand names as identifiers are fine)
- Imputation of commercial/cynical motive as fact — the defamation bright line; the "why" ships only as cited regulatory context, attributed manufacturer statement, or labelled opinion

## Context

- **Origin**: The project grew from the user reading and watching coverage of ultra-processed food that assumes the audience already knows what UPF is. The realisation that drives it: the *identity* of a food has changed — from actual ingredients into a manipulation of the same idea — and even careful research leaves it unclear what those changes mean. The site exists to redress that balance for the non-expert.
- **Reference blueprint**: `/Users/anthonygeorge/Projects/DEBT` (UK Public Finances Explorer, live at ukpublicfinances.org) is the proven pattern to mirror — NOT a codebase to fork. Build a fresh Eleventy project that reuses its conventions: JSON `_data/` as the single source of truth (no figure hard-coded in a template); per-record provenance (`source_name`, `source_url`, `date`, `retrieved_date`, `confidence_level`); a `confidence_level` enum defined in `meta.json` and enforced by tests; a `sources.json` catalogue; reusable Nunjucks macros (`metricCard`, `sourceNote`, `caveatBox`, `dataFreshnessBadge`, `glossaryTerm`); hand-rolled inline-SVG charts with a full `<table>` fallback (no charting library); GOV.UK-style neutral plain-English editorial; pa11y-ci WCAG 2.2 AA across every route; a `no-emdash` British-style test; ESM tool maths in a unit-tested `lib/`; and Netlify static deploy with CSP headers. DEBT's `docs/DATA-AUDIT.md` is the verification model to formalise and strengthen (see Constraints).
- **Domain**: UK packaged food, nutrition, food additives, food processing, and the history of recipe reformulation.
- **Source PRD**: `Food_Transparency_UK_PRD_v1.docx` (v1) — this PROJECT.md is synthesised from it.
- **Data sources**: manufacturer websites, supermarket archives, historic packaging, Internet Archive, Open Food Facts, government sources, Food Standards Agency (FSA), EFSA, academic literature, and (later) consumer-contributed historic packaging.
- **Editorial stance**: primary sources first; every claim traceable; historical context over outrage; explain uncertainty honestly; accessible, visual and easy to explore.
- **Strategic guidance from PRD**: focus on transparency rather than UPFs alone; explain why reformulations occurred where evidence exists; build deep histories for 100–200 iconic products before expanding; include an "Expectation vs Reality" comparison contrasting traditional recipes with current formulations; position as a public archive, not a campaign.

## Constraints

- **Two-pass verification (highest priority)**: No fact may be published until verified to the standard its claim type demands. A *corroborable* fact (an empirical claim about the world — e.g. a past or declared formulation) needs two confirming verifications against two distinct-lineage sources (at least one primary; co-derived sources do not count as independent). An *authoritative* fact (what a named authority states — e.g. the current GB regulatory status, or the current official label) needs one authority plus an independent re-read for transcription fidelity (a second "independent source" does not exist and must not be faked). An inaccessible or non-resolving source never satisfies a pass; every citation must pass an automated existence check before a pass counts; a measure mismatch between passes auto-raises a disagreement. Anything the passes do not agree on is withheld and routed to human adjudication, which resolves to confirmed, corrected, or genuinely contested (AI may never adjudicate). The gate is enforced at the level of the individual fact and is continuous: a page publishes its verified subset with any unverified fact shown as an explicit "not yet verified — withheld" placeholder rather than an asserted value, and a fact later found `wrong` is automatically withheld. A genuinely contested fact is published *with* a visible "contested" treatment showing both positions and sources — this is how real disputes are shown honestly rather than hidden. Staleness is flagged by a small set of thresholds so re-verification is a generated queue, not a good intention — "verified and re-verified until we are sure". This follows and strengthens DEBT's `DATA-AUDIT.md` dual-reviewer process. The honest public statement of this model (it is not two independent human reviewers) is itself part of the trust proposition.
- **Editorial integrity**: No claim ships without a source, confidence level, evidence level and update date — this is the core value, not a feature toggle.
- **Neutrality**: Presentation must avoid persuasion/outrage framing; contrast traditional vs current formulations objectively.
- **Data licensing**: Manufacturer content, supermarket archives, and trademarks carry licensing/IP risk — sourcing must respect licences and attribute correctly.
- **Historical data quality**: Recipe-evolution and historic packaging data is uneven; confidence and evidence levels must make gaps explicit rather than implying false certainty.
- **Scientific accuracy**: Nutrition/additive claims must reflect current regulatory positions (FSA/EFSA) and cite literature.
- **Maintenance**: The archive must be maintainable long-term — favour a data model where facts, sources and confidence are first-class.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Trust layer is foundational, not a feature | Core value is traceability; every fact needs source/confidence/evidence/date | — Pending |
| Processing shown as multiple dimensions, never a single score (when built) | Single scores oversimplify and mislead; PRD design principle | Deferred to v1.x |
| Launch corpus sized from a Phase 1 sourcing spike (target ~100 products + ~200 launch-corpus ingredients), not a fixed upfront number | The full corpus is a 12–18 month solo effort; a 3-product spike re-derives a realistic, evidence-based scope before scaling (Round 3) | — Pending |
| Ingredient pages are descriptive in v1; health-effect evidence synthesis deferred behind a future expert gate | Evidence synthesis is the highest-risk editorial surface and the two-pass gate fits discrete facts, not "what the science says" (Round 3) | — Pending |
| Public archive framing, not campaigning | PRD product philosophy: transparency over persuasion | — Pending |
| Standard granularity, Quality (Opus) planning models, research-first | User config at initialisation | — Pending |
| DEBT is a reference blueprint, not a fork — build fresh mirroring its Eleventy conventions | User wants the proven pattern without entangling a live, deployed site | — Pending |
| Verification standard is matched to claim type — corroborable (two distinct-lineage sources) vs authoritative (one authority + independent re-read) | "Two independent primary sources" is impossible for "what does the FSA say"; forcing it would make the gate unsatisfiable for regulatory facts (Round 1 research) | — Pending |
| Then-vs-now is tiered (A sourced / B documented-category / C current-only), not all-100 full | Genuine ingredient-by-ingredient old recipes are sourceable for only ~15–20 products; the rest must be honest, not nostalgic (Round 1 feasibility research, live API probe) | — Pending |
| Historic sourcing starts in the foundation phase as a parallel editorial track | It is the long-lead constraint; if it waits for the content phase, the then-vs-now spine launches empty or nostalgic | — Pending |
| Entity + TimelineEvent schemas defined in the foundation, before ingestion | Ingestion cannot field-tag into a schema that does not yet exist (Round 1 sequencing critique) | — Pending |
| Publication gate is per-fact, not per-page; pages ship their verified subset, unverified facts shown as explicit withheld placeholders | All-or-nothing blocking would stall the corpus for a small team; granularity is the relief valve, not lowering the bar (Round 2) | — Pending |
| Genuinely contested facts are published with a visible "contested" treatment, not hidden | "Disputed" was a dead enum that could never reach a page, contradicting "explain uncertainty honestly" (Round 2) | — Pending |
| The universal product-page spine is the trust-rendered current-state record; then-vs-now is the flagship layer | Sourced old recipes exist for only ~15–20 of 100 products; claiming then-vs-now on every page would be a bait-and-switch (Round 2) | — Pending |
| Legal safeguards are enforced gates, not good intentions: no-imputation-of-motive, image default "not cleared", pre-launch solicitor review | Naming brands + attributing "why" enters real UK libel/IP territory, sharpened by the SEO ambition (Round 2 legal research) | — Pending |
| pa11y-ci is the accessibility floor; manual screen-reader/keyboard/320px testing of data-dense widgets is a release gate | Automated tools catch only ~30–40%; the then-vs-now diff, comparison and timeline-gap semantics need text not colour, AT-verified (Round 2 a11y research) | — Pending |
| Deferred to v1.x: processing explorer, price comparison, ingredient health-evidence synthesis, ingredient long tail | Ship the verified core first; defer the biggest research unknown, the most volatile axis, the highest-risk editorial surface, and breadth that contradicts "deep before broad" (Rounds 2–3, user-approved) | — Pending |
| Open-data escape hatch + named editor + "not medical advice" + citability/RSS/report-error are in v1 | Trust, credibility and sustainability wins: a journalist checks independence/funding before citing; an unmaintained archive must be able to outlive its author; citability earns the cold-start audience (Round 3) | — Pending |
| Legal and accessibility gates fire when each surface is first built, not only at launch | Finding an inaccessible diff or a bad legal pattern after it is replicated across pages is the most expensive moment (Round 3) | — Pending |
| UX targets the UPF-aware-but-not-connected layperson — plain English, then-vs-now up front | The user is the archetypal user; most people have heard of UPF but not made the connection | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-30 after initialization*
