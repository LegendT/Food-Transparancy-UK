# Phase 2: Claim-Typed Verification, Per-Fact Publication Gate & Ingestion - Context

**Gathered:** 2026-06-30
**Refined:** 2026-07-01 (deep critique pass; citation-existence research folded in)
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the Phase 1 validation harness (`lib/validate.mjs`, `lib/referential.mjs`, which already walk every `SourcedValue` by signature via `collectFacts`) into a continuous, per-fact verification-sufficiency gate, plus an Open Food Facts ingestion path into a draft store.

In scope (the 14 phase requirements): the claim-typed two-pass record and the per-fact publication gate (VRFY-01/03/04); citation-existence and measure-mismatch checks (VRFY-07/08); distinct-lineage enforcement (part of VRFY-01); the re-verification audit command and its worst-first record (VRFY-05/06); per-class staleness thresholds and the reader-facing review-due indicator (VRFY-09/12); human-only adjudication routing to confirmed / corrected / contested, with the contested both-sides treatment (VRFY-02/11); continuous withdrawal of a fact later marked `wrong` (VRFY-04); OFF ingestion into a draft/lead store with field-level provenance and the OFF revision-diff as an unverified lead (DATA-05/06, VRFY-10).

Out of scope (belongs to later phases or stays manual editorial work): product/ingredient page rendering of the withheld placeholder and contested treatment (the gate produces the status and data; Phase 3a renders it); building robust archival fetch automation that performs verification passes programmatically (passes stay editor-authored, see D-11); any automated semantic classifier of claim nature (D-18).

### Natural plan seams (P4)
Three separable capabilities the planner can wave cleanly, in dependency order:
1. The verification data model (inline record + schema changes) and the per-fact gate + the cheap mechanical checks (existence, measure-mismatch, lineage). This is the spine everything else reads.
2. OFF ingestion + the draft/lead store (independent of the gate internals; only shares the corpus-escape boundary).
3. The audit command + staleness classes + the worst-first adjudication queue (reads the model from seam 1; produces the human-facing queue).
</domain>

<decisions>
## Implementation Decisions

### The inline verification record

- **D-01:** The verification record lives INLINE in each `SourcedValue`, as a `verification` object sibling of `value` / `sources` / `confidence`. Rationale: it matches the provenance-in-diff ethos, reuses `collectFacts` (no new fact-id system needed, since facts have no stable id today, only a JSON instance path), and keeps a fact's value and its verification in one git diff. Accepted cost: every fact grows.

- **D-02:** A "pass" is a verification EVENT, not a source. This is the load-bearing modelling rule: the gate counts passes that meet the standard, never the length of `sources[]`. A pass records `{ reviewerKind, sourcesChecked[], measure, checkedValue, verdict, checkedOn }` where `reviewerKind` is one of `human` / `ai` / `blinded-reread`, and `verdict` is one of `confirms` / `disputes` / `inaccessible`. A fact may cite two sources yet have zero passes (unverified). `sources[]` is what the fact claims to rest on; the passes are the evidence that someone checked it. (Fixes the pass/source conflation, critique C1.)

- **D-03:** The per-fact publication status is DERIVED at build time from the `verification` record every build, never a hand-authored flag. Phase 1 reserved `publicationStatus` as a stored string; Phase 2 makes it computed (the stored field becomes validated-only or is dropped) so a fact marked `wrong` cannot stay published through author drift, which is exactly what makes the VRFY-04 "wrong auto-withholds on next build" guarantee continuous. (Fixes C5.)

- **D-04:** A fact's adjudication verdict is recorded INLINE in the fact (an `adjudication` sub-object: outcome confirmed / corrected / contested, plus a required note and date). AI never writes a verdict; only a human edits it. Consistent with D-01.

### Claim-typed pass rules (the two standards are different)

- **D-05:** Corroborable fact (empirical claim, e.g. a past or declared formulation): publishable only with >=2 passes whose `verdict` is `confirms`, citing >=2 DISTINCT-lineage sources (D-14), at least one of which is a primary source (per the registry `sourceType`). Distinct-lineage enforcement applies HERE.

