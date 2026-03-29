# flitter-amp Startup Sequence Analysis

Complete trace from `bun run` to first frame rendered, covering the entry point,
initialization pipeline, ACP connection, widget tree bootstrap, frame rendering,
event loop, shutdown, and error handling.

---

## 1. Entry Point File and How the Process Starts

The entry point is `/home/gem/workspace/flitter/packages/flitter-amp/src/index.ts`.

The `package.json` declares it in two places:

```json
{
  "main": "src/index.ts",
  "bin": {
    "flitter-amp": "src/index.ts"
  },
  "scripts": {
    "start": "bun run src/index.ts"
  }
}
```

The file begins with a shebang line:

```ts
#!/usr/bin/env bun
```

This means the file can be executed directly as a script when installed via
`bun link` or via `bun run start`. Bun acts as both the runtime and the
TypeScript compiler -- no separate build step is needed.

Execution begins in the `main()` async function defined at line 12, which is
invoked at the bottom of the module:

```ts
main().catch((err) => {
  process.stderr.write(`\nFatal error: ${err.message}\n`);
  process.exit(1);
});
```

This is a standard top-level async wrapper pattern. The `.catch()` at module
scope serves as the outermost error boundary for the entire application.

---

## 2. CLI Argument Parsing

Argument parsing happens as the very first operation inside `main()`:

```ts
const config = parseArgs(process.argv);
```

The `parseArgs` function is defined in
`/home/gem/workspace/flitter/packages/flitter-amp/src/state/config.ts`.

### Config File Loading

Before processing CLI flags, `parseArgs` calls `loadUserConfig()` which
attempts to read `~/.flitter-amp/config.json`. This file has the shape:

