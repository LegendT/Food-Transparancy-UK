# Handoff - Food Transparency UK

**Date:** 2026-07-02
**Status:** **Phase 3a (Core Entity Pages & Trust Rendering) COMPLETE, verified (UAT 9/9), and hardened by a four-way adversarial audit. Phases 1, 2, 3a done. Next: Phase 3b.**

## What this project is

An evidence-based, citation-first static archive of how UK packaged-food recipes have changed over time. Core value: every published fact is traceable to a primary source, independently verified to a standard matched to its claim type, and honest about its uncertainty. Built first for the non-expert shopper. Full context: `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md` (10 phases; Phases 1, 2, 3a complete). Stack: Eleventy 3.1.6 + Nunjucks, flat JSON, CUBE CSS, vanilla JS, node:test, pa11y-ci, Ajv, Node 24. British English, no em-dashes, no emoji, WCAG 2.2 AA, ZERO new dependencies.

## Current state (verified)

- **Git:** branch `main`, working tree clean (only untracked `.history/`, `.vscode/`, a local `.docx`). All work through `7bb1804` is pushed to `origin/main` and in sync (run `git rev-parse --short HEAD` / `git status` to confirm). No push without asking (global rule).
- **Gates:** `node --test 'test/**/*.test.js'` -> **219/219 pass**; `npm run prebuild` -> exit 0 (validate + editorial + image + render-safety); `npm run build` green; `npm run a11y:all` -> pa11y-ci WCAG 2.2 AA 0 errors over the representative routes.
- **STATE.md:** `status: ready`, Phase 3b, "ready to plan". ROADMAP marks Phase 3a `[x]` complete (6/6). `03a-VERIFICATION.md` is `status: complete_with_acknowledged_gaps` (SC4).
- **Config for this run:** `workflow.use_worktrees=false` (sequential-on-main). Quality models (Opus plan / Sonnet check), interactive, research + plan-check + Nyquist + code-review + security enforcement all on, commit_docs on. Reset worktrees to true later if parallel execution is wanted.

## What Phase 3a delivered (all committed + pushed)

Server-rendered product and ingredient pages over a seed corpus, every claim through the trust component:
- `src/product.njk` - D-05 sections (Ingredients, **Nutrition** accessible `<table>`, **Allergens** fail-safe, Manufacturer, Sources roll-up, Recipe history) with pagination.
- `src/ingredient.njk` - name/synonyms/E-number, `functionDescription`, `regulatoryStatus` (INGR-03), `authorityPosition` (INGR-02, absent-no-stub), products-containing list (INGR-04).
- `src/_includes/components/macros.njk` - the `sourcedValue` + `factCell` trust macros (the ONLY sanctioned render path for a raw `.value`, R-31).
- `lib/render-state.mjs` (the render-safe projection; exposes `.value` only when publishable; carries `lastVerified` = max confirms-pass checkedOn), `lib/allergen-copy.mjs` (`allergenLine` fail-safe copy), `lib/reverse-index.mjs`, `lib/cited-sources.mjs`.
- The four reader-facing trust states: **published-confirmed** (Lucozade manufacturer; sucralose EFSA authority block), **published-contested** (Lucozade 2017 timeline, both-sides), **withheld** (everywhere unverified), and **published-stale** (VRFY-12 "review due" - covered by unit + behavioural tests; see integrity note below).

## Two things every future session must keep doing

1. **Verify against REAL code/HTML, never the executor/agent self-report.** This session an executor's "green" and TWO adversarial-audit findings were wrong; running the real gates/tests caught them (see "the wire-checkDistinctLineage trap" below). `node --test`, `npm run build`, grep the built `_site/` HTML, run pa11y - then judge.
2. **AI never authors verification passes or adjudications on real corpus facts (D-04/D-11).** The human editor authors/approves them at a checkpoint; AI transcribes approved values only.

## The R-31 render boundary (hardened this session - important)

R-31 is the load-bearing "no unverified/withheld/contested value ever reaches a reader" guarantee. The enforcement is layered:
- **Real guarantee:** `lib/render-state.mjs` `factForRender` exposes `.value` only for `published-confirmed`/`published-stale`; templates render that projection via the `factState` filter, never `fact.value`.
- **Static backstop:** `scripts/check-render-safety.mjs` denies, outside the sanctioned macro, dot access (`.value`), bracket access (`["value"]`), `attr("value")`, the `dump`/`tojson`/`jsonScript`/`dictsort` serialisers, and **two-variable object enumeration** (`{% for k,v in fact %}`) except over `meta.*`. Documented residual limits: aliased bindings and computed-key access (a line regex cannot see these) - that is why the behavioural test exists.
- **Behavioural test:** `test/render-state.test.js` renders the sanctioned macro (which is exempt from the lint) with a withheld/contested/published/stale canary and asserts the value crosses to HTML ONLY when published.
Do not add `<script>`-body exemptions to the lint (would open a hole); embed a pre-projected SAFE dataset for any future client JS, never raw fact objects.

## The wire-checkDistinctLineage trap (do NOT repeat)

