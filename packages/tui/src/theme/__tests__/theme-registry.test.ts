import { describe, expect, it } from "bun:test";
import { Color } from "../../screen/color.js";
import {
  BUILTIN_THEMES,
  CATPPUCCIN_MOCHA_THEME,
  DARK_THEME,
  GRUVBOX_DARK_HARD_THEME,
  LIGHT_THEME,
  NORD_THEME,
  SOLARIZED_DARK_THEME,
  SOLARIZED_LIGHT_THEME,
  TERMINAL_THEME,
} from "../builtin-themes.js";
import { ThemeRegistry } from "../theme-registry.js";

describe("ThemeRegistry", () => {
  it("should look up builtin theme by name", () => {
    const registry = new ThemeRegistry();
    const theme = registry.get("dark");
    expect(theme).not.toBeNull();
    expect(theme!.name).toBe("dark");
    expect(theme!.label).toBe("Dark");
    expect(theme!.background).toBe("dark");
  });

  it("should look up all 8 builtin themes by name", () => {
    const registry = new ThemeRegistry();
    const names = [
      "terminal",
      "dark",
      "light",
      "catppuccin-mocha",
      "solarized-dark",
      "solarized-light",
      "gruvbox-dark-hard",
      "nord",
    ];
    for (const name of names) {
      const theme = registry.get(name);
      expect(theme).not.toBeNull();
      expect(theme!.name).toBe(name);
    }
  });

  it("should return null for unknown theme name", () => {
    const registry = new ThemeRegistry();
    expect(registry.get("nonexistent")).toBeNull();
  });

  it("should register and look up custom theme", () => {
    const registry = new ThemeRegistry();
    const customPalette = DARK_THEME.buildPalette();
    registry.registerCustom({
      name: "my-custom",
      label: "My Custom Theme",
      background: "dark",
      buildPalette: () => customPalette,
      source: { type: "custom", path: "/themes/my-custom/colors.toml" },
    });

    const theme = registry.get("my-custom");
    expect(theme).not.toBeNull();
    expect(theme!.name).toBe("my-custom");
    expect(theme!.label).toBe("My Custom Theme");
    expect(theme!.source).toEqual({
      type: "custom",
      path: "/themes/my-custom/colors.toml",
    });
  });

  it("should let custom theme override builtin of same name", () => {
    const registry = new ThemeRegistry();
    const customPalette = LIGHT_THEME.buildPalette();
    registry.registerCustom({
      name: "dark",
      label: "Custom Dark Override",
      background: "dark",
      buildPalette: () => customPalette,
      source: { type: "custom", path: "/themes/dark/colors.toml" },
    });

    const theme = registry.get("dark");
    expect(theme).not.toBeNull();
    expect(theme!.label).toBe("Custom Dark Override");
    expect(theme!.source).toEqual({
      type: "custom",
      path: "/themes/dark/colors.toml",
    });
  });

  it("should return terminal theme as default", () => {
    const registry = new ThemeRegistry();
    const def = registry.getDefault();
    expect(def.name).toBe("terminal");
    expect(def).toBe(TERMINAL_THEME);
  });

  it("should include both builtin and custom themes in getAll()", () => {
    const registry = new ThemeRegistry();
    const customPalette = DARK_THEME.buildPalette();
    registry.registerCustom({
      name: "my-theme",
      label: "My Theme",
      background: "dark",
      buildPalette: () => customPalette,
      source: { type: "custom", path: "/themes/my-theme/colors.toml" },
    });

    const all = registry.getAll();
    // 8 builtins + 1 custom
    expect(all.length).toBe(9);

    const names = all.map((t) => t.name);
    expect(names).toContain("terminal");
    expect(names).toContain("dark");
    expect(names).toContain("light");
    expect(names).toContain("catppuccin-mocha");
    expect(names).toContain("my-theme");
  });
});