```ts
interface UserConfig {
  agent?: string;
  editor?: string;
  cwd?: string;
  expandToolCalls?: boolean;
  historySize?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

If the file does not exist or is unparseable, an empty object is returned and
defaults are used. The config file values serve as the baseline; CLI flags
override them.

### CLI Flag Processing

`parseArgs` strips the first two elements of `process.argv` (the bun binary
path and the script path), then iterates over the remaining arguments:

| Flag | Purpose | Default |
|------|---------|---------|
| `--agent <cmd>` | Agent command string (split on whitespace) | `"claude --agent"` |
| `--cwd <dir>` | Working directory for the session | `process.cwd()` |
| `--expand` | Expand tool call details by default | `false` |
| `--debug` | Set log level to debug | `'info'` |
| `--help` / `-h` | Print help and exit | -- |

The agent command string is split on whitespace using `raw.split(/\s+/)`, where
the first token becomes `agentCommand` and the rest become `agentArgs`. This
allows compound commands like `--agent "gemini --experimental-acp"`.

Unknown flags starting with `--` cause an error and immediate exit. The `editor`
field falls through to `$EDITOR`, then `$VISUAL`, then `'vi'`.

The return type is `AppConfig`:

```ts
interface AppConfig {
  agentCommand: string;
  agentArgs: string[];
  cwd: string;
  expandToolCalls: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  editor: string;
  historySize: number;
}
```

---

## 3. Configuration Loading Sequence

The full initialization sequence that happens before any network or TUI
activity, in strict order:

1. **`parseArgs(process.argv)`** -- reads config file + CLI flags, produces `AppConfig`
2. **`setLogLevel(config.logLevel)`** -- sets the module-level log threshold
3. **`initLogFile()`** -- opens `~/.flitter/logs/amp-YYYY-MM-DD.log` for append
4. **`new AppState()`** -- creates the global application state store
5. **`appState.cwd = config.cwd`** -- injects the working directory
6. **Git branch detection** -- runs `git rev-parse --abbrev-ref HEAD` synchronously
   via `Bun.spawnSync` to populate `appState.gitBranch`

The logger (`/home/gem/workspace/flitter/packages/flitter-amp/src/utils/logger.ts`)
writes timestamped lines in `[HH:mm:ss.SSS] [LEVEL] message` format. When the
log file stream is open, output goes there; otherwise it falls back to stderr.
This is critical because once the TUI takes over stdout, logging to stderr would
corrupt the terminal display, so file-based logging must be initialized first.

---

## 4. ACP Connection Establishment

After configuration and state setup, the ACP connection is established. This is
the most complex phase before the TUI starts.

### 4.1 Spawning the Agent Subprocess

The `connectToAgent` function in
`/home/gem/workspace/flitter/packages/flitter-amp/src/acp/connection.ts`
calls `spawnAgent(command, args, cwd)` from
`/home/gem/workspace/flitter/packages/flitter-amp/src/utils/process.ts`.

`spawnAgent` uses Node's `child_process.spawn` with:
- `stdio: ['pipe', 'pipe', 'pipe']` -- all three standard streams piped
- `cwd` set to the configured working directory
- `env` inherited from `process.env`

The agent's stderr is immediately wired to the debug logger to capture any
diagnostic output from the agent process without corrupting the TUI.

The returned `AgentProcess` includes a `kill()` method that sends SIGTERM with
a 3-second SIGKILL escalation timeout, ensuring the child process does not
outlive the parent.

### 4.2 ACP Protocol Handshake

The connection uses the `@agentclientprotocol/sdk` library. The flow is:

1. **Create ndJSON stream** -- `acp.ndJsonStream(output, input)` wraps the
   subprocess stdin (writable) and stdout (readable) into a bidirectional
   newline-delimited JSON transport using Node's Web Streams API:
   ```ts
   const input = Readable.toWeb(agent.stdout) as ReadableStream<Uint8Array>;
   const output = Writable.toWeb(agent.stdin) as WritableStream<Uint8Array>;
   const stream = acp.ndJsonStream(output, input);
   ```

2. **Create client and connection** -- A `FlitterClient` instance is created with
   the `AppState` as its callbacks implementation. The `ClientSideConnection` is
   created with a factory function that returns the client:
   ```ts
   const connection = new acp.ClientSideConnection(
     (_agentProxy) => client as unknown as acp.Client,
     stream,
   );
   ```

3. **Initialize (protocol negotiation)** -- The `connection.initialize()` call
   sends the ACP `initialize` request, advertising:
   - `protocolVersion: acp.PROTOCOL_VERSION`
   - `clientInfo: { name: 'flitter-amp', version: '0.1.0' }`
   - `clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: true }`

   The response contains `agentInfo` (name, title) and `agentCapabilities`.

4. **Create session** -- `connection.newSession({ cwd, mcpServers: [] })` creates
   a new agent session scoped to the working directory. The response contains
   a `sessionId` that is used for all subsequent prompt/cancel operations.

### 4.3 Post-Connection State Update

After successful connection, `main()` calls:
```ts
appState.setConnected(handle.sessionId, handle.agentInfo?.name ?? null);
```

This sets `isConnected = true`, records the session ID and agent name, and
notifies all state listeners (though none are registered yet at this point).

### 4.4 Agent Process Monitoring

An `exit` handler is registered on the agent process to detect unexpected
termination:
```ts
handle.agent.on('exit', (code, signal) => {
  if (appState.isConnected) {
    appState.onConnectionClosed(reason);
  }
});
```

This triggers error state in the UI if the agent dies while still connected
(annotated as PROTO-04 in the source).

---

## 5. Widget Tree Initialization (runApp)

After the ACP connection is established, two closures are created:

- **`handleSubmit`** -- sends user text to the agent via `sendPrompt()`, managing
  the `appState.startProcessing()` / `appState.onPromptComplete()` lifecycle
- **`handleCancel`** -- either cancels the current prompt if processing, or exits
  the application entirely if idle

Then the TUI is started:
```ts
await startTUI(appState, handleSubmit, handleCancel);
```

### 5.1 The startTUI Function

Defined in `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` at line 361:

```ts
export async function startTUI(
  appState: AppState,
  onSubmit: (text: string) => void,
  onCancel: () => void,
): Promise<WidgetsBinding> {
  const app = new App({ appState, onSubmit, onCancel });
  return runApp(app, {
    output: process.stdout,
    terminal: true,
    errorLogger: log.error,
  });
}
```

This creates the root `App` widget (a `StatefulWidget`) and delegates to
`runApp` from flitter-core.

### 5.2 The runApp Function (flitter-core)

`runApp` in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`
is a thin wrapper:

```ts
export async function runApp(widget: Widget, options?: RunAppOptions): Promise<WidgetsBinding> {
  const binding = WidgetsBinding.instance;
  await binding.runApp(widget, options);
  return binding;
}
```

`WidgetsBinding` is a singleton. Its constructor:
1. Creates `BuildOwner` and `PipelineOwner`
2. Creates a `TerminalManager` with a `MockPlatform` (safe default for tests)
3. Wires `MouseManager` and `FocusManager` singletons
4. Calls `initSchedulers()` to register global build/paint scheduler bridges
5. Registers 6 named frame callbacks with `FrameScheduler.instance`:
   - `frame-start` (build phase, priority -2000) -- `beginFrame()`
   - `resize` (build phase, priority -1000) -- `processResizeIfPending()`
   - `build` (build phase, priority 0) -- `buildScopes()` + `updateRootRenderObject()`
   - `layout` (layout phase, priority 0) -- `updateRootConstraints()` + `flushLayout()`
   - `paint-phase` (paint phase, priority 0) -- `paint()`
   - `render-phase` (render phase, priority 0) -- `render()` + hover reestablish

### 5.3 WidgetsBinding.runApp() Instance Method

This is where the real initialization happens:

1. **Set output writer** -- `this.setOutput(process.stdout)` so ANSI output
   reaches the user's terminal
2. **Set error logger** -- routes frame errors to the file logger
3. **Query terminal size** -- creates `BunPlatform` and calls `getTerminalSize()`
4. **Wrap widget in MediaQuery** -- `MediaQuery({ data: MediaQueryData.fromTerminal(cols, rows), child: widget })`
5. **`attachRootWidget(wrappedWidget)`** -- this is the critical tree mount:
   - Wraps in `_RootWidget` (an internal `StatelessWidget`)
   - Creates the root element via `createElement()`
   - Calls `mount()` on the root element, which recursively builds the
     widget tree, creating the element tree and render tree
   - Sets initial box constraints: `BoxConstraints.tight(Size(cols, rows))`
   - Wires root render object to `PipelineOwner` and `MouseManager`
   - Sets `_isRunning = true`
6. **Terminal initialization** -- replaces the mock TerminalManager with a real one:
   - Creates `new TerminalManager(platform)` backed by `BunPlatform`
   - Calls `initialize()` on it, which:
     - Enables raw mode on stdin
     - Enters the alternate screen buffer
     - Hides the cursor
     - Enables mouse tracking
     - Enables bracketed paste mode
   - Calls `setupEventHandlers()` to wire the input pipeline:
     - Creates `InputParser` that dispatches to `EventDispatcher`
     - Wires `TerminalManager.onInput` to feed raw bytes into the parser
     - Registers Ctrl+C interceptor as safety net
     - Wires mouse events to `MouseManager`
7. **Register process signal handlers** -- `exit`, `SIGINT`, `SIGTERM` all call
   `TerminalManager.dispose()` to restore the terminal
8. **Register SIGWINCH handler** -- on terminal resize, calls `handleResize()`
   and re-mounts the widget tree with updated `MediaQuery` data
9. **Schedule first frame** -- `requestForcedPaintFrame()` + `requestFrame()`

---

## 6. First Frame Rendering

After `runApp` schedules the first frame via `requestFrame()`, the
`FrameScheduler` triggers execution. In production mode, frame pacing is enabled
(60fps / ~16.67ms budget), but since this is the first frame (`_lastFrameTimestamp === 0`),
it executes immediately via `setImmediate`.

The first frame executes the full 4-phase pipeline:

### Phase 1: BUILD
- **`beginFrame()`** -- Sets `_shouldPaintCurrentFrame = true` because
  `_forcePaintOnNextFrame` was set by `requestForcedPaintFrame()`
