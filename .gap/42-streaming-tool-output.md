# Gap T04: Streaming Tool Output Support

## Problem Statement

Tool call results in flitter-amp are displayed only after the tool completes execution.
There is no mechanism for incremental or streaming output from long-running tools. When
a tool such as `Bash` runs a command that takes 30 seconds and produces output
continuously (e.g. `npm run build`, `pytest -v`, `git log`), the user sees only a spinner
on the tool header until the entire tool execution finishes. The result then appears all
at once in the `tool_call_update` handler.

This creates two user experience problems:

1. **No progress visibility** -- Users cannot tell whether a long-running tool is making
   progress, producing output, or stuck. The only indicator is the BrailleSpinner
   animation on the `ToolHeader`, which conveys "in progress" but not *what* progress.

2. **Delayed feedback loop** -- For interactive development workflows (running tests,
   builds, linters), users want to see output as it arrives so they can cancel early if
   something is clearly wrong. The current architecture requires waiting for full
   completion before any output is visible.

### Current Architecture

The data flow for tool calls is:

```
ACP Agent
  -- session/update { sessionUpdate: "tool_call", status: "in_progress" } -->
AppState.onSessionUpdate()
  -- conversation.addToolCall(id, title, kind, "in_progress") -->
ConversationState.items[] push ToolCallItem { status: "in_progress", result: undefined }
  -- notifyListeners() -->
ChatView renders ToolCallWidget with ToolHeader showing spinner

... time passes, tool executes ...

ACP Agent
  -- session/update { sessionUpdate: "tool_call_update", status: "completed", content, rawOutput } -->
AppState.onSessionUpdate()
  -- conversation.updateToolCall(id, "completed", content, rawOutput) -->
ToolCallItem.result = { status: "completed", content, rawOutput }
  -- notifyListeners() -->
ChatView renders ToolCallWidget with full output
```

The critical gap is between the `tool_call` event (status `in_progress`) and the
`tool_call_update` event (status `completed` or `failed`). During this interval,
`ToolCallItem.result` is `undefined`, so no output is displayed. Yet the underlying
terminal process (managed by `FlitterClient.createTerminal()`) is actively collecting
output into a `TerminalBuffer` -- this data simply never reaches the rendering layer
until completion.

### Evidence in Source Code

**`app-state.ts` lines 93-113** -- The two tool call handlers:

```typescript
case 'tool_call': {
  this.conversation.addToolCall(
    update.toolCallId as string,
    update.title as string,
    update.kind as string,
    update.status as 'pending' | 'in_progress' | 'completed' | 'failed',
    update.locations as Array<{ path: string }> | undefined,
    update.rawInput as Record<string, unknown> | undefined,
  );
  break;
}

case 'tool_call_update': {
  this.conversation.updateToolCall(
    update.toolCallId as string,
    update.status as 'completed' | 'failed',
    update.content as Array<{ type: string; content?: { type: string; text: string } }> | undefined,
    update.rawOutput as Record<string, unknown> | undefined,
  );
  break;
}
```

There is no intermediate event type between these two. The `tool_call` event creates the
item with no result, and `tool_call_update` populates the result with final status only.

**`conversation.ts` lines 98-111** -- The `updateToolCall` method:

```typescript
updateToolCall(
  toolCallId: string,
  status: 'completed' | 'failed',
  content?: Array<{ type: string; content?: { type: string; text: string } }>,
  rawOutput?: Record<string, unknown>,
): void {
  const item = this.items.find(
    (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
  );
  if (item) {
    item.status = status;
    item.result = { status, content, rawOutput };
  }
}
```

The method only accepts terminal statuses (`completed` | `failed`). It replaces the
entire result object atomically. There is no incremental append operation.

**`types.ts` lines 43-59** -- The type definitions:

```typescript
export interface ToolCallItem {
  type: 'tool_call';
  toolCallId: string;
  title: string;
  kind: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  locations?: Array<{ path: string }>;
  rawInput?: Record<string, unknown>;
  result?: ToolCallResult;
  collapsed: boolean;
}

export interface ToolCallResult {
  status: 'completed' | 'failed';
  content?: Array<{ type: string; content?: { type: string; text: string } }>;
  rawOutput?: Record<string, unknown>;
}
```

`ToolCallResult.status` is typed as `'completed' | 'failed'` -- there is no
`'streaming'` or `'in_progress'` variant. The `ToolCallItem` has a `status` field that
can be `'in_progress'`, but the `result` field is entirely absent during that phase.

**`client.ts` lines 109-161** -- The terminal buffer that already streams:

```typescript
async createTerminal(params: { ... }): Promise<{ terminalId: string }> {
  // ...
  const buffer: TerminalBuffer = { output: '', byteCount: 0, limit: ... };
  this.terminalBuffers.set(terminalId, buffer);

  const appendOutput = (chunk: Buffer) => {
    // ... output accumulates into buffer.output continuously ...
  };

  proc.stdout?.on('data', appendOutput);
  proc.stderr?.on('data', appendOutput);
  // ...
}
```

The terminal buffer receives output in real time. The `terminalOutput` method can return
the current buffer contents at any point. But this data channel is only polled by the ACP
agent (via `terminal/output` requests), never proactively pushed to the UI layer.

**`bash-tool.ts` lines 109-122** -- Output extraction only from final result:

```typescript
private extractOutput(): string {
  if (!this.toolCall.result) return '';  // <-- returns empty during in_progress
  if (this.toolCall.result.rawOutput) {
    // ... extract from final result only ...
  }
  return this.toolCall.result.content
    ?.map(c => ...)
    .join('\n') ?? '';
}
```

