# Gap P02: Connection Health Monitoring / Heartbeat

## Problem Statement

The ACP connection between flitter-amp and the agent subprocess has no health
monitoring mechanism. Once `connectToAgent()` returns a `ConnectionHandle`, the
system assumes the connection is healthy indefinitely. The only way an unhealthy
connection is detected today is when:

1. The agent process exits (caught by `handle.agent.onExit()` in `index.ts`
   line 64), or
2. A `sendPrompt()` call fails with a write error on the dead stdin stream.

Neither mechanism covers the critical failure class: **a hung agent**. If the
agent subprocess is alive but unresponsive (deadlocked, stuck in an infinite
loop, blocked on I/O, memory thrashing with the OOM killer approaching), there
is no way for the client to detect this. The user experiences a silent hang --
the TUI appears functional, the agent process is running, but prompts are
swallowed into a black hole with no response and no error.

### Concrete failure scenarios not covered today

| Scenario | Process alive? | Streams open? | Detected? |
|----------|---------------|---------------|-----------|
| Agent crashes (SIGSEGV, SIGKILL) | No | No | Yes (onExit) |
| Agent exits cleanly (code 0) | No | No | Yes (onExit) |
| Agent deadlocked (mutex, channel) | Yes | Yes | **No** |
| Agent stuck in CPU loop | Yes | Yes | **No** |
| Agent blocked on external I/O | Yes | Yes | **No** |
| Agent memory-thrashing (pre-OOM) | Yes | Yes | **No** |
| ndJsonStream backpressure stall | Yes | Yes | **No** |
| stdin WritableStream buffer full | Yes | Yes (write hangs) | **No** |

### Code analysis

In `connection.ts`, the `sendPrompt()` function calls `connection.prompt()`
which is a JSON-RPC request over `ndJsonStream`. This request has no timeout --
it awaits indefinitely for a `PromptResponse`. If the agent never responds,
the `await` never resolves, and the TUI hangs.

```typescript
// connection.ts line 89 -- no timeout, no health check
const response = await connection.prompt({
  sessionId,
  prompt: [{ type: 'text', text }],
});
```

Similarly, `connection.initialize()` and `connection.newSession()` have no
timeout protection. A hung agent during initialization would block the entire
startup sequence forever.

The `FlitterClient` class in `client.ts` has no mechanism to proactively probe
the agent. It only reacts to incoming JSON-RPC calls from the agent. If the
agent stops calling, the client has no way to know.

The `AgentProcess` interface in `process.ts` exposes `onExit()` but no
`isResponsive()` or `ping()` method. The process could be alive and consuming
CPU/memory but completely unresponsive to protocol messages.

## Proposed Design

The health monitoring system operates at three layers: (1) a periodic heartbeat
probe, (2) request-level timeouts, and (3) activity-based idle detection. Each
layer catches a different class of failure.

### 1. HeartbeatMonitor Class

Create a new `HeartbeatMonitor` class that runs a periodic ping against the
agent connection and tracks response latency.