- **D-06:** Authoritative fact (what a named authority states, e.g. current GB regulatory status, the current official label): publishable only with 1 authority pass plus an independent RE-READ pass for transcription fidelity. Both passes cite the SAME authority by design, so distinct-lineage does NOT apply to authoritative facts; instead the two passes must have distinct `reviewerKind` reader-independence (human then a different human, human then blinded-reread, or human then ai). The honesty model (per SPIKE-01 and SITE-02) is stated plainly: this is not two independent human reviewers, it is source-axis independence for corroborable facts and reader-axis independence for authoritative facts. (Fixes the rule asymmetry, C2.)

### Citation-existence check (VRFY-07) — a four-verdict model, not a boolean

- **D-07:** Every cited URL/DOI is checked for existence before any pass counts, using a FOUR-value verdict, because a boolean is exactly what produces the false-block failure mode SPIKE-01 exposed (our real citations are bot-hostile: retailers 403, Wayback unreachable from the agent tool). The enum:
  - `RESOLVES` — live 2xx/206/304, or a DOI confirmed, or a valid Wayback `200` snapshot. The ONLY value that satisfies the existence precondition.
  - `DOES_NOT_RESOLVE` — 404 / 410 / DNS NXDOMAIN / hard connection-refused with no archive. Withholds the fact and flags it for correction / link-repair.
  - `ACCESS_BLOCKED` — 401 / 403 / 407 / 429 / 451 / 999 / CDN challenge / timeout. A positive signal the host is UP and refused the bot, so it is neither a pass nor a dead link.
  - `INDETERMINATE` — 5xx / transient network / ambiguous soft-404. Handled like `ACCESS_BLOCKED` for gating.
  - Only 404 / 410 / NXDOMAIN (and hard refused with nothing behind it) are affirmative non-existence. Everything in the refusal / challenge / transient family is never scored as dead.

- **D-08:** Existence-check mitigation and escalation order: (1) live check with a realistic browser `User-Agent`, `HEAD` then retry once with `GET` `Range: bytes=0-0` on 403/405/429, follow redirects (cap ~10) and judge the final status, honour `Retry-After` with one bounded retry; (2) on `ACCESS_BLOCKED`/`INDETERMINATE`, AUTO-QUERY Wayback (availability API `https://archive.org/wayback/available?url=...&timestamp=...`, or the CDX server for history) and, if a `200` snapshot exists, promote the citation to `RESOLVES` using the archival snapshot URL + timestamp as the stored resolvable source (an archival snapshot is itself a valid primary/archival citation and directly serves the two-pass model); (3) only if the live URL is blocked AND no usable snapshot exists does it reach a human as `ACCESS_BLOCKED - needs-human-check`. Store per citation: `statusCode`/errorClass -> `verdict` -> `resolvedVia` (`live` | `wayback:<timestamp>` | `crossref` | `handle`) -> `checkedAt`.

- **D-09:** DOI existence is checked without scraping the publisher, via two independent registrar APIs that map onto the authoritative re-read rule: Crossref REST (`https://api.crossref.org/works/{doi}`, 200 = exists, 404 = not a Crossref DOI) as one check, and the Handle proxy (`https://doi.org/api/handles/{doi}`, `responseCode` 1 = exists, 100 = not found) as the independent re-read. Exists if Crossref 200 OR Handle responseCode 1; does-not-exist only if Crossref 404 AND Handle 100; else `INDETERMINATE`. Send a polite `User-Agent` with a contact mailto to Crossref.

- **D-10:** All existence checks (Wayback, Crossref, Handle, and live HTTPS) run server-side in the Node build/audit tooling, where they are reachable; the browser-style blocking seen in SPIKE-01 was the agent's fetch tool, not the endpoints. Keep a small explicit "known bot-hostile hosts" set (tesco.com, ocado.com, asda.com, sainsburys.co.uk, web.archive.org) that biases their refusals straight to `ACCESS_BLOCKED` + Wayback fallback. At ~600 entities and editorial cadence, serialise or cap at ~1-2 req/s, cache results (diffable in git), and do NOT add proxies, headless browsers, or TLS-fingerprint spoofing (over-engineering; route the residue to the human/Wayback path).

### Automation boundary

