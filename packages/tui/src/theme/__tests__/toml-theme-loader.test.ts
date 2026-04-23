/**
 * Tests for the TOML theme loader.
 *
 * Covers: hexToRgb, parseTomlSimple, parseThemeToml, scanThemeDirectory.
 *
 * 逆向: matches amp's theme schema at chunk-004.js:30053-30183
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  hexToRgb,
  parsedThemeToThemeSpec,
  parseThemeToml,
  parseTomlSimple,
  scanThemeDirectory,
} from "../toml-theme-loader.js";

// ════════════════════════════════════════════════════
//  hexToRgb
// ════════════════════════════════════════════════════

describe("hexToRgb", () => {
  test("parses #RRGGBB correctly", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("#1a2b3c")).toEqual({ r: 26, g: 43, b: 60 });
  });

  test("accepts #RRGGBBAA (alpha ignored)", () => {
    const result = hexToRgb("#ff000080");
    expect(result).toEqual({ r: 255, g: 0, b: 0 });
  });

  test("returns null for missing # prefix", () => {
    expect(hexToRgb("ff0000")).toBeNull();
    expect(hexToRgb("red")).toBeNull();
  });

  test("returns null for wrong length", () => {
    expect(hexToRgb("#fff")).toBeNull();
    expect(hexToRgb("#ff00")).toBeNull();
    expect(hexToRgb("#ff000000ff")).toBeNull();
  });

  test("returns null for non-hex characters", () => {
    expect(hexToRgb("#gggggg")).toBeNull();
    expect(hexToRgb("#zzzzzz")).toBeNull();
  });

  test("is case-insensitive", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#aAbBcC")).toEqual({ r: 170, g: 187, b: 204 });
  });
});

// ════════════════════════════════════════════════════
//  parseTomlSimple
// ════════════════════════════════════════════════════

describe("parseTomlSimple", () => {
  test("parses top-level string keys", () => {
    const toml = `name = "My Theme"\nmode = "dark"`;
    const result = parseTomlSimple(toml);
    expect(result.name).toBe("My Theme");
    expect(result.mode).toBe("dark");
  });

  test("parses [section] headers", () => {
    const toml = `
[colors]
background = "#1e1e2e"
foreground = "#cdd6f4"
`;
    const result = parseTomlSimple(toml) as Record<string, Record<string, string>>;
    expect(result.colors).toBeDefined();
    expect(result.colors.background).toBe("#1e1e2e");
    expect(result.colors.foreground).toBe("#cdd6f4");
  });

  test("parses multiple sections", () => {
    const toml = `
[colors]
background = "#1e1e2e"

[ui]
cursor = "#cdd6f4"

[syntax]
keyword = "#cba6f7"
`;
    const result = parseTomlSimple(toml) as Record<string, Record<string, string>>;
    expect(result.colors?.background).toBe("#1e1e2e");
    expect(result.ui?.cursor).toBe("#cdd6f4");
    expect(result.syntax?.keyword).toBe("#cba6f7");
  });

  test("strips # comments", () => {
    const toml = `
# This is a comment
name = "test" # inline comment
`;
    const result = parseTomlSimple(toml);
    expect(result.name).toBe("test");
  });

  test("handles empty lines and whitespace", () => {
    const toml = `
  name = "spaced"

  [colors]
  background = "#000000"
`;
    const result = parseTomlSimple(toml) as Record<string, Record<string, string>>;
    expect(result.name).toBe("spaced");
    expect(result.colors?.background).toBe("#000000");
  });

  test("ignores non-string values (no assignment for integers)", () => {
    const toml = `version = 1\nname = "valid"`;
    const result = parseTomlSimple(toml);
    // `version = 1` has no quotes → not stored
    expect(result.version).toBeUndefined();
    expect(result.name).toBe("valid");
  });
});

// ════════════════════════════════════════════════════
//  parseThemeToml
// ════════════════════════════════════════════════════

describe("parseThemeToml", () => {
  test("extracts required colors and defaults name from dirName", () => {
    const toml = `
[colors]
background = "#1e1e2e"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"
`;
    const result = parseThemeToml(toml, "test-theme");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("test-theme");
    expect(result!.colors.background).toEqual({ r: 30, g: 30, b: 46 });
    expect(result!.colors.foreground).toEqual({ r: 205, g: 214, b: 244 });
    expect(result!.colors.primary).toEqual({ r: 137, g: 180, b: 250 });
    expect(result!.mode).toBe("dark");
  });

  test("auto-detects dark mode from dark background", () => {
    const toml = `
[colors]
background = "#0d0d0d"
foreground = "#ffffff"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"
`;
    const result = parseThemeToml(toml, "dark-theme");
    expect(result!.mode).toBe("dark");
  });

  test("auto-detects light mode from light background", () => {
    const toml = `
[colors]
background = "#fafafa"
foreground = "#000000"
primary = "#0066cc"
success = "#008800"
warning = "#cc8800"
destructive = "#cc0000"
`;
    const result = parseThemeToml(toml, "light-theme");
    expect(result!.mode).toBe("light");
  });

  test("respects explicit mode = light override", () => {
    const toml = `
name = "My Light Theme"
mode = "light"

[colors]
background = "#ffffff"
foreground = "#000000"
primary = "#0066cc"
success = "#008800"
warning = "#cc8800"
destructive = "#cc0000"
`;
    const result = parseThemeToml(toml, "light-dir");
    expect(result!.name).toBe("My Light Theme");
    expect(result!.mode).toBe("light");
  });

  test("respects explicit mode = dark override for light background", () => {
    const toml = `
mode = "dark"

[colors]
background = "#fafafa"
foreground = "#000000"
primary = "#0066cc"
success = "#008800"
warning = "#cc8800"
destructive = "#cc0000"
`;
    const result = parseThemeToml(toml, "forced-dark");
    expect(result!.mode).toBe("dark");
  });

  test("uses name key from TOML over dirName", () => {
    const toml = `
name = "Catppuccin Mocha"

[colors]
background = "#1e1e2e"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"
`;
    const result = parseThemeToml(toml, "catppuccin-mocha");
    expect(result!.name).toBe("Catppuccin Mocha");
    expect(result!.dirName).toBe("catppuccin-mocha");
  });

  test("returns null when [colors] section is missing", () => {
    const toml = `name = "broken"\nbackground = "#1e1e2e"`;
    expect(parseThemeToml(toml, "broken")).toBeNull();
  });

  test("returns null when required color is missing", () => {
    const toml = `
[colors]
background = "#1e1e2e"
`;
    expect(parseThemeToml(toml, "incomplete")).toBeNull();
  });

  test("returns null when background is invalid hex", () => {
    const toml = `
[colors]
background = "not-a-color"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"
`;
    expect(parseThemeToml(toml, "bad-hex")).toBeNull();
  });

  test("parses optional secondary, accent, info colors", () => {
    const toml = `
[colors]
background = "#1e1e2e"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"
secondary = "#74c7ec"
accent = "#f5c2e7"
info = "#89dceb"
`;
    const result = parseThemeToml(toml, "full-theme");
    expect(result!.colors.secondary).toEqual({ r: 116, g: 199, b: 236 });
    expect(result!.colors.accent).toEqual({ r: 245, g: 194, b: 231 });
    expect(result!.colors.info).toEqual({ r: 137, g: 220, b: 235 });
  });

  test("parses [ui] section overrides", () => {
    const toml = `
[colors]
background = "#1e1e2e"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"

[ui]
muted_foreground = "#6c7086"
border = "#45475a"
cursor = "#f5e0dc"
selection = "#313244"
`;
    const result = parseThemeToml(toml, "theme-with-ui");
    expect(result!.ui).toBeDefined();
    expect(result!.ui!.mutedForeground).toEqual({ r: 108, g: 112, b: 134 });
    expect(result!.ui!.border).toEqual({ r: 69, g: 71, b: 90 });
    expect(result!.ui!.cursor).toEqual({ r: 245, g: 224, b: 220 });
    expect(result!.ui!.selection).toEqual({ r: 49, g: 50, b: 68 });
  });

  test("parses [syntax] section", () => {
    const toml = `
[colors]
background = "#1e1e2e"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"

[syntax]
keyword = "#cba6f7"
string = "#a6e3a1"
number = "#fab387"
`;
    const result = parseThemeToml(toml, "theme-syntax");
    expect(result!.syntax).toBeDefined();
    expect(result!.syntax!.keyword).toEqual({ r: 203, g: 166, b: 247 });
    expect(result!.syntax!.string).toEqual({ r: 166, g: 227, b: 161 });
    expect(result!.syntax!.number).toEqual({ r: 250, g: 179, b: 135 });
  });
});

// ════════════════════════════════════════════════════
//  parsedThemeToThemeSpec
// ════════════════════════════════════════════════════

describe("parsedThemeToThemeSpec", () => {
  const minimalParsedTheme = () =>
    parseThemeToml(
      `
[colors]
background = "#1e1e2e"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"
`,
      "test-dir",
    )!;

  test("produces ThemeSpec with dirName as registry key", () => {
    const parsed = { ...minimalParsedTheme(), path: "/themes/test-dir/colors.toml" };
    const spec = parsedThemeToThemeSpec(parsed);
    expect(spec.name).toBe("test-dir");
    expect(spec.label).toBe("test-dir"); // no name= key
    expect(spec.background).toBe("dark");
    expect(spec.source).toEqual({ type: "custom", path: "/themes/test-dir/colors.toml" });
  });

  test("produces callable buildPalette", () => {
    const parsed = { ...minimalParsedTheme(), path: "/themes/test-dir/colors.toml" };
    const spec = parsedThemeToThemeSpec(parsed);
    const palette = spec.buildPalette();
    expect(palette.background).toBeDefined();
    expect(palette.foreground).toBeDefined();
    expect(palette.isLight).toBe(false);
  });

  test("palette isLight=true for light theme", () => {
    const parsed = parseThemeToml(
      `
mode = "light"
[colors]
background = "#ffffff"
foreground = "#000000"
primary = "#0066cc"
success = "#008800"
warning = "#cc8800"
destructive = "#cc0000"
`,
      "light-dir",
    )!;
    const spec = parsedThemeToThemeSpec({ ...parsed, path: "/themes/light-dir/colors.toml" });
    expect(spec.background).toBe("light");
    const palette = spec.buildPalette();
    expect(palette.isLight).toBe(true);
  });

  test("palette derives secondary from primary when absent", () => {
    const parsed = { ...minimalParsedTheme(), path: "/themes/test-dir/colors.toml" };
    const spec = parsedThemeToThemeSpec(parsed);
    const palette = spec.buildPalette();
    // secondary should equal primary when not specified
    expect(palette.secondary.r).toBe(palette.primary.r);
    expect(palette.secondary.g).toBe(palette.primary.g);
    expect(palette.secondary.b).toBe(palette.primary.b);
  });
});

// ════════════════════════════════════════════════════
//  scanThemeDirectory
// ════════════════════════════════════════════════════

describe("scanThemeDirectory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-themes-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeTheme(name: string, toml: string) {
    const dir = path.join(tmpDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "colors.toml"), toml, "utf-8");
  }

  const validToml = `
[colors]
background = "#1e1e2e"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"
`;

  test("returns empty array for non-existent directory", () => {
    const result = scanThemeDirectory("/does-not-exist-9999");
    expect(result).toEqual([]);
  });

  test("returns empty array for empty directory", () => {
    const result = scanThemeDirectory(tmpDir);
    expect(result).toEqual([]);
  });

  test("skips non-directory entries", () => {
    fs.writeFileSync(path.join(tmpDir, "not-a-dir.toml"), validToml, "utf-8");
    const result = scanThemeDirectory(tmpDir);
    expect(result).toEqual([]);
  });

  test("skips directories without colors.toml", () => {
    const dir = path.join(tmpDir, "no-toml");
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "readme.txt"), "no colors here", "utf-8");
    const result = scanThemeDirectory(tmpDir);
    expect(result).toEqual([]);
  });

  test("loads a single valid theme", () => {
    writeTheme("my-theme", validToml);
    const result = scanThemeDirectory(tmpDir);
    expect(result.length).toBe(1);
    expect(result[0].dirName).toBe("my-theme");
    expect(result[0].path).toBe(path.join(tmpDir, "my-theme", "colors.toml"));
  });

  test("loads multiple themes", () => {
    writeTheme("theme-a", validToml);
    writeTheme("theme-b", validToml);
    const result = scanThemeDirectory(tmpDir);
    expect(result.length).toBe(2);
    const names = result.map((t) => t.dirName).sort();
    expect(names).toEqual(["theme-a", "theme-b"]);
  });

  test("skips invalid theme (missing required fields)", () => {
    writeTheme("valid", validToml);
    writeTheme("invalid", `[colors]\nbackground = "#1e1e2e"`);
    const result = scanThemeDirectory(tmpDir);
    expect(result.length).toBe(1);
    expect(result[0].dirName).toBe("valid");
  });

  test("path field is set to absolute colors.toml path", () => {
    writeTheme("themed", validToml);
    const result = scanThemeDirectory(tmpDir);
    expect(result[0].path).toBe(path.join(tmpDir, "themed", "colors.toml"));
  });
});
