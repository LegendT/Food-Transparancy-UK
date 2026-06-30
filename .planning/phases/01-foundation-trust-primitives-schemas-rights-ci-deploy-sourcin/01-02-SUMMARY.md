# Plan 01-02 Summary — Trust vocabulary, source/rights registry, dataset licence

**Status:** Complete (3/3 tasks)
**Requirements:** TRUST-02, TRUST-06, DATA-01, DATA-02, DATA-12

## What was built

- **Two-axis GRADE trust vocabulary** in `src/_data/meta.json`: separate
  `confidenceLevels` (curator certainty) and `evidenceLevels` (GRADE evidence
  strength) enums, each keyed `high/moderate/low/very-low`. No combined score,
  no source-type field on the fact axis. `datasetLicence` records the canonical
  choice (`ODbL-1.0`).
- **Source/rights registry contract** `schemas/source.schema.json` (draft
  2020-12): required `id, name, publisher, url, covers, updateFrequency,
  retrievedDate, sourceType, jurisdiction, licence`; optional `driver`
  (mandate/incentive). `additionalProperties: false`. DEBT's per-source
  `confidence_level` dropped (confidence is now a per-fact axis).
- **Seed registry** `src/_data/sources.json`: Open Food Facts record (`off`,
  tertiary, international, ODbL with `shareAlike: true`), a GB-jurisdiction
  regulatory source, and a driver-tagged policy source exercising the
  mandate-vs-incentive flag.
- **Dataset licence** `LICENSE-DATA`: verbatim ODbL 1.0 text (canonical SPDX
  source) under a British-English header noting the CC BY 4.0 alternative and
  the machine-readable canonical record in `meta.json`.
- **README licensing split**: MIT code / ODbL data, per-source licence objects,
  OFF-derived identifiability via the `off` source id.

## Commits

- `3a182ed` feat(01-02): add two-axis GRADE trust enums and dataset licence to meta.json
- `342bc2f` feat(01-02): add source registry schema and seed records
- `43abdde` feat(01-02): add ODbL 1.0 dataset licence and README licensing split

## Decisions / deviations

- **Dataset licence: ODbL 1.0**, confirmed by the user at the Wave 2 gate
  (CC BY 4.0 was the flagged alternative).
- **Execution note:** the original executor agent died after committing Tasks 1
  and 2 — its final output tripped a content-filter policy (likely the long
  ODbL legal text). The orchestrator completed Task 3 directly: fetched the
  verbatim ODbL 1.0 text from the canonical SPDX licence list
  (`spdx/license-list-data`, 25,289 bytes) rather than reproducing legal text
  from memory, wrote `LICENSE-DATA` + the README Licensing section, and removed
  em-dashes from the README to satisfy the (not-yet-built) UX-06 editorial gate.

## Self-Check: PASSED

- meta.json: two GRADE enums + `datasetLicence.id` resolve.
- sources.json: `off` record shareAlike+international, a GB source, a
  driver-tagged source all present.
- LICENSE-DATA holds ODbL text; README documents the licence split.
- No em-dashes in README/src/docs.
