// The pure data-relationship layer the entity templates depend on (D-15). Both
// functions are pure and side-effect free, so the same logic runs under node:test
// and inside the Eleventy addGlobalData wiring. Each RETURNS A PLAIN OBJECT keyed
// by id (not a Map): Nunjucks bracket access (index[entity.id]) does not work on a
// Map, and an id with no matches simply has no key, which reads as undefined and an
// honest empty state in-template. The mirror of lib/referential.mjs: nullish-coalescing
// guards, no throwing on absent input.

// productsByIngredient(products): the INGR-04 reverse index. Iterates the
// filename-keyed products object, and for each ingredient id a product lists (the
// D-15 plain-scalar array) records { id, name, slug } under that ingredient id. A
// product with no ingredients field contributes nothing.
export function productsByIngredient(products) {
  const index = {};
  for (const product of Object.values(products ?? {})) {
    for (const ingredientId of product.ingredients ?? []) {
      (index[ingredientId] ??= []).push({
        id: product.id,
        name: product.name,
        slug: product.slug,
      });
    }
  }
  return index;
}

// timelineByProduct(events): the recipe-history join. Iterates the filename-keyed
// timeline object and groups each event under its productId. A product with no events
// has no key, so the template renders the honest "no recipe changes recorded yet"
// empty state rather than a broken stub.
export function timelineByProduct(events) {
  const index = {};
  for (const event of Object.values(events ?? {})) {
    (index[event.productId] ??= []).push(event);
  }
  return index;
}
