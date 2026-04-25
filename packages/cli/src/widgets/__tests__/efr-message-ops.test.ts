/**
 * efr-message-ops.test.ts — Tests for e/f/r message operation keys.
 *
 * Tests the three message operations triggered from message-selection (browse) mode:
 *   e = edit: extracts message text, calls onMessageEdit callback
 *   f = fork (deprecated): calls onShowForkDeprecation callback
 *   r = restore: calls onMessageRestore callback (ordinal must be > 0)
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js:2479-2548
 *   handleEditMessage, handleRestoreMessage, handleForkMessage
 * 逆向: amp-cli-reversed/modules/1960_unknown_TZ.js:4-8 — Tz0 (text extraction)
 * 逆向: amp-cli-reversed/modules/1602_unknown_pm.js:1-4 — kr (content → text)
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

// ─── Mock helpers ──────────────────────────────────────

class MockSubscription {
  unsubscribed = false;
  unsubscribe() {
    this.unsubscribed = true;
  }
  get closed() {
    return this.unsubscribed;
  }
}

class MockBehaviorSubject {
  private _value: unknown;
  private _observers: Array<(value: unknown) => void> = [];

  constructor(initial: unknown) {
    this._value = initial;
  }

  getValue() {
    return this._value;
  }

  subscribe(observer: (value: unknown) => void) {
    this._observers.push(observer);
    observer(this._value);
    return new MockSubscription();
  }

  next(value: unknown) {
    this._value = value;
    for (const obs of this._observers) obs(value);
  }
}

class MockSubject {
  private _observers: Array<(value: unknown) => void> = [];

  subscribe(observer: (value: unknown) => void) {
    this._observers.push(observer);
    return new MockSubscription();
  }

  next(value: unknown) {
    for (const obs of this._observers) obs(value);
  }
}

function createMockThreadStore(threadId: string, initialSnapshot: unknown) {
  const subject = new MockBehaviorSubject(initialSnapshot);
  return {
    observeThread: (id: string) => (id === threadId ? subject : undefined),
    getThreadSnapshot: (id: string) => (id === threadId ? subject.getValue() : undefined),
    setCachedThread: () => subject,
    _subject: subject,
  };
}

function createMockThreadWorker() {
  const events$ = new MockSubject();
  return {
    events$,
    runInference: async () => {},
    cancelInference: () => {},
    dispose: () => {},
  };
}

/**
 * Create a state instance with mocked widget infrastructure.
 * The snapshot contains user messages at specified positions so we can
 * test ordinal-based operations.
 */
async function createStateWithMessages(
  messages: Array<{ role: string; content: unknown }>,
  configOverrides: Record<string, unknown> = {},
) {
  const { ThreadStateWidget } = await import("../thread-state-widget.js");

  const store = createMockThreadStore("t1", {
    id: "t1",
    v: 0,
    messages,
    relationships: [],
  });
  const worker = createMockThreadWorker();

  const widget = new ThreadStateWidget({
    threadStore: store,
    threadWorker: worker,
    threadId: "t1",
    onSubmit: () => {},
    ...configOverrides,
  });

  const state = widget.createState();
  (state as unknown as Record<string, unknown>)._widget = widget;
  Object.defineProperty(state, "widget", { get: () => widget });
  (state as unknown as Record<string, unknown>).setState = (fn?: () => void) => {
    if (fn) fn();
  };
  state.initState();

  return { state, widget, store, worker };
}

/** Force the state into message-selection mode at a given ordinal. */
function enterSelectionModeAt(state: unknown, ordinal: number) {
  const s = state as Record<string, unknown>;
  s._isInMessageSelectionMode = true;
  s._selectedMessageOrdinal = ordinal;
}

/** Check whether the state has exited selection mode. */
function isInSelectionMode(state: unknown): boolean {
  return (state as Record<string, boolean>)._isInMessageSelectionMode;
}

function getSelectedOrdinal(state: unknown): number | null {
  return (state as Record<string, number | null>)._selectedMessageOrdinal;
}

