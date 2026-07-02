import { isDeepStrictEqual } from "node:util";

// The pure, unit-testable heart of the trust layer: the D-15 precedence machine
// and the claim-typed sufficiency rules JSON Schema cannot express. Every function
// is pure - no fs, no network, no process.exit - so the same code runs under
// node:test and, later, at render time in Phase 3a. All inputs are assumed
// structurally valid: the Ajv gate runs first, so no field here is malformed. The
// load-bearing correctness is the precedence (STALE still publishes; WRONG and
// DISAGREEMENT withhold; a human adjudication actually resolves) and counting
// PASSES that meet the standard, never sources[].length (D-02, Pitfall 1).

// A fixed 180-day ceiling for v1: a cached RESOLVES verdict whose checkedAt is
// older than this many days before `today` is treated as UNCHECKED -> withheld,
// so a link that later died stops publishing without re-running the checker (R-07).
// The audit (02-06) SURFACES this same constant; the gate/derivation ENFORCES it -
// it is defined here once and imported, never redefined. Ponytail: v1 uses one
// flat ceiling; the upgrade path is a per-staleness-class TTL keyed off classifyStaleness.
export const CITATION_TTL_DAYS = 180;

// ---- date helpers (string arithmetic, avoiding the string-versus-Date hazard) ----

