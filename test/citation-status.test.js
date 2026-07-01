// Table-driven proof of the D-07 four-verdict citation-status model and the
// pure SSRF/DOI/snapshot/soft-404 helpers that guard the network checker
// (VRFY-07). Every case is offline: the module under test touches no fs and no
// network, so the classifier, the host guard, the DOI normaliser, the
// closest-snapshot picker and the soft-404 heuristic are all pinned here.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyStatus,
  isBlockedHost,
  assertPublicHttpsUrl,
  normaliseDoiForApi,
  pickClosestSnapshot,
  isSoftNotFound
} from "../lib/citation-status.mjs";

// ---- classifyStatus: the D-07 status table (Pattern 3) ----

const STATUS_CASES = [
  // status, expected verdict
  [200, "RESOLVES"],
  [201, "RESOLVES"],
  [206, "RESOLVES"],
  [301, "RESOLVES"],
  [304, "RESOLVES"],
  [399, "RESOLVES"],
  [404, "DOES_NOT_RESOLVE"],
  [410, "DOES_NOT_RESOLVE"],
  [401, "ACCESS_BLOCKED"],
  [403, "ACCESS_BLOCKED"],
  [407, "ACCESS_BLOCKED"],
  [429, "ACCESS_BLOCKED"],
  [451, "ACCESS_BLOCKED"],
  [999, "ACCESS_BLOCKED"],
  [500, "INDETERMINATE"],
  [503, "INDETERMINATE"],
  [418, "INDETERMINATE"] // an unknown 4xx is never scored dead
];

test("classifyStatus maps every status-code row to its D-07 verdict", () => {
  for (const [status, expected] of STATUS_CASES) {
    assert.equal(classifyStatus(status), expected, `status ${status}`);
  }
});

test("classifyStatus(403) is ACCESS_BLOCKED and 429 too (the SPIKE-01 false-block guard)", () => {
  assert.equal(classifyStatus(403), "ACCESS_BLOCKED");
  assert.equal(classifyStatus(429), "ACCESS_BLOCKED");
});

test("classifyStatus(404) and 410 are the only status DOES_NOT_RESOLVE values", () => {
  assert.equal(classifyStatus(404), "DOES_NOT_RESOLVE");
  assert.equal(classifyStatus(410), "DOES_NOT_RESOLVE");
});

// ---- classifyStatus: the extended errorClass rows (R-21) ----

const ERROR_CASES = [
  ["nxdomain", "DOES_NOT_RESOLVE"],
  ["refused", "DOES_NOT_RESOLVE"],
  ["dns-transient", "INDETERMINATE"],
  ["tls", "INDETERMINATE"],
  ["timeout", "INDETERMINATE"],
  ["network", "INDETERMINATE"],
  ["something-unknown", "INDETERMINATE"]
];

test("classifyStatus maps error classes: only nxdomain/refused are dead, the rest INDETERMINATE (R-21)", () => {
  for (const [errorClass, expected] of ERROR_CASES) {
    assert.equal(classifyStatus(undefined, errorClass), expected, `errorClass ${errorClass}`);
  }
});

test("classifyStatus with neither a known status nor an errorClass defaults to INDETERMINATE", () => {
  assert.equal(classifyStatus(undefined, undefined), "INDETERMINATE");
  assert.equal(classifyStatus(null), "INDETERMINATE");
});

// ---- isBlockedHost: the SSRF host guard across all encodings (R-01/R-11) ----

const BLOCKED_HOSTS = [
  "127.0.0.1",
  "10.0.0.5",
  "172.16.0.1",
  "192.168.1.1",
  "169.254.169.254",
  "0.0.0.0",
  "2130706433", // decimal 127.0.0.1
  "0x7f000001", // hex 127.0.0.1
  "0177.0.0.1", // octal 127.0.0.1
  "::1",
  "[::1]",
  "::",
  "[::]",
  "fe80::1", // link-local
  "fc00::1", // ULA
  "::ffff:169.254.169.254", // IPv4-mapped link-local/metadata
  "metadata.google.internal"
];

