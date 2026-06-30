# Feature Research

**Domain:** Evidence-based food-transparency / food-reference database (UK packaged food)
**Researched:** 2026-06-30
**Confidence:** MEDIUM-HIGH (table-stakes and anti-features verified against multiple live products; trust-layer UI patterns drawn from GRADE/Examine/Wikipedia conventions rather than a direct competitor)

## Context

Comparable products cluster into three camps, each of which teaches a different lesson:

1. **Scanner/score apps** — Yuka, FoodSwitch, Fooducate. Mobile-first, barcode-driven, reduce a product to one health score plus "switch to this instead" suggestions. Mass adoption, but criticised for oversimplification and lack of context. This is the camp Food Transparency UK deliberately differentiates *against*.
2. **Open databases** — Open Food Facts. Crowdsourced, structured, deep data fields (ingredients, additives, allergens, nutriments, NOVA, Nutri-Score, Eco-Score). Strong on breadth and openness; weak on editorial provenance, historical depth, and confidence signalling.
3. **Citation-heavy reference sites** — Examine.com, Cochrane, Wikipedia. Evidence grading (GRADE: high/moderate/low/very-low certainty), inline citations, transparent uncertainty. Strong on trust; not food-product-specific and not historical.

Food Transparency UK's edge is to combine camp 2's structured breadth with camp 3's trust discipline, add a historical reformulation dimension nobody maintains centrally, and explicitly reject camp 1's reductive scoring.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Product detail page (ingredients, nutrition per 100g, manufacturer, allergens) | Every comparable product (OFF, Yuka, FoodSwitch) leads with this; it is the atomic unit | MEDIUM | Needs a normalised ingredient + nutriment data model. Nutrition per 100g is the cross-product comparison standard |
| Ingredient detail page (what it is, why used, regulatory position) | Yuka and OFF both decode ingredients in plain language; users expect to click any ingredient | MEDIUM | 500 pages in MVP. Reuse across products via many-to-many product↔ingredient links |
| Full-text search across products, ingredients, brands | Non-negotiable entry point; users arrive knowing a product or ingredient name | MEDIUM | Fuzzy matching, synonyms (E-numbers ↔ names), brand aliases. Can be client-side index for a static/local-first build at this scale |
| Additives list with E-number decoding | OFF tags additives; users expect "E471 = mono- and diglycerides" | LOW-MEDIUM | Largely a reference dataset join; overlaps with ingredient pages |
| Allergen flagging (14 EU-regulated allergens) | Legal/safety expectation; OFF and all UK label tools surface this | LOW | Structured boolean/tag field per product. Treat as data, not editorial |
| Category / brand browse and filtering | Users explore by "biscuits" or "Walkers" when they don't have a specific item | MEDIUM | Drives the IA (Products, Ingredients, Brands, Categories) |
| Clear nutrition presentation (values + visual emphasis) | FoodSwitch traffic lights, OFF panels set the expectation for legibility | LOW-MEDIUM | Present values honestly; UK traffic-light colours acceptable as *data display*, distinct from a composite health verdict |
| Source citations on factual claims | Reference-site convention (Wikipedia, Examine); also the project's stated core value | MEDIUM | This is table stakes *for credibility* even if competitors in camp 1 skip it |
| Mobile-responsive, accessible pages | Majority of food-info lookups are on-phone; WCAG 2.2 AA is a project hard rule | MEDIUM | Mobile-first, progressive enhancement |

### Differentiators (Competitive Advantage)

