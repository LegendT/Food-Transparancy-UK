# Phase 1: Foundation — Trust Primitives, Schemas, Rights, CI/Deploy & Sourcing Spike - Research

**Researched:** 2026-06-30
**Domain:** Build-time data modelling and gating for a citation-first Eleventy static archive (UK packaged food)
**Confidence:** HIGH (stack, DEBT conventions, gate architecture); MEDIUM (open-data licence choice, legal-edge enforcement detail)

## Summary

Phase 1 builds no product pages. It establishes the data model, the build-failing gates, the source/rights registry, the CI/deploy substrate, and opens the editorial sourcing spike. The whole phase is "make the core value structural before any content exists." Every recommendation below mirrors the DEBT blueprint (`/Users/anthonygeorge/Projects/DEBT`) verbatim where the pattern fits, and extends it deliberately where Food Transparency's data model is genuinely more complex than DEBT's flat metric files.

The single load-bearing decision is **how to validate**. DEBT enforces its data contract with `node:test` iterating over JSON files (zero dependencies, the user's "vanilla" default). Food Transparency's contract is an order of magnitude more complex: a recursive per-field `SourcedValue` envelope, a discriminated corroborable-vs-authoritative union, five entity schemas plus `TimelineEvent`, ranged dates, the 14-allergen controlled vocabulary, and reserved-but-optional verification fields. Hand-rolling recursive structural validation in `node:test` is exactly the "don't hand-roll" trap. The recommendation is a **hybrid**: **Ajv 8 + JSON Schema** for declarative structural validation (the TRUST-05 provenance gate and DATA-11 schema), and **`node:test` (DEBT's pattern, kept verbatim)** as the harness that runs the gates over fixtures and proves every failure path fails, plus the imperative gates JSON Schema cannot express (cross-file referential integrity, the DATA-10 image-rights gate, the UX-06 editorial lint). Ajv is one build-time-only dev dependency, already the accepted choice in the project's own STACK.md, and JSON-Schema-as-data fits an all-JSON, language-agnostic, publishable, diffable dataset far better than a code-coupled validator.

**Primary recommendation:** Build a fresh Eleventy 3.1.6 project mirroring DEBT's `src/_data` + `src/_includes/components/macros.njk` + `test/` + `netlify.toml` conventions. Add a `schemas/` directory of JSON Schema (draft 2020-12) files validated by Ajv in a `prebuild` step, a `lib/` of shared gate logic, and a `test/` suite whose negative fixtures prove each gate fails. Two separate GRADE 4-point enums (confidence, evidence) live in `meta.json`; source-type and licence/rights live in the extended `sources.json`. The image-rights gate, editorial lint, and Ajv validator all run in `prebuild` so `npm run build` (and therefore the Netlify deploy and the GitHub Actions CI) fails on any violation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema / provenance validation (TRUST-05, DATA-11) | Build tooling (`lib/` + Ajv, run in `prebuild`) | — | Must fail the build before render; a compile-time invariant, not a runtime check |
| Source/rights registry (DATA-01/02, TRUST-06) | Data store (`src/_data/sources.json`) | Build tooling (referential test) | Canonical data; integrity enforced at build |
| Image-rights gate (DATA-10) | Build tooling (`lib/check-images` + `prebuild`) | Data store (`images.json` manifest) | Default-deny must block the build |
| Editorial lint (UX-06) | Build tooling (`lib/check-editorial` + `prebuild`/`test`) | — | CI text gate over prose and narrative fields |
| Trust rendering component (TRUST-03/04) | Presentation (Nunjucks macro) | Data store (resolves source IDs) | Server-rendered, no-JS, progressive disclosure via `<details>` |
| CI / deploy substrate (INFRA-01) | Static/CDN (Netlify) | Build tooling (GitHub Actions runs gates + pa11y-ci) | Gates need a host from day one |
| Open-data licence (DATA-12) | Data store (repo `LICENSE-DATA`, `meta.json`) | — | Declarative, in-repo |
| Corpus rubric + spike (PROD-14, SPIKE-01) | Editorial/process artefacts (`docs/`, structured backlog) | Build tooling (test verifies artefact completeness) | Manual work; machine-verifiable deliverables |

## Phase Requirements

<phase_requirements>
| ID | Description | Research Support |
|----|-------------|------------------|
| TRUST-01 | Every fact-bearing field carries source(s), confidence, evidence, last-updated | `SourcedValue` JSON Schema (`$ref` reused on every fact-bearing field); Ajv `required` gate |
| TRUST-02 | Confidence and evidence are two separate fields; source-type lives in registry | Two GRADE 4-point enums in `meta.json`; `sourceType` on the `sources.json` record |
| TRUST-03 | Reader sees source(s) behind a claim (inline citation by source ID) | `sourcedValue` macro resolves `sources[]` against registry via DEBT's `findBy` filter |
| TRUST-04 | Reader sees confidence/evidence/last-updated as text, progressive disclosure | Macro: inline confidence/evidence tokens (text), source/date/rationale behind `<details>` |
| TRUST-05 | Build fails if any fact-bearing field misses provenance | Ajv structural gate in `prebuild`; negative fixtures prove failure |
| TRUST-06 | Regulatory facts record a GB-specific source + checked-on date | `jurisdiction` field on source; referential test asserts GB source for regulatory fields |
| DATA-01 | Source registry record shape (incl. source-type, licence, mandate/incentive) | Extended `sources.json` schema (see Source Registry section) |
| DATA-02 | Each source carries licence + rights status (ODbL auditable) | `licence` object on source record (`shareAlike`, `attributionRequired`) |
| DATA-03 | Ranged / circa dates | Reusable `dateValue` schema (oneOf precise string / tagged range object) |
| DATA-04 | Recipe-change record separates documented change / stated reason / labelled inference | Three distinct named properties on `TimelineEvent.changes[]`; inference never a `SourcedValue` |
| DATA-07 | Structured 14-allergen field | `allergens.json` controlled vocabulary; schema enum of the 14; SourcedValue presence |
| DATA-09 | Schema designates fact-bearing vs metadata | Convention: only fact-bearing fields use the `SourcedValue` `$ref`; validator enforces |
| DATA-10 | Image-rights default-deny gate | `images.json` manifest + `lib/check-images` build gate; default "not-cleared" fails |
| DATA-11 | Entity + TimelineEvent schemas defined first; reserve verification/publication status | Five schemas + `TimelineEvent`; optional empty `verificationStatus`/`publicationStatus` |
| DATA-12 | Canonical dataset under an open licence | Recommend ODbL 1.0 (primary) or CC BY 4.0 (alternative); `LICENSE-DATA` + `meta.json` |
| PROD-14 | Named corpus/Tier A selection rubric, one-line rationale per target | `docs/SELECTION-CRITERIA.md` + structured `sourcing-backlog.json` (>=20, driver + rationale) |
| UX-06 | CI lint: no em-dash, en-GB spelling, neutral editorial style | Extend DEBT `no-emdash` test; denylists in `lib/editorial-rules.mjs` |
| INFRA-01 | Netlify deploy (CSP) + CI running the gates + pa11y-ci | Mirror DEBT `netlify.toml`; GitHub Actions runs `prebuild` gates + `test` + `a11y:ci` |
| SPIKE-01 | Three Tier A products end to end; re-derive corpus target + Tier A gate | `docs/SPIKE-01-FINDINGS.md` + `spike-findings.json`; 3 real entity records dogfood the schema |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No `CONTEXT.md` exists for this phase (discuss-phase has not run; this is standalone research). The following directives from the user's global `CLAUDE.md` carry locked-decision authority and constrain every recommendation:

- **British English everywhere** — code comments, commit messages, user-facing strings, docs (`colour`, `centre`, `organise`, `licence` the noun). This research document and all Phase 1 output must be en-GB. [CITED: ~/.claude/CLAUDE.md]
- **No em-dashes** in code, comments, commits, or prose. (This is itself the UX-06 gate; the research document obeys it.)
- **Conventional commits** (`feat:`, `fix:`, `docs:`, `chore:`, lowercase imperative).
- **WCAG 2.2 AA by default**; semantic HTML, 4.5:1 contrast, 44px targets, keyboard navigable, visible focus, no information by colour alone. pa11y-ci is the automated floor.
- **Mobile first** CSS (base small-screen, `min-width` queries up); **progressive enhancement** (no-JS baseline first).
- **Vanilla unless told otherwise; no new dependency for what a few lines do; local-first data.** This is the reason the Ajv decision is taken *deliberately* (see Standard Stack rationale) rather than by default, and the reason the editorial lint is a curated denylist rather than a spell-check dependency.
- **Don't over-engineer error handling** — boundaries only (the schema gate IS the data boundary).
- **Don't push to remote without asking.**

**Authority note where research files conflict with the contract:** the project-level `ARCHITECTURE.md` was written under an Astro + Zod assumption that the ROADMAP/PROJECT later abandoned in favour of Eleventy + DEBT conventions, and it modelled `evidence` as a source-type enum (`primary/secondary/tertiary/inferred`). **REQUIREMENTS.md TRUST-02 overrides this**: evidence is a GRADE 4-point strength scale and source-type moves to the registry. Where ARCHITECTURE.md and the requirements diverge, the requirements win. This is flagged again in State of the Art.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@11ty/eleventy` | 3.1.6 | Static site generator + build-time data cascade | DEBT's engine; ESM-first; `_data/*.json` auto-loaded as global data so no figure is hard-coded. Do NOT use 4.0.0-alpha (canary). [VERIFIED: npm registry, latest 2026-06-18] [CITED: DEBT/package.json] |
| Node.js | 24 | Build runtime | DEBT pins 24 (`.node-version`, `netlify.toml NODE_VERSION`); Eleventy 3.1.6 supports it. Mirror it. [CITED: DEBT/.node-version] |
| Nunjucks | bundled with 11ty | Templating + component macros | DEBT uses `.njk` for pages, layouts, and `components/macros.njk`. [CITED: DEBT/.eleventy.js] |
| `ajv` | 8.20.0 | Build-time JSON Schema validation (the TRUST-05 / DATA-11 gate) | De-facto JSON Schema validator for Node; draft 2020-12; recursive `$ref`, `oneOf`, `enum`, `if/then`. The deliberate non-default addition. [VERIFIED: npm registry] [CITED: project STACK.md] |
| `ajv-formats` | 3.0.1 | `date` / `date-time` / `uri` format validation for Ajv | Ajv 8 ships no formats by default; this adds the date and URL checks the envelope needs. [VERIFIED: npm registry] |
| `node:test` | built-in (Node 24) | Test harness + the gates JSON Schema cannot express | DEBT's `data.test.js` / `no-emdash.test.js` pattern; zero dependencies; runs the negative fixtures that prove each gate fails. [CITED: DEBT/test/] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pa11y-ci` | 4.1.1 | WCAG 2.2 AA automated floor across every route (SITE-04) | DEBT wires it via `start-server-and-test` + `http-server`. Phase 1 audits home, methodology stub, 404. [VERIFIED: npm registry] [CITED: DEBT/.pa11yci.json] |
| `start-server-and-test` | 3.0.11 | Serve `_site` then run pa11y-ci in CI | DEBT's `a11y:all` script pattern. [VERIFIED: npm registry] [CITED: DEBT/package.json] |
| `http-server` | 14.1.1 | Static server for the a11y run | DEBT's `a11y:serve`. [VERIFIED: npm registry] |
| `pagefind` | 1.5.2 | Static search (Phase 5, not Phase 1) | Listed only so the planner does NOT install it now. Search is Phase 5. [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Ajv + JSON Schema | `node:test` only (DEBT's exact approach) | Zero deps, fully "vanilla", but you re-implement recursive validation, discriminated unions, and structured error reporting by hand for a genuinely complex nested model. The "don't hand-roll" line is crossed. Acceptable only if the model stayed as flat as DEBT's, which it does not. |
| Ajv + JSON Schema | Zod (as ARCHITECTURE.md proposed) | Zod couples the schema to TypeScript code. JSON Schema keeps the schema as language-agnostic, publishable, diffable data that ships with the DATA-12 open dataset and that the Methodology page (SITE-02) can mirror. JSON-first project favours JSON Schema. |
| Curated en-GB denylist (UX-06) | A full spell-check dependency (e.g. an en-GB dictionary) | A dictionary catches more but adds a dependency and noise (proper nouns, ingredient names, E-numbers). The denylist of common US spellings is "a few lines," expandable, and respects the no-new-dependency rule. Flagged as heuristic, not exhaustive. |
| ODbL 1.0 for the dataset (DATA-12) | CC BY 4.0 | See Open-Data Licence section. Genuine policy choice; needs user confirmation. |

**Installation:**
```bash
npm install --save-exact @11ty/eleventy@3.1.6
npm install --save-dev ajv@8.20.0 ajv-formats@3.0.1 pa11y-ci@4.1.1 start-server-and-test@3.0.11 http-server@14.1.1
```
`ajv`/`ajv-formats` are build-time only and belong in `devDependencies` (they never ship to the browser; the site is static HTML).

## Package Legitimacy Audit

`slopcheck` could not be installed in this session (no network egress for `pip install`). Per the legitimacy protocol, packages would normally be tagged `[ASSUMED]` and gated. However, every package below is independently corroborated by an authoritative in-session source: it is either present and in active use in the DEBT reference codebase (`package.json`/`.pa11yci.json` read this session) or recommended by the project's own accepted STACK.md research (Context7/official-docs provenance). All versions and existence were confirmed against the npm registry. The "no `postinstall` scripts" claim holds for the six DIRECT dependencies only: the transitive chain `pa11y-ci -> pa11y -> puppeteer` runs an install-time Chromium download, which is expected and acknowledged (not slop). The planner must therefore review the full resolved tree (`npm ls --all` / the committed lockfile), not just these six names, and confirm the lockfile is committed before CI runs.

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `@11ty/eleventy` | npm | mature | github.com/11ty/eleventy | unavailable | Approved (in DEBT use; no postinstall) |
| `ajv` | npm | mature | github.com/ajv-validator/ajv | unavailable | Approved (STACK.md; no postinstall) |
| `ajv-formats` | npm | mature | github.com/ajv-validator/ajv-formats | unavailable | Approved (official Ajv org; no postinstall) |
| `pa11y-ci` | npm | mature | github.com/pa11y/pa11y-ci | unavailable | Approved (in DEBT use; no postinstall) |
| `start-server-and-test` | npm | mature | github.com/bahmutov/start-server-and-test | unavailable | Approved (in DEBT use) |
| `http-server` | npm | mature | github.com/http-party/http-server | unavailable | Approved (in DEBT use) |
| `pagefind` | npm | mature | github.com/Pagefind/pagefind | unavailable | Deferred to Phase 5 (do not install now) |

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

*Because slopcheck was unavailable, the planner should still insert a single `checkpoint:human-verify` confirming the dependency list before the first `npm install`, per protocol. The risk is low: all are first-party tooling already proven in DEBT, but the checkpoint is cheap.*

## Architecture Patterns

### System Architecture Diagram

```
   EDITORIAL / DATA AUTHORING (offline, human)
   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
   │ entity JSON   │  │ sources.json  │  │ images.json       │
   │ (products,    │  │ (registry +   │  │ (rights manifest, │
   │ ingredients,  │  │ licence/rights│  │ default not-      │
   │ timeline...)  │  │ /jurisdiction)│  │ cleared)          │
   └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘
          │                 │                   │
          ▼                 ▼                   ▼
   ┌───────────────────────────────────────────────────────┐
   │  prebuild GATES  (fail the build → fail Netlify deploy)│
   │   1. Ajv structural validation  (TRUST-05, DATA-11,    │
   │      DATA-03/04/07, claim-type shape)                  │
   │   2. referential integrity      (source IDs resolve;   │
   │      TRUST-06 GB-jurisdiction for regulatory facts)    │
   │   3. image-rights gate          (DATA-10 default-deny) │
   │   4. editorial lint             (UX-06 en-GB + neutral)│
   └───────────────────────────┬───────────────────────────┘
              pass │ fail → non-zero exit, build stops
                   ▼
   ┌───────────────────────────────────────────────────────┐
   │  ELEVENTY BUILD → static HTML                          │
   │   every fact rendered via sourcedValue() macro:        │
   │   value + inline confidence/evidence tokens (text)     │
   │   + <details> source/date/rationale (progressive)      │
   │   Methodology stub anchors the tokens                  │
   └───────────────────────────┬───────────────────────────┘
                   ▼
   ┌──────────────┐    ┌────────────────────────────────────┐
   │ pa11y-ci over │    │ Netlify static deploy + CSP/headers │
   │ built _site   │    │ (INFRA-01)                          │
   └──────────────┘    └────────────────────────────────────┘

   PARALLEL EDITORIAL TRACK (manual; verifiable artefacts):
   SELECTION-CRITERIA.md + sourcing-backlog.json (>=20, driver+rationale)
   SPIKE-01-FINDINGS.md + spike-findings.json + 3 real entity records
   → re-derive PROD-12 corpus target + Tier A entry gate
```

The `prebuild` gates run before `eleventy`. Because Netlify's build command is `npm run build`, npm's `prebuild` lifecycle fires the four logical gates (across three prebuild scripts: validate-data runs Ajv + referential + the date-range check; check-editorial; check-images) on every deploy: a violation exits non-zero and the deploy fails. The same gates plus `npm test` (the negative-fixture suite) plus `npm run a11y:ci` run in GitHub Actions on every push/PR.

### Recommended Project Structure
```
food-transparency/
├── .eleventy.js                 # mirror DEBT; keep findBy, readableDate, isoDate, number, jsonScript filters
├── .node-version                # "24" (mirror DEBT)
├── .pa11yci.json                # mirror DEBT; Phase 1 urls: /, /methodology/, /404.html, /components-demo/
├── netlify.toml                 # mirror DEBT CSP + headers; NODE_VERSION 24
├── package.json                 # type:module; scripts below
├── LICENSE                      # MIT, code (mirror DEBT)
├── LICENSE-DATA                 # DATA-12 dataset open licence (ODbL 1.0 or CC BY 4.0)
├── .github/workflows/ci.yml     # runs gates + test + build + a11y:ci
├── schemas/                     # JSON Schema, draft 2020-12
│   ├── sourced-value.schema.json   # the envelope; $ref'd by every fact-bearing field
│   ├── date-value.schema.json      # ranged/circa dates (DATA-03)
│   ├── source.schema.json          # registry record (DATA-01/02)
│   ├── product.schema.json
│   ├── ingredient.schema.json
│   ├── brand.schema.json
│   ├── additive.schema.json
│   ├── timeline-event.schema.json  # DATA-04 separation, ranged dates
│   └── image.schema.json           # DATA-10 rights record
├── lib/                         # shared gate logic (DEBT's unit-tested lib/ convention)
│   ├── validate.mjs                # compile schemas, validate dataset → {errors}
│   ├── referential.mjs             # source-ID resolution, TRUST-06 jurisdiction
│   ├── check-images.mjs            # DATA-10 default-deny logic
│   └── editorial-rules.mjs         # UX-06 denylists + lint logic
├── scripts/                     # thin CLI wrappers: run lib, process.exit(1) on error
│   ├── validate-data.mjs
│   ├── check-images.mjs
│   └── check-editorial.mjs
├── src/
│   ├── _data/
│   │   ├── meta.json               # confidenceLevels + evidenceLevels (TRUST-02), datasetLicence
│   │   ├── site.json               # nav, lang en-GB (mirror DEBT)
│   │   ├── sources.json            # registry (DATA-01/02/TRUST-06)
│   │   ├── allergens.json          # the 14 GB allergens controlled vocab (DATA-07)
│   │   ├── images.json             # image-rights manifest (DATA-10)
│   │   ├── products/               # empty in Phase 1 except 3 spike records
│   │   ├── ingredients/
│   │   ├── brands/
│   │   ├── additives/
│   │   └── timeline/
│   ├── _includes/
│   │   ├── layouts/base.njk
│   │   └── components/macros.njk   # extend DEBT: sourcedValue, confidenceEvidenceToken
│   ├── index.njk
│   ├── methodology.njk             # stub (success criterion 5) + worked example fact (criterion 1)
│   ├── components-demo.njk         # fixture page proving the trust component renders
│   └── 404.njk
├── test/
│   ├── schema.test.js              # Ajv over valid fixtures + every invalid fixture
│   ├── referential.test.js         # source-ID + TRUST-06 negative cases
│   ├── images.test.js              # DATA-10 uncleared packshot fails
│   ├── editorial.test.js           # UX-06 em-dash/spelling/superlative/motive cases
│   ├── backlog.test.js             # PROD-14: >=20 targets, each driver + rationale
│   ├── spike.test.js               # SPIKE-01: 3 products, effort + dead-end + re-derived figures
│   └── fixtures/
│       ├── valid/*.json
│       └── invalid/*.json          # the corpus that proves the gates fail
└── docs/
    ├── SELECTION-CRITERIA.md       # PROD-14 named rubric
    ├── sourcing-backlog.json       # PROD-14 structured backlog (machine-verifiable)
    ├── SPIKE-01-FINDINGS.md        # SPIKE-01 narrative
    └── spike-findings.json         # SPIKE-01 structured findings
```

### Pattern 1: The `SourcedValue` envelope as a reusable `$ref`
**What:** Every fact-bearing field is an object validated against one shared schema. Metadata fields (ids, slugs, display labels) are plain scalars and are exempt (this is the DATA-09 designation in practice: a field is fact-bearing if and only if its schema uses the `SourcedValue` `$ref`).
**When to use:** Every empirical claim. Never on structural/administrative fields.
**Example:**
```jsonc
// schemas/sourced-value.schema.json (draft 2020-12)
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://foodtransparency.uk/schemas/sourced-value.schema.json",
  "type": "object",
  "required": ["value", "sources", "confidence", "evidence", "updated", "claimType"],
  "additionalProperties": false,
  "properties": {
    "value": {},                                  // any type; the asserted value
    "sources": {                                  // >=1 source ID; provenance is mandatory
      "type": "array", "minItems": 1, "uniqueItems": true,
      "items": { "type": "string" }               // resolved against sources.json; uniqueItems so ["off","off"] cannot fake minItems:2 (lineage-level distinctness is a Phase 2 concern)
    },
    "confidence": { "$ref": "#/$defs/grade" },    // curator certainty (TRUST-02)
    "evidence":   { "$ref": "#/$defs/grade" },    // evidence strength (TRUST-02)
    "updated":    { "type": "string", "format": "date" },
    "checkedOn":  { "type": "string", "format": "date" },   // optional; REQUIRED for regulatory facts (TRUST-06); the referential gate enforces it, the macro renders it
    "claimType":  { "enum": ["corroborable", "authoritative"] },
    "claimDomain": { "enum": ["general", "regulatory", "nutrition", "allergen", "ingredient-function"] }, // optional discriminator; claimDomain:"regulatory" triggers the TRUST-06 GB-source + checkedOn rule in the referential gate
    "note":       { "type": "string" },
    // Reserved for Phase 2 (DATA-11): present-and-empty-allowed, validated as optional
    "verificationStatus": { "type": ["string", "null"] },
    "publicationStatus":  { "type": ["string", "null"] }
  },
  "$defs": { "grade": { "enum": ["high", "moderate", "low", "very-low"] } },
  // Phase 1 STRUCTURAL claim-type rule (workflow counting is Phase 2):
  "allOf": [
    { "if": { "type": "object", "properties": { "claimType": { "const": "corroborable" } } },
      "then": { "properties": { "sources": { "type": "array", "minItems": 2 } } } }
    // Restate "type" in both branches to silence Ajv strictTypes:"log" and future-proof
    // against strictTypes:true. authoritative: one authority source is sufficient
    // (minItems 1 from base); the transcription re-read record is added by Phase 2 (VRFY-01).
  ]
}
```
Every fact-bearing field in the entity schemas is then just `{ "$ref": "sourced-value.schema.json" }`, so the trust contract is defined once and cannot drift per field.

**Ranged date model (`date-value.schema.json`, DATA-03).** A range's `from`/`to` each accept a full ISO date OR a bare 4-digit year, and nothing else, so a precise date or a year validates but an arbitrary string does not:
```jsonc
"from": { "anyOf": [ { "type": "string", "format": "date" }, { "type": "string", "pattern": "^[0-9]{4}$" } ] }
```
JSON Schema cannot express `to >= from`. The structural shape (missing `from`, non-date/non-year) is asserted by Ajv; the **order** check is an imperative `checkDateRanges()` in the validation gate (Plan 01-05), never Ajv. Method (no Date objects): normalise every bound to a full `YYYY-MM-DD` string (a 4-digit year on `from` becomes `-01-01`, on `to` becomes `-12-31`), then compare the two strings lexicographically (ISO date strings sort chronologically), erroring when `to` sorts earlier than `from`. This removes the string-vs-Date hazard.

### Pattern 2: Two-axis trust in `meta.json`, source-type in the registry
**What:** `confidence` and `evidence` are two separate GRADE 4-point enums defined in `meta.json` (mirroring DEBT's single `confidenceLevels` block). Source-type (`primary/secondary/tertiary/grey`) is NOT on the fact; it lives on the source record (TRUST-02, DATA-01).
**Example:**
```jsonc
// src/_data/meta.json
{
  "confidenceLevels": {                            // curator's certainty this record is correct and current
    "high":     "Directly confirmed against a primary source; no material ambiguity.",
    "moderate": "Confirmed, with a minor gap or a secondary corroboration.",
    "low":      "Single weak source or a hard-to-read artefact; treat with caution.",
    "very-low": "Fragmentary evidence; recorded honestly as uncertain."
  },
  "evidenceLevels": {                              // GRADE strength of the underlying scientific/regulatory evidence
    "high":     "Strong regulatory position or systematic-review-grade evidence.",
    "moderate": "A single authoritative opinion or consistent secondary evidence.",
    "low":      "Limited or indirect evidence.",
    "very-low": "Mechanistic or anecdotal only."
  },
  "datasetLicence": { "id": "ODbL-1.0", "url": "https://opendatacommons.org/licenses/odbl/1-0/" }
}
```

### Pattern 3: The trust rendering macro (extend DEBT's `sourceNote`/`dataFreshnessBadge`)
**What:** A single `sourcedValue` macro renders a fact with its value, two inline text tokens (confidence, evidence), and source/date/rationale behind a `<details>` element (TRUST-03/04 progressive disclosure). It reuses DEBT's existing `findBy` filter to resolve source IDs and `readableDate` to format dates, both already in `.eleventy.js`.
**Macro contract:** `sourcedValue(fact, sources, label, unit)` where `fact` is a SourcedValue object and `sources` is the **registry array**. `sources.json` is an object `{note, sources:[...]}`, so pass `sources.sources` — DEBT's `findBy` returns `undefined` for a non-array, so passing the wrapper object would render the source list silently empty and TRUST-03 would fail.
```njk
{# src/_includes/components/macros.njk (extends DEBT's macros.njk) #}
{% macro sourcedValue(fact, sources, label, unit) %}
<div class="fact">
  {% if label %}<span class="fact__label">{{ label }}:</span> {% endif %}
  <span class="fact__value">{{ fact.value }}{{ unit }}</span>
  {# Two separate text tokens, colour-independent (SITE-04). Link to the Methodology anchors. #}
  <span class="fact__trust">
    (<a href="/methodology/#confidence">confidence {{ fact.confidence }}<span class="visually-hidden"> (curator certainty)</span></a>,
     <a href="/methodology/#evidence">evidence {{ fact.evidence }}<span class="visually-hidden"> (evidence strength)</span></a>)
  </span>
  <details class="fact__detail">
    <summary>Source and date</summary>
    <ul>
    {% for id in fact.sources %}{% set s = sources | findBy("id", id) %}
      <li>{% if s.url %}<a href="{{ s.url }}" rel="noopener">{{ s.name }}</a>{% else %}{{ s.name }}{% endif %}{% if s.jurisdiction %} ({{ s.jurisdiction }}){% endif %}.</li>
    {% endfor %}
    </ul>
    <p>Last updated {{ fact.updated | readableDate }}.{% if fact.checkedOn %} Checked on {{ fact.checkedOn | readableDate }}.{% endif %}</p>
    {% if fact.note %}<p class="fact__note">{{ fact.note }}</p>{% endif %}
  </details>
</div>
{% endmacro %}
```
The demonstration page (success criterion 1) renders a fixture fact through this macro; the Methodology stub (success criterion 5) hosts the `#confidence` / `#evidence` anchors the tokens link to. Build the demonstration as `components-demo.njk` (a pa11y-ci target) and embed one worked example in `methodology.njk`. The `.fact` wrapper is a block `<div>` because a `<span>` cannot validly contain `<details>`/`<ul>`, and every Phase 3 page inherits this macro. `styles.css` must give links and every `<summary>` the GOV.UK focus treatment (yellow #ffdd00 background, black text, a thick black bottom border / box-shadow), not merely a generic visible outline. pa11y is the floor, not proof of usability: a one-off manual keyboard + screen-reader pass over the demo is required (pa11y misses invalid nesting and focus quality).

### Pattern 4: Gates share `lib/` logic with their tests (DEBT convention)
**What:** Each gate's logic lives in `lib/` (pure functions returning `{errors}`), imported by both a `scripts/` CLI wrapper (runs over real data, `process.exit(1)` on error, wired into `prebuild`) and a `test/` file (runs over fixtures, asserts pass/fail). This is DEBT's "ESM tool maths in a unit-tested `lib/`" pattern applied to the gates.

### Anti-Patterns to Avoid
- **Putting source-type on the fact.** TRUST-02 explicitly moves it to the registry. A fact carries confidence + evidence only.
- **Using `| safe` on ingested/external strings.** Nunjucks autoescapes by default; keep it that way for any OFF/manufacturer-derived value (stored-XSS risk, see Security Domain).
- **A single combined "trust score."** Confidence and evidence are two axes and must never be collapsed (mirrors the rejected "processing score").
- **Storing `labelledInference` as a `SourcedValue`.** Inference is opinion, not fact; it must be a distinct shape with a `basis`, never the envelope (DATA-04, defamation bright line).
- **Promoting a Wayback capture date to a change date.** Use ranged dates with a `basis` (DATA-03; this is mostly Phase 8 but the schema must support it now).
- **Building the Phase 4 motive publication gate now.** Phase 1 ships the UX-06 *text lint* only; the data-level no-imputation-of-motive gate tied to mandate/incentive drivers is Phase 4.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive structural validation of nested envelopes | A bespoke `node:test` walker over every nested field | Ajv + JSON Schema `$ref` | Recursion, `oneOf`/discriminator, format checks, and structured error paths are exactly what a schema validator exists to do |
| Discriminated corroborable/authoritative union | Hand-coded branching in tests | Ajv `if/then` on `claimType` (or `discriminator: true`) | Declarative, documented in the schema, mirrored by the Methodology page |
| Date/URL format checking | Regexes scattered through tests | `ajv-formats` (`date`, `uri`) | One vetted implementation; consistent errors |
| WCAG checking | Manual checklist | pa11y-ci (DEBT pattern) | Automated floor across every route |
| A11y serve-then-test orchestration | Shell glue | `start-server-and-test` + `http-server` | DEBT already proved this exact wiring |

**Key insight:** the one thing you SHOULD hand-roll is the editorial lint (UX-06) and the cross-file referential/image gates, because they are domain-specific, a few lines each, and adding a dependency for them would violate the user's "no new dependency for what a few lines do" rule. Structural schema validation is the opposite case: genuinely complex, well-served by Ajv, and already an accepted project decision.

## Source / Rights Registry (DATA-01 / DATA-02 / TRUST-06)

Extend DEBT's `sources.json` record (which has `id/name/publisher/url/covers/updateFrequency/confidence_level`). The Food Transparency record drops the per-source `confidence_level` (confidence is now a per-fact axis) and adds:

```jsonc
// src/_data/sources.json — one record, validated by source.schema.json
{
  "id": "off",
  "name": "Open Food Facts",
  "publisher": "Open Food Facts contributors",
  "url": "https://world.openfoodfacts.org/",
  "covers": "Crowd-sourced current ingredients and nutrition for packaged products.",
  "updateFrequency": "Continuous",
  "retrievedDate": "2026-06-30",
  "sourceType": "tertiary",                        // primary | secondary | tertiary | grey  (DATA-01, TRUST-02)
  "jurisdiction": "international",                  // GB | EU | international  (TRUST-06 separation)
  "licence": {
    "id": "ODbL-1.0",
    "url": "https://opendatacommons.org/licenses/odbl/1-0/",
    "attributionRequired": true,
    "shareAlike": true                             // makes the ODbL obligation auditable (DATA-02)
  },
  "driver": null                                   // for policy sources: { "type": "mandate"|"incentive", "name": "..." }
}
```
- **OFF-derived values are tagged separably for ODbL by construction:** any fact whose `sources[]` includes the `off` source id (whose `licence.shareAlike` is true) is OFF-derived. A `lib/referential.mjs` query walks every fact and lists OFF-derived facts; no separate per-field flag is needed. This satisfies the PITFALLS.md "provenance-tag at source, make `source = Open Food Facts` a first-class queryable attribute" requirement.
- **TRUST-06 GB-vs-EU:** the `jurisdiction` enum is `GB | EU | international`. A referential test asserts that any fact on a regulatory-position field cites at least one `jurisdiction: "GB"` source and carries a `checkedOn` date. An EU/EFSA source alone fails the gate for a GB regulatory claim. (Phase 1 has no regulatory facts yet, so this is proved by a negative fixture; full use lands in Phase 3a.)
- **Mandate-vs-incentive (DATA-01):** policy-driver sources carry `driver.type`. This flag is *recorded* in Phase 1 and *enforced* in Phase 4 (PROD-08: a mandate may be stated as cause, an incentive only as context). Do not build the enforcement now.

## Open-Data Licence Decision (DATA-12)

**Recommendation (primary): licence the canonical dataset under ODbL 1.0; keep the code under MIT.** [ASSUMED — needs user confirmation]

Reasoning:
- The dataset is a *database* (relational-shaped facts + sources), so a database licence (ODbL or ODC) fits better than a content licence.
- OFF is ODbL. If the published Food Transparency dataset is itself ODbL, redistributing any OFF-derived subset is automatically licence-compatible and the share-alike obligation is satisfied in place. This dissolves the "ODbL share-alike silently contaminates the whole database" pitfall (PITFALLS.md #1) for the *published* dataset: there is nothing to contaminate because the whole thing is already share-alike.
- Share-alike actively serves the DATA-12 goal ("can be reused and can outlive its maintainer"): it guarantees derivatives stay open.

**Alternative: CC BY 4.0** (permissive attribution; CC BY 4.0 does cover sui-generis database rights). Choose this only if the project prefers maximally frictionless reuse over share-alike, AND commits to keeping OFF-derived data architecturally segregated out of any bulk export (so a CC-BY export of *own* data is not a derivative of ODbL OFF data). This is the harder operational path.

This is a genuine policy choice with valid alternatives, so it is tagged `[ASSUMED]` and listed in the Assumptions Log: confirm with the user before locking. Declaration in-repo, regardless of choice: a `LICENSE-DATA` file (full licence text), a `meta.json` `datasetLicence` field, a README section stating the code/data licence split, and the per-source `licence` on every registry record. Code stays MIT (mirror DEBT's `LICENSE`).

## Allergen Field (DATA-07)

The 14 GB-regulated major allergens (retained Food Information Regulations 2014 / Regulation 1169/2011): celery; cereals containing gluten; crustaceans; eggs; fish; lupin; milk; molluscs; mustard; tree nuts; peanuts; sesame; soybeans; sulphur dioxide and sulphites. [CITED: UK FSA allergen guidance — verify exact wording at publish] Model as a controlled vocabulary in `src/_data/allergens.json`, with the product schema carrying a structured `allergens` array. CRITICAL Ajv modelling rule: each allergen item must NEST its provenance under a `provenance` property that `$ref`s the SourcedValue envelope, NOT spread the envelope via `allOf:[{$ref:sourced-value},{properties:{allergen,presence}}]`. With `additionalProperties:false` on the envelope, Ajv does NOT see sibling `allergen`/`presence` from another `allOf`/`$ref` branch (per the Ajv FAQ on `additionalProperties` with combined schemas), so a spread item fails validation for EVERY record. Nest instead:
```jsonc
// product schema: allergens array item (NESTED provenance, NOT spread)
"allergens": {
  "type": "array",
  "items": {
    "type": "object",
    "additionalProperties": false,
    "required": ["allergen", "presence", "provenance"],
    "properties": {
      "allergen":  { "enum": [ /* the 14 ids from allergens.json */ ] },
      "presence":  { "enum": ["present", "may-contain", "absent"] },
      "provenance": { "$ref": "sourced-value.schema.json" }   // the envelope lives here, nested
    }
  }
}
```
The allergen enum is the 14 allergen ids; a 15th or a typo fails validation (negative fixture). `presence` carries the three-state vocabulary so "may contain" is never silently equated with "present." The schema-consistency test therefore reads the allergen enum at `product...allergens.items.properties.allergen.enum` and the DATA-09 provenance guard at `product...allergens.items.properties.provenance.$ref`. (The regulatory `allOf`+`const` pattern on SCALAR fact-bearing fields is fine and stays: it adds NO new property to the envelope, it only constrains `claimDomain`. Only the allergen item added sibling properties, which is the bug this nesting fixes.)

## Runtime State Inventory

Phase 1 is greenfield (a fresh repository, no pre-existing runtime state, no rename/migration). This section is included only to record that the check was performed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — fresh repo; the 3 SPIKE-01 records are the first data written | None |
| Live service config | Netlify site to be created; no pre-existing config | Create Netlify site (INFRA-01) |
| OS-registered state | None | None |
| Secrets/env vars | None in Phase 1 (OFF ingestion keys are Phase 2) | None — keep secrets out of the repo |
| Build artefacts | None (no prior build) | None |

## Common Pitfalls

### Pitfall 1: Evidence modelled as source-type
**What goes wrong:** Copying ARCHITECTURE.md's `evidence: primary/secondary/tertiary/inferred` enum.
**Why it happens:** The older research file predates the TRUST-02 refinement.
**How to avoid:** Evidence is the GRADE 4-point scale; source-type is a registry field. Enforce both enums from `meta.json`.
**Warning signs:** A fact with `evidence: "primary"`; a source record with no `sourceType`.

### Pitfall 2: The build gates do not actually fail the deploy
**What goes wrong:** Gates exist as `npm test` only, so a bad commit still deploys because Netlify runs `npm run build`, not `npm test`.
**Why it happens:** DEBT runs tests separately from the build; copying that verbatim leaves the gates toothless for deploy.
**How to avoid:** Put the four gates in `prebuild` (npm lifecycle) so `npm run build` runs them and a non-zero exit stops the deploy. Keep `npm test` as the *negative-fixture* suite that proves the gates fail, run in CI.
**Warning signs:** A deliberately-broken fixture deploys successfully.

### Pitfall 3: Editorial lint false positives block legitimate copy
**What goes wrong:** A denylist token matches inside a legitimate word or a proper noun (for example a US-spelling substring inside a brand name).
**Why it happens:** Substring matching instead of word-boundary matching.
**How to avoid:** Use word-boundary regexes (`\b`), scan only prose (`.njk`/`.md` text and designated narrative fields), and keep the denylists small and curated in `lib/editorial-rules.mjs`. Report offender + file + line.
**Warning signs:** The lint flags an ingredient name or a registry field value.

### Pitfall 4: Image gate checks the manifest, not what is actually referenced
**What goes wrong:** An uncleared image is referenced by an entity but absent from the manifest, so the gate passes.
**Why it happens:** Gating the manifest in isolation.
**How to avoid:** The gate must enumerate images *referenced by entity data* (and, once pages exist, by rendered output) and assert each has a manifest record with an allowed `rightsStatus`. A referenced-but-unmanifested image is treated as `not-cleared` and fails. In Phase 1 (no product pages) the negative fixture is a manifest packshot with `rightsStatus: "not-cleared"` plus a referenced image with no record.

### Pitfall 5: Claim-type counting over-built into Phase 1
**What goes wrong:** Implementing the full two-pass verification workflow (counting independent passes, disagreement routing) in Phase 1.
**Why it happens:** The validation requirement lists claim-type negative tests, which reads like full enforcement.
**How to avoid:** Phase 1 enforces only the *structural* claim-type shape (corroborable requires `sources.minItems: 2`; authoritative requires the authority source; the transcription re-read and pass-counting are Phase 2 / VRFY-01). Negative fixtures prove the structural rule. The workflow is Phase 2.

## Code Examples

### `prebuild` wiring (package.json)
```jsonc
{
  "type": "module",
  "scripts": {
    "validate":       "node scripts/validate-data.mjs",
    "lint:editorial": "node scripts/check-editorial.mjs",
    "check:images":   "node scripts/check-images.mjs",
    "prebuild":       "npm run validate && npm run lint:editorial && npm run check:images",
    "build":          "eleventy",
    // build stays bare "eleventy": npm's lifecycle fires "prebuild" before it, AND
    // .eleventy.js registers an eleventyConfig.on("eleventy.before", ...) hook that runs the
    // same gates, so even a direct `npx @11ty/eleventy` (which never invokes the npm "build"
    // script) cannot bypass them. Do NOT chain `npm run prebuild && eleventy`: under
    // `npm run build` that double-runs the gates and still misses a direct eleventy call.
    "test":           "node --test 'test/**/*.test.js'",
    "a11y:serve":     "http-server _site -p 8081 -s -c-1",
    "a11y:ci":        "pa11y-ci",
    "a11y:all":       "npm run build && start-server-and-test a11y:serve http://127.0.0.1:8081 a11y:ci"
  }
}
```

### Ajv runner (`lib/validate.mjs`, draft 2020-12)
```js
// Source: Ajv 8 docs (2020 build) [CITED: ajv-validator/ajv]
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync } from "node:fs";

