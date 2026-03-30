# Gap U16 (Gap #38): Streaming Cursor Does Not Blink When Paused

## Problem Statement

The streaming cursor character `▌` in assistant messages does not blink when the
stream pauses. It is appended as a static suffix in `ChatView.buildAssistantMessage()`
(line 273 of `packages/flitter-amp/src/widgets/chat-view.ts`), which is a
`StatelessWidget` method with no timer or animation state. The cursor advances
passively -- it moves to the right as new tokens arrive because each rebuild
produces a longer `text + ' ▌'` string -- but when token delivery pauses (e.g.,
the model is thinking, the network stalls, or the API rate-limits), the cursor
sits motionless. There is no visual indication that the stream is still active.

The original Amp CLI likely uses a true blink timer for this cursor. The Amp
binary's `XkL` function (the assistant message renderer, referenced in
`flitter-amp/.ref/amp-cli/assistant-message-XkL.js`) renders assistant messages
with a Markdown widget and supports streaming state, but the minified source
makes it difficult to trace the exact cursor blink mechanism. However, the Amp
CLI uses `setInterval`-based blink timers throughout its TUI layer (e.g., the
HandoffTool's 700ms blink, the ToolHeader's 100ms BrailleSpinner), and terminal
cursor blinking at ~530ms is a universal convention.

### Current Implementation

```typescript
// chat-view.ts, lines 271-283
private buildAssistantMessage(text: string, isStreaming: boolean, theme?: AmpTheme): Widget {
  if (text.length > 0) {
    const displayText = isStreaming ? text + ' ▌' : text;
    return new Markdown({ markdown: displayText });
  }
  const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
  return new Text({
    text: new TextSpan({
      text: isStreaming ? '▌' : '...',
      style: new TextStyle({ foreground: mutedColor }),
    }),
  });
}
```

The `▌` character is concatenated unconditionally when `isStreaming` is true. It
is rendered as part of the Markdown content or as a standalone `Text` widget. In
both cases it is a static string -- no animation, no blinking, no opacity toggle.

### Why ChatView Cannot Solve This Alone

`ChatView` is a `StatelessWidget`. It has no `initState()`, no `dispose()`, no
timer lifecycle. Converting the entire `ChatView` to a `StatefulWidget` solely for
cursor blinking would be disproportionate -- `ChatView` is a pure data-projection
widget that maps `ConversationItem[]` to a widget tree. Adding timer state to it
would mix presentation concerns (cursor animation) with structural concerns
(conversation layout).

The correct approach, consistent with the codebase's architecture, is to extract
the streaming cursor into a dedicated `StatefulWidget` that owns its own blink
timer -- the same pattern used by `HandoffTool` (700ms blink), `ToolHeader`
(100ms BrailleSpinner), `GlowText` (100ms color noise), and `DensityOrbWidget`
(100ms Perlin noise animation).

### User Impact

When the stream pauses for 1-3 seconds (common during tool calls, thinking, or
model latency), the user sees a frozen cursor and cannot distinguish between:

1. **Active pause**: The stream is still connected and tokens will resume shortly.
2. **Stall/error**: The connection has silently failed or timed out.
3. **Completed**: The response has finished but `isStreaming` has not yet flipped
   to false due to a state update race.

A blinking cursor provides a heartbeat signal that communicates "still alive" to
the user, matching the universal convention of text editor cursors, terminal
cursors, and the Amp CLI's own behavior.

---

## Existing Animation Patterns in the Codebase

The codebase has four established patterns for timer-driven animation, all using
`StatefulWidget` + `setInterval` + `setState`:

### Pattern 1: GlowText (unconditional continuous animation)

File: `packages/flitter-amp/src/widgets/glow-text.ts`

```typescript
class GlowTextState extends State<GlowText> {
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeOffset = 0;

  override initState(): void {
    super.initState();
    this.timer = setInterval(() => {
      this.setState(() => { this.timeOffset += 0.08; });
    }, 100);
  }

  override dispose(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    super.dispose();
  }
}
```

