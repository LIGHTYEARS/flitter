import { describe, expect, it } from 'bun:test';

import {
  cliThemes,
  deriveAppColors,
  createCliTheme,
  darkTheme,
  lightTheme,
  catppuccinMochaTheme,
  solarizedDarkTheme,
  solarizedLightTheme,
  gruvboxDarkTheme,
  nordTheme,
} from '../themes';
import type { CliBaseTheme, CliAppColors, CliTheme } from '../themes';

// ---------------------------------------------------------------------------
// Required base theme fields — every CliBaseTheme must have these
// ---------------------------------------------------------------------------

const BASE_THEME_FIELDS: (keyof CliBaseTheme)[] = [
  'background',
  'foreground',
  'mutedForeground',
  'border',
  'selection',
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'info',
  'destructive',
  'copyHighlight',
  'tableBorder',
  'cursor',
  'isLight',
  'syntaxHighlight',
];

const SYNTAX_FIELDS = [
  'keyword', 'string', 'number', 'comment',
  'function', 'variable', 'type', 'operator',
] as const;

// ---------------------------------------------------------------------------
// Theme registry
// ---------------------------------------------------------------------------

describe('cliThemes registry', () => {
  it('has exactly 7 themes', () => {
    expect(Object.keys(cliThemes).length).toBe(7);
  });

  it('contains all expected theme names', () => {
    const expected = [
      'dark', 'light', 'catppuccin-mocha',
      'solarized-dark', 'solarized-light', 'gruvbox-dark', 'nord',
    ];
    for (const name of expected) {
      expect(cliThemes[name]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Per-theme structural validation
// ---------------------------------------------------------------------------

describe('base theme structure', () => {
  const allThemes: [string, CliBaseTheme][] = [
    ['dark', darkTheme],
    ['light', lightTheme],
    ['catppuccin-mocha', catppuccinMochaTheme],
    ['solarized-dark', solarizedDarkTheme],
    ['solarized-light', solarizedLightTheme],
    ['gruvbox-dark', gruvboxDarkTheme],
    ['nord', nordTheme],
  ];

  for (const [name, theme] of allThemes) {
    it(`${name} has all required base fields`, () => {
      for (const field of BASE_THEME_FIELDS) {
        expect(theme[field]).toBeDefined();
      }
    });

    it(`${name} has all syntax highlight fields`, () => {
      for (const field of SYNTAX_FIELDS) {
        expect(theme.syntaxHighlight[field]).toBeDefined();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// isLight flag correctness
// ---------------------------------------------------------------------------

describe('isLight flag', () => {
  it('light theme has isLight=true', () => {
    expect(lightTheme.isLight).toBe(true);
  });

  it('solarized-light has isLight=true', () => {
    expect(solarizedLightTheme.isLight).toBe(true);
  });

  it('dark theme has isLight=false', () => {
    expect(darkTheme.isLight).toBe(false);
  });

  it('catppuccin-mocha has isLight=false', () => {
    expect(catppuccinMochaTheme.isLight).toBe(false);
  });

  it('solarized-dark has isLight=false', () => {
    expect(solarizedDarkTheme.isLight).toBe(false);
  });

  it('gruvbox-dark has isLight=false', () => {
    expect(gruvboxDarkTheme.isLight).toBe(false);
  });

  it('nord has isLight=false', () => {
    expect(nordTheme.isLight).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deriveAppColors
// ---------------------------------------------------------------------------

const APP_COLOR_FIELDS: (keyof CliAppColors)[] = [
  'toolRunning', 'toolSuccess', 'toolError', 'toolCancelled', 'toolName',
  'userMessage', 'assistantMessage', 'systemMessage',
  'codeBlock', 'inlineCode', 'syntaxHighlight',
  'fileReference', 'processing', 'waiting', 'completed', 'cancelled',
  'diffAdded', 'diffRemoved', 'diffChanged', 'diffContext',
  'smartModeColor', 'rushModeColor',
  'scrollbarThumb', 'scrollbarTrack', 'tableBorder',
  'selectionBackground', 'selectionForeground', 'selectedMessage',
];

describe('deriveAppColors', () => {
  it('produces valid CliAppColors from dark theme', () => {
    const colors = deriveAppColors(darkTheme);
    for (const field of APP_COLOR_FIELDS) {
      expect(colors[field]).toBeDefined();
    }
  });

  it('produces valid CliAppColors from light theme', () => {
    const colors = deriveAppColors(lightTheme);
    for (const field of APP_COLOR_FIELDS) {
      expect(colors[field]).toBeDefined();
    }
  });

  it('has syntax highlight sub-fields in app colors', () => {
    const colors = deriveAppColors(darkTheme);
    for (const field of SYNTAX_FIELDS) {
      expect(colors.syntaxHighlight[field]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// createCliTheme
// ---------------------------------------------------------------------------

describe('createCliTheme', () => {
  it('produces CliTheme with base and app', () => {
    const theme: CliTheme = createCliTheme(darkTheme);
    expect(theme.base).toBe(darkTheme);
    expect(theme.app).toBeDefined();
    expect(theme.app.toolRunning).toBeDefined();
  });

  it('works for every registered theme', () => {
    for (const [name, base] of Object.entries(cliThemes)) {
      const theme = createCliTheme(base);
      expect(theme.base).toBe(base);
      expect(theme.app.toolRunning).toBeDefined();
    }
  });
});
