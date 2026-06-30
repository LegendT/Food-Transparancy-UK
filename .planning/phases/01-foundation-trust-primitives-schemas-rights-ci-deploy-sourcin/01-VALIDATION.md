---
phase: 1
slug: foundation-trust-primitives-schemas-rights-ci-deploy-sourcing-spike
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-30
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. The validation
> architecture (negative-fixture map per gate) is defined in `01-RESEARCH.md` ("## Validation
> Architecture"). This phase's distinguishing property: the gates are only real if their
> FAILURE path is tested — every build-failing gate ships with a negative fixture that proves
> it fails the build.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node's built-in `node:test` (DEBT pattern, kept verbatim) + Ajv 8 for JSON Schema validation |
| **Config file** | none — `node --test 'test/**/*.test.js'`; schemas in `schemas/`, no separate test runner config |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run build` (runs the `prebuild` gates, then Eleventy) |
| **Estimated runtime** | ~5–20 seconds (test suite); build adds a few seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run build` (proves the `prebuild` gates pass on good input)
- **Before `/gsd:verify-work`:** Full suite green AND `npm run build` succeeds AND each gate's negative fixture proves the build fails on bad input
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

> Populated by the planner/executor as tasks land. Each build-failing gate MUST have a negative
> fixture row (a deliberately-bad input that proves the gate fails) in addition to its happy-path row.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (to be filled by planner) | — | — | — | — | — | — | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` with `node:test` + Ajv, and `test` / `build` / `prebuild` scripts — if no framework present (Wave 0 install)
- [ ] `test/` directory with the negative-fixture suite (one failing fixture per gate: missing provenance TRUST-05, uncleared image DATA-10, em-dash/superlative/motive-verb UX-06, malformed ranged date DATA-03, claim-type violation DATA-11)
- [ ] `schemas/` directory with the JSON Schemas Ajv validates against

*Greenfield repo — Wave 0 installs the framework and lays down the schema + test scaffolding.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Corpus/Tier A selection criteria recorded with per-target rationale | PROD-14 | Editorial judgement, not code | A `selection-criteria` doc exists; a structured `sourcing-backlog.json` test asserts ≥20 targets each with a driver + rationale |
| 3-product end-to-end sourcing spike; corpus target + Tier A gate re-derived | SPIKE-01 | Manual historic sourcing + two-pass verification | `spike-findings.json` test asserts 3 products with recorded effort + dead-end rate + re-derived figures; the 3 records dogfood the schema gate |

*The editorial deliverables are made machine-verifiable via structured JSON the test suite asserts over — but the underlying sourcing work is `autonomous: false`.*

---

## Validation Sign-Off

- [ ] Every build-failing gate has a passing happy-path test AND a negative fixture that proves the build fails
- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
