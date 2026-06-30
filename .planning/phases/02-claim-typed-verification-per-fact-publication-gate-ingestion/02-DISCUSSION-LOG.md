# Phase 2: Claim-Typed Verification, Per-Fact Publication Gate & Ingestion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 02-claim-typed-verification-per-fact-publication-gate-ingestion
**Areas discussed:** Verification record shape, Automation boundary, Distinct-lineage detection, Staleness + adjudication queue, OFF draft store, claimType self-classification

---

## Verification record shape

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in each SourcedValue | `verification` object sibling inside every fact; provenance-in-diff; reuses collectFacts; no fact-id system needed | ✓ |
| Sidecar verification store | Separate file keyed by fact id; lean facts but needs stable fact ids and splits value from verification across files | |

**User's choice:** Inline in each SourcedValue
**Notes:** Consistent with the project's provenance-in-diff ethos. Facts currently have no stable id (only a JSON instance path), so inline avoids inventing one.

---

## Automation boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Gate + records + cheap automated checks | Per-fact gate, editor-filled pass record, citation-existence + measure-mismatch + lineage checks; passes editor-authored; thin Wayback/curl helper never trusted as a pass | ✓ |
| Full fetch + automated verification passes | Robust archival fetch automation performing passes programmatically; powerful but fragile (retailer 403, Wayback blocked) and risks the gate trusting machine reads | |

**User's choice:** Gate + records + cheap automated checks
**Notes:** Driven by SPIKE-01 — the agent fetch tool is blocked from Wayback and retailers return 403. Keeps "AI never adjudicates" intact.

---

## Distinct-lineage detection

| Option | Description | Selected |
|--------|-------------|----------|
| Declared lineage tag on source records | Human declares lineageId/derivedFrom; gate enforces distinct lineages; local-first, diff-auditable | |
| Automated similarity heuristic | Gate infers co-derivation from domain/publisher/text; brittle, risks false independence | |
| Both: declared tag authoritative, heuristic as warning | Declared tag drives the gate; heuristic raises a non-blocking warning for undeclared co-derivation | ✓ |

**User's choice:** Both — declared tag authoritative, heuristic as a non-blocking warning
**Notes:** Gate decision rests on the human declaration; the heuristic only prompts a human to look.

---

## Staleness + adjudication queue

| Option | Description | Selected |
|--------|-------------|----------|
| Reg 12mo / Current 24mo / Historical static | Regulatory yearly, current label/nutrition every 24mo, settled historical facts static | ✓ |
| Reg 12mo / Current 12mo / Historical 36mo | Stricter, uniform; more re-verification load | |
| Two classes: Live 18mo / Historical static | Simpler; loses the regulatory-moves-faster distinction | |

**User's choice (thresholds):** Reg 12mo / Current 24mo / Historical static

| Option | Description | Selected |
|--------|-------------|----------|
| Generated queue + inline verdict | Audit command generates worst-first queue doc (DATA-AUDIT.md style) for triage; verdict recorded inline in the fact; AI never writes a verdict | ✓ |
| Separate adjudication register file | Verdicts in a standalone register; isolates the audit trail but splits verdict from value | |

**User's choice (adjudication):** Generated queue + inline verdict

---

## OFF draft store

| Option | Description | Selected |
|--------|-------------|----------|
| Drafts outside published data dir + lead status | Ingestion writes outside src/_data with field-level provenance; corpus-escape guard prevents publish; revision-diff is a lead requiring human promotion, not a full differ | ✓ |
| Drafts in-tree with a draft flag | Drafts alongside published records, filtered at render; simpler but one missed filter publishes an unverified lead | |

**User's choice:** Drafts outside published data dir + lead status

---

## claimType self-classification

| Option | Description | Selected |
|--------|-------------|----------|
| Human-judgement, surfaced in audit | Gate enforces only structural/pass-count consequences; claim nature stays human editorial judgement, surfaced in the audit queue | ✓ |
| Automated semantic cross-check | A check flags likely misclassification; risks the AI judgement the project keeps out of the gate | |

**User's choice:** Human-judgement, surfaced in audit

---

## Claude's Discretion

- Exact field names and JSON shape of the inline `verification` record.
- Mechanism for deriving a fact's staleness class (claimDomain vs entity type vs explicit override).
- The lineage-similarity heuristic's specific signals and warning threshold.
- Exact draft-store directory path and its exclusion from the Eleventy cascade and validation corpus.
- Whether the audit queue doc is committed or generated on demand.

## Deferred Ideas

- Robust archival/primary fetch automation as a first-class verification source (SPIKE-01's #1 limiter; thin editor aid only in Phase 2).
- Automated OFF revision differ (Phase 2 records the lead status and never-publish guard only).
- Rendering of the withheld placeholder, contested both-sides treatment, and review-due indicator (Phase 3a renders; Phase 2 produces the status/data).
</content>
