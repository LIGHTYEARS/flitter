# SubAgent Task Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `Task` builtin tool that the LLM can invoke to spawn subagents via `SubAgentManager.spawn()`, and wire `SubAgentManager` into the container so subagent threads get real workers.

**Architecture:** `SubAgentManager` already exists with a complete `spawn()` flow (create child thread → create worker → run inference loop → extract response). The missing pieces are: (1) a `Task` `ToolSpec` that maps LLM tool calls to `subAgentManager.spawn()`, (2) wiring `SubAgentManagerOptions.createWorker` to the container's `createThreadWorker` factory, and (3) registering the Task tool in the `ToolRegistry`.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/agent-core` (SubAgentManager, ToolSpec, ToolRegistry)

**Amp reference:** `amp-cli-reversed/modules/2026_tail_anonymous.js:143055` (Task tool spec), `amp-cli-reversed/modules/1354_unknown_wi.js` (subagent inference runner)

**Depends on:** Plan 1 (Container Wiring) — all 6 worker callbacks must be wired for subagent workers to function.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/agent-core/src/tools/builtin/task.ts` | `TaskTool` ToolSpec definition |
| Modify | `packages/agent-core/src/index.ts` | Export TaskTool |
| Modify | `packages/flitter/src/container.ts` | Create SubAgentManager, wire createWorker |
| Modify | `packages/flitter/src/factory.ts` | Add `registerBuiltinTools` call for TaskTool |
| Create | `packages/agent-core/src/tools/builtin/__tests__/task.test.ts` | Unit tests |
| Create | `packages/flitter/src/__tests__/subagent-wiring.test.ts` | Integration tests |

---

### Task 1: Create the `TaskTool` ToolSpec

**Why:** The LLM needs a tool called `Task` with `{ prompt, description }` input that spawns a subagent and returns the result.

**Files:**
- Create: `packages/agent-core/src/tools/builtin/task.ts`
- Test: `packages/agent-core/src/tools/builtin/__tests__/task.test.ts`

**Amp reference:** `amp-cli-reversed/modules/2026_tail_anonymous.js:143055` — Task tool spec with `prompt` and `description` fields. The `execute` function calls the subagent manager and returns the text response.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/tools/builtin/__tests__/task.test.ts
import { describe, expect, it } from "bun:test";
import { createTaskTool } from "../task";
import type { SubAgentManager } from "../../../subagent/subagent";

describe("TaskTool", () => {
  it("has correct name, description, and inputSchema", () => {
    const mockManager = {} as SubAgentManager;
    const tool = createTaskTool(mockManager);

    expect(tool.name).toBe("Task");
    expect(tool.source).toBe("builtin");
    expect(tool.inputSchema.properties).toHaveProperty("prompt");
    expect(tool.inputSchema.properties).toHaveProperty("description");
    expect(tool.inputSchema.required).toContain("prompt");
    expect(tool.inputSchema.required).toContain("description");
  });

  it("execute calls subAgentManager.spawn with prompt and description", async () => {
    let spawnCalledWith: any = null;
    const mockManager = {
      spawn: async (opts: any) => {
        spawnCalledWith = opts;
        return {
          threadId: "child-1",
          response: "Done! Created the file.",
          status: "completed",
        };
      },
    } as unknown as SubAgentManager;

    const tool = createTaskTool(mockManager);
    const context = {
      workingDirectory: "/tmp/test",
      signal: AbortSignal.timeout(5000),
      threadId: "parent-thread",
      config: {} as any,
    };

    const result = await tool.execute(
      { prompt: "Create a new file", description: "Create file" },
      context,
    );

    expect(spawnCalledWith).not.toBeNull();
    expect(spawnCalledWith.prompt).toBe("Create a new file");
    expect(spawnCalledWith.description).toBe("Create file");
    expect(spawnCalledWith.parentThreadId).toBe("parent-thread");
    expect(result.status).toBe("done");
    expect(result.content).toBe("Done! Created the file.");
  });

  it("execute returns error status on spawn failure", async () => {
    const mockManager = {
      spawn: async () => ({
        threadId: "child-2",
        response: "",
        status: "error",
        error: "Out of tokens",
      }),
    } as unknown as SubAgentManager;

    const tool = createTaskTool(mockManager);
    const context = {
      workingDirectory: "/tmp/test",
      signal: AbortSignal.timeout(5000),
      threadId: "parent-thread",
      config: {} as any,
    };

    const result = await tool.execute(
      { prompt: "Do something", description: "Task" },
      context,
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe("Out of tokens");
  });

  it("execute returns timeout status", async () => {
    const mockManager = {
      spawn: async () => ({
        threadId: "child-3",
        response: "partial work done",
        status: "timeout",
      }),
    } as unknown as SubAgentManager;

    const tool = createTaskTool(mockManager);
    const context = {
      workingDirectory: "/tmp/test",
      signal: AbortSignal.timeout(5000),
      threadId: "parent-thread",
      config: {} as any,
    };

    const result = await tool.execute(
      { prompt: "Long task", description: "Long" },
      context,
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("timeout");
    expect(result.content).toBe("partial work done");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/tools/builtin/__tests__/task.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `createTaskTool`**

```typescript
// packages/agent-core/src/tools/builtin/task.ts
/**
 * Task tool — spawn a subagent to perform a focused sub-task.
 *
 * 逆向: amp 2026_tail_anonymous.js:143055 (Dt = "Task" tool spec)
 * 逆向: amp 1354_unknown_wi.js (subagent inference runner)
 */

