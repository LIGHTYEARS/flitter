// Tests for StreamingCursor widget
// Verifies construction, blink timer lifecycle, state transitions,
// and build output structure.

import { describe, it, expect } from 'bun:test';
import { StreamingCursor, StreamingCursorState, CURSOR_BLINK_INTERVAL_MS } from '../widgets/streaming-cursor';
import type { BuildContext } from 'flitter-core/src/framework/widget';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Helper to mount a StreamingCursorState for testing.
 * Simulates the framework mounting lifecycle.
 */
function mountState(widget: StreamingCursor): StreamingCursorState {
  const state = widget.createState() as StreamingCursorState;
  const mockElement = {
    widget,
    mounted: true,
    markNeedsBuild: () => {},
  };
  (state as any)._mount(widget, mockElement as unknown as BuildContext);
  return state;
}

/**
 * Helper to simulate didUpdateWidget by calling _update on the state.
 */
function updateWidget(state: StreamingCursorState, newWidget: StreamingCursor): void {
  (state as any)._update(newWidget);
}

/**
 * Helper to simulate unmount by calling _unmount on the state.
 */
function unmountState(state: StreamingCursorState): void {
  (state as any)._unmount();
}

// ===========================================================================
// StreamingCursor — Widget construction
// ===========================================================================

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

  describe('blink interval constant', () => {
    it('CURSOR_BLINK_INTERVAL_MS is 530', () => {
      expect(CURSOR_BLINK_INTERVAL_MS).toBe(530);
    });
  });
});

// ===========================================================================
// StreamingCursorState — Lifecycle
// ===========================================================================

describe('StreamingCursorState: lifecycle', () => {
  it('starts blinking when mounted with isStreaming=true', () => {
    const widget = new StreamingCursor({ text: 'hello', isStreaming: true });
    const state = mountState(widget);

    expect(state.isBlinking).toBe(true);
    expect(state.isCursorVisible).toBe(true);

    unmountState(state);
  });

  it('does not start blinking when mounted with isStreaming=false', () => {
    const widget = new StreamingCursor({ text: 'done', isStreaming: false });
    const state = mountState(widget);

    expect(state.isBlinking).toBe(false);

    unmountState(state);
  });

  it('starts blinking when isStreaming transitions from false to true', () => {
    const widget1 = new StreamingCursor({ text: '', isStreaming: false });
    const state = mountState(widget1);
    expect(state.isBlinking).toBe(false);

    const widget2 = new StreamingCursor({ text: '', isStreaming: true });
    updateWidget(state, widget2);
    expect(state.isBlinking).toBe(true);
    expect(state.isCursorVisible).toBe(true);

    unmountState(state);
  });

  it('stops blinking when isStreaming transitions from true to false', () => {
    const widget1 = new StreamingCursor({ text: 'hello', isStreaming: true });
    const state = mountState(widget1);
    expect(state.isBlinking).toBe(true);

    const widget2 = new StreamingCursor({ text: 'hello world', isStreaming: false });
    updateWidget(state, widget2);
    expect(state.isBlinking).toBe(false);
    expect(state.isCursorVisible).toBe(false);

    unmountState(state);
  });

  it('cleans up timer on dispose', () => {
    const widget = new StreamingCursor({ text: '', isStreaming: true });
    const state = mountState(widget);
    expect(state.isBlinking).toBe(true);

    unmountState(state);
    expect(state.isBlinking).toBe(false);
  });

  it('keeps timer running when text changes but isStreaming stays true', () => {
    const widget1 = new StreamingCursor({ text: 'hello', isStreaming: true });
    const state = mountState(widget1);
    expect(state.isBlinking).toBe(true);

    const widget2 = new StreamingCursor({ text: 'hello world', isStreaming: true });
    updateWidget(state, widget2);
    expect(state.isBlinking).toBe(true);

    unmountState(state);
  });

  it('does not start duplicate timers on repeated isStreaming=true updates', () => {
    const widget1 = new StreamingCursor({ text: '', isStreaming: true });
    const state = mountState(widget1);

    // Update with same isStreaming=true (should be no-op on timer)
    const widget2 = new StreamingCursor({ text: 'a', isStreaming: true });
    updateWidget(state, widget2);
    expect(state.isBlinking).toBe(true);

    unmountState(state);
  });

  it('resets cursor to visible when re-entering streaming', () => {
    const widget1 = new StreamingCursor({ text: 'x', isStreaming: true });
    const state = mountState(widget1);

    // Stop streaming
    const widget2 = new StreamingCursor({ text: 'x', isStreaming: false });
    updateWidget(state, widget2);
    expect(state.isCursorVisible).toBe(false);

    // Re-enter streaming
    const widget3 = new StreamingCursor({ text: 'x', isStreaming: true });
    updateWidget(state, widget3);
    expect(state.isCursorVisible).toBe(true);
    expect(state.isBlinking).toBe(true);

    unmountState(state);
  });
});

// ===========================================================================
// StreamingCursorState — Build output
// ===========================================================================

describe('StreamingCursorState: build output', () => {
  it('renders Markdown when not streaming and text present', () => {
    const widget = new StreamingCursor({ text: 'done message', isStreaming: false });
    const state = mountState(widget);

    const built = state.build({} as any);
    expect(built.constructor.name).toBe('Markdown');

    unmountState(state);
  });

  it('renders Text with "..." when not streaming and text empty', () => {
    const widget = new StreamingCursor({ text: '', isStreaming: false });
    const state = mountState(widget);

    const built = state.build({} as any);
    expect(built.constructor.name).toBe('Text');

    unmountState(state);
  });

  it('renders Markdown when streaming and text present (cursor visible)', () => {
    const widget = new StreamingCursor({ text: 'hello', isStreaming: true });
    const state = mountState(widget);

    // Cursor starts visible
    expect(state.isCursorVisible).toBe(true);
    const built = state.build({} as any);
    expect(built.constructor.name).toBe('Markdown');

    unmountState(state);
  });

  it('renders Text when streaming and text empty (standalone cursor)', () => {
    const widget = new StreamingCursor({ text: '', isStreaming: true });
    const state = mountState(widget);

    const built = state.build({} as any);
    expect(built.constructor.name).toBe('Text');

    unmountState(state);
  });
});
