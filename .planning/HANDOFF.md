# Handoff - Food Transparency UK

**Date:** 2026-07-02
**Status:** **Phase 3a mid-execution. Waves 1-2 complete and verified (4/6 plans). Wave 3 (03a-04, allergen safety) and Wave 4 (03a-06, human checkpoint) remain.**

## What this project is

An evidence-based, citation-first static archive of how UK packaged-food recipes have changed over time. Core value: every published fact is traceable to a primary source, independently verified to a standard matched to its claim type, and honest about its uncertainty. Built first for the non-expert shopper. Full context: `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md` (9 phases; Phases 1 and 2 complete). Stack: Eleventy 3.1.6 + Nunjucks, flat JSON, CUBE CSS, vanilla JS, node:test, pa11y-ci, Ajv, Node 24. British English, no em-dashes, no emoji, WCAG 2.2 AA, ZERO new dependencies.

## Current state (verified)

- **Git:** branch `main`, working tree clean (only untracked `.history/`, `.vscode/`, a local `.docx`). All Phase 3a Waves 1-2 work IS pushed to `origin/main` (run `git rev-parse --short HEAD` for the live tip; `git status` for ahead/behind). `README.md` was refreshed to describe Phases 1-2 complete + Phase 3a in progress (product/ingredient pages, the four gates, the verification model). No push without asking (global rule).
- **Gates:** `node --test` -> **196/196 pass**; `npm run prebuild` -> exit 0 (validate + editorial + image + render-safety); `npm run build` green. pa11y WCAG 2.2 AA -> 0 issues on every built page checked so far (product x2, ingredient x1).
- **Config note for this run:** `workflow.use_worktrees` was set to `false` (sequential-on-main execution) for safety/simplicity on this small flat-file repo. Executors run sequentially and update STATE/ROADMAP themselves. Reset to `true` later if parallel worktree execution is wanted.

## Where we are in Phase 3a (Core Entity Pages & Trust Rendering)

6 plans, 4 waves. **Sequential-on-main execution, each plan critiqued against REAL code/HTML before advancing (not the executor self-report).**

| Plan | Wave | Status | What it delivered |
|------|------|--------|-------------------|
| 03a-01 | 1 | DONE + verified | D-15 `ingredients` + D-14 `authorityPosition` optional schema fields (migration-safe); `lib/reverse-index.mjs` (productsByIngredient/timelineByProduct, pure); `checkIngredientRefs` + `checkTimelineRefs` build gates (both live-proven to fail on a dangling ref); `.eleventy.js` addGlobalData wiring. |
| 03a-02 | 1 | DONE + verified | `factCell` macro INSIDE `macros.njk` (R-31 intact, spans-only, valid in `<td>`); contested branch renders per-position sources (F6); locked state CSS (`[data-state^="withheld"]`, amber `#b45309` stale bar, allergen red `#d4351c` border-only, no amber/red as text). |
| 03a-03 | 2 | DONE + verified | `src/product.njk` - paginated product page (`resolve: values`, A1 proven, 3 pages); D-05 sections (Ingredients, Manufacturer, Sources roll-up, Recipe history); mostly-withheld page renders purposefully (D-13); Lucozade contested both-sides + Walls empty state. **R-31 verified on real HTML: withheld manufacturer + ingredientsText values ABSENT from the built page.** pa11y clean. |
| 03a-05 | 2 | DONE + verified | `src/ingredient.njk` + first record `src/_data/ingredients/sucralose.json` (renders withheld, correct); D-08 separated regulatory (INGR-03) vs optional authority (INGR-02, absent-no-stub) blocks + not-dietary-advice note; INGR-04 products-containing list. R-31 verified on HTML; pa11y clean. |
| **03a-04** | **3** | **NOT STARTED** | Nutrition table (D-06/F4) + **allergen fail-safe (D-12, the highest-stakes render)**. Adds these to `src/product.njk` between Ingredients and Manufacturer, plus `lib/allergen-copy.mjs` (pure `allergenLine`) and `.eleventy.js` filter. |
| **03a-06** | **4** | **NOT STARTED - HUMAN CHECKPOINT** | Proof-set authoring. `autonomous: false`. Task 1 is a `checkpoint:human-action` blocking gate: a human authors the verification passes + the published-stale example + authority-position content. **AI never authors verification passes or adjudications (D-04/D-11).** |

## What Wave 3 (03a-04) must do - the allergen-safety critique target

This is the highest-stakes plan. When it completes, critique it HARD against real HTML:
- **Allergen fail-safe (D-12):** a **withheld `absent`** allergen claim MUST NEVER render as "does not contain X"; a **withheld `present`/`may-contain`** MUST NEVER be hidden. Allergens fail safe TOWARD warning. Verify on built HTML that the string "does not contain" appears on NO product page, and that `spike-02`'s withheld allergen provenance (milk/tree-nuts/cereals - genuinely unverified today) renders the safe "cannot confirm... check the pack" wording.
- Red `#d4351c` is bar/border ONLY, never text (fails 4.5:1 on the `#f3f2f1` panel). The `allergenLine` helper has an exhaustive unit test asserting none of the six (presence x publishable) outputs contains "does not contain".
- **Nutrition table (D-06/F4):** an accessible `<table>` (caption/thead/scope) of the 9 figures; three cell states distinct - "Not recorded" (absent key) vs "Not yet verified" (withheld) vs a published value; per-figure provenance block below at `id="nutrition-{key}"` with **`tabindex="-1"`** (G2 focus); **320px reflow, no `white-space:nowrap`** (G1). Each figure renders via `factCell`, never raw `.value`.
- Run pa11y WCAG2AA on a rebuilt product page (the pattern below), and confirm 320px reflow.

