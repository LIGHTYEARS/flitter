---
phase: 9
plan: 06
status: complete
---

# Guidance Files Loading & Discovery — Summary

## One-Liner
Implemented guidance file (AGENTS.md / CLAUDE.md) discovery from workspace root upward through parent directories, with YAML frontmatter parsing, glob-based filtering, `@`-reference resolution, cycle prevention, and byte-budget truncation.

## What Was Built
- `packages/data/src/guidance/guidance-types.ts` — Type definitions: GuidanceType (`"project" | "parent" | "user" | "mentioned"`), GuidanceFrontmatter, GuidanceFile, GuidanceLoadOptions
- `packages/data/src/guidance/guidance-loader.ts` — Core discovery and loading logic:
  - `parseFrontmatter(raw)` — extracts YAML frontmatter; returns null on parse error with trimmed original content as fallback
  - `matchGlobs(frontMatter, readFiles, fileUri)` — glob filtering via a self-contained `globToRegex` converter supporting `**`, `*`, `?`, brace expansion `{a,b}`
  - `extractAtReferences(content)` — regex-based `@path` extraction after stripping code blocks (triple-backtick and inline backtick); strips trailing punctuation
  - `isRootDirectory(dir)` — detects filesystem root to stop upward traversal
  - `discoverGuidanceFiles(options)` — main entry point:
    1. Walks from each workspace root upward to filesystem root
    2. Searches for AGENTS.md (priority) then CLAUDE.md per directory
    3. Deduplicates by directory (one file per dir)
    4. Classifies as project/parent/user based on relationship to workspace root
    5. Parses frontmatter and evaluates glob exclusion
    6. Resolves `@`-references recursively (type: "mentioned"), with cycle prevention via seen-URI set
    7. Inserts mentioned files immediately after their referrer in results
    8. Truncates files exceeding `maxBytesPerFile` (default 32KB)
    9. Supports AbortSignal for cancellation
- `packages/data/src/guidance/guidance-loader.test.ts` — 36 tests

## Key Decisions
- Self-contained simple glob-to-regex converter instead of micromatch dependency — supports `**/*.ext`, `*.ext`, brace expansion, and `?` wildcard
- Simple YAML parser in the guidance module is separate from the skill module's parser — each is tailored to its own frontmatter format
- Single-string `globs` values are auto-wrapped into arrays for convenience
- Cycle prevention for `@`-references uses a shared `seenUris` set across the entire discovery run
- Mentioned files are spliced after their referrer using a reverse-order insertion strategy to keep indices stable
- Files that fail to read (ENOENT or permission errors) are silently skipped — no error propagation

## Test Coverage
36 tests covering: parseFrontmatter (5 — valid globs, no frontmatter, invalid YAML, single-value globs, boolean/number values), matchGlobs (5 — no globs, matching, non-matching, empty readFiles, simple extension, brace expansion), extractAtReferences (6 — simple ref, multiple, code block exclusion, trailing punctuation, no refs, glob-like refs), isRootDirectory (3 — root, normal dir, workspace path), discoverGuidanceFiles (17 — workspace root, AGENTS.md priority, dedup, type classification, parent walk-up, root stop, `@`-reference loading, cycle prevention, truncation, missing files, empty roots, glob exclude/include, no-frontmatter exclude=false, lineCount, mentioned ordering).

## Artifacts
- `packages/data/src/guidance/guidance-types.ts`
- `packages/data/src/guidance/guidance-loader.ts`
- `packages/data/src/guidance/guidance-loader.test.ts`
