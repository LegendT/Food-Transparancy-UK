You're picking up Food Transparency UK (`/Users/anthonygeorge/Projects/Food Transparancy`). Read `.planning/HANDOFF.md` first - it has the full state. Summary:

- Phases 1 and 2 are complete. **Phase 3a (Core Entity Pages & Trust Rendering) is mid-execution: Waves 1-2 done and verified (plans 03a-01/02/03/05), Wave 3 (03a-04) and Wave 4 (03a-06) remain.**
- Git: branch `main`, tree clean, Waves 1-2 pushed to `origin/main` (run `git rev-parse --short HEAD` / `git status` for the live tip and ahead/behind). `node --test` 196/196, `npm run build` green, pa11y WCAG2AA clean on every built page (product x2, ingredient x1). `README.md` describes the current state (Phases 1-2 complete, Phase 3a in progress).
- Execution is **sequential-on-main** (`workflow.use_worktrees=false` for this run). Each plan is critiqued against REAL code/HTML before advancing - NOT the executor self-report. Keep doing that.

**Your task: resume Phase 3a execution.**

1. **Wave 3 - spawn a `gsd-executor` (opus) for `03a-04`** (the nutrition table + allergen fail-safe - the highest-stakes render). Use the sequential-on-main prompt pattern from the last session (see HANDOFF "How to run each executor" + the transcript). Give it the plan-specific reminders: R-31/`factCell` (no raw `.value`), the D-12 allergen fail-safe (a withheld `absent` must NEVER read "does not contain X"; a withheld present/may-contain must NEVER be hidden; red is bar/border only, never text), the nutrition table G1 320px reflow + G2 `tabindex="-1"` focus, D-05 section order.

2. **When 03a-04 returns, critique it HARD against real HTML** (the pattern in HANDOFF "per-plan verification"): real `node --test` + `npm run build`; grep the built product pages to prove the string "does not contain" appears on NO page and spike-02's withheld allergens render the safe "cannot confirm... check the pack" wording; confirm the nutrition table's three cell states (Not recorded / Not yet verified / value) and the `tabindex="-1"` provenance anchors; run pa11y WCAG2AA on a rebuilt product page and confirm 320px reflow. Only refine if a REAL defect is found (clean plans this session needed no changes - do not manufacture nits).

3. **Wave 4 - `03a-06` is a HUMAN CHECKPOINT** (`autonomous: false`). Do NOT spawn an autonomous executor to author verification passes - **AI never authors passes or adjudications (D-04/D-11)**. Drive Task 1 interactively with the user: they author the proof-set - a `published-confirmed` fact, a `published-stale` example (two-clocks recipe: passes dated past the staleness threshold e.g. `2023-06-01` for a current fact WITH a fresh in-TTL RESOLVES seeded in the verdict cache - see HANDOFF), and >=1 ingredient `authorityPosition` where a genuine FSA/EFSA/SACN position exists. Then the autonomous follow-on (Tasks 2-3) transcribes the approved values, seeds `.cache/citation-verdicts.json`, wires the D-15 product->ingredient cross-link, replaces the sucralose `regulatoryStatus` placeholder citation with the real additives-law source, and adds the representative pa11y routes.

4. After Wave 4, run the remaining GSD gates as config dictates (verify-phase, then secure-phase / validate-phase / verify-work for Phase 3a).

Honour the standing rules: British English, no em-dashes, no emoji, WCAG 2.2 AA, ZERO new dependencies, conventional commits, **no push without asking**. `gsd-sdk` on PATH is the WRONG binary - use `node ~/.claude/get-shit-done/bin/gsd-tools.cjs <command>` in SUBCOMMAND form (`state advance-plan`, `roadmap update-plan-progress`, `commit "msg" --files ...`). `/Users/anthonygeorge/Projects/DEBT` is read-only.

Note: 17 commits are unpushed - ask whether to push before or after resuming.
