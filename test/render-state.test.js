// R-31 enforcement: the render boundary must expose a fact's raw value ONLY when
// it genuinely publishes. Every withheld/contested record still carries its raw
// `value` in JSON by design, so factForRender is the single point the trust model
// could be defeated at render time - these tests pin that a withheld or contested
// value never crosses the boundary. Also exercises the check-render-safety lint so
// a template that prints a raw `.value` fails the build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import { factForRenderFromData } from "../lib/render-state.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LINT = resolve(HERE, "../scripts/check-render-safety.mjs");
const TODAY = "2026-07-01";

const SOURCES = [
  { id: "prim-a", sourceType: "primary", derivedFrom: null },
  { id: "sec-b", sourceType: "secondary", derivedFrom: null },
];
const fresh = { verdict: "RESOLVES", resolvedVia: "live", checkedAt: "2026-07-01T09:00:00Z", statusCode: 200, snapshotUrl: null };
const VERDICTS = { "prim-a": fresh, "sec-b": fresh };

const confirmsPass = (over = {}) => ({
  reviewerKind: "human", sourcesChecked: ["prim-a"],
  measure: { basis: "n/a", state: "n/a" }, checkedValue: "x",
  verdict: "confirms", checkedOn: "2026-06-30", ...over,
});

test("R-31: an unverified (no-pass) fact never exposes its raw value at the render boundary", () => {
  const fact = { value: "SECRET UNVERIFIED VALUE", sources: ["prim-a"], claimType: "authoritative", verification: { passes: [] } };
  const d = factForRenderFromData(fact, SOURCES, VERDICTS, TODAY, "product");
  assert.equal(d.publishable, false);
  assert.equal(d.value, undefined);
  assert.match(d.state, /^withheld-/);
});

test("R-31: a contested fact exposes no scalar value, only its positions", () => {
  const fact = {
    value: null, sources: ["prim-a", "sec-b"], claimType: "corroborable",
    verification: {
      passes: [confirmsPass()],
      adjudication: { outcome: "contested", note: "genuine dispute", date: "2026-06-30" },
      contested: { positions: [
        { value: 13, sources: ["prim-a"], note: "pre-reformulation" },
        { value: 17, sources: ["sec-b"], note: "label figure" },
      ] },
    },
  };
  const d = factForRenderFromData(fact, SOURCES, VERDICTS, TODAY, "product");
  assert.equal(d.publishable, false);
  assert.equal(d.contested, true);
  assert.equal(d.value, undefined);
  assert.equal(d.positions.length, 2);
});

test("VRFY-11 render half: a contested projection carries each position's OWN sources to the boundary", () => {
  const fact = {
    value: null, sources: ["prim-a", "sec-b"], claimType: "corroborable",
    verification: {
      passes: [confirmsPass()],
      adjudication: { outcome: "contested", note: "genuine dispute", date: "2026-06-30" },
      contested: { positions: [
        { value: 13, sources: ["prim-a"], note: "pre-reformulation" },
        { value: 17, sources: ["sec-b"], note: "label figure" },
      ] },
    },
  };
  const d = factForRenderFromData(fact, SOURCES, VERDICTS, TODAY, "product");
  assert.equal(d.contested, true);
  // The rendering half of VRFY-11 (F6): the macro's contested branch resolves each
  // position's sources via findBy, so the DATA reaching the macro must carry each
  // side's own source ids. Bare values crossing the boundary are not enough.
  assert.deepEqual(d.positions.map((p) => p.sources), [["prim-a"], ["sec-b"]]);
  assert.ok(d.positions.every((p) => Array.isArray(p.sources) && p.sources.length > 0));
});

test("R-31: a genuinely published fact DOES expose its value", () => {
  const fact = {
    value: "x", sources: ["prim-a", "sec-b"], claimType: "corroborable",
    verification: { passes: [
      confirmsPass({ sourcesChecked: ["prim-a"] }),
      confirmsPass({ reviewerKind: "ai", sourcesChecked: ["sec-b"] }),
    ] },
  };
  const d = factForRenderFromData(fact, SOURCES, VERDICTS, TODAY, "product");
  assert.equal(d.publishable, true);
  assert.equal(d.value, "x");
});