export function compile(schemaDir) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);                                  // enables "date" and "uri" formats
  for (const f of readdirSync(schemaDir).filter((n) => n.endsWith(".schema.json"))) {
    ajv.addSchema(JSON.parse(readFileSync(`${schemaDir}/${f}`, "utf8")));
  }
  return ajv;
}
// scripts/validate-data.mjs imports this, validates every entity file, and
// process.exit(1) with a readable error list on the first failure.
```

### Editorial lint denylists (`lib/editorial-rules.mjs`)
```js
// Scope class A — apply EVERYWHERE (all prose AND every scanned field, attributed quotes included):
export const EM_DASH = "—"; // plus %E2%80%94 encoded, mirror DEBT no-emdash.test.js
export const US_SPELLINGS = ["color","flavor","fiber","center","organize","organization",
  "analyze","behavior","defense","labeled","modeling","favorite"]; // word-boundary en-GB targets.
  // "license" is NOT listed: it is the legitimate en-GB verb (the noun is "licence").

// Scope class B — analyst-authored fields and page prose ONLY, NEVER attributed-quote fields:
export const SUPERLATIVES  = ["scandal","shocking","outrage","disgraceful","slammed"]; // framing, not vocabulary.
  // bare "worst"/"exposed" removed: they fire on "worst-case", "exposed to air".