- **`processResizeIfPending()`** -- No-op on first frame
- **`buildScopes()`** -- The `BuildOwner` processes all dirty elements. At this
  point the root element and its entire subtree are dirty from `mount()`.
  This builds the full widget tree:
  - `MediaQuery` -> `_RootWidget` -> `AmpThemeProvider` -> `FocusScope` ->
    `Column` -> [`Expanded(Center/Row)`, `BottomGrid`, `StatusBar`]
- **`updateRootRenderObject()`** -- DFS walk to find the first render object
  and register it with `PipelineOwner`

### Phase 2: LAYOUT
- **`updateRootConstraints()`** -- Sets `BoxConstraints.tight(cols, rows)` on
  the root render object
- **`flushLayout()`** -- Layout pass: walks the dirty render nodes and performs
  constraint-based layout. Each render box receives constraints, computes its
  own size, and positions its children. Returns true if any layout changed.

### Phase 3: PAINT
- **`paint()`** -- Only runs because `_shouldPaintCurrentFrame` is true.
  - Calls `pipelineOwner.flushPaint()` to mark paint as clean
  - Clears the `ScreenBuffer`
  - Calls `paintRenderTree(rootRO, screen)` which walks the render tree and
    writes characters, colors, and styles into the screen buffer cells

### Phase 4: RENDER
- **`render()`** -- Only runs because `_didPaintCurrentFrame` was set by paint.
  - `screen.getDiff()` -- computes the cell-by-cell diff between the current
    and previous screen buffer (on first frame, every cell is "dirty")
  - `renderer.render(patches, cursor)` -- generates ANSI escape sequences for
    the dirty patches (cursor positioning, color sequences, text output)
  - `this._output.write(output)` -- writes the ANSI string to `process.stdout`
  - `screen.present()` -- swaps the double buffers so the next frame can diff
    against the current state

After all four phases, post-frame callbacks run (if any), and
`mouseManager.reestablishHoverState()` is called.

At this point, the user sees the initial TUI: the welcome screen (empty chat),
the input area, and the status bar showing the cwd, git branch, and agent name.

---

## 7. The Main Event Loop

flitter-amp does not use a continuous rendering loop. The architecture is
entirely **event-driven and on-demand**, matching the original Amp CLI's
approach (FrameScheduler class `c9`).

### Frame Scheduling

`FrameScheduler.requestFrame()` is the sole entry point for scheduling frames.
It is called from:
- `BuildOwner.scheduleBuildFor()` -- when a widget calls `setState()`
- `PipelineOwner.requestLayout()` / `requestPaint()` -- when layout/paint dirty
- `WidgetsBinding.handleResize()` -- on SIGWINCH
- `WidgetsBinding.requestForcedPaintFrame()` -- explicit full repaint request

Frame coalescing: multiple `requestFrame()` calls between frames are collapsed
into a single frame execution. If a frame is already scheduled or in progress,
the request is deferred.

Frame pacing: in production, frames are paced to ~60fps. If less than 16.67ms
has passed since the last frame, execution is delayed via `setTimeout`.

### Input Pipeline

Raw bytes from stdin flow through:
1. `TerminalManager.onInput(data: Buffer)` -- callback invoked by BunPlatform
2. `InputParser.feed(data)` -- parses ANSI escape sequences into structured events
3. `EventDispatcher.dispatch(event)` -- routes events:
   - Key interceptors checked first (Ctrl+C safety net)
   - Key events dispatched to `FocusManager` -> focused widget's `onKey` handler
   - Mouse events dispatched to `MouseManager` -> hit-tested widgets

When the App's `FocusScope.onKey` handler processes a key event (e.g., Ctrl+L
to clear, Ctrl+O for command palette), it calls `setState()` on the
`AppStateWidget`, which marks the element dirty and triggers a new frame.

### ACP Event Flow

When the agent sends session updates (streaming text, tool calls, etc.):
1. `ClientSideConnection` receives the JSON-RPC message
2. Calls `FlitterClient.sessionUpdate()` which delegates to
   `AppState.onSessionUpdate()`
