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

test("check-render-safety fails on a template that renders a raw .value, passes on a clean one", () => {
  const dir = mkdtempSync(join(tmpdir(), "render-"));
  try {
    const bad = join(dir, "leak.njk");
    writeFileSync(bad, "<p>{{ product.manufacturer.value }}</p>\n");
    const r1 = spawnSync(process.execPath, [LINT, bad], { encoding: "utf8" });
    assert.notEqual(r1.status, 0);
    assert.match(r1.stderr, /Render-safety failed/);

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
