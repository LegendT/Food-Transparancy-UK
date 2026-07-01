You're picking up the Food Transparency UK project (/Users/anthonygeorge/Projects/Food Transparancy). Read .planning/HANDOFF.md first - it has the full state. Summary:

- **Phase 1 is complete and deployed.** Schema/trust foundation (Eleventy 3.1.6, flat JSON, Ajv + node:test, pa11y-ci, Netlify + GitHub Actions, Node 24). 60/60 tests, build + a11y green, CI green. Live at https://food-transparancy-uk.netlify.app behind HTTP basic auth (401 is intentional, pre-launch). main tip d045a43, working tree clean, not pushed since Phase 1.
- **Phase 2 context is captured and deep-refined.** `/gsd:discuss-phase 2` is done and `02-CONTEXT.md` was critique-refined from 9 to 19 locked decisions with one research spike. **Do not re-litigate those decisions - they are settled in `.planning/phases/02-.../02-CONTEXT.md`; read it first.**
- **Task:** run `/gsd:plan-phase 2`. It will skip the context gate (CONTEXT.md exists) and go research -> plan -> verify. **Take the research pass when offered** - the planner needs concrete patterns for the inline `verification` schema, the four-verdict citation-existence checker (HEAD -> GET-range -> Wayback -> DOI), and the OFF API ingestion shape.

Phase 2 is "Claim-Typed Verification, Per-Fact Publication Gate & Ingestion" (14 reqs: VRFY-01..12, DATA-05/06): no fact publishes without the passes its claim type demands; unverified facts render as withheld placeholders; stale facts show a reader-facing review-due indicator; contested facts publish with a both-sides treatment; OFF data enters only as draft leads. The three natural plan seams are named in CONTEXT.md.

Things already settled in `02-CONTEXT.md` that the plan must honour (highlights):
- A "pass" is a verification *event*, not a source; the gate counts confirming passes, never `sources[]` length. Publication status is build-time *derived*, not hand-set.
- Corroborable = 2 passes, distinct lineage, >=1 primary. Authoritative = 1 authority + independent re-read of the same source (lineage-distinctness does not apply; independence is reader-axis).
- Citation-existence uses a **four-verdict model** - a 403 is `ACCESS_BLOCKED` (host up, refused the bot), never scored dead nor auto-passed; auto-mitigated by a Wayback snapshot lookup; DOIs via Crossref + Handle API without scraping. All reachable server-side.
- OFF leads are NOT SourcedValue facts - distinct `lead` schema, outside the cascade; promotion mints facts. AI never adjudicates.

CRITICAL tooling gotcha: the `gsd-sdk` on PATH is the WRONG binary. The real GSD helper is `node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>` (e.g. `gsd-sdk query X.Y` -> `gsd-tools.cjs X Y`). Also in session memory as `gsd-sdk-binary-collision`.

Git: don't push without asking (global rule). The blueprint repo /Users/anthonygeorge/Projects/DEBT is the live pattern source - read-only, don't modify. Config: Quality models (Opus plan / Sonnet check), Interactive mode, research + plan-check + Nyquist on.

Honour the global CLAUDE.md rules: British English, conventional commits, WCAG 2.2 AA, minimal deps, no push without asking, no emoji, no em-dashes.

Start in a fresh context window (/clear first).
</content>
