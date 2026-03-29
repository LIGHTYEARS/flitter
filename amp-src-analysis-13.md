# Analysis 13: ACP Client and Callbacks System

## File: `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/client.ts`

## Overview

The ACP client module implements the **host-side** of the Agent-Client Protocol: it is the object the remote agent calls into when it needs to interact with the local environment. While the connection module (`connection.ts`) handles spawning the agent and establishing the JSON-RPC transport, `client.ts` defines `FlitterClient`, which satisfies every request the agent can make -- reading/writing files, creating terminal processes, collecting their output, and asking the user for permission. A companion `ClientCallbacks` interface decouples all UI concerns so that any TUI (or test harness) can plug in.

---

## ClientCallbacks Interface

```ts
export interface ClientCallbacks {
  onSessionUpdate(sessionId: string, update: SessionUpdate): void;
  onPermissionRequest(request: PermissionRequest): Promise<string | null>;
  onPromptComplete(sessionId: string, stopReason: string): void;
  onConnectionClosed(reason: string): void;
}
```

This four-method contract is the sole bridge between the ACP protocol layer and the UI layer. Every method maps to a distinct category of agent event:

| Method | Purpose |
|--------|---------|
| `onSessionUpdate` | Receives real-time streaming data: text chunks, tool call lifecycle events, plan updates, usage metrics, and mode changes. The `SessionUpdate.sessionUpdate` string discriminates the update type. |
| `onPermissionRequest` | Async gate for tool-call approval. Returns the selected `optionId` string, or `null` for cancellation. Because it returns a `Promise`, the protocol-level response is held open until the user interacts with the TUI dialog. |
| `onPromptComplete` | Signals that the agent has finished processing a prompt. Carries the `stopReason` (e.g., `end_turn`). |
| `onConnectionClosed` | Fires when the agent subprocess exits or the transport breaks. Carries a human-readable `reason`. |

The concrete implementation lives in `AppState` (`/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts`), which `implements ClientCallbacks` directly.

---

## FlitterClient Class

`FlitterClient` is the server-side handler for agent-initiated JSON-RPC calls. It is constructed with a `ClientCallbacks` reference and holds two internal maps: `terminals` (terminalId -> `ChildProcess`) and `terminalBuffers` (terminalId -> `TerminalBuffer`).

### Construction and Registration

In `connection.ts`, the factory passed to `ClientSideConnection` creates and returns the `FlitterClient`:

```ts
const client = new FlitterClient(callbacks);
const connection = new acp.ClientSideConnection(
  (_agentProxy: acp.Agent) => client as unknown as acp.Client,
  stream,
);
```

The ACP SDK then routes incoming JSON-RPC method calls (`session/update`, `session/request_permission`, `fs/read_text_file`, etc.) to the corresponding methods on this object.

---

## Session Update Dispatcher (`sessionUpdate`)

```ts
async sessionUpdate(params: { sessionId: string; update: SessionUpdate }): Promise<void>
```

A thin passthrough: it forwards the raw `SessionUpdate` to `callbacks.onSessionUpdate`. The actual dispatching logic lives in `AppState.onSessionUpdate`, which switches on `update.sessionUpdate`:

- **`agent_message_chunk`** -- Appends streamed text to the current assistant message via `ConversationState.appendAssistantChunk`.
- **`agent_thought_chunk`** -- Appends chain-of-thought text to a thinking block via `appendThinkingChunk`.
- **`tool_call`** -- Registers a new tool invocation (`addToolCall`), recording its id, title, kind, status, locations, and raw input.
- **`tool_call_update`** -- Updates an existing tool call with a final status (`completed`/`failed`) and optional output content.
- **`plan`** -- Replaces the current plan entries via `setPlan`.
- **`usage_update`** -- Updates context-window size, tokens used, and optional cost data.
- **`current_mode_update`** -- Stores the agent's current mode id on `AppState.currentMode`.
- **`session_info_update`** -- Acknowledged but currently a no-op.

Every branch ends with `notifyListeners()`, triggering a TUI re-render.

---

## Permission Request Flow (`requestPermission`)

```ts
async requestPermission(params: PermissionRequest): Promise<{ outcome: { outcome: string; optionId?: string } }>
```

This is the human-in-the-loop gate. The flow works as follows:

1. The agent sends a `session/request_permission` JSON-RPC call containing a `PermissionRequest` object -- which includes the `toolCall` details (id, title, kind, status, file locations, raw input), a human-readable `prompt`, and an array of `options` (each with `kind`, `name`, `optionId`).
2. `FlitterClient.requestPermission` delegates to `callbacks.onPermissionRequest(params)`.
3. In `AppState`, this creates a `Promise` and stores its `resolve` function alongside the request in `pendingPermission`. It then calls `notifyListeners()`, which causes the TUI to render a permission dialog.
4. When the user selects an option, the TUI calls `AppState.resolvePermission(optionId)`, which resolves the stored Promise.
5. Back in `FlitterClient`, the resolved value is mapped to the ACP response format:
   - Non-null `selectedId` produces `{ outcome: 'selected', optionId }`.
   - `null` produces `{ outcome: 'cancelled' }`.

This design keeps the `FlitterClient` protocol-aware but UI-agnostic -- it never directly renders anything.

---

## TerminalBuffer -- Persistent Output Collection

```ts
interface TerminalBuffer {
  output: string;
  byteCount: number;
  limit: number | null;
}
```