- **D-11:** Phase 2 builds the GATE and the cheap mechanical checks, not automated verification passes. Build: the per-fact publication gate; the structured pass-record the editor fills; the existence check (D-07..D-10); the measure-mismatch auto-disagreement (D-13); the lineage-distinctness check (D-14). The two verification passes themselves stay editor-authored. A thin Wayback-CDX / curl sourcing helper may assist an editor in finding archival evidence, but a raw automated fetch is NEVER promoted to a satisfied pass on its own (the existence check confirming a URL resolves is not the same as a pass confirming the value). Rationale: SPIKE-01 proved fetch automation is fragile and unreliable here, and trusting machine reads as passes would violate "AI never adjudicates".

### Distinct-lineage detection (scoped to corroborable, D-05)

- **D-12:** Hybrid. A human-declared lineage tag on source-registry records (e.g. a `lineageId` or `derivedFrom` parent pointer extending `sources.json` / `source.schema.json`) is AUTHORITATIVE for the gate: a corroborable fact's two confirming passes must cite distinct declared lineages (co-derived sources, like the Cadbury trade reports tracing to one press release, share a lineage). Separately, an automated similarity heuristic (domain / publisher / text) raises a NON-BLOCKING warning to catch undeclared co-derivation the editor missed. A `derivedFrom` parent pointer is preferred over a flat `lineageId` if the planner finds it cleaner, because it computes lineage groups transitively. The gate decision rests on the human declaration; the heuristic only prompts a human to look.

### Measure-mismatch (VRFY-08)

- **D-13:** Each pass records a STRUCTURED measure, not free text, so comparison is mechanical (free text like "per 100g as sold" vs "per 100g" is either brittle or too loose). A small structured measure, e.g. `{ basis: per-100g | per-100ml | per-serving, state: as-sold | as-prepared, jurisdiction?, asOf? }`. The rule is exact-match-or-disagree: if two passes' structured measures are not equal, auto-raise a disagreement and route to a human even when the values look close (the 4.16g/100g vs 4.5g/100ml case). Over-raising is safe because it routes to a human; silent merging of mismatched measures is not.

### Contested facts and the publication decision (C3, P1)

- **D-14:** A contested fact needs a shape that holds MORE THAN ONE value, because `SourcedValue.value` is singular. Add a `contested` sub-shape: an array of positions, each with its own value + sources + note, populated only when a human adjudicates `contested`. The singular `value` is withheld/null while contested; the positions carry the content. This is distinct from a withheld placeholder.

- **D-15:** The gate derives exactly one publication state per fact, from this table (the easily-missed rule is that STALE still publishes while WRONG and DISAGREEMENT withhold):

  | Derived state | Condition | Reader sees |
  |---|---|---|
  | `published-confirmed` | passes meet the claim-type standard, no open disagreement, existence RESOLVES, not past staleness | the value + trust chip |
  | `published-contested` | human adjudicated `contested` | both-sides treatment (D-14) |
  | `published-stale` | otherwise-confirmed but past its staleness threshold (D-16) | the value + a "last verified {date} - review due" indicator (VRFY-12) |
  | `withheld-unverified` | insufficient passes, or existence ACCESS_BLOCKED / INDETERMINATE / DOES_NOT_RESOLVE | "not yet verified - withheld" placeholder |
  | `withheld-open-disagreement` | passes disagree, or a measure mismatch, awaiting adjudication | withheld placeholder |
  | `withheld-wrong` | human marked the fact `wrong` | withheld placeholder (continuous, D-03) |

### Staleness classes (VRFY-09/12)

- **D-16:** Three staleness classes with thresholds: regulatory 12 months / current 24 months / historical static (effectively no threshold). Derivation rule (fixes the P3 hole that `claimDomain` has no "historical" value): a fact is `regulatory` if `claimDomain === "regulatory"`; `historical` if it belongs to a timeline-event entity or is an explicitly-tagged past-formulation fact; otherwise `current` (current label / nutrition / allergen / ingredient-function / general). If the planner finds a product-embedded past-formulation fact that is not a timeline-event entity, it carries an explicit `stalenessClass` override rather than being misclassified as current. A past threshold drives both the VRFY-05 audit queue and the VRFY-12 reader-facing indicator.

### Adjudication workflow

- **D-17:** The VRFY-05 audit command generates a dated, worst-first queue document (modelled on DEBT's `docs/DATA-AUDIT.md`: counts-by-status table, then discrepancy sections ordered wrong -> stale -> oldest-first, each carrying the fact's recorded structured measure, plus a separate "reviewer disagreements - flag for extra human scrutiny" section). The human adjudicates by editing the fact inline (D-04). The queue doc is the read-only triage surface; the data file holds the verdict. AI never writes a verdict.

