// The pure verification gate (lib/verification.mjs) has no fs and no network, so
// the same functions run here under node:test and, later, at render time. These
// tests pin the refined D-15 precedence (wrong > contested > non-resolving-citation
// > disagreement > insufficient[split] > stale > confirmed), the two claim
// standards (D-05 corroborable / D-06 authoritative), adjudication clearing (R-03),
// the CITATION_TTL_DAYS fail-safe (R-07/R-08), and the staleness classifier
// (D-16/R-17/R-25a). The fail-safe direction (non-RESOLVES / UNCHECKED / expired
// -> withheld) is asserted explicitly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  CITATION_TTL_DAYS,
  deriveVerificationState,
  meetsCorroborable,
  meetsAuthoritative,
  classifyStaleness,
  isPastStaleness,
  lastVerified,
  checkDistinctLineage,
  lineageSimilarityWarnings,
  checkMeasureMismatch,
  checkValueDivergence,
  checkConfirmsContradictValue
} from "../lib/verification.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(dir, rel), "utf8"));

const TODAY = "2026-07-01";
const toMap = (arr) => new Map(arr.map((s) => [s.id, s]));

// A cached verdict entry. checkedAt defaults to a within-TTL timestamp.
const entry = (over = {}) => ({
  verdict: "RESOLVES",
  resolvedVia: "live",
  checkedAt: "2026-07-01T09:00:00Z",
  statusCode: 200,
  snapshotUrl: null,
  ...over
});

// n whole days before TODAY, as a full ISO timestamp (for checkedAt TTL tests).
function daysAgoISO(n) {
  return new Date(Date.UTC(2026, 6, 1) - n * 86400000).toISOString();
}
// n whole months before TODAY, as a YYYY-MM-DD date (for staleness tests).
function monthsAgoDate(n) {
  return new Date(Date.UTC(2026, 6 - n, 1)).toISOString().slice(0, 10);
}

// A minimal registry: a primary and a secondary, each its own lineage root.
const SOURCES = [
  { id: "prim-a", sourceType: "primary", derivedFrom: null, publisher: "Authority A", url: "https://a.example.gov.uk/x" },
  { id: "sec-b", sourceType: "secondary", derivedFrom: null, publisher: "Publisher B", url: "https://b.example.com/y" }
];
const byId = toMap(SOURCES);
const freshBoth = new Map([
  ["prim-a", entry()],
  ["sec-b", entry()]
]);

const confirmsPass = (over = {}) => ({
  reviewerKind: "human",
  sourcesChecked: ["prim-a"],
  measure: { basis: "n/a", state: "n/a" },
  checkedValue: "x",
  verdict: "confirms",
  checkedOn: "2026-06-30",
  ...over
});

// A two-pass, two-lineage, one-primary corroborable fact that publishes.
function corroborableConfirmed(over = {}) {
  return {
    value: "x",
    sources: ["prim-a", "sec-b"],
    claimType: "corroborable",
    verification: {
      passes: [
        confirmsPass({ sourcesChecked: ["prim-a"] }),
        confirmsPass({ reviewerKind: "ai", sourcesChecked: ["sec-b"] })
      ],
      ...over
    }
  };
}

// --- markedWrong precedence (VRFY-04, continuous) ---

test("markedWrong forces withheld-wrong even when two confirms passes would otherwise publish", () => {
  const fact = corroborableConfirmed({ markedWrong: { note: "editor found it false", date: "2026-06-30" } });
  const { state } = deriveVerificationState(fact, byId, freshBoth, TODAY, "product");
  assert.equal(state, "withheld-wrong");
});

// --- contested precedence (VRFY-11, R-14) ---

test("adjudicated contested publishes as published-contested only when every position citation is a fresh RESOLVES", () => {
  const fact = {
    value: null,
    sources: ["prim-a", "sec-b"],
    claimType: "corroborable",
    verification: {
      passes: [confirmsPass()],
      adjudication: { outcome: "contested", note: "genuine dispute", date: "2026-06-30" },
      contested: {
        positions: [
          { value: 13, sources: ["prim-a"], note: "pre-reformulation" },
          { value: 17, sources: ["sec-b"], note: "label figure" }
        ]
      }
    }
  };
  assert.equal(deriveVerificationState(fact, byId, freshBoth, TODAY, "product").state, "published-contested");
});

