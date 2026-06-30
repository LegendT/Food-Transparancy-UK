<!-- GSD:project-start source:PROJECT.md -->

## Project

**Food Transparency UK**

Food Transparency UK is an evidence-based, interactive database that explains what packaged foods contain, how their recipes have changed over time, and why those changes happened. (Multi-dimensional processing analysis and a synthesis of the scientific evidence on additives are deferred to v1.x; v1 ingredient pages stay descriptive and cite authoritative regulatory positions rather than synthesising primary studies.) Its editorial thesis is that many everyday "foods" have quietly become a manipulation of the idea of the original — ice cream that is no longer cream and flavouring but stabilisers, oils and additives. The site's job is to make the gap between *what a food used to be* and *what it is now* visible and traceable.

It is built first for the ordinary shopper who has heard of "ultra-processed food" but has never connected that phrase to the specific products in their cupboard or to what those products used to be. Journalists, researchers, teachers, nutrition professionals, students and policymakers are served by the same traceable, primary-source-backed records. The UX assumes no prior expertise: plain English, the "then vs now" comparison up front, jargon defined inline.

**Core Value:** Every published fact is traceable to a primary source, independently verified to a standard matched to the claim, and honest about its uncertainty — transparency over persuasion. If everything else fails, a user must be able to trust that nothing on the site was published without the verification its claim type demands (corroborable facts: two distinct-lineage sources; authoritative facts: one authority plus an independent re-read), that disagreements are escalated for human approval, and that every claim shows its source, date, confidence and evidence level.

### Constraints

- **Two-pass verification (highest priority)**: No fact may be published until verified to the standard its claim type demands. A *corroborable* fact (an empirical claim about the world — e.g. a past or declared formulation) needs two confirming verifications against two distinct-lineage sources (at least one primary; co-derived sources do not count as independent). An *authoritative* fact (what a named authority states — e.g. the current GB regulatory status, or the current official label) needs one authority plus an independent re-read for transcription fidelity (a second "independent source" does not exist and must not be faked). An inaccessible or non-resolving source never satisfies a pass; every citation must pass an automated existence check before a pass counts; a measure mismatch between passes auto-raises a disagreement. Anything the passes do not agree on is withheld and routed to human adjudication, which resolves to confirmed, corrected, or genuinely contested (AI may never adjudicate). The gate is enforced at the level of the individual fact and is continuous: a page publishes its verified subset with any unverified fact shown as an explicit "not yet verified — withheld" placeholder rather than an asserted value, and a fact later found `wrong` is automatically withheld. A genuinely contested fact is published *with* a visible "contested" treatment showing both positions and sources — this is how real disputes are shown honestly rather than hidden. Staleness is flagged by a small set of thresholds so re-verification is a generated queue, not a good intention — "verified and re-verified until we are sure". This follows and strengthens DEBT's `DATA-AUDIT.md` dual-reviewer process. The honest public statement of this model (it is not two independent human reviewers) is itself part of the trust proposition.
- **Editorial integrity**: No claim ships without a source, confidence level, evidence level and update date — this is the core value, not a feature toggle.
- **Neutrality**: Presentation must avoid persuasion/outrage framing; contrast traditional vs current formulations objectively.
- **Data licensing**: Manufacturer content, supermarket archives, and trademarks carry licensing/IP risk — sourcing must respect licences and attribute correctly.
- **Historical data quality**: Recipe-evolution and historic packaging data is uneven; confidence and evidence levels must make gaps explicit rather than implying false certainty.
- **Scientific accuracy**: Nutrition/additive claims must reflect current regulatory positions (FSA/EFSA) and cite literature.
- **Maintenance**: The archive must be maintainable long-term — favour a data model where facts, sources and confidence are first-class.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## TL;DR — The Load-Bearing Decisions

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Eleventy (11ty)** | 3.1.6 (latest stable, May 2025) | Static site generator + build-time data layer | Your default; bundler-free ESM; treats `_data` files as a queryable cascade; outputs crawlable HTML ideal for external citations and SEO. Do **not** use the 4.0 alpha yet. |
| **Node.js** | 22 LTS (or 20 LTS) | Build runtime + ingestion scripts | Required by Eleventy 3; LTS for long-term maintainability of the archive. |
| **Nunjucks / WebC** | bundled with 11ty | Page templating / components | Nunjucks for pages and layouts; WebC for reusable components (the fact-with-provenance "chip", citation footnote, timeline row). Liquid is an equal alternative if preferred. |
| **Flat structured data files** | n/a (JSON + YAML front matter + Markdown) | Canonical fact/source store | Local-first, diffable, reviewable in PRs (provenance auditing happens *in the diff*), zero infrastructure. Genuinely sufficient at this scale. |
| **Ajv + JSON Schema** | Ajv 8.x | Build-time validation of the trust-layer data model | Enforces "no fact without source/confidence/evidence/date" programmatically. The single most important non-default addition — it makes your core value a compile error, not a hope. |
| **Pagefind** | 1.x latest stable (1.3.x at research time; 1.5 in beta) | Static full-text + faceted search | Indexes built HTML post-build; ships ~ < 100 KB index + small WASM client; no server, no SaaS, no lock-in. Accessible drop-in UI, customisable via CSS. |
| **CUBE CSS** | methodology (no dependency) | Styling | Your preference; mobile-first; pairs with vanilla, no framework. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Vanilla JS** | n/a | Comparison engine, timeline interactivity, processing explorer | Pre-generate a `products.json` dataset; do client-side filter/sort/compare in vanilla. Progressive enhancement over a server-rendered baseline. |
| **Observable Plot** | 0.6.x | *Optional* charting, rendered to static SVG at build via jsdom | Only if HTML+CSS+SVG proves insufficient for a specific visual. SVG (not canvas), declarative, build-time renderable so no client JS is shipped. |
| **Apache ECharts** | 5.x | *Last-resort* interactive charts | Only if you later need rich interactive charts; it has a real `aria` config. Heavier; avoid unless a feature demands it. |
| **better-sqlite3** | 12.x | *Optional* build-time query cache | Only if cross-entity queries get slow past a few thousand entities, or you want ad-hoc analytical queries. Disposable build artefact, never the source of truth. |
| **Sveltia CMS** | latest | *Deferred* git-based editorial UI | If/when non-technical contributors need a UI. File-based, stays local-first. The maintained successor to Decap CMS. Not needed for hand-authored MVP. |
| **gray-matter / js-yaml** | latest | Parse front matter / YAML in ingestion + data scripts | Standard for reading structured content files. |

