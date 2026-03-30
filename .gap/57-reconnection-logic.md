# Gap P01: Reconnection Logic

## Problem Statement

When the ACP agent subprocess dies unexpectedly (crash, OOM kill, `SIGKILL`, broken
pipe), the app transitions to an inert error state with no path to recovery.
The current flow is:

1. `handle.agent.onExit()` fires in `index.ts` (line 64).
2. `appState.onConnectionClosed(reason)` is called, which sets
   `isConnected = false` and stores a generic error string.
3. The TUI renders the error, but the input area still accepts keystrokes
   that silently fail because `handle.sessionId` is stale and the
   `ClientSideConnection` stream is dead.
4. The only escape is `Ctrl+C` / `SIGINT`, which kills the entire process.

There is no mechanism to:
- Detect the specific failure class (transient vs. permanent).
- Respawn the agent subprocess.
- Re-initialize the ACP protocol handshake.
- Re-create a session.
- Resume or replay the conversation context.

## Root Cause Analysis

### `connection.ts` -- fire-and-forget setup

`connectToAgent()` is a one-shot async function. It returns a `ConnectionHandle`
whose lifetime is implicitly "forever." There is no reconnect entry point, no
handle invalidation, and no way to swap the underlying `ClientSideConnection`
without tearing down the entire process.

Key issues:
- The `ndJsonStream` wraps raw stdin/stdout of a single subprocess. Once the
  process dies, the streams are permanently closed -- they cannot be re-opened.
- `ClientSideConnection` is constructed once and never replaced. The SDK does
  not appear to support connection recycling.
- `FlitterClient` holds references to terminals spawned by the old agent session.
  A reconnect must not orphan those references.

### `index.ts` -- no recovery path

The `main()` function captures `handle` as a `let` binding (line 40) but never
reassigns it. The `handleSubmit` and `handleCancel` closures capture `handle`
by reference, so they would pick up a reassignment -- but no code ever performs
one. The `onExit` callback (line 64) only sets error state; it does not attempt
reconnection.

### `app-state.ts` -- state machine has no "reconnecting" phase

`AppState` models two connection states: `isConnected = true/false`. There is
no intermediate "reconnecting" state, no attempt counter, and no way for the
TUI to distinguish "disconnected permanently" from "reconnecting, attempt 2/5."

## Proposed Design

The design introduces five coordinated changes: (1) a connection state machine
with an explicit `reconnecting` phase, (2) a `ReconnectionManager` class that
encapsulates backoff-and-retry logic, (3) a `LiveHandle` indirection layer so
closures in `index.ts` can transparently switch to new connections, (4) resource
cleanup to prevent leaked terminal processes and stale stream references, and
(5) TUI integration so the user sees reconnection progress and has a manual
retry affordance when automatic retries are exhausted.

### 1. Connection State Machine

Introduce an explicit connection state enum and surface it through `AppState`:

```typescript
// state/connection-state.ts

export type ConnectionPhase =
  | 'connecting'      // Initial connection or reconnect in progress
  | 'connected'       // Agent is live, session is active
  | 'reconnecting'    // Agent died, auto-reconnect in progress
  | 'disconnected';   // All retries exhausted or user-initiated disconnect

export interface ConnectionStatus {
  phase: ConnectionPhase;
  attempt: number;         // Current retry attempt (0 when connected)
  maxAttempts: number;     // Configured retry ceiling
  lastError: string | null;
  nextRetryAt: number | null; // Unix ms timestamp of next retry
}
```

Update `AppState` to replace the boolean `isConnected` with a `ConnectionStatus`
object. The TUI reads `connectionStatus.phase` to decide what to render:

- `connecting` / `reconnecting` -- show a spinner or status line with the
  attempt count and countdown to next retry.
- `connected` -- normal operation.
- `disconnected` -- show the error with a "Press Enter to retry" affordance.

The boolean `isConnected` field is retained as a backward-compatible computed
property: `get isConnected(): boolean { return this._connectionStatus.phase === 'connected'; }`.

**State transition diagram:**

```
    [start]
       |
       v
  connecting ----success----> connected
       |                        |
    failure                  agent dies
       |                        |
       v                        v
  disconnected <---exhausted-- reconnecting
       |                        |
   Enter key              success on attempt N
       |                        |
       v                        v
  reconnecting              connected
```

### 2. Reconnection Manager

Create a `ReconnectionManager` class that owns the reconnect lifecycle. This
is deliberately separate from `connectToAgent()` to keep the initial connection
path simple and avoid polluting the hot path with retry logic.