test("isBlockedHost refuses every private/loopback/link-local host across all IP encodings (R-01/R-11)", () => {
  for (const host of BLOCKED_HOSTS) {
    assert.equal(isBlockedHost(host), true, `expected ${host} blocked`);
  }
});

test("L10: isBlockedHost refuses an IPv4-compatible ::a.b.c.d whose embedded IPv4 is blocked", () => {
  assert.equal(isBlockedHost("[::7f00:1]"), true); // ::127.0.0.1 loopback
  assert.equal(isBlockedHost("::7f00:1"), true);
  // An IPv4-compatible address embedding a PUBLIC IPv4 stays allowed.
  assert.equal(isBlockedHost("::808:808"), false); // ::8.8.8.8
});

test("isBlockedHost allows a normal public host", () => {
  assert.equal(isBlockedHost("www.food.gov.uk"), false);
  assert.equal(isBlockedHost("api.crossref.org"), false);
  assert.equal(isBlockedHost("web.archive.org"), false);
});

test("isBlockedHost refuses a malformed or empty host", () => {
  assert.equal(isBlockedHost(""), true);
  assert.equal(isBlockedHost("[not-an-ipv6"), true);
});

test("C2: isBlockedHost refuses name-based loopback aliases but not a public host", () => {
  assert.equal(isBlockedHost("localhost"), true);
  assert.equal(isBlockedHost("LOCALHOST"), true);
  assert.equal(isBlockedHost("foo.localhost"), true);
  assert.equal(isBlockedHost("ip6-localhost"), true);
  assert.equal(isBlockedHost("ip6-loopback"), true);
  // A multi-label internal name is the documented DNS-rebinding residual, allowed.
  assert.equal(isBlockedHost("api.internal"), false);
  assert.equal(isBlockedHost("www.food.gov.uk"), false);
});

test("C1: isBlockedHost strips the FQDN trailing dot so localhost. / metadata. cannot bypass the name block", () => {
  assert.equal(isBlockedHost("localhost."), true);
  assert.equal(isBlockedHost("foo.localhost."), true);
  assert.equal(isBlockedHost("metadata.google.internal."), true);
  assert.equal(isBlockedHost("ip6-localhost."), true);
  // A public host with a trailing dot is still fine (dot stripped, then allowed).
  assert.equal(isBlockedHost("www.food.gov.uk."), false);
});

test("M3: isBlockedHost refuses Alibaba/Oracle metadata and CGNAT ranges", () => {
  assert.equal(isBlockedHost("100.100.100.200"), true); // Alibaba Cloud metadata
  assert.equal(isBlockedHost("192.0.0.192"), true); // Oracle Cloud metadata
  assert.equal(isBlockedHost("100.64.0.1"), true); // RFC 6598 CGNAT
  assert.equal(isBlockedHost("100.127.255.255"), true); // CGNAT upper bound
  // Neighbouring public addresses stay allowed (no over-block).
  assert.equal(isBlockedHost("100.63.255.255"), false);
  assert.equal(isBlockedHost("100.128.0.1"), false);
  assert.equal(isBlockedHost("192.0.1.1"), false);
});

// ---- assertPublicHttpsUrl: scheme + host policy ----

test("assertPublicHttpsUrl accepts a public https url and returns a URL", () => {
  const url = assertPublicHttpsUrl("https://www.food.gov.uk/some/page");
  assert.equal(url.hostname, "www.food.gov.uk");
});

test("assertPublicHttpsUrl refuses an http url except the web.archive.org CDX host", () => {
  assert.throws(() => assertPublicHttpsUrl("http://www.food.gov.uk/"));
  // the one allowed http exception is the archive host used by the CDX probe
  assert.doesNotThrow(() => assertPublicHttpsUrl("http://web.archive.org/cdx/search/cdx"));
});