The `extractOutput()` method returns an empty string when `result` is undefined, which is
the case for the entire duration of tool execution.

**`bash-tool.ts` is a `StatelessWidget`** -- This is important for the solution design.
`BashTool` extends `StatelessWidget`, meaning it is rebuilt entirely whenever its parent
rebuilds due to state changes. It does not manage its own timer or animation state (that
responsibility belongs to `ToolHeader`, which is a `StatefulWidget` with a
`BrailleSpinner`). This means streaming output updates work naturally: each time
`notifyListeners()` fires, the `BashTool` widget tree is rebuilt, and `extractOutput()`
re-reads the latest data from the `ToolCallItem`. No additional state management is needed
inside the widget itself.

## Proposed Solution

The solution introduces a streaming output pipeline that operates in parallel with the
existing tool call lifecycle. It requires changes across four layers: types, state
management, event handling, and widget rendering.

### Design Principles

1. **Backward compatible** -- Existing `tool_call` and `tool_call_update` events continue
   to work unchanged. Streaming output is additive.

2. **Protocol-aware** -- The solution accounts for two streaming sources: (a) a new ACP
   session update event type `tool_call_output_chunk` that agents can emit, and (b) a
   client-side polling mechanism for terminal output that works with the existing
   `FlitterClient.terminalOutput()` method even if the agent does not emit chunk events.

3. **Bounded memory** -- Streaming output buffers are capped to prevent runaway memory
   usage from tools producing megabytes of output.

4. **Render-efficient** -- Streaming output updates are throttled to avoid overwhelming
   the TUI render loop with per-byte redraws.

5. **Widget-model compatible** -- `BashTool` is a `StatelessWidget` that reads output from
   the `ToolCallItem` data model. The streaming pipeline writes to the data model, and
   the existing `notifyListeners()` mechanism triggers widget rebuilds. No changes to the
   widget framework's rebuild lifecycle are needed.

### Layer 1: Type Extensions

#### 1a. Add streaming fields to `ToolCallItem`

Extend the `ToolCallItem` interface in `types.ts` to carry streaming output alongside
the existing `result` field:

```typescript
export interface ToolCallItem {
  type: 'tool_call';
  toolCallId: string;
  title: string;
  kind: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  locations?: Array<{ path: string }>;
  rawInput?: Record<string, unknown>;
  result?: ToolCallResult;
  collapsed: boolean;

  // --- Streaming output (NEW) ---
  /** Accumulated streaming output received while tool is in_progress */
  streamingOutput?: string;
  /** Whether streaming output is actively being received */
  isStreaming?: boolean;
  /** Associated terminal ID for client-side polling (Bash tools) */
  terminalId?: string;
}
```

The `streamingOutput` field accumulates text as it arrives. When the tool completes,
`result` is populated with the final output and `streamingOutput` can be cleared (or
retained for comparison). The `isStreaming` flag lets widgets distinguish between "has
some output and more may come" versus "has some output and is done".

The `terminalId` field links a tool call to a terminal buffer in the `FlitterClient`,
enabling client-side polling for tools that use the terminal subsystem.

#### 1b. Add streaming-aware result variant

Extend `ToolCallResult` to support an in-progress state:

```typescript
export interface ToolCallResult {
  status: 'completed' | 'failed' | 'streaming';
  content?: Array<{ type: string; content?: { type: string; text: string } }>;
  rawOutput?: Record<string, unknown>;
}
```

Adding `'streaming'` to the status union allows intermediate results to be stored in the
`result` field directly, unifying the rendering path. Widgets that check
`this.toolCall.result` will see partial output during execution rather than `undefined`.
This is a deliberate dual-path design: widgets can check either `isStreaming` +
`streamingOutput` (explicit streaming fields) or `result.status === 'streaming'` (unified
result field). The unified path is simpler for widgets; the explicit path is useful for
state management code that needs to distinguish streaming state from final state.

### Layer 2: State Management Extensions

#### 2a. Add `appendToolOutput` to `ConversationState`

Add a new method to `conversation.ts` that appends streaming output to an in-progress
tool call:

```typescript
/**
 * Appends streaming output to an in-progress tool call.
 * Creates or extends the streamingOutput buffer on the ToolCallItem.
 * Also sets a streaming ToolCallResult so widgets can render partial output.
 *
 * On the first chunk received for a tool call, this method also auto-expands
 * the tool card (sets collapsed = false) so the user can see live output.
 *
 * @param toolCallId - The tool call to append output to
 * @param chunk - The text chunk to append
 * @param maxBuffer - Maximum buffer size in characters (default 50000)
 */
appendToolOutput(
  toolCallId: string,
  chunk: string,
  maxBuffer: number = 50_000,
): void {
  const item = this.items.find(
    (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
  );
  if (!item || item.status === 'completed' || item.status === 'failed') return;

  // Initialize streaming state and auto-expand on first chunk
  if (item.streamingOutput === undefined) {
    item.streamingOutput = '';
    item.isStreaming = true;
    item.collapsed = false;  // Auto-expand so user sees live output
  }

  // Append with buffer limit enforcement
  item.streamingOutput += chunk;
  if (item.streamingOutput.length > maxBuffer) {
    // Keep the tail -- most recent output is most relevant during streaming
    const trimPoint = item.streamingOutput.length - maxBuffer;
    const newlineAfterTrim = item.streamingOutput.indexOf('\n', trimPoint);
    const cutAt = newlineAfterTrim !== -1 ? newlineAfterTrim + 1 : trimPoint;
    item.streamingOutput = '...(truncated)\n' + item.streamingOutput.slice(cutAt);
  }

  // Update the result field with a streaming-status result so widgets can render it
  // via the unified result path (extractOutput checks result.rawOutput)
  item.result = {
    status: 'streaming',
    rawOutput: { stdout: item.streamingOutput },
  };
}
```

