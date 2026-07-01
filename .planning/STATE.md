---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 03a-01-PLAN.md
last_updated: "2026-07-01T20:33:26.554Z"
last_activity: 2026-07-01
progress:
  total_phases: 10
  completed_phases: 2
  total_plans: 23
  completed_plans: 19
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-30)

**Core value:** Every published fact is traceable to a primary source, independently verified to a standard matched to the claim, and honest about its uncertainty — transparency over persuasion.
**Current focus:** Phase 03a — Core Entity Pages & Trust Rendering

## Current Position

Phase: 03a (Core Entity Pages & Trust Rendering) — EXECUTING
Plan: 3 of 6
Status: Ready to execute
Last activity: 2026-07-01

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 7
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 7 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P01-01 | 5 | 3 tasks | 13 files |
| Phase 01 P01-03 | 7 | 3 tasks | 3 files |
| Phase 01 P01-04 | 9 | - tasks | - files |
| Phase 01 P01-05 | 14 | 3 tasks | 18 files |
| Phase 01 P01-06 | 16 | 3 tasks | 13 files |
| Phase 01 P01-07 | 25 | 3 tasks | 6 files |
| Phase 02 P02-01 | 6 | 3 tasks | 21 files |
| Phase 02 P02-02 | 8min | 2 tasks | 2 files |
| Phase 02 P02-05 | 6 | 2 tasks | 3 files |
| Phase 02 P02-04 | 14 | 2 tasks | 6 files |
| Phase 02 P02-03 | 11 | 2 tasks | 2 files |
| Phase 02 P02-06 | 12 | 2 tasks | 3 files |
| Phase 02 P02-07 | 18 | 1 tasks | 4 files |
| Phase 03a P01 | 20 | 3 tasks | 12 files |
| Phase 03a P02 | 12 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Launch corpus is sized from the Phase 1 SPIKE-01 spike (three Tier A products taken end to end), not a fixed upfront number. PROD-12 is "target ~100, evidence-derived"; the Phase 4 Tier A entry gate is "the threshold re-derived by SPIKE-01" (provisional ≥ 15).
- CI/deploy substrate (INFRA-01) lands in Phase 1: Netlify static deploy + CSP, plus a CI pipeline that actually runs the build-failing gates (TRUST-05, UX-06, DATA-10) and pa11y-ci, so every gate has a host from day one.
- The dataset is open-licenced in Phase 1 (DATA-12, the bus-factor / graceful-degradation escape hatch); it is also the source the Phase 3b per-record JSON export (SITE-11) serves.
- The named corpus / Tier A selection rubric (PROD-14) is recorded in Phase 1, before content, with a one-line rationale per product; selection is never by a computed transformation metric.
- Ingredient pages are descriptive in v1 (INGR-02): they cite an authoritative regulatory/safety position, dated, and do NOT synthesise primary studies into health-effect claims. Health-effect evidence synthesis (EVID-SYNTH-01) is deferred to v1.x behind a future qualified-reviewer gate.
- A reader-facing "last verified {date} — review due" staleness indicator (VRFY-12) is owned by Phase 2, not just an internal audit flag.
- Phase 3b carries the trust/credibility surface that earns a cold-start citation audience: SITE-09 disclaimer, SITE-10 About/editorial-independence + named editor (resolves the About nav destination), SITE-11 citation+JSON export, SITE-12 RSS/Atom, SITE-13 report-an-error.
- Search (Phase 5) is indexed solely from published rendered output, never the draft/lead store (SRCH-04).
- Mega-phase 3 split kept: Phase 3a (core entity pages + trust/withheld rendering) and Phase 3b (site shell, pa11y-ci floor, crawlability, non-expert UX, credibility surface — 12 reqs, balanced).
- Publication gate is per-fact and continuous (VRFY-04); contested facts (VRFY-11) publish WITH a visible both-sides treatment, distinct from withheld.
- Then-vs-now is the FLAGSHIP layer (PROD-05/06/07/10/11), not on every page; the universal spine is the trust-rendered current-state record. PROD-13 publishes the corpus's own coverage figure; UX-04 home page frames flagship as showcase.
- Legal/accessibility gates are EARLY-AND-TERMINAL: GATE-02 manual AT check fires when each data-dense widget is first built (Phase 4 diff, Phase 6 comparison, Phase 8 timeline) and is consolidated in Phase 9; GATE-01 solicitor review fires early on the legal pattern at the end of Phase 4 and terminally as a full sign-off in Phase 9. REQ-IDs stay mapped to Phase 9; early checks are phase success criteria.
- Scope deferrals to v1.x: processing explorer (PROC-*), price (PRICE-01), ingredient health-effect evidence synthesis (EVID-SYNTH-01), ingredient long tail (INGR-LONGTAIL).
- [Phase ?]: Ajv ESM import must use ajv/dist/2020.js (with .js) under Node 24; extensionless ajv/dist/2020 fails (ajv@8.20.0 has no exports field). Applies to Plan 01-05 lib/validate.mjs
- [Phase ?]: Plan 01-05: the validation gate is live in prebuild. Ajv structural checks run first, then imperative referential, TRUST-06 and date-order checks; a non-zero-corpus assertion seeded by src/_data/demoFact.json prevents a false-green empty scan, and nine negative fixtures each prove their owning gate rejects bad input.
- [Phase ?]: Plan 01-06: image-rights gate is default-deny over REFERENCED images (manifest is the non-zero corpus; zero references is a valid pass); editorial lint is scoped (Class A everywhere, Class B analyst-only) with a same-line editorial-allow directive and blockquote suppression so lawful attributed quotation never fails the build.
- [Phase 02]: Plan 02-01: verificationStatus/publicationStatus constrained to enum [null] at both the SourcedValue and all five entity schemas, so publication status is derived-only every build (D-03/R-06); no author-writable publish flag exists
- [Phase 02]: Plan 02-01: the verdict-cache entry shape { verdict, resolvedVia, checkedAt, statusCode, snapshotUrl } is SEAM-pinned by citation-verdicts.sample.json and must not diverge across 02-03/02-05/02-06
- [Phase 02]: Plan 02-05: split the four-verdict citation checker into pure lib/citation-status.mjs helpers (classifier, SSRF host guard, DOI-slash normaliser, closest-snapshot picker, soft-404) and a standalone scripts/check-citations.mjs; a non-RESOLVES verdict never satisfies the gate (D-11), and the checker is never wired into prebuild
- [Phase 02]: Plan 02-07: the corroborable standard is demonstrated on live corpus data (Companies House statutory register + Suntory corporate site, distinct null-derivedFrom roots, both resolving) deriving published-confirmed - R-27 satisfied by a real worked example, not a no-pair rationale
- [Phase 02]: Plan 02-07: the Lucozade pre-2017 sugar figure is the worked published-contested example - singular value withheld (null), two positions carried, human adjudication.outcome contested (VRFY-11)
- [Phase 03a]: Plan 03a-01: authorityPosition is a bare SourcedValue $ref, deliberately NOT claimDomain regulatory, so the INGR-02 authority opinion never trips checkRegulatoryJurisdiction / the TRUST-06 gate and stays distinct from regulatoryStatus
- [Phase 03a]: Plan 03a-01: reverse indices (productsByIngredient, timelineByProduct) are pure lib functions returning bracket-accessible plain objects, exposed via addGlobalData read from disk at config load, never a forbidden _data/*.js file; a dangling product->ingredient OR timeline->product reference fails the build via the symmetric checkIngredientRefs/checkTimelineRefs gates

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- Phase 4 has an explicit numeric entry gate: must not start until the SPIKE-01-re-derived Tier A threshold (provisional ≥ 15 verified Tier A products) is met through the verification gate.
- Phase 8 has an explicit numeric entry gate: must not start until ≥ 15 products carry ≥ 1 sourced, verified change event. It also keeps the historic-curation research flag (`/gsd:plan-phase --research-phase`).
- Historic-sourcing track opens in Phase 1 with the SPIKE-01 spike and an evidence-based exit: three fully verified Tier A products + a re-derived corpus/entry-gate figure + a recorded backlog of ≥ 20 flagship targets, each with an assigned documented driver and a one-line PROD-14 rationale.
- Verification editorial track runs against per-content-phase "publishable subset" numeric targets (3a: ≥ 20 products + ≥ 40 ingredients; Phase 4: the SPIKE-01-sized corpus, ~100 products + ~200 ingredients, re-derived Tier A count; Phase 8: ≥ 15 verified change events).
- GATE-01 and GATE-02 are a named, budgeted launch dependency (early solicitor review + early manual AT checks, then terminal sign-offs).
- Processing-taxonomy and health-effect-synthesis research are no longer v1 concerns — both deferred to v1.x; tracked in REQUIREMENTS.md "v2 / v1.x".

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Processing | Processing explorer (PROC-01/02/03) | Deferred to v1.x | Round 2 critique |
| Comparison axis | Price as a sourced dated comparison axis (PRICE-01) | Deferred to v1.x | Round 2 critique |
| Ingredients | Ingredient long tail beyond ~200 launch corpus (INGR-LONGTAIL, toward 500) | Deferred to v1.x | Round 2 critique |
| Editorial surface | Ingredient health-effect evidence synthesis (EVID-SYNTH-01), behind a future qualified-reviewer gate | Deferred to v1.x | Round 3 critique |

## Session Continuity

Last session: 2026-07-01T20:33:09.595Z
Stopped at: Completed 03a-01-PLAN.md
Resume file: None
