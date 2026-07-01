#!/usr/bin/env node
// The re-verification AUDIT command (VRFY-05/06/09/12): a STANDALONE, READ-ONLY
// report generator. It walks the corpus, derives each fact's publication state
// and staleness class via lib/verification.mjs, reads the committed offline
// existence-verdict cache, and emits a dated, worst-first triage document
// modelled on DEBT's docs/DATA-AUDIT.md.
//
// It is NOT in the prebuild chain and it NEVER adjudicates: it writes ONLY under
// docs/, never under src/_data, and never mutates a value or a verdict. The human
// adjudicates by editing the fact inline (D-04/D-17); this document is the
// read-only surface that tells the human WHICH facts to look at, worst first. The
// R-30 authoritative-classification hint and the R-09 ODbL flag are LISTINGS,
// never automated verdicts (D-17/D-18).
//
// It performs NO network fetch: like the gate, it only READS the diffable
// .cache/citation-verdicts.json (absent = every citation UNCHECKED). It surfaces
// the two things a fact-state-only table hides: citations that have ROTTED (a
// cached non-RESOLVES verdict, R-18) and citations whose existence check is
// itself STALE past the shared CITATION_TTL_DAYS (R-07), so re-verification of
// BOTH facts and citations becomes a generated queue, not a good intention.
//
// A zero-fact audit is a false green, so the script asserts a non-zero corpus.
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { collectFacts, listOffDerived } from "../lib/referential.mjs";
import {
  deriveVerificationState,
  classifyStaleness,
  lastVerified,
  checkMeasureMismatch,
  checkValueDivergence,
  CITATION_TTL_DAYS
} from "../lib/verification.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "../src/_data");
const DEFAULT_DOCS_DIR = resolve(here, "../docs");
const CACHE_FILE = process.env.CITATION_VERDICTS_CACHE
  ? resolve(process.env.CITATION_VERDICTS_CACHE)
  : resolve(here, "../.cache/citation-verdicts.json");

// The same entity-directory allowlist the validation gate walks, carrying the
// entityType so classifyStaleness can tell a timeline (historical) fact apart
// from a current one (D-16/R-17).
const ENTITY_DIRS = [
  ["products", "product"],
  ["ingredients", "ingredient"],
  ["brands", "brand"],
  ["additives", "additive"],
  ["timeline", "timeline-event"]
];

const STATE_ORDER = [
  "published-confirmed", "published-contested", "published-stale",
  "withheld-unverified", "withheld-in-review", "withheld-open-disagreement", "withheld-wrong"
];

// ---- pure helpers (no fs, no network) -------------------------------------

const confirmsOf = (fact) => (fact.verification?.passes ?? []).filter((p) => p.verdict === "confirms");

