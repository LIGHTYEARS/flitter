# Analysis 15: Theme System -- AmpTheme, AmpThemeProvider, Theme, AppTheme

## Overview

The Flitter theme system operates as a three-tier architecture split across two packages. `flitter-core` provides two generic InheritedWidget-based theme providers (`Theme` and `AppTheme`), while `flitter-amp` defines the Amp CLI's specific theme structure (`AmpTheme`/`AmpThemeProvider`) with seven built-in color palettes. All three layers propagate color data down the widget tree via the InheritedWidget pattern and are accessed by descendants through the `of(context)` / `maybeOf(context)` static method convention.

---

## Layer 1: `Theme` (flitter-core -- `widgets/theme.ts`)

`Theme` is the base-level InheritedWidget (Amp reference: `w3` class) that supplies a `ThemeData` object holding 15 core UI colors: `primary`, `background`, `surface`, `text`, `textSecondary`, `success`, `error`, `warning`, `info`, `border`, `scrollbarThumb`, `scrollbarTrack`, `diffAdded`, `diffRemoved`, and `selectionBackground`. Every field is a `Color` instance.

`Theme.defaultTheme()` returns a palette using ANSI named colors (`Color.blue`, `Color.green`, `Color.red`, etc.) so the scheme adapts to the user's terminal emulator theme rather than forcing specific RGB values. The `defaultColor` sentinel is used heavily, meaning "inherit from the terminal's configured foreground/background."

Consumers call `Theme.of(context)` (throws if no ancestor exists) or `Theme.maybeOf(context)` (returns `undefined`). The `updateShouldNotify()` method performs a deep equality check across all 15 color fields via `themeDataEquals()`, ensuring descendants rebuild only when the color scheme actually changes.

Core-level widgets that consume `Theme` include `DiffView`, `Markdown`, and `CollapsibleDrawer`.

---

## Layer 2: `AppTheme` (flitter-core -- `widgets/app-theme.ts`)

`AppTheme` is a second, **distinct** InheritedWidget (Amp reference: `h8` class) that coexists alongside `Theme` in the widget tree. While `Theme` provides base UI colors, `AppTheme` carries application-specific configuration via `AppThemeData`, which bundles:

- **`syntaxHighlight: SyntaxHighlightConfig`** -- 13 token-type-to-color mappings: `keyword`, `string`, `comment`, `number`, `type`, `function`, `operator`, `punctuation`, `variable`, `property`, `tag`, `attribute`, and `default`. This is a superset of the 8-field `AmpSyntaxHighlight` defined in the Amp layer, adding `punctuation`, `property`, `tag`, `attribute`, and `default` for broader code rendering support.
- **`colors`** -- a compact 5-field record (`background`, `foreground`, `accent`, `muted`, `border`) for app-level styling.

`AppTheme.defaultTheme()` uses ANSI named colors identically to `Theme.defaultTheme()`. The `Markdown` widget's fenced code block renderer reads `AppTheme.maybeOf(context)` to colorize syntax tokens, and `DiffView` combines both `Theme.maybeOf` and `AppTheme.maybeOf` when rendering diffs.

---

## Layer 3: `AmpTheme` / `AmpThemeProvider` (flitter-amp -- `themes/`)

The Amp-specific layer introduces a richer, RGB true-color theme system organized as three TypeScript interfaces in `amp-theme-data.ts`:

### `AmpBaseTheme` (16 fields + nested syntax highlight)

The core palette defining 16 named colors plus an embedded `AmpSyntaxHighlight`:

| Category | Fields |
|----------|--------|
| **Surface** | `background`, `foreground`, `mutedForeground`, `border`, `selection`, `cursor` |
| **Semantic** | `primary`, `secondary`, `accent` |
| **Status** | `success`, `warning`, `info`, `destructive` |
| **Utility** | `copyHighlight`, `tableBorder` |
| **Meta** | `isLight: boolean` |
| **Syntax** | Nested `AmpSyntaxHighlight` with 8 token types: `keyword`, `string`, `number`, `comment`, `function`, `variable`, `type`, `operator` |

### `AmpAppColors` (22 fields)

Application-specific semantic colors derived deterministically from `AmpBaseTheme` by the `deriveAppColors()` function. These map base palette values to specific UI roles:

- **Tool states**: `toolName` (foreground), `toolSuccess` (success), `toolError` (destructive), `toolCancelled` (warning), `toolRunning` (info)
- **UI elements**: `fileReference` (primary), `command` (warning), `keybind` (info), `link` (primary), `recommendation` (info)
- **Mode indicators**: `shellMode` (info), `handoffMode` (secondary), `queueMode` (info), `smartModeColor` (conditional green), `rushModeColor` (conditional gold)
- **Diff rendering**: `diffAdded` (success), `diffRemoved` (destructive), `diffContext` (mutedForeground)
- **Scrollbar**: `scrollbarThumb` (foreground), `scrollbarTrack` (ANSI 256 color 8)
- **Other**: `userMessage` (success), `waiting` (warning)

The `smartModeColor` and `rushModeColor` are the only two fields that branch on `base.isLight`, providing separate light/dark variants (e.g., `rgb(0,255,136)` in dark mode vs `rgb(0,140,70)` in light mode for smart mode).

### `AmpTheme` (composite)

