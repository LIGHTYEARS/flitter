# flitter-amp ACP Session Management & Connection Analysis

## 1. ACP Session Lifecycle

### 1.1 Overview

The flitter-amp application follows a strict linear ACP lifecycle:

```
CLI boot -> parseArgs -> connectToAgent -> (initialize -> newSession) -> TUI loop -> cleanup
```

The entire lifecycle is orchestrated in `/home/gem/workspace/flitter/packages/flitter-amp/src/index.ts` by the `main()` function. There is no reconnection logic; if the agent process dies or the connection breaks, the application surfaces an error and effectively becomes inert.

### 1.2 Initialization Phase (Protocol Handshake)

The `connectToAgent` function in `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/connection.ts` performs a six-step startup sequence:

1. **Spawn agent subprocess** -- Calls `spawnAgent()` which uses Node's `child_process.spawn()` with all three stdio channels set to `'pipe'`.
2. **Create ndJSON stream** -- Converts the subprocess's `stdout` (readable) and `stdin` (writable) into Web Streams, then wraps them with `acp.ndJsonStream(output, input)`. This is the wire format: newline-delimited JSON over stdio.
3. **Create ClientSideConnection** -- Instantiates `acp.ClientSideConnection` with a factory function that returns the `FlitterClient` instance. The factory receives an `agentProxy` parameter (the typed RPC proxy for calling agent methods) but the current code discards it, passing the client directly.
4. **Send `initialize` request** -- Negotiates protocol version and declares client capabilities:
   ```typescript
   {
     protocolVersion: acp.PROTOCOL_VERSION,
     clientInfo: { name: 'flitter-amp', version: '0.1.0' },
     clientCapabilities: {
       fs: { readTextFile: true, writeTextFile: true },
       terminal: true,
     },
   }
   ```
   The response provides `agentCapabilities` and `agentInfo` (name, title).
5. **Send `newSession` request** -- Creates a session scoped to the working directory, with an empty MCP servers list:
   ```typescript
   { cwd, mcpServers: [] }
   ```
   Returns a `sessionId` string.
6. **Return `ConnectionHandle`** -- A composite object containing the connection, client, agent process, capabilities, agent info, and session ID.

### 1.3 Session Scope and Multiplicity

The current implementation creates exactly **one session per application lifetime**. The `sessionId` is stored in the `ConnectionHandle` returned by `connectToAgent` and mirrored into `AppState.sessionId` via `setConnected()`. There is no mechanism to create additional sessions, switch sessions, or reload sessions (`LoadSessionRequest` is listed in the type exports but never used).

### 1.4 Session Termination

There is no explicit `closeSession` call anywhere in the codebase. Sessions end only when:

- The user presses Ctrl+C or the process receives SIGTERM, triggering the cleanup handler that kills the agent subprocess.
- The agent process exits on its own, which fires the `exit` event handler.

The cleanup function in `main()` is deliberately simple:
```typescript
const cleanup = () => {
  handle.client.cleanup();  // kills all spawned terminal subprocesses
  handle.agent.kill();       // sends SIGTERM, then SIGKILL after 3s
  closeLogFile();
};
```

There is no graceful ACP-level shutdown (no `close` or `destroy` call on the connection). The subprocess is simply killed.

---

## 2. Connection Management

### 2.1 Subprocess Spawning

Defined in `/home/gem/workspace/flitter/packages/flitter-amp/src/utils/process.ts`, the `spawnAgent` function:

- Spawns the agent command with all stdio channels piped (`['pipe', 'pipe', 'pipe']`).
- Inherits the parent process's environment via `{ ...process.env }`.
- Redirects the agent's **stderr** to the flitter-amp log file. Each stderr line is forwarded as a debug-level log message prefixed with `[agent]`. This is a deliberate design to prevent the agent's stderr from corrupting the TUI display.
- Returns an `AgentProcess` object with a `kill()` method that implements a two-stage shutdown: SIGTERM first, then SIGKILL after a 3-second grace period.

