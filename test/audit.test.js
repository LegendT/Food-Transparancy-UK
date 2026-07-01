// The re-verification audit (scripts/audit-verification.mjs) exposes a PURE core,
// buildAuditReport(facts, verdictMap, sourceRecords, today), so these tests pin
// its worst-first ordering, the counts-by-status table (with the VRFY-03
// in-review vs unverified split kept distinct), the citation-rot (R-18) and
// citation-staleness (R-07) queues, the future-date warning (R-25b), the
// OFF-derived (R-09) and authoritative (R-30) listings, the exposed last-verified
// date (VRFY-12), and the read-only guarantee (D-17). A separate integration test
// spawns the real script and asserts it leaves src/_data untouched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildAuditReport } from "../scripts/audit-verification.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(dir, "..");
const SCRIPT = resolve(ROOT, "scripts/audit-verification.mjs");
const DOCS_DIR = resolve(ROOT, "docs");

const TODAY = "2026-07-01";
const NOW_ISO = "2026-07-01T09:00:00Z";
const daysAgoISO = (n) => new Date(Date.UTC(2026, 6, 1) - n * 86400000).toISOString();

// The registry: a primary and a secondary (each its own lineage), a share-alike
// OFF source (R-09), a rotted citation (R-18) and a citation stale past the TTL (R-07).
const SOURCES = [
  { id: "prim-a", sourceType: "primary", derivedFrom: null, licence: { shareAlike: false } },
  { id: "sec-b", sourceType: "secondary", derivedFrom: null, licence: { shareAlike: false } },
  { id: "off", sourceType: "tertiary", derivedFrom: null, licence: { shareAlike: true } },
  { id: "rotted-src", sourceType: "secondary", derivedFrom: null, licence: { shareAlike: false } },
  { id: "stale-cite", sourceType: "secondary", derivedFrom: null, licence: { shareAlike: false } }
];

const cache = (verdict, checkedAt, over = {}) => ({ verdict, resolvedVia: "live", checkedAt, statusCode: 200, snapshotUrl: null, ...over });
const VERDICTS = {
  "prim-a": cache("RESOLVES", NOW_ISO),
  "sec-b": cache("RESOLVES", NOW_ISO),
  off: cache("RESOLVES", NOW_ISO),
  "rotted-src": cache("DOES_NOT_RESOLVE", NOW_ISO, { statusCode: 404 }),
  "stale-cite": cache("RESOLVES", daysAgoISO(200)) // 200 days > CITATION_TTL_DAYS (180)
};

// A confirming pass; the measure is shared so no divergence/mismatch. No default
// checkedValue is recorded, so these synthetic facts (whose values differ) do not
// trip the H3 confirms-contradict-value check; a case needing one passes it via `over`.
const cpass = (sourcesChecked, checkedOn, over = {}) => ({
  reviewerKind: "human",
  sourcesChecked,
  measure: { basis: "per-100g", state: "as-sold", unit: "g" },
  verdict: "confirms",
  checkedOn,
  ...over
});

const base = { confidence: "high", evidence: "high", updated: "2026-06-01" };

// One fact per derived state, plus the R-09/R-18/R-07/R-25b/R-30 carriers.
const P = {
  confirmed: "/products/confirmed/value",
  staleOld: "/products/stale-old/value",
  staleNew: "/products/stale-new/value",
  inReview: "/products/in-review/value",
  unverified: "/products/unverified/value",
  disagreement: "/products/disagreement/value",
  wrong: "/products/wrong/value"
};