#### 2b. Add `setToolTerminalId` to `ConversationState`

Add a method to associate a tool call with a terminal ID for client-side polling:

```typescript
/**
 * Associates a terminal ID with a tool call for client-side output polling.
 */
setToolTerminalId(toolCallId: string, terminalId: string): void {
  const item = this.items.find(
    (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
  );
  if (item) {
    item.terminalId = terminalId;
  }
}
```

#### 2c. Modify `updateToolCall` to finalize streaming state

Update the existing `updateToolCall` method to clean up streaming state when the tool
completes:

```typescript
updateToolCall(
  toolCallId: string,
  status: 'completed' | 'failed',
  content?: Array<{ type: string; content?: { type: string; text: string } }>,
  rawOutput?: Record<string, unknown>,
): void {
  const item = this.items.find(
    (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
  );
  if (item) {
    item.status = status;
    item.result = { status, content, rawOutput };
    // Finalize streaming state
    item.isStreaming = false;
    // Retain streamingOutput for tools where final rawOutput may be truncated
    // or for debugging. Clearing is optional:
    // item.streamingOutput = undefined;
  }
}
```

### Layer 3: Event Handling

#### 3a. Handle `tool_call_output_chunk` in `AppState`

Add a new case to the session update switch in `app-state.ts` for streaming tool output
events from the ACP agent:

```typescript
case 'tool_call_output_chunk': {
  const toolCallId = update.toolCallId as string;
  const content = update.content as { type: string; text?: string };
  if (content?.type === 'text' && content.text) {
    this.conversation.appendToolOutput(toolCallId, content.text);
  }
  break;
}
```

This event type mirrors the existing `agent_message_chunk` pattern but targets a specific
tool call by ID. The agent can emit these events at any point between `tool_call`
(status: `in_progress`) and `tool_call_update` (status: `completed`/`failed`).

The ACP protocol does not currently define this event type. It would need to be proposed
as a protocol extension. Section "Protocol Extension Proposal" below details the
specification.

#### 3b. Client-side terminal polling for Bash tools

For agents that do not emit `tool_call_output_chunk` events, implement a polling
mechanism that reads from the terminal buffer managed by `FlitterClient`. This is
specifically for `Bash`/`shell_command` tools that execute via `createTerminal()`.

Add a new class `TerminalOutputPoller` in a new file
`src/state/terminal-output-poller.ts`:

```typescript
// TerminalOutputPoller -- polls FlitterClient terminal buffers for streaming output
// and pushes chunks into ConversationState for rendering.

import { FlitterClient } from '../acp/client';
import { ConversationState } from './conversation';
import { log } from '../utils/logger';

interface PollTarget {
  toolCallId: string;
  terminalId: string;
  lastLength: number;
}

/**
 * Polls terminal buffers at a fixed interval and pushes new output chunks
 * into the conversation state for live rendering.
 *
 * Lifecycle:
 *   1. When a Bash tool call starts, call track(toolCallId, terminalId)
 *   2. The poller reads terminal output every POLL_INTERVAL_MS
 *   3. New bytes since last read are pushed via conversation.appendToolOutput()
 *   4. When the tool completes, call untrack(toolCallId)
 *   5. Call dispose() on shutdown to clear all intervals
 *
 * The poller interacts with BashTool (a StatelessWidget) indirectly:
 *   poller.poll() --> conversation.appendToolOutput() --> modifies ToolCallItem
 *   --> onUpdate() --> AppState.notifyListeners() --> widget tree rebuild
 *   --> BashTool.build() --> extractOutput() reads updated ToolCallItem
 *
 * This works because StatelessWidgets are rebuilt entirely on each parent
 * rebuild. BashTool does not cache output -- it reads from the data model
 * on every build() call.
 */
export class TerminalOutputPoller {
  private static readonly POLL_INTERVAL_MS = 200;
  private static readonly MAX_CHUNK_SIZE = 4096;

  private client: FlitterClient;
  private conversation: ConversationState;
  private targets: Map<string, PollTarget> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;
  private onUpdate: () => void;

  constructor(
    client: FlitterClient,
    conversation: ConversationState,
    sessionId: string,
    onUpdate: () => void,
  ) {
    this.client = client;
    this.conversation = conversation;
    this.sessionId = sessionId;
    this.onUpdate = onUpdate;
  }

  /**
   * Start tracking a terminal for output polling.
   */
  track(toolCallId: string, terminalId: string): void {
    this.targets.set(toolCallId, {
      toolCallId,
      terminalId,
      lastLength: 0,
    });
    this.conversation.setToolTerminalId(toolCallId, terminalId);
    this.ensurePolling();
  }

  /**
   * Stop tracking a terminal (tool completed or failed).
   */
  untrack(toolCallId: string): void {
    this.targets.delete(toolCallId);
    if (this.targets.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Execute one poll cycle across all tracked terminals.
   * Reads the current buffer from FlitterClient.terminalOutput() and
   * computes the delta since the last read. Only the delta is appended
   * to the conversation state.
   */
  private async poll(): Promise<void> {
    for (const target of this.targets.values()) {
      try {
        const response = await this.client.terminalOutput({
          terminalId: target.terminalId,
          sessionId: this.sessionId,
        });
        const fullOutput = response.terminal.output;
        if (fullOutput.length > target.lastLength) {
          const newChunk = fullOutput.slice(target.lastLength);
          // Cap chunk size to avoid huge renders on first poll
          // if a lot of output accumulated before tracking started
          const chunk = newChunk.length > TerminalOutputPoller.MAX_CHUNK_SIZE
            ? newChunk.slice(-TerminalOutputPoller.MAX_CHUNK_SIZE)
            : newChunk;
          this.conversation.appendToolOutput(target.toolCallId, chunk);
          target.lastLength = fullOutput.length;
          this.onUpdate();
        }
      } catch (err) {
        log.debug(`Terminal poll error for ${target.terminalId}: ${err}`);
      }
    }
  }

  private ensurePolling(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.poll(), TerminalOutputPoller.POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  dispose(): void {
    this.stopPolling();
    this.targets.clear();
  }
}
```