### 2.2 Stream Wiring (stdio to ndJSON)

The connection between flitter-amp and the agent uses **newline-delimited JSON (ndJSON)** over stdio pipes. In `connectToAgent`:

```typescript
const input = Readable.toWeb(agent.stdout as any) as ReadableStream<Uint8Array>;
const output = Writable.toWeb(agent.stdin as any) as WritableStream<Uint8Array>;
const stream = acp.ndJsonStream(output, input);
```

Key observations:
- `Readable.toWeb` / `Writable.toWeb` convert Node.js streams to WHATWG Web Streams, as required by the `@agentclientprotocol/sdk`.
- The `as any` casts indicate a type compatibility gap between Node stream typings and the Web Stream expectations. This is a common pattern when bridging Node.js and Web APIs.
- `acp.ndJsonStream` takes `(writable, readable)` order -- the output (agent stdin) comes first, the input (agent stdout) comes second. This is the client's write channel and read channel, respectively.

### 2.3 Bidirectional RPC Model

The ACP protocol uses JSON-RPC over the ndJSON stream. Both sides can initiate requests:

**Client-to-Agent calls** (outbound, via `connection.*`):
- `connection.initialize()` -- Protocol handshake
- `connection.newSession()` -- Create session
- `connection.prompt()` -- Send user prompt
- `connection.cancel()` -- Cancel current operation

**Agent-to-Client calls** (inbound, via `FlitterClient` methods):
- `sessionUpdate()` -- Streaming updates (text chunks, tool calls, plan, usage)
- `requestPermission()` -- Permission dialogs
- `readTextFile()` -- File reads on behalf of the agent
- `writeTextFile()` -- File writes on behalf of the agent
- `createTerminal()` -- Spawn terminal commands
- `terminalOutput()` -- Read terminal output buffer
- `waitForTerminalExit()` -- Block until command completes
- `killTerminal()` -- Kill running terminal
- `releaseTerminal()` -- Clean up terminal resources

---

## 3. Message Submission Flow

### 3.1 User Input to Agent Processing

The full path from user keystroke to agent response is:

```
InputArea (keypress) -> BottomGrid.onSubmit -> App.onSubmit -> handleSubmit (index.ts)
  -> appState.startProcessing(text)
  -> sendPrompt(connection, sessionId, text)
    -> connection.prompt({ sessionId, prompt: [{ type: 'text', text }] })
  -> [AWAIT: agent processes, sends sessionUpdate events back]
  -> appState.onPromptComplete(sessionId, stopReason)
```

### 3.2 The handleSubmit Function

Defined as a closure in `main()`, it captures the `handle` and `appState` from the enclosing scope:

```typescript
const handleSubmit = async (text: string): Promise<void> => {
  if (!handle.sessionId) return;     // guard: no session
  appState.startProcessing(text);     // add user message, set isProcessing=true
  try {
    const result = await sendPrompt(handle.connection, handle.sessionId, text);
    appState.onPromptComplete(handle.sessionId, result.stopReason);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    appState.handleError(message);
  }
};
```

Critical behavior:
- `startProcessing()` immediately adds the user message to the conversation items and sets `isProcessing = true`, then notifies listeners to trigger a TUI rebuild. This gives instant visual feedback.
- `sendPrompt()` is a **blocking await**. While it waits, the agent sends `sessionUpdate` events back through the `FlitterClient.sessionUpdate()` method, which calls `appState.onSessionUpdate()`, which updates conversation state and notifies listeners. This means the TUI updates in real time during the await.
- Only after the `PromptResponse` resolves does `onPromptComplete()` finalize any streaming message and clear `isProcessing`.

### 3.3 The sendPrompt Function

In `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/connection.ts`:

```typescript
export async function sendPrompt(
  connection: acp.ClientSideConnection,
  sessionId: string,
  text: string,
): Promise<{ stopReason: string }> {
  const response = await connection.prompt({
    sessionId,
    prompt: [{ type: 'text', text }],
  });
  return { stopReason: (response as any).stopReason ?? 'end_turn' };
}
```

The prompt payload wraps text in an array of content blocks (`[{ type: 'text', text }]`), matching the ACP content part format. The `stopReason` is extracted from the response with a fallback of `'end_turn'` and a forced `as any` cast, suggesting the SDK types may not expose `stopReason` directly.

### 3.4 Cancellation Flow

```typescript
const handleCancel = async (): Promise<void> => {
  if (!handle.sessionId || !appState.isProcessing) {
    cleanup();         // Not processing -> exit the application
    process.exit(0);
  }
  try {
    await cancelPrompt(handle.connection, handle.sessionId);
  } catch (err) {
    log.error('Cancel failed:', err);
  }
};
```

The cancel handler has dual behavior:
- If the agent is currently processing, it sends a `cancel` notification to the agent.
- If the agent is idle, Ctrl+C exits the application entirely.

Notably, the cancel handler does **not** call `appState.handleError()` or `onPromptComplete()` after cancellation. The agent is expected to complete the in-flight `prompt()` call with a stop reason that indicates cancellation, which would then flow through the normal completion path.

---

## 4. Session Update Event Processing

### 4.1 Event Dispatch

The `AppState.onSessionUpdate()` method in `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts` acts as the central dispatcher for all streaming events from the agent. It switches on the `sessionUpdate` field:

| Event Type | Handler |
|---|---|
| `agent_message_chunk` | Appends text to the current streaming assistant message |
| `agent_thought_chunk` | Appends text to the current thinking/reasoning block |
| `tool_call` | Adds a new tool call item to the conversation |
| `tool_call_update` | Updates an existing tool call's status and result |
| `plan` | Sets or updates the plan entries |
| `usage_update` | Updates token usage and cost information |
| `current_mode_update` | Updates the current agent mode (e.g., "smart", "code") |
| `session_info_update` | Acknowledged but no-op (empty handler) |

Every case ends with `this.notifyListeners()`, which triggers TUI rebuilds.

### 4.2 Streaming Message Assembly

The `ConversationState` in `/home/gem/workspace/flitter/packages/flitter-amp/src/state/conversation.ts` uses a private `_streamingMessage` pointer to track the currently-being-built assistant message:

1. When the first `agent_message_chunk` arrives, `appendAssistantChunk()` creates a new `AssistantMessage` with `isStreaming: true`, pushes it into the items array, and stores it as `_streamingMessage`.
2. Subsequent chunks append to `_streamingMessage.text` directly (mutating the object in-place within the items array).
3. When a `tool_call` event arrives, `addToolCall()` calls `finalizeAssistantMessage()` first, which sets `isStreaming = false` and clears the pointer. This ensures tool calls appear as separate conversation items rather than being interleaved with text.
4. When the prompt completes, `onPromptComplete()` calls both `finalizeAssistantMessage()` and `finalizeThinking()` as a safety net.

The same pattern applies to thinking/reasoning blocks via `_streamingThinking`.

### 4.3 Tool Call Lifecycle

Tool calls follow a two-phase pattern:

1. **`tool_call`** event: Creates the item with `toolCallId`, `title`, `kind`, initial `status`, optional `locations` and `rawInput`. The item starts collapsed (or expanded if the global toggle `toolCallsExpanded` is set).
2. **`tool_call_update`** event: Finds the item by `toolCallId` and updates its `status` to `'completed'` or `'failed'`, and attaches the `result` object containing `content` and `rawOutput`.

The lookup is a linear scan (`this.items.find(...)`) of the entire conversation items array. For conversations with many items, this is O(n) per tool call update.

### 4.4 TUI Update Throttling

The `AppStateWidget` in `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` throttles state listener callbacks to 50ms intervals during streaming:

```typescript
this.stateListener = () => {
  const now = Date.now();
  const elapsed = now - this._lastUpdate;
  if (elapsed >= 50) {
    this._flushUpdate();
  } else if (!this._pendingTimer) {
    this._pendingTimer = setTimeout(() => {
      this._flushUpdate();
    }, 50 - elapsed);
  }
};
```

This means during rapid streaming (many `agent_message_chunk` events), the TUI rebuilds at most ~20 times per second. The `_flushUpdate` method also manages auto-scrolling: if the user was already at the bottom before the update, follow mode is enabled to keep the latest content visible.

---

## 5. Error Handling and Recovery

### 5.1 Connection Failure at Startup

If `connectToAgent()` throws (e.g., agent binary not found, initialization handshake fails, session creation fails), `main()` catches the error and exits immediately with a user-friendly error message:

```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`\nError: Failed to connect to agent "${config.agentCommand}"\n`);
  process.stderr.write(`  ${message}\n\n`);
  process.stderr.write('Make sure the agent is installed and supports the ACP protocol.\n');
  process.exit(1);
}
```

This is a hard failure with no retry.

### 5.2 Prompt-Level Errors

If `sendPrompt()` throws during a conversation (e.g., the agent returns an error, the connection drops mid-prompt), `handleSubmit` catches it and calls `appState.handleError()`:

```typescript
handleError(message: string): void {
  this.conversation.finalizeAssistantMessage();
  this.conversation.finalizeThinking();
  this.conversation.isProcessing = false;
  this.error = message;
  this.notifyListeners();
}
```

This performs three recovery actions:
1. Finalizes any in-progress streaming messages (prevents dangling `isStreaming: true` states).
2. Clears the `isProcessing` flag so the input area becomes interactive again.
3. Sets the `error` property, which the `ChatView` can display.

The user can then type a new message. The error is displayed but does not terminate the application.

### 5.3 Missing Reconnection Logic

There is **no reconnection mechanism** anywhere in the codebase. If the agent process dies or the stdio pipe breaks:
- The `onConnectionClosed` callback sets `isConnected = false` and shows an error.
- But `handleSubmit` only checks `!handle.sessionId` (which remains set), not `!appState.isConnected`.
- Subsequent prompt attempts would likely throw when writing to a closed pipe, which would be caught by the error handler in `handleSubmit`.

This means the application degrades to a read-only state after agent disconnection -- the user can see the conversation history but cannot interact further without restarting.

---

## 6. Agent Crash Detection

### 6.1 Process Exit Monitoring (PROTO-04)

In `main()`, after a successful connection, the code registers a listener on the agent process's `exit` event:

```typescript
handle.agent.on('exit', (code: number | null, signal: string | null) => {
  if (appState.isConnected) {
    const reason = signal ? `killed by ${signal}` : `exited with code ${code}`;
    log.error(`Agent process ${reason}`);
    appState.onConnectionClosed(reason);
  }
});
```

The `if (appState.isConnected)` guard prevents duplicate error handling when the exit is expected (i.e., during cleanup, where `isConnected` may have already been set to false or the cleanup handler kills the process intentionally).

The comment references "PROTO-04", suggesting this is a tracked requirement for agent crash detection in the protocol specification.

### 6.2 Dual Exit Logging

The `spawnAgent` function in `process.ts` also registers its own `exit` and `error` event handlers:

```typescript
proc.on('error', (err) => {
  log.error(`Agent process error: ${err.message}`);
});

proc.on('exit', (code, signal) => {
  if (signal) {
    log.info(`Agent process killed by signal: ${signal}`);
  } else {
    log.info(`Agent process exited with code: ${code}`);
  }
});
```

This means agent exit events are logged twice: once at the low-level `process.ts` layer (informational) and once at the `main()` layer (which also updates application state). The two listeners serve different purposes -- logging versus state management.

### 6.3 Limitations