- Interval: 100ms (10 Hz)
- State: monotonically increasing `timeOffset` driving Perlin noise color
- Lifecycle: always-on while mounted, no conditional start/stop
- Cleanup: `clearInterval` in `dispose()`

### Pattern 2: ToolHeader (conditional BrailleSpinner)

File: `packages/flitter-amp/src/widgets/tool-call/tool-header.ts`

```typescript
class ToolHeaderState extends State<ToolHeader> {
  private spinner = new BrailleSpinner();
  private timer: ReturnType<typeof setInterval> | null = null;

  override initState(): void {
    super.initState();
    if (this.widget.status === 'in_progress') { this.startSpinner(); }
  }

  override didUpdateWidget(_oldWidget: ToolHeader): void {
    if (this.widget.status === 'in_progress' && !this.timer) {
      this.startSpinner();
    } else if (this.widget.status !== 'in_progress' && this.timer) {
      this.stopSpinner();
    }
  }

  override dispose(): void {
    this.stopSpinner();
    super.dispose();
  }
}
```

- Interval: 100ms (10 Hz)
- Conditional start/stop based on `status === 'in_progress'`
- Uses `didUpdateWidget` to respond to prop transitions
- `startSpinner()` / `stopSpinner()` encapsulate timer lifecycle

### Pattern 3: HandoffTool (conditional visibility blink)

File: `packages/flitter-amp/src/widgets/tool-call/handoff-tool.ts`

```typescript
class HandoffToolState extends State<HandoffTool> {
  private blinkVisible = true;
  private timer: ReturnType<typeof setInterval> | null = null;

  override initState(): void {
    super.initState();
    if (this.widget.toolCall.status === 'in_progress') {
      this.startBlink();
    }
  }

  override didUpdateWidget(_oldWidget: HandoffTool): void {
    if (this.widget.toolCall.status === 'in_progress' && !this.timer) {
      this.startBlink();
    } else if (this.widget.toolCall.status !== 'in_progress' && this.timer) {
      this.stopBlink();
    }
  }

  private startBlink(): void {
    this.timer = setInterval(() => {
      this.setState(() => { this.blinkVisible = !this.blinkVisible; });
    }, 700);
  }

  private stopBlink(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
}
```

- Interval: 700ms (~0.71 Hz)
- State: simple boolean toggle (`blinkVisible`)
- Conditional on `toolCall.status === 'in_progress'`
- Identical start/stop lifecycle to ToolHeader

### Pattern 4: DensityOrbWidget (continuous grid animation)

File: `packages/flitter-amp/src/widgets/density-orb-widget.ts`

- Unconditional `setInterval` in `initState()` at 100ms
- Drives a 40x20 character grid with Perlin noise + shockwave physics
- Always animating while mounted

### Chosen Pattern

The streaming cursor blink should follow **Pattern 3** (HandoffTool), because:

- The timer must start/stop conditionally based on `isStreaming`
- When `isStreaming` transitions from `true` to `false`, the timer must stop
- `didUpdateWidget` is required to handle the streaming-to-done transition
- The state is a simple boolean toggle (cursor visible/hidden), identical to
  HandoffTool's `blinkVisible` toggle
- The interval is straightforward, not requiring a complex automaton like
  BrailleSpinner

---

## Proposed Solution

### Architecture

Extract the streaming assistant message rendering into a new `StatefulWidget`
called `StreamingCursor`. This widget:

1. Accepts the `isStreaming` boolean and text content as props
2. When `isStreaming` is true, runs a `setInterval` at 530ms that toggles cursor
   visibility via `setState`
3. When `isStreaming` transitions to false (detected in `didUpdateWidget`), stops
   the timer and hides the cursor permanently
4. Properly cleans up the timer in `dispose()`
5. Delegates rendering to `Markdown` (for non-empty text) or `Text` (for the
   empty-text streaming placeholder), exactly matching the current behavior but
   with the cursor conditionally present

The 530ms interval produces a ~1Hz blink cycle (530ms on, 530ms off), matching
the standard terminal cursor blink rate defined by VT100 convention and used by
most terminal emulators (xterm: 600ms, iTerm2: 500ms, Alacritty: 530ms).

### File Structure

