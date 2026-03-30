# Gap P04 (#60): Graceful ACP-Level Session Close

## Problem Statement

When the user exits flitter-amp -- whether via Ctrl+C, SIGTERM, or the
idle-cancel path in the TUI -- the application tears down resources using a
brute-force approach that skips any ACP protocol-level session shutdown. The
current `cleanup()` function in `src/index.ts` (lines 73-77) does three things
in rapid succession:

```typescript
const cleanup = () => {
  handle.client.cleanup();   // SIGTERM all terminal child processes
  handle.agent.kill();        // SIGTERM agent, then SIGKILL after 3 seconds
  closeLogFile();
};
```

There is **no `closeSession` call** at the ACP level. The agent subprocess
receives SIGTERM without any prior protocol notification. The JSON-RPC
connection is severed by force, leaving the agent no opportunity to:

1. **Persist session state** -- conversation history, tool results, checkpoints,
   partial edits, or any internal state the agent needs for session resumption.
2. **Release server-side resources** -- MCP server connections, model context
   caches, temporary allocations, API sessions held open by the agent.
3. **Flush in-progress writes** -- partial file edits that have been staged but
   not committed, queued terminal commands, or buffered output.
4. **Clean up agent-side temporary files** -- scratch directories, downloaded
   artifacts, intermediate computation results.
5. **Acknowledge the shutdown** -- return a final status so the client knows
   whether the close was clean or dirty.

### How the Current Code Reaches `cleanup()`

There are exactly three code paths that trigger `cleanup()`:

**Path 1: SIGINT handler (line 78-82)**
```typescript
process.on('SIGINT', () => {
  log.info('Received SIGINT, shutting down...');
  cleanup();
  process.exit(0);
});
```
This fires when the user presses Ctrl+C at any time. It is synchronous and
calls `process.exit(0)` inline, making it impossible to perform any async work
such as a JSON-RPC round-trip.

**Path 2: SIGTERM handler (lines 83-86)**
```typescript
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
```
Identical behavior to SIGINT. Typically sent by process managers (systemd,
Docker, orchestrators) to request graceful termination, but the handler does
not honor the "graceful" part.

**Path 3: handleCancel while idle (lines 104-109)**
```typescript
const handleCancel = async (): Promise<void> => {
  if (!handle.sessionId || !appState.isProcessing) {
    cleanup();
    process.exit(0);
  }
  // ... cancelPrompt path ...
};
```
When the user presses Escape/Ctrl+C in the TUI while no prompt is processing,
the TUI layer calls `handleCancel`, which falls into the `!isProcessing`
branch and immediately calls `cleanup()` + `process.exit(0)`.

All three paths share the same problem: `cleanup()` is synchronous, and
`process.exit()` is called immediately after, preventing any asynchronous
protocol negotiation.

### Relevant ACP SDK API

The ACP SDK (`@agentclientprotocol/sdk@^0.16.0`, declared in
`packages/flitter-amp/package.json`) provides an `unstable_closeSession`
method on `ClientSideConnection` designed for this exact purpose:

```typescript
unstable_closeSession(params: CloseSessionRequest): Promise<CloseSessionResponse>

type CloseSessionRequest = {
  _meta?: { [key: string]: unknown } | null;
  sessionId: SessionId;
};

type CloseSessionResponse = {
  _meta?: { [key: string]: unknown } | null;
};
```

This method is gated behind the `session.close` capability flag. When called,
it implicitly cancels any ongoing work (equivalent to calling `session/cancel`
first) and then instructs the agent to free all resources associated with the
session. The current codebase never invokes it.

The SDK also exposes two connection lifecycle primitives:

- `connection.closed: Promise<void>` -- resolves when the underlying transport
  stream closes (either normally or due to error).
- `connection.signal: AbortSignal` -- aborts when the connection closes; can be
  used to cancel in-flight operations.

Neither is wired up in the current code.

### Impact Matrix

