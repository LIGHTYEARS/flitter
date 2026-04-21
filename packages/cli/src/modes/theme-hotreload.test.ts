/**
 * theme-hotreload.test.ts — Theme hot-reload function tests
 *
 * Tests the resolveThemeData function that maps theme names to ThemeData.
 *
 * 逆向: amp has reactive theme subscription that rebuilds the widget tree.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultThemeData, resolveThemeData } from "./interactive.js";

describe("resolveThemeData", () => {
  it("returns terminal theme for 'terminal' name", () => {
    const theme = resolveThemeData("terminal");
    assert.equal(theme.name, "terminal");
    assert.equal(theme.primary, defaultThemeData.primary);
  });

  it("returns dark theme with correct colors", () => {
    const theme = resolveThemeData("dark");
    assert.equal(theme.name, "dark");
    assert.equal(theme.primary, "#569cd6");
    assert.equal(theme.background, "#181818");
  });

  it("returns light theme with correct colors", () => {
    const theme = resolveThemeData("light");
    assert.equal(theme.name, "light");
    assert.equal(theme.primary, "#0451a5");
    assert.equal(theme.background, "#f5f5f5");
  });

  it("returns catppuccin theme", () => {
    const theme = resolveThemeData("catppuccin");
    assert.equal(theme.name, "catppuccin");
    assert.equal(theme.primary, "#cba6f7");
  });

  it("returns default theme for unknown name", () => {
    const theme = resolveThemeData("nonexistent");
    assert.equal(theme.name, "nonexistent");
    // Should fall back to default palette
    assert.equal(theme.primary, defaultThemeData.primary);
  });

  it("all themes have complete ThemeData fields", () => {
    const requiredFields = [
      "name",
      "primary",
      "secondary",
      "surface",
      "background",
      "error",
      "text",
      "mutedText",
      "border",
      "accent",
      "success",
      "warning",
    ];

    for (const themeName of ["terminal", "dark", "light", "catppuccin"]) {
      const theme = resolveThemeData(themeName);
      for (const field of requiredFields) {
        assert.ok(
          (theme as Record<string, string>)[field] !== undefined,
          `Theme '${themeName}' missing field '${field}'`,
        );
      }
    }
  });
});