export const DENIGRATORY_PHRASES = [/\bworst offenders?\b/i, /\bnaming and shaming\b/i, /\bripping off\b/i];
export const MOTIVE_PHRASES = [/to boost margins/i, /to cut costs/i, /to increase profits?/i,
  /to save money/i, /\bgreed\b/i, /\bcynical\b/i];
```

**Denylist scoping (UX-06 vs DATA-04/PROD-08).** DATA-04/PROD-08 expressly permit a manufacturer's *attributed* stated reason and a *labelled* inference, so a `statedReason` faithfully quoting "we reformulated to cut costs" is lawful to publish and must NOT fail the build. The lint therefore splits by scope:
- **Class A (em-dash, en-GB spellings, sentence-case)** applies to ALL scanned prose and fields.
- **Class B (superlatives, denigratory phrases, motive phrases)** applies ONLY to analyst-authored text.

Field paths scanned for Class B (analyst-authored): `explanation`, `note`, `labelledInference.basis`, and page body prose (`.njk`/`.md` text). Excluded from Class B (attributed-quote fields, Class A only): `statedReason`, verbatim source quotes, `source.name`. A prose **quote-allow** mechanism (a fenced Markdown blockquote, or an inline `<!-- editorial-allow: quote -->` directive) lets a cited line containing a Class B word ship.

**The scan scope is an explicit ALLOWLIST of roots, not a repo walk** (mirrors DEBT `no-emdash.test.js`: `SCAN_DIRS = ["src","docs"]` + `SCAN_FILES = ["README.md"]`). The default scan set is `src/` + `docs/` + the single root `README.md` ONLY. A root walk would scan `.planning/` (hundreds of em-dashes), `CLAUDE.md`, and this RESEARCH file's own denylist examples, turning the build permanently red. HARD-EXCLUDE: `.planning/` and every dot-directory, `CLAUDE.md`, `.mjs`/`.js` source, `.css` (legitimate `color:`), JSON keys (`licence`/`datasetLicence`), and `test/fixtures/`. Everything authored under the allowlist (README.md and every `docs/*.md`) must therefore be clean en-GB / neutral prose, except where it legitimately quotes banned vocabulary behind the `<!-- editorial-allow: quote -->` directive (see the rule-explaining-docs note carried into Plans 01-07/01-09/01-10).

## Validation Architecture

`workflow.nyquist_validation` is `true` in config. Phase 1's deliverables ARE the gates, so the validation architecture is the negative-test corpus that proves each gate fails on bad input. A gate is only real if its failure path is tested.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built into Node 24) + Ajv 8 for schema assertions |
| Config file | none (DEBT pattern: `node --test 'test/**/*.test.js'`) |
| Quick run command | `npm run validate && npm test` (no browser; sub-second) |
| Full suite command | `npm run build && npm run a11y:all` |

