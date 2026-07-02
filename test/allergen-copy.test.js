// The D-12 safety invariant, proven exhaustively. allergenLine must return the
// exact fail-safe wording for every (presence x publishable) case, and NO
// return may ever contain the phrase "does not contain": a withheld absent
// claim reads as uncertainty, never as reassurance, and a withheld possible
// allergen reads as a warning, never as silence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { allergenLine } from "../lib/allergen-copy.mjs";

// The six exhaustive (presence x publishable) cases with their verbatim
// UI-SPEC Copywriting Contract wording.
const cases = [
  { presence: "present", publishable: true, expected: "Contains {allergen}." },
  { presence: "may-contain", publishable: true, expected: "May contain {allergen}." },
  { presence: "absent", publishable: true, expected: "Not declared on the sourced label." },
  {
    presence: "present",
    publishable: false,
    expected: "Possible {allergen}, not yet verified. Treat as present until confirmed. Check the pack.",
  },
  {
    presence: "may-contain",
    publishable: false,
    expected: "Possible {allergen}, not yet verified. Treat as present until confirmed. Check the pack.",
  },
  {
    presence: "absent",
    publishable: false,
    expected: "Not yet verified. We cannot confirm whether this product contains {allergen}. Check the pack.",
  },
];

for (const { presence, publishable, expected } of cases) {
  test(`allergenLine("${presence}", ${publishable}) returns the exact fail-safe copy`, () => {
    assert.equal(allergenLine(presence, publishable), expected);
  });
}

test("no allergenLine return contains the phrase 'does not contain' (D-12 safety invariant)", () => {
  for (const { presence, publishable } of cases) {
    const line = allergenLine(presence, publishable);
    assert.ok(
      !line.includes("does not contain"),
      `allergenLine("${presence}", ${publishable}) must never assert absence, got: ${line}`
    );
  }
});

test("a withheld absent claim never reads as reassurance", () => {
  const line = allergenLine("absent", false);
  assert.ok(line.includes("cannot confirm"), "must express uncertainty");
  assert.ok(line.includes("Check the pack."), "must direct the reader to the pack");
  assert.ok(!line.includes("does not contain"));
});

test("a withheld present/may-contain claim reads as a warning, never hidden", () => {
  for (const presence of ["present", "may-contain"]) {
    const line = allergenLine(presence, false);
    assert.ok(line.includes("Treat as present until confirmed."), `${presence} must warn`);
  }
});

test("no allergen name is baked in: only the {allergen} placeholder is present", () => {
  for (const { presence, publishable } of cases) {
    const line = allergenLine(presence, publishable);
    // The only permitted token is the literal placeholder; no real allergen
    // name (e.g. "Milk") is ever embedded by the helper.
    assert.ok(!/\b(Milk|Soya|Eggs|Peanuts|Fish)\b/.test(line));
  }
});

test("an unknown presence fails safe toward a warning, never toward absence", () => {
  const line = allergenLine("unheard-of", false);
  assert.ok(line.includes("Treat as present until confirmed."));
  assert.ok(!line.includes("does not contain"));
});
