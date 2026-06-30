---
phase: 01-foundation-trust-primitives-schemas-rights-ci-deploy-sourcin
plan: 06
subsystem: testing
tags: [gates, prebuild, image-rights, editorial-lint, en-GB, defamation, node-test, eleventy]

# Dependency graph
requires:
  - phase: 01-01
    provides: prebuild chain and eleventy.before gate hook (the two scripts wire into both)
  - phase: 01-04
    provides: schemas/image.schema.json (the rightsStatus enum the image gate enforces)
provides:
  - DATA-10 image-rights default-deny gate over referenced images vs a manifest
  - UX-06 scoped British-English and neutral-editorial lint (Class A everywhere, Class B analyst-only)
  - the quote-allow directive and blockquote suppression that keep lawful attributed quotation publishable
  - negative fixtures plus passing attributed-quote and rule-explaining-doc fixtures proving each gate's behaviour
affects: [01-07, 01-09, 01-10, phase-03a, phase-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gate logic in lib/ (pure, returns {errors}) shared by a scripts/ CLI wrapper and a test/ file (DEBT Pattern 4)"
    - "Non-zero corpus assertion: each gate names its corpus (manifest / prose files) and exits non-zero on an empty one"
    - "Scoped lint: Class A everywhere, Class B analyst-only, with a same-line editorial-allow directive and blockquote carve-out"

key-files:
  created:
    - lib/check-images.mjs
    - scripts/check-images.mjs
    - src/_data/images.json
    - lib/editorial-rules.mjs
    - scripts/check-editorial.mjs
    - test/images.test.js
    - test/editorial.test.js
    - test/fixtures/invalid/uncleared-packshot.json
    - test/fixtures/invalid/unmanifested-image.json
    - test/fixtures/invalid/editorial-emdash.md
    - test/fixtures/invalid/editorial-us-spelling.md
    - test/fixtures/invalid/editorial-superlative.md
    - test/fixtures/invalid/editorial-motive.md
    - test/fixtures/valid/editorial-attributed-quote.md
    - test/fixtures/valid/editorial-rule-explaining-doc.md
  modified: []

key-decisions:
  - "Image gate is default-deny over REFERENCED images; the manifest is the non-zero corpus and zero references is a valid pass (Phase 1 references none)"
  - "Editorial lint scope split: Class A (em-dash, US spellings) everywhere; Class B (superlatives, denigratory and motive phrases) analyst-only, never attributed quotes"
  - "Quote-allow is ONE pinned rule: the same-line editorial-allow directive suppresses Class B on that physical line only; a >-blockquote line is suppressed for its whole extent"
  - "Editorial scan is an explicit allowlist (src/ + docs/ + root README.md), prose extensions only, hard-excluding dot-dirs, CLAUDE.md and test/fixtures so it never self-trips on planning prose"
  - "Sentence-case is a non-failing warning; proper-noun headings are expected to trigger it"

patterns-established:
  - "Pattern 1: a gate is only real if a negative fixture proves its failure path AND it refuses an empty corpus"
  - "Pattern 2: lawful attributed quotation is carved out by scope, not by weakening the denylist"

requirements-completed: [DATA-10, UX-06]

# Metrics
duration: 16min
completed: 2026-06-30
---

# Phase 1 Plan 06: Image-rights and editorial gates Summary

**DATA-10 default-deny image-rights gate plus a scoped en-GB/neutral-editorial lint that blocks em-dashes, US spellings, superlatives and motive-imputation in analyst prose while leaving lawful attributed quotation publishable.**

## Performance

- **Duration:** ~16 min
- **Completed:** 2026-06-30
- **Tasks:** 3
- **Files created:** 15

## Accomplishments
- Image-rights gate (`lib/check-images.mjs` + `scripts/check-images.mjs` + seeded `src/_data/images.json`): default-deny over referenced images; a missing, not-cleared, or unjustified fair-dealing record fails the build; the manifest is the non-zero corpus and zero references is a valid pass.
- Scoped editorial lint (`lib/editorial-rules.mjs` + `scripts/check-editorial.mjs`): Class A everywhere, Class B analyst-only, word-boundary matching, a same-line `<!-- editorial-allow: quote -->` directive and `>`-blockquote suppression, and a non-failing sentence-case warning.
- Full negative-fixture corpus plus a passing attributed-quote fixture and a passing rule-explaining-doc fixture, with 20 new tests (45 total) all green.
- `npm run build` now runs all three gates (validate + lint:editorial + check:images) for the first time together and still builds `_site`.

## Task Commits

1. **Task 1: Image-rights default-deny gate** - `bf3232e` (feat)
2. **Task 2: Scoped British-English and neutral-editorial lint** - `ddf7fa4` (feat)
3. **Task 3: Negative fixtures, attributed-quote allow case, build-fail proof** - `5793687` (test)

## Files Created/Modified
- `lib/check-images.mjs` - DATA-10 default-deny logic; `checkImages`, `collectReferencedImages`, `ALLOWED_RIGHTS`.
- `scripts/check-images.mjs` - prebuild CLI; manifest-as-corpus; optional target-path arg; single-file fixture mode.
- `src/_data/images.json` - rights manifest seeded with one own-photographed record.
- `lib/editorial-rules.mjs` - scoped Class A/Class B denylists, `lint(text,{scope})`, `sentenceCaseWarnings`, the pinned quote-allow rule and field-scope map.
- `scripts/check-editorial.mjs` - prebuild CLI; allowlist scan (src/ + docs/ + README.md), prose extensions only, hard exclusions, optional target-path arg.
- `test/images.test.js`, `test/editorial.test.js` - unit + child-process build-fail and empty-corpus proofs.
- `test/fixtures/invalid/*`, `test/fixtures/valid/*` - the negative corpus plus the two passing-quote/rule-doc fixtures.

## Decisions Made
- Image references use a pinned narrow convention (`image`/`imageRef`/`imageReference` scalar keys, `imageRefs`/`imageReferences` array keys), so a brand identifier string is never mistaken for an image. The manifest's own `images` array is deliberately not collected as a reference.
- Editorial fixtures are self-contained gate inputs where needed (`{ manifest, referenced }`) so a single negative file can be spawned in isolation for the build-fail proof.
- The script scans prose extensions only (`.md`, `.njk`, `.html`), which excludes `.json` keys (legitimate `licence`), `.css` (`color:`) and `.mjs`/`.js` source by construction.

## Deviations from Plan

None - plan executed exactly as written. The live `SELECTION-CRITERIA.md` league-table line (which names "worst offenders" and "outrage") sits in a `>`-blockquote behind the allow directive and passes, as the plan anticipated.

## Issues Encountered
None. The only pre-existing Class B match in the live corpus (the SELECTION-CRITERIA blockquote) is correctly suppressed by the blockquote rule, so `node scripts/check-editorial.mjs` exits 0.

## Known Stubs
None. The seeded manifest record points at `assets/photography/own-hero-shelf.jpg`, an own-photographed placeholder reference that is intentionally unreferenced in Phase 1 (its only job is to make the manifest a non-zero corpus and exercise the own-photographed happy path); no UI consumes it.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three prebuild gates (validate, editorial, image-rights) now exist and run together; the build and Netlify/CI path enforce them.
- Plans 01-07/01-09/01-10 authoring prose must place any banned-term explanation on the same physical line as the `<!-- editorial-allow: quote -->` directive, or inside a `>`-blockquote, exactly as the rule-explaining-doc fixture demonstrates.

## Self-Check: PASSED
- All 15 created files verified present on disk.
- All 3 task commits verified in git log (bf3232e, ddf7fa4, 5793687).
- `npm test` 45/45 pass; both gates exit 0 on the live corpus; `npm run build` runs all three gates and writes `_site`.

---
*Phase: 01-foundation-trust-primitives-schemas-rights-ci-deploy-sourcin*
*Completed: 2026-06-30*
