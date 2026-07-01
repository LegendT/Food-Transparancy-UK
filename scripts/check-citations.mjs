#!/usr/bin/env node
// The four-verdict citation-existence checker (VRFY-07, D-07..D-11). This is a
// STANDALONE network job: it reaches Crossref, the Handle proxy, the Wayback CDX
// server and the live source hosts, so it is DELIBERATELY absent from the
// prebuild chain (validate -> lint:editorial -> check:images). The offline
// prebuild gate reads the diffable cache this script writes; running the network
// on every build would make builds non-deterministic and CI-fragile (research
// Pitfall 3). Run it manually / on a schedule and COMMIT the cache.
//
// It records ONLY a resolves-verdict per citation - never a value and never a
// verification pass (D-11). A URL resolving is not the same as a human confirming
// the value; the two verification passes stay editor-authored.
//
// Security: every source URL is untrusted-as-a-request-target even though it is
// trusted-as-content. The checker follows redirects MANUALLY and re-runs the
// full host-safety policy (assertPublicHttpsUrl -> isBlockedHost) against EVERY
// hop, capped at 5, https-only (R-01). Every body-reading path is byte-capped by
// streaming res.body and aborting past a 512 KB ceiling, since AbortSignal.timeout
// bounds time, not bytes, and a server may ignore a Range header (R-23).
//
// A run that inspects zero citations is a false green, so the script asserts a
// non-zero cited-source corpus and exits non-zero on an empty one.
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { collectFacts } from "../lib/referential.mjs";
import {
  classifyStatus,
  assertPublicHttpsUrl,
  isBlockedHost,
  normaliseDoiForApi,
  pickClosestSnapshot,
  isSoftNotFound
} from "../lib/citation-status.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const DATA_DIR = resolve(ROOT, "src/_data");
const SOURCES = resolve(DATA_DIR, "sources.json");
const CACHE_DIR = resolve(ROOT, ".cache");
const CACHE_FILE = resolve(CACHE_DIR, "citation-verdicts.json");

// A realistic browser User-Agent so a bot-refusing host answers as it would to a
// person (D-08); the polite Crossref pool wants a contact mailto (D-09).
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const CONTACT_UA = "FoodTransparencyUK/0.1 (mailto:legendarytone@gmail.com)";

const TIMEOUT_MS = 8000;
const CDX_TIMEOUT_MS = 12000;
const MAX_REDIRECTS = 5;
const BYTE_CEILING = 512 * 1024; // R-23: the real bound on a decompression bomb
const REQUEST_GAP_MS = 700; // ~1-2 req/s (D-10)

// Known bot-hostile hosts: bias their refusals straight to ACCESS_BLOCKED +
// Wayback rather than spending a live retry that will 403 anyway (D-10).
// web.archive.org is deliberately NOT in this set: a web.archive.org URL is
// itself an archival snapshot, so short-circuiting it into waybackFallback would
// ask the CDX server for captures of a Wayback page (a snapshot-of-a-snapshot)
// and never resolve (BLOCKER-01, D-08/R-19). Such URLs are probed directly.
const BOT_HOSTILE = new Set([
  "tesco.com",
  "ocado.com",
  "asda.com",
  "sainsburys.co.uk"
]);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const editorialFollowUps = [];

// ---- corpus enumeration: the source ids actually cited by a fact ----

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function jsonFilesUnder(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsonFilesUnder(full));
    else if (entry.name.endsWith(".json")) out.push(full);
  }
  return out;
}

// Every source id a fact cites: its top-level sources[] AND every source cited
// only inside a contested position (verification.contested.positions[].sources).
// A legitimate position source not duplicated into the fact's own sources[] would
// otherwise never receive an existence check, permanently blocking
// published-contested (WARNING-01, D-14).
function sourceIdsForFact(fact) {
  const ids = [...fact.sources];
  const positions = fact.verification?.contested?.positions ?? [];
  for (const position of positions) {
    for (const id of position.sources ?? []) ids.push(id);
  }
  return ids;
}

function citedSourceIds() {
  const cited = new Set();
  for (const path of jsonFilesUnder(DATA_DIR)) {
    if (path === SOURCES) continue;
    let data;
    try {
      data = readJson(path);
    } catch {
      continue; // malformed JSON is the prebuild gate's job, not this script's
    }
    for (const { fact } of collectFacts(data, path)) {
      for (const id of sourceIdsForFact(fact)) cited.add(id);
    }
  }
  return cited;
}