3. `AppState` updates `ConversationState` (appends text chunks, adds tool calls,
   updates plans/usage)
4. `AppState.notifyListeners()` fires all registered listeners
5. `AppStateWidget`'s listener (registered in `initState()`) runs with a
   50ms throttle to avoid excessive rebuilds during fast streaming
6. The throttled callback calls `setState(() => {})` which triggers a frame

### The 50ms Streaming Throttle

The `AppStateWidget` implements a streaming-aware throttle:

```ts
this.stateListener = () => {
  const elapsed = Date.now() - this._lastUpdate;
  if (elapsed >= 50) {
    this._flushUpdate();
  } else if (!this._pendingTimer) {
    this._pendingTimer = setTimeout(() => {
      this._flushUpdate();
    }, 50 - elapsed);
  }
};
```

This ensures the TUI repaints at most every 50ms during streaming, preventing
excessive frame execution while keeping the display responsive. The
`_flushUpdate()` method also checks if the scroll was at the bottom before
the update and re-enables follow mode if the user was following the stream.

---

## 8. Graceful Shutdown / Cleanup

There are multiple shutdown paths, all converging on the same cleanup logic:

### Signal Handlers (index.ts)

```ts
const cleanup = () => {
  handle.client.cleanup();  // Kill all spawned terminal subprocesses
  handle.agent.kill();       // SIGTERM the agent (SIGKILL after 3s)
  closeLogFile();            // Flush and close the log file stream
};
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
```

### Signal Handlers (binding.ts)

WidgetsBinding registers its own handlers in `runApp()`:

```ts
process.on('exit', cleanup);      // Terminal restore on any exit
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
```

The terminal cleanup (`TerminalManager.dispose()`) restores:
- Normal (cooked) mode on stdin
- Main screen buffer (exit alt screen)
- Cursor visibility
- Mouse tracking disabled
- Bracketed paste disabled

### Ctrl+C Double Duty

The Ctrl+C handler has dual behavior mediated by `handleCancel`:
- If the agent is **processing**, it calls `cancelPrompt()` via ACP to
  interrupt the current operation
- If the agent is **idle**, it calls `cleanup()` and `process.exit(0)`

### FlitterClient.cleanup()

The `FlitterClient` maintains a `Map<string, ChildProcess>` of terminal
processes spawned on behalf of the agent. On cleanup, it sends SIGTERM to all
of them and clears the maps:

```ts
cleanup(): void {
  for (const [_id, proc] of this.terminals) {
    if (!proc.killed) proc.kill('SIGTERM');
  }
  this.terminals.clear();
  this.terminalBuffers.clear();
}
```

### WidgetsBinding.cleanup()

The full `cleanup()` method on WidgetsBinding (callable via `stop()` or
directly) performs:
1. Set `_isRunning = false`
2. Unmount root element (recursively disposes the entire widget/element tree)
3. Dispose `BuildOwner` and `PipelineOwner`
4. Dispose `FocusManager` and `MouseManager`
5. Dispose `InputParser` (removes stdin listener)
6. Remove all 6 frame callbacks from `FrameScheduler`
7. Dispose `TerminalManager` (restore terminal state)

---

## 9. Error Handling at the Top Level

### Module-Level Catch

The outermost error boundary is the `.catch()` on the `main()` promise:

```ts
main().catch((err) => {
  process.stderr.write(`\nFatal error: ${err.message}\n`);
  process.exit(1);
});
```

This catches any unhandled rejection from the entire startup sequence.

### ACP Connection Failure

If `connectToAgent()` throws (agent not installed, protocol mismatch, etc.),
`main()` catches it specifically and writes a detailed error to stderr with
usage examples before exiting with code 1:

```ts
process.stderr.write('Make sure the agent is installed and supports the ACP protocol.\n');
process.stderr.write('Examples:\n');
process.stderr.write('  flitter-amp --agent "claude --agent"\n');
process.stderr.write('  flitter-amp --agent "gemini --experimental-acp"\n');
```

The log file is closed before exit in this path.

### Prompt-Level Errors

When `sendPrompt()` fails (after the TUI is running):

