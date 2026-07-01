// The cross-file gates JSON Schema cannot express: source-id resolution
// (DATA-01), the TRUST-06 GB-jurisdiction rule for regulatory facts, the
// imperative ranged-date order check (DATA-03), and OFF-derived tagging
// (DATA-02 / ODbL share-alike). Every function is pure and returns { errors },
// except findOrphanSources which returns a non-failing { warnings }
// (research Pattern 4). All inputs are assumed structurally valid: the Ajv
// gate runs first, so no bound here is ever undefined or malformed.

// A SourcedValue is any object carrying both a sources array and a claimType:
// that signature identifies the provenance envelope wherever it is nested.
function isSourcedValue(node) {
  return (
    node !== null &&
    typeof node === "object" &&
    Array.isArray(node.sources) &&
    typeof node.claimType === "string"
  );
}

// A ranged date is the date-value object form carrying both from and to. The
// precise-string and circa forms have no order to check and are skipped.
function isDateRange(node) {
  return (
    node !== null &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    "from" in node &&
    "to" in node
  );
}

function walk(node, path, visit) {
  if (node === null || typeof node !== "object") return;
  visit(node, path || "/");
  if (Array.isArray(node)) {
    node.forEach((child, index) => walk(child, `${path}/${index}`, visit));
  } else {
    for (const [key, child] of Object.entries(node)) {
      walk(child, `${path}/${key}`, visit);
    }
  }
}

// Collect every SourcedValue fact in an entity, each with its instance path.
export function collectFacts(data, path = "") {
  const facts = [];
  walk(data, path, (node, nodePath) => {
    if (isSourcedValue(node)) facts.push({ path: nodePath, fact: node });
  });
  return facts;
}

// Collect every ranged date in an entity, each with its instance path.
export function collectDateRanges(data, path = "") {
  const ranges = [];
  walk(data, path, (node, nodePath) => {
    if (isDateRange(node)) ranges.push({ path: nodePath, range: node });
  });
  return ranges;
}

// DATA-01: every cited source id must resolve to a registry record. This covers
// a fact's own sources[] AND every source cited only inside a contested position
// (verification.contested.positions[].sources) - a dangling or fabricated
// position source would otherwise pass the gate undetected (WARNING-01, D-14).
export function checkReferences(facts, sources) {
  const known = new Set(sources.map((source) => source.id));
  const errors = [];
  for (const { path, fact } of facts) {
    const positionSources = (fact.verification?.contested?.positions ?? []).flatMap(
      (position) => position.sources ?? []
    );
    for (const id of [...fact.sources, ...positionSources]) {
      if (!known.has(id)) {
        errors.push(`${path}: cites unknown source id "${id}"`);
      }
    }
  }
  return { errors };
}

// TRUST-06: a claimDomain "regulatory" fact must cite at least one GB-jurisdiction
// source and carry a checkedOn date. An EU or international source alone fails.
export function checkRegulatoryJurisdiction(facts, sources) {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const errors = [];
  for (const { path, fact } of facts) {
    if (fact.claimDomain !== "regulatory") continue;
    const citesGb = fact.sources.some((id) => byId.get(id)?.jurisdiction === "GB");
    if (!citesGb) {
      errors.push(`${path}: claimDomain "regulatory" fact must cite at least one GB-jurisdiction source (TRUST-06)`);
    }
    if (!fact.checkedOn) {
      errors.push(`${path}: claimDomain "regulatory" fact must carry a checkedOn date (TRUST-06)`);
    }
  }
  return { errors };
}

// Normalise a range bound to a full YYYY-MM-DD string. A bare 4-digit year
// expands to the start of the year on "from" and the end of the year on "to",
// so ["2017", "2018"] reads as the widest plausible interval. A full date is
// already in lexicographic-equals-chronological form and passes through.
function normaliseBound(bound, end) {
  if (/^[0-9]{4}$/.test(bound)) {
    return end === "to" ? `${bound}-12-31` : `${bound}-01-01`;
  }
  return bound;
}

// DATA-03 order: JSON Schema cannot express "to not earlier than from". Compare
// the two normalised ISO strings lexicographically (ISO dates sort
// chronologically); error when to sorts earlier than from. String comparison
// only, no Date objects, to remove the string-versus-Date hazard.
export function checkDateRanges(ranges) {
  const errors = [];
  for (const { path, range } of ranges) {
    const from = normaliseBound(range.from, "from");
    const to = normaliseBound(range.to, "to");
    if (to < from) {
      errors.push(`${path}: ranged date "to" (${range.to}) is earlier than "from" (${range.from})`);
    }
  }
  return { errors };
}

// DATA-02 / ODbL: any fact citing a share-alike source (Open Food Facts and any
// future ODbL source) is OFF-derived by construction. Returns the list of paths
// so the share-alike obligation is auditable without a per-field flag.
export function listOffDerived(facts, sources) {
  const shareAlikeIds = new Set(
    sources.filter((source) => source.licence?.shareAlike === true).map((source) => source.id)
  );
  return facts
    .filter(({ fact }) => fact.sources.some((id) => shareAlikeIds.has(id)))
    .map(({ path }) => path);
}

// Non-failing: registry records cited by no fact. A warning, never a build
// failure, because an as-yet-uncited source is legitimate during authoring.
export function findOrphanSources(facts, sources) {
  const cited = new Set();
  for (const { fact } of facts) {
    for (const id of fact.sources) cited.add(id);
  }
  const warnings = sources
    .filter((source) => !cited.has(source.id))
    .map((source) => `source "${source.id}" is in the registry but cited by no fact`);
  return { warnings };
}