```typescript
// acp/heartbeat-monitor.ts

import { log } from '../utils/logger';

export interface HeartbeatConfig {
  /** Interval between heartbeat pings in milliseconds. */
  intervalMs: number;
  /** Maximum time to wait for a pong response before declaring timeout. */
  timeoutMs: number;
  /** Number of consecutive timeouts before declaring the agent unhealthy. */
  maxMissedBeats: number;
  /** Whether to automatically start monitoring on construction. */
  autoStart: boolean;
}

export const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalMs: 15_000,      // Ping every 15 seconds
  timeoutMs: 10_000,       // Each ping must respond within 10 seconds
  maxMissedBeats: 3,       // 3 consecutive misses = unhealthy
  autoStart: true,
};

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthReport {
  status: HealthStatus;
  lastPingAt: number | null;       // Unix ms of last ping sent
  lastPongAt: number | null;       // Unix ms of last pong received
  lastLatencyMs: number | null;    // RTT of last successful ping
  avgLatencyMs: number | null;     // Rolling average RTT
  consecutiveMisses: number;       // Current miss streak
  totalPings: number;              // Total pings sent since start
  totalTimeouts: number;           // Total pings that timed out
  upSince: number | null;          // Unix ms when status became healthy
}

type PingFunction = () => Promise<void>;
type HealthChangeCallback = (report: HealthReport) => void;

export class HeartbeatMonitor {
  private config: HeartbeatConfig;
  private pingFn: PingFunction;
  private onHealthChange: HealthChangeCallback;

  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private consecutiveMisses = 0;
  private totalPings = 0;
  private totalTimeouts = 0;
  private lastPingAt: number | null = null;
  private lastPongAt: number | null = null;
  private lastLatencyMs: number | null = null;
  private latencyWindow: number[] = [];  // Rolling window for avg calculation
  private upSince: number | null = null;
  private status: HealthStatus = 'unknown';
  private running = false;

  private static readonly LATENCY_WINDOW_SIZE = 10;

  constructor(
    pingFn: PingFunction,
    onHealthChange: HealthChangeCallback,
    config: Partial<HeartbeatConfig> = {},
  ) {
    this.pingFn = pingFn;
    this.onHealthChange = onHealthChange;
    this.config = { ...DEFAULT_HEARTBEAT_CONFIG, ...config };
  }

  /** Start the periodic heartbeat loop. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.status = 'healthy';
    this.upSince = Date.now();
    log.info(
      `Heartbeat monitor started: interval=${this.config.intervalMs}ms, ` +
      `timeout=${this.config.timeoutMs}ms, maxMissed=${this.config.maxMissedBeats}`
    );

    // Run first ping after one interval (not immediately -- give agent
    // time to settle after initialization).
    this.intervalHandle = setInterval(() => {
      this.tick();
    }, this.config.intervalMs);
  }

  /** Stop the heartbeat loop. Does not fire health change callbacks. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    log.info('Heartbeat monitor stopped');
  }

  /** Get the current health report without sending a ping. */
  getReport(): HealthReport {
    return {
      status: this.status,
      lastPingAt: this.lastPingAt,
      lastPongAt: this.lastPongAt,
      lastLatencyMs: this.lastLatencyMs,
      avgLatencyMs: this.computeAvgLatency(),
      consecutiveMisses: this.consecutiveMisses,
      totalPings: this.totalPings,
      totalTimeouts: this.totalTimeouts,
      upSince: this.upSince,
    };
  }

  /** Reset all counters (call after reconnection). */
  reset(): void {
    this.consecutiveMisses = 0;
    this.totalPings = 0;
    this.totalTimeouts = 0;
    this.lastPingAt = null;
    this.lastPongAt = null;
    this.lastLatencyMs = null;
    this.latencyWindow = [];
    this.upSince = Date.now();
    this.status = 'healthy';
  }

  /** Execute a single heartbeat tick. Exposed for testing. */
  async tick(): Promise<void> {
    if (!this.running) return;

    this.totalPings++;
    this.lastPingAt = Date.now();

    try {
      await this.pingWithTimeout();
      // Ping succeeded
      const latency = Date.now() - this.lastPingAt;
      this.lastPongAt = Date.now();
      this.lastLatencyMs = latency;
      this.latencyWindow.push(latency);
      if (this.latencyWindow.length > HeartbeatMonitor.LATENCY_WINDOW_SIZE) {
        this.latencyWindow.shift();
      }

      if (this.consecutiveMisses > 0) {
        log.info(
          `Heartbeat recovered after ${this.consecutiveMisses} missed beats ` +
          `(latency: ${latency}ms)`
        );
      }
      this.consecutiveMisses = 0;
      this.updateStatus('healthy');
    } catch (err) {
      // Ping failed or timed out
      this.consecutiveMisses++;
      this.totalTimeouts++;
      const message = err instanceof Error ? err.message : String(err);
      log.warn(
        `Heartbeat timeout (miss ${this.consecutiveMisses}/${this.config.maxMissedBeats}): ${message}`
      );

      if (this.consecutiveMisses >= this.config.maxMissedBeats) {
        this.updateStatus('unhealthy');
      } else {
        this.updateStatus('degraded');
      }
    }
  }

  private async pingWithTimeout(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Heartbeat ping timed out after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      this.pingFn()
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private updateStatus(newStatus: HealthStatus): void {
    const prev = this.status;
    this.status = newStatus;

    if (newStatus === 'healthy' && prev !== 'healthy') {
      this.upSince = Date.now();
    }

    // Always notify on status change; also notify on every miss while
    // degraded so the TUI can update the miss counter display.
    if (newStatus !== prev || newStatus === 'degraded') {
      this.onHealthChange(this.getReport());
    }
  }

  private computeAvgLatency(): number | null {
    if (this.latencyWindow.length === 0) return null;
    const sum = this.latencyWindow.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencyWindow.length);
  }
}
```