The crash detection relies on the Node.js `exit` event. This handles:
- Agent process crashes (segfault, uncaught exception, etc.)
- Agent being killed by an external signal
- Agent exiting normally

It does **not** handle:
- The agent hanging indefinitely (no heartbeat/watchdog mechanism)
- Broken pipe scenarios where the process is alive but stdio is corrupted

---

## 7. Connection Signal/Closed Monitoring

### 7.1 The ClientCallbacks.onConnectionClosed Path

The `onConnectionClosed` callback is defined in `ClientCallbacks` and implemented in `AppState`:

```typescript
onConnectionClosed(reason: string): void {
  this.handleError(`Agent disconnected: ${reason}`);
  this.isConnected = false;
  this.notifyListeners();
}
```

This is only invoked from the agent process exit handler in `main()`. The `ClientSideConnection` from the SDK may also call some form of close notification, but the current code does not wire that up beyond what the `FlitterClient` class provides.

### 7.2 Process Signal Handling

The application registers handlers for `SIGINT` and `SIGTERM`:

```typescript
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
```

Both invoke the same cleanup function. Additionally, Ctrl+C in the TUI is intercepted at the widget level (key event handler in `AppStateWidget`) and routed through `handleCancel`:
- If processing, send ACP cancel.
- If idle, call `cleanup()` and `process.exit(0)`.

This means there are two Ctrl+C paths: the FocusScope key handler (when the TUI has focus) and the process-level SIGINT handler (fallback).

### 7.3 Terminal Process Lifecycle

The `FlitterClient` maintains a `Map<string, ChildProcess>` for terminal subprocesses spawned on behalf of the agent. The cleanup is thorough:

- `killTerminal()` sends SIGTERM to a specific terminal.
- `releaseTerminal()` sends SIGTERM and removes from both the process map and the buffer map.
- `cleanup()` iterates all terminals and sends SIGTERM to any that are still alive, then clears both maps.

The terminal output buffering system in `createTerminal()` is noteworthy. It starts collecting output immediately into a persistent buffer, respecting an optional `outputByteLimit`. The `terminalOutput()` method reads from this buffer without registering new listeners, avoiding the race condition of attaching listeners after output has already been emitted.

---

## 8. Code Patterns and Observations

### 8.1 Dual State Hierarchy (SessionState vs ConversationState)

The codebase contains two session state implementations:

1. **`SessionState`** (`/home/gem/workspace/flitter/packages/flitter-amp/src/acp/session.ts`) -- A standalone class with `id`, `cwd`, items, plan, usage, and streaming state. It has no listener/notification mechanism.
2. **`ConversationState`** (`/home/gem/workspace/flitter/packages/flitter-amp/src/state/conversation.ts`) -- A richer version with additional features: `ThinkingItem` support, `toolCallsExpanded` toggle, `rawOutput` on tool call updates, `clear()` method, and `toggleToolCalls()`.

`SessionState` appears to be an earlier implementation that was superseded by `ConversationState`. The `AppState` class composes a `ConversationState` (not `SessionState`), and all runtime code paths go through `ConversationState`. `SessionState` is not referenced anywhere in the active code paths.

### 8.2 Observer Pattern for TUI Updates

The `AppState` implements a manual observer pattern with `addListener`/`removeListener`/`notifyListeners`. Every state mutation calls `notifyListeners()`, which fans out to all registered listeners. The `AppStateWidget` uses this to trigger `setState(() => {})` (an empty setState, relying on the fact that the next `build()` will read the mutated `appState` properties directly).

This is a "push notification, pull data" pattern: listeners are notified that something changed, then they pull the current state during rebuild.

### 8.3 Mutable In-Place Updates

The conversation state uses mutable objects throughout. `AssistantMessage` and `ThinkingItem` objects are mutated in place (their `text` field is concatenated, `isStreaming` is flipped). Tool call items are found by linear search and mutated directly. Plan entries are replaced on the containing object.

