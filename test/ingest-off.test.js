// OFFLINE unit test for the OFF-to-lead mapping (DATA-06, R-24). No network:
// it calls the exported pure offProductToLead() against the captured OFF sample
// (created in 02-01) and against inline product objects that exercise the
// per-serving and no-measure branches. The mapping must read the ACTUAL OFF
// suffix, never assume per-100g.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { offProductToLead } from "../scripts/ingest-off.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(here, rel), "utf8"));

// Deep check: a lead must never carry a key named `sources` at any level (D-19).
function hasSourcesKey(node) {
  if (Array.isArray(node)) return node.some(hasSourcesKey);
  if (node && typeof node === "object") {
    if ("sources" in node) return true;
    return Object.values(node).some(hasSourcesKey);
  }
  return false;
}

test("the captured OFF sample maps to an off-import lead with the per-100g basis", () => {
  const sample = load("fixtures/valid/off-response.sample.json");
  const lead = offProductToLead(sample.product, sample.code, "nutella", new Date("2026-07-01T09:00:00Z"));

  assert.equal(lead.leadType, "off-import");
  assert.equal(lead.offRevision, sample.product.rev);
  assert.equal(lead.promotion.status, "pending");
  assert.equal(lead.provenance.sourceRegistryId, "off"); // R-09: the ODbL promotion link.

  const ingredients = lead.fields.find((f) => f.path === "ingredientsText");
  assert.ok(ingredients, "a lead field records ingredientsText");
  assert.equal(ingredients.offField, "ingredients_text");

  // The sample carries both sugars_100g and sugars_serving; _100g takes precedence.
  const sugars = lead.fields.find((f) => f.offField === "sugars_100g");
  assert.ok(sugars, "a nutriment field is read from the *_100g suffix");
  assert.equal(sugars.measure.basis, "per-100g"); // DATA-06 / R-24
  assert.equal(sugars.measure.state, "as-sold");

  assert.equal(hasSourcesKey(lead), false, "a lead never uses the key sources (D-19)");
});

test("a per-serving-only OFF product yields the per-serving basis (R-24)", () => {
  const product = {
    rev: 5,
    nutrition_data_per: "serving",
    nutriments: { salt_serving: 0.12, salt_unit: "g" },
  };
  const lead = offProductToLead(product, "1111111111111", "x", new Date("2026-07-01T09:00:00Z"));
  const salt = lead.fields.find((f) => f.offField === "salt_serving");
  assert.ok(salt, "the per-serving nutriment is read from the *_serving suffix");
  assert.equal(salt.measure.basis, "per-serving");
  assert.equal(hasSourcesKey(lead), false);
});

test("L9: a stringified-number nutriment is coerced and kept, not silently dropped", () => {
  const product = {
    rev: 7,
    nutrition_data_per: "100g",
    nutriments: { sugars_100g: "4.16", salt_100g: "", fat_100g: "not-a-number" },
  };
  const lead = offProductToLead(product, "3333333333333", "z", new Date("2026-07-01T09:00:00Z"));
  const sugars = lead.fields.find((f) => f.offField === "sugars_100g");
  assert.ok(sugars, "a stringified-number nutriment becomes a field");
  assert.equal(sugars.value, 4.16, "the string is coerced to a finite number");
  assert.equal(sugars.measure.basis, "per-100g");
  // An empty string and a non-numeric string are dropped, never coerced to 0/NaN.
  assert.equal(lead.fields.find((f) => f.path === "nutrition.salt"), undefined);
  assert.equal(lead.fields.find((f) => f.path === "nutrition.fat"), undefined);
});

test("a suffix-less nutriment is recorded with no measure (R-24)", () => {
  const product = {
    rev: 6,
    nutriments: { sodium: 0.1 },
  };
  const lead = offProductToLead(product, "2222222222222", "y", new Date("2026-07-01T09:00:00Z"));
  const sodium = lead.fields.find((f) => f.path === "nutrition.sodium");
  assert.ok(sodium, "the suffix-less nutriment is still recorded as a field");
  assert.equal(sodium.measure, undefined, "no measure is invented; a promotion supplies one");
});
