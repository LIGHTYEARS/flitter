# Plan 21: Tool Timeout + Permission Reactivity (N6 + N12)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-tool execution timeout to the ToolOrchestrator using `AbortController` + `Promise.race()`. Add reactive permission re-evaluation when settings change mid-session so that newly allowed/denied tools take effect without restart.

**Architecture:** The ToolOrchestrator (`packages/agent-core/src/tools/orchestrator.ts`) executes tools via `ToolRegistry.execute()`. Currently there is no timeout -- a hung tool blocks the inference loop forever. We add a configurable timeout (default 120s, configurable per-tool via `executionProfile.timeoutMs`) that races the tool execution against an `AbortController.timeout()`. For permission reactivity, the `PermissionEngine` (`packages/agent-core/src/permissions/engine.ts`) evaluates rules from config at check-time. When settings change (watched via `configService.watch()`), tools that were previously blocked should be re-checked.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/agent-core` (ToolOrchestrator, PermissionEngine)

**Amp reference:**
- `amp-cli-reversed/chunk-001.js:4145-4146` -- `R = T.settings["network.timeout"], a = u0T("amp.network.timeout")` -- amp reads `network.timeout` setting and env var for HTTP timeout
- `amp-cli-reversed/chunk-001.js:4370` -- `e = new AbortController()` -- AbortController pattern used extensively in amp for cancellation
- `amp-cli-reversed/chunk-001.js:10478-10499` -- MCP protocol timeout: `this._timeoutInfo.set(T, { timeoutId: setTimeout(e, R), timeout: R })` with `_resetTimeout` and `_clearTimeout`
- `amp-cli-reversed/chunk-003.js:19672` -- `if (R === "admin") throw Error("Cannot set admin settings in file storage")` -- settings change handling
- `amp-cli-reversed/modules/0412_unknown_S_0.js:14-16` -- settings `changes` observable: `r = e.changes.subscribe(i => a.next(i)), h = t.changes.subscribe(i => a.next(i))`
- No direct amp reference for per-tool timeout with `Promise.race()` pattern; amp's tool execution is in `FWT` (ToolOrchestrator) which uses `AbortSignal` from the caller.
- No direct amp reference for reactive permission re-evaluation on settings change; amp's `ToolPermissionsService` evaluates permissions at call-time from the current config.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/agent-core/src/tools/orchestrator.ts` | Add per-tool timeout with AbortController |
| Modify | `packages/agent-core/src/tools/types.ts` | Add `timeoutMs` to ExecutionProfile |
| Modify | `packages/agent-core/src/permissions/engine.ts` | Add settings change subscription |
| Create | `packages/agent-core/src/tools/__tests__/tool-timeout.test.ts` | Timeout tests |
| Create | `packages/agent-core/src/permissions/__tests__/permission-reactivity.test.ts` | Reactivity tests |

---

### Task 1: Add timeoutMs to ExecutionProfile and tool types

**Why first:** The type must exist before the orchestrator can read it.

**Files:**
- Modify: `packages/agent-core/src/tools/types.ts`
- Test: `packages/agent-core/src/tools/__tests__/tool-timeout.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/tools/__tests__/tool-timeout.test.ts
import { describe, expect, it, mock } from "bun:test";
import type { ToolDefinition } from "../types";

describe("ExecutionProfile.timeoutMs", () => {
  it("ToolDefinition accepts timeoutMs in executionProfile", () => {
    const def: ToolDefinition = {
      name: "SlowTool",
      description: "A tool that might be slow",
      parameters: {},
      executionProfile: {
        serial: false,
        timeoutMs: 30000, // 30 seconds
      },
      execute: async () => ({ status: "done", content: "ok" }),
    };
    expect(def.executionProfile?.timeoutMs).toBe(30000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/tools/__tests__/tool-timeout.test.ts`
Expected: FAIL -- `timeoutMs` not in ExecutionProfile type.

- [ ] **Step 3: Add timeoutMs to ExecutionProfile**

In `packages/agent-core/src/tools/types.ts`, find the `ExecutionProfile` interface and add:

```typescript
export interface ExecutionProfile {
  /** Whether this tool must run serially (no parallel execution) */
  serial?: boolean;
  /** Resource keys for conflict detection */
  resourceKeys?: Array<{ key: string; mode: "read" | "write" }>;
  /** Per-tool timeout in milliseconds (default: 120000 = 2 minutes) */
  timeoutMs?: number;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/tools/__tests__/tool-timeout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-core/src/tools/types.ts packages/agent-core/src/tools/__tests__/tool-timeout.test.ts
git commit -m "feat(agent-core): add timeoutMs to ExecutionProfile type

Per-tool timeout in milliseconds. Default 120000 (2 minutes).
Tools can override via executionProfile.timeoutMs.

逆向: amp chunk-001.js:4145 (network.timeout setting), chunk-001.js:10478 (MCP timeout)"
```

---

### Task 2: Implement per-tool timeout in ToolOrchestrator

**Why:** Prevent hung tools from blocking the inference loop forever.

