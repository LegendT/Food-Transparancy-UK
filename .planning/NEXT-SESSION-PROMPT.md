You're picking up the Food Transparency UK project (/Users/anthonygeorge/Projects/Food Transparancy). Read .planning/HANDOFF.md first — it has the full state. Summary:

- **Phase 1 is complete, deployed, and three-times deep-reviewed.** Schema/trust foundation (Eleventy 3.1.6, flat JSON, Ajv + node:test, pa11y-ci, Netlify + GitHub Actions, Node 24). 60/60 tests, build + a11y green, CI green. Live at https://food-transparancy-uk.netlify.app behind HTTP basic auth (401 is intentional, pre-launch). main is in sync with origin (tip cc19332), working tree clean.
- **Task:** plan Phase 2 — run `/gsd:plan-phase 2`. Phase 2 is "Claim-Typed Verification, Per-Fact Publication Gate & Ingestion": no fact publishes without the passes its claim type demands; unverified facts render as withheld placeholders; stale facts show a reader-facing review-due indicator; contested facts publish with a both-sides treatment; OFF data enters only as draft leads.
- **Read before planning:** docs/SPIKE-01-FINDINGS.md and docs/spike-findings.json. SPIKE-01's headline finding is that **the archival/primary fetch path is the #1 Phase 2 requirement** — Wayback is blocked from the agent fetch tool (partial via raw curl/CDX) and retailers block fetches, so the strict corroborable historic bar was met 0/3. The spike already named the requirements the Phase 2 gate must enforce (distinct-lineage detection, citation-existence checks, measure-mismatch auto-disagreement, human adjudication routing).
- **Also deferred to Phase 2:** claimType/claimDomain are author-self-classified and nothing yet cross-checks them against a claim's actual nature — the verification gate is where that semantic enforcement belongs.

CRITICAL tooling gotcha: the `gsd-sdk` on PATH is the WRONG binary. The real GSD helper is `node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>` (e.g. `gsd-sdk query X.Y` → `gsd-tools.cjs X Y`). Also in session memory as `gsd-sdk-binary-collision`.

Git: don't push without asking (global rule). The blueprint repo /Users/anthonygeorge/Projects/DEBT is the live pattern source — read-only, don't modify. Config: Quality models (Opus plan / Sonnet check), Interactive mode, research + plan-check + Nyquist on.

Honour the global CLAUDE.md rules: British English, conventional commits, WCAG 2.2 AA, minimal deps, no push without asking, no emoji, no em-dashes.

Start in a fresh context window (/clear first).