// Shift a YYYY-MM-DD date by `delta` whole months, returning a YYYY-MM-DD string.
// The day is CLAMPED to the last valid day of the target month, so adding months
// to a day that does not exist in the target (e.g. the 31st) does not roll into
// the following month and shift the staleness threshold by a few days (IN-01).
function addMonths(isoDate, delta) {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const targetMonthIndex = m - 1 + delta;
  // Day 0 of the next month is the last day of the target month (UTC-safe).
  const lastDayOfTarget = new Date(Date.UTC(y, targetMonthIndex + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDayOfTarget);
  return new Date(Date.UTC(y, targetMonthIndex, day)).toISOString().slice(0, 10);
}

// Whole-day age of a cached verdict's checkedAt relative to `today` (a date). A
// negative age (checkedAt after today's midnight) counts as fresh, not expired.
function ageDays(checkedAt, today) {
  const checked = Date.parse(checkedAt);
  const now = Date.parse(`${today.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(checked) || Number.isNaN(now)) return Infinity;
  return (now - checked) / 86400000;
}

// A cached entry satisfies the existence precondition only if it is a RESOLVES
// verdict whose checkedAt is within CITATION_TTL_DAYS of today (D-07/R-07). A
// checkedAt DATE after today is a future/bad date and cannot be fresh (mirroring
// isPastStaleness's future-date guard, M4): otherwise its negative age would slip
// under the TTL ceiling and a future-dated cache entry would fail open. Same-day
// intraday timestamps (checkedAt after today's midnight) stay fresh.
function isFreshResolves(entry, today) {
  if (!entry || entry.verdict !== "RESOLVES" || !entry.checkedAt) return false;
  if (entry.checkedAt.slice(0, 10) > today.slice(0, 10)) return false;
  return ageDays(entry.checkedAt, today) <= CITATION_TTL_DAYS;
}

// ---- lineage (transitive derivedFrom roots with deterministic cycle canonicalisation) ----

// Resolve a source id to its lineage root by following derivedFrom transitively.
// A derivedFrom pointing at an id absent from the registry resolves to that
// dangling id itself (so two sources over one missing root collapse to one
// lineage; the registry-integrity failure is caught as a build error in 02-03,
// not here). A cycle canonicalises to the lexicographically minimal id among its
// members, so co-cyclic sources deterministically collapse to ONE lineage (R-16).
function lineageRoot(id, sourcesById) {
  const seen = [];
  let current = id;
  while (true) {
    const parent = sourcesById.get(current)?.derivedFrom;
    if (parent === undefined || parent === null) return current;
    if (parent === current) return current; // self-loop: the cycle is {current}
    const idx = seen.indexOf(parent);
    if (idx !== -1) {
      // Canonicalise over the CYCLE MEMBERS ONLY - seen[idx..] plus current, where
      // parent closes the loop - never the non-cyclic tail (seen[0..idx-1]) that
      // merely fed into the cycle. Reducing over the whole prefix would let a tail
      // id sorting below every cycle member resolve to itself and fake a distinct
      // lineage (R-16).
      return [...seen.slice(idx), current].reduce((min, x) => (x < min ? x : min));
    }
    seen.push(current);
    current = parent;
  }
}

// ---- structured measure comparison (D-13, exact-match-or-disagree) ----

const MEASURE_KEYS = ["basis", "state", "unit", "jurisdiction", "asOf"];

function measuresEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return MEASURE_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null));
}

function confirmsOf(passes) {
  return (passes ?? []).filter((p) => p.verdict === "confirms");
}

// checkMeasureMismatch: any structural inequality of the measure objects across
// the confirms passes auto-raises a disagreement (D-13/VRFY-08).
export function checkMeasureMismatch(passes) {
  const confirms = confirmsOf(passes);
  if (confirms.length < 2) return false;
  const first = confirms[0].measure;
  return confirms.some((p) => !measuresEqual(first, p.measure));
}

// checkValueDivergence: among confirms passes that SHARE a measure, any inequality
// in the (checkedValue, unit) tuple auto-raises a disagreement (R-04). Structural
// deep equality (L1) so an array/object checkedValue is compared by content, not
// reference - two independently-parsed [1,2,3] readings are NOT a divergence; a
// numeric tolerance is the upgrade path. Over-raising is safe - routes to a human (D-13).
export function checkValueDivergence(passes) {
  const confirms = confirmsOf(passes);
  for (let i = 0; i < confirms.length; i++) {
    for (let j = i + 1; j < confirms.length; j++) {
      if (!measuresEqual(confirms[i].measure, confirms[j].measure)) continue;
      // checkedValue is schema-optional (the auxiliary-optional case): a pass that
      // omits it recorded no scalar to compare - a blinded re-read that confirms
      // transcription fidelity without re-extracting the value is the canonical D-06
      // shape. Only two passes that BOTH recorded a checkedValue can diverge; a
      // present-vs-absent pair is not a divergence (mirrors checkConfirmsContradictValue,
      // which likewise refuses to fire when any confirms pass omits checkedValue). Without
      // this guard, isDeepStrictEqual(real, undefined) is false and a sufficient fact is
      // silently withheld the moment an author omits checkedValue on one pass (R-04).
      if (confirms[i].checkedValue === undefined || confirms[j].checkedValue === undefined) continue;
      const sameValue =
        isDeepStrictEqual(confirms[i].checkedValue, confirms[j].checkedValue) &&
        (confirms[i].measure?.unit ?? null) === (confirms[j].measure?.unit ?? null);
      if (!sameValue) return true;
    }
  }
  return false;
}

// checkConfirmsContradictValue: the confirms passes AGREE with each other (no
// value divergence) yet their shared checkedValue differs from the fact's own
// asserted value - a fact whose passes read one thing while it publishes another
// (H3). Auto-raises a disagreement so it routes to a human, never build-fails.
// Fires ONLY when EVERY confirms pass records a checkedValue: a pass with no
// checkedValue is the auxiliary-optional case and must not over-fire, and a fact
// whose passes read exactly its value is unaffected.
export function checkConfirmsContradictValue(passes, fact) {
  const confirms = confirmsOf(passes);
  if (confirms.length === 0) return false;
  if (confirms.some((p) => p.checkedValue === undefined)) return false;
  // A divergence AMONG the confirms passes is the existing R-04 path; this check
  // only fires when they agree with each other but contradict fact.value.
  if (checkValueDivergence(passes)) return false;
  return confirms.some((p) => !isDeepStrictEqual(p.checkedValue, fact.value));
}

// ---- claim-typed sufficiency (D-05 / D-06) ----

// Corroborable (D-05): >=2 confirms passes, whose cited sources span >=2 distinct
// lineage roots, at least one of registry sourceType "primary".
export function meetsCorroborable(confirmsPasses, fact, sourcesById) {
  if (confirmsPasses.length < 2) return false;
  const citedIds = [...new Set(confirmsPasses.flatMap((p) => p.sourcesChecked))];
  const roots = new Set(citedIds.map((id) => lineageRoot(id, sourcesById)));
  if (roots.size < 2) return false;
  // The >=1 primary must be a lineage ORIGIN (derivedFrom == null), not a source
  // co-derived into another cited lineage (M1). "Co-derived sources do not count as
  // independent" (D-05), so a primary that derivesFrom a cited secondary cannot be
  // the primary that anchors corroboration - a genuine primary is the origin of its
  // own provenance, never downstream of a secondary.
  return citedIds.some((id) => {
    const s = sourcesById.get(id);
    return s?.sourceType === "primary" && (s.derivedFrom ?? null) === null;
  });
}

// Authoritative (D-06): 1 authority pass plus an independent RE-READ of the SAME
// authority by a DISTINCT reviewerKind (reader-axis independence). A re-read of a
// DIFFERENT source cannot catch a transcription error in the first, so the two
// distinct-reviewerKind passes must share a cited source (M2). Distinct-lineage
// does NOT apply - both passes cite the same authority by design.
export function meetsAuthoritative(confirmsPasses) {
  if (confirmsPasses.length < 2) return false;
  if (new Set(confirmsPasses.map((p) => p.reviewerKind)).size < 2) return false;
  // Require a single source that >=2 passes of DISTINCT reviewerKind both checked.
  const kindsBySource = new Map();
  for (const p of confirmsPasses) {
    for (const id of p.sourcesChecked ?? []) {
      if (!kindsBySource.has(id)) kindsBySource.set(id, new Set());
      kindsBySource.get(id).add(p.reviewerKind);
    }
  }
  return [...kindsBySource.values()].some((kinds) => kinds.size >= 2);
}

// ---- staleness (D-16 / R-17 / R-25a) ----

function isTimelineEntity(entityType) {
  return typeof entityType === "string" && entityType.toLowerCase().includes("timeline");
}

// D-16 derivation: an explicit stalenessClass override wins; else regulatory by
// claimDomain; else historical if the entityType hint marks a timeline entity;
// else current. Timeline membership is detected from the entityType/instance-path
// hint threaded in by the caller (R-17).
export function classifyStaleness(fact, entityType) {
  const override = fact.verification?.stalenessClass;
  if (override) return override;
  if (fact.claimDomain === "regulatory") return "regulatory";
  if (isTimelineEntity(entityType)) return "historical";
  return "current";
}

// lastVerified: the maximum checkedOn among the confirms passes (ISO date string).
export function lastVerified(confirmsPasses) {
  return confirmsPasses.reduce((max, p) => (p.checkedOn > max ? p.checkedOn : max), "");
}

// isPastStaleness: regulatory 12 months, current 24 months, historical never. A
// lastVerified in the FUTURE is NOT fresh, so a bad date cannot masquerade as
// current (R-25a). A missing lastVerified cannot be fresh either.
export function isPastStaleness(fact, lastVerifiedDate, today, entityType) {
  const cls = classifyStaleness(fact, entityType);
  if (cls === "historical") return false;
  if (!lastVerifiedDate) return true;
  const lv = lastVerifiedDate.slice(0, 10);
  const t = today.slice(0, 10);
  if (lv > t) return true; // future date is not fresh
  return lv < addMonths(t, -(cls === "regulatory" ? 12 : 24));
}

// The max checkedOn among the passes that constitute the open disagreement, so an
// adjudication is only accepted if it post-dates the latest disputing/mismatching pass.
function latestDisagreementDate(passes, confirms, disputing, measureConflict) {
  const involved = [...disputing];
  if (measureConflict) involved.push(...confirms);
  return involved.reduce((max, p) => (p.checkedOn > max ? p.checkedOn : max), "");
}

// ---- the D-15 precedence machine ----

// Map a fact + registry + cached existence verdicts + today + entityType hint to
// exactly one publication state (D-15, as refined by R-02/R-03/R-04/R-07/R-14/R-15).
// existenceBySourceId is Map<sourceId, { verdict, resolvedVia, checkedAt, statusCode, snapshotUrl }>.
export function deriveVerificationState(fact, sourcesById, existenceBySourceId, today, entityType) {
  const v = fact.verification ?? {};
  const passes = v.passes ?? [];
  const confirms = confirmsOf(passes);

  // 1. Human marked it wrong - continuous, wins over everything (D-03/VRFY-04).
  if (v.markedWrong) {
    return { state: "withheld-wrong", reasons: ["marked wrong by editor"] };
  }

  // 2. Human adjudicated contested - publish both sides, but only if every
  //    position's citation is a fresh RESOLVES; a dead citation degrades to
  //    withheld rather than publishing a dead link (R-14).
  if (v.adjudication?.outcome === "contested") {
    const positions = v.contested?.positions ?? [];
    const positionIds = [...new Set(positions.flatMap((p) => p.sources ?? []))];
    const allResolve =
      positionIds.length > 0 &&
      positionIds.every((id) => isFreshResolves(existenceBySourceId.get(id), today));
    if (allResolve) {
      return { state: "published-contested", reasons: ["adjudicated contested; all positions cite a fresh RESOLVES"] };
    }
    return { state: "withheld-unverified", reasons: ["contested, but a position cites a non-resolving source (R-14)"] };
  }

  // 3. Existence precondition, scoped to the sources cited by the CONFIRMS passes
  //    that would establish sufficiency (NOT all passes, so a stray inaccessible/
  //    disputes pass does not falsely withhold, R-15). A verdict that is not a
  //    fresh RESOLVES (non-RESOLVES, absent, or a RESOLVES past its TTL) is
  //    treated as UNCHECKED -> withheld (D-07/R-07/R-08).
  const confirmsCitedIds = new Set(confirms.flatMap((p) => p.sourcesChecked));
  for (const id of confirmsCitedIds) {
    const entry = existenceBySourceId.get(id);
    if (!isFreshResolves(entry, today)) {
      return {
        state: "withheld-unverified",
        reasons: [`citation ${id} is not a fresh RESOLVES (verdict ${entry?.verdict ?? "UNCHECKED"}); TTL ${CITATION_TTL_DAYS}d`]
      };
    }
  }

  // 4. Open disagreement: any disputes verdict, a measure mismatch, or a value
  //    divergence over the confirms passes - UNLESS a human adjudication.outcome
  //    "confirmed" or "corrected" dated on/after the latest disputing/mismatching
  //    pass clears it (R-03). "corrected" substitutes correctedValue as the fact
  //    value before resuming sufficiency.
  const disputing = passes.filter((p) => p.verdict === "disputes");
  const measureConflict = checkMeasureMismatch(confirms) || checkValueDivergence(confirms);
  // The confirms passes agree with each other but read a value the fact does not
  // publish (H3) - also an open disagreement routed to a human.
  const valueContradiction = checkConfirmsContradictValue(passes, fact);
  // A VALUE disagreement (the confirms read different values, or read a value the
  // fact does not publish) is about WHICH reading is right - only "corrected", with
  // an explicit correctedValue, can honestly resolve it. "confirmed" leaves
  // fact.value untouched and re-checks nothing, so it must NOT clear a value
  // disagreement (H1): confirming a value your own evidence contradicts would
  // publish an unsupported value with a full confirmed chip. "confirmed" still
  // clears a pure measure mismatch or a lone disputes pass (fact.value stands).
  const valueDisagreement = checkValueDivergence(confirms) || valueContradiction;
  let effectiveValue = fact.value;
  if (disputing.length > 0 || measureConflict || valueContradiction) {
    const adj = v.adjudication;
    const clears =
      adj &&
      (adj.outcome === "corrected" ||
        (adj.outcome === "confirmed" && !valueDisagreement)) &&
      adj.date >= latestDisagreementDate(passes, confirms, disputing, measureConflict || valueContradiction);
    if (!clears) {
      return { state: "withheld-open-disagreement", reasons: ["passes disagree, measures mismatch, values diverge, or confirms contradict the asserted value"] };
    }
    if (adj.outcome === "corrected") {
      // A "corrected" adjudication that supplies no usable value (correctedValue
      // null/undefined) has nothing to publish - withhold rather than render a
      // blank confirmed fact (L2).
      if (adj.correctedValue === null || adj.correctedValue === undefined) {
        return { state: "withheld-in-review", reasons: ["adjudication corrected the value to null; nothing to publish"] };
      }
      effectiveValue = adj.correctedValue;
    }
  }

  // 5. Claim-typed sufficiency, split on the VRFY-03 workflow axis: >=1 recorded
  //    pass below the bar is withheld-in-review; zero recorded passes is withheld-unverified.
  const sufficient =
    fact.claimType === "corroborable"
      ? meetsCorroborable(confirms, fact, sourcesById)
      : meetsAuthoritative(confirms);
  if (!sufficient) {
    return passes.length >= 1
      ? { state: "withheld-in-review", reasons: ["recorded passes below the claim-type standard (in-review)"] }
      : { state: "withheld-unverified", reasons: ["zero recorded passes (unverified)"] };
  }

  // 6. Sufficient but past its staleness threshold - STILL publishes (D-16).
  if (isPastStaleness(fact, lastVerified(confirms), today, entityType)) {
    return { state: "published-stale", reasons: ["past staleness threshold; last verified shown as review-due"], value: effectiveValue };
  }

  // 7. Published and current.
  const reasons = effectiveValue === fact.value ? [] : ["adjudication corrected value substituted"];
  return { state: "published-confirmed", reasons, value: effectiveValue };
}

// ---- lineage gate + non-blocking similarity warning (D-12 / R-16) ----

// checkDistinctLineage fires ONLY for corroborable facts: the confirms passes'
// cited sources must span >=2 distinct lineage roots (co-derived sources sharing a
// derivedFrom root count as ONE lineage; a cycle collapses to one lineage, R-16).
// Pure { errors }, shaped like referential.mjs's checkRegulatoryJurisdiction.
export function checkDistinctLineage(facts, sources) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const errors = [];
  for (const { path, fact } of facts) {
    if (fact.claimType !== "corroborable") continue;
    const confirms = confirmsOf(fact.verification?.passes);
    const citedIds = [...new Set(confirms.flatMap((p) => p.sourcesChecked))];
    const roots = new Set(citedIds.map((id) => lineageRoot(id, byId)));
    if (roots.size < 2) {
      errors.push(
        `${path}: corroborable fact's confirming passes span only ${roots.size} distinct source lineage(s), needs >=2 (D-05/D-12)`
      );
    }
  }
  return { errors };
}