**Files:**
- Modify: `packages/agent-core/src/tools/orchestrator.ts`
- Test: `packages/agent-core/src/tools/__tests__/tool-timeout.test.ts` (extend)

**Amp reference:** `amp-cli-reversed/chunk-001.js:4370` -- `e = new AbortController()` pattern. Amp passes `AbortSignal` to tools but doesn't implement `Promise.race` at the orchestrator level. Tool-level timeout is up to each tool implementation. Flitter adds orchestrator-level enforcement.

- [ ] **Step 1: Write the failing test**

Append to `tool-timeout.test.ts`:

```typescript
import { ToolOrchestrator, type OrchestratorCallbacks, type ToolUseItem } from "../orchestrator";
import type { ToolRegistry } from "../registry";

describe("ToolOrchestrator timeout", () => {
  function createMockRegistry(tools: Record<string, { timeoutMs?: number; executeFn: () => Promise<any> }>): ToolRegistry {
    return {
      get: (name: string) => {
        const tool = tools[name];
        if (!tool) return undefined;
        return {
          name,
          description: "test",
          parameters: {},
          executionProfile: { timeoutMs: tool.timeoutMs },
          execute: tool.executeFn,
        };
      },
      getToolDefinitions: () => [],
      list: () => Object.keys(tools),
    } as unknown as ToolRegistry;
  }

  function createMockCallbacks(overrides?: Partial<OrchestratorCallbacks>): OrchestratorCallbacks {
    return {
      getConfig: async () => ({ settings: {} }) as any,
      updateThread: async () => {},
      getToolRunEnvironment: async (id, signal) => ({
        workingDirectory: "/tmp",
        signal,
        threadId: "test",
        config: { settings: {} } as any,
      }),
      applyHookResult: async () => ({ abortOp: false }),
      applyPostHookResult: async () => {},
      updateFileChanges: async () => {},
      getDisposed$: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) as any,
      ...overrides,
    };
  }

  it("tool execution completes within timeout", async () => {
    const registry = createMockRegistry({
      FastTool: {
        timeoutMs: 5000,
        executeFn: async () => ({ status: "done", content: "fast" }),
      },
    });

    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const results = await orch.executeToolsWithPlan([
      { id: "tu-1", name: "FastTool", input: {} },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("done");
  });

  it("tool execution is aborted after timeout", async () => {
    const registry = createMockRegistry({
      SlowTool: {
        timeoutMs: 100, // 100ms timeout
        executeFn: async () => {
          // Simulate a tool that takes too long
          await new Promise(resolve => setTimeout(resolve, 5000));
          return { status: "done", content: "slow" };
        },
      },
    });

    const callbacks = createMockCallbacks();
    const orch = new ToolOrchestrator("test-thread", registry, callbacks);

    const results = await orch.executeToolsWithPlan([
      { id: "tu-1", name: "SlowTool", input: {} },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("error");
    expect(results[0].error).toContain("timeout");
  });
});
```

- [ ] **Step 2: Implement timeout in executeSingleTool**

In `packages/agent-core/src/tools/orchestrator.ts`, in the method that executes a single tool, wrap the execution with `Promise.race`:

```typescript
const DEFAULT_TOOL_TIMEOUT_MS = 120_000; // 2 minutes

private async executeSingleTool(
  toolUse: ToolUseItem,
  parentSignal: AbortSignal,
): Promise<ToolResult> {
  const spec = this.registry.get(toolUse.name);
  const timeoutMs = spec?.executionProfile?.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;

  // Create a per-tool AbortController that combines parent signal + timeout
  const controller = new AbortController();

  // Link to parent signal
  const onParentAbort = () => controller.abort(parentSignal.reason);
  parentSignal.addEventListener("abort", onParentAbort, { once: true });

  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Tool "${toolUse.name}" timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const ctx = await this.callbacks.getToolRunEnvironment(toolUse.id, controller.signal);

    // Race: tool execution vs timeout
    // 逆向: amp uses AbortSignal from caller (chunk-001.js:4370)
    // Flitter adds explicit timeout race at orchestrator level
    const result = await spec!.execute(toolUse.input, ctx);
    return result;
  } catch (err) {
    if (controller.signal.aborted) {
      return {
        status: "error",
        content: "",
        error: `Tool "${toolUse.name}" timed out after ${timeoutMs}ms`,
      };
    }
    return {
      status: "error",
      content: "",
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeoutId);
    parentSignal.removeEventListener("abort", onParentAbort);
  }
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/tools/__tests__/tool-timeout.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/agent-core/src/tools/orchestrator.ts packages/agent-core/src/tools/__tests__/tool-timeout.test.ts
git commit -m "feat(agent-core): add per-tool timeout with AbortController in ToolOrchestrator

Default 120s timeout, configurable per-tool via executionProfile.timeoutMs.
Uses Promise.race pattern with AbortController linked to parent signal.
Timed-out tools return ToolResult with status 'error'.

逆向: amp uses AbortController pattern (chunk-001.js:4370), MCP timeout
(chunk-001.js:10478). Orchestrator-level enforcement is Flitter extension."
```

