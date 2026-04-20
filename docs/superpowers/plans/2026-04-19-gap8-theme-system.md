# Gap 8: Theme System

> Implementation plan for named theme switching and custom theme loading.

## Overview

Flitter currently has a single hardcoded theme (catppuccin mocha values). Amp ships 8 built-in themes and supports custom themes loaded from TOML files. This plan adds the full theme system.

## Amp Reference

| Component | File | Key logic |
|---|---|---|
| 8 built-in themes | `modules/1472_tail_anonymous.js:5379-5660` | `WJT` through `WD0` |
| Theme color properties | `modules/2179_unknown_yS.js` | `class yS` — 45 named color props |
| Custom theme loading | `modules/2667_unknown_s70.js` → `2668_unknown_o70.js` | Scan dirs, parse TOML |
| TOML parser | `modules/2666_unknown_i70.js` | `i70()` — inline TOML parser |
| Theme validation | `modules/2669_unknown_n70.js` | `n70()` — required fields check |
| Palette → theme conversion | `modules/2671_unknown_A70.js` | `A70()` — normalize palette |
| Theme controller | `modules/2654_unknown_zJT.js` | `class zJT` — selection + switch |
| Theme registration | `modules/2651_unknown_qD0.js` | `qD0()` — custom theme Map |
| Theme lookup | `modules/2652_unknown_yp.js` | `zD0(name)` — builtin + custom |

## Current Flitter State

**`packages/tui/src/screen/color.ts`** — Low-level `Color` class (rgb, indexed, named). No theme.

**`packages/cli/src/widgets/theme-controller.ts`** — `ThemeController` InheritedWidget that propagates a `ThemeData` object down the widget tree.

The existing `ThemeData` interface needs to be discovered and expanded.

---

## Design

### Color Palette Structure

**New file:** `packages/tui/src/theme/palette.ts`

```typescript
import { Color } from "../screen/color";

export interface SyntaxHighlightColors {
  keyword: Color;
  string: Color;
  number: Color;
  comment: Color;
  function: Color;
  variable: Color;
  type: Color;
  operator: Color;
}

export interface ColorPalette {
  background: Color;
  foreground: Color;
  mutedForeground: Color;
  border: Color;
  selection: Color;
  primary: Color;
  secondary: Color;
  accent: Color;
  success: Color;
  warning: Color;
  info: Color;
  destructive: Color;
  copyHighlight: Color;
  tableBorder: Color;
  cursor: Color;
  isLight: boolean;
  syntaxHighlight: SyntaxHighlightColors;
}
```

### Built-in Themes

**New file:** `packages/tui/src/theme/builtin-themes.ts`

Define all 8 themes. Each theme has a `name`, `label`, `background` (dark/light), and a `ColorPalette`.

```typescript
export interface ThemeSpec {
  name: string;
  label: string;
  background: "dark" | "light" | "dynamic";
  buildPalette: (terminalColors?: TerminalRGBColors) => ColorPalette;
  source: { type: "builtin" } | { type: "custom"; path: string };
}

// Terminal theme (special: reads actual terminal colors)
export const TERMINAL_THEME: ThemeSpec = {
  name: "terminal",
  label: "Terminal",
  background: "dynamic",
  buildPalette: (tc) => tc ? buildPaletteFromRGB(tc) : DEFAULT_DARK_PALETTE,
  source: { type: "builtin" },
};

// Dark theme
export const DARK_THEME: ThemeSpec = {
  name: "dark",
  label: "Dark",
  background: "dark",
  buildPalette: () => ({
    background: Color.rgb(30, 30, 30),
    foreground: Color.rgb(212, 212, 212),
    mutedForeground: Color.rgb(128, 128, 128),
    primary: Color.rgb(86, 156, 214),
    // ... full palette from amp's UIT
  }),
  source: { type: "builtin" },
};

// Catppuccin Mocha
export const CATPPUCCIN_MOCHA_THEME: ThemeSpec = { ... };

// Solarized Dark
export const SOLARIZED_DARK_THEME: ThemeSpec = { ... };

// Solarized Light
export const SOLARIZED_LIGHT_THEME: ThemeSpec = { ... };

// Light
export const LIGHT_THEME: ThemeSpec = { ... };

// Gruvbox Dark Hard
export const GRUVBOX_DARK_HARD_THEME: ThemeSpec = { ... };

// Nord
export const NORD_THEME: ThemeSpec = { ... };

export const BUILTIN_THEMES: ThemeSpec[] = [
  TERMINAL_THEME, DARK_THEME, LIGHT_THEME,
  CATPPUCCIN_MOCHA_THEME, SOLARIZED_DARK_THEME, SOLARIZED_LIGHT_THEME,
  GRUVBOX_DARK_HARD_THEME, NORD_THEME,
];
```