| Scenario | Current Behavior | Desired Behavior |
|----------|-----------------|------------------|
| Ctrl+C while idle | Agent killed immediately via SIGTERM | `closeSession` sent first; agent shuts down gracefully; force-kill only if agent hangs |
| Ctrl+C during prompt | `cancelPrompt` sent, but second Ctrl+C kills immediately | `cancelPrompt`, wait for ack, `closeSession`, then graceful teardown |
| SIGTERM from process manager | Identical to Ctrl+C | `closeSession` with short deadline, then force kill if needed |
| Agent crash during close | N/A (no close attempted) | Timeout protects against hang; force kill fires after deadline |
| Session state persistence | Lost entirely | Agent receives `closeSession` and can persist before exiting |

---

## Current Code Analysis

### `ConnectionHandle` (connection.ts lines 8-15)

```typescript
export interface ConnectionHandle {
  connection: acp.ClientSideConnection;
  client: FlitterClient;
  agent: AgentProcess;
  capabilities: acp.AgentCapabilities | undefined;
  agentInfo?: { name?: string; title?: string };
  sessionId: string;
}
```

The `capabilities` field stores the agent's capability set returned during
`initialize`, but it is **never inspected** after initialization. It is logged
at line 59 (`log.info('Agent capabilities:', ...)`) but no behavior is gated on
it. The `session.close` capability, if present, is recorded but ignored.

### `connectToAgent()` (connection.ts lines 28-77)

The connection flow is correct and well-structured:
1. Spawn agent process
2. Create ndJSON stream over stdin/stdout
3. Create `ClientSideConnection` with `FlitterClient`
4. Send `initialize` request
5. Create a new session via `newSession()`
6. Return the `ConnectionHandle`

There is no teardown counterpart. The function creates the session but provides
no mechanism to close it.

### `AgentProcess.kill()` (process.ts lines 125-135)

```typescript
kill() {
  if (!proc.killed) {
    log.info('Killing agent process');
    proc.kill();             // SIGTERM
    setTimeout(() => {
      if (!proc.killed) {
        log.warn('Agent did not exit, sending SIGKILL');
        proc.kill(9);        // SIGKILL after 3s
      }
    }, 3000);
  }
}
```

This is a two-phase kill: SIGTERM immediately, SIGKILL after 3 seconds. The
agent may or may not handle SIGTERM gracefully, but the ACP protocol is not
involved at all. The agent's JSON-RPC connection is already dead or dying by
the time SIGTERM arrives (since `handle.client.cleanup()` is called first,
which may disrupt the transport).

### `FlitterClient.cleanup()` (client.ts lines 235-241)

```typescript
cleanup(): void {
  for (const [_id, proc] of this.terminals) {
    if (!proc.killed) proc.kill('SIGTERM');
  }
  this.terminals.clear();
  this.terminalBuffers.clear();
}
```

This handles client-side terminal child processes only. It is correct and must
remain as part of the shutdown sequence. Terminal processes are local resources
unrelated to the ACP session protocol.

---

## Proposed Solution

The solution introduces four coordinated changes:

1. A **capability detection helper** to check if the agent supports `session.close`
2. A **`closeSession` wrapper** with timeout and fallback logic
3. An **async `gracefulShutdown` orchestrator** that replaces the synchronous `cleanup()`
4. **Updated signal handlers and cancel flow** that defer to the async shutdown

### 1. New File: `src/acp/capabilities.ts`

A focused utility module for inspecting agent capabilities:

```typescript
// src/acp/capabilities.ts

import type * as acp from '@agentclientprotocol/sdk';

/**
 * Check whether the connected agent advertises a specific session capability.
 *
 * The ACP AgentCapabilities object can contain a `session` sub-object with
 * boolean flags for optional session lifecycle features. This helper
 * safely navigates the nested structure.
 */
export function hasSessionCapability(
  capabilities: acp.AgentCapabilities | undefined,
  capability: string,
): boolean {
  if (!capabilities) return false;
  const session = (capabilities as Record<string, unknown>).session;
  if (!session || typeof session !== 'object') return false;
  return (session as Record<string, unknown>)[capability] === true;
}

/**
 * Check whether the agent supports the session.close capability.
 *
 * When true, the client can call `unstable_closeSession` to request
 * graceful session teardown before killing the agent process.
 */
export function supportsCloseSession(
  capabilities: acp.AgentCapabilities | undefined,
): boolean {
  return hasSessionCapability(capabilities, 'close');
}
```

