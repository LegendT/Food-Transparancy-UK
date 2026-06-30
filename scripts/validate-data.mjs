#!/usr/bin/env node
// The data validation gate, run first in the prebuild chain (research Pitfall 2:
// the gate must fail the BUILD, not just the test). It runs four logical gates
// over the corpus: Ajv structural validation, then source-id resolution, the
// TRUST-06 jurisdiction rule, and the imperative ranged-date order check. Any
// failure prints a readable list and exits non-zero so the build stops.
//
// A gate that scans zero files is a false green, so the script asserts it
// inspected a non-zero fact-bearing corpus and exits non-zero on an empty one.
//
// Optional argument: a target path (default src/_data). A directory is walked
// against the pinned file-to-schema map below; a single JSON file is validated
// as one SourcedValue fact against the default registry.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, validateDataset } from "../lib/validate.mjs";
import {
  collectFacts,
  collectDateRanges,
  checkReferences,
  checkRegulatoryJurisdiction,
  checkDateRanges,
  listOffDerived,
  findOrphanSources
} from "../lib/referential.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = resolve(here, "../schemas");
const DEFAULT_DATA_DIR = resolve(here, "../src/_data");
const DEFAULT_SOURCES = resolve(DEFAULT_DATA_DIR, "sources.json");

const schemaId = (name) => `https://foodtransparency.uk/schemas/${name}.schema.json`;
const SOURCED_VALUE = schemaId("sourced-value");
const SOURCE = schemaId("source");
const IMAGE = schemaId("image");

// Pinned entity-directory map: a subfolder of the target validated against its
// entity schema. An absent or empty subfolder is not an error in Phase 1.
// meta.json and allergens.json are DELIBERATELY omitted: they are controlled
// vocabularies validated by the 01-04 schema-consistency test, not the gate.
const ENTITY_DIRS = [
  ["products", "product"],
  ["ingredients", "ingredient"],
  ["brands", "brand"],
  ["additives", "additive"],
  ["timeline", "timeline-event"]
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const isDir = (path) => existsSync(path) && statSync(path).isDirectory();
// RECURSIVE: descend into nested subfolders too. Eleventy auto-loads every file
// under src/_data recursively; a non-recursive scan would let a fact in (say)
// products/archive/old.json render but escape validation.
const jsonFilesIn = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsonFilesIn(full));
    else if (entry.name.endsWith(".json")) out.push(full);
  }
  return out;
};

// Collect the corpus from the target. factBearing files are both validated as
// whole entities and mined for facts and ranges; registry records (sources,
// images) are validated but never counted toward the non-zero-corpus assertion.
function gather(target) {
  const factBearing = [];
  const registry = [];
  let sourceRecords = [];

  if (!isDir(target)) {
    factBearing.push({ path: target, schemaId: SOURCED_VALUE, data: readJson(target) });
    if (existsSync(DEFAULT_SOURCES)) {
      const wrapper = readJson(DEFAULT_SOURCES);
      sourceRecords = Array.isArray(wrapper.sources) ? wrapper.sources : [];
    }
    return { factBearing, registry, sourceRecords };
  }

  for (const [sub, name] of ENTITY_DIRS) {
    const subDir = join(target, sub);
    if (!isDir(subDir)) continue;
    for (const path of jsonFilesIn(subDir)) {
      factBearing.push({ path, schemaId: schemaId(name), data: readJson(path) });
    }
  }

  const demo = join(target, "demoFact.json");
  if (existsSync(demo)) {
    factBearing.push({ path: demo, schemaId: SOURCED_VALUE, data: readJson(demo) });
  }

  const sourcesPath = join(target, "sources.json");
  if (existsSync(sourcesPath)) {
    const wrapper = readJson(sourcesPath);
    sourceRecords = Array.isArray(wrapper.sources) ? wrapper.sources : [];
    sourceRecords.forEach((record, index) => {
      registry.push({ path: `${sourcesPath}/sources/${index}`, schemaId: SOURCE, data: record });
    });
  }

  // images.json is created by the parallel wave-4 plan 01-06; validate it only
  // when present so the two plans stay independent. Accept an array, an
  // { images: [...] } wrapper, or a single record.
  const imagesPath = join(target, "images.json");
  if (existsSync(imagesPath)) {
    const raw = readJson(imagesPath);
    const records = Array.isArray(raw) ? raw : Array.isArray(raw.images) ? raw.images : [raw];
    records.forEach((record, index) => {
      registry.push({ path: `${imagesPath}/${index}`, schemaId: IMAGE, data: record });
    });
  }

  return { factBearing, registry, sourceRecords };
}

const target = resolve(process.argv[2] || DEFAULT_DATA_DIR);
const { factBearing, registry, sourceRecords } = gather(target);