Simply `{ base: AmpBaseTheme; app: AmpAppColors }`. The `createAmpTheme(base)` factory function builds an `AmpTheme` by combining the provided base with its derived app colors.

### `AmpThemeProvider`

An InheritedWidget that wraps an `AmpTheme` and propagates it down the widget tree. It follows the identical pattern as `Theme` and `AppTheme`:

```typescript
// Mounting at the root (in app.ts):
new AmpThemeProvider({
  theme: createAmpTheme(darkBaseTheme),
  child: appRoot,
})

// Consuming in any descendant widget:
const theme = AmpThemeProvider.maybeOf(context);
const toolColor = theme?.app.toolSuccess;
const bgColor = theme?.base.background;
```

The `updateShouldNotify()` method performs exhaustive deep equality via `ampThemeEquals()`, which chains `ampBaseThemeEquals()` (comparing all 16 base colors plus all 8 syntax highlight colors) and `ampAppColorsEquals()` (comparing all 22 app colors). This totals 46 individual `Color.equals()` calls per notification check.

---

## Built-in Theme Registry

Seven themes are registered in `ampThemes: Record<string, AmpBaseTheme>`:

| Theme | `isLight` | Background | Notable Design |
|-------|-----------|------------|----------------|
| `dark` | false | `rgb(11,13,11)` | Default; near-black with green-tinted foreground `rgb(246,255,245)` |
| `light` | true | `rgb(250,250,248)` | Warm white; saturated semantic colors for contrast |
| `catppuccin-mocha` | false | `rgb(30,30,46)` | Pastel palette; purple-tinted dark background |
| `solarized-dark` | false | `rgb(0,43,54)` | Schoonover's blue-green dark palette |
| `solarized-light` | true | `rgb(253,246,227)` | Schoonover's warm cream light palette |
| `gruvbox-dark` | false | `rgb(29,32,33)` | Retro warm palette; yellow primary `rgb(250,189,47)` |
| `nord` | false | `rgb(46,52,64)` | Arctic blue-gray palette; muted pastels |

Selection is done by name (e.g., from CLI flags or configuration), and the entire `ampThemes` object is `Readonly<Record<string, AmpBaseTheme>>`.

---

## Widget Access Patterns

Across the `flitter-amp` codebase, the dominant pattern for theme consumption is `AmpThemeProvider.maybeOf(context)` (the safe, non-throwing variant), used in at least 15 widgets including `ChatView`, `InputArea`, `DiffCard`, `ToolHeader`, `ThinkingBlock`, `CommandPalette`, `PermissionDialog`, `FilePicker`, `PlanView`, `BottomGrid`, `DensityOrbWidget`, and multiple tool-specific widgets (`GrepTool`, `WebSearchTool`, `TodoListTool`).

The `maybeOf` preference over `of` (which throws) is deliberate: it allows widgets to gracefully fall back when no theme provider is mounted (e.g., during testing or when rendered in isolation), typically defaulting to hardcoded ANSI named colors.

The helper function `agentModeColor(mode, theme)` provides a focused convenience API, mapping agent mode strings (`"smart"`, `"rush"`) to their corresponding `AmpTheme` color.

---

## Color Scheme Design Philosophy

The system follows a clear layered derivation model:

1. **Base palette** (AmpBaseTheme) defines raw colors -- these are what theme authors configure. Each theme file is a single exported `const` with all RGB values specified explicitly.
2. **Semantic derivation** (deriveAppColors) maps base colors to UI-role-specific semantics automatically. Theme authors never need to specify `toolSuccess` or `keybind` directly; those are always derived from `success` and `info` respectively.
3. **Light/dark adaptation** is handled both at the base level (`isLight` flag) and in derivation logic (two conditional fields in `deriveAppColors`).
4. **Alpha channel** is used sparingly -- only in `selection` colors across all themes (e.g., `withAlpha(0.35)` for dark, `withAlpha(0.2)` for light).
5. **Dual resolution** is supported: flitter-core's `Theme`/`AppTheme` use ANSI named colors for terminal-adaptive rendering, while `AmpThemeProvider` uses precise RGB values for true-color terminals.

---

## Key File Paths

- `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/amp-theme-data.ts` -- Interface definitions: `AmpSyntaxHighlight`, `AmpBaseTheme`, `AmpAppColors`, `AmpTheme`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/index.ts` -- `AmpThemeProvider` InheritedWidget, `deriveAppColors()`, `createAmpTheme()`, `agentModeColor()`, theme registry
- `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/dark.ts` -- Default dark theme (RGB values from Amp binary)
- `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/light.ts` -- Light theme variant
- `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/catppuccin-mocha.ts` -- Catppuccin Mocha palette
- `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/solarized-dark.ts` -- Solarized Dark palette
- `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/solarized-light.ts` -- Solarized Light palette
- `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/gruvbox-dark.ts` -- Gruvbox Dark palette
- `/home/gem/workspace/flitter/packages/flitter-amp/src/themes/nord.ts` -- Nord palette
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/theme.ts` -- `Theme` InheritedWidget (Amp ref: `w3`), `ThemeData` interface
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/app-theme.ts` -- `AppTheme` InheritedWidget (Amp ref: `h8`), `AppThemeData`, `SyntaxHighlightConfig`