### 2. Ping Implementation Strategy

The ACP protocol (as of `@agentclientprotocol/sdk@^0.16.0`) does not define a
dedicated `ping` / `pong` RPC method. The heartbeat monitor needs a lightweight
probe that confirms the agent is alive and processing JSON-RPC messages. Three
strategies are available, in order of preference:

#### Strategy A: JSON-RPC-level Ping (Preferred)

Inject a custom JSON-RPC notification or method call into the `ndJsonStream`.
Since JSON-RPC 2.0 requires servers to respond to unknown methods with a
`-32601 Method not found` error, we can send a synthetic `$/ping` request and
treat *any* response (success or error) as a successful pong:

```typescript
// acp/ping.ts

import type * as acp from '@agentclientprotocol/sdk';
import { log } from '../utils/logger';

/**
 * Send a lightweight ping over the ACP connection.
 *
 * Uses a custom '$/ping' method. The agent may respond with:
 * - A pong result (if it supports the extension)
 * - A -32601 "method not found" error (standard JSON-RPC behavior)
 *
 * Either response confirms the agent is alive and processing messages.
 * Throws if the agent does not respond at all (connection dead).
 */
export async function pingAgent(
  connection: acp.ClientSideConnection,
): Promise<void> {
  try {
    // Attempt the ping. The SDK's sendRequest will write to the
    // ndJsonStream and await a response.
    await (connection as any).sendRequest('$/ping', { timestamp: Date.now() });
  } catch (err: any) {
    // A JSON-RPC error response (-32601) still means the agent is alive.
    // Only re-throw if it is a transport-level error (stream closed, etc.)
    if (err?.code === -32601 || err?.message?.includes('Method not found')) {
      log.debug('Ping received MethodNotFound -- agent is alive');
      return;
    }
    throw err;
  }
}
```

#### Strategy B: Process-level Liveness Check (Fallback)

If the ACP SDK does not expose `sendRequest` for custom methods, fall back to
a process-level check using the `AgentProcess` handle. This is less reliable
(a live process can still be hung) but catches the process-dead case faster
than waiting for `onExit`:

```typescript
// utils/process-health.ts

import type { AgentProcess } from './process';

/**
 * Check if the agent process is still alive by sending signal 0.
 * Signal 0 does not actually send a signal -- it is a no-op probe
 * that returns success if the process exists and we have permission.
 */
export function isProcessAlive(agent: AgentProcess): boolean {
  try {
    // Bun.spawn processes expose a .pid property
    const pid = (agent as any).pid ?? (agent as any)._proc?.pid;
    if (pid == null) return false;
    process.kill(pid, 0);  // signal 0 = existence check
    return true;
  } catch {
    return false;
  }
}
```

#### Strategy C: Stdin Echo Probe (Last Resort)

Write a JSON-RPC notification (fire-and-forget, no response expected) to stdin
and check that the write does not throw. This only confirms the stream is open,
not that the agent is processing:

```typescript
export async function probeStdin(
  agent: AgentProcess,
): Promise<void> {
  const writer = agent.stdin.getWriter();
  try {
    const notification = JSON.stringify({
      jsonrpc: '2.0',
      method: '$/heartbeat',
      params: { timestamp: Date.now() },
    }) + '\n';
    await writer.write(new TextEncoder().encode(notification));
  } finally {
    writer.releaseLock();
  }
}
```

**Recommendation:** Use Strategy A as the primary mechanism, with Strategy B
as a secondary check when the connection object is in an unknown state (e.g.,
during reconnection). Strategy C is not recommended for production use because
it does not verify round-trip responsiveness.

### 3. Request-Level Timeouts

Independent of the heartbeat, every outgoing ACP request should have a timeout.
This prevents indefinite hangs on individual operations.

```typescript
// acp/timeout.ts

/**
 * Wrap an async operation with a timeout.
 * Rejects with a descriptive error if the operation does not complete
 * within the specified duration.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(
        `${operationName} timed out after ${timeoutMs}ms -- agent may be hung`
      ));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
```

