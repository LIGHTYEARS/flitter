# Solution: Remove Deprecated OrbWidget (Gap A03, #67)

## Problem Statement

The file `packages/flitter-amp/src/widgets/orb-widget.ts` contains the class
`OrbWidget`, which is explicitly marked with a `/** @deprecated Use
DensityOrbWidget instead */` JSDoc annotation on line 90. The deprecation was
introduced during the "align-welcome-pixel-perfect" spec when the Braille-based
orb was replaced by the ASCII density-character `DensityOrbWidget` in
`density-orb-widget.ts`. Despite the deprecation, the original file was never
deleted. It is dead code: no file in the entire repository imports or
instantiates `OrbWidget`.

---

## Scope of the Deprecated File

**File**: `packages/flitter-amp/src/widgets/orb-widget.ts` (198 lines)

The file contains the following artifacts:

| Artifact | Lines | Description |
|----------|-------|-------------|
| `DOT_COLS`, `DOT_ROWS` | 11-12 | Grid dimensions (80x80 dot grid) |
| `CELL_COLS`, `CELL_ROWS` | 13-14 | Cell dimensions (40x20 cells, derived from dots) |
| `NOISE_SCALE`, `NOISE_THRESHOLD` | 15-16 | Perlin noise tuning constants |
| `BRAILLE_DOT_MAP` | 18-23 | 4x2 braille dot-to-codepoint mapping matrix |
| `PERM` | 25 | `Uint8Array(512)` permutation table for Perlin noise |
| `GRAD` | 26-29 | 8-entry 2D gradient vector table |
| `initPerm()` | 31-41 | Fisher-Yates shuffle to populate PERM at module load |
| `fade(t)` | 45-47 | Quintic smoothstep interpolation function |
| `grad2d(hash, x, y)` | 49-52 | Gradient dot-product calculation |
| `noise2d(x, y)` | 54-72 | Core 2D Perlin noise evaluation |
| `fbm(x, y, octaves)` | 74-88 | Fractal Brownian motion accumulator |
| `OrbWidget` | 91-95 | Deprecated `StatefulWidget` class |
| `OrbWidgetState` | 97-198 | State class with timer-driven animation + braille rendering |

All of the Perlin noise infrastructure (`PERM`, `GRAD`, `initPerm`, `fade`,
`grad2d`, `noise2d`, `fbm`) is duplicated identically in
`density-orb-widget.ts` (lines 20-83). The only minor difference is that the
`density-orb-widget.ts` copy uses TypeScript non-null assertion operators (`!`)
on array accesses, while the `orb-widget.ts` copy does not. The algorithms,
constants, and logic are otherwise character-for-character identical.

---

## Comprehensive Import and Reference Analysis

### Source Code Imports of `orb-widget.ts`

A project-wide search for any import statement referencing the `orb-widget`
module path (excluding `density-orb-widget`) yields **zero results**:

```
Search: from.*['"].*\/orb-widget['"]   across packages/**/*.ts
Result: No matches found
```

A search for `import.*OrbWidget` also yields zero results apart from references
to `DensityOrbWidget`:

```
Search: import.*OrbWidget   across packages/**/*.ts
Result: Only density-orb-widget references in chat-view.ts
```

A search for CommonJS `require()` calls referencing `orb-widget` yields zero
results:

```
Search: require.*orb-widget   across packages/**/*.ts
Result: No matches found
```

### Barrel / Index File Exports

The package's main entry point (`packages/flitter-amp/src/index.ts`) does not
export or reference `orb-widget.ts`. It is a standalone application entry point
(containing `main()`) that imports `parseArgs`, `AppState`, `connectToAgent`,
and `startTUI`. No barrel file re-exports `OrbWidget`.

### The Active Replacement: `DensityOrbWidget`

The replacement widget lives in `packages/flitter-amp/src/widgets/density-orb-widget.ts`
(345 lines) and is imported by exactly one consumer:

| File | Line | Statement |
|------|------|-----------|
| `packages/flitter-amp/src/widgets/chat-view.ts` | 25 | `import { DensityOrbWidget } from './density-orb-widget';` |
| `packages/flitter-amp/src/widgets/chat-view.ts` | 182 | `const orbWidget = new DensityOrbWidget();` |

The `DensityOrbWidget` is a strict superset of the old `OrbWidget`:
- Uses ASCII density characters (` .:-=+*#`) instead of Unicode Braille (U+2800)
- Adds mouse shockwave interaction via `MouseRegion`
- Adds a 5-click explosion easter egg with particle physics
- Better terminal compatibility (Braille characters render inconsistently)
- Same Perlin noise engine, same animation framerate (100ms / 10fps)

