// The cross-file gates JSON Schema cannot express: source-id resolution, the
// TRUST-06 jurisdiction rule, the imperative ranged-date order check, and
// OFF-derived tagging. The valid fixtures clear every check; the invalid
// fixtures (added in Task 3) each prove the gate that owns their failure mode.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
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
