# Food Transparency UK

## What This Is

Food Transparency UK is an evidence-based, interactive database that explains what packaged foods contain, how their recipes have changed over time, why those changes happened, and what the scientific evidence says about nutrition, processing and additives. It is built for UK consumers, journalists, researchers, teachers, nutrition professionals, students and policymakers who need traceable, primary-source-backed information rather than fragmented or campaigning content.

## Core Value

Every fact is traceable to a primary source with an explicit confidence level — transparency over persuasion. If everything else fails, a user must be able to trust that what the database says about a product or ingredient is sourced, dated, and honest about its uncertainty.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. MVP from the PRD. -->

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

- **Domain**: UK packaged food, nutrition, food additives, food processing, and the history of recipe reformulation.
- **Source PRD**: `Food_Transparency_UK_PRD_v1.docx` (v1) — this PROJECT.md is synthesised from it.
- **Data sources**: manufacturer websites, supermarket archives, historic packaging, Internet Archive, Open Food Facts, government sources, Food Standards Agency (FSA), EFSA, academic literature, and (later) consumer-contributed historic packaging.
- **Editorial stance**: primary sources first; every claim traceable; historical context over outrage; explain uncertainty honestly; accessible, visual and easy to explore.
- **Strategic guidance from PRD**: focus on transparency rather than UPFs alone; explain why reformulations occurred where evidence exists; build deep histories for 100–200 iconic products before expanding; include an "Expectation vs Reality" comparison contrasting traditional recipes with current formulations; position as a public archive, not a campaign.

## Constraints

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
