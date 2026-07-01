---
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
plan: 05
subsystem: verification
tags: [citation-existence, ssrf, four-verdict, wayback-cdx, crossref, doi, native-fetch, node-test]

# Dependency graph
requires:
  - phase: 02-01
    provides: "the citation-verdict cache SEAM format ({ verdict, resolvedVia, checkedAt, statusCode, snapshotUrl }) documented in test/fixtures/valid/citation-verdicts.sample.json"
provides:
  - "lib/citation-status.mjs: pure four-verdict classifier + SSRF host guard + DOI-slash normaliser + closest-snapshot picker + soft-404 heuristic"
  - "scripts/check-citations.mjs: standalone network existence checker writing .cache/citation-verdicts.json"
  - "the resolves-verdict cache the per-fact gate (02-03) and the audit (02-06) read to enforce VRFY-07"
affects: [02-03, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PURE-decision / IO-shell split: classifier + guards in lib/*.mjs (unit-tested offline), fetch escalation in scripts/*.mjs"
    - "Manual redirect following with per-hop SSRF revalidation (redirect: manual, cap 5)"
    - "Byte-capped body reads by streaming res.body and aborting past a 512 KB ceiling"

key-files:
  created:
    - "lib/citation-status.mjs"
    - "scripts/check-citations.mjs"
    - "test/citation-status.test.js"
  modified: []

key-decisions:
  - "classifyStatus checks the errorClass axis before the status axis; only nxdomain/refused are affirmative non-existence, every other throw is INDETERMINATE (R-21)"
  - "isBlockedHost canonicalises the host to bytes across all IPv4 (dotted/decimal/octal/hex, inet_aton 1-4 parts) and IPv6 (:: compression, IPv4-mapped) encodings and CIDR-tests membership, rather than string-matching"
  - "DOI detection reads a source id or url starting 10. or a doi.org/dx.doi.org url; both registrars are queried with the slash intact"
  - "Wayback fallback uses the CDX server with sort=closest plus a client-side closest-200 pick; a 429/5xx from Wayback itself is INDETERMINATE, never DOES_NOT_RESOLVE"
  - "check:citations was already present in package.json and deliberately left OUT of prebuild; no package.json change was needed"

patterns-established:
  - "Pattern: four-verdict RESOLVES / DOES_NOT_RESOLVE / ACCESS_BLOCKED / INDETERMINATE table-driven classification, no regex"
  - "Pattern: SSRF host guard applied to the initial URL and re-applied to every redirect hop via assertPublicHttpsUrl -> isBlockedHost"
  - "Pattern: a non-RESOLVES verdict never satisfies the gate (D-11 no auto-pass); the checker records only resolves-verdicts, never a value or a pass"

requirements-completed: [VRFY-07]

# Metrics
duration: 6min
completed: 2026-07-01
---

# Phase 2 Plan 05: Four-Verdict Citation-Existence Checker Summary

**A pure D-07 status/error classifier and SSRF host guard (lib/citation-status.mjs) plus a standalone, manual-redirect, byte-capped network checker (scripts/check-citations.mjs) that writes a diffable resolves-verdict cache for the per-fact gate, with zero new dependencies.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-01T10:14:20Z
- **Completed:** 2026-07-01T10:20:04Z
- **Tasks:** 2
- **Files modified:** 3 (all created)

## Accomplishments
- Pure, exhaustively unit-tested four-verdict classifier: 404/410/NXDOMAIN/hard-refused are the only affirmative non-existence; 401/403/407/429/451/999 map to ACCESS_BLOCKED (the SPIKE-01 false-block guard); transient/TLS/timeout throws map to INDETERMINATE (R-21).
- SSRF host guard that canonicalises the host across every IPv4 encoding (dotted, decimal 2130706433, hex 0x7f000001, octal 0177.0.0.1, inet_aton 1-4 parts) and every IPv6 form (::1, ::, fe80::/10 link-local, fc00::/7 ULA, IPv4-mapped ::ffff:169.254.169.254) plus the cloud metadata hostnames, then CIDR-tests private/loopback/link-local membership (R-01/R-11).
- Standalone network script performing the HEAD -> GET Range -> Wayback CDX -> Crossref/Handle escalation with manual redirects re-guarded per hop (cap 5), a 512 KB streamed byte ceiling on every read path, the DOI slash kept intact, and a durable Wayback snapshotUrl persisted for editor follow-up (R-10/R-19/R-23).
- The checker records only resolves-verdicts, never a value or a pass (D-11), and is absent from the offline prebuild chain; the gate reads its committed cache.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): failing tests for the pure helpers** - `b93b5e6` (test)
2. **Task 1 (GREEN): implement lib/citation-status.mjs** - `b9dcd12` (feat)
3. **Task 2: standalone check-citations.mjs network script** - `c2afe86` (feat)

**Plan metadata:** (this docs commit)

_Note: Task 1 is a TDD task, hence the test -> feat pair._

## Files Created/Modified
- `lib/citation-status.mjs` - Pure helpers: `classifyStatus`, `isBlockedHost`, `assertPublicHttpsUrl`, `normaliseDoiForApi`, `pickClosestSnapshot`, `isSoftNotFound`. No fs, no fetch, no clock.
- `scripts/check-citations.mjs` - Network existence checker: manual-redirect SSRF-safe escalation, byte-capped reads, verdict cache writer keyed by source id in the 02-01 SEAM format. Never in prebuild.
- `test/citation-status.test.js` - Table-driven node:test proof of the D-07 mapping, the extended errorClasses, the SSRF host table across all encodings, the DOI-slash normaliser, the closest-snapshot picker and the soft-404 heuristic. 16 cases.

## Decisions Made
- Checked the `errorClass` axis before the status axis inside `classifyStatus`, because a thrown fetch error carries no HTTP status; a defined-but-unknown errorClass falls through to INDETERMINATE so a novel throw is never scored dead.
- Combined IPv4 parts with multiplication rather than bit shifts, because the single-part 32-bit form (up to 4294967295) exceeds JS signed-int bit-operator range.
- Scoped `isSoftNotFound` to the GET path only (per the interfaces), so a HEAD 200 is trusted as RESOLVES and the soft-404 downgrade fires only when a body was actually read on the 403/405/429 GET Range retry.
- Wayback CDX query uses `sort=closest&closest={ts}` over a 25-row window plus a client-side `pickClosestSnapshot`, belt-and-braces against the R-20 "bare limit=1 returns the oldest" pitfall.

## Deviations from Plan

None - plan executed exactly as written. `package.json` already carried the `check:citations` script (added earlier in the phase) and was correctly excluded from `prebuild`, so no package.json edit was required.

## Issues Encountered
None. RED confirmed the missing module; GREEN passed all 16 new cases; the full suite is green at 111 tests.

## User Setup Required
None - no external service configuration required. The checker uses Node 24 native fetch against public REST endpoints; the Crossref contact mailto (legendarytone@gmail.com) is a politeness header, not a secret. The network script is run manually and its `.cache/citation-verdicts.json` is committed; running it here was deliberately skipped to avoid a live network dependency during execution.

## Next Phase Readiness
- The resolves-verdict cache format is now produced by a real checker for the 02-03 gate and the 02-06 audit to consume.
- Blocker/none: `.cache/citation-verdicts.json` is written only when the network script is run; until an editor runs `npm run check:citations` and commits the output, every cited citation is treated as UNCHECKED (withheld) by the gate, which is the correct continuous-safety default (R-07).

---
*Phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion*
*Completed: 2026-07-01*
