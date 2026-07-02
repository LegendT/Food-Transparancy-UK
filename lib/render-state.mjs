// The single render-safe projection of a fact's derived verification state (R-31).
// Templates MUST render off THIS, never off fact.value: every withheld/contested
// record still carries its raw `value` in JSON by design (so promotion and
// adjudication can work), so the render layer is the one point the whole trust
// model can be silently defeated. This helper is the sanctioned boundary - it
// exposes the raw value ONLY when the fact genuinely publishes, and is pure so the
// same logic runs under node:test and inside the Eleventy `factState` filter.
//
// Phase 3a owns the reader-facing VISUAL treatments (contested both-sides VRFY-11,
// review-due VRFY-12); this helper gives them a safe floor to build on, never the
// final styling.

import { deriveVerificationState, lastVerified as maxConfirmsCheckedOn } from "./verification.mjs";

// factForRender(fact, sourcesById, verdictsById, today, entityType):
//   sourcesById  Map<id, sourceRecord>     (built from the sources array)
//   verdictsById Map<id, verdictCacheEntry> (built from the committed cache)
// Returns a projection safe to hand to a template.
export function factForRender(fact, sourcesById, verdictsById, today, entityType) {
  const { state } = deriveVerificationState(fact, sourcesById, verdictsById, today, entityType);
  const publishable = state === "published-confirmed" || state === "published-stale";
  const contested = state === "published-contested";
  const confirms = (fact.verification?.passes ?? []).filter((p) => p.verdict === "confirms");
  return {
    state,
    publishable,
    stale: state === "published-stale",
    contested,
    // The last-verified date is the max confirms-pass checkedOn (the verification
    // clock), NOT fact.updated (the record-edit clock). The review-due label reads
    // off this so a published-stale fact shows when it was actually last verified,
    // not when the record was last touched (VRFY-12). Null unless it publishes.
    lastVerified: publishable ? (maxConfirmsCheckedOn(confirms) || null) : null,
    // The raw value crosses the boundary ONLY when the fact publishes as a settled
    // value. Withheld and contested states expose NOTHING here (contested shows its
    // positions instead, each of which is itself meant to be published).
    value: publishable ? fact.value : undefined,
    // Contested positions ARE meant to be shown (both sides, with their sources).
    positions: contested ? (fact.verification?.contested?.positions ?? []) : [],
  };
}

// Convenience for callers holding plain arrays/objects (the Eleventy filter path):
// builds the two Maps deriveVerificationState expects, then projects.
export function factForRenderFromData(fact, sourcesArray, verdictsObject, today, entityType) {
  const sourcesById = new Map((sourcesArray ?? []).map((s) => [s.id, s]));
  const verdictsById = new Map(Object.entries(verdictsObject ?? {}));
  return factForRender(fact, sourcesById, verdictsById, today, entityType);
}