`lib/verification.mjs` exports `checkDistinctLineage`, which is intentionally **NOT** wired as a build gate. A corroborable fact whose confirms share a lineage must **WITHHOLD** (via `meetsCorroborable`), not fail the build - a tested decision (`test/corpus-gate.test.js` "R-02 ... share a lineage WITHHOLDS (exit 0), not a build failure", the D-13 relief valve). An adversarial audit recommended "wire the dead gate"; doing so broke R-02. The docstring now says all this. Leave it unwired.

## Editorial integrity note - the proof set was corrected

The plan-06 proof set originally manufactured demonstrations that later failed an integrity audit; all three were corrected (commit `7bb1804`, editor-approved):
- The sucralose `regulatoryStatus` passes were **re-dated from a backdated 2023-06-01 to the real 2026-07-02** (a fabricated verification date shown live is the exact failure the model prevents). It now renders **published-confirmed**, not published-stale.
- The Lucozade->sucralose D-15 cross-link was **removed** (Lucozade's `ingredientsText` is withheld/unresolved, so asserting the association breached the per-fact gate). **INGR-04 now renders its empty state.**
- The EFSA `authorityPosition` was **expanded** with the 2026 opinion's fine-bakery-wares caveat (neutrality).
Consequence: no LIVE published-stale example and no LIVE INGR-04 product currently exist - both await real data (a genuinely aged fact; a verified product-ingredient relationship). The renders are test-covered. `03a-VERIFICATION.md` and `03a-06-SUMMARY.md` carry a dated post-audit corrections note.

## Phase 3a facts that still matter (do not re-derive)

- **Render off `factState`/`factForRender`, never `fact.value`.** `check-render-safety.mjs` (in prebuild AND the `eleventy.before` hook, so ALL build paths incl. `npm run dev`/serve run every gate) enforces it. The sanctioned render is `sourcedValue`/`factCell` INSIDE `macros.njk`.
- **`lastVerified` = max confirms-pass `checkedOn`** (the verification clock), NOT `fact.updated` (the edit clock). The "review due" label reads `d.lastVerified`.
- **`checkedValue` is schema-OPTIONAL.** A confirms pass may omit it (a blinded re-read confirming fidelity without re-extracting the scalar); `checkValueDivergence` now skips a present-vs-absent pair rather than withholding a sufficient fact.
- **Two schema fields are OPTIONAL/migration-safe:** `product.ingredients` (plain metadata, never a fact) and `authorityPosition` (bare SourcedValue $ref, deliberately NOT `claimDomain: regulatory`, so exempt from the TRUST-06 GB-jurisdiction gate).
- **The two real sources added:** `fsa-gb-additives-e955` (FSA GB register, OGL-3.0, GB, primary) and `efsa-sucralose-2026` (EFSA plain-language summary, EU, secondary). Both resolve; both have fresh RESOLVES in `.cache/citation-verdicts.json`.
- **Locked palette** (03a-UI-SPEC.md): withheld `#505a5f`, stale amber `#b45309`, contested `#1d70b8`, allergen red `#d4351c` (bar/border only, never text), verified `#00703c`. Every cue paired with a TEXT label.

## SC4 - the one open Phase 3a item (editorial, not code)

`03a-VERIFICATION.md` is `complete_with_acknowledged_gaps` solely because the corpus holds 3 products / 1 ingredient vs the >=20 / >=40 SC4 seed target. This is the parallel historic-sourcing/editorial workstream's numeric gate (D-10), superseded by Phase 4 SC5. The trust machinery is complete and proven; the corpus population is a separate track. Editor go-decision recorded: Phase 3a marked complete, corpus build continues in parallel.

## Minor items noted, not actioned (pick up any if wanted)

- Adjudication clearing compares `checkedOn`/`adj.date` strings; a new dispute backdated below an existing adjudication's date could be masked (narrow human-entry edge).
- The EFSA Journal primary opinion (doi:10.2903/j.efsa.2026.9854) is named in `covers` but not registered as its own primary source; `efsa-sucralose-2026.derivedFrom` is null.
- `.cache/citation-verdicts.json` entries for the two new sources were hand-seeded (by design for offline determinism; both URLs verified live 200).
- REQUIREMENTS.md traceability table intentionally omits 11 v1.x-deferred REQ-IDs (PROC/PRICE/NOTF/etc.) - confirmed benign.

## Earlier-phase facts that still matter

- Phase 2 complete, secured (34/34 threats), Nyquist-validated, deeply reviewed. Do not re-review.
- Basic-auth edge function is a TEMPORARY pre-launch gate (remove at launch; creds are Netlify env vars). Deferred to launch/3b: ODbL/OFF attribution footer, sitemap/robots, JSON-LD, custom domain, the full SITE-04 route floor.
- Locked: dataset licence ODbL 1.0, code MIT, Node 24, 14 FSA allergens (`soya` not `soybeans`).

## CRITICAL tooling note

`gsd-sdk` on PATH is the WRONG binary. Use `node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>` in SUBCOMMAND form (e.g. `phase complete`, `state advance-plan`, `roadmap update-plan-progress`, `commit "msg" --files ...`), NOT `query state.advance-plan`. In session memory as `gsd-sdk-binary-collision`.

## Standing rules

British English, conventional commits, WCAG 2.2 AA, ZERO new deps, **no push without asking**, no emoji, no em-dashes. `/Users/anthonygeorge/Projects/DEBT` is the read-only blueprint. Every commit ends with the `Co-Authored-By: Claude Opus 4.8 (1M context)` trailer.