#### 3c. Wire poller into AppState

Integrate the `TerminalOutputPoller` into `AppState` so that Bash tool calls
automatically start polling:

```typescript
// In app-state.ts

import { TerminalOutputPoller } from './terminal-output-poller';

export class AppState implements ClientCallbacks {
  // ... existing fields ...

  private terminalPoller: TerminalOutputPoller | null = null;

  /**
   * Initialize the terminal poller after connection is established.
   * Called from the connection setup code after connectToAgent() returns.
   */
  initTerminalPoller(client: FlitterClient, sessionId: string): void {
    this.terminalPoller = new TerminalOutputPoller(
      client,
      this.conversation,
      sessionId,
      () => this.notifyListeners(),
    );
  }

  onSessionUpdate(sessionId: string, update: SessionUpdate): void {
    const type = update.sessionUpdate as string;

    switch (type) {
      // ... existing cases ...

      case 'tool_call': {
        this.conversation.addToolCall(
          update.toolCallId as string,
          update.title as string,
          update.kind as string,
          update.status as 'pending' | 'in_progress' | 'completed' | 'failed',
          update.locations as Array<{ path: string }> | undefined,
          update.rawInput as Record<string, unknown> | undefined,
        );

        // Record the tool call ID for Bash-type tools so we can associate
        // the next createTerminal call with this tool call for polling.
        const kind = update.kind as string;
        if (['Bash', 'shell_command', 'REPL', 'execute_command', 'shell',
             'run_command', 'terminal'].includes(kind)) {
          this.pendingBashToolCallId = update.toolCallId as string;
        }
        break;
      }

      case 'tool_call_output_chunk': {
        const toolCallId = update.toolCallId as string;
        const content = update.content as { type: string; text?: string };
        if (content?.type === 'text' && content.text) {
          this.conversation.appendToolOutput(toolCallId, content.text);
          // Disable terminal polling for this tool since the agent is
          // streaming directly -- avoids duplicate output
          this.terminalPoller?.untrack(toolCallId);
        }
        // Use throttled notification for high-frequency streaming events
        this.notifyListenersThrottled();
        return; // Skip the notifyListeners() at the end of the switch
      }

      case 'tool_call_update': {
        const toolCallId = update.toolCallId as string;
        this.conversation.updateToolCall(
          toolCallId,
          update.status as 'completed' | 'failed',
          update.content as Array<{ type: string; content?: { type: string; text: string } }> | undefined,
          update.rawOutput as Record<string, unknown> | undefined,
        );
        // Stop polling if we were tracking this tool's terminal
        this.terminalPoller?.untrack(toolCallId);
        break;
      }

      // ... remaining cases ...
    }

    this.notifyListeners();
  }
}
```

#### 3d. Hook into `FlitterClient.createTerminal` for auto-polling

Modify `FlitterClient` to emit a callback when a terminal is created, so the poller can
start tracking it. Add a terminal creation hook:

```typescript
// In client.ts

export interface ClientCallbacks {
  // ... existing callbacks ...

  /** Called when a terminal is created, enabling output polling */
  onTerminalCreated?(terminalId: string): void;
}

// In FlitterClient.createTerminal(), after proc is spawned and buffer is set up:
async createTerminal(params: {
  command: string;
  args?: string[];
  cwd?: string | null;
  env?: Array<{ name: string; value: string }>;
  outputByteLimit?: number | null;
  sessionId: string;
}): Promise<{ terminalId: string }> {
  const terminalId = crypto.randomUUID();
  // ... existing buffer setup and proc spawn code ...

  // Notify callbacks so the poller can start tracking
  this.callbacks.onTerminalCreated?.(terminalId);

  return { terminalId };
}
```

Then in `AppState`, use timing-based association to link the terminal to the pending
Bash tool call:

```typescript
private pendingBashToolCallId: string | null = null;

onTerminalCreated(terminalId: string): void {
  if (this.pendingBashToolCallId && this.terminalPoller) {
    this.terminalPoller.track(this.pendingBashToolCallId, terminalId);
    this.pendingBashToolCallId = null;
  }
}
```

**Note on tool-terminal association**: The ACP protocol separates tool execution from
terminal management. The `createTerminal` request does not inherently carry a
`toolCallId`. The association must be inferred. Two strategies:

