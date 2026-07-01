# Handoff - Food Transparency UK

**Date:** 2026-07-01
**Status:** **Phase 1 complete and deployed. Phase 2 context captured and deep-refined. Ready to run `/gsd:plan-phase 2`.**

## What this project is

An evidence-based, citation-first static archive of how UK packaged-food recipes have changed over time. The thesis: many everyday "foods" have quietly become a manipulation of the original (e.g. "ice cream" that is no longer cream but vegetable oil and stabilisers). Built first for the non-expert who has heard of "UPF" but hasn't connected it to specific products. **Core value:** every published fact is traceable to a primary source, independently verified to a standard matched to its claim type, and honest about its uncertainty. Full context: `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md` (9 phases; Phase 1 complete).

## Current state (verified)

- **Git:** branch `main`, tip `d045a43`, working tree clean (only untracked `.history/`, `.vscode/`, and a local `.docx` remain, none tracked). Repo: github.com/LegendT/Food-Transparancy-UK. **Not pushed since Phase 1** - ask before pushing (global rule).
- **Gates (unchanged since Phase 1):** `npm run build` green; `node --test` 60/60; `npm run a11y:all` 4/4 routes WCAG 2.2 AA; CI green.
- **Live:** https://food-transparancy-uk.netlify.app - deployed, gated behind HTTP basic auth (returns 401; intentional, pre-launch).

## What just happened this session

Ran `/gsd:plan-phase 2`, which found no `CONTEXT.md` and (interactive mode) routed to discuss-phase first. Completed `/gsd:discuss-phase 2`, then did a deep critique-and-refine pass with one research spike.

- **`02-CONTEXT.md` written, then refined** (commits `49f3daf` -> `df0df50` -> `d045a43`). It grew from 9 to 19 locked decisions after the critique.
- **DISCUSSION-LOG.md** records the alternatives considered (audit-only).
- **STATE.md** updated with the context session.

