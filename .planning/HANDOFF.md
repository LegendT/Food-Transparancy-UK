# Handoff - Food Transparency UK

**Date:** 2026-07-01
**Status:** **Phase 2 complete, verified, and hardened by five review passes. Ready for `/gsd:secure-phase 2` and/or `/gsd:discuss-phase 3a`.**

## What this project is

An evidence-based, citation-first static archive of how UK packaged-food recipes have changed over time. The thesis: many everyday "foods" have quietly become a manipulation of the original (e.g. "ice cream" that is no longer cream but vegetable oil and stabilisers). Built first for the non-expert who has heard of "UPF" but hasn't connected it to specific products. **Core value:** every published fact is traceable to a primary source, independently verified to a standard matched to its claim type, and honest about its uncertainty. Full context: `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md` (9 phases; Phases 1 and 2 complete).

## Current state (verified)

- **Git:** branch `main`, tip `aa5e75e`, working tree clean (only untracked `.history/`, `.vscode/`, and a local `.docx`). **63 commits ahead of origin/main - NOT pushed. Ask before pushing (global rule).** Repo: github.com/LegendT/Food-Transparancy-UK.
- **Gates:** `node --test` -> **162/162 pass**; `npm run prebuild` -> exit 0 (validate + editorial lint + image gate). WCAG a11y is unchanged from Phase 1 (Phase 2 added no routes/templates - it is a data/logic phase).
- **Live:** https://food-transparancy-uk.netlify.app - deployed from Phase 1, gated behind HTTP basic auth (returns 401; intentional, pre-launch). Phase 2 did not change deployment.

## What Phase 2 delivered

**"Claim-Typed Verification, Per-Fact Publication Gate & Ingestion"** (VRFY-01..12, DATA-05/06). 7 plans across 4 waves, all executed; verifier passed **14/14 must-haves** against the actual codebase. The gate is the trust layer as a build invariant.

Modules built (all zero-new-dependency, Node 24 native fetch + node:test + existing Ajv):
- `lib/verification.mjs` - the pure derivation heart. `deriveVerificationState()` (D-15 seven-state precedence: `wrong > contested > non-resolving-citation > disagreement > insufficient [split into withheld-in-review / withheld-unverified] > stale > confirmed`), `meetsCorroborable` (D-05: >=2 confirms passes / >=2 distinct lineage / >=1 primary), `meetsAuthoritative` (D-06: 1 authority + distinct-`reviewerKind` re-read, kind-based/honour-based), `checkDistinctLineage` (transitive `derivedFrom` root + cycle canonicalisation), `checkMeasureMismatch`, `checkValueDivergence`, `checkConfirmsContradictValue`, `classifyStaleness` (entityType-aware, D-16), `CITATION_TTL_DAYS = 180`. No fs/network/process.exit, so it also runs at render time in Phase 3a.
- `lib/citation-status.mjs` + `scripts/check-citations.mjs` - the four-verdict citation-existence checker (RESOLVES / DOES_NOT_RESOLVE [404/410/NXDOMAIN only] / ACCESS_BLOCKED [403/429, live-but-refused, auto-mitigated by a Wayback CDX snapshot] / INDETERMINATE). Manual-redirect SSRF guard re-validated on every hop; canonicalised IP/host block-list (incl. name-based loopback); DOI slash kept intact for Crossref + Handle; byte cap on the decompressed stream. Standalone - NEVER in prebuild.
- `scripts/validate-data.mjs` - the offline per-fact gate (extends the Phase 1 harness). Lineage/measure/value-divergence WITHHOLD (they do not fail the build, R-02); the build fails ONLY on internal-consistency violations (contested-without-adjudication; contested non-null value; contested-without-two-positions; corrected-without-correctedValue; sourcesChecked-not-a-subset; malformed markedWrong; dangling `derivedFrom`). Reads the committed `.cache/citation-verdicts.json` offline (absent/expired = UNCHECKED = withheld). Prints a derived-state status breakdown.
- `scripts/ingest-off.mjs` + `ingestion/` - OFF v2 barcode ingestion into an isolated `lead` store OUTSIDE `src/_data` (D-19: a lead is not a SourcedValue, has no `sources` key, carries field-level provenance + ODbL licence + the `off` registry link). Manual-redirect host-constrained, byte-capped. Standalone.
- `scripts/audit-verification.mjs` - a read-only worst-first audit (DEBT `DATA-AUDIT.md` style) writing a dated `docs/DATA-AUDIT-{date}.md` (gitignored, generated on demand). Sections: counts-by-status (in-review vs unverified split), worst-first discrepancies, citations-no-longer-resolving, citations-due-for-recheck (vs the 180-day TTL), future-date warnings, OFF/ODbL attribution, authoritative-classification spot-check. Never writes a fact or verdict (D-17: AI never adjudicates).
- Schemas: `sourced-value.schema.json` (inline `verification` record: passes-as-events, `measure` with `unit`, `adjudication` with `correctedValue`), `lead.schema.json`, and `verificationStatus`/`publicationStatus` constrained to `{enum:[null]}` at the SourcedValue level AND all five entity schemas (D-03/R-06 - status is derived-only, never author-set).

