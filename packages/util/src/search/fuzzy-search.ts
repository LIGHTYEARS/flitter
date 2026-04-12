/**
 * Fuzzy file search -- multi-tier scoring strategy
 *
 * 5 scoring tiers: exact > prefix > suffix > substring > fuzzy
 * Supports smart case, char bag pre-filtering, open/dirty file boosts
 *
 * @example
 * ```ts
 * import { FuzzyMatcher } from '@flitter/util';
 * const matcher = new FuzzyMatcher('comp', { openFiles: new Set(['/src/Component.tsx']) });
 * const results = matcher.match(scanEntries);
 * results.forEach(r => console.log(r.entry.name, r.score, r.matchPositions));
 * ```
 */
import type { ScanEntry } from "../scanner/file-scanner";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface FuzzyMatchConfig {
  maxResults?: number; // default 100
  caseSensitive?: boolean; // default false
  smartCase?: boolean; // default true
  openFiles?: Set<string>; // boost +500
  dirtyFiles?: Set<string>; // boost +300
}

export interface FuzzyMatchResult {
  entry: ScanEntry;
  score: number;
  matchPositions: number[];
}

// ---------------------------------------------------------------------------
// Scoring constants
// ---------------------------------------------------------------------------

const SCORE_EXACT = 10000;
const SCORE_PREFIX = 7500;
const SCORE_SUFFIX = 5000;
const SCORE_SUBSTRING = 2500;
const SCORE_FUZZY_BASE = 1000;
const BONUS_OPEN = 500;
const BONUS_DIRTY = 300;
const PENALTY_TEST = -200;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildCharBag(str: string): Map<string, number> {
  const bag = new Map<string, number>();
  for (const c of str) {
    bag.set(c, (bag.get(c) ?? 0) + 1);
  }
  return bag;
}

function charBagContains(
  haystack: Map<string, number>,
  needle: Map<string, number>,
): boolean {
  for (const [char, count] of needle) {
    if ((haystack.get(char) ?? 0) < count) return false;
  }
  return true;
}

function isTestOrStoryFile(name: string): boolean {
  return /\.(test|spec|story|stories)\./i.test(name);
}

function computeFuzzyMatchPositions(
  text: string,
  query: string,
  caseSensitive: boolean,
): number[] | null {
  const positions: number[] = [];
  const t = caseSensitive ? text : text.toLowerCase();
  const q = caseSensitive ? query : query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      positions.push(i);
      qi++;
    }
  }
  return qi === q.length ? positions : null;
}

function computeExactPositions(
  _text: string,
  query: string,
  startIndex: number,
): number[] {
  return Array.from({ length: query.length }, (_, i) => startIndex + i);
}

// ---------------------------------------------------------------------------
// Scoring function
// ---------------------------------------------------------------------------

function scoreEntry(
  entry: ScanEntry,
  query: string,
  caseSensitive: boolean,
): { score: number; matchPositions: number[] } | null {
  const name = entry.name;
  const filePath = entry.path;

  const compareName = caseSensitive ? name : name.toLowerCase();
  const comparePath = caseSensitive ? filePath : filePath.toLowerCase();
  const compareQuery = caseSensitive ? query : query.toLowerCase();

  // 1. Exact match (full basename)
  if (compareName === compareQuery) {
    return {
      score: SCORE_EXACT,
      matchPositions: computeExactPositions(name, query, 0),
    };
  }

  // 2. Prefix match
  if (compareName.startsWith(compareQuery)) {
    return {
      score: SCORE_PREFIX,
      matchPositions: computeExactPositions(name, query, 0),
    };
  }

  // 3. Suffix match (basename without extension)
  const dotIdx = name.lastIndexOf(".");
  const stem =
    dotIdx > 0
      ? caseSensitive
        ? name.slice(0, dotIdx)
        : compareName.slice(0, dotIdx)
      : compareName;
  if (stem.endsWith(compareQuery)) {
    const startIdx = stem.length - compareQuery.length;
    return {
      score: SCORE_SUFFIX,
      matchPositions: computeExactPositions(name, query, startIdx),
    };
  }

  // 4. Substring match (in full path)
  const subIdx = comparePath.indexOf(compareQuery);
  if (subIdx !== -1) {
    return {
      score: SCORE_SUBSTRING,
      matchPositions: computeExactPositions(filePath, query, subIdx),
    };
  }

  // 5. Fuzzy match
  const fuzzyPositions = computeFuzzyMatchPositions(
    filePath,
    query,
    caseSensitive,
  );
  if (fuzzyPositions) {
    // Score based on gap penalties
    let gapPenalty = 0;
    for (let i = 1; i < fuzzyPositions.length; i++) {
      const gap = fuzzyPositions[i]! - fuzzyPositions[i - 1]! - 1;
      gapPenalty += gap * 10;
    }
    const fuzzyScore = Math.max(SCORE_FUZZY_BASE - gapPenalty, 1);
    return { score: fuzzyScore, matchPositions: fuzzyPositions };
  }

  return null; // no match
}