### OFF ingestion and the draft/lead store

- **D-18:** claimType/claimDomain stay author-self-classified; the gate enforces only the structural / pass-count consequences of the declared claimType. Whether a claim is "really" authoritative vs corroborable is human editorial judgement, surfaced for review in the audit queue, never decided by an automated semantic classifier (that is exactly the AI judgement the project keeps out of the gate).

- **D-19:** An OFF lead is NOT a fact. Leads are raw imported data with field-level OFF provenance under a DISTINCT `lead` schema (not the `SourcedValue` envelope), so the Phase 1 corpus-escape guard's SourcedValue signature never matches them and does not fail the build on their existence. (Fixes C4: the guard fails the build on stray FACT files; a SourcedValue-shaped draft would trip it, so leads must not be SourcedValue-shaped.) Leads live OUTSIDE the published data directory (e.g. `ingestion/leads/`), outside the Eleventy data cascade. Promotion is the explicit human step that turns a lead into `SourcedValue` facts in the published dirs. The OFF revision-diff is recorded as a `lead` requiring human promotion before it can publish as a reformulation (VRFY-10); Phase 2 does NOT build a full automated revision differ.

### Claude's Discretion
- Exact field names and JSON shape of the inline `verification` record (the passes array, the structured measure, the `contested` and `adjudication` sub-objects), consistent with the envelope style in `schemas/sourced-value.schema.json`.
- `derivedFrom` parent pointer vs flat `lineageId` for D-12.
- The lineage-similarity heuristic's specific signals and warning threshold.
- Exact draft-store path and its exclusion from the Eleventy cascade and the validation corpus.
- Whether the audit queue doc is committed or generated on demand (a dated artefact either way).
- Whether to build the ~120-line vanilla-Node existence checker as one module or fold it into `lib/`.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 2" — goal, the six success criteria, the verification editorial track targets
- `.planning/REQUIREMENTS.md` §Verification (VRFY-01 to VRFY-12) and §Data Model & Sourcing (DATA-05, DATA-06) — the 14 phase requirement texts
- `CLAUDE.md` §Constraints "Two-pass verification (highest priority)" — the load-bearing trust-model statement this phase implements

### SPIKE-01 (the named gate requirements and the honesty model)
- `docs/SPIKE-01-FINDINGS.md` — the five requirements the Phase 2 gate must enforce; the honesty note that passes are not two independent human reviewers
- `docs/spike-findings.json` §`phase2GateRequirements`, §`toolingBlockers` — machine-readable gate requirements and the fetch blockers behind D-07 and D-11

### The harness Phase 2 extends
- `lib/validate.mjs` — the Ajv structural gate (`compile`, `validateDataset`); pure functions shared by script and tests
- `lib/referential.mjs` — the cross-file gates and `collectFacts` / `collectDateRanges` walkers; the `isSourcedValue` signature the per-fact gate keys on
- `scripts/validate-data.mjs` — the prebuild orchestration and the corpus-escape guard the draft store relies on (D-19)
- `schemas/sourced-value.schema.json` — the envelope reserving nullable `verificationStatus` / `publicationStatus`; the corroborable >=2-source `allOf` rule; `claimType` and `claimDomain` enums
- `schemas/source.schema.json` and `src/_data/sources.json` — the registry the lineage tag (D-12) and `sourceType` (primary, for D-05) build on
- `src/_data/products/spike-01.json` (and spike-02/03, `src/_data/timeline/*`) — the real records the gate operates on and that D-02/D-03 must reconcile to per-fact derived status

### Blueprint pattern (read-only, do not modify)
- `/Users/anthonygeorge/Projects/DEBT/docs/DATA-AUDIT.md` — the dual-reviewer audit this gate strengthens: status vocabulary (Confirmed / Stale / Wrong / Uncertain), worst-first ordering, per-figure measure definition, independent re-check, reviewer-disagreement flagging (the model for D-17)