```
packages/flitter-amp/src/widgets/
  streaming-cursor.ts     <-- NEW: StreamingCursor StatefulWidget
  chat-view.ts            <-- MODIFIED: import + delegate
```

### New File: `packages/flitter-amp/src/widgets/streaming-cursor.ts`

```typescript
// StreamingCursor -- blinking cursor for streaming assistant messages
// Amp ref: cursor blink behavior in streaming message rendering
// Pattern: follows HandoffTool (handoff-tool.ts) conditional blink pattern
//
// When isStreaming=true, the cursor character blinks on a 530ms timer.
// When isStreaming transitions to false, the cursor is hidden and the timer
// is stopped. This provides a visual heartbeat during stream pauses.

import {
  StatefulWidget, State, Widget, BuildContext,
} from 'flitter-core/src/framework/widget';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Markdown } from 'flitter-core/src/widgets/markdown';
import { AmpThemeProvider } from '../themes/index';

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
const CURSOR_BLINK_INTERVAL_MS = 530;

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
 * - If `text` is non-empty, renders Markdown with a blinking ▌ appended
 * - If `text` is empty, renders a standalone blinking ▌ in muted color
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

class StreamingCursorState extends State<StreamingCursor> {
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
    // If isStreaming stayed the same (either both true or both false), the
    // timer continues in its current state. When both are true and text
    // changed, the timer keeps running and the next build() picks up the
    // new text with the current cursorVisible state.
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
   *
   * The timer toggles `cursorVisible` every CURSOR_BLINK_INTERVAL_MS and
   * triggers a rebuild via setState.
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
  // Build
  // -----------------------------------------------------------------------

  build(context: BuildContext): Widget {
    const { text, isStreaming } = this.widget;
    const theme = AmpThemeProvider.maybeOf(context);

    if (!isStreaming) {
      // Not streaming: render final content, no cursor
      if (text.length > 0) {
        return new Markdown({ markdown: text });
      }
      const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
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
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    return new Text({
      text: new TextSpan({
        text: this.cursorVisible ? CURSOR_CHAR : ' ',
        style: new TextStyle({ foreground: mutedColor }),
      }),
    });
  }
}
```

### Modified File: `packages/flitter-amp/src/widgets/chat-view.ts`

The changes to `ChatView` are minimal -- replace the inline `buildAssistantMessage`
method with a delegation to the new `StreamingCursor` widget.

#### Import Addition

```typescript
// Add at the top of chat-view.ts, after existing imports:
import { StreamingCursor } from './streaming-cursor';
```

#### Method Replacement

Replace the entire `buildAssistantMessage` method (lines 271-283):

```typescript
// BEFORE (lines 271-283):
private buildAssistantMessage(text: string, isStreaming: boolean, theme?: AmpTheme): Widget {
  if (text.length > 0) {
    const displayText = isStreaming ? text + ' ▌' : text;
    return new Markdown({ markdown: displayText });
  }
  const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
  return new Text({
    text: new TextSpan({
      text: isStreaming ? '▌' : '...',
      style: new TextStyle({ foreground: mutedColor }),
    }),
  });
}

// AFTER:
private buildAssistantMessage(text: string, isStreaming: boolean, _theme?: AmpTheme): Widget {
  return new StreamingCursor({ text, isStreaming });
}
```

The `theme` parameter becomes unused (prefixed with `_`) because `StreamingCursor`
obtains the theme from the build context internally via `AmpThemeProvider.maybeOf`.
The `Markdown` import in `chat-view.ts` is no longer needed by this method but
may be used elsewhere; check before removing. The `Text`, `TextStyle`, `TextSpan`,
and `Color` imports are used in other methods (`buildUserStickyHeader`,
`buildWelcomeScreen`) and must remain.

#### Unused Import Cleanup

After the replacement, `Markdown` is no longer used directly by `chat-view.ts`.
Review the file and remove the import if no other method references it:

```typescript
// Can be removed if unused:
// import { Markdown } from 'flitter-core/src/widgets/markdown';
```

---

## Blink Timing Analysis

### Why 530ms