**Color values:** Extract exact RGB values from amp reference (`UIT`, `HIT`, `WIT`, `qIT`, `zIT`, `FIT`, `GIT` objects at `modules/1472_tail_anonymous.js:5379-5660`).

### App-Level Theme Colors

**New file:** `packages/tui/src/theme/app-theme.ts`

Map palette to application-specific semantic colors (amp's `yS` class):

```typescript
export interface AppThemeColors {
  // Tool states
  toolRunning: Color;
  toolSuccess: Color;
  toolError: Color;

  // Diff
  diffAdded: Color;
  diffRemoved: Color;
  diffContext: Color;

  // Mode indicators
  smartModeColor: Color;
  fastModeColor: Color;
  deepModeColor: Color;

  // UI elements
  selectionBackground: Color;
  statusBarBackground: Color;
  inputBorder: Color;
  // ... etc
}

export function buildAppTheme(palette: ColorPalette): AppThemeColors {
  return {
    toolRunning: palette.primary,
    toolSuccess: palette.success,
    toolError: palette.destructive,
    diffAdded: palette.success,
    diffRemoved: palette.destructive,
    diffContext: palette.mutedForeground,
    smartModeColor: palette.primary,
    fastModeColor: palette.warning,
    deepModeColor: palette.accent,
    selectionBackground: palette.selection,
    statusBarBackground: palette.border,
    inputBorder: palette.border,
  };
}
```

### Custom Theme Loading

**New file:** `packages/tui/src/theme/custom-theme-loader.ts`

```typescript
import { parse as parseTOML } from "./toml-parser";

export async function loadCustomThemes(configDir: string): Promise<ThemeSpec[]> {
  const themesDir = join(configDir, "themes");
  if (!fs.existsSync(themesDir)) return [];

  const themes: ThemeSpec[] = [];
  for (const dir of fs.readdirSync(themesDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const colorsPath = join(themesDir, dir.name, "colors.toml");
    if (!fs.existsSync(colorsPath)) continue;

    try {
      const toml = fs.readFileSync(colorsPath, "utf-8");
      const parsed = parseTOML(toml);
      const validated = validateThemeTOML(parsed, dir.name);
      themes.push(tomlToThemeSpec(validated, dir.name, colorsPath));
    } catch (e) {
      logger.warn(`Failed to load custom theme "${dir.name}": ${e}`);
    }
  }
  return themes;
}

function validateThemeTOML(parsed: Record<string, unknown>, name: string): void {
  const required = ["background", "foreground", "primary", "success", "warning", "destructive"];
  const colors = parsed.colors as Record<string, string> | undefined;
  if (!colors) throw new Error(`Theme "${name}" missing [colors] section`);
  for (const key of required) {
    if (!colors[key]) throw new Error(`Theme "${name}" missing color: ${key}`);
  }
}
```

**TOML format:**
```toml
[colors]
mode = "dark"
background = "#1e1e2e"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#fab387"
destructive = "#f38ba8"

[colors.ui]
muted_foreground = "#6c7086"
border = "#313244"
selection = "#45475a"

[colors.syntax]
keyword = "#cba6f7"
string = "#a6e3a1"
number = "#fab387"
comment = "#6c7086"
```

**Amp ref:** `modules/2669_unknown_n70.js` — validates required fields; `modules/2671_unknown_A70.js` — normalizes palette.

### TOML Parser

**New file:** `packages/tui/src/theme/toml-parser.ts`

A minimal TOML parser supporting:
- Key-value pairs: `key = "value"`, `key = 123`, `key = true`
- Sections: `[section]`, `[section.subsection]`
- Comments: `# comment`
- String values: `"quoted"`, basic strings

This is much simpler than a full TOML spec — custom themes only use flat key-value pairs and sections. ~100 lines.

**Alternative:** Use a lightweight npm TOML package (e.g., `smol-toml`). But to minimize deps, inline a minimal parser.

**Amp ref:** `modules/2666_unknown_i70.js` — `i70()` inline TOML parser.

### Theme Registry

**New file:** `packages/tui/src/theme/theme-registry.ts`

```typescript
export class ThemeRegistry {
  private builtinThemes: ThemeSpec[] = BUILTIN_THEMES;
  private customThemes: Map<string, ThemeSpec> = new Map();

  registerCustom(theme: ThemeSpec): void {
    this.customThemes.set(theme.name, theme);
  }

  get(name: string): ThemeSpec | null {
    return this.customThemes.get(name)
      ?? this.builtinThemes.find(t => t.name === name)
      ?? null;
  }

  getAll(): ThemeSpec[] {
    return [...this.builtinThemes, ...this.customThemes.values()];
  }

  getDefault(): ThemeSpec {
    return TERMINAL_THEME;
  }
}
```

### ThemeController Enhancement

**File:** `packages/cli/src/widgets/theme-controller.ts`

Update to use the new theme system:
```typescript
class ThemeControllerState extends State<ThemeController> {
  private registry: ThemeRegistry;
  private currentThemeName: string;

  initState(): void {
    this.registry = new ThemeRegistry();
    // Load custom themes
    loadCustomThemes(this.widget.configDir).then(themes => {
      themes.forEach(t => this.registry.registerCustom(t));
    });
    this.currentThemeName = this.widget.initialTheme ?? "terminal";
  }

  setTheme(name: string): void {
    if (this.registry.get(name)) {
      this.currentThemeName = name;
      this.setState(() => {});
    }
  }

  build(context: BuildContext): Widget {
    const spec = this.registry.get(this.currentThemeName) ?? this.registry.getDefault();
    const palette = spec.buildPalette(this.widget.terminalColors);
    const appTheme = buildAppTheme(palette);
    return ThemeProvider({ theme: { palette, app: appTheme }, child: this.widget.child });
  }
}
```

---

## Implementation Tasks

### Task 1: Create palette and theme types
- `packages/tui/src/theme/palette.ts`
- `packages/tui/src/theme/app-theme.ts`

### Task 2: Define 8 built-in themes with exact amp colors
- `packages/tui/src/theme/builtin-themes.ts`
- Extract RGB values from amp reference modules

### Task 3: TOML parser (minimal)
- `packages/tui/src/theme/toml-parser.ts`

### Task 4: Custom theme loader
- `packages/tui/src/theme/custom-theme-loader.ts`
- Validate required fields
- Convert TOML → ColorPalette → ThemeSpec

### Task 5: Theme registry
- `packages/tui/src/theme/theme-registry.ts`

### Task 6: Update ThemeController widget
- `packages/cli/src/widgets/theme-controller.ts`
- Use ThemeRegistry, support live switching

### Task 7: Add `/theme` slash command
- `packages/cli/src/commands/slash-handlers.ts`
- `/theme [name]` — list themes or switch

### Task 8: Update all widgets to use theme colors
- Audit widgets that hardcode colors → use `ThemeProvider.of(context).palette.*`
- Priority: ConversationView, StatusBar, DiffWidget, ApprovalWidget

### Task 9: Tests
- ThemeRegistry: lookup builtin, register custom, fallback
- TOML parser: valid files, missing fields, malformed
- Custom loader: temp dir with theme TOML files

---

## Estimated Scope

| Task | Files | Complexity |
|---|---|---|
| Palette + app theme types | 2 new | Low |
| 8 built-in themes | 1 new (large) | Medium |
| TOML parser | 1 new | Medium |
| Custom theme loader | 1 new | Medium |
| Theme registry | 1 new | Low |
| ThemeController update | 1 modified | Medium |
| Slash command | 1 modified | Low |
| Widget color audit | 5-10 modified | Medium |
| Tests | 3-4 new | Medium |
