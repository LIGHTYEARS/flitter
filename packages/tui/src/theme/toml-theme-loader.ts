/**
 * Custom TOML theme loader.
 *
 * Discovers and loads user themes from ~/.config/flitter/themes/{name}/colors.toml.
 * Each sub-directory represents one theme; the directory name is used as the
 * theme identifier when no `name` key is present in the file.
 *
 * The loader is intentionally minimal:
 *  - Only handles the subset of TOML required for theme files (strings, sections)
 *  - No arrays, inline tables, multi-line strings, or numbers
 *  - Matches amp's own minimal TOML parse (i70) that operates on the same schema
 *
 * After loading, each theme is converted to a flitter ThemeSpec and returned.
 * Callers (interactive.ts startup) register them in ThemeRegistry.
 *
 * 逆向: chunk-004.js:30053-30099 — c70/s70/o70/n70/YJT/l70/A70
 *       c70 → getThemesDir (XDG_CONFIG_HOME or ~/.config/amp/themes)
 *       s70 → scanThemeDirectory (readdir, filter directories, read colors.toml)
 *       o70 → loadThemeFile (readFile, parse, validate, build palette)
 *       n70 → validateRequired (checks background/foreground/primary/success/warning/destructive)
 *       YJT → hexToRgbRaw (parses #RRGGBB with optional alpha)
 *       l70 → luminance (0.299R + 0.587G + 0.114B / 255 for dark/light detection)
 *       A70 → buildPaletteFromToml (maps parsed fields to ColorPalette)
 *
 * @module
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Color } from "../screen/color.js";
import type { ThemeSpec } from "./builtin-themes.js";
import type { ColorPalette } from "./palette.js";

// ════════════════════════════════════════════════════
//  RgbColor — plain RGB triple for parsed intermediates
// ════════════════════════════════════════════════════

/**
 * Plain RGB color triple produced by the TOML loader.
 *
 * Used as the intermediate representation before conversion to flitter's
 * Color class. Matches the structure from amp's YJT / hexToRgb utility.
 */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

// ════════════════════════════════════════════════════
//  ParsedTheme — structured representation of a loaded theme file
// ════════════════════════════════════════════════════

/**
 * Structured representation of a loaded theme TOML file.
 *
 * This is the intermediate between raw TOML text and a ThemeSpec registered
 * in the ThemeRegistry. All required colors are guaranteed to be present;
 * optional colors default to derived values during ThemeSpec construction.
 *
 * 逆向: return value of o70() / the object pushed into the R array in s70()
 */
export interface ParsedTheme {
  /** Theme identifier (from `name` key or directory name) */
  name: string;
  /** Whether background is dark or light */
  mode: "dark" | "light";
  /** Required and optional semantic colors (as raw RGB) */
  colors: {
    background: RgbColor;
    foreground: RgbColor;
    primary: RgbColor;
    success: RgbColor;
    warning: RgbColor;
    destructive: RgbColor;
    secondary?: RgbColor;
    accent?: RgbColor;
    info?: RgbColor;
  };
  /** Optional UI-element color overrides */
  ui?: {
    mutedForeground?: RgbColor;
    border?: RgbColor;
    cursor?: RgbColor;
    selection?: RgbColor;
    copyHighlight?: RgbColor;
    tableBorder?: RgbColor;
  };
  /** Optional syntax highlighting color overrides */
  syntax?: Record<string, RgbColor>;
  /** Absolute path to the colors.toml that was loaded */
  path: string;
  /** Directory name (used as theme identifier when `name` is absent) */
  dirName: string;
}

// ════════════════════════════════════════════════════
//  Hex parsing
// ════════════════════════════════════════════════════

/**
 * Parse a #RRGGBB hex color string into an RgbColor.
 *
 * Returns null for invalid input (not starting with #, wrong length, NaN
 * components). Alpha suffix (#RRGGBBAA) is accepted but ignored.
 *
 * 逆向: YJT(T) at chunk-004.js:30108-30119
 *   - throws on bad input; we return null instead (friendlier for optional colors)
 *   - amp also supports 9-char #RRGGBBAA; we parse and discard the alpha
 *
 * @param hex - Color string, e.g. "#1e1e2e" or "#1e1e2eFF"
 * @returns RgbColor or null on parse error
 */