```typescript
// acp/reconnection-manager.ts

import { connectToAgent, type ConnectionHandle } from './connection';
import type { ClientCallbacks } from './client';
import type { ConnectionPhase } from '../state/connection-state';
import { log } from '../utils/logger';

export interface ReconnectionConfig {
  /** Maximum number of consecutive reconnect attempts before giving up. */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff. */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds. */
  maxDelayMs: number;
  /** Jitter factor (0-1). Multiplied by the computed delay and added randomly. */
  jitterFactor: number;
}

export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  jitterFactor: 0.3,
};

type PhaseCallback = (
  phase: ConnectionPhase,
  attempt: number,
  error?: string,
  nextRetryAt?: number,
) => void;

export class ReconnectionManager {
  private config: ReconnectionConfig;
  private agentCommand: string;
  private agentArgs: string[];
  private cwd: string;
  private callbacks: ClientCallbacks;
  private onPhaseChange: PhaseCallback;

  private attempt = 0;
  private aborted = false;
  private currentTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    agentCommand: string,
    agentArgs: string[],
    cwd: string,
    callbacks: ClientCallbacks,
    onPhaseChange: PhaseCallback,
    config: Partial<ReconnectionConfig> = {},
  ) {
    this.agentCommand = agentCommand;
    this.agentArgs = agentArgs;
    this.cwd = cwd;
    this.callbacks = callbacks;
    this.onPhaseChange = onPhaseChange;
    this.config = { ...DEFAULT_RECONNECTION_CONFIG, ...config };
  }

  /**
   * Begin the reconnection loop. Returns the new ConnectionHandle on
   * success, or null if all attempts are exhausted or abort() was called.
   */
  async reconnect(): Promise<ConnectionHandle | null> {
    this.attempt = 0;
    this.aborted = false;

    while (this.attempt < this.config.maxAttempts && !this.aborted) {
      this.attempt++;
      const delay = this.computeDelay(this.attempt);
      const nextRetryAt = Date.now() + delay;

      this.onPhaseChange('reconnecting', this.attempt, undefined, nextRetryAt);
      log.info(`Reconnection attempt ${this.attempt}/${this.config.maxAttempts}`);
      log.info(`Waiting ${delay}ms before reconnect attempt`);

      await this.sleep(delay);

      if (this.aborted) break;

      try {
        const handle = await connectToAgent(
          this.agentCommand,
          this.agentArgs,
          this.cwd,
          this.callbacks,
        );
        log.info('Reconnection successful');
        this.attempt = 0;
        this.onPhaseChange('connected', 0);
        return handle;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error(`Reconnect attempt ${this.attempt} failed: ${message}`);
        this.onPhaseChange('reconnecting', this.attempt, message);
      }
    }

    if (!this.aborted) {
      this.onPhaseChange('disconnected', this.attempt, 'All reconnection attempts exhausted');
    }
    return null;
  }

  /** Abort any in-progress reconnection. */
  abort(): void {
    this.aborted = true;
    if (this.currentTimer) {
      clearTimeout(this.currentTimer);
      this.currentTimer = null;
    }
  }

  /** Reset attempt counter (call after a successful user-initiated retry). */
  reset(): void {
    this.attempt = 0;
    this.aborted = false;
  }

  /** Expose config for TUI display purposes. */
  get maxAttempts(): number {
    return this.config.maxAttempts;
  }

  private computeDelay(attempt: number): number {
    // Exponential backoff: base * 2^(attempt-1), capped at maxDelay
    const exponential = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    const capped = Math.min(exponential, this.config.maxDelayMs);
    const jitter = capped * this.config.jitterFactor * Math.random();
    return Math.round(capped + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.currentTimer = setTimeout(() => {
        this.currentTimer = null;
        resolve();
      }, ms);
    });
  }
}
```

### 3. Handle Hot-Swap in `index.ts`

The core change to `index.ts` is replacing the one-shot connection with a
reconnection-aware lifecycle. The `handle` variable is reassigned on successful
reconnect, and since the closures capture the binding by reference via a
wrapper object, the `handleSubmit` and `handleCancel` functions automatically
use the new connection.

The wrapper is necessary because JavaScript closures capture variable bindings,
not values -- but `let handle` would require every closure to be aware of the
reassignment timing. A `LiveHandle` object makes the indirection explicit and
avoids subtle race conditions:

```typescript
// Sketch of the changes to main() in index.ts

/**
 * Mutable wrapper around ConnectionHandle. Closures capture a reference
 * to this object, so swapping `current` transparently updates all callers.
 */
interface LiveHandle {
  current: ConnectionHandle;
}

const live: LiveHandle = { current: handle };

// Replace direct handle references in closures:
const handleSubmit = async (text: string): Promise<void> => {
  const h = live.current;
  if (!h.sessionId) return;

  // Guard: reject submissions during non-connected phases
  if (appState.connectionStatus.phase !== 'connected') {
    appState.setError('Cannot send: agent is not connected');
    return;
  }

  appState.startProcessing(text);
  try {
    const result = await sendPrompt(h.connection, h.sessionId, text);
    appState.onPromptComplete(h.sessionId, result.stopReason);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Prompt failed: ${message}`);
    appState.handleError(message);
  }
};

const handleCancel = async (): Promise<void> => {
  const h = live.current;
  if (!h.sessionId || !appState.isProcessing) {
    // Not processing -- check if we should exit or ignore
    if (appState.connectionStatus.phase === 'reconnecting') {
      // Abort reconnection and exit
      reconnManager.abort();
      cleanup();
      process.exit(0);
    }
    cleanup();
    process.exit(0);
  }
  try {
    await cancelPrompt(h.connection, h.sessionId);
  } catch (err) {
    log.error('Cancel failed:', err);
  }
};
```

### 4. Exit Handler Wiring with Recursive Registration

The `onExit` handler must be re-registered on each new `AgentProcess` after
reconnection. This is cleanly handled by extracting it into a named function:

```typescript
// In main(), after initial connection:

const reconnManager = new ReconnectionManager(
  config.agentCommand,
  config.agentArgs,
  config.cwd,
  appState, // ClientCallbacks
  (phase, attempt, error, nextRetryAt) => {
    appState.setConnectionPhase(phase, attempt, error ?? null, nextRetryAt ?? null);
  },
);

/**
 * Wire the onExit handler for an agent process. Called once for the initial
 * connection and again after each successful reconnection.
 */
function wireExitHandler(h: ConnectionHandle): void {
  h.agent.onExit(async (code, signal) => {
    // Ignore if we are already handling a disconnect (e.g., user-initiated kill)
    if (appState.connectionStatus.phase === 'reconnecting') return;
    // Ignore clean exit code 0 when we initiated the kill via cleanup()
    if (code === 0 && !appState.isConnected) return;

    const reason = signal ? `killed by ${signal}` : `exited with code ${code}`;
    log.error(`Agent process ${reason}`);
    appState.onConnectionClosed(reason);

    // Clean up old client resources (terminals, etc.)
    live.current.client.cleanup();

    // Classify the exit to decide whether to reconnect
    if (shouldAutoReconnect(code, signal)) {
      const newHandle = await reconnManager.reconnect();
      if (newHandle) {
        live.current = newHandle;
        appState.setConnected(newHandle.sessionId, newHandle.agentInfo?.name ?? null);

        // Insert a visual separator in the conversation
        appState.conversation.items.push({
          type: 'assistant_message',
          text: '*Agent reconnected (new session). Previous context was not carried over.*',
          timestamp: Date.now(),
          isStreaming: false,
        });
        appState.notifyListeners();

        // Re-register exit handler on the new process
        wireExitHandler(newHandle);
      }
    } else {
      log.info(`Exit code/signal ${code}/${signal} classified as non-retryable`);
      appState.setConnectionPhase('disconnected', 0, `Agent ${reason} (non-retryable)`);
    }
  });
}

wireExitHandler(handle);
```

### 5. Exit Classification

Not all agent exits are retryable. A classification function examines the exit
code and signal to decide whether automatic reconnection should be attempted:

```typescript
// acp/exit-classifier.ts

/**
 * Determine whether an agent exit warrants automatic reconnection.
 *
 * Returns true for exits that are likely transient (crashes, OOM kills).
 * Returns false for exits that indicate permanent problems (missing binary,
 * configuration errors, clean shutdowns, user-initiated termination).
 */
