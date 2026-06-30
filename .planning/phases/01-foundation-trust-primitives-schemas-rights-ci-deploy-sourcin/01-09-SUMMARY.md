# Plan 01-09 Summary — Corpus selection rubric and sourcing backlog

**Status:** Complete (3/3 tasks)
**Requirements:** PROD-14

## What was built

- **`docs/SELECTION-CRITERIA.md`** — the named PROD-14 rubric in plain en-GB:
  UK market ubiquity, coverage across the flagship anchor categories (ice cream,
  soft drinks, chocolate, bread), and Tier A historical-formulation
  sourceability. Records the explicit no-transformation-metric rule.
- **`schemas/sourcing-backlog.schema.json`** — contract for a `targets` array;
  each target requires name, category, driver (type mandate|incentive + name),
  tier hint (A/B/C-candidate) and a one-line rationale.
- **`docs/sourcing-backlog.json`** — **22 candidate targets** drawn from the
  documented drivers: 8 A-candidate, 10 B-candidate, 4 C-candidate. Honestly
  tiered against the ~15-20 Tier A whole-project feasibility ceiling; not
  all-Tier-A-candidate.
- **`test/backlog.test.js`** (node:test, 4/4 pass) — asserts >=20 targets, each
  with a valid driver/tier/rationale, that the pool is not all-Tier-A, and
  schema validity (Ajv2020 compiled directly from `ajv/dist/2020.js`).

## Candidate set (editor-confirmed)

- Ice cream (2015 compositional rule, mandate): Vienetta (A), Soft Scoop/Blue
  Ribbon (A), Cornetto (B), Carte D'Or (B), own-label soft scoop (C)
- Soft drinks (2018 SDIL, incentive): Lucozade Energy (A), Ribena (A), Irn-Bru
  (A), Fanta GB (B), Sprite GB (B), Vimto (B), Lilt (C)
- Chocolate (FSA sugar programme 2015+, incentive): Dairy Milk (A), Creme Egg
  (A), Terry's Chocolate Orange (B), Toblerone GB (B), Mars (B), Quality Street (C)
- Bread (FSA salt programme 2006+, incentive): Hovis Wholemeal (A), Warburtons
  Toastie (B), Kingsmill 50/50 (B), Hovis Best of Both (C)

## Commits

- `5425223` feat(01-09): record selection rubric and sourcing backlog
- `ac64f68` test(01-09): assert the sourcing backlog is machine-verifiable
- (this) docs(01-09): record editorial confirmation of the selection

## Decisions / deviations

- **Editorial gate (Task 3): the user confirmed the rubric and the full
  22-candidate backlog as drafted on 2026-06-30.** No swaps or retiers requested.
  Confirmation stamped in `docs/SELECTION-CRITERIA.md`.
- The `<!-- editorial-allow: quote -->` directive in SELECTION-CRITERIA.md is
  forward-compatible convention; `check-editorial.mjs` (plan 01-06) will enforce
  it. It wraps the one line naming the prohibited "league table" framing.

## Self-Check: PASSED

- `node --test test/backlog.test.js` 4/4 pass; 22 targets, tiered 8/10/4.
- No em-dashes in docs/.