export function hexToRgb(hex: string): RgbColor | null {
  if (!hex.startsWith("#")) return null;
  // Accept #RRGGBB (7 chars) or #RRGGBBAA (9 chars)
  if (hex.length !== 7 && hex.length !== 9) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

// ════════════════════════════════════════════════════
//  Luminance (dark/light auto-detection)
// ════════════════════════════════════════════════════

/**
 * Compute perceptual luminance of a hex color (0.0–1.0).
 *
 * Uses the same ITU-R BT.601 coefficients as amp's l70():
 *   (0.299*R + 0.587*G + 0.114*B) / 255
 * Values > 0.5 indicate a light background.
 *
 * 逆向: l70(T) at chunk-004.js:30137-30143
 *
 * @param hex - #RRGGBB color string
 * @returns luminance 0.0–1.0, or 0 if unparseable
 */
function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

// ════════════════════════════════════════════════════
//  Minimal TOML parser
// ════════════════════════════════════════════════════

/**
 * Parse a minimal subset of TOML needed for theme color files.
 *
 * Handles:
 *  - Top-level key = "string value" pairs
 *  - [section] headers creating nested objects
 *  - Comments (# to end of line)
 *  - Quoted strings (double-quote only)
 *
 * Does NOT handle arrays, inline tables, multi-line strings, integers,
 * floats, booleans, or datetime. This is intentional — theme files only
 * use string values.
 *
 * 逆向: amp uses the smol-toml library (i70 is its parse() function at
 *   chunk-004.js:30009-30052). We implement only the subset needed by
 *   the theme schema rather than a full TOML parser.
 *
 * @param text - Raw TOML text content
 * @returns Parsed object with optional nested sections
 */
export function parseTomlSimple(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection: Record<string, unknown> = result;

  for (const rawLine of text.split("\n")) {
    // Strip inline comments and trim whitespace
    let line = rawLine;
    // Remove comments (but not inside strings)
    const commentIdx = line.indexOf("#");
    if (commentIdx !== -1) {
      // Check we're not inside a quoted string
      const beforeComment = line.slice(0, commentIdx);
      const quoteCount = (beforeComment.match(/"/g) ?? []).length;
      if (quoteCount % 2 === 0) {
        line = beforeComment;
      }
    }
    line = line.trim();
    if (!line) continue;

    // Section header: [section] or [section.subsection]
    if (line.startsWith("[") && !line.startsWith("[[")) {
      const end = line.indexOf("]");
      if (end === -1) continue;
      const sectionPath = line.slice(1, end).trim();
      const parts = sectionPath.split(".");
      let obj = result;
      for (const part of parts) {
        const key = part.trim();
        if (typeof obj[key] !== "object" || obj[key] === null) {
          obj[key] = {};
        }
        obj = obj[key] as Record<string, unknown>;
      }
      currentSection = obj;
      continue;
    }

    // Key = value pair
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const rawValue = line.slice(eqIdx + 1).trim();
    if (!key) continue;

    // Only handle double-quoted strings
    if (rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2) {
      const value = rawValue.slice(1, -1);
      currentSection[key] = value;
    }
  }

  return result;
}

// ════════════════════════════════════════════════════
//  TOML → ParsedTheme
// ════════════════════════════════════════════════════

/**
 * Parse the contents of a colors.toml file into a ParsedTheme.
 *
 * Validates that all required colors are present. Auto-detects dark/light
 * mode from background luminance unless `mode` is explicitly set in the file.
 *
 * 逆向: n70 (validation) + A70 (palette build) at chunk-004.js:30100-30183
 *   - n70 checks: [colors] section exists + required keys present
 *   - A70 reads mode, computes isLight, derives optional colors with fallbacks
 *
 * @param tomlText - Raw content of colors.toml
 * @param dirName - Directory name (used as theme name fallback)
 * @returns ParsedTheme or null if required fields are missing / invalid
 */
export function parseThemeToml(tomlText: string, dirName: string): ParsedTheme | null {
  const parsed = parseTomlSimple(tomlText);

  // ── Validate required fields (逆向: n70) ──────────────────
  const required = ["background", "foreground", "primary", "success", "warning", "destructive"];
  const missing: string[] = [];

  const colors = parsed.colors as Record<string, unknown> | undefined;
  if (!colors) {
    missing.push("[colors]");
  } else {
    for (const field of required) {
      if (!(field in colors)) missing.push(`colors.${field}`);
    }
  }

  if (missing.length > 0) {
    // Matches amp: `Theme "${R}" missing required fields: ${a.join(", ")}`
    return null;
  }

  // ── Parse required colors ──────────────────────────────────
  function parseRequired(section: Record<string, unknown>, key: string): RgbColor | null {
    const val = section[key];
    if (typeof val !== "string") return null;
    return hexToRgb(val);
  }

  function parseOptional(
    section: Record<string, unknown> | undefined,
    key: string,
  ): RgbColor | undefined {
    if (!section) return undefined;
    const val = section[key];
    if (typeof val !== "string") return undefined;
    return hexToRgb(val) ?? undefined;
  }

  const bgColor = parseRequired(colors!, "background");
  const fgColor = parseRequired(colors!, "foreground");
  const primaryColor = parseRequired(colors!, "primary");
  const successColor = parseRequired(colors!, "success");
  const warningColor = parseRequired(colors!, "warning");
  const destructiveColor = parseRequired(colors!, "destructive");

  if (
    !bgColor ||
    !fgColor ||
    !primaryColor ||
    !successColor ||
    !warningColor ||
    !destructiveColor
  ) {
    return null;
  }

  // ── Dark/light mode detection (逆向: A70 lines 30149-30151) ──
  // mode field can be "light" or "dark"; otherwise auto-detect from bg luminance.
  const modeField = typeof parsed.mode === "string" ? parsed.mode : undefined;
  let mode: "dark" | "light";
  if (modeField === "light") {
    mode = "light";
  } else if (modeField === "dark") {
    mode = "dark";
  } else {
    // Auto-detect: luminance > 0.5 → light (matches amp's l70 > 0.5 check)
    const bgHex = colors!.background as string;
    mode = luminance(bgHex) > 0.5 ? "light" : "dark";
  }

  // ── Parse optional colors ──────────────────────────────────
  const uiSection = parsed.ui as Record<string, unknown> | undefined;
  const syntaxSection = parsed.syntax as Record<string, unknown> | undefined;

  const ui: ParsedTheme["ui"] = {};
  const uiMutedForeground = parseOptional(uiSection, "muted_foreground");
  const uiBorder = parseOptional(uiSection, "border");
  const uiCursor = parseOptional(uiSection, "cursor");
  const uiSelection = parseOptional(uiSection, "selection");
  const uiCopyHighlight = parseOptional(uiSection, "copy_highlight");
  const uiTableBorder = parseOptional(uiSection, "table_border");

  if (uiMutedForeground) ui.mutedForeground = uiMutedForeground;
  if (uiBorder) ui.border = uiBorder;
  if (uiCursor) ui.cursor = uiCursor;
  if (uiSelection) ui.selection = uiSelection;
  if (uiCopyHighlight) ui.copyHighlight = uiCopyHighlight;
  if (uiTableBorder) ui.tableBorder = uiTableBorder;

  // ── Parse syntax section ──────────────────────────────────
  const syntax: Record<string, RgbColor> = {};
  if (syntaxSection) {
    for (const [k, v] of Object.entries(syntaxSection)) {
      if (typeof v === "string") {
        const rgb = hexToRgb(v);
        if (rgb) syntax[k] = rgb;
      }
    }
  }

  // ── Name (逆向: `name: e.name || R` in o70) ──────────────
  const name = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : dirName;

  return {
    name,
    mode,
    colors: {
      background: bgColor,
      foreground: fgColor,
      primary: primaryColor,
      success: successColor,
      warning: warningColor,
      destructive: destructiveColor,
      secondary: parseOptional(colors!, "secondary"),
      accent: parseOptional(colors!, "accent"),
      info: parseOptional(colors!, "info"),
    },
    ui: Object.keys(ui).length > 0 ? ui : undefined,
    syntax: Object.keys(syntax).length > 0 ? syntax : undefined,
    path: "", // filled in by scanThemeDirectory
    dirName,
  };
}

// ════════════════════════════════════════════════════
//  ParsedTheme → ThemeSpec (via ColorPalette)
// ════════════════════════════════════════════════════

/**
 * Convert an RgbColor to a flitter Color instance.
 *
 * 逆向: C3(T) at chunk-004.js:30121-30128 (calls YJT then LT.rgb)
 */
function toColor(rgb: RgbColor): Color {
  return Color.rgb(rgb.r, rgb.g, rgb.b);
}

/**
 * Apply an alpha multiplier to a Color by returning the same Color.
 *
 * Flitter's Color class does not support alpha, so alpha-derived fallbacks
 * are represented as-is. This mirrors amp's TL() which creates a new color
 * with an alpha property — we accept the limitation and use the base color.
 *
 * 逆向: TL(T, R) at chunk-004.js:30130-30135
 */
function withAlpha(color: Color, _alpha: number): Color {
  return color; // alpha not supported in flitter Color
}

/**
 * Build a ColorPalette from a ParsedTheme.
 *
 * Derives optional fields using the same fallback strategy as amp's A70():
 *   mutedForeground → ui.muted_foreground ?? foreground@0.6
 *   border          → ui.border          ?? foreground@0.4
 *   cursor          → ui.cursor          ?? foreground
 *   selection       → ui.selection       ?? border@0.3
 *   secondary       → colors.secondary   ?? primary
 *   accent          → colors.accent      ?? primary
 *   info            → colors.info        ?? primary
 *   copyHighlight   → ui.copy_highlight  ?? warning
 *   tableBorder     → ui.table_border    ?? border@0.4
 *
 * 逆向: A70(T) at chunk-004.js:30145-30183
 */
function buildPaletteFromParsed(theme: ParsedTheme): ColorPalette {
  const c = theme.colors;
  const ui = theme.ui ?? {};
  const syntax = theme.syntax ?? {};

  const fg = toColor(c.foreground);
  const primary = toColor(c.primary);
  const warning = toColor(c.warning);

  const mutedForeground = ui.mutedForeground ? toColor(ui.mutedForeground) : withAlpha(fg, 0.6);
  const border = ui.border ? toColor(ui.border) : withAlpha(fg, 0.4);

  return {
    background: toColor(c.background),
    foreground: fg,
    cursor: ui.cursor ? toColor(ui.cursor) : fg,
    mutedForeground,
    border,
    selection: ui.selection ? toColor(ui.selection) : withAlpha(border, 0.3),
    primary,
    secondary: c.secondary ? toColor(c.secondary) : primary,
    accent: c.accent ? toColor(c.accent) : primary,
    success: toColor(c.success),
    warning,
    info: c.info ? toColor(c.info) : primary,
    destructive: toColor(c.destructive),
    copyHighlight: (ui as ParsedTheme["ui"] & { copyHighlight?: RgbColor }).copyHighlight
      ? toColor((ui as ParsedTheme["ui"] & { copyHighlight?: RgbColor }).copyHighlight!)
      : warning,
    tableBorder: (ui as ParsedTheme["ui"] & { tableBorder?: RgbColor }).tableBorder
      ? toColor((ui as ParsedTheme["ui"] & { tableBorder?: RgbColor }).tableBorder!)
      : withAlpha(border, 0.4),
    isLight: theme.mode === "light",
    syntaxHighlight: {
      keyword: syntax.keyword ? toColor(syntax.keyword) : primary,
      string: syntax.string ? toColor(syntax.string) : toColor(c.success),
      number: syntax.number ? toColor(syntax.number) : warning,
      comment: syntax.comment ? toColor(syntax.comment) : mutedForeground,
      function: syntax.function ? toColor(syntax.function) : primary,
      variable: syntax.variable ? toColor(syntax.variable) : fg,
      type: syntax.type ? toColor(syntax.type) : warning,
      operator: syntax.operator ? toColor(syntax.operator) : fg,
    },
  };
}

/**
 * Convert a ParsedTheme to a ThemeSpec for registration in ThemeRegistry.
 *
 * 逆向: qD0(T, R, a, e) at chunk-004.js:29509-29524
 *   - T = dirName (used as key in drT map)
 *   - R = name (label)
 *   - a = palette
 *   - e = path
 *
 * Note: amp registers under dirName as the key; the `label` is the display name.
 * In flitter ThemeSpec, `name` is the lookup key and `label` is the display name.
 * We follow amp's convention: dirName is the registry key, name is the label.
 */
export function parsedThemeToThemeSpec(theme: ParsedTheme): ThemeSpec {
  const palette = buildPaletteFromParsed(theme);
  return {
    name: theme.dirName,
    label: theme.name,
    background: theme.mode,
    buildPalette: () => palette,
    source: { type: "custom", path: theme.path },
  };
}

// ════════════════════════════════════════════════════
//  Directory scanning
// ════════════════════════════════════════════════════

/**
 * Get the themes directory path.
 *
 * Uses XDG_CONFIG_HOME if set, otherwise ~/.config.
 * App-specific subdirectory: flitter/themes (amp uses amp/themes).
 *
 * 逆向: c70() at chunk-004.js:30053-30056
 *   Uses XDG_CONFIG_HOME || path.join(homedir(), ".config") + "/amp/themes"
 *   We replace "amp" with "flitter" for our app-specific path.
 *
 * @param overrideDir - Optional override (used in tests)
 * @returns Absolute path to the themes directory
 */
export function getThemesDir(overrideDir?: string): string {
  if (overrideDir) return overrideDir;
  const configHome = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(configHome, "flitter", "themes");
}

/**
 * Scan the themes directory and return all valid ParsedThemes.
 *
 * Each sub-directory that contains a colors.toml is treated as one theme.
 * Invalid or missing themes emit a warning to stderr (gated by FLITTER_DEBUG)
 * and are skipped — matching amp's non-fatal error handling in s70().
 *
 * 逆向: s70() at chunk-004.js:30057-30087
 *   - existsSync guard before readdir
 *   - for loop: isDirectory() + existsSync(colors.toml)
 *   - try/catch per theme: warn and continue on failure
 *
 * @param themesDir - Optional override for the themes directory path
 * @returns Array of successfully loaded ParsedThemes (may be empty)
 */
export function scanThemeDirectory(themesDir?: string): ParsedTheme[] {
  const dir = getThemesDir(themesDir);

  if (!fs.existsSync(dir)) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    if (process.env.FLITTER_DEBUG) {
      process.stderr.write(`[toml-theme-loader] Failed to read themes directory: ${dir}: ${e}\n`);
    }
    return [];
  }

  const themes: ParsedTheme[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const tomlPath = path.join(dir, entry.name, "colors.toml");
    if (!fs.existsSync(tomlPath)) continue;

    try {
      const text = fs.readFileSync(tomlPath, "utf-8");
      const parsed = parseThemeToml(text, entry.name);
      if (!parsed) {
        if (process.env.FLITTER_DEBUG) {
          process.stderr.write(
            `[toml-theme-loader] Theme "${entry.name}" failed validation (missing required fields)\n`,
          );
        }
        continue;
      }
      // Fill in path now that we know it
      themes.push({ ...parsed, path: tomlPath });
    } catch (e) {
      if (process.env.FLITTER_DEBUG) {
        process.stderr.write(
          `[toml-theme-loader] Failed to load custom theme "${entry.name}": ${e}\n`,
        );
      }
    }
  }

  return themes;
}