const FACTS = [
  // published-confirmed: two confirms, two lineages, one primary, recent, resolving.
  { path: P.confirmed, entityType: "product", fact: { ...base, value: "56", sources: ["prim-a", "sec-b"], claimType: "corroborable",
    verification: { passes: [cpass(["prim-a"], "2026-06-01"), cpass(["sec-b"], "2026-06-01", { reviewerKind: "ai" })] } } },
  // published-stale (oldest lastVerified): sufficient but past the 24-month current threshold.
  { path: P.staleOld, entityType: "product", fact: { ...base, value: "40", sources: ["prim-a", "sec-b"], claimType: "corroborable",
    verification: { passes: [cpass(["prim-a"], "2022-03-15"), cpass(["sec-b"], "2022-03-15", { reviewerKind: "ai" })] } } },
  // published-stale (newer lastVerified): should sort AFTER stale-old.
  { path: P.staleNew, entityType: "product", fact: { ...base, value: "42", sources: ["prim-a", "sec-b"], claimType: "corroborable",
    verification: { passes: [cpass(["prim-a"], "2023-08-20"), cpass(["sec-b"], "2023-08-20", { reviewerKind: "ai" })] } } },
  // withheld-in-review: one below-the-bar confirms pass; also cites a rotted source (R-18).
  { path: P.inReview, entityType: "product", fact: { ...base, value: "x", sources: ["prim-a", "rotted-src"], claimType: "corroborable",
    verification: { passes: [cpass(["prim-a"], "2026-06-01")] } } },
  // withheld-unverified: zero passes; authoritative (R-30); cites OFF (R-09) and a TTL-stale citation (R-07).
  { path: P.unverified, entityType: "product", fact: { ...base, value: "y", sources: ["off", "stale-cite"], claimType: "authoritative",
    verification: { passes: [] } } },
  // withheld-open-disagreement: a disputes pass with a FUTURE checkedOn (R-25b data warning).
  { path: P.disagreement, entityType: "product", fact: { ...base, value: "z", sources: ["prim-a", "sec-b"], claimType: "corroborable",
    verification: { passes: [
      cpass(["prim-a"], "2026-06-01"),
      cpass(["sec-b"], "2026-06-01", { reviewerKind: "ai" }),
      { reviewerKind: "human", sourcesChecked: ["sec-b"], measure: { basis: "per-100g", state: "as-sold", unit: "g" }, checkedValue: "z", verdict: "disputes", checkedOn: "2027-01-01" }
    ] } } },
  // withheld-wrong: an editor marked it wrong; wins over everything (D-03).
  { path: P.wrong, entityType: "product", fact: { ...base, value: "w", sources: ["prim-a"], claimType: "authoritative",
    verification: { markedWrong: { note: "editor found it wrong", date: "2026-06-15" }, passes: [cpass(["prim-a"], "2026-06-01")] } } }
];

const report = () => buildAuditReport(FACTS, VERDICTS, SOURCES, TODAY);