// ---------------------------------------------------------------------------
// FuzzyMatcher class
// ---------------------------------------------------------------------------

export class FuzzyMatcher {
  private _query: string;
  private _config: Required<FuzzyMatchConfig>;
  private _caseSensitive: boolean;
  private _queryCharBag: Map<string, number>;

  constructor(query: string, config?: FuzzyMatchConfig) {
    const smartCase = config?.smartCase ?? true;
    const hasCaseSensitive = config?.caseSensitive ?? false;

    // Smart case: if query has uppercase, force case-sensitive
    this._caseSensitive =
      hasCaseSensitive || (smartCase && /[A-Z]/.test(query));

    this._query = query;
    this._config = {
      maxResults: config?.maxResults ?? 100,
      caseSensitive: this._caseSensitive,
      smartCase: smartCase,
      openFiles: config?.openFiles ?? new Set(),
      dirtyFiles: config?.dirtyFiles ?? new Set(),
    };

    const normalizedQuery = this._caseSensitive
      ? query
      : query.toLowerCase();
    this._queryCharBag = buildCharBag(normalizedQuery);
  }

  match(entries: ScanEntry[]): FuzzyMatchResult[] {
    // Empty query -- return all sorted by importance
    if (this._query === "") {
      return this._handleEmptyQuery(entries);
    }

    // Semantic scoring first
    const results = this.matchWithSemanticScoring(entries);

    // If too few results, augment with fuzzy
    if (results.length < this._config.maxResults) {
      const matchedPaths = new Set(results.map((r) => r.entry.path));
      const remaining = entries.filter((e) => !matchedPaths.has(e.path));
      const fuzzyResults = this.matchWithFuzzyScoring(remaining);
      results.push(...fuzzyResults);
    }

    // Sort by score desc, tiebreak by path length asc
    results.sort(
      (a, b) =>
        b.score - a.score || a.entry.path.length - b.entry.path.length,
    );

    return results.slice(0, this._config.maxResults);
  }

  matchWithSemanticScoring(entries: ScanEntry[]): FuzzyMatchResult[] {
    const results: FuzzyMatchResult[] = [];
    for (const entry of entries) {
      // Char bag pre-filter
      const entryBag = buildCharBag(
        this._caseSensitive ? entry.path : entry.path.toLowerCase(),
      );
      if (!charBagContains(entryBag, this._queryCharBag)) continue;

      const scored = scoreEntry(entry, this._query, this._caseSensitive);
      if (scored && scored.score >= SCORE_SUBSTRING) {
        let finalScore = scored.score;
        finalScore += this._applyBonuses(entry);
        results.push({
          entry,
          score: finalScore,
          matchPositions: scored.matchPositions,
        });
      }
    }
    return results;
  }

  matchWithFuzzyScoring(entries: ScanEntry[]): FuzzyMatchResult[] {
    const results: FuzzyMatchResult[] = [];
    for (const entry of entries) {
      const entryBag = buildCharBag(
        this._caseSensitive ? entry.path : entry.path.toLowerCase(),
      );
      if (!charBagContains(entryBag, this._queryCharBag)) continue;

      const scored = scoreEntry(entry, this._query, this._caseSensitive);
      if (scored && scored.score < SCORE_SUBSTRING) {
        let finalScore = scored.score;
        finalScore += this._applyBonuses(entry);
        results.push({
          entry,
          score: finalScore,
          matchPositions: scored.matchPositions,
        });
      }
    }
    return results;
  }

  private _applyBonuses(entry: ScanEntry): number {
    let bonus = 0;
    if (this._config.openFiles.has(entry.path)) bonus += BONUS_OPEN;
    if (this._config.dirtyFiles.has(entry.path)) bonus += BONUS_DIRTY;
    if (isTestOrStoryFile(entry.name)) bonus += PENALTY_TEST;
    return bonus;
  }

  private _handleEmptyQuery(entries: ScanEntry[]): FuzzyMatchResult[] {
    const results: FuzzyMatchResult[] = entries.map((entry) => ({
      entry,
      score: this._applyBonuses(entry),
      matchPositions: [],
    }));
    results.sort(
      (a, b) =>
        b.score - a.score || a.entry.path.length - b.entry.path.length,
    );
    return results.slice(0, this._config.maxResults);
  }
}