### Test References

| File | Line | Reference Type |
|------|------|---------------|
| `__tests__/chat-view.test.ts` | 12 | Comment: "Welcome screen: centered with Orb + text content" |
| `__tests__/chat-view.test.ts` | 77 | Test name string: "welcome screen contains DensityOrbWidget and text content in a Row" |
| `__tests__/visual-cell-assertions.test.ts` | 142 | Test name string: "renders density characters in welcome orb" |

No test file imports `OrbWidget` or `orb-widget`. All test assertions validate
density characters (`#`, `*`, `+`, `=`), not Braille codepoints (U+2800 range).
Deleting `orb-widget.ts` will not cause any test to fail.

### Build Configuration

No `tsconfig.json`, `package.json`, or build configuration file in
`packages/flitter-amp/` references `orb-widget` by name. TypeScript compilation
will not be affected by the deletion since no file has an import dependency on
the module.

### Documentation and Spec References

The following files mention `OrbWidget` or `orb-widget` in prose, task lists,
or analysis documents. These are historical artifacts that document the
creation and deprecation lifecycle. They are not runtime dependencies:

- `.trae/specs/polish-visual-fidelity/tasks.md` -- original creation task
- `.trae/specs/polish-visual-fidelity/spec.md` -- original spec for OrbWidget
- `.trae/specs/polish-visual-fidelity/checklist.md` -- verification checklist
- `.trae/specs/align-welcome-pixel-perfect/tasks.md` -- migration task
- `.trae/specs/align-welcome-pixel-perfect/spec.md` -- migration spec
- `.trae/specs/align-welcome-pixel-perfect/checklist.md` -- verification items
- `amp-src-analysis-38.md` -- comparative analysis (OrbWidget vs DensityOrbWidget)
- `amp-src-analysis-44.md` -- widget inventory table
- `.gap/67-deprecated-orb-widget.md` -- this gap's initial identification
- `.gap/66-shared-perlin-noise.md` -- Perlin noise duplication analysis
- `.gap/66-duplicate-perlin-noise.md` -- detailed duplication audit
- `.gap/65-animation-framework.md` -- animation timer audit

### Gap File Cross-References

Two sibling gap files reference `orb-widget.ts` in their analysis and proposed
refactoring plans:

1. **Gap #66 (`66-shared-perlin-noise.md` / `66-duplicate-perlin-noise.md`)**:
   Proposes extracting shared Perlin noise utilities from both `orb-widget.ts`
   and `density-orb-widget.ts`. If `orb-widget.ts` is deleted first, gap #66's
   scope is simplified -- it only needs to extract utilities from
   `density-orb-widget.ts` (and `glow-text.ts`), not from two orb files.

2. **Gap #65 (`65-animation-framework.md`)**: Audits `setInterval`-based
   animation timers, listing `OrbWidget` as one of the timer users. After
   deletion, that entry becomes moot.

Neither gap file depends on `orb-widget.ts` existing. Both benefit from its
removal.

---

## Proposed Solution

### Step 1: Delete the file

```bash
rm packages/flitter-amp/src/widgets/orb-widget.ts
```

This single action removes all 198 lines of dead code, including:

- The deprecated `OrbWidget` class and its `OrbWidgetState`
- The duplicated Perlin noise infrastructure (`initPerm`, `fade`, `grad2d`,
  `noise2d`, `fbm`, `PERM`, `GRAD`)
- The `BRAILLE_DOT_MAP` constant (unique to this file, not used elsewhere)
- One `initPerm()` call that executes at module load time, performing a
  Fisher-Yates shuffle of 256 entries and populating a 512-byte array that is
  never read by any other code

### Step 2: Verify the import graph is clean

After deletion, run:

```bash
grep -rn "orb-widget" packages/ --include="*.ts" --include="*.js"
```

Expected output: only references to `density-orb-widget`, zero references to
the bare `orb-widget` path.

### Step 3: Run TypeScript compilation

```bash
cd packages/flitter-amp && bunx tsc --noEmit
```

Expected: clean compilation with zero errors. Since no file imports from
`orb-widget.ts`, removing the file introduces no broken references.

### Step 4: Run the test suite

```bash
cd packages/flitter-amp && bun test
```

Expected: all tests pass. The critical tests to watch are:

| Test | File | Why |
|------|------|-----|
| "returns a Column with mainAxisAlignment:center when no items" | `chat-view.test.ts` | Welcome screen structure |
| "welcome screen contains DensityOrbWidget and text content in a Row" | `chat-view.test.ts` | Orb widget presence |
| "renders density characters in welcome orb" | `visual-cell-assertions.test.ts` | Density chars (not Braille) |

