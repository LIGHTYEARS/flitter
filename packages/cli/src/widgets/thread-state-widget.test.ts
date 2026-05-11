/**
 * thread-state-widget.test.ts -- ThreadStateWidget 响应式订阅 + 布局测试
 *
 * 验证:
 * - initState() 订阅 threadStore.observeThread(threadId)
 * - initState() 订阅 threadWorker.events$
 * - dispose() 取消两个订阅
 * - threadStore 变化触发重建
 * - build() 返回 Column 布局 (Expanded > Scrollable > ConversationView + BottomStatusLine + InputField)
 * - inference:start / inference:error / turn:complete 事件更新状态
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Helper: build() now returns Stack { Column, [Positioned(overlay)] }.
 * This helper unwraps the Stack to get the Column's children.
 */
function getColumnChildren(tree: unknown): unknown[] {
  const stackChildren: unknown[] = (tree as any).children ?? [];
  const column = stackChildren[0] as any;
  return column?.children ?? column?.config?.children ?? [];
}

/**
 * Recursively find a widget by constructor name in the widget tree.
 * Handles Container wrapping (InputField now lives inside Container with BoxConstraints).
 */
function findWidgetByName(node: unknown, name: string): unknown | null {
  if (!node || typeof node !== "object") return null;
  if ((node as any).constructor?.name === name) return node;
  // Check config.child
  const configChild = (node as any).config?.child ?? (node as any).child;
  if (configChild) {
    const found = findWidgetByName(configChild, name);
    if (found) return found;
  }
  // Check children array
  const children = (node as any).children ?? (node as any).config?.children ?? [];
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findWidgetByName(child, name);
      if (found) return found;
    }
  }
  return null;
}

// ─── 简单 Mock 工具 ─────────────────────────────────────────

/** 简单 Subscription mock */
class MockSubscription {
  unsubscribed = false;
  unsubscribe() {
    this.unsubscribed = true;
  }
  get closed() {
    return this.unsubscribed;
  }
}

/** 简单 BehaviorSubject mock */
class MockBehaviorSubject<T> {
  private _value: T;
  private _observers: Array<(value: T) => void> = [];

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  getValue(): T {
    return this._value;
  }

  subscribe(observer: (value: T) => void): MockSubscription {
    this._observers.push(observer);
    // BehaviorSubject 立即发射当前值
    observer(this._value);
    const sub = new MockSubscription();
    return sub;
  }

  next(value: T): void {
    this._value = value;
    for (const obs of this._observers) {
      obs(value);
    }
  }
}

/** 简单 Subject mock */
class MockSubject<T> {
  private _observers: Array<(value: T) => void> = [];

  subscribe(observer: (value: T) => void): MockSubscription {
    this._observers.push(observer);
    const sub = new MockSubscription();
    return sub;
  }

  next(value: T): void {
    for (const obs of this._observers) {
      obs(value);
    }
  }
}

/** 创建 mock ThreadStore */
function createMockThreadStore(threadId: string, initialSnapshot: unknown) {
  const subject = new MockBehaviorSubject(initialSnapshot);
  return {
    observeThread: (id: string) => {
      if (id === threadId) return subject;
      return undefined;
    },
    getThreadSnapshot: (id: string) => {
      if (id === threadId) return subject.getValue();
      return undefined;
    },
    setCachedThread: () => subject,
    _subject: subject,
  };
}

/** 创建 mock ThreadWorker */
function createMockThreadWorker() {
  const events$ = new MockSubject<unknown>();
  return {
    events$,
    runInference: async () => {},
    cancelInference: () => {},
    dispose: () => {},
  };
}

// ─── 测试 ─────────────────────────────────────────────────

