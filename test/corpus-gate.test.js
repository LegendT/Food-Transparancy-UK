// Proves the two corpus-perimeter guards in scripts/validate-data.mjs added
// during the Phase 1 review: (1) a fact-bearing file outside the validated
// entity directories fails the build (it would otherwise render via Eleventy
// but escape verification); (2) a corpus with files but ZERO facts fails (a
// metadata-only corpus is a false green). Spawns the real gate against temp dirs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const GATE = resolve(here, "../scripts/validate-data.mjs");
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
