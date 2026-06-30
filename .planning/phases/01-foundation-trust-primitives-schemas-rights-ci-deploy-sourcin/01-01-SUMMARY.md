---
phase: 01-foundation-trust-primitives-schemas-rights-ci-deploy-sourcin
plan: 01
subsystem: infra
tags: [eleventy, ajv, pa11y-ci, netlify, csp, nunjucks, node24]

requires: []
provides:
  - Buildable Eleventy 3.1.6 project mirroring the DEBT conventions (filters, dir config, assets passthrough)
  - Six pinned, lockfile-audited dependencies (eleventy + ajv/ajv-formats/pa11y-ci/start-server-and-test/http-server)
  - Fail-closed build wiring across two layers (npm prebuild lifecycle + eleventy.before hook), no-op until Wave 4 gate scripts exist
  - Trimmed en-GB accessible base layout, placeholder index, initial styles.css
  - Netlify build config with a tightened CSP (no Cloudflare allowances), HSTS and security headers
  - MIT code licence
affects: [01-02, 01-05, 01-06, 01-07, 01-08]

tech-stack:
  added: ["@11ty/eleventy@3.1.6", "ajv@8.20.0", "ajv-formats@3.0.1", "pa11y-ci@4.1.1", "start-server-and-test@3.0.11", "http-server@14.1.1"]
  patterns:
    - "Two-layer fail-closed gate wiring: npm prebuild lifecycle + eleventy.before hook gated to runMode build"
    - "Exact-pin dependency policy via .npmrc save-exact; committed lockfile is the audited artefact"
    - "DEBT-mirrored Eleventy filters (findBy, jsonScript, number, isoDate, readableDate), trimmed to the Phase 1 data shape"

key-files:
  created:
    - package.json
    - package-lock.json
    - .npmrc
    - .node-version
    - .eleventy.js
    - .gitignore
    - .editorconfig
    - src/_data/site.json
    - src/_includes/layouts/base.njk
    - src/index.njk
    - src/assets/styles.css
    - netlify.toml
    - LICENSE
  modified: []

key-decisions:
  - "Corrected the Ajv ESM import specifier to ajv/dist/2020.js (with extension); the research's extensionless ajv/dist/2020 does not resolve under Node 24 because ajv@8.20.0 ships no exports field"
  - "build stays bare eleventy; the bypass closure is the eleventy.before hook, not a chained npm run prebuild"
  - "style-src tightened to 'self' (no inline styles emitted in Phase 1)"

patterns-established:
  - "Gate hook skips cleanly when scripts/ does not yet exist, so Wave 1 npx @11ty/eleventy builds before the Wave 4 gate scripts land"

requirements-completed: [INFRA-01]

duration: 5min
completed: 2026-06-30
---

# Phase 01 Plan 01: Foundation Toolchain and Netlify Substrate Summary

**Buildable Eleventy 3.1.6 project mirroring DEBT, six exactly-pinned lockfile-audited dependencies, a two-layer fail-closed gate wiring, and a Netlify config with a tightened CSP/HSTS and MIT licence.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-30T18:41:48Z
- **Completed:** 2026-06-30T18:47:19Z
- **Tasks:** 3 (Task 1 checkpoint pre-resolved by the user; Tasks 2 and 3 executed)
- **Files modified:** 13 created

## Accomplishments

- Fresh Eleventy 3.1.6 project that builds with `npx @11ty/eleventy`, emitting `_site` from a placeholder index and copying `src/assets` through (verified: build exits 0, `_site/index.html` and `_site/assets/styles.css` produced).
- Installed and exactly pinned the six accepted dependencies; the committed `package-lock.json` (4655 lines) is the audited artefact for the slopcheck-substitute gate.
- `.eleventy.js` mirrors the DEBT filters (`findBy`, `jsonScript`, `number`, `isoDate`, `readableDate`), registers the `src/assets` passthrough, and adds an `eleventy.before` hook gated to `runMode === "build"` that runs the three gate scripts and throws on non-zero, skipping cleanly until the Wave 4 scripts exist.
- Trimmed, accessible, en-GB `base.njk` (skip link, semantic header/main/footer, no inline script/style, links `/assets/styles.css`), a placeholder `index.njk`, and an initial `styles.css`.
- `netlify.toml` with a tightened CSP (`script-src`/`style-src 'self'`, no Cloudflare allowances), HSTS, and the DEBT security headers; MIT `LICENSE` (code only).

## Task Commits

1. **Task 2: Scaffold the Eleventy project and install dependencies** - `1e947fb` (feat)
2. **Task 3: Netlify build config with tightened CSP, HSTS and MIT licence** - `6b87ccb` (feat)

Task 1 was a `checkpoint:human-verify` (blocking-human) dependency-confirmation gate. The user explicitly pre-approved the six-package direct set ahead of execution, acknowledging puppeteer's install-time Chromium download, so no pause was required.

## Dependency Gate: Resolved-Tree Review (Task 1 post-install obligation)

The audited-artefact half of the gate was completed after install:

- **Direct tree (`npm ls --depth=0`)** confirms exactly the six approved packages, no extras: `@11ty/eleventy@3.1.6`, `ajv@8.20.0`, `ajv-formats@3.0.1`, `pa11y-ci@4.1.1`, `start-server-and-test@3.0.11`, `http-server@14.1.1`.
- **package.json pins are exact** (no caret/tilde) for all six, courtesy of `.npmrc save-exact=true`.
- **puppeteer's Chromium download acknowledged:** `npm ls puppeteer` shows `pa11y-ci@4.1.1 -> pa11y@9.1.1 -> puppeteer@24.43.1` (deduped); the Chromium revision `mac_arm-148.0.7778.97` is present in `~/.cache/puppeteer/chrome`. This is the one expected transitive install-time script, not slop.
- **`package-lock.json` is committed** (in `1e947fb`) before CI runs. `npm audit` reported 0 vulnerabilities.

