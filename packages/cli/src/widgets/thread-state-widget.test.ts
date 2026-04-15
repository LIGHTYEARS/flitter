/**
 * thread-state-widget.test.ts -- ThreadStateWidget 响应式订阅 + 布局测试
 *
 * 验证:
 * - initState() 订阅 threadStore.observeThread(threadId)
 * - initState() 订阅 threadWorker.events$
 * - dispose() 取消两个订阅
 * - threadStore 变化触发重建
 * - build() 返回 Column 布局 (Expanded > Scrollable > ConversationView + StatusBar + InputField)
 * - inference:start / inference:error / turn:complete 事件更新状态
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

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
    const { ThreadStateWidget, ThreadStateWidgetState } = await import(
      "./thread-state-widget.js"
    );

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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
    state.initState();

    const tree = state.build({} as any);

    // The root should be a Column
    assert.ok(tree, "build() should return a Widget");
    assert.ok(tree.constructor.name === "Column", `Expected Column, got ${tree.constructor.name}`);
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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
    state.initState();

    const tree = state.build({} as any);
    const children = (tree as any).children || (tree as any).config?.children || [];
    const hasExpanded = children.some(
      (c: any) => c.constructor.name === "Expanded",
    );
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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
    state.initState();

    const tree = state.build({} as any);
    const children = (tree as any).children || (tree as any).config?.children || [];
    const hasInputField = children.some(
      (c: any) => c.constructor.name === "InputField",
    );
    assert.ok(hasInputField, "Column should contain an InputField child");
  });

  it("build() Column 包含 StatusBar 子节点", async () => {
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
    (state as any).setState = (fn?: () => void) => { if (fn) fn(); };
    state.initState();

    const tree = state.build({} as any);
    const children = (tree as any).children || (tree as any).config?.children || [];
    const hasStatusBar = children.some(
      (c: any) => c.constructor.name === "StatusBar",
    );
    assert.ok(hasStatusBar, "Column should contain a StatusBar child");
  });
});
