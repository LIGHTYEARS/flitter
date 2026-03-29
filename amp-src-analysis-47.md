# Flitter Monorepo: Architecture and Package Analysis

## 1. Monorepo Workspace Configuration

The flitter repository is a **pnpm workspace monorepo** with a dual-tool configuration. Both
pnpm and npm/bun workspace declarations coexist:

**Root `package.json`:**
```json
{
  "name": "flitter",
  "private": true,
  "scripts": {
    "test": "pnpm -r run test",
    "typecheck": "pnpm -r run typecheck",
    "build": "pnpm -r run build"
  },
  "workspaces": ["packages/*"]
}
```

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - "packages/*"
```

The `workspaces` field in `package.json` is technically the npm/Bun workspace protocol, while
`pnpm-workspace.yaml` is pnpm's native workspace declaration. Both point to the same glob:
`packages/*`. This dual declaration ensures compatibility when Bun is used as the runtime
(since Bun respects the `package.json` `workspaces` field) while pnpm handles dependency
installation and workspace linking.

**`.npmrc` configuration:**
```
shamefully-hoist=true
strict-peer-dependencies=false
```

`shamefully-hoist=true` flattens the `node_modules` tree to mimic npm's behavior, which is
necessary because Bun's module resolution expects hoisted dependencies. Without this, deep
import paths like `flitter-core/src/framework/widget` would fail to resolve from the
`flitter-amp` package. `strict-peer-dependencies=false` relaxes peer dependency enforcement.

The monorepo contains exactly **two packages**:
- `packages/flitter-core` -- the TUI framework library
- `packages/flitter-amp` -- an ACP (Agent Client Protocol) terminal client built on the framework

There is also a `bun.lock` file (56KB) alongside `pnpm-lock.yaml` (56KB), confirming that
both Bun and pnpm are used interchangeably for dependency management at different stages.

---

## 2. Package Dependency Graph

The dependency relationship flows in a single direction:

```
flitter-amp  --->  flitter-core  (workspace:*)
flitter-amp  --->  @agentclientprotocol/sdk  (^0.16.0)
```

**`flitter-core`** has **zero runtime dependencies**. Its `package.json` contains only
`devDependencies`:
- `@types/bun: latest`
- `bun-types: ^1.3.11`
- `typescript: ^5.7.0`
- `vitepress: ^1.6.4` (for documentation)

This is a deliberate design decision documented in the project's CLAUDE.md:
*"Zero transitive runtime dependencies."* The entire TUI framework -- widget tree, layout
engine, rendering pipeline, input system -- is implemented from scratch with no third-party
runtime libraries.

**`flitter-amp`** declares two runtime dependencies:
- `flitter-core: workspace:*` -- links to the sibling package at its current version
- `@agentclientprotocol/sdk: ^0.16.0` -- the ACP protocol SDK for agent communication

The `workspace:*` protocol is pnpm's mechanism for intra-monorepo references. At install time,
pnpm creates a symlink from `node_modules/flitter-core` to `packages/flitter-core`. At publish
time (if ever), `workspace:*` would be replaced with the actual version number.

Note: At the time of inspection, `node_modules` was not populated (no `flitter-core` symlink
found in either `packages/flitter-amp/node_modules/` or the root `node_modules/`), indicating
dependencies have not been installed in this workspace snapshot.

---

## 3. TypeScript Configuration and Compilation

### Root `tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "packages/flitter-core" },
    { "path": "packages/flitter-amp" }
  ]
}
```

The root config uses **TypeScript project references** (`composite` + `references`). The
`"files": []` ensures the root config itself compiles nothing -- it simply orchestrates
the two sub-projects. Running `tsc --build` from the root would compile both packages in
dependency order (core first, then amp).

### Per-Package TypeScript Configuration

Both packages share an **identical** `compilerOptions` block:

| Option | Value | Significance |
|--------|-------|-------------|
| `target` | `ES2022` | Modern JS output (top-level await, class fields) |
| `module` | `ES2022` | ESM output with static `import`/`export` |
| `moduleResolution` | `bundler` | Allows extensionless imports, `package.json` `exports` |
| `strict` | `true` | Full TypeScript strict mode |
| `composite` | `true` | Required for project references |
| `declaration` | `true` | Emits `.d.ts` files |
| `declarationMap` | `true` | Enables go-to-definition across packages |
| `sourceMap` | `true` | Debugging support |
| `outDir` | `dist` | Compiled output directory |
| `rootDir` | `src` | Source root for path mapping |
| `types` | `["bun-types"]` | Bun runtime type definitions |
| `noUnusedLocals` | `true` | Strict unused variable checking |
| `noUnusedParameters` | `true` | Strict unused parameter checking |
| `noImplicitReturns` | `true` | All code paths must return |
| `noFallthroughCasesInSwitch` | `true` | Prevents switch fallthrough |

The key difference is that `flitter-amp/tsconfig.json` includes:

```json
"references": [
  { "path": "../flitter-core" }
]
```

This tells TypeScript that `flitter-amp` depends on `flitter-core`, enabling incremental
compilation and cross-project type checking. Both configs exclude `node_modules`, `dist`,
and `**/__tests__/**` from compilation scope.

The `moduleResolution: "bundler"` setting is critical -- it enables the deep subpath imports
like `flitter-core/src/framework/widget` that flitter-amp uses extensively. This resolution
strategy does not require `exports` maps in `package.json`; it resolves bare specifiers by
traversing `node_modules` directories and then following filesystem paths.

---

## 4. Module System (ESM/CJS) and Import Patterns

Both packages declare `"type": "module"` in their `package.json`, making them pure **ESM**
packages. All imports use `import`/`export` syntax with no `require()` calls.

### flitter-core Import Style (Internal)

Within flitter-core, modules use **relative path imports**:

```typescript
// packages/flitter-core/src/framework/binding.ts
import { BuildOwner } from './build-owner';
import { Widget, StatelessWidget } from './widget';
import { BoxConstraints } from '../core/box-constraints';
import { ScreenBuffer } from '../terminal/screen-buffer';
```

### flitter-amp Import Style (Cross-Package)

flitter-amp uses **deep subpath imports** into flitter-core's source tree rather than importing
from the package barrel (`flitter-core` or `flitter-core/src/index.ts`). Every single
flitter-core import follows this pattern:

```typescript
import { StatefulWidget, State, Widget } from 'flitter-core/src/framework/widget';
import { Color } from 'flitter-core/src/core/color';
import { Column, Row } from 'flitter-core/src/widgets/flex';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
```

A grep across the entire `flitter-amp/src/` directory reveals **zero** imports from the
barrel `'flitter-core'` -- every import specifies the full subpath. This is a notable pattern
with several implications:

1. **Tree-shaking is unnecessary** -- Bun runs from source directly (`bun run src/index.ts`),
   so there is no bundling step where barrel imports would cause module-loading overhead.
2. **Tighter coupling** -- flitter-amp depends on flitter-core's internal file structure,
   not just its public API. Renaming or moving an internal file in flitter-core would break
   flitter-amp imports.
3. **No indirection** -- There is no barrel re-export overhead. Each import resolves to
   exactly one source file.

This pattern is enabled by `moduleResolution: "bundler"` in tsconfig and Bun's ability to
resolve `flitter-core/src/...` paths through the workspace symlink.

---

## 5. Build and Development Scripts

### flitter-core Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `bun test` | Run tests with Bun's built-in test runner |
| `test:coverage` | `bun test --coverage` | Tests with coverage reporting |
| `build` | `bun build src/index.ts --outdir dist --target bun` | Bundle for distribution |
| `typecheck` | `tsc --noEmit` | Type-check only (no output) |
| `example:*` | `bun run examples/<name>.ts` | Run example demos (7 total) |
| `docs:*` | `vitepress dev/build/preview docs` | Documentation site |

The build script uses **Bun's bundler** (`bun build`) targeting the Bun runtime, outputting
to `dist/`. However, since `"main": "src/index.ts"` points to the TypeScript source file
directly, the build output is only needed for distribution -- not for intra-workspace usage.

### flitter-amp Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `bun run src/index.ts` | Launch the TUI application |
| `test` | `bun test` | Run tests |
| `typecheck` | `tsc --noEmit` | Type-check only |

flitter-amp has **no build script**. It is intended to run directly from TypeScript source
via Bun's native TS execution. The `"bin"` field maps `flitter-amp` to `src/index.ts`, which
has a `#!/usr/bin/env bun` shebang, making it directly executable.

### Root Scripts

The root `package.json` provides monorepo-wide orchestration via `pnpm -r run`:
- `pnpm run test` -- runs tests in all packages recursively
- `pnpm run typecheck` -- type-checks all packages
- `pnpm run build` -- builds all packages

---

## 6. Source Directory Organization

### flitter-core: 10 Subdirectories, ~95 Source Files, ~25,600 Lines

```
src/
  index.ts                    -- Public API barrel (103 lines, ~100 exports)
  core/                       -- Primitive types and value objects
    types.ts                  -- Offset, Size, Rect
    color.ts                  -- Color (ANSI, RGB, HSL)
    text-style.ts             -- TextStyle (bold, italic, fg/bg color)
    text-span.ts              -- TextSpan (styled text tree)
    box-constraints.ts        -- BoxConstraints (min/max width/height)
    key.ts                    -- Key, ValueKey, UniqueKey, GlobalKey
    wcwidth.ts                -- East Asian character width calculation
  framework/                  -- Three-tree architecture (Widget/Element/RenderObject)
    widget.ts                 -- Widget, StatelessWidget, StatefulWidget, State, InheritedWidget
    element.ts                -- Element, reconciliation, mount/unmount (1025 lines)
    render-object.ts          -- RenderBox, layout protocol (499 lines)
    binding.ts                -- WidgetsBinding, runApp() (1001 lines)
    build-owner.ts            -- BuildOwner (dirty element scheduling)
    pipeline-owner.ts         -- PipelineOwner (layout/paint pipeline)
    listenable.ts             -- Listenable mixin
    error-widget.ts           -- Error display widget
  scheduler/                  -- Frame pipeline
    frame-scheduler.ts        -- 60fps frame scheduling (602 lines)
    paint-context.ts          -- PaintContext (cell-level painting)
    paint.ts                  -- paintRenderTree
    clip-canvas.ts            -- Clipping support
  terminal/                   -- Terminal I/O layer
    platform.ts               -- BunPlatform, MockPlatform (stdin/stdout abstraction)
    terminal-manager.ts       -- Terminal init, raw mode, resize
    screen-buffer.ts          -- Double-buffered cell grid
    renderer.ts               -- Diff-based ANSI rendering (598 lines)
    ansi-parser.ts            -- ANSI escape sequence parser
    cell.ts                   -- Cell type definition (character + style)
    terminal-cleanup.ts       -- Graceful terminal cleanup
  input/                      -- Keyboard, mouse, and focus system
    input-parser.ts           -- Raw stdin to structured events (781 lines)
    focus.ts                  -- FocusManager, FocusNode (513 lines)
    event-dispatcher.ts       -- Event routing and hit-testing
    events.ts                 -- KeyEvent, MouseEvent types
    keyboard.ts               -- Keyboard event handling
    mouse.ts                  -- Mouse event types
    mouse-manager.ts          -- Mouse tracking
    mouse-cursors.ts          -- Cursor styles
    hit-test.ts               -- Hit testing for mouse events
    input-bridge.ts           -- Bridge between input parser and event system
    shortcuts.ts              -- Keyboard shortcut bindings
  layout/                     -- RenderObject layout implementations
    render-flex.ts            -- Row/Column flex layout (554 lines)
    render-table.ts           -- Table layout
    render-decorated.ts       -- BoxDecoration, Border
    render-padded.ts          -- Padding layout
    render-constrained.ts     -- Constrained box
    render-grid-border.ts     -- Grid border layout
    render-sticky-header.ts   -- Sticky header layout
    edge-insets.ts            -- EdgeInsets value type
    parent-data.ts            -- FlexParentData
    layout-helpers.ts         -- Intrinsic width estimation
  widgets/                    -- Built-in widget catalog (41 widget files)
    text.ts, text-field.ts    -- Text display and editing
    flex.ts, flexible.ts      -- Row, Column, Expanded
    container.ts, padding.ts  -- Container widgets
    scroll-view.ts, scrollbar.ts, scroll-controller.ts -- Scrolling
    stack.ts                  -- Stack, Positioned (overlay)
    markdown.ts               -- Markdown renderer (844 lines)
    diff-view.ts              -- Diff viewer (873 lines)
    selection-list.ts         -- Interactive selection list
    dialog.ts                 -- Modal dialog
    autocomplete.ts           -- Autocomplete dropdown
    focus-scope.ts            -- Focus scope management
    image-preview.ts          -- Kitty graphics image protocol (653 lines)
    syntax-highlight.ts       -- Syntax highlighting (473 lines)
    ...and 20+ more
  painting/                   -- Painting utilities
    border-painter.ts         -- Box-drawing characters
    tree-connector.ts         -- Tree structure connectors
  utilities/                  -- General utilities
    braille-spinner.ts        -- Animated braille spinner
  diagnostics/                -- Debug and performance tools
    debug-inspector.ts        -- Element tree inspector
    perf-overlay.ts           -- Performance overlay widget
    frame-stats.ts            -- Frame timing statistics
    debug-flags.ts            -- Debug flag toggles
```

### flitter-amp: 7 Subdirectories, ~40 Source Files, ~7,600 Lines

```
src/
  index.ts                    -- Entry point / CLI bootstrap (125 lines)
  app.ts                      -- Root App widget, startTUI() (372 lines)
  acp/                        -- ACP protocol layer
    client.ts                 -- FlitterClient (handles agent requests)
    connection.ts             -- Agent subprocess management, ndJsonStream
    session.ts                -- Session management
    types.ts                  -- ACP type definitions
  state/                      -- Application state management
    app-state.ts              -- AppState (ClientCallbacks impl, listener pattern)
    config.ts                 -- CLI argument parsing
    conversation.ts           -- ConversationState (message/tool/thinking items)
    history.ts                -- Prompt history (up/down arrow)
  widgets/                    -- Amp-specific UI widgets
    chat-view.ts              -- Conversation message rendering
    bottom-grid.ts            -- Input area with overlaid status
    input-area.ts             -- Text input with autocomplete
    header-bar.ts             -- Top bar
    status-bar.ts             -- Bottom status bar
    command-palette.ts        -- Ctrl+O command palette
    permission-dialog.ts      -- Agent permission request dialog
    file-picker.ts            -- File selection widget
    thinking-block.ts         -- Agent thinking display
    plan-view.ts              -- Agent plan visualization
    orb-widget.ts             -- Animated orb
    density-orb-widget.ts     -- Token density orb
    glow-text.ts              -- Glowing text effect
    diff-card.ts              -- Diff display card
    tool-call-block.ts        -- Generic tool call wrapper
    tool-call/                -- Specialized tool call widgets (12 files)
      index.ts                -- Barrel export
      tool-call-widget.ts     -- Tool call dispatcher
      generic-tool-card.ts    -- Fallback tool display
      tool-header.ts          -- Tool call header with spinner
      bash-tool.ts            -- Bash command display
      read-tool.ts            -- File read display
      edit-file-tool.ts       -- File edit with diff
      create-file-tool.ts     -- File creation display
      grep-tool.ts            -- Grep results display
      web-search-tool.ts      -- Web search results
      handoff-tool.ts         -- Agent handoff display
      todo-list-tool.ts       -- Todo list display
      task-tool.ts            -- Task tool display
  themes/                     -- Theme system (8 files)
    index.ts                  -- Theme barrel, AmpThemeProvider InheritedWidget
    amp-theme-data.ts         -- AmpBaseTheme, AmpAppColors, AmpTheme type defs
    dark.ts, light.ts         -- Base themes
    catppuccin-mocha.ts       -- Catppuccin Mocha theme
    solarized-dark.ts, solarized-light.ts -- Solarized themes
    gruvbox-dark.ts           -- Gruvbox theme
    nord.ts                   -- Nord theme
  utils/                      -- Utility modules
    logger.ts                 -- File-based logging
    editor.ts                 -- External editor integration
    process.ts                -- Agent subprocess spawning
  test-utils/                 -- Test infrastructure
    capture.ts                -- Widget tree capture for testing
    grid-helpers.ts           -- Grid assertion helpers
    termshot.ts               -- SVG snapshot generation (terminal screenshots)
    tmux-harness.ts           -- tmux-based integration test harness
  __tests__/                  -- Integration and visual tests
    __snapshots__/            -- 26 SVG visual snapshots
```

---

## 7. Export/Barrel Patterns

### flitter-core Barrel (`src/index.ts`)

The barrel file is organized by development phase and re-exports approximately 100 symbols:

```typescript
// Phase 1: Core Primitives
export { Offset, Size, Rect } from './core/types';
export { Color } from './core/color';
export { TextStyle } from './core/text-style';
// ...

// Phase 10: Infrastructure Layer
export { MediaQueryData, MediaQuery } from './widgets/media-query';
export { Theme } from './widgets/theme';
// ...

// Phase 13: Advanced Widgets
export { Dialog } from './widgets/dialog';
export { DiffView } from './widgets/diff-view';
export { Markdown } from './widgets/markdown';
// ...
```

Each export is a named re-export from a specific source module. Types use `export type` for
proper type-only erasure. The barrel does **not** re-export everything -- internal classes
like `Element`, `RenderBox`, `FrameScheduler`, or `TerminalManager` are intentionally
excluded from the public API.

Despite this barrel existing, **flitter-amp does not use it**. This is discussed further in
section 9.

### flitter-amp Barrels

flitter-amp uses a single sub-barrel for tool call widgets:

```typescript
// src/widgets/tool-call/index.ts
export { ToolCallWidget } from './tool-call-widget';
export { GenericToolCard } from './generic-tool-card';
export { ToolHeader } from './tool-header';
export { ReadTool } from './read-tool';
// ...11 total exports
```

The theme system also uses `src/themes/index.ts` as a barrel, re-exporting all themes plus
the `AmpThemeProvider` InheritedWidget, `createAmpTheme()` helper, and `deriveAppColors()`.

flitter-amp does **not** have a top-level barrel in `src/index.ts` -- that file is the
application entry point, not a library export.

---

## 8. Third-Party Dependency Analysis

### Runtime Dependencies

| Package | Version | Used By | Purpose |
|---------|---------|---------|---------|
| `@agentclientprotocol/sdk` | `^0.16.0` | flitter-amp | ACP protocol (ndJsonStream, ClientSideConnection) |

This is the **only** runtime third-party dependency in the entire monorepo. The ACP SDK
provides:
- `ClientSideConnection` -- JSON-RPC over stdio
- `ndJsonStream` -- Newline-delimited JSON transport
- `PROTOCOL_VERSION` -- Protocol version constant
- Type definitions for ACP messages (InitializeRequest, PromptRequest, etc.)

### Dev Dependencies

| Package | Version | Used By | Purpose |
|---------|---------|---------|---------|
| `typescript` | `^5.7.0` | both | Type checking |
| `@types/bun` | `latest` | both | Bun API type definitions |
| `bun-types` | `^1.3.11` | both | Bun runtime types |
| `vitepress` | `^1.6.4` | flitter-core | Documentation site |

### Platform Dependencies

The codebase depends heavily on **Bun runtime APIs**:
- `Bun.spawnSync` -- Synchronous process spawning (git branch detection)
- `bun test` -- Test runner
- `bun build` -- Bundler
- `bun run` -- TypeScript execution without compilation

Node.js standard library modules are also used:
- `node:fs/promises` -- File system operations (in ACP client)
- `node:child_process` -- Process spawning (terminal creation)
- `node:stream` -- Stream utilities (Readable/Writable conversion for ACP)

---

## 9. How flitter-core Is Consumed by flitter-amp

### Import Surface Analysis

flitter-amp imports from **39 distinct modules** within flitter-core, spanning all major
subsystems. These can be grouped by usage category:

**Framework (4 modules):**
- `framework/widget` -- Widget, StatefulWidget, StatelessWidget, State, InheritedWidget, BuildContext
- `framework/binding` -- runApp, WidgetsBinding
- `framework/render-object` -- RenderBox (used in tests)
- `framework/element` -- not directly imported (used transitively)

**Core Types (5 modules):**
- `core/color` -- Color (the most frequently imported symbol)
- `core/text-style` -- TextStyle
- `core/text-span` -- TextSpan
- `core/box-constraints` -- BoxConstraints
- `core/types` -- Offset, Size
- `core/key` -- Key

**Widgets (17 modules):**
- `widgets/flex`, `widgets/flexible` -- Column, Row, Expanded
- `widgets/text`, `widgets/text-field` -- Text, RenderText, TextField, TextEditingController
- `widgets/padding`, `widgets/sized-box`, `widgets/center` -- Basic layout
- `widgets/container` -- Container
- `widgets/stack` -- Stack, Positioned
- `widgets/scroll-view`, `widgets/scroll-controller`, `widgets/scrollbar` -- Scrolling
- `widgets/focus-scope` -- FocusScope
- `widgets/selection-list` -- SelectionList, SelectionItem
- `widgets/markdown` -- Markdown
- `widgets/diff-view` -- DiffView
- `widgets/autocomplete` -- Autocomplete, AutocompleteTrigger
- `widgets/mouse-region` -- MouseRegion, MouseRegionEvent
- `widgets/sticky-header` -- StickyHeader
- `widgets/theme` -- Theme

**Layout (4 modules):**
- `layout/edge-insets` -- EdgeInsets
- `layout/render-decorated` -- BoxDecoration, Border, BorderSide
- `layout/render-flex` -- RenderFlex (tests only)
- `layout/parent-data` -- FlexParentData (tests only)

**Input (1 module):**
- `input/events` -- KeyEvent, KeyEventResult, MouseEvent types

**Terminal (2 modules):**
- `terminal/cell` -- Cell, EMPTY_CELL, CellStyle (test utilities)
- `terminal/screen-buffer` -- Buffer type (test utilities)

**Scheduler (2 modules):**
- `scheduler/frame-scheduler` -- FrameScheduler (test utilities)
- `scheduler/paint-context` -- PaintContext type (tests)

**Utilities (1 module):**
- `utilities/braille-spinner` -- BrailleSpinner (tool header animation)

### Why Deep Imports Instead of the Barrel?

The barrel (`flitter-core/src/index.ts`) exports approximately 100 symbols, which covers
most of what flitter-amp needs. However, several critical imports are **not** in the barrel:

1. `runApp`, `WidgetsBinding` from `framework/binding` -- the application bootstrap
2. `BoxDecoration`, `Border`, `BorderSide` from `layout/render-decorated` -- styling
3. `TextField`, `TextEditingController` from `widgets/text-field` -- text input
4. `SingleChildScrollView` from `widgets/scroll-view` -- scrolling
5. `ScrollController` from `widgets/scroll-controller` -- scroll state
6. `Container` from `widgets/container` -- basic container
7. `Center` from `widgets/center` -- centering widget

Since these critical types are missing from the barrel, flitter-amp must use deep imports
for at least some modules. Rather than mixing barrel and deep imports, the codebase
consistently uses deep imports everywhere, resulting in a uniform import pattern.

### Bootstrap Flow

The consumption pattern follows a clear lifecycle:

1. `src/index.ts` calls `startTUI(appState, onSubmit, onCancel)`
2. `src/app.ts` calls `runApp(widget, options)` imported from `flitter-core/src/framework/binding`
3. `runApp` creates a `WidgetsBinding` singleton that owns the entire framework pipeline
4. The `App` widget (extending `StatefulWidget`) builds the widget tree using flitter-core widgets
5. `AppState` implements `ClientCallbacks` and bridges ACP events to `setState()` calls

---

## 10. Code Organization Patterns and Observations

### Flutter Architectural Fidelity

flitter-core faithfully reproduces Flutter's **three-tree architecture**:
- **Widget tree** -- Immutable configuration objects (`Widget`, `StatelessWidget`, `StatefulWidget`)
- **Element tree** -- Mutable objects that manage widget lifecycle (`Element`, `StatelessElement`)
- **RenderObject tree** -- Layout and painting (`RenderBox`, `RenderFlex`)

The CLAUDE.md documents extensive cross-referencing with a reverse-engineered Amp binary,
mapping minified identifiers to framework classes (e.g., `Sf -> Widget`, `J3 -> WidgetsBinding`,
`c9 -> FrameScheduler`). This is not merely inspired by Flutter -- it is a deliberate
reproduction of a specific TUI framework extracted from the Amp CLI binary.

### State Management Pattern

flitter-amp uses a **manual observer pattern** for state management rather than a reactive
framework:

```typescript
class AppState {
  private listeners: Set<StateListener> = new Set();
  addListener(listener: StateListener): void { ... }
  removeListener(listener: StateListener): void { ... }
  private notifyListeners(): void { ... }
}
```

Widgets subscribe to `AppState` changes in `initState()` and trigger `setState(() => {})`
to schedule rebuilds. This mirrors Flutter's `Listenable`/`ChangeNotifier` pattern. A 50ms
throttle is applied during streaming to prevent excessive rebuilds.

### Widget Composition Pattern

All flitter-amp widgets follow the same structure:

1. Extend `StatelessWidget` or `StatefulWidget` from flitter-core
2. Accept configuration via constructor options
3. Build their subtree by composing flitter-core primitives (Column, Row, Text, Padding, etc.)
4. Use `AmpThemeProvider.of(context)` for theming (an InheritedWidget pattern)

Example from `chat-view.ts`:
```typescript
import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Column, Row } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
// ... build() returns a Column of Text/Padding/SizedBox etc.
```

### Theme System

flitter-amp implements its own theme system (`AmpThemeProvider`) as an `InheritedWidget`
that wraps flitter-core's `InheritedWidget` base class. This propagates an `AmpTheme` object
(containing `AmpBaseTheme` base colors + `AmpAppColors` semantic colors) down the widget tree.
Seven built-in themes are provided: dark, light, catppuccin-mocha, solarized-dark,
solarized-light, gruvbox-dark, and nord.

### Test Infrastructure

flitter-amp includes a sophisticated visual testing system:
- **SVG snapshots** -- 26 snapshot files capture terminal screen output as SVG images
- **Grid helpers** -- Cell-level assertion utilities for verifying rendered output
- **Termshot** -- Converts screen buffer state to SVG for visual comparison
- **tmux harness** -- Integration test infrastructure for full terminal emulation

Tests access flitter-core internals (`FrameScheduler`, `WidgetsBinding`, `RenderBox`,
`RenderFlex`, etc.) for deep integration testing, which is another reason deep imports are
used instead of the barrel.

### Separation of Concerns

The two packages have a clean separation:

- **flitter-core** is a **general-purpose TUI framework** with no awareness of ACP, agents,
  or any specific application. It provides widgets, layout, rendering, and input handling.
- **flitter-amp** is a **specific application** built on flitter-core. It handles ACP protocol
  communication, application state, and composes flitter-core widgets into an Amp-like UI.

The only coupling point is the import boundary -- flitter-amp depends on flitter-core's
internal file structure rather than a stable public API. This is acceptable for a monorepo
where both packages evolve together, but would be a maintenance risk if flitter-core were
published as an independent package.

### Scale Comparison

| Metric | flitter-core | flitter-amp | Ratio |
|--------|-------------|-------------|-------|
| Source files (non-test) | ~95 | ~40 | 2.4:1 |
| Lines of code | ~25,600 | ~7,600 | 3.4:1 |
| Largest file | text-field.ts (1,140 lines) | app.ts (372 lines) | 3.1:1 |
| Subdirectories | 10 | 7 | 1.4:1 |
| Runtime dependencies | 0 | 2 | -- |

The framework (flitter-core) is roughly 3.4x the size of the application (flitter-amp),
which is expected for a framework-plus-app architecture. The largest files in flitter-core
are the complex framework internals (element reconciliation, text editing, markdown rendering),
while flitter-amp files are generally smaller as they primarily compose existing widgets.