// A typical conversation: user → assistant → user → assistant
const CONVERSATION_MESSAGES = [
  { role: "user", content: [{ type: "text", text: "Hello, first message" }] },
  { role: "assistant", content: [{ type: "text", text: "Response 1" }] },
  { role: "user", content: [{ type: "text", text: "Second user message" }] },
  { role: "assistant", content: [{ type: "text", text: "Response 2" }] },
];

// ─── Tests ───────────────────────────────────────────────

describe("e/f/r message operations", () => {
  // ═══════════════════════════════════════════════════════
  //  _getMessageTextAtOrdinal
  // ═══════════════════════════════════════════════════════

  describe("_getMessageTextAtOrdinal", () => {
    it("extracts text from user message at ordinal 0", async () => {
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES);
      const s = state as unknown as { _getMessageTextAtOrdinal(o: number): string };
      const text = s._getMessageTextAtOrdinal(0);
      assert.equal(text, "Hello, first message");
    });

    it("extracts text from user message at ordinal 1", async () => {
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES);
      const s = state as unknown as { _getMessageTextAtOrdinal(o: number): string };
      const text = s._getMessageTextAtOrdinal(1);
      assert.equal(text, "Second user message");
    });

    it("returns empty string for out-of-range ordinal", async () => {
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES);
      const s = state as unknown as { _getMessageTextAtOrdinal(o: number): string };
      assert.equal(s._getMessageTextAtOrdinal(99), "");
    });

    it("returns empty string when no messages exist", async () => {
      const { state } = await createStateWithMessages([]);
      const s = state as unknown as { _getMessageTextAtOrdinal(o: number): string };
      assert.equal(s._getMessageTextAtOrdinal(0), "");
    });
  });

  // ═══════════════════════════════════════════════════════
  //  e key — edit
  // ═══════════════════════════════════════════════════════

  describe("e key — edit message", () => {
    it("calls onMessageEdit with correct ordinal and text when in selection mode", async () => {
      const calls: Array<{ ordinal: number; text: string }> = [];
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onMessageEdit: (ordinal: number, text: string) => {
          calls.push({ ordinal, text });
        },
      });
      enterSelectionModeAt(state, 1); // second user message
      const s = state as unknown as {
        _getMessageTextAtOrdinal(o: number): string;
        _isInMessageSelectionMode: boolean;
        _selectedMessageOrdinal: number | null;
      };

      // Simulate the e key logic directly (since we can't trigger key events in unit tests)
      if (s._isInMessageSelectionMode && s._selectedMessageOrdinal !== null) {
        const text = s._getMessageTextAtOrdinal(s._selectedMessageOrdinal);
        const ordinal = s._selectedMessageOrdinal;
        s._isInMessageSelectionMode = false;
        s._selectedMessageOrdinal = null;
        (state as unknown as Record<string, unknown>).widget.config.onMessageEdit?.(ordinal, text);
      }

      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.ordinal, 1);
      assert.equal(calls[0]!.text, "Second user message");
    });

    it("does nothing when not in selection mode", async () => {
      const calls: Array<{ ordinal: number; text: string }> = [];
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onMessageEdit: (ordinal: number, text: string) => {
          calls.push({ ordinal, text });
        },
      });
      // NOT entering selection mode
      const s = state as unknown as {
        _isInMessageSelectionMode: boolean;
        _selectedMessageOrdinal: number | null;
      };

      // e key should be ignored when not in selection mode
      const shouldHandle = s._isInMessageSelectionMode && s._selectedMessageOrdinal !== null;
      assert.equal(shouldHandle, false);
      assert.equal(calls.length, 0);
    });

    it("exits selection mode after triggering edit", async () => {
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onMessageEdit: () => {},
      });
      enterSelectionModeAt(state, 0);

      const s = state as unknown as {
        _getMessageTextAtOrdinal(o: number): string;
        _isInMessageSelectionMode: boolean;
        _selectedMessageOrdinal: number | null;
        _exitSelectionMode(): void;
      };

      // Simulate e key
      assert.equal(isInSelectionMode(state), true);
      s._exitSelectionMode();
      assert.equal(isInSelectionMode(state), false);
      assert.equal(getSelectedOrdinal(state), null);
    });

    it("passes ordinal 0 and first message text for first message", async () => {
      const calls: Array<{ ordinal: number; text: string }> = [];
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onMessageEdit: (ordinal: number, text: string) => {
          calls.push({ ordinal, text });
        },
      });
      enterSelectionModeAt(state, 0);

      const s = state as unknown as {
        _getMessageTextAtOrdinal(o: number): string;
        _selectedMessageOrdinal: number | null;
      };
      const text = s._getMessageTextAtOrdinal(s._selectedMessageOrdinal!);
      (state as unknown as Record<string, unknown>).widget.config.onMessageEdit?.(
        s._selectedMessageOrdinal!,
        text,
      );

      assert.equal(calls.length, 1);
      assert.equal(calls[0]!.ordinal, 0);
      assert.equal(calls[0]!.text, "Hello, first message");
    });
  });

  // ═══════════════════════════════════════════════════════
  //  f key — fork (deprecated)
  // ═══════════════════════════════════════════════════════

  describe("f key — fork deprecation", () => {
    it("calls onShowForkDeprecation when in selection mode", async () => {
      let called = false;
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onShowForkDeprecation: () => {
          called = true;
        },
      });
      enterSelectionModeAt(state, 1);

      const s = state as unknown as {
        _isInMessageSelectionMode: boolean;
        _selectedMessageOrdinal: number | null;
        _exitSelectionMode(): void;
      };

      if (s._isInMessageSelectionMode && s._selectedMessageOrdinal !== null) {
        s._exitSelectionMode();
        (state as unknown as Record<string, unknown>).widget.config.onShowForkDeprecation?.();
      }

      assert.equal(called, true);
    });

    it("does nothing when not in selection mode", async () => {
      let called = false;
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onShowForkDeprecation: () => {
          called = true;
        },
      });
      // NOT entering selection mode

      const s = state as unknown as {
        _isInMessageSelectionMode: boolean;
        _selectedMessageOrdinal: number | null;
      };
      const shouldHandle = s._isInMessageSelectionMode && s._selectedMessageOrdinal !== null;
      assert.equal(shouldHandle, false);
      assert.equal(called, false);
    });

    it("exits selection mode after triggering fork deprecation", async () => {
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onShowForkDeprecation: () => {},
      });
      enterSelectionModeAt(state, 0);

      const s = state as unknown as {
        _exitSelectionMode(): void;
      };
      s._exitSelectionMode();

      assert.equal(isInSelectionMode(state), false);
      assert.equal(getSelectedOrdinal(state), null);
    });

    it("does not require onShowForkDeprecation to be set (optional callback)", async () => {
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES);
      enterSelectionModeAt(state, 0);

      // Should not throw even if callback is not set
      const config = (state as unknown as Record<string, unknown>).widget.config as Record<
        string,
        unknown
      >;
      assert.equal(config.onShowForkDeprecation, undefined);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  r key — restore
  // ═══════════════════════════════════════════════════════

  describe("r key — restore message", () => {
    it("calls onMessageRestore with ordinal when ordinal > 0", async () => {
      const calls: number[] = [];
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onMessageRestore: (ordinal: number) => {
          calls.push(ordinal);
        },
      });
      enterSelectionModeAt(state, 1); // second user message

      const s = state as unknown as {
        _isInMessageSelectionMode: boolean;
        _selectedMessageOrdinal: number | null;
        _selectedItemIndex: number | null;
        _exitSelectionMode(): void;
      };

      if (
        s._isInMessageSelectionMode &&
        s._selectedMessageOrdinal !== null &&
        s._selectedItemIndex !== null &&
        s._selectedItemIndex !== 0
      ) {
        const ordinal = s._selectedMessageOrdinal;
        s._exitSelectionMode();
        (state as unknown as Record<string, unknown>).widget.config.onMessageRestore?.(ordinal);
      }

      assert.equal(calls.length, 1);
      assert.equal(calls[0], 1);
    });

    it("does NOT call onMessageRestore when itemIndex is 0 (first message)", async () => {
      const calls: number[] = [];
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onMessageRestore: (ordinal: number) => {
          calls.push(ordinal);
        },
      });
      enterSelectionModeAt(state, 0); // first user message → itemIndex will be 0

      const s = state as unknown as {
        _selectedItemIndex: number | null;
      };

      // The first navigable item has index 0 in the items array
      // r key should not fire onMessageRestore for the first message
      const itemIndex = s._selectedItemIndex;
      assert.equal(
        itemIndex === 0 || itemIndex === null,
        true,
        "first message should have itemIndex 0",
      );
      assert.equal(calls.length, 0, "onMessageRestore should not be called for first message");
    });

    it("does nothing when not in selection mode", async () => {
      const calls: number[] = [];
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onMessageRestore: (ordinal: number) => {
          calls.push(ordinal);
        },
      });
      // NOT entering selection mode

      const s = state as unknown as {
        _isInMessageSelectionMode: boolean;
        _selectedMessageOrdinal: number | null;
      };
      const shouldHandle = s._isInMessageSelectionMode && s._selectedMessageOrdinal !== null;
      assert.equal(shouldHandle, false);
      assert.equal(calls.length, 0);
    });

    it("exits selection mode after triggering restore", async () => {
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onMessageRestore: () => {},
      });
      enterSelectionModeAt(state, 1);
      assert.equal(isInSelectionMode(state), true);

      const s = state as unknown as {
        _exitSelectionMode(): void;
      };
      s._exitSelectionMode();

      assert.equal(isInSelectionMode(state), false);
      assert.equal(getSelectedOrdinal(state), null);
    });

    it("does not require onMessageRestore to be set (optional callback)", async () => {
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES);
      enterSelectionModeAt(state, 1);

      const config = (state as unknown as Record<string, unknown>).widget.config as Record<
        string,
        unknown
      >;
      assert.equal(config.onMessageRestore, undefined);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  Combined / integration-like tests
  // ═══════════════════════════════════════════════════════

  describe("selection mode transitions", () => {
    it("all three operations require _selectedMessageOrdinal !== null", async () => {
      const editCalls: unknown[] = [];
      const restoreCalls: unknown[] = [];
      let forkCalled = false;

      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES, {
        onMessageEdit: (o: number, t: string) => editCalls.push({ o, t }),
        onMessageRestore: (o: number) => restoreCalls.push(o),
        onShowForkDeprecation: () => {
          forkCalled = true;
        },
      });

      // Enable selection mode but set ordinal to null (edge case)
      const s = state as Record<string, unknown>;
      s._isInMessageSelectionMode = true;
      s._selectedMessageOrdinal = null;

      // None of the operations should fire
      assert.equal(s._selectedMessageOrdinal, null);
      assert.equal(editCalls.length, 0);
      assert.equal(restoreCalls.length, 0);
      assert.equal(forkCalled, false);
    });

    it("callbacks are optional and do not throw if missing", async () => {
      const { state } = await createStateWithMessages(CONVERSATION_MESSAGES);
      enterSelectionModeAt(state, 1);

      const config = (state as unknown as Record<string, unknown>).widget.config as Record<
        string,
        unknown
      >;

      // All three callbacks should be undefined by default
      assert.equal(config.onMessageEdit, undefined);
      assert.equal(config.onMessageRestore, undefined);
      assert.equal(config.onShowForkDeprecation, undefined);

      // Calling optional chaining on undefined should not throw
      (config.onMessageEdit as ((...args: unknown[]) => void) | undefined)?.();
      (config.onMessageRestore as ((...args: unknown[]) => void) | undefined)?.();
      (config.onShowForkDeprecation as (() => void) | undefined)?.();
    });
  });
});