Worked data (the gate exercised on the real corpus): **1 `published-confirmed`, 1 `published-contested`, 18 `withheld-unverified`** (the correct, honest outcome for facts SPIKE-01 could not verify).

## The human-editorial checkpoint (02-07) - and a real correction it produced

Plan 02-07 Task 2 is a **`checkpoint:human-action` blocking gate** (mirroring the Phase 1 `01-10` precedent): a human authored the verification pass verdicts and the contested adjudication; an AI must never write those (D-04/D-11/VRFY-02). During that checkpoint the editor's source-checking turned up a **Companies House record** showing the registered legal entity is still *Lucozade Ribena Suntory Limited* (company 08603549); "Suntory Beverage & Food GB&I" is only a trading name adopted in 2020. That reclassified the `spike-01` manufacturer fact from a weak single-source `authoritative` claim into a genuine **corroborable `published-confirmed`** (Companies House primary + Suntory, distinct lineage). A new primary source `companies-house-lrs-08603549` (Open Government Licence v3.0) was added to the registry. The Lucozade timeline figure published `contested` (value withheld, two positions: ~13 g sugar/100ml Energy Orange per The Grocer vs ~17 g carbohydrate/100ml Original per diabetes.co.uk).

## Review hardening (five independent passes, all findings fixed)

Phase 2 was reviewed far past the normal gate because the trust/security core is correctness-critical:
1. **plan-checker** (during planning) - 1 blocker + warnings fixed pre-execution.
2. **Opus code review** (`02-REVIEW.md`) - found CR-01 (lineage tail-into-cycle faking corroboration) + soft-404-on-HEAD + OFF redirect SSRF; fixed.
3. **Sonnet code review** (`02-REVIEW-2.md`) - independently confirmed the Opus fixes, then found the web.archive.org archive-of-archive bug (a deliberately-archived Wayback citation could never resolve) + contested-positions referential/existence gap; fixed.
4. **Three-model deep adversarial pass** (execution-based: trust-model, network/security, mutation-testing) - proved findings by running crafted inputs against the real modules. Found and fixed **2 CRITICAL** (`corrected`-without-`correctedValue` publishing `value: undefined`; `localhost`/`ip6-localhost` SSRF bypass), 1 HIGH (confirms passes whose `checkedValue` contradicts the published value), 3 MEDIUM (future-dated-cache fail-open; soft-404 on a 206; audit rot-scan missing position sources), 1 test-gap (two-confirming-pass count unpinned), 3 LOW.

All fixes carry regression tests (162 total). Both Criticals were re-verified end-to-end through the live gate. The finding taxonomy (R-NN / CR-NN / etc.) is recorded in `02-REVIEW.md`, `02-REVIEW-2.md`, the commit messages, and the `02-CONTEXT.md` amendments.

## Next step

Two independent, both legitimate:

- **`/gsd:secure-phase 2`** (recommended first) - `security_enforcement` is on and Phase 2 introduced the project's first server-side network I/O (the citation checker + OFF ingester). No `02-SECURITY.md` exists yet. The SSRF guard was hardened twice; the formal gate would document the threat model over the current code.
- **`/gsd:discuss-phase 3a`** - the next content phase ("Core Entity Pages & Trust Rendering"). No `CONTEXT.md` exists for 3a yet, so discuss-phase is the recommended start. This is where the withheld-placeholder / contested-both-sides / review-due states Phase 2 derives finally reach readers.

## Key context for Phase 3a (the rendering phase)

