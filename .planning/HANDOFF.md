# Handoff — Food Transparency UK

**Date:** 2026-06-30
**Status:** **Phase 1 complete and deployed.** 10/10 plans built and pushed to origin/main; live at https://food-transparancy-uk.netlify.app with the tightened CSP + HSTS confirmed on the live response. All gates green; CI + Dependabot active.

## What this project is

An evidence-based, citation-first static archive of how UK packaged-food recipes have changed over time. Core value: every published fact is traceable to a primary source, independently verified to a standard matched to the claim, and honest about its uncertainty. Full context in `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`.

## Where things stand

- **Phase 1 ("Foundation") is built.** Eleventy 3.1.6 scaffold, the trust-layer data model (SourcedValue envelope, two-axis GRADE vocabulary, source/rights registry, 14 FSA allergens, ranged dates), six entity schemas, the four-logical-gate validation pipeline (Ajv structural + referential + editorial lint + image default-deny) wired fail-closed into `prebuild` and an `eleventy.before` hook, the trust-rendering macro + Methodology, the SPIKE-01 sourcing spike, and the hardened CI (pa11y-ci, SHA-pinned GitHub Actions, Dependabot).
- **Verification state:** `npm run build` (all three gates + render) green; `node --test` 51/51 green; `npm run a11y:all` 4/4 routes WCAG 2.2 AA. Validation gate proven to fail on all negative fixtures and on an empty corpus.
- **Phases 2-9 are roadmapped but not planned.** Phase 2 is the automated verification gate (VRFY-01).

## Deploy — DONE

Phase 1 is pushed to `origin/main` (`b802baa..21cd973`) and live at
**https://food-transparancy-uk.netlify.app** (HTTP 200; tightened CSP + HSTS +
nosniff + frame DENY confirmed on the live response). The `CI` workflow runs on
push; Dependabot has opened PRs bumping the pinned actions (checkout v7,
setup-node v6, cache v6) — review/merge at leisure. Optionally watch the first
`CI` run to green (`gh run list --workflow=ci.yml`).

## Phase 1 deep review (post-deploy) — done

A four-dimension adversarial review (fact-check, trust-gate, security/a11y, editorial) ran after deploy. Fixed and committed (`fix(01): ...`, 5 commits; suite 55/55, build + a11y green):
- **Live data:** corrected a false **soya allergen** on Cadbury (GB label uses E442/E476, not soya lecithin) and the non-GB ingredient list; updated Lucozade's manufacturer to **Suntory Beverage and Food GB and Ireland** (renamed 2020); restored the verbatim Cadbury quote; genericised an unregistered citation; fixed "soy"→"soya"; dropped an unsupported Euroglace reference; softened SDIL causal language.
- **Trust gate:** the validation gate was a **non-recursive allowlist** while Eleventy loads all of `_data` recursively — a fact off-path would render unverified. Now recurses + fails on any fact-bearing file outside the validated corpus; the non-zero guard now counts **facts not files**; `eleventy.before` resolves gate paths absolutely and fails closed (a cwd-relative path silently skipped all gates from another dir).
- **Editorial gate** now lints analyst-prose fields **inside data JSON** (it only scanned `.md/.njk/.html` before — how "soy" shipped); verbatim-quote/value fields excluded.
- **Security/a11y:** dropped a `[tabindex]:focus` CSS rule that flooded `<main>` yellow on skip-link focus; tightened CSP `img-src` to `'self'`; CI now audits the **full** dep tree at `--audit-level=critical` (every dep is build-time on a static site). Added the AI-assisted verification disclosure to the methodology page.

**Round 2 (deeper, research-backed)** added: data — Cadbury sugars 57→56 (mis-sourced; was the carbohydrate figure), Lucozade sweetener flagged as contested (OFF sucralose vs retail aspartame) and de-confidenced, Wall's regulatory evidence lowered. Gate — the escape guard now catches `claimType`-less facts and forbids non-JSON data files (`.11tydata.*`, `_data/*.js`) that Eleventy loads but the gate couldn't see. Editorial — scans `covers`/`tagline`; verbatim US-label quotes may keep their US spelling. Auth — the basic-auth edge function was hardened: **fail-closed**, **re-applies the CSP/HSTS the `/*` gate was stripping** (confirmed on the live 401), decodes the inbound credential (no `btoa` crash), constant-time compare, infra/SEO path exclusions. The auth rewrite is **untested in the real edge runtime** (no local harness) — verify the live 401 still returns 401-with-CSP and the authed path works after deploy.

**Residual, deferred to Phase 2 (cannot be enforced by a structural-only gate):** `claimType` and `claimDomain` are author-self-classified and nothing cross-checks them against a claim's actual nature — so the corroborable-needs-2 rule can be dodged by labelling an empirical claim `authoritative`, and the TRUST-06 GB+`checkedOn` rule only fires on a field literally marked `claimDomain: regulatory`. A new bare-scalar fact field would also be invisible to `collectFacts`. These join the distinct-lineage detection the spike already named as the Phase 2 verification-gate's job.

## SPIKE-01 results that shape Phase 2 and corpus scope

- **The archival-fetch path is the top Phase 2 requirement.** Wayback is unreachable from the agent fetch tool (partial via curl) and major retailers block fetches, so the strict corroborable historic bar (>=1 primary/archival) was met 0/3. The data model handles this honestly (contested/withheld facts), but Phase 2 ingestion must solve archival access.
- **Provisional re-derived corpus figures (n=3, placeholders Phase 4 refines):** launch corpus ~35 (down from ~100); Tier A full then-vs-now ~10 (down from >=15). Recorded in `docs/spike-findings.json`.
- **The thesis is tempered by evidence:** the "ice cream was once cream" arc did not source for Vienetta (dropped) or Wall's Soft Scoop (encoded current-only). Soft Scoop's accurate framing is "not *dairy* ice cream" (voluntary code), not "illegal to call ice cream".

## CRITICAL tooling note

`gsd-sdk` on PATH is the WRONG binary. Real helper: `node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>`. Recorded in session memory `gsd-sdk-binary-collision`.

## Decisions made this session

- Dataset licence: **ODbL 1.0** (confirmed). 14 allergens FSA-verified (`soya` not `soybeans`). Node 24. Backlog: 22 candidates editor-confirmed. Spike trio: Lucozade, Cadbury Dairy Milk, Wall's Soft Scoop (Vienetta dropped as a dead-end).
- Executors ran sequentially on `main` (no worktree isolation) for robustness given the human checkpoints. The 01-02 and spike records were finished/authored by the orchestrator after a content-filter death and for editorial control respectively.

## Next step

Phase 1 is done and deployed. Next: run `/gsd:plan-phase 2` to plan the automated verification gate (VRFY-01) — whose top requirement, per SPIKE-01, is the archival/primary fetch path. A formal `gsd-verifier` pass on Phase 1 was not run (each plan was verified in-flight; full suite + build + a11y green; live deploy confirmed) and can be run if desired. Merge the open Dependabot action-bump PRs at leisure.
