# Plan 01-10 Summary — SPIKE-01 sourcing spike

**Status:** Complete (3/3 tasks)
**Requirements:** SPIKE-01

## What was built

The first real content in the archive: three Tier A products sourced via a manual
two-pass verification dry-run (an AI assistant did the sourcing, a human editor
confirmed), encoded as schema-valid records that pass the build gate.

- **3 product records** (`src/_data/products/spike-01..03.json`): Lucozade Energy,
  Cadbury Dairy Milk, Wall's Soft Scoop Vanilla. Current facts sourced to the
  registry; contested and un-corroborable historic facts carried honestly (never
  asserted).
- **2 timeline events** (`src/_data/timeline/spike-lucozade-2017-sugar-cut.json`,
  `spike-cadbury-2019-less-sugar.json`): documentedChange / statedReason /
  labelledInference kept separate (DATA-04). Wall's Soft Scoop has no event: no
  cream-based "then" state could be sourced.
- **11 new source records** in `src/_data/sources.json` (press, archival, regulatory
  commentary), each with jurisdiction and licence.
- **`docs/SPIKE-01-FINDINGS.md`**, **`docs/spike-findings.json`**,
  **`schemas/spike-findings.schema.json`**, **`test/spike.test.js`** (6 tests).

## Results

- **Attempts: 4** (the trio plus the abandoned Wall's Vienetta). **Sourced: 3.**
  **Dead-end rate: 0.25** at the publishable-record bar.
- **Strict corroborable historic bar (two distinct lineages, >=1 primary/archival):
  met 0 of 3** — a tooling result, not a topic result. Wayback is unreachable from
  the fetch tool (partial via curl), and the major retailers block fetches.
- **Provisional re-derived figures (n=3 placeholders Phase 4 refines):** launch
  corpus **35** (down from ~100); Tier A full then-vs-now **10** (down from >=15).
  Both rise only if Phase 2 builds an archival/primary fetch path.
- **Phase 2 gate requirements named:** archival fetch path, distinct-lineage
  detection, citation-existence check, measure-mismatch auto-disagreement, human
  adjudication routing.

## Decisions / deviations

1. **Vienetta dropped, Wall's Soft Scoop sourced instead** (user direction at the
   editorial gate). Vienetta was a full dead-end: no sourceable historic cream
   formulation, and the 2015 rule link was contradicted by the evidence. The
   abandoned attempt is counted in the dead-end denominator.
2. **Factual correction carried into the records:** GB law does not bar a
   vegetable-fat product from the term "ice cream". The accurate, sourced point is
   that coconut fat disqualifies Soft Scoop from "dairy ice cream"; the surviving
   ice cream specifications are a voluntary industry code. The initial "illegal to
   call ice cream" framing was rejected as unsourced.
3. **`spike-events.json` split into per-event files.** The plan named a single
   `spike-events.json`, but the validator validates each `src/_data/timeline/*.json`
   file as one TimelineEvent object (an array would fail Ajv). Two single-event
   files were used instead.
4. **Honest treatments used throughout:** Lucozade's exact pre-reformulation sugar
   figure is contested (13g vs 17g vs 12.4g) and carried as an approximation;
   Cadbury's lower-sugar variant sits at authoritative-attribution level (co-derived
   press); Soft Scoop's "then" state is withheld. The thesis is tempered by
   evidence rather than asserted.
5. **Records authored by the orchestrator** (not a separate executor) to keep the
   nuanced contested/withheld editorial calls under direct control; all pass the
   gate.

## Self-Check: PASSED

- `node scripts/validate-data.mjs`: passes (6 fact-bearing files; OFF-derived facts
  flagged for ODbL share-alike).
- `npm run build`: exit 0 through all three gates and render.
- `node --test test/spike.test.js`: 6/6; full suite 51/51.
- No em-dashes in src/ or docs/; editorial gate passes on the findings doc.