### Data Ingestion (separate build-time tooling, not shipped)

| Tool / Source | Purpose | Notes |
|---------------|---------|-------|
| **Open Food Facts** — API + JSONL/Parquet dump | Seed current ingredients/nutrition for the 100 products | Only 100 products → barcode API lookups are simplest. Treat OFF as **one source to verify, not ground truth** — its data is uneven. **Licence: ODbL v1.0 — attribution AND share-alike.** Flag the share-alike implication for any OFF-derived data you redistribute. |
| **Internet Archive Wayback CDX API** | Find historic snapshots of manufacturer/supermarket pages for the timeline engine | Store the snapshot URL + timestamp as the `source`. Mostly manual curation. |
| **Node or Python scripts** | Transform external data → canonical files with provenance attached | One-off/periodic, run outside the site build. Output goes through the Ajv schema gate. |
| **FSA / EFSA / academic literature** | Regulatory positions + evidence pages | Manual, primary-source curation. Each becomes a normalised `source` record cited by many facts. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **axe-core / pa11y / Lighthouse** | Verify WCAG 2.2 AA after HTML/CSS/JS changes | Your standing rule — compliance verified, not assumed. Wire pa11y-ci into the build. |
| **ESLint + Prettier** | Lint/format | Standard. |
| **Ajv CLI / script** | Run schema validation as a build gate | Fail the build on any fact missing provenance fields. |
| **GitHub Actions** | CI: validate data → build → a11y check → deploy | Keeps the archive's integrity automated and long-term maintainable. |

## The Flat-Files-vs-Database Decision (explicit)

- **Scale:** ~100 products + ~500 ingredients + brands/categories/evidence ≈ a few thousand pages and maybe single-digit thousands of facts and a few hundred sources. Node holds this in memory effortlessly; build-time joins over it are milliseconds.
- **Normalisation without a DB:** Define each source **once** as an ID-keyed record (e.g. `_data/sources/*.json` or a single `sources.json`), and reference it by ID from facts. Eleventy's data cascade resolves the joins at build. You get normalisation and single-source-of-truth for citations without a database engine.
- **Provenance auditing wants diffs, not rows.** A citation-first archive lives or dies on reviewable change history. "Who changed this fact's confidence level, when, and citing what?" is a `git blame` on a flat file — trivial and transparent. In a DB it requires extra tooling.
- **Local-first / no lock-in:** files in git, no server, no migrations, deployable to any static host. Directly your default.
- The dataset grows past ~5–10k entities *and* build-time joins become noticeably slow → introduce **SQLite as a disposable build cache** (files remain canonical, SQLite is generated from them).
- You need ad-hoc analytical queries across the corpus → same: generate SQLite on demand.
- You add the deferred public API or community submissions (Phase 2/3) → reassess then; a write-heavy, multi-user, moderated submission flow is the first thing that genuinely argues for a real database. It is explicitly out of MVP scope, so defer the decision with it.

## The Search Decision (explicit)

- Indexes the **built HTML** (post-build step), so SSG content "just works".
- No server, no SaaS account, no recurring cost, no lock-in — local-first.
- Small download footprint and lazy-loaded index; good on mobile/low bandwidth.
- Supports **faceted filtering** (filter by additive, category, brand without a search term) — directly useful for the browse/comparison UX, not just text search.
- Accessible drop-in UI you can restyle, or build your own against its JS API for full WCAG control.

## Installation

# Core

# Search (CLI + small runtime; run after build)

# Optional, only if richer visuals are genuinely needed

# npm install @observablehq/plot jsdom