Apply to all ACP calls in `connection.ts`:

```typescript
// Updated sendPrompt with timeout
export async function sendPrompt(
  connection: acp.ClientSideConnection,
  sessionId: string,
  text: string,
  timeoutMs: number = 300_000,  // 5 minute default for prompts
): Promise<{ stopReason: string }> {
  log.info(`Sending prompt to session ${sessionId}`);
  const response = await withTimeout(
    connection.prompt({
      sessionId,
      prompt: [{ type: 'text', text }],
    }),
    timeoutMs,
    'prompt',
  );
  return { stopReason: (response as any).stopReason ?? 'end_turn' };
}

// Updated connectToAgent with per-step timeouts
export async function connectToAgent(
  agentCommand: string,
  agentArgs: string[],
  cwd: string,
  callbacks: ClientCallbacks,
): Promise<ConnectionHandle> {
  const agent = spawnAgent(agentCommand, agentArgs, cwd);
  const stream = acp.ndJsonStream(agent.stdin, agent.stdout);

  const client = new FlitterClient(callbacks);
  const connection = new acp.ClientSideConnection(
    (_agentProxy: acp.Agent) => client as unknown as acp.Client,
    stream,
  );

  // Initialize with 30-second timeout
  log.info('Sending initialize request...');
  const initResponse = await withTimeout(
    connection.initialize({
      protocolVersion: acp.PROTOCOL_VERSION,
      clientInfo: { name: 'flitter-amp', version: '0.1.0' },
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: true,
      },
    }),
    30_000,
    'initialize',
  );
  log.info('Agent initialized:', initResponse.agentInfo?.name ?? 'unknown');

  // New session with 15-second timeout
  log.info('Creating new session...');
  const sessionResponse = await withTimeout(
    connection.newSession({ cwd, mcpServers: [] }),
    15_000,
    'newSession',
  );
  log.info(`Session created: ${sessionResponse.sessionId}`);

  return {
    connection, client, agent,
    capabilities: initResponse.agentCapabilities,
    agentInfo: initResponse.agentInfo as { name?: string; title?: string } | undefined,
    sessionId: sessionResponse.sessionId,
  };
}
```

### 4. Activity-Based Idle Detection

The heartbeat interval can be extended when the connection is actively
transferring data (session updates, tool calls), because the stream activity
itself serves as proof of liveness. Conversely, the interval should be shortened
during idle periods when there is no natural confirmation.

```typescript
// acp/activity-tracker.ts

export class ActivityTracker {
  private lastActivityAt: number = Date.now();

  /** Record that protocol activity occurred. */
  recordActivity(): void {
    this.lastActivityAt = Date.now();
  }

  /** Milliseconds since last observed protocol activity. */
  get idleDurationMs(): number {
    return Date.now() - this.lastActivityAt;
  }

  /**
   * Compute the effective heartbeat interval based on activity.
   * - If the connection was active in the last 30 seconds, use a relaxed
   *   interval (3x the base) because the stream is demonstrably alive.
   * - Otherwise, use the configured base interval.
   */
  effectiveInterval(baseIntervalMs: number): number {
    const ACTIVE_THRESHOLD_MS = 30_000;
    if (this.idleDurationMs < ACTIVE_THRESHOLD_MS) {
      return baseIntervalMs * 3;  // Relax: stream is active
    }
    return baseIntervalMs;        // Standard: need proactive probing
  }
}
```

Wire the tracker into `FlitterClient.sessionUpdate()` so that every incoming
update resets the activity timestamp:

```typescript
// In FlitterClient constructor or init:
private activityTracker = new ActivityTracker();

async sessionUpdate(params: { sessionId: string; update: SessionUpdate }): Promise<void> {
  this.activityTracker.recordActivity();
  this.callbacks.onSessionUpdate(params.sessionId, params.update);
}
```

### 5. ConnectionHandle Extension

Extend `ConnectionHandle` to carry the heartbeat monitor and activity tracker:

```typescript
export interface ConnectionHandle {
  connection: acp.ClientSideConnection;
  client: FlitterClient;
  agent: AgentProcess;
  capabilities: acp.AgentCapabilities | undefined;
  agentInfo?: { name?: string; title?: string };
  sessionId: string;
  heartbeat: HeartbeatMonitor;     // NEW
  activityTracker: ActivityTracker; // NEW
}
```

