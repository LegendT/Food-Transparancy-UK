// The distinct source ids cited by a product's CURRENT-STATE facts, in first-seen
// order (PROD-04). The page-level "Sources" roll-up gathers them from all
// current-state fact-bearing fields - manufacturer, ingredientsText, every
// nutrition figure, and every allergen's provenance - not just the first two, or
// the heading over-claims once nutrition and allergens land. Recipe-history
// (timeline) events are deliberately out of scope here: they are joined separately
// (timelineByProduct, not on the product object) and list their own sources per
// change in the Recipe history section, so the heading says "current-state facts".
// Pure and unit-tested: a Nunjucks {% set %}
// inside a {% for %} does not persist across iterations, so this collection (over
// the nutrition object and the allergens array) cannot be done correctly in-template.
// Sources of withheld facts are included by design: a withheld fact still cites its
// source (shown behind its own disclosure), so the roll-up reflects it too.
export function citedSourceIds(product) {
  if (!product) return [];
  const ids = [];
  const add = (fact) => {
    for (const id of fact?.sources ?? []) ids.push(id);
  };
  add(product.manufacturer);
  add(product.ingredientsText);
  for (const figure of Object.values(product.nutrition ?? {})) add(figure);
  for (const allergen of product.allergens ?? []) add(allergen?.provenance);
  return [...new Set(ids)];
}
