// Offline regression tests for the two check-citations.mjs correctness fixes:
// BLOCKER-01 (a web.archive.org URL is probed directly, never diverted into a
// self-referential Wayback CDX query) and WARNING-01(b) (a source cited only
// inside a contested position is still enumerated for an existence check). Both
// pure functions: importing the module does not run the network job (main is
// guarded to direct invocation only), so these cases touch no fs and no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isBotHostile, sourceIdsForFact } from "../scripts/check-citations.mjs";

// ---- BLOCKER-01: web.archive.org is never routed to the bot-hostile path ----

test("isBotHostile is false for a web.archive.org snapshot URL (BLOCKER-01, D-08/R-19)", () => {
  // A directly-cited Wayback snapshot (the R-19 durable-archival citation): it IS
  // the archive, so it must be probed directly rather than diverted into a
  // snapshot-of-a-snapshot CDX query that can never resolve.
  const snapshot =
    "http://web.archive.org/web/20260121211831/https://www.wallsicecream.com/uk/p/vanilla.html";
  assert.equal(isBotHostile(snapshot), false);
  assert.equal(isBotHostile("https://web.archive.org/web/20200101000000/https://example.com/"), false);
});

test("isBotHostile still diverts the genuinely bot-hostile retail hosts (no regression)", () => {
  assert.equal(isBotHostile("https://www.tesco.com/groceries/en-GB/products/123"), true);
  assert.equal(isBotHostile("https://www.ocado.com/products/456"), true);
  assert.equal(isBotHostile("https://www.sainsburys.co.uk/gol-ui/product/789"), true);
});

test("isBotHostile is false for an ordinary public host and a malformed url", () => {
  assert.equal(isBotHostile("https://www.food.gov.uk/some/page"), false);
  assert.equal(isBotHostile("not a url"), false);
});

// ---- WARNING-01(b): a position-only source id is enumerated for existence ----

test("sourceIdsForFact includes a source cited only inside a contested position (WARNING-01, D-14)", () => {
  const fact = {
    sources: ["top-level-a"],
    claimType: "corroborable",
    verification: {
      contested: {
        positions: [
          { value: "a", sources: ["top-level-a"], note: "duplicated at top level" },
          { value: "b", sources: ["position-only-b"], note: "cited only inside the position" },
        ],
      },
    },
  };
  const ids = sourceIdsForFact(fact);
  assert.ok(ids.includes("position-only-b"),
    "a position-only source must be enumerated so it receives an existence check");
  assert.ok(ids.includes("top-level-a"));
});

test("sourceIdsForFact returns just the top-level sources when there is no contested block", () => {
  const fact = { sources: ["only-a", "only-b"], claimType: "authoritative" };
  assert.deepEqual(sourceIdsForFact(fact), ["only-a", "only-b"]);
});
