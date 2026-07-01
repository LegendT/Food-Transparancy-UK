// The pure data-relationship layer the entity templates depend on. Both indices
// must return a PLAIN OBJECT keyed by id (not a Map), because Nunjucks bracket
// access (productsByIngredient[ingredient.id]) does not work on a Map. An id with
// no matches has no key, which reads as undefined and an honest empty state
// in-template. These tests pin the empty, single and multi behaviour and the
// plain-object shape so a downstream template can trust the join.
import { test } from "node:test";
import assert from "node:assert/strict";
import { productsByIngredient, timelineByProduct } from "../lib/reverse-index.mjs";

const product = (id, ingredients) => ({ id, name: id.toUpperCase(), slug: id, ingredients });

test("productsByIngredient({}) returns an empty plain object", () => {
  const index = productsByIngredient({});
  assert.equal(index.constructor, Object);
  assert.deepEqual(index, {});
});

test("productsByIngredient tolerates a nullish argument without throwing", () => {
  assert.deepEqual(productsByIngredient(undefined), {});
  assert.deepEqual(productsByIngredient(null), {});
});

test("an unknown ingredient id has no key (undefined, an empty in-template state)", () => {
  const index = productsByIngredient({ p1: product("p1", ["sugar"]) });
  assert.equal(index["not-an-ingredient"], undefined);
});

test("a single product listing one ingredient id maps it to a one-element array of {id,name,slug}", () => {
  const index = productsByIngredient({ p1: product("beans-tin", ["haricot-beans"]) });
  assert.deepEqual(index["haricot-beans"], [{ id: "beans-tin", name: "BEANS-TIN", slug: "beans-tin" }]);
});

test("a product listing several ids appears under each id", () => {
  const index = productsByIngredient({ p1: product("p1", ["sugar", "salt", "water"]) });
  assert.equal(index["sugar"].length, 1);
  assert.equal(index["salt"].length, 1);
  assert.equal(index["water"].length, 1);
  assert.equal(index["sugar"][0].id, "p1");
});

test("two products sharing an ingredient id both appear under it", () => {
  const index = productsByIngredient({
    p1: product("p1", ["sugar"]),
    p2: product("p2", ["sugar"]),
  });
  assert.equal(index["sugar"].length, 2);
  assert.deepEqual(index["sugar"].map((p) => p.id).sort(), ["p1", "p2"]);
});

test("a product with no ingredients field contributes nothing and does not throw", () => {
  const index = productsByIngredient({
    p1: { id: "p1", name: "P1", slug: "p1" },
    p2: product("p2", ["sugar"]),
  });
  assert.deepEqual(Object.keys(index), ["sugar"]);
  assert.equal(index["sugar"].length, 1);
});

test("productsByIngredient returns a bracket-accessible plain object, never a Map", () => {
  const index = productsByIngredient({ p1: product("p1", ["sugar"]) });
  assert.equal(index instanceof Map, false);
  assert.equal(index.constructor, Object);
  assert.equal(index["sugar"][0].slug, "p1");
});

// timelineByProduct

const event = (id, productId) => ({ id, productId, date: "2020-01-01", changes: [] });

test("timelineByProduct({}) returns an empty plain object", () => {
  const index = timelineByProduct({});
  assert.equal(index.constructor, Object);
  assert.deepEqual(index, {});
});

test("timelineByProduct tolerates a nullish argument without throwing", () => {
  assert.deepEqual(timelineByProduct(undefined), {});
  assert.deepEqual(timelineByProduct(null), {});
});

test("a single event is grouped under its productId", () => {
  const index = timelineByProduct({ e1: event("e1", "lucozade-energy") });
  assert.equal(index["lucozade-energy"].length, 1);
  assert.equal(index["lucozade-energy"][0].id, "e1");
});

test("multiple events for one product group under it; a product with none has no key", () => {
  const index = timelineByProduct({
    e1: event("e1", "cadbury-dairy-milk"),
    e2: event("e2", "cadbury-dairy-milk"),
    e3: event("e3", "lucozade-energy"),
  });
  assert.equal(index["cadbury-dairy-milk"].length, 2);
  assert.equal(index["lucozade-energy"].length, 1);
  assert.equal(index["a-product-with-no-events"], undefined);
});

test("timelineByProduct returns a plain object, never a Map", () => {
  const index = timelineByProduct({ e1: event("e1", "p1") });
  assert.equal(index instanceof Map, false);
  assert.equal(index.constructor, Object);
});
