// The UX-06 British-English and neutral-editorial denylists, plus the scoped
// lint logic. Pure logic shared by scripts/check-editorial.mjs (run in prebuild)
// and test/editorial.test.js (research Pattern 4).
//
// The lint is SCOPED, because DATA-04/PROD-08 expressly permit a manufacturer's
// ATTRIBUTED stated reason and a LABELLED inference. A statedReason faithfully
// quoting "we reformulated to cut costs" is lawful to publish and must NOT fail
// the build, even though "to cut costs" is a banned motive phrase in analyst
// copy. So:
//   - Class A (em-dash, US spellings) applies to ALL scanned prose and fields.
//   - Class B (superlatives, denigratory phrases, motive phrases) applies ONLY
//     to analyst-authored text, never to attributed-quote fields.
// This file is itself analyst prose and must pass the lint it defines.

// Class A, applied EVERYWHERE (every scope, attributed quotes included).
export const EM_DASH = "—"; // the literal em-dash U+2014; en-dash U+2013 is allowed.
export const EM_DASH_ENCODED = /%e2%80%94/gi; // the URL-encoded form in a link.
// Word-boundary en-GB targets. "license" is DELIBERATELY absent: it is the
// legitimate en-GB verb (the noun is "licence"), so banning it would be a false
// positive on lawful British copy.
export const US_SPELLINGS = [
  "color", "flavor", "fiber", "center", "organize", "organization",
  "analyze", "behavior", "defense", "labeled", "modeling", "favorite",
  // "soy" is the US form; house style is "soya". The word boundary means it
  // matches bare "soy" but never "soya"/"soybean".
  "soy",
];

// The analyst-prose string fields inside data JSON (note, basis, etc.). These
// carry author-written commentary and so get the full Class A + B lint, the same
// as page prose. Verbatim-quote fields (a SourcedValue `value`, a statedReason)
// are DELIBERATELY excluded: a faithful attributed quotation must not be failed
// for a US spelling or a lawful Class B term it genuinely contains.
export const ANALYST_JSON_FIELDS = new Set([
  "note", "basis", "text", "rationale", "outcome", "effort", "explanation",
  // Analyst-authored framing that is rendered into pages but lives only in JSON.
  "covers", "tagline", "description",
]);

// Class B, applied to ANALYST-authored text ONLY (never attributed quotes).
// Superlatives are FRAMING, not vocabulary: bare "worst" and "exposed" are
// DELIBERATELY absent because they fire on "worst-case" and "exposed to air".
export const SUPERLATIVES = [
  "scandal", "shocking", "outrage", "disgraceful", "slammed",
];
export const DENIGRATORY_PHRASES = [
  /\bworst offenders?\b/i,
  /\bnaming and shaming\b/i,
  /\bripping off\b/i,
];
export const MOTIVE_PHRASES = [
  /to boost margins/i,
  /to cut costs/i,
  /to increase profits?/i,
  /to save money/i,
  /\bgreed\b/i,
  /\bcynical\b/i,
];

// The pinned field/path scope map, recorded here so every downstream author and
// every later phase scopes the same way. Analyst-authored fields get Class A + B;
// attributed-quote fields get Class A only. Page body prose (.njk/.md text) is
// analyst scope, with the quote-allow mechanism below carving out cited lines.
export const FIELD_SCOPE = {
  analyst: ["explanation", "note", "labelledInference.basis"],
  quote: ["statedReason", "sourceQuote", "source.name"],
};

// The ONE pinned, deterministic quote-allow rule, stated here so every author
// matches it exactly:
//   - The `<!-- editorial-allow: quote -->` directive, appearing anywhere on a
//     physical line, suppresses Class B matches ON THAT SAME physical line only
//     (not the next line, not a block).
//   - A Markdown blockquote line (a `>`-prefixed line, optional leading
//     whitespace) is suppressed for Class B for the whole of that line.
// Class A is NEVER suppressed: an em-dash or a US spelling is wrong even inside a
// quotation.
const QUOTE_ALLOW_DIRECTIVE = "<!-- editorial-allow: quote -->";
const BLOCKQUOTE_LINE = /^\s*>/;

