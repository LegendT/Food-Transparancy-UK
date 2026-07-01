// Proof of the Phase 2 Wave 0 data contracts (plan 02-01): the inline
// verification shape validates against the SourcedValue envelope, and the
// derived-only status constraint (D-03/R-06) rejects any author-set
// publication status at BOTH the SourcedValue level and the entity level.
// Structural only: the pass-counting and gate logic arrive in later waves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { compile, validateDataset } from "../lib/validate.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(dir, rel), "utf8"));
const ajv = compile(resolve(dir, "../schemas"));

const SOURCED_VALUE = "https://foodtransparency.uk/schemas/sourced-value.schema.json";
const PRODUCT = "https://foodtransparency.uk/schemas/product.schema.json";

test("the verification-confirmed fixture validates against the SourcedValue envelope", () => {
  const data = load("fixtures/valid/verification-confirmed.json");
  const { errors } = validateDataset(ajv, [
    { path: "verification-confirmed", schemaId: SOURCED_VALUE, data }
  ]);
  assert.equal(errors.length, 0, errors.join("\n"));
});

test("an author-set SourcedValue-level publicationStatus is rejected by Ajv (D-03 derived-only)", () => {
  const data = { ...load("fixtures/valid/verification-confirmed.json"), publicationStatus: "published" };
  const { errors } = validateDataset(ajv, [
    { path: "sourcedvalue-status-set", schemaId: SOURCED_VALUE, data }
  ]);
  assert.ok(errors.length > 0, "Ajv must reject an author-set SourcedValue publicationStatus");
});

test("an author-set entity-level publicationStatus is rejected by the product schema (D-03/R-06)", () => {
  const data = load("fixtures/invalid/entity-status-set.json");
  const { errors } = validateDataset(ajv, [
    { path: "entity-status-set", schemaId: PRODUCT, data }
  ]);
  assert.ok(errors.length > 0, "Ajv must reject an author-set entity publicationStatus");
});