test("VRFY-12 render half: a published-stale projection carries lastVerified = max confirms checkedOn (the verify clock, not fact.updated)", () => {
  // A regulatory fact whose passes are dated past the 12-month staleness threshold
  // while its citation still resolves fresh -> published-stale (two-clocks recipe).
  const fact = {
    value: "authorised", sources: ["prim-a"], claimType: "authoritative",
    claimDomain: "regulatory", updated: "2026-07-02",
    verification: { passes: [
      confirmsPass({ reviewerKind: "human", checkedOn: "2023-06-01", checkedValue: "authorised" }),
      confirmsPass({ reviewerKind: "blinded-reread", checkedOn: "2023-06-01", checkedValue: "authorised" }),
    ] },
  };
  const d = factForRenderFromData(fact, SOURCES, VERDICTS, TODAY, "ingredient");
  assert.equal(d.state, "published-stale");
  assert.equal(d.stale, true);
  // The review-due label must read the verification date, never the edit date.
  assert.equal(d.lastVerified, "2023-06-01");
  assert.notEqual(d.lastVerified, fact.updated);
});

test("a withheld fact carries no lastVerified date at the boundary", () => {
  const fact = { value: "x", sources: ["prim-a"], claimType: "authoritative", updated: "2026-07-02", verification: { passes: [] } };
  const d = factForRenderFromData(fact, SOURCES, VERDICTS, TODAY, "product");
  assert.equal(d.publishable, false);
  assert.equal(d.lastVerified, null);
});

// Behavioural R-31: render the SANCTIONED macro itself. The macro is exempt from the
// check-render-safety lint (it is the one allowlisted path), so a regression that
// moved `d.value` outside the `{% if d.publishable %}` branch would be caught by no
// static check - only by rendering it. These tests render it with a unique canary
// value and assert the value crosses to HTML ONLY when the fact publishes.
const CANARY = "CANARY_RAW_VALUE_9f3a7c";
const INCLUDES = resolve(HERE, "../src/_includes");

function renderMacro(callExpr, context) {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(INCLUDES), { autoescape: true });
  env.addFilter("factState", (fact, srcs, entityType) => factForRenderFromData(fact, srcs, VERDICTS, TODAY, entityType));
  env.addFilter("findBy", (arr, key, value) => (Array.isArray(arr) ? arr.find((i) => i && i[key] === value) : undefined));
  env.addFilter("readableDate", (v) => v); // not exercised by the non-stale cases below
  return env.renderString(`{% from "components/macros.njk" import sourcedValue, factCell %}${callExpr}`, context);
}

test("R-31 behavioural: sourcedValue never renders a withheld fact's raw value", () => {
  const fact = { value: CANARY, sources: ["prim-a"], confidence: "low", evidence: "low", updated: "2026-07-01", claimType: "authoritative", verification: { passes: [] } };
  const html = renderMacro(`{{ sourcedValue(fact, sources, "Label", "", "product") }}`, { fact, sources: SOURCES });
  assert.ok(!html.includes(CANARY), "a withheld value must never reach rendered HTML");
  assert.match(html, /Not yet verified; withheld\./);
});

test("R-31 behavioural: factCell never renders a withheld fact's raw value", () => {
  const fact = { value: CANARY, sources: ["prim-a"], confidence: "low", evidence: "low", updated: "2026-07-01", claimType: "authoritative", verification: { passes: [] } };
  const html = renderMacro(`{{ factCell(fact, sources, "", "product") }}`, { fact, sources: SOURCES });
  assert.ok(!html.includes(CANARY), "a withheld value must never reach a table cell");
  assert.match(html, /Not yet verified/);
});

test("R-31 behavioural: a published fact DOES render its value (the withheld tests are not vacuous)", () => {
  const fact = {
    value: CANARY, sources: ["prim-a", "sec-b"], confidence: "high", evidence: "high", updated: "2026-07-01", claimType: "corroborable",
    verification: { passes: [
      confirmsPass({ sourcesChecked: ["prim-a"], checkedValue: CANARY }),
      confirmsPass({ reviewerKind: "ai", sourcesChecked: ["sec-b"], checkedValue: CANARY }),
    ] },
  };
  const html = renderMacro(`{{ sourcedValue(fact, sources, "Label", "", "product") }}`, { fact, sources: SOURCES });
  assert.ok(html.includes(CANARY), "a published fact's value MUST render (positive control)");
});