export function shouldAutoReconnect(
  code: number | null,
  signal: string | null,
): boolean {
  // If we killed it ourselves (SIGTERM from cleanup()), do not reconnect
  if (signal === 'SIGTERM') return false;

  // Clean exit (code 0) -- intentional shutdown, do not reconnect
  if (code === 0) return false;

  // Exit code 127 -- command not found. Permanent, do not reconnect.
  if (code === 127) return false;

  // Exit code 1 -- generic error. Could be configuration. Reconnect is
  // unlikely to help, but we allow one attempt for transient init failures.
  // The ReconnectionManager's attempt limit will cap runaway retries.

  // SIGKILL (9) -- typically OOM killer. Transient, reconnect.
  if (signal === 'SIGKILL') return true;

  // SIGSEGV (11) -- crash. Transient if caused by race condition.
  if (signal === 'SIGSEGV') return true;

  // SIGABRT (6) -- assertion failure. Potentially transient.
  if (signal === 'SIGABRT') return true;

  // All other non-zero exits: default to reconnect. The attempt limit
  // in ReconnectionManager provides the safety net.
  return true;
}
```

### 6. Old Resource Cleanup

When reconnection occurs, the old `FlitterClient` instance holds references to
terminal child processes spawned by the previous agent session. These must be
cleaned up before the new connection is established:

1. Call `handle.client.cleanup()` immediately when agent death is detected.
   This sends SIGTERM to all tracked terminal processes and clears the maps.
2. The old `ClientSideConnection` and `ndJsonStream` are already dead (their
   underlying streams closed when the process exited). No explicit teardown
   is needed -- they will be garbage collected.
3. A new `FlitterClient` is created inside `connectToAgent()` on each call,
   so there is no stale-reference problem on the client side.

**Important consideration:** If the agent dies while a `sendPrompt()` call is
in-flight, the `await connection.prompt(...)` in `handleSubmit` will reject
(the underlying `ndJsonStream` will error out when the stdout stream closes).
This rejection is caught by the existing `try/catch` in `handleSubmit`, which
calls `appState.handleError(message)`. The reconnection sequence begins in
parallel via the `onExit` handler. There is no race condition because:

- `handleSubmit` catches the error and transitions `isProcessing` to `false`.
- `onExit` fires (possibly before or after the prompt rejection) and starts
  reconnection.
- The `LiveHandle.current` is only reassigned *after* a successful reconnect,
  so any in-flight operation that references the old handle sees consistent
  (dead) state.

### 7. Input Guard During Reconnection

The TUI must prevent the user from submitting prompts while the connection is
not in the `connected` phase. Two levels of protection:

**Level 1 -- Visual:** The `BottomGrid` / `InputArea` widget checks
`appState.connectionStatus.phase`. If not `connected`, it renders the input
as disabled (dimmed text, no cursor) and shows the reconnection status
instead of the mode label.

**Level 2 -- Logical:** The `handleSubmit` closure checks the phase before
sending:

```typescript
const handleSubmit = async (text: string): Promise<void> => {
  if (appState.connectionStatus.phase !== 'connected') {
    appState.setError('Cannot send: agent is not connected');
    return;
  }
  // ... normal prompt flow
};
```

**Level 3 -- Widget-level:** The `BottomGrid` component receives the
connection phase as a prop and conditionally renders status text in place
of the input area during reconnection:

```typescript
// In BottomGrid.build():
if (this.connectionPhase === 'reconnecting') {
  // Render: "Reconnecting... (attempt N/M)"
  // with a subtle animated spinner
} else if (this.connectionPhase === 'disconnected') {
  // Render: "Agent disconnected. Press Enter to retry, Ctrl+C to exit."
}
```

### 8. Manual Retry Affordance

When all automatic retries are exhausted (`phase === 'disconnected'`), the TUI
shows:

```
  Agent disconnected. Press Enter to retry, or Ctrl+C to exit.
```

Pressing Enter in this state triggers a manual reconnection attempt by calling
`reconnManager.reset()` followed by `reconnManager.reconnect()`. This gives the
user a way out of the terminal state without restarting the process.

Register this as a keyboard handler in the `FocusScope.onKey` callback in
`app.ts`:

```typescript
// In AppStateWidget.build(), inside FocusScope.onKey:

if (event.key === 'Return' && appState.connectionStatus.phase === 'disconnected') {
  // Trigger manual reconnection
  // This needs access to the reconnection manager. Pass it through App props
  // or emit a callback event that index.ts handles.
  this.widget.onManualRetry?.();
  return 'handled';
}
```

In `index.ts`, wire the callback:

```typescript
const handleManualRetry = async (): Promise<void> => {
  reconnManager.reset();
  const newHandle = await reconnManager.reconnect();
  if (newHandle) {
    live.current = newHandle;
    appState.setConnected(newHandle.sessionId, newHandle.agentInfo?.name ?? null);
    wireExitHandler(newHandle);
  }
};
```

### 9. Conversation Continuity

A reconnected agent starts a fresh ACP session. The conversation history
visible in the TUI is preserved (it lives in `ConversationState` which is
independent of the connection), but the agent has no memory of prior context.

Options for context replay (future enhancement, not in this PR):

- **Option A -- Prompt replay:** On reconnect, replay the conversation as a
  single concatenated system prompt. Risk: token cost and context window limits.
- **Option B -- Session resume:** If the ACP protocol gains a `resumeSession`
  RPC (the SDK already exports `LoadSessionRequest` / `LoadSessionResponse`
  types which hint at future support), use the previous `sessionId` to restore
  server-side state. This depends on agent implementation support.
- **Option C -- No replay (recommended for v1):** Accept that reconnection
  starts a fresh context. The TUI shows a system message:
  `"--- Agent reconnected (new session) ---"` as a visual separator.

For v1, Option C is recommended. It is simple, predictable, and avoids subtle
bugs from partial context replay.

To support this, add a `SystemMessage` type to `ConversationItem`:

```typescript
// acp/types.ts -- addition
export interface SystemMessage {
  type: 'system_message';
  text: string;
  timestamp: number;
}

