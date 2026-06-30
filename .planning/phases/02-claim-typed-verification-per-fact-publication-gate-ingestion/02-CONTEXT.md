# Phase 2: Claim-Typed Verification, Per-Fact Publication Gate & Ingestion - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the Phase 1 validation harness (`lib/validate.mjs`, `lib/referential.mjs`, which already walk every `SourcedValue` by signature via `collectFacts`) into a continuous, per-fact verification-sufficiency gate, plus an Open Food Facts ingestion path into a draft store.

In scope (the 14 phase requirements): the claim-typed two-pass record and the per-fact publication gate (VRFY-01/03/04); citation-existence and measure-mismatch checks (VRFY-07/08); distinct-lineage enforcement (part of VRFY-01); the re-verification audit command and its worst-first record (VRFY-05/06); per-class staleness thresholds and the reader-facing review-due indicator (VRFY-09/12); human-only adjudication routing to confirmed / corrected / contested, with the contested both-sides treatment (VRFY-02/11); continuous withdrawal of a fact later marked `wrong` (VRFY-04); OFF ingestion into a draft/lead store with field-level provenance and the OFF revision-diff as an unverified lead (DATA-05/06, VRFY-10).

Out of scope (belongs to later phases or stays manual editorial work): product/ingredient page rendering of the withheld placeholder and contested treatment (the gate produces the status and data; Phase 3a renders it); building robust archival fetch automation that performs verification passes programmatically (passes stay editor-authored — see D-04); any automated semantic classifier of claim nature (D-07).
</domain>

<decisions>
## Implementation Decisions

### Verification record model
- **D-01:** The two-pass verification record lives INLINE in each `SourcedValue`, as a `verification` object sibling of `value` / `sources` / `confidence`. Rationale: it matches the project's provenance-in-diff ethos, reuses `collectFacts` (no new fact-id system needed — facts have no stable id today, only a JSON instance path), and keeps a fact's value and its verification in one git diff. Accepted cost: every fact grows.
- **D-02:** The gate is enforced at the level of the individual fact (each `SourcedValue` node), not at entity/page level. The page-level `verificationStatus`/`publicationStatus` reserved on entities in Phase 1 are superseded for the gate by the per-fact `verification` record; the planner should reconcile the SPIKE-01 product records (which currently put these at product level) to the per-fact model.
- **D-03:** A fact's adjudication verdict is recorded INLINE in the fact (status: confirmed / corrected / contested, plus a required adjudication note). AI never writes a verdict — only a human edits it. Consistent with D-01.

### Automation boundary
- **D-04:** Phase 2 builds the GATE and the cheap mechanical checks, not automated verification passes. Build: the per-fact publication gate; the structured pass-record the editor fills; the citation-existence check (URL/DOI resolves, via HTTP/curl, VRFY-07); the measure-mismatch auto-disagreement (VRFY-08); the lineage-distinctness check (D-05). The two verification passes themselves stay editor-authored (the honest human/AI model stated in SPIKE-01 and CLAUDE.md). A thin Wayback-CDX / curl sourcing helper may assist an editor in finding archival evidence, but the gate NEVER treats an automated read as a satisfied pass. Rationale: SPIKE-01 proved the agent fetch tool is blocked from Wayback and retailers return 403; building fetch automation that the gate trusts would both be fragile and violate "AI never adjudicates".

### Distinct-lineage detection
- **D-05:** Hybrid. A human-declared lineage tag on source-registry records (e.g. a `lineageId` or `derivedFrom` field extending `sources.json` / `source.schema.json`) is AUTHORITATIVE for the gate: a corroborable fact's two passes must cite distinct declared lineages (co-derived sources share a lineage). Separately, an automated similarity heuristic (domain / publisher / text) raises a NON-BLOCKING warning to catch undeclared co-derivation the editor missed. The gate decision rests on the human declaration; the heuristic only prompts a human to look.

