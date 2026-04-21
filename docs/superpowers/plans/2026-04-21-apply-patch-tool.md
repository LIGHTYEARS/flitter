# Plan: `apply_patch` Builtin Tool (GAP-TOOL-01)

> **Status:** COMPLETED (2026-04-21)
> **Date:** 2026-04-21
> **Gap ID:** GAP-TOOL-01 (Critical)
> **ADR:** ADR-001 in `/ADR.md`
> **Amp reference:** `amp-cli-reversed/modules/2026_tail_anonymous.js` lines 13559-13770 (parser `Kw`/`XS`), lines 13628-13770 (executor `Q5R`), lines 139877-140085 (tool spec + examples)
> **Amp chunk references:** `chunk-001.js:5354-5408` (parser), `chunk-002.js:30788-30963` (applicator), `chunk-005.js:146044-146252` (spec)

## Summary

Implement the `apply_patch` tool — amp's primary multi-file editing tool using the Codex patch format. This is the single Critical gap in GAPS.md.

## Patch Format Grammar

```
Patch       := Begin { FileOp } End
Begin       := "*** Begin Patch" NEWLINE
End         := "*** End Patch" NEWLINE
FileOp      := AddFile | DeleteFile | UpdateFile
AddFile     := "*** Add File: " path NEWLINE { "+" line NEWLINE }
DeleteFile  := "*** Delete File: " path NEWLINE
UpdateFile  := "*** Update File: " path NEWLINE [ MoveTo ] { Hunk }
MoveTo      := "*** Move to: " newPath NEWLINE
Hunk        := "@@" [ " " header ] NEWLINE { HunkLine } [ "*** End of File" NEWLINE ]
HunkLine    := (" " | "-" | "+") text NEWLINE
```

## Architecture (3 Layers)

### Layer 1: Parser (`parsePatch`)

Port amp's `XS()` function. Accepts raw `patchText` string, returns:

```typescript
interface PatchChunk {
  oldLines: string[];
  newLines: string[];
  changeContext?: string;   // text after @@ (scope hint)
  isEndOfFile?: boolean;    // *** End of File marker
}

interface PatchOperation {
  type: "add" | "update" | "delete";
  path: string;
  movePath?: string;    // Update + Move to
  contents?: string;    // Add file contents
  chunks?: PatchChunk[]; // Update hunks
}

interface ParseResult {
  operations: PatchOperation[];
  warnings: string[];
}
```

Key behaviors:
- Strip heredoc wrappers (`cat <<'EOF'...EOF`)
- Find `*** Begin Patch` and `*** End Patch` markers
- Emit warnings (not errors) for content outside markers
- Hard error for missing/misplaced markers
- Support multiple `@@` headers per hunk (joined into `changeContext`)

### Layer 2: Hunk Applicator (`applyHunks`)

Port amp's `X5R` + `K5R` + `oz` + `qI` + `V5R` + `F5R` + `G5R` + `sz`.

**5-tier fuzzy matching cascade:**

| Tier | Name | Comparison |
|------|------|-----------|
| 1 | exact | `a === b` |
| 2 | rstrip | `a.trimEnd() === b.trimEnd()` |
| 3 | trim | `a.trim() === b.trim()` |
| 4 | unicode | normalize smart-quotes/dashes/ellipsis/NBSP, then trim+compare |
| 5 | spaceCollapsed | unicode normalize + tabs→spaces + collapse multiple spaces |

Key behaviors:
- `changeContext` lines searched forward from cursor to position hunks
- `isEndOfFile` anchor tries end-of-file position first
- Insert-only hunks (no `-` lines) insert at cursor, merging adjacent records
- Overlapping splice records → hard error
- Bottom-to-top application (reverse order) to avoid index shifting
- Fuzzy tier match → re-apply file's actual indentation to `newLines`
- CRLF detection + round-trip preservation

### Layer 3: Tool Spec

```typescript
export const applyPatchToolSpec: ToolSpec = {
  name: "apply_patch",
  source: "builtin",
  isReadOnly: false,
  description: /* amp's full description from J5R */,
  inputSchema: {
    type: "object",
    properties: {
      patchText: { type: "string", description: "The full patch text..." }
    },
    required: ["patchText"],
    additionalProperties: false,
  },
};
```

Execution:
1. Parse `patchText` → operations
2. Validate non-empty
3. For each operation, resolve path (relative → absolute)
4. Switch on type:
   - `add`: create file, ensure trailing newline
   - `update`: read file, apply hunks via Layer 2, optionally move
   - `delete`: verify exists, delete
5. Record in FileChangeTracker for undo support
6. Return summary string: `"update: src/foo.ts (+3/-1)\nadd: src/bar.ts (+5/-0)"`

## Files to Create

| File | Purpose |
|------|---------|
| `packages/agent-core/src/tools/builtin/apply-patch.ts` | Parser + Applicator + ToolSpec (~400 lines) |
| `packages/agent-core/src/tools/builtin/__tests__/apply-patch.test.ts` | Unit tests (~200 lines) |

## Files to Modify

| File | Change |
|------|--------|
| `packages/agent-core/src/tools/tool-registry.ts` | Register `apply_patch` in builtin tools |
| `packages/cli/src/widgets/display-items.ts` | Handle `apply_patch` result rendering (show file list + stats) |

## Test Plan

1. **Parser tests:**
   - Parse each of the 8 example patches from amp's `Z5R` array
   - Parse multi-file patches
   - Error cases: missing markers, empty body, invalid format
   - Heredoc wrapper stripping

2. **Applicator tests:**
   - Single hunk update (exact match)
   - Multi-hunk update with `@@` context
   - Fuzzy matching (trailing whitespace, smart quotes)
   - `*** End of File` anchor
   - Overlapping hunk detection
   - CRLF round-trip

3. **Integration tests:**
   - Add + Update + Delete in single patch
   - Move file with changes
   - Real file I/O (temp directory)

## Implementation Order

1. Types and interfaces
2. Parser (`parsePatch`)  — with tests
3. Unicode normalizer (`normalizeUnicode`) — with tests
4. Fuzzy line scanner (`findMatch`) — with tests
5. Hunk applicator (`applyHunks`) — with tests
6. Tool spec and execute function — with integration tests
7. Registration in tool-registry.ts
8. TUI rendering in display-items.ts

## Risk Mitigation

- **Fuzzy matching correctness**: The 5-tier cascade must exactly match amp's order. Test with real-world patches.
- **Indentation preservation on fuzzy match**: `F5R` re-applies file indentation when fuzzy tier > 1. Must handle mixed tabs/spaces.
- **Large files**: The scanner does a forward scan from cursor. Performance is O(n) per hunk where n = file lines. For very large files with many hunks, this is O(n*k). Acceptable for now — amp uses the same approach.
