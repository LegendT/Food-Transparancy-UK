# Handoff — Food Transparency UK

**Date:** 2026-06-30
**Status:** **Phase 1 executed** (10/10 plans built; all gates green locally). One deferred human action: the Netlify deploy (01-08 Task 3). Nothing pushed to origin.

## What this project is

An evidence-based, citation-first static archive of how UK packaged-food recipes have changed over time. Core value: every published fact is traceable to a primary source, independently verified to a standard matched to the claim, and honest about its uncertainty. Full context in `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`.

## Where things stand

- **Phase 1 ("Foundation") is built.** Eleventy 3.1.6 scaffold, the trust-layer data model (SourcedValue envelope, two-axis GRADE vocabulary, source/rights registry, 14 FSA allergens, ranged dates), six entity schemas, the four-logical-gate validation pipeline (Ajv structural + referential + editorial lint + image default-deny) wired fail-closed into `prebuild` and an `eleventy.before` hook, the trust-rendering macro + Methodology, the SPIKE-01 sourcing spike, and the hardened CI (pa11y-ci, SHA-pinned GitHub Actions, Dependabot).
- **Verification state:** `npm run build` (all three gates + render) green; `node --test` 51/51 green; `npm run a11y:all` 4/4 routes WCAG 2.2 AA. Validation gate proven to fail on all negative fixtures and on an empty corpus.
- **Phases 2-9 are roadmapped but not planned.** Phase 2 is the automated verification gate (VRFY-01).

## THE ONE OUTSTANDING ITEM — 01-08 Task 3 (deploy), deferred by the user

Local `main` is **ahead of origin by the entire Phase 1 build and NOT pushed.** To finish INFRA-01's live-deploy confirmation (see `.planning/phases/01-.../01-08-SUMMARY.md`):
1. `git push` the Phase 1 commits to origin (github.com/LegendT/Food-Transparancy-UK). Both CI and Netlify read the remote.
2. Netlify → Add new site → Import from Git → the repo; confirm `netlify.toml` (build `npm run build`, publish `_site`, NODE_VERSION 24).
3. Deploy; confirm the build log shows the prebuild gates before Eleventy.
4. `curl -sI https://<site>.netlify.app | grep -iE 'content-security-policy|strict-transport'` to confirm the live CSP + HSTS.
5. GitHub → Settings → Actions: confirm Actions is enabled.

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

Either finish 01-08 Task 3 (deploy, above), or run `/gsd:plan-phase 2` to plan the automated verification gate. A formal `gsd-verifier` pass on Phase 1 was not run (each plan was verified in-flight; full suite + build + a11y are green) and can be run if desired.