// Em-dash is punctuation against house style and is never lawful, in any scope.
function emDashOffenders(line, lineNumber) {
  const offenders = [];
  const literalEmDashes = line.split(EM_DASH).length - 1;
  for (let i = 0; i < literalEmDashes; i += 1) {
    offenders.push({ rule: "em-dash", term: EM_DASH, line: lineNumber });
  }
  const encoded = line.match(EM_DASH_ENCODED) || [];
  for (const match of encoded) {
    offenders.push({ rule: "em-dash", term: match, line: lineNumber });
  }
  return offenders;
}

// US spellings are wrong in analyst copy, but a faithful verbatim quotation of a
// US-market label may lawfully contain one, so this is suppressible on quote
// lines (see lint).
function usSpellingOffenders(line, lineNumber) {
  const offenders = [];
  for (const word of US_SPELLINGS) {
    const matches = line.match(new RegExp(`\\b${word}\\b`, "gi")) || [];
    for (const match of matches) {
      offenders.push({ rule: "us-spelling", term: match, line: lineNumber });
    }
  }
  return offenders;
}

function classBOffenders(line, lineNumber) {
  const offenders = [];
  for (const word of SUPERLATIVES) {
    const matches = line.match(new RegExp(`\\b${word}\\b`, "gi")) || [];
    for (const match of matches) {
      offenders.push({ rule: "superlative", term: match, line: lineNumber });
    }
  }
  for (const pattern of DENIGRATORY_PHRASES) {
    const match = line.match(pattern);
    if (match) offenders.push({ rule: "denigratory", term: match[0], line: lineNumber });
  }
  for (const pattern of MOTIVE_PHRASES) {
    const match = line.match(pattern);
    if (match) offenders.push({ rule: "motive", term: match[0], line: lineNumber });
  }
  return offenders;
}

// Lint a block of text. scope "analyst" applies Class A + Class B (with the
// quote-allow carve-outs per line); scope "quote" applies Class A only, for an
// attributed-quote field whose Class B vocabulary is lawful. Returns a flat
// array of offenders { rule, term, line } so callers can assert on `.length`.
export function lint(text, { scope = "analyst" } = {}) {
  const offenders = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    // Em-dash: never suppressed, any scope.
    offenders.push(...emDashOffenders(line, lineNumber));
    // A US spelling is suppressed on an attributed-quote line (a Markdown
    // blockquote or the same-line quote-allow directive) or in an explicit
    // quote-scope field, so a faithful verbatim US-label quotation is not failed.
    const quoted =
      scope === "quote" ||
      line.includes(QUOTE_ALLOW_DIRECTIVE) ||
      BLOCKQUOTE_LINE.test(line);
    if (!quoted) offenders.push(...usSpellingOffenders(line, lineNumber));
    // Class B (framing) applies to analyst prose only, never on quote lines.
    if (
      scope === "analyst" &&
      !(line.includes(QUOTE_ALLOW_DIRECTIVE) || BLOCKQUOTE_LINE.test(line))
    ) {
      offenders.push(...classBOffenders(line, lineNumber));
    }
  });
  return offenders;
}

// Sentence-case is a BEST-EFFORT, NON-FAILING warning in Phase 1 (research Open
// Question 2). A Markdown heading with multiple capitalised words is flagged so
// an author can reconsider, but it never fails the build, because legitimate
// proper-noun headings such as "Food Standards Agency" and "Soft Drinks Industry
// Levy" are EXPECTED to trigger it. Returns warning strings, never offenders.
export function sentenceCaseWarnings(text) {
  const warnings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (!heading) return;
    const words = heading[1].trim().split(/\s+/).filter(Boolean);
    const capitalised = words.filter((word) => /^[A-Z][a-z]/.test(word));
    if (words.length > 1 && capitalised.length > 1) {
      warnings.push(
        `line ${index + 1}: heading "${heading[1].trim()}" may not be sentence case (proper nouns are expected and acceptable)`
      );
    }
  });
  return warnings;
}
