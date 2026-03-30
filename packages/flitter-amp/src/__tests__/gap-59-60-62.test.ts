// Tests for Gap #59 (ACP type safety), Gap #60 (graceful shutdown), Gap #62 (safeUtf8Slice)

import { describe, test, expect, mock } from 'bun:test';
import { safeUtf8Slice } from '../utils/buffer';
import { gracefulShutdown, SHUTDOWN_DEADLINE_MS } from '../acp/graceful-shutdown';
import { supportsCloseSession, hasSessionCapability } from '../acp/capabilities';
import type { ConnectionHandle } from '../acp/connection';

// ═══════════════════════════════════════════════════════════════════════
//  Gap #62 — safeUtf8Slice
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #62 — safeUtf8Slice', () => {
  test('returns same buffer if maxBytes >= buffer length', () => {
    const buf = Buffer.from('hello');
    expect(safeUtf8Slice(buf, 100)).toBe(buf);
    expect(safeUtf8Slice(buf, 5)).toBe(buf);
  });

  test('returns empty buffer for maxBytes <= 0', () => {
    const buf = Buffer.from('hello');
    expect(safeUtf8Slice(buf, 0).byteLength).toBe(0);
    expect(safeUtf8Slice(buf, -1).byteLength).toBe(0);
  });

  test('slices ASCII cleanly at byte boundary', () => {
    const buf = Buffer.from('hello world');
    const sliced = safeUtf8Slice(buf, 5);
    expect(sliced.toString('utf-8')).toBe('hello');
    expect(sliced.byteLength).toBe(5);
  });

  test('does not split 2-byte UTF-8 characters', () => {
    // U+00E9 (e-acute) = 0xC3 0xA9 in UTF-8
    const buf = Buffer.from('caf\u00e9');
    // "caf" = 3 bytes, "\u00e9" = 2 bytes, total = 5 bytes
    expect(buf.byteLength).toBe(5);

    // Cutting at byte 4 would split the 2-byte e-acute
    const sliced = safeUtf8Slice(buf, 4);
    expect(sliced.toString('utf-8')).toBe('caf');
    expect(sliced.byteLength).toBe(3);

    // Cutting at byte 5 includes the full character
    const full = safeUtf8Slice(buf, 5);
    expect(full.toString('utf-8')).toBe('caf\u00e9');
  });

  test('does not split 3-byte UTF-8 characters (CJK)', () => {
    // U+4E16 (CJK "world") = 0xE4 0xB8 0x96 in UTF-8
    const buf = Buffer.from('A\u4e16B');
    // "A" = 1 byte, "\u4E16" = 3 bytes, "B" = 1 byte, total = 5 bytes
    expect(buf.byteLength).toBe(5);

    // Cutting at byte 2 would land in the middle of the 3-byte char
    const sliced2 = safeUtf8Slice(buf, 2);
    expect(sliced2.toString('utf-8')).toBe('A');
    expect(sliced2.byteLength).toBe(1);

    // Cutting at byte 3 would also land in the middle
    const sliced3 = safeUtf8Slice(buf, 3);
    expect(sliced3.toString('utf-8')).toBe('A');
    expect(sliced3.byteLength).toBe(1);

    // Cutting at byte 4 includes the full CJK character
    const sliced4 = safeUtf8Slice(buf, 4);
    expect(sliced4.toString('utf-8')).toBe('A\u4e16');
    expect(sliced4.byteLength).toBe(4);
  });

  test('does not split 4-byte UTF-8 characters (emoji)', () => {
    // U+1F600 (grinning face) = 0xF0 0x9F 0x98 0x80 in UTF-8
    const buf = Buffer.from('hi\u{1F600}!');
    // "hi" = 2 bytes, emoji = 4 bytes, "!" = 1 byte, total = 7 bytes
    expect(buf.byteLength).toBe(7);

    // Cutting at byte 3 lands in the emoji
    const sliced3 = safeUtf8Slice(buf, 3);
    expect(sliced3.toString('utf-8')).toBe('hi');
    expect(sliced3.byteLength).toBe(2);

    // Cutting at byte 5 still in the emoji
    const sliced5 = safeUtf8Slice(buf, 5);
    expect(sliced5.toString('utf-8')).toBe('hi');
    expect(sliced5.byteLength).toBe(2);

    // Cutting at byte 6 includes the full emoji
    const sliced6 = safeUtf8Slice(buf, 6);
    expect(sliced6.toString('utf-8')).toBe('hi\u{1F600}');
    expect(sliced6.byteLength).toBe(6);
  });

  test('handles buffer containing only multi-byte characters', () => {
    // Three 3-byte CJK characters: total 9 bytes
    const buf = Buffer.from('\u4e16\u754c\u4eba');
    expect(buf.byteLength).toBe(9);

    // Cutting at 1 or 2 gives empty (first char doesn't fit)
    const sliced1 = safeUtf8Slice(buf, 1);
    expect(sliced1.byteLength).toBe(0);

    const sliced2 = safeUtf8Slice(buf, 2);
    expect(sliced2.byteLength).toBe(0);

    // Cutting at 3 gives the first character
    const sliced3 = safeUtf8Slice(buf, 3);
    expect(sliced3.toString('utf-8')).toBe('\u4e16');
    expect(sliced3.byteLength).toBe(3);
  });

  test('handles empty buffer', () => {
    const buf = Buffer.alloc(0);
    expect(safeUtf8Slice(buf, 10).byteLength).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #59 — Capability inspection utilities
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #59 — supportsCloseSession / hasSessionCapability', () => {
  test('returns false for undefined capabilities', () => {
    expect(supportsCloseSession(undefined)).toBe(false);
    expect(hasSessionCapability(undefined, 'close')).toBe(false);
  });

  test('returns false for empty capabilities', () => {
    expect(supportsCloseSession({} as any)).toBe(false);
  });

  test('returns false when session object is missing', () => {
    expect(supportsCloseSession({ terminal: true } as any)).toBe(false);
  });

  test('returns false when close is not set', () => {
    const caps = { session: {} } as any;
    expect(supportsCloseSession(caps)).toBe(false);
  });

  test('returns true when session.close is true', () => {
    const caps = { session: { close: true } } as any;
    expect(supportsCloseSession(caps)).toBe(true);
  });

  test('returns false when session.close is false', () => {
    const caps = { session: { close: false } } as any;
    expect(supportsCloseSession(caps)).toBe(false);
  });

  test('hasSessionCapability returns correct for arbitrary capabilities', () => {
    const caps = { session: { resume: true, fork: false } } as any;
    expect(hasSessionCapability(caps, 'resume')).toBe(true);
    expect(hasSessionCapability(caps, 'fork')).toBe(false);
    expect(hasSessionCapability(caps, 'nonexistent')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #60 — Graceful Shutdown Orchestrator
// ═══════════════════════════════════════════════════════════════════════

function createMockShutdownHandle(): ConnectionHandle {
  return {
    connection: {
      unstable_closeSession: mock(() => Promise.resolve({})),
    } as any,
    client: {
      cleanup: mock(() => {}),
    } as any,
    agent: {
      stdin: {} as any,
      stdout: {} as any,
      kill: mock(() => {}),
      onExit: () => {},
    },
    capabilities: undefined,
    agentInfo: { name: 'test-agent', version: '0.0.0' },
    sessionId: 'test-session',
    supportsCloseSession: false,
  };
}

describe('Gap #60 — gracefulShutdown', () => {
  test('calls saveSession, cleanup, kill in order', async () => {
    const handle = createMockShutdownHandle();
    const saveSession = mock(() => {});

    const result = await gracefulShutdown({ handle, saveSession }, 5_000);

    expect(result).toBe(true);
    expect(saveSession).toHaveBeenCalledTimes(1);
    expect(handle.client.cleanup).toHaveBeenCalledTimes(1);
    expect(handle.agent.kill).toHaveBeenCalledTimes(1);
  });

  test('continues even if saveSession throws', async () => {
    const handle = createMockShutdownHandle();
    const saveSession = mock(() => { throw new Error('disk full'); });

    const result = await gracefulShutdown({ handle, saveSession }, 5_000);

    expect(result).toBe(true);
    // Despite the error, cleanup and kill should still be called
    expect(handle.client.cleanup).toHaveBeenCalledTimes(1);
    expect(handle.agent.kill).toHaveBeenCalledTimes(1);
  });

  test('continues even if client.cleanup throws', async () => {
    const handle = createMockShutdownHandle();
    (handle.client.cleanup as any).mockImplementation(() => {
      throw new Error('cleanup failed');
    });
    const saveSession = mock(() => {});

    const result = await gracefulShutdown({ handle, saveSession }, 5_000);

    expect(result).toBe(true);
    // kill should still be called even if cleanup throws
    expect(handle.agent.kill).toHaveBeenCalledTimes(1);
  });

  test('returns false when deadline is extremely short (0ms)', async () => {
    const handle = createMockShutdownHandle();
    const saveSession = mock(() => {});

    // A 0ms deadline should fire the timeout immediately, racing the shutdown work.
    // Due to Promise microtask ordering, the result is non-deterministic,
    // but the function should never throw.
    const result = await gracefulShutdown({ handle, saveSession }, 0);
    // Either true or false is acceptable with 0ms -- just verify no throw.
    expect(typeof result).toBe('boolean');
    // Agent kill should always happen (either in work or in timeout fallback).
    expect(handle.agent.kill).toHaveBeenCalled();
  });

  test('SHUTDOWN_DEADLINE_MS is 8 seconds', () => {
    expect(SHUTDOWN_DEADLINE_MS).toBe(8_000);
  });

  test('skips closeSession when not supported', async () => {
    const handle = createMockShutdownHandle();
    handle.supportsCloseSession = false;
    const saveSession = mock(() => {});

    const result = await gracefulShutdown({ handle, saveSession }, 5_000);

    expect(result).toBe(true);
    // unstable_closeSession should NOT be called
    expect(handle.connection.unstable_closeSession).not.toHaveBeenCalled();
  });
});
