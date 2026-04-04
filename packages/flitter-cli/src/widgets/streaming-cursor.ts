// StreamingCursor — blinking cursor for streaming assistant messages
//
// Ported from flitter-amp/src/widgets/streaming-cursor.ts with these adaptations:
// - Import paths use relative `../../../flitter-core/...` (flitter-cli convention)
// - AmpThemeProvider color lookups replaced with direct Color.* constants
//   (consistent with flitter-cli; Phase 20 adds theme)
// - All timer lifecycle logic retained: initState -> conditionally start blink
//   timer; didUpdateWidget -> start/stop on streaming transitions; dispose -> stop timer
// - Markdown delegation retained for both streaming and non-streaming paths
// - Blinking cursor character (U+258C) and blink interval (530ms) retained
// - Empty-streaming standalone cursor rendering retained

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { Markdown } from '../../../flitter-core/src/widgets/markdown';
import { CliThemeProvider } from '../themes';

/**
 * Blink interval in milliseconds.
 *
 * Produces a ~1 Hz cycle (530ms visible, 530ms hidden).
 * This matches the standard VT100 cursor blink rate (~533ms per phase)
 * and is consistent with common terminal emulators:
 *   - xterm: 600ms
 *   - iTerm2: ~500ms
 *   - Windows Terminal: 530ms
 *   - Alacritty: configurable, default ~500ms
 */
export const CURSOR_BLINK_INTERVAL_MS = 530;

/** The cursor character used during streaming. Unicode LEFT HALF BLOCK. */
const CURSOR_CHAR = '\u258C'; // ▌

interface StreamingCursorProps {
  /** The assistant message text accumulated so far. */
  text: string;
  /** Whether the message is currently being streamed. */
  isStreaming: boolean;
}

/**
 * Renders an assistant message with a blinking streaming cursor.
 *
 * When `isStreaming` is true:
 * - If `text` is non-empty, renders Markdown with a blinking cursor appended
 * - If `text` is empty, renders a standalone blinking cursor in muted color
 *
 * When `isStreaming` is false:
 * - If `text` is non-empty, renders plain Markdown (no cursor)
 * - If `text` is empty, renders '...' in muted color
 *
 * The blink timer starts when the widget mounts with isStreaming=true or
 * when isStreaming transitions from false to true. It stops when isStreaming
 * transitions to false or when the widget is disposed.
 *
 * Follows the same conditional-timer pattern as HandoffTool (handoff-tool.ts):
 *   initState    -> conditionally start timer
 *   didUpdateWidget -> start/stop on prop transition
 *   dispose      -> stop timer
 */
export class StreamingCursor extends StatefulWidget {
  readonly text: string;
  readonly isStreaming: boolean;

  constructor(props: StreamingCursorProps) {
    super();
    this.text = props.text;
    this.isStreaming = props.isStreaming;
  }

  createState(): StreamingCursorState {
    return new StreamingCursorState();
  }
}

export class StreamingCursorState extends State<StreamingCursor> {
  /** Whether the cursor character is currently visible in the blink cycle. */
  private cursorVisible = true;

  /** Handle for the blink interval timer, or null if not running. */
  private blinkTimer: ReturnType<typeof setInterval> | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  override initState(): void {
    super.initState();
    if (this.widget.isStreaming) {
      this.startBlinkTimer();
    }
  }

  override didUpdateWidget(oldWidget: StreamingCursor): void {
    if (this.widget.isStreaming && !oldWidget.isStreaming) {
      // Transitioned to streaming: reset cursor to visible and start blinking
      this.cursorVisible = true;
      this.startBlinkTimer();
    } else if (!this.widget.isStreaming && oldWidget.isStreaming) {
      // Transitioned from streaming to done: stop blinking, hide cursor
      this.stopBlinkTimer();
      this.cursorVisible = false;
    }
  }

  override dispose(): void {
    this.stopBlinkTimer();
    super.dispose();
  }

  // -----------------------------------------------------------------------
  // Timer management
  // -----------------------------------------------------------------------

  /**
   * Starts the blink timer. If a timer is already running, this is a no-op
   * to prevent duplicate intervals (matching ToolHeader.startSpinner pattern).
   */
  private startBlinkTimer(): void {
    if (this.blinkTimer) return; // guard against duplicate timers
    this.blinkTimer = setInterval(() => {
      this.setState(() => {
        this.cursorVisible = !this.cursorVisible;
      });
    }, CURSOR_BLINK_INTERVAL_MS);
  }

  /**
   * Stops the blink timer and nulls the handle.
   * Safe to call even if no timer is running.
   */
  private stopBlinkTimer(): void {
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }
  }

  // -----------------------------------------------------------------------
  // Public accessors (for testing)
  // -----------------------------------------------------------------------

  /** Whether the cursor is currently visible. */
  get isCursorVisible(): boolean {
    return this.cursorVisible;
  }

  /** Whether the blink timer is active. */
  get isBlinking(): boolean {
    return this.blinkTimer !== null;
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  /**
   * Build the widget tree for the streaming cursor.
   *
   * Delegates to Markdown for content rendering. Appends a blinking cursor
   * character when streaming. Uses theme colors with fallbacks to direct
   * Color constants for safety.
   */
  build(context: BuildContext): Widget {
    const { text, isStreaming } = this.widget;

    const theme = CliThemeProvider.maybeOf(context);
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;

    if (!isStreaming) {
      // Not streaming: render final content, no cursor
      if (text.length > 0) {
        return new Markdown({ markdown: text });
      }
      return new Text({
        text: new TextSpan({
          text: '...',
          style: new TextStyle({ foreground: mutedColor }),
        }),
      });
    }

    // Streaming: render content with blinking cursor
    const cursorSuffix = this.cursorVisible ? ` ${CURSOR_CHAR}` : '';

    if (text.length > 0) {
      return new Markdown({ markdown: text + cursorSuffix });
    }

    // Empty text while streaming: standalone blinking cursor
    return new Text({
      text: new TextSpan({
        text: this.cursorVisible ? CURSOR_CHAR : ' ',
        style: new TextStyle({ foreground: mutedColor }),
      }),
    });
  }
}
