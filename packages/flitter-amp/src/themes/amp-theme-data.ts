import type { Color } from 'flitter-core/src/core/color';

/**
 * AMP theme mode.
 *
 * Mirrors AMP's `x1.default(mode)` behavior where some semantic colors differ
 * between light and dark mode (notably agent mode colors).
 */
export type AmpThemeMode = 'light' | 'dark';

/**
 * Syntax highlight color roles.
 */
export type AmpSyntaxHighlight = {
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
 * This is the "base" (Qt.base) side of AMP theming, typically derived from
 * terminal or predefined truecolor palettes.
 */
export type AmpBaseTheme = {
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
  syntaxHighlight: AmpSyntaxHighlight;
};

/**
 * App semantic colors (Qt.app) matching AMP's `x1` token inventory.
 *
 * NOTE: This is intentionally strict (no extra tokens) to keep parity with
 * the reference AMP bundle (`packages/flitter-amp/.ref/amp-cli/app-theme-x1.js`).
 */
export type AmpAppColors = {
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
  syntaxHighlight: AmpSyntaxHighlight;

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
export type AmpTheme = {
  base: AmpBaseTheme;
  app: AmpAppColors;
};
