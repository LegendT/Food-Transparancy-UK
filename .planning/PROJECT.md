# Food Transparency UK

## What This Is

Food Transparency UK is an evidence-based, interactive database that explains what packaged foods contain, how their recipes have changed over time, why those changes happened, and what the scientific evidence says about nutrition, processing and additives. Its editorial thesis is that many everyday "foods" have quietly become a manipulation of the idea of the original — ice cream that is no longer cream and flavouring but stabilisers, oils and additives. The site's job is to make the gap between *what a food used to be* and *what it is now* visible and traceable.

It is built first for the ordinary shopper who has heard of "ultra-processed food" but has never connected that phrase to the specific products in their cupboard or to what those products used to be. Journalists, researchers, teachers, nutrition professionals, students and policymakers are served by the same traceable, primary-source-backed records. The UX assumes no prior expertise: plain English, the "then vs now" comparison up front, jargon defined inline.

## Core Value

Every published fact is traceable to a primary source, independently verified twice, and honest about its uncertainty — transparency over persuasion. If everything else fails, a user must be able to trust that nothing on the site was published without two independent primary-source checks (with any disagreement escalated for human approval), and that every claim shows its source, date, confidence and evidence level.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. MVP from the PRD. -->

- [ ] Two-pass verification workflow: every published fact independently verified twice against its primary source, with disagreements escalated and verification status recorded per fact
- [ ] Product pages whose spine is "what it used to be vs what it is now" — traditional vs current formulation, ingredient by ingredient, with the why and the sources
- [ ] A flagship browse of the starkest transformations (the products whose identity has changed most), as a way in for the non-expert
- [ ] Product pages for 100 iconic UK products (current ingredients, nutrition, manufacturer, historical timeline, recipe evolution, references)
- [ ] Ingredient explorer covering 500 ingredients (what it is, why it is used, scientific evidence, regulatory position, products containing it)
- [ ] Search across products, ingredients and brands
- [ ] Product comparison engine (ingredient count, additives, nutrition, processing characteristics, price)
- [ ] Timeline engine showing recipe/formulation change over time
- [ ] Processing explorer presenting processing as multiple dimensions, not a single score
- [ ] Evidence pages linking claims to primary sources
- [ ] Trust layer: every fact carries source, confidence, update date and evidence level
- [ ] Information architecture: Home, Search, Products, Ingredients, Brands, Categories, Timelines, Evidence, Methodology, About
- [ ] Methodology page explaining sourcing, confidence model and how uncertainty is represented

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Community submissions / user-contributed packaging — Phase 2 in the PRD; needs moderation and provenance tooling not justified for MVP
- Public API and journalist toolkit — Phase 2; depends on a stable data model proven by the MVP first
- Recipe-change notifications — Phase 2; requires a subscription/eventing layer
- Barcode scanning, mobile app, AI assistant, shopping integrations — Phase 3; large surface area, premature before the core archive exists
- Anti-brand / campaigning framing — contradicts the product philosophy; the project is a public archive of food evolution, not advocacy
- Single overall "processing score" — deliberately rejected in favour of multi-dimensional processing characteristics

## Context

- **Origin**: The project grew from the user reading and watching coverage of ultra-processed food that assumes the audience already knows what UPF is. The realisation that drives it: the *identity* of a food has changed — from actual ingredients into a manipulation of the same idea — and even careful research leaves it unclear what those changes mean. The site exists to redress that balance for the non-expert.
- **Reference blueprint**: `/Users/anthonygeorge/Projects/DEBT` (UK Public Finances Explorer, live at ukpublicfinances.org) is the proven pattern to mirror — NOT a codebase to fork. Build a fresh Eleventy project that reuses its conventions: JSON `_data/` as the single source of truth (no figure hard-coded in a template); per-record provenance (`source_name`, `source_url`, `date`, `retrieved_date`, `confidence_level`); a `confidence_level` enum defined in `meta.json` and enforced by tests; a `sources.json` catalogue; reusable Nunjucks macros (`metricCard`, `sourceNote`, `caveatBox`, `dataFreshnessBadge`, `glossaryTerm`); hand-rolled inline-SVG charts with a full `<table>` fallback (no charting library); GOV.UK-style neutral plain-English editorial; pa11y-ci WCAG 2.2 AA across every route; a `no-emdash` British-style test; ESM tool maths in a unit-tested `lib/`; and Netlify static deploy with CSP headers. DEBT's `docs/DATA-AUDIT.md` is the verification model to formalise and strengthen (see Constraints).
- **Domain**: UK packaged food, nutrition, food additives, food processing, and the history of recipe reformulation.
- **Source PRD**: `Food_Transparency_UK_PRD_v1.docx` (v1) — this PROJECT.md is synthesised from it.
- **Data sources**: manufacturer websites, supermarket archives, historic packaging, Internet Archive, Open Food Facts, government sources, Food Standards Agency (FSA), EFSA, academic literature, and (later) consumer-contributed historic packaging.
- **Editorial stance**: primary sources first; every claim traceable; historical context over outrage; explain uncertainty honestly; accessible, visual and easy to explore.
- **Strategic guidance from PRD**: focus on transparency rather than UPFs alone; explain why reformulations occurred where evidence exists; build deep histories for 100–200 iconic products before expanding; include an "Expectation vs Reality" comparison contrasting traditional recipes with current formulations; position as a public archive, not a campaign.

## Constraints

- **Two-pass verification (highest priority)**: No fact may be published until it has been independently verified twice against its primary source. Anything the two passes do not agree on is flagged for human approval and cannot publish until resolved. Every fact carries a verification status (e.g. confirmed / stale / wrong / uncertain), the verifications behind it, and the date last re-verified. Re-verification is a recurring obligation, not a one-off — the bar is "verified and re-verified until we are sure", following and strengthening DEBT's `DATA-AUDIT.md` dual-reviewer process (independent re-check, disagreements surfaced, no value changed without human approval).
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
| Processing shown as multiple dimensions, never a single score | Single scores oversimplify and mislead; PRD design principle | — Pending |
| MVP scoped to 100 products + 500 ingredients before expanding | PRD strategic guidance: deep histories before breadth | — Pending |
| Public archive framing, not campaigning | PRD product philosophy: transparency over persuasion | — Pending |
| Standard granularity, Quality (Opus) planning models, research-first | User config at initialisation | — Pending |
| DEBT is a reference blueprint, not a fork — build fresh mirroring its Eleventy conventions | User wants the proven pattern without entangling a live, deployed site | — Pending |
| Every published fact requires two independent primary-source verifications; disagreements escalate to human approval | Trust is the project's highest priority — "verified and re-verified until we are sure" | — Pending |
| "What it used to be vs what it is now" is the spine of every product page, built early | It is the editorial thesis and the emotional hook for the non-expert audience, not a late add-on | — Pending |
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
