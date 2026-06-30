# Plan 01-08 Summary — CI/deploy substrate

**Status:** Complete (3/3 tasks). Site live and live headers confirmed.
**Requirements:** INFRA-01 (satisfied: CI + a11y floor enforced; live-deploy CSP + HSTS confirmed)

## What was built (Tasks 1-2, autonomous)

- **`.pa11yci.json`** — WCAG2AA config over the four Phase 1 routes (`/`,
  `/methodology/`, `/404.html`, `/components-demo/`) on `127.0.0.1:8081`, with the
  no-sandbox `chromeLaunchConfig` args for CI. `npm run a11y:all` passes 4/4 routes,
  0 errors each.
- **`.github/workflows/ci.yml`** — hardened pipeline: triggers `push` +
  `pull_request` (not `pull_request_target`); top-level `permissions: contents: read`;
  actions pinned to REAL 40-char SHAs resolved from tags (verified against the live
  refs):
  - `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1`
  - `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0`
  - `actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830 # v4.3.0`
  Node 24 + npm cache; steps: checkout, setup-node, `npm ci`,
  `npm audit --omit=dev --audit-level=high` (production tree only), puppeteer cache +
  `npx puppeteer browsers install chrome`, `npm run prebuild`, `npm test`,
  `npm run build`, `npm run a11y:ci`; fails on any non-zero step.
- **`.github/dependabot.yml`** — `github-actions` + `npm` ecosystems, so the SHA pins
  and deps stay current.

## Commits

- `03fc0c9` feat(01-08): add pa11y-ci config for the Phase 1 accessibility floor
- `af6df8a` feat(01-08): add hardened GitHub Actions CI and Dependabot config

## Task 3 (human action) — DONE

- Phase 1 commits pushed to `origin/main` (`b802baa..21cd973`, 48 commits).
- The user created and connected the Netlify project `food-transparancy-uk`.
- Live site: **https://food-transparancy-uk.netlify.app** returns HTTP 200; a
  successful deploy means Netlify's `npm run build` ran the prebuild gates.
- Live response headers confirmed (actual `curl -sI`):
  - `content-security-policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; ...; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests` (tightened, no Cloudflare allowances)
  - `strict-transport-security: max-age=31536000; includeSubDomains; preload`
  - `x-content-type-options: nosniff`, `x-frame-options: DENY`
- The `CI` workflow runs on push; Dependabot immediately opened PRs bumping the
  pinned actions (checkout v7, setup-node v6, cache v6), confirming the pins are
  maintained.

INFRA-01 is satisfied: every gate has a live host, enforced at deploy time and in CI.

## Deviations

1. `actions/cache` was also SHA-pinned (the plan mandated only checkout + setup-node)
   so no mutable action tag survives in the workflow (T-08-05 hardening).
2. The a11y CI step uses `npx start-server-and-test` (a committed dependency resolved
   from `node_modules`, downloads nothing) rather than an unverified `wait-on`
   download, honouring the "no npx of unverified packages" threat-model rule.

## Self-Check: PASSED

- `npm run a11y:all`: 4/4 routes pass WCAG 2.2 AA.
- Task 2 verify grep passes; all three pinned SHAs resolve to their tags.
- Live deploy returns HTTP 200 with the tightened CSP + HSTS confirmed on an
  actual response.
- No em-dashes; YAML parses.
