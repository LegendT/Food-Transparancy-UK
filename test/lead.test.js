// Proves the OFF lead store's isolation invariants (D-19, VRFY-10):
//   (a) a produced lead validates against lead.schema.json and carries the off
//       registry link (R-09);
//   (b) the real validate-data.mjs gate walks its target only, so a SIBLING
//       ingestion/leads directory is invisible to it (exit 0, lead unreported);
//   (c) a SourcedValue-shaped file placed INSIDE the walked corpus is rejected
//       (belt-and-braces, D-19/C4);
//   (d) an off-revision-diff lead is pending and NOT a SourcedValue, so it can
//       never publish as a reformulation without an explicit human promotion.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "../lib/validate.mjs";
import { offProductToLead } from "../scripts/ingest-off.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = resolve(here, "../schemas");
const GATE = resolve(here, "../scripts/validate-data.mjs");
const LEAD_SCHEMA_ID = "https://foodtransparency.uk/schemas/lead.schema.json";
const load = (rel) => JSON.parse(readFileSync(resolve(here, rel), "utf8"));

const ajv = compile(SCHEMA_DIR);
const validateLead = ajv.getSchema(LEAD_SCHEMA_ID);

// A well-formed minimal corpus for the gate spawn tests.
const MINIMAL_SOURCES = {
  sources: [{
    id: "off", name: "Open Food Facts", publisher: "OFF", url: "https://world.openfoodfacts.org/",
    covers: "x", updateFrequency: "Continuous", retrievedDate: "2026-06-30",
    sourceType: "tertiary", jurisdiction: "international",
    licence: { id: "ODbL-1.0", url: "https://opendatacommons.org/licenses/odbl/1-0/", attributionRequired: true, shareAlike: true },
  }],
};
const VALID_FACT = {
  value: "demo", sources: ["off"], confidence: "high", evidence: "high",
  updated: "2026-06-30", claimType: "authoritative",
};

function hasSourcesKey(node) {
  if (Array.isArray(node)) return node.some(hasSourcesKey);
  if (node && typeof node === "object") {
    if ("sources" in node) return true;
    return Object.values(node).some(hasSourcesKey);
  }
  return false;
}

function sampleLead() {
  const sample = load("fixtures/valid/off-response.sample.json");
  return offProductToLead(sample.product, sample.code, "nutella", new Date("2026-07-01T09:00:00Z"));
}

test("a produced lead validates against lead.schema.json and carries the off registry link", () => {
  const lead = sampleLead();
  const ok = validateLead(lead);
  assert.equal(ok, true, JSON.stringify(validateLead.errors));
  assert.equal(lead.provenance.sourceRegistryId, "off"); // R-09
});

test("the gate walks its target only: a sibling ingestion/leads directory is invisible", () => {
  const root = mkdtempSync(join(tmpdir(), "lead-"));
  try {
    const corpus = join(root, "corpus");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "sources.json"), JSON.stringify(MINIMAL_SOURCES));
    writeFileSync(join(corpus, "demoFact.json"), JSON.stringify(VALID_FACT));

    // The lead store is a SIBLING of the walked corpus, mirroring ingestion/leads
    // sitting outside src/_data in the real tree.
    const leadsDir = join(root, "ingestion", "leads");
    mkdirSync(leadsDir, { recursive: true });
    const lead = sampleLead();
    writeFileSync(join(leadsDir, `${lead.leadId}.json`), JSON.stringify(lead));

    const r = spawnSync(process.execPath, [GATE, corpus], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!`${r.stdout}${r.stderr}`.includes(lead.leadId), "the gate never reports the isolated lead");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a SourcedValue-shaped file inside the walked corpus is rejected (belt-and-braces)", () => {
  const dir = mkdtempSync(join(tmpdir(), "lead-"));
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify(MINIMAL_SOURCES));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(VALID_FACT));
    // The 02-01 anti-example: a draft wrongly shaped as a fact (it carries a
    // sources array), placed where the corpus-escape guard walks it.
    const strayLead = load("fixtures/invalid/sourcedvalue-shaped-lead.json");
    writeFileSync(join(dir, "stray-lead.json"), JSON.stringify(strayLead));

    const r = spawnSync(process.execPath, [GATE, dir], { encoding: "utf8" });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /outside the validated corpus|fact-shaped/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an off-revision-diff lead is pending, not a SourcedValue, and cannot publish without human promotion (VRFY-10)", () => {
  const diffLead = {
    leadId: "off-3017620422003-diff-r30-r31",
    leadType: "off-revision-diff",
    barcode: "3017620422003",
    capturedAt: "2026-07-01",
    offRevision: 31,
    provenance: {
      dataset: "open-food-facts",
      sourceRegistryId: "off",
      licence: "ODbL-1.0",
      url: "https://world.openfoodfacts.org/product/3017620422003",
      retrievedAt: "2026-07-01T09:00:00.000Z",
    },
    fields: [
      { path: "nutrition.sugars", offField: "sugars_100g", value: 57.0, measure: { basis: "per-100g", state: "as-sold" }, offRevision: 31 },
    ],
    promotion: { status: "pending", note: "", promotedTo: null, by: null, date: null },
    revisionDiff: { fromRev: 30, toRev: 31, changedFields: ["nutrition.sugars"] },
  };

  const ok = validateLead(diffLead);
  assert.equal(ok, true, JSON.stringify(validateLead.errors));
  assert.equal(diffLead.leadType, "off-revision-diff");
  assert.equal(diffLead.promotion.status, "pending", "a revision-diff lead is never auto-published");
  assert.equal(diffLead.revisionDiff.fromRev, 30);
  assert.equal(diffLead.revisionDiff.toRev, 31);
  // The structural never-publish guarantee: it is not a SourcedValue, so it can
  // never render or satisfy the verification gate until a human promotion mints
  // a real fact from it (VRFY-10, D-19).
  assert.equal(hasSourcesKey(diffLead), false, "an off-revision-diff lead never carries a sources key");
});
