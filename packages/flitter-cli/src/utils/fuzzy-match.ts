// Fuzzy matching engine for command palette search/filter
//
// Ported from flitter-amp/src/utils/fuzzy-match.ts (no changes needed).
// Scores how well a query matches a target string using character-by-character
// matching with bonuses for word boundaries, consecutive matches, and string start.
// Same general approach as VS Code, fzf, and the original Amp binary.

/**
 * Result of a detailed fuzzy match, including matched character indices
 * for highlight rendering.
 */
export interface FuzzyResult {
  score: number;
  matchedIndices: number[];
}

/**
 * Fuzzy match a query against a target string.
 * Returns a score (higher = better) or null if no match.
 * Matches query characters in order within the target, awarding
 * bonuses for word-boundary and consecutive matches.
 */
export function fuzzyMatch(query: string, target: string): number | null {
  if (query.length === 0) return 1; // empty query matches everything
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  let score = 0;
  let targetIdx = 0;
  let prevMatchIdx = -2; // track consecutive matches

  for (let qi = 0; qi < q.length; qi++) {
    const qChar = q[qi]!;
    let found = false;

    while (targetIdx < t.length) {
      if (t[targetIdx] === qChar) {
        // Base score for each matched character
        score += 1;

        // Bonus: match at the very start of the string
        if (targetIdx === 0) {
          score += 5;
        }

        // Bonus: match at a word boundary
        // (character after space, hyphen, underscore, or case transition)
        if (targetIdx > 0) {
          const prev = target[targetIdx - 1]!;
          if (prev === ' ' || prev === '-' || prev === '_') {
            score += 3;
          } else if (
            prev === prev.toLowerCase() &&
            target[targetIdx] === target[targetIdx]!.toUpperCase() &&
            target[targetIdx] !== target[targetIdx]!.toLowerCase()
          ) {
            // camelCase boundary
            score += 3;
          }
        }

        // Bonus: consecutive match (previous match was the immediately prior char)
        if (targetIdx === prevMatchIdx + 1) {
          score += 2;
        }

        prevMatchIdx = targetIdx;
        targetIdx++;
        found = true;
        break;
      }
      targetIdx++;
    }

    if (!found) return null; // query character not found -- no match
  }

  // Bonus: prefer shorter targets (less noise)
  score += Math.max(0, 10 - target.length);

  return score;
}

/**
 * Detailed fuzzy match that also returns matched character indices.
 * Used for highlight rendering in the command palette.
 */
export function fuzzyMatchDetailed(
  query: string,
  target: string,
): FuzzyResult | null {
  if (query.length === 0) return { score: 1, matchedIndices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const matchedIndices: number[] = [];
  let score = 0;
  let targetIdx = 0;
  let prevMatchIdx = -2;

  for (let qi = 0; qi < q.length; qi++) {
    const qChar = q[qi]!;
    let found = false;
    while (targetIdx < t.length) {
      if (t[targetIdx] === qChar) {
        matchedIndices.push(targetIdx);
        score += 1;
        if (targetIdx === 0) score += 5;
        if (targetIdx > 0) {
          const prev = target[targetIdx - 1]!;
          if (' -_'.includes(prev)) score += 3;
          else if (
            prev === prev.toLowerCase() &&
            target[targetIdx] === target[targetIdx]!.toUpperCase() &&
            target[targetIdx] !== target[targetIdx]!.toLowerCase()
          ) {
            score += 3;
          }
        }
        if (targetIdx === prevMatchIdx + 1) score += 2;
        prevMatchIdx = targetIdx;
        targetIdx++;
        found = true;
        break;
      }
      targetIdx++;
    }
    if (!found) return null;
  }

  score += Math.max(0, 10 - target.length);
  return { score, matchedIndices };
}

/**
 * Score a SelectionItem against a query, considering both
 * label (primary) and description (secondary, half weight).
 */
export function scoreCommand(
  query: string,
  item: { label: string; description?: string },
): number | null {
  const labelScore = fuzzyMatch(query, item.label);
  const descScore = item.description
    ? fuzzyMatch(query, item.description)
    : null;

  if (labelScore === null && descScore === null) return null;

  // Label match takes priority; description match is secondary
  const ls = labelScore ?? 0;
  const ds = descScore !== null ? Math.floor(descScore * 0.5) : 0;
  return ls + ds;
}