### Phase Requirements -> Test Map
| Req ID | Behaviour | Test Type | Automated Command | File Exists? |
|--------|-----------|-----------|-------------------|-------------|
| TRUST-05 | Fact missing source/confidence/evidence/updated fails the build | unit (negative) | `node --test test/schema.test.js` | Wave 0 |
| TRUST-02 | Two separate GRADE enums; source-type absent from fact | unit | `node --test test/schema.test.js` | Wave 0 |
| DATA-11 | Five entity + TimelineEvent schemas validate; reserved fields optional | unit | `node --test test/schema.test.js` | Wave 0 |
| DATA-03 | Malformed ranged date (to<from, missing from) fails | unit (negative) | `node --test test/schema.test.js` | Wave 0 |
| DATA-04 | Inference stored as `SourcedValue` is rejected (must be distinct shape) | unit (negative) | `node --test test/schema.test.js` | Wave 0 |
| DATA-07 | A 15th/typo allergen fails the enum | unit (negative) | `node --test test/schema.test.js` | Wave 0 |
| Claim-type | Corroborable with 1 source fails; authoritative shape validates | unit (negative) | `node --test test/schema.test.js` | Wave 0 |
| TRUST-06 | Regulatory fact citing a non-GB source fails | unit (negative) | `node --test test/referential.test.js` | Wave 0 |
| DATA-01 | A fact citing an unknown source id fails | unit (negative) | `node --test test/referential.test.js` | Wave 0 |
| DATA-10 | A `not-cleared` / unmanifested packshot fails the build | unit (negative) | `node --test test/images.test.js` | Wave 0 |
| UX-06 | em-dash / US spelling / superlative / motive phrase fails | unit (negative) | `node --test test/editorial.test.js` | Wave 0 |
| PROD-14 | Backlog has >=20 targets, each with driver + rationale | unit | `node --test test/backlog.test.js` | Wave 0 |
| SPIKE-01 | 3 spike products recorded with effort + dead-end + re-derived figures | unit | `node --test test/spike.test.js` | Wave 0 |
| SITE-04 (floor) | Home, methodology, 404, demo pass WCAG 2.2 AA | a11y | `npm run a11y:all` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run validate && npm test`
- **Per wave merge:** `npm run build && npm run a11y:all`
- **Phase gate:** full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test/fixtures/valid/*` and `test/fixtures/invalid/*` — the negative corpus (one invalid fixture per gate failure mode above)
- [ ] `test/schema.test.js`, `test/referential.test.js`, `test/images.test.js`, `test/editorial.test.js`, `test/backlog.test.js`, `test/spike.test.js`
- [ ] `lib/validate.mjs`, `lib/referential.mjs`, `lib/check-images.mjs`, `lib/editorial-rules.mjs` (shared by scripts + tests)
- [ ] Framework install: none for `node:test`; `npm install --save-dev ajv ajv-formats pa11y-ci start-server-and-test http-server`

