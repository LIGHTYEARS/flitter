/**
 * Theme contract unit tests.
 *
 * These tests enforce that our theme types match the AMP reference token
 * inventory and that default app semantic mappings follow `x1.default()`.
 */

import { describe, test, expect } from 'bun:test';

import { Color } from 'flitter-core/src/core/color';

import { ampThemes, darkTheme, lightTheme, deriveAppColors } from '../themes';

const EXPECTED_APP_KEYS: string[] = [
  'toolRunning',
  'toolSuccess',
  'toolError',
  'toolCancelled',
  'toolName',
  'userMessage',
  'assistantMessage',
  'systemMessage',
  'codeBlock',
  'inlineCode',
  'syntaxHighlight',
  'fileReference',
  'processing',
  'waiting',
  'completed',
  'cancelled',
  'recommendation',
  'suggestion',
  'command',
  'filename',
  'keybind',
  'button',
  'link',
  'shellMode',
  'shellModeHidden',
  'handoffMode',
  'handoffModeDim',
  'queueMode',
  'diffAdded',
  'diffRemoved',
  'diffChanged',
  'diffContext',
  'ideConnected',
  'ideDisconnected',
  'ideWarning',
  'scrollbarThumb',
  'scrollbarTrack',
  'tableBorder',
  'selectionBackground',
  'selectionForeground',
  'selectedMessage',
  'smartModeColor',
  'rushModeColor',
  'threadGraphNode',
  'threadGraphNodeSelected',
  'threadGraphConnector',
];

function expectColorEqual(actual: Color, expected: Color): void {
  expect(actual.equals(expected)).toBe(true);
}

describe('Theme contract', () => {
  test('all built-in base themes expose required fields', () => {
    for (const [name, base] of Object.entries(ampThemes)) {
      expect(base.background, `${name}.background`).toBeInstanceOf(Color);
      expect(base.foreground, `${name}.foreground`).toBeInstanceOf(Color);
      expect(base.mutedForeground, `${name}.mutedForeground`).toBeInstanceOf(Color);
      expect(base.border, `${name}.border`).toBeInstanceOf(Color);
      expect(base.selection, `${name}.selection`).toBeInstanceOf(Color);
      expect(base.primary, `${name}.primary`).toBeInstanceOf(Color);
      expect(base.secondary, `${name}.secondary`).toBeInstanceOf(Color);
      expect(base.accent, `${name}.accent`).toBeInstanceOf(Color);
      expect(base.success, `${name}.success`).toBeInstanceOf(Color);
      expect(base.warning, `${name}.warning`).toBeInstanceOf(Color);
      expect(base.info, `${name}.info`).toBeInstanceOf(Color);
      expect(base.destructive, `${name}.destructive`).toBeInstanceOf(Color);
      expect(base.copyHighlight, `${name}.copyHighlight`).toBeInstanceOf(Color);
      expect(base.tableBorder, `${name}.tableBorder`).toBeInstanceOf(Color);
      expect(base.cursor, `${name}.cursor`).toBeInstanceOf(Color);
      expect(typeof base.isLight, `${name}.isLight`).toBe('boolean');
      expect(base.syntaxHighlight.keyword, `${name}.syntaxHighlight.keyword`).toBeInstanceOf(Color);
    }
  });

  test('deriveAppColors returns strict AMP x1 token inventory', () => {
    const app = deriveAppColors(darkTheme);
    expect(Object.keys(app).sort()).toEqual(EXPECTED_APP_KEYS.slice().sort());
  });

  test('deriveAppColors matches key AMP default mappings (ANSI + ansi256)', () => {
    const app = deriveAppColors(darkTheme);
    const ansi8 = Color.ansi256(8);

    expectColorEqual(app.toolRunning, Color.blue);
    expectColorEqual(app.toolSuccess, Color.green);
    expectColorEqual(app.toolError, Color.red);
    expectColorEqual(app.toolCancelled, Color.yellow);
    expectColorEqual(app.toolName, Color.defaultColor);
    expectColorEqual(app.userMessage, Color.cyan);
    expectColorEqual(app.systemMessage, ansi8);
    expectColorEqual(app.inlineCode, Color.yellow);
    expectColorEqual(app.fileReference, Color.cyan);
    expectColorEqual(app.processing, Color.blue);
    expectColorEqual(app.waiting, Color.yellow);
    expectColorEqual(app.completed, Color.green);
    expectColorEqual(app.cancelled, ansi8);
    expectColorEqual(app.handoffMode, Color.magenta);
    expectColorEqual(app.shellModeHidden, ansi8);
    expectColorEqual(app.scrollbarTrack, ansi8);
    expectColorEqual(app.tableBorder, ansi8);
    expectColorEqual(app.selectionBackground, Color.yellow);
    expectColorEqual(app.selectionForeground, Color.black);
    expectColorEqual(app.selectedMessage, Color.green);

    expectColorEqual(app.syntaxHighlight.keyword, Color.blue);
    expectColorEqual(app.syntaxHighlight.string, Color.green);
    expectColorEqual(app.syntaxHighlight.number, Color.yellow);
    expectColorEqual(app.syntaxHighlight.comment, ansi8);
    expectColorEqual(app.syntaxHighlight.function, Color.cyan);
    expectColorEqual(app.syntaxHighlight.type, Color.magenta);
    expectColorEqual(app.syntaxHighlight.variable, Color.defaultColor);
    expectColorEqual(app.syntaxHighlight.operator, Color.defaultColor);
  });

  test('deriveAppColors smart/rush colors depend on light vs dark mode', () => {
    const darkApp = deriveAppColors(darkTheme);
    const lightApp = deriveAppColors(lightTheme);

    expectColorEqual(darkApp.smartModeColor, Color.rgb(0, 255, 136));
    expectColorEqual(darkApp.rushModeColor, Color.rgb(255, 215, 0));

    expectColorEqual(lightApp.smartModeColor, Color.rgb(0, 140, 70));
    expectColorEqual(lightApp.rushModeColor, Color.rgb(180, 100, 0));
  });
});