The deep pass fixed five correctness issues, four precision gaps, and resolved the biggest external risk with a background research agent. Do **not** re-litigate these - they are settled in `02-CONTEXT.md`:
- **Modelling:** a "pass" is a verification *event* (not a source); the gate counts confirming passes, never `sources[]` length (D-02). Publication status is build-time *derived*, not hand-set, which is what makes "wrong auto-withholds" continuous (D-03).
- **Two claim-type rules are different:** corroborable = 2 passes, distinct lineage, >=1 primary (D-05); authoritative = 1 authority + independent *re-read* of the same source, lineage-distinctness explicitly does not apply, independence is on the reader axis (D-06).
- **Contested facts** hold a positions array (singular `value` can't) (D-14); a single **publication decision table** makes the load-bearing rule visible: stale publishes, wrong/disagreement withhold (D-15).
- **OFF leads are not facts:** they use a distinct `lead` schema outside the cascade, so the corpus-escape guard never trips on them; promotion is the human step that mints facts (D-19). (This corrected a backwards statement in the first draft.)
- **Citation-existence (the big one, R1):** a naive check would have blocked the very sources we cite (retailers 403, Wayback unreachable). Research (Wayback availability/CDX, Crossref, Handle API, lychee) produced a **four-verdict model** (D-07..D-10): a 403 is `ACCESS_BLOCKED` (host is up, refused the bot) - never scored dead, never auto-passed; auto-mitigated by a Wayback snapshot lookup that doubles as a durable archival citation; DOIs checked registrar-side without scraping. Only 404/410/NXDOMAIN are true non-existence. All reachable server-side - the SPIKE-01 block was the agent's browser fetch tool, not the endpoints.

## The seven design decisions from discuss-phase (the user's calls)

1. **Verification record shape:** inline in each `SourcedValue` (provenance-in-diff).
2. **Automation boundary:** gate + editor-authored pass records + cheap mechanical checks; a thin Wayback/curl helper aids sourcing but is never trusted as a pass.
3. **Distinct-lineage:** hybrid - human-declared lineage tag on source records is authoritative; a similarity heuristic raises a non-blocking warning.
4. **Adjudication:** audit command generates a worst-first queue doc (DEBT `DATA-AUDIT.md` style); verdict recorded inline; AI never writes a verdict.
5. **Staleness:** regulatory 12mo / current 24mo / historical static.
6. **OFF draft store:** drafts outside the published data dir, lead status requiring human promotion; not a full automated differ.
7. **claimType self-classification:** stays human judgement surfaced in the audit; no automated semantic classifier.

## Next step

**`/gsd:plan-phase 2`** in a fresh context window. It will now skip the context gate (`02-CONTEXT.md` exists) and proceed research -> plan -> verify.

- **Take the research pass when offered.** The planner benefits from concrete patterns for the inline `verification` schema shape, the four-verdict existence-checker module (HEAD -> GET-range -> Wayback -> DOI), and the OFF API ingestion shape. `02-CONTEXT.md` already names the external APIs (Wayback availability/CDX, Crossref, Handle).
- **The 14 requirements** (VRFY-01..12, DATA-05/06) split into three natural plan seams named in `02-CONTEXT.md`: (1) verification model + per-fact gate + cheap checks; (2) OFF ingestion + draft/lead store; (3) audit command + staleness + adjudication queue.

## Key files for Phase 2

- `.planning/phases/02-.../02-CONTEXT.md` - **the locked contract; read first.** 19 decisions.
- `.planning/phases/02-.../02-DISCUSSION-LOG.md` - alternatives considered (audit-only, not planner input).
- `docs/SPIKE-01-FINDINGS.md`, `docs/spike-findings.json` - the five gate requirements and the fetch blockers.
- `lib/validate.mjs`, `lib/referential.mjs` (`collectFacts`, `isSourcedValue`), `scripts/validate-data.mjs` (corpus-escape guard) - the harness Phase 2 extends.
- `schemas/sourced-value.schema.json` - reserves nullable `verificationStatus`/`publicationStatus`; the envelope the inline `verification` record attaches to.
- `schemas/source.schema.json`, `src/_data/sources.json` - where the lineage tag and `sourceType` (primary) live.
- `src/_data/products/spike-0{1,2,3}.json`, `src/_data/timeline/*` - the real records the gate operates on (currently carry `verificationStatus`/`publicationStatus` at *product* level; D-02 moves the gate to per-fact).
- `/Users/anthonygeorge/Projects/DEBT/docs/DATA-AUDIT.md` - the dual-reviewer audit the gate strengthens (read-only blueprint).

## Phase 1 facts that still matter (do not re-derive)

- **Locked decisions:** dataset licence ODbL 1.0 (share-alike), code MIT; Node 24; 14 FSA allergens (`soya`, not `soybeans`).
- **The basic-auth edge function is a TEMPORARY pre-launch gate** - remove it (and the `edge_functions` line in `netlify.toml`) at public launch, or grow its `excludedPath`. Credentials are Netlify env vars `BASIC_AUTH_USER`/`BASIC_AUTH_PASS` (must be scoped to include Functions in every deploy context).
- **One unverified path:** the basic-auth authed-200 response (CSP + `Cache-Control: private, no-store`) could not be tested without the credentials; the 401 path is verified live.
- **Deferred to public launch:** ODbL/OFF attribution footer line (a `{# #}` marker is in `base.njk`; add when the first OFF-derived fact renders); `sitemap.xml` + `robots.txt`; JSON-LD / `dateModified`; Open Graph tags; update `site.url` to the custom domain.

## CRITICAL tooling note

The `gsd-sdk` binary on PATH is the WRONG binary. The real GSD helper is:
```
node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>
```
(`gsd-sdk query X.Y` -> `gsd-tools.cjs X Y`; `state`/`config`/`commit` subcommands take their args space-separated.) Also in session memory as `gsd-sdk-binary-collision`. Config: Quality model profile (Opus plan / Sonnet check), Interactive mode, research + plan-check + Nyquist on, commit_docs on.

## Standing rules

British English, conventional commits, WCAG 2.2 AA, minimal deps, **no push without asking**, no emoji, no em-dashes. The blueprint repo `/Users/anthonygeorge/Projects/DEBT` is the live pattern source - read-only, do not modify.
</content>
