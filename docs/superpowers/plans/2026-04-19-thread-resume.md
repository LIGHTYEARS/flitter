> **STATUS: COMPLETED** — This plan has been fully implemented and is kept for historical reference only.

# Thread Resume and Stream Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement stream recovery when inference is interrupted mid-stream: detect and truncate incomplete streaming messages on resume, detect incomplete tool_use blocks (empty input), and implement message queueing for user messages during tool execution.

**Architecture:** Three features: (1) `resume()` method on ThreadWorker that inspects the last message and truncates if it was mid-stream, (2) incomplete tool_use detection that identifies tool_use blocks with `complete === false` or empty input, (3) a message queue (`queuedMessages` on ThreadSnapshot) that buffers user messages while tools are running and dequeues them when the turn completes.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/agent-core` (ThreadWorker, ToolOrchestrator), `@flitter/util` (BehaviorSubject, Subject)

**Amp reference:**
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:259-270` — `resume()`: checks last message, truncates if `state.type === "streaming"`, calls `toolOrchestrator.onResume()`, `replayLastCompleteMessage()`
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:272-274` — `shouldResumeFromLastMessage()`: checks NlR (cancelled), HlR (rejected), NET (info) messages
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:276-297` — `replayLastCompleteMessage()`: finds last complete user/assistant message and replays it
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:949-970` — incomplete tool_use detection: `l.content.some(v => v.type === "tool_use" && v.complete && Object.keys(v.input ?? {}).length === 0)` or `l.state.type === "streaming"`
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:528-561` — `user:message-queue:enqueue`: checks if tools are running → buffers; if idle/cancelled → dequeues immediately
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:431-437` — `user:message-queue:dequeue`: takes last queued message and processes it as a normal user message
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:661-662` — on `inference:completed` + end_turn, if `queuedMessages.length > 0`, dequeue

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/agent-core/src/worker/thread-worker.ts` | Add resume(), message queue, incomplete detection |
| Modify | `packages/agent-core/src/worker/events.ts` | Add resume-related event types |
| Create | `packages/agent-core/src/worker/__tests__/thread-resume.test.ts` | Tests for resume and message queue |
| Modify | `packages/agent-core/src/index.ts` | Export new types |

---

### Task 1: Detect and truncate incomplete streaming messages on resume

**Why first:** This is the most critical recovery mechanism. When a user interrupts a session (Ctrl-C, crash, etc.), the last assistant message may be in `state.type === "streaming"`. On resume, this must be truncated so inference can restart cleanly.

**Files:**
- Modify: `packages/agent-core/src/worker/thread-worker.ts`
- Test: `packages/agent-core/src/worker/__tests__/thread-resume.test.ts`

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:259-267`:
```js
async resume() {
  if (this.resumed) return;
  this.resumed = true;
  // ...
  let T = this.thread.messages.at(-1);
  if (T?.role === "assistant" && T.state.type === "streaming")
    this.updateThread({ type: "thread:truncate", fromIndex: this.thread.messages.length - 1 });
  // ...
}
```

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/worker/__tests__/thread-resume.test.ts
import { describe, expect, it } from "bun:test";
import type { LLMProvider, StreamDelta, StreamParams, SystemPromptBlock } from "@flitter/llm";
import type { Config, Message, ThreadSnapshot } from "@flitter/schemas";
import { ThreadWorker, type ThreadWorkerOptions } from "../thread-worker";
import { ToolOrchestrator, type OrchestratorCallbacks } from "../../tools/orchestrator";
import { ToolRegistry } from "../../tools/registry";
import { BehaviorSubject } from "@flitter/util";

function makeSnapshot(msgs: Message[] = []): ThreadSnapshot {
  return {
    id: "test-resume",
    v: 1,
    title: null,
    messages: msgs,
    env: "local",
    agentMode: "normal",
    relationships: [],
  } as unknown as ThreadSnapshot;
}