test("R-31 behavioural: a contested fact renders its positions but never the scalar value", () => {
  const fact = {
    value: CANARY, sources: ["prim-a", "sec-b"], confidence: "moderate", evidence: "moderate", updated: "2026-07-01", claimType: "corroborable",
    verification: {
      adjudication: { outcome: "contested", note: "genuine dispute", date: "2026-06-30" },
      contested: { positions: [ { value: "position-alpha", sources: ["prim-a"] }, { value: "position-beta", sources: ["sec-b"] } ] },
    },
  };
  const html = renderMacro(`{{ sourcedValue(fact, sources, "Label", "", "product") }}`, { fact, sources: SOURCES });
  assert.ok(!html.includes(CANARY), "the contested scalar value must never appear");
  assert.match(html, /position-alpha/);
  assert.match(html, /Contested/);
});

test("check-render-safety fails on a template that renders a raw .value, passes on a clean one", () => {
  const dir = mkdtempSync(join(tmpdir(), "render-"));
  try {
    const bad = join(dir, "leak.njk");
    writeFileSync(bad, "<p>{{ product.manufacturer.value }}</p>\n");
    const r1 = spawnSync(process.execPath, [LINT, bad], { encoding: "utf8" });
    assert.notEqual(r1.status, 0);
    assert.match(r1.stderr, /Render-safety failed/);

    // WR-01: the sibling access/serialisation forms that reach the same raw value
    // must fail too - a default-deny boundary cannot be bypassed by bracket access
    // or a whole-object dump.
    for (const leak of [
      "<p>{{ product.manufacturer[\"value\"] }}</p>\n",
      "<p>{{ fact | dump }}</p>\n",
      "<p>{{ fact | tojson }}</p>\n",
      "<p>{{ fact | attr(\"value\") }}</p>\n",
      "<script>{{ product | jsonScript }}</script>\n",
      // Object enumeration: a two-variable for-loop dumps a fact's own fields
      // (including a withheld `value`) without the literal token ever appearing.
      "{% for k, v in fact %}<li>{{ k }}: {{ v }}</li>{% endfor %}\n",
      "{% for k, v in product.manufacturer %}{{ v }}{% endfor %}\n",
      // dictsort yields [key, value] pairs, so a numeric-index access leaks the
      // value with no literal token; the filter itself is denied.
      "{{ fact | dictsort }}\n",
      "{% for pair in fact | dictsort %}{{ pair[1] }}{% endfor %}\n",
    ]) {
      const f = join(dir, "bypass.njk");
      writeFileSync(f, leak);
      const r = spawnSync(process.execPath, [LINT, f], { encoding: "utf8" });
      assert.notEqual(r.status, 0, `render-safety must reject: ${leak.trim()}`);
    }

    // A two-variable loop over the meta.* config maps is safe (no fact values) and
    // must NOT be flagged - mirrors the real methodology.njk usage.
    const safeLoop = join(dir, "safe-loop.njk");
    writeFileSync(safeLoop, "{% for grade, definition in meta.confidenceLevels %}{{ grade }}: {{ definition }}{% endfor %}\n");
    const rSafe = spawnSync(process.execPath, [LINT, safeLoop], { encoding: "utf8" });
    assert.equal(rSafe.status, 0, "render-safety must allow two-variable loops over meta.*");

    const good = join(dir, "safe.njk");
    writeFileSync(good, "{% from \"components/macros.njk\" import sourcedValue %}\n{{ sourcedValue(fact, sources.sources, \"Label\") }}\n");
    const r2 = spawnSync(process.execPath, [LINT, good], { encoding: "utf8" });
    assert.equal(r2.status, 0);

    // A .value mentioned inside a Nunjucks comment is documentation, not a render.
    const commented = join(dir, "commented.njk");
    writeFileSync(commented, "{# never render fact.value directly #}\n<p>{{ safe }}</p>\n");
    const r3 = spawnSync(process.execPath, [LINT, commented], { encoding: "utf8" });
    assert.equal(r3.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