## Security Domain

`security_enforcement: true`, ASVS Level 1, block on high. Phase 1 is a static, build-time, public archive with no auth, no sessions, no runtime user input, and no database. The attack surface is small and almost entirely build-time and configuration.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No accounts or auth in v1 |
| V3 Session Management | no | No sessions; static pages |
| V4 Access Control | no | All content public; no runtime access decisions |
| V5 Input Validation | yes | The Ajv schema gate validates all data input; external/ingested strings (later OFF) treated as untrusted |
| V6 Cryptography | no | No secrets or crypto at runtime; build-time only |
| V7 Error Handling/Logging | minimal | Gates exit with a clear error; no sensitive logging |
| V14 Configuration | yes | CSP + security headers in `netlify.toml`; lockfile; minimal deps |

### Known Threat Patterns for a static Eleventy archive
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via ingested/external strings (ingredient, source name) rendered unescaped | Tampering / Elevation | Nunjucks autoescaping (on by default); never `| safe` on untrusted data; DEBT's `jsonScript` filter for any JSON embedded in a `<script>` |
| Clickjacking | Tampering | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` (mirror DEBT) |
| MIME sniffing | Spoofing | `X-Content-Type-Options: nosniff` (mirror DEBT) |
| Supply-chain (malicious dep) | Tampering | Minimal dep set; `package-lock.json`; the Package Legitimacy Audit; no `npx --yes` of unverified packages in CI |
| Secrets in repo | Information disclosure | No scraper/API keys committed (ingestion is Phase 2); keep tokens out of `site.json` where avoidable |
| Data-file tampering | Tampering | git history + the schema gate as the integrity boundary |

**CSP note:** DEBT's CSP allows `static.cloudflareinsights.com` for analytics. Phase 1 has no analytics, so tighten the CSP by dropping the Cloudflare allowances unless and until analytics is adopted: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests`.

