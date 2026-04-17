/**
 * Fuzzy matching algorithm for the CommandPalette / FuzzyPicker.
 *
 * 逆向:
 * - GE0 in modules/2491_unknown_VE0.js (match wrapper)
 * - FE0 in modules/2486_unknown_FE0.js (multi-word dispatch)
 * - hB  in modules/2485_unknown_hB.js  (recursive DP scorer)
 *
 * Regex constants from modules/1472_tail_anonymous.js:
 *   WE0 = /[\\/_ +.#"@[({&]/
 *   qE0 = /[\\/_ +.#"@[({&]/g
 *   zE0 = /[\s-]/
 *   DZT = /[\s-]/g
 *
 * @module
 */

/** Fuzzy match result. */
export interface FuzzyMatchResult {
  /** Whether the score exceeds the match threshold (0.15). */
  matches: boolean;
  /** Score between 0.0 and 1.0. Higher is a better match. */
  score: number;
}

/** Match threshold — below this, the item is filtered out. */
const THRESHOLD = 0.15;

// 逆向: regex constants from modules/1472_tail_anonymous.js
// WE0 = /[\\/_ +.#"@[({&]/  — "other word boundary" characters (non-whitespace separators)
const WE0 = /[\\/_ +.#"@[({&]/;
// qE0 = global version for counting matches in a slice
const qE0 = /[\\/_ +.#"@[({&]/g;
// zE0 = /[\s-]/  — whitespace/hyphen word boundary
const zE0 = /[\s-]/;
// DZT = global version for counting/replacing
const DZT = /[\s-]/g;

/**
 * Normalize text: lowercase + replace whitespace/hyphens with spaces.
 *
 * 逆向: K4 in modules/2486_unknown_FE0.js
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(DZT, " ");
}

/**
 * Score and filter a query against a label using recursive fuzzy matching.
 *
 * 逆向: GE0 in modules/2491_unknown_VE0.js
 */
export function fuzzyMatch(query: string, label: string): FuzzyMatchResult {
  if (query.length === 0) {
    return { matches: true, score: 1.0 };
  }
  const score = fuzzyScore(label, query);
  return { matches: score > THRESHOLD, score };
}

/**
 * Compute fuzzy score with multi-word support.
 *
 * 逆向: FE0 in modules/2486_unknown_FE0.js
 *
 * If the query has multiple whitespace-separated words:
 * - score each word independently
 * - if any word scores 0, return the full-query score (don't reward partial multi-word)
 * - otherwise average the per-word scores * 0.95 and take max(fullScore, wordAvg)
 */
function fuzzyScore(label: string, query: string): number {
  const normLabel = normalize(label);
  const normQuery = normalize(query);
  const memo: Record<string, number> = {};

  const fullScore = hB(label, query, normLabel, normQuery, 0, 0, memo);

  const words = query.trim().split(/\s+/);
  if (words.length > 1) {
    let total = 0;
    for (const word of words) {
      const wordScore = hB(label, word, normLabel, normalize(word), 0, 0, {});
      if (wordScore === 0) return fullScore; // any word miss → fall back to full score
      total += wordScore;
    }
    const wordAvg = (total / words.length) * 0.95;
    return Math.max(fullScore, wordAvg);
  }

  return fullScore;
}

/**
 * Recursive DP fuzzy scorer with memoization.
 *
 * 逆向: hB in modules/2485_unknown_hB.js
 *
 * Parameters:
 *   T      — original text (for case-sensitivity check and boundary test)
 *   R      — original query
 *   a      — normalized text (lowercase, separators→space)
 *   e      — normalized query
 *   t      — current text index
 *   r      — current query index
 *   h      — memoization object
 *
 * Returns a score in [0, 1].
 */
function hB(
  T: string,
  R: string,
  a: string,
  e: string,
  t: number,
  r: number,
  h: Record<string, number>,
): number {
  // Base cases
  if (r === R.length) {
    return t === T.length ? 1 : 0.99;
  }

  const key = `${t},${r}`;
  if (h[key] !== undefined) return h[key]!;

  const c = e.charAt(r); // current normalized query char
  // Find first occurrence of c in normalized text from position t
  let s = a.indexOf(c, t);
  let A = 0; // best score so far

  while (s >= 0) {
    let l = hB(T, R, a, e, s + 1, r + 1, h);

    if (l > A) {
      if (s === t) {
        // consecutive — no penalty
        l *= 1;
      } else if (zE0.test(T.charAt(s - 1))) {
        // preceded by whitespace/hyphen — word boundary bonus 0.9
        l *= 0.9;
        const p = T.slice(t, s - 1).match(DZT);
        if (p && t > 0) l *= 0.999 ** p.length;
      } else if (WE0.test(T.charAt(s - 1))) {
        // preceded by other separator — camelCase/path boundary bonus 0.8
        l *= 0.8;
        const n = T.slice(t, s - 1).match(qE0);
        if (n && t > 0) l *= 0.999 ** n.length;
      } else {
        // mid-word match — penalty 0.3
        l *= 0.3;
        if (t > 0) l *= 0.999 ** (s - t);
      }

      // Case mismatch penalty
      if (T.charAt(s) !== R.charAt(r)) l *= 0.9999;
    }

    // Lookahead optimization: if current score is very low, try skipping one query char
    // 逆向: hB lines 24-26 — handles near-miss cases
    if (
      l < 0.1 &&
      (a.charAt(s - 1) === e.charAt(r + 1) ||
        (e.charAt(r + 1) === e.charAt(r) && a.charAt(s - 1) !== e.charAt(r)))
    ) {
      const o = hB(T, R, a, e, s + 1, r + 2, h);
      if (o * 0.1 > l) l = o * 0.1;
    }

    if (l > A) A = l;
    s = a.indexOf(c, s + 1);
  }

  h[key] = A;
  return A;
}