The standard VT100 cursor blink rate is approximately 1.875 Hz (533ms per phase).
Modern terminals (xterm, iTerm2, Windows Terminal, Alacritty) default to ~500-600ms
per blink phase. The value 530ms is chosen as a midpoint that:

1. Matches user expectations from terminal cursor behavior
2. Is slow enough to avoid distracting flicker
3. Is fast enough to be perceivable as "alive" during 1-3 second stream pauses
4. Produces 1 full blink cycle every ~1.06 seconds

### Why Not Other Intervals

| Interval | Hz   | Problem                                           |
|----------|------|---------------------------------------------------|
| 100ms    | 5.0  | Too fast, visually distracting; matches spinner   |
| 250ms    | 2.0  | Slightly too fast for a cursor; feels "nervous"   |
| **530ms** | **0.94** | **Standard terminal rate; calm, professional**  |
| 700ms    | 0.71 | HandoffTool rate; slightly too slow for a cursor  |
| 1000ms   | 0.50 | Too slow; user may think it's frozen between off  |

### Frame Budget Impact

At 530ms intervals, the blink timer triggers approximately 1.89 `setState()` calls
per second. Each call marks the `StreamingCursorState` element as dirty and
triggers a single `requestFrame()`. Given the frame scheduler's 16.67ms budget and
the existing spinners/animations already running at 100ms (10 calls/sec), adding
1.89 calls/sec is negligible.

### Comparison to Existing Timers

| Widget            | Interval | setState/sec | Rebuild scope          |
|-------------------|----------|-------------|------------------------|
| GlowText          | 100ms    | 10.0        | Per-character spans     |
| DensityOrbWidget  | 100ms    | 10.0        | Full 40x20 grid        |
| ToolHeader spinner| 100ms    | 10.0        | Single braille char    |
| HandoffTool       | 700ms    | 1.43        | Dot color toggle       |
| **StreamingCursor** | **530ms** | **1.89** | **Markdown re-render** |

The streaming cursor is one of the lightest animations in the codebase in terms
of `setState` frequency. However, it does re-render a `Markdown` widget each
blink cycle, which involves re-parsing the markdown string. For typical assistant
messages (< 10KB), markdown parsing is sub-millisecond and well within the frame
budget.

---

## Design Decisions

### Decision 1: Separate StatefulWidget vs. Converting ChatView

**Chosen**: Separate `StreamingCursor` StatefulWidget.

**Rationale**: `ChatView` is a pure `StatelessWidget` that maps `ConversationItem[]`
to a widget tree. It has no mutable state and no lifecycle methods. Converting it
to a `StatefulWidget` solely for cursor blinking would:

- Mix structural (conversation layout) and presentational (cursor animation) concerns
- Add timer lifecycle management to a widget that renders the entire conversation
- Make `ChatView` harder to reason about and test

By extracting `StreamingCursor`, we follow the Single Responsibility Principle and
match the codebase's established pattern where each animation has its own
`StatefulWidget` (`GlowText`, `ToolHeader`, `HandoffTool`, `OrbWidget`,
`DensityOrbWidget`).

### Decision 2: Cursor Visibility Toggle vs. Color Fade

**Chosen**: Binary visibility toggle (cursor present or absent).

**Rationale**: The `HandoffTool` uses a binary color toggle (green/gray). The
standard terminal cursor blink is binary (visible/invisible). A smooth fade
would require per-frame rendering at 16.67ms intervals, dramatically increasing
the render load for minimal visual benefit in a text-mode terminal. The binary
toggle is the established pattern in both the codebase and terminal conventions.

### Decision 3: Cursor as Markdown Suffix vs. Separate Widget

**Chosen**: Cursor appended as a suffix to the Markdown string.

**Rationale**: The current implementation already appends `▌` as a text suffix.
Rendering the cursor as a separate widget positioned after the Markdown would
require:

1. Wrapping Markdown + cursor in a `Row` or `Column`
2. Tracking the exact end-of-text position in the Markdown layout
3. Handling inline cursor positioning within wrapped text

This complexity is not justified for a 1.89 Hz operation. Appending to the string
and re-parsing Markdown is simpler and matches the existing behavior exactly.

