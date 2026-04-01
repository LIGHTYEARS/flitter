/**
 * ACP 重连集成测试 — LiveHandle 热替换 + 重连/心跳联动
 *
 * LiveHandle 尚未实现，测试预期因 module not found 而 FAIL。
 * 当 LiveHandle 实现后，这些测试应当全部通过。
 *
 * Run:  bun test src/__tests__/acp-reconnection-integration.test.ts
 */

import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { LiveHandle } from '../acp/live-handle';
import { shouldAutoReconnect } from '../acp/exit-classifier';
import { ReconnectionManager, type PhaseCallback } from '../acp/reconnection-manager';
import { HeartbeatMonitor } from '../acp/heartbeat-monitor';
import type { ConnectionHandle } from '../acp/connection';
import type { ConnectionPhase } from '../state/connection-state';

// ═══════════════════════════════════════════════════════════════════════
//  Mock 工具函数
// ═══════════════════════════════════════════════════════════════════════

/** 创建一个最小化的 ConnectionHandle mock */
function createMockHandle(sessionId = 'session-1'): ConnectionHandle {
  return {
    connection: {} as any,
    client: { cleanup: () => {} } as any,
    agent: {
      stdin: {} as any,
      stdout: {} as any,
      kill: mock(() => {}),
      onExit: mock((_cb: (code: number | null, signal: string | null) => void) => {}),
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
//  LiveHandle.current 返回活跃连接
// ═══════════════════════════════════════════════════════════════════════

describe('LiveHandle — current 返回活跃连接', () => {
  test('构造后 current 应指向初始传入的连接', () => {
    const conn = createMockHandle('session-init');
    const liveHandle = new LiveHandle(conn);

    expect(liveHandle.current).toBe(conn);
    expect(liveHandle.current.sessionId).toBe('session-init');
  });

  test('current 不应返回 null 或 undefined（有效连接场景）', () => {
    const conn = createMockHandle();
    const liveHandle = new LiveHandle(conn);

    expect(liveHandle.current).toBeDefined();
    expect(liveHandle.current).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  LiveHandle 热替换
// ═══════════════════════════════════════════════════════════════════════

describe('LiveHandle — 热替换连接', () => {
  test('replace() 后 current 应指向新连接', () => {
    const oldConn = createMockHandle('session-old');
    const newConn = createMockHandle('session-new');

    const liveHandle = new LiveHandle(oldConn);
    expect(liveHandle.current.sessionId).toBe('session-old');

    liveHandle.replace(newConn);
    expect(liveHandle.current).toBe(newConn);
    expect(liveHandle.current.sessionId).toBe('session-new');
  });

  test('replace() 后旧连接引用不再被持有', () => {
    const oldConn = createMockHandle('session-old');
    const newConn = createMockHandle('session-new');

    const liveHandle = new LiveHandle(oldConn);
    liveHandle.replace(newConn);

    // current 不再指向旧连接
    expect(liveHandle.current).not.toBe(oldConn);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  shouldAutoReconnect — crash 信号场景
// ═══════════════════════════════════════════════════════════════════════

describe('shouldAutoReconnect — 集成场景验证', () => {
  test('SIGKILL (signal 9, OOM kill) 应触发自动重连', () => {
    // SIGKILL 通常是 OOM killer 或外部强制终止，属于瞬态故障
    expect(shouldAutoReconnect(null, 'SIGKILL')).toBe(true);
  });

  test('SIGSEGV 崩溃应触发自动重连', () => {
    expect(shouldAutoReconnect(null, 'SIGSEGV')).toBe(true);
  });

  test('SIGTERM（我们自己的 kill）不应重连', () => {
    expect(shouldAutoReconnect(null, 'SIGTERM')).toBe(false);
  });

  test('正常退出 code=0 不应重连', () => {
    expect(shouldAutoReconnect(0, null)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  ReconnectionManager 在连接断开时被调用
// ═══════════════════════════════════════════════════════════════════════

describe('ReconnectionManager — 连接断开时被调用', () => {
  let phaseLog: Array<{ phase: ConnectionPhase; attempt: number }>;
  let onPhaseChange: PhaseCallback;

  beforeEach(() => {
    phaseLog = [];
    onPhaseChange = (phase, attempt) => {
      phaseLog.push({ phase, attempt });
    };
  });

  test('模拟连接断开后应触发 reconnect 流程', async () => {
    const newHandle = createMockHandle('session-reconnected');

    // 构建 ReconnectionManager，使用极短延迟以加速测试
    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, jitterFactor: 0 },
    );

    // 注入 mock connectFn，模拟重连成功
    const connectMock = mock(async () => newHandle);
    mgr.connectFn = connectMock;

    // 模拟连接断开：调用 reconnect()
    const result = await mgr.reconnect();

    // 验证 reconnect 确实被执行
    expect(connectMock).toHaveBeenCalled();
    expect(result).toBe(newHandle);
    expect(result!.sessionId).toBe('session-reconnected');

    // 验证经过了 reconnecting -> connected 阶段
    expect(phaseLog.some(p => p.phase === 'reconnecting')).toBe(true);
    expect(phaseLog.some(p => p.phase === 'connected')).toBe(true);
  });

  test('LiveHandle 与 ReconnectionManager 联动：重连成功后替换连接', async () => {
    const oldConn = createMockHandle('session-old');
    const newConn = createMockHandle('session-new');

    const liveHandle = new LiveHandle(oldConn);

    const mgr = new ReconnectionManager(
      'test-cmd', [], '/tmp', createMockCallbacks(), onPhaseChange,
      { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, jitterFactor: 0 },
    );
    mgr.connectFn = async () => newConn;

    // 模拟断开后重连
    const reconnected = await mgr.reconnect();
    expect(reconnected).not.toBeNull();

    // 重连成功后用 LiveHandle 热替换
    liveHandle.replace(reconnected!);
    expect(liveHandle.current).toBe(newConn);
    expect(liveHandle.current.sessionId).toBe('session-new');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  HeartbeatMonitor 在连接建立时被启动
// ═══════════════════════════════════════════════════════════════════════

describe('HeartbeatMonitor — 连接建立时启动', () => {
  let monitor: HeartbeatMonitor;

  afterEach(() => {
    if (monitor) monitor.stop();
  });

  test('连接建立后 start() 应使 monitor 进入 running 状态', () => {
    const pingFn = mock(async () => {});
    const onHealthChange = mock(() => {});

    monitor = new HeartbeatMonitor(
      pingFn,
      onHealthChange,
      { intervalMs: 60_000, timeoutMs: 5_000, maxMissedBeats: 3 },
    );

    // 模拟连接建立时调用 start()
    expect(monitor.running).toBe(false);
    monitor.start();
    expect(monitor.running).toBe(true);
    expect(monitor.status).toBe('healthy');
  });

  test('重连后 reset + start 应重置所有计数器并重新启动', async () => {
    const pingFn = mock(async () => { throw new Error('timeout'); });
    const onHealthChange = mock(() => {});

    monitor = new HeartbeatMonitor(
      pingFn,
      onHealthChange,
      { intervalMs: 60_000, timeoutMs: 5_000, maxMissedBeats: 3 },
    );
    monitor.start();

    // 模拟几次心跳失败
    await monitor.tick();
    await monitor.tick();
    expect(monitor.consecutiveMisses).toBe(2);
    expect(monitor.totalTimeouts).toBe(2);

    // 模拟重连成功后 reset
    monitor.stop();
    monitor.reset();

    expect(monitor.consecutiveMisses).toBe(0);
    expect(monitor.totalPings).toBe(0);
    expect(monitor.totalTimeouts).toBe(0);
    expect(monitor.status).toBe('healthy');

    // 重新启动
    monitor.start();
    expect(monitor.running).toBe(true);
  });
});
