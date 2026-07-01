#!/usr/bin/env node
// Open Food Facts (OFF) v2 ingestion into the ISOLATED lead store (DATA-05/06,
// VRFY-10, D-19). This is a STANDALONE network job (npm run ingest:off); it is
// deliberately NEVER wired into prebuild (research Pitfall 3) and it writes
// OUTSIDE src/_data, into ingestion/leads/, so its output is outside the
// Eleventy data cascade AND outside the corpus the validation gate walks.
//
// A lead is NOT a fact. It carries field-level OFF provenance under the distinct
// `lead` schema and never uses the key `sources` (D-19/C4), so a misplaced lead
// can never trip the corpus-escape guard. Promotion (turning a lead into a
// SourcedValue fact under src/_data) is an explicit HUMAN step out of scope
// here; the lead records the `off` source-registry id so a promotion is
// obligated to cite it and keep the ODbL attribution/share-alike link (R-09).
//
// The OFF-response-to-lead mapping is factored into the exported pure function
// offProductToLead() so the offline unit test can exercise both measure
// branches without a network call.
//
// Security posture: the fetch host is CONSTRAINED to https://world.openfoodfacts.org
// (T-02-04-02, SSRF); the barcode is encodeURIComponent'd into the path segment
// and no other host is ever constructed. The response is bounded in BYTES via a
// 512 KB streamed ceiling (T-02-04-03, R-23) as well as in TIME via
// AbortSignal.timeout, so an oversized or decompression-bombed body cannot
// exhaust the job before JSON.parse. British English throughout.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertPublicHttpsUrl } from "../lib/citation-status.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const WORKLIST = resolve(ROOT, "ingestion/barcodes.json");
const LEADS_DIR = resolve(ROOT, "ingestion/leads");

const OFF_HOST = "https://world.openfoodfacts.org";
const OFF_HOSTNAME = "world.openfoodfacts.org";
const OFF_FIELDS = "code,product_name,ingredients_text,nutriments,nutrition_data_per,rev,last_modified_t";
const USER_AGENT = "FoodTransparencyUK/0.1 (mailto:legendarytone@gmail.com)";
const BYTE_CEILING = 512 * 1024; // R-23: bound bytes, not just time.
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5; // https-only, OFF-host-only hop cap (WR-02, SSRF).
const REQ_DELAY_MS = 700; // ~1.4 req/s cap (D-10 politeness).

// Nutriment keys ending in one of these are metadata, not a measured value.
const NUTRIMENT_META_SUFFIX = /_(unit|label|modifier)$/;

const isoDate = (d) => d.toISOString().slice(0, 10);

// Build one field-level provenance entry. offRevision and measure are optional:
// a nutriment with no *_100g and no *_serving suffix carries NO measure (R-24),
// and a promotion then supplies one.
function field(path, offField, value, rev, measure) {
  const entry = { path, offField, value };
  if (measure) entry.measure = measure;
  if (Number.isInteger(rev)) entry.offRevision = rev;
  return entry;
}

// Map OFF nutriments to lead fields, reading the ACTUAL suffix present rather
// than assuming per-100g (R-24, RESEARCH A2):
//   *_100g present    -> measure.basis "per-100g"
//   only *_serving     -> measure.basis "per-serving" (nutrition_data_per should read "serving")
//   neither suffix     -> the field is recorded with NO measure
function nutrimentFields(nutriments, dataPer, rev) {
  const bases = new Map();
  const ensure = (base) => {
    if (!bases.has(base)) bases.set(base, {});
    return bases.get(base);
  };
  for (const [key, value] of Object.entries(nutriments)) {
    if (NUTRIMENT_META_SUFFIX.test(key)) continue; // *_unit/_label/_modifier are metadata
    // OFF often serves numeric nutriments as stringified numbers ("4.16"); coerce
    // them so they are not silently dropped, but keep only finite results (L9). A
    // non-numeric string, an empty string, null or an object is discarded.
    const n =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim() !== ""
          ? Number(value)
          : NaN;
    if (!Number.isFinite(n)) continue;
    if (key.endsWith("_100g")) ensure(key.slice(0, -"_100g".length)).per100g = n;
    else if (key.endsWith("_serving")) ensure(key.slice(0, -"_serving".length)).perServing = n;
    else if (key.endsWith("_value")) continue; // a duplicate of the base number; skip
    else ensure(key).bare = n;
  }

  const servingConfirmed = dataPer === "serving";
  const out = [];
  for (const [base, seen] of bases) {
    const path = `nutrition.${base}`;
    if (seen.per100g !== undefined) {
      out.push(field(path, `${base}_100g`, seen.per100g, rev, { basis: "per-100g", state: "as-sold" }));
    } else if (seen.perServing !== undefined) {
      // Only per-serving data exists; nutrition_data_per corroborates the basis.
      // The actual suffix is authoritative either way (never assume per-100g).
      const measure = { basis: "per-serving", state: "as-sold" };
      out.push(field(path, `${base}_serving`, seen.perServing, rev, measure));
    } else if (seen.bare !== undefined) {
      out.push(field(path, base, seen.bare, rev)); // no measure (R-24)
    }
  }
  return out;
}

