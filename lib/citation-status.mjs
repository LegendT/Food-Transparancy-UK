// The PURE decisions behind the four-verdict citation-existence checker (D-07,
// VRFY-07): the status/error classifier, the SSRF host-safety guard, the DOI
// path normaliser, the closest-snapshot picker and the soft-404 heuristic. Every
// function here is pure - no fs, no network, no clock - so it is exhaustively
// unit-testable offline and the network script (scripts/check-citations.mjs)
// carries only the IO. The io/decision split exists so the load-bearing rules
// are provable without hitting bot-hostile hosts.
//
// The affirmative-non-existence rule (the whole point of the four-verdict model):
// ONLY 404 / 410 / DNS NXDOMAIN / a hard connection-refused-with-nothing-behind-it
// are treated as DOES_NOT_RESOLVE. Everything in the refusal/challenge family
// (401/403/407/429/451/999 - a live host refusing a bot), the transient family
// (5xx, timeouts, transient DNS) and TLS/cert failures is NEVER scored dead: a
// refusal is ACCESS_BLOCKED, a transient or TLS error is INDETERMINATE, both
// route to a Wayback fallback and then a human. This is the exact SPIKE-01
// false-block failure the boolean model produced.
//
// SSRF residual: isBlockedHost canonicalises a host across every IPv4/IPv6
// encoding and blocks the cloud-metadata names, applied to the initial URL AND
// re-applied to every redirect hop by the script. DNS-rebinding (a public
// hostname that resolves to a private IP at fetch time) is a CONSCIOUSLY accepted
// residual risk for a build-time tool over a curated source list (R-11): it is
// documented here, not mitigated, because doing so would need a custom resolver
// and connect-time re-check that is out of proportion to a curated-list checker.

// ---- the four-verdict enum ----

export const VERDICTS = Object.freeze({
  RESOLVES: "RESOLVES",
  DOES_NOT_RESOLVE: "DOES_NOT_RESOLVE",
  ACCESS_BLOCKED: "ACCESS_BLOCKED",
  INDETERMINATE: "INDETERMINATE"
});

// Live-but-refused: the host answered and declined the bot. Never a dead link.
const BLOCKED_STATUS = new Set([401, 403, 407, 429, 451, 999]);

// classifyStatus(statusCode, errorClass) -> one of the four verdicts (D-07).
// The errorClass axis is checked first because a thrown fetch error carries no
// HTTP status. Only "nxdomain" and "refused" are affirmative non-existence;
// every other error class (dns-transient, tls, timeout, network, unknown) is
// INDETERMINATE, so a transient blip or a TLS quirk never withholds a fact as
// dead - it routes to a human via the Wayback path (R-21).
export function classifyStatus(statusCode, errorClass) {
  if (errorClass != null) {
    if (errorClass === "nxdomain" || errorClass === "refused") {
      return VERDICTS.DOES_NOT_RESOLVE;
    }
    return VERDICTS.INDETERMINATE;
  }
  if (typeof statusCode !== "number" || !Number.isFinite(statusCode)) {
    return VERDICTS.INDETERMINATE;
  }
  if (statusCode >= 200 && statusCode < 400) return VERDICTS.RESOLVES; // incl 206, 304
  if (statusCode === 404 || statusCode === 410) return VERDICTS.DOES_NOT_RESOLVE;
  if (BLOCKED_STATUS.has(statusCode)) return VERDICTS.ACCESS_BLOCKED;
  if (statusCode >= 500) return VERDICTS.INDETERMINATE;
  return VERDICTS.INDETERMINATE; // an unknown status is never scored dead
}

// ---- the SSRF host-safety guard ----

// Parse one IPv4 part with base detection (inet_aton semantics): 0x -> hex,
// a leading zero -> octal, otherwise decimal. Returns NaN on anything malformed.
function parseIPv4Part(str) {
  if (str === "") return NaN;
  if (/^0x[0-9a-f]+$/i.test(str)) return parseInt(str.slice(2), 16);
  if (str === "0") return 0;
  if (/^0[0-7]+$/.test(str)) return parseInt(str, 8);
  if (/^[1-9][0-9]*$/.test(str)) return parseInt(str, 10);
  return NaN;
}

