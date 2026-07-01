---
phase: 03a
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/_includes/components/macros.njk
  - src/assets/styles.css
  - test/render-state.test.js
autonomous: true
requirements: [VRFY-11, VRFY-12, PROD-01]
must_haves:
  truths:
    - "A contested fact renders each position WITH its own resolved sources (name/url via findBy), not bare values (VRFY-11 rendering half, F6)"
    - "A new inline factCell macro renders a value/status as spans only (no <details>), gating on factState exactly like sourcedValue, so it is valid inside a <td> and never leaks a withheld or contested value"
    - "The four withheld sub-states are caught by a single [data-state^=\"withheld\"] rule so no sub-state falls through to an unstyled default; contested and stale carry their locked accent colours as a second cue to the mandatory text label"
    - "check-render-safety stays green: all new value rendering lives inside macros.njk, the sole allowlisted renderer"
  artifacts:
    - path: "src/_includes/components/macros.njk"
      provides: "factCell inline macro + contested branch extended with per-position sources"
      contains: "factCell"
    - path: "src/assets/styles.css"
      provides: "State accent bars (withheld grey, stale amber, contested blue, allergen red bar), nutrition-table and allergen-list styles"
      contains: "data-state"
  key_links:
    - from: "macros.njk contested branch"
      to: "each position's p.sources resolved against the sources array"
      via: "the existing findBy + s.url ? <a> : text idiom (L88-97) applied per position"
      pattern: "findBy"
    - from: "styles.css [data-state^=\"withheld\"]"
      to: "all four withheld sub-states"
      via: "a single prefix selector so an overlooked sub-state cannot render as confirmed"
      pattern: "data-state"
---

<objective>
Extend the single sanctioned renderer and its stylesheet so the seven derived verification states read honestly to a non-expert, and so a value can be shown inside a table cell without breaking the R-31 boundary. This plan owns macros.njk and styles.css exclusively; the template plans (03, 04, 05) consume these primitives and add no new render path. Every treatment consumes the factState projection and never re-derives status (D-04).

Purpose: VRFY-11 (contested both-sides with per-position sources) and VRFY-12 (stale review-due) are the reader-facing halves of the Phase 2 trust model; the nutrition table (D-06) needs an inline value renderer the block macro cannot provide. Locking these primitives first lets both template plans build against a stable component contract.
Output: An inline factCell macro, a contested branch that carries each side's sources, the locked state accent-bar / nutrition-table / allergen-list CSS, and a unit test pinning that contested positions carry their sources across the render boundary.
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
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-PATTERNS.md
@.planning/phases/03a-core-entity-pages-trust-rendering/03a-UI-SPEC.md

<interfaces>
<!-- The macro contract and the exact copy/colour values are locked in 03a-UI-SPEC.md. Extracted contracts: -->

factState projection (from .eleventy.js L59-61 -> lib/render-state.mjs): fact | factState(sources, entityType) returns { state, publishable, stale, contested, value?, positions }. value is present ONLY when publishable; positions is populated ONLY when contested. Templates and macros consume this, never fact.verification / fact.value directly.

factCell(fact, sources, unit, entityType) macro to ADD inside macros.njk (03a-RESEARCH.md D-06/F4 gives the body):
- set d = fact | factState(sources, entityType); emit SPANS only, no <details>:
  publishable -> <span class="fact__value">{{ d.value }}{{ unit }}</span> plus, if d.stale, a "review due" span; contested -> <span class="fact__contested-inline">Contested</span>; else -> <span class="fact__withheld">Not yet verified</span>.
- Because it lives inside macros.njk (the sole path allowlisted by check-render-safety.mjs L26,57), its d.value is exempt from the /\.value\b/ regex; no other file may render a value.

Contested branch F6 (extend macros.njk L74-80): the current branch renders bare p.value/p.note. For each p in d.positions, resolve p.sources against the sources array with the existing findBy + `s.url ? <a rel="noopener"> : text` idiom copied from the disclosure loop (L88-97), so each side shows its OWN sources. Keep "Contested; sources disagree:" a <span>, not a heading (UI-SPEC G4). Preserve rel="noopener".

