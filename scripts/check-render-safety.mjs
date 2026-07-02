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

// Any construct that would RENDER a raw fact `.value` is a danger token. Beyond
// plain member access (fact.value, product.manufacturer.value), the boundary must
// also deny the sibling forms that reach the same property or dump the whole object:
// bracket access (fact["value"]), the attr filter (fact | attr("value")), and
// whole-object serialisation (| dump / | tojson / | jsonScript), which would emit
// every field including a withheld or contested value while a `.value`-only check
// stayed green. jsonScript is this project's own <script>-embedding serialiser (see
// .eleventy.js): piping a raw fact or product object through it to embed a client
// dataset would leak the same withheld values, so it is denied here too. When a
// client-side dataset is added, embed a pre-projected SAFE dataset (already-gated
// values), never raw fact objects. A default-deny control must be as tight as the
// trust promise it enforces. d.value / p.value inside the sanctioned macro are the
// derived, already-gated projections and are exempt by the path allowlist
// (SANCTIONED returns early below).
const DANGER = [
  /\.value\b/,
  /\[\s*['"]value['"]\s*\]/,
  /\|\s*attr\(\s*['"]value['"]/,
  /\|\s*(?:dump|tojson|jsonScript)\b/,
];

// A two-variable for-loop enumerates an object's OWN keys and values at runtime, so
// {% for k, v in fact %}{{ v }} dumps a withheld `value` without the literal token
// the DANGER denylist looks for ever appearing in the source - the property name is
// a runtime binding, structurally invisible to a line regex. Object enumeration is
// therefore denied by DEFAULT; the only safe iterables are the meta.* config maps
// (the confidence/evidence level definitions), which carry no fact values. A future
// non-fact map that genuinely needs two-variable iteration must be added to
// SAFE_ITERABLES here - a small, explicit, auditable exception, consistent with the
// gate's default-deny stance. (Single-variable loops that then access `.value` are
// already caught by the denylist above.)
const OBJECT_ENUMERATION = /\bfor\s+\w+\s*,\s*\w+\s+in\s+([A-Za-z_$][\w.$]*)/;
const SAFE_ITERABLES = /^meta\./;

// Residual limitation (documented, not a silent gap): a line regex cannot resolve a
// value aliased through an intermediate binding, nor a bracket access with a computed
// key. The load-bearing guarantee is that facts render ONLY through the sanctioned
// macro (lib/render-state.mjs exposes the raw value only when publishable); this lint
// is the accidental-leak backstop. NOTE: <script> bodies are deliberately NOT exempt -
// inline JS must be fed a pre-projected safe dataset, never a raw `.value`.

function scan(path) {
  const violations = [];
  if (resolve(path) === SANCTIONED) return violations;
  const lines = stripComments(readFileSync(path, "utf8")).split("\n");
  lines.forEach((line, i) => {
    const enumMatch = line.match(OBJECT_ENUMERATION);
    const enumerationLeak = enumMatch && !SAFE_ITERABLES.test(enumMatch[1]);
    if (enumerationLeak || DANGER.some((re) => re.test(line))) {
      violations.push({ path, line: i + 1, text: line.trim() });
    }
  });
  return violations;
}

const target = resolve(process.argv[2] || DEFAULT_SRC_DIR);
const files = isDir(target) ? templatesIn(target) : [target];
const violations = files.flatMap(scan);

if (violations.length > 0) {
  for (const v of violations) {
    console.error(
      `Render-safety failed: ${relative(process.cwd(), v.path)}:${v.line} renders or serialises a raw fact value ` +
      `(${v.text}). Render facts through the sourcedValue macro (which gates on factState) so a ` +
      `withheld or contested value can never reach a reader (R-31).`
    );
  }
  process.exit(1);
}

console.log(`Render-safety gate passed; scanned ${files.length} template(s) for raw fact-value renders.`);