function makeNoopProvider(): LLMProvider {
  return {
    name: "anthropic",
    async *stream(_params: StreamParams): AsyncGenerator<StreamDelta> {
      yield {
        content: [{ type: "text", text: "hello" }],
        state: "complete",
        usage: { inputTokens: 10, outputTokens: 5 },
      } as unknown as StreamDelta;
    },
  } as unknown as LLMProvider;
}

function makeToolOrchestrator(): ToolOrchestrator {
  const registry = new ToolRegistry();
  const callbacks: OrchestratorCallbacks = {
    getConfig: async () => ({ settings: {}, secrets: { getToken: async () => "test" } } as Config),
    updateThread: async () => {},
    getToolRunEnvironment: async (_id, signal) => ({
      workingDirectory: "/tmp",
      signal,
      threadId: "test-resume",
      config: { settings: {}, secrets: { getToken: async () => "test" } } as Config,
    }),
    applyHookResult: async () => ({ abortOp: false }),
    applyPostHookResult: async () => {},
    updateFileChanges: async () => {},
    getDisposed$: () => new BehaviorSubject(false),
  };
  return new ToolOrchestrator("test-resume", registry, callbacks);
}

function makeWorkerOpts(overrides: Partial<ThreadWorkerOptions> = {}): ThreadWorkerOptions {
  let snapshot = makeSnapshot();
  const registry = new ToolRegistry();
  return {
    getThreadSnapshot: () => snapshot,
    updateThreadSnapshot: (s) => { snapshot = s; },
    getMessages: () => snapshot.messages,
    provider: makeNoopProvider(),
    toolOrchestrator: makeToolOrchestrator(),
    buildSystemPrompt: async () => [] as SystemPromptBlock[],
    checkAndCompact: async () => null,
    getConfig: () => ({ settings: {}, secrets: { getToken: async () => "test" } } as Config),
    toolRegistry: registry,
    ...overrides,
  };
}

