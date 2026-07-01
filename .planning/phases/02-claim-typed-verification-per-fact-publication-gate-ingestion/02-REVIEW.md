---
phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion
reviewed: 2026-07-01T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - lib/verification.mjs
  - lib/citation-status.mjs
  - lib/referential.mjs
  - scripts/check-citations.mjs
  - scripts/validate-data.mjs
  - scripts/ingest-off.mjs
  - scripts/audit-verification.mjs
  - schemas/sourced-value.schema.json
  - schemas/source.schema.json
  - schemas/lead.schema.json
  - src/_data/timeline/spike-lucozade-2017-sugar-cut.json
  - test/verification.test.js
findings:
  critical: 1
  warning: 2
  info: 3
  total: 6
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-07-01T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The trust layer is, on the whole, carefully built. I traced the D-15 precedence
machine and confirmed the core publish gate is sound in the ordinary cases: the
existence precondition (step 3) provably runs before sufficiency, every
`published-*` outcome requires >=2 confirming passes each with a non-empty
`sourcesChecked` (schema `minItems: 1`) all of which must be a *fresh* RESOLVES,
the TTL boundary is inclusive and matches the audit's `> TTL` due-check exactly,
`markedWrong` wins over everything, and the "AI never adjudicates" invariant
holds - no autonomous path writes a fact value, adjudication or verification
pass (the checker writes only `.cache/citation-verdicts.json`, the audit writes
only under `docs/`, ingestion only under `ingestion/leads/`). The SSRF host guard
in `citation-status.mjs` is genuinely strong: inet_aton IPv4 parsing, IPv6 with
`::` compression and IPv4-mapped tails, cloud-metadata names, and per-hop
re-validation in the manual-redirect loop all check out.

One correctness defect breaks a stated core-trust invariant: the lineage
canonicalisation does **not** collapse a source that derives *into* a
`derivedFrom` cycle, which under gate-permitted (uncaught) cyclic data lets two
co-derived sources count as two distinct lineages and **fake corroboration** -
publishing a corroborable fact that should be withheld. That is the headline
finding. Two Warnings and three Info items follow.

## Structural Findings (fallow)

No structural pre-pass payload was provided with this review.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `lineageRoot` mis-canonicalises a tail feeding into a `derivedFrom` cycle, faking corroboration

**File:** `lib/verification.mjs:50-62`

**Issue:** When resolving a lineage root, a detected cycle is canonicalised to
the lexicographically minimal id of `[...seen, current, parent]` - but `seen`
includes the **non-cyclic tail nodes** that precede the cycle, not just the cycle
members. If a source's id sorts below every member of the cycle it derives into,
that source resolves to *itself* as its root instead of to the cycle's canonical
root, so two genuinely co-derived sources are counted as two distinct lineages.

Concrete failure (all pointers resolve, so the `validate-data.mjs:313-319`
dangling-`derivedFrom` gate passes - cycles are **not** rejected):

```
sources:
  a-tail  derivedFrom: b-node
  b-node  derivedFrom: c-node
  c-node  derivedFrom: b-node   # b-node <-> c-node is a cycle; a-tail feeds into it
```

- `lineageRoot("b-node")` -> cycle {b-node, c-node} -> `"b-node"`
- `lineageRoot("a-tail")` -> `["a-tail","b-node","c-node","b-node"].min` -> `"a-tail"`  (because `"a-tail" < "b-node"`)

A corroborable fact citing `["a-tail","b-node"]` with two confirming passes (one
over a `primary` source) now yields `roots = {"a-tail","b-node"}`, size 2, so
`meetsCorroborable` (line 109-115) returns `true` and `deriveVerificationState`
publishes it `published-confirmed`. `a-tail` is transitively co-derived from
`b-node`; they are ONE lineage. This is precisely the "two co-derived sources
must never count as two" guarantee the corroborable standard rests on. The
existing cyclic test (`test/verification.test.js:407-424`) only exercises a pure
2-cycle (which collapses correctly), so the tail-into-cycle case is unguarded.

**Fix:** Restrict the canonical set to the actual cycle members - the slice of
`seen` from where `parent` first appears, plus `current` - never the whole
prefix. Also handle the self-loop (`parent === current`) as a one-member cycle:

```js
function lineageRoot(id, sourcesById) {
  const seen = [];
  let current = id;
  while (true) {
    const parent = sourcesById.get(current)?.derivedFrom;
    if (parent === undefined || parent === null) return current;
    if (parent === current) return current; // self-loop: cycle is {current}
    const idx = seen.indexOf(parent);
    if (idx !== -1) {
      // cycle members only: seen[idx..] plus current (parent closes the loop)
      return [...seen.slice(idx), current].reduce((min, x) => (x < min ? x : min));
    }
    seen.push(current);
    current = parent;
  }
}
```

With the fix, `lineageRoot("a-tail")` -> cycle {b-node, c-node} -> `"b-node"`,
matching `lineageRoot("b-node")`, so the pair collapses to one lineage and the
fact is correctly withheld. Add a fixture/test for a tail feeding a cycle whose
tail id sorts below the cycle minimum.

