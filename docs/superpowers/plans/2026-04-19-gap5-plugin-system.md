# Gap 5: Plugin System

> Implementation plan for the plugin system — user-defined TypeScript files that intercept tool calls.

## Overview

Amp's plugin system allows users to place `.ts` or `.js` files in `.amp/plugins/` (workspace) or `~/.config/amp/plugins/` (global). These plugins are loaded as Bun subprocesses and can intercept tool calls before/after execution to modify, reject, synthesize, or pass through.

## Amp Reference

| Component | File | Key function |
|---|---|---|
| Plugin discovery | `chunk-002.js:27190-27510` | `X5T()` |
| Subprocess execution | `chunk-005.js:145495-145772` | `vaT` class |
| JSON-RPC protocol | `chunk-005.js:19733` | `TqR()` runtime template |
| Tool call interception | `chunk-002.js:27565-27641` | `toolCall` / `toolResult` events |
| Action handling | `chunk-002.js:21007-21058` | `error/reject-and-continue/synthesize/modify` |
| Plugin wiring in orchestrator | `chunk-002.js:21739` | `requestPluginToolCall/requestPluginToolResult` |

## Design

### Architecture

```
User places .ts file in .flitter/plugins/
    ↓
PluginService discovers files, spawns each in Bun subprocess
    ↓
Plugin registers hooks via JSON-RPC on stdin/stdout
    ↓
ToolOrchestrator calls PluginService.onToolCall() before tool execution
    ↓
Plugin returns: allow | error | reject-and-continue | synthesize | modify
    ↓
ToolOrchestrator calls PluginService.onToolResult() after tool execution
    ↓
Plugin can modify the result before it's written to thread
```

### Plugin Runtime API

The user-facing plugin API:

```typescript
// .flitter/plugins/my-plugin.ts
export default function(api: PluginAPI) {
  api.on("tool.call", async (event) => {
    // event: { toolName, toolUseId, input }
    if (event.toolName === "Bash" && event.input.command?.includes("rm -rf")) {
      return { action: "reject-and-continue", message: "Destructive command blocked by plugin" };
    }
    return { action: "allow" };
  });

  api.on("tool.result", async (event) => {
    // event: { toolName, toolUseId, input, result }
    return undefined; // pass through
  });
}
```

---

## Implementation Tasks

### Task 1: Plugin types

**New file:** `packages/agent-core/src/plugins/types.ts`

```typescript
export interface PluginToolCallEvent {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
}

export interface PluginToolResultEvent {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  result: { status: string; output?: string; error?: string };
}

export type PluginAction =
  | { action: "allow" }
  | { action: "error"; message: string }
  | { action: "reject-and-continue"; message: string }
  | { action: "synthesize"; output: string }
  | { action: "modify"; input: Record<string, unknown> };

export interface PluginInfo {
  name: string;
  path: string;
  status: "starting" | "ready" | "failed" | "stopped";
  error?: string;
}
```

### Task 2: Plugin subprocess host

**New file:** `packages/agent-core/src/plugins/plugin-host.ts`

```typescript
export class PluginHost {
  private process: ChildProcess | null = null;
  private ready: Promise<void>;
  private pendingRequests: Map<string, { resolve, reject }>;

  constructor(
    readonly pluginPath: string,
    readonly pluginName: string,
  ) {}

  async start(): Promise<void>;
  async stop(): Promise<void>;

  async sendToolCall(event: PluginToolCallEvent): Promise<PluginAction>;
  async sendToolResult(event: PluginToolResultEvent): Promise<Record<string, unknown> | undefined>;

  private handleMessage(msg: JsonRpcMessage): void;
  private sendRequest(method: string, params: unknown): Promise<unknown>;
}
```

**Subprocess protocol (JSON-RPC over stdin/stdout):**
```json
// Host → Plugin
{"jsonrpc":"2.0","id":1,"method":"tool.call","params":{"toolName":"Bash","input":{...}}}

// Plugin → Host
{"jsonrpc":"2.0","id":1,"result":{"action":"allow"}}

// Plugin → Host (event, no response needed)
{"jsonrpc":"2.0","method":"runtime.ready","params":{}}
```

**Amp ref:** `chunk-005.js:145495-145772` — `vaT` class, Bun subprocess with JSON-RPC on stdio.

### Task 3: Plugin runtime (injected into subprocess)

**New file:** `packages/agent-core/src/plugins/plugin-runtime.ts`

This is the shim code that wraps the user's plugin default export:

```typescript
// Template string written to temp file and passed to Bun
export function generatePluginRuntime(pluginPath: string): string {
  return `
    import pluginFn from "${pluginPath}";

    const handlers = new Map();
    const api = {
      on(event, handler) { handlers.set(event, handler); }
    };

    pluginFn(api);

    // Emit ready
    console.log(JSON.stringify({ jsonrpc: "2.0", method: "runtime.ready", params: {} }));

    // Read JSON-RPC from stdin
    for await (const line of console) {
      const msg = JSON.parse(line);
      const handler = handlers.get(msg.method);
      const result = handler ? await handler(msg.params) : undefined;
      if (msg.id) {
        console.log(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: result ?? { action: "allow" } }));
      }
    }
  `;
}
```