// Whole-day age of a cached verdict's checkedAt relative to `today`. A negative
// age (checkedAt after today) counts as fresh, never due. A missing/unparseable
// date is treated as infinitely old so it surfaces rather than hides.
function ageDays(checkedAt, today) {
  const checked = Date.parse(checkedAt);
  const now = Date.parse(`${today.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(checked) || Number.isNaN(now)) return Infinity;
  return (now - checked) / 86400000;
}

// A compact, human-readable rendering of a fact's current stored value.
function renderValue(value) {
  if (value === null || value === undefined) return "null (withheld or contested)";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

// The recorded structured measures and pass verdicts a reviewer needs to judge a
// discrepancy without opening the file (the DEBT per-figure "Measure" line).
function passEvidence(fact) {
  const passes = fact.verification?.passes ?? [];
  if (passes.length === 0) return { measures: "none recorded", verdicts: "none recorded" };
  const verdicts = passes.map((p) => `${p.reviewerKind}:${p.verdict}`).join(", ");
  const measures = [...new Set(passes.map((p) => JSON.stringify(p.measure ?? null)))].join("; ");
  return { measures, verdicts };
}

// buildAuditReport: the PURE core. Maps the corpus to { markdown, counts } with
// no file IO, so the test can assert ordering, counts and read-only behaviour by
// calling it directly. `facts` is [{ path, fact, entityType }]; `verdictMap` is a
// Map or plain object keyed by source id (the 02-01 SEAM shape); `sourceRecords`
// is the registry array; `today` is a YYYY-MM-DD string.
export function buildAuditReport(facts, verdictMap, sourceRecords, today) {
  const existence = verdictMap instanceof Map ? verdictMap : new Map(Object.entries(verdictMap ?? {}));
  const sourcesById = new Map(sourceRecords.map((s) => [s.id, s]));
  const shareAlikeIds = new Set(
    sourceRecords.filter((s) => s.licence?.shareAlike === true).map((s) => s.id)
  );

  // Derive every fact's state and staleness once.
  const derived = facts.map(({ path, fact, entityType }) => {
    const { state, reasons } = deriveVerificationState(fact, sourcesById, existence, today, entityType);
    return {
      path, fact, entityType, state, reasons,
      lastVerified: lastVerified(confirmsOf(fact)),
      stalenessClass: classifyStaleness(fact, entityType)
    };
  });

  const counts = Object.fromEntries(STATE_ORDER.map((s) => [s, 0]));
  for (const d of derived) counts[d.state] = (counts[d.state] ?? 0) + 1;

  const wrong = derived.filter((d) => d.state === "withheld-wrong");
  const disagreement = derived.filter((d) => d.state === "withheld-open-disagreement");
  // Stale sorts oldest lastVerified first (an empty lastVerified sorts first).
  const stale = derived
    .filter((d) => d.state === "published-stale")
    .sort((a, b) => (a.lastVerified < b.lastVerified ? -1 : a.lastVerified > b.lastVerified ? 1 : 0));

  const lines = [];
  const p = (s = "") => lines.push(s);

  p("# Food Transparency Data Verification Audit");
  p("");
  p(`**Date:** ${today}`);
  p("");
  p("This is a READ-ONLY triage record. No value or verdict was changed. It lists");
  p("every fact's derived publication state worst-first, plus the citation-rot and");
  p("citation-staleness queues, so re-verification is a generated queue. A human");
  p("adjudicates by editing the fact inline (D-17: AI never adjudicates).");
  p("");

  // ---- Counts by status (the VRFY-03 workflow split is never merged) ----
  p("## Counts by status");
  p("");
  p("| Status | Count |");
  p("| --- | ---: |");
  for (const state of STATE_ORDER) p(`| ${state} | ${counts[state]} |`);
  p(`| **Total** | **${derived.length}** |`);
  p("");

  // ---- Discrepancies to approve (worst-first: wrong -> disagreement -> stale) ----
  p("## Discrepancies to approve");
  p("");
  p("Ordered worst-first: withheld-wrong, then withheld-open-disagreement, then");
  p("published-stale (oldest last-verified first).");
  p("");

  const discrepancyEntry = (d) => {
    const { measures, verdicts } = passEvidence(d.fact);
    p(`#### ${d.path}`);
    p(`- **Current value:** ${renderValue(d.fact.value)}`);
    p(`- **Recorded measure:** ${measures}`);
    p(`- **Recorded pass verdicts:** ${verdicts}`);
    p(`- **Last verified:** ${d.lastVerified || "none"}`);
    p(`- **Reason:** ${d.reasons.join("; ")}`);
    p("");
  };

  p(`### Wrong (${wrong.length})`);
  p("");
  if (wrong.length === 0) p("None.\n");
  else wrong.forEach(discrepancyEntry);

  p(`### Open disagreement (${disagreement.length})`);
  p("");
  if (disagreement.length === 0) p("None.\n");
  else disagreement.forEach(discrepancyEntry);

  p(`### Stale (${stale.length})`);
  p("");
  if (stale.length === 0) p("None.\n");
  else stale.forEach(discrepancyEntry);

  // ---- Citations no longer resolving (R-18): rotted, previously-passing links ----
  const rotted = [];
  const dueForRecheck = [];
  for (const { path, fact } of facts) {
    for (const id of fact.sources ?? []) {
      const entry = existence.get(id);
      if (!entry) continue;
      if (entry.verdict && entry.verdict !== "RESOLVES") {
        rotted.push({ path, id, verdict: entry.verdict });
      }
      if (entry.checkedAt && ageDays(entry.checkedAt, today) > CITATION_TTL_DAYS) {
        dueForRecheck.push({ path, id, checkedAt: entry.checkedAt, age: Math.floor(ageDays(entry.checkedAt, today)) });
      }
    }
  }

  p("## Citations no longer resolving");
  p("");
  p("Facts whose cited source has a non-RESOLVES cached verdict (a citation that");
  p("has rotted since it last passed, R-18/VRFY-05).");
  p("");
  if (rotted.length === 0) p("None.\n");
  else {
    p("| Fact | Source id | Cached verdict |");
    p("| --- | --- | --- |");
    for (const r of rotted) p(`| ${r.path} | ${r.id} | ${r.verdict} |`);
    p("");
  }

  // ---- Citations due for re-check (R-07): the citation-staleness queue ----
  p("## Citations due for re-check");
  p("");
  p(`Cited sources whose cached existence check is older than CITATION_TTL_DAYS (${CITATION_TTL_DAYS} days),`);
  p("so the verdict is treated as UNCHECKED until re-verified (R-07).");
  p("");
  if (dueForRecheck.length === 0) p("None.\n");
  else {
    p("| Fact | Source id | Checked at | Age (days) |");
    p("| --- | --- | --- | ---: |");
    for (const d of dueForRecheck) p(`| ${d.path} | ${d.id} | ${d.checkedAt} | ${d.age} |`);
    p("");
  }

  // ---- Data warnings (R-25b): any pass or lastVerified dated in the future ----
  const dataWarnings = [];
  for (const d of derived) {
    for (const pass of d.fact.verification?.passes ?? []) {
      if (pass.checkedOn && pass.checkedOn.slice(0, 10) > today) {
        dataWarnings.push(`${d.path}: a ${pass.reviewerKind} pass has a future checkedOn (${pass.checkedOn})`);
      }
    }
    if (d.lastVerified && d.lastVerified.slice(0, 10) > today) {
      dataWarnings.push(`${d.path}: lastVerified (${d.lastVerified}) is in the future`);
    }
  }

  p("## Data warnings");
  p("");
  p("A pass checkedOn or a lastVerified dated after today would otherwise read as");
  p("permanently fresh, hiding an unverified fact (R-25b).");
  p("");
  if (dataWarnings.length === 0) p("None.\n");
  else {
    for (const w of dataWarnings) p(`- ${w}`);
    p("");
  }

  // ---- OFF-derived facts (ODbL): share-alike obligation + dropped-link flag ----
  const offDerived = listOffDerived(facts, sourceRecords);
  const lostLink = [];
  for (const { path, fact } of facts) {
    const registryId = fact.provenance?.sourceRegistryId;
    if (registryId && shareAlikeIds.has(registryId) && !(fact.sources ?? []).includes(registryId)) {
      lostLink.push({ path, registryId });
    }
  }

  p("## OFF-derived facts (ODbL)");
  p("");
  p("Facts citing a share-alike (ODbL) source carry the attribution and share-alike");
  p("obligation. A promoted fact that carries a lead provenance link but no longer");
  p("cites the source id has DROPPED its ODbL attribution and is flagged (R-09).");
  p("");
  if (offDerived.length === 0) p("No OFF-derived facts.\n");
  else {
    p(`Share-alike-citing facts (${offDerived.length}):`);
    for (const path of offDerived) p(`- ${path}`);
    p("");
  }
  if (lostLink.length > 0) {
    p("Dropped ODbL attribution link (promotion provenance names a share-alike source the fact no longer cites):");
    for (const l of lostLink) p(`- ${l.path}: provenance names "${l.registryId}" but sources[] omits it`);
    p("");
  }

  // ---- Authoritative classification spot-check (R-30): a LISTING, never a verdict ----
  const authoritative = derived.filter((d) => d.fact.claimType === "authoritative");
  p("## Authoritative classification spot-check");
  p("");
  p("Authoritative-classed facts listed for periodic HUMAN review that they are not");
  p("really corroborable claims taking the weaker bar (R-30). This is a listing only;");
  p("claimType is author-self-classified and no automated verdict is made (D-17/D-18).");
  p("");
  if (authoritative.length === 0) p("None.\n");
  else {
    for (const d of authoritative) p(`- ${d.path} (${d.stalenessClass})`);
    p("");
  }

  // ---- Reviewer disagreements: disputes pass or a measure mismatch ----
  const disagreements = [];
  for (const { path, fact } of facts) {
    const passes = fact.verification?.passes ?? [];
    const hasDisputes = passes.some((p) => p.verdict === "disputes");
    const confirms = confirmsOf(fact);
    const measureConflict = checkMeasureMismatch(confirms) || checkValueDivergence(confirms);
    if (hasDisputes || measureConflict) {
      const nature = hasDisputes ? "a disputes pass verdict" : "a measure or value mismatch across confirming passes";
      disagreements.push({ path, nature });
    }
  }

  p("## Reviewer disagreements - flag for extra human scrutiny");
  p("");
  p("Facts carrying a disputes pass verdict or a measure mismatch. Treat as the");
  p("highest-priority items for human judgement.");
  p("");
  if (disagreements.length === 0) p("None.\n");
  else {
    p("| Fact | Nature of disagreement |");
    p("| --- | --- |");
    for (const d of disagreements) p(`| ${d.path} | ${d.nature} |`);
    p("");
  }

  return { markdown: lines.join("\n"), counts };
}

