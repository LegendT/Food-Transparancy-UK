# Handoff — Food Transparency UK

**Date:** 2026-06-30
**Status:** Project initialised; Phase 1 fully planned and thrice-critiqued; **ready to execute Phase 1**.

## What this project is

An evidence-based, citation-first static archive of how UK packaged-food recipes have changed over time (the thesis: many everyday "foods" have quietly become a manipulation of the original — e.g. ice cream that was cream + flavouring is now stabilisers and oils). Built for the non-expert who has heard of "UPF" but hasn't connected it to specific products. Core value: every published fact is traceable to a primary source, independently verified to a standard matched to the claim, and honest about its uncertainty.

Full context lives in `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` (84 v1 requirements), `.planning/ROADMAP.md` (9 phases), and `.planning/research/`.

## Where things stand

- **Initialisation:** done via GSD `new-project` (research → requirements → roadmap), then hardened through **three critique rounds** (claim-typed verification, tiered then-vs-now after feasibility research, legal/accessibility safeguards, scope deferrals). Merged to `main` via PR #1.
- **Phase 1 ("Foundation — Trust Primitives, Schemas, Rights, CI/Deploy & Sourcing Spike"):** planned via GSD `plan-phase` — **10 plans across 6 waves**, all 19 phase requirements covered. Then **three further deep critique rounds** on the plans themselves (multi-agent, research-backed) found and fixed real build-breakers; round 3 confirmed execution-readiness.
- **Phase 1 is the next thing to BUILD.** Phases 2–9 are roadmapped but not yet planned.

## Git / repo state

- Repo: **github.com/LegendT/Food-Transparancy-UK** (origin set, authenticated as LegendT).
- Local branch `main` is **ahead of origin by the Phase 1 commits — NOT pushed.** The initialisation (PR #1) is already merged to remote `main`.
- Phase 1 commits this session: plans (`63d838d`) → critique round 1 (`376cd85`) → round 2 (`6b894bc`) → round 3 (`74bfcef`), plus research/validation commits.
- The mirror/blueprint repo is `/Users/anthonygeorge/Projects/DEBT` (a live Eleventy data-transparency site — the patterns Phase 1 reuses; do NOT modify it).

## CRITICAL tooling note (will trip you up otherwise)

The `gsd-sdk` on PATH is the WRONG binary (`@gsd-build/sdk` — an autonomous runner with no `query` subcommand). The GSD skill workflows say `gsd-sdk query X`; the REAL helper is:

```
node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>
```

Mapping: `gsd-sdk query init.plan-phase` → `gsd-tools.cjs init plan-phase`; `gsd-sdk query commit "..." --files ...` → `gsd-tools.cjs commit ...`; `gsd-sdk query state.planned-phase` → `gsd-tools.cjs state planned-phase`; `resolve-model <agent-type>` for per-agent models. (Also recorded in session memory `gsd-sdk-binary-collision`.) Config: Quality model profile (Opus for research/plan, Sonnet for checks), Interactive mode, research + plan-check + Nyquist all on, commit_docs on.

## Phase 1 plans (what execution will build)

Schema/infra foundation, NO product pages yet. Eleventy 3.1.6 mirroring DEBT, flat JSON, Ajv + node:test, build-failing gates in prebuild + an `eleventy.before` hook, Netlify deploy + GitHub Actions.

| Wave | Plans | Builds |
|------|-------|--------|
| 1 | 01-01 | Eleventy scaffold, deps (behind human confirm), CSP/HSTS, src/assets/styles.css |
| 2 | 01-02, 01-03, 01-09 | GRADE enums + source/rights registry + ODbL licence · SourcedValue envelope + ranged dates + 14 allergens · corpus rubric + ≥20-candidate backlog |
| 3 | 01-04 | 5 entity schemas + TimelineEvent + image schema |
| 4 | 01-05, 01-06 | Ajv + referential validation gate (+ seed demoFact.json, negative fixtures) · image default-deny + scoped editorial lint |
| 5 | 01-07, 01-10 | Trust macro + Methodology stub + demo (first green `npm run build`) · SPIKE-01 (3 Tier A products end-to-end) |
| 6 | 01-08 | pa11y-ci + GitHub Actions + Netlify deploy |

**Human checkpoints (autonomous: false):** 01-01 (dependency confirm), 01-08 (push to origin + Netlify connect + SHA resolution if no `gh`), 01-09/01-10 (manual editorial sourcing spike).

## Decisions flagged for confirmation (sensible defaults applied)

1. **Dataset licence (DATA-12):** defaulted to **ODbL 1.0** (Open Food Facts-compatible). CC BY 4.0 is the noted alternative.
2. **Node 24** pinned in the plans (DEBT mirror; 24 is active LTS) — the generated project `CLAUDE.md` still says 22/20 LTS; harmless drift, reconcile if you like.
3. **14-allergen wording** carries a "verify against current FSA list" note for the executor.

## Known residual items (all LOW — executor resolves in-flight)

- SHA-pinned GitHub Actions need `gh`/network at execution time (falls back to a human checkpoint).
- Class A editorial rules (em-dash, en-GB spelling) have no quote escape — latent for later phases when real manufacturer quotes land.
- The validation gate's `prebuild` lifecycle + `eleventy.before` hook deliberately double-run on `npm run build` (idempotent read-only validators; documented as defence-in-depth).

## Next step

```
/gsd:execute-phase 1
```

(Start in a fresh context window — `/clear` first.) Or branch + PR the Phase 1 plan commits before executing.
