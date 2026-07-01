---
phase: 03a
plan: 06
type: execute
wave: 4
depends_on: [03a-01, 03a-03, 03a-04, 03a-05]
files_modified:
  - src/_data/ingredients/sucralose.json
  - src/_data/products/spike-01.json
  - .cache/citation-verdicts.json
  - .pa11yci.json
autonomous: false
user_setup: []
requirements: [PROD-01, PROD-09, INGR-01, INGR-02, INGR-03, VRFY-11, VRFY-12]
must_haves:
  truths:
    - "Every renderable trust state is demonstrated on LIVE pages: published-confirmed, published-stale (VRFY-12 rendering half), published-contested (VRFY-11 rendering half, the Lucozade change event), and withheld (the launch default)"
    - "A published-stale fact is authored per the two-clocks recipe: verification passes dated > staleness threshold ago WITH a fresh in-TTL RESOLVES in the verdict cache, so it derives published-stale and renders 'Last verified {date}; review due.' rather than withheld"
    - "At least one ingredient carries an authorityPosition so the INGR-02 block renders live, and at least one product's D-15 ingredients array references a proof ingredient so INGR-04 lists a real product"
    - "npm run a11y:all passes (pa11y-ci WCAG 2.2 AA, 0 errors) over a representative NEW route set: a mostly-withheld product, a product with published+contested+allergens, an ingredient with an authority position, and a published-stale page"
  artifacts:
    - path: ".cache/citation-verdicts.json"
      provides: "Fresh RESOLVES entries for the proof citations so the worked published/published-stale examples derive deterministically offline"
      contains: "RESOLVES"
    - path: ".pa11yci.json"
      provides: "The representative 3a route subset (3b owns the full floor)"
      contains: "/products/"
  key_links:
    - from: "a proof fact's verification.passes[] (checkedOn > staleness threshold ago)"
      to: "a fresh RESOLVES verdict-cache entry for its citation"
      via: "the two-clocks recipe producing published-stale rather than withheld (RESEARCH Pitfall 3)"
      pattern: "published-stale"
    - from: "spike-01 product ingredients array"
      to: "the proof ingredient id"
      via: "the D-15 structured reference so INGR-04 lists the product and the cross-link resolves"
      pattern: "ingredients"
---

<objective>
Demonstrate every reader-facing trust state on live data and prove the new routes meet the accessibility floor. At a blocking human-action checkpoint, an editor authors and approves the verification passes and adjudications the gate exists to protect (AI never authors them, D-04/D-11), including the published-stale example that is missing from the corpus today. The autonomous follow-on transcribes those approved verdicts, seeds the offline verdict cache, wires the D-15 cross-links, and runs pa11y-ci over a representative route set.

This plan delivers the demonstrable proof subset. The full seed exit criterion SC4 (>=20 products and >=40 ingredients published) is the parallel human sourcing/verification workstream's numeric gate (D-10): the phase is not VERIFIED complete until it is met, but the template code does not block on it and the rest render as honest withheld placeholders. This plan does not attempt to author 20/40 records; it proves the machine renders every state correctly on real records.

Purpose: VRFY-11 and VRFY-12 rendering halves, and the INGR-02/INGR-04 live cases, only become real once a human has authored the passes/adjudications and one cross-link exists. The pa11y run is the automated WCAG floor for the 3a route subset (3b owns the full floor).
Output: Human-authored proof passes (published-confirmed + published-stale) and >=1 authorityPosition ingredient, transcribed into the corpus; seeded cache verdicts; a wired product->ingredient cross-link; representative pa11y routes; and a green npm run a11y:all.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-CONTEXT.md
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-RESEARCH.md
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-VALIDATION.md
@.planning/phases/02-claim-typed-verification-per-fact-publication-gate-ingestion/02-07-PLAN.md

<interfaces>
<!-- The checkpoint mirrors 02-07 Task 2 (human authors passes/adjudication; AI never does). The two-clocks recipe is 03a-RESEARCH.md Pitfall 3. -->

Two-clocks published-stale recipe (03a-RESEARCH.md Pitfall 3, VERIFIED against lib/verification.mjs): a fact derives published-stale ONLY when it (a) MEETS sufficiency (authoritative: an authority pass + a distinct-reviewerKind blinded re-read of the same source, both confirms; or corroborable: >=2 confirms passes over >=2 distinct-lineage roots incl. >=1 primary) AND (b) its cited sources have a FRESH RESOLVES in .cache/citation-verdicts.json (within CITATION_TTL_DAYS, 180d) AND (c) its lastVerified (max pass checkedOn) is older than the class staleness threshold (regulatory 12m / current 24m). So the passes carry OLD checkedOn dates (e.g. 2023-06-01) while the verdict cache carries a RECENT checkedAt. Backdating dates alone renders withheld (the trap).