### 2. Addition to `src/acp/connection.ts`: `closeSession` Export

```typescript
import { supportsCloseSession } from './capabilities';

/** Timeout for the closeSession RPC. 5 seconds is generous. */
const CLOSE_SESSION_TIMEOUT_MS = 5_000;

/**
 * Attempt to gracefully close an ACP session.
 *
 * If the agent advertises `session.close`, sends a `closeSession` request
 * with a timeout. If the agent does not support it, or if the request
 * fails or times out, returns false so the caller can fall back to a
 * hard kill.
 *
 * This function NEVER throws. All errors are logged and swallowed.
 * The caller does not need to wrap this in try/catch.
 */
export async function closeSession(
  connection: acp.ClientSideConnection,
  sessionId: string,
  capabilities: acp.AgentCapabilities | undefined,
  timeoutMs: number = CLOSE_SESSION_TIMEOUT_MS,
): Promise<boolean> {
  if (!supportsCloseSession(capabilities)) {
    log.info(
      'Agent does not advertise session.close capability; skipping closeSession',
    );
    return false;
  }

  log.info(
    `Sending closeSession for session ${sessionId} (timeout: ${timeoutMs}ms)`,
  );

  try {
    const closePromise = (connection as any).unstable_closeSession({
      sessionId,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`closeSession timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    await Promise.race([closePromise, timeoutPromise]);
    log.info('Session closed gracefully');
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`closeSession failed: ${message}`);
    return false;
  }
}
```

The `as any` cast on `connection` is a pragmatic choice. The method is
prefixed with `unstable_`, meaning it may not be present in all TypeScript
type declarations depending on the SDK version. The capability check above
ensures we only call it when the agent has declared support, and the
try/catch ensures a clean fallback if the method does not exist at runtime.

### 3. Addition to `src/acp/connection.ts`: `ConnectionHandle` Extension

Add a precomputed boolean for efficient access during shutdown:

```typescript
export interface ConnectionHandle {
  connection: acp.ClientSideConnection;
  client: FlitterClient;
  agent: AgentProcess;
  capabilities: acp.AgentCapabilities | undefined;
  agentInfo?: { name?: string; title?: string };
  sessionId: string;
  supportsCloseSession: boolean;  // NEW: precomputed from capabilities
}
```

Set it at the end of `connectToAgent()`:

```typescript
return {
  connection,
  client,
  agent,
  capabilities: initResponse.agentCapabilities,
  agentInfo: initResponse.agentInfo as { name?: string; title?: string } | undefined,
  sessionId: sessionResponse.sessionId,
  supportsCloseSession: supportsCloseSession(initResponse.agentCapabilities),
};
```

Log it after connection for diagnostic visibility:

```typescript
log.info(`Agent supports session.close: ${handle.supportsCloseSession}`);
```

### 4. New Async Shutdown Orchestrator in `src/index.ts`

Replace the synchronous `cleanup()` with a proper async shutdown function:

```typescript
/**
 * Timeouts for the graceful shutdown sequence.
 *
 * SHUTDOWN_DEADLINE_MS caps the total time for Steps 1-3.
 * AGENT_EXIT_GRACE_MS is how long we wait for the agent to exit
 * voluntarily after receiving closeSession.
 */
const SHUTDOWN_DEADLINE_MS = 8_000;
const AGENT_EXIT_GRACE_MS = 2_000;

/** Guard against re-entrant shutdown (e.g., SIGINT during shutdown). */
let shutdownInProgress = false;

/**
 * Perform a graceful shutdown of the ACP session and agent process.
 *
 * Sequence:
 *   1. Cancel any in-flight prompt (if processing).
 *   2. Send closeSession to the agent (if capability supported, with timeout).
 *   3. Wait briefly for the agent process to exit on its own.
 *   4. If the agent is still alive, kill it (SIGTERM -> SIGKILL).
 *   5. Clean up client-side resources (terminals).
 *   6. Close the log file.
 *
 * The entire sequence is bounded by SHUTDOWN_DEADLINE_MS. If the deadline
 * expires, remaining steps are skipped and the agent is force-killed.
 */
