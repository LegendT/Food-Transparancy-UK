// The cross-file gates JSON Schema cannot express: source-id resolution, the
// TRUST-06 jurisdiction rule, the imperative ranged-date order check, and
// OFF-derived tagging. The valid fixtures clear every check; the invalid
// fixtures (added in Task 3) each prove the gate that owns their failure mode.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { compile, validateDataset } from "../lib/validate.mjs";
import {
  collectFacts,
  collectDateRanges,
  checkReferences,
  checkRegulatoryJurisdiction,
  checkDateRanges,
  listOffDerived
} from "../lib/referential.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(dir, rel), "utf8"));
const registry = load("../src/_data/sources.json").sources;
const SCRIPT = resolve(dir, "../scripts/validate-data.mjs");
const DATE_VALUE = "https://foodtransparency.uk/schemas/date-value.schema.json";

test("the valid product fixture clears source resolution and the TRUST-06 rule", () => {
  const facts = collectFacts(load("fixtures/valid/product-valid.json"));
  assert.equal(checkReferences(facts, registry).errors.length, 0);
  assert.equal(checkRegulatoryJurisdiction(facts, registry).errors.length, 0);
});

test("the valid timeline fixture clears source resolution and the date-range order check", () => {
  const data = load("fixtures/valid/timeline-valid.json");
  const facts = collectFacts(data);
  const ranges = collectDateRanges(data);
  assert.equal(checkReferences(facts, registry).errors.length, 0);
  assert.equal(checkDateRanges(ranges).errors.length, 0);
});

test("OFF-derived facts are listed for the ODbL share-alike audit", () => {
  const facts = collectFacts(load("fixtures/valid/product-valid.json"));
  const offDerived = listOffDerived(facts, registry);
  assert.ok(offDerived.length > 0, "product-valid cites the OFF source and must be tagged OFF-derived");
});

// Negative fixtures: each is rejected by the imperative gate that owns it.

test("a fact citing an unknown source id is rejected by checkReferences (DATA-01)", () => {
  const facts = collectFacts(load("fixtures/invalid/unknown-source-id.json"));
  assert.ok(checkReferences(facts, registry).errors.length > 0);
});

test("a regulatory fact citing only a non-GB source is rejected by checkRegulatoryJurisdiction (TRUST-06)", () => {
  const facts = collectFacts(load("fixtures/invalid/regulatory-non-gb.json"));
  assert.ok(checkRegulatoryJurisdiction(facts, registry).errors.length > 0);
});

test("a to-earlier-than-from range passes Ajv but is rejected by checkDateRanges (DATA-03)", () => {
  const data = load("fixtures/invalid/bad-ranged-date-order.json");
  // Proof of the division of labour: Ajv cannot express the order rule, so the
  // structurally-valid range validates clean at the schema level...
  const ajv = compile(resolve(dir, "../schemas"));
  const { errors: ajvErrors } = validateDataset(ajv, [
    { path: "bad-ranged-date-order", schemaId: DATE_VALUE, data }
  ]);
  assert.equal(ajvErrors.length, 0, "Ajv must not be relied on for the order check");
  // ...and only the imperative gate catches it.
  assert.ok(checkDateRanges(collectDateRanges(data)).errors.length > 0);
});

test("the script exits non-zero on an invalid fixture, failing the build", () => {
  const work = mkdtempSync(resolve(tmpdir(), "ft-invalid-"));
  try {
    // A bare SourcedValue missing its provenance, seeded as the corpus.
    writeFileSync(
      resolve(work, "demoFact.json"),
      readFileSync(resolve(dir, "fixtures/invalid/missing-provenance.json"))
    );
    assert.throws(() => execFileSync(process.execPath, [SCRIPT, work], { stdio: "pipe" }));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test("the script exits non-zero on an empty corpus (the non-zero-corpus guard)", () => {
  const work = mkdtempSync(resolve(tmpdir(), "ft-empty-"));
  try {
    assert.throws(() => execFileSync(process.execPath, [SCRIPT, work], { stdio: "pipe" }));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