test("a contested position citing a non-RESOLVES source degrades to withheld, never a dead published citation (R-14)", () => {
  const fact = {
    value: null,
    sources: ["prim-a", "sec-b"],
    claimType: "corroborable",
    verification: {
      passes: [confirmsPass()],
      adjudication: { outcome: "contested", note: "genuine dispute", date: "2026-06-30" },
      contested: {
        positions: [
          { value: 13, sources: ["prim-a"], note: "pre-reformulation" },
          { value: 17, sources: ["sec-b"], note: "label figure" }
        ]
      }
    }
  };
  const existence = new Map([["prim-a", entry()], ["sec-b", entry({ verdict: "DOES_NOT_RESOLVE", statusCode: 404 })]]);
  const { state } = deriveVerificationState(fact, byId, existence, TODAY, "product");
  assert.notEqual(state, "published-contested");
  assert.match(state, /^withheld-/);
});

// --- citation existence + TTL fail-safe (VRFY-07, R-07/R-08/R-15) ---

test("CITATION_TTL_DAYS is the pinned 180-day ceiling", () => {
  assert.equal(CITATION_TTL_DAYS, 180);
});

test("a RESOLVES verdict older than CITATION_TTL_DAYS is treated as UNCHECKED -> withheld-unverified (TTL expiry, R-07)", () => {
  const fact = corroborableConfirmed();
  const existence = new Map([
    ["prim-a", entry({ checkedAt: daysAgoISO(200) })],
    ["sec-b", entry()]
  ]);
  assert.equal(deriveVerificationState(fact, byId, existence, TODAY, "product").state, "withheld-unverified");
});

test("M4: a RESOLVES cache entry dated in the FUTURE is not fresh -> withheld-unverified (fails open guard)", () => {
  const fact = corroborableConfirmed();
  const existence = new Map([
    ["prim-a", entry({ checkedAt: "2027-01-01T09:00:00Z" })], // a future checkedAt
    ["sec-b", entry()]
  ]);
  assert.equal(deriveVerificationState(fact, byId, existence, TODAY, "product").state, "withheld-unverified");
});

for (const verdict of ["DOES_NOT_RESOLVE", "ACCESS_BLOCKED", "INDETERMINATE"]) {
  test(`a ${verdict} cited by a confirms pass derives to withheld-unverified (fail-safe, R-08)`, () => {
    const fact = corroborableConfirmed();
    const existence = new Map([["prim-a", entry({ verdict })], ["sec-b", entry()]]);
    assert.equal(deriveVerificationState(fact, byId, existence, TODAY, "product").state, "withheld-unverified");
  });
}

test("an absent (uncached) verdict for a confirms-pass source derives to withheld-unverified (R-08)", () => {
  const fact = corroborableConfirmed();
  const existence = new Map([["prim-a", entry()]]); // sec-b uncached
  assert.equal(deriveVerificationState(fact, byId, existence, TODAY, "product").state, "withheld-unverified");
});

test("a stray inaccessible pass citing a not-yet-resolving source does NOT withhold an otherwise-sufficient fact (R-15)", () => {
  const fact = corroborableConfirmed();
  fact.verification.passes.push({
    reviewerKind: "ai",
    sourcesChecked: ["never-checked"],
    measure: { basis: "n/a", state: "n/a" },
    verdict: "inaccessible",
    checkedOn: "2026-06-30"
  });
  // never-checked is absent from the existence map, but it is only cited by an
  // inaccessible pass, so the RESOLVES precondition (scoped to confirms passes) ignores it.
  assert.equal(deriveVerificationState(fact, byId, freshBoth, TODAY, "product").state, "published-confirmed");
});

// --- disagreement + adjudication clearing (VRFY-08, R-03/R-04) ---

test("a measure mismatch across confirms passes derives to withheld-open-disagreement", () => {
  const factData = load("fixtures/invalid/measure-mismatch.json");
  const sources = toMap([
    { id: "off", sourceType: "tertiary", derivedFrom: null },
    { id: "lucozade-grocer-2017", sourceType: "secondary", derivedFrom: null }
  ]);
  const existence = new Map([["off", entry()], ["lucozade-grocer-2017", entry()]]);
  assert.equal(deriveVerificationState(factData, sources, existence, TODAY, "product").state, "withheld-open-disagreement");
});