async function gracefulShutdown(
  handle: ConnectionHandle,
  appState: AppState,
): Promise<void> {
  if (shutdownInProgress) {
    log.warn('Shutdown already in progress, forcing immediate exit');
    handle.agent.kill();
    closeLogFile();
    return;
  }
  shutdownInProgress = true;

  const deadline = Date.now() + SHUTDOWN_DEADLINE_MS;

  // Step 1: Cancel in-flight prompt if the agent is currently processing
  if (appState.isProcessing && handle.sessionId) {
    log.info('Cancelling in-flight prompt before shutdown...');
    try {
      const cancelTimeout = Math.min(2_000, deadline - Date.now());
      if (cancelTimeout > 0) {
        await Promise.race([
          cancelPrompt(handle.connection, handle.sessionId),
          new Promise<void>((resolve) => setTimeout(resolve, cancelTimeout)),
        ]);
      }
    } catch (err) {
      log.warn('Cancel during shutdown failed:', err);
    }
  }

  // Step 2: Send closeSession (if agent supports it and deadline allows)
  if (handle.sessionId && Date.now() < deadline) {
    const remainingMs = Math.min(5_000, deadline - Date.now());
    if (remainingMs > 500) {
      await closeSession(
        handle.connection,
        handle.sessionId,
        handle.capabilities,
        remainingMs,
      );
    }
  }

  // Step 3: Wait briefly for the agent to exit on its own after closeSession
  if (Date.now() < deadline) {
    const graceMs = Math.min(AGENT_EXIT_GRACE_MS, deadline - Date.now());
    log.info(`Waiting up to ${graceMs}ms for agent to exit voluntarily...`);

    const exited = await Promise.race([
      new Promise<boolean>((resolve) => {
        handle.agent.onExit(() => resolve(true));
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), graceMs);
      }),
    ]);

    if (exited) {
      log.info('Agent exited voluntarily after closeSession');
    } else {
      log.info('Agent did not exit voluntarily; proceeding to kill');
    }
  }

  // Step 4: Kill agent if still alive
  handle.agent.kill();

  // Step 5: Clean up client-side terminal resources
  handle.client.cleanup();

  // Step 6: Close log file (always last)
  closeLogFile();
}
```

The synchronous `cleanup()` is **retained** as a fast emergency path for the
second-Ctrl+C force exit scenario:

```typescript
const cleanup = () => {
  handle.client.cleanup();
  handle.agent.kill();
  closeLogFile();
};
```

### 5. Updated Signal Handlers

The signal handlers are rewritten to initiate the async graceful shutdown
while preserving a hard deadline safety net:

```typescript
let forceExitTimer: ReturnType<typeof setTimeout> | null = null;

process.on('SIGINT', () => {
  if (shutdownInProgress) {
    // Second Ctrl+C during graceful shutdown = force exit immediately
    log.warn('Force exit requested (second SIGINT)');
    cleanup();
    process.exit(1);
  }

  log.info('Received SIGINT, initiating graceful shutdown...');

  // Hard deadline: if graceful shutdown hangs, force exit
  forceExitTimer = setTimeout(() => {
    log.error('Graceful shutdown timed out, forcing exit');
    cleanup();
    process.exit(1);
  }, SHUTDOWN_DEADLINE_MS + 1_000);

  gracefulShutdown(handle, appState)
    .then(() => {
      if (forceExitTimer) clearTimeout(forceExitTimer);
      process.exit(0);
    })
    .catch((err) => {
      log.error('Graceful shutdown error:', err);
      if (forceExitTimer) clearTimeout(forceExitTimer);
      cleanup();
      process.exit(1);
    });
});

