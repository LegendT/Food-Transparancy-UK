// PROD-04: the page-level Sources roll-up must gather citations from EVERY
// fact-bearing field on a product, deduplicated in first-seen order, or the
// "sources cited by the facts on this page" heading over-claims. These pin the
// pure collector so the completeness is not a fragile in-template concern.
import { test } from "node:test";
import assert from "node:assert/strict";
import { citedSourceIds } from "../lib/cited-sources.mjs";

test("collects citations from manufacturer, ingredientsText, nutrition and allergens", () => {
  const product = {
    manufacturer: { sources: ["companies-house"] },
    ingredientsText: { sources: ["off"] },
    nutrition: { sugars: { sources: ["fsa-nutrition"] } },
    allergens: [{ allergen: "milk", presence: "present", provenance: { sources: ["label-2024"] } }],
  };
  assert.deepEqual(citedSourceIds(product), ["companies-house", "off", "fsa-nutrition", "label-2024"]);
});

test("de-duplicates a source cited by several facts, keeping first-seen order", () => {
  const product = {
    manufacturer: { sources: ["off"] },
    ingredientsText: { sources: ["off"] },
    nutrition: { sugars: { sources: ["off"] } },
  };
  assert.deepEqual(citedSourceIds(product), ["off"]);
});

test("includes the sources of withheld facts (a withheld fact still cites its source)", () => {
  // No verification passes -> the fact renders withheld, but its citation is still
  // shown on the page and so belongs in the roll-up.
  const product = { manufacturer: { sources: ["gb-register"], verification: { passes: [] } } };
  assert.deepEqual(citedSourceIds(product), ["gb-register"]);
});

test("a product with no fact-bearing fields yields an empty list, and null is safe", () => {
  assert.deepEqual(citedSourceIds({}), []);
  assert.deepEqual(citedSourceIds(null), []);
  assert.deepEqual(citedSourceIds({ nutrition: {}, allergens: [] }), []);
});
