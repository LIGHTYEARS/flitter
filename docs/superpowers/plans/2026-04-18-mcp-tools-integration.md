> **STATUS: COMPLETED** — This plan has been fully implemented and is kept for historical reference only.

# MCP Tools Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MCP server tools appear in the LLM's tool list and be callable during inference, by bridging `MCPServerManager.allTools$` to `ToolRegistry`.

**Architecture:** `MCPServerManager` already connects to configured servers, discovers tools, namespaces them as `mcp__<server>__<tool>`, and exposes them via `allTools$: BehaviorSubject<NamespacedMCPTool[]>`. `ToolRegistry` accepts any `ToolSpec` via `register(spec)`. The missing bridge is a subscriber that: (1) converts `NamespacedMCPTool[]` to `ToolSpec[]`, (2) diffs against previously registered MCP tools, (3) registers new / unregisters removed tools. The `execute` function on each MCP `ToolSpec` calls `mcpServerManager.callTool(namespacedName, args, signal)` and converts `MCPToolResult` to `ToolResult`.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/llm` (MCPServerManager, NamespacedMCPTool, MCPToolResult), `@flitter/agent-core` (ToolRegistry, ToolSpec, ToolResult)

**Amp reference:** `amp-cli-reversed/chunk-001.js:13553-13628` — `mcpService.registerToolsWithToolService(toolService)` subscribes to server changes, builds spec via `OPR()`, calls `toolService.registerTool()` for new tools and `dispose()` for removed ones.

**Depends on:** Plan 1 (Container Wiring) — specifically Task 1 (`getToolRunEnvironment` returns proper `ToolContext`).

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/flitter/src/mcp-bridge.ts` | `syncMCPToolsToRegistry()` — the reactive bridge |
| Modify | `packages/flitter/src/container.ts` | Call `syncMCPToolsToRegistry` after MCPServerManager creation |
| Create | `packages/flitter/src/__tests__/mcp-bridge.test.ts` | Tests for the bridge |

---

### Task 1: Create `mcpToolResultToToolResult` converter

**Why:** MCP servers return `MCPToolResult { content: MCPToolContent[], isError? }` but tools must return `ToolResult { status, content?, error? }`. We need a converter.

**Files:**
- Create: `packages/flitter/src/mcp-bridge.ts`
- Test: `packages/flitter/src/__tests__/mcp-bridge.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/flitter/src/__tests__/mcp-bridge.test.ts
import { describe, expect, it } from "bun:test";
import { mcpToolResultToToolResult } from "../mcp-bridge";

describe("mcpToolResultToToolResult", () => {
  it("converts text content to ToolResult", () => {
    const result = mcpToolResultToToolResult({
      content: [{ type: "text", text: "file contents here" }],
    });
    expect(result.status).toBe("done");
    expect(result.content).toBe("file contents here");
  });

  it("concatenates multiple text content blocks", () => {
    const result = mcpToolResultToToolResult({
      content: [
        { type: "text", text: "line 1" },
        { type: "text", text: "line 2" },
      ],
    });
    expect(result.status).toBe("done");
    expect(result.content).toBe("line 1\nline 2");
  });

  it("converts error result", () => {
    const result = mcpToolResultToToolResult({
      content: [{ type: "text", text: "permission denied" }],
      isError: true,
    });
    expect(result.status).toBe("error");
    expect(result.error).toBe("permission denied");
  });

  it("handles image content by noting it", () => {
    const result = mcpToolResultToToolResult({
      content: [{ type: "image", data: "base64...", mimeType: "image/png" }],
    });
    expect(result.status).toBe("done");
    expect(result.content).toContain("[image:");
  });

  it("handles empty content", () => {
    const result = mcpToolResultToToolResult({
      content: [],
    });
    expect(result.status).toBe("done");
    expect(result.content).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/mcp-bridge.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the converter**

```typescript
// packages/flitter/src/mcp-bridge.ts
/**
 * MCP Tools ↔ ToolRegistry bridge
 *
 * Subscribes to MCPServerManager.allTools$ and syncs MCP tools into
 * the ToolRegistry so the LLM can discover and call them.
 *
 * 逆向: amp chunk-001.js:13553-13628 (mcpService.registerToolsWithToolService)
 */

import type { ToolResult, ToolSpec } from "@flitter/agent-core";
import type { MCPToolResult, NamespacedMCPTool } from "@flitter/llm";

/**
 * Convert MCPToolResult to ToolResult.
 *
 * 逆向: amp OPR() result conversion (chunk-001.js:13880-13896)
 */