## State of the Art

| Old Approach (ARCHITECTURE.md) | Current Approach (this phase) | Why Changed |
|--------------------------------|-------------------------------|-------------|
| Astro Content Layer + Zod schemas | Eleventy 3.1.6 + Ajv JSON Schema | ROADMAP/PROJECT chose Eleventy + DEBT conventions; JSON Schema fits a JSON-first, publishable dataset |
| `evidence: primary/secondary/tertiary/inferred` | `evidence`: GRADE 4-point; source-type on the registry | TRUST-02 refinement (the requirement is the contract) |
| Confidence as `high/medium/low` | Confidence as GRADE `high/moderate/low/very-low` | TRUST-02 four-point GRADE convention, symmetric with evidence |

**Deprecated/outdated for this phase:**
- ARCHITECTURE.md's `content.config.ts` / Astro `defineCollection` structure — replaced by `schemas/*.json` + Ajv.
- DEBT's per-source `confidence_level` — confidence is now a per-fact axis, not a source property.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ODbL 1.0 is the right dataset licence (vs CC BY 4.0) | Open-Data Licence | Re-licensing later is disruptive; share-alike obligations differ. Confirm with user |
| A2 | The 14 GB allergens list and wording match current FSA guidance | Allergen Field | A wrong/renamed allergen enum misclassifies products; verify against live FSA guidance at publish |
| A3 | Node 24 (mirroring DEBT) is the intended pin (STACK.md said 20/22 LTS) | Standard Stack | Low; 24 is LTS and Eleventy 3.1.6 supports it. Confirm preferred LTS |
| A4 | GitHub Actions is the CI host (vs Netlify build alone) | CI/Deploy | Low; both run the gates. Confirm where the canonical CI lives |
| A5 | Phase 1 claim-type enforcement is structural only; counting/passes deferred to Phase 2 | Pitfall 5 | If the user expects full counting now, Phase 1 scope grows. Confirm boundary |
| A6 | Provisional Tier A entry gate (>=15) and corpus target (~100) are placeholders SPIKE-01 re-derives | SPIKE-01 | These are explicitly provisional in the ROADMAP; spike output replaces them |

