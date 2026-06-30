# SPIKE-01 findings: three Tier A products, end to end

This document records the SPIKE-01 sourcing spike (SPIKE-01). The spike took three
Tier A products from the confirmed sourcing backlog fully through the data model:
historic formulation where sourceable, a manual two-pass verification dry-run, the
assigned documented driver, and a schema-valid record that passes the build gate.
Its purpose is to produce the first hard evidence of how hard Tier A sourcing
really is, and to name what the Phase 2 automated verification gate must enforce.

## Honesty note on who did the sourcing

The sourcing and the two-pass verification were performed by an AI assistant doing
web research, and were then confirmed by a human editor. This is stated plainly
because it is part of the project's trust proposition: the verification model is
not two independent human reviewers, and the spike does not pretend otherwise. The
two-pass workflow here is a recorded editorial dry-run, not a gate-enforced
process. In Phase 1 only the structural claim-type shape runs as a build gate; the
full workflow (distinct-lineage sourcing, at least one primary source, citation
existence, disagreement routing) is automated in Phase 2.

## The products

The trio was chosen to span three flagship categories and three documented drivers.

1. **Lucozade Energy** (soft drinks; driver: the 2018 Soft Drinks Industry Levy, an
   incentive). The strongest case. The current label and the 2017 reformulation are
   well sourced. The exact pre-reformulation sugar figure is genuinely contested
   across distinct sources (about 13g per 100ml, about 17g carbohydrate per 100ml,
   and about 12.4g per 100ml), so it is carried as an approximation with the
   disagreement recorded, not asserted as a single number.

2. **Cadbury Dairy Milk** (chocolate; driver: the FSA sugar reduction programme from
   2015, an incentive). A partial case. The current label is recorded, as is the
   2019 "30% Less Sugar" variant, which was delisted by 2023. The standard bar's
   own sugar did not change. The 2019 trade reports are likely co-derived from a
   single manufacturer press release, so the historic claim sits at
   authoritative-attribution level rather than independently corroborated.

3. **Wall's Soft Scoop Vanilla** (ice cream; driver: the GB ice cream compositional
   rules, a mandate). The replacement for an abandoned candidate (see below). Its
   current facts are well sourced, including an archival primary nutrition figure
   from the manufacturer page. The then-versus-now reformulation arc is a dead-end:
   no source establishes an earlier cream-based formulation, and soft scoop appears
   to have been a vegetable-fat product by design.

## What the dry-run found, and what it could not source

The single most useful result is a tooling result. The two-pass corroborable
standard requires a historic fact to rest on two distinct-lineage sources with at
least one primary or archival. That standard was met for **zero** of the three
products, almost entirely because the archival route is blocked:

- web.archive.org (Wayback) is unreachable from the research fetch tool and only
  partially reachable via raw curl, so archival snapshots of historic labels are
  largely unobtainable.
- The major GB retailers (Tesco, Ocado, ASDA, Sainsbury's) refuse automated
  fetches, so current labels fall back to Open Food Facts and smaller retailers.
- Some manufacturer pages inject the ingredient list at runtime, so even an
  archived snapshot carries no literal ingredient text.

The conclusion is not that the reformulation stories do not exist. It is that the
current toolchain cannot reach the primary and archival evidence the standard
demands. The main gap is access, not availability.

## The thesis, tempered by evidence

Two products tempered the project's headline thesis rather than confirming it, and
that is recorded honestly.

- For Wall's Soft Scoop, no evidence was found that it was ever cream-based, so the
  "was once cream, now oil" narrative is withheld for this product.
- The original ice cream candidate, **Wall's Vienetta**, was abandoned as a
  dead-end after a full attempt: no historic ingredient list could be sourced, and
  the regulatory evidence cut against the assumed driver. The 2015 rule change
  made the term "ice cream" easier to claim for a vegetable-fat product, not
  harder, and GB Vienetta is still sold as ice cream. Abandoning it is counted in
  the attempt denominator.

A factual correction also came out of the spike and is reflected in the records: it
is not against GB law to call a vegetable-fat product "ice cream". The accurate,
sourced point is that coconut fat disqualifies a product from "dairy ice cream",
and the surviving ice cream specifications now sit in a voluntary industry code.

## On stated reasons and inference

Each timeline event keeps the manufacturer's attributed statement separate from any
analyst inference. The manufacturers framed their changes around consumer health
and taste. For Lucozade, for example:

> The world has changed with consumers now wanting healthier drinks and more
> action from the brands they regularly enjoy.

<!-- editorial-allow: quote --> The trade-press framing of the change as a way to avoid the levy is press characterisation, not the manufacturer's stated reason, and it is recorded only as a labelled inference with its basis, never as fact.

## Effort, attempts and dead-end rate

- Attempts (the denominator): 4 candidate products (the three encoded plus the
  abandoned Vienetta).
- Sourced to a publishable record: 3.
- Dead-end rate at the publishable-record bar: 0.25.
- Historic facts meeting the full corroborable standard: 0 of 3.
- Per-product effort: roughly 13 to 16 research fetches each, the limit being the
  blocked archival and retailer routes rather than the topic.

## Provisional re-derived figures (Phase 4 refines these)

These are n=3 estimates and explicit placeholders, not commitments.

- **Launch corpus target (PROD-12):** revised down from the roughly 100 placeholder
  to a provisional **35** launch records.
- **Tier A full then-versus-now:** a provisional **10** products (down from the 15
  or more placeholder).

Both figures are bounded by tooling. They rise if and only if Phase 2 builds an
archival and primary fetch path. The limiter is access to primary evidence, not a
shortage of reformulation stories.

## Requirements the Phase 2 automated gate must enforce

1. A working archival and primary fetch path (Wayback CDX via curl, manufacturer
   pack-image capture), without which no historic fact can reach the corroborable
   standard.
2. Distinct-lineage detection, so two reports co-derived from one press release do
   not count as two independent sources.
3. A citation-existence check that every cited URL resolves.
4. A measure-mismatch detector that auto-raises a disagreement when two passes
   report different units or values.
5. Routing of every unresolved disagreement to human adjudication, never AI
   adjudication.
