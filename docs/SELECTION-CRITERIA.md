# Corpus and Tier A selection criteria (PROD-14)

This document records the named criteria by which products enter the Food Transparency UK corpus and by which a product is treated as a Tier A flagship. It is recorded before any content exists so the corpus is held to a stated contract rather than to ad hoc judgement. Every target in `docs/sourcing-backlog.json` carries a one-line rationale traceable to these criteria.

Selection is editorial judgement against named criteria. It is never the output of a computed score.

## The named criteria

A candidate is judged against three recorded criteria:

1. **UK market ubiquity.** The product is widely sold and widely recognised in Great Britain, so a shopper is likely to find it in their own cupboard. Niche or regional-only lines are lower priority.
2. **Coverage across the flagship anchor categories.** The corpus is built outward from four anchor categories: ice cream, soft drinks, chocolate and bread. Each anchor category is chosen because it has a documented reformulation driver behind it. The backlog spreads candidates across all four so no single category dominates the launch corpus.
3. **Sourceability of a historical formulation (the Tier A test).** A product is a Tier A candidate only where a genuine historical formulation looks likely to be sourceable and then verifiable under the two-pass gate. Where only the category-level reformulation is documentable, or where only the current formulation can be recorded, the product is a Tier B or Tier C candidate instead.

## Documented drivers

A target is anchored to a documented driver, recorded as either a `mandate` (a compositional rule that compels a change) or an `incentive` (a levy or a voluntary programme that nudges one). The drivers used in the backlog are:

- The 2015 ice cream compositional rule (mandate), anchoring the ice cream category.
- The 2018 Soft Drinks Industry Levy (incentive), anchoring the soft drinks category.
- The FSA sugar reduction programme from 2015 onwards (incentive), anchoring the chocolate category.
- The FSA salt reduction programme from 2006 onwards (incentive), anchoring the bread category.

The mandate-versus-incentive distinction is recorded now and enforced later: in Phase 4, a mandate may be stated as a cause of a change, while an incentive may appear only as context or as an attributed statement, never asserted as the motive for a change.

## How the tiers are decided

The tier hint in the backlog records the expected sourceability, not a quality ranking:

- **A-candidate.** A sourceable, verifiable historical formulation looks likely. These feed the then-vs-now flagship layer once they pass the verification gate.
- **B-candidate.** A per-product historical recipe is uncertain, but the category-level reformulation is documentable with its driver.
- **C-candidate.** Only the current formulation is expected to be recordable; the product is included for category breadth and is never given an invented former recipe.

The backlog is a **candidate pool**, not a confirmed Tier A list. The SPIKE-01 spike winnows it by taking three Tier A candidates fully end to end and measuring the real per-product effort and the dead-end rate. The pool deliberately spans tiers A, B and C and is not all-Tier-A-candidate, because the project's own feasibility ceiling is roughly 15 to 20 Tier A products across the whole project. Recording the pool as tiered candidates keeps it honest about that ceiling rather than implying every candidate will become a sourced flagship.

## The no-metric rule

Selection is editorial and is made against the named criteria above. The archive does not compute a numeric change score, and it does not order products by how far a recipe has moved from its original.

<!-- editorial-allow: quote -->
> There is no league table of products ranked as the "most transformed" or as "worst offenders", and no such ranking will be produced. Presentation contrasts a traditional formulation with a current one objectively, and avoids persuasion or outrage framing.

This rule exists so the corpus cannot drift into an anti-brand ranking dressed up as data. The backlog stores a driver, a tier hint and a rationale per target; it stores no score. The machine-verifiable test in `test/backlog.test.js` asserts the count, the per-target driver, the tier hint and the rationale, and asserts that the pool is not all-Tier-A-candidate.
