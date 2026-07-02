You're picking up Food Transparency UK (`/Users/anthonygeorge/Projects/Food Transparancy`). Read `.planning/HANDOFF.md` first - it has the full state. Summary:

- **Phases 1, 2 and 3a are complete.** Phase 3a (Core Entity Pages & Trust Rendering) is done, verified (UAT 9/9), and hardened by a four-way adversarial audit. `STATE.md` is `status: ready`, Phase 3b, "ready to plan".
- Git: branch `main`, tree clean, everything through `7bb1804` pushed to `origin/main` and in sync (run `git rev-parse --short HEAD` / `git status` to confirm). `node --test` **219/219**, `npm run build` green, `npm run prebuild` exit 0, `npm run a11y:all` 0 WCAG 2.2 AA errors.
- Execution has been **sequential-on-main** (`workflow.use_worktrees=false`). Two non-negotiables carried from last session: **(1) verify every finding against REAL code/HTML, never a self-report** (this session an executor's "green" and two audit findings were wrong - the real gates/tests caught them); **(2) AI never authors verification passes or adjudications on real corpus facts (D-04/D-11)** - a human authors/approves at a checkpoint, AI transcribes.

**Your task: begin Phase 3b (Site Shell, Accessibility, Crawlability, Non-Expert UX & Credibility Surface).**

1. Start with `/gsd:discuss-phase 3b` (no CONTEXT.md exists yet) to gather context, then `/gsd:plan-phase 3b`. Phase 3b scope (from ROADMAP): the site chrome (`/404`, `/privacy`, `/sources` index), crawlability (sitemap.xml, robots.txt, JSON-LD), plain-English UX with inline glossary and chart-to-table fallbacks, the **pa11y-ci automated WCAG 2.2 AA floor across EVERY route (SITE-04)** (3a registered only a representative subset - 3b owns the full floor), and the credibility surface: the "not medical/dietary advice" disclaimer (SITE-09), the About page with editorial-independence/COI/funding/named accountable editor (SITE-10), per-page canonical citation + single-record JSON export (SITE-11), the RSS/Atom feed of changed records (SITE-12), and a per-page "report an error" link (SITE-13).

2. Honour the constraints when building 3b surfaces: **any client-side data embed must be a pre-projected SAFE dataset, never a raw fact object** (the R-31 render-safety gate denies `dump`/`tojson`/`jsonScript`/`dictsort` and object enumeration - see HANDOFF "R-31 render boundary"). The SITE-11 JSON export must expose only published/derived values, not withheld `.value`s.

3. Two Phase-3a threads are open but NOT blockers for 3b:
   - **SC4** (>=20 products / >=40 ingredients seed corpus) - the parallel editorial/historic-sourcing workstream's numeric gate, tracked as an acknowledged deferral. 3b does not depend on it. As the corpus grows, the currently test-only renders (a live published-stale example, a live INGR-04 product list) become demonstrable on real data.
   - The end-of-phase manual assistive-tech check for 3a was done via the Chrome accessibility tree during UAT; 3b's SITE-04 full-route pa11y floor supersedes the per-route subset.

4. Run the GSD gates as config dictates after execution (research + plan-check + Nyquist + code-review + security enforcement are all on; `human_verify_mode: end-of-phase`).

Standing rules: British English, no em-dashes, no emoji, WCAG 2.2 AA, ZERO new dependencies, conventional commits (end each with the `Co-Authored-By: Claude Opus 4.8 (1M context)` trailer), **no push without asking**. `gsd-sdk` on PATH is the WRONG binary - use `node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>` in SUBCOMMAND form. `/Users/anthonygeorge/Projects/DEBT` is read-only.