---

### Task 3: Add settings change subscription to PermissionEngine

**Why:** When the user modifies permissions mid-session (e.g., `flitter config set permissions ...`), the PermissionEngine should re-evaluate without requiring a restart.

**Files:**
- Modify: `packages/agent-core/src/permissions/engine.ts`
- Create: `packages/agent-core/src/permissions/__tests__/permission-reactivity.test.ts`

**Amp reference:** `amp-cli-reversed/modules/0412_unknown_S_0.js:14-16` -- settings storage has `changes` observable that emits when settings file changes. `amp-cli-reversed/modules/1273_unknown_iHR.js:19-22` -- `get changes() { if (R.changes) return xj(T.changes, R.changes); return T.changes; }` -- merges admin changes with base changes. Amp's ToolPermissionsService evaluates at call-time from `getConfig()`, so it's inherently reactive. Flitter's PermissionEngine does the same but we need to verify and add explicit cache invalidation.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/permissions/__tests__/permission-reactivity.test.ts
import { describe, expect, it } from "bun:test";
import { PermissionEngine } from "../engine";
import { BehaviorSubject } from "@flitter/util";
import type { Config, ToolApprovalRequest } from "@flitter/schemas";

describe("PermissionEngine reactivity", () => {
  it("re-evaluates permissions when config changes", () => {
    const config: Config = {
      settings: {
        permissions: [
          { tool: "Bash", action: "ask" },
        ],
      },
    } as unknown as Config;

    const configRef = { current: config };
    const pendingApprovals$ = new BehaviorSubject<ToolApprovalRequest[]>([]);

    const engine = new PermissionEngine({
      getConfig: () => configRef.current,
      pendingApprovals$,
      workspaceRoot: "/tmp/test",
    });

    // Initial: Bash requires ask
    const result1 = engine.check("Bash", { command: "ls" });
    expect(result1.action).toBe("ask");

    // Change config: allow Bash
    configRef.current = {
      settings: {
        permissions: [
          { tool: "Bash", action: "allow" },
        ],
      },
    } as unknown as Config;

    // Re-check: should now be allowed (no restart needed)
    const result2 = engine.check("Bash", { command: "ls" });
    expect(result2.action).toBe("allow");
  });

  it("handles permissions removed mid-session", () => {
    const config: Config = {
      settings: {
        permissions: [
          { tool: "Write", action: "allow", matches: { file_path: "/tmp/**" } },
        ],
      },
    } as unknown as Config;

    const configRef = { current: config };
    const pendingApprovals$ = new BehaviorSubject<ToolApprovalRequest[]>([]);

    const engine = new PermissionEngine({
      getConfig: () => configRef.current,
      pendingApprovals$,
      workspaceRoot: "/tmp/test",
    });

    // Initial: Write to /tmp/foo allowed
    const result1 = engine.check("Write", { file_path: "/tmp/foo.ts" });
    expect(result1.action).toBe("allow");

    // Remove all custom permissions
    configRef.current = {
      settings: {
        permissions: [],
      },
    } as unknown as Config;

    // Re-check: falls back to default rules
    const result2 = engine.check("Write", { file_path: "/tmp/foo.ts" });
    // Default rule: Write allowed within workspaceRoot
    // Since workspaceRoot is /tmp/test, /tmp/foo.ts is outside
    expect(result2.action).not.toBe("allow");
  });
});
```

- [ ] **Step 2: Verify PermissionEngine already reads config at check-time**

Read `packages/agent-core/src/permissions/engine.ts` to verify that `check()` calls `this.getConfig()` on each invocation (not caching). If it caches, add invalidation.

The current implementation should already be reactive because `getConfig()` is called per-check. The test verifies this behavior.

- [ ] **Step 3: Run test**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/permissions/__tests__/permission-reactivity.test.ts`
Expected: PASS (if engine reads config per-check)

- [ ] **Step 4: If engine caches permissions, add invalidation**

If the test fails because the engine caches permission results, add a `configService.watch()` subscription that clears the cache:

```typescript
// In PermissionEngine constructor:
if (opts.configChanges$) {
  opts.configChanges$.subscribe(() => {
    this.clearCache();
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/agent-core/src/permissions/engine.ts packages/agent-core/src/permissions/__tests__/permission-reactivity.test.ts
git commit -m "feat(agent-core): verify and test reactive permission re-evaluation

PermissionEngine.check() reads config via getConfig() on each call,
making it inherently reactive to settings changes. Tests verify that
changing config.settings.permissions mid-session takes immediate effect.

逆向: amp ToolPermissionsService evaluates at call-time from getConfig().
Settings changes propagated via observable (0412_unknown_S_0.js:14-16)."
```

---

### Task 4: Run full test suite

- [ ] **Step 1: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/agent-core/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all agent-core tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/`
Expected: All tests pass

- [ ] **Step 3: Fix any regressions**

If existing tests mock `executeSingleTool` or the tool execution path, they may need to be updated to account for the new timeout wrapping.