// Update ConversationItem union:
export type ConversationItem =
  | UserMessage
  | AssistantMessage
  | ToolCallItem
  | PlanItem
  | ThinkingItem
  | SystemMessage;
```

And a helper on `ConversationState`:

```typescript
// state/conversation.ts -- addition
addSystemMessage(text: string): void {
  this.items.push({
    type: 'system_message',
    text,
    timestamp: Date.now(),
  });
}
```

After successful reconnection, insert the separator:

```typescript
appState.conversation.addSystemMessage('Agent reconnected (new session)');
```

### 10. AppState Additions

```typescript
// Additions to AppState class

import type { ConnectionPhase, ConnectionStatus } from './connection-state';
import { DEFAULT_RECONNECTION_CONFIG } from '../acp/reconnection-manager';

// Replace the boolean field:
//   isConnected = false;
// With:

private _connectionStatus: ConnectionStatus = {
  phase: 'connecting',
  attempt: 0,
  maxAttempts: DEFAULT_RECONNECTION_CONFIG.maxAttempts,
  lastError: null,
  nextRetryAt: null,
};

get connectionStatus(): ConnectionStatus {
  return this._connectionStatus;
}

// Backward compat -- computed from phase
get isConnected(): boolean {
  return this._connectionStatus.phase === 'connected';
}

set isConnected(value: boolean) {
  // No-op setter to avoid breaking existing code that sets this.
  // The real state is driven by setConnectionPhase().
}

setConnectionPhase(
  phase: ConnectionPhase,
  attempt: number,
  error: string | null,
  nextRetryAt: number | null = null,
): void {
  this._connectionStatus = {
    ...this._connectionStatus,
    phase,
    attempt,
    lastError: error,
    nextRetryAt,
  };
  this.notifyListeners();
}

// Update setConnected to use the new state machine:
setConnected(sessionId: string, agentName: string | null): void {
  this.sessionId = sessionId;
  this.agentName = agentName;
  this.error = null;
  this.setConnectionPhase('connected', 0, null);
}

// Update onConnectionClosed to use the new state machine:
onConnectionClosed(reason: string): void {
  this.handleError(`Agent disconnected: ${reason}`);
  // Phase transition is handled by the caller (ReconnectionManager callback)
  // so we do NOT set phase here -- we only set the error.
}
```

### 11. Backoff Schedule (Default Configuration)

| Attempt | Base Delay | With Jitter (approx) |
|---------|------------|----------------------|
| 1       | 1 s        | 1.0 -- 1.3 s        |
| 2       | 2 s        | 2.0 -- 2.6 s        |
| 3       | 4 s        | 4.0 -- 5.2 s        |
| 4       | 8 s        | 8.0 -- 10.4 s       |
| 5       | 16 s       | 16.0 -- 20.8 s      |

Total worst-case wait before giving up: ~40 seconds. This is aggressive enough
to recover from transient crashes (OOM killer, temporary resource exhaustion)
without making the user wait too long for permanent failures (missing binary,
configuration error).

The jitter factor (0.3) prevents thundering-herd effects if multiple instances
are running against the same agent binary. It is deliberately small because the
typical deployment is a single TUI instance.

### 12. Configuration via Config File

Extend `UserConfig` and `AppConfig` in `state/config.ts` to allow users to
tune reconnection behavior:

```typescript
// Additions to UserConfig
interface UserConfig {
  // ... existing fields ...
  reconnect?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterFactor?: number;
    autoReconnect?: boolean;  // false to disable auto-reconnect entirely
  };
}