## The per-plan verification pattern used this session (KEEP DOING THIS)

Do not trust the executor's self-report. After each plan:
1. `node --test 'test/**/*.test.js'` and `npm run build` - real green.
2. **R-31 on real HTML:** extract a known withheld raw value from the JSON and `grep -qF` it is ABSENT from the built page; confirm "Not yet verified; withheld." placeholders present.
3. **pa11y** on the built route: `npx http-server _site -p 8099 -s -c-1 & sleep 2; node_modules/.bin/pa11y --standard WCAG2AA "http://127.0.0.1:8099/products/<slug>/"` -> expect "No issues found!". Kill the server after.
4. Verify the plan's specific invariants (allergen fail-safe, contested both-sides, empty states, D-08 separation).
5. Only refine if a REAL defect is found - do not manufacture nits. Clean plans this session needed no changes.

## How to run each executor (sequential-on-main)

Spawn `gsd-executor` (model opus) per plan, one at a time in wave order. Prompt template that worked (adapt the plan number and reminders): sequential_execution block (branch main, no branch switch, hooks on, Write SUMMARY -> commit -> narrate, Co-Authored-By trailer), execution_context @execute-plan.md + summary template + checkpoints, files_to_read (the PLAN, PROJECT.md, STATE.md, CLAUDE.md, the UI-SPEC/RESEARCH, and the plan's own read_first files), plus plan-specific critical_reminders. See the earlier session transcript for the exact prompts.

Wave 3 has one plan (03a-04). Wave 4 (03a-06) is the human checkpoint - do NOT spawn an autonomous executor to author verification passes; drive Task 1 interactively with the human, then the autonomous follow-on (Tasks 2-3) transcribes the approved values, seeds the verdict cache, wires the D-15 cross-link, and adds the pa11y routes.

## Phase 3a facts that still matter (do not re-derive)

- **Render off `factState`/`factForRender`, never `fact.value`.** `check-render-safety.mjs` (in prebuild + the Eleventy hook) fails the build on any raw `.value` outside `macros.njk`. This barrier is verified holding on real HTML. The nutrition figure render is `factCell` INSIDE `macros.njk`, NOT a second render path.
- **Locked palette (03a-UI-SPEC.md, computed contrast on white AND `#f3f2f1`):** withheld `#505a5f`, stale bar amber `#b45309` (not `#f47738`/`#d4531e`), contested `#1d70b8`, allergen red `#d4351c` (bar/border only), verified `#00703c`. Every cue paired with a TEXT label; red/amber NEVER used as text.
- **Two schema fields are OPTIONAL/migration-safe.** `product.ingredients` is plain metadata (no value/sources, never trips render-safety). `authorityPosition` is a bare SourcedValue $ref, deliberately NOT `claimDomain: regulatory` (so it derives + gets the trust treatment but is exempt from the TRUST-06 GB-jurisdiction gate). Verified.
- **The published-stale two-clocks recipe (VERIFIED against lib/verification.mjs):** a fact derives `published-stale` when it MEETS sufficiency AND its citations have a fresh in-TTL RESOLVES (180d) AND its `lastVerified` (max pass `checkedOn`) is older than the class staleness threshold (regulatory 12m / current 24m, exclusive). So passes carry OLD `checkedOn` (e.g. `2023-06-01` for a current fact) while the verdict cache carries a RECENT `checkedAt`. Backdating dates alone renders withheld (the trap). Needed for the 03a-06 proof set (no `published-stale` example exists yet).
- **sucralose.json known stub:** its `regulatoryStatus` cites `fsa-allergen-guidance` as a placeholder (semantically mismatched but renders withheld); plan 06 replaces it with the real additives-law citation.
- **Planning artefacts:** `03a-CONTEXT.md` (D-01..D-15, hardened by a schema-grounded critique), `03a-RESEARCH.md`, `03a-UI-SPEC.md` (hardened by two computed-contrast + interaction critiques), `03a-PATTERNS.md`, `03a-VALIDATION.md` (nyquist_compliant). All committed.

## Earlier-phase facts that still matter

- **Phase 2 is complete, secured (02-SECURITY.md, 34/34 threats + 2 new from Review 3), validated (Nyquist), and deeply reviewed (02-REVIEW-3.md, 12 findings, 9 fixed incl. an SSRF trailing-dot bypass and the live R-31 render leak).** Do not re-review.
- **Basic-auth edge function is a TEMPORARY pre-launch gate** (remove at public launch; creds are Netlify env vars). Deferred to launch: ODbL/OFF attribution footer, sitemap/robots, JSON-LD, custom domain (all Phase 3b territory).
- **Locked:** dataset licence ODbL 1.0, code MIT, Node 24, 14 FSA allergens (`soya` not `soybeans`).

## CRITICAL tooling note

`gsd-sdk` on PATH is the WRONG binary. Use `node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>` with the SUBCOMMAND form (e.g. `state advance-plan`, `roadmap update-plan-progress`, `commit "msg" --files ...`), NOT `query state.advance-plan`. In session memory as `gsd-sdk-binary-collision`.

## Standing rules

British English, conventional commits, WCAG 2.2 AA, ZERO new deps, **no push without asking**, no emoji, no em-dashes. `/Users/anthonygeorge/Projects/DEBT` is the read-only blueprint. Config: Quality models (Opus plan / Sonnet check), Interactive, research + plan-check + Nyquist + code-review + security on, commit_docs on.