describe("ThreadWorker resume", () => {
  describe("truncateIncompleteMessages", () => {
    it("truncates assistant message with state.type === 'streaming'", () => {
      const msgs = [
        { role: "user", content: [{ type: "text", text: "hello" }] },
        {
          role: "assistant",
          content: [{ type: "text", text: "partial response..." }],
          state: { type: "streaming" },
        },
      ] as unknown as Message[];

      let snapshot = makeSnapshot(msgs);
      const opts = makeWorkerOpts({
        getThreadSnapshot: () => snapshot,
        updateThreadSnapshot: (s) => { snapshot = s; },
      });
      const worker = new ThreadWorker(opts);

      worker.resume();

      // The streaming assistant message should be truncated (removed)
      expect(snapshot.messages).toHaveLength(1);
      expect(snapshot.messages[0].role).toBe("user");

      worker.dispose();
    });

    it("does NOT truncate complete assistant messages", () => {
      const msgs = [
        { role: "user", content: [{ type: "text", text: "hello" }] },
        {
          role: "assistant",
          content: [{ type: "text", text: "full response" }],
          state: { type: "complete", stopReason: "end_turn" },
        },
      ] as unknown as Message[];

      let snapshot = makeSnapshot(msgs);
      const opts = makeWorkerOpts({
        getThreadSnapshot: () => snapshot,
        updateThreadSnapshot: (s) => { snapshot = s; },
      });
      const worker = new ThreadWorker(opts);

      worker.resume();

      expect(snapshot.messages).toHaveLength(2);

      worker.dispose();
    });

    it("is idempotent (second call is a no-op)", () => {
      const msgs = [
        { role: "user", content: [{ type: "text", text: "hello" }] },
        {
          role: "assistant",
          content: [{ type: "text", text: "partial" }],
          state: { type: "streaming" },
        },
      ] as unknown as Message[];

      let snapshot = makeSnapshot(msgs);
      const opts = makeWorkerOpts({
        getThreadSnapshot: () => snapshot,
        updateThreadSnapshot: (s) => { snapshot = s; },
      });
      const worker = new ThreadWorker(opts);

      worker.resume();
      expect(snapshot.messages).toHaveLength(1);

      // Second call should not further modify
      worker.resume();
      expect(snapshot.messages).toHaveLength(1);

      worker.dispose();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-resume.test.ts`
Expected: FAIL — `worker.resume` is not a function (doesn't exist yet).

- [ ] **Step 3: Implement resume() on ThreadWorker**

In `packages/agent-core/src/worker/thread-worker.ts`, add a `resumed` flag and `resume()` method:

```typescript
  // Add field after `private disposed = false;`
  private resumed = false;

  /**
   * Resume from a previously interrupted session.
   * 逆向: ov.resume (1244_ThreadWorker_ov.js:259-270)
   *
   * Inspects the last message. If it's an assistant message in "streaming"
   * state, truncates it (removes from snapshot) so inference can restart.
   */
  resume(): void {
    if (this.resumed) return;
    this.resumed = true;

    const snapshot = this.opts.getThreadSnapshot();
    const lastMsg = snapshot.messages[snapshot.messages.length - 1];

    // 逆向: if last message is assistant with state.type === "streaming", truncate
    if (lastMsg && lastMsg.role === "assistant") {
      const state = (lastMsg as Record<string, unknown>).state as
        | { type: string }
        | undefined;
      if (state?.type === "streaming") {
        this.opts.updateThreadSnapshot({
          ...snapshot,
          messages: snapshot.messages.slice(0, -1),
        });
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-resume.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/worker/__tests__/thread-resume.test.ts
git commit -m "feat(agent-core): add ThreadWorker.resume() to truncate incomplete streaming messages

On resume, if the last message is an assistant message with
state.type === 'streaming', it is removed from the snapshot so
inference can restart cleanly. Idempotent (second call is no-op).

逆向: amp ov.resume (1244_ThreadWorker_ov.js:259-267)"
```

---

### Task 2: Detect incomplete tool_use blocks

**Why:** When a stream ends abruptly, tool_use blocks may have `complete === true` but empty `input` (`{}`). These are invalid and should be detected so the turn can be retried.

**Files:**
- Modify: `packages/agent-core/src/worker/thread-worker.ts`
- Test: `packages/agent-core/src/worker/__tests__/thread-resume.test.ts` (append)

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:949-952`:
```js
let x = l.state.type === "streaming",
    f = l.content.some(v => v.type === "tool_use" && v.complete && Object.keys(v.input ?? {}).length === 0);
if (x || f) J.warn("Stream ended with incomplete message", { ... });
```

- [ ] **Step 1: Write the failing test**

Append to `packages/agent-core/src/worker/__tests__/thread-resume.test.ts`:

```typescript
import { hasIncompleteToolUse } from "../thread-worker";

describe("hasIncompleteToolUse", () => {
  it("detects tool_use with empty input", () => {
    const content = [
      { type: "text", text: "Let me search for that." },
      { type: "tool_use", id: "t1", name: "Grep", complete: true, input: {} },
    ] as unknown[];
    expect(hasIncompleteToolUse(content)).toBe(true);
  });

  it("returns false for tool_use with non-empty input", () => {
    const content = [
      { type: "tool_use", id: "t1", name: "Grep", complete: true, input: { pattern: "foo" } },
    ] as unknown[];
    expect(hasIncompleteToolUse(content)).toBe(false);
  });

  it("returns false for non-tool_use blocks", () => {
    const content = [
      { type: "text", text: "Hello world" },
    ] as unknown[];
    expect(hasIncompleteToolUse(content)).toBe(false);
  });

  it("detects tool_use with complete=true but undefined input", () => {
    const content = [
      { type: "tool_use", id: "t1", name: "Bash", complete: true },
    ] as unknown[];
    expect(hasIncompleteToolUse(content)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-resume.test.ts`
Expected: FAIL — `hasIncompleteToolUse` not exported.

- [ ] **Step 3: Implement hasIncompleteToolUse**

In `packages/agent-core/src/worker/thread-worker.ts`, add an exported function:

```typescript
/**
 * Detect incomplete tool_use blocks: tool_use with complete=true but empty/missing input.
 * 逆向: amp 1244_ThreadWorker_ov.js:951 —
 *   l.content.some(v => v.type === "tool_use" && v.complete && Object.keys(v.input ?? {}).length === 0)
 */
export function hasIncompleteToolUse(content: unknown[]): boolean {
  return content.some((block) => {
    if (!block || typeof block !== "object") return false;
    const b = block as Record<string, unknown>;
    if (b.type !== "tool_use") return false;
    if (!b.complete) return false;
    const input = b.input as Record<string, unknown> | undefined;
    return !input || Object.keys(input).length === 0;
  });
}
```

- [ ] **Step 4: Wire into runInference post-stream check**

After the stream loop in `runInference()`, after `this.events$.next({ type: "inference:complete", ... })`:

```typescript
      // 逆向: amp 1244:949-970 — detect incomplete stream
      const lastSnapshot = this.opts.getThreadSnapshot();
      const lastAssistant = lastSnapshot.messages[lastSnapshot.messages.length - 1];
      if (lastAssistant?.role === "assistant") {
        const assistantState = (lastAssistant as Record<string, unknown>).state as
          | { type: string }
          | undefined;
        const isStreaming = assistantState?.type === "streaming";
        const hasEmptyToolUse = hasIncompleteToolUse(
          lastAssistant.content as unknown[],
        );
        if (isStreaming || hasEmptyToolUse) {
          // Truncate incomplete message and retry
          // 逆向: amp logs "Stream ended with incomplete message" then truncates on retry
          this.opts.updateThreadSnapshot({
            ...lastSnapshot,
            messages: lastSnapshot.messages.slice(0, -1),
          });
          this.events$.next({
            type: "inference:error",
            error: new Error("Stream ended with incomplete message"),
          });
          this.inferenceState$.next("idle");
          return;
        }
      }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-resume.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/worker/__tests__/thread-resume.test.ts
git commit -m "feat(agent-core): detect incomplete tool_use blocks in stream output

hasIncompleteToolUse checks for tool_use blocks with complete=true but
empty/missing input. After stream completes, if the last assistant
message has incomplete tool_use or is still in streaming state, it is
truncated and an error event is emitted.

逆向: amp 1244_ThreadWorker_ov.js:949-952 (incomplete tool_use check)"
```

---

### Task 3: Implement message queue for user messages during tool execution

**Why:** When tools are running, the user may type a new message. Instead of dropping it or interrupting, the message should be queued and processed after the current turn completes. Amp stores queued messages in `thread.queuedMessages`.

**Files:**
- Modify: `packages/agent-core/src/worker/thread-worker.ts`
- Test: `packages/agent-core/src/worker/__tests__/thread-resume.test.ts` (append)

**Amp reference:**
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:528-561` — `user:message-queue:enqueue`:
  - Checks `IUT(thread, inferenceState)` — if tools are running, buffer the message
  - If cancelled/idle and last message is cancelled/error/complete, dequeue immediately
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:431-437` — `user:message-queue:dequeue`:
  - Takes first queued message, starts new inference turn
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:661-662` — on turn complete:
  - If `queuedMessages.length > 0`, dequeue

- [ ] **Step 1: Write the failing test**

Append to `packages/agent-core/src/worker/__tests__/thread-resume.test.ts`:

```typescript
import type { AgentEvent } from "../../worker/events";

describe("ThreadWorker message queue", () => {
  it("enqueueMessage stores message when tools are running", () => {
    let snapshot = makeSnapshot([
      { role: "user", content: [{ type: "text", text: "hello" }] } as unknown as Message,
    ]);
    const opts = makeWorkerOpts({
      getThreadSnapshot: () => snapshot,
      updateThreadSnapshot: (s) => { snapshot = s; },
    });
    const worker = new ThreadWorker(opts);

    // Simulate tools running by manually setting inference state
    worker.inferenceState$.next("running");

    const msg = { role: "user" as const, content: [{ type: "text" as const, text: "follow up" }] };
    worker.enqueueMessage(msg as unknown as Message);

    // Should have been queued, not appended to messages
    expect(snapshot.messages).toHaveLength(1); // original message only
    expect(worker.queuedMessageCount).toBe(1);

    worker.dispose();
  });

  it("dequeueMessage appends queued message to thread and starts inference", async () => {
    const msgs = [
      { role: "user", content: [{ type: "text", text: "hello" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "Hi!" }],
        state: { type: "complete", stopReason: "end_turn" },
      },
    ] as unknown as Message[];

    let snapshot = makeSnapshot(msgs);
    const events: AgentEvent[] = [];
    const opts = makeWorkerOpts({
      getThreadSnapshot: () => snapshot,
      updateThreadSnapshot: (s) => { snapshot = s; },
    });
    const worker = new ThreadWorker(opts);
    worker.events$.subscribe((e) => events.push(e));

    // Queue a message
    const msg = {
      role: "user" as const,
      content: [{ type: "text" as const, text: "follow up" }],
    };
    worker.enqueueMessage(msg as unknown as Message);
    expect(worker.queuedMessageCount).toBe(1);

    // Dequeue should append the message
    worker.dequeueMessage();

    expect(snapshot.messages).toHaveLength(3);
    expect(snapshot.messages[2].role).toBe("user");
    expect(worker.queuedMessageCount).toBe(0);

    worker.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-resume.test.ts`
Expected: FAIL — `enqueueMessage`, `dequeueMessage`, `queuedMessageCount` not defined.

- [ ] **Step 3: Implement message queue on ThreadWorker**

In `packages/agent-core/src/worker/thread-worker.ts`, add fields and methods:

```typescript
  // ─── Message queue ──────────────────────────────────────
  /**
   * Queued user messages waiting to be processed after the current turn.
   * 逆向: amp stores these in thread.queuedMessages. Flitter keeps them
   * in-memory on the worker since they're transient (not persisted).
   */
  private readonly messageQueue: Message[] = [];

  /** Number of queued messages. */
  get queuedMessageCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Enqueue a user message to be processed after current tool execution.
   * 逆向: ov.onThreadDelta case "user:message-queue:enqueue" (1244:528-561)
   *
   * If inference is idle and no tools are running, the message is processed
   * immediately (dequeueMessage). Otherwise it waits in the queue.
   */
  enqueueMessage(message: Message): void {
    const state = this.inferenceState$.getValue();
    const hasTools = this.opts.toolOrchestrator.hasRunningTools();

    if (state === "running" && hasTools) {
      // Tools are running — buffer the message
      this.messageQueue.push(message);
      return;
    }

    if (state === "cancelled" || state === "idle") {
      // Not busy — process immediately
      this.messageQueue.push(message);
      this.dequeueMessage();
      return;
    }

    // Running without tools (inference in progress) — buffer
    this.messageQueue.push(message);
  }

  /**
   * Dequeue and process the next queued message.
   * 逆向: ov.onThreadDelta case "user:message-queue:dequeue" (1244:431-437)
   *
   * Takes the first queued message, appends it to the thread snapshot,
   * and starts a new inference turn.
   */
  dequeueMessage(): void {
    if (this.messageQueue.length === 0) return;

    const message = this.messageQueue.shift()!;
    const snapshot = this.opts.getThreadSnapshot();
    this.opts.updateThreadSnapshot({
      ...snapshot,
      messages: [...snapshot.messages, message],
    });
  }
```

- [ ] **Step 4: Wire dequeue into turn completion**

In `runInference()`, after the `turn:complete` event and before setting state to idle, add:

```typescript
        // 逆向: amp 1244:661-662 — dequeue next message on turn complete
        if (this.messageQueue.length > 0) {
          this.dequeueMessage();
          // Start inference for the dequeued message
          this.inferenceState$.next("idle");
          await this.runInference();
          return;
        }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-resume.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/worker/__tests__/thread-resume.test.ts
git commit -m "feat(agent-core): implement message queue for user messages during tool execution

enqueueMessage buffers user messages while tools are running.
dequeueMessage processes them when the turn completes. After
turn:complete, ThreadWorker checks the queue and auto-dequeues
the next message to continue the conversation.

逆向: amp user:message-queue:enqueue/dequeue (1244:431-437, 528-561, 661-662)"
```

---

### Task 4: Wire resume into ThreadWorker lifecycle

**Why:** The `resume()` method needs to be called when a ThreadWorker is attached to an existing thread with history. The container should call `resume()` after creating the worker if the thread has messages.

**Files:**
- Modify: `packages/flitter/src/container.ts` (call resume after createThreadWorker)
- Modify: `packages/agent-core/src/worker/thread-worker.ts` (emit resume event)
- Test: `packages/agent-core/src/worker/__tests__/thread-resume.test.ts` (append)

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:323` — resume is called at the beginning of `innerHandle()`: `await this.resume()`. Every first `handle()` call triggers resume.

- [ ] **Step 1: Write the failing test**

Append to `packages/agent-core/src/worker/__tests__/thread-resume.test.ts`:

```typescript
describe("resume integration", () => {
  it("resume truncates incomplete message and does not throw", () => {
    const msgs = [
      { role: "user", content: [{ type: "text", text: "hello" }] },
      {
        role: "assistant",
        content: [
          { type: "text", text: "I'll search for" },
          { type: "tool_use", id: "t1", name: "Grep", complete: true, input: {} },
        ],
        state: { type: "streaming" },
      },
    ] as unknown as Message[];

    let snapshot = makeSnapshot(msgs);
    const opts = makeWorkerOpts({
      getThreadSnapshot: () => snapshot,
      updateThreadSnapshot: (s) => { snapshot = s; },
    });
    const worker = new ThreadWorker(opts);

    worker.resume();

    // Both the incomplete tool_use and streaming state should cause truncation
    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.messages[0].role).toBe("user");

    worker.dispose();
  });

  it("resume with complete assistant message preserves it", () => {
    const msgs = [
      { role: "user", content: [{ type: "text", text: "hello" }] },
      {
        role: "assistant",
        content: [{ type: "text", text: "Hi there!" }],
        state: { type: "complete", stopReason: "end_turn" },
      },
    ] as unknown as Message[];

    let snapshot = makeSnapshot(msgs);
    const opts = makeWorkerOpts({
      getThreadSnapshot: () => snapshot,
      updateThreadSnapshot: (s) => { snapshot = s; },
    });
    const worker = new ThreadWorker(opts);

    worker.resume();

    expect(snapshot.messages).toHaveLength(2);

    worker.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it passes (should pass from Task 1)**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-resume.test.ts`
Expected: PASS

- [ ] **Step 3: Call resume in container's createThreadWorker**

In `packages/flitter/src/container.ts`, after creating the worker, add a resume call:

```typescript
        const worker = new ThreadWorkerImpl(fullOpts);
        workerRef = worker;

        // 逆向: amp calls resume() on first handle(), Flitter calls it eagerly
        // so the TUI gets a clean snapshot immediately.
        worker.resume();

        return worker;
```

- [ ] **Step 4: Run full test suite and type check**

Run: `cd /Users/bytedance/workspace/flitter && bun test && bunx tsc --noEmit -p packages/agent-core/tsconfig.json && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-core/src/worker/thread-worker.ts packages/flitter/src/container.ts packages/agent-core/src/worker/__tests__/thread-resume.test.ts
git commit -m "feat(agent-core,flitter): wire resume into ThreadWorker lifecycle

Container calls worker.resume() after creation to truncate any
incomplete streaming messages from a previous session. This ensures
the TUI sees a clean snapshot immediately.

逆向: amp calls resume() on first handle() (1244:323)"
```

---

### Task 5: Export new types and run full verification

**Files:**
- Modify: `packages/agent-core/src/index.ts`

- [ ] **Step 1: Add exports**

In `packages/agent-core/src/index.ts`, add:

```typescript
export { hasIncompleteToolUse } from "./worker/thread-worker";
```

- [ ] **Step 2: Run full test suite**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 3: Run type check across all packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/agent-core/tsconfig.json && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add packages/agent-core/src/index.ts
git commit -m "feat(agent-core): export hasIncompleteToolUse helper

Public API for detecting incomplete tool_use blocks in assistant
message content."
```