Verdict-cache shape (SEAM pin, from 02-01, keyed by source id): { verdict: "RESOLVES", resolvedVia: string, checkedAt: ISO date-time within TTL, statusCode: number|null, snapshotUrl: string|null }. Seeding a RESOLVES is a mechanical resolves-record, never a value or a pass (D-11), so it stays autonomous, but must reflect the human's confirmation at the checkpoint that the source resolves.

Live states already available (VERIFIED): withheld = spike-02/03 (entirely withheld); published-contested = the Lucozade timeline documentedChange (02-07). This plan ADDS published-confirmed and published-stale on entity-page facts, plus the INGR-02 authority block and one INGR-04 cross-link.

Cross-link (D-15): add the proof ingredient id to a product's `ingredients` array (e.g. spike-01 Lucozade -> ["sucralose", ...]) so productsByIngredient lists that product on the ingredient page (INGR-04) and the referential gate passes (the id resolves).

Representative pa11y routes (03a-RESEARCH.md Open Question 2; append to .pa11yci.json urls, base http://127.0.0.1:8081): the mostly-withheld product (/products/cadbury-dairy-milk/), a product with published + contested + allergens (/products/lucozade-energy/), an ingredient with an authorityPosition (/ingredients/sucralose/), and the published-stale page authored here. 3a registers this SUBSET; 3b owns the full route floor.

Checkpoint discipline (mirror 02-07): the human authors/approves pass verdicts, adjudications, and the descriptive content of any new proof ingredient records; Claude may assist with JSON structuring only. AI never writes a pass verdict or an adjudication outcome onto real corpus facts (D-04, VRFY-02, CLAUDE.md "AI may never adjudicate").
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Human editor authors and approves the proof passes (published-confirmed and published-stale) and any authorityPosition content</name>
  <read_first>
    - src/_data/products/spike-01.json (the manufacturer fact already carries two human passes from 02-07 - the published-confirmed anchor) and spike-02/03 (the withheld default)
    - src/_data/ingredients/sucralose.json (the descriptive record from plan 05 whose facts are withheld pending passes)
    - src/_data/timeline/spike-lucozade-2017-sugar-cut.json (the published-contested example already authored in 02-07)
    - lib/verification.mjs (deriveVerificationState precedence and the staleness thresholds L18/L209-217/L326-328) and .cache/citation-verdicts.json (the fresh-RESOLVES requirement)
    - 03a-RESEARCH.md Pitfall 3 (the two-clocks published-stale recipe) and 03a-CONTEXT.md D-11 (proof set is human-authored); 02-07-PLAN.md Task 2 (the precedent)
    - CLAUDE.md Constraints "Two-pass verification" and "Editorial integrity"
  </read_first>
  <what-built>This is the editorial act the gate protects, and it is authored by a human, not an AI. The editor: (1) confirms the spike-01 manufacturer fact already derives published-confirmed (the confirmed anchor from 02-07), or authors a fresh published-confirmed fact on a proof entity fact if a cleaner example is wanted; (2) authors a PUBLISHED-STALE example per the two-clocks recipe - a fact that meets its claim-type sufficiency (authoritative: an authority pass plus a distinct-reviewerKind blinded re-read, both confirms; or corroborable per the standard) with pass checkedOn dates deliberately older than the class staleness threshold (e.g. 2023-06-01), while its cited sources genuinely resolve so a fresh RESOLVES can be seeded - so it derives published-stale and renders the reader-facing "review due" indicator (VRFY-12); (3) authors the descriptive content and, where a real FSA/EFSA/SACN position exists, an authorityPosition SourcedValue on at least one ingredient (INGR-02), citing and dating it, with no synthesis of studies; and (4) confirms which citations resolve (and via what) so Task 2 can seed the offline cache. AI never authors a pass verdict or an adjudication outcome on real corpus facts (D-04/VRFY-02); Claude may assist with JSON structuring only. Weak historic facts stay withheld - never given invented passes to force publication.</what-built>
  <how-to-verify>
    1. Read the spike-01 manufacturer fact and confirm it derives published-confirmed (or choose/author a cleaner published-confirmed proof fact and perform its two passes).
    2. Choose one fact to make published-stale; perform its passes and record OLD checkedOn dates (older than the class threshold), and confirm its cited source(s) genuinely resolve (note resolvedVia) so a fresh RESOLVES can be seeded - the two clocks.
    3. Where a genuine authority position exists for the proof ingredient, author the authorityPosition SourcedValue (cited, dated, no study synthesis).
    4. Record which source ids resolve (and via what) for Task 2 to seed the cache.
    5. Confirm no weak historic fact is given invented passes; the withheld default stays honest.
    6. Hand the approved passes, the stale-fact dates, the authorityPosition content, and the resolves list to Task 2 for transcription.
  </how-to-verify>
  <resume-signal>Type "verified" once the published-confirmed and published-stale passes (with their checkedOn dates), any authorityPosition content, and the resolving-source list are authored and approved, or describe blockers.</resume-signal>
  <acceptance_criteria>A human editor has authored and approved: a published-confirmed fact; a published-stale fact whose passes are dated past the staleness threshold while its citations resolve (two clocks); at least one ingredient authorityPosition where a genuine position exists; and the list of resolving source ids - ready for Task 2 to transcribe. No AI-authored pass verdict or adjudication outcome is introduced on real corpus facts.</acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Transcribe the approved passes and authorityPosition, seed the verdict cache, and wire the D-15 cross-link</name>
  <files>src/_data/ingredients/sucralose.json, src/_data/products/spike-01.json, .cache/citation-verdicts.json</files>
  <read_first>
    - the Task 1 checkpoint output (the human-approved passes, the stale-fact checkedOn dates, the authorityPosition content, the resolving-source list to transcribe verbatim)
    - src/_data/products/spike-01.json and src/_data/ingredients/sucralose.json (the facts to receive passes and the ingredients array to wire)
    - .cache/citation-verdicts.json (the existing fresh entries and the SEAM shape to append to)
    - schemas/sourced-value.schema.json (the verification/passes/measure shapes) and lib/verification.mjs (so the transcribed passes + seeded cache derive to the intended state)
    - 03a-RESEARCH.md Pitfall 3 (verify the stale fact derives published-stale, not withheld)
  </read_first>
  <action>
    Transcribe ONLY the values the human approved in Task 1 (author no new verdict or outcome). Encode the published-confirmed passes and the published-stale passes (with their old checkedOn dates) onto the chosen facts; add the human-authored authorityPosition SourcedValue to the proof ingredient. Append fresh RESOLVES entries to .cache/citation-verdicts.json (the SEAM shape: verdict RESOLVES, resolvedVia, a recent checkedAt within TTL, statusCode, snapshotUrl) for each source id the human confirmed resolves, so the worked examples derive deterministically offline. Add the proof ingredient id to a product's D-15 `ingredients` array (e.g. spike-01) so INGR-04 lists that product and the cross-link resolves. Run prebuild and confirm the corpus derives as intended: a published-confirmed fact, a published-stale fact (renders "review due"), the existing published-contested Lucozade change, the INGR-02 authority block live, INGR-04 listing the wired product, and the remainder correctly withheld. Do NOT fabricate passes to force any weak fact to publish. British English, no em-dashes.
  </action>
  <verify>
    <automated>npm run prebuild && npm run build && grep -q "review due" _site/products/*/index.html _site/ingredients/*/index.html</automated>
  </verify>
  <acceptance_criteria>
    - `npm run prebuild` exits 0 with the new passes and cross-link in place (the dangling-ref gate passes because the referenced ingredient id resolves)
    - a fact derives published-stale and renders the reader-facing indicator: `grep -rq "review due" _site/products/ _site/ingredients/`
    - a fact derives published-confirmed (a value renders, not a placeholder) on at least one entity page
    - the INGR-02 authority block renders live: the proof ingredient page contains "Named authority's safety opinion"
    - INGR-04 lists a real product: the proof ingredient page links to at least one /products/{slug}/ and no longer shows only the empty state
    - the seeded cache uses the SEAM shape: `node -e "const c=require('./.cache/citation-verdicts.json');const v=Object.values(c);if(!v.some(e=>e.verdict==='RESOLVES'))process.exit(1);console.log('cache-ok')"` prints cache-ok
  </acceptance_criteria>
  <done>The proof set demonstrates published-confirmed, published-stale (VRFY-12), published-contested (VRFY-11), withheld, a live INGR-02 authority block and a populated INGR-04 list on real pages; prebuild stays green.</done>
</task>

<task type="auto">
  <name>Task 3: Register the representative pa11y routes and verify WCAG 2.2 AA over the new 3a route subset</name>
  <files>.pa11yci.json</files>
  <read_first>
    - .pa11yci.json (the existing defaults and urls array; base http://127.0.0.1:8081)
    - the built routes from Task 2 (the exact proof slugs for the published-stale, authorityPosition and contested pages)
    - 03a-RESEARCH.md Open Question 2 (the representative subset; 3b owns the full floor) and 03a-VALIDATION.md "Manual-Only Verifications" (the consolidated manual AT check)
    - package.json a11y:all chain (build -> serve -> pa11y-ci)
  </read_first>
  <action>
    Append the representative 3a routes to the .pa11yci.json urls array: the mostly-withheld product (/products/cadbury-dairy-milk/), the product with published + contested + allergens (/products/lucozade-energy/), the ingredient with the authorityPosition (the proof ingredient page), and the published-stale page authored in Task 2. Keep the existing foundation routes. Do NOT register the full route floor (3b owns SITE-04 across every route). Run npm run a11y:all and resolve any WCAG 2.2 AA errors pa11y-ci reports on the new routes (colour contrast against the locked palette, heading order, table semantics, focus order). Record that the consolidated manual screen-reader / keyboard / 320px AT check on the nutrition table and allergen list is a phase-level end-of-phase verification (VALIDATION Manual-Only), pa11y being the floor not the ceiling. British English, no em-dashes.
  </action>
  <verify>
    <automated>npm run a11y:all</automated>
    <human-check>End-of-phase consolidated AT check (VALIDATION Manual-Only, UI-SPEC G1/G2): screen-reader read-through + keyboard-only navigation + 320px render of a product page (nutrition table + allergen list) and an ingredient page; confirm no information depends on colour alone and focus reaches every provenance target.</human-check>
  </verify>
  <acceptance_criteria>
    - `npm run a11y:all` exits 0 (pa11y-ci reports 0 WCAG 2.2 AA errors) over the representative route set
    - the four representative routes are registered in .pa11yci.json: `node -e "const u=require('./.pa11yci.json').urls.join(' ');['/products/cadbury-dairy-milk/','/products/lucozade-energy/','/ingredients/'].forEach(s=>{if(!u.includes(s))process.exit(1)});console.log('routes-ok')"` prints routes-ok
    - the published-stale route is included in the pa11y set
    - the full route floor is NOT registered here (3b owns it): only the representative subset is added
  </acceptance_criteria>
  <done>The representative 3a routes pass pa11y-ci WCAG 2.2 AA; the consolidated manual AT check is recorded as an end-of-phase verification.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| editor -> published corpus | Author-supplied verification passes and adjudications enter the gate; only a human at the Task 1 blocking checkpoint may author them |
| corpus JSON -> rendered pages | The proof pages render untrusted values; the accessibility and render-safety floors are the reader-facing guarantees |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03a-06-01 | Elevation of Privilege | An AI task fabricating verification passes to force a weak fact (or the stale example) to publish | mitigate | Passes and adjudications on real src/_data facts are authored only by a human at the Task 1 checkpoint:human-action (blocking), mirroring 02-07; Task 2 transcribes only approved values; weak historic facts stay withheld |
| T-03a-06-02 | Tampering | A seeded cache verdict masking a non-resolving citation (faking a published/published-stale example) | mitigate | Each seeded RESOLVES is for a source the human confirmed resolves, carries a fresh checkedAt within TTL, and is a visible git diff; the network checker can overwrite it |
| T-03a-06-03 | Denial (of access) | A new route failing WCAG 2.2 AA (contrast, heading order, table/focus semantics) | mitigate | pa11y-ci runs over the representative subset in a11y:all; a consolidated manual AT check on the data-dense table/allergens is recorded at end-of-phase (pa11y is the floor) |
| T-03a-06-SC | Tampering | npm/pip/cargo installs | accept | Zero new dependencies this phase; supply-chain delta is zero, so no install checkpoint applies |
</threat_model>

<verification>
- A human authored and approved the passes/adjudications at the Task 1 blocking checkpoint; Task 2 transcribed only those approved values (no AI-authored verdict).
- `npm run prebuild` + `npm run build` demonstrate published-confirmed, published-stale (VRFY-12), published-contested (VRFY-11), withheld, a live INGR-02 block and a populated INGR-04 list on real pages.
- `npm run a11y:all` passes over the representative 3a routes; the consolidated manual AT check is recorded for end-of-phase.
- Note: SC4 (>=20 products / >=40 ingredients published) is the parallel editorial workstream's numeric exit gate (D-10), tracked as a phase-completion criterion, not delivered by this code plan.
</verification>

<success_criteria>
- Every renderable trust state is demonstrated on live pages, including the previously-missing published-stale example authored via the two-clocks recipe.
- At least one ingredient has a live authority block and at least one product cross-links to it (INGR-02/INGR-04 on real data).
- The representative 3a routes pass pa11y-ci WCAG 2.2 AA; no pass verdict on real corpus data was AI-authored.
</success_criteria>

<output>
Create `.planning/phases/03a-core-entity-pages-trust-rendering/03a-06-SUMMARY.md` when done.
</output>
