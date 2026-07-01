You're picking up the Food Transparency UK project (/Users/anthonygeorge/Projects/Food Transparancy). Read .planning/HANDOFF.md first - it has the full state. Summary:

- **Phases 1 and 2 are complete.** Phase 1 is the schema/trust foundation (Eleventy 3.1.6, flat JSON, Ajv + node:test, pa11y-ci, Netlify + GitHub Actions, Node 24), deployed behind pre-launch basic auth. Phase 2 is the claim-typed verification model, per-fact publication gate, four-verdict citation checker, OFF ingestion, and audit.
- **Current state:** branch `main`, tip `aa5e75e`, working tree clean, **63 commits ahead of origin - NOT pushed (ask before pushing)**. `node --test` 162/162, `npm run prebuild` green. ROADMAP marks Phase 2 `[x]` complete (note: STATE.md's status line is stale at "verifying" - ROADMAP is authoritative).
- **Phase 2 was verified 14/14 and hardened by five review passes** (plan-checker, Opus code review, Sonnet code review, then a three-model deep adversarial execution audit). All findings fixed with regression tests, including 2 CRITICAL (a `corrected`-without-`correctedValue` publish-of-undefined, and a `localhost`/`ip6-localhost` SSRF bypass), both re-verified end-to-end. Do not re-review unless asked - returns had converged.

- **Task:** choose one:
  - **`/gsd:secure-phase 2`** (recommended first) - no `02-SECURITY.md` yet; Phase 2 added the project's first server-side network I/O and the SSRF guard was hardened twice, so the formal threat-model gate is warranted.
  - **`/gsd:discuss-phase 3a`** - the next content phase ("Core Entity Pages & Trust Rendering"). No CONTEXT.md exists for 3a yet, so discuss-phase is the start. This is where the withheld / contested / review-due states Phase 2 derives finally reach readers.

Things settled in Phase 2 that Phase 3a MUST honour (highlights; full detail in `02-CONTEXT.md`, do not re-litigate):
- **Render off the DERIVED state, never `fact.value`.** Every withheld record still carries its raw value in JSON by design, so Phase 3a is the single point the whole model can be silently defeated. Phase 3a MUST test that a withheld / contested value never renders (R-31, not yet enforced). `lib/verification.mjs` is pure and importable at render time - reuse it, do not re-derive.
- **ROADMAP Phase 3a now owns the reader-facing half of VRFY-11 (contested both-sides) and VRFY-12 (review-due indicator)** - added as Phase 3a Success Criterion 5. Phase 2 delivered only the status + last-verified date.
- A "pass" is a verification event, not a source; publication status is build-time derived (`{enum:[null]}` on all schemas). Corroborable = 2 confirms passes / distinct lineage / >=1 primary; authoritative = 1 authority + distinct-`reviewerKind` re-read. Four-verdict citation existence (403 = ACCESS_BLOCKED, never dead). OFF leads are not SourcedValue facts (distinct schema, outside the cascade). AI never adjudicates - verdicts/adjudication are human editorial work at a blocking checkpoint (the 01-10 / 02-07 pattern). The verdict cache `.cache/citation-verdicts.json` is committed; network scripts (`check:citations`, `ingest:off`, `audit`) run manually, never in prebuild.

CRITICAL tooling gotcha: the `gsd-sdk` on PATH is the WRONG binary. The real GSD helper is `node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>` (e.g. `gsd-sdk query X.Y` -> `gsd-tools.cjs X Y`; subcommands take named flags like `--phase`/`--files`, not positional args). Also in session memory as `gsd-sdk-binary-collision`.

Git: don't push without asking (global rule). The blueprint repo /Users/anthonygeorge/Projects/DEBT is the live pattern source - read-only, don't modify. Config: Quality models (Opus plan / Sonnet check), Interactive mode, research + plan-check + Nyquist + code-review + security on, commit_docs on.

Honour the global CLAUDE.md rules: British English, conventional commits, WCAG 2.2 AA, minimal deps, no push without asking, no emoji, no em-dashes.

Start in a fresh context window (/clear first).