### Task 4: Plugin service

**New file:** `packages/agent-core/src/plugins/plugin-service.ts`

```typescript
export class PluginService implements Disposable {
  private hosts: Map<string, PluginHost> = new Map();

  constructor(
    private workspaceRoot: string | null,
    private userConfigDir: string,
  ) {}

  async discover(): Promise<PluginInfo[]>;
  async startAll(): Promise<void>;
  async stopAll(): Promise<void>;

  async onToolCall(event: PluginToolCallEvent): Promise<PluginAction>;
  async onToolResult(event: PluginToolResultEvent): Promise<Record<string, unknown> | undefined>;

  getPlugins(): PluginInfo[];
  dispose(): void;
}
```

**Discovery paths:**
1. `${workspaceRoot}/.flitter/plugins/` (workspace)
2. `${userConfigDir}/plugins/` (global)

**`onToolCall` logic:**
1. Fan out to all plugins with `Promise.all`
2. Process results in order; stop at first non-"allow" action
3. Default: `{ action: "allow" }`

**Amp ref:** `chunk-002.js:27565-27609` — fan-out, first non-allow wins.

### Task 5: Wire into ToolOrchestrator

**File:** `packages/agent-core/src/tools/orchestrator.ts`

Add to `OrchestratorCallbacks`:
```typescript
requestPluginToolCall?: (event: PluginToolCallEvent) => Promise<PluginAction>;
requestPluginToolResult?: (event: PluginToolResultEvent) => Promise<Record<string, unknown> | undefined>;
```

In `invokeTool()`, before tool execution:
```typescript
if (this.callbacks.requestPluginToolCall) {
  const pluginAction = await this.callbacks.requestPluginToolCall({
    toolName, toolUseId, input
  });
  switch (pluginAction.action) {
    case "error":
      // emit error result, return early
    case "reject-and-continue":
      // emit "Tool rejected by plugin: ..." result, return early
    case "synthesize":
      // emit plugin's output as result, return early
    case "modify":
      input = pluginAction.input;  // replace input
      // continue to real execution
  }
}
```

After tool execution:
```typescript
if (this.callbacks.requestPluginToolResult) {
  const modified = await this.callbacks.requestPluginToolResult({
    toolName, toolUseId, input, result
  });
  if (modified) result = modified;
}
```

### Task 6: Wire into container

**File:** `packages/flitter/src/container.ts`

```typescript
const pluginService = new PluginService(workspaceRoot, configDir);
await pluginService.discover();
await pluginService.startAll();

// In createThreadWorker callbacks:
requestPluginToolCall: (event) => pluginService.onToolCall(event),
requestPluginToolResult: (event) => pluginService.onToolResult(event),

// In disposables:
disposables.push(pluginService);
```

### Task 7: CLI commands

**File:** `packages/cli/src/commands/plugins.ts` (new)

```typescript
export async function handlePluginsList(deps: { pluginService: PluginService }): Promise<void>;
export async function handlePluginsExec(deps: { pluginService: PluginService }, name: string): Promise<void>;
```

**`plugins list`:** Print plugin name, path, status for each discovered plugin.
**`plugins exec`:** Manually trigger a plugin by name (for testing).

Register in `program.ts`:
```typescript
const plugins = program.command("plugins");
plugins.command("list").alias("ls");
plugins.command("exec <name>");
```

### Task 8: File watcher for hot-reload

Watch workspace `.flitter/plugins/` for changes:
```typescript
// In PluginService
startWatching(): void {
  const watcher = fs.watch(this.pluginsDir, { recursive: true }, async () => {
    await this.stopAll();
    await this.discover();
    await this.startAll();
  });
}
```

**Amp ref:** `chunk-002.js:27442-27453` — watches directories, stops and reloads all plugins on change.

### Task 9: Tests

- **PluginHost:** Mock subprocess, verify JSON-RPC protocol
- **PluginService:** Mock discovery, verify fan-out and first-non-allow logic
- **Integration:** Create a temp plugin that rejects `rm -rf`, verify tool is rejected
- **Hot-reload:** Write a plugin file, verify it's picked up

---

## Estimated Scope

| Task | Files | Complexity |
|---|---|---|
| Plugin types | 1 new | Low |
| Plugin subprocess host | 1 new | High |
| Plugin runtime template | 1 new | Medium |
| Plugin service | 1 new | Medium |
| Orchestrator wiring | 1 modified | Medium |
| Container wiring | 1 modified | Low |
| CLI commands | 1 new + 2 modified | Low |
| File watcher | In PluginService | Low |
| Tests | 2-3 new | Medium |