// Parse any IPv4 encoding (dotted/decimal/octal/hex, 1 to 4 parts, inet_aton
// style) to four canonical bytes, or null when the host is not an IPv4 literal.
// Multiplication (not bit shifts) combines the parts so the 32-bit single-part
// form does not overflow JS signed-int bit operators.
function parseIPv4(host) {
  const parts = host.split(".");
  if (parts.length < 1 || parts.length > 4) return null;
  const nums = parts.map(parseIPv4Part);
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;

  let value;
  if (parts.length === 1) {
    if (nums[0] > 0xffffffff) return null;
    value = nums[0];
  } else if (parts.length === 2) {
    if (nums[0] > 0xff || nums[1] > 0xffffff) return null;
    value = nums[0] * 0x1000000 + nums[1];
  } else if (parts.length === 3) {
    if (nums[0] > 0xff || nums[1] > 0xff || nums[2] > 0xffff) return null;
    value = nums[0] * 0x1000000 + nums[1] * 0x10000 + nums[2];
  } else {
    if (nums.some((n) => n > 0xff)) return null;
    value = nums[0] * 0x1000000 + nums[1] * 0x10000 + nums[2] * 0x100 + nums[3];
  }
  return [
    Math.floor(value / 0x1000000) % 256,
    Math.floor(value / 0x10000) % 256,
    Math.floor(value / 0x100) % 256,
    value % 256
  ];
}

// CIDR membership of the loopback/private/link-local/this-network set. 169.254/16
// covers the AWS/GCP/Azure metadata address 169.254.169.254 by construction.
function isBlockedIPv4(bytes) {
  const [a, b] = bytes;
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + metadata
  if (a === 0) return true; // 0.0.0.0/8 this-network
  return false;
}

// Parse an IPv6 literal (with :: compression and an optional embedded IPv4 tail)
// to 16 canonical bytes, or null when it is not a valid IPv6 literal.
function parseIPv6(host) {
  if (!host.includes(":")) return null;

  let s = host;
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    const g1 = (v4[0] * 256 + v4[1]).toString(16);
    const g2 = (v4[2] * 256 + v4[3]).toString(16);
    s = `${s.slice(0, lastColon + 1)}${g1}:${g2}`;
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;

  const parseGroups = (str) =>
    str === "" ? [] : str.split(":").map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));

  const head = parseGroups(halves[0]);
  const tailGroups = halves.length === 2 ? parseGroups(halves[1]) : null;
  if (head.some(Number.isNaN) || (tailGroups && tailGroups.some(Number.isNaN))) return null;

  let groups;
  if (tailGroups === null) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const missing = 8 - head.length - tailGroups.length;
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill(0), ...tailGroups];
  }
  if (groups.length !== 8) return null;

  const bytes = [];
  for (const g of groups) bytes.push((g >>> 8) & 0xff, g & 0xff);
  return bytes;
}

// Block ::1, ::, fe80::/10 link-local, fc00::/7 ULA and IPv4-mapped ::ffff:x.x.x.x
// whose embedded IPv4 is itself blocked.
function isBlockedIPv6(bytes) {
  if (bytes.every((byte) => byte === 0)) return true; // :: unspecified
  if (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1) return true; // ::1 loopback
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 ULA
  if (bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isBlockedIPv4(bytes.slice(12, 16)); // IPv4-mapped ::ffff:a.b.c.d
  }
  // IPv4-compatible ::a.b.c.d (bytes 0-11 all zero, NOT the ::ffff: mapped form):
  // an embedded IPv4 that is itself blocked is refused (L10). For example
  // ::7f00:1 is ::127.0.0.1, whose tail 127.0.0.1 is loopback.
  if (bytes.slice(0, 12).every((byte) => byte === 0)) {
    return isBlockedIPv4(bytes.slice(12, 16));
  }
  return false;
}

// isBlockedHost(hostname): canonicalise the host and refuse any private,
// loopback, link-local or ULA address in ANY IPv4/IPv6 encoding, the cloud
// metadata hostnames, and any malformed host. A normal public hostname is
// allowed (DNS-rebinding is the documented accepted residual, see the header).
export function isBlockedHost(hostname) {
  if (typeof hostname !== "string") return true;
  let host = hostname.trim().toLowerCase();
  if (host === "") return true;
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (host === "") return true;

  if (host === "metadata.google.internal") return true;

  if (host.includes(":")) {
    const bytes = parseIPv6(host);
    if (!bytes) return true; // a malformed IPv6 literal is refused, never allowed
    return isBlockedIPv6(bytes);
  }

  const v4 = parseIPv4(host);
  if (v4) return isBlockedIPv4(v4);

  // Name-based loopback aliases resolve to 127.0.0.1 / ::1 without being IP
  // literals, so refuse them explicitly (an OS resolves "localhost" and the
  // ".localhost" TLD to loopback by RFC 6761, and ip6-localhost/ip6-loopback are
  // the conventional /etc/hosts IPv6 loopback names). Multi-label internal names
  // like api.internal are NOT blocked here - that remains the documented
  // DNS-rebinding accepted residual (see the header).
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "ip6-localhost" ||
    host === "ip6-loopback"
  ) {
    return true;
  }

  // A normal hostname. Reject any character outside the LDH + dot set (a stray
  // "[" or space means a malformed host, which we refuse rather than fetch).
  if (!/^[a-z0-9.-]+$/.test(host)) return true;
  return false;
}