// The registrable domain (eTLD+1) of a URL, by simple suffix comparison against a
// small public-suffix table - no unbounded-backtracking regex (ReDoS-safe, T-02-02-02).
const TWO_LABEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk", "ltd.uk", "plc.uk", "net.uk", "sch.uk",
  "com.au", "org.au", "net.au", "gov.au", "co.nz", "org.nz", "co.za"
]);

function registrableDomain(url) {
  if (!url) return null;
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join(".");
  return TWO_LABEL_SUFFIXES.has(lastTwo) ? parts.slice(-3).join(".") : lastTwo;
}

// lineageSimilarityWarnings: a NON-BLOCKING heuristic (D-12). For any two cited
// sources sharing a publisher string OR a registrable domain without a declared
// derivedFrom link, warn that undeclared co-derivation may exist. The gate decision
// rests on the human declaration; the warning only prompts a human to look.
export function lineageSimilarityWarnings(facts, sources) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const warnings = [];
  for (const { path, fact } of facts) {
    const confirms = confirmsOf(fact.verification?.passes);
    const citedIds = [...new Set(confirms.flatMap((p) => p.sourcesChecked))];
    for (let i = 0; i < citedIds.length; i++) {
      for (let j = i + 1; j < citedIds.length; j++) {
        const a = byId.get(citedIds[i]);
        const b = byId.get(citedIds[j]);
        if (!a || !b) continue;
        const linked =
          (a.derivedFrom && (a.derivedFrom === b.id || a.derivedFrom === b.derivedFrom)) ||
          (b.derivedFrom && b.derivedFrom === a.id);
        if (linked) continue;
        const samePublisher = Boolean(a.publisher) && a.publisher === b.publisher;
        const domA = registrableDomain(a.url);
        const sameDomain = Boolean(domA) && domA === registrableDomain(b.url);
        if (samePublisher || sameDomain) {
          warnings.push(
            `${path}: cited sources "${a.id}" and "${b.id}" share ${samePublisher ? "a publisher" : "a registrable domain"} but declare no derivedFrom link - possible undeclared co-derivation (D-12)`
          );
        }
      }
    }
  }
  return { warnings };
}