process.on('SIGTERM', () => {
  log.info('Received SIGTERM, initiating graceful shutdown...');

  forceExitTimer = setTimeout(() => {
    log.error('Graceful shutdown timed out after SIGTERM, forcing exit');
    cleanup();
    process.exit(1);
  }, SHUTDOWN_DEADLINE_MS + 1_000);

  gracefulShutdown(handle, appState)
    .then(() => {
      if (forceExitTimer) clearTimeout(forceExitTimer);
      process.exit(0);
    })
    .catch(() => {
      if (forceExitTimer) clearTimeout(forceExitTimer);
      cleanup();
      process.exit(1);
    });
});
```

### 6. Updated `handleCancel` Flow

The cancel handler now calls `gracefulShutdown` when the user is idle instead
of the synchronous `cleanup()`:

```typescript
const handleCancel = async (): Promise<void> => {
  if (!handle.sessionId || !appState.isProcessing) {
    // Not processing -- initiate graceful shutdown instead of hard kill
    await gracefulShutdown(handle, appState);
    process.exit(0);
  }
  // Currently processing -- cancel the prompt only
  try {
    await cancelPrompt(handle.connection, handle.sessionId);
  } catch (err) {
    log.error('Cancel failed:', err);
  }
};
```

### 7. Wire `connection.closed` for Passive Close Detection

Add this after `connectToAgent()` succeeds in `main()`:

```typescript
handle.connection.closed.then(() => {
  if (appState.isConnected) {
    log.info('ACP connection stream closed');
    if (!shutdownInProgress) {
      // Agent closed the connection from its side -- unexpected disconnect
      appState.onConnectionClosed('Connection closed by agent');
    }
    // If shutdownInProgress, this is expected (we are tearing down)
  }
});
```

This catches the case where the agent closes its side of the JSON-RPC stream
(e.g., after processing `closeSession`, the agent closes stdin/stdout and
exits). Without this listener, the client has no way to detect agent-initiated
connection termination other than through the `onExit` handler, which fires
only when the OS process exits.

---

## Complete Shutdown Sequence Diagram

```
User presses Ctrl+C (idle)
  |
  v
handleCancel() detects !isProcessing
  |
  v
gracefulShutdown(handle, appState)
  |
  +-- [Step 1] appState.isProcessing?
  |     |
  |     +-- YES: cancelPrompt(connection, sessionId) with 2s timeout
  |     +-- NO:  skip (common case for idle exit)
  |
  +-- [Step 2] supportsCloseSession(capabilities)?
  |     |
  |     +-- YES: connection.unstable_closeSession({ sessionId })
  |     |         with min(5s, remaining deadline) timeout
  |     |         |
  |     |         +-- Success: log "Session closed gracefully"
  |     |         +-- Timeout: log warning, continue to Step 3
  |     |         +-- Error:   log warning, continue to Step 3
  |     |
  |     +-- NO:  log "Agent does not support session.close", skip
  |
  +-- [Step 3] Wait up to 2s for agent to exit voluntarily
  |     |
  |     +-- Agent exited: log "Agent exited voluntarily"
  |     +-- Timeout: log "Agent did not exit, proceeding to kill"
  |
  +-- [Step 4] handle.agent.kill()
  |             SIGTERM immediately; SIGKILL escalation after 3s
  |
  +-- [Step 5] handle.client.cleanup()
  |             SIGTERM all terminal child processes; clear maps
  |
  +-- [Step 6] closeLogFile()
  |
  v
process.exit(0)
```

### Timing Analysis

**Best case (cooperative agent with session.close):**
- Step 1: 0ms (idle, skipped)
- Step 2: <100ms (closeSession round-trip)
- Step 3: <100ms (agent exits immediately after closeSession)
- Steps 4-6: <10ms (kill is a no-op, cleanup is synchronous)
- **Total: ~200ms**

**Worst case (agent hangs on everything):**
- Step 1: 2,000ms (cancel timeout)
- Step 2: 5,000ms (closeSession timeout)
- Step 3: 1,000ms (remaining deadline)
- Step 4: 3,000ms (SIGKILL escalation)
- **Total: ~11s** (but SHUTDOWN_DEADLINE_MS caps Steps 1-3 to 8s)

**Force exit (second Ctrl+C):**
- Synchronous `cleanup()` + `process.exit(1)`: **<50ms**

---

## Files to Create / Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/acp/capabilities.ts` | **New** | `supportsCloseSession()` and `hasSessionCapability()` utility functions |
| `src/acp/connection.ts` | **Modify** | Add `closeSession()` export. Add `supportsCloseSession` boolean to `ConnectionHandle`. Import and use capability helper. Set the field in `connectToAgent()`. |
| `src/index.ts` | **Modify** | Add `gracefulShutdown()` async function with the 6-step sequence. Retain synchronous `cleanup()` as emergency fallback. Rewrite SIGINT/SIGTERM handlers to use async graceful shutdown with hard deadline. Update `handleCancel` to call `gracefulShutdown` when idle. Add `shutdownInProgress` re-entrancy guard. Wire `connection.closed` listener. Add `SHUTDOWN_DEADLINE_MS` and `AGENT_EXIT_GRACE_MS` constants. |