// Additions to AppConfig
export interface AppConfig {
  // ... existing fields ...
  reconnect: ReconnectionConfig & { autoReconnect: boolean };
}
```

This allows power users to disable reconnection entirely (for debugging) or
increase the retry count for unreliable environments.

### 13. Cleanup Procedure Update

The `cleanup()` function in `index.ts` must account for the reconnection
manager:

```typescript
const cleanup = () => {
  // Abort any in-progress reconnection
  reconnManager.abort();
  // Clean up client resources (terminals)
  live.current.client.cleanup();
  // Kill the agent process
  live.current.agent.kill();
  // Close log file
  closeLogFile();
};
```

### 14. SIGINT/SIGTERM During Reconnection

If the user presses Ctrl+C while a reconnection attempt is in progress, the
behavior should be:

1. `reconnManager.abort()` is called, which cancels the sleep timer.
2. The `reconnect()` async loop exits on the next iteration check (`this.aborted`).
3. `cleanup()` proceeds normally.
4. `process.exit(0)` terminates the process.

This is already handled by the existing SIGINT handler calling `cleanup()`,
provided `cleanup()` calls `reconnManager.abort()` as shown above.

### 15. Interaction with Gap P02 (Heartbeat Monitoring)

The heartbeat monitor (Gap P02) and the reconnection manager are complementary.
The lifecycle when both are implemented:

```
connected + heartbeat running
  |
  | (agent process exits OR 3 missed heartbeats)
  v
heartbeat.stop()
appState.onConnectionClosed(reason)
  |
  v (if shouldAutoReconnect)
ReconnectionManager.reconnect()
  |
  +----> success: heartbeat.reset() + heartbeat.start()
  |                wireExitHandler(newHandle)
  |
  +----> failure: disconnected state (TUI shows retry prompt)
```

When the heartbeat monitor detects an unhealthy agent (alive but unresponsive),
it should:

1. Stop the heartbeat loop.
2. Kill the old agent process (`live.current.agent.kill()`).
3. Trigger the reconnection manager.

This avoids a conflict where the `onExit` handler and the heartbeat `unhealthy`
callback both try to start reconnection simultaneously. The rule is: **whoever
detects the failure first kills the agent and starts reconnection; the other
observer sees the already-transitioning state and does nothing.** The
`if (appState.connectionStatus.phase === 'reconnecting') return;` guard at the
top of the `onExit` handler ensures idempotency.

## Files to Modify

| File | Change |
|------|--------|
| `src/acp/reconnection-manager.ts` | **New file.** `ReconnectionManager` class, config types, backoff logic. |
| `src/acp/exit-classifier.ts` | **New file.** `shouldAutoReconnect()` function for exit code/signal classification. |
| `src/state/connection-state.ts` | **New file.** `ConnectionPhase`, `ConnectionStatus` types. |
| `src/acp/types.ts` | Add `SystemMessage` interface to `ConversationItem` union. |
| `src/state/app-state.ts` | Replace `isConnected` boolean with `ConnectionStatus` object. Add `setConnectionPhase()`. Keep `isConnected` as computed getter for backward compat. Update `setConnected()` and `onConnectionClosed()`. |
| `src/state/conversation.ts` | Add `addSystemMessage(text: string)` method. |
| `src/state/config.ts` | Extend `UserConfig` and `AppConfig` with reconnection configuration. |
| `src/acp/connection.ts` | No changes needed. `connectToAgent()` is already idempotent -- it creates fresh resources on each call. |
| `src/index.ts` | Major refactor: introduce `LiveHandle` wrapper, instantiate `ReconnectionManager`, extract `wireExitHandler()`, add `shouldAutoReconnect()` classification, guard `handleSubmit`/`handleCancel` against disconnected state, update `cleanup()` to abort reconnection, add `handleManualRetry` callback. |
| `src/app.ts` | Add `onManualRetry` prop to `App` widget. Read `connectionStatus.phase` in `FocusScope.onKey` to handle Enter-to-retry. Pass connection phase to `BottomGrid`. |
| `src/widgets/bottom-grid.ts` | Accept and display connection phase. Show "Reconnecting (attempt N/M)..." or "Disconnected. Press Enter to retry." |
| `src/widgets/chat-view.ts` | Add rendering logic for `SystemMessage` items (the reconnection separator). |

## Complete Refactored `index.ts` Sketch

Below is a comprehensive sketch of the refactored `index.ts` showing how all
pieces fit together. This is not a literal diff -- it is a structural guide:

```typescript
#!/usr/bin/env bun

import { parseArgs } from './state/config';
import { setLogLevel, log, initLogFile, closeLogFile } from './utils/logger';
import { AppState } from './state/app-state';
import { connectToAgent, sendPrompt, cancelPrompt } from './acp/connection';
import type { ConnectionHandle } from './acp/connection';
import { ReconnectionManager } from './acp/reconnection-manager';
import { shouldAutoReconnect } from './acp/exit-classifier';
import { startTUI } from './app';

interface LiveHandle {
  current: ConnectionHandle;
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  setLogLevel(config.logLevel);
  initLogFile();

