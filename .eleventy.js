/**
 * Eleventy configuration.
 *
 * Data lives in src/_data as JSON and is auto-loaded as global data, so no
 * fact is ever hard-coded into a template. Swapping placeholder data for
 * verified records later means changing only the JSON (or the script that
 * writes it) — templates and components stay untouched.
 *
 * Mirrors the DEBT blueprint conventions, trimmed to the Phase 1 data shape.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Resolve the gate scripts ABSOLUTELY against this config file's directory, not
// the current working directory. A cwd-relative path would let an `eleventy`
// build launched from any other directory find no scripts and silently skip
// every gate (a fail-open). Anchored here, the hook gates regardless of cwd.
const HERE = dirname(fileURLToPath(import.meta.url));
const GATE_SCRIPTS = [
  "scripts/validate-data.mjs",
  "scripts/check-editorial.mjs",
  "scripts/check-images.mjs",
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

  // JSON for embedding inside a <script> tag — escapes "<" so a value can never
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
  // throws on any non-zero exit — neither the npm path nor a direct call can
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
