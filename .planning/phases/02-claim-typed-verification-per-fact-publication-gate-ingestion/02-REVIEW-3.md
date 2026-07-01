# Phase 2 Review 3 - deep adversarial critique (post-secure/validate)

**Date:** 2026-07-01
**Trigger:** user asked for a deeper critique of the whole of Phase 2 after `/gsd:secure-phase 2` and `/gsd:validate-phase 2` both passed clean. Three parallel adversarial investigators (trust-model, network/SSRF, gate+data+render) ran crafted inputs against the real pure modules; every high-severity finding was re-verified by the orchestrator end-to-end before any change.

**Outcome:** 12 findings. 9 fixed with regression tests (3 of them genuinely new, missed by the five prior passes); 4 documented as by-design/accepted. Full suite 162 -> 175 pass; WCAG 4/4 URLs 0 errors; real corpus derived states unchanged (1 published-confirmed, 1 published-contested, 18 withheld-unverified).

The offline gate's core logic and the two published facts were independently confirmed **sound**: no accidental false-publish path was found, and spike-01's manufacturer (corroborable) and the Lucozade contested fact both genuinely meet their claimed bar.

## Fixed (with regression tests)

| # | Sev | Finding | Fix | Commit |
|---|-----|---------|-----|--------|
| C1 | CRITICAL | Trailing-dot FQDN (`localhost.`, `metadata.google.internal.`) bypassed the SSRF name block; Node's URL parser preserves the dot for named hosts and `localhost.` resolves to loopback. A cited source URL or a redirect Location could steer the build-time citation fetch to a loopback/metadata service. | `isBlockedHost` strips the root-label trailing dot before every comparison. | `5adfb07` |
| C2/R-31 | CRITICAL (structural) | The `sourcedValue` macro rendered `{{ fact.value }}` with no derived-state gate and already rendered `demoFact` (withheld-unverified) on two live pages. The single point the whole model could be defeated; Phase 2 had shipped `deriveVerificationState` but no barrier forcing its use. | Pure `factForRender` projection + `factState` Eleventy filter + gated macro (value only when publishable) + a `check-render-safety.mjs` prebuild gate forbidding raw `.value` renders. demoFact no longer leaks. | `52f1d58` |
| H1 | HIGH | `adjudication.outcome:"confirmed"` cleared a value divergence/contradiction without substituting or re-checking the value, publishing `fact.value` (e.g. 999) that no confirming pass read, as `published-confirmed`. Not caught by the gate. | Only `corrected` (with correctedValue) may resolve a value disagreement; `confirmed` still clears a pure measure mismatch or a lone disputes pass. | `c78e3ef` |
| M1 | MEDIUM | `meetsCorroborable`'s ">=1 primary" scanned all cited ids, decoupled from the two distinct lineage roots, so a primary co-derived into one secondary lineage satisfied it (violates D-05 "co-derived do not count as independent"). | The primary must be a lineage ORIGIN (`derivedFrom == null`). | `c78e3ef` |
| M2 | MEDIUM | `meetsAuthoritative` required >=2 distinct reviewerKind but not the same source; a re-read of a *different* source cannot catch a transcription error (defeats D-06). | Require a single source re-read by >=2 distinct reviewerKinds. No authoritative facts exist yet, so tightening is safe. | `c78e3ef` |
| M3 | MEDIUM | Metadata block-list omitted Alibaba (`100.100.100.200`), Oracle (`192.0.0.0/24`), RFC 6598 CGNAT (`100.64.0.0/10`). | Folded into `isBlockedIPv4`. | `5adfb07` |
| M4 | MEDIUM | Corpus-escape guard skipped `meta/allergens/site.json` by basename anywhere in the tree, so a fact-shaped file so named in a non-entity dir escaped both guard and validation. | Skip those names only at the top level of the data dir. | `e5d0a7a` |
| L1 | LOW | `checkValueDivergence`/`checkConfirmsContradictValue` used reference equality, so an array/object `checkedValue` was stuck in permanent disagreement (safe direction, but a real gap). | Structural `node:util.isDeepStrictEqual`. | `c78e3ef` |
| L2 | LOW | `corrected` with `correctedValue: null` published `value:null` as `published-confirmed` (a blank confirmed fact). | Corrected-to-null withholds (`withheld-in-review`). | `c78e3ef` |

## Documented as by-design / accepted (no code change)

| # | Finding | Disposition |
|---|---------|-------------|
| M5 | The committed `.cache/citation-verdicts.json` is the single load-bearing offline trust choke-point; a hand-edited RESOLVES forces publish. | **By design (D-07)** - committed, diffable, PR-reviewed. Fail-safe paths all hold (future-dated/malformed/absent/expired -> withhold or build-halt). It and the render point (now walled by C2) are the two irreducible choke-points a reviewer must guard. Would become CRITICAL only if the cache were ever machine-regenerated without review. |
| L3 | An author-set `verification.stalenessClass` override can suppress the review-due indicator on a stale regulatory fact. | **By design (D-16)** - the override precedence is intentional. An author-set escape hatch on a trust indicator; noted for awareness. Upgrade path: forbid downgrading a regulatory fact's staleness class. |
| L4 | `checkConfirmsContradictValue` is opt-outable by omitting `checkedValue` on a pass. | **By design** - the "auxiliary-optional" case (over-raising was the stated priority). `checkValueDivergence`/`checkMeasureMismatch` still catch the mixed case, so it cannot manufacture a false publish. |
| L6 | A dead link whose Wayback capture is itself a soft-404 page can mis-promote to RESOLVES (soft-404 heuristic not applied to snapshots). | **Accepted edge** of the durable-archival design. Low likelihood; a human sees the snapshotUrl. |
| L5 | `readJson` in the escape walk has no error handling; malformed JSON throws a raw stack trace. | **Accepted** - fail-safe (build halts non-zero). Ergonomic only. |

## Notes

- The external attack surface of Phase 2 is essentially just the SSRF guard (C1/M3, now hardened) and the render point (C2, now walled). The trust-model findings (H1/M1/M2/L1/L2) are "the gate does not catch this human authoring mistake" - still worth fixing because the two-pass model exists to catch error, but not reachable by an outside attacker.
- New reusable module: `lib/render-state.mjs` (pure, importable at build/render time, like `lib/verification.mjs`). Phase 3a builds its VRFY-11/12 visual treatments on top of `factForRender`, not around it.
- Phase 3a inherits a hard barrier: `check-render-safety.mjs` fails the build on any raw `.value` render, and `test/render-state.test.js` pins that a withheld/contested value never crosses the boundary (the R-31 test the earlier handoff flagged as missing is now present).
