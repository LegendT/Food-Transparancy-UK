# Architecture Research

**Domain:** Provenance-first, content/data-heavy public reference archive (UK packaged food)
**Researched:** 2026-06-30
**Confidence:** HIGH (data model + component structure), MEDIUM (licensing specifics, processing-dimension taxonomy)

## Summary

This is not a transactional web application — it is a **curated, provenance-first reference archive** that is overwhelmingly read-heavy, with writes happening through an editorial pipeline rather than at runtime. The architecture that fits is a **content-as-data, build-time-derived static system**, not a database-backed CRUD app. Three things drive every decision:

1. **The fact is the atomic unit, and every fact carries its provenance.** This is the core product value, so it must be a structural invariant — enforced by schema at build time, not a convention curators are asked to remember.
2. **One-way data flow.** Facts move ingestion → curation → canonical store → derivation → rendered page. Nothing writes back at runtime (community submissions and API are deferred).
3. **Everything is derived from one source of truth.** Search, comparison, timelines and processing views are all *projections* of the same sourced facts, so they cannot drift from the citations.

This mirrors how mature provenance systems model knowledge: Wikidata's statement model (a value plus *references* for provenance, *qualifiers* for temporal/contextual scope, and a *rank*) and the nanopublication model (an **assertion** plus its **provenance** plus **publication info**). We adopt the same shape at a pragmatic, file-based granularity.

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  INGESTION & CURATION  (offline / out-of-band — not the live site)     │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ OFF        │  │ Historic     │  │ Normalisation│  │ Curator     │  │
│  │ importer   │  │ curation     │  │ (ingredient/ │  │ review +    │  │
│  │ (API/dump) │  │ (Wayback,    │  │ E-number     │  │ confidence/ │  │
│  │            │  │ packaging)   │  │ resolution)  │  │ evidence    │  │
│  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│        └────────────────┴─────────────────┴─────────────────┘         │
│                              │ writes drafts → promotes to published    │
├──────────────────────────────▼────────────────────────────────────────┤
│  CANONICAL CONTENT STORE   (git-versioned structured files = truth)    │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ ┌──────┐ │
│  │products │ │ingredient│ │ brands │ │ additives│ │ sources │ │ time-│ │
│  │         │ │ s        │ │        │ │          │ │(registry│ │ line │ │
│  │         │ │          │ │        │ │          │ │)        │ │events│ │
│  └─────────┘ └──────────┘ └────────┘ └──────────┘ └─────────┘ └──────┘ │
│        ▲ Zod schemas validate the TRUST ENVELOPE — build fails if a    │
│          fact lacks source / confidence / evidence / updated date      │
├──────────────────────────────┬────────────────────────────────────────┤
│  DERIVATION / BUILD LAYER     │ (read-only over the store)              │
│  ┌──────────────┐ ┌───────────▼──┐ ┌──────────────┐ ┌───────────────┐  │
│  │ search index │ │ comparison   │ │ timeline     │ │ cross-refs /  │  │
│  │ (Pagefind)   │ │ matrix       │ │ assembly +   │ │ back-links    │  │
│  │              │ │ (normalised) │ │ diffing      │ │ (ingr→products│  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────────┘  │
├──────────────────────────────┬────────────────────────────────────────┤
│  PRESENTATION  (static pages, zero-JS default, islands for interaction) │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐  │
│  │ product  │ │ingredient│ │ comparison │ │ timeline │ │ evidence / │  │
│  │ pages    │ │ pages    │ │ explorer   │ │ explorer │ │ methodology│  │
│  └──────────┘ └──────────┘ └────────────┘ └──────────┘ └────────────┘  │
│     every rendered value passes through <SourcedFact>: source chip,    │
│     confidence badge, evidence level, updated date, citation footnote  │
└──────────────────────────────┬────────────────────────────────────────┘
                               │ deploy
                        ┌──────▼───────┐
                        │ static CDN   │  (read-heavy public archive)
                        └──────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Ingestion & curation pipeline | Pull/draft facts from Open Food Facts and historic sources; resolve names; attach provisional provenance; hand to human review | Node/TS scripts run offline; OFF API/data dump; Wayback CDX API; outputs draft JSON |
| Canonical content store | Single source of truth for all entities and facts; auditable history | Git-versioned JSON/MDX files in collections; **local-first, no database** |
| Schema/validation gate | Enforce the trust envelope as a build-failing invariant | Astro Content Layer `defineCollection` + Zod schemas |
| Derivation/build layer | Compute search index, comparison metrics, timeline diffs, back-links from the store | Build-time TS; Pagefind index over built HTML |
| Search index | Full-text + faceted search with no server | Pagefind (static, client-side, chunked index) |
| Comparison engine | Normalise comparable metrics; build comparison matrix; serve user-selected comparisons | Build-time precompute + small client island |
| Timeline engine | Order reformulation events, compute before/after diffs, power "Expectation vs Reality" | Build-time assembly + presentation island |
| Presentation layer | Render static, accessible pages; wrap every fact in its provenance affordance | Astro pages (zero JS default) + islands |

## Core Data Model (the centre of the system)

Everything below exists to serve one entity: the **sourced fact**. Define this first; nothing else can be authored correctly until it exists.

### The atomic unit — `SourcedValue<T>` (the "claim envelope")

Rather than a separate triple store, the pragmatic, author-friendly form of "fact as first-class entity" is a **typed envelope wrapping every fact-bearing field**. This is the file-based equivalent of a Wikidata statement (value + references + rank) or a nanopublication (assertion + provenance + publication-info).

```typescript
// The trust layer, expressed as a reusable schema. This is THE core primitive.
const SourcedValue = <T extends z.ZodTypeAny>(value: T) =>
  z.object({
    value,                                   // the asserted value (the "assertion")
    sources: z.array(SourceRef).min(1),      // ≥1 — provenance is MANDATORY, not optional
    confidence: z.enum(['high', 'medium', 'low']),   // curator's certainty the claim is correct
    evidence:   z.enum(['primary', 'secondary', 'tertiary', 'inferred']), // TYPE/strength of evidence
    updated:    z.coerce.date(),             // last review/update date
    validFrom:  z.coerce.date().optional(),  // temporal scope (Wikidata "qualifier") — powers timelines
    validTo:    z.coerce.date().optional(),
    note:       z.string().optional(),       // honest caveat where data is uneven
  });
```

**Confidence vs evidence level are two distinct axes — keep them separate** (the PRD names both):

- **Evidence level** is *objective about the source type*: a manufacturer pack photo or an EFSA opinion is `primary`; a news article is `secondary`; a tertiary aggregation (e.g. an uncorroborated Open Food Facts entry) is `tertiary`; an estimate is `inferred`.
- **Confidence** is the *curator's judgement* that the claim is correct given that evidence. The two can diverge: a partial 1990s packaging photo is a `primary` source but may warrant only `medium` confidence because the ingredients list is hard to read. This separation is exactly what makes historical recipe gaps honest rather than falsely certain.

### The `Source` registry (first-class, normalised, reusable)

```typescript
const Source = z.object({
  id: z.string(),
  type: z.enum(['manufacturer', 'supermarket', 'internet_archive',
                'open_food_facts', 'fsa', 'efsa', 'academic',
                'packaging_photo', 'press']),
  title: z.string(),
  url: z.string().url().optional(),
  archiveUrl: z.string().url().optional(),   // Wayback snapshot — vital for link rot
  publisher: z.string().optional(),
  publishedDate: z.coerce.date().optional(),
  accessedDate: z.coerce.date(),
  licence: z.string(),                       // IP/licensing risk is a stated constraint
  citation: z.string(),                      // rendered citation string
});
```

Sources are referenced by ID (`SourceRef`) from many facts. This keeps citations consistent, makes the Evidence pages a simple projection of the registry, and isolates the licensing/attribution concern in one place.

### Subject entities (what facts attach to)

```
Product ──brand──▶ Brand
   │ ├─ currentIngredients : SourcedValue<IngredientRef[]>
   │ ├─ nutrition          : NutritionPanel  (each field a SourcedValue<number>, per 100g/ml)
   │ ├─ additives          : SourcedValue<AdditiveRef[]>
   │ ├─ processing         : ProcessingProfile (multi-dimensional — NEVER a single score)
   │ ├─ category           : CategoryRef
   │ └─ timeline           : TimelineEvent[]
   │
IngredientRef ─▶ Ingredient   (what it is, why used, evidence, regulatory position — all SourcedValue)
AdditiveRef   ─▶ Additive      (specialised ingredient: E-number, functional class, EFSA position)
```

- **NutritionPanel, ProcessingProfile, additive presence, and timeline events are not separate stores — they are all just sourced facts with different predicates.** The trust envelope is uniform because everything is a fact. This is the elegant move that guarantees no view can present an uncited number.
- **ProcessingProfile is explicitly multi-dimensional** (e.g. ingredient transformation, additive function classes, physical processing, cosmetic additives) — each dimension its own `SourcedValue`. The single overall "processing score" is rejected by the PRD and must not exist in the schema.

### `TimelineEvent` (the temporal/provenance backbone for recipe evolution)

```typescript
const TimelineEvent = z.object({
  id: z.string(),
  product: ProductRef,
  date: z.coerce.date().optional(),          // or…
  dateRange: z.object({ from: z.coerce.date(), to: z.coerce.date().optional() }).optional(),
  type: z.enum(['reformulation','size_change','rebrand','discontinuation','claim_change']),
  summary: z.string(),
  changes: z.array(SourcedValue(z.object({ field: z.string(), before: z.any(), after: z.any() }))),
  reason: SourcedValue(z.string()).optional(),  // WHY it changed — only where evidence exists
  // event-level trust envelope as well:
  sources: z.array(SourceRef).min(1),
  confidence: z.enum(['high','medium','low']),
  evidence: z.enum(['primary','secondary','tertiary','inferred']),
});
```

Temporal validity (`validFrom`/`validTo` on facts, `dateRange` on events) is what powers both the **timeline engine** and the **"Expectation vs Reality"** comparison without a second data model.

## Recommended Project Structure

```
src/
├── content.config.ts          # Zod schemas — THE trust-layer gate (define first)
├── schema/
│   ├── sourced-value.ts        # SourcedValue<T>, confidence/evidence enums
│   ├── source.ts               # Source + SourceRef
│   └── entities.ts             # Product, Ingredient, Brand, Additive, TimelineEvent
├── content/                    # CANONICAL STORE (git-versioned truth)
│   ├── products/*.json
│   ├── ingredients/*.json
│   ├── brands/*.json
│   ├── additives/*.json
│   ├── sources/*.json          # the source registry
│   └── timeline/*.json
├── lib/
│   ├── derive/
│   │   ├── comparison.ts        # normalise + build comparison matrix
│   │   ├── timeline.ts          # order + diff events
│   │   └── backlinks.ts         # ingredient→products, source→facts
│   └── format/citation.ts       # render citations consistently
├── components/
│   ├── SourcedFact.astro        # the render-time provenance gate (every value goes through it)
│   ├── ConfidenceBadge.astro
│   ├── CitationFootnote.astro
│   ├── ComparisonExplorer.astro # island
│   └── TimelineExplorer.astro   # island
├── pages/                       # Home, Products, Ingredients, Brands, Categories,
│   │                            #   Timelines, Evidence, Methodology, About, Search
│   └── ...
└── pipeline/                    # OFFLINE — not part of the site build
    ├── import-off.ts            # Open Food Facts importer → drafts
    ├── capture-historic.ts      # Wayback/packaging curation helpers
    └── normalise.ts             # ingredient/E-number resolution
```

### Structure Rationale

- **`schema/` and `content.config.ts` come first** because the trust envelope is foundational, not a feature (an explicit Key Decision). Authoring is impossible until the envelope is defined.
- **`content/` is plain git-versioned files** — local-first by default, no database. Git also gives the *dataset itself* an auditable provenance (who changed which fact, when, why), which reinforces the core value for free.
- **`pipeline/` is deliberately separated** from the site build. Ingestion is offline and out-of-band; the live site never depends on OFF being up.
- **`lib/derive/` is read-only** over the store — every projection (search, comparison, timeline) is derived, so it cannot contradict the citations.

## Architectural Patterns

### Pattern 1: Provenance envelope as a build-failing invariant

**What:** Every fact-bearing field is a `SourcedValue` requiring ≥1 source, a confidence, an evidence level and an updated date. The Zod schema rejects the build if any are missing.
**When to use:** Always — this is the core value made structural.
**Trade-offs:** Slightly heavier authoring (every value is an object, not a scalar) in exchange for a guarantee that an uncited fact can never reach a page. Worth it; it is the product.

```typescript
// A product cannot build unless this validates:
nutrition: z.object({
  energyKcal: SourcedValue(z.number()),
  sugarsG:    SourcedValue(z.number()),
  // …each per-100g value sourced independently
}),
```

### Pattern 2: Single source of truth, everything else derived

**What:** Search index, comparison matrix and timelines are computed at build time from the content store, never authored separately.
**When to use:** All read-side views.
**Trade-offs:** Builds get slower as the dataset grows (mitigated by Astro's content-layer caching and Pagefind's incremental indexing). In return, views can never drift from their citations.

### Pattern 3: Render-time provenance gate (`<SourcedFact>`)

**What:** A single component renders any value together with its source chip, confidence badge, evidence level and updated date. Pages call it rather than printing raw values.
**When to use:** Everywhere a fact is shown.
**Trade-offs:** Mild verbosity; in exchange, "show the source next to the fact" becomes the default path, not a thing to remember.

```astro
<SourcedFact fact={product.nutrition.sugarsG} unit="g/100g" label="Sugars" />
{/* renders: 24g/100g · primary · high · updated 2026-05 · [12] */}
```

### Pattern 4: Open Food Facts as a *lead*, not an authority

**What:** OFF (crowd-sourced) imports as `evidence: tertiary`, `confidence: medium` and stays in a draft state until a curator verifies against a primary source.
**When to use:** All automated ingestion.
**Trade-offs:** More curator effort; prevents a crowd-sourced error from inheriting false authority on a transparency site whose whole premise is trustworthiness.

## Data Flow

### The journey of one sourced fact (ingestion → rendered, cited page)

```
Source discovered
  (OFF dump/API · Wayback CDX · FSA/EFSA doc · manufacturer/supermarket · packaging photo)
        │  ingest (offline pipeline)
        ▼
Draft fact created  =  value + source(s) + provisional confidence/evidence + accessed date
        │  curate (human): verify against primary source, set final confidence + evidence,
        │                  resolve ingredient/E-number refs, register Source in the registry
        ▼
Published entity record committed to the Content Store  (git history = dataset provenance)
        │  build (Astro)
        ▼
SCHEMA VALIDATION GATE  ── reject build if any fact lacks source / confidence / evidence / updated ──┐
        │  pass                                                                                       │ fail → fix
        ▼                                                                                             │
Derivation:  Pagefind search index  +  comparison matrix (normalised)  +  timeline diffs  +  back-links
        │  render
        ▼
Static page: every value emitted through <SourcedFact> → source + confidence + evidence + updated date + citation
        │  deploy
        ▼
Static CDN  (read-heavy public archive — no runtime database, no write-back)
```

**Direction is strictly one-way.** There is no runtime path from a visitor back into the store (community submissions and the public API are explicitly deferred), which removes an entire class of moderation, auth and provenance-spoofing concerns from the MVP.

### Key data flows

1. **Citation flow:** every rendered fact resolves its `SourceRef`s against the registry → the Evidence/Methodology pages are simply the inverse projection (source → every fact citing it).
2. **Comparison flow:** products → normalise each comparable metric to a common basis (per 100g/ml, additive count, processing dimensions) → matrix; comparisons retain each value's confidence so unlike-confidence values are flagged, not silently equated.
3. **Timeline flow:** a product's `TimelineEvent[]` are ordered, diffed (before/after), and rendered; the same temporal data powers "Expectation vs Reality".

## Build Order (dependencies — for the roadmap)

Strict dependency chain. Earlier items must exist before later ones.

| Order | Build | Depends on | Notes for roadmap |
|-------|-------|-----------|-------------------|
| 0 | **Trust-layer primitives** — `SourcedValue`, confidence/evidence enums, Zod schemas | nothing | Foundational. The whole product is impossible without this. Matches the "trust layer is foundational" Key Decision. |
| 1 | **Source registry + `<SourcedFact>`/citation rendering** | 0 | No fact can be displayed honestly until this exists. |
| 2 | **Ingredient + Brand + Additive vocabularies** | 0,1 | Products reference these, so they precede products. Can be stubbed then enriched. |
| 3 | **Product entity + product pages** | 0,1,2 | The spine of the archive. |
| 3b | **OFF ingestion pipeline** | 0 | Parallelisable with 2–3 (depends only on the schema, not on pages). Feeds drafts. |
| 4 | **Search (Pagefind)** | 3 (rendered pages) | Indexes built HTML, so it follows page rendering. |
| 5 | **Comparison engine** | 3 + enough products + normalised metrics | Needs multiple products and unit normalisation. |
| 6 | **Processing explorer** | 3 + processing taxonomy defined in schema | Multi-dimensional; needs the dimension taxonomy settled (research flag). |
| 7 | **Timeline engine** | 3 + `TimelineEvent` + curated historic data | **Long-lead:** gated on slow, manual historic curation (Wayback/packaging). Start the entity early; expect the data to trail. |
| 8 | **Evidence + Methodology pages** | 1 (registry) | Projection of the source registry; naturally late as a synthesis view, but unblocked early. |

**Critical path:** Trust primitives → Sources/citation → Ingredient/Brand/Additive → Product pages → then Search / Comparison / Processing / Timeline / Evidence fan out (mostly parallel), with Timeline bottlenecked on manual historic curation rather than code.

**Research flags for the roadmap:**
- **Timeline / historic curation** — highest-uncertainty area; data quality is uneven and the work is manual. Likely needs its own deeper research and a generous schedule.
- **Processing-dimension taxonomy** — the multi-dimensional model needs a defined, defensible set of dimensions before the explorer can be built. Needs domain/literature research (MEDIUM confidence here).
- **Licensing / IP** — OFF is published under the Open Database Licence (ODbL — attribution and share-alike implications for derived databases) and OFF images under CC-BY-SA; manufacturer/supermarket content carries IP risk. Flag for the pitfalls/licensing researcher. (MEDIUM confidence on exact ODbL obligations — verify before relying on it.)

## Scaling Considerations

The relevant scaling axis here is **content volume and build time**, not concurrent users — a static archive on a CDN serves arbitrary read traffic trivially.

| Scale | Architecture adjustments |
|-------|--------------------------|
| MVP (100 products, 500 ingredients) | Static site + Pagefind is comfortable. No database. Full rebuilds are fine. |
| 1k–5k products | Lean on Astro Content Layer caching and incremental builds; Pagefind still well within range (proven into tens of thousands of pages, ~<300kB index payload on a 10k-page site). |
| 10k+ products | Build time becomes the bottleneck before search does; consider incremental/partial builds and splitting derivation. Pagefind has reported success at the 100k-file mark. |

### Scaling priorities

1. **First bottleneck: build time**, not query performance. Mitigate with content-layer caching and incremental builds before reaching for any server.
2. **Second bottleneck: editorial throughput.** The pipeline is human-gated by design; growth is limited by curation capacity, which is the correct constraint for a trustworthy archive.

## Anti-Patterns

### Anti-Pattern 1: Storing facts without their provenance ("we'll add sources later")

**What people do:** Author bare values and intend to attach citations afterwards.
**Why it's wrong:** It silently destroys the core value; unsourced facts leak onto pages.
**Do this instead:** Make the provenance envelope a build-failing schema invariant — an unsourced fact cannot exist.

### Anti-Pattern 2: A single overall "processing score"

**What people do:** Collapse processing into one number/grade.
**Why it's wrong:** It oversimplifies and misleads — explicitly rejected by the PRD.
**Do this instead:** Model processing as independent, individually sourced dimensions; never sum them.

### Anti-Pattern 3: Treating Open Food Facts as ground truth

**What people do:** Import crowd-sourced data and present it as authoritative.
**Why it's wrong:** Inherited errors undermine a site whose premise is trustworthiness.
**Do this instead:** Import as `tertiary`/`medium` drafts pending curator verification against a primary source.

### Anti-Pattern 4: Mutable overwrite that loses history

**What people do:** Edit a fact in place when a recipe changes.
**Why it's wrong:** Recipe evolution *is* the product; overwriting erases the timeline and the audit trail.
**Do this instead:** Use `validFrom`/`validTo` plus git history; corrections and reformulations are additive and auditable.

### Anti-Pattern 5: Database-first when files suffice

**What people do:** Reach for Postgres on day one.
**Why it's wrong:** Premature infrastructure for a read-only, human-curated archive; loses git's free provenance.
**Do this instead:** Local-first git-versioned files; revisit only if genuine relational/query needs emerge (e.g. the deferred API).

### Anti-Pattern 6: Comparing values across differing units or confidence

**What people do:** Place nutrition values side by side without normalising basis or surfacing confidence.
**Why it's wrong:** Misleads, and quietly contradicts the trust model.
**Do this instead:** Normalise to a common basis (per 100g/ml) and carry confidence/evidence into the comparison UI.

## Integration Points

### External services

| Service | Integration pattern | Notes |
|---------|---------------------|-------|
| Open Food Facts | Offline API/data-dump import → drafts | ODbL licence (attribution + share-alike on derived DBs); crowd-sourced — verify, do not trust. (Verify ODbL specifics.) |
| Internet Archive (Wayback) | CDX API to find snapshots; store `archiveUrl` | Essential against link rot for historic packaging and manufacturer pages. |
| FSA / EFSA | Manual citation of opinions/guidance | Primary regulatory sources; cite, link, store as `Source`. |
| Manufacturer / supermarket sites | Cite + link + snapshot; do **not** reproduce wholesale | IP/trademark risk is a stated constraint — attribute, avoid bulk copying. |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Pipeline → Content store | Write drafts, promote to published (offline) | One-way; live site never depends on the pipeline. |
| Content store → Derivation | Read-only | Search/comparison/timeline are projections; cannot mutate truth. |
| Derivation → Presentation | Static artefacts | Build output only. |
| Presentation → Content store | **None at runtime** | No write-back; community submissions deferred. |

## Sources

- [Wikidata: Data model](https://www.wikidata.org/wiki/Wikidata:Data_model) and [Help:Statements](https://www.wikidata.org/wiki/Help:Statements) — statement model: value + references (provenance) + qualifiers (scope) + rank (HIGH)
- [Nanopublication Guidelines](https://nanopub.net/guidelines/working_draft/) and [Setting publication info and provenance](https://nanopub.readthedocs.io/en/latest/publishing/setting-subgraphs.html) — assertion + provenance + publication-info model (HIGH)
- [Astro Content Collections / Content Layer + Zod schemas](https://docs.astro.build/en/guides/content-collections/) — via Context7 `/withastro/docs`; build-time schema validation with `file()`/`glob()` loaders (HIGH)
- [Pagefind — static low-bandwidth search at scale](https://pagefind.app/) — chunked client-side index, ~<300kB on a 10k-page site, scales into tens/hundreds of thousands of pages (HIGH)
- Open Food Facts licensing (ODbL data, CC-BY-SA images) — MEDIUM, verify exact obligations before relying

---
*Architecture research for: provenance-first UK packaged-food reference archive*
*Researched: 2026-06-30*
