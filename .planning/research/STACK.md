# Stack Research

**Domain:** Content/data-heavy, citation-first, mostly-read public reference database (UK packaged-food transparency)
**Researched:** 2026-06-30
**Confidence:** HIGH

## TL;DR — The Load-Bearing Decisions

1. **Static site generation with Eleventy 3.x.** Every page pre-rendered to HTML. This is the textbook fit for a mostly-read, SEO-critical, citation-first archive — and it is your default stack. No SSR, no client framework.
2. **Flat, structured, git-versioned data files are the canonical store. No database is needed for MVP.** At ~600 core entities and a few thousand facts, Eleventy's in-memory data cascade does every join you need at build time. SQLite is a *reach-for-it-later* build artefact, not a foundation. This honours local-first directly and the data does not yet justify otherwise (full reasoning below).
3. **Pagefind for full-text search.** Fully static, no infrastructure, low bandwidth, accessible, and supports faceted filtering. The clear winner over Lunr, Algolia, or Typesense at this scale.
4. **The trust layer is enforced by a JSON Schema validation gate at build time (Ajv).** Every fact must carry source + confidence + evidence level + update date, or the build fails. This turns your core non-negotiable from a guideline into a hard constraint.
5. **No heavy charting library.** Comparison tables, the processing explorer, and timelines are built with semantic HTML + CSS + build-time SVG. Progressive enhancement, naturally accessible, no canvas. Observable Plot is the fallback *if* you genuinely need richer visuals — rendered to static SVG at build, not shipped as client JS.

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

**Verdict: flat structured files are the canonical store. A database is not justified at MVP scale.**

The data model *is* relational in shape — sources cited by many facts, ingredients in many products (many-to-many), timeline events, evidence linking claims to literature. The instinct to reach for a relational DB is understandable. But shape is not scale:

- **Scale:** ~100 products + ~500 ingredients + brands/categories/evidence ≈ a few thousand pages and maybe single-digit thousands of facts and a few hundred sources. Node holds this in memory effortlessly; build-time joins over it are milliseconds.
- **Normalisation without a DB:** Define each source **once** as an ID-keyed record (e.g. `_data/sources/*.json` or a single `sources.json`), and reference it by ID from facts. Eleventy's data cascade resolves the joins at build. You get normalisation and single-source-of-truth for citations without a database engine.
- **Provenance auditing wants diffs, not rows.** A citation-first archive lives or dies on reviewable change history. "Who changed this fact's confidence level, when, and citing what?" is a `git blame` on a flat file — trivial and transparent. In a DB it requires extra tooling.
- **Local-first / no lock-in:** files in git, no server, no migrations, deployable to any static host. Directly your default.

**When the calculus changes (document the trigger, don't pre-build for it):**
- The dataset grows past ~5–10k entities *and* build-time joins become noticeably slow → introduce **SQLite as a disposable build cache** (files remain canonical, SQLite is generated from them).
- You need ad-hoc analytical queries across the corpus → same: generate SQLite on demand.
- You add the deferred public API or community submissions (Phase 2/3) → reassess then; a write-heavy, multi-user, moderated submission flow is the first thing that genuinely argues for a real database. It is explicitly out of MVP scope, so defer the decision with it.

Net: the data does **not** yet require a database or a search server. Your defaults are correct for this milestone.

## The Search Decision (explicit)

**Verdict: Pagefind.** For ~thousands of static pages it is the modern standard for exactly this stack.

- Indexes the **built HTML** (post-build step), so SSG content "just works".
- No server, no SaaS account, no recurring cost, no lock-in — local-first.
- Small download footprint and lazy-loaded index; good on mobile/low bandwidth.
- Supports **faceted filtering** (filter by additive, category, brand without a search term) — directly useful for the browse/comparison UX, not just text search.
- Accessible drop-in UI you can restyle, or build your own against its JS API for full WCAG control.

**Why not the alternatives** (see table below): Lunr/Elasticlunr ship a large client index and are clunky to maintain; Algolia/Typesense/Meilisearch add infrastructure, cost, and lock-in for a problem you don't have at this scale; Fuse.js means hand-rolling and shipping your own index. Note Pagefind handles *discovery*; the **comparison engine** is a separate concern — pre-generate a `products.json` and do client-side filter/sort/compare in vanilla JS.

## Installation

```bash
# Core
npm install --save-exact @11ty/eleventy@3.1.6
npm install ajv js-yaml gray-matter

# Search (CLI + small runtime; run after build)
npm install pagefind

# Optional, only if richer visuals are genuinely needed
# npm install @observablehq/plot jsdom

# Optional, only if a build-time query cache becomes necessary
# npm install better-sqlite3

# Dev dependencies
npm install -D eslint prettier pa11y-ci
```

```jsonc
// Build pipeline (package.json scripts)
{
  "validate": "node scripts/validate-data.mjs",   // Ajv gate: every fact has provenance
  "build": "npm run validate && eleventy && pagefind --site _site",
  "test:a11y": "pa11y-ci"
}
```

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

**If the dataset stays at MVP scale (~600 entities, a few thousand facts):**
- Flat files + Eleventy cascade only; no SQLite, no search server.
- Because in-memory joins are instant and provenance-in-git is the whole point.

**If the corpus grows past ~5–10k entities and builds slow down:**
- Generate a **SQLite build cache** from the canonical files; query it during build.
- Because files stay canonical/auditable while you regain query speed — no architectural rewrite.

**If Phase 2 (public API + community submissions) lands:**
- Re-evaluate: a moderated, multi-writer, eventing submission flow is the first genuine case for a real database and a query backend (Postgres + Typesense/Meilisearch).
- Because write-heavy multi-user moderation is a different problem from a read-heavy archive — and it's explicitly out of current scope, so decide it then.

**If a specific visualisation can't be a table:**
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

---
*Stack research for: citation-first, read-heavy public reference database*
*Researched: 2026-06-30*