test("a disputes pass withholds unless a later human adjudication.outcome confirmed clears it (R-03)", () => {
  const withDispute = corroborableConfirmed();
  withDispute.verification.passes.push({
    reviewerKind: "human",
    sourcesChecked: ["prim-a"],
    measure: { basis: "n/a", state: "n/a" },
    verdict: "disputes",
    checkedOn: "2026-06-29"
  });
  // Without adjudication: withheld-open-disagreement.
  assert.equal(deriveVerificationState(withDispute, byId, freshBoth, TODAY, "product").state, "withheld-open-disagreement");

  // Adjudication confirmed dated on/after the disputing pass clears it.
  withDispute.verification.adjudication = { outcome: "confirmed", note: "editor confirmed", date: "2026-06-30" };
  assert.equal(deriveVerificationState(withDispute, byId, freshBoth, TODAY, "product").state, "published-confirmed");
});

test("an adjudication dated BEFORE the disputing pass does not clear the disagreement", () => {
  const fact = corroborableConfirmed();
  fact.verification.passes.push({
    reviewerKind: "human",
    sourcesChecked: ["prim-a"],
    measure: { basis: "n/a", state: "n/a" },
    verdict: "disputes",
    checkedOn: "2026-06-30"
  });
  fact.verification.adjudication = { outcome: "confirmed", note: "stale ruling", date: "2026-06-29" };
  assert.equal(deriveVerificationState(fact, byId, freshBoth, TODAY, "product").state, "withheld-open-disagreement");
});

test("adjudication.outcome corrected clears the disagreement and substitutes correctedValue as the fact value (R-03)", () => {
  const fact = corroborableConfirmed();
  fact.verification.passes.push({
    reviewerKind: "human",
    sourcesChecked: ["prim-a"],
    measure: { basis: "n/a", state: "n/a" },
    verdict: "disputes",
    checkedOn: "2026-06-29"
  });
  fact.verification.adjudication = { outcome: "corrected", note: "amended", date: "2026-06-30", correctedValue: "AMENDED" };
  const result = deriveVerificationState(fact, byId, freshBoth, TODAY, "product");
  assert.equal(result.state, "published-confirmed");
  assert.equal(result.value, "AMENDED");
});

// --- H3: confirms passes whose checkedValue contradicts fact.value ---

test("H3: two confirms reading X while the fact asserts Y auto-raise withheld-open-disagreement", () => {
  const fact = corroborableConfirmed();
  fact.value = "Y";
  // Both confirms agree on X, but the fact publishes Y.
  fact.verification.passes = [
    confirmsPass({ sourcesChecked: ["prim-a"], checkedValue: "X" }),
    confirmsPass({ reviewerKind: "ai", sourcesChecked: ["sec-b"], checkedValue: "X" })
  ];
  assert.equal(checkConfirmsContradictValue(fact.verification.passes, fact), true);
  assert.equal(deriveVerificationState(fact, byId, freshBoth, TODAY, "product").state, "withheld-open-disagreement");
});

test("H3: two confirms reading Y matching the fact publish as published-confirmed (unaffected)", () => {
  const fact = corroborableConfirmed();
  fact.value = "Y";
  fact.verification.passes = [
    confirmsPass({ sourcesChecked: ["prim-a"], checkedValue: "Y" }),
    confirmsPass({ reviewerKind: "ai", sourcesChecked: ["sec-b"], checkedValue: "Y" })
  ];
  assert.equal(checkConfirmsContradictValue(fact.verification.passes, fact), false);
  assert.equal(deriveVerificationState(fact, byId, freshBoth, TODAY, "product").state, "published-confirmed");
});

test("H3: a confirms pass with no checkedValue does not over-fire (auxiliary-optional case)", () => {
  const fact = corroborableConfirmed();
  fact.value = "Y";
  fact.verification.passes = [
    confirmsPass({ sourcesChecked: ["prim-a"], checkedValue: undefined }),
    confirmsPass({ reviewerKind: "ai", sourcesChecked: ["sec-b"], checkedValue: undefined })
  ];
  // Delete the key entirely (confirmsPass spread would otherwise set it undefined explicitly).
  for (const p of fact.verification.passes) delete p.checkedValue;
  assert.equal(checkConfirmsContradictValue(fact.verification.passes, fact), false);
  assert.equal(deriveVerificationState(fact, byId, freshBoth, TODAY, "product").state, "published-confirmed");
});

// --- claim-typed sufficiency + the VRFY-03 in-review vs unverified split ---

test("VRFY-03 split: an under-the-bar fact whose citations RESOLVE with one recorded pass is withheld-in-review", () => {
  const fact = corroborableConfirmed();
  fact.verification.passes = [confirmsPass({ sourcesChecked: ["prim-a"] })]; // only one confirms
  assert.equal(deriveVerificationState(fact, byId, freshBoth, TODAY, "product").state, "withheld-in-review");
});

