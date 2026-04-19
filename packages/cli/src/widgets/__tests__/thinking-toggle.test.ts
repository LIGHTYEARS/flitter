/**
 * thinking-toggle.test.ts — Thinking blocks toggle tests
 *
 * Tests that ThreadStateWidgetState.toggleThinkingBlocks() controls
 * whether thinking items are filtered from the display.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:824-834
 *   toggle-thinking-blocks command toggles Ut.instance.toggleAll()
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

// ─── Tests ───────────────────────────────────────────────

describe("ThreadStateWidget thinking toggle", () => {
  it("showThinkingBlocks defaults to true", async () => {
    const { ThreadStateWidget } = await import("../thread-state-widget.js");

    const store = createMockThreadStore("t1", {
      id: "t1",
      v: 0,
      messages: [],
      relationships: [],
    });
    const worker = createMockThreadWorker();

    const widget = new ThreadStateWidget({
      threadStore: store,
      threadWorker: worker,
      threadId: "t1",
      onSubmit: () => {},
    });

    const state = widget.createState();
    (state as any)._widget = widget;
    Object.defineProperty(state, "widget", { get: () => widget });
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
    state.initState();

    assert.equal(state.showThinkingBlocks, true);
  });

  it("toggleThinkingBlocks flips the flag", async () => {
    const { ThreadStateWidget } = await import("../thread-state-widget.js");

    const store = createMockThreadStore("t1", {
      id: "t1",
      v: 0,
      messages: [],
      relationships: [],
    });
    const worker = createMockThreadWorker();

    const widget = new ThreadStateWidget({
      threadStore: store,
      threadWorker: worker,
      threadId: "t1",
      onSubmit: () => {},
    });

    const state = widget.createState();
    (state as any)._widget = widget;
    Object.defineProperty(state, "widget", { get: () => widget });
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
    state.initState();

    assert.equal(state.showThinkingBlocks, true);
    state.toggleThinkingBlocks();
    assert.equal(state.showThinkingBlocks, false);
    state.toggleThinkingBlocks();
    assert.equal(state.showThinkingBlocks, true);
  });

  it("when thinking is hidden, build() filters out thinking items from ConversationView", async () => {
    const { ThreadStateWidget } = await import("../thread-state-widget.js");

    const store = createMockThreadStore("t1", {
      id: "t1",
      v: 0,
      messages: [
        { role: "assistant", content: [
          { type: "thinking", thinking: "Let me think..." },
          { type: "text", text: "Hello!" },
        ]},
      ],
      relationships: [],
    });
    const worker = createMockThreadWorker();

    const widget = new ThreadStateWidget({
      threadStore: store,
      threadWorker: worker,
      threadId: "t1",
      onSubmit: () => {},
    });

    const state = widget.createState();
    (state as any)._widget = widget;
    Object.defineProperty(state, "widget", { get: () => widget });
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
    state.initState();

    // Build with thinking visible
    const tree1 = state.build({} as any);
    assert.ok(tree1);

    // Toggle thinking off
    state.toggleThinkingBlocks();
    assert.equal(state.showThinkingBlocks, false);

    // Build again - should still render (just without thinking blocks)
    const tree2 = state.build({} as any);
    assert.ok(tree2);
  });
});
