// ConsoleOverlay — Debug log viewer overlay for runtime log entries
//
// Displays runtime log entries in a scrollable list with level-based
// color coding. Each log line shows [HH:MM:SS] [LEVEL] message.
//
// Level colors:
//   error = red
//   warn  = yellow
//   info  = blue
//   debug = gray (brightBlack)
//
// Supports keyboard scrolling (ArrowUp/ArrowDown).
//
// Key bindings:
//   Escape     -> dismiss overlay
//   ArrowUp    -> scroll up
//   ArrowDown  -> scroll down
//
// Modal overlay at CONSOLE priority (50).

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Center } from '../../../flitter-core/src/widgets/center';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import { SingleChildScrollView } from '../../../flitter-core/src/widgets/scroll-view';
import { ScrollController } from '../../../flitter-core/src/widgets/scroll-controller';
import { Scrollbar } from '../../../flitter-core/src/widgets/scrollbar';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';

// ---------------------------------------------------------------------------
// Log Entry Type
// ---------------------------------------------------------------------------

/** A single runtime log entry for display in the console overlay. */
export interface LogEntry {
  /** Epoch ms when the log was emitted. */
  readonly timestamp: number;
  /** Log level: error, warn, info, or debug. */
  readonly level: string;
  /** The log message text. */
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the ConsoleOverlay widget. */
interface ConsoleOverlayProps {
  /** Array of log entries to display. */
  logEntries: readonly LogEntry[];
  /** Callback to dismiss the overlay. */
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.magenta;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;
const TIMESTAMP_COLOR = Color.brightBlack;

/**
 * Color mapping for log levels.
 * error=red, warn=yellow, info=blue, debug=gray.
 */
const LEVEL_COLORS: Record<string, Color> = {
  error: Color.red,
  warn: Color.yellow,
  info: Color.blue,
  debug: Color.brightBlack,
};

/** Number of lines to scroll per ArrowUp/ArrowDown key press. */
const SCROLL_STEP = 3;

/** Maximum visible height for the overlay (in terminal rows). */
const MAX_VISIBLE_HEIGHT = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format an epoch-ms timestamp as HH:MM:SS.
 */
function formatTimestamp(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Resolve the color for a given log level string.
 * Falls back to MUTED_COLOR for unknown levels.
 */
function levelColor(level: string): Color {
  return LEVEL_COLORS[level.toLowerCase()] ?? MUTED_COLOR;
}

// ---------------------------------------------------------------------------
// ConsoleOverlay
// ---------------------------------------------------------------------------

/**
 * Console overlay widget displaying runtime log entries.
 *
 * Shows a scrollable list of log entries with timestamp, level, and message.
 * Each entry is formatted as [HH:MM:SS] [LEVEL] message with level-based
 * color coding matching standard terminal conventions.
 *
 * Layout:
 *   FocusScope (autofocus, key handler)
 *     Center
 *       Container (bordered magenta, padded, maxWidth: 80, maxHeight: MAX_VISIBLE_HEIGHT)
 *         Column
 *           "Console" title + entry count
 *           Expanded (scroll area with log entries)
 *           Footer hints
 */
export class ConsoleOverlay extends StatefulWidget {
  readonly logEntries: readonly LogEntry[];
  readonly onDismiss: () => void;

  constructor(props: ConsoleOverlayProps) {
    super();
    this.logEntries = props.logEntries;
    this.onDismiss = props.onDismiss;
  }

  createState(): ConsoleOverlayState {
    return new ConsoleOverlayState();
  }
}

/**
 * State for ConsoleOverlay. Owns a ScrollController for keyboard-
 * driven scrolling of the log entry list.
 */
class ConsoleOverlayState extends State<ConsoleOverlay> {
  /** ScrollController for the log list scroll area. */
  private scrollController = new ScrollController();

  /** Dispose scroll controller on teardown. */
  dispose(): void {
    this.scrollController.dispose();
    super.dispose();
  }

  /**
   * Handle keyboard events: Escape to dismiss, ArrowUp/ArrowDown to scroll.
   */
  private _handleKey = (event: KeyEvent): KeyEventResult => {
    if (event.key === 'Escape') {
      this.widget.onDismiss();
      return 'handled';
    }
    if (event.key === 'ArrowUp') {
      const newOffset = Math.max(0, this.scrollController.offset - SCROLL_STEP);
      this.scrollController.jumpTo(newOffset);
      return 'handled';
    }
    if (event.key === 'ArrowDown') {
      const maxScroll = this.scrollController.maxScrollExtent;
      const newOffset = Math.min(maxScroll, this.scrollController.offset + SCROLL_STEP);
      this.scrollController.jumpTo(newOffset);
      return 'handled';
    }
    // Absorb all keys while overlay is shown
    return 'handled';
  };

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    const entries = this.widget.logEntries;

    // Title with entry count
    const headerChildren: Widget[] = [
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Console',
              style: new TextStyle({ foreground: BORDER_COLOR, bold: true }),
            }),
            new TextSpan({
              text: ` (${entries.length})`,
              style: new TextStyle({ foreground: MUTED_COLOR }),
            }),
          ],
        }),
      }),
      new SizedBox({ height: 1 }),
    ];

    // Log entry widgets
    const logWidgets: Widget[] = [];

    if (entries.length === 0) {
      logWidgets.push(
        new Text({
          text: new TextSpan({
            text: 'No log entries',
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
      );
    } else {
      for (const entry of entries) {
        const lvlColor = levelColor(entry.level);
        const lvlLabel = entry.level.toUpperCase().padEnd(5);

        logWidgets.push(
          new Text({
            text: new TextSpan({
              children: [
                new TextSpan({
                  text: `[${formatTimestamp(entry.timestamp)}]`,
                  style: new TextStyle({ foreground: TIMESTAMP_COLOR }),
                }),
                new TextSpan({
                  text: ' [',
                  style: new TextStyle({ foreground: MUTED_COLOR }),
                }),
                new TextSpan({
                  text: lvlLabel,
                  style: new TextStyle({ foreground: lvlColor, bold: entry.level === 'error' }),
                }),
                new TextSpan({
                  text: '] ',
                  style: new TextStyle({ foreground: MUTED_COLOR }),
                }),
                new TextSpan({
                  text: entry.message,
                  style: new TextStyle({ foreground: Color.white }),
                }),
              ],
            }),
          }),
        );
      }
    }

    // Footer
    const footerChildren: Widget[] = [
      new SizedBox({ height: 1 }),
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: KEYBIND_COLOR }),
            }),
            new TextSpan({
              text: ' close',
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
            ...(entries.length > MAX_VISIBLE_HEIGHT - 6 ? [
              new TextSpan({
                text: '  ',
              }),
              new TextSpan({
                text: '\u2191\u2193',
                style: new TextStyle({ foreground: KEYBIND_COLOR }),
              }),
              new TextSpan({
                text: ' scroll',
                style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
              }),
            ] : []),
          ],
        }),
      }),
    ];

    // Scroll area for log entries
    const scrollArea = new Expanded({
      child: new Row({
        crossAxisAlignment: 'stretch',
        children: [
          new Expanded({
            child: new SingleChildScrollView({
              controller: this.scrollController,
              child: new Column({
                mainAxisSize: 'min',
                crossAxisAlignment: 'start',
                children: logWidgets,
              }),
            }),
          }),
          new Scrollbar({
            controller: this.scrollController,
            thumbColor: Color.brightBlack,
            trackColor: Color.defaultColor,
          }),
        ],
      }),
    });

    return new FocusScope({
      autofocus: true,
      onKey: this._handleKey,
      child: new Center({
        child: new Container({
          decoration: new BoxDecoration({ border: Border.all(side) }),
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          constraints: new BoxConstraints({ maxWidth: 80, maxHeight: MAX_VISIBLE_HEIGHT }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              ...headerChildren,
              scrollArea,
              ...footerChildren,
            ],
          }),
        }),
      }),
    });
  }
}
