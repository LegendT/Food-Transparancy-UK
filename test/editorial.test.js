// UX-06 scoped British-English and neutral-editorial lint. Each negative fixture,
// scanned as analyst scope, returns at least one offender of the expected rule.
// The attributed-quote fixture (a banned motive phrase inside a blockquote) and
// the rule-explaining-doc fixture (a banned term behind the same-line directive)
// return ZERO Class B offenders, because lawful attributed quotation and
// rule-explaining analyst prose must not be blocked (DATA-04/PROD-08). Child-
// process spawns confirm the SCRIPT exits non-zero on a bad fixture and on an
// empty corpus (build-fail + non-zero-corpus proof; mirrors Plan 01-05 Task 3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { lint } from "../lib/editorial-rules.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(dir, rel), "utf8");
const SCRIPT = resolve(dir, "../scripts/check-editorial.mjs");
const CLASS_B = new Set(["superlative", "denigratory", "motive"]);
const classB = (offenders) => offenders.filter((o) => CLASS_B.has(o.rule));

test("an em-dash in analyst prose is rejected (UX-06 Class A)", () => {
  const offenders = lint(read("fixtures/invalid/editorial-emdash.md"), { scope: "analyst" });
  assert.ok(offenders.some((o) => o.rule === "em-dash"));
});

test("a US spelling in analyst prose is rejected (UX-06 Class A)", () => {
  const offenders = lint(read("fixtures/invalid/editorial-us-spelling.md"), { scope: "analyst" });
  assert.ok(offenders.some((o) => o.rule === "us-spelling"));
});

test("a superlative in analyst prose is rejected (UX-06 Class B)", () => {
  const offenders = lint(read("fixtures/invalid/editorial-superlative.md"), { scope: "analyst" });
  assert.ok(offenders.some((o) => o.rule === "superlative"));
});

test("a motive phrase in analyst prose is rejected (UX-06 Class B)", () => {
  const offenders = lint(read("fixtures/invalid/editorial-motive.md"), { scope: "analyst" });
  assert.ok(offenders.some((o) => o.rule === "motive"));
});

test("an attributed motive quote is lawful under quote scope (DATA-04/PROD-08)", () => {
  const text = read("fixtures/valid/editorial-attributed-quote.md");
  assert.equal(classB(lint(text, { scope: "quote" })).length, 0);
});

test("an attributed motive quote in a blockquote is lawful under analyst scope", () => {
  const text = read("fixtures/valid/editorial-attributed-quote.md");
  assert.equal(classB(lint(text, { scope: "analyst" })).length, 0);
});

test("a rule-explaining doc naming a banned term behind the directive passes (analyst scope)", () => {
  const text = read("fixtures/valid/editorial-rule-explaining-doc.md");
  assert.equal(classB(lint(text, { scope: "analyst" })).length, 0);
});

test("a banned word inside a legitimate word is not flagged (word-boundary)", () => {
  // "greed" inside "agreed", "center" inside no en-GB word here; prove no substring hit.
  const text = "The parties agreed the change and the centre held its position.";
  assert.equal(lint(text, { scope: "analyst" }).length, 0);
});

test("clean British analyst prose returns no offenders", () => {
  const text = "The recipe was reformulated and the change is recorded with its source and date.";
  assert.equal(lint(text, { scope: "analyst" }).length, 0);
});

test("the script exits non-zero on the em-dash fixture (build-fail proof)", () => {
  const fixture = resolve(dir, "fixtures/invalid/editorial-emdash.md");
  assert.throws(() => execFileSync(process.execPath, [SCRIPT, fixture], { stdio: "pipe" }));
});

test("the script exits non-zero on an empty corpus (the non-zero-corpus guard)", () => {
  const work = mkdtempSync(resolve(tmpdir(), "ft-ed-empty-"));
  try {
    assert.throws(() => execFileSync(process.execPath, [SCRIPT, work], { stdio: "pipe" }));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// The "soy" US-spelling rule (added during the Phase 1 review): "soy" is caught
// as a Class A offender, but "soya" (the en-GB form) is not, because the rule is
// word-boundary anchored.
test("soy is flagged as a US spelling but soya is not", () => {
  const onSoy = lint("Carries a may-contain-soy statement", { scope: "analyst" });
  assert.ok(onSoy.some((o) => o.rule === "us-spelling" && o.term.toLowerCase() === "soy"));
  const onSoya = lint("Carries a may-contain-soya statement", { scope: "analyst" });
  assert.equal(onSoya.filter((o) => o.rule === "us-spelling").length, 0);
});