---

## Testing Strategy

### Unit Tests: `supportsCloseSession` Capability Helper

| Input | Expected Result |
|-------|-----------------|
| `undefined` | `false` |
| `{}` | `false` |
| `{ session: undefined }` | `false` |
| `{ session: {} }` | `false` |
| `{ session: { close: false } }` | `false` |
| `{ session: { close: true } }` | `true` |
| `{ session: { close: true, fork: true } }` | `true` |
| `{ session: "not-an-object" }` | `false` |

### Unit Tests: `closeSession` Wrapper

1. **Success path.** Mock `capabilities` with `session: { close: true }`.
   Mock `connection.unstable_closeSession` to resolve immediately. Assert
   return value is `true`. Assert the mock was called with `{ sessionId }`.

2. **Timeout path.** Mock `unstable_closeSession` with a never-resolving
   promise. Set `timeoutMs` to 100. Assert return value is `false` within
   approximately 100ms. Assert a warning was logged containing "timed out".

3. **Error path.** Mock `unstable_closeSession` to reject with
   `new Error('connection broken')`. Assert return value is `false`. Assert
   no exception propagates. Assert warning logged with "connection broken".

4. **Capability not supported.** Pass `capabilities` as `{}`. Assert `false`
   returned immediately. Assert `unstable_closeSession` was never called.

5. **Capabilities undefined.** Pass `undefined`. Assert `false` returned.

### Unit Tests: `gracefulShutdown`

1. **Happy path -- agent exits voluntarily.** Mock `closeSession` to return
   `true`. Mock `agent.onExit` to fire within 50ms. Verify `agent.kill()` is
   still called (safety net) but the "Agent exited voluntarily" log appears.

2. **Agent supports close but does not exit.** Mock `closeSession` returning
   `true`. Agent's `onExit` never fires within the grace period. Verify
   `agent.kill()` is called. Verify "proceeding to kill" log appears.

3. **Agent does not support close.** Capabilities lack `session.close`.
   Verify `closeSession` is not called (or returns `false` immediately).
   Verify `agent.kill()` is called promptly.

4. **Active prompt during shutdown.** Set `appState.isProcessing = true`.
   Verify `cancelPrompt` is called before `closeSession`.

5. **Re-entrant shutdown.** Call `gracefulShutdown` twice. Verify the second
   invocation logs "Shutdown already in progress" and calls `agent.kill()`
   directly without going through the full sequence.

6. **Deadline enforcement.** Set `SHUTDOWN_DEADLINE_MS` to 100ms. Mock
   `closeSession` to take 5 seconds. Verify the function completes well
   under 500ms by skipping remaining steps when the deadline passes.

### Integration Tests (Manual)

1. **Cooperative agent.** Start flitter-amp with an agent that advertises
   `session.close`. Send a prompt, wait for completion, press Ctrl+C. Verify
   logs show: "Sending closeSession" -> "Session closed gracefully" ->
   "Agent exited voluntarily" (or "proceeding to kill"). Verify no orphaned
   processes via `ps aux`.

2. **Non-cooperative agent.** Start with an agent that does not advertise
   `session.close`. Press Ctrl+C. Logs should show: "Agent does not advertise
   session.close capability" -> immediate kill. Shutdown should complete in
   under 1 second.