```ts
try {
  const result = await sendPrompt(handle.connection, handle.sessionId, text);
  appState.onPromptComplete(handle.sessionId, result.stopReason);
} catch (err) {
  appState.handleError(message);
}
```

`AppState.handleError()` finalizes any streaming messages, sets
`isProcessing = false`, stores the error message, and notifies listeners to
trigger a UI rebuild showing the error.

### Frame Execution Errors

The `FrameScheduler.executeFrame()` wraps the entire 4-phase pipeline in a
try/catch:

```ts
try {
  for (const phase of PHASE_ORDER) {
    this.executePhase(phase);
  }
  this.executePostFrameCallbacks();
} catch (error) {
  this._errorLogger('Frame execution error:', message);
}
```

Individual phase callbacks also have per-callback try/catch, so one failing
callback does not prevent others in the same phase from executing. Errors are
routed to the `errorLogger` which, in production, writes to the log file via
`log.error`.

### Agent Process Unexpected Exit

The exit handler on the agent process detects unexpected termination:

```ts
handle.agent.on('exit', (code, signal) => {
  if (appState.isConnected) {
    appState.onConnectionClosed(reason);
  }
});
```

This updates the UI to show the disconnection error.

---

## 10. Code Patterns and Observations

### Observer/Listener Pattern for State -> UI Bridging

`AppState` implements a simple observer pattern with `addListener()`/
`removeListener()`. The `AppStateWidget` registers a listener in `initState()`
and removes it in `dispose()`. This is the sole mechanism by which ACP events
(which arrive asynchronously on the JSON-RPC stream) cause the widget tree to
rebuild.

The pattern is lightweight but effective: there is no Redux-style store, no
signals library, and no event bus. The single `AppState` object serves as both
the state store and the `ClientCallbacks` implementation for the ACP client.

### Dual Role of AppState as ClientCallbacks

`AppState implements ClientCallbacks` -- it directly receives ACP events from
the `FlitterClient`. This eliminates an intermediate translation layer. The
`onSessionUpdate()` method contains a switch statement that parses the
`sessionUpdate` type string and delegates to `ConversationState` methods:

- `agent_message_chunk` -> `appendAssistantChunk()`
- `agent_thought_chunk` -> `appendThinkingChunk()`
- `tool_call` -> `addToolCall()`
- `tool_call_update` -> `updateToolCall()`
- `plan` -> `setPlan()`
- `usage_update` -> `setUsage()`
- `current_mode_update` -> updates `currentMode` field

Every branch ends with `notifyListeners()`.

### Streaming Throttle as a Performance Guard

The 50ms throttle in `AppStateWidget` is a practical optimization. During fast
streaming (the agent sending many text chunks per second), without throttling
each chunk would trigger a setState -> frame cycle. At 50ms minimum interval,
the TUI rebuilds at most 20 times per second during streaming, which combined
with the FrameScheduler's own 60fps pacing, ensures smooth rendering without
wasting CPU on invisible intermediate frames.

### Overlay Stack Pattern

The `App.build()` method uses a conditional `Stack` pattern for modal overlays:

```
base result = mainContent (FocusScope + Column)
if (permission pending) -> Stack([mainContent, Positioned(PermissionDialog)])
else if (command palette) -> Stack([mainContent, Positioned(CommandPalette)])
else if (file picker) -> Stack([mainContent, Positioned(FilePicker)])
```

Priority ordering is enforced by the if/else-if chain: permission dialogs
always take precedence over the command palette, which takes precedence over
the file picker.

### Theme Propagation via InheritedWidget

The root of the widget tree is wrapped in `AmpThemeProvider`, an
`InheritedWidget` that makes the `AmpTheme` available to all descendant widgets
via `AmpThemeProvider.of(context)`. The theme is created from the `darkTheme`
base, with derived app colors computed by `deriveAppColors()`. This matches
Flutter's `Theme.of(context)` pattern.

### Clean Separation of Concerns

