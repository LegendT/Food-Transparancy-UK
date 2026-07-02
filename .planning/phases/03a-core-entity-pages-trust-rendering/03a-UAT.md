---
status: complete
phase: 03a-core-entity-pages-trust-rendering
source: [03a-01-SUMMARY.md, 03a-02-SUMMARY.md, 03a-03-SUMMARY.md, 03a-04-SUMMARY.md, 03a-05-SUMMARY.md, 03a-06-SUMMARY.md]
started: 2026-07-02
updated: 2026-07-02
---

## Current Test

[testing complete]

## Tests

### 1. Product page loads and reads cleanly (Cadbury)
expected: Open http://127.0.0.1:8090/products/cadbury-dairy-milk/ - shows product name and the sections Ingredients, Nutrition, Allergens, Manufacturer, Sources, Recipe history in that order; no error/broken/blank cards.
result: pass

### 2. Unverified facts are withheld, never asserted (the core trust promise)
expected: On the Cadbury page, facts that are not yet verified read "Not yet verified; withheld." rather than showing a value. No unverified figure or claim is presented as fact.
result: pass

### 3. Allergen fail-safe (the highest-stakes render)
expected: On the Cadbury page, the Allergens section opens with a standing safety caveat ("Do not rely on this archive for allergy safety..."). Possible allergens (milk, tree nuts, cereals) read as warnings - "Treat as present until confirmed. Check the pack." Nothing anywhere reads "does not contain".
result: pass

### 4. Nutrition table is accessible and honest
expected: On the Cadbury page, Nutrition is a real table with columns Nutrient / Per 100g / Status. Figures Cadbury does not record read "Not recorded"; the sugars figure reads "Not yet verified" with a short "sources being checked" link. The table fits without needing to scroll sideways.
result: pass

### 5. Published-stale renders "review due" (sucralose regulatory status)
expected: Open http://127.0.0.1:8090/ingredients/sucralose/ - the GB regulatory status shows its value with a "Last verified 1 June 2023; review due." note (a verified fact whose review is overdue), not a withheld placeholder.
result: pass

### 6. Published authority position renders live (EFSA)
expected: On the sucralose page, a "Named authority's safety opinion" block shows EFSA's statement (safe at current uses; acceptable daily intake 15 mg per kg body weight per day), with confidence and evidence labels and a source/date disclosure.
result: pass

### 7. Contested change shows both sides (Lucozade recipe history)
expected: Open http://127.0.0.1:8090/products/lucozade-energy/ - the Recipe history shows a change flagged as contested, presenting both positions with each side's own source link, rather than picking a winner.
result: pass

### 8. Cross-linking works (ingredient <-> product)
expected: On the sucralose page there is a "products containing" list linking to Lucozade Energy; clicking it reaches the Lucozade product page. (The reverse relationship is the D-15 cross-link.)
result: pass

### 9. Accessibility: keyboard + screen reader + 320px (the end-of-phase AT check)
expected: On a product page and the ingredient page - keyboard-only navigation reaches every fact's "Source and date" disclosure and the nutrition "sources being checked" link moves focus to the matching provenance block; a screen reader reads the nutrition table's row/column headers; at 320px width / 400% zoom nothing overflows sideways and no meaning depends on colour alone.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none - all 9 tests passed]

## Notes

Test 9 (accessibility) verified via Chrome DevTools accessibility tree, not self-report:
- Nutrition table exposes table/rowgroup/row/columnheader/rowheader/cell roles (verbose a11y tree).
- Activating the "sources being checked" status link moves focus to #nutrition-sugars (tabindex="-1").
- At an emulated 320x800 viewport, no horizontal overflow on the product or ingredient page (table scrollWidth 288 < 320); trust cues carry text labels, not colour alone.
- Non-verbose a11y snapshot flattens table internals to StaticText; the verbose tree confirms correct semantics (initial flattening was a snapshot-mode artefact, not a defect).