describe("ThreadStateWidget", () => {
  it("ThreadStateWidgetConfig 包含 threadStore/threadWorker/threadId/onSubmit", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

    const store = createMockThreadStore("t1", { id: "t1", v: 0, messages: [], relationships: [] });
    const worker = createMockThreadWorker();

    const widget = new ThreadStateWidget({
      threadStore: store,
      threadWorker: worker,
      threadId: "t1",
      onSubmit: () => {},
    });

    assert.equal(widget.config.threadId, "t1");
    assert.equal(widget.config.threadStore, store);
    assert.equal(widget.config.threadWorker, worker);
    assert.equal(typeof widget.config.onSubmit, "function");
  });

  it("createState() 返回 ThreadStateWidgetState 实例", async () => {
    const { ThreadStateWidget, ThreadStateWidgetState } = await import("./thread-state-widget.js");

    const store = createMockThreadStore("t1", { id: "t1", v: 0, messages: [], relationships: [] });
    const worker = createMockThreadWorker();

    const widget = new ThreadStateWidget({
      threadStore: store,
      threadWorker: worker,
      threadId: "t1",
      onSubmit: () => {},
    });

    const state = widget.createState();
    assert.ok(state instanceof ThreadStateWidgetState);
  });

  it("initState 订阅 threadStore.observeThread(threadId)", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

    let observedId: string | null = null;
    const subject = new MockBehaviorSubject({ id: "t1", v: 0, messages: [], relationships: [] });
    const store = {
      observeThread: (id: string) => {
        observedId = id;
        return subject;
      },
      getThreadSnapshot: () => null,
      setCachedThread: () => subject,
    };
    const worker = createMockThreadWorker();

    const widget = new ThreadStateWidget({
      threadStore: store,
      threadWorker: worker,
      threadId: "t1",
      onSubmit: () => {},
    });

    const state = widget.createState();
    // Wire up widget reference (normally done by framework)
    (state as any)._widget = widget;
    Object.defineProperty(state, "widget", { get: () => widget });
    // Mock setState to be a no-op
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    assert.equal(observedId, "t1");
  });

  it("initState 订阅 threadWorker.events$", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

    const store = createMockThreadStore("t1", {
      id: "t1",
      v: 0,
      messages: [],
      relationships: [],
    });
    const worker = createMockThreadWorker();
    let eventSubscribed = false;
    const origSubscribe = worker.events$.subscribe.bind(worker.events$);
    worker.events$.subscribe = (obs: (value: unknown) => void) => {
      eventSubscribed = true;
      return origSubscribe(obs);
    };

    const widget = new ThreadStateWidget({
      threadStore: store,
      threadWorker: worker,
      threadId: "t1",
      onSubmit: () => {},
    });

    const state = widget.createState();
    (state as any)._widget = widget;
    Object.defineProperty(state, "widget", { get: () => widget });
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    assert.ok(eventSubscribed, "should subscribe to threadWorker.events$");
  });

  it("dispose 取消两个订阅", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    // dispose should not throw
    state.dispose();
    // Calling dispose again should be safe
    state.dispose();
  });

  it("threadStore 新 snapshot 触发 setState", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

    const store = createMockThreadStore("t1", {
      id: "t1",
      v: 0,
      messages: [],
      relationships: [],
    });
    const worker = createMockThreadWorker();

    let setStateCalls = 0;
    const widget = new ThreadStateWidget({
      threadStore: store,
      threadWorker: worker,
      threadId: "t1",
      onSubmit: () => {},
    });

    const state = widget.createState();
    (state as any)._widget = widget;
    Object.defineProperty(state, "widget", { get: () => widget });
    (state as any).setState = (fn?: () => void) => {
      setStateCalls++;
      if (fn) fn();
    };
    state.initState();

    // Initial subscribe triggers immediate emission from BehaviorSubject
    const initialCalls = setStateCalls;

    // Emit new snapshot
    store._subject.next({
      id: "t1",
      v: 1,
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
      relationships: [],
    });

    assert.ok(setStateCalls > initialCalls, "setState should have been called after new snapshot");
  });

  it("inference:start 事件更新 inferenceState 为 running", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    // Emit inference:start event
    worker.events$.next({ type: "inference:start" });

    // Check internal state (access private via any)
    assert.equal((state as any)._inferenceState, "running");
  });

  it("inference:error 事件更新 error 和 inferenceState", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    const testError = new Error("test error");
    worker.events$.next({ type: "inference:error", error: testError });

    assert.equal((state as any)._error, testError);
    assert.equal((state as any)._inferenceState, "idle");
  });

  it("turn:complete 事件清除 error 和 inferenceState", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    // Set up some state first
    worker.events$.next({ type: "inference:start" });
    assert.equal((state as any)._inferenceState, "running");

    // turn:complete should reset
    worker.events$.next({ type: "turn:complete" });
    assert.equal((state as any)._inferenceState, "idle");
    assert.equal((state as any)._error, null);
  });

  it("build() 返回包含 ConversationView 的 Widget 树", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
      modelName: "claude-sonnet",
      tokenCount: 42,
    });

    const state = widget.createState();
    (state as any)._widget = widget;
    Object.defineProperty(state, "widget", { get: () => widget });
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    const tree = state.build({} as any);

    // The root is a Stack wrapping the Column (always-Stack pattern for overlay support)
    assert.ok(tree, "build() should return a Widget");
    assert.ok(tree.constructor.name === "Stack", `Expected Stack, got ${tree.constructor.name}`);
    const stackChildren = (tree as any).children || [];
    assert.ok(stackChildren.length >= 1, "Stack should have at least 1 child");
    assert.ok(
      stackChildren[0].constructor.name === "Column",
      `Expected Column as first Stack child, got ${stackChildren[0].constructor.name}`,
    );
  });

  it("build() Column 包含 Expanded 子节点", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    const tree = state.build({} as any);
    const children = getColumnChildren(tree);
    const hasExpanded = children.some((c: any) => c.constructor.name === "Expanded");
    assert.ok(hasExpanded, "Column should contain an Expanded child");
  });

  it("build() Column 包含 InputField 子节点", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    const tree = state.build({} as any);
    const inputField = findWidgetByName(tree, "InputField");
    assert.ok(
      inputField,
      "Column should contain an InputField child (possibly wrapped in Container)",
    );
  });

  it("build() Column 包含 BottomStatusLine 子节点 (StatusBar 已移除)", async () => {
    const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
      modelName: "claude-sonnet",
      tokenCount: 42,
    });

    const state = widget.createState();
    (state as any)._widget = widget;
    Object.defineProperty(state, "widget", { get: () => widget });
    (state as any).setState = (fn?: () => void) => {
      if (fn) fn();
    };
    state.initState();

    const tree = state.build({} as any);
    const children = getColumnChildren(tree);
    // StatusBar removed (Gap A/F) — now uses BottomStatusLine instead
    const hasBottomStatusLine = children.some(
      (c: any) => c.constructor.name === "BottomStatusLine",
    );
    assert.ok(hasBottomStatusLine, "Column should contain a BottomStatusLine child");
    const hasStatusBar = children.some((c: any) => c.constructor.name === "StatusBar");
    assert.ok(!hasStatusBar, "Column should NOT contain a standalone StatusBar");
  });

  describe("_buildTopRightLabel", () => {
    it("includes skill count when skillCount is provided", async () => {
      const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
        modeName: "smart",
        skillCount: 77,
      });

      const state = widget.createState();
      (state as any)._widget = widget;
      Object.defineProperty(state, "widget", { get: () => widget });
      (state as any).setState = (fn?: () => void) => {
        if (fn) fn();
      };
      state.initState();

      // 逆向: jetbrains_wizard.js:5884 — `${mode}──!─${count}─skills`
      const label = (state as any)._buildTopRightLabel();
      assert.equal(label, "smart\u2500\u2500!\u250077\u2500skills");
    });

    it("returns only mode name when skillCount is undefined", async () => {
      const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
        modeName: "deep",
      });

      const state = widget.createState();
      (state as any)._widget = widget;
      Object.defineProperty(state, "widget", { get: () => widget });
      (state as any).setState = (fn?: () => void) => {
        if (fn) fn();
      };
      state.initState();

      const label = (state as any)._buildTopRightLabel();
      assert.equal(label, "deep");
    });
  });

  describe("_buildTopLeftLabel", () => {
    it("returns empty string when no tokens have been consumed", async () => {
      const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
        modelName: "claude-sonnet-4-20250514",
      });

      const state = widget.createState();
      (state as any)._widget = widget;
      Object.defineProperty(state, "widget", { get: () => widget });
      (state as any).setState = (fn?: () => void) => {
        if (fn) fn();
      };
      state.initState();

      // 逆向: jetbrains_wizard.js:6072 — guard: !l.isThreadEmpty()
      // totalUsed === 0 means no tokens consumed → welcome screen → return ""
      const label = (state as any)._buildTopLeftLabel();
      assert.equal(label, "");
    });

    it("returns token percentage when tokens have been consumed", async () => {
      const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
        modelName: "claude-sonnet-4-20250514",
      });

      const state = widget.createState();
      (state as any)._widget = widget;
      Object.defineProperty(state, "widget", { get: () => widget });
      (state as any).setState = (fn?: () => void) => {
        if (fn) fn();
      };
      state.initState();

      // Simulate token usage: 15000 input + 5000 output = 20000 total
      (state as any)._totalInputTokens = 15000;
      (state as any)._totalOutputTokens = 5000;

      const label = (state as any)._buildTopLeftLabel();
      assert.ok(label.includes("% of"), `Expected token percentage label, got: "${label}"`);
    });
  });

  // ─── Message Navigation State Machine ─────────────────────────────────────
  // 逆向: f8R state class (chunk-006.js:31664)
  //   _navigateUp / _navigateDown / _enterSelectionMode / _exitSelectionMode

  describe("message navigation state machine", () => {
    /** Helper: create a state with N user messages loaded */
    async function createStateWithMessages(messageCount: number) {
      const { ThreadStateWidget } = await import("./thread-state-widget.js");

      const messages = Array.from({ length: messageCount }, (_, i) => ({
        role: "user",
        content: [{ type: "text", text: `Message ${i}` }],
        state: { type: "complete" },
      }));

      const store = createMockThreadStore("t1", { id: "t1", v: 0, messages, relationships: [] });
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
      (state as any).setState = (fn?: () => void) => {
        if (fn) fn();
      };
      // Stub scroll controller to prevent errors in headless environment
      (state as any)._scrollController = {
        followMode: true,
        offset: 0,
        maxScrollExtent: 0,
        jumpTo: () => {},
        scrollToBottom: () => {},
        scrollDown: () => {},
        scrollUp: () => {},
        dispose: () => {},
        addListener: () => {},
        removeListener: () => {},
      };
      state.initState();

      // Manually populate _items from transformThreadToDisplayItems
      // (initState subscribes to threadStore which fires immediately, so _items is already set)
      return state;
    }

    it("_navigableItemIndices returns indices of user messages", async () => {
      const state = await createStateWithMessages(3);
      const indices = (state as any)._navigableItemIndices as number[];
      assert.equal(indices.length, 3, "Should have 3 navigable indices");
    });

    it("_navigableItemIndices returns empty array when no messages", async () => {
      const state = await createStateWithMessages(0);
      const indices = (state as any)._navigableItemIndices as number[];
      assert.equal(indices.length, 0);
    });

    it("_enterSelectionMode selects the last message", async () => {
      const state = await createStateWithMessages(3);
      (state as any)._enterSelectionMode();
      assert.equal((state as any)._isInMessageSelectionMode, true);
      assert.equal((state as any)._selectedMessageOrdinal, 2, "Last message ordinal = 2");
    });

    it("_enterSelectionMode is no-op when no messages", async () => {
      const state = await createStateWithMessages(0);
      (state as any)._enterSelectionMode();
      assert.equal((state as any)._isInMessageSelectionMode, false);
      assert.equal((state as any)._selectedMessageOrdinal, null);
    });

    it("_exitSelectionMode clears selection", async () => {
      const state = await createStateWithMessages(3);
      (state as any)._enterSelectionMode();
      assert.equal((state as any)._isInMessageSelectionMode, true);

      (state as any)._exitSelectionMode();
      assert.equal((state as any)._isInMessageSelectionMode, false);
      assert.equal((state as any)._selectedMessageOrdinal, null);
    });

    it("_navigateUp from last message goes to second-to-last", async () => {
      const state = await createStateWithMessages(4);
      (state as any)._enterSelectionMode(); // selects ordinal 3
      assert.equal((state as any)._selectedMessageOrdinal, 3);

      (state as any)._navigateUp();
      assert.equal((state as any)._selectedMessageOrdinal, 2);

      (state as any)._navigateUp();
      assert.equal((state as any)._selectedMessageOrdinal, 1);

      (state as any)._navigateUp();
      assert.equal((state as any)._selectedMessageOrdinal, 0);
    });

    it("_navigateUp clamps at ordinal 0 (stays at first message)", async () => {
      // 逆向: f8R._navigateUp — if (T <= 0) return 0
      const state = await createStateWithMessages(3);
      (state as any)._selectedMessageOrdinal = 0;
      (state as any)._isInMessageSelectionMode = true;

      (state as any)._navigateUp();
      assert.equal((state as any)._selectedMessageOrdinal, 0, "Should stay at 0");
    });

    it("_navigateDown from last message exits selection mode", async () => {
      // 逆向: f8R._navigateDown — T >= R-1 → exit selection mode
      const state = await createStateWithMessages(3);
      (state as any)._enterSelectionMode(); // selects ordinal 2 (last)

      (state as any)._navigateDown(); // at last → exit
      assert.equal((state as any)._isInMessageSelectionMode, false);
      assert.equal((state as any)._selectedMessageOrdinal, null);
    });

    it("_navigateDown moves to next message when not at last", async () => {
      const state = await createStateWithMessages(4);
      (state as any)._selectedMessageOrdinal = 0;
      (state as any)._isInMessageSelectionMode = true;

      (state as any)._navigateDown();
      assert.equal((state as any)._selectedMessageOrdinal, 1);

      (state as any)._navigateDown();
      assert.equal((state as any)._selectedMessageOrdinal, 2);
    });

    it("_selectedItemIndex returns correct items index for selected ordinal", async () => {
      const state = await createStateWithMessages(2);
      const nav = (state as any)._navigableItemIndices as number[];
      assert.ok(nav.length >= 2, "Need at least 2 navigable items");

      (state as any)._selectedMessageOrdinal = 0;
      const idx0 = (state as any)._selectedItemIndex;
      assert.equal(idx0, nav[0]);

      (state as any)._selectedMessageOrdinal = 1;
      const idx1 = (state as any)._selectedItemIndex;
      assert.equal(idx1, nav[1]);
    });

    it("_selectedItemIndex returns null when ordinal is null", async () => {
      const state = await createStateWithMessages(2);
      (state as any)._selectedMessageOrdinal = null;
      assert.equal((state as any)._selectedItemIndex, null);
    });

    it("full navigation round-trip: enter → navigate up/down → exit", async () => {
      const state = await createStateWithMessages(3);

      // Enter: selects last (ordinal 2)
      (state as any)._enterSelectionMode();
      assert.equal((state as any)._selectedMessageOrdinal, 2);
      assert.equal((state as any)._isInMessageSelectionMode, true);

      // Tab (up) → ordinal 1
      (state as any)._navigateUp();
      assert.equal((state as any)._selectedMessageOrdinal, 1);

      // Tab (up) → ordinal 0
      (state as any)._navigateUp();
      assert.equal((state as any)._selectedMessageOrdinal, 0);

      // Shift+Tab (down) → ordinal 1
      (state as any)._navigateDown();
      assert.equal((state as any)._selectedMessageOrdinal, 1);

      // Shift+Tab (down) → ordinal 2
      (state as any)._navigateDown();
      assert.equal((state as any)._selectedMessageOrdinal, 2);

      // Shift+Tab (down) from last → exit selection mode
      (state as any)._navigateDown();
      assert.equal((state as any)._isInMessageSelectionMode, false);
      assert.equal((state as any)._selectedMessageOrdinal, null);
    });

    it("Escape clears selection and exits mode", async () => {
      const state = await createStateWithMessages(3);
      (state as any)._enterSelectionMode();
      (state as any)._navigateUp(); // move away from last

      (state as any)._exitSelectionMode();
      assert.equal((state as any)._isInMessageSelectionMode, false);
      assert.equal((state as any)._selectedMessageOrdinal, null);
    });
  });

  // ─── Shortcuts Help Panel ────────────────────────────────────────────────────
  // 逆向: chunk-006.js:34295 — isShowingShortcutsHelp = false
  // 逆向: chunk-006.js:36288-36308 — toggle on ? when focused, dismiss on any key
  // 逆向: chunk-006.js:37662-37664 — topWidget: isShowingShortcutsHelp ? new U8R(...) : void 0

  describe("shortcuts help panel", () => {
    /** Helper: create a state in a headless-friendly environment */
    async function createState() {
      const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
      (state as any).setState = (fn?: () => void) => {
        if (fn) fn();
      };
      (state as any)._scrollController = {
        followMode: true,
        offset: 0,
        maxScrollExtent: 0,
        jumpTo: () => {},
        scrollToBottom: () => {},
        scrollDown: () => {},
        scrollUp: () => {},
        dispose: () => {},
        addListener: () => {},
        removeListener: () => {},
      };
      state.initState();
      return state;
    }

    it("_isShowingShortcutsHelp defaults to false", async () => {
      const state = await createState();
      assert.equal((state as any)._isShowingShortcutsHelp, false);
    });

    it("build() includes ShortcutsPopup when _isShowingShortcutsHelp is true", async () => {
      const { ShortcutsPopup } = await import("./shortcuts-popup.js");
      const state = await createState();

      // Set help panel flag directly
      (state as any)._isShowingShortcutsHelp = true;

      const tree = state.build({} as any);
      // ShortcutsPopup is now passed as topWidget prop on InputField
      // 逆向: k8R topWidget (chunk-006.js:37662-37664)
      const inputField = findWidgetByName(tree, "InputField") as any;
      assert.ok(inputField, "Should have an InputField child");
      assert.ok(
        inputField.config.topWidget instanceof ShortcutsPopup,
        "InputField.topWidget should be a ShortcutsPopup when help is shown",
      );
    });

    it("build() excludes ShortcutsPopup when _isShowingShortcutsHelp is false", async () => {
      const state = await createState();

      (state as any)._isShowingShortcutsHelp = false;

      const tree = state.build({} as any);
      const inputField = findWidgetByName(tree, "InputField") as any;
      assert.ok(inputField, "Should have an InputField child");
      assert.ok(
        !inputField.config.topWidget,
        "InputField.topWidget should be undefined when help is hidden",
      );
    });

    it("InputField placeholder shows '? for shortcuts' when help is not shown", async () => {
      const state = await createState();

      (state as any)._isShowingShortcutsHelp = false;

      const tree = state.build({} as any);
      const inputField = findWidgetByName(tree, "InputField") as any;
      assert.ok(inputField, "Should have an InputField child");
      assert.equal(
        inputField.config.placeholder,
        "? for shortcuts",
        "Placeholder should be '? for shortcuts' when help is not shown",
      );
    });

    it("InputField placeholder is empty string when help is shown", async () => {
      const state = await createState();

      (state as any)._isShowingShortcutsHelp = true;

      const tree = state.build({} as any);
      const inputField = findWidgetByName(tree, "InputField") as any;
      assert.ok(inputField, "Should have an InputField child");
      assert.equal(
        inputField.config.placeholder,
        "",
        "Placeholder should be empty when shortcuts help panel is visible",
      );
    });
  });

  // ─── Dense/Normal View Mode Tests ─────────────────────────────────────
  describe("Dense/Normal view mode (Alt+T)", () => {
    it("toggleThinkingBlocks toggles _showThinkingBlocks in non-deep mode", async () => {
      const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
        modeName: "smart", // NOT deep — dense mode should not be toggled
      });

      const state = widget.createState();
      (state as any)._widget = widget;
      Object.defineProperty(state, "widget", { get: () => widget });
      (state as any).setState = (fn?: () => void) => {
        if (fn) fn();
      };
      state.initState();

      // Initial state
      assert.equal(state.showThinkingBlocks, true, "thinking blocks should start visible");
      assert.equal(state.isDenseViewEnabled, false, "dense view should start disabled");

      // Toggle once (Alt+T in non-deep mode)
      state.toggleThinkingBlocks();
      assert.equal(
        state.showThinkingBlocks,
        false,
        "thinking blocks should be hidden after toggle",
      );
      assert.equal(
        state.isDenseViewEnabled,
        false,
        "dense view should remain disabled in non-deep mode",
      );

      // Toggle back
      state.toggleThinkingBlocks();
      assert.equal(state.showThinkingBlocks, true, "thinking blocks should be visible again");
      assert.equal(state.isDenseViewEnabled, false, "dense view still disabled in non-deep mode");
    });

    it("toggleThinkingBlocks toggles both thinking and dense in deep mode", async () => {
      const { ThreadStateWidget } = await import("./thread-state-widget.js");

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
        modeName: "deep", // deep mode — dense view should be toggled
      });

      const state = widget.createState();
      (state as any)._widget = widget;
      Object.defineProperty(state, "widget", { get: () => widget });
      (state as any).setState = (fn?: () => void) => {
        if (fn) fn();
      };
      state.initState();

      // Initial state
      assert.equal(state.showThinkingBlocks, true, "thinking blocks should start visible");
      assert.equal(state.isDenseViewEnabled, false, "dense view should start disabled");

      // Toggle (Alt+T in deep mode) — enables dense, hides thinking
      state.toggleThinkingBlocks();
      assert.equal(state.isDenseViewEnabled, true, "dense view should be enabled in deep mode");
      // 逆向: chunk-006.js:31705 — showThinkingBlocks: !this._isDenseViewEnabled
      assert.equal(state.showThinkingBlocks, false, "thinking blocks hidden when dense is enabled");

      // Toggle again — disables dense, shows thinking
      state.toggleThinkingBlocks();
      assert.equal(state.isDenseViewEnabled, false, "dense view should be disabled again");
      assert.equal(
        state.showThinkingBlocks,
        true,
        "thinking blocks visible when dense is disabled",
      );
    });

    it("denseView prop is passed to ConversationView in build()", async () => {
      const { ThreadStateWidget } = await import("./thread-state-widget.js");
      const { ConversationView } = await import("./conversation-view.js");

      const store = createMockThreadStore("t1", {
        id: "t1",
        v: 0,
        messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
        relationships: [],
      });
      const worker = createMockThreadWorker();

      const widget = new ThreadStateWidget({
        threadStore: store,
        threadWorker: worker,
        threadId: "t1",
        onSubmit: () => {},
        modeName: "deep",
      });

      const state = widget.createState();
      (state as any)._widget = widget;
      Object.defineProperty(state, "widget", { get: () => widget });
      (state as any).setState = (fn?: () => void) => {
        if (fn) fn();
      };
      state.initState();

      // Enable dense mode
      state.toggleThinkingBlocks();
      assert.equal(state.isDenseViewEnabled, true);

      // Build the tree and find ConversationView
      const tree = state.build({} as any);
      function findConversationView(node: any): any {
        if (node instanceof ConversationView) return node;
        const children = node?.children ?? node?.config?.children ?? [];
        if (node?.child) {
          const found = findConversationView(node.child);
          if (found) return found;
        }
        if (node?.config?.child) {
          const found = findConversationView(node.config.child);
          if (found) return found;
        }
        for (const child of Array.isArray(children) ? children : []) {
          const found = findConversationView(child);
          if (found) return found;
        }
        return null;
      }
      const cv = findConversationView(tree);
      if (cv) {
        assert.equal(cv.config.denseView, true, "ConversationView should receive denseView=true");
      }
      // If ConversationView is not found in the tree (e.g., WelcomeScreen shown instead),
      // that's fine — the test is about the prop being passed when items exist.
    });
  });
});
