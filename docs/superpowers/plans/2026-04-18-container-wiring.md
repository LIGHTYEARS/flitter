> **STATUS: COMPLETED** — This plan has been fully implemented and is kept for historical reference only.

# Container Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 6 broken defaults in `createContainer.createThreadWorker()` so that `worker.runInference()` produces a real LLM response, streams it to the TUI, and persists it in ThreadStore.

**Architecture:** The container factory (`packages/flitter/src/container.ts`) creates a `ThreadWorker` with 8 callback fields. Currently 6 of those fields are stubs (null provider, empty messages, no-op snapshot updates, empty system prompt, stub tool context, stub compaction). This plan wires each stub to the real service that already exists elsewhere in the container. No new packages or major abstractions — just connecting existing plumbing.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/llm` (provider registry), `@flitter/agent-core` (ThreadWorker, collectContextBlocks, buildSystemPrompt), `@flitter/data` (ThreadStore, ConfigService, SkillService, GuidanceLoader)

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js` lines 187-254 (provider resolution, getMessages, updateThread, getToolRunEnvironment), `amp-cli-reversed/modules/1178_unknown_r7R.js` (r7R provider factory).

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/flitter/src/container.ts` | Wire all 6 stub callbacks to real implementations |
| Create | `packages/flitter/src/__tests__/container-wiring.test.ts` | Integration tests for wired callbacks |
| Modify | `packages/flitter/src/factory.ts` | Add `resolveProviderFromConfig` helper if needed |

---

### Task 1: Wire `getToolRunEnvironment` to return a real `ToolContext`

**Why first:** This is the simplest fix — tools already work with `node:fs` directly. The current stub returns extra `readFile`/`writeFile` fields that no tool reads. We just need to return a valid `ToolContext` with the correct shape.

**Files:**
- Modify: `packages/flitter/src/container.ts:194-202` (container-level orchestrator) and `packages/flitter/src/container.ts:268-273` (thread-level orchestrator)
- Test: `packages/flitter/src/__tests__/container-wiring.test.ts`

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:187-209` — amp's `getToolRunEnvironment` returns `{...this.deps, dir, thread, config, filesystem, ...}`. Flitter's `ToolContext` is simpler: `{workingDirectory, signal, threadId, config}`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/flitter/src/__tests__/container-wiring.test.ts
import { describe, expect, it } from "bun:test";
import { createContainer, type ContainerOptions } from "../container";

// Minimal stubs for ContainerOptions
function makeContainerOpts(overrides?: Partial<ContainerOptions>): ContainerOptions {
  return {
    settings: {
      get: () => ({}),
      set: async () => {},
      watch: () => ({ unsubscribe: () => {} }),
      getPath: () => "/tmp/flitter-test/settings.json",
    } as any,
    secrets: {
      get: async () => undefined,
      set: async () => {},
      delete: async () => {},
    },
    workspaceRoot: "/tmp/flitter-test-workspace",
    dataDir: "/tmp/flitter-test-data",
    homeDir: "/tmp/flitter-test-home",
    configDir: "/tmp/flitter-test-config",
    ...overrides,
  };
}

