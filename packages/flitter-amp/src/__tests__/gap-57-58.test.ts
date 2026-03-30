/**
 * Tests for Gap #57 and #58.
 *
 * Gap #57: Connection state machine + ReconnectionManager with exponential backoff
 * Gap #58: HeartbeatMonitor class + request timeouts + activity tracking
 *
 * Run:  bun test src/__tests__/gap-57-58.test.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { shouldAutoReconnect } from '../acp/exit-classifier';
import {
  ReconnectionManager,
  DEFAULT_RECONNECTION_CONFIG,
  type ReconnectionConfig,
  type PhaseCallback,
} from '../acp/reconnection-manager';
import {
  HeartbeatMonitor,
  DEFAULT_HEARTBEAT_CONFIG,
  type HealthReport,
  type HealthStatus,
} from '../acp/heartbeat-monitor';
import { withTimeout } from '../acp/timeout';
import { ActivityTracker } from '../acp/activity-tracker';
import { AppState } from '../state/app-state';
import { ConversationState } from '../state/conversation';
import type { ConnectionPhase, ConnectionStatus } from '../state/connection-state';
import type { ConnectionHandle } from '../acp/connection';

// ═══════════════════════════════════════════════════════════════════════
//  Shared mock helpers
// ═══════════════════════════════════════════════════════════════════════

function createMockHandle(sessionId = 'session-1'): ConnectionHandle {
  return {
    connection: {} as any,
    client: { cleanup: () => {} } as any,
    agent: {
      stdin: {} as any,
      stdout: {} as any,
      kill: () => {},
      onExit: () => {},
    },
    capabilities: undefined,
    agentInfo: { name: 'test-agent', version: '0.0.0' },
    sessionId,
    supportsCloseSession: false,
  };
}

function createMockCallbacks() {
  return {
    onSessionUpdate: () => {},
    onPermissionRequest: async () => null,
    onPromptComplete: () => {},
    onConnectionClosed: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  Gap #57 — Exit Classifier
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #57 — shouldAutoReconnect', () => {
  test('SIGKILL (OOM kill) should reconnect', () => {
    expect(shouldAutoReconnect(null, 'SIGKILL')).toBe(true);
  });

  test('SIGSEGV (crash) should reconnect', () => {
    expect(shouldAutoReconnect(null, 'SIGSEGV')).toBe(true);
  });

  test('SIGABRT (assertion failure) should reconnect', () => {
    expect(shouldAutoReconnect(null, 'SIGABRT')).toBe(true);
  });

  test('SIGTERM (our kill) should NOT reconnect', () => {
    expect(shouldAutoReconnect(null, 'SIGTERM')).toBe(false);
  });

  test('clean exit (code 0) should NOT reconnect', () => {
    expect(shouldAutoReconnect(0, null)).toBe(false);
  });

  test('exit code 1 (generic error) should reconnect', () => {
    expect(shouldAutoReconnect(1, null)).toBe(true);
  });

  test('exit code 127 (command not found) should NOT reconnect', () => {
    expect(shouldAutoReconnect(127, null)).toBe(false);
  });

  test('exit code 137 (killed by signal 9) should reconnect', () => {
    expect(shouldAutoReconnect(137, null)).toBe(true);
  });

  test('exit code 2 (misc error) should reconnect', () => {
    expect(shouldAutoReconnect(2, null)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #57 — ReconnectionManager
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #57 — ReconnectionManager', () => {
  let phaseLog: Array<{ phase: ConnectionPhase; attempt: number; error?: string; nextRetryAt?: number }>;
  let onPhaseChange: PhaseCallback;

  beforeEach(() => {
    phaseLog = [];
    onPhaseChange = (phase, attempt, error, nextRetryAt) => {
      phaseLog.push({ phase, attempt, error, nextRetryAt });
    };
  });

  test('success on first attempt returns handle and resets attempt', async () => {
    const mockHandle = createMockHandle();
    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, jitterFactor: 0 },
    );
    mgr.connectFn = async () => mockHandle;

    const result = await mgr.reconnect();
    expect(result).toBe(mockHandle);
    expect(mgr.attempt).toBe(0); // reset after success
    // Should have: reconnecting(1), connected(0)
    expect(phaseLog.some(p => p.phase === 'reconnecting' && p.attempt === 1)).toBe(true);
    expect(phaseLog.some(p => p.phase === 'connected' && p.attempt === 0)).toBe(true);
  });

  test('fail N times then succeed', async () => {
    const mockHandle = createMockHandle();
    let callCount = 0;
    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 10, jitterFactor: 0 },
    );
    mgr.connectFn = async () => {
      callCount++;
      if (callCount < 3) throw new Error(`fail-${callCount}`);
      return mockHandle;
    };

    const result = await mgr.reconnect();
    expect(result).toBe(mockHandle);
    expect(callCount).toBe(3);
    // Should have seen reconnecting phases for attempts 1, 2, 3
    const reconnectingPhases = phaseLog.filter(p => p.phase === 'reconnecting');
    expect(reconnectingPhases.length).toBeGreaterThanOrEqual(3);
    // Final phase is connected
    expect(phaseLog[phaseLog.length - 1]!.phase).toBe('connected');
  });

  test('exhaust all attempts returns null', async () => {
    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, jitterFactor: 0 },
    );
    mgr.connectFn = async () => { throw new Error('nope'); };

    const result = await mgr.reconnect();
    expect(result).toBeNull();
    // Final phase is disconnected
    expect(phaseLog[phaseLog.length - 1]!.phase).toBe('disconnected');
    expect(phaseLog[phaseLog.length - 1]!.error).toBe('All reconnection attempts exhausted');
  });

  test('abort mid-reconnection returns null without disconnected callback', async () => {
    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 5, baseDelayMs: 500, maxDelayMs: 1000, jitterFactor: 0 },
    );
    let callCount = 0;
    mgr.connectFn = async () => {
      callCount++;
      throw new Error('fail');
    };

    // Start reconnect in background, abort after first attempt fails and
    // the sleep starts (the first connect call is instant, then it sleeps 500ms).
    const reconnectPromise = mgr.reconnect();
    // Wait long enough for the first connect to fail but within the sleep window
    await new Promise(resolve => setTimeout(resolve, 100));
    mgr.abort();

    const result = await reconnectPromise;
    expect(result).toBeNull();
    expect(mgr.aborted).toBe(true);
    // The disconnected phase should NOT be called when aborted
    const disconnected = phaseLog.filter(p => p.phase === 'disconnected');
    expect(disconnected.length).toBe(0);
  });

  test('reset and retry starts fresh from attempt 1', async () => {
    const mockHandle = createMockHandle();
    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 10, jitterFactor: 0 },
    );
    mgr.connectFn = async () => { throw new Error('nope'); };

    // Exhaust all attempts
    await mgr.reconnect();
    expect(phaseLog[phaseLog.length - 1]!.phase).toBe('disconnected');

    // Reset and try again
    phaseLog = [];
    mgr.reset();
    mgr.connectFn = async () => mockHandle;
    const result = await mgr.reconnect();
    expect(result).toBe(mockHandle);
    expect(phaseLog.some(p => p.phase === 'connected')).toBe(true);
  });

  test('exponential backoff delay computation', () => {
    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 30000, jitterFactor: 0 },
    );
    mgr.randomFn = () => 0; // no jitter

    expect(mgr.computeDelay(1)).toBe(1000);  // 1000 * 2^0
    expect(mgr.computeDelay(2)).toBe(2000);  // 1000 * 2^1
    expect(mgr.computeDelay(3)).toBe(4000);  // 1000 * 2^2
    expect(mgr.computeDelay(4)).toBe(8000);  // 1000 * 2^3
    expect(mgr.computeDelay(5)).toBe(16000); // 1000 * 2^4
    expect(mgr.computeDelay(6)).toBe(30000); // capped at maxDelayMs
  });

  test('jitter adds to base delay', () => {
    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 30000, jitterFactor: 0.3 },
    );
    mgr.randomFn = () => 1.0; // max jitter

    // Attempt 1: base=1000, jitter=1000*0.3*1.0=300, total=1300
    expect(mgr.computeDelay(1)).toBe(1300);
    // Attempt 2: base=2000, jitter=2000*0.3*1.0=600, total=2600
    expect(mgr.computeDelay(2)).toBe(2600);
  });

  test('maxAttempts getter exposes config', () => {
    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 7 },
    );
    expect(mgr.maxAttempts).toBe(7);
  });

  test('default config values', () => {
    expect(DEFAULT_RECONNECTION_CONFIG.maxAttempts).toBe(5);
    expect(DEFAULT_RECONNECTION_CONFIG.baseDelayMs).toBe(1000);
    expect(DEFAULT_RECONNECTION_CONFIG.maxDelayMs).toBe(30_000);
    expect(DEFAULT_RECONNECTION_CONFIG.jitterFactor).toBe(0.3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #57 — Connection State Machine in AppState
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #57 — AppState connection state machine', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = new AppState();
  });

  test('initial phase is connecting', () => {
    expect(appState.connectionStatus.phase).toBe('connecting');
  });

  test('isConnected backward compat returns true only when connected', () => {
    expect(appState.isConnected).toBe(false);
    appState.setConnectionPhase('connected', 0, null);
    expect(appState.isConnected).toBe(true);
    appState.setConnectionPhase('reconnecting', 1, null);
    expect(appState.isConnected).toBe(false);
    appState.setConnectionPhase('disconnected', 3, 'all failed');
    expect(appState.isConnected).toBe(false);
  });

  test('isConnected setter is no-op', () => {
    appState.setConnectionPhase('disconnected', 0, 'test');
    appState.isConnected = true; // should be a no-op
    expect(appState.connectionStatus.phase).toBe('disconnected');
    expect(appState.isConnected).toBe(false);
  });

  test('setConnectionPhase updates status and notifies listeners', () => {
    let notified = false;
    appState.addListener(() => { notified = true; });

    appState.setConnectionPhase('reconnecting', 2, 'agent died', Date.now() + 5000);

    expect(notified).toBe(true);
    expect(appState.connectionStatus.phase).toBe('reconnecting');
    expect(appState.connectionStatus.attempt).toBe(2);
    expect(appState.connectionStatus.lastError).toBe('agent died');
    expect(appState.connectionStatus.nextRetryAt).toBeGreaterThan(0);
  });

  test('setConnected transitions to connected and clears error', () => {
    appState.setError('previous error');
    appState.setConnected('session-1', 'test-agent');

    expect(appState.connectionStatus.phase).toBe('connected');
    expect(appState.connectionStatus.attempt).toBe(0);
    expect(appState.connectionStatus.lastError).toBeNull();
    expect(appState.sessionId).toBe('session-1');
    expect(appState.agentName).toBe('test-agent');
    expect(appState.error).toBeNull();
  });

  test('onConnectionClosed sets error but does not change phase', () => {
    appState.setConnectionPhase('connected', 0, null);
    appState.onConnectionClosed('agent crashed');

    // Phase is NOT changed by onConnectionClosed (caller handles that)
    expect(appState.connectionStatus.phase).toBe('connected');
    expect(appState.error).toBe('Agent disconnected: agent crashed');
  });

  test('connectionStatus preserves maxAttempts across updates', () => {
    expect(appState.connectionStatus.maxAttempts).toBe(DEFAULT_RECONNECTION_CONFIG.maxAttempts);
    appState.setConnectionPhase('reconnecting', 1, null);
    expect(appState.connectionStatus.maxAttempts).toBe(DEFAULT_RECONNECTION_CONFIG.maxAttempts);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #57 — SystemMessage in ConversationState
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #57 — SystemMessage in ConversationState', () => {
  let conv: ConversationState;

  beforeEach(() => {
    conv = new ConversationState();
  });

  test('addSystemMessage adds a system_message item', () => {
    conv.addSystemMessage('Agent reconnected (new session)');
    const items = conv.items;
    expect(items).toHaveLength(1);
    expect(items[0]!.type).toBe('system_message');
    if (items[0]!.type === 'system_message') {
      expect(items[0]!.text).toBe('Agent reconnected (new session)');
      expect(items[0]!.timestamp).toBeGreaterThan(0);
    }
  });

  test('system messages are frozen', () => {
    conv.addSystemMessage('test');
    expect(Object.isFrozen(conv.snapshot.items[0])).toBe(true);
  });

  test('system messages increment version', () => {
    const v0 = conv.snapshot.version;
    conv.addSystemMessage('test');
    expect(conv.snapshot.version).toBe(v0 + 1);
  });

  test('system messages interleave with other items', () => {
    conv.addUserMessage('hello');
    conv.addSystemMessage('reconnected');
    conv.addUserMessage('world');
    expect(conv.items).toHaveLength(3);
    expect(conv.items[0]!.type).toBe('user_message');
    expect(conv.items[1]!.type).toBe('system_message');
    expect(conv.items[2]!.type).toBe('user_message');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #58 — withTimeout
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #58 — withTimeout', () => {
  test('resolves when promise completes within timeout', async () => {
    const result = await withTimeout(
      Promise.resolve(42),
      1000,
      'test-op',
    );
    expect(result).toBe(42);
  });

  test('rejects with timeout error when promise exceeds timeout', async () => {
    const slow = new Promise(resolve => setTimeout(resolve, 5000));
    try {
      await withTimeout(slow, 50, 'test-op');
      throw new Error('should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('test-op timed out after 50ms');
      expect(err.message).toContain('agent may be hung');
    }
  });

  test('propagates original error when promise rejects before timeout', async () => {
    const failing = Promise.reject(new Error('original error'));
    try {
      await withTimeout(failing, 1000, 'test-op');
      throw new Error('should have thrown');
    } catch (err: any) {
      expect(err.message).toBe('original error');
    }
  });

  test('clears timer on success (no lingering timers)', async () => {
    // If timer is not cleared, it would keep the process alive.
    // This test just ensures no error on fast resolve.
    const result = await withTimeout(
      new Promise(resolve => setTimeout(() => resolve('fast'), 5)),
      1000,
      'test-op',
    );
    expect(result).toBe('fast');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #58 — ActivityTracker
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #58 — ActivityTracker', () => {
  test('initial idle duration is near zero', () => {
    const tracker = new ActivityTracker();
    expect(tracker.idleDurationMs).toBeLessThan(100);
  });

  test('recordActivity resets idle duration', async () => {
    const tracker = new ActivityTracker();
    // Wait a small amount
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(tracker.idleDurationMs).toBeGreaterThanOrEqual(40);
    tracker.recordActivity();
    expect(tracker.idleDurationMs).toBeLessThan(20);
  });

  test('effectiveInterval returns relaxed interval when active', () => {
    const tracker = new ActivityTracker();
    // Just created, so activity is recent
    expect(tracker.effectiveInterval(15_000)).toBe(45_000); // 3x
  });

  test('effectiveInterval returns base interval when idle > 30s', () => {
    const tracker = new ActivityTracker();
    // Hack the lastActivityAt to simulate old activity
    (tracker as any).lastActivityAt = Date.now() - 60_000;
    expect(tracker.effectiveInterval(15_000)).toBe(15_000); // base
  });

  test('reset resets the activity timestamp', () => {
    const tracker = new ActivityTracker();
    (tracker as any).lastActivityAt = Date.now() - 60_000;
    tracker.reset();
    expect(tracker.idleDurationMs).toBeLessThan(100);
  });

  test('lastActivity returns the timestamp', () => {
    const tracker = new ActivityTracker();
    const before = Date.now();
    tracker.recordActivity();
    expect(tracker.lastActivity).toBeGreaterThanOrEqual(before);
    expect(tracker.lastActivity).toBeLessThanOrEqual(Date.now());
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #58 — HeartbeatMonitor
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #58 — HeartbeatMonitor', () => {
  let monitor: HeartbeatMonitor;

  afterEach(() => {
    if (monitor) monitor.stop();
  });

  test('happy path: 3 successful ticks', async () => {
    const reports: HealthReport[] = [];
    monitor = new HeartbeatMonitor(
      async () => { /* instant success */ },
      (report) => reports.push({ ...report }),
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 3 },
    );
    monitor.start();
    expect(monitor.running).toBe(true);
    expect(monitor.status).toBe('healthy');

    // Manually tick 3 times
    await monitor.tick();
    await monitor.tick();
    await monitor.tick();

    expect(monitor.totalPings).toBe(3);
    expect(monitor.totalTimeouts).toBe(0);
    expect(monitor.consecutiveMisses).toBe(0);
    expect(monitor.status).toBe('healthy');

    const report = monitor.getReport();
    expect(report.totalPings).toBe(3);
    expect(report.totalTimeouts).toBe(0);
    expect(report.lastLatencyMs).toBeGreaterThanOrEqual(0);
    expect(report.avgLatencyMs).toBeGreaterThanOrEqual(0);
    expect(report.upSince).toBeGreaterThan(0);
  });

  test('single timeout transitions to degraded', async () => {
    const reports: HealthReport[] = [];
    monitor = new HeartbeatMonitor(
      async () => { throw new Error('timeout'); },
      (report) => reports.push({ ...report }),
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 3 },
    );
    monitor.start();

    await monitor.tick();

    expect(monitor.status).toBe('degraded');
    expect(monitor.consecutiveMisses).toBe(1);
    expect(monitor.totalTimeouts).toBe(1);
    expect(reports.length).toBe(1);
    expect(reports[0]!.status).toBe('degraded');
  });

  test('consecutive timeouts to unhealthy', async () => {
    const reports: HealthReport[] = [];
    monitor = new HeartbeatMonitor(
      async () => { throw new Error('timeout'); },
      (report) => reports.push({ ...report }),
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 3 },
    );
    monitor.start();

    await monitor.tick(); // miss 1 -> degraded
    await monitor.tick(); // miss 2 -> degraded
    await monitor.tick(); // miss 3 -> unhealthy

    expect(monitor.status).toBe('unhealthy');
    expect(monitor.consecutiveMisses).toBe(3);
    // Reports: degraded(1), degraded(2), unhealthy(3)
    expect(reports.length).toBe(3);
    expect(reports[0]!.status).toBe('degraded');
    expect(reports[1]!.status).toBe('degraded');
    expect(reports[2]!.status).toBe('unhealthy');
  });

  test('recovery from degraded back to healthy', async () => {
    let shouldFail = true;
    const reports: HealthReport[] = [];
    monitor = new HeartbeatMonitor(
      async () => { if (shouldFail) throw new Error('timeout'); },
      (report) => reports.push({ ...report }),
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 3 },
    );
    monitor.start();

    await monitor.tick(); // miss 1 -> degraded
    await monitor.tick(); // miss 2 -> degraded

    expect(monitor.status).toBe('degraded');
    expect(monitor.consecutiveMisses).toBe(2);

    // Now succeed
    shouldFail = false;
    await monitor.tick();

    expect(monitor.status).toBe('healthy');
    expect(monitor.consecutiveMisses).toBe(0);
    // Last report should be healthy (transition from degraded)
    expect(reports[reports.length - 1]!.status).toBe('healthy');
  });

  test('stop prevents further ticks', async () => {
    monitor = new HeartbeatMonitor(
      async () => {},
      () => {},
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 3 },
    );
    monitor.start();
    expect(monitor.running).toBe(true);

    monitor.stop();
    expect(monitor.running).toBe(false);

    // tick after stop should be no-op
    const pingsBefore = monitor.totalPings;
    await monitor.tick();
    expect(monitor.totalPings).toBe(pingsBefore);
  });

  test('start is idempotent', () => {
    monitor = new HeartbeatMonitor(
      async () => {},
      () => {},
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 3 },
    );
    monitor.start();
    monitor.start(); // should not error or double-start
    expect(monitor.running).toBe(true);
    monitor.stop();
  });

  test('stop is idempotent', () => {
    monitor = new HeartbeatMonitor(
      async () => {},
      () => {},
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 3 },
    );
    monitor.stop(); // should not error (never started)
    expect(monitor.running).toBe(false);
  });

  test('reset clears all counters', async () => {
    monitor = new HeartbeatMonitor(
      async () => { throw new Error('fail'); },
      () => {},
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 3 },
    );
    monitor.start();

    await monitor.tick();
    await monitor.tick();

    expect(monitor.totalPings).toBe(2);
    expect(monitor.totalTimeouts).toBe(2);
    expect(monitor.consecutiveMisses).toBe(2);

    monitor.reset();

    expect(monitor.totalPings).toBe(0);
    expect(monitor.totalTimeouts).toBe(0);
    expect(monitor.consecutiveMisses).toBe(0);
    expect(monitor.status).toBe('healthy');

    const report = monitor.getReport();
    expect(report.lastPingAt).toBeNull();
    expect(report.lastPongAt).toBeNull();
    expect(report.lastLatencyMs).toBeNull();
    expect(report.avgLatencyMs).toBeNull();
    expect(report.upSince).toBeGreaterThan(0);
  });

  test('latency window rolls over after 10 entries', async () => {
    monitor = new HeartbeatMonitor(
      async () => {},
      () => {},
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 3 },
    );
    monitor.start();

    // Send 12 ticks
    for (let i = 0; i < 12; i++) {
      await monitor.tick();
    }

    const report = monitor.getReport();
    expect(report.totalPings).toBe(12);
    expect(report.avgLatencyMs).toBeGreaterThanOrEqual(0);
  });

  test('getReport returns correct structure', () => {
    monitor = new HeartbeatMonitor(
      async () => {},
      () => {},
    );

    const report = monitor.getReport();
    expect(report).toHaveProperty('status');
    expect(report).toHaveProperty('lastPingAt');
    expect(report).toHaveProperty('lastPongAt');
    expect(report).toHaveProperty('lastLatencyMs');
    expect(report).toHaveProperty('avgLatencyMs');
    expect(report).toHaveProperty('consecutiveMisses');
    expect(report).toHaveProperty('totalPings');
    expect(report).toHaveProperty('totalTimeouts');
    expect(report).toHaveProperty('upSince');
    expect(report.status).toBe('unknown');
  });

  test('default config values', () => {
    expect(DEFAULT_HEARTBEAT_CONFIG.intervalMs).toBe(15_000);
    expect(DEFAULT_HEARTBEAT_CONFIG.timeoutMs).toBe(10_000);
    expect(DEFAULT_HEARTBEAT_CONFIG.maxMissedBeats).toBe(3);
  });

  test('pingWithTimeout rejects on slow ping', async () => {
    const reports: HealthReport[] = [];
    monitor = new HeartbeatMonitor(
      async () => { await new Promise(resolve => setTimeout(resolve, 200)); },
      (report) => reports.push({ ...report }),
      { intervalMs: 10000, timeoutMs: 30, maxMissedBeats: 3 },
    );
    monitor.start();

    await monitor.tick();

    expect(monitor.consecutiveMisses).toBe(1);
    expect(monitor.status).toBe('degraded');
  });

  test('health change callback fires on degraded transitions', async () => {
    const reports: HealthReport[] = [];
    monitor = new HeartbeatMonitor(
      async () => { throw new Error('fail'); },
      (report) => reports.push({ ...report }),
      { intervalMs: 10000, timeoutMs: 5000, maxMissedBeats: 5 },
    );
    monitor.start();

    // Each miss in degraded state should fire the callback
    await monitor.tick(); // miss 1
    await monitor.tick(); // miss 2
    await monitor.tick(); // miss 3

    // All 3 should have fired callbacks (degraded fires on every miss)
    expect(reports.length).toBe(3);
    expect(reports.every(r => r.status === 'degraded')).toBe(true);
    expect(reports[0]!.consecutiveMisses).toBe(1);
    expect(reports[1]!.consecutiveMisses).toBe(2);
    expect(reports[2]!.consecutiveMisses).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #58 — AppState health fields
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #58 — AppState health monitoring', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = new AppState();
  });

  test('initial health status is unknown', () => {
    expect(appState.healthStatus).toBe('unknown');
    expect(appState.healthMissedBeats).toBe(0);
    expect(appState.healthAvgLatencyMs).toBeNull();
  });

  test('setHealthDegraded updates fields and notifies', () => {
    let notified = false;
    appState.addListener(() => { notified = true; });

    appState.setHealthDegraded(2, 150);

    expect(notified).toBe(true);
    expect(appState.healthStatus).toBe('degraded');
    expect(appState.healthMissedBeats).toBe(2);
    expect(appState.healthAvgLatencyMs).toBe(150);
  });

  test('clearHealthWarning transitions from degraded to healthy', () => {
    appState.setHealthDegraded(1, 100);
    let notified = false;
    appState.addListener(() => { notified = true; });

    appState.clearHealthWarning();

    expect(notified).toBe(true);
    expect(appState.healthStatus).toBe('healthy');
    expect(appState.healthMissedBeats).toBe(0);
  });

  test('clearHealthWarning is no-op when already healthy', () => {
    appState.healthStatus = 'healthy';
    let notified = false;
    appState.addListener(() => { notified = true; });

    appState.clearHealthWarning();

    expect(notified).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #57/#58 — Integration: ConnectionStatus preserved in toSessionFile
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #57/#58 — Integration', () => {
  test('toSessionFile still works with new connection state', () => {
    const appState = new AppState();
    appState.setConnected('session-abc', 'claude');
    appState.agentCommand = 'claude';

    const file = appState.toSessionFile();
    expect(file).not.toBeNull();
    expect(file!.sessionId).toBe('session-abc');
    expect(file!.agentName).toBe('claude');
  });

  test('connection phase transitions do not break session persistence', () => {
    const appState = new AppState();
    appState.setConnected('session-1', 'agent');
    appState.agentCommand = 'agent';

    // Simulate disconnect/reconnect cycle
    appState.setConnectionPhase('reconnecting', 1, 'agent died');
    appState.setConnectionPhase('connected', 0, null);
    appState.sessionId = 'session-2';

    const file = appState.toSessionFile();
    expect(file).not.toBeNull();
    expect(file!.sessionId).toBe('session-2');
  });
});
