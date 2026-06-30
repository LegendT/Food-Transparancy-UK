// SPIKE-01 machine-verifiable assertions (SPIKE-01). The three product records
// dogfood the schema gate on real content, and the findings carry a dead-end
// rate that must be CONSISTENT with the attempts and the sourced count, not just
// present. Schemas are compiled once via the shared lib/validate.mjs compiler.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { compile } from "../lib/validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const readJson = (relative) => JSON.parse(readFileSync(resolve(root, relative), "utf8"));

const findings = readJson("docs/spike-findings.json");
const ajv = compile(resolve(root, "schemas"));
const validateProduct = ajv.getSchema("https://foodtransparency.uk/schemas/product.schema.json");
const validateFindings = ajv.getSchema("https://foodtransparency.uk/schemas/spike-findings.schema.json");

test("the findings validate against the spike-findings schema", () => {
  assert.ok(validateFindings(findings), JSON.stringify(validateFindings.errors));
});

test("exactly three sourced products, each with a recorded effort", () => {
  const sourced = findings.products.filter((product) => product.sourced);
  assert.equal(sourced.length, 3);
  for (const product of findings.products) {
    assert.ok(typeof product.effort === "string" && product.effort.trim().length > 0);
  }
});

test("an attempts denominator is present and not smaller than the sourced count", () => {
  assert.ok(Number.isInteger(findings.attempts) && findings.attempts >= 1);
  const sourcedCount = findings.products.filter((product) => product.sourced).length;
  assert.ok(findings.attempts >= sourcedCount);
});

test("the dead-end rate is consistent with attempts and outcomes", () => {
  const sourcedCount = findings.products.filter((product) => product.sourced).length;
  const expected = (findings.attempts - sourcedCount) / findings.attempts;
  assert.equal(findings.deadEndRate, expected);
});

test("the provisional re-derived corpus target and Tier A entry gate are recorded", () => {
  assert.ok(Number.isInteger(findings.rederived.corpusTarget));
  assert.ok(Number.isInteger(findings.rederived.tierAEntryGate));
  assert.equal(findings.rederived.provisional, true);
});

test("each spike product record validates against the product schema", () => {
  for (const name of ["spike-01", "spike-02", "spike-03"]) {
    const data = readJson(`src/_data/products/${name}.json`);
    assert.ok(validateProduct(data), `${name}: ${JSON.stringify(validateProduct.errors)}`);
  }
});