import type { SubAgentManager } from "../../subagent/subagent";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

/**
 * Create a Task ToolSpec bound to a SubAgentManager.
 *
 * The Task tool is a factory (not a static constant) because it needs
 * a reference to the SubAgentManager instance from the container.
 *
 * 逆向: amp's Task tool description instructs the LLM on when to use
 * subagents (multi-step tasks, large output, parallel independent work)
 * and when not to (single file ops, uncertain plans).
 */
export function createTaskTool(subAgentManager: SubAgentManager): ToolSpec {
  return {
    name: "Task",
    description: `Perform a task using a sub-agent that has access to file read/write, search, and shell tools.

When to use the Task tool:
- When you need to perform complex multi-step tasks
- When you need to run an operation that will produce a lot of output that is not needed after the sub-agent completes
- When making changes across many layers of an application, after you have planned the changes so they can be implemented independently
- When the user asks you to launch an "agent" or "subagent"

When NOT to use the Task tool:
- When performing a single logical task on a single file
- When reading a single file (use Read), searching (use Grep), or editing a single file (use Edit)
- When you're not sure what changes you want to make

How to use:
- Run multiple sub-agents concurrently if the tasks are independent
- You will not see the individual steps of the sub-agent's execution
- Include all necessary context, a detailed plan, and what the sub-agent should return
- Tell the sub-agent how to verify its work if possible
- The result returned by the agent is not visible to the user. Send a text summary back to the user.`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "The task for the agent to perform. Be specific about what needs to be done and include any relevant context.",
        },
        description: {
          type: "string",
          description:
            "A very short (3-5 word) description of the task that can be displayed to the user.",
        },
      },
      required: ["prompt", "description"],
    },
    source: "builtin",
    isReadOnly: false,
    executionProfile: {
      // Task tools do not conflict with each other (can run in parallel)
      // and do not conflict with other tools (subagent has its own context)
      resourceKeys: [],
    },

    async execute(
      args: Record<string, unknown>,
      context: ToolContext,
    ): Promise<ToolResult> {
      const prompt = args.prompt as string;
      const description = args.description as string;

      if (!prompt) {
        return { status: "error", error: "Missing required field: prompt" };
      }

      try {
        const result = await subAgentManager.spawn({
          parentThreadId: context.threadId,
          prompt,
          description: description ?? "Sub-task",
          type: "task",
        });

        switch (result.status) {
          case "completed":
            return {
              status: "done",
              content: result.response || "(no output)",
            };
          case "timeout":
            return {
              status: "error",
              error: `Sub-agent timed out. Partial response: ${result.response || "(none)"}`,
              content: result.response,
            };
          case "cancelled":
            return {
              status: "error",
              error: "Sub-agent was cancelled",
              content: result.response,
            };
          case "error":
            return {
              status: "error",
              error: result.error ?? "Sub-agent encountered an error",
              content: result.response,
            };
          default:
            return {
              status: "error",
              error: `Unknown sub-agent status: ${result.status}`,
            };
        }
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/tools/builtin/__tests__/task.test.ts`
Expected: PASS

- [ ] **Step 5: Export from `@flitter/agent-core`**

In `packages/agent-core/src/index.ts`, add:

```typescript
export { createTaskTool } from "./tools/builtin/task";
```

- [ ] **Step 6: Commit**

```bash
git add packages/agent-core/src/tools/builtin/task.ts packages/agent-core/src/tools/builtin/__tests__/task.test.ts packages/agent-core/src/index.ts
git commit -m "feat(agent-core): add Task tool for spawning subagents

createTaskTool(subAgentManager) returns a ToolSpec that maps LLM
tool_use calls ({prompt, description}) to subAgentManager.spawn().
Handles completed, timeout, cancelled, and error statuses.

逆向: amp 2026_tail_anonymous.js:143055 (Task tool spec)"
```

---

### Task 2: Wire `SubAgentManager` into the container

**Why:** `SubAgentManager` needs `createWorker`, `createChildThread`, `addMessage`, and `getThreadSnapshot` callbacks. The container has all these services — they just need to be connected.

**Files:**
- Modify: `packages/flitter/src/container.ts`
- Test: `packages/flitter/src/__tests__/subagent-wiring.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/flitter/src/__tests__/subagent-wiring.test.ts
import { describe, expect, it } from "bun:test";
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

describe("container: SubAgentManager wiring", () => {
  it("container has a subAgentManager property", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      expect((container as any).subAgentManager).toBeDefined();
    } finally {
      await container.asyncDispose();
    }
  });

  it("Task tool is registered in toolRegistry", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      expect(container.toolRegistry.has("Task")).toBe(true);
      const spec = container.toolRegistry.get("Task");
      expect(spec).not.toBeUndefined();
      expect(spec!.source).toBe("builtin");
    } finally {
      await container.asyncDispose();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/subagent-wiring.test.ts`
Expected: FAIL — `subAgentManager` not on container, Task tool not registered.

- [ ] **Step 3: Add imports**

At the top of `packages/flitter/src/container.ts`, add:

```typescript
import { SubAgentManager, createTaskTool } from "@flitter/agent-core";
```

- [ ] **Step 4: Add `subAgentManager` to `ServiceContainer` interface**

In `packages/flitter/src/container.ts`, in the `ServiceContainer` interface, add:

```typescript
/** Sub-agent manager (Task tool) */
subAgentManager: SubAgentManager;
```

- [ ] **Step 5: Create SubAgentManager in container factory**

In `packages/flitter/src/container.ts`, after ContextManager creation (~line 235), add:

```typescript
// 10. SubAgentManager — wired to use container's createThreadWorker
const subAgentManager = new SubAgentManager({
  createWorker: (workerOpts) => {
    // Create a child worker using the container's own factory.
    // This reuses all the wired callbacks (provider, system prompt, etc.)
    return container.createThreadWorker(workerOpts.threadId);
  },
  createChildThread: (parentThreadId) => {
    const childId = crypto.randomUUID();
    threadStore.setCachedThread({
      id: childId,
      v: 1,
      title: null,
      messages: [],
      env: "local",
      agentMode: "normal",
      relationships: [{ type: "child-of", threadId: parentThreadId }],
    } as unknown as ThreadSnapshot);
    return childId;
  },
  addMessage: (tid, msg) => {
    const snapshot = threadStore.getThreadSnapshot(tid);
    if (snapshot) {
      threadStore.setCachedThread({
        ...snapshot,
        messages: [...snapshot.messages, msg],
      } as unknown as ThreadSnapshot);
    }
  },
  getThreadSnapshot: (tid) => threadStore.getThreadSnapshot(tid),
});
disposables.push(subAgentManager);
log.info("SubAgentManager created");
```

Note: This references `container.createThreadWorker` in the `createWorker` callback. Since `container` is the object being assembled, we need the deferred reference pattern. The `createWorker` callback is only called when `subAgentManager.spawn()` is called at runtime (after construction), so the forward reference to `container` is safe as long as `container` is assigned before any spawn occurs. We'll use a mutable `containerRef` variable:

```typescript
// Before SubAgentManager creation:
let containerRef: ServiceContainer | null = null;

// In SubAgentManager options:
createWorker: (workerOpts) => {
  if (!containerRef) throw new Error("Container not ready");
  return containerRef.createThreadWorker(workerOpts.threadId);
},

// After container object is created (after the object literal):
containerRef = container;
```

- [ ] **Step 6: Register the Task tool**

After SubAgentManager creation, before the `container` object literal:

```typescript
// Register Task tool (depends on SubAgentManager)
const taskTool = createTaskTool(subAgentManager);
toolRegistry.register(taskTool);
log.info("Task tool registered");
```

- [ ] **Step 7: Add `subAgentManager` to the container object literal**

In the `container` object literal, add:

```typescript
subAgentManager,
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/subagent-wiring.test.ts`
Expected: PASS

- [ ] **Step 9: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: No type errors

- [ ] **Step 10: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/subagent-wiring.test.ts
git commit -m "feat(container): wire SubAgentManager and register Task tool

SubAgentManager.createWorker delegates to container.createThreadWorker,
reusing all wired callbacks (provider, system prompt, thread store, etc.).
createChildThread creates a new UUID thread with a child-of relationship.
Task tool is registered as a builtin in ToolRegistry.

逆向: amp 1354_unknown_wi.js (subagent runner wiring)"
```

---

### Task 3: Run full verification

- [ ] **Step 1: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 2: Run type checks**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json && bunx tsc --noEmit -p packages/agent-core/tsconfig.json && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 3: Verify Task tool appears in tool definitions**

```typescript
// Quick verification: toolRegistry.getToolDefinitions should include Task
const container = await createContainer(opts);
const defs = container.toolRegistry.getToolDefinitions(container.configService.get().settings);
const taskDef = defs.find(d => d.name === "Task");
assert(taskDef !== undefined, "Task tool should be in definitions");
assert(taskDef.description.includes("sub-agent"), "Task description should mention sub-agent");
```
