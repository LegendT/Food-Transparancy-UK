#!/usr/bin/env node
// The DATA-10 image-rights gate, the third link in the prebuild chain (research
// Pitfall 2: the gate must fail the BUILD, not just the test). It enumerates the
// images referenced by entity data, looks each up in the rights manifest, and
// exits non-zero on any referenced image that is unmanifested or not cleared
// (default-deny). British English throughout; this file must pass the gate.
//
// The non-zero corpus is the MANIFEST (src/_data/images.json), seeded with at
// least one record: a gate that inspects an empty manifest is a false green, so
// the script exits non-zero on an empty manifest. A phase that REFERENCES zero
// images is a valid pass (Phase 1 references none; brand names used as
// identifiers are not images).
//
// Optional argument: a target path (default src/_data). A directory is walked
// for entity files and its images.json manifest. A single JSON file is read as a
// self-contained gate input { manifest, referenced } for the negative fixtures.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkImages, collectReferencedImages } from "../lib/check-images.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = resolve(here, "../src/_data");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const isDir = (path) => existsSync(path) && statSync(path).isDirectory();

// Read the manifest from an images.json payload, accepting a bare array, an
// { images: [...] } wrapper, or a single record (mirrors validate-data.mjs).
function asManifest(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.images)) return raw.images;
  return [raw];
}

// Recursively gather entity JSON under a directory, excluding the manifest
// itself (its "images" array holds rights records, not references) and the
// source registry (source names are identifiers, not image references).
function entityFilesIn(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...entityFilesIn(full));
    } else if (
      entry.name.endsWith(".json") &&
      entry.name !== "images.json" &&
      entry.name !== "sources.json"
    ) {
      out.push(full);
    }
  }
  return out;
}

function gather(target) {
  if (isDir(target)) {
    const manifestPath = join(target, "images.json");
    const manifest = existsSync(manifestPath) ? asManifest(readJson(manifestPath)) : [];
    const referenced = new Set();
    for (const file of entityFilesIn(target)) {
      for (const reference of collectReferencedImages(readJson(file))) {
        referenced.add(reference);
      }
    }
    return { manifest, referenced: [...referenced] };
  }
  // Single-file mode: a self-contained fixture provides its own manifest and
  // referenced list so a negative case can be spawned in isolation.
  const raw = readJson(target);
  const manifest = Array.isArray(raw.manifest) ? raw.manifest : asManifest(raw);
  const referenced = Array.isArray(raw.referenced)
    ? raw.referenced
    : collectReferencedImages(raw);
  return { manifest, referenced };
}

const target = resolve(process.argv[2] || DEFAULT_DATA_DIR);
const { manifest, referenced } = gather(target);

// Non-zero corpus assertion: the manifest is the corpus.
if (manifest.length === 0) {
  console.error(
    `Image-rights gate failed: no image-rights records found under ${target} (empty manifest).`
  );
  process.exit(1);
}
console.log(
  `Image-rights manifest holds ${manifest.length} record(s); ${referenced.length} image(s) referenced by entity data.`
);

const { errors } = checkImages(referenced, manifest);
if (errors.length > 0) {
  console.error("Image-rights gate failed (DATA-10 default-deny):");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log("Image-rights gate passed.");