test("VRFY-03 split: the same under-the-bar shape with zero recorded passes is withheld-unverified", () => {
  const fact = corroborableConfirmed();
  fact.verification.passes = [];
  assert.equal(deriveVerificationState(fact, byId, freshBoth, TODAY, "product").state, "withheld-unverified");
});

test("VRFY-01: a corroborable fact with two confirms over two distinct lineages and >=1 primary publishes", () => {
  assert.equal(deriveVerificationState(corroborableConfirmed(), byId, freshBoth, TODAY, "product").state, "published-confirmed");
});

test("meetsCorroborable requires >=2 confirms, >=2 distinct lineages and >=1 primary", () => {
  const twoConfirms = [confirmsPass({ sourcesChecked: ["prim-a"] }), confirmsPass({ sourcesChecked: ["sec-b"] })];
  assert.equal(meetsCorroborable(twoConfirms, corroborableConfirmed(), byId), true);
  // Both cite the primary only -> one lineage, fails.
  const oneLineage = [confirmsPass({ sourcesChecked: ["prim-a"] }), confirmsPass({ sourcesChecked: ["prim-a"] })];
  assert.equal(meetsCorroborable(oneLineage, corroborableConfirmed(), byId), false);
  // Two lineages but no primary -> fails.
  const noPrimary = toMap([
    { id: "sec-b", sourceType: "secondary", derivedFrom: null },
    { id: "sec-c", sourceType: "secondary", derivedFrom: null }
  ]);
  const twoSecondary = [confirmsPass({ sourcesChecked: ["sec-b"] }), confirmsPass({ sourcesChecked: ["sec-c"] })];
  assert.equal(meetsCorroborable(twoSecondary, corroborableConfirmed(), noPrimary), false);
});

// --- authoritative standard (D-06, reviewerKind axis) ---

test("D-06: an authoritative fact with one authority pass plus a distinct-reviewerKind re-read publishes", () => {
  const factData = load("fixtures/valid/verification-confirmed.json"); // human + blinded-reread
  const sources = toMap([{ id: "sbf-gbi-2020", sourceType: "primary", derivedFrom: null }]);
  const existence = new Map([["sbf-gbi-2020", entry()]]);
  assert.equal(deriveVerificationState(factData, sources, existence, TODAY, "brand").state, "published-confirmed");
});