The codebase exhibits clean separation:
- **`index.ts`** -- orchestration only (no widgets, no protocol details)
- **`acp/connection.ts`** -- protocol handshake and message sending
- **`acp/client.ts`** -- request handling (file I/O, terminal management)
- **`state/app-state.ts`** -- reactive state store + ACP event bridge
- **`state/conversation.ts`** -- conversation item management
- **`app.ts`** -- root widget tree definition + TUI bootstrap
- **`utils/`** -- logging, process management, editor integration

### No Persistent Connection Loop

There is no explicit connection maintenance loop. The ACP SDK's
`ClientSideConnection` handles the JSON-RPC message pump internally over the
ndJSON stream. flitter-amp relies on Node.js's event loop to keep the process
alive: the open stdio pipes to the agent subprocess, the stdin listener for
keyboard input, and any pending timers from the FrameScheduler all contribute
to keeping the process running. The process will naturally exit when all these
handles are closed or the signal handlers call `process.exit()`.

### Bun-Specific APIs

The codebase uses Bun-specific APIs in one place: `Bun.spawnSync` in `index.ts`
for the synchronous git branch detection. Everything else uses standard Node.js
APIs (`child_process.spawn`, `node:fs`, `node:stream`), making the codebase
largely runtime-portable despite the Bun shebang.

### ACP Client as a Full Capability Provider

The `FlitterClient` class is not just a thin event receiver. It implements a
comprehensive set of capabilities that the agent can call:

- **Filesystem**: `readTextFile`, `writeTextFile`
- **Terminal**: `createTerminal`, `terminalOutput`, `waitForTerminalExit`,
  `killTerminal`, `releaseTerminal`
- **Permission**: `requestPermission` (shows a TUI dialog and returns the
  user's choice)
- **Session**: `sessionUpdate` (receives streaming updates)

The terminal management is particularly notable: each `createTerminal` call
spawns a real child process with persistent output buffering, allowing the
agent to run commands and poll their output asynchronously. The output buffer
respects a configurable byte limit to prevent memory exhaustion.

---

## Summary: Complete Startup Timeline

| Step | Function | Location |
|------|----------|----------|
| 1 | Parse CLI args + load config | `config.ts:parseArgs()` |
| 2 | Set log level | `logger.ts:setLogLevel()` |
| 3 | Open log file | `logger.ts:initLogFile()` |
| 4 | Create AppState | `app-state.ts:new AppState()` |
| 5 | Detect git branch | `index.ts` (Bun.spawnSync) |
| 6 | Spawn agent subprocess | `process.ts:spawnAgent()` |
| 7 | Create ndJSON stream | `connection.ts` (acp.ndJsonStream) |
| 8 | Create FlitterClient + Connection | `connection.ts` |
| 9 | ACP initialize handshake | `connection.initialize()` |
| 10 | ACP create session | `connection.newSession()` |
| 11 | Update AppState with connection info | `appState.setConnected()` |
| 12 | Register agent exit monitor | `handle.agent.on('exit')` |
| 13 | Register SIGINT/SIGTERM handlers | `process.on(...)` |
| 14 | Create App widget | `app.ts:new App()` |
| 15 | Get WidgetsBinding singleton | `binding.ts:WidgetsBinding.instance` |
| 16 | Query terminal size via BunPlatform | `binding.ts:runApp()` |
| 17 | Wrap in MediaQuery | `binding.ts:runApp()` |
| 18 | Mount root element (build trees) | `binding.ts:attachRootWidget()` |
| 19 | Initialize terminal (raw/alt/mouse) | `terminal-manager.ts:initialize()` |
| 20 | Wire input pipeline | `binding.ts:setupEventHandlers()` |
| 21 | Register terminal cleanup handlers | `binding.ts:runApp()` |
| 22 | Register SIGWINCH resize handler | `binding.ts:runApp()` |
| 23 | Request forced paint + schedule frame | `binding.ts:runApp()` |
| 24 | Execute first frame (BUILD/LAYOUT/PAINT/RENDER) | `FrameScheduler.executeFrame()` |
| 25 | ANSI output written to stdout | `WidgetsBinding.render()` |
| 26 | **First frame visible to user** | -- |
