# Handoff — Food Transparency UK

**Date:** 2026-06-30
**Status:** **Phase 1 complete, deployed, and three-times deep-reviewed.** Ready to plan Phase 2.

## What this project is

An evidence-based, citation-first static archive of how UK packaged-food recipes have changed over time. The thesis: many everyday "foods" have quietly become a manipulation of the original (e.g. "ice cream" that is no longer cream but vegetable oil and stabilisers). Built first for the non-expert who has heard of "UPF" but hasn't connected it to specific products. **Core value:** every published fact is traceable to a primary source, independently verified to a standard matched to its claim type, and honest about its uncertainty. Full context: `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md` (9 phases; Phase 1 marked complete).

## Current state (verified)

- **Git:** branch `main`, **in sync with `origin/main`** (tip `cc19332`), working tree clean. Repo: github.com/LegendT/Food-Transparancy-UK.
- **Gates:** `npm run build` green (3 prebuild gates + `eleventy.before` hook + render); `node --test` **60/60**; `npm run a11y:all` 4/4 routes WCAG 2.2 AA. CI (GitHub Actions) green.
- **Live:** https://food-transparancy-uk.netlify.app — **deployed and gated behind HTTP basic auth** (returns 401; intentional, pre-launch). Credentials are Netlify env vars `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` (must be scoped to include **Functions** in every deploy context).

## What Phase 1 built

Schema/trust foundation, no product pages yet. Stack: **Eleventy 3.1.6**, flat **JSON** data, **Ajv** + `node:test`, **pa11y-ci**, **Netlify** + **GitHub Actions**, **Node 24**.

- **Trust model:** the `SourcedValue` envelope ($ref'd by every fact-bearing field), two-axis GRADE vocabulary (confidence + evidence), corroborable-vs-authoritative claim types (structural ≥2-source rule), ranged/circa dates, 14 FSA allergens, the source/rights registry (per-source licence + jurisdiction + driver).
- **Six entity schemas** (product, ingredient, brand, additive, image, timeline-event).
- **The validation gate** (`scripts/validate-data.mjs` + `lib/`): Ajv structural + referential integrity (source resolution, TRUST-06 GB+checkedOn for regulatory facts, ranged-date order, OFF-derived tagging) + a corpus-escape guard (fails on any fact-bearing file outside the validated dirs, incl. non-JSON data) + a non-zero-FACT assertion. Every failure path has a negative fixture.
- **Editorial gate** (`check-editorial.mjs`): British-English + neutral lint, Class A everywhere / Class B analyst-only, scans prose AND data-JSON analyst fields; verbatim quotes may keep US spellings.
- **Image gate** (`check-images.mjs`): default-deny on `rightsStatus`.
- **Rendering:** the `sourcedValue` trust macro (two colour-independent text tokens + `<details>` source disclosure), Methodology stub, index/404/components-demo.
- **CI/deploy:** pa11y-ci, hardened GitHub Actions (SHA-pinned actions, full-tree `npm audit --audit-level=critical`, Chrome-cache self-heal), Dependabot, Netlify static deploy with tightened CSP + HSTS.
- **SPIKE-01:** three real Tier A product records (Lucozade Energy, Cadbury Dairy Milk, Wall's Soft Scoop) that dogfood the schema gate, plus the editor-confirmed 22-candidate sourcing backlog and the rubric.

## Key decisions (locked)

- **Dataset licence: ODbL 1.0** (Open Food Facts-compatible; share-alike). Code: MIT.
- **Node 24.** **14 allergens** verified against the FSA list (`soya`, not `soybeans`).
- **Spike trio:** Lucozade, Cadbury Dairy Milk, Wall's Soft Scoop (Vienetta was attempted and dropped as a dead-end).
- **Executors ran sequentially on `main`** (no worktree isolation) for robustness given the human checkpoints.

## SPIKE-01 findings that shape Phase 2 and corpus scope

- **The archival/primary fetch path is the #1 Phase 2 requirement.** Wayback is unreachable from the agent fetch tool (partial via raw `curl`/CDX) and major retailers block fetches, so the strict corroborable historic bar (≥1 primary/archival) was met 0/3. The data model handled this honestly (contested/withheld facts) but Phase 2 ingestion must solve archival access.
- **Provisional re-derived corpus figures (n=3, placeholders Phase 4 refines):** launch corpus ~35 (down from ~100); Tier A full then-vs-now ~10 (down from ≥15). In `docs/spike-findings.json`.
- **The thesis is tempered by evidence:** the "ice cream was once cream" arc didn't source for Vienetta or Wall's Soft Scoop (Soft Scoop's accurate framing is "not *dairy* ice cream" under a voluntary code, not "illegal to call ice cream").

## Three deep-review rounds (all fixed, tested, deployed)

The phase was adversarially reviewed three times after deploy. Highlights, so they aren't re-litigated:
- **R1:** corrected a false Cadbury soya allergen; closed a non-recursive corpus-escape hole; the editorial gate's JSON blind spot; a CSS focus-flood.
- **R2:** hardened the basic-auth edge function (was fail-open + stripping the site CSP + `btoa` crash); closed a `claimType`-less gate escape and a non-JSON-data bypass; fixed two more data facts.
- **R3:** constrained nutrition values to non-negative numbers; split the half-untested TRUST-06 test; accessibility contrast + licensing-attribution (OGL footer, canonical URL).

Diminishing returns were reached at R3 (no security/data criticals; the licensing and accessibility reviews largely confirmed correctness). The foundation is solid.

## Outstanding / deferred (not gaps — deliberate)

- **One unverified path:** the basic-auth **authed-200** response (CSP + `Cache-Control: private, no-store`) could not be tested without the credentials. The 401 path is verified live. Log in once and spot-check a real page carries the CSP.
- **The basic-auth edge function is a TEMPORARY pre-launch gate** — remove it (and the `edge_functions` line in `netlify.toml`) at public launch, or grow its `excludedPath`.
- **Deferred to Phase 2 (need the verification gate, not a structural one):** `claimType`/`claimDomain` are author-self-classified and nothing cross-checks them against a claim's actual nature; distinct-lineage detection (co-derived sources); the archival/primary fetch path.
- **Deferred to public launch:** the ODbL/Open Food Facts attribution footer line (add when the first OFF-derived fact renders — a `{# #}` marker is in `base.njk`, ODbL §4.3); `sitemap.xml` + `robots.txt`; JSON-LD / `dateModified`; Open Graph tags; update `site.url` to the custom domain.

## CRITICAL tooling note

The `gsd-sdk` binary on PATH is the WRONG binary. The real GSD helper is:
```
node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>
```
(`gsd-sdk query X.Y` → `gsd-tools.cjs X Y`; some `state` subcommands need named flags `--phase/--plan/--summary`.) Also in session memory as `gsd-sdk-binary-collision`. Config: Quality model profile (Opus plan / Sonnet check), Interactive mode, research + plan-check + Nyquist on, commit_docs on.

## Next step

**`/gsd:plan-phase 2`** — the claim-typed verification gate and ingestion. Its top input (per SPIKE-01) is a working archival/primary fetch path. Read `docs/SPIKE-01-FINDINGS.md` + `docs/spike-findings.json` (the named Phase 2 gate requirements) before planning. The blueprint repo `/Users/anthonygeorge/Projects/DEBT` is the live pattern source (read-only).