### 6. Integration in index.ts

Wire the heartbeat monitor into the application lifecycle:

```typescript
import { HeartbeatMonitor, type HealthReport } from './acp/heartbeat-monitor';
import { pingAgent } from './acp/ping';

// After connectToAgent() succeeds:
const heartbeat = new HeartbeatMonitor(
  () => pingAgent(handle.connection),
  (report: HealthReport) => {
    log.info(`Health status: ${report.status} (latency: ${report.lastLatencyMs}ms)`);

    if (report.status === 'unhealthy') {
      log.error(
        `Agent unresponsive: ${report.consecutiveMisses} consecutive missed heartbeats`
      );
      appState.onConnectionClosed(
        `Agent unresponsive (${report.consecutiveMisses} missed heartbeats, ` +
        `last response ${formatAge(report.lastPongAt)})`
      );
      heartbeat.stop();
      // Trigger reconnection if ReconnectionManager (Gap P01) is available
    }

    if (report.status === 'degraded') {
      appState.setHealthDegraded(report.consecutiveMisses, report.avgLatencyMs);
    }

    if (report.status === 'healthy') {
      appState.clearHealthWarning();
    }
  },
);
heartbeat.start();

// On agent exit, stop the monitor:
handle.agent.onExit((code, signal) => {
  heartbeat.stop();
  // ... existing exit handling ...
});

// On cleanup:
const cleanup = () => {
  heartbeat.stop();
  handle.client.cleanup();
  handle.agent.kill();
  closeLogFile();
};
```

### 7. AppState Health Surface

Add health status fields to `AppState` so the TUI can display connection
quality indicators:

```typescript
// Additions to AppState

healthStatus: HealthStatus = 'unknown';
healthMissedBeats: number = 0;
healthAvgLatencyMs: number | null = null;

setHealthDegraded(missedBeats: number, avgLatencyMs: number | null): void {
  this.healthStatus = 'degraded';
  this.healthMissedBeats = missedBeats;
  this.healthAvgLatencyMs = avgLatencyMs;
  this.notifyListeners();
}

clearHealthWarning(): void {
  if (this.healthStatus !== 'healthy') {
    this.healthStatus = 'healthy';
    this.healthMissedBeats = 0;
    this.notifyListeners();
  }
}
```

### 8. TUI Health Indicator

The bottom status bar should display a connection quality indicator:

```
 [session abc123]  [claude]  [healthy 23ms]   -- normal
 [session abc123]  [claude]  [degraded 1/3]   -- missed one beat
 [session abc123]  [claude]  [unhealthy]      -- connection lost
```

The indicator reads from `appState.healthStatus` and
`appState.healthAvgLatencyMs`. Implementation details are widget-level and
belong in the `BottomGrid` widget.

### 9. Timeout Configuration Defaults

| Operation | Default Timeout | Rationale |
|-----------|----------------|-----------|
| `initialize` | 30 s | Agent startup may be slow (loading models, plugins) |
| `newSession` | 15 s | Lightweight operation, should be fast |
| `prompt` | 300 s (5 min) | LLM inference can take minutes for complex tasks |
| `cancel` | 10 s | Should be near-instant |
| Heartbeat ping | 10 s | Generous for a no-op probe |
| Heartbeat interval | 15 s | Frequent enough to catch hangs within ~45 s |
| Consecutive misses | 3 | Total detection time: ~45 s (3 intervals) |

These defaults are tuned for a local subprocess connection with minimal network
latency. They should be configurable via `HeartbeatConfig` and a future CLI
flag (`--heartbeat-interval`, `--heartbeat-timeout`).

### 10. Interaction with Gap P01 (Reconnection Logic)

The heartbeat monitor and the reconnection manager (Gap P01) are complementary.
The lifecycle is:

```
connected + heartbeat running
  |
  v  (3 missed beats)
unhealthy detected
  |
  v
heartbeat.stop()
appState.onConnectionClosed("Agent unresponsive")
  |
  v
ReconnectionManager.reconnect()
  |
  +----> success: heartbeat.reset() + heartbeat.start()
  |
  +----> failure: disconnected state (TUI shows retry prompt)
```