// Extract the body of a `## heading` section (up to the next `## `).
function section(md, heading) {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const rest = md.slice(start + heading.length + 3);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

test("counts-by-status matches the constructed set and keeps in-review distinct from unverified (VRFY-03/VRFY-06)", () => {
  const { counts, markdown } = report();
  assert.equal(counts["published-confirmed"], 1);
  assert.equal(counts["published-stale"], 2);
  assert.equal(counts["withheld-in-review"], 1);
  assert.equal(counts["withheld-unverified"], 1);
  assert.equal(counts["withheld-open-disagreement"], 1);
  assert.equal(counts["withheld-wrong"], 1);
  assert.equal(counts["published-contested"], 0);
  // The two workflow states are NEVER merged into one row.
  assert.match(markdown, /\| withheld-in-review \| 1 \|/);
  assert.match(markdown, /\| withheld-unverified \| 1 \|/);
});

test("discrepancies are ordered worst-first: wrong, then open disagreement, then stale (VRFY-06)", () => {
  const { markdown } = report();
  const iWrong = markdown.indexOf("### Wrong");
  const iDisagreement = markdown.indexOf("### Open disagreement");
  const iStale = markdown.indexOf("### Stale");
  assert.ok(iWrong !== -1 && iDisagreement !== -1 && iStale !== -1);
  assert.ok(iWrong < iDisagreement, "wrong must precede open disagreement");
  assert.ok(iDisagreement < iStale, "open disagreement must precede stale");
});

test("within stale, the older last-verified appears first and each entry exposes its last-verified date (VRFY-12)", () => {
  const { markdown } = report();
  const iOld = markdown.indexOf(P.staleOld);
  const iNew = markdown.indexOf(P.staleNew);
  assert.ok(iOld !== -1 && iNew !== -1);
  assert.ok(iOld < iNew, "the oldest last-verified stale fact must appear first");
  const stale = section(markdown, "Discrepancies to approve");
  assert.ok(stale.includes("2022-03-15"), "stale-old exposes its last-verified date");
  assert.ok(stale.includes("2023-08-20"), "stale-new exposes its last-verified date");
});

test("a non-RESOLVES cached verdict surfaces its fact in 'Citations no longer resolving' (R-18)", () => {
  const rot = section(report().markdown, "Citations no longer resolving");
  assert.ok(rot.includes(P.inReview), "the fact citing the rotted source is listed");
  assert.ok(rot.includes("rotted-src") && rot.includes("DOES_NOT_RESOLVE"), "the source id and its verdict are named");
});

test("M6: a contested fact's position-only source with a non-RESOLVES verdict surfaces in the rot section", () => {
  // rotted-src is cited ONLY inside a contested position, never in fact.sources[].
  const facts = [{ path: "/products/contested/value", entityType: "product", fact: {
    ...base, value: null, sources: ["prim-a"], claimType: "corroborable",
    verification: {
      passes: [],
      adjudication: { outcome: "contested", note: "genuine dispute", date: "2026-06-01" },
      contested: { positions: [
        { value: "a", sources: ["prim-a"], note: "position a" },
        { value: "b", sources: ["rotted-src"], note: "position b cites a rotted source" }
      ] }
    }
  } }];
  const rot = section(buildAuditReport(facts, VERDICTS, SOURCES, TODAY).markdown, "Citations no longer resolving");
  assert.ok(rot.includes("rotted-src") && rot.includes("DOES_NOT_RESOLVE"),
    "a position-only rotted citation must appear in the rot section");
});

test("a checkedAt older than CITATION_TTL_DAYS is due for re-check, a fresh one is not (R-07)", () => {
  const due = section(report().markdown, "Citations due for re-check");
  assert.ok(due.includes("stale-cite"), "the TTL-stale citation is queued for re-check");
  assert.ok(!due.includes("prim-a"), "a fresh citation is NOT queued for re-check");
});

test("a future-dated pass surfaces in 'Data warnings' (R-25b)", () => {
  const warnings = section(report().markdown, "Data warnings");
  assert.ok(warnings.includes(P.disagreement), "the fact with a future checkedOn is warned");
  assert.ok(warnings.includes("2027-01-01"), "the offending future date is shown");
});

test("a share-alike-citing fact appears in 'OFF-derived facts' (R-09)", () => {
  const off = section(report().markdown, "OFF-derived facts");
  assert.ok(off.includes(P.unverified), "the fact citing the ODbL source is listed");
});

test("a dropped ODbL attribution link is flagged (R-09)", () => {
  // A promoted fact whose provenance names a share-alike source it no longer cites.
  const facts = [{ path: "/products/dropped/value", entityType: "product", fact: {
    ...base, value: "n", sources: ["prim-a"], claimType: "authoritative",
    provenance: { sourceRegistryId: "off" } // names OFF, but sources[] omits it
  } }];
  const off = section(buildAuditReport(facts, VERDICTS, SOURCES, TODAY).markdown, "OFF-derived facts");
  assert.ok(off.includes("Dropped ODbL attribution link"), "the lost-link flag fires");
  assert.ok(off.includes("/products/dropped/value"));
});

test("an authoritative-classed fact appears in the spot-check listing, as a listing only (R-30)", () => {
  const spot = section(report().markdown, "Authoritative classification spot-check");
  assert.ok(spot.includes(P.unverified), "the authoritative fact is listed for human review");
  assert.ok(/listing only/i.test(spot), "the section states it is a listing, never a verdict");
});

test("the reviewer-disagreements section lists the disputes fact", () => {
  const disagreements = section(report().markdown, "Reviewer disagreements");
  assert.ok(disagreements.includes(P.disagreement), "the disputes fact is flagged for extra scrutiny");
});

test("buildAuditReport returns a string and a counts object and performs no filesystem write (D-17)", () => {
  const before = readdirSync(DOCS_DIR).filter((n) => n.startsWith("DATA-AUDIT-"));
  const { markdown, counts } = buildAuditReport(FACTS, VERDICTS, SOURCES, TODAY);
  const after = readdirSync(DOCS_DIR).filter((n) => n.startsWith("DATA-AUDIT-"));
  assert.equal(typeof markdown, "string");
  assert.ok(markdown.length > 0);
  assert.equal(typeof counts, "object");
  // The pure core wrote nothing: the docs directory's audit files are unchanged.
  assert.deepEqual(before.sort(), after.sort());
});

test("a non-zero-fact audit is asserted: an empty corpus produces a total of zero, never a false green", () => {
  // buildAuditReport itself is pure over its input; the zero-fact GUARD lives in
  // the script's main(). Here we prove the report faithfully reflects an empty set.
  const { counts } = buildAuditReport([], VERDICTS, SOURCES, TODAY);
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 0);
});

test("integration: the real script runs read-only and leaves src/_data unchanged", () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /read-only report; no fact was mutated/);
  const porcelain = execFileSync("git", ["status", "--porcelain", "src/_data"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(porcelain.trim(), "", "the audit must not modify any file under src/_data");
});