3. **Double Ctrl+C.** Press Ctrl+C once (triggers graceful shutdown), then
   immediately again. Logs should show: "Initiating graceful shutdown" then
   "Force exit requested (second SIGINT)". Process exits within 100ms of the
   second press.

4. **SIGTERM.** Send `kill <pid>` from another terminal. Verify the graceful
   shutdown sequence runs and exit code is 0.

5. **Agent crash during closeSession.** After pressing Ctrl+C in flitter-amp,
   immediately `kill -9 <agent_pid>`. Verify the timeout fires, force kill
   runs, and flitter-amp exits cleanly without hanging.

### Edge Cases

1. **closeSession on a dead connection.** If the agent died before shutdown,
   the `closeSession` call fails immediately (broken stream). The try/catch
   swallows the error, returns `false`, and shutdown proceeds to `agent.kill()`
   which is a no-op since the process is already gone.

2. **Race between cancelPrompt and closeSession.** If a prompt is in-flight,
   Step 1 sends `cancelPrompt` and Step 2 sends `closeSession`. The ACP spec
   says `closeSession` implicitly cancels work, so the explicit cancel is
   technically redundant. However, sending it first is safer: it gives the
   agent an early signal to stop generating, reducing the amount of work that
   `closeSession` needs to clean up.

3. **onExit fires during gracefulShutdown.** If the agent exits on its own
   during Steps 1-3, the `onExit` handler fires. The `shutdownInProgress`
   flag prevents the handler from starting a reconnection attempt (relevant
   if Gap P01 reconnection logic is implemented). The `Promise.race` in
   Step 3 resolves immediately, and shutdown completes normally.

4. **Multiple onExit registrations.** The `AgentProcess.onExit()` in
   `process.ts` uses `proc.exited.then()`, which means each call adds a new
   `.then()` handler. This is safe because Promise `.then()` handlers are
   idempotent once the promise resolves, and multiple registrations do not
   cause duplicate execution of the same callback.

---

## Interaction with Other Gaps

### Gap P01 (Reconnection Logic, #57)

During reconnection, the old session is already dead. No `closeSession` is
needed because the agent process and JSON-RPC stream are already gone.
However, when the reconnection manager's `abort()` is called during cleanup,
`gracefulShutdown` should run against the *current live handle*. The
`shutdownInProgress` flag prevents conflicts between the reconnection
manager and the shutdown sequence.

### Gap P02 (Heartbeat Monitoring, #58)

When the heartbeat monitor detects an unhealthy agent, it should attempt a
short-timeout `closeSession` before triggering reconnection:

```
Heartbeat: unhealthy
  -> closeSession(handle, sessionId, capabilities, 2_000)
  -> handle.agent.kill()
  -> ReconnectionManager.reconnect()
```

This gives the (potentially recoverable) agent one last chance to persist
state before being killed.

### Gap P03 (ACP Type Safety, #59)

The `unstable_closeSession` method is prefixed with `unstable_` and may not
be exposed in all TypeScript declaration configurations. The `as any` cast
in the `closeSession` wrapper is intentional. The type safety gap should
include this method in its audit and add a proper typed wrapper once the SDK
stabilizes the API.

### Gap P05 (Load/Resume Session, #61)

Graceful session close is a prerequisite for reliable session resume. If the
agent persists state during `closeSession`, a subsequent `loadSession()` call
can restore that state. Without a clean close, the persisted state may be
incomplete or corrupted, making resume unreliable.

---

## Migration Path

This change is fully backward-compatible:

- The synchronous `cleanup()` remains for emergency force exits.
- `gracefulShutdown()` calls `closeSession` only when the agent advertises
  `session.close`. For non-supporting agents, behavior is identical to today
  except for added logging.
- The `shutdownInProgress` flag and force exit timer prevent the async
  shutdown from causing the application to hang longer than the current
  synchronous approach.
- `ConnectionHandle` gains one new boolean field (`supportsCloseSession`)
  that is set at construction time and does not affect existing consumers.
- No changes to `FlitterClient`, `AppState`, or TUI widgets are required.