Features that set the product apart. These map directly to the Core Value (traceability) and PRD strategy.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Trust layer — every fact carries source + confidence + evidence level + update date** | No comparable product attaches provenance to individual facts; this is the moat. Turns "trust us" into "verify us" | HIGH | Must be a first-class data primitive, not a page footnote. Each *claim* (not each page) needs the four attributes. Underpins everything below |
| **Recipe / formulation evolution timeline** | No centralised database of UK reformulations exists (confirmed: Which?/ONS track piecemeal, no public archive). Genuine information gap | HIGH | Needs versioned product records (ingredient/nutrition snapshots over time) + sourced change events. Historical data is uneven — confidence model must show gaps honestly |
| **Multi-dimensional processing explorer (NOT a single score)** | Directly answers NOVA's central criticism: lumping all UPF into one bucket oversimplifies. Show processing as several axes (mechanical, additive count, cosmetic additives, refining, etc.) | HIGH | Hardest to design well. Each dimension itself needs sourcing and a confidence level. Avoid any composite roll-up |
| **"Expectation vs Reality" comparison** | Contrasts a traditional/original recipe with the current formulation objectively. Memorable, shareable, editorially neutral | MEDIUM | Depends on the timeline engine + versioned snapshots. Framing must stay factual, not gotcha |
| **Product comparison engine (ingredient count, additives, nutrition, processing dimensions, price)** | FoodSwitch compares two items by healthiness only; this compares on multiple objective axes without declaring a "winner" | MEDIUM-HIGH | Depends on the normalised data model. Resist the urge to compute an overall ranking — show the axes side by side |
| **Evidence pages linking claims to primary sources** | Examine-style synthesis: what the science actually says about an ingredient/additive, graded by certainty | MEDIUM-HIGH | Reuses the trust layer's evidence-level vocabulary. Primary sources first (FSA, EFSA, literature) |
| **Methodology page (sourcing, confidence model, how uncertainty is represented)** | Signals integrity; consumer-health research shows transparency of judgement is a top trust indicator | LOW-MEDIUM | Mostly editorial writing, but must accurately mirror the implemented confidence model |
| **Honest uncertainty / gap signalling** | Where data is missing or weak, say so explicitly rather than implying false completeness | LOW-MEDIUM | A natural by-product of a first-class confidence model; cheap if the model exists, impossible if bolted on later |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but contradict the philosophy or repeat competitors' mistakes.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Single overall health/processing score (Yuka/NOVA-style)** | Instant, satisfying, shareable; users love a number | Documented to oversimplify, lack context, and mislead (olive oil scores badly on fat; all UPF lumped together). Contradicts PRD Key Decision | Multi-dimensional processing explorer + transparent nutrition values; let users weigh axes themselves |
| **Anti-brand / outrage / campaigning framing** | Drives engagement and virality; "exposes" manufacturers | Contradicts the public-archive philosophy; erodes the neutrality that makes the data trustworthy to journalists/researchers | Historical context + objective Expectation-vs-Reality; explain *why* reformulations happened where evidence exists |
| **"Switch to this healthier product" recommendations** | FoodSwitch/Yuka core loop; feels helpful | Requires a normative health verdict the project deliberately refuses to make; invites bias and IP/endorsement risk | Comparison engine that shows differences neutrally; user draws their own conclusion |
| **User-contributed packaging / open editing at MVP** | OFF's crowdsourcing scaled their database fast | Provenance and moderation tooling don't exist yet; uncontrolled submissions destroy the trust layer's integrity (a Yuka data-quality failure mode) | Curated editorial sourcing for MVP; community contribution is an explicit Phase 2 item with provenance tooling |
| **Personalised scoring (diet, allergies, goals)** | "Is this good *for me*?" is the obvious user question | Turns a reference archive into a health-advice product, with regulatory and liability exposure; needs profiles/accounts out of scope | Present objective facts + allergen flags; let users apply their own context |
| **Real-time price tracking / shopping integration** | Natural extension of the price comparison field | Large surface area, brittle scraping, ongoing maintenance; price is one comparison axis, not a core mission | Capture price as a sourced, dated data point like any other fact; defer live tracking to Phase 3 |
| **Barcode scanning / native mobile app at MVP** | Expected from the scanner-app mental model | Premature before the core archive exists; large build (PRD Phase 3) | Responsive web with good search; barcode is a later channel onto the same data |
| **AI-generated summaries presented as fact** | Cheap to scale content | Breaks traceability — generated text has no primary source or confidence level | Every claim authored against a cited source; AI only as a drafting aid behind editorial review |

## Trust / Citation / Confidence — UI Surfacing Patterns

How the credibility model is typically shown (synthesised from GRADE, Examine.com, and Wikipedia conventions; MEDIUM confidence as no single competitor implements all of this):

