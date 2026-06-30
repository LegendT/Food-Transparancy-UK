// Ajv structural validation over the fixture corpus. The valid fixtures prove
// the entity schemas accept a well-formed record; the invalid fixtures (added
// in Task 3) prove every structural gate rejects bad input. The gate is only
// real if its failure path is tested, not just its happy path.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { compile } from "../lib/validate.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const ajv = compile(resolve(dir, "../schemas"));
const schemaId = (name) => `https://foodtransparency.uk/schemas/${name}.schema.json`;
const load = (rel) => JSON.parse(readFileSync(resolve(dir, rel), "utf8"));

// Validate data against the named schema; return { ok, errors }.
function validate(name, data) {
  const validateFn = ajv.getSchema(schemaId(name));
  const ok = validateFn(data);
  return { ok, errors: validateFn.errors || [] };
}

test("a valid product fixture validates with zero Ajv errors", () => {
  const { ok, errors } = validate("product", load("fixtures/valid/product-valid.json"));
  assert.equal(ok, true, JSON.stringify(errors, null, 2));
  assert.equal(errors.length, 0);
});

test("a valid timeline fixture validates with zero Ajv errors", () => {
  const { ok, errors } = validate("timeline-event", load("fixtures/valid/timeline-valid.json"));
  assert.equal(ok, true, JSON.stringify(errors, null, 2));
  assert.equal(errors.length, 0);
});

// Each negative fixture below is rejected by the Ajv-level gate that owns its
// failure mode. The ranged-date ORDER fixture is deliberately absent here: Ajv
// cannot express to-not-earlier-than-from, so it is asserted against
// checkDateRanges in referential.test.js instead.

test("a fact missing provenance is rejected by Ajv (TRUST-05)", () => {
  const { ok, errors } = validate("sourced-value", load("fixtures/invalid/missing-provenance.json"));
  assert.equal(ok, false);
  assert.ok(errors.length > 0);
});

test("a corroborable fact with one source is rejected by Ajv (structural claim-type rule)", () => {
  const { ok, errors } = validate("sourced-value", load("fixtures/invalid/corroborable-one-source.json"));
  assert.equal(ok, false);
  assert.ok(errors.length > 0);
});

test("a structurally malformed ranged date is rejected by Ajv (DATA-03)", () => {
  const { ok, errors } = validate("date-value", load("fixtures/invalid/bad-ranged-date-structural.json"));
  assert.equal(ok, false);
  assert.ok(errors.length > 0);
});

test("an inference shaped like a SourcedValue is rejected by Ajv (DATA-04)", () => {
  const { ok, errors } = validate("timeline-event", load("fixtures/invalid/inference-as-sourcedvalue.json"));
  assert.equal(ok, false);
  assert.ok(errors.length > 0);
});

test("an allergen outside the fourteen is rejected by Ajv (DATA-07)", () => {
  const { ok, errors } = validate("product", load("fixtures/invalid/bad-allergen.json"));
  assert.equal(ok, false);
  assert.ok(errors.length > 0);
});

test("a malformed registry record is rejected by Ajv (DATA-01)", () => {
  const { ok, errors } = validate("source", load("fixtures/invalid/bad-source.json"));
  assert.equal(ok, false);
  assert.ok(errors.length > 0);
});