// Non-zero corpus assertion.
if (factBearing.length === 0) {
  console.error(`Validation failed: no fact-bearing files found under ${target} (empty corpus).`);
  process.exit(1);
}
console.log(`Scanned ${factBearing.length} fact-bearing file(s) and ${registry.length} registry record(s).`);

// Corpus-escape guard: Eleventy renders every .json under src/_data, but the
// gate validates only a pinned allowlist of entity dirs plus the named registry
// files. Any OTHER .json that carries a fact would render unverified. Walk the
// whole tree and fail on any fact-bearing file outside the validated set. The
// detector is DELIBERATELY looser than collectFacts: any object with a `sources`
// array counts, even one missing claimType (the omission must not be an escape
// hatch). meta/allergens/site are controlled vocab/config with no facts.
const VOCAB_FILES = new Set(["meta.json", "allergens.json", "site.json"]);
const hasSourcedShape = (node) => {
  if (Array.isArray(node)) return node.some(hasSourcedShape);
  if (node && typeof node === "object") {
    if (Array.isArray(node.sources)) return true;
    return Object.values(node).some(hasSourcedShape);
  }
  return false;
};
if (isDir(target)) {
  const validated = new Set([
    ...factBearing.map((f) => f.path),
    join(target, "sources.json"),
    join(target, "images.json"),
  ]);
  for (const path of jsonFilesIn(target)) {
    if (validated.has(path) || VOCAB_FILES.has(basename(path))) continue;
    if (hasSourcedShape(readJson(path))) {
      console.error(
        `Validation failed: ${path} carries a fact-shaped value (a "sources" array) but sits outside the ` +
        `validated corpus (not in a known entity directory). Move it under a validated entity dir or extend ENTITY_DIRS.`
      );
      process.exit(1);
    }
  }
}

// JSON-only-data invariant: Eleventy also loads global-data .js/.cjs modules in
// _data and *.11tydata.* directory-data files ANYWHERE under src, none of which
// this gate can see. Forbid them so every rendered fact stays in gate-visible
// JSON. (Template front-matter data is page-scoped and out of scope here.)
if (target === DEFAULT_DATA_DIR) {
  const SRC_DIR = resolve(DEFAULT_DATA_DIR, "..");
  const nonJsonData = [];
  const walkSrc = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { walkSrc(full); continue; }
      if (/\.11tydata\.(js|cjs|mjs|json)$/.test(entry.name)) nonJsonData.push(full);
      else if (full.startsWith(DEFAULT_DATA_DIR) && /\.(js|cjs|mjs)$/.test(entry.name)) nonJsonData.push(full);
    }
  };
  if (isDir(SRC_DIR)) walkSrc(SRC_DIR);
  if (nonJsonData.length > 0) {
    console.error("Validation failed: non-JSON data files bypass the gate (data must be plain JSON so it can be validated):");
    for (const path of nonJsonData) console.error(`  ${path}`);
    process.exit(1);
  }
}

// Gate 1: Ajv structural validation, run FIRST. The imperative checks below
// assume structurally-valid input (for example checkDateRanges never sees a
// missing or non-date bound, because Ajv has already rejected it), so a clean
// Ajv pass is a precondition for running them.
const ajv = compile(SCHEMA_DIR);
const structural = validateDataset(ajv, [...factBearing, ...registry]);
if (structural.errors.length > 0) {
  console.error("Structural validation failed:");
  for (const error of structural.errors) console.error(`  ${error}`);
  process.exit(1);
}

// Mine facts and ranged dates from every fact-bearing file.
const facts = [];
const ranges = [];
for (const { path, data } of factBearing) {
  facts.push(...collectFacts(data, path));
  ranges.push(...collectDateRanges(data, path));
}

// Non-zero FACT assertion (not just non-zero files): a corpus of metadata-only
// records (e.g. brand stubs with id/slug/name and no SourcedValue) would pass a
// file-count check while every downstream gate runs over an empty fact list and
// trivially passes. Assert real facts were inspected.
if (facts.length === 0) {
  console.error(`Validation failed: scanned ${factBearing.length} file(s) but found zero fact-bearing values (a metadata-only corpus is a false green).`);
  process.exit(1);
}

// Gates 2 to 4: referential integrity, TRUST-06 jurisdiction, ranged-date order.
const errors = [
  ...checkReferences(facts, sourceRecords).errors,
  ...checkRegulatoryJurisdiction(facts, sourceRecords).errors,
  ...checkDateRanges(ranges).errors
];
if (errors.length > 0) {
  console.error("Referential validation failed:");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

// Non-failing diagnostics.
const { warnings } = findOrphanSources(facts, sourceRecords);
for (const warning of warnings) console.warn(`Warning: ${warning}`);

const offDerived = listOffDerived(facts, sourceRecords);
if (offDerived.length > 0) {
  console.log(`OFF-derived facts (ODbL share-alike applies) at: ${offDerived.join(", ")}`);
}

console.log("Data validation passed.");
