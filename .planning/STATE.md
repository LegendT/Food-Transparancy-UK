# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-30)

**Core value:** Every published fact is traceable to a primary source, independently verified to a standard matched to the claim, and honest about its uncertainty — transparency over persuasion.
**Current focus:** Phase 1 — Foundation: Trust Primitives, Entity & Timeline Schemas, Rights & CI

## Current Position

Phase: 1 of 9 (Foundation — Trust Primitives, Entity & Timeline Schemas, Rights & CI)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-06-30 — Roadmap rebuilt after Round 2 critique for 73 v1 requirements (mega-phase 3 split into 3a/3b, per-fact + contested gates, legal/a11y safeguards as gates, numeric workstream entry gates, processing/price/ingredient-breadth deferred, Phase 9 launch-readiness gates added)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Mega-phase 3 split: Phase 3a (core entity pages + trust/withheld rendering) and Phase 3b (site shell, pa11y-ci a11y floor, crawlability, non-expert UX). No single phase carries ~17 mixed requirements.
- Publication gate is per-fact and continuous (VRFY-04): a page ships its verified subset; unverified facts render as explicit "not yet verified — withheld" placeholders; a fact found `wrong` auto-withdraws.
- Contested facts (VRFY-11) publish WITH a visible both-sides treatment, distinct from withheld. Status set = workflow (unverified/in-review/open-disagreement-withheld) + published (confirmed/contested/stale/wrong).
- Then-vs-now is the FLAGSHIP layer (PROD-05/06/07/10/11), not on every page; the universal spine is the trust-rendered current-state record. PROD-13 publishes the corpus's own coverage figure; UX-04 home page frames flagship as showcase, rest as reference archive.
- Legal safeguards are enforced gates: DATA-10 image default "not cleared" (Phase 1), UX-06 lint bans superlatives/motive verbs (Phase 1 CI), PROD-08 no-imputation-of-motive + mandate/incentive tagging (Phase 4), SITE-02 right-of-reply/corrections register (Phase 7), GATE-01 pre-launch solicitor review (Phase 9).
- Accessibility safeguards: PROD-06 diff in text, TIME-03 text gap items, COMP-01 320px strategy + header associations, TRUST-04 progressive disclosure; SITE-04 pa11y-ci is the floor; GATE-02 manual screen-reader/keyboard/320px of the data-dense widgets is a Phase 9 release gate.
- Scope deferrals to v1.x: processing explorer (PROC-*), price (DATA-08/price axis), ingredient long tail. INGR-05 is now ~200 launch-corpus ingredients. Phase 6 is Comparison-only.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- Phase 4 has an explicit numeric entry gate: must not start until ≥ 15 Tier A products with sourced historical formulations have passed the verification gate.
- Phase 8 has an explicit numeric entry gate: must not start until ≥ 15 products carry ≥ 1 sourced, verified change event. It also keeps the historic-curation research flag (`/gsd:plan-phase --research-phase`).
- Historic-sourcing track opens in Phase 1 with a measurable exit: ≥ 20 flagship targets, each with an assigned documented driver, recorded in the project data.
- Verification editorial track runs against per-content-phase "publishable subset" numeric targets (3a: ≥ 20 products + ≥ 40 ingredients; Phase 4: 100 products + ~200 ingredients, ≥ 15 Tier A; Phase 8: ≥ 15 verified change events).
- Processing-taxonomy research is no longer a v1 concern — processing explorer is deferred to v1.x; tracked in REQUIREMENTS.md "v2 / v1.x".

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Processing | Processing explorer (PROC-01/02/03) | Deferred to v1.x | Round 2 critique |
| Comparison axis | Price as a sourced dated comparison axis (DATA-08/PRICE-01) | Deferred to v1.x | Round 2 critique |
| Ingredients | Ingredient long tail beyond ~200 launch corpus (toward 500) | Deferred to v1.x | Round 2 critique |

## Session Continuity

Last session: 2026-06-30
Stopped at: Roadmap rebuilt and written (ROADMAP.md, REQUIREMENTS.md traceability, STATE.md) — 9 phases (3 split into 3a/3b), 73/73 requirements mapped, two numeric workstream entry gates, Phase 9 launch-readiness gates
Resume file: None
