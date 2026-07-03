import { SYNONYMS } from './synonyms.js';
import { editDistance } from './text.js';

// FTS5 treats these as operators, so a user typing one of them as a word would
// break the MATCH expression. We quote them to force a literal-term match.
const FTS_KEYWORDS = new Set(['and', 'or', 'not', 'near']);

// Build an FTS5 MATCH expression from user tokens.
//
//  - The user's own token gets a trailing '*' so search works as they type
//    ("oa" already matches "oak").
//  - Each token is OR-expanded with its synonyms so shopper language reaches the
//    catalog vocabulary. Single-word synonyms match exactly; multi-word synonyms
//    match as a phrase.
//  - Groups are combined with an explicit AND, so every concept in the query must
//    be present. "oak lamp" must match a row that is both oak and a lamp. The AND
//    must be explicit: FTS5 does not accept an implicit AND between parenthesized
//    groups, which silently made every multi-word search return nothing.
//
// Example: ["wooden", "lamp"] becomes
//   (wooden* OR oak OR walnut OR bamboo OR rattan) AND (lamp* OR "table lamp" OR ...)
export function buildMatchExpression(tokens: string[]): string {
  const groups: string[] = [];

  for (const token of tokens) {
    const parts = new Set<string>();
    parts.add(FTS_KEYWORDS.has(token) ? `"${token}"` : `${token}*`);

    for (const synonym of SYNONYMS[token] ?? []) {
      if (synonym.includes(' ') || synonym.includes('-')) {
        parts.add(`"${synonym}"`);
      } else {
        parts.add(synonym);
      }
    }

    groups.push(`(${[...parts].join(' OR ')})`);
  }

  return groups.join(' AND ');
}

export interface Correction {
  tokens: string[];
  changed: boolean;
}

// Suggest a spelling fix for tokens that are not in the index and are not a
// prefix of anything in it. Used only as a fallback when a query returns nothing,
// which keeps it off the hot path.
export function correctTokens(
  tokens: string[],
  lexicon: { term: string; freq: number }[],
  lexiconSet: Set<string>,
): Correction {
  let changed = false;
  const corrected = tokens.map((token) => {
    if (token.length < 3) return token;
    if (lexiconSet.has(token)) return token;
    // If it is already a live prefix (as-you-type), leave it alone.
    if (lexicon.some((entry) => entry.term.startsWith(token))) return token;

    const maxDist = token.length <= 4 ? 1 : 2;
    let best: { term: string; dist: number; freq: number } | null = null;
    for (const entry of lexicon) {
      if (Math.abs(entry.term.length - token.length) > maxDist) continue;
      const dist = editDistance(token, entry.term, maxDist);
      if (dist > maxDist) continue;
      if (
        !best ||
        dist < best.dist ||
        (dist === best.dist && entry.freq > best.freq)
      ) {
        best = { term: entry.term, dist, freq: entry.freq };
      }
    }

    if (best) {
      changed = true;
      return best.term;
    }
    return token;
  });

  return { tokens: corrected, changed };
}
