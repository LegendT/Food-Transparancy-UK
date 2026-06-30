/*
 * Schema-consistency guard (DATA-09 plus vocabulary sync). This test guards the
 * fact-bearing-field designation and the controlled vocabularies that the entity
 * schemas, meta.json and allergens.json must keep in lockstep. It reads pure JSON
 * (no Ajv needed) so a field quietly modelled as a bare scalar, an allergen
 * vocabulary drift, a GRADE-key drift, or an unsatisfiable claimDomain const all
 * fail the build loudly.
 *
 * British English throughout. The regulatory schema branch deliberately does NOT
 * enforce checkedOn: Ajv cannot express the cross-source GB rule. The imperative
 * checkRegulatoryJurisdiction in plan 01-05 owns TRUST-06 (GB source plus
 * checkedOn) and must run.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const loadSchema = (name) => JSON.parse(readFileSync(resolve(dir, "../schemas", name), "utf8"));
const loadData = (name) => JSON.parse(readFileSync(resolve(dir, "../src/_data", name), "utf8"));

const ENVELOPE_REF = "sourced-value.schema.json";

const product = loadSchema("product.schema.json");
const ingredient = loadSchema("ingredient.schema.json");
const additive = loadSchema("additive.schema.json");
const timelineEvent = loadSchema("timeline-event.schema.json");
const sourcedValue = loadSchema("sourced-value.schema.json");

const allergens = loadData("allergens.json");
const meta = loadData("meta.json");

const sortedEqual = (a, b) => {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
};

// A field resolves to the SourcedValue envelope if it is a direct $ref to the
// envelope, an allOf with a branch that resolves to the envelope, or a local
// $ref to a #/$defs/ entry that itself resolves to the envelope (e.g. the
// nutritionValue $def, which composes the envelope with a numeric value bound).
const resolvesToEnvelope = (node, schema) => {
  if (!node || typeof node !== "object") return false;
  if (node.$ref === ENVELOPE_REF) return true;
  if (typeof node.$ref === "string" && node.$ref.startsWith("#/$defs/") && schema) {
    const def = (schema.$defs || {})[node.$ref.slice("#/$defs/".length)];
    return resolvesToEnvelope(def, schema);
  }
  if (Array.isArray(node.allOf)) {
    return node.allOf.some((branch) => resolvesToEnvelope(branch, schema));
  }
  return false;
};

// Recursively collect every claimDomain.const value declared anywhere in a schema.
const collectClaimDomainConsts = (node, acc = []) => {
  if (Array.isArray(node)) {
    for (const item of node) collectClaimDomainConsts(item, acc);
    return acc;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "claimDomain" && value && typeof value === "object" && "const" in value) {
        acc.push(value.const);
      }
      collectClaimDomainConsts(value, acc);
    }
  }
  return acc;
};

test("(a) every enumerated fact-bearing field resolves to the SourcedValue envelope", () => {
  const cases = [
    ["product", product.properties.manufacturer, product],
    ["product", product.properties.ingredientsText, product],
    ["product", product.properties.regulatoryStatus, product],
    ["ingredient", ingredient.properties.functionDescription, ingredient],
    ["ingredient", ingredient.properties.regulatoryStatus, ingredient],
    ["additive", additive.properties.function, additive],
    ["additive", additive.properties.regulatoryStatus, additive],
  ];

  // Every nutrition figure is fact-bearing too (via the nutritionValue $def).
  for (const [figure, node] of Object.entries(product.properties.nutrition.properties)) {
    cases.push([`product.nutrition.${figure}`, node, product]);
  }

  for (const [label, node, schema] of cases) {
    assert.ok(
      resolvesToEnvelope(node, schema),
      `${label} does not resolve to the SourcedValue envelope ($ref ${ENVELOPE_REF})`,
    );
  }
});

test("(a) the product allergen item nests its provenance under a provenance $ref", () => {
  const item = product.properties.allergens.items;
  assert.equal(
    item.properties.provenance.$ref,
    ENVELOPE_REF,
    "the allergen item must nest its provenance under a provenance $ref, not spread the envelope",
  );
});

test("(b) the product allergen enum equals the allergens.json id set", () => {
  const schemaEnum = product.properties.allergens.items.properties.allergen.enum;
  const vocabularyIds = allergens.allergens.map((a) => a.id);
  assert.ok(
    sortedEqual(schemaEnum, vocabularyIds),
    `the product allergen enum and src/_data/allergens.json have drifted.\nschema: ${[...schemaEnum].sort()}\nvocab:  ${[...vocabularyIds].sort()}`,
  );
});

test("(c) the meta confidence and evidence key sets equal the GRADE enum", () => {
  const grade = sourcedValue.$defs.grade.enum;
  assert.ok(
    sortedEqual(Object.keys(meta.confidenceLevels), grade),
    "meta.confidenceLevels keys have drifted from the GRADE enum",
  );
  assert.ok(
    sortedEqual(Object.keys(meta.evidenceLevels), grade),
    "meta.evidenceLevels keys have drifted from the GRADE enum",
  );
});

test("(d) every claimDomain const is a member of the envelope claimDomain enum", () => {
  const allowed = sourcedValue.properties.claimDomain.enum;
  const used = [
    ...collectClaimDomainConsts(product),
    ...collectClaimDomainConsts(ingredient),
    ...collectClaimDomainConsts(additive),
    ...collectClaimDomainConsts(timelineEvent),
  ];
  assert.ok(used.length >= 1, "no claimDomain const found; the regulatory marking is missing");
  for (const value of used) {
    assert.ok(
      allowed.includes(value),
      `claimDomain const "${value}" is not a member of the envelope enum ${allowed}; the field would be silently unsatisfiable`,
    );
  }
});