  const appState = new AppState();
  appState.cwd = config.cwd;
  appState.setConnectionPhase('connecting', 0, null);

  // ... git branch detection (unchanged) ...

  // Initial connection
  let initialHandle: ConnectionHandle;
  try {
    initialHandle = await connectToAgent(
      config.agentCommand, config.agentArgs, config.cwd, appState,
    );
    appState.setConnected(initialHandle.sessionId, initialHandle.agentInfo?.name ?? null);
  } catch (err) {
    // ... existing error handling, process.exit(1) ...
  }

  const live: LiveHandle = { current: initialHandle };

  // Reconnection manager
  const reconnManager = new ReconnectionManager(
    config.agentCommand, config.agentArgs, config.cwd, appState,
    (phase, attempt, error, nextRetryAt) => {
      appState.setConnectionPhase(phase, attempt, error ?? null, nextRetryAt ?? null);
    },
    config.reconnect, // User-configurable overrides
  );

  // Exit handler (re-registered after each reconnection)
  function wireExitHandler(h: ConnectionHandle): void {
    h.agent.onExit(async (code, signal) => {
      if (appState.connectionStatus.phase === 'reconnecting') return;

      const reason = signal ? `killed by ${signal}` : `exited with code ${code}`;
      log.error(`Agent process ${reason}`);
      appState.onConnectionClosed(reason);
      live.current.client.cleanup();

      if (config.reconnect.autoReconnect && shouldAutoReconnect(code, signal)) {
        const newHandle = await reconnManager.reconnect();
        if (newHandle) {
          live.current = newHandle;
          appState.setConnected(newHandle.sessionId, newHandle.agentInfo?.name ?? null);
          appState.conversation.addSystemMessage('Agent reconnected (new session)');
          wireExitHandler(newHandle);
        }
      } else {
        appState.setConnectionPhase('disconnected', 0, `Agent ${reason}`);
      }
    });
  }
  wireExitHandler(live.current);

  // Cleanup
  const cleanup = () => {
    reconnManager.abort();
    live.current.client.cleanup();
    live.current.agent.kill();
    closeLogFile();
  };
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });

  // Prompt submission
  const handleSubmit = async (text: string): Promise<void> => {
    const h = live.current;
    if (!h.sessionId) return;
    if (appState.connectionStatus.phase !== 'connected') {
      appState.setError('Cannot send: agent is not connected');
      return;
    }
    appState.startProcessing(text);
    try {
      const result = await sendPrompt(h.connection, h.sessionId, text);
      appState.onPromptComplete(h.sessionId, result.stopReason);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`Prompt failed: ${msg}`);
      appState.handleError(msg);
    }
  };

  // Cancel
  const handleCancel = async (): Promise<void> => {
    const h = live.current;
    if (!h.sessionId || !appState.isProcessing) {
      if (appState.connectionStatus.phase === 'reconnecting') {
        reconnManager.abort();
      }
      cleanup();
      process.exit(0);
    }
    try {
      await cancelPrompt(h.connection, h.sessionId);
    } catch (err) {
      log.error('Cancel failed:', err);
    }
  };

  // Manual retry (called from TUI when Enter is pressed in disconnected state)
  const handleManualRetry = async (): Promise<void> => {
    reconnManager.reset();
    const newHandle = await reconnManager.reconnect();
    if (newHandle) {
      live.current = newHandle;
      appState.setConnected(newHandle.sessionId, newHandle.agentInfo?.name ?? null);
      appState.conversation.addSystemMessage('Agent reconnected (new session)');
      wireExitHandler(newHandle);
    }
  };

  // Start TUI (updated to pass onManualRetry)
  await startTUI(appState, handleSubmit, handleCancel, handleManualRetry);
}