describe("container wiring: getToolRunEnvironment", () => {
  it("thread-level orchestrator returns a ToolContext with workingDirectory, threadId, and config", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const worker = container.createThreadWorker("test-thread-1");
      // Access the orchestrator's getToolRunEnvironment indirectly:
      // The ToolOrchestrator is passed to the worker, and it uses the callback.
      // We verify by checking the orchestrator is wired via a tool execution.
      // For a unit test, we extract the callback from the container.
      // Since createThreadWorker returns the worker (not the orchestrator),
      // we test via the container's toolOrchestrator for the container-level one.
      
      // Container-level orchestrator test: invoke getToolRunEnvironment
      // We can't directly access thread-level callbacks, but we can verify
      // the container-level one returns the right shape.
      const callbacks = (container.toolOrchestrator as any).callbacks;
      const ctx = await callbacks.getToolRunEnvironment("test-tool-use-1", AbortSignal.timeout(5000));
      
      expect(ctx.workingDirectory).toBe("/tmp/flitter-test-workspace");
      expect(ctx.signal).toBeDefined();
      expect(ctx.threadId).toBeDefined();
      expect(ctx.config).toBeDefined();
      // Should NOT have the old readFile/writeFile stubs
      expect((ctx as any).readFile).toBeUndefined();
      expect((ctx as any).writeFile).toBeUndefined();
    } finally {
      await container.asyncDispose();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: FAIL — current stub returns an object with `workspaceRoot` (not `workingDirectory`), has `readFile`/`writeFile`, and lacks `threadId`/`config`.

- [ ] **Step 3: Fix container-level `getToolRunEnvironment`**

In `packages/flitter/src/container.ts`, replace lines 197-202:

```typescript
// OLD (lines 197-202):
getToolRunEnvironment: async (_toolUseId, signal) => ({
  workspaceRoot: opts.workspaceRoot,
  abortSignal: signal,
  readFile: async () => "",
  writeFile: async () => {},
}),

// NEW:
getToolRunEnvironment: async (_toolUseId, signal) => ({
  workingDirectory: opts.workspaceRoot,
  signal,
  threadId: "__container__",
  config: configService.get(),
}),
```

- [ ] **Step 4: Fix thread-level `getToolRunEnvironment`**

In `packages/flitter/src/container.ts`, replace lines 268-273:

```typescript
// OLD (lines 268-273):
getToolRunEnvironment: async (_toolUseId, signal) => ({
  workspaceRoot: opts.workspaceRoot,
  abortSignal: signal,
  readFile: async () => "",
  writeFile: async () => {},
}),

// NEW:
getToolRunEnvironment: async (_toolUseId, signal) => ({
  workingDirectory: opts.workspaceRoot,
  signal,
  threadId,
  config: configService.get(),
}),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: PASS

- [ ] **Step 6: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: No type errors related to `getToolRunEnvironment`

- [ ] **Step 7: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/container-wiring.test.ts
git commit -m "fix(container): wire getToolRunEnvironment to return valid ToolContext

Replace stub readFile/writeFile fields (never used by any tool) with the
correct ToolContext shape: workingDirectory, signal, threadId, config.

逆向: amp 1244_ThreadWorker_ov.js:187-209"
```

---

### Task 2: Wire `provider` — resolve LLM provider from config model string

**Why:** Without a provider, `worker.runInference()` crashes at `this.opts.provider.stream(streamParams)` with a null dereference. This is the most critical gap.

**Files:**
- Modify: `packages/flitter/src/container.ts:326` (provider default)
- Test: `packages/flitter/src/__tests__/container-wiring.test.ts` (append)

**Amp reference:** `amp-cli-reversed/modules/1178_unknown_r7R.js` — amp resolves provider per-inference from `config.settings` model string via regex split on `"provider/model"`. Flitter already has `getProviderForModel(model)` in `@flitter/llm` that does the same thing. We just need to call it from the container factory.

- [ ] **Step 1: Write the failing test**

Append to `packages/flitter/src/__tests__/container-wiring.test.ts`:

```typescript
describe("container wiring: provider", () => {
  it("createThreadWorker resolves provider from config model string when none passed", async () => {
    const container = await createContainer(makeContainerOpts({
      settings: {
        get: () => ({ model: "claude-sonnet-4-20250514" }),
        set: async () => {},
        watch: () => ({ unsubscribe: () => {} }),
        getPath: () => "/tmp/flitter-test/settings.json",
      } as any,
    }));
    try {
      // The worker should have a non-null provider
      const worker = container.createThreadWorker("test-thread-2");
      // We can't easily inspect the private opts.provider, but we can verify
      // the worker doesn't throw when we check inference state
      expect(worker.inferenceState$.getValue()).toBe("idle");
      // The real test: provider should be an AnthropicProvider instance
      const provider = (worker as any).opts.provider;
      expect(provider).not.toBeNull();
      expect(provider.constructor.name).toBe("AnthropicProvider");
    } finally {
      await container.asyncDispose();
    }
  });

  it("createThreadWorker resolves OpenAI provider for gpt models", async () => {
    const container = await createContainer(makeContainerOpts({
      settings: {
        get: () => ({ model: "gpt-4o" }),
        set: async () => {},
        watch: () => ({ unsubscribe: () => {} }),
        getPath: () => "/tmp/flitter-test/settings.json",
      } as any,
    }));
    try {
      const worker = container.createThreadWorker("test-thread-3");
      const provider = (worker as any).opts.provider;
      expect(provider).not.toBeNull();
      expect(provider.constructor.name).toBe("OpenAIProvider");
    } finally {
      await container.asyncDispose();
    }
  });

  it("caller-provided provider takes precedence over config resolution", async () => {
    const customProvider = { stream: async function*() {}, name: "custom" } as any;
    const container = await createContainer(makeContainerOpts());
    try {
      const worker = container.createThreadWorker("test-thread-4", { provider: customProvider });
      const provider = (worker as any).opts.provider;
      expect(provider).toBe(customProvider);
    } finally {
      await container.asyncDispose();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: FAIL — `provider` is `null`, not `AnthropicProvider`.

- [ ] **Step 3: Add import for `getProviderForModel`**

At the top of `packages/flitter/src/container.ts`, add:

```typescript
import { getProviderForModel } from "@flitter/llm";
```

- [ ] **Step 4: Replace provider default in `createThreadWorker`**

In `packages/flitter/src/container.ts`, replace line 326:

```typescript
// OLD (line 326):
provider: workerOpts?.provider ?? (null as unknown as import("@flitter/llm").LLMProvider),

// NEW:
provider: workerOpts?.provider ?? getProviderForModel(
  configService.get().settings.model ?? "claude-sonnet-4-20250514"
),
```

Note: `configService.get().settings.model` may be undefined if the user hasn't configured a model. The fallback `"claude-sonnet-4-20250514"` matches amp's default (`ya("CLAUDE_SONNET_4_5")`). The `getProviderForModel` function handles the `"provider/model"` format and prefix matching already.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: PASS

- [ ] **Step 6: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: No new type errors

- [ ] **Step 7: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/container-wiring.test.ts
git commit -m "fix(container): resolve LLM provider from config model string

Replace null provider default with getProviderForModel(config.settings.model).
Falls back to claude-sonnet-4-20250514 when no model configured.

逆向: amp r7R() (1178_unknown_r7R.js) resolves provider from 'provider/model' format"
```

---

### Task 3: Wire `getThreadSnapshot` and `updateThreadSnapshot` to ThreadStore

**Why:** Without these, streaming deltas update a detached snapshot that's immediately discarded. The TUI's `ThreadStateWidget` subscribes to `threadStore.observeThread(threadId)` — so updates must flow through ThreadStore.

**Files:**
- Modify: `packages/flitter/src/container.ts:312-324`
- Test: `packages/flitter/src/__tests__/container-wiring.test.ts` (append)

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:248-254` — amp backs `updateThread`/`thread` via `threadReadWriter` from `threadService.exclusiveSyncReadWriter(threadID)`.

- [ ] **Step 1: Write the failing test**

Append to `packages/flitter/src/__tests__/container-wiring.test.ts`:

```typescript
describe("container wiring: thread snapshot", () => {
  it("getThreadSnapshot reads from ThreadStore", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const threadId = "test-snapshot-1";
      // Seed the thread store
      container.threadStore.setCachedThread({
        id: threadId, v: 1, messages: [
          { role: "user", content: [{ type: "text", text: "hello" }] },
        ], relationships: [],
      } as any);

      const worker = container.createThreadWorker(threadId);
      const snapshot = (worker as any).opts.getThreadSnapshot();
      expect(snapshot.id).toBe(threadId);
      expect(snapshot.messages).toHaveLength(1);
      expect(snapshot.messages[0].content[0].text).toBe("hello");
    } finally {
      await container.asyncDispose();
    }
  });

  it("updateThreadSnapshot writes back to ThreadStore", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const threadId = "test-snapshot-2";
      container.threadStore.setCachedThread({
        id: threadId, v: 1, messages: [], relationships: [],
      } as any);

      const worker = container.createThreadWorker(threadId);
      const updatedSnapshot = {
        id: threadId, v: 1, messages: [
          { role: "assistant", content: [{ type: "text", text: "hi there" }] },
        ], relationships: [],
      } as any;

      (worker as any).opts.updateThreadSnapshot(updatedSnapshot);

      // Verify it persisted to ThreadStore
      const stored = container.threadStore.getThreadSnapshot(threadId);
      expect(stored).not.toBeNull();
      expect(stored!.messages).toHaveLength(1);
      expect(stored!.messages[0].content[0].text).toBe("hi there");
    } finally {
      await container.asyncDispose();
    }
  });

  it("getThreadSnapshot returns empty snapshot if thread not in store", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const worker = container.createThreadWorker("nonexistent-thread");
      const snapshot = (worker as any).opts.getThreadSnapshot();
      expect(snapshot.id).toBe("nonexistent-thread");
      expect(snapshot.messages).toEqual([]);
    } finally {
      await container.asyncDispose();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: FAIL — `getThreadSnapshot` returns the hardcoded synthetic snapshot, not the one from ThreadStore. `updateThreadSnapshot` is a no-op.

- [ ] **Step 3: Replace `getThreadSnapshot` default**

In `packages/flitter/src/container.ts`, replace lines 312-323:

```typescript
// OLD (lines 312-323):
getThreadSnapshot:
  workerOpts?.getThreadSnapshot ??
  (() =>
    ({
      id: threadId,
      v: 1,
      title: null,
      messages: [],
      env: "local",
      agentMode: "normal",
      relationships: [],
    }) as unknown as ThreadSnapshot),

// NEW:
getThreadSnapshot:
  workerOpts?.getThreadSnapshot ??
  (() => {
    const stored = threadStore.getThreadSnapshot(threadId);
    if (stored) return stored;
    // Fallback: return a minimal empty snapshot (thread not yet in store)
    return {
      id: threadId,
      v: 1,
      title: null,
      messages: [],
      env: "local",
      agentMode: "normal",
      relationships: [],
    } as unknown as ThreadSnapshot;
  }),
```

- [ ] **Step 4: Replace `updateThreadSnapshot` default**

In `packages/flitter/src/container.ts`, replace line 324:

```typescript
// OLD (line 324):
updateThreadSnapshot: workerOpts?.updateThreadSnapshot ?? (() => {}),

// NEW:
updateThreadSnapshot:
  workerOpts?.updateThreadSnapshot ??
  ((snapshot: ThreadSnapshot) => {
    threadStore.setCachedThread(snapshot);
  }),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/container-wiring.test.ts
git commit -m "fix(container): wire getThreadSnapshot/updateThreadSnapshot to ThreadStore

getThreadSnapshot reads from threadStore.getThreadSnapshot(threadId) with
fallback to an empty snapshot. updateThreadSnapshot calls
threadStore.setCachedThread(snapshot) which triggers BehaviorSubject
emission — ThreadStateWidget's subscription receives the update.

逆向: amp 1244_ThreadWorker_ov.js:248-254 (threadReadWriter)"
```

---

### Task 4: Wire `getMessages` to read from ThreadStore

**Why:** Without this, the LLM receives `messages: []` on every inference call — it has no conversation history.

**Files:**
- Modify: `packages/flitter/src/container.ts:325`
- Test: `packages/flitter/src/__tests__/container-wiring.test.ts` (append)

**Amp reference:** `amp-cli-reversed/chunk-004.js:26781` — `getMessages()` returns `this.getCurrentThread().messages`.

- [ ] **Step 1: Write the failing test**

Append to `packages/flitter/src/__tests__/container-wiring.test.ts`:

```typescript
describe("container wiring: getMessages", () => {
  it("getMessages returns messages from ThreadStore snapshot", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const threadId = "test-messages-1";
      container.threadStore.setCachedThread({
        id: threadId, v: 1, messages: [
          { role: "user", content: [{ type: "text", text: "hello" }] },
          { role: "assistant", content: [{ type: "text", text: "hi" }] },
        ], relationships: [],
      } as any);

      const worker = container.createThreadWorker(threadId);
      const messages = (worker as any).opts.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");
    } finally {
      await container.asyncDispose();
    }
  });

  it("caller-provided getMessages takes precedence", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const customMessages = [{ role: "user", content: [{ type: "text", text: "custom" }] }];
      const worker = container.createThreadWorker("test-messages-2", {
        getMessages: () => customMessages as any,
      });
      const messages = (worker as any).opts.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].content[0].text).toBe("custom");
    } finally {
      await container.asyncDispose();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: FAIL — `getMessages` returns `[]`.

- [ ] **Step 3: Replace `getMessages` default**

In `packages/flitter/src/container.ts`, replace line 325:

```typescript
// OLD (line 325):
getMessages: workerOpts?.getMessages ?? (() => []),

// NEW:
getMessages:
  workerOpts?.getMessages ??
  (() => {
    const snapshot = threadStore.getThreadSnapshot(threadId);
    return snapshot?.messages ?? [];
  }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/container-wiring.test.ts
git commit -m "fix(container): wire getMessages to read from ThreadStore

getMessages now returns threadStore.getThreadSnapshot(threadId).messages,
giving the LLM the full conversation history. Caller-provided getMessages
(used by execute/headless modes) still takes precedence.

逆向: amp chunk-004.js:26781 (getCurrentThread().messages)"
```

---

### Task 5: Wire `buildSystemPrompt` to real context block collection

**Why:** Without this, the LLM receives an empty system prompt — no role instructions, no tool descriptions, no guidance files, no skills.

**Files:**
- Modify: `packages/flitter/src/container.ts:328`
- Test: `packages/flitter/src/__tests__/container-wiring.test.ts` (append)

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:~890-920` — amp calls `fwR()` (collectContextBlocks) then `LO()` (buildSystemPrompt) before each inference.

- [ ] **Step 1: Add imports**

At the top of `packages/flitter/src/container.ts`, add:

```typescript
import {
  collectContextBlocks,
  type ContextBlocksOptions,
} from "@flitter/agent-core";
import {
  buildSystemPrompt as assembleSystemPrompt,
} from "@flitter/agent-core/src/prompt/system-prompt";
```

Note: We import `buildSystemPrompt` with an alias `assembleSystemPrompt` to avoid shadowing the `ThreadWorkerOptions.buildSystemPrompt` callback name. Check if `buildSystemPrompt` is exported from `@flitter/agent-core` index — if not, add the export first.

- [ ] **Step 2: Check and fix exports if needed**

Check if `buildSystemPrompt` is exported from `packages/agent-core/src/index.ts`. If not, add:

```typescript
export { buildSystemPrompt } from "./prompt/system-prompt";
export type { BuildSystemPromptOptions } from "./prompt/system-prompt";
```

- [ ] **Step 3: Write the failing test**

Append to `packages/flitter/src/__tests__/container-wiring.test.ts`:

```typescript
describe("container wiring: buildSystemPrompt", () => {
  it("buildSystemPrompt returns non-empty system prompt blocks", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const worker = container.createThreadWorker("test-prompt-1");
      const blocks = await (worker as any).opts.buildSystemPrompt();
      // Should have at least the base role prompt + environment block
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      // First block should be the base role prompt (contains "coding assistant")
      expect(blocks[0].text).toContain("coding assistant");
    } finally {
      await container.asyncDispose();
    }
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: FAIL — `buildSystemPrompt` returns `[]`.

- [ ] **Step 5: Replace `buildSystemPrompt` default**

In `packages/flitter/src/container.ts`, replace line 328:

```typescript
// OLD (line 328):
buildSystemPrompt: workerOpts?.buildSystemPrompt ?? (async () => []),

// NEW:
buildSystemPrompt:
  workerOpts?.buildSystemPrompt ??
  (async () => {
    const config = configService.get();
    const contextBlocks = await collectContextBlocks({
      getConfig: () => config,
      listSkills: () => skillService.list(),
      workspaceRoot: opts.workspaceRoot,
      workingDirectory: opts.workspaceRoot,
      discoverGuidanceFiles: (loadOpts) => guidanceLoader.discover(loadOpts),
    });
    const toolDefs = toolRegistry.getToolDefinitions(config.settings);
    return assembleSystemPrompt({
      toolDefinitions: toolDefs,
      contextBlocks,
    });
  }),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: PASS

- [ ] **Step 7: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: No new type errors

- [ ] **Step 8: Commit**

```bash
git add packages/flitter/src/container.ts packages/agent-core/src/index.ts packages/flitter/src/__tests__/container-wiring.test.ts
git commit -m "fix(container): wire buildSystemPrompt to collectContextBlocks + assembleSystemPrompt

System prompt now includes: base role prompt, tool instructions,
environment info, guidance files (AGENTS.md/CLAUDE.md), available skills,
custom system prompt from config, and git repo info.

逆向: amp 1244_ThreadWorker_ov.js:~890-920 (fwR + LO)"
```

---

### Task 6: Wire `checkAndCompact` to ContextManager

**Why:** Without compaction, long conversations will exceed the model's context window and fail. The `ContextManager.checkAndCompact` engine exists but its `compactFn` is stubbed.

**Files:**
- Modify: `packages/flitter/src/container.ts:329`
- Test: `packages/flitter/src/__tests__/container-wiring.test.ts` (append)

**Note:** Full compaction requires an LLM call to summarize old messages — that's a separate feature. For now, wire the ContextManager's token-counting check so it can at least detect when compaction is needed, and pass through to the existing `checkAndCompact` method.

- [ ] **Step 1: Write the failing test**

Append to `packages/flitter/src/__tests__/container-wiring.test.ts`:

```typescript
describe("container wiring: checkAndCompact", () => {
  it("checkAndCompact is wired to contextManager (returns null for short conversations)", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const worker = container.createThreadWorker("test-compact-1");
      // For a thread with no messages, compaction should return null (no compaction needed)
      const result = await (worker as any).opts.checkAndCompact({
        id: "test-compact-1", v: 1, messages: [], relationships: [],
      });
      expect(result).toBeNull();
    } finally {
      await container.asyncDispose();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: FAIL — current stub `async () => null` will actually pass this specific test, but the wiring should still be done for when ContextManager has real compaction logic.

- [ ] **Step 3: Replace `checkAndCompact` default**

In `packages/flitter/src/container.ts`, replace line 329:

```typescript
// OLD (line 329):
checkAndCompact: workerOpts?.checkAndCompact ?? (async () => null),

// NEW:
checkAndCompact:
  workerOpts?.checkAndCompact ??
  ((snapshot: ThreadSnapshot) => contextManager.checkAndCompact(snapshot)),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/container-wiring.test.ts
git commit -m "fix(container): wire checkAndCompact to ContextManager

Compaction check now delegates to contextManager.checkAndCompact(snapshot)
instead of always returning null. Full compaction (LLM summarization) is a
separate feature; this wiring enables the token-counting threshold check."
```

---

### Task 7: Wire `updateThread` callback for tool result propagation

**Why:** The `updateThread` callback in `OrchestratorCallbacks` is a no-op. This means tool execution results (tool_result content blocks) are never appended to the thread snapshot. After a tool executes, the LLM needs to see the tool result in the message history for the recursive `runInference()` call. Without this, the recursive call sends the same messages again without tool results — causing an infinite loop or API error.

**Files:**
- Modify: `packages/flitter/src/container.ts:267` (thread-level `updateThread`)
- Test: `packages/flitter/src/__tests__/container-wiring.test.ts` (append)

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:~165-185` — amp's `updateThread` appends tool_result blocks to the current assistant message's tool use status, then updates the thread snapshot.

- [ ] **Step 1: Write the failing test**

Append to `packages/flitter/src/__tests__/container-wiring.test.ts`:

```typescript
import type { ToolResult } from "@flitter/agent-core";

describe("container wiring: updateThread (tool results)", () => {
  it("updateThread with status=completed appends tool_result to thread snapshot", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const threadId = "test-tool-result-1";
      container.threadStore.setCachedThread({
        id: threadId, v: 1, messages: [
          { role: "user", content: [{ type: "text", text: "list files" }] },
          {
            role: "assistant",
            content: [{
              type: "tool_use", id: "tool-1", name: "Glob", input: { pattern: "*.ts" },
            }],
          },
        ], relationships: [],
      } as any);

      const worker = container.createThreadWorker(threadId);
      // Access the thread-level orchestrator's updateThread callback
      const orchestrator = (worker as any).opts.toolOrchestrator;
      const callbacks = (orchestrator as any).callbacks;

      await callbacks.updateThread({
        type: "tool:data",
        toolUseId: "tool-1",
        toolName: "Glob",
        status: "completed",
        result: { status: "done", content: "file1.ts\nfile2.ts" } as ToolResult,
      });

      // The thread snapshot should now have a tool_result message
      const snapshot = container.threadStore.getThreadSnapshot(threadId);
      expect(snapshot).not.toBeNull();
      const lastMsg = snapshot!.messages[snapshot!.messages.length - 1];
      expect(lastMsg.role).toBe("user");  // tool_result goes in a user message
      expect(lastMsg.content[0].type).toBe("tool_result");
    } finally {
      await container.asyncDispose();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: FAIL — `updateThread` is `async () => {}`.

- [ ] **Step 3: Implement `updateThread` for tool result propagation**

In `packages/flitter/src/container.ts`, replace line 267:

```typescript
// OLD (line 267):
updateThread: async () => {},

// NEW:
updateThread: async (event) => {
  if (event.status === "completed" && event.result) {
    // Append tool_result to thread snapshot
    // 逆向: amp appends a {role: "user", content: [{type: "tool_result", ...}]} message
    const snapshot = threadStore.getThreadSnapshot(threadId);
    if (!snapshot) return;
    const toolResultMessage = {
      role: "user" as const,
      content: [{
        type: "tool_result" as const,
        tool_use_id: event.toolUseId,
        content: event.result.content ?? "",
        is_error: event.result.status === "error",
      }],
    };
    threadStore.setCachedThread({
      ...snapshot,
      messages: [...snapshot.messages, toolResultMessage],
    } as unknown as ThreadSnapshot);
  }
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-wiring.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/container-wiring.test.ts
git commit -m "fix(container): wire updateThread to append tool_result messages to ThreadStore

When a tool completes, a tool_result content block is appended to the
thread snapshot so the LLM sees the result on the next recursive
runInference() call. Without this, the inference loop either sends the
same messages forever or gets an API error about missing tool_result.

逆向: amp 1244_ThreadWorker_ov.js:~165-185"
```

---

### Task 8: Integration smoke test — full inference roundtrip

**Why:** Tasks 1-7 wire individual callbacks. This task verifies they work together end-to-end.

**Files:**
- Create: `packages/flitter/src/__tests__/container-integration.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
// packages/flitter/src/__tests__/container-integration.test.ts
import { describe, expect, it } from "bun:test";
import type { AgentEvent } from "@flitter/agent-core";
import { createContainer, type ContainerOptions } from "../container";

function makeContainerOpts(): ContainerOptions {
  return {
    settings: {
      get: () => ({ model: "claude-sonnet-4-20250514" }),
      set: async () => {},
      watch: () => ({ unsubscribe: () => {} }),
      getPath: () => "/tmp/flitter-test/settings.json",
    } as any,
    secrets: {
      get: async () => undefined,
      set: async () => {},
      delete: async () => {},
    },
    workspaceRoot: "/tmp/flitter-test-workspace",
    dataDir: "/tmp/flitter-test-data",
    homeDir: "/tmp/flitter-test-home",
    configDir: "/tmp/flitter-test-config",
  };
}

describe("container integration: inference roundtrip", () => {
  it("createThreadWorker produces a worker with all callbacks wired", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const threadId = "integration-test-1";
      container.threadStore.setCachedThread({
        id: threadId, v: 1, messages: [
          { role: "user", content: [{ type: "text", text: "Say hello" }] },
        ], relationships: [],
      } as any);

      const worker = container.createThreadWorker(threadId);
      const opts = (worker as any).opts;

      // 1. provider is wired (not null)
      expect(opts.provider).not.toBeNull();
      expect(opts.provider.constructor.name).toBe("AnthropicProvider");

      // 2. getMessages returns thread messages
      const messages = opts.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("user");

      // 3. getThreadSnapshot returns the stored snapshot
      const snapshot = opts.getThreadSnapshot();
      expect(snapshot.id).toBe(threadId);
      expect(snapshot.messages).toHaveLength(1);

      // 4. buildSystemPrompt returns non-empty blocks
      const blocks = await opts.buildSystemPrompt();
      expect(blocks.length).toBeGreaterThanOrEqual(2);

      // 5. updateThreadSnapshot persists to store
      opts.updateThreadSnapshot({
        ...snapshot,
        messages: [
          ...snapshot.messages,
          { role: "assistant", content: [{ type: "text", text: "Hello!" }] },
        ],
      });
      const updated = container.threadStore.getThreadSnapshot(threadId);
      expect(updated!.messages).toHaveLength(2);

      // 6. Events are emitted
      const events: AgentEvent[] = [];
      worker.events$.subscribe((e: AgentEvent) => events.push(e));
      expect(worker.inferenceState$.getValue()).toBe("idle");
    } finally {
      await container.asyncDispose();
    }
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/container-integration.test.ts`
Expected: PASS — all 6 callbacks are wired and return correct values.

- [ ] **Step 3: Commit**

```bash
git add packages/flitter/src/__tests__/container-integration.test.ts
git commit -m "test(container): add integration smoke test for wired callbacks

Verifies all 6 previously-stubbed callbacks are correctly wired:
provider resolution, getMessages, getThreadSnapshot, updateThreadSnapshot,
buildSystemPrompt, and event emission."
```

---

### Task 9: Run full test suite and type check

**Files:** None modified — verification only.

- [ ] **Step 1: Run type check across all packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json && bunx tsc --noEmit -p packages/agent-core/tsconfig.json && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all existing tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass (existing + new)

- [ ] **Step 3: Fix any regressions**

If any existing tests fail, investigate and fix. The most likely cause is the `getToolRunEnvironment` shape change (field rename from `workspaceRoot` to `workingDirectory` and from `abortSignal` to `signal`). Search for any test that mocks or asserts on the old field names.