- **Per-claim inline markers, not per-page** — Wikipedia attaches a numbered citation at the end of the specific sentence/fact. Adopt the same granularity: each factual statement carries its own reference, so users can verify atomically.
- **Four-level evidence/certainty vocabulary** — GRADE's High / Moderate / Low / Very Low is the established standard and what Examine uses. Reusing recognised language buys instant credibility; inventing a bespoke scale costs trust.
- **Confidence distinct from evidence level** — separate "how sure are we this fact is correct/current" (data confidence, esp. for historical recipe data) from "how strong is the science" (evidence level for health/additive claims). The PRD already separates these; the UI must too.
- **Visual encoding** — a small badge/pill per claim (e.g. evidence level as a labelled chip, confidence as a meter or labelled dot), with the **text label always present** (not colour-only — WCAG 2.2 AA, and consumer-health research shows labelled judgements drive trust).
- **Hover/expand for detail** — Wikipedia's tooltip-on-hover pattern: the inline marker is compact; hovering or tapping reveals the source, date, and a plain-language note on why confidence is what it is.
- **Explicit "we don't know" states** — where evidence is absent or historical data is missing, show a deliberate gap state rather than omitting silently. This is itself a trust signal.
- **Update date visible** — a "last reviewed / sourced on" date per fact, mirroring reference-site convention; critical for reformulation data that goes stale.
- **Methodology page as the anchor** — one canonical explanation of the scale, linked from every badge, so the vocabulary is learnable.

## Feature Dependencies

```
[Normalised data model: products, ingredients, nutriments, additives — versioned over time]
    ├──required by──> [Product detail page]
    ├──required by──> [Ingredient detail page]
    ├──required by──> [Search]
    ├──required by──> [Comparison engine]
    └──required by──> [Timeline / reformulation engine]
                           └──required by──> [Expectation vs Reality]

[Trust layer: claim = {statement, source, confidence, evidence level, update date}]
    ├──underpins──> [Every page that states a fact]
    ├──required by──> [Evidence pages]
    ├──required by──> [Methodology page] (must describe the real model)
    └──enhances──> [Processing explorer] (each dimension needs its own sourcing)

[Processing explorer (multi-dimensional)] ──conflicts──> [Single processing score]
[Comparison engine (neutral axes)] ──conflicts──> ["Switch to healthier" recommendations]
[Curated editorial sourcing] ──conflicts──> [Open user submissions at MVP]
```

### Dependency Notes