main().catch((err) => {
  process.stderr.write(`\nFatal error: ${err.message}\n`);
  process.exit(1);
});
```

## Testing Strategy

### Unit tests for `ReconnectionManager`

1. **Success on first attempt:** Mock `connectToAgent` to succeed immediately.
   Verify `attempt === 0` (reset after success), `phase === 'connected'`, and
   the returned handle matches the mock.

2. **Fail N times then succeed:** Mock `connectToAgent` to fail 3 times then
   succeed. Verify attempt count increments (1, 2, 3, then 4 succeeds),
   delay progression matches exponential backoff, and that the returned handle
   is from the successful call.

3. **Exhaust all attempts:** Mock `connectToAgent` to fail all 5 times. Verify
   `null` return and final phase callback is `('disconnected', 5, 'All reconnection attempts exhausted')`.

4. **Abort mid-reconnection:** Start `reconnect()`, then call `abort()` after
   the first failed attempt. Verify the loop exits cleanly and returns `null`
   without firing the `disconnected` callback.

5. **Reset and retry:** After exhaustion, call `reset()` then `reconnect()`
   again. Verify it starts fresh from attempt 1.

6. **Backoff timing:** Mock `Date.now()` and `Math.random()`. Verify that the
   computed delays match the expected exponential + jitter formula for each
   attempt.

### Unit tests for `shouldAutoReconnect`

| Input | Expected |
|-------|----------|
| `(null, 'SIGKILL')` | `true` |
| `(null, 'SIGSEGV')` | `true` |
| `(null, 'SIGABRT')` | `true` |
| `(null, 'SIGTERM')` | `false` |
| `(0, null)` | `false` |
| `(1, null)` | `true` |
| `(127, null)` | `false` |
| `(137, null)` | `true` (exit 137 = killed by signal 9 on Linux) |

### Unit tests for `AppState` connection phase

1. Verify `setConnectionPhase` updates `connectionStatus` and notifies listeners.
2. Verify `isConnected` backward-compat getter returns `true` only when
   `phase === 'connected'`.
3. Verify `setConnected()` transitions phase to `connected` and clears error.
4. Verify `onConnectionClosed()` sets error but does not change phase (that is
   the responsibility of the `ReconnectionManager` callback).

### Integration test (manual)

1. Start flitter-amp with a real agent.
2. Send `kill -9 <agent_pid>` from another terminal.
3. Verify the TUI shows "Reconnecting (attempt 1/5)..." and recovers within
   ~5 seconds (first attempt delay is ~1s).
4. Verify a new prompt can be sent after reconnection.
5. Verify the conversation shows the "Agent reconnected (new session)" separator.
6. Kill the agent 6 times rapidly to exhaust retries. Verify the TUI shows
   the disconnected message with the Enter-to-retry affordance.
7. Press Enter. Verify reconnection starts again from attempt 1.
8. Press Ctrl+C during reconnection. Verify clean exit with no orphaned processes.

### Edge cases

1. **Agent dies mid-stream (during a prompt response):** The partial response
   text is preserved in `ConversationState._streamingMessage`. The prompt's
   `await` rejects, `handleError()` is called which finalizes the streaming
   message and sets `isProcessing = false`. The `onExit` handler starts
   reconnection. After reconnection, the user sees the partial response followed
   by the system separator message and can continue.

2. **Agent dies during the reconnection handshake itself:** If `connectToAgent()`
   spawns the process but `initialize()` or `newSession()` fails, the error
   is caught in the `reconnect()` loop, the attempt counter increments, and the
   next retry proceeds. The failed process is not tracked -- `connectToAgent()`
   creates and returns resources atomically, so a failure means the handle was
   never returned and the process will be garbage collected (its streams close).
   **NOTE:** This is a potential process leak. The spawned-but-failed process
   should be explicitly killed. Add a `try/catch` inside `connectToAgent` that
   kills the spawned process on initialization failure:

   ```typescript
   // In connectToAgent, wrap the init/session calls:
   try {
     const initResponse = await connection.initialize(...);
     const sessionResponse = await connection.newSession(...);
     return { connection, client, agent, ... };
   } catch (err) {
     agent.kill(); // Prevent zombie process
     throw err;
   }
   ```

3. **User presses Ctrl+C during reconnection:** `reconnManager.abort()` is
   called by the SIGINT handler via `cleanup()`. The `sleep()` timer is
   cleared, the loop exits, and `process.exit(0)` runs.

4. **Rapid sequential kills:** If the agent is killed again immediately after
   a successful reconnection (before the `onExit` handler is fully wired),
   the `if (appState.connectionStatus.phase === 'reconnecting') return;` guard
   prevents double-entry. However, there is a brief window between
   `wireExitHandler(newHandle)` and the `onExit` promise resolving where a
   second kill could be lost. This is acceptable -- the process exit will
   eventually fire the handler.

5. **Mid-reconnection user input:** The input guard
   (`connectionStatus.phase !== 'connected'`) prevents any prompts from being
   sent. The input area is visually dimmed. Queuing user input for replay after
   reconnection is explicitly out of scope for v1.

## Migration Path

The changes are backward-compatible. Existing behavior (error + inert state)
is preserved for users who disable auto-reconnect via config. The `isConnected`
boolean is maintained as a computed property so no existing code breaks. The
`onConnectionClosed` callback signature is unchanged. New files are additive.
The only breaking change is the `App` widget receiving a new `onManualRetry`
prop, which can be made optional with a default no-op.