// ---- fetch-error -> errorClass (R-21): only nxdomain/refused become dead ----

function errorClassFor(err) {
  const code = err?.code ?? "";
  const name = err?.name ?? "";
  if (code === "ENOTFOUND") return "nxdomain";
  if (code === "ECONNREFUSED") return "refused";
  if (code === "EAI_AGAIN") return "dns-transient";
  if (
    code === "CERT_HAS_EXPIRED" ||
    code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    /tls|cert/i.test(code)
  ) {
    return "tls";
  }
  if (code === "ETIMEDOUT" || name === "TimeoutError" || name === "AbortError") return "timeout";
  return "network";
}

// ---- byte-capped body reader (R-23) ----

async function readCapped(res) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > BYTE_CEILING) {
      await reader.cancel();
      break;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readCappedJson(res) {
  try {
    return JSON.parse(await readCapped(res));
  } catch {
    return null;
  }
}

// ---- manual-redirect probe with per-hop SSRF revalidation (R-01) ----

// Follows redirects MANUALLY, re-parsing and re-guarding every Location target
// before the next fetch, capped at MAX_REDIRECTS. Returns a shape the caller
// classifies: { blockedHost } | { errorClass } | { redirectCapExceeded } |
// { status, res, finalUrl }.
async function probe(startUrl, method, extraHeaders = {}) {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let parsed;
    try {
      parsed = assertPublicHttpsUrl(current); // scheme + isBlockedHost, every hop
    } catch (err) {
      return { blockedHost: true, note: err.message };
    }
    // Explicit belt-and-braces host check (assertPublicHttpsUrl already applies
    // it) so the per-hop guard is unmistakable in review.
    if (isBlockedHost(parsed.hostname)) return { blockedHost: true, note: parsed.hostname };

    let res;
    try {
      res = await fetch(parsed, {
        method,
        redirect: "manual",
        headers: { "user-agent": BROWSER_UA, ...extraHeaders },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
    } catch (err) {
      return { errorClass: errorClassFor(err) };
    }

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel(); // discard the redirect-hop body before the next fetch (WR-02)
      current = new URL(location, parsed).toString();
      continue; // re-guard on the next iteration
    }
    return { status: res.status, res, finalUrl: parsed.toString() };
  }
  return { redirectCapExceeded: true };
}

// ---- verdict cache entry (the 02-01 SEAM format) ----

function entry(verdict, resolvedVia, statusCode, snapshotUrl) {
  return {
    verdict,
    resolvedVia,
    checkedAt: new Date().toISOString(),
    statusCode: statusCode ?? null,
    snapshotUrl: snapshotUrl ?? null
  };
}

// ---- DOI resolution + Wayback fallback + the live escalation ----

function extractDoi(source) {
  const id = source.id ?? "";
  const url = source.url ?? "";
  if (id.startsWith("10.")) return id;
  const m = url.match(/^https?:\/\/(?:dx\.)?doi\.org\/(10\..+)$/i);
  if (m) return decodeURIComponent(m[1]);
  if (url.startsWith("10.")) return url;
  return null;
}

// Crossref 200 OR Handle responseCode 1 -> RESOLVES; Crossref 404 AND Handle 100
// -> DOES_NOT_RESOLVE; else INDETERMINATE (D-09). The DOI keeps its slash (R-10).
async function checkDoi(doi) {
  const path = normaliseDoiForApi(doi);
  const headers = { "user-agent": CONTACT_UA };
  let crStatus = null;
  let handleCode = null;

  try {
    const cr = assertPublicHttpsUrl(`https://api.crossref.org/works/${path}`);
    const res = await fetch(cr, {
      method: "HEAD",
      redirect: "manual",
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    crStatus = res.status;
  } catch {
    crStatus = null;
  }

  try {
    const handle = assertPublicHttpsUrl(`https://doi.org/api/handles/${path}`);
    const res = await fetch(handle, {
      redirect: "manual",
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const body = await readCappedJson(res);
    handleCode = body?.responseCode ?? null;
  } catch {
    handleCode = null;
  }

  if (crStatus === 200 || handleCode === 1) {
    return entry("RESOLVES", crStatus === 200 ? "crossref" : "handle", crStatus, null);
  }
  if (crStatus === 404 && handleCode === 100) {
    return entry("DOES_NOT_RESOLVE", "crossref", crStatus, null);
  }
  return entry("INDETERMINATE", "crossref", crStatus, null);
}

// A 14-digit Wayback timestamp from the source's retrieved date, so the CDX probe
// prefers the snapshot NEAREST the date the editor cited (R-20).
function waybackTimestamp(source) {
  const date = source.retrievedDate ?? source.date;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return `${date.slice(0, 10).replace(/-/g, "")}000000`;
  }
  return undefined;
}

// On ACCESS_BLOCKED / INDETERMINATE / DOES_NOT_RESOLVE, query the Wayback CDX
// server (preferred over the availability API, which rate-limits shared IPs) and
// pick the closest 200 capture (R-20). A snapshot promotes to RESOLVES with the
// snapshotUrl STORED for durable archival (R-19). Wayback's OWN 429/5xx is
// INDETERMINATE, never DOES_NOT_RESOLVE (Pitfall 2).
async function waybackFallback(url, source, originVerdict, originStatus) {
  // A web.archive.org URL is already an archival snapshot: there is no
  // snapshot-of-a-snapshot to fall back to, so return the direct probe verdict
  // rather than querying CDX for captures of a Wayback page (BLOCKER-01,
  // D-08/R-19). The direct probe already scored 200 -> RESOLVES, 404/410 ->
  // DOES_NOT_RESOLVE, 403/429 -> ACCESS_BLOCKED before reaching here.
  if (hostOf(url) === "web.archive.org") {
    return entry(originVerdict, "live", originStatus, null);
  }

  const ts = waybackTimestamp(source);
  const cdx =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}` +
    `&output=json&limit=25&filter=statuscode:200` +
    (ts ? `&sort=closest&closest=${ts}` : "");

  const softenDead = (v) => (v === "DOES_NOT_RESOLVE" ? "INDETERMINATE" : v);

  let rows = null;
  try {
    const parsed = assertPublicHttpsUrl(cdx); // web.archive.org (http exception is https here anyway)
    const res = await fetch(parsed, {
      redirect: "manual",
      headers: { "user-agent": CONTACT_UA },
      signal: AbortSignal.timeout(CDX_TIMEOUT_MS)
    });
    if (res.status === 429 || res.status >= 500) {
      return entry(softenDead(originVerdict), "live", originStatus, null);
    }
    rows = await readCappedJson(res);
  } catch {
    return entry(softenDead(originVerdict), "live", originStatus, null);
  }

  const snap = pickClosestSnapshot(rows ?? [], ts);
  if (snap) {
    editorialFollowUps.push(
      `${source.id}: origin ${originVerdict} - add the Wayback snapshot to sources.json as a durable ` +
        `archival source so the citation does not flip back to withheld on the next archive.org 429: ${snap.snapshotUrl}`
    );
    return entry("RESOLVES", `wayback:${snap.timestamp}`, originStatus, snap.snapshotUrl);
  }
  return entry(originVerdict, "live", originStatus, null);
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isBotHostile(url) {
  const host = hostOf(url);
  // Never divert a web.archive.org URL to itself: it IS the archive, so it is
  // probed directly rather than routed to a self-referential CDX query
  // (BLOCKER-01, D-08/R-19).
  if (!host || host === "web.archive.org") return false;
  return [...BOT_HOSTILE].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

// The full escalation for one source: DOI -> live HEAD (manual redirects) ->
// GET Range retry on refusal + soft-404 downgrade -> Wayback fallback (D-08).
async function checkCitation(source) {
  const doi = extractDoi(source);
  if (doi) return await checkDoi(doi);

  const url = source.url;
  if (!url) return entry("INDETERMINATE", "live", null, null);

  // Bot-hostile hosts skip the doomed live retry and go straight to Wayback.
  if (isBotHostile(url)) return await waybackFallback(url, source, "ACCESS_BLOCKED", null);

  const head = await probe(url, "HEAD");

  // A refused host was never fetched: it is not a dead link, but it is NOT
  // RESOLVES either - route it to a human via Wayback.
  if (head.blockedHost) return await waybackFallback(url, source, "ACCESS_BLOCKED", null);
  if (head.redirectCapExceeded) return await waybackFallback(url, source, "INDETERMINATE", null);

  let statusCode = head.status ?? null;
  let verdict;

  if (head.errorClass) {
    verdict = classifyStatus(undefined, head.errorClass);
  } else {
    verdict = classifyStatus(head.status);
    // A HEAD 200 carries no body, so a soft-404 (a removed page served as 200)
    // would score RESOLVES on the primary path without any inspection. Confirm
    // with one cheap byte-capped GET Range and downgrade to INDETERMINATE only if
    // the body reads as a not-found page. A ranged 206 still returns inspectable
    // bytes, so it is examined too (M5); a transient GET error never overturns a
    // genuine HEAD 200 (WR-01/R-22).
    if (verdict === "RESOLVES" && head.status === 200) {
      const get = await probe(head.finalUrl ?? url, "GET", { range: "bytes=0-511" });
      if (get.status === 200 || get.status === 206) {
        const body = await readCapped(get.res);
        if (isSoftNotFound(get.status, body)) {
          verdict = "INDETERMINATE";
          statusCode = 200;
        }
      } else {
        await get.res?.body?.cancel(); // a non-200/206 GET body is never read - discard it (WR-02)
      }
    } else if ([403, 405, 429].includes(head.status)) {
      const retryAfter = Number(head.res.headers.get("retry-after"));
      if (Number.isFinite(retryAfter) && retryAfter > 0) await sleep(Math.min(retryAfter, 5) * 1000);

      const get = await probe(head.finalUrl ?? url, "GET", { range: "bytes=0-511" });
      if (get.status != null) {
        statusCode = get.status;
        verdict = classifyStatus(get.status);
        // Soft-404: a 200 or a ranged 206 that is really a not-found page downgrades (R-22/M5).
        if (verdict === "RESOLVES" && (get.status === 200 || get.status === 206)) {
          const body = await readCapped(get.res);
          if (isSoftNotFound(get.status, body)) verdict = "INDETERMINATE";
        } else {
          await get.res?.body?.cancel(); // a non-200/206 GET body is never read - discard it (WR-02)
        }
      } else if (get.errorClass) {
        verdict = classifyStatus(undefined, get.errorClass);
      } else if (get.blockedHost) {
        verdict = "ACCESS_BLOCKED";
      }
    }
  }

  if (verdict === "RESOLVES") return entry("RESOLVES", "live", statusCode, null);
  // Everything short of a live RESOLVES tries the archive before it withholds.
  return await waybackFallback(url, source, verdict, statusCode);
}

// ---- main ----

async function main() {
  if (!existsSync(SOURCES)) {
    console.error(`Citation check failed: ${SOURCES} not found.`);
    process.exit(1);
  }
  const registry = readJson(SOURCES).sources ?? [];
  const byId = new Map(registry.map((source) => [source.id, source]));

  const cited = citedSourceIds();
  const sources = [...cited]
    .filter((id) => byId.has(id))
    .sort()
    .map((id) => byId.get(id));

  // Non-zero corpus assertion.
  if (sources.length === 0) {
    console.error("Citation check failed: no cited source records found (empty corpus).");
    process.exit(1);
  }
  console.log(`Checking ${sources.length} cited source(s) for existence (four-verdict, D-07).`);

  const cache = {};
  const summary = {};
  for (const source of sources) {
    const result = await checkCitation(source);
    cache[source.id] = result;
    summary[result.verdict] = (summary[result.verdict] ?? 0) + 1;
    const via = result.resolvedVia === "live" ? "" : ` (${result.resolvedVia})`;
    console.log(`  ${source.id}: ${result.verdict}${via}`);
    await sleep(REQUEST_GAP_MS);
  }

  // Write the cache with sorted keys for a stable, reviewable git diff.
  const ordered = {};
  for (const id of Object.keys(cache).sort()) ordered[id] = cache[id];
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, `${JSON.stringify(ordered, null, 2)}\n`, "utf8");

  console.log(`\nWrote ${CACHE_FILE}`);
  console.log("Verdict summary:");
  for (const [verdict, count] of Object.entries(summary).sort()) {
    console.log(`  ${verdict}: ${count}`);
  }

  if (editorialFollowUps.length > 0) {
    console.log("\nEditorial follow-ups (R-19: persist these snapshots as durable archival sources):");
    for (const line of editorialFollowUps) console.log(`  ${line}`);
  }

  // This script records ONLY resolves-verdicts. It mutates no fact value and
  // records no verification pass (D-11).
}

// Pure, offline helpers exported for regression tests (BLOCKER-01, WARNING-01).
// The network run below only fires when this file is executed directly, so a
// test may import the classifier/gatherer without reaching Crossref or Wayback.
export { isBotHostile, sourceIdsForFact };

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((err) => {
    console.error("Citation check crashed:", err);
    process.exit(1);
  });
}
