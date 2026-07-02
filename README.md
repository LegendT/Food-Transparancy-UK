# Food Transparency UK

An evidence-based, citation-first archive of how UK packaged-food recipes have
changed over time. Every published fact is traceable to a primary source,
verified to a standard matched to its claim type, and honest about its
uncertainty.

> **Status:** Phases 1, 2 and 3a are complete; Phase 3b is next.
> Phase 1 is the trust/schema foundation. Phase 2 added the claim-typed
> verification model, the per-fact publication gate, a four-verdict citation
> existence checker, Open Food Facts ingestion and a worst-first audit. Phase 3a
> ships server-rendered **product and ingredient pages** over a seed corpus:
> every fact renders through the trust component; any unverified fact appears as
> an explicit "not yet verified - withheld" placeholder rather than an asserted
> value; an accessible nutrition table and a fail-safe allergen render carry the
> highest-stakes data; and the four reader-facing trust states
> (published-confirmed, published-stale "review due", published-contested
> both-sides, withheld) are covered by tests and, where the corpus allows,
> rendered live. Phase 3b adds the site shell, crawlability and the full
> accessibility floor. The live deploy is gated behind HTTP basic auth while
> pre-launch. **Not yet met:** the SC4 seed-corpus target (>=20 products /
> >=40 ingredients) is an editorial deliverable tracked as an acknowledged
> deferral; the machine renders every state correctly on the current small corpus.

## Stack

Static site, local-first, no database and no server runtime:

- **Eleventy 3.1.6** (Nunjucks templates) on **Node 24**
- **Flat JSON** data under `src/_data/` is the canonical fact/source store
- **Ajv + JSON Schema** enforce the trust-layer data model at build time
- **node:test** for the gate and schema tests; **pa11y-ci** for the WCAG floor
- **Netlify** static deploy + **GitHub Actions** CI

## Getting started

```sh
npm install        # installs the pinned dev dependencies (downloads Chromium for pa11y)
npm run build      # runs the three gates, then builds _site/
npm test           # the schema + gate + fixture suite (node --test)
npm run a11y:all   # builds, serves _site, runs pa11y-ci over the routes
npm run dev        # local dev server with live reload (the eleventy.before hook still runs all four gates)
```

`npm run build` is the gated path: it runs `prebuild` (the four validation
gates below) and an `eleventy.before` hook that re-runs them, so a build fails
closed if any fact, image, piece of prose or template breaks a gate.

## The trust gates

Four build-failing gates enforce the core value (no fact ships without its
provenance, verified to its claim type, and no unverified value ever reaches a
reader):

| Gate | Script | Enforces |
|------|--------|----------|
| Data | `scripts/validate-data.mjs` | Ajv structural validation + referential integrity (source-id resolution, GB jurisdiction for regulatory facts, ranged-date order, and dangling product-ingredient / timeline-product references), the per-fact verification/publication derivation, a corpus-escape guard, and a non-zero-fact assertion |
| Editorial | `scripts/check-editorial.mjs` | British English + neutral framing (Class A everywhere, Class B in analyst prose only; verbatim quotes exempt) across prose and data-JSON analyst fields |
| Images | `scripts/check-images.mjs` | Image-rights default-deny (`rightsStatus`) |
| Render safety | `scripts/check-render-safety.mjs` | No template renders **or serialises** a raw fact `.value` outside the sanctioned trust macro (R-31): dot access, bracket access, the `dump`/`tojson`/`jsonScript`/`dictsort` filters, and two-variable object enumeration are all denied, so a withheld or contested value can never reach a reader. The sanctioned macro (exempt from the lint) is backed by a behavioural render test that asserts a withheld value never crosses to HTML |

Every gate's failure path is proven by a negative fixture or test under `test/`.

**The verification model (Phase 2).** A fact is published only when it meets the
standard its claim type demands: a *corroborable* fact needs two confirming
verifications against two distinct-lineage sources (at least one primary); an
*authoritative* fact needs one authority plus an independent re-read. The
derivation is pure (`lib/verification.mjs`) and reused at render time
(`lib/render-state.mjs`), so templates render the derived state, never the raw
value. Citation existence is checked out-of-band by `npm run check:citations`
(four verdicts: RESOLVES / DOES_NOT_RESOLVE / ACCESS_BLOCKED / INDETERMINATE),
which writes the committed, diffable `.cache/citation-verdicts.json`; the build
gate reads that cache offline and never touches the network. `npm run ingest:off`
(Open Food Facts) and `npm run audit` are likewise standalone, never in the build.

## Repository layout

```
src/_data/        canonical JSON: facts (products/, ingredients/, timeline/), the source registry, vocab
src/_includes/    base layout + the sourcedValue / factCell trust macros
src/*.njk         the rendered pages (index, methodology, 404, components-demo, product, ingredient)
schemas/          JSON Schemas (the SourcedValue envelope + entity schemas + the lead schema)
lib/              pure logic: gates (validate, referential, editorial, image), the verification
                  derivation + render-state projection, the reverse index, and the citation-status classifier
scripts/          the four prebuild gate entry points + the standalone network scripts
                  (check-citations, ingest-off, audit-verification) that never run in the build
.cache/           the committed, diffable citation-existence verdict cache (read offline by the gate)
test/             node:test suite + fixtures (valid + invalid)
docs/             the corpus selection rubric, the sourcing backlog, the SPIKE-01 findings
.planning/        GSD planning artefacts (roadmap, phase plans, handoff)
netlify/          the temporary pre-launch basic-auth edge function
```

## Licensing

This repository carries two separate licences:

- **Code** is licensed under the MIT Licence (see [`LICENSE`](LICENSE)). This
  covers the Eleventy build, templates, scripts and validation gates.
- **The canonical dataset** (the fact and source records under `src/_data/`
  and the schemas that shape them) is licensed under the **Open Database
  License (ODbL) 1.0** (see [`LICENSE-DATA`](LICENSE-DATA)). The canonical
  choice is recorded machine-readably in
  [`src/_data/meta.json`](src/_data/meta.json) under `datasetLicence`. CC BY 4.0
  was the flagged alternative considered.

Every source record in [`src/_data/sources.json`](src/_data/sources.json) also
carries its own per-source `licence` object, so each fact's upstream rights are
auditable in place. ODbL governs the database; individual Contents keep their own
rights, and third-party quotations are included under fair dealing rather than
relicensed. Any fact derived from Open Food Facts is identifiable by its `off`
source id; ODbL's share-alike obligation for that data is satisfied by
redistributing the dataset under ODbL.
