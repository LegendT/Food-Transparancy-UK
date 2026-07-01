#!/usr/bin/env node
// The R-31 render-safety gate, the fourth link in the prebuild chain. Every
// withheld/contested fact still carries its raw `value` in JSON by design (so
// promotion and adjudication can work), so the render layer is the ONE point the
// whole trust model could be silently defeated: a template that prints
// `{{ fact.value }}` publishes an unverified or contested value with no gate.
//
// The rule: no template may render a raw `.value` EXCEPT the sanctioned
// sourcedValue macro, which derives the publishable state through the factState
// filter first and exposes the value only when the fact genuinely publishes. Any
// other `.value` in a template fails the build (default-deny). A `.value` inside a
// {# ... #} Nunjucks comment or an HTML comment is ignored (documentation, not a
// render). British English throughout; this file must pass the gate.
//
// Optional argument: a target directory (default src). Single-file mode reads one
// template so the test can drive a negative fixture without touching src.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SRC_DIR = resolve(here, "../src");

// The single sanctioned renderer: it goes through the factState filter and shows
// the value only for a publishable state. Allowlisted by path, not basename.
const SANCTIONED = resolve(here, "../src/_includes/components/macros.njk");

const TEMPLATE_EXT = /\.(njk|md|html)$/;
const isDir = (path) => existsSync(path) && statSync(path).isDirectory();

function templatesIn(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...templatesIn(full));
    else if (TEMPLATE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

// Strip {# ... #} and <!-- ... --> comments so a `.value` mentioned in prose does
// not trip the gate. Newlines are preserved so line numbers stay accurate.
function stripComments(text) {
  return text
    .replace(/\{#[\s\S]*?#\}/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
}

// Any member access ending in `.value` that a template would RENDER is the danger
// token (fact.value, product.manufacturer.value, ...). d.value / p.value inside
// the sanctioned macro are the derived, already-gated projections and are exempt
// by the path allowlist.
const RAW_VALUE = /\.value\b/;

function scan(path) {
  const violations = [];
  if (resolve(path) === SANCTIONED) return violations;
  const lines = stripComments(readFileSync(path, "utf8")).split("\n");
  lines.forEach((line, i) => {
    if (RAW_VALUE.test(line)) violations.push({ path, line: i + 1, text: line.trim() });
  });
  return violations;
}

const target = resolve(process.argv[2] || DEFAULT_SRC_DIR);
const files = isDir(target) ? templatesIn(target) : [target];
const violations = files.flatMap(scan);

if (violations.length > 0) {
  for (const v of violations) {
    console.error(
      `Render-safety failed: ${relative(process.cwd(), v.path)}:${v.line} renders a raw ".value" ` +
      `(${v.text}). Render facts through the sourcedValue macro (which gates on factState) so a ` +
      `withheld or contested value can never reach a reader (R-31).`
    );
  }
  process.exit(1);
}

console.log(`Render-safety gate passed; scanned ${files.length} template(s) for raw fact-value renders.`);
