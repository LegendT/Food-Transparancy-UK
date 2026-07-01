---
phase: 02
slug: claim-typed-verification-per-fact-publication-gate-ingestion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node 24 built-in runner) |
| **Config file** | none — no config file; tests live in `test/*.test.mjs` |
| **Quick run command** | `node --test` |
| **Full suite command** | `npm test` (runs `node --test` + `npm run build` + `npm run a11y:all` as wired) |
| **Estimated runtime** | ~10 seconds (unit); a11y adds ~30s |

---

## Sampling Rate

- **After every task commit:** Run `node --test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds (unit)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | REQ-{XX} | T-{N}-01 / — | {expected secure behavior or "N/A"} | unit | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Populated during planning/Wave 0 once plan IDs exist.*

---

## Wave 0 Requirements

- [ ] `{test/verification.test.mjs}` — stubs for the derivation + gate requirements (VRFY-01/03/04)
- [ ] `{test/existence-check.test.mjs}` — stubs for the four-verdict checker (VRFY-07/08)
- [ ] `{test/ingestion.test.mjs}` — stubs for OFF lead ingestion (DATA-05/06, VRFY-10)

*node:test is already installed (Node 24 built-in) — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| {behavior} | REQ-{XX} | {reason} | {steps} |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