1. **Timing-based** (implemented above): Track the most recently started `in_progress`
   Bash tool call and associate the next `createTerminal` with it. This works because
   tools execute sequentially per session in the current ACP model.

2. **Agent-side** (future): Propose an optional `toolCallId` field on the
   `createTerminal` request in the ACP protocol, allowing explicit association.

Strategy 1 is implementable without protocol changes and is correct given the sequential
tool execution model.

### Layer 4: Widget Rendering

#### 4a. Update `BashTool` to render streaming output

Modify `bash-tool.ts` to display streaming output when the tool is in progress. Since
`BashTool` is a `StatelessWidget`, the `extractOutput()` method is called on every
rebuild. The only change needed is to read from `streamingOutput` when available:

```typescript
/**
 * Extracts stdout/stderr output from the result OR streaming output.
 * During execution, prefers streamingOutput (populated by the poller).
 * After completion, uses result.rawOutput (populated by tool_call_update).
 *
 * Note: Because BashTool is a StatelessWidget, this method runs on every
 * rebuild triggered by notifyListeners(). The poller modifies the
 * ToolCallItem data model, which is read fresh each time.
 */
private extractOutput(): string {
  // Prefer explicit streaming output during execution
  if (this.toolCall.isStreaming && this.toolCall.streamingOutput) {
    return this.toolCall.streamingOutput;
  }

  // Fall back to completed result (existing logic, unchanged)
  if (!this.toolCall.result) return '';
  if (this.toolCall.result.rawOutput) {
    const raw = this.toolCall.result.rawOutput;
    if (typeof raw === 'string') return raw;
    const stdout = (raw['stdout'] ?? '') as string;
    const stderr = (raw['stderr'] ?? '') as string;
    if (stdout || stderr) return [stdout, stderr].filter(Boolean).join('\n');
    return JSON.stringify(raw, null, 2);
  }
  return this.toolCall.result.content
    ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
    .join('\n') ?? '';
}
```

Update the `build` method to show a streaming indicator when output is actively arriving:

```typescript
build(context: BuildContext): Widget {
  const theme = AmpThemeProvider.maybeOf(context);
  const input = this.toolCall.rawInput ?? {};
  const command = (input['command'] ?? input['cmd'] ?? input['shell_command']
    ?? input['script'] ?? input['args'] ?? '') as string;

  const details: string[] = [];
  if (command) {
    const shortCmd = command.length > 80 ? command.slice(0, 80) + '\u2026' : command;
    details.push(`$ ${shortCmd}`);
  }

  const header = new ToolHeader({
    name: this.toolCall.kind,
    status: this.toolCall.status,
    details,
  });

  if (!this.isExpanded) {
    return header;
  }

  const bodyChildren: Widget[] = [];

  const output = this.extractOutput();
  if (output) {
    // During streaming, show the TAIL of output with a block cursor indicator.
    // After completion, show the HEAD of output (standard behavior).
    const displayOutput = this.toolCall.isStreaming
      ? (output.length > 2000
          ? '...(truncated)\n' + output.slice(-2000) + ' \u2588'
          : output + ' \u2588')
      : (output.length > 2000
          ? output.slice(0, 2000) + '\n\u2026(truncated)'
          : output);

    bodyChildren.push(
      new Padding({
        padding: EdgeInsets.only({ left: 2, right: 2 }),
        child: new Text({
          text: new TextSpan({
            text: displayOutput,
            style: new TextStyle({
              foreground: theme?.base.mutedForeground ?? Color.brightBlack,
              dim: true,
            }),
          }),
        }),
      }),
    );
  }

  // Exit code rendering (existing, unchanged -- only appears after completion)
  const exitCode = this.extractExitCode();
  if (exitCode !== null) {
    const exitColor = exitCode === 0
      ? (theme?.app.toolSuccess ?? Color.green)
      : (theme?.base.destructive ?? Color.red);
    bodyChildren.push(
      new Padding({
        padding: EdgeInsets.only({ left: 2 }),
        child: new Text({
          text: new TextSpan({
            text: `exit code: ${exitCode}`,
            style: new TextStyle({ foreground: exitColor, dim: true }),
          }),
        }),
      }),
    );
  }

  if (bodyChildren.length === 0) {
    return header;
  }

  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children: [header, ...bodyChildren],
  });
}
```

Key rendering behavior changes for streaming:

- **Tail mode**: During streaming, display the *last* 2000 characters instead of the
  first 2000. This shows the most recent output, which is what users care about when
  watching a build or test run.

- **Block cursor**: Append a block cursor character (`\u2588`) to indicate output is
  still arriving, mirroring cursor conventions used for streaming assistant messages.

- **No exit code during streaming**: The exit code section is only rendered when
  `this.toolCall.result?.rawOutput` contains `exit_code`, which only happens after
  completion. No code change needed -- the existing `extractExitCode()` returns `null`
  when `result.status === 'streaming'` because the final `rawOutput` hasn't been set yet.

#### 4b. Update `GenericToolCard` to render streaming output

Apply the same pattern to `GenericToolCard` so all tool types benefit:

```typescript
private extractOutputText(): string {
  // Prefer streaming output during execution
  if (this.toolCall.isStreaming && this.toolCall.streamingOutput) {
    const output = this.toolCall.streamingOutput;
    return output.length > 2000
      ? '...(truncated)\n' + output.slice(-2000) + ' \u2588'
      : output + ' \u2588';
  }

  // Existing final-result extraction (unchanged)
  if (!this.toolCall.result) return '';
  if (this.toolCall.result.rawOutput) {
    const s = JSON.stringify(this.toolCall.result.rawOutput, null, 2);
    return s.length > 2000 ? s.slice(0, 2000) + '\n\u2026(truncated)' : s;
  }
  return this.toolCall.result.content
    ?.map(c => (c as Record<string, unknown>)['text'] as string ?? c.content?.text ?? '')
    .join('\n') ?? '';
}
```

