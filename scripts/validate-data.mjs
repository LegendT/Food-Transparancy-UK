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
  checkIngredientRefs,
  checkTimelineRefs,
  listOffDerived,
  findOrphanSources
} from "../lib/referential.mjs";
import {
  deriveVerificationState,
  lineageSimilarityWarnings,
  CITATION_TTL_DAYS
} from "../lib/verification.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = resolve(here, "../schemas");
const DEFAULT_DATA_DIR = resolve(here, "../src/_data");
const DEFAULT_SOURCES = resolve(DEFAULT_DATA_DIR, "sources.json");

// The OFFLINE citation-existence verdict cache (D-07/Pitfall 3): the network
// existence check runs SEPARATELY (the citation-checker script) and COMMITS this
// diffable file; the build gate only READS it, never fetches. Default is repo-root
// .cache; CITATION_VERDICTS_CACHE overrides it so tests can pin a fixture cache
// per temp corpus. An absent file reads as {} = every citation UNCHECKED.
const CACHE_FILE = process.env.CITATION_VERDICTS_CACHE
  ? resolve(process.env.CITATION_VERDICTS_CACHE)
  : resolve(here, "../.cache/citation-verdicts.json");

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
      // Carry the entity type so the verification gate can thread it into
      // classifyStaleness (a timeline-event fact is historical, D-16/R-17).
      factBearing.push({ path, schemaId: schemaId(name), data: readJson(path), entityType: name });
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
    // Vocab/config files are skipped ONLY at the top level of the data dir; a
    // fact-shaped file NAMED meta.json/allergens.json/site.json in a subdirectory
    // must not inherit the skip and escape both the guard and validation (M4).
    if (validated.has(path)) continue;
    if (VOCAB_FILES.has(basename(path)) && dirname(path) === target) continue;
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
for (const { path, data, entityType } of factBearing) {
  facts.push(...collectFacts(data, path).map((f) => ({ ...f, entityType })));
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

// Derive the whole-entity records by entityType for the relationship gates (D-15).
// factBearing carries entityType from the ENTITY_DIRS gather; the single-file path
// has none, so these filters yield empty arrays and the checks are no-ops there.
const productData = factBearing.filter((f) => f.entityType === "product").map((f) => f.data);
const ingredientData = factBearing.filter((f) => f.entityType === "ingredient").map((f) => f.data);
const timelineData = factBearing.filter((f) => f.entityType === "timeline-event").map((f) => f.data);

// Gates 2 to 6: referential integrity, TRUST-06 jurisdiction, ranged-date order,
// and the symmetric D-15 relationship gates. A dangling product->ingredient OR a
// dangling timeline->product reference each fails the build (never silently dropped).
const errors = [
  ...checkReferences(facts, sourceRecords).errors,
  ...checkRegulatoryJurisdiction(facts, sourceRecords).errors,
  ...checkDateRanges(ranges).errors,
  ...checkIngredientRefs(productData, ingredientData).errors,
  ...checkTimelineRefs(timelineData, productData).errors
];
if (errors.length > 0) {
  console.error("Referential validation failed:");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Gate 5: the Phase 2 per-fact verification gate (D-15), run OFFLINE. It reads
// the committed .cache/citation-verdicts.json (absent = every citation UNCHECKED,
// never a fetch: Pitfall 3), derives each fact's publication state, and asserts
// the internal-consistency invariants JSON Schema cannot express.
//
// R-02 (load-bearing): a WITHHELD fact is the NORMAL, correct outcome and does
// NOT fail the build. Distinct-lineage failure, measure mismatch and value
// divergence are per-fact WITHHOLD reasons computed INSIDE deriveVerificationState,
// never entries in the error array below. One insufficient fact withholds itself
// and lets the rest of the corpus publish. The DERIVED state (NOT the raw stored
// value) is the authoritative render signal Phase 3a consumes (R-31): a withheld
// or contested record keeps its stored value populated by design, so 3a must gate
// rendering on this derived state, never on value !== null.
//
// Offline verdict-cache read: the 02-01 SEAM shape keyed by source id
// { verdict, resolvedVia, checkedAt, statusCode, snapshotUrl }. An absent file,
// an absent entry, or a RESOLVES older than CITATION_TTL_DAYS all read as
// UNCHECKED -> withheld-unverified (fail-safe, R-07/R-08). No network here.
const verdictCache = existsSync(CACHE_FILE) ? readJson(CACHE_FILE) : {};
const existenceBySourceId = new Map(Object.entries(verdictCache));
const sourcesById = new Map(sourceRecords.map((source) => [source.id, source]));
const today = new Date().toISOString().slice(0, 10);

// Internal-consistency assertions (build-FAILING, per 02-RESEARCH Pattern 2 and
// the D-15 amendment). These catch genuine authoring CONTRADICTIONS, not
// verification insufficiency: a withheld fact is fine, a self-contradictory
// record is not. Distinct-lineage/measure/value are NOT here (they withhold).
const consistencyErrors = [];
for (const { path, fact } of facts) {
  const v = fact.verification;
  if (!v) continue;
  const adjOutcome = v.adjudication?.outcome;

  // A contested block must be backed by a contested adjudication carrying positions.
  if (v.contested && (adjOutcome !== "contested" || !v.contested.positions?.length)) {
    consistencyErrors.push(
      `${path}: has a verification.contested block but no matching adjudication.outcome "contested" with positions (D-14)`
    );
  }
  // The reverse (L8/D-14): a contested adjudication must be backed by a
  // verification.contested block carrying at least two positions, else the fact
  // withholds a singular value with nothing to publish in its place.
  if (adjOutcome === "contested" && !(v.contested?.positions?.length >= 2)) {
    consistencyErrors.push(
      `${path}: adjudication.outcome is "contested" but verification.contested.positions is absent or has fewer than two positions (D-14)`
    );
  }
  // R-05/D-14: a contested fact must WITHHOLD its singular value (value must be
  // null); the positions carry the content. A non-null value asserts one figure
  // the human adjudication has ruled genuinely contested.
  if (adjOutcome === "contested" && fact.value !== null) {
    consistencyErrors.push(
      `${path}: adjudication.outcome is "contested" but the singular value is non-null; a contested fact must withhold value (null) and carry positions (R-05/D-14)`
    );
  }
  // R-03/D-04: a "corrected" adjudication MUST carry a correctedValue key, else
  // deriveVerificationState substitutes an undefined value and publishes it. A
  // deliberate null is a legitimate corrected value (use the `in` operator, so
  // only a MISSING key fails, never a present null).
  if (adjOutcome === "corrected" && !("correctedValue" in v.adjudication)) {
    consistencyErrors.push(
      `${path}: adjudication.outcome is "corrected" but no correctedValue key is present; a corrected fact must carry its human-approved corrected value, a deliberate null included (R-03/D-04)`
    );
  }
  // A pass may only check sources the fact actually rests on: every sourcesChecked
  // id must appear in the fact's sources[], else a pass "confirms" a citation the
  // fact never claims to stand on (D-02).
  for (const pass of v.passes ?? []) {
    for (const id of pass.sourcesChecked ?? []) {
      if (!fact.sources.includes(id)) {
        consistencyErrors.push(
          `${path}: verification pass checks source "${id}" absent from the fact's sources[] (D-02)`
        );
      }
    }
  }
  // markedWrong cross-field tie (Ajv already requires the shape; defence in depth
  // so a marked-wrong fact always carries its audit note and date).
  if (v.markedWrong && (!v.markedWrong.note || !v.markedWrong.date)) {
    consistencyErrors.push(`${path}: markedWrong must carry both a note and a date`);
  }
}

// R-16 referential integrity over the source registry: every non-null derivedFrom
// lineage pointer must resolve to a real registry id, else a dangling pointer
// could silently fake a distinct lineage root and defeat the corroborable standard.
for (const source of sourceRecords) {
  if (source.derivedFrom != null && !sourcesById.has(source.derivedFrom)) {
    consistencyErrors.push(
      `source "${source.id}": derivedFrom "${source.derivedFrom}" does not resolve to a registry source id (R-16)`
    );
  }
}

if (consistencyErrors.length > 0) {
  console.error("Verification internal-consistency validation failed:");
  for (const error of consistencyErrors) console.error(`  ${error}`);
  process.exit(1);
}

// Derived-state build REPORT (a report, NOT a gate): count each fact's D-15 state
// and surface every withhold reason. This is exactly where lineage/measure/value/
// non-RESOLVES withholds land (R-02) - they inform the reader of the build, they
// never fail it.
const STATE_ORDER = [
  "published-confirmed", "published-contested", "published-stale",
  "withheld-unverified", "withheld-in-review", "withheld-open-disagreement", "withheld-wrong"
];
const stateCounts = Object.fromEntries(STATE_ORDER.map((state) => [state, 0]));
const withheldLines = [];
for (const { path, fact, entityType } of facts) {
  const { state, reasons } = deriveVerificationState(
    fact, sourcesById, existenceBySourceId, today, entityType
  );
  stateCounts[state] = (stateCounts[state] ?? 0) + 1;
  if (state.startsWith("withheld")) {
    withheldLines.push(`  WITHHELD [${state}] ${path}: ${reasons.join("; ")}`);
  }
}
console.log(
  `Derived publication states (TTL ${CITATION_TTL_DAYS}d): ` +
  STATE_ORDER.map((state) => `${state}=${stateCounts[state]}`).join(" ")
);
for (const line of withheldLines) console.log(line);

// Non-failing verification diagnostics: undeclared co-derivation (the lineage
// similarity heuristic, D-12) and any cited source that no pass ever checked
// (R-15) - a citation that renders yet is never existence-checked.
const { warnings: lineageWarnings } = lineageSimilarityWarnings(facts, sourceRecords);
for (const warning of lineageWarnings) console.warn(`Warning: ${warning}`);
for (const { path, fact } of facts) {
  if (!fact.verification?.passes?.length) continue;
  const checkedIds = new Set(fact.verification.passes.flatMap((pass) => pass.sourcesChecked ?? []));
  for (const id of fact.sources) {
    if (!checkedIds.has(id)) {
      console.warn(`Warning: ${path}: cited source "${id}" is checked by no verification pass (renders but is never existence-checked, R-15)`);
    }
  }
}

// Non-failing diagnostics.
const { warnings } = findOrphanSources(facts, sourceRecords);
for (const warning of warnings) console.warn(`Warning: ${warning}`);

const offDerived = listOffDerived(facts, sourceRecords);
if (offDerived.length > 0) {
  console.log(`OFF-derived facts (ODbL share-alike applies) at: ${offDerived.join(", ")}`);
}

console.log("Data validation passed.");