### Citation-existence check (external APIs, from the 2026-07-01 research pass)
- Wayback availability API `https://archive.org/wayback/available?url=...&timestamp=...` and CDX server `https://web.archive.org/cdx/search/cdx?url=...&output=json` — snapshot existence + closest-to-date; empty result = no capture; reachable server-side (D-08)
- Crossref REST `https://api.crossref.org/works/{doi}` (200/404) and Handle proxy `https://doi.org/api/handles/{doi}` (responseCode 1/100) — DOI existence without scraping the publisher (D-09)
- lychee link checker (`--accept`, `--user-agent`, HEAD->GET fallback, 429 handling) — the status taxonomy and false-dead-link tactics behind D-07/D-08

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `collectFacts(data, path)` in `lib/referential.mjs`: already enumerates every `SourcedValue` in an entity with its instance path; the per-fact gate iterates over this, no new traversal needed.
- The pure-function + `{ errors }` / `{ warnings }` pattern in `lib/referential.mjs`: the lineage check, measure-mismatch check, and existence-check gating should follow it (errors fail the build, warnings do not), so the same functions are unit-testable under `node --test`.
- The prebuild gate chain in `package.json` (`validate` -> `lint:editorial` -> `check:images`): the verification/publication gate slots in here. The existence check and the audit command are network-touching and read-only, so they run as SEPARATE non-prebuild scripts (cached, never mutating values), and the prebuild gate reads their cached verdicts rather than hitting the network on every build.
- Negative-fixture convention: every Phase 1 failure path has a negative fixture; Phase 2's new failure paths (insufficient passes, disagreement/measure-mismatch, shared lineage, DOES_NOT_RESOLVE citation, a SourcedValue-shaped lead outside the corpus) each need one.

### Established Patterns
- Facts are addressed by JSON instance path, not by id; this is why D-01 (inline records) avoids inventing a fact-id system.
- `claimDomain = "regulatory"` already triggers special handling (TRUST-06 GB-source + checkedOn) in `checkRegulatoryJurisdiction`; D-16 reuses `claimDomain` as one input to the staleness-class derivation.
- Share-alike / OFF-derived facts are already detected by `listOffDerived` via the source registry's `licence.shareAlike` flag; ingestion provenance (D-19) and ODbL handling build on this.

### Integration Points
- The new per-fact `verification` object (passes, structured measure, contested, adjudication) attaches inside `schemas/sourced-value.schema.json` (currently it only reserves the two nullable status strings).
- The lineage tag attaches to `schemas/source.schema.json` and every record in `src/_data/sources.json`.
- The `lead` schema is new and lives with the draft store outside `src/_data`; the corpus walk in `scripts/validate-data.mjs` must exclude that path and must NOT treat lead records as facts.
</code_context>

<specifics>
## Specific Ideas

- The audit queue doc should read like DEBT's `DATA-AUDIT.md`: a dated header, counts-by-status table, worst-first discrepancy sections each carrying the fact's recorded structured measure, and a separate "reviewer disagreements - flag for extra human scrutiny" section. That file is the concrete template.
- "AI never adjudicates" is a hard rule across D-04, D-11, D-12, D-17 and D-18: the gate enforces mechanically and surfaces for human judgement, but no value or verdict is ever written by automation. The existence check is the one place the machine reaches the network, and even there it only records a resolves-verdict, never a value or a pass.

</specifics>

<deferred>
## Deferred Ideas

- Robust archival/primary fetch automation (Wayback CDX capture, manufacturer pack-image capture) as a first-class verification source; SPIKE-01's #1 limiter, kept as a thin editor aid plus the existence-check Wayback fallback in Phase 2 (D-08/D-11). A fuller capture capability is future work and is what would raise the corpus/Tier A figures.
- Automated OFF revision differ (continuous diffing of OFF snapshots to surface leads); Phase 2 records the lead status and never-publish guard only (D-19).
- Rendering of the withheld placeholder, the contested both-sides treatment, and the reader-facing review-due indicator; produced as data/status here, rendered in Phase 3a.
- A vanilla-Node existence-checker module was scoped in research (HEAD->GET-range->Wayback->DOI, four-verdict); building it is Phase 2 execution work, not a deferral, but it is noted here so the shape is on record.

</deferred>

---

*Phase: 02-claim-typed-verification-per-fact-publication-gate-ingestion*
*Context gathered: 2026-06-30; refined 2026-07-01*
</content>