describe("BUILTIN_THEMES", () => {
  it("should have exactly 8 themes", () => {
    expect(BUILTIN_THEMES.length).toBe(8);
  });

  it("should have themes in amp's canonical order", () => {
    // 逆向: qJT = [WJT, DD0, wD0, BD0, ND0, UD0, HD0, WD0]
    expect(BUILTIN_THEMES[0]).toBe(TERMINAL_THEME);
    expect(BUILTIN_THEMES[1]).toBe(DARK_THEME);
    expect(BUILTIN_THEMES[2]).toBe(LIGHT_THEME);
    expect(BUILTIN_THEMES[3]).toBe(CATPPUCCIN_MOCHA_THEME);
    expect(BUILTIN_THEMES[4]).toBe(SOLARIZED_DARK_THEME);
    expect(BUILTIN_THEMES[5]).toBe(SOLARIZED_LIGHT_THEME);
    expect(BUILTIN_THEMES[6]).toBe(GRUVBOX_DARK_HARD_THEME);
    expect(BUILTIN_THEMES[7]).toBe(NORD_THEME);
  });

  it("should have unique names", () => {
    const names = BUILTIN_THEMES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("should all have builtin source type", () => {
    for (const theme of BUILTIN_THEMES) {
      expect(theme.source).toEqual({ type: "builtin" });
    }
  });
});

describe("Theme palette color values", () => {
  it("dark theme should have exact amp RGB values", () => {
    // 逆向: UIT at modules/1472_tail_anonymous.js:5388
    const palette = DARK_THEME.buildPalette();
    expect(palette.background.equals(Color.rgb(11, 13, 11))).toBe(true);
    expect(palette.foreground.equals(Color.rgb(246, 255, 245))).toBe(true);
    expect(palette.primary.equals(Color.rgb(27, 135, 243))).toBe(true);
    expect(palette.isLight).toBe(false);
  });

  it("light theme should have exact amp RGB values", () => {
    // 逆向: HIT at modules/1472_tail_anonymous.js:5414
    const palette = LIGHT_THEME.buildPalette();
    expect(palette.background.equals(Color.rgb(250, 250, 248))).toBe(true);
    expect(palette.foreground.equals(Color.rgb(11, 13, 11))).toBe(true);
    expect(palette.primary.equals(Color.rgb(11, 115, 218))).toBe(true);
    expect(palette.isLight).toBe(true);
  });

  it("catppuccin-mocha should have exact amp RGB values", () => {
    // 逆向: WIT at modules/1472_tail_anonymous.js:5441
    const palette = CATPPUCCIN_MOCHA_THEME.buildPalette();
    expect(palette.background.equals(Color.rgb(30, 30, 46))).toBe(true);
    expect(palette.foreground.equals(Color.rgb(205, 214, 244))).toBe(true);
    expect(palette.primary.equals(Color.rgb(137, 180, 250))).toBe(true);
    expect(palette.isLight).toBe(false);
    // Check syntax highlighting too
    expect(
      palette.syntaxHighlight.keyword.equals(Color.rgb(203, 166, 247)),
    ).toBe(true);
  });

  it("solarized-dark should have exact amp RGB values", () => {
    // 逆向: qIT
    const palette = SOLARIZED_DARK_THEME.buildPalette();
    expect(palette.background.equals(Color.rgb(0, 43, 54))).toBe(true);
    expect(palette.isLight).toBe(false);
  });

  it("solarized-light should have isLight true", () => {
    const palette = SOLARIZED_LIGHT_THEME.buildPalette();
    expect(palette.isLight).toBe(true);
    expect(palette.background.equals(Color.rgb(253, 246, 227))).toBe(true);
  });

  it("gruvbox-dark-hard should have exact amp RGB values", () => {
    // 逆向: FIT
    const palette = GRUVBOX_DARK_HARD_THEME.buildPalette();
    expect(palette.background.equals(Color.rgb(29, 32, 33))).toBe(true);
    expect(palette.primary.equals(Color.rgb(250, 189, 47))).toBe(true);
    expect(palette.isLight).toBe(false);
  });

  it("nord should have exact amp RGB values", () => {
    // 逆向: GIT
    const palette = NORD_THEME.buildPalette();
    expect(palette.background.equals(Color.rgb(46, 52, 64))).toBe(true);
    expect(palette.primary.equals(Color.rgb(136, 192, 208))).toBe(true);
    expect(palette.isLight).toBe(false);
  });

  it("every theme palette should have all required fields", () => {
    for (const theme of BUILTIN_THEMES) {
      const p = theme.buildPalette();
      expect(p.background).toBeDefined();
      expect(p.foreground).toBeDefined();
      expect(p.mutedForeground).toBeDefined();
      expect(p.border).toBeDefined();
      expect(p.selection).toBeDefined();
      expect(p.primary).toBeDefined();
      expect(p.secondary).toBeDefined();
      expect(p.accent).toBeDefined();
      expect(p.success).toBeDefined();
      expect(p.warning).toBeDefined();
      expect(p.info).toBeDefined();
      expect(p.destructive).toBeDefined();
      expect(p.copyHighlight).toBeDefined();
      expect(p.tableBorder).toBeDefined();
      expect(p.cursor).toBeDefined();
      expect(typeof p.isLight).toBe("boolean");
      expect(p.syntaxHighlight).toBeDefined();
      expect(p.syntaxHighlight.keyword).toBeDefined();
      expect(p.syntaxHighlight.string).toBeDefined();
      expect(p.syntaxHighlight.number).toBeDefined();
      expect(p.syntaxHighlight.comment).toBeDefined();
      expect(p.syntaxHighlight.function).toBeDefined();
      expect(p.syntaxHighlight.variable).toBeDefined();
      expect(p.syntaxHighlight.type).toBeDefined();
      expect(p.syntaxHighlight.operator).toBeDefined();
    }
  });
});