# Optional, only if a build-time query cache becomes necessary

# npm install better-sqlite3

# Dev dependencies

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Eleventy (SSG) | Astro | If you later want islands of heavy interactivity (rich client charts, app-like UI). Astro is excellent but heavier and off your default path; not warranted for a read-heavy archive. |
| Eleventy (SSG) | Next.js (SSR/ISR) | Only if content became user-personalised or real-time. It isn't — content changes at editorial cadence, so rebuild-on-change beats a server. |
| Flat files (canonical) | SQLite (canonical) | If you preferred authoring in a DB and generating files. Worse for provenance-in-diff and editorial review; not recommended as canonical, fine as a build cache. |
| Pagefind | Typesense / Meilisearch | If you outgrow static search (tens of thousands of docs, typo-tolerance + instant faceting at large scale, or the Phase-2 API needs a query backend). Adds infra + ops. |
| HTML/CSS/SVG charts | Observable Plot (static SVG) | When a visual genuinely can't be expressed as a table/CSS bars — render to SVG at build so no client JS ships. |
| Hand-authored files | Sveltia CMS (git-based) | When non-technical contributors need a UI. Stays file-based/local-first. Defer past MVP. |
| Netlify | Cloudflare Pages | If public traffic/bandwidth grows — Cloudflare's free bandwidth is more generous for a popular public archive. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| A relational/document **database for the MVP** | Adds a server, migrations, ops, and breaks provenance-in-git; unjustified at ~600 entities | Flat structured files + Eleventy data cascade |
| **Algolia / hosted search SaaS** | Recurring cost, lock-in, infra for a problem static search solves; against local-first | Pagefind |
| **Lunr.js / Elasticlunr** | Ships a large client-side index that grows awkwardly; weaker DX than Pagefind | Pagefind |
| **Chart.js (canvas)** | Canvas has no inherent accessibility; needs manual ARIA wiring and still fails complex-chart audits | Semantic HTML tables + CSS/SVG; Observable Plot/ECharts only if forced |
| A single **"processing score"** charting widget | Explicitly rejected by the product philosophy | Multi-dimensional small-multiples (labelled bars per dimension) |
| **Next.js / SSR** for the read path | Server runtime, cost, and complexity with no benefit for static editorial content | Eleventy SSG + rebuild-on-change |
| **Sanity / hosted document CMS** as canonical store | Hosted document DB conflicts with local-first and pulls provenance out of git diffs | Files in git (Sveltia CMS later if a UI is needed) |
| **Eleventy 4.0 alpha** | Pre-release; unstable for a foundation | Eleventy 3.1.6 stable |

## Stack Patterns by Variant

- Flat files + Eleventy cascade only; no SQLite, no search server.
- Because in-memory joins are instant and provenance-in-git is the whole point.
- Generate a **SQLite build cache** from the canonical files; query it during build.
- Because files stay canonical/auditable while you regain query speed — no architectural rewrite.
- Re-evaluate: a moderated, multi-writer, eventing submission flow is the first genuine case for a real database and a query backend (Postgres + Typesense/Meilisearch).
- Because write-heavy multi-user moderation is a different problem from a read-heavy archive — and it's explicitly out of current scope, so decide it then.
- Observable Plot rendered to **static SVG at build** (jsdom), progressively enhanced.
- Because you keep the no-client-JS baseline and accessibility while gaining expressive charts.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@11ty/eleventy@3.1.6` | Node 18+ (use 20 or 22 LTS) | v3 is ESM-first; author config/scripts as ESM. |
| `pagefind@1.x` | Any SSG output (runs on built HTML) | Run as a post-build step against the output dir; framework-agnostic. |
| `ajv@8` | Node 18+ | JSON Schema draft 2020-12 supported; use for the trust-layer gate. |
| `@observablehq/plot@0.6` | `jsdom` for server/build-time SVG | Pulls D3 as a dependency; only include if actually used. |
| `better-sqlite3@12` | Node 20/22 LTS | Native module; build cache only, not shipped to the client. |

## Sources

- `/11ty/11ty-website` (Context7) — Eleventy 3 data cascade, ESM, build hooks (HIGH)
- https://www.11ty.dev/blog/eleventy-v3-1/ — Eleventy 3.1.0/3.1.6 current stable, perf (HIGH)
- https://pagefind.app/ and GitHub Discussions #512, #1009 — Pagefind faceted/static search, 1.x status (HIGH)
- https://world.openfoodfacts.org/data — OFF JSONL/CSV/Parquet/SQLite dumps + API; ODbL v1.0 attribution + share-alike (HIGH on licence; MEDIUM on exact ingestion workflow)
- https://www.chartjs.org/docs/latest/general/accessibility.html and AG/ECharts a11y docs — canvas-vs-SVG accessibility tradeoffs (MEDIUM)
- SQLite-as-build-cache patterns (sqlsite, static-site-from-db, MCP-cache pattern) — files-canonical / SQLite-disposable approach (MEDIUM)
- Internet Archive Wayback/CDX API — historic snapshot sourcing (MEDIUM, training + domain knowledge)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