- **Trust layer underpins everything:** it must be designed *before* page templates, because retrofitting per-claim provenance onto pages built without it is a rewrite. This is the single most important sequencing decision — build the claim primitive first.
- **Normalised, versioned data model is the second foundation:** comparison, timeline, and Expectation-vs-Reality all depend on facts being structured and time-stamped. Versioning (snapshots of a product's recipe at points in time) is what makes the timeline possible — designing it in from day one is far cheaper than adding history later.
- **Timeline → Expectation vs Reality:** the latter is essentially a two-snapshot view (original vs current) of the timeline data; it cannot exist without versioned records.
- **Processing explorer depends on the trust layer:** each processing dimension is itself a sourced, confidence-rated claim — not a derived number. Without the trust layer it collapses back into the single score being rejected.
- **Conflicts to keep out of the same design:** a composite score and the multi-dimensional explorer are mutually exclusive philosophies; comparison must not silently rank; user submissions must wait for provenance tooling.

## MVP Definition

### Launch With (v1) — matches PRD Active scope

- [ ] Normalised, versioned data model — foundation for everything; design with history and provenance built in
- [ ] Trust layer (claim primitive: source + confidence + evidence level + update date) — the core value; non-negotiable foundation
- [ ] 100 product detail pages — the atomic unit users come for
- [ ] 500 ingredient detail pages — decode and reuse across products
- [ ] Search across products, ingredients, brands — primary entry point
- [ ] Product comparison engine (neutral, multi-axis) — a key differentiator that is cheap once the data model exists
- [ ] Recipe/formulation timeline engine — flagship differentiator; the genuine information gap
- [ ] Multi-dimensional processing explorer — flagship differentiator; the deliberate anti-score
- [ ] Evidence pages — credibility synthesis using the GRADE-style vocabulary
- [ ] Methodology + About pages — make the confidence model learnable and trustworthy
- [ ] Expectation vs Reality view — high-impact, low-marginal-cost given the timeline engine

### Add After Validation (v1.x)

- [ ] Recipe-change notifications — trigger: stable reformulation dataset proven useful; needs eventing/subscription layer (PRD Phase 2)
- [ ] Public API + journalist toolkit — trigger: data model proven stable by MVP usage (PRD Phase 2)
- [ ] Community-contributed historic packaging — trigger: moderation + provenance tooling built so contributions don't dilute trust (PRD Phase 2)

### Future Consideration (v2+)

- [ ] Barcode scanning / native mobile app — defer until the archive has depth and an audience (PRD Phase 3)
- [ ] Shopping / price-tracking integrations — defer; brittle and off-mission (PRD Phase 3)
- [ ] AI assistant over the archive — defer; only viable atop a mature, fully-cited dataset (PRD Phase 3)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Trust layer (claim primitive) | HIGH | HIGH | P1 |
| Normalised versioned data model | HIGH | HIGH | P1 |
| Product pages | HIGH | MEDIUM | P1 |
| Ingredient pages | HIGH | MEDIUM | P1 |
| Search | HIGH | MEDIUM | P1 |
| Methodology / About | MEDIUM | LOW | P1 |
| Reformulation timeline | HIGH | HIGH | P1 |
| Processing explorer (multi-dimensional) | HIGH | HIGH | P1 |
| Comparison engine | HIGH | MEDIUM | P1 |
| Evidence pages | HIGH | MEDIUM | P1 |
| Expectation vs Reality | HIGH | MEDIUM | P1 |
| Allergen / additive flagging | MEDIUM | LOW | P1 |
| Recipe-change notifications | MEDIUM | MEDIUM | P2 |
| Public API / journalist toolkit | MEDIUM | MEDIUM | P2 |
| Community contributions | MEDIUM | HIGH | P2 |
| Single health/processing score | (negative) | LOW | NEVER (anti-feature) |
| "Switch to healthier" recommendations | (negative) | MEDIUM | NEVER (anti-feature) |

**Priority key:** P1 = must have for launch · P2 = add after validation · P3 = future · NEVER = anti-feature

## Competitor Feature Analysis

| Feature | Open Food Facts | Yuka / FoodSwitch | Examine.com | Our Approach |
|---------|-----------------|-------------------|-------------|--------------|
| Core unit | Structured product record | Scanned product + score | Topic/ingredient evidence page | Product + ingredient pages with per-claim provenance |
| Health verdict | NOVA + Nutri-Score (single labels) | Single 0–100 score / star rating | None — graded evidence only | None — multi-dimensional, no composite |
| Citations | Source links, inconsistent | Minimal / algorithmic | Extensive, GRADE-graded | Per-claim source + confidence + evidence level + date |
| Historical / reformulation | Not tracked | Not tracked | N/A | Versioned timeline (the gap) |
| Comparison | Manual | "Switch to healthier" (ranked) | N/A | Neutral multi-axis, no winner |
| Data provenance | Crowdsourced, variable | User-submitted, variable | Editorial | Curated editorial; community deferred to Phase 2 |
| Framing | Neutral/open | Consumer-protection, slightly normative | Academic-neutral | Public archive, explicitly neutral |

## Sources

- [Open Food Facts — data fields, NOVA, Nutri-Score, additives, allergens](https://world.openfoodfacts.org/data) (HIGH)
- [Open Food Facts — Wikipedia overview](https://en.wikipedia.org/wiki/Open_Food_Facts) (MEDIUM)
- [Yuka — how the score works and criticisms](https://yuka.io/en/) and [GreenChoice expert review](https://about.greenchoicenow.com/resources/yuka-app) (MEDIUM — scoring weighting and oversimplification critiques cross-confirmed)
- [FoodSwitch — features, Health Star Rating, switch suggestions](https://www.foodswitch.com/app/foodswitch/) (MEDIUM)
- [Examine.com — certainty of evidence (GRADE)](https://examine.com/glossary/certainty-of-evidence/) (HIGH)
- [GRADE handbook — High/Moderate/Low/Very Low certainty](https://gradepro.org/handbook/) (HIGH)
- [Wikipedia — inline citation conventions and tooltip pattern](https://en.wikipedia.org/wiki/Wikipedia:Inline_citation) (HIGH)
- [Are all ultra-processed foods bad? Critical review of NOVA (Proceedings of the Nutrition Society)](https://www.cambridge.org/core/journals/proceedings-of-the-nutrition-society/article/are-all-ultraprocessed-foods-bad-a-critical-review-of-the-nova-classification-system/16D07B81A1587340B3EE847F3C662E60) (HIGH — supports single-score anti-feature)
- [Which? — shrinkflation and skimpflation reporting](https://www.which.co.uk/news/article/shrinkflation-the-brands-charging-you-more-for-less-atUkT4m2GjuP) and [ONS shrinkflation analysis](https://www.ons.gov.uk/economy/inflationandpriceindices/articles/theimpactofshrinkflationoncpihuk/howmanyofourproductsaregettingsmaller) (MEDIUM — confirm no centralised public reformulation database exists)
- [Consumer evaluation of online health information — trust indicators](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6521213/) (MEDIUM — informs confidence-UI guidance)

---
*Feature research for: evidence-based UK food-transparency database*
*Researched: 2026-06-30*