### Staleness and the audit queue
- **D-06:** Three staleness classes, derived from the fact, with these thresholds: regulatory (claimDomain = `regulatory`) re-verify at 12 months; current (current label / nutrition / allergen / ingredient-function / general facts) at 24 months; historical (timeline-event and past-formulation facts) static — effectively no staleness threshold. A past threshold drives both the VRFY-05 audit queue and the VRFY-12 reader-facing "last verified {date} — review due" indicator.
- **D-07:** Adjudication workflow: the VRFY-05 audit command generates a dated, worst-first queue document (modelled on DEBT's `docs/DATA-AUDIT.md` — Confirmed / Stale / Wrong / Uncertain, ordered wrong then stale then oldest-first, with the per-fact measure recorded per VRFY-08) for human triage. The human adjudicates by editing the fact inline (D-03). The queue doc is the read-only triage surface; the data file holds the verdict.
- **D-08:** claimType/claimDomain stay author-self-classified; the gate enforces only the structural / pass-count consequences of the declared claimType (Phase 1 already enforces the corroborable >=2-source rule). Whether a claim is "really" authoritative vs corroborable is human editorial judgement, surfaced for review in the audit queue, never decided by an automated semantic classifier. Rationale: semantic classification is exactly the AI judgement the project keeps out of the gate.

### OFF ingestion and the draft store
- **D-09:** OFF-ingested drafts and revision-diff leads live OUTSIDE the published data directory (e.g. `ingestion/leads/` or a `src/_data/_drafts/` path excluded from the Eleventy data cascade), with OFF provenance tagged at field level (DATA-05/06). The Phase 1 corpus-escape guard already fails the build on any stray fact-bearing file outside the validated dirs, so a draft cannot reach a published page. The OFF revision-diff is recorded as a `lead` status that requires human promotion before it can publish as a reformulation (VRFY-10) — Phase 2 does NOT build a full automated revision differ; the lead status and the never-publish guard are the deliverable.

### Claude's Discretion
- The exact field names and JSON shape of the inline `verification` record (pass array; per-pass source / measure / verdict / accessibility; adjudication sub-object) — propose during research/planning, consistent with the existing envelope style in `schemas/sourced-value.schema.json`.
- The precise mechanism for deriving a fact's staleness class (keying off `claimDomain`, entity type, or an optional explicit override field) — D-06 fixes the classes and thresholds; the derivation is implementation.
- The lineage-similarity heuristic's specifics (what signals, what threshold for the warning).
- Exact draft-store directory path and how it is excluded from the Eleventy cascade and the validation corpus.
- Whether the audit queue doc is committed to the repo or generated on demand (a dated artefact either way).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 2" — goal, the six success criteria, the verification editorial track targets
- `.planning/REQUIREMENTS.md` §Verification (VRFY-01 to VRFY-12) and §Data Model & Sourcing (DATA-05, DATA-06) — the 14 phase requirement texts
- `CLAUDE.md` §Constraints "Two-pass verification (highest priority)" — the load-bearing trust-model statement this phase implements

### SPIKE-01 (the named gate requirements and the honesty model)
- `docs/SPIKE-01-FINDINGS.md` — the five requirements the Phase 2 gate must enforce; the honesty note that passes are not two independent human reviewers
- `docs/spike-findings.json` §`phase2GateRequirements`, §`toolingBlockers` — machine-readable gate requirements and the fetch blockers behind D-04

### The harness Phase 2 extends
- `lib/validate.mjs` — the Ajv structural gate (`compile`, `validateDataset`); pure functions shared by script and tests
- `lib/referential.mjs` — the cross-file gates and `collectFacts` / `collectDateRanges` walkers; the `isSourcedValue` signature the per-fact gate keys on
- `scripts/validate-data.mjs` — the prebuild orchestration and the corpus-escape guard the draft store relies on (D-09)
- `schemas/sourced-value.schema.json` — the envelope reserving nullable `verificationStatus` / `publicationStatus`; the corroborable >=2-source `allOf` rule; `claimType` and `claimDomain` enums
- `schemas/source.schema.json` and `src/_data/sources.json` — the registry the lineage tag (D-05) extends
- `src/_data/products/spike-01.json` (and spike-02/03, `src/_data/timeline/*`) — the real records the gate operates on and that D-02 must reconcile to per-fact verification

### Blueprint pattern (read-only, do not modify)
- `/Users/anthonygeorge/Projects/DEBT/docs/DATA-AUDIT.md` — the dual-reviewer audit this gate strengthens: status vocabulary (Confirmed / Stale / Wrong / Uncertain), worst-first ordering, per-figure measure definition, independent re-check, reviewer-disagreement flagging for human scrutiny (the model for D-07)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `collectFacts(data, path)` in `lib/referential.mjs`: already enumerates every `SourcedValue` in an entity with its instance path — the per-fact gate iterates over this, no new traversal needed.
- The pure-function + `{ errors }` / `{ warnings }` pattern in `lib/referential.mjs`: the lineage check and citation-existence check should follow it (errors fail the build, warnings do not), so the same functions are unit-testable under `node --test`.
- The prebuild gate chain in `package.json` (`validate` -> `lint:editorial` -> `check:images`): the verification gate and the existence check slot in here; the audit command is a separate non-prebuild script (read-only, no value changes).
- Negative-fixture convention: every Phase 1 failure path has a negative fixture; Phase 2's new failure paths (insufficient passes, unresolved citation, measure mismatch, shared lineage, draft-in-published-dir) each need one.

### Established Patterns
- Facts are addressed by JSON instance path, not by id — this is why D-01 (inline records) avoids inventing a fact-id system.
- `claimDomain = "regulatory"` already triggers special handling (TRUST-06 GB-source + checkedOn) in `checkRegulatoryJurisdiction` — D-06 reuses `claimDomain` as the staleness-class key.
- Share-alike / OFF-derived facts are already detected by `listOffDerived` via the source registry's `licence.shareAlike` flag — ingestion provenance (D-09) and ODbL handling build on this.

### Integration Points
- The new per-fact `verification` object attaches inside `schemas/sourced-value.schema.json` (currently it only reserves the two nullable status strings).
- The lineage tag attaches to `schemas/source.schema.json` and every record in `src/_data/sources.json`.
- The draft store attaches at the Eleventy data-cascade boundary and the `scripts/validate-data.mjs` corpus walk (must be excluded from both).
</code_context>

<specifics>
## Specific Ideas

- The audit queue doc should read like DEBT's `DATA-AUDIT.md`: a dated header, counts-by-status table, worst-first discrepancy sections each carrying the fact's recorded measure, and a separate "reviewer disagreements — flag for extra human scrutiny" section. That file is the concrete template.
- "AI never adjudicates" is a hard rule across D-03, D-04, D-05, D-07 and D-08: the gate enforces mechanically and surfaces for human judgement, but no value or verdict is ever written by automation.
</specifics>

<deferred>
## Deferred Ideas

- Robust archival/primary fetch automation (Wayback CDX capture, manufacturer pack-image capture) as a first-class verification source — SPIKE-01's #1 limiter, but kept as a thin editor aid in Phase 2 (D-04); a fuller capability is future work and is what would raise the corpus/Tier A figures.
- Automated OFF revision differ (continuous diffing of OFF snapshots to surface leads) — Phase 2 records the lead status and the never-publish guard only (D-09); automating the diff is later.
- Rendering of the withheld placeholder, the contested both-sides treatment, and the reader-facing review-due indicator — produced as data/status here, rendered in Phase 3a.

</deferred>

---

*Phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion*
*Context gathered: 2026-06-30*
</content>
</invoke>