### Layer 5: Render Throttling

The terminal poller runs at 200ms intervals, and the ACP agent may emit
`tool_call_output_chunk` events even more frequently. To prevent excessive redraws, add
a throttle mechanism to `AppState`:

```typescript
// In app-state.ts

export class AppState implements ClientCallbacks {
  // ... existing fields ...

  private lastNotifyTime = 0;
  private pendingNotify: ReturnType<typeof setTimeout> | null = null;
  private static readonly MIN_NOTIFY_INTERVAL_MS = 50;

  /**
   * Throttled listener notification. Ensures at most one notification
   * per MIN_NOTIFY_INTERVAL_MS to prevent TUI render thrashing during
   * high-frequency streaming output.
   *
   * Used only for streaming events (tool_call_output_chunk and poller
   * updates). Non-streaming events use the original notifyListeners()
   * for immediate rendering.
   */
  private notifyListenersThrottled(): void {
    const now = Date.now();
    const elapsed = now - this.lastNotifyTime;

    if (elapsed >= AppState.MIN_NOTIFY_INTERVAL_MS) {
      this.lastNotifyTime = now;
      this.notifyListeners();
    } else if (!this.pendingNotify) {
      this.pendingNotify = setTimeout(() => {
        this.pendingNotify = null;
        this.lastNotifyTime = Date.now();
        this.notifyListeners();
      }, AppState.MIN_NOTIFY_INTERVAL_MS - elapsed);
    }
  }
}
```

The throttle guarantees at most 20 renders per second (50ms intervals) for streaming
events. This is fast enough for smooth visual updates but slow enough to avoid CPU
saturation from relayout/repaint cycles. Non-streaming events bypass the throttle entirely
so user actions (typing, toggling, permission responses) remain instant.

### ACP Protocol Extension Proposal

The `tool_call_output_chunk` event does not exist in the current ACP protocol (SDK
version `^0.16.0`). This section proposes the protocol extension.

#### Event specification

```typescript
/**
 * session/update with sessionUpdate = "tool_call_output_chunk"
 *
 * Emitted by the agent while a tool call is in_progress to stream
 * incremental output to the client for live rendering.
 *
 * The client SHOULD buffer these chunks and display them as streaming
 * output. The client MUST NOT treat these as the final tool result --
 * the final result is delivered via tool_call_update.
 *
 * Agents MAY emit zero or more tool_call_output_chunk events per tool
 * call. Clients that do not recognize this event type SHOULD ignore it
 * (backward compatible -- unknown event types fall through to the
 * default case in the switch statement, which logs and ignores).
 */
interface ToolCallOutputChunkUpdate {
  sessionUpdate: 'tool_call_output_chunk';
  toolCallId: string;
  content: {
    type: 'text';
    text: string;
  };
  /** Optional: byte offset in the total output stream for ordering */
  offset?: number;
  /** Optional: total expected bytes if known (for progress bars) */
  totalBytes?: number;
}
```

#### Capability negotiation

The client declares support for streaming tool output in the `initialize` request:

```typescript
const initResponse = await connection.initialize({
  protocolVersion: acp.PROTOCOL_VERSION,
  clientInfo: { name: 'flitter-amp', version: '0.2.0' },
  clientCapabilities: {
    fs: { readTextFile: true, writeTextFile: true },
    terminal: true,
    streamingToolOutput: true,   // NEW capability flag
  },
});
```

Agents that see `streamingToolOutput: true` in client capabilities MAY emit
`tool_call_output_chunk` events. Agents that do not support this simply never emit them,
and the client falls back to the terminal polling mechanism.

#### Relationship to terminal subsystem

The `tool_call_output_chunk` events are the preferred mechanism for streaming output
because they work for *any* tool type, not just terminal-based tools. The terminal
polling mechanism (Layer 3b) serves as a fallback for agents that do not implement
the protocol extension.

When both mechanisms are active for the same tool call (agent emits chunk events AND
client is polling), the client should prefer the chunk events and disable polling for
that tool call to avoid duplicate output:

```typescript
case 'tool_call_output_chunk': {
  const toolCallId = update.toolCallId as string;
  // Disable polling for this tool since agent is streaming directly
  this.terminalPoller?.untrack(toolCallId);
  // ... append chunk ...
  break;
}
```

## Detailed File Change Summary

| File | Change | Layer |
|------|--------|-------|
| `acp/types.ts` | Add `streamingOutput`, `isStreaming`, `terminalId` to `ToolCallItem`; add `'streaming'` to `ToolCallResult.status` | 1 |
| `state/conversation.ts` | Add `appendToolOutput()`, `setToolTerminalId()` methods; modify `updateToolCall()` to finalize streaming state | 2 |
| `state/app-state.ts` | Add `tool_call_output_chunk` case; integrate `TerminalOutputPoller`; add `notifyListenersThrottled()`; add terminal association logic | 3 |
| `state/terminal-output-poller.ts` (NEW) | `TerminalOutputPoller` class for client-side terminal output polling | 3 |
| `acp/client.ts` | Add `onTerminalCreated` callback to `ClientCallbacks` interface | 3 |
| `acp/connection.ts` | Add `streamingToolOutput` to client capabilities in `initialize()` | 3 |
| `widgets/tool-call/bash-tool.ts` | Update `extractOutput()` to prefer `streamingOutput`; update `build()` for tail-mode and block cursor during streaming | 4 |
| `widgets/tool-call/generic-tool-card.ts` | Update `extractOutputText()` to prefer `streamingOutput` with cursor indicator | 4 |