## Warnings

### WR-01: a soft-404 that answers `HEAD` with `200` is scored RESOLVES (dead source published as live)

**File:** `scripts/check-citations.mjs:335-371`, `lib/citation-status.mjs:289-295`

**Issue:** `isSoftNotFound` is only ever consulted on the GET-Range retry path,
which is reached solely when the initial `HEAD` returned `403/405/429`
(`check-citations.mjs:350-362`). A host that serves a removed page as a
soft-404 with HTTP `200` on `HEAD` takes the `else` branch at line 356-357
(`verdict = classifyStatus(200)` -> `RESOLVES`) and returns
`entry("RESOLVES", "live", ...)` at line 371 without any body inspection. The
gate then treats the citation as a fresh RESOLVES and publishes the fact, even
though the cited page no longer exists. This is exactly the "dead source scored
live -> false RESOLVES" failure the four-verdict model exists to prevent; it just
survives on the HEAD-200 path because a `HEAD` carries no body to test.

**Fix:** On a `HEAD` `200`, issue one cheap `GET` with `range: "bytes=0-0"`
(as the refusal path already does), read the byte-capped body, and downgrade to
`INDETERMINATE` when `isSoftNotFound(200, body)` fires - or, if the HEAD-first
economy is a conscious tradeoff, document it explicitly as an accepted residual
alongside the DNS-rebinding note in the `citation-status.mjs` header so a future
maintainer knows soft-404s are only caught on the refusal path.

### WR-02: `ingest-off` follows redirects with default `fetch`, escaping its stated host constraint (SSRF residual)

**File:** `scripts/ingest-off.mjs:158-162`

**Issue:** The header claims "the fetch host is CONSTRAINED to
https://world.openfoodfacts.org ... SSRF", and the code guards the *initial* URL
with a `startsWith(OFF_HOST)` prefix check (line 155). But the `fetch` call uses
Node's default `redirect: "follow"`, so if `world.openfoodfacts.org` returns a
3xx to, say, `http://169.254.169.254/…`, undici follows it (up to 20 hops) to an
arbitrary host - including private/link-local ranges - with no per-hop re-guard
and no https enforcement. `check-citations.mjs` went to great lengths to close
exactly this hole with a manual-redirect loop and per-hop `assertPublicHttpsUrl`;
`ingest-off` does not, so the stated posture over-claims. Lower likelihood than
CR-01 (it needs the trusted OFF host to be compromised or to issue an unexpected
redirect), but it is a genuine, inconsistent gap in a network-facing tool.

**Fix:** Set `redirect: "manual"` (or `"error"`) and re-run the host/scheme guard
on any `Location` before following, mirroring `check-citations.mjs:156-189`; or
at minimum reuse `assertPublicHttpsUrl` from `citation-status.mjs` instead of the
bare `startsWith` check so IP-encoding and scheme are validated on the one hop.

## Info

### IN-01: `addMonths` day-overflow can shift the staleness threshold by a few days

**File:** `lib/verification.mjs:21-24`, used by `isPastStaleness:158`

**Issue:** `new Date(Date.UTC(y, m - 1 + delta, d))` overflows when day `d`
does not exist in the target month - e.g. `today = 2026-03-31`, `delta = -1`
yields `Date.UTC(2026, 1, 31)` = 3 March, so the "12/24 months ago" threshold
lands a couple of days off. The blast radius is small: past-staleness still
*publishes* (`published-stale`), so this only mislabels a fact as stale vs
current near a month boundary, never causes a wrong withhold or wrong publish.

**Fix:** Clamp the day to the target month's last day, or compute the threshold
by comparing year-month first, then day. Low priority given the publish outcome
is unchanged.

### IN-02: dead no-op branch in `nutrimentFields`

**File:** `scripts/ingest-off.mjs:86`

**Issue:** `if (!servingConfirmed && dataPer) measure.state = "as-sold";` reassigns
`state` to the value it was already initialised with on line 85, so the whole
conditional is a no-op. It reads as if it intends to do something (the comment
even says "basis stays per-serving; suffix wins") but changes nothing.

**Fix:** Remove the dead line, or implement the intended state adjustment if one
was meant. Leads are not facts, so no correctness impact.

### IN-03: `sources.json` is read and parsed twice in the audit's `main`

**File:** `scripts/audit-verification.mjs:351-353`

**Issue:** `readJson(sourcesPath)` is called twice in the same ternary
(`Array.isArray(readJson(sourcesPath).sources) ? readJson(sourcesPath).sources : []`),
parsing the file a second time only to read the same property. Harmless but wasteful
and slightly obscures intent.

**Fix:** Read once into a local: `const wrapper = readJson(sourcesPath); const
sourceRecords = Array.isArray(wrapper.sources) ? wrapper.sources : [];`

---

_Reviewed: 2026-07-01T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