// assertPublicHttpsUrl(rawUrl): parse with the URL constructor, require https
// (the only http exception is the web.archive.org host used by the CDX probe),
// and pass the host through isBlockedHost. Returns the parsed URL, or throws so
// the caller records the citation as refused (verdict NOT RESOLVES). Applied to
// the initial URL AND re-applied to every redirect hop (R-01).
export function assertPublicHttpsUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Refusing a malformed URL: ${rawUrl}`);
  }
  const host = url.hostname.toLowerCase();
  const isArchiveHttp = url.protocol === "http:" && host === "web.archive.org";
  if (url.protocol !== "https:" && !isArchiveHttp) {
    throw new Error(`Refusing a non-https URL (scheme ${url.protocol}): ${rawUrl}`);
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error(`Refusing a URL whose host is a private/loopback/link-local range: ${url.hostname}`);
  }
  return url;
}

// ---- DOI path normalisation ----

// normaliseDoiForApi(doi): percent-encode the DOI for a REST path but KEEP the
// forward slash intact, because Crossref and the Handle proxy 404 a live DOI
// whose "/" was encoded to %2F (R-10). Other reserved characters stay encoded.
export function normaliseDoiForApi(doi) {
  return encodeURIComponent(doi).replace(/%2F/gi, "/");
}

// ---- Wayback CDX closest-snapshot selection ----

// pickClosestSnapshot(rows, atTimestamp): from a CDX JSON response ([header,
// ...dataRows] where each row is [urlkey, timestamp, original, mimetype,
// statuscode, digest, length]) pick the statuscode-200 capture whose timestamp
// is NEAREST atTimestamp - not the first/oldest row a bare filter would return
// (R-20). Returns { timestamp, original, statusCode, snapshotUrl } or null.
export function pickClosestSnapshot(rows, atTimestamp) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const target = Number(atTimestamp);
  let best = null;
  let bestDist = Infinity;
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const ts = String(row[1]);
    if (!/^[0-9]{4,14}$/.test(ts)) continue; // skip the header row and junk
    if (String(row[4]) !== "200") continue; // only real 200 captures resolve
    const dist = Number.isFinite(target) ? Math.abs(Number(ts) - target) : 0;
    if (dist < bestDist) {
      bestDist = dist;
      best = {
        timestamp: ts,
        original: row[2],
        statusCode: 200,
        snapshotUrl: `https://web.archive.org/web/${ts}/${row[2]}`
      };
    }
  }
  return best;
}

// ---- soft-404 heuristic ----

// Title/heading phrases a "page no longer available" 200 tends to carry. Kept
// deliberately loud: a false positive routes to a human (INDETERMINATE), which
// is the safe direction, never a silent RESOLVES.
const NOT_FOUND_MARKERS = [
  "page not found",
  "404 not found",
  "not found",
  "no longer available",
  "page you requested could not",
  "page cannot be found",
  "page does not exist",
  "page isn't available",
  "page you are looking for"
];

const SOFT_404_MIN_BYTES = 512;

// isSoftNotFound(status, bodyText): classifyStatus is status-only, so a 200 (or a
// ranged 206) that is really a not-found page would score RESOLVES. On the GET
// path a body that is suspiciously tiny OR carries a common not-found marker is
// treated as a soft-404 and downgraded to INDETERMINATE upstream, never RESOLVES
// (R-22/M5). Fires on a 200 or a 206 (a ranged 206 still returns inspectable
// bytes); a real 404 is already handled by classifyStatus.
export function isSoftNotFound(status, bodyText) {
  if (status !== 200 && status !== 206) return false;
  const text = typeof bodyText === "string" ? bodyText.trim() : "";
  if (text.length < SOFT_404_MIN_BYTES) return true;
  const lower = text.toLowerCase();
  return NOT_FOUND_MARKERS.some((marker) => lower.includes(marker));
}