## Visual Examples

### Before (current behavior)

A `Bash` tool running `npm run build` for 15 seconds:

```
0s:   ⋯ Bash  $ npm run build  ⣾
5s:   ⋯ Bash  $ npm run build  ⣽
10s:  ⋯ Bash  $ npm run build  ⣻
15s:  ✓ Bash  $ npm run build
        > flitter@1.0.0 build
        > tsc --build
        src/index.ts(45,3): error TS2345: ...
        Found 1 error.
        exit code: 1
```

The user sees only a spinner for 15 seconds, then the full output appears at once.

### After (streaming output)

```
0s:   ⋯ Bash  $ npm run build  ⣾
1s:   ⋯ Bash  $ npm run build  ⣽
        > flitter@1.0.0 build
        > tsc --build █
3s:   ⋯ Bash  $ npm run build  ⣻
        > flitter@1.0.0 build
        > tsc --build
        Compiling project references... █
8s:   ⋯ Bash  $ npm run build  ⡿
        > flitter@1.0.0 build
        > tsc --build
        Compiling project references...
        src/index.ts(45,3): error TS2345: ... █
15s:  ✓ Bash  $ npm run build
        > flitter@1.0.0 build
        > tsc --build
        Compiling project references...
        src/index.ts(45,3): error TS2345: ...
        Found 1 error.
        exit code: 1
```

Output appears incrementally as the command runs. The block cursor indicates more output
may follow. On completion, the cursor disappears and the exit code appears.

### Streaming with long output (tail mode)

For a `pytest -v` run producing hundreds of lines:

```
During execution (tail of output shown):
  ⋯ Bash  $ pytest -v  ⣽
    ...(truncated)
    tests/test_widget.py::test_column_layout PASSED
    tests/test_widget.py::test_row_layout PASSED
    tests/test_widget.py::test_padding PASSED
    tests/test_widget.py::test_sized_box PASSED █

After completion (head of output shown):
  ✓ Bash  $ pytest -v
    ==================== test session starts ====================
    platform linux -- Python 3.11.0
    collected 142 items
    tests/test_core.py::test_color PASSED
    tests/test_core.py::test_text_style PASSED
    ...(truncated)
    exit code: 0
```

During streaming, the *tail* is shown (most recent output). After completion, the
*head* is shown (standard behavior), with the full result available in `rawOutput`.

## Edge Cases and Considerations

### 1. Agent does not support `tool_call_output_chunk`

The terminal polling fallback (Layer 3b) handles this case. For non-terminal tools in
agents that do not emit chunk events, behavior remains identical to today -- output only
appears on completion. This is an acceptable degradation since most long-running tools
use terminals.

### 2. Very high output rate

Tools like `cat /dev/urandom | hexdump` could produce megabytes per second. Protections:

- **TerminalBuffer.limit** (existing): Caps total buffer at `outputByteLimit` bytes.
- **appendToolOutput maxBuffer** (new): Caps streaming display at 50,000 characters.
- **Render throttle** (new): At most one render per 50ms regardless of output rate.
- **Poll interval** (new): Terminal polling runs at 200ms, bounding read frequency.
- **MAX_CHUNK_SIZE** (new): Individual poll chunks capped at 4096 characters to prevent
  a single large delta from causing a long relayout.

### 3. Multiple concurrent tool calls

The poller tracks multiple terminals independently via the `targets` Map keyed by
`toolCallId`. Each tool call has its own `streamingOutput` buffer on its `ToolCallItem`.
The `toolCallId` association ensures output is routed to the correct item.

### 4. Tool call canceled mid-stream

When a prompt is canceled via `cancelPrompt()`, the agent sends a `tool_call_update`
with status `failed`. The `updateToolCall` handler finalizes streaming state, and the
poller's `untrack` is called. The partial streaming output remains visible on the tool
card with the failed status indicator.

### 5. Collapsed tool cards

If a tool card is collapsed when streaming begins, the auto-expand logic in
`appendToolOutput` (Layer 2a) opens it on the first chunk. If the user manually
collapses it during streaming, the streaming continues in the background (buffer still
fills) but is not rendered until the card is expanded again. This avoids forcing the
card open against user intent -- auto-expand only triggers on the *first* chunk.

### 6. Memory cleanup

When `ConversationState.clear()` is called (new conversation), all streaming state is
cleaned up implicitly because the items array is replaced. The `TerminalOutputPoller`
should also be disposed when the session ends:

```typescript
// In AppState
disposeTerminalPoller(): void {
  this.terminalPoller?.dispose();
  this.terminalPoller = null;
}
```

### 7. Reconnection

If the connection drops and reconnects, the poller should be re-initialized with the new
client and session. The `initTerminalPoller` method handles this -- it creates a fresh
poller instance.

### 8. Widget rebuild cost

`BashTool` is a `StatelessWidget`, so every `notifyListeners()` call that reaches its
ancestor triggers a full `build()`. With the 50ms throttle, this means up to 20 rebuilds
per second during active streaming. Each rebuild calls `extractOutput()` which reads a
string from the `ToolCallItem` -- this is O(1) pointer dereference, not a copy.