test("assertPublicHttpsUrl refuses a url whose host is a blocked private range", () => {
  assert.throws(() => assertPublicHttpsUrl("https://169.254.169.254/latest/meta-data/"));
  assert.throws(() => assertPublicHttpsUrl("https://[::1]:8080/"));
  assert.throws(() => assertPublicHttpsUrl("not a url"));
});

// ---- normaliseDoiForApi: keep the slash intact (R-10) ----

test("normaliseDoiForApi keeps the forward slash, never %2F (R-10)", () => {
  assert.equal(normaliseDoiForApi("10.1038/nature12373"), "10.1038/nature12373");
  // other reserved characters are still percent-encoded so the path stays valid
  assert.equal(normaliseDoiForApi("10.1000/xyz 1"), "10.1000/xyz%201");
});

// ---- pickClosestSnapshot: nearest 200 row, not the first (R-20) ----

const CDX_ROWS = [
  ["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"],
  ["uk,co,example)/", "20100101000000", "http://example.com/", "text/html", "200", "AAA", "1000"],
  ["uk,co,example)/", "20170301000000", "http://example.com/", "text/html", "404", "CCC", "1000"],
  ["uk,co,example)/", "20170601000000", "http://example.com/", "text/html", "200", "BBB", "1000"],
  ["uk,co,example)/", "20180101000000", "http://example.com/", "text/html", "200", "DDD", "1000"]
];

test("pickClosestSnapshot returns the 200 row nearest the target, skipping a closer non-200 (R-20)", () => {
  const snap = pickClosestSnapshot(CDX_ROWS, "20170101000000");
  assert.equal(snap.timestamp, "20170601000000");
  assert.match(snap.snapshotUrl, /^https:\/\/web\.archive\.org\/web\/20170601000000\//);
});

test("pickClosestSnapshot returns null when there is no 200 capture", () => {
  const noneOk = [CDX_ROWS[0], CDX_ROWS[2]]; // header + the 404 row only
  assert.equal(pickClosestSnapshot(noneOk, "20170101000000"), null);
  assert.equal(pickClosestSnapshot([], "20170101000000"), null);
});

// ---- isSoftNotFound: a 200 that is really a not-found page (R-22) ----

const REAL_BODY =
  "<!doctype html><html><head><title>Wall's Soft Scoop Vanilla 1800ml</title></head>" +
  "<body><h1>Wall's Soft Scoop Vanilla</h1><p>" +
  "Ingredients: reconstituted skimmed milk, glucose-fructose syrup, sugar, coconut oil, " +
  "whey solids, emulsifier, stabilisers, flavourings. Nutrition per 100ml as sold. ".repeat(6) +
  "</p></body></html>";

test("isSoftNotFound flags a tiny or not-found-marker 200 body but not a real page (R-22)", () => {
  assert.equal(isSoftNotFound(200, "<title>Page not found</title>"), true);
  assert.equal(isSoftNotFound(200, "This page is no longer available"), true);
  assert.equal(isSoftNotFound(200, REAL_BODY), false);
});

test("isSoftNotFound only fires on a 200/206 (a 404 is already handled by classifyStatus)", () => {
  assert.equal(isSoftNotFound(404, "Page not found"), false);
  assert.equal(isSoftNotFound(500, "Page not found"), false);
});

test("M5: a ranged 206 soft-404 body is flagged so it downgrades to INDETERMINATE", () => {
  // A ranged GET (bytes=0-511) can answer 206; its bytes are still inspectable.
  assert.equal(isSoftNotFound(206, "<title>Page not found</title>"), true);
  assert.equal(isSoftNotFound(206, "This page is no longer available"), true);
  // A real 206 page (>= the soft-404 byte floor, no marker) is NOT flagged.
  assert.equal(isSoftNotFound(206, REAL_BODY), false);
});
