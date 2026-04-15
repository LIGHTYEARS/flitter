---
phase: 2
plan: 06
status: complete
---

# Fuzzy File Search -- Summary

## One-Liner
Implemented a multi-tier fuzzy file search module with exact/prefix/suffix/substring/fuzzy scoring, smart case detection, char bag pre-filtering, open/dirty file boosting, test file penalties, and match position tracking for UI highlighting.

## What Was Built
- `FuzzyMatchConfig` interface with `maxResults` (default 100), `caseSensitive`, `smartCase` (default true), `openFiles` (Set, +500), `dirtyFiles` (Set, +300)
- `FuzzyMatchResult` interface with `entry: ScanEntry`, `score: number`, `matchPositions: number[]`
- `FuzzyMatcher` class:
  - `constructor(query, config)` -- normalizes query, builds char bag, resolves smart case
  - `match(entries)` -- semantic scoring first, augments with fuzzy scoring if too few results, sorts by score descending with path-length tiebreaker, slices to maxResults
  - `matchWithSemanticScoring(entries)` -- scores only exact/prefix/suffix/substring tiers (score >= 2500)
  - `matchWithFuzzyScoring(entries)` -- scores remaining entries using fuzzy tier (score < 2500)
- Five scoring tiers with constants: exact (10000), prefix (7500), suffix (5000), substring (2500), fuzzy (1000 base with gap penalties)
- Bonus/penalty system: open files +500, dirty files +300, test/spec/story files -200
- Internal helpers:
  - `buildCharBag` / `charBagContains` -- character frequency map for O(1) pre-filtering of impossible matches
  - `isTestOrStoryFile` -- regex detection of `.test.`, `.spec.`, `.story.`, `.stories.` patterns
  - `computeFuzzyMatchPositions` -- greedy left-to-right character matching returning index array or null
  - `computeExactPositions` -- contiguous index array from a start position
  - `scoreEntry` -- cascading tier evaluation (exact -> prefix -> suffix -> substring -> fuzzy)
- Smart case logic: if query contains any uppercase character, matching becomes case-sensitive automatically
- Empty query handling: returns all entries sorted by bonus (open > dirty > rest) with empty matchPositions
- Suffix matching operates on the filename stem (basename without extension)
- Fuzzy score uses gap penalty (10 per gap character) subtracted from base, floored at 1
- Barrel export at `packages/util/src/search/index.ts`

## Key Decisions
- Char bag pre-filter runs before scoring to eliminate impossible matches early, important for large entry sets
- Semantic and fuzzy scoring split into two passes: semantic first (high-quality matches), fuzzy only for remaining entries when results are insufficient
- Suffix matching targets the stem (filename without extension) rather than the full basename, matching common IDE behavior (e.g., "utils" matches "my-utils.ts")
- Substring matching searches the full path, not just the basename, enabling directory-qualified searches like "components/button"
- Gap penalty in fuzzy scoring is linear (10 per gap character), creating a smooth score gradient favoring tighter character clusters
- Score constants are well-separated (2500 apart) to prevent bonus/penalty from crossing tier boundaries in normal cases
- Operates on `ScanEntry` arrays from the FileScanner module (plan 02-04), establishing the dependency chain

## Test Coverage
33 test cases in `packages/util/src/search/fuzzy-search.test.ts` covering:
- Scoring tiers (5 tests): exact highest, prefix > suffix, suffix > substring, substring > fuzzy, no match returns empty
- Smart case (3 tests): lowercase query case-insensitive, uppercase forces case-sensitive, caseSensitive:true override
- Char bag pre-filter (2 tests): missing character excluded, all characters proceed to scoring
- Bonus/penalty (4 tests): open file +500 boosts ranking, dirty file +300 boosts ranking, open+dirty stack, test file penalty
- matchPositions (3 tests): exact match 0..n-1, fuzzy non-contiguous positions, valid indices
- Empty query (2 tests): returns all entries, open files sorted first
- maxResults (2 tests): capped at specified value, default is 100
- Tiebreaker (1 test): shorter path wins at same score
- Edge cases (5 tests): query longer than filename, single-character query, regex special chars literal, same basename different dirs, 1500 entries no crash
- Additional coverage (6 tests): suffix match on stem, substring in path, spec/story penalty, directory entries matchable, prefix positions start at 0, larger gaps yield lower fuzzy score

## Artifacts
- `packages/util/src/search/fuzzy-search.ts`
- `packages/util/src/search/fuzzy-search.test.ts`
- `packages/util/src/search/index.ts`
