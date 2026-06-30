---
phase: 01-foundation-trust-primitives-schemas-rights-ci-deploy-sourcin
plan: 07
subsystem: ui
tags: [eleventy, nunjucks, macros, wcag, accessibility, trust-component, css]

# Dependency graph
requires:
  - phase: 01-01
    provides: base.njk layout, styles.css placeholder, findBy/readableDate filters, passthrough copy
  - phase: 01-03
    provides: sourced-value schema (the envelope shape the macro renders, incl. checkedOn)
  - phase: 01-05
    provides: src/_data/demoFact.json seed fact and the TRUST-06 referential gate
  - phase: 01-06
    provides: the live editorial lint scanning src/ prose
provides:
  - The sourcedValue trust macro (value + two colour-independent text tokens + details disclosure)
  - The Methodology stub anchoring #confidence and #evidence to meta.json definitions
  - A component demonstration fixture page (a pa11y target)
  - The home and 404 pages
  - The first full green end-to-end render build through all three prebuild gates
affects: [phase-03, product-pages, ingredient-pages, timeline, search]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Trust rendering via a single sourcedValue macro: progressive disclosure with native details/summary"
    - "Colour-independent text tokens with visually-hidden suffixes for out-of-context distinguishability"
    - "GOV.UK focus treatment (yellow #ffdd00 block + black bottom bar) on every link and summary"
    - "Macro resolves source ids via findBy over the registry ARRAY (sources.sources), never the wrapper object"

key-files:
  created:
    - src/_includes/components/macros.njk
    - src/methodology.njk
    - src/components-demo.njk
    - src/404.njk
  modified:
    - src/index.njk
    - src/assets/styles.css

key-decisions:
  - "The .fact wrapper is a block <div>, not a <span>, so it validly contains the details/ul disclosure that every later page inherits"
  - "Tokens link to /methodology/#confidence and /#evidence and carry visually-hidden suffixes so link text is unique out of context (WCAG 1.4.1 + 2.4.4)"
  - "Methodology describes the verification model as the INTENDED standard and marks itself a provisional Phase 7 stub; the example fact is labelled illustrative, not a verified record"
  - "Included DEBT's dataFreshnessBadge was omitted; its colour-coded dot conflicts with the colour-independence requirement and it is unused here"

patterns-established:
  - "Pattern: every fact is rendered through sourcedValue; never render a value without its provenance disclosure"
  - "Pattern: callers pass sources.sources (the array), not sources (the wrapper object)"

requirements-completed: [TRUST-03, TRUST-04]

# Metrics
duration: 25min
completed: 2026-06-30
---

# Phase 1 Plan 07: Trust rendering component, Methodology stub and first full render build Summary

**The sourcedValue Nunjucks macro renders each claim with two colour-independent text tokens (confidence, evidence) and progressive-disclosure provenance from the registry array, anchored by a Methodology stub, proven by a demo page, with the whole site building green through all three prebuild gates.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-06-30
- **Tasks:** 3
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments
- The `sourcedValue(fact, sources, label, unit)` macro: a block `.fact` div, two inline text tokens reading "confidence {grade}" / "evidence {grade}" (each a link to the Methodology anchor that defines it, each carrying a visually-hidden suffix), and a `<details>` disclosure listing each resolved source, the last-updated date, an optional checked-on date, and any note.
- Source resolution via `findBy` over the registry ARRAY (`sources.sources`); autoescaping left on, no `safe` filter on any value (threat T-07-01 mitigated).
- The Methodology stub with `#confidence` and `#evidence` anchors rendering the meta.json grade definitions, the verification model described as the intended standard (not already applied), the DATA-09 fact-bearing boundary note, a provisional Phase 7 stub marker, and one clearly-illustrative example fact.
- The home page (replacing the 01-01 placeholder) and a 404 page at `/404.html`.
- The first full green end-to-end build: all three prebuild gates (validate, editorial lint now scanning src/, image-rights) pass, and Eleventy emits index, methodology, components-demo and 404.

## Task Commits

1. **Task 1: sourcedValue trust macro and accessible styles** - `8d8135d` (feat)
2. **Task 2: Methodology stub, home and 404 pages** - `f4f8775` (feat)
3. **Task 3: Trust component demonstration fixture page** - `21b0932` (feat)

## Files Created/Modified
- `src/_includes/components/macros.njk` - sourcedValue macro plus caveatBox/sourceNote; the trust-rendering contract
- `src/methodology.njk` - grade definitions, intended verification model, DATA-09 boundary, illustrative example
- `src/components-demo.njk` - fixture page rendering demoFact through the macro (pa11y target)
- `src/404.njk` - not-found page at /404.html
- `src/index.njk` - neutral plain-English home page linking to Methodology
- `src/assets/styles.css` - .visually-hidden utility, GOV.UK #ffdd00 focus treatment, 44px touch targets, colour-independent .fact layout, page furniture

## How the colour-independent tokens are rendered
Each token is a normal text link: `confidence high` and `evidence high`, rendered as words, never as a colour swatch or dot. Out of context the link text would be ambiguous, so each carries a `visually-hidden` suffix (" (curator certainty)" / " (evidence strength)"), giving assistive technology a unique, self-describing link name. The grade word itself is the carrier of meaning, so the information survives loss of colour entirely (WCAG 1.4.1). Focus is shown with the GOV.UK yellow block and black bottom bar, which is shape-and-contrast based, not hue based.

## Decisions Made
- Block `<div>` wrapper for valid `details`/`ul` nesting (every Phase 3 page inherits the macro).
- Omitted DEBT's `dataFreshnessBadge` (colour-coded dot, unused, conflicts with colour-independence); kept `caveatBox` and `sourceNote`.
- Methodology honesty: intended-standard framing, provisional-stub marker, illustrative example explicitly not a verified record.

## Deviations from Plan
None - plan executed exactly as written. The supporting page-furniture styles (lede, caveat, grade list) were added to `src/assets/styles.css` alongside the Task 2 pages they style; `styles.css` is the same file Task 1 extends, so this is within the plan's declared file set, not new scope.

## Accessibility verification (GATE-02 early check)
- **Automated floor (pa11y, WCAG2AA):** clean. `No issues found!` on `/components-demo/`, `/methodology/` and `/` against the built `_site`.
- **Structural / keyboard review of rendered markup:** the `.fact` block is a `<div>` validly containing `<details>`/`<ul>` (no invalid nesting); the disclosure is a native `<details>`/`<summary>`, keyboard operable by default; every link and summary carries the GOV.UK focus treatment; both tokens carry visually-hidden suffixes giving unique accessible link names; touch targets are 44px.
- **Honest limitation:** this is the automated floor plus a markup-level review. A one-off human VoiceOver/NVDA pass over `/components-demo/` remains the recommended formal GATE-02 step and is not something an automated agent can stand in for. The formal pa11y-ci wiring across all routes is plan 01-08.

## Issues Encountered
None. The full test suite (45 tests) stays green; `npm run build` exits 0 with all three gates plus render.

## Next Phase Readiness
- The trust component is ready for every Phase 3 entity page to consume via `{% from "components/macros.njk" import sourcedValue %}`, passing `sources.sources`.
- The Methodology anchors exist, so any token link resolves from day one.
- Plan 01-08 wires pa11y-ci and CI across all routes; this plan's pages are already pa11y-clean.

## Self-Check: PASSED
- All six files present (4 created, 2 modified).
- All three task commits present in history (8d8135d, f4f8775, 21b0932).

---
*Phase: 01-foundation-trust-primitives-schemas-rights-ci-deploy-sourcin*
*Completed: 2026-06-30*