// PURE: OFF product object -> lead record. Exported for the offline test so both
// measure branches are provable without a network call. Never uses the key
// `sources` (D-19); records provenance + fields[] only.
export function offProductToLead(product, barcode, productId, now = new Date()) {
  const rev = Number.isInteger(product.rev) ? product.rev : null;
  const fields = [];
  if (typeof product.ingredients_text === "string" && product.ingredients_text.trim() !== "") {
    fields.push(field("ingredientsText", "ingredients_text", product.ingredients_text, rev));
  }
  for (const nf of nutrimentFields(product.nutriments || {}, product.nutrition_data_per ?? null, rev)) {
    fields.push(nf);
  }

  const lead = {
    leadId: `off-${barcode}-r${rev ?? "unknown"}`,
    leadType: "off-import",
    barcode,
    capturedAt: isoDate(now),
    provenance: {
      dataset: "open-food-facts",
      sourceRegistryId: "off", // R-09: a promotion MUST cite off to keep the ODbL link.
      licence: "ODbL-1.0",
      url: `${OFF_HOST}/product/${encodeURIComponent(barcode)}`,
      retrievedAt: now.toISOString(),
    },
    fields,
    promotion: { status: "pending", note: "", promotedTo: null, by: null, date: null },
    revisionDiff: null,
  };
  if (Number.isInteger(rev)) lead.offRevision = rev;
  return lead;
}

// Read a streamed response body up to a hard byte ceiling, aborting past it so an
// oversized or decompression-bombed payload cannot exhaust the job (R-23).
async function readCapped(res, ceiling) {
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > ceiling) {
        await reader.cancel();
        throw new Error(`OFF response exceeded the ${ceiling}-byte ceiling (R-23)`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

// Validate a hop is https, not an SSRF target, AND the single permitted OFF host.
// assertPublicHttpsUrl enforces the scheme + private/loopback/link-local block
// (reused, T-02-04-02); the host is then narrowed to world.openfoodfacts.org so a
// redirect can never escape to another origin (WR-02).
function assertOffUrl(rawUrl) {
  const parsed = assertPublicHttpsUrl(rawUrl);
  if (parsed.hostname.toLowerCase() !== OFF_HOSTNAME) {
    throw new Error(`Refusing to fetch a non-OFF host: ${parsed.hostname}`);
  }
  return parsed;
}

async function fetchOffProduct(barcode) {
  const startUrl =
    `${OFF_HOST}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(OFF_FIELDS)}`;

  // Follow redirects MANUALLY, re-running the https + SSRF + OFF-host guard on
  // EVERY hop (not just the first), capped at MAX_REDIRECTS. Node's default
  // redirect: "follow" would let an unexpected 3xx escape the stated host
  // constraint with no per-hop re-guard (WR-02).
  let current = startUrl;
  let res;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const parsed = assertOffUrl(current);
    res = await fetch(parsed, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel(); // discard the redirect-hop body before the next fetch (WR-02)
      current = new URL(location, parsed).toString();
      continue; // re-guard on the next iteration
    }
    break;
  }
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`OFF ${barcode}: redirect cap (${MAX_REDIRECTS}) exceeded`);
  }
  if (res.status === 404) {
    await res.body?.cancel(); // discard the unread 404 body (WR-02)
    return { found: false };
  }
  if (!res.ok) throw new Error(`OFF ${barcode}: HTTP ${res.status}`);
  const body = JSON.parse(await readCapped(res, BYTE_CEILING));
  if (!body || body.status === 0 || !body.product) return { found: false };
  return { found: true, product: body.product };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!existsSync(WORKLIST)) {
    console.error(`Ingestion failed: worklist not found at ${WORKLIST}.`);
    process.exit(1);
  }
  const worklist = JSON.parse(readFileSync(WORKLIST, "utf8"));
  const entries = worklist.barcodes;
  // A job that iterates an empty worklist is a false green.
  if (!Array.isArray(entries) || entries.length === 0) {
    console.error("Ingestion failed: the worklist carries no barcode entries (empty corpus).");
    process.exit(1);
  }

  mkdirSync(LEADS_DIR, { recursive: true });
  let written = 0;
  let missed = 0;
  let skipped = 0;

  for (const entry of entries) {
    const barcode = String(entry?.barcode ?? "").trim();
    if (barcode === "") {
      console.log(`skip: no barcode yet for productId "${entry?.productId ?? "?"}" (documented placeholder).`);
      skipped += 1;
      continue;
    }
    try {
      const result = await fetchOffProduct(barcode);
      if (!result.found) {
        console.log(`miss: ${barcode} not found on OFF.`);
        missed += 1;
      } else {
        const lead = offProductToLead(result.product, barcode, entry.productId, new Date());
        writeFileSync(join(LEADS_DIR, `${lead.leadId}.json`), `${JSON.stringify(lead, null, 2)}\n`);
        console.log(`lead: ${lead.leadId} (${lead.fields.length} field(s)).`);
        written += 1;
      }
    } catch (err) {
      console.error(`error: ${barcode}: ${err.message}`);
    }
    await sleep(REQ_DELAY_MS);
  }

  console.log(`Ingestion complete: ${written} lead(s) written, ${missed} miss(es), ${skipped} placeholder(s) skipped.`);
}

// Run only when invoked directly, so importing the pure mapping in the test
// never triggers a network job.
const invokedDirectly = resolve(process.argv[1] ?? "") === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
