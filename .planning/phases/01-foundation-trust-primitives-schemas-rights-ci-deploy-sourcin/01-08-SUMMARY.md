# Plan 01-08 Summary — CI/deploy substrate

**Status:** Tasks 1-2 complete; **Task 3 (Netlify deploy) deferred by the user** to a later session.
**Requirements:** INFRA-01 (partially: CI + a11y floor enforced; live-deploy header confirmation pending)

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

## Outstanding — Task 3 (human action, deferred)

The plan's Task 3 is a blocking human-action gate the user chose to defer:

1. Push the Phase 1 commits to `origin` (github.com/LegendT/Food-Transparancy-UK).
   Local `main` is ahead of origin by the entire Phase 1 build; nothing is pushed.
2. Netlify → Add new site → Import from Git → `LegendT/Food-Transparancy-UK`.
3. Confirm `netlify.toml` (build `npm run build`, publish `_site`, NODE_VERSION 24).
4. Trigger a deploy; confirm the build log shows the prebuild gates before Eleventy.
5. Verify the LIVE response carries the tightened CSP + HSTS:
   `curl -sI https://<site>.netlify.app | grep -iE 'content-security-policy|strict-transport'`
6. GitHub → Settings → Actions: confirm Actions is enabled.

Until this is done, INFRA-01's "every gate has a host from day one" is satisfied in
CI config and at build time, but the LIVE-deploy header confirmation is pending.

## Deviations

1. `actions/cache` was also SHA-pinned (the plan mandated only checkout + setup-node)
   so no mutable action tag survives in the workflow (T-08-05 hardening).
2. The a11y CI step uses `npx start-server-and-test` (a committed dependency resolved
   from `node_modules`, downloads nothing) rather than an unverified `wait-on`
   download, honouring the "no npx of unverified packages" threat-model rule.

## Self-Check: PASSED (for Tasks 1-2)

- `npm run a11y:all`: 4/4 routes pass WCAG 2.2 AA.
- Task 2 verify grep passes; all three pinned SHAs resolve to their tags.
- No em-dashes; YAML parses.