// ---- corpus walk + emit (the only IO, guarded so import is side-effect free) ----

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const isDir = (path) => existsSync(path) && statSync(path).isDirectory();

function jsonFilesIn(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsonFilesIn(full));
    else if (entry.name.endsWith(".json")) out.push(full);
  }
  return out;
}

// Gather every fact from the target data dir, threading the entityType.
function gatherFacts(dataDir) {
  const facts = [];
  for (const [sub, name] of ENTITY_DIRS) {
    const subDir = join(dataDir, sub);
    if (!isDir(subDir)) continue;
    for (const path of jsonFilesIn(subDir)) {
      const data = readJson(path);
      for (const f of collectFacts(data, path)) facts.push({ ...f, entityType: name });
    }
  }
  const demo = join(dataDir, "demoFact.json");
  if (existsSync(demo)) {
    for (const f of collectFacts(readJson(demo), demo)) facts.push({ ...f, entityType: null });
  }
  return facts;
}

function main() {
  const dataDir = resolve(process.argv[2] || DEFAULT_DATA_DIR);
  const sourcesPath = join(dataDir, "sources.json");
  const sourceRecords = existsSync(sourcesPath)
    ? (Array.isArray(readJson(sourcesPath).sources) ? readJson(sourcesPath).sources : [])
    : [];

  const facts = gatherFacts(dataDir);
  if (facts.length === 0) {
    console.error(`Audit failed: no fact-bearing values found under ${dataDir} (a zero-fact audit is a false green).`);
    process.exit(1);
  }

  const verdictMap = existsSync(CACHE_FILE) ? readJson(CACHE_FILE) : {};
  const today = new Date().toISOString().slice(0, 10);
  const { markdown, counts } = buildAuditReport(facts, verdictMap, sourceRecords, today);

  if (!existsSync(DEFAULT_DOCS_DIR)) mkdirSync(DEFAULT_DOCS_DIR, { recursive: true });
  const outPath = join(DEFAULT_DOCS_DIR, `DATA-AUDIT-${today}.md`);
  writeFileSync(outPath, `${markdown}\n`, "utf8");

  console.log(`Audited ${facts.length} fact(s) over ${sourceRecords.length} registry source(s).`);
  console.log(`Derived states: ${STATE_ORDER.map((s) => `${s}=${counts[s]}`).join(" ")}`);
  console.log(`Wrote ${outPath} (read-only report; no fact was mutated).`);
}

// Run only when invoked directly, never on import (the test imports the pure core).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