If the reconnection manager is not yet implemented, the heartbeat monitor still
provides value by surfacing the hung state to the user instead of silently
hanging. The TUI shows the "Agent unresponsive" error, which is far better than
an indefinite wait.

## Files to Create / Modify

| File | Change |
|------|--------|
| `src/acp/heartbeat-monitor.ts` | **New file.** `HeartbeatMonitor` class, `HeartbeatConfig`, `HealthReport`, `HealthStatus` types. |
| `src/acp/ping.ts` | **New file.** `pingAgent()` function implementing the `$/ping` JSON-RPC probe. |
| `src/acp/timeout.ts` | **New file.** `withTimeout()` utility. |
| `src/acp/activity-tracker.ts` | **New file.** `ActivityTracker` class for adaptive heartbeat intervals. |
| `src/acp/connection.ts` | Wrap `initialize`, `newSession`, `prompt`, `cancel` with `withTimeout()`. Add `heartbeat` and `activityTracker` to `ConnectionHandle`. |
| `src/acp/client.ts` | Wire `ActivityTracker.recordActivity()` into `sessionUpdate()`. |
| `src/state/app-state.ts` | Add `healthStatus`, `healthMissedBeats`, `healthAvgLatencyMs` fields. Add `setHealthDegraded()` and `clearHealthWarning()` methods. |
| `src/index.ts` | Instantiate `HeartbeatMonitor`, wire health change callbacks, stop monitor on exit, integrate with cleanup. |
| `src/widgets/bottom-grid.ts` | Display health indicator in the status bar based on `appState.healthStatus`. |

## Testing Strategy

### Unit tests for HeartbeatMonitor

1. **Happy path:** Mock `pingFn` to resolve immediately. Call `tick()` three
   times. Verify `status === 'healthy'`, `consecutiveMisses === 0`,
   `totalPings === 3`, and `latencyWindow` has 3 entries.

2. **Single timeout:** Mock `pingFn` to reject once, then succeed. Verify
   transition to `degraded` then back to `healthy`. Verify `totalTimeouts === 1`.

3. **Consecutive timeouts to unhealthy:** Mock `pingFn` to reject N times
   where N = `maxMissedBeats`. Verify transition: `healthy -> degraded -> unhealthy`.

4. **Recovery from degraded:** Mock `pingFn` to fail twice then succeed.
   Verify `consecutiveMisses` resets to 0 and status returns to `healthy`.

5. **Stop mid-tick:** Call `stop()` while a `tick()` is in-flight. Verify no
   callbacks fire after stop.

6. **Reset:** Verify `reset()` clears all counters and sets status to `healthy`.

### Unit tests for withTimeout

1. Fast resolve: promise resolves in 10ms with 1000ms timeout. Verify success.
2. Slow resolve: promise resolves in 2000ms with 100ms timeout. Verify timeout error.
3. Fast reject: promise rejects in 10ms with 1000ms timeout. Verify original error.

### Unit tests for pingAgent

1. Mock connection to respond to `$/ping`. Verify no error.
2. Mock connection to respond with `-32601`. Verify no error (treated as alive).
3. Mock connection to throw a transport error. Verify error propagates.

### Integration test (manual)

1. Start flitter-amp with a real agent.
2. Observe log output: heartbeat pings should appear every 15 seconds.
3. Send `kill -STOP <agent_pid>` to freeze the agent (SIGSTOP pauses without
   killing). After ~45 seconds, verify the TUI shows "Agent unresponsive."
4. Send `kill -CONT <agent_pid>` to resume. If reconnection is wired, verify
   recovery. If not, verify the error message is visible.
5. During an active prompt (agent streaming output), verify heartbeat interval
   is relaxed (fewer pings in the log).

### Edge cases

- Agent responds to `$/ping` but is actually stuck on prompt processing. The
  heartbeat only confirms protocol-level liveness, not application-level
  progress. This is acceptable -- application-level hangs are handled by the
  per-request timeout on `sendPrompt()`.
- Heartbeat fires during a long-running prompt. The `ActivityTracker` should
  suppress unnecessary pings because `sessionUpdate` calls keep resetting the
  activity timer.
- Heartbeat and reconnection race: if the agent dies and `onExit` fires at the
  same time a heartbeat timeout triggers, the monitor must be idempotent. The
  `stop()` call in the `onExit` handler prevents double-firing.