## Open Questions (RESOLVED)

1. **Dataset licence (DATA-12).**
   - What we know: ODbL is OFF-compatible and serves the outlive-maintainer goal; CC BY 4.0 is more permissive but needs OFF segregation.
   - What's unclear: the project's preference between share-alike and permissive reuse.
   - Recommendation: take to discuss-phase; default to ODbL 1.0 if unaddressed.
   - **RESOLVED: ODbL 1.0 adopted as the default (Plan 01-02), with CC BY 4.0 noted as the flagged alternative in LICENSE-DATA. Surfaced to the user for confirmation before execution.**

2. **Sentence-case heading enforcement (UX-06).**
   - What we know: em-dash, US spellings, superlatives, and motive phrases are reliably lintable with denylists/regex.
   - What's unclear: sentence-case detection is heuristic (Title Case is hard to distinguish from legitimate proper nouns).
   - Recommendation: ship the four reliable checks as build-failing; make sentence-case a best-effort warning, not a hard gate, in Phase 1. [ASSUMED — confirm acceptable]
   - **RESOLVED: the four reliable checks ship build-failing; sentence-case is a best-effort warning, not a hard gate, in Phase 1 (Plan 01-06).**

3. **Where the gates run canonically.**
   - What we know: `prebuild` makes Netlify deploy enforce them; GitHub Actions can run the richer suite (tests + pa11y).
   - What's unclear: whether the user wants GitHub Actions at all or prefers Netlify-only.
   - Recommendation: GitHub Actions for the gate/test/a11y pipeline + Netlify for deploy; both run `prebuild`, so deploy is safe even without Actions.
   - **RESOLVED: GitHub Actions runs the gate/test/pa11y pipeline and Netlify runs deploy; both run the `prebuild` gates, so deploy is safe even without Actions (Plan 01-08).**

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, gates, tests | to verify on target | 24 expected | Install Node 24 (matches DEBT) |
| npm | Install + scripts | to verify | bundled with Node | — |
| Headless Chrome | pa11y-ci | provided by pa11y/puppeteer on install | — | pa11y-ci downloads Chromium; CI needs `--no-sandbox` (already in DEBT `.pa11yci.json`) |
| Netlify account | INFRA-01 deploy | to create | — | Cloudflare Pages (STACK.md alternative) |
| GitHub repo + Actions | CI gates | to create | — | Netlify build runs `prebuild` gates regardless |