export function mcpToolResultToToolResult(mcpResult: MCPToolResult): ToolResult {
  const textParts: string[] = [];
  const otherParts: string[] = [];

  for (const block of mcpResult.content) {
    if (block.type === "text") {
      textParts.push((block as { type: "text"; text: string }).text);
    } else if (block.type === "image") {
      const img = block as { type: "image"; mimeType: string };
      otherParts.push(`[image: ${img.mimeType}]`);
    } else {
      otherParts.push(`[${block.type}]`);
    }
  }

  const allParts = [...textParts, ...otherParts];
  const content = allParts.join("\n");

  if (mcpResult.isError) {
    return { status: "error", error: content || "MCP tool error" };
  }

  return { status: "done", content };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/mcp-bridge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/mcp-bridge.ts packages/flitter/src/__tests__/mcp-bridge.test.ts
git commit -m "feat(container): add mcpToolResultToToolResult converter for MCP bridge

Converts MCPToolResult (content array with text/image blocks + isError)
to ToolResult (status + content/error string) for the ToolRegistry.

逆向: amp OPR() result conversion (chunk-001.js:13880-13896)"
```

---

### Task 2: Create `buildMCPToolSpec` — convert a `NamespacedMCPTool` to a `ToolSpec`

**Why:** Each MCP tool needs a `ToolSpec` wrapper that the `ToolRegistry` can register. The `execute` function calls `mcpServerManager.callTool()`.

**Files:**
- Modify: `packages/flitter/src/mcp-bridge.ts`
- Test: `packages/flitter/src/__tests__/mcp-bridge.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `packages/flitter/src/__tests__/mcp-bridge.test.ts`:

```typescript
import { buildMCPToolSpec } from "../mcp-bridge";
import type { MCPServerManager } from "@flitter/llm";

describe("buildMCPToolSpec", () => {
  it("builds a ToolSpec from a NamespacedMCPTool", () => {
    const mockManager = {
      callTool: async () => ({ content: [{ type: "text", text: "result" }] }),
    } as unknown as MCPServerManager;

    const tool = {
      name: "mcp__myserver__search",
      originalName: "search",
      serverName: "myserver",
      description: "Search for files",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
    };

    const spec = buildMCPToolSpec(tool, mockManager);

    expect(spec.name).toBe("mcp__myserver__search");
    expect(spec.description).toBe("Search for files");
    expect(spec.inputSchema).toEqual(tool.inputSchema);
    expect(spec.source).toEqual({ mcp: "myserver" });
    expect(spec.isReadOnly).toBe(false);
  });

  it("execute calls mcpServerManager.callTool and converts result", async () => {
    const mockManager = {
      callTool: async (name: string, args: Record<string, unknown>) => ({
        content: [{ type: "text", text: `searched for ${args.query}` }],
      }),
    } as unknown as MCPServerManager;

    const tool = {
      name: "mcp__myserver__search",
      originalName: "search",
      serverName: "myserver",
      description: "Search",
      inputSchema: { type: "object", properties: {} },
    };

    const spec = buildMCPToolSpec(tool, mockManager);
    const result = await spec.execute(
      { query: "hello" },
      { workingDirectory: "/tmp", signal: AbortSignal.timeout(5000), threadId: "t1", config: {} as any },
    );

    expect(result.status).toBe("done");
    expect(result.content).toBe("searched for hello");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/mcp-bridge.test.ts`
Expected: FAIL — `buildMCPToolSpec` does not exist.

- [ ] **Step 3: Implement `buildMCPToolSpec`**

Add to `packages/flitter/src/mcp-bridge.ts`:

```typescript
import type { MCPServerManager } from "@flitter/llm";

/**
 * Build a ToolSpec from a NamespacedMCPTool.
 *
 * The execute function routes to mcpServerManager.callTool() and converts
 * the MCPToolResult to a ToolResult.
 *
 * 逆向: amp OPR() (chunk-001.js:13850-13896)
 */
export function buildMCPToolSpec(
  tool: NamespacedMCPTool,
  manager: MCPServerManager,
): ToolSpec {
  return {
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: tool.inputSchema,
    source: { mcp: tool.serverName },
    isReadOnly: false,
    execute: async (args, context) => {
      try {
        const mcpResult = await manager.callTool(tool.name, args, context.signal);
        return mcpToolResultToToolResult(mcpResult);
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

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/mcp-bridge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/mcp-bridge.ts packages/flitter/src/__tests__/mcp-bridge.test.ts
git commit -m "feat(container): add buildMCPToolSpec to convert MCP tools to ToolSpec

Each MCP tool gets a ToolSpec whose execute() calls
mcpServerManager.callTool() and converts the MCPToolResult.
source is set to { mcp: serverName } for permission engine routing.

逆向: amp OPR() (chunk-001.js:13850-13896)"
```

---

### Task 3: Create `syncMCPToolsToRegistry` — the reactive bridge

**Why:** This is the core integration. It subscribes to `allTools$`, diffs against previously registered MCP tools, and registers/unregisters as needed.

**Files:**
- Modify: `packages/flitter/src/mcp-bridge.ts`
- Test: `packages/flitter/src/__tests__/mcp-bridge.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `packages/flitter/src/__tests__/mcp-bridge.test.ts`:

```typescript
import { syncMCPToolsToRegistry } from "../mcp-bridge";
import { ToolRegistry } from "@flitter/agent-core";
import { BehaviorSubject } from "@flitter/util";

describe("syncMCPToolsToRegistry", () => {
  it("registers MCP tools when allTools$ emits", () => {
    const registry = new ToolRegistry();
    const allTools$ = new BehaviorSubject<NamespacedMCPTool[]>([]);
    const mockManager = {
      allTools$,
      callTool: async () => ({ content: [] }),
    } as unknown as MCPServerManager;

    const disposable = syncMCPToolsToRegistry(mockManager, registry);

    // Emit two tools
    allTools$.next([
      {
        name: "mcp__server1__read",
        originalName: "read",
        serverName: "server1",
        description: "Read a resource",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "mcp__server1__write",
        originalName: "write",
        serverName: "server1",
        description: "Write a resource",
        inputSchema: { type: "object", properties: {} },
      },
    ]);

    expect(registry.has("mcp__server1__read")).toBe(true);
    expect(registry.has("mcp__server1__write")).toBe(true);
    expect(registry.list()).toHaveLength(2);

    disposable.dispose();
  });

  it("unregisters removed tools on subsequent emissions", () => {
    const registry = new ToolRegistry();
    const allTools$ = new BehaviorSubject<NamespacedMCPTool[]>([]);
    const mockManager = {
      allTools$,
      callTool: async () => ({ content: [] }),
    } as unknown as MCPServerManager;

    const disposable = syncMCPToolsToRegistry(mockManager, registry);

    // First emission: two tools
    allTools$.next([
      { name: "mcp__s__a", originalName: "a", serverName: "s", inputSchema: {} },
      { name: "mcp__s__b", originalName: "b", serverName: "s", inputSchema: {} },
    ]);
    expect(registry.list()).toHaveLength(2);

    // Second emission: only tool "a" remains
    allTools$.next([
      { name: "mcp__s__a", originalName: "a", serverName: "s", inputSchema: {} },
    ]);
    expect(registry.has("mcp__s__a")).toBe(true);
    expect(registry.has("mcp__s__b")).toBe(false);
    expect(registry.list()).toHaveLength(1);

    disposable.dispose();
  });

  it("does not interfere with builtin tools", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "Read",
      description: "Read files",
      inputSchema: {},
      source: "builtin",
      execute: async () => ({ status: "done" }),
    });

    const allTools$ = new BehaviorSubject<NamespacedMCPTool[]>([]);
    const mockManager = {
      allTools$,
      callTool: async () => ({ content: [] }),
    } as unknown as MCPServerManager;

    const disposable = syncMCPToolsToRegistry(mockManager, registry);

    allTools$.next([
      { name: "mcp__s__tool", originalName: "tool", serverName: "s", inputSchema: {} },
    ]);
    expect(registry.list()).toHaveLength(2);
    expect(registry.has("Read")).toBe(true);
    expect(registry.has("mcp__s__tool")).toBe(true);

    // MCP tools removed, builtin survives
    allTools$.next([]);
    expect(registry.list()).toHaveLength(1);
    expect(registry.has("Read")).toBe(true);

    disposable.dispose();
  });

  it("dispose unregisters all MCP tools and unsubscribes", () => {
    const registry = new ToolRegistry();
    const allTools$ = new BehaviorSubject<NamespacedMCPTool[]>([]);
    const mockManager = {
      allTools$,
      callTool: async () => ({ content: [] }),
    } as unknown as MCPServerManager;

    const disposable = syncMCPToolsToRegistry(mockManager, registry);

    allTools$.next([
      { name: "mcp__s__tool", originalName: "tool", serverName: "s", inputSchema: {} },
    ]);
    expect(registry.list()).toHaveLength(1);

    disposable.dispose();
    expect(registry.list()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/mcp-bridge.test.ts`
Expected: FAIL — `syncMCPToolsToRegistry` does not exist.

- [ ] **Step 3: Implement `syncMCPToolsToRegistry`**

Add to `packages/flitter/src/mcp-bridge.ts`:

```typescript
import type { ToolRegistry } from "@flitter/agent-core";
import type { Subscription } from "@flitter/util";
import { createLogger } from "@flitter/util";

const log = createLogger("mcp-bridge");

/**
 * Subscribe to MCPServerManager.allTools$ and sync MCP tools into ToolRegistry.
 *
 * Returns a Disposable that unsubscribes and unregisters all MCP tools.
 *
 * 逆向: amp mcpService.registerToolsWithToolService (chunk-001.js:13553-13628)
 */
export function syncMCPToolsToRegistry(
  manager: MCPServerManager,
  registry: ToolRegistry,
): { dispose: () => void } {
  // Track which MCP tool names we have currently registered
  const registeredMCPTools = new Set<string>();

  const subscription: Subscription = manager.allTools$.subscribe((tools) => {
    const currentNames = new Set(tools.map((t) => t.name));

    // Unregister removed tools
    for (const name of registeredMCPTools) {
      if (!currentNames.has(name)) {
        registry.unregister(name);
        registeredMCPTools.delete(name);
        log.debug("Unregistered MCP tool", { name });
      }
    }

    // Register new tools
    for (const tool of tools) {
      if (!registeredMCPTools.has(tool.name)) {
        const spec = buildMCPToolSpec(tool, manager);
        try {
          registry.register(spec);
          registeredMCPTools.add(tool.name);
          log.debug("Registered MCP tool", { name: tool.name, server: tool.serverName });
        } catch (err) {
          // Duplicate name (e.g. MCP tool conflicts with builtin) — skip
          log.warn("Failed to register MCP tool", { name: tool.name, error: err });
        }
      }
    }
  });

  return {
    dispose: () => {
      subscription.unsubscribe();
      // Unregister all MCP tools on dispose
      for (const name of registeredMCPTools) {
        registry.unregister(name);
      }
      registeredMCPTools.clear();
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/mcp-bridge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/mcp-bridge.ts packages/flitter/src/__tests__/mcp-bridge.test.ts
git commit -m "feat(container): add syncMCPToolsToRegistry reactive bridge

Subscribes to mcpServerManager.allTools$ and diffs against registered
MCP tools. New tools are registered via buildMCPToolSpec; removed tools
are unregistered. Dispose cleans up all MCP tools and unsubscribes.

逆向: amp mcpService.registerToolsWithToolService (chunk-001.js:13553-13628)"
```

---

### Task 4: Wire `syncMCPToolsToRegistry` into container creation

**Why:** The bridge exists but isn't called. Need to connect it to the container lifecycle.

**Files:**
- Modify: `packages/flitter/src/container.ts` (after MCPServerManager creation, ~line 215)

- [ ] **Step 1: Add import**

At the top of `packages/flitter/src/container.ts`:

```typescript
import { syncMCPToolsToRegistry } from "./mcp-bridge";
```

- [ ] **Step 2: Wire after MCPServerManager creation**

In `packages/flitter/src/container.ts`, after line 215 (`log.info("MCPServerManager created")`):

```typescript
// Bridge MCP tools into ToolRegistry (reactive sync)
const mcpBridge = syncMCPToolsToRegistry(mcpServerManager, toolRegistry);
disposables.push({ dispose: () => mcpBridge.dispose() });
log.info("MCP tools bridge started");
```

- [ ] **Step 3: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: No type errors

- [ ] **Step 4: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/container.ts
git commit -m "feat(container): wire syncMCPToolsToRegistry into container lifecycle

MCP tools now automatically appear in the LLM's tool list when MCP
servers connect, and disappear when servers disconnect. The bridge
disposable is added to the container cleanup chain."
```

---

### Task 5: Run full verification

- [ ] **Step 1: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 2: Run type checks**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json && bunx tsc --noEmit -p packages/agent-core/tsconfig.json`
Expected: No type errors

- [ ] **Step 3: Verify MCP tools appear in tool definitions**

Write a quick integration test or check manually:

```typescript
// Verify that after MCPServerManager connects, toolRegistry.list() includes MCP tools
// This requires a running MCP server or a mock — defer to E2E testing
```
