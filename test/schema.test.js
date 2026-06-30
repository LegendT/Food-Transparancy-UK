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