### Step 5 (optional): Visual smoke test

```bash
bun run packages/flitter-amp/src/index.ts --agent "echo"
```

Verify the welcome screen renders with the animated ASCII density orb, mouse
clicks produce shockwaves, and 5 clicks trigger the explosion animation.

---

## What This Does NOT Change

- **`density-orb-widget.ts`**: Untouched. It is the active, production widget.
- **`chat-view.ts`**: Untouched. It already imports `DensityOrbWidget`, not
  `OrbWidget`.
- **Any test file**: Untouched. No test references `OrbWidget`.
- **Any barrel/index file**: Untouched. `OrbWidget` was never exported from
  any index.
- **`.trae/specs/` files**: Left as historical records. They document the
  lifecycle of OrbWidget creation, deprecation, and migration.

---

## Impact Assessment

| Dimension | Impact |
|-----------|--------|
| **Runtime behavior** | None. `OrbWidget` is never instantiated at runtime. |
| **Bundle size** | Removes 198 lines of dead code (~5.3 KB source). Eliminates one redundant `initPerm()` call and 512-byte `PERM` table allocation at module load. |
| **Test coverage** | No test changes required. Zero tests import or exercise `OrbWidget`. |
| **API surface** | `OrbWidget` was exported but never imported. No downstream consumers exist. |
| **Compilation** | No breakage. No file depends on `orb-widget.ts`. |
| **Performance** | Marginal improvement: removes one `initPerm()` Fisher-Yates shuffle (256 iterations) from module graph initialization. |
| **Related gaps** | Simplifies Gap #66 (Perlin noise dedup) by eliminating one consumer. Simplifies Gap #65 (animation framework) by removing one timer audit entry. |
| **Risk level** | Minimal. Straightforward dead-code deletion with zero dependents. |

---

## Follow-Up Considerations

### 1. Perlin Noise Deduplication (Gap #66)

After `orb-widget.ts` is deleted, the Perlin noise code still exists in two
locations:

- `density-orb-widget.ts` (lines 20-83): `PERM`, `GRAD`, `initPerm`, `fade`,
  `grad2d`, `noise2d`, `fbm`
- `glow-text.ts`: A simpler 1D noise variant used for color animation

Gap #66 proposes extracting these into a shared `packages/flitter-amp/src/utils/perlin-noise.ts`
module. Deleting `orb-widget.ts` first makes that extraction simpler because
there is one fewer consumer to migrate.

### 2. Animation Framework (Gap #65)

Gap #65 audits all `setInterval`-based animation timers. `OrbWidget` is listed
as one of the timer-using widgets. After deletion, the audit table for gap #65
should note that `OrbWidget` no longer exists, reducing the migration surface
to `DensityOrbWidget`, `GlowText`, and other active widgets.

### 3. Documentation Updates (Low Priority)

The `.trae/specs/align-welcome-pixel-perfect/tasks.md` file could optionally
be updated to add a "Task 6: Delete deprecated OrbWidget" entry to document
the completion of the deprecation lifecycle. Similarly, the gap analysis files
(`66-*`, `65-*`) could be updated to reflect that one of their subjects no
longer exists. These are cosmetic documentation changes with no functional
impact and can be deferred indefinitely.

---

## Commit Message

```
chore(flitter-amp): remove deprecated OrbWidget

Delete orb-widget.ts (198 lines of dead code). The OrbWidget class was
marked @deprecated in favor of DensityOrbWidget during the
align-welcome-pixel-perfect spec. No file in the repository imports or
instantiates OrbWidget. All welcome screen rendering uses
DensityOrbWidget exclusively.

Removes:
- OrbWidget and OrbWidgetState classes
- Duplicated Perlin noise infrastructure (initPerm, fade, grad2d,
  noise2d, fbm) that is already present in density-orb-widget.ts
- One redundant initPerm() call at module load time
- BRAILLE_DOT_MAP constant (unused elsewhere)
```

---

## Verification Checklist

- [ ] `packages/flitter-amp/src/widgets/orb-widget.ts` no longer exists
- [ ] `grep -rn "from.*orb-widget" packages/` returns zero results
- [ ] `bunx tsc --noEmit` compiles cleanly in `packages/flitter-amp/`
- [ ] `bun test` passes all tests in `packages/flitter-amp/`
- [ ] Welcome screen renders the animated density-character orb
- [ ] Mouse interaction (shockwaves, explosion) works on the orb
- [ ] No console errors or warnings at startup
