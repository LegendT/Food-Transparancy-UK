// Proves the corpus-perimeter guards AND the Phase 2 per-fact verification gate
// in scripts/validate-data.mjs by spawning the REAL gate against temp dirs.
// Phase 1 guards: (1) a fact-bearing file outside the validated entity
// directories fails the build (it would otherwise render via Eleventy but escape
// verification); (2) a corpus with files but ZERO facts fails (a metadata-only
// corpus is a false green). Phase 2 (02-03): the load-bearing R-02 split - a
// distinct-lineage / measure-mismatch / non-RESOLVES fact WITHHOLDS at exit 0
// (it is not a build failure), while five genuine internal-consistency /
// referential violations DO fail the build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const GATE = resolve(here, "../scripts/validate-data.mjs");
const FIX = resolve(here, "fixtures/invalid");
const VALID_FACT = {
  value: "demo", sources: ["off"], confidence: "high", evidence: "high",
  updated: "2026-06-30", claimType: "authoritative",
};
const MINIMAL_SOURCES = {
  sources: [{
    id: "off", name: "Open Food Facts", publisher: "OFF", url: "https://world.openfoodfacts.org/",
    covers: "x", updateFrequency: "Continuous", retrievedDate: "2026-06-30",
    sourceType: "tertiary", jurisdiction: "international",
    licence: { id: "ODbL-1.0", url: "https://opendatacommons.org/licenses/odbl/1-0/", attributionRequired: true, shareAlike: true },
  }],
};
const runGate = (dir) => spawnSync(process.execPath, [GATE, dir], { encoding: "utf8" });
const tempDir = () => mkdtempSync(join(tmpdir(), "gate-"));

// ---- Phase 2 (02-03) helpers ----

// Load a committed negative fixture (a single SourcedValue fact) by name.
const loadFix = (name) => JSON.parse(readFileSync(join(FIX, name), "utf8"));

// A well-formed source-registry record; `extra` overrides (sourceType, derivedFrom).
const src = (id, extra = {}) => ({
  id, name: `Source ${id}`, publisher: "Pub", url: `https://example.com/${id}`,
  covers: "x", updateFrequency: "As published", retrievedDate: "2026-06-30",
  sourceType: "secondary", jurisdiction: "GB",
  licence: { id: "all-rights-reserved", url: "https://example.com/", attributionRequired: true, shareAlike: false },
  ...extra,
});

// A fresh RESOLVES verdict-cache entry (checkedAt = now, so well within the TTL).
const NOW_ISO = new Date().toISOString();
const resolves = () => ({ verdict: "RESOLVES", resolvedVia: "live", checkedAt: NOW_ISO, statusCode: 200, snapshotUrl: null });

// Write a verdict cache into `dir` and run the gate with CITATION_VERDICTS_CACHE
// pinned to it, so the offline existence check reads exactly this fixture cache.
const runGateWithCache = (dir, cache) => {
  const cachePath = join(dir, "verdicts.json");
  writeFileSync(cachePath, JSON.stringify(cache));
  return spawnSync(process.execPath, [GATE, dir], {
    encoding: "utf8",
    env: { ...process.env, CITATION_VERDICTS_CACHE: cachePath },
  });
};

