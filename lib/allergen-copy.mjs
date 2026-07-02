// The allergen fail-safe copy helper (D-12 / PROD-09, highest-stakes render).
//
// allergenLine(presence, publishable) returns the exact reader-facing wording
// for one allergen row, given its three-state `presence` and whether its
// provenance is publishable (the DERIVED factState projection, never the raw
// value). The {allergen} placeholder is interpolated by the template from
// allergens.json, so no allergen name is baked in here.
//
// The single load-bearing safety invariant, enforced exhaustively by
// test/allergen-copy.test.js: NO return value ever contains the phrase "does
// not contain". A withheld `absent` claim must read as uncertainty, never as
// reassurance; a withheld `present`/`may-contain` claim must read as a warning,
// never as silence. Both are properties of the branch, not of the data.
//
// British English throughout; no em-dashes; the strings are the verbatim
// UI-SPEC Copywriting Contract wording.
export function allergenLine(presence, publishable) {
  if (publishable) {
    if (presence === "present") return "Contains {allergen}.";
    if (presence === "may-contain") return "May contain {allergen}.";
    if (presence === "absent") return "Not declared on the sourced label.";
  } else {
    if (presence === "present" || presence === "may-contain") {
      return "Possible {allergen}, not yet verified. Treat as present until confirmed. Check the pack.";
    }
    if (presence === "absent") {
      return "Not yet verified. We cannot confirm whether this product contains {allergen}. Check the pack.";
    }
  }
  // Fail safe: an unknown presence must never read as safe. Default to a
  // treat-as-present warning rather than any wording that could imply absence.
  return "Possible {allergen}, not yet verified. Treat as present until confirmed. Check the pack.";
}