The `Text` widget then performs layout on the display string (up to 2000 characters after
truncation). At 20fps this should be well within budget for terminal rendering. If
profiling reveals bottlenecks, the truncation limit can be reduced or a dirty flag can be
added to skip rebuilds when the output hasn't changed.

### 9. StatelessWidget vs StatefulWidget tradeoff

An alternative design would make `BashTool` a `StatefulWidget` with its own timer that
polls `streamingOutput` independently. This was rejected because:

- It duplicates the polling/notification logic already handled by `TerminalOutputPoller`
  and `AppState.notifyListeners()`.
- `StatefulWidget` adds lifecycle complexity (initState, dispose, didUpdateWidget).
- The current `StatelessWidget` design is clean: data flows one way from `ToolCallItem`
  through `build()` to rendered output. Adding internal state creates a second source of
  truth.
- `ToolHeader` is already a `StatefulWidget` (for the BrailleSpinner animation), so the
  tool card already handles animated elements. The streaming output just needs data
  freshness, not its own animation timer.

## Recommended Implementation Order

1. **Phase 1: Types and state** (Layer 1 + 2) -- Extend `ToolCallItem`, add
   `appendToolOutput` and `setToolTerminalId` to `ConversationState`, update
   `updateToolCall`. No visible behavior change yet, but the data model is ready.

2. **Phase 2: Terminal polling** (Layer 3b + 3c + 3d) -- Implement
   `TerminalOutputPoller` and wire it into `AppState` and `FlitterClient`. This delivers
   streaming output for all Bash tools without any protocol changes.

3. **Phase 3: Widget rendering** (Layer 4) -- Update `BashTool` and `GenericToolCard` to
   render streaming output. This is where the user sees the improvement.

4. **Phase 4: Render throttling** (Layer 5) -- Add `notifyListenersThrottled()` to
   prevent render thrashing. Can be added as a performance optimization once Phase 2-3
   are working.

5. **Phase 5: Protocol extension** (Layer 3a) -- Propose and implement
   `tool_call_output_chunk` in the ACP protocol. This enables streaming for non-terminal
   tools and is the cleanest long-term solution. Depends on ACP SDK upstream acceptance.

Phases 1-3 can be implemented immediately using only the existing terminal polling
mechanism. Phase 5 requires coordination with the ACP protocol maintainers.

## Testing Considerations

1. **Unit test: appendToolOutput** -- Verify that calling `appendToolOutput` on an
   `in_progress` tool call accumulates text in `streamingOutput`, sets `isStreaming` to
   true, and populates `result` with `status: 'streaming'`.

2. **Unit test: Buffer truncation** -- Call `appendToolOutput` with chunks totaling over
   50,000 characters and verify the buffer is truncated to approximately `maxBuffer`
   characters with a `...(truncated)` prefix.

3. **Unit test: updateToolCall finalizes streaming** -- After calling `appendToolOutput`
   multiple times, call `updateToolCall` with `'completed'` and verify `isStreaming` is
   set to false and `result` reflects the final output.

4. **Unit test: appendToolOutput ignored after completion** -- Call `updateToolCall` with
   `'completed'`, then call `appendToolOutput`. Verify the streaming buffer is not
   modified.

5. **Unit test: Auto-expand on first chunk** -- Verify that a collapsed tool card has
   `collapsed` set to `false` after the first `appendToolOutput` call.

6. **Unit test: BashTool.extractOutput prefers streaming** -- Construct a `ToolCallItem`
   with both `streamingOutput` and `result`, with `isStreaming: true`. Verify
   `extractOutput` returns the streaming content.

7. **Integration test: TerminalOutputPoller** -- Mock `FlitterClient.terminalOutput` to
   return incrementally growing output. Verify the poller calls `appendToolOutput` with
   only the new bytes on each poll cycle.

8. **Integration test: Throttled notifications** -- Fire multiple
   `tool_call_output_chunk` events within 50ms. Verify that `notifyListeners` is called
   at most once per 50ms interval.

9. **Visual snapshot test** -- Render a `BashTool` widget with `isStreaming: true` and
   `streamingOutput` containing multi-line text. Verify the block cursor appears and the
   tail of the output is shown when truncated.

10. **End-to-end test** -- Start a real agent, send a prompt that triggers a long-running
    Bash command, and verify that output appears in the TUI before the command completes.

## Relationship to Other Gaps

- **Gap 38 (streaming-cursor-blink.md)**: The streaming cursor blink animation for
  assistant messages is analogous to the block cursor proposed here for streaming tool
  output. The implementation pattern (appending a cursor character to streaming text) is
  the same. If Gap 38 introduces a reusable `StreamingCursor` widget, it should be used
  here as well.

- **Gap 39 (per-card-toggle.md)**: Per-card toggle is important for streaming tool output
  because users need to expand/collapse individual tool cards independently. The
  auto-expand behavior (Layer 2a) should respect per-card toggle state if implemented.

- **Gap T03 (tool-locations-display.md)**: Locations display and streaming output both
  enhance the tool call rendering. They are independent features that compose well --
  locations appear in the header/body while streaming output appears in the output section.

- **Gap 40 (toggle-propagation.md)**: The global expand/collapse toggle should include
  streaming tool cards. When the user presses Alt+T to collapse all cards, streaming
  output continues in the background but is hidden. Re-expanding shows the latest buffer
  state.