test("a fact-bearing file outside the validated corpus fails the build", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify(MINIMAL_SOURCES));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(VALID_FACT));
    // A stray fact at a location Eleventy would load but the allowlist ignores.
    writeFileSync(join(dir, "featured-fact.json"), JSON.stringify({ ...VALID_FACT, claimType: "corroborable", sources: ["off", "off"] }));
    const r = runGate(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /outside the validated corpus/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a stray fact missing claimType still fails (the escape guard is looser than collectFacts)", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify(MINIMAL_SOURCES));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(VALID_FACT));
    // A provenance-shaped value with a sources array but NO claimType.
    writeFileSync(join(dir, "featured.json"), JSON.stringify({ value: "x", sources: ["off"], confidence: "high", evidence: "high", updated: "2026-06-30" }));
    const r = runGate(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /fact-shaped/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a corpus with files but zero facts fails (metadata-only false green)", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify(MINIMAL_SOURCES));
    mkdirSync(join(dir, "brands"));
    // A brand stub carries id/slug/name only - no SourcedValue fact.
    writeFileSync(join(dir, "brands", "b.json"), JSON.stringify({ id: "x", slug: "x", name: "X" }));
    const r = runGate(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /zero fact-bearing values/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a valid corpus still passes", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify(MINIMAL_SOURCES));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(VALID_FACT));
    const r = runGate(dir);
    assert.equal(r.status, 0, r.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Phase 2 (02-03): the R-02 WITHHOLD-not-fail paths (exit 0, fact withheld).

test("R-02: a corroborable fact whose confirming passes share a lineage WITHHOLDS (exit 0), not a build failure", () => {
  const dir = tempDir();
  try {
    // Two co-derived trade titles over ONE (real, present) root -> a single
    // lineage, so the corroborable distinct-lineage standard is not met.
    writeFileSync(join(dir, "sources.json"), JSON.stringify({
      sources: [
        src("mondelez-pr-2019"),
        src("cdm-grocer-2019", { sourceType: "primary", derivedFrom: "mondelez-pr-2019" }),
        src("cdm-confectionerynews-2019", { derivedFrom: "mondelez-pr-2019" }),
      ],
    }));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(loadFix("shared-lineage.json")));
    const r = runGateWithCache(dir, {
      "cdm-grocer-2019": resolves(),
      "cdm-confectionerynews-2019": resolves(),
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /withheld-in-review=1/);
    assert.match(r.stdout, /published-confirmed=0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("R-02: a fact whose confirming passes carry mismatched measures WITHHOLDS (exit 0), not a build failure", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify({
      sources: [MINIMAL_SOURCES.sources[0], src("lucozade-grocer-2017")],
    }));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(loadFix("measure-mismatch.json")));
    const r = runGateWithCache(dir, {
      off: resolves(),
      "lucozade-grocer-2017": resolves(),
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /withheld-open-disagreement=1/);
    assert.match(r.stdout, /published-confirmed=0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("R-08: a fact citing a DOES_NOT_RESOLVE cached verdict is WITHHELD (exit 0), never published", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify({
      sources: [src("diabetes-couk-2017")],
    }));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(loadFix("does-not-resolve-citation.json")));
    const r = runGateWithCache(dir, {
      "diabetes-couk-2017": { verdict: "DOES_NOT_RESOLVE", resolvedVia: "live", checkedAt: NOW_ISO, statusCode: 404, snapshotUrl: null },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /withheld-unverified=1/);
    assert.match(r.stdout, /published-confirmed=0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("R-02 baseline: a corpus of only unverified (no-pass) facts still exits 0", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify(MINIMAL_SOURCES));
    // A well-formed fact carrying zero verification passes derives to
    // withheld-unverified - the normal correct outcome, not a build failure.
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(VALID_FACT));
    const r = runGate(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /withheld-unverified=1/);
    assert.match(r.stdout, /published-confirmed=0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Phase 2 (02-03): the five internal-consistency / referential BUILD FAILURES.

test("build fails: a contested block without a matching contested adjudication", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify({ sources: [src("src-a"), src("src-b")] }));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify({
      value: null, sources: ["src-a", "src-b"], confidence: "low", evidence: "low",
      updated: "2026-06-30", claimType: "corroborable",
      verification: {
        passes: [
          { reviewerKind: "human", sourcesChecked: ["src-a"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" },
          { reviewerKind: "ai", sourcesChecked: ["src-b"], measure: { basis: "n/a", state: "n/a" }, verdict: "disputes", checkedOn: "2026-06-30" },
        ],
        contested: { positions: [
          { value: "a", sources: ["src-a"], note: "position a" },
          { value: "b", sources: ["src-b"], note: "position b" },
        ] },
      },
    }));
    const r = runGate(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /contested block but no matching adjudication/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build fails: a contested adjudication whose singular value is non-null (R-05)", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify({
      sources: [src("lucozade-grocer-2017"), src("diabetes-couk-2017")],
    }));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(loadFix("contested-nonnull-value.json")));
    const r = runGate(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /singular value is non-null/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build fails: a pass sourcesChecked id absent from the fact's sources[]", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify({ sources: [src("src-a")] }));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify({
      value: "x", sources: ["src-a"], confidence: "low", evidence: "low",
      updated: "2026-06-30", claimType: "authoritative",
      verification: {
        passes: [
          { reviewerKind: "human", sourcesChecked: ["ghost"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" },
        ],
      },
    }));
    const r = runGate(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /absent from the fact's sources/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build fails: a non-null derivedFrom that does not resolve to a registry id (R-16)", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify({
      sources: [src("src-a", { derivedFrom: "press-release-missing" })],
    }));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify({
      ...VALID_FACT, sources: ["src-a"],
    }));
    const r = runGate(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /does not resolve to a registry source id/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build fails: a SourcedValue-shaped lead under src/_data trips the corpus-escape guard (D-19/C4)", () => {
  const dir = tempDir();
  try {
    writeFileSync(join(dir, "sources.json"), JSON.stringify(MINIMAL_SOURCES));
    writeFileSync(join(dir, "demoFact.json"), JSON.stringify(VALID_FACT));
    // A lead wrongly shaped as a fact (it carries a sources array) placed where
    // Eleventy would load it but the allowlist does not validate it.
    writeFileSync(join(dir, "off-lead.json"), JSON.stringify(loadFix("sourcedvalue-shaped-lead.json")));
    const r = runGate(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /outside the validated corpus|fact-shaped/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
