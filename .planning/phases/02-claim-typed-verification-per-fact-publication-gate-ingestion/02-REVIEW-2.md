# Phase 02: Independent Second-Opinion Review

**Reviewed:** 2026-07-01
**Scope:** lib/verification.mjs, lib/citation-status.mjs, scripts/check-citations.mjs, scripts/validate-data.mjs, scripts/ingest-off.mjs, scripts/audit-verification.mjs, schemas/{sourced-value,source,lead}.schema.json, src/_data/products/spike-01.json, src/_data/products/spike-03.json, src/_data/timeline/spike-lucozade-2017-sugar-cut.json, test/verification.test.js
**Test suite:** 141/141 green (confirmed by re-running `npm test`)

This is a second-opinion pass following a prior review + three landed fixes (commit 3e91ea4). It does not repeat findings already fixed. All findings below were independently verified against the code (traced by hand and/or reproduced with small standalone scripts against the real `lib/` modules), not inferred from comments.

## Verification of the three recent fixes

All three verified correct:

1. **`lineageRoot` cycle canonicalisation (verification.mjs:57-76).** Traced tail-into-cycle (a→b→c→b), pure 3-cycle, 2-cycle (a↔b), and mid-chain-derivedFrom (e→c where a→b→c→d) topologies by hand, plus ran the shipped `CR-01` test. The `[...seen.slice(idx), current]` reduction correctly excludes the non-cyclic tail and both a tail node and a cycle-member node resolve to the same canonical root. Termination is guaranteed regardless of shape: `seen` cannot exceed the registry's node count before a repeat is found (the graph is a single-successor functional graph, so revisiting any node is detected on the first return to it).
2. **`check-citations.mjs` WR-01 GET-Range soft-404 downgrade (lines 349-362).** Confirmed a 206 (`get.status !== 200`) or a thrown fetch error (`get.status` undefined) can never flip `verdict` away from `RESOLVES`, since the downgrade only fires inside `if (get.status === 200)`. Confirmed `head.finalUrl` used for the GET retry was itself produced by `probe()`'s own per-hop `assertPublicHttpsUrl` revalidation, so no new SSRF surface is introduced by reusing it.
3. **`ingest-off.mjs` WR-02 manual redirect + `assertOffUrl` (lines 165-198).** Confirmed every hop, including the first, is re-validated (`assertOffUrl` throws on any hostname other than exactly `world.openfoodfacts.org`), the `for (hop = 0; hop <= MAX_REDIRECTS; hop++)` loop is bounded and cannot infinite-loop even on a redirect cycle, and the post-loop check correctly detects and errors on cap-exceeded rather than silently accepting a stale redirect response.

## Findings

### BLOCKER-01: `web.archive.org` in `BOT_HOSTILE` makes a source whose own URL is already a Wayback snapshot link permanently unresolvable

**File:** `scripts/check-citations.mjs:58-64` (`BOT_HOSTILE`), `:317-321` (`isBotHostile`), `:333` and `:273-307` (`waybackFallback`)

`BOT_HOSTILE` includes `"web.archive.org"`. `checkCitation` routes ANY source whose `url` host is `web.archive.org` straight to `waybackFallback(url, source, "ACCESS_BLOCKED", null)` without ever attempting a direct probe of it:

```js
if (isBotHostile(url)) return await waybackFallback(url, source, "ACCESS_BLOCKED", null);
```

`waybackFallback` then queries the Wayback CDX API using **that same URL** as the target to search for snapshots of:

```js
const cdx = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}` + ...
```

If `url` is itself a `web.archive.org/web/<timestamp>/<original>` snapshot link, this asks Wayback "find me captures of this Wayback page", which structurally can never return the intended result. `pickClosestSnapshot` returns `null`, and the function falls through to:

```js
return entry(originVerdict, "live", originStatus, null); // ACCESS_BLOCKED, forever
```

So **any citation whose registry `url` is a direct Wayback snapshot link can never reach `RESOLVES`** — it is permanently scored `ACCESS_BLOCKED`, regardless of whether the snapshot is live and fetchable.

This is not a hypothetical: `src/_data/sources.json` already contains exactly this pattern —

```json
{
  "id": "walls-archive-2026",
  "url": "http://web.archive.org/web/20260121211831/https://www.wallsicecream.com/uk/p/wall%27s-soft-scoop-vanilla-1800ml.html",
  "sourceType": "primary",
  ...
}
```

— and it is cited as the primary source for `nutrition.sugars` in `src/_data/products/spike-03.json:28`. If `npm run check:citations` is ever run against the current data, this citation will be cached as `ACCESS_BLOCKED` forever, and the `nutrition.sugars` fact can never satisfy the existence precondition no matter how many valid confirms passes are recorded. This is exactly the workflow the code's own `editorialFollowUps` message recommends editors adopt ("add the Wayback snapshot to sources.json as a durable archival source", R-19) — the durable archival citation the tool tells editors to create is one the same tool can never verify.

Per D-07, "a valid Wayback `200` snapshot" is explicitly defined as satisfying `RESOLVES`; this implementation makes that case for a directly-cited snapshot URL unreachable, contradicting the spec.

**Fix:** don't route a URL whose host is `web.archive.org` through the bot-hostile short-circuit — probe it directly like any other host (D-10 already establishes archive.org is reachable from server-side Node tooling; the CDX detour is only meaningful as a *fallback* for a citation whose canonical URL is some *other* origin). E.g.:

```js
function isBotHostile(url) {
  const host = hostOf(url);
  if (!host || host === "web.archive.org") return false; // never route archive.org to itself
  return [...BOT_HOSTILE].some((domain) => host === domain || host.endsWith(`.${domain}`));
}
```

(`web.archive.org` can stay in the set for the *fallback destination* logic if that's used elsewhere, but a source's own citation URL should never be short-circuited into a self-referential CDX query.)

---

### WARNING-01: `contested.positions[].sources` is invisible to both referential validation and the citation-existence corpus scan

**Files:** `lib/referential.mjs:63-74` (`checkReferences`), `scripts/check-citations.mjs:84-99` (`citedSourceIds`), `lib/verification.mjs:198-211` (contested branch)

`checkReferences` (DATA-01, the "every cited source id must resolve to a registry record" gate) walks only `fact.sources`:

```js
for (const { path, fact } of facts) {
  for (const id of fact.sources) { ... }
}
```

It never inspects `fact.verification.contested.positions[].sources`. Reproduced directly:

```js
const fact = {
  sources: ["known-a", "known-b"], claimType: "corroborable",
  verification: { adjudication: { outcome: "contested", ... },
    contested: { positions: [
      { sources: ["known-a"], ... },
      { sources: ["totally-bogus-id-not-in-registry"], ... }
    ]}}
};
checkReferences([{ path: "/x", fact }], [{ id: "known-a" }, { id: "known-b" }]).errors;
// => [] (no error — a fabricated/dangling source id in a contested position passes DATA-01 undetected)
```

Separately, `check-citations.mjs`'s `citedSourceIds()` — the function that decides which source ids get an existence check run and cached — also walks only `fact.sources` (via `collectFacts`). It never sees `contested.positions[].sources`. Consequence: any position source id that is **not also duplicated into `fact.sources[]`** never receives a cached existence verdict, so `deriveVerificationState`'s contested branch (`isFreshResolves(existenceBySourceId.get(id), today)`) can never see a fresh `RESOLVES` for it and the fact can never reach `published-contested` — it is permanently stuck at `withheld-unverified`, even when the human has correctly adjudicated it `contested` and both positions cite perfectly good, resolvable sources.

The one worked example in the repo (`src/_data/timeline/spike-lucozade-2017-sugar-cut.json`) happens to avoid this because its two position source ids (`lucozade-grocer-2017`, `diabetes-couk-2017`) are also listed in the fact's own `sources[]` — but this is an unenforced, undocumented coincidence, not a guaranteed invariant, and `test/verification.test.js`'s contested tests (lines 100-139) also always construct positions whose sources are a subset of `fact.sources`, so this gap has no test coverage in either direction.

Net effect (fail-safe direction preserved, so not a publish-when-shouldn't-have bug, but a genuine correctness/data-integrity gap):
- A fabricated or typo'd source id inside a `contested` position passes the build gate silently.
- A legitimately-sourced contested fact whose position sources aren't duplicated at the top level can never publish as `published-contested`, quietly defeating the "genuine disagreements shown honestly, both sides" feature the project states as a core value.

**Fix:** extend `checkReferences` to also validate `fact.verification?.contested?.positions?.flatMap(p => p.sources)` against the registry, and extend `citedSourceIds()` in `check-citations.mjs` to also collect those ids into the existence-check corpus.

---

### WARNING-02: unconsumed response bodies in the manual-redirect probe loops

**Files:** `scripts/check-citations.mjs:156-189` (`probe`), `:354-381` (`checkCitation`'s GET-range retries), `scripts/ingest-off.mjs:165-198` (`fetchOffProduct`)

In `probe()`, every intermediate redirect hop does:

```js
res = await fetch(parsed, { method, redirect: "manual", ... });
const location = res.headers.get("location");
if (res.status >= 300 && res.status < 400 && location) {
  current = new URL(location, parsed).toString();
  continue; // res.body is never read or cancelled before the next fetch
}
```

The same pattern exists in `ingest-off.mjs`'s `fetchOffProduct` loop. For `GET` requests specifically (used throughout `ingest-off.mjs`, and used for the soft-404/403-retry paths in `check-citations.mjs`), a 3xx response commonly carries a small body that is never drained or cancelled. Additionally, in `checkCitation`'s two GET-Range retry sites (lines 354-381), when `get.status` is not `200` (e.g. a `206`, a `403`, or a `5xx`), `get.res`'s body is never consumed or cancelled at all before the function returns.

Low real-world impact for a short-lived, sequential (~1-2 req/s, `sleep`-gapped) build/audit script that exits shortly after, but it's a genuine robustness gap: unconsumed fetch/undici response bodies are a documented resource-leak pattern (they can hold connections open until GC). Worth a `res.body?.cancel()` (or a drain) on every path that doesn't otherwise read the body before moving on.

---

### INFO-01: `isSoftNotFound`'s 512-byte floor can downgrade a genuinely small `RESOLVES` to `INDETERMINATE`

**File:** `lib/citation-status.mjs:282-295`

```js
const SOFT_404_MIN_BYTES = 512;
export function isSoftNotFound(status, bodyText) {
  if (status !== 200) return false;
  const text = typeof bodyText === "string" ? bodyText.trim() : "";
  if (text.length < SOFT_404_MIN_BYTES) return true;
  ...
}
```

Any genuine 200 response whose body is legitimately under 512 bytes (a minimal JSON API response, a tiny plaintext resource, a redirect-stub landing page that is nonetheless the intended citation target) is unconditionally treated as a soft-404 and downgraded to `INDETERMINATE`, never `RESOLVES`. This is called out in the module's own comments as an intentional "safe over-raise" (a false positive routes to a human, never a silent dead link), so it's a documented tradeoff rather than an oversight — flagging it because the practical exposure (any small-but-real page, not just not-found pages) is broader than "soft-404" framing suggests, and it interacts with WR-01: the whole point of the WR-01 GET-Range fix was to *confirm* a HEAD 200, and for a small legitimate resource it will now do the opposite (downgrade it). No fix required if this tradeoff is accepted knowingly; otherwise consider a lower floor (e.g. 64-128 bytes) or requiring the byte-count heuristic to combine with a marker-phrase hit rather than firing alone.

## Summary

The three landed fixes are all correct under adversarial tracing (cycle shapes for lineage, status-precedence for the soft-404 GET, and per-hop host revalidation for OFF redirects). Beyond those, the most serious remaining issue is BLOCKER-01: the `web.archive.org` bot-hostile short-circuit makes any source whose citation URL is itself a Wayback snapshot link (a pattern the tool actively recommends and that already exists in `src/_data/sources.json`) permanently unable to reach `RESOLVES`. WARNING-01 is a real, reproducible validation-and-corpus-scan gap around `contested.positions[].sources` that both lets a fabricated source id through the build gate and can silently make `published-contested` unreachable for otherwise-correct data. WARNING-02 and INFO-01 are lower-severity robustness/tradeoff notes.

## Applied fixes (2026-07-01)

Fixes landed in a review-fix pass; full suite green (149/149), `npm run prebuild` exit 0, corpus derived-state counts unchanged (published-confirmed=1, published-contested=1, withheld-unverified=18).

- **BLOCKER-01 - RESOLVED.** `web.archive.org` removed from the `BOT_HOSTILE` short-circuit and special-cased in `isBotHostile` (returns false), so a directly-cited Wayback snapshot URL is probed directly (HEAD -> GET) like any other host. `waybackFallback` now guards on `hostOf(url) === "web.archive.org"` and returns the direct probe verdict (200 -> RESOLVES, 404/410 -> DOES_NOT_RESOLVE, 403/429 -> ACCESS_BLOCKED) instead of querying CDX for a snapshot-of-a-snapshot. The https/SSRF host guard and the archive-host allowlist exception are untouched. Regression test: `test/check-citations.test.js` asserts `isBotHostile` is false for a `web.archive.org` snapshot URL and still true for the retail hosts.
- **WARNING-01(a) - RESOLVED.** `checkReferences` (`lib/referential.mjs`) now also validates every `verification.contested.positions[].sources` id against the registry, so a dangling/fabricated position source is flagged like any other unknown reference. Regression tests: a referential unit test (dangling position source flagged; real Lucozade fact still clean) and a `corpus-gate` spawn test proving the build fails end to end.
- **WARNING-01(b) - RESOLVED.** `citedSourceIds()` (`scripts/check-citations.mjs`) now gathers position-only source ids via a new `sourceIdsForFact` helper, so a position source not duplicated into `fact.sources[]` still receives an existence check. Regression test: `sourceIdsForFact` includes a position-only id.
- **WARNING-02 - RESOLVED.** Intermediate redirect-hop bodies and non-200 GET-Range retry bodies are now cancelled (`res.body?.cancel()`) in `probe()` and both GET-Range retry sites of `check-citations.mjs`, and in `fetchOffProduct`'s redirect loop and 404 path in `ingest-off.mjs`. Behaviour is otherwise identical.
- **INFO-01 - ACCEPTED.** The 512-byte soft-404 floor is left as the documented "safe over-raise" tradeoff; no change.
