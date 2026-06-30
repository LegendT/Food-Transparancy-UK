#!/usr/bin/env node
// The UX-06 British-English and neutral-editorial lint, the second link in the
// prebuild chain (research Pitfall 2: the gate must fail the BUILD, not just the
// test). It extends DEBT's no-emdash file walk into the scoped denylist lint in
// lib/editorial-rules.mjs and exits non-zero on any Class-A-anywhere or
// Class-B-in-analyst offender. British English throughout.
//
// The scan set is an explicit ALLOWLIST of roots, NOT a repo walk (mirrors DEBT
// no-emdash.test.js SCAN_DIRS + SCAN_FILES): src/ + docs/ + the single root
// README.md ONLY. A root walk would scan .planning/ (hundreds of em-dashes),
// CLAUDE.md and the research file's own denylist examples and turn the build
// permanently red. Only prose extensions are scanned, so .css (legitimate
// "color:"), .mjs/.js source and .json keys (legitimate "licence") are excluded
// by construction; dot-directories, CLAUDE.md and test/fixtures/ are hard-
// excluded by name so the gate never self-trips on planning prose.
//
// A gate that scans zero files is a false green, so the script asserts a
// non-zero scanned corpus and exits non-zero on an empty one.
//
// Optional argument: a target path. A directory is walked under the same
// allowlist rules; a single file is scanned directly (used by the negative
// fixtures, which live under the hard-excluded test/fixtures/).
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { lint, sentenceCaseWarnings } from "../lib/editorial-rules.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");

// The default allowlist: prose roots only.
const SCAN_DIRS = ["src", "docs"].map((d) => resolve(ROOT, d));
const SCAN_FILES = [resolve(ROOT, "README.md")];

// Prose extensions only. JSON, CSS and JS/MJS are excluded by omission, which
// removes the "licence" JSON key and "color:" CSS false positives at a stroke.
const PROSE_EXT = new Set([".md", ".njk", ".html"]);

// Hard-excluded by name, even within an allowlisted root.
const EXCLUDE_NAMES = new Set(["CLAUDE.md", "fixtures"]);
const isExcluded = (name) => name.startsWith(".") || EXCLUDE_NAMES.has(name);

function proseFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isExcluded(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...proseFiles(full));
    } else if (PROSE_EXT.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

// Resolve the scan set from an optional target argument or the default allowlist.
function scanSet(target) {
  if (!target) {
    return [...SCAN_DIRS.flatMap(proseFiles), ...SCAN_FILES.filter(existsSync)];
  }
  const resolved = resolve(target);
  if (statSync(resolved).isDirectory()) return proseFiles(resolved);
  return [resolved]; // a single explicit file is scanned even under test/fixtures.
}

const files = scanSet(process.argv[2]);

// Non-zero corpus assertion.
if (files.length === 0) {
  console.error("Editorial lint failed: no prose files found to scan (empty corpus).");
  process.exit(1);
}
console.log(`Scanned ${files.length} prose file(s) for en-GB and neutral-editorial style.`);

const offenders = [];
const warnings = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const relative = file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file;
  // Page body prose is analyst scope; the per-line quote-allow directive and
  // Markdown blockquotes carve out lawful attributed quotation within it.
  for (const offender of lint(text, { scope: "analyst" })) {
    offenders.push(`${relative}:${offender.line} ${offender.rule} "${offender.term}"`);
  }
  for (const warning of sentenceCaseWarnings(text)) {
    warnings.push(`${relative}: ${warning}`);
  }
}

// Sentence-case is a non-failing warning (research Open Question 2): printed,
// never gating. Proper-noun headings are expected to appear here.
for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (offenders.length > 0) {
  console.error("Editorial lint failed (UX-06):");
  for (const offender of offenders) console.error(`  ${offender}`);
  process.exit(1);
}

console.log("Editorial lint passed.");
