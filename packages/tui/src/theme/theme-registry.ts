/**
 * Theme registry — manages built-in and custom theme lookup.
 *
 * Provides a central registry for theme specs. Custom themes override
 * built-in themes of the same name. Fallback is always the terminal theme.
 *
 * 逆向: modules/2652_unknown_yp.js — zD0(name) lookup, KIT() getAll
 *       modules/1472_tail_anonymous.js:5660 — drT custom theme Map
 *
 * Amp's lookup logic (zD0):
 *   1. Check custom themes map (drT)
 *   2. Find in builtin array (qJT)
 *   3. Fallback to terminal theme (WJT)
 *
 * @module
 */

import {
  BUILTIN_THEMES,
  TERMINAL_THEME,
  type ThemeSpec,
} from "./builtin-themes.js";

/**
 * Central theme registry.
 *
 * Stores custom themes and provides unified lookup across both
 * custom and built-in themes.
 *
 * 逆向: drT (custom theme Map) + qJT (builtin array) at
 *       modules/1472_tail_anonymous.js:5660
 *       zD0() + KIT() at modules/2652_unknown_yp.js
 */
export class ThemeRegistry {
  /**
   * Custom themes map. Keyed by theme name.
   * 逆向: drT = new Map() at modules/1472_tail_anonymous.js:5660
   */
  private customThemes: Map<string, ThemeSpec> = new Map();

  /**
   * Register a custom theme.
   *
   * Custom themes override built-in themes of the same name.
   *
   * @param theme - Theme spec to register
   */
  registerCustom(theme: ThemeSpec): void {
    this.customThemes.set(theme.name, theme);
  }

  /**
   * Look up a theme by name.
   *
   * Lookup order (matching amp's zD0):
   *   1. Custom themes (drT.get)
   *   2. Built-in themes (qJT.find)
   *   3. null if not found
   *
   * 逆向: zD0(T) at modules/2652_unknown_yp.js:1-4
   *
   * @param name - Theme name to look up
   * @returns ThemeSpec or null if not found
   */
  get(name: string): ThemeSpec | null {
    return (
      this.customThemes.get(name) ??
      BUILTIN_THEMES.find((t) => t.name === name) ??
      null
    );
  }

  /**
   * Get all available themes (builtins + custom).
   *
   * 逆向: KIT() at modules/2652_unknown_yp.js:6-8
   *       return [...qJT, ...drT.values()]
   *
   * @returns Array of all theme specs
   */
  getAll(): ThemeSpec[] {
    return [...BUILTIN_THEMES, ...this.customThemes.values()];
  }

  /**
   * Get the default theme (terminal).
   *
   * 逆向: WJT is first in qJT array, used as fallback in zD0
   *
   * @returns The terminal theme spec
   */
  getDefault(): ThemeSpec {
    return TERMINAL_THEME;
  }
}
