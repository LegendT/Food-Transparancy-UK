---
phase: 2
slug: claim-typed-verification-per-fact-publication-gate-ingestion
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-01
---

# Phase 2 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time across all seven plans (02-01..02-07); this document verifies each declared mitigation exists in the implementation.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| editor → repo JSON | Author-supplied schema/fixture content enters the validated corpus via git | Fact values, sources, passes, adjudication verdicts |
| repo JSON → gate logic | Structurally valid (Ajv ran first) but semantically untrusted corpus drives publish/withhold | Claim type, lineage, measures, values |
| cached verdict → gate logic | A committed existence verdict may be stale (its host later died); the gate must not fail open | Citation RESOLVES/blocked verdicts + timestamps |
| OFF API → repo | Untrusted external JSON enters the repo as isolated draft leads | Off-corpus product fields (no `sources`) |
| build tooling → network | Server-side outbound fetch to a fixed external host (OFF ingestion) | HTTPS request/response to `world.openfoodfacts.org` |
| editor source URL → outbound request | The citation checker turns trusted-today source URLs and every redirect hop into server-side fetches | HTTPS requests to arbitrary editor-supplied hosts + redirect targets |
| external hosts → build tooling | Untrusted HTTP responses (status, headers, body) drive the four-verdict classifier | Status codes, headers, streamed body |
| corpus + verdict cache → audit report | Read-only derivation into a human triage document under `docs/` | Derived states, staleness/rot queues |
| editor → published corpus | Author-supplied verification passes and adjudication verdicts; only a human at the 02-07 blocking checkpoint may author them | Pass verdicts, contested adjudications |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation (evidence) | Status |
|-----------|----------|-----------|-------------|-----------------------|--------|
| T-02-01-01 | Tampering | Author-set publicationStatus/verificationStatus | mitigate | `enum:[null]` at SourcedValue (`schemas/sourced-value.schema.json:158-165`) + all five entity schemas; state derived every build (`lib/verification.mjs:210`). Test: `test/verification-schema.test.js` | closed |
| T-02-01-02 | Spoofing | Draft/lead masquerading as a fact under src/_data | mitigate | `lead.schema.json` `additionalProperties:false`, no `sources` key; corpus-escape keys on a `sources` array (`validate-data.mjs:153-160`). Test: `test/corpus-gate.test.js:357` | closed |
| T-02-02-01 | Elevation of Privilege | Fact deriving to published-confirmed below its claim standard | mitigate | `meetsCorroborable`/`meetsAuthoritative` count confirms passes + distinct lineage roots, never `sources.length` (`lib/verification.mjs:145-159`). Test: `test/verification.test.js` | closed |
| T-02-02-02 | Denial of Service | ReDoS in eTLD+1 / measure parsing | mitigate | `URL()` parse + `Set` suffix lookup (`lib/verification.mjs:321-338`); table-driven measure compare (85-91); no backtracking regex | closed |
| T-02-02-03 | Tampering | derivedFrom cycle faking two lineages | mitigate | Cycle detection canonicalises root to lexicographically-minimal id over cycle members (`lib/verification.mjs:62-81`). Test: `test/verification.test.js` | closed |
| T-02-02-04 | Spoofing | Since-dead citation publishing on a stale cached RESOLVES | mitigate | `CITATION_TTL_DAYS=180` (`lib/verification.mjs:16`); aged RESOLVES → UNCHECKED → withheld (48-52, enforced 243). Test: `test/verification.test.js:144` | closed |
| T-02-03-01 | Elevation of Privilege | Fact reaching published without a resolving citation or sufficient passes | mitigate | Gate reads verdict cache offline; non-fresh/uncached/expired → `withheld-unverified` (`validate-data.mjs:262-263`) | closed |
| T-02-03-02 | Tampering | Network reached during the deterministic build | mitigate | `validate-data.mjs` imports only validate/referential/verification — no `fetch`, no checker; cache via `readJson` only (17-31, 262) | closed |
| T-02-03-03 | Spoofing | Draft/lead under src/_data rendering unverified | mitigate | Corpus-escape guard fails any `sources`-shaped file outside entity dirs (`validate-data.mjs:161-177`). Test: `test/corpus-gate.test.js:65,80,357` | closed |
| T-02-03-04 | Denial of Service | One bad fact failing the whole build | mitigate | Lineage/measure/value-divergence are per-fact WITHHOLD reasons, reported not build-failed (`validate-data.mjs:344-367`, R-02) | closed |
| T-02-03-05 | Tampering | Dangling derivedFrom faking a lineage root | mitigate | Build-FAILING referential check: every non-null `derivedFrom` must resolve (`validate-data.mjs:330-336`). Test: `test/corpus-gate.test.js:309` | closed |
| T-02-04-01 | Tampering | Untrusted OFF data promoted as authority | mitigate | Leads in `ingestion/leads/` outside the gate walk (`ingest-off.mjs:5-13,33`); promotion is human; OFF (tertiary) cannot alone meet corroborable; records `off` id for ODbL (126) | closed |
| T-02-04-02 | Information Disclosure | SSRF via a malformed barcode/host | mitigate | `assertOffUrl` narrows host to `world.openfoodfacts.org` (`ingest-off.mjs:166-172`); barcode `encodeURIComponent`'d (176); per-hop re-guard cap 5 (184-199). Test: `test/ingest-off.test.js` | closed |
| T-02-04-03 | Denial of Service | Oversized/decompression-bombed OFF response | mitigate | `AbortSignal.timeout(8000)` + 512 KB `readCapped` before `JSON.parse` (`ingest-off.mjs:39-40,141-160,208`); field-select query; 700ms gap | closed |
| T-02-04-04 | Tampering | Malicious OFF text interpolated into code | mitigate | Fields stored as data only, never eval'd (`ingest-off.mjs:109-137`); `lead.schema.json` `additionalProperties:false`. Test: `test/ingest-off.test.js:45` | closed |
| T-02-05-01 | Information Disclosure / EoP | SSRF via crafted source URL or redirect to an internal host | mitigate | `redirect:"manual"` + per-hop `assertPublicHttpsUrl`+`isBlockedHost`, cap 5, https-only (`check-citations.mjs:173-207`); `isBlockedHost` canonicalises all IPv4/IPv6 + metadata names (`citation-status.mjs:184-221`). Test: `test/citation-status.test.js:79-132` | closed |
| T-02-05-02 | Denial of Service | Oversized/slow response, redirect loop, decompression bomb | mitigate | `AbortSignal.timeout(8000)`, redirect cap 5, 512 KB `readCapped` aborting on every body path incl. redirect-hop `body.cancel()` (`check-citations.mjs:50-53,141-157,200`); Range not relied on | closed |
| T-02-05-03 | Spoofing | Live-but-refused / transient / soft-404 mis-scored as dead | mitigate | `classifyStatus` maps refusals→ACCESS_BLOCKED, transient/TLS/timeout→INDETERMINATE (`citation-status.mjs:44-59`); soft-404 200/206→INDETERMINATE (311-317); Wayback fallback | closed |
| T-02-05-04 | Tampering | Cache poisoning of the verdict cache | mitigate | Cache committed, sorted keys for reviewable diff (`check-citations.mjs:458-462`); gate re-derives from it | closed |
| T-02-05-05 | Elevation of Privilege | Automated existence-RESOLVES treated as a verification pass | mitigate | Script records only resolves-verdicts, never a value or pass (`check-citations.mjs:211-219,475-476`) | closed |
| T-02-06-01 | Elevation of Privilege | Audit silently amending a value / writing a verdict | mitigate | Read-only: writes only under `docs/` (`audit-verification.mjs:377-379`); R-30/R-09 are listings only. Test: `test/audit.test.js:225` (src/_data unchanged) | closed |
| T-02-06-02 | Repudiation | Undated / non-worst-first audit hiding overdue facts | mitigate | Dated (`audit-verification.mjs:139`), worst-first (127-187); rot + citation-staleness queues (189-230). Test: `test/audit.test.js:123` | closed |
| T-02-06-03 | Denial of Service | Zero-fact false-green audit | mitigate | Non-zero-fact assertion (`audit-verification.mjs:368-371`). Test: `test/audit.test.js:218` | closed |
| T-02-06-04 | Repudiation | Future-dated pass reading as permanently fresh | mitigate | Data-warnings section surfaces any pass after today (`audit-verification.mjs:232-254`). Test: `test/audit.test.js:174` | closed |
| T-02-07-01 | Elevation of Privilege | An AI fabricating passes to force a weak fact to publish | mitigate | Passes human-authored at the 02-07 blocking checkpoint; weak historic facts left withheld; contested value withheld via build-FAILING check (`validate-data.mjs:294-298`) | closed |
| T-02-07-02 | Repudiation / Tampering | An AI writing an adjudication outcome | mitigate | Contested requires ≥2 `contested.positions` (build-fail, `validate-data.mjs:286-290`), value null (294-298); schema `minItems:2` | closed |
| T-02-07-03 | Tampering | A seeded cache verdict masking a non-resolving citation | mitigate | Seeded RESOLVES carry fresh `checkedAt` within 180-day TTL, committed as a visible diff; the real network check overwrites | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-SC | T-02-01-SC .. T-02-07-SC | Supply-chain tampering via package installs. Phase 2 added **zero runtime dependencies** — the only `package.json` change added three script lines (`check:citations`, `ingest:off`, `audit`); `dependencies` remains `@11ty/eleventy` only; all network I/O uses native `fetch`. No install checkpoint applies. | LegendT (editor) | 2026-07-01 |
| AR-02-DNS | T-02-05-01 (residual) | DNS-rebinding against the citation checker's curated source list is a documented accepted residual for a build-time tool: per-hop host revalidation defends the initial resolution, but a TOCTOU rebind between check and connect is out of scope for a manually-run, diff-reviewed tool. | LegendT (editor) | 2026-07-01 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-01 | 34 | 34 | 0 | gsd-security-auditor (opus), verify-mitigations mode |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-01
