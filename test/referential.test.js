// The cross-file gates JSON Schema cannot express: source-id resolution, the
// TRUST-06 jurisdiction rule, the imperative ranged-date order check, and
// OFF-derived tagging. The valid fixtures clear every check; the invalid
// fixtures (added in Task 3) each prove the gate that owns their failure mode.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { compile, validateDataset } from "../lib/validate.mjs";
import {
  collectFacts,
  collectDateRanges,
  checkReferences,
  checkRegulatoryJurisdiction,
  checkDateRanges,
  checkIngredientRefs,
  checkTimelineRefs,
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

// WARNING-01(a): a source cited only inside a contested position must resolve to
// a registry record like any other reference. A dangling position source would
// otherwise pass DATA-01 undetected (D-14).
test("a contested position citing an unknown source id is rejected by checkReferences (DATA-01, D-14)", () => {
  const fact = {
    value: null, sources: ["lucozade-grocer-2017"], confidence: "low", evidence: "low",
    updated: "2026-07-01", claimType: "corroborable",
    verification: {
      adjudication: { outcome: "contested", date: "2026-07-01", note: "n/a" },
      contested: { positions: [
        { value: "a", sources: ["lucozade-grocer-2017"], note: "known position source" },
        { value: "b", sources: ["totally-bogus-id-not-in-registry"], note: "dangling position source" },
      ] },
    },
  };
  const { errors } = checkReferences([{ path: "/x", fact }], registry);
  assert.ok(errors.some((e) => /totally-bogus-id-not-in-registry/.test(e)),
    "a dangling contested-position source must be flagged");
});

// No regression: the real Lucozade contested fact's position sources are genuine
// registry ids, so it must still clear the reference gate with zero errors.
test("the real Lucozade contested timeline fact clears checkReferences (no false positive)", () => {
  const facts = collectFacts(load("../src/_data/timeline/spike-lucozade-2017-sugar-cut.json"));
  assert.equal(checkReferences(facts, registry).errors.length, 0);
});

test("a regulatory fact citing only a non-GB source with no checkedOn is rejected (TRUST-06, both halves)", () => {
  const facts = collectFacts(load("fixtures/invalid/regulatory-non-gb.json"));
  assert.ok(checkRegulatoryJurisdiction(facts, registry).errors.length > 0);
});

// TRUST-06 has two independent halves; each is guarded by its own surgical
// fixture so a regression that drops one half cannot hide behind the other.
test("TRUST-06: a GB-sourced regulatory fact missing checkedOn fails ONLY the checkedOn rule", () => {
  const facts = collectFacts(load("fixtures/invalid/regulatory-gb-no-checkedon.json"));
  const { errors } = checkRegulatoryJurisdiction(facts, registry);
  assert.ok(errors.some((e) => /checkedOn date/.test(e)), "the checkedOn rule must fire");
  assert.ok(!errors.some((e) => /GB-jurisdiction/.test(e)), "the GB-jurisdiction rule must NOT fire");
});

test("TRUST-06: a regulatory fact with checkedOn but only a non-GB source fails ONLY the jurisdiction rule", () => {
  const facts = collectFacts(load("fixtures/invalid/regulatory-noncgb-with-checkedon.json"));
  const { errors } = checkRegulatoryJurisdiction(facts, registry);
  assert.ok(errors.some((e) => /GB-jurisdiction/.test(e)), "the GB-jurisdiction rule must fire");
  assert.ok(!errors.some((e) => /checkedOn date/.test(e)), "the checkedOn rule must NOT fire");
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

// D-15 relationship gates: each dangling reference is rejected by the pure check
// that owns it, and passes once the id resolves.

test("a dangling product->ingredient reference is rejected by checkIngredientRefs, a resolvable one passes (D-15)", () => {
  const product = load("fixtures/invalid/product-dangling-ingredient-ref.json");
  assert.ok(checkIngredientRefs([product], []).errors.length > 0, "no ingredient defines the id");
  assert.equal(
    checkIngredientRefs([product], [{ id: "nonexistent-ingredient-xyz" }]).errors.length,
    0,
    "the id now resolves"
  );
});

test("a dangling timeline->product reference is rejected by checkTimelineRefs, a resolvable one passes (D-15)", () => {
  const event = load("fixtures/invalid/timeline-dangling-product-ref.json");
  assert.ok(checkTimelineRefs([event], []).errors.length > 0, "no product defines the productId");
  assert.equal(
    checkTimelineRefs([event], [{ id: "no-such-product-xyz" }]).errors.length,
    0,
    "the productId now resolves"
  );
});

// The gates must fail the BUILD, not just a unit test. Seed a temp corpus carrying
// each dangling reference plus the real sources registry (so a cited source resolves
// and the ONLY failure is the dangling relationship), and assert a non-zero exit.
const rawSources = readFileSync(resolve(dir, "../src/_data/sources.json"));
function seedAndRun(subdir, fixtureRel) {
  const work = mkdtempSync(resolve(tmpdir(), "ft-dangling-"));
  try {
    mkdirSync(resolve(work, subdir));
    writeFileSync(resolve(work, subdir, "record.json"), readFileSync(resolve(dir, fixtureRel)));
    writeFileSync(resolve(work, "sources.json"), rawSources);
    return spawnSync(process.execPath, [SCRIPT, work], { encoding: "utf8" });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

test("a dangling product->ingredient reference fails the build over a corpus (checkIngredientRefs)", () => {
  const result = seedAndRun("products", "fixtures/invalid/product-dangling-ingredient-ref.json");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /nonexistent-ingredient-xyz/);
});

test("a dangling timeline->product reference fails the build, so it can never silently render as 'no recipe changes recorded yet'", () => {
  const result = seedAndRun("timeline", "fixtures/invalid/timeline-dangling-product-ref.json");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no-such-product-xyz/);
});