### Decision 4: Space Character When Cursor Hidden

**Chosen**: Render a space character (`' '`) when the standalone cursor (empty
text) is hidden, and an empty string suffix for non-empty text.

**Rationale**: For the standalone cursor (streaming with empty text), we need to
maintain the layout space. A space character preserves the widget's size so the
layout does not jump when the cursor blinks. For the suffix case (non-empty text),
the empty suffix means the Markdown layout shrinks by one character during the
off phase, but this is imperceptible because it only affects the trailing cursor
position on the last line.

---

## Edge Cases

### 1. Rapid streaming (no visible pause)

When tokens arrive faster than the blink interval, the cursor position changes
every rebuild. Each token arrival triggers a parent rebuild that passes new `text`
to `StreamingCursor`. The `didUpdateWidget` callback fires but since `isStreaming`
remains `true`, the timer continues running. The cursor will blink even during
rapid streaming, but since the cursor position is moving, the blink is less
noticeable -- which is correct behavior. The cursor's primary purpose is signaling
during pauses.

### 2. Streaming starts with empty text

When the first assistant message arrives with `isStreaming: true` and `text: ''`,
the `StreamingCursor` renders a standalone blinking cursor. This correctly signals
"response is starting" before the first token arrives. The cursor blinks in muted
color, matching the current behavior where a static `▌` is shown.

### 3. isStreaming flips to false

When the stream completes, the parent rebuilds `StreamingCursor` with
`isStreaming: false`. The `didUpdateWidget` hook detects the transition
(`!this.widget.isStreaming && oldWidget.isStreaming`), stops the timer, and sets
`cursorVisible = false`. The next `build()` renders the final text without any
cursor. No lingering timer, no stale state.

### 4. Widget unmounted while streaming

If the conversation view is replaced (e.g., the user starts a new conversation
or clears the session with Ctrl+L) while streaming is active, `dispose()` fires
and calls `stopBlinkTimer()`. The `clearInterval` call prevents the timer from
firing after the element is removed from the tree, avoiding the "setState called
after dispose" error.

### 5. Multiple assistant messages streaming simultaneously

Each `StreamingCursor` instance has its own independent blink timer. If the
conversation model somehow produces two concurrent streaming messages (unlikely
but possible during reconnection), each will blink independently. The timers are
not synchronized, which produces a natural staggered blink effect. This matches
how `ToolHeader` spinners work -- each in-progress tool has its own timer.

### 6. Very long assistant messages

For messages exceeding 10KB of text, the Markdown re-parse on each blink cycle
adds a small overhead. The Markdown parser in `flitter-core/src/widgets/markdown.ts`
processes text linearly. At 1.89 blink cycles per second, even a 50KB message
parsed in ~5ms per cycle would only consume 9.45ms/sec of CPU time -- well within
the frame budget. This is comparable to or less than the DensityOrbWidget's
40x20 grid computation at 10 Hz.

### 7. Theme changes during streaming

If the user switches themes while streaming, the `StreamingCursor` picks up the
new theme on its next `build()` call (triggered by either the blink timer or a
text update). Since `AmpThemeProvider` is an `InheritedWidget`, theme changes
automatically mark dependent widgets for rebuild. The blink timer state is
unaffected by theme changes.

### 8. Re-entering streaming after completion

If `isStreaming` goes `true -> false -> true` (e.g., the API reconnects and
resumes streaming), `didUpdateWidget` detects the `false -> true` transition and
restarts the blink timer with `cursorVisible` reset to `true`. This ensures the
cursor appears immediately when streaming resumes, rather than being stuck in the
hidden phase.

---

## Test Plan

### New Test File: `packages/flitter-amp/src/__tests__/streaming-cursor.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { StreamingCursor } from '../widgets/streaming-cursor';