- **The derived state is the render signal, NOT the raw `value`.** By design every withheld record still carries its raw `value` in JSON (so promotion/adjudication can work), so Phase 3a is the single point where the whole model can be silently defeated. **Phase 3a MUST assert (test) that a withheld / contested fact's raw value never renders** - render off `deriveVerificationState()`, never `fact.value`. This was flagged by the reviewers (R-31) and is not yet enforced.
- **ROADMAP Phase 3a now owns the reader-facing half of VRFY-11 and VRFY-12** (added as Phase 3a Success Criterion 5 during Phase 2): render `published-contested` as a both-sides treatment, and `published-stale` as a "last verified {date} - review due" indicator. Phase 2 delivered only the status + date; do not treat these as done.
- `lib/verification.mjs` is pure and importable at build/render time - reuse it in templates rather than re-deriving.
- Eleventy renders every `.json` under `src/_data`; the corpus-escape guard in `validate-data.mjs` fails any SourcedValue-shaped stray outside the entity dirs. Do not put leads under `src/_data`.

## Phase 2 facts that still matter (do not re-derive)

- **Locked decisions** live in `02-CONTEXT.md` (19 decisions D-01..D-19 + post-critique amendments). Do not re-litigate. D-15 is now a SEVEN-state table (adds `withheld-in-review`).
- **Verdict-cache entry shape** (SEAM-pinned): `{ verdict, resolvedVia, checkedAt (ISO-8601), statusCode, snapshotUrl }`, keyed by source id, committed at `.cache/citation-verdicts.json`. `CITATION_TTL_DAYS = 180` is exported once from `lib/verification.mjs`; the gate enforces it, the audit surfaces it, never redefine it.
- **The network scripts are OFF the build path** and run manually: `npm run check:citations` (writes the cache), `npm run ingest:off`, `npm run audit`. The offline gate reads the committed cache; CI/prebuild never touches the network.
- **`.cache/citation-verdicts.json` is committed** (provenance-in-diff, offline CI). `docs/DATA-AUDIT-*.md` is gitignored (generated on demand).
- **OGL v3.0** was added to the source registry's licence vocabulary (for the Companies House record). Entity-level `publicationStatus`/`verificationStatus` are now `{enum:[null]}`.

## Known cosmetic / tracking notes (non-blocking)

- **STATE.md status line is stale** (`status: verifying` / "ready for verification") - `phase complete` could not update two STATE.md fields due to a format mismatch (it warned). **ROADMAP.md is authoritative: Phase 2 is marked `[x]` complete (2026-07-01).**
- **REQUIREMENTS.md traceability warning:** 5 REQ-IDs present in the body but missing from the Traceability table (`PROC-01/02/03`, `PRICE-01`, `NOTF-01`) - orthogonal to Phase 2, worth adding when convenient.

## Phase 1 facts that still matter

- **Basic-auth edge function is a TEMPORARY pre-launch gate** - remove it (and the `edge_functions` line in `netlify.toml`) at public launch. Credentials are Netlify env vars `BASIC_AUTH_USER`/`BASIC_AUTH_PASS`.
- **Deferred to public launch (Phase 3b territory):** ODbL/OFF attribution footer (a `{# #}` marker is in `base.njk`; add when the first OFF-derived fact renders - note the Companies House fact is OGL, but OFF leads carry ODbL share-alike), `sitemap.xml` + `robots.txt`, JSON-LD / `dateModified`, Open Graph tags, custom domain (`site.url`).
- **Locked:** dataset licence ODbL 1.0 (share-alike), code MIT; Node 24; 14 FSA allergens (`soya`, not `soybeans`).

## CRITICAL tooling note

The `gsd-sdk` binary on PATH is the WRONG binary (it is the milestone runner). The real GSD helper is:
```
node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>
```
Dotted verbs become space-separated (`gsd-sdk query roadmap.update-plan-progress` -> `gsd-tools.cjs roadmap update-plan-progress`); `state`/`config`/`commit` subcommands take named flags (`--phase`, `--files`), not positional args. Also in session memory as `gsd-sdk-binary-collision`. Config: Quality model profile (Opus plan / Sonnet check), Interactive mode, research + plan-check + Nyquist + code-review + security on, commit_docs on.

## Standing rules

British English, conventional commits, WCAG 2.2 AA, minimal deps (Phase 2 added ZERO), **no push without asking**, no emoji, no em-dashes. The blueprint repo `/Users/anthonygeorge/Projects/DEBT` is the live pattern source - read-only, do not modify.
