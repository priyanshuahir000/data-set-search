// Shared text helpers used by both the ingest step (to build the lexicon) and
// the search engine (to parse queries and correct typos).

// Lowercase, strip anything that is not a letter or digit, split on whitespace.
// This is deliberately close to how FTS5 unicode61 tokenizes, so the terms we
// store in the lexicon line up with the terms the index actually contains.
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

// Damerau-Levenshtein edit distance (handles transpositions, e.g. "waht" -> "what").
// Bounded early-exit keeps it cheap when comparing a query token to a lexicon of
// a few thousand terms.
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;

  const prevPrev = new Array<number>(bl + 1).fill(0);
  const prev = new Array<number>(bl + 1);
  const curr = new Array<number>(bl + 1);

  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0]!;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        prev[j]! + 1, // deletion
        curr[j - 1]! + 1, // insertion
        prev[j - 1]! + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2]! + 1); // transposition
      }
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= bl; j++) {
      prevPrev[j] = prev[j]!;
      prev[j] = curr[j]!;
    }
  }
  return prev[bl]!;
}
