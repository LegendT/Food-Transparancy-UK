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

// D-14 (INGR-02): an ingredient carrying an optional authorityPosition SourcedValue
// validates. The field is a bare $ref, deliberately NOT claimDomain regulatory, so
// it exercises the new property through the schema without any regulatory coupling.
test("an ingredient with an authorityPosition SourcedValue validates with zero Ajv errors (D-14)", () => {
  const { ok, errors } = validate("ingredient", load("fixtures/valid/ingredient-authority.json"));
  assert.equal(ok, true, JSON.stringify(errors, null, 2));
  assert.equal(errors.length, 0);
});

// D-15 (INGR-04): the optional product ingredients array is a plain-scalar id list.
// An item that breaks the id pattern (a space or uppercase) is rejected by Ajv, so a
// malformed cross-link reference can never enter the corpus.
test("a product with a badly-formed ingredients id is rejected by Ajv (D-15 pattern)", () => {
  const product = {
    id: "bad-ingredients-product",
    slug: "bad-ingredients-product",
    name: "Product With A Bad Ingredient Id",
    ingredients: ["Bad Id"],
  };
  const { ok, errors } = validate("product", product);
  assert.equal(ok, false);
  assert.ok(errors.length > 0);
});

// A3 (migration-safe): adding both optional fields must leave every existing record
// valid. Each shipped spike product carries NO ingredients field and must still pass,
// guarding the backward-compatibility claim against a future required-by-accident edit.
test("every existing spike product still validates unchanged after the additive fields (A3)", () => {
  for (const name of ["spike-01", "spike-02", "spike-03"]) {
    const { ok, errors } = validate("product", load(`../src/_data/products/${name}.json`));
    assert.equal(ok, true, `${name}: ${JSON.stringify(errors, null, 2)}`);
  }
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

// H1 (review round 3): a nutrition figure must be a non-negative NUMBER, so a
// string/negative/null cannot pass as a back-of-pack value and break comparison.
test("a string nutrition value is rejected by Ajv (H1: numeric integrity)", () => {
  const { ok, errors } = validate("product", load("fixtures/invalid/bad-nutrition-value.json"));
  assert.equal(ok, false);
  assert.ok(errors.some((e) => /must be number/.test(e.message)), JSON.stringify(errors));
});

// M1 (review round 3): the core value is "no claim without source, confidence,
// evidence and update date". Strip each required envelope field in turn and
// assert rejection, so a regression dropping any single one is caught.
test("each required provenance field is independently enforced (core value)", () => {
  const base = {
    value: "x", sources: ["off"], confidence: "high", evidence: "high",
    updated: "2026-06-30", claimType: "authoritative",
  };
  for (const field of Object.keys(base)) {
    const partial = { ...base };
    delete partial[field];
    const { ok } = validate("sourced-value", partial);
    assert.equal(ok, false, `removing "${field}" must fail validation`);
  }
});