## Files Created/Modified

- `package.json` - type:module, the full prebuild/build/test/a11y script chain, build bare `eleventy`, MIT, eleventy as exact dependency.
- `package-lock.json` - the audited resolved tree (committed).
- `.npmrc` - `save-exact=true`; cooldown intent as a comment (min-release-age is not a live npm key); does NOT set ignore-scripts.
- `.node-version` - `24`.
- `.eleventy.js` - DEBT filters, `src/assets` passthrough, fail-closed `eleventy.before` gate hook (runMode-build gated, skips missing scripts).
- `.gitignore`, `.editorconfig` - mirror DEBT conventions.
- `src/_data/site.json` - title, tagline, description, lang en-GB, Home/Methodology nav.
- `src/_includes/layouts/base.njk` - trimmed accessible en-GB base layout, no inline script/style.
- `src/index.njk` - placeholder home page (Plan 01-07 replaces).
- `src/assets/styles.css` - minimal placeholder (Plan 01-07 extends with the GOV.UK focus treatment and `.visually-hidden`).
- `netlify.toml` - npm run build, NODE_VERSION 24, tightened CSP, HSTS, security headers.
- `LICENSE` - MIT (code only).

## Decisions Made

- **Ajv import specifier corrected to `ajv/dist/2020.js`** (see Deviations). The capability (Ajv 2020 + ajv-formats under Node 24) works; only the documented specifier string was wrong.
- **`build` stays bare `eleventy`** rather than a chained `npm run prebuild && eleventy`; the direct-call bypass is closed by the `eleventy.before` hook, and chaining would double-run gates under `npm run build` while still missing a direct `eleventy` call.
- **`style-src 'self'`** (dropped the research's `'unsafe-inline'`) because the Phase 1 build emits no inline styles; verified by grep over `src/`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / documentation correctness] Ajv ESM import specifier needs the `.js` extension under Node 24**
- **Found during:** Task 2 (the Ajv import smoke test in the verify block).
- **Issue:** The research and plan document the validator import as `import Ajv2020 from "ajv/dist/2020"` (no extension) and assert it resolves under Node 24 ("finding-5 smoke"). Empirically it does NOT: under Node 24.16.0, `ajv/dist/2020` raises `ERR_MODULE_NOT_FOUND` because `ajv@8.20.0` ships no `exports` field (and is CommonJS with no `type`), so Node's ESM resolver will not extension-guess an explicit subpath. The pattern works under bundlers/TypeScript (which extension-guess), not under raw Node ESM.
- **Fix:** Verified the correct specifier `ajv/dist/2020.js` (with extension) resolves and `addFormats` applies (`Ajv2020` is a function). No code in this plan imports ajv, so no source change was needed here; the correction is recorded for **Plan 01-05**, which authors `lib/validate.mjs` and MUST use `ajv/dist/2020.js`.
- **Files modified:** none (forward-looking correction; temporary probe files were created and removed).
- **Verification:** `node` run of a project-root `.mjs` importing `ajv/dist/2020.js` + `ajv-formats` printed `OK DOT-JS: Ajv2020 function`; the no-extension form printed `ERR_MODULE_NOT_FOUND`.
- **Committed in:** n/a (no code change; documented here).

---

**Total deviations:** 1 (1 documentation/correctness finding, no source change required in this plan).
**Impact on plan:** None to this plan's artefacts (build, passthrough, deps, CSP all verified). One forward-looking correction that saves Plan 01-05 a debugging cycle.

## Issues Encountered

- The initial Ajv smoke test was first run from a scratchpad `.mjs` outside the project, which could not resolve `node_modules/ajv` at all (false negative). Re-running from a project-root `.mjs` isolated the real finding above.

## Threat Surface

No new security surface beyond the plan's `<threat_model>`. T-01-SC (supply chain) mitigated by the pre-approved list plus the committed exact-pinned lockfile and acknowledged Chromium download; T-01-01/02/05 mitigated by the netlify.toml CSP, X-Frame-Options, nosniff and HSTS (live-deploy confirmation deferred to Plan 01-08).

## User Setup Required

None - no external service configuration required in this plan. (Netlify site creation and the live-deploy header confirmation land in Plan 01-08.)

## Next Phase Readiness

- The substrate is in place: every later wave (schemas, gates, rendering) now has a buildable host.
- **Action for Plan 01-05:** use `import Ajv2020 from "ajv/dist/2020.js"` (with the `.js` extension), not the extensionless form in the research code block.
- `npm run build` will fail until the Wave 4 gate scripts (`scripts/validate-data.mjs`, `scripts/check-editorial.mjs`, `scripts/check-images.mjs`) exist; Wave 1 builds via `npx @11ty/eleventy` by design. The end-to-end gated `npm run build` is verified in Plan 01-07.

## Self-Check: PASSED

- All 13 created files verified present on disk.
- Both task commits (`1e947fb`, `6b87ccb`) verified in git history.

---
*Phase: 01-foundation-trust-primitives-schemas-rights-ci-deploy-sourcin*
*Completed: 2026-06-30*
