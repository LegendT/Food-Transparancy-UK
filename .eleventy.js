/**
 * Eleventy configuration.
 *
 * Data lives in src/_data as JSON and is auto-loaded as global data, so no
 * fact is ever hard-coded into a template. Swapping placeholder data for
 * verified records later means changing only the JSON (or the script that
 * writes it) - templates and components stay untouched.
 *
 * Mirrors the DEBT blueprint conventions, trimmed to the Phase 1 data shape.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { factForRenderFromData } from "./lib/render-state.mjs";
import { productsByIngredient, timelineByProduct } from "./lib/reverse-index.mjs";
import { allergenLine } from "./lib/allergen-copy.mjs";
import { citedSourceIds } from "./lib/cited-sources.mjs";

// Resolve the gate scripts ABSOLUTELY against this config file's directory, not
// the current working directory. A cwd-relative path would let an `eleventy`
// build launched from any other directory find no scripts and silently skip
// every gate (a fail-open). Anchored here, the hook gates regardless of cwd.
const HERE = dirname(fileURLToPath(import.meta.url));
const GATE_SCRIPTS = [
  "scripts/validate-data.mjs",
  "scripts/check-editorial.mjs",
  "scripts/check-images.mjs",
  "scripts/check-render-safety.mjs",
].map((s) => resolve(HERE, s));

export default function (eleventyConfig) {
  // Copy static assets straight through so pages ship styled.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Find the first item in an array whose key matches a value.
  // Nunjucks' own selectattr(..., "equalto", ...) is unreliable here, so this
  // gives templates a dependable lookup.
  eleventyConfig.addFilter("findBy", (arr, key, value) => {
    if (!Array.isArray(arr)) return undefined;
    return arr.find((item) => item && item[key] === value);
  });

  // The committed citation-existence verdict cache, read once at config load.
  // Absent = {} (every citation UNCHECKED -> the derivation withholds), matching
  // the offline gate. The network checker (scripts/check-citations.mjs) writes it;
  // the render path only ever READS it, exactly like the gate.
  const VERDICTS = (() => {
    try {
      return JSON.parse(readFileSync(resolve(HERE, ".cache/citation-verdicts.json"), "utf8"));
    } catch {
      return {};
    }
  })();
  const RENDER_TODAY = new Date().toISOString().slice(0, 10);

  // The reverse indices the entity templates read (D-15). addGlobalData functions
  // do NOT receive the _data cascade, so read the product and timeline JSON from
  // disk here exactly as the VERDICTS cache is read above, build filename-keyed
  // objects, and pass their values through the pure lib functions. Exposed as plain
  // objects so a template can bracket-access productsByIngredient[ingredient.id] and
  // timelineByProduct[product.id]. This is a pure lib module surfaced through
  // addGlobalData, NEVER a _data/*.js file (which validate-data.mjs forbids).
  const readEntityDir = (rel) => {
    const dir = resolve(HERE, rel);
    if (!existsSync(dir)) return {};
    const records = {};
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      try {
        records[entry.name.replace(/\.json$/, "")] = JSON.parse(
          readFileSync(join(dir, entry.name), "utf8")
        );
      } catch {
        // A malformed file is caught by the validate-data build gate; skip it here.
      }
    }
    return records;
  };
  eleventyConfig.addGlobalData(
    "productsByIngredient",
    productsByIngredient(readEntityDir("src/_data/products"))
  );
  eleventyConfig.addGlobalData(
    "timelineByProduct",
    timelineByProduct(readEntityDir("src/_data/timeline"))
  );

  // factState: the SANCTIONED render boundary (R-31). Templates derive a fact's
  // publishable projection through this filter and NEVER read fact.value directly;
  // check-render-safety.mjs fails the build on any raw fact-value render. Returns
  // { state, publishable, stale, contested, value?, positions } - value present
  // ONLY when the fact genuinely publishes.
  eleventyConfig.addFilter("factState", (fact, sourcesArray, entityType) =>
    factForRenderFromData(fact, sourcesArray, VERDICTS, RENDER_TODAY, entityType || null)
  );

  // allergenLine (D-12 / PROD-09): the pure, exhaustively-tested fail-safe copy
  // helper. The template calls it as a filter so the safety wording is a unit
  // invariant, never re-derived ad hoc in the template; the {allergen}
  // placeholder is interpolated from allergens.json in the template.
  eleventyConfig.addFilter("allergenLine", (presence, publishable) =>
    allergenLine(presence, publishable)
  );

  // citedSourceIds (PROD-04): the distinct source ids cited by every fact on a
  // product page, in first-seen order, so the page-level "Sources" roll-up gathers
  // manufacturer, ingredients, nutrition and allergen citations - not just the
  // first two. Pure and unit-tested (the collection cannot be done in-template
  // because Nunjucks {% set %} does not persist across a {% for %}).
  eleventyConfig.addFilter("citedSourceIds", (product) => citedSourceIds(product));

  // JSON for embedding inside a <script> tag - escapes "<" so a value can never
  // break out of the script element (defensive; the data is trusted).
  eleventyConfig.addFilter("jsonScript", (value) =>
    JSON.stringify(value).replace(/</g, "\\u003c")
  );

  // Format a number with thousands separators (British locale).
  eleventyConfig.addFilter("number", (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return value;
    }
    return new Intl.NumberFormat("en-GB").format(Number(value));
  });

  // ISO date (YYYY-MM-DD) for machine-readable output.
  eleventyConfig.addFilter("isoDate", (value) => {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  });

  // Format an ISO date as a readable British date, e.g. "10 June 2026".
  eleventyConfig.addFilter("readableDate", (value) => {
    if (!value) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  });

  // Fail-closed gate hook. A direct `eleventy` / `npx @11ty/eleventy` call never
  // fires npm's `prebuild` lifecycle, so this hook re-runs the same gates and
  // throws on any non-zero exit - neither the npm path nor a direct call can
  // fail open. Gated to runMode "build" so dev `--watch`/`--serve` rebuilds do
  // not re-spawn the gate processes on every save. On `npm run build` the gates
  // run twice (prebuild lifecycle + this hook): deliberate defence-in-depth over
  // idempotent read-only validators, not a bug.
  eleventyConfig.on("eleventy.before", (eventsArg) => {
    if (eventsArg.runMode !== "build") return;
    for (const script of GATE_SCRIPTS) {
      // Fail closed: the gate scripts exist from Wave 4 on, so a missing one is
      // an error, never a silent skip (a skip would let a build pass ungated).
      if (!existsSync(script)) {
        throw new Error(`Build gate missing: ${script}`);
      }
      const result = spawnSync(process.execPath, [script], { stdio: "inherit" });
      if (result.status !== 0) {
        throw new Error(`Build gate failed: ${script} exited with ${result.status}`);
      }
    }
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
