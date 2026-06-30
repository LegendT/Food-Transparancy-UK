# Food Transparency UK

An evidence-based, citation-first archive of how UK packaged-food recipes have
changed over time. Every published fact is traceable to a primary source,
verified to a standard matched to its claim type, and honest about its
uncertainty.

> **Status:** Phase 1 (the trust/schema foundation) is complete. There are no
> product pages yet; the site currently renders a home page, a Methodology stub,
> a 404 page and a trust-component demo. The live deploy is gated behind HTTP
> basic auth while pre-launch.

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
npm run dev        # local dev server with live reload (NOTE: dev does not run the gates)
```

`npm run build` is the gated path: it runs `prebuild` (the three validation
gates below) and an `eleventy.before` hook that re-runs them, so a build fails
closed if any fact, image or piece of prose breaks a gate.

## The trust gates

Three build-failing gates enforce the core value (no fact ships without its
provenance, verified to its claim type):

| Gate | Script | Enforces |
|------|--------|----------|
| Data | `scripts/validate-data.mjs` | Ajv structural validation + referential integrity (source-id resolution, GB jurisdiction for regulatory facts, ranged-date order), a corpus-escape guard, and a non-zero-fact assertion |
| Editorial | `scripts/check-editorial.mjs` | British English + neutral framing (Class A everywhere, Class B in analyst prose only; verbatim quotes exempt) across prose and data-JSON analyst fields |
| Images | `scripts/check-images.mjs` | Image-rights default-deny (`rightsStatus`) |

Every gate's failure path is proven by a negative fixture under `test/fixtures/`.

## Repository layout

```
src/_data/        canonical JSON: facts (products/, timeline/), the source registry, vocab
src/_includes/    base layout + the sourcedValue trust macro
src/*.njk         the rendered pages (index, methodology, 404, components-demo)
schemas/          JSON Schemas (the SourcedValue envelope + entity schemas)
lib/              pure gate logic (validate, referential, editorial, image)
scripts/          the prebuild gate entry points
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