No external service (Open Food Facts, Wayback, FSA) is needed at Phase 1 build time. OFF ingestion and its keys are Phase 2. The 3 SPIKE-01 products are sourced manually (editorial), not via an API in this phase.

## Sources

### Primary (HIGH confidence)
- DEBT reference codebase, read this session: `.eleventy.js`, `package.json`, `.pa11yci.json`, `netlify.toml`, `.node-version`, `test/data.test.js`, `test/no-emdash.test.js`, `src/_data/sources.json`, `src/_data/meta.json`, `src/_data/site.json`, `src/_data/events.json`, `src/_includes/components/macros.njk` — the exact conventions to mirror/extend.
- npm registry (verified 2026-06-30): `@11ty/eleventy@3.1.6`, `ajv@8.20.0`, `ajv-formats@3.0.1`, `pa11y-ci@4.1.1`, `start-server-and-test@3.0.11`, `http-server@14.1.1`, `pagefind@1.5.2`.
- Project research files: STACK.md (Ajv + Eleventy + Pagefind decisions), ARCHITECTURE.md (data model shape, superseded enum), PITFALLS.md (ODbL, image rights, defamation, false precision), REQUIREMENTS.md + ROADMAP.md + PROJECT.md (the contract).
- `~/.claude/CLAUDE.md` — British English, no em-dash, vanilla/minimal-dependency, WCAG 2.2 AA defaults.

### Secondary (MEDIUM confidence)
- Ajv 8 draft-2020 usage and `ajv-formats` (training knowledge, consistent with official Ajv docs) — verify the `discriminator: true` vs `if/then` detail during implementation.
- ODbL 1.0 Produced-Work vs Derivative-Database distinction (cross-checked with PITFALLS.md, which cites the licence text).

### Tertiary (LOW confidence / verify before publish)
- The 14 GB allergen list wording — verify against current FSA guidance.
- Post-Brexit GB/EU regulatory divergence specifics — verify per regulatory claim (mostly a Phase 3a concern).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package verified on npm and corroborated by DEBT usage or STACK.md.
- Architecture / gate design: HIGH — mirrors DEBT conventions and the project's own research; the Ajv-vs-node:test tradeoff reasoned explicitly.
- Licensing (DATA-12): MEDIUM — sound recommendation, but a policy choice flagged for user confirmation.
- Legal-edge enforcement detail (TRUST-06, UX-06 motive lint): MEDIUM — mechanism is clear; exact word lists and GB-jurisdiction rules need editorial/legal sign-off (Phase 4/7).

**Research date:** 2026-06-30
**Valid until:** 2026-07-30 (stable stack; re-verify Eleventy and Ajv versions if planning slips a month)