This is efficient (no allocation overhead) but means there is no immutability-based change detection. The TUI rebuilds on every notification regardless of whether the specific widget's data actually changed.

### 8.4 Type Safety Gaps

Several `as any` and `as unknown` casts appear in critical paths:

- `connection.ts` line 39-40: `Readable.toWeb(agent.stdout as any)` -- Stream type mismatch
- `connection.ts` line 47: `client as unknown as acp.Client` -- FlitterClient does not fully implement the SDK's `Client` type
- `connection.ts` line 96: `(response as any).stopReason` -- SDK types don't expose `stopReason`
- `app-state.ts` lines 75-100: Extensive `as string`, `as Array<...>` casts on `SessionUpdate` fields

These indicate that the `@agentclientprotocol/sdk` types are either incomplete or that `FlitterClient` implements a subset of the full `Client` interface.

### 8.5 Permission Request as Promise Suspension

The permission flow uses a clever pattern where `onPermissionRequest` returns a `Promise<string | null>` that is held open until the user interacts with the TUI dialog:

```typescript
async onPermissionRequest(request: PermissionRequest): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    this.pendingPermission = { resolve, request };
    this.notifyListeners();
  });
}
```

The `resolve` function is stored in `pendingPermission` and later called by `resolvePermission()` when the user selects an option or cancels. This effectively suspends the agent's RPC call until the user responds, which is exactly the correct semantic for a blocking permission dialog.

### 8.6 No Connection Health Monitoring

There is no heartbeat, ping, or keepalive mechanism. The connection is assumed healthy as long as the agent process is alive. This means:
- A hung agent (alive but not responding) cannot be detected.
- A broken pipe (e.g., from a buffer overflow) would only be detected on the next write attempt.
- There is no timeout on the `sendPrompt` call itself -- it will await indefinitely.

### 8.7 Single-Session Architecture

The entire architecture assumes one session per application instance. The `sessionId` is captured in a closure in `handleSubmit` and never changes. There is no session switching, session persistence, or multi-session support. The `LoadSessionRequest` type is exported but unused. This is appropriate for a CLI TUI tool where each invocation is a fresh session.

### 8.8 Graceful Degradation Order

When things go wrong, the system degrades in this order:

1. **Prompt error**: User sees an error message, can retry with a new prompt.
2. **Agent crash**: `onConnectionClosed` fires, `isConnected` set to false, error displayed. Application remains running but further prompts will fail.
3. **Startup failure**: Application exits immediately with a diagnostic message.
4. **Fatal error in main()**: Caught by the top-level `.catch()`, writes to stderr and exits.

This provides reasonable user experience for transient prompt errors while failing fast for unrecoverable situations.

### 8.9 Terminal Buffer Byte Limit Implementation

The terminal output buffer in `FlitterClient.createTerminal()` implements a byte-limited buffer with a subtle character/byte mismatch issue. When the buffer is about to exceed the limit, it slices the text string by byte count (`text.slice(0, remaining)`), but `String.slice` operates on characters, not bytes. For multi-byte UTF-8 content, this could truncate in the middle of a character. The `byteCount` tracking uses `chunk.byteLength` (correct for bytes) but the truncation uses `text.slice` (character-based). In practice, most terminal output is ASCII, so this rarely matters.

---

## Summary

The flitter-amp ACP client implements a clean, linear session lifecycle with no reconnection support. The architecture centers on a subprocess spawned at startup, communicating over ndJSON-encoded stdio pipes using the ACP bidirectional RPC protocol. State management uses a push-notification/pull-data observer pattern that bridges ACP events to TUI widget rebuilds with 50ms throttling. Error handling is layered (prompt-level catch, process exit monitoring, startup failure) but lacks proactive health monitoring such as heartbeats or timeouts. The codebase shows signs of iterative development, with a vestigial `SessionState` class superseded by the more capable `ConversationState`, and several type safety gaps where the SDK interface does not perfectly align with runtime behavior.