test("D-06: two same-reviewerKind authoritative passes are withheld-in-review; distinct reviewerKind publishes", () => {
  const sources = toMap([{ id: "sbf-gbi-2020", sourceType: "primary", derivedFrom: null }]);
  const existence = new Map([["sbf-gbi-2020", entry()]]);
  const base = {
    value: "Authority Ltd",
    sources: ["sbf-gbi-2020"],
    claimType: "authoritative"
  };
  const sameKind = {
    ...base,
    verification: {
      passes: [
        { reviewerKind: "human", sourcesChecked: ["sbf-gbi-2020"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" },
        { reviewerKind: "human", sourcesChecked: ["sbf-gbi-2020"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" }
      ]
    }
  };
  assert.equal(deriveVerificationState(sameKind, sources, existence, TODAY, "brand").state, "withheld-in-review");
  assert.equal(meetsAuthoritative(sameKind.verification.passes), false);

  const distinctKind = {
    ...base,
    verification: {
      passes: [
        { reviewerKind: "human", sourcesChecked: ["sbf-gbi-2020"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" },
        { reviewerKind: "blinded-reread", sourcesChecked: ["sbf-gbi-2020"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" }
      ]
    }
  };
  assert.equal(deriveVerificationState(distinctKind, sources, existence, TODAY, "brand").state, "published-confirmed");
  assert.equal(meetsAuthoritative(distinctKind.verification.passes), true);
});

// --- staleness (VRFY-09/12, D-16/R-17/R-25a) ---

function authoritativeStale(checkedOn, claimDomain) {
  return {
    value: "Authority Ltd",
    sources: ["prim-a"],
    claimType: "authoritative",
    claimDomain,
    verification: {
      passes: [
        { reviewerKind: "human", sourcesChecked: ["prim-a"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn },
        { reviewerKind: "blinded-reread", sourcesChecked: ["prim-a"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn }
      ]
    }
  };
}

test("a regulatory fact verified 13 months ago is published-stale; a current fact only past 24 months", () => {
  const reg = authoritativeStale(monthsAgoDate(13), "regulatory");
  assert.equal(deriveVerificationState(reg, byId, new Map([["prim-a", entry()]]), TODAY, "brand").state, "published-stale");

  const currentRecent = authoritativeStale(monthsAgoDate(13), "label");
  assert.equal(deriveVerificationState(currentRecent, byId, new Map([["prim-a", entry()]]), TODAY, "product").state, "published-confirmed");

  const currentOld = authoritativeStale(monthsAgoDate(25), "label");
  assert.equal(deriveVerificationState(currentOld, byId, new Map([["prim-a", entry()]]), TODAY, "product").state, "published-stale");
});

test("a historical timeline-event fact is never stale, classified via the entityType hint (R-17)", () => {
  const hist = authoritativeStale(monthsAgoDate(60), undefined);
  assert.equal(classifyStaleness(hist, "timeline-event"), "historical");
  assert.equal(deriveVerificationState(hist, byId, new Map([["prim-a", entry()]]), TODAY, "timeline-event").state, "published-confirmed");
});

test("a future-dated lastVerified never reads as fresh (R-25a)", () => {
  const future = authoritativeStale("2027-01-01", "label");
  const { state } = deriveVerificationState(future, byId, new Map([["prim-a", entry()]]), TODAY, "product");
  assert.notEqual(state, "published-confirmed");
  assert.equal(state, "published-stale");
  assert.equal(isPastStaleness(future, "2027-01-01", TODAY, "product"), true);
});

test("classifyStaleness honours an explicit stalenessClass override ahead of claimDomain", () => {
  const fact = { claimDomain: "regulatory", verification: { stalenessClass: "historical" } };
  assert.equal(classifyStaleness(fact, "product"), "historical");
});

test("lastVerified returns the maximum checkedOn among confirms passes", () => {
  const passes = [
    { verdict: "confirms", checkedOn: "2026-01-01" },
    { verdict: "confirms", checkedOn: "2026-06-30" }
  ];
  assert.equal(lastVerified(passes), "2026-06-30");
});

// ============================================================================
// Task 2: distinct-lineage gate, similarity warning, measure-mismatch, value-divergence
// ============================================================================

const wrap = (fact, path = "/fact") => [{ path, fact }];

// The Cadbury co-derived pair (two William Reed titles from one Mondelez release).
const CADBURY_SHARED = [
  { id: "mondelez-pr-2019", sourceType: "primary", derivedFrom: null, publisher: "Mondelez", url: "https://www.mondelezinternational.com/pr" },
  { id: "cdm-grocer-2019", sourceType: "secondary", derivedFrom: "mondelez-pr-2019", publisher: "The Grocer (William Reed)", url: "https://www.thegrocer.co.uk/a" },
  { id: "cdm-confectionerynews-2019", sourceType: "secondary", derivedFrom: "mondelez-pr-2019", publisher: "ConfectioneryNews (William Reed)", url: "https://www.confectionerynews.com/b" }
];
const DISTINCT_SOURCES = [
  { id: "prim-a", sourceType: "primary", derivedFrom: null, publisher: "Authority A", url: "https://a.example.gov.uk/x" },
  { id: "sec-b", sourceType: "secondary", derivedFrom: null, publisher: "Publisher B", url: "https://b.example.com/y" }
];

test("checkDistinctLineage flags a corroborable fact whose confirms passes collapse to one lineage, but not a genuinely distinct one", () => {
  const shared = load("fixtures/invalid/shared-lineage.json");
  assert.ok(checkDistinctLineage(wrap(shared), CADBURY_SHARED).errors.length >= 1);

  const distinct = corroborableConfirmed(); // cites prim-a (primary root) and sec-b (distinct root)
  assert.equal(checkDistinctLineage(wrap(distinct), DISTINCT_SOURCES).errors.length, 0);
});

test("checkDistinctLineage does not apply to an authoritative fact (rule scoped to corroborable, D-06)", () => {
  const authoritative = load("fixtures/valid/verification-confirmed.json");
  const sources = [{ id: "sbf-gbi-2020", sourceType: "primary", derivedFrom: null }];
  assert.equal(checkDistinctLineage(wrap(authoritative), sources).errors.length, 0);
});

test("two co-derived sources over a missing/typo derivedFrom root count as ONE lineage, not two (R-16)", () => {
  const { sources, fact } = load("fixtures/invalid/dangling-derivedfrom.json");
  assert.ok(checkDistinctLineage(wrap(fact), sources).errors.length >= 1);
});

test("a derivedFrom cycle canonicalises to one lineage and never fabricates two (R-16)", () => {
  const cyclic = [
    { id: "src-x", sourceType: "secondary", derivedFrom: "src-y" },
    { id: "src-y", sourceType: "secondary", derivedFrom: "src-x" }
  ];
  const fact = {
    value: "x",
    sources: ["src-x", "src-y"],
    claimType: "corroborable",
    verification: {
      passes: [
        { reviewerKind: "human", sourcesChecked: ["src-x"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" },
        { reviewerKind: "ai", sourcesChecked: ["src-y"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" }
      ]
    }
  };
  assert.ok(checkDistinctLineage(wrap(fact), cyclic).errors.length >= 1);
});

test("a tail feeding into a derivedFrom cycle still collapses to the cycle's lineage, never a second one (CR-01/R-16)", () => {
  // a-tail is NOT in the cycle; it derives INTO the b<->c cycle. The canonical
  // root must be the cycle's, so a-tail and b-node share one lineage. The pre-fix
  // reducer included the tail in the min and let a-tail resolve to itself, faking
  // a distinct lineage and publishing a co-derived fact as corroborated.
  const tailIntoCycle = [
    { id: "a-tail", sourceType: "primary", derivedFrom: "b-node" },
    { id: "b-node", sourceType: "secondary", derivedFrom: "c-node" },
    { id: "c-node", sourceType: "secondary", derivedFrom: "b-node" }
  ];
  const fact = {
    value: "x",
    sources: ["a-tail", "b-node"],
    claimType: "corroborable",
    verification: {
      passes: [
        { reviewerKind: "human", sourcesChecked: ["a-tail"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" },
        { reviewerKind: "ai", sourcesChecked: ["b-node"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" }
      ]
    }
  };
  assert.ok(checkDistinctLineage(wrap(fact), tailIntoCycle).errors.length >= 1);
});

test("checkMeasureMismatch is true for per-100g vs per-100ml passes and false for equal measures", () => {
  const mismatch = load("fixtures/invalid/measure-mismatch.json");
  assert.equal(checkMeasureMismatch(mismatch.verification.passes), true);

  const equal = [
    { verdict: "confirms", measure: { basis: "per-100g", state: "as-sold", unit: "g" }, checkedValue: 4.16 },
    { verdict: "confirms", measure: { basis: "per-100g", state: "as-sold", unit: "g" }, checkedValue: 4.16 }
  ];
  assert.equal(checkMeasureMismatch(equal), false);
});

test("checkValueDivergence is true for equal-measure passes reading 4.16 vs 17 and false for identical (R-04)", () => {
  const diverge = [
    { verdict: "confirms", measure: { basis: "per-100ml", state: "as-sold", unit: "g" }, checkedValue: 4.16 },
    { verdict: "confirms", measure: { basis: "per-100ml", state: "as-sold", unit: "g" }, checkedValue: 17 }
  ];
  assert.equal(checkValueDivergence(diverge), true);

  const identical = [
    { verdict: "confirms", measure: { basis: "per-100ml", state: "as-sold", unit: "g" }, checkedValue: 4.16 },
    { verdict: "confirms", measure: { basis: "per-100ml", state: "as-sold", unit: "g" }, checkedValue: 4.16 }
  ];
  assert.equal(checkValueDivergence(identical), false);
});

test("lineageSimilarityWarnings warns (does not error) on same-publisher sources lacking a declared derivedFrom link", () => {
  const twoWilliamReed = [
    { id: "cdm-grocer-2019", sourceType: "secondary", derivedFrom: null, publisher: "The Grocer (William Reed)", url: "https://www.thegrocer.co.uk/a" },
    { id: "lucozade-grocer-2017", sourceType: "secondary", derivedFrom: null, publisher: "The Grocer (William Reed)", url: "https://www.thegrocer.co.uk/b" }
  ];
  const fact = {
    value: "x",
    sources: ["cdm-grocer-2019", "lucozade-grocer-2017"],
    claimType: "corroborable",
    verification: {
      passes: [
        { reviewerKind: "human", sourcesChecked: ["cdm-grocer-2019"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" },
        { reviewerKind: "ai", sourcesChecked: ["lucozade-grocer-2017"], measure: { basis: "n/a", state: "n/a" }, verdict: "confirms", checkedOn: "2026-06-30" }
      ]
    }
  };
  const { warnings } = lineageSimilarityWarnings(wrap(fact), twoWilliamReed);
  assert.ok(warnings.length >= 1);
});