describe('StreamingCursor', () => {
  describe('widget construction', () => {
    it('stores text and isStreaming props', () => {
      const widget = new StreamingCursor({ text: 'hello', isStreaming: true });
      expect(widget.text).toBe('hello');
      expect(widget.isStreaming).toBe(true);
    });

    it('stores empty text with isStreaming false', () => {
      const widget = new StreamingCursor({ text: '', isStreaming: false });
      expect(widget.text).toBe('');
      expect(widget.isStreaming).toBe(false);
    });

    it('creates StreamingCursorState', () => {
      const widget = new StreamingCursor({ text: '', isStreaming: false });
      const state = widget.createState();
      expect(state).toBeDefined();
      expect(state.constructor.name).toBe('StreamingCursorState');
    });
  });

  describe('build output structure', () => {
    // These tests require WidgetTester to mount the widget and inspect
    // the built tree. Pseudocode for the expected assertions:

    it('renders Markdown without cursor when not streaming and text present', () => {
      // Mount StreamingCursor({ text: 'done', isStreaming: false })
      // Expect: Markdown widget with markdown='done' (no ▌)
    });

    it('renders "..." when not streaming and text empty', () => {
      // Mount StreamingCursor({ text: '', isStreaming: false })
      // Expect: Text widget with text='...'
    });

    it('renders Markdown with cursor when streaming and text present', () => {
      // Mount StreamingCursor({ text: 'hello', isStreaming: true })
      // Initial build: Markdown with markdown='hello ▌'
    });

    it('renders standalone cursor when streaming and text empty', () => {
      // Mount StreamingCursor({ text: '', isStreaming: true })
      // Initial build: Text with text='▌'
    });

    it('cursor toggles visibility after blink interval', () => {
      // Mount StreamingCursor({ text: 'hello', isStreaming: true })
      // Advance fake timer by 530ms
      // pump()
      // Expect: Markdown with markdown='hello' (cursor hidden)
      // Advance another 530ms
      // pump()
      // Expect: Markdown with markdown='hello ▌' (cursor visible again)
    });

    it('stops blinking when isStreaming transitions to false', () => {
      // Mount StreamingCursor({ text: 'hello', isStreaming: true })
      // Verify timer is running (cursor blinks)
      // Rebuild with StreamingCursor({ text: 'hello world', isStreaming: false })
      // pump()
      // Expect: Markdown with markdown='hello world' (no cursor)
      // Advance timer: no further state changes
    });

    it('starts blinking when isStreaming transitions to true', () => {
      // Mount StreamingCursor({ text: '', isStreaming: false })
      // Verify no timer (no blinking)
      // Rebuild with StreamingCursor({ text: '', isStreaming: true })
      // pump()
      // Expect: blinking cursor appears
    });

    it('cleans up timer on dispose', () => {
      // Mount StreamingCursor({ text: '', isStreaming: true })
      // Unmount widget
      // Verify: no lingering setInterval callbacks
    });

    it('resets cursor to visible when re-entering streaming', () => {
      // Mount StreamingCursor({ text: 'x', isStreaming: true })
      // Advance 530ms -> cursor hidden
      // Rebuild with isStreaming: false
      // Rebuild with isStreaming: true
      // Expect: cursor is visible again (reset on transition)
    });
  });
});
```

### Integration Test Additions to `chat-view.test.ts`

Add to the existing `packages/flitter-amp/src/__tests__/chat-view.test.ts`:

```typescript
describe('streaming cursor integration', () => {
  it('buildAssistantMessage returns StreamingCursor for streaming messages', () => {
    const items: ConversationItem[] = [
      makeAssistantMessage('typing...', true),
    ];
    const chatView = buildChatView(items);
    // Build and inspect: the assistant message widget should be a StreamingCursor
    // with text='typing...' and isStreaming=true
  });

  it('buildAssistantMessage returns StreamingCursor for completed messages', () => {
    const items: ConversationItem[] = [
      makeAssistantMessage('done', false),
    ];
    const chatView = buildChatView(items);
    // Build and inspect: StreamingCursor with text='done' and isStreaming=false
  });
});
```

### Visual Snapshot Updates

The existing visual snapshot tests in `visual-snapshot.test.ts` that test streaming
states (`streaming-120x40.svg`, `thinking-streaming-120x40.svg`) will need to be
regenerated because the initial render of streaming messages will now include the
cursor (same as before, since `cursorVisible` starts as `true`), but subsequent
blink-off frames would differ. Since snapshots capture a single frame, the initial
frame should match the existing behavior exactly. No snapshot changes expected for
the initial frame.

---

## Migration Checklist

1. **Create** `packages/flitter-amp/src/widgets/streaming-cursor.ts` with the
   `StreamingCursor` StatefulWidget and `StreamingCursorState` class as shown
   above.

2. **Modify** `packages/flitter-amp/src/widgets/chat-view.ts`:
   - Add `import { StreamingCursor } from './streaming-cursor';`
   - Replace `buildAssistantMessage` body with single-line delegation:
     `return new StreamingCursor({ text, isStreaming });`
   - Prefix unused `theme` parameter with `_`
   - Optionally remove the `Markdown` import if no other method uses it

3. **Create** `packages/flitter-amp/src/__tests__/streaming-cursor.test.ts` with
   unit tests for widget construction and blink behavior.

4. **Update** `packages/flitter-amp/src/__tests__/chat-view.test.ts` to verify
   `StreamingCursor` is used in the assistant message slot.

5. **Run** `bun test` across both `flitter-core` and `flitter-amp` packages to
   verify no regressions.

6. **Verify visually** in the TUI that:
   - The cursor blinks at ~1Hz during stream pauses
   - The cursor stops blinking when streaming completes
   - The cursor does not blink for completed (non-streaming) messages
   - The welcome screen and other views are unaffected
   - No "setState called after dispose" errors in the console

---

## Files Changed Summary

| File | Change | Lines |
|------|--------|-------|
| `packages/flitter-amp/src/widgets/streaming-cursor.ts` | **New** -- StreamingCursor StatefulWidget | ~110 |
| `packages/flitter-amp/src/widgets/chat-view.ts` | **Modified** -- Import + delegate to StreamingCursor | ~5 |
| `packages/flitter-amp/src/__tests__/streaming-cursor.test.ts` | **New** -- Unit tests | ~80 |
| `packages/flitter-amp/src/__tests__/chat-view.test.ts` | **Modified** -- Integration tests | ~15 |

Total lines of production code: ~110 (streaming-cursor.ts)
Total lines of test code: ~95 (streaming-cursor.test.ts + chat-view.test.ts additions)
Total lines changed in existing files: ~5 (chat-view.ts)

---

## Appendix: Diff Preview for chat-view.ts

```diff
diff --git a/packages/flitter-amp/src/widgets/chat-view.ts b/packages/flitter-amp/src/widgets/chat-view.ts
index abc1234..def5678 100644
--- a/packages/flitter-amp/src/widgets/chat-view.ts
+++ b/packages/flitter-amp/src/widgets/chat-view.ts
@@ -14,6 +14,7 @@ import { Container } from 'flitter-core/src/widgets/container';
 import { Border, BorderSide, BoxDecoration } from 'flitter-core/src/layout/render-decorated';
 import { StickyHeader } from 'flitter-core/src/widgets/sticky-header';
 import { ToolCallWidget } from './tool-call/index';
+import { StreamingCursor } from './streaming-cursor';
 import { ThinkingBlock } from './thinking-block';
 import { PlanView } from './plan-view';
 import { AmpThemeProvider } from '../themes/index';
@@ -268,17 +269,8 @@ export class ChatView extends StatelessWidget {
   /**
    * Renders an assistant message as Markdown, or a streaming placeholder.
+   * Delegates to StreamingCursor for blink animation support.
    */
-  private buildAssistantMessage(text: string, isStreaming: boolean, theme?: AmpTheme): Widget {
-    if (text.length > 0) {
-      const displayText = isStreaming ? text + ' ▌' : text;
-      return new Markdown({ markdown: displayText });
-    }
-    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
-    return new Text({
-      text: new TextSpan({
-        text: isStreaming ? '▌' : '...',
-        style: new TextStyle({ foreground: mutedColor }),
-      }),
-    });
+  private buildAssistantMessage(text: string, isStreaming: boolean, _theme?: AmpTheme): Widget {
+    return new StreamingCursor({ text, isStreaming });
   }
 }
```