Locked semantic palette (UI-SPEC Colour table; ratios white / #f3f2f1 panel):
- withheld ordinary #505a5f (7.07/6.33) left accent bar + dashed #b1b4b6 border, calm grey, NOT red.
- stale/review-due #b45309 amber 4px left bar ONLY; the "review due" text stays #0b0c0c black.
- contested #1d70b8 4px left bar + 2px border + #f3f2f1 background; "Contested" label text may use #1d70b8.
- allergen/destructive #d4351c red as BAR/BORDER only, never as text (fails 4.5:1 on the panel).
- Add the left bar with border-inline-start (logical property). Catch all withheld sub-states with a single [data-state^="withheld"] rule (UI-SPEC G5).

Existing CSS anchors: .fact / .fact__* L107-202, .caveat/.example border-inline-start idiom L210-216, .visually-hidden L94-105, 44px touch targets, mobile-first @media (min-width: 40em) L195-202.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add the inline factCell macro and extend the contested branch with per-position sources in macros.njk</name>
  <files>src/_includes/components/macros.njk</files>
  <read_first>
    - src/_includes/components/macros.njk (all 105 lines; the sourcedValue state-gating open L60-83, the contested branch L74-80, and the source-resolution disclosure loop L88-97 the contested branch must borrow from)
    - .eleventy.js (the factState filter L59-61, so the entityType argument threads correctly)
    - scripts/check-render-safety.mjs (the /\.value\b/ default-deny L53 and the single-file allowlist L26,57, so the new macro's d.value is exempt only because it is in this file)
    - 03a-RESEARCH.md "D-06 / F4" (the factCell body) and "F6" (the contested-branch extension), and 03a-UI-SPEC.md Copywriting Contract (the verbatim state strings)
  </read_first>
  <action>
    Add a factCell(fact, sources, unit, entityType) macro inside macros.njk that mirrors the sourcedValue state-gating open (set d = fact | factState(sources, entityType)) but emits only spans and no <details>: for d.publishable a fact__value span with the value and optional unit, followed by a fact__review-due span reading "review due" when d.stale; for d.contested a fact__contested-inline span reading "Contested"; else a fact__withheld span reading "Not yet verified". This is the table-cell renderer for D-06; it must never emit a <details> (invalid in a <td>) and never read fact.value. Extend the existing contested branch (L74-80): for each p in d.positions, resolve p.sources against the sources array using the existing findBy filter and the same `{% if s.url %}<a href rel="noopener">{{ s.name }}</a>{% else %}{{ s.name }}{% endif %}` idiom from the disclosure loop (L88-97), rendering each position as "{value}{unit} - {source name(s)}{, note}" so each side carries its OWN sources (F6/D-02). Keep the "Contested; sources disagree:" label a <span>, not a heading (UI-SPEC G4); the macro emits no heading of its own. Preserve autoescaping (never add `| safe`) and rel="noopener". Keep British English, no em-dashes; use the verbatim UI-SPEC state copy strings.
  </action>
  <verify>
    <automated>node scripts/check-render-safety.mjs src && npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `node scripts/check-render-safety.mjs src` prints the pass line (all value rendering stays inside macros.njk)
    - `npm run build` exits 0 and the existing components-demo / methodology pages still render (the macro edit is additive/backward-compatible)
    - factCell exists and emits no <details>: `grep -A15 'macro factCell' src/_includes/components/macros.njk | grep -qv '<details>' && grep -c 'macro factCell' src/_includes/components/macros.njk` is >= 1
    - the contested branch resolves per-position sources: `grep -A12 'fact__contested' src/_includes/components/macros.njk | grep -c 'findBy'` is >= 1
    - no `| safe` was introduced on any fact value or source name: `grep -c 'safe' src/_includes/components/macros.njk` is 0
  </acceptance_criteria>
  <done>macros.njk carries a render-safe inline factCell for table cells and a contested branch that shows both sides with their own sources; the render-safety gate and build stay green.</done>
</task>

<task type="auto">
  <name>Task 2: Add the state accent-bar, nutrition-table and allergen-list CSS; pin the contested-positions-carry-sources unit test</name>
  <files>src/assets/styles.css, test/render-state.test.js</files>
  <read_first>
    - src/assets/styles.css (the .fact/.fact__* block L107-202, the .caveat/.example border-inline-start idiom L210-216, .visually-hidden L94-105, the 40em breakpoint L195-202)
    - test/render-state.test.js (the harness and the R-31 pure-function assertions L33-39, the file this test extends)
    - lib/render-state.mjs (factForRender L19-35: positions are returned ONLY when contested and carry their own sources[])
    - 03a-UI-SPEC.md "Colour" (the locked hex values and white/panel ratios), "State Treatment Matrix" (the per-branch bar/border/background), "Nutrition Table Pattern" (caption/thead/scope, 320px reflow, no white-space:nowrap) and "Allergen Render Rules" (red bar only, black text)
  </read_first>
  <action>
    Extend styles.css with data-state selectors on the existing .fact card: a single [data-state^="withheld"] rule giving a #505a5f left accent bar (border-inline-start 4px) and a dashed #b1b4b6 border on a white background; [data-state="published-stale"] an amber #b45309 4px left bar with the review-due text kept #0b0c0c; [data-state="published-contested"] a #1d70b8 4px left bar plus a 2px #1d70b8 border on a #f3f2f1 background. Add styles for the inline cell classes (fact__value, fact__review-due, fact__contested-inline, fact__withheld) used by factCell. Add a nutrition-table block: a real <table> with caption/thead styling, #f3f2f1 header/zebra, and a 320px reflow that does NOT set white-space:nowrap (short three-column content wraps and grows tall, per UI-SPEC G1). Add an allergen-list block: a definition-style list where a warning row carries a #d4351c red bar/border as a SECOND cue only, with all row text #0b0c0c black (red never used as text, UI-SPEC F1); a neutral allergen row uses the #505a5f bar. Keep the 44px touch targets, the .visually-hidden utility, logical properties, and mobile-first ordering. Extend test/render-state.test.js with a test asserting that for a published-contested fact the projection's positions array carries each position's sources (VRFY-11 rendering-half unit floor: the data reaching the macro contains the sources it must resolve). Keep British English, no em-dashes; use only the locked hex values.
  </action>
  <verify>
    <automated>node --test test/render-state.test.js && npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `node --test test/render-state.test.js` exits 0 including the new positions-carry-sources assertion
    - `npm run build` exits 0 and `npm run check:render` passes (CSS changes do not affect render-safety)
    - a single prefix selector catches all withheld sub-states: `grep -c 'data-state\^="withheld"' src/assets/styles.css` is >= 1
    - the locked state colours are present: `grep -c '#b45309' src/assets/styles.css` >= 1 (stale amber) and `grep -c '#d4351c' src/assets/styles.css` >= 1 (allergen red)
    - no white-space:nowrap on the nutrition table: `grep -c 'nowrap' src/assets/styles.css` is 0
  </acceptance_criteria>
  <done>The locked state treatments, nutrition-table and allergen-list styles exist using only the approved palette; the unit test pins that contested positions carry their sources to the render boundary; build and render-safety stay green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| corpus JSON -> rendered HTML | Untrusted ingested fact values and source names are rendered to HTML by the macro; the reader is the consumer (static build, no runtime server) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03a-02-01 | Information Disclosure | An unverified or contested value leaking to a reader through the new inline table-cell renderer | mitigate | factCell gates on factState exactly like sourcedValue and lives inside macros.njk (the sole allowlisted path); it exposes d.value only when d.publishable, and check-render-safety fails the build on any raw .value elsewhere (R-31) |
| T-03a-02-02 | Tampering | Stored XSS via an ingested fact value or source name rendered without escaping | mitigate | Nunjucks autoescaping stays ON; no `| safe` is added to any value or source name; external links keep rel="noopener" (ASVS V5, threat T-07-01) |
| T-03a-02-03 | Tampering (of safety meaning) | A withheld sub-state falling through to an unstyled default and reading as a confirmed value | mitigate | A single [data-state^="withheld"] rule catches all four sub-states (UI-SPEC G5); colour is only ever a second cue to a mandatory text label |
| T-03a-02-SC | Tampering | npm/pip/cargo installs | accept | Zero new dependencies this phase; supply-chain delta is zero, so no install checkpoint applies |
</threat_model>

<verification>
- `node scripts/check-render-safety.mjs src` and `npm run build` stay green: all value rendering is inside macros.njk.
- `node --test test/render-state.test.js` proves contested positions carry their sources across the render boundary.
- The CSS uses only the locked palette, catches every withheld sub-state with one selector, and keeps the nutrition table reflow-safe.
</verification>

<success_criteria>
- factCell renders a value/status as spans only, gated on factState, valid inside a <td>.
- The contested branch shows both positions with their own resolved sources (VRFY-11 rendering half).
- The state accent bars, nutrition-table and allergen-list styles exist and use only the approved colours with text always carrying the meaning.
</success_criteria>

<output>
Create `.planning/phases/03a-core-entity-pages-trust-rendering/03a-02-SUMMARY.md` when done.
</output>