`TerminalBuffer` is a simple accumulator that captures combined stdout and stderr output for a child process. The `limit` field, populated from `outputByteLimit` in the create request, provides a hard cap on how many bytes are stored. When `limit` is non-null and `byteCount` reaches it, further chunks are silently dropped. If a single chunk would push past the limit, only the portion that fits (computed via `remaining = limit - byteCount`) is appended -- this is a character-level truncation, not a byte-precise one, because it slices the string representation rather than the raw Buffer.

The buffer is created in `createTerminal` and persists for the lifetime of the terminal. The `terminalOutput` method reads from it non-destructively (the output accumulates, never drains), and `releaseTerminal` deletes it.

---

## createTerminal

```ts
async createTerminal(params: { command, args?, cwd?, env?, outputByteLimit?, sessionId }): Promise<{ terminalId: string }>
```

This method is the ACP `terminal/create` handler. Its behavior step by step:

1. **Generate a unique ID** using `crypto.randomUUID()`.
2. **Merge environment variables**: Starts from the current `process.env`, then overlays any key/value pairs from `params.env`.
3. **Spawn the process** with `child_process.spawn`, piping all three stdio streams (`stdin`, `stdout`, `stderr`).
4. **Register the process** in the `terminals` map and a fresh `TerminalBuffer` in `terminalBuffers`.
5. **Attach output listeners**: Both `proc.stdout` and `proc.stderr` feed into the shared `appendOutput` closure, which respects the byte limit.
6. **Return** `{ terminalId }` immediately -- the process runs asynchronously.

The key design decision is that output collection starts immediately and is **persistent** -- any call to `terminalOutput` at any future point will see all accumulated output since spawn time, not just what has arrived since the last read.

---

## terminalOutput

```ts
async terminalOutput(params: { terminalId, sessionId }): Promise<{ terminal: { terminalId, output, exitStatus? } }>
```

Returns a snapshot of the terminal's current state:

- `output`: the full accumulated string from the `TerminalBuffer`.
- `exitStatus`: `{ code: number }` if the process has exited, or `null` if still running.

If the `terminalId` is unknown (process was never created or already released), it returns an empty output with exit code `-1`. Notably, this method registers **no new listeners** -- it purely reads the persistent buffer, avoiding the risk of duplicate listener accumulation across repeated polling.

---

## waitForTerminalExit

```ts
async waitForTerminalExit(params: { terminalId, sessionId }): Promise<{ exitCode?, signal? }>
```

Blocks (from the agent's perspective) until the terminal process exits:

- If the process is unknown, returns `{ exitCode: -1, signal: null }` immediately.
- If the process has already exited (`proc.exitCode !== null`), returns synchronously with the stored exit code and signal.
- Otherwise, wraps a one-shot `proc.on('exit', ...)` listener in a Promise, resolving when the process terminates.

The return shape is flat (`{ exitCode, signal }`) rather than nested, matching the ACP SDK's `WaitForTerminalExitResponse` type.

---

## File System Operations

### readTextFile

```ts
async readTextFile(params: { path, sessionId }): Promise<{ content: string }>
```

A direct passthrough to `fs.readFile` with UTF-8 encoding. No sandboxing, no path validation -- the agent has full read access to the host filesystem. Errors propagate as rejected promises, which the ACP transport layer converts to JSON-RPC error responses.

### writeTextFile

```ts
async writeTextFile(params: { content, path, sessionId }): Promise<void>
```

Similarly direct: `fs.writeFile` with UTF-8 encoding. No directory creation, no backup, no permission check at this layer. The assumption is that permission was already granted via the `requestPermission` flow before the agent reaches this point.

---

## Terminal Lifecycle: killTerminal and releaseTerminal

- **`killTerminal`**: Sends `SIGTERM` to the process if it has not already been killed. Does not remove the terminal from the maps, so output can still be read.
- **`releaseTerminal`**: Sends `SIGTERM` (if needed) and then deletes both the process and the buffer from their respective maps. This is the clean teardown path.
- **`cleanup`**: Called on application shutdown. Iterates all terminals, sends `SIGTERM` to each, and clears both maps.

---

## onConnectionClosed

In `AppState`, this callback:

1. Calls `handleError()`, which finalizes any in-progress streaming (assistant message and thinking), sets `isProcessing = false`, and stores the error message.
2. Sets `isConnected = false`.
3. Calls `notifyListeners()` to trigger a TUI re-render showing the disconnection state.

The `reason` string passed from the transport layer becomes the error message displayed to the user, prefixed with "Agent disconnected: ".

---

## Architectural Summary

The client module implements a clean separation of concerns:

- **`FlitterClient`** owns the protocol contract -- it knows the shape of every ACP request/response but has zero knowledge of the UI.
- **`ClientCallbacks`** is the abstraction boundary -- any object implementing it can serve as the UI backend.
- **`AppState`** is the concrete `ClientCallbacks` implementation that owns conversation state, permission dialogs, and listener notification.
- **`TerminalBuffer`** provides persistent, non-destructive output accumulation with optional byte-limiting, solving the problem of the agent polling for output at arbitrary times after process creation.

The overall data flow is: **Agent subprocess** -> JSON-RPC over ndJSON stream -> `acp.ClientSideConnection` -> `FlitterClient` methods -> `ClientCallbacks` -> `AppState` -> `notifyListeners()` -> TUI widget rebuild.
