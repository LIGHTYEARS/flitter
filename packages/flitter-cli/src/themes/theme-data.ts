/**
 * CLI theme type definitions — ported from flitter-amp's AmpBaseTheme/AmpAppColors/AmpTheme
 * with Amp* → Cli* prefix rename for flitter-cli ownership.
 */

import type { Color } from '../../../flitter-core/src/core/color';

/** CLI theme mode. */
export type CliThemeMode = 'light' | 'dark';

/** Syntax highlight color roles. */
export type CliSyntaxHighlight = {
  keyword: Color;
  string: Color;
  number: Color;
  comment: Color;
  function: Color;
  variable: Color;
  type: Color;
  operator: Color;
};

/**
 * Base theme palette (terminal color scheme).
 *
 * This is the base side of CLI theming, typically derived from terminal
 * or predefined truecolor palettes.
 */
export type CliBaseTheme = {
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
  syntaxHighlight: CliSyntaxHighlight;
};

/**
 * App semantic colors matching the full token inventory.
 *
 * Strict parity with the flitter-amp AmpAppColors definition —
 * all 50+ semantic tokens preserved.
 */
export type CliAppColors = {
  toolRunning: Color;
  toolSuccess: Color;
  toolError: Color;
  toolCancelled: Color;
  toolName: Color;

  userMessage: Color;
  assistantMessage: Color;
  systemMessage: Color;

  codeBlock: Color;
  inlineCode: Color;
  syntaxHighlight: CliSyntaxHighlight;

  fileReference: Color;
  processing: Color;
  waiting: Color;
  completed: Color;
  cancelled: Color;

  recommendation: Color;
  suggestion: Color;
  command: Color;
  filename: Color;
  keybind: Color;
  button: Color;
  link: Color;

  shellMode: Color;
  shellModeHidden: Color;
  handoffMode: Color;
  handoffModeDim: Color;
  queueMode: Color;

  diffAdded: Color;
  diffRemoved: Color;
  diffChanged: Color;
  diffContext: Color;

  ideConnected: Color;
  ideDisconnected: Color;
  ideWarning: Color;

  scrollbarThumb: Color;
  scrollbarTrack: Color;
  tableBorder: Color;

  selectionBackground: Color;
  selectionForeground: Color;
  selectedMessage: Color;

  smartModeColor: Color;
  rushModeColor: Color;

  threadGraphNode: Color;
  threadGraphNodeSelected: Color;
  threadGraphConnector: Color;
};

/**
 * Full theme container, combining base palette and app semantic colors.
 */
export type CliTheme = {
  base: CliBaseTheme;
  app: CliAppColors;
};
