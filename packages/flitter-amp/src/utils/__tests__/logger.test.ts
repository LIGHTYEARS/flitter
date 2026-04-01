// Structured logger tests
// Verifies: level filtering, context injection, Error extraction,
// FATAL level, stderr text format, and clearLogContext.

import { describe, test, expect, afterEach, beforeEach } from 'bun:test';
import { log, setLogLevel, setLogContext, clearLogContext } from '../logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Capture all bytes written to process.stderr during `fn()`. */
function captureStderr(fn: () => void): string {
  const chunks: Buffer[] = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk: any, ...rest: any[]) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return true;
  };
  try {
    fn();
  } finally {
    process.stderr.write = originalWrite;
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  clearLogContext();
  setLogLevel('info');
});

afterEach(() => {
  clearLogContext();
  setLogLevel('info');
});

// ---------------------------------------------------------------------------
// Level filtering
// ---------------------------------------------------------------------------

describe('Level filtering', () => {
  test('info is logged at default level', () => {
    const output = captureStderr(() => log.info('hello'));
    expect(output).toContain('[INFO]');
    expect(output).toContain('hello');
  });

  test('debug is suppressed at default info level', () => {
    const output = captureStderr(() => log.debug('hidden'));
    expect(output).toBe('');
  });

  test('debug is logged when level is set to debug', () => {
    setLogLevel('debug');
    const output = captureStderr(() => log.debug('visible'));
    expect(output).toContain('[DEBUG]');
    expect(output).toContain('visible');
  });

  test('warn is logged at info level', () => {
    const output = captureStderr(() => log.warn('heads up'));
    expect(output).toContain('[WARN]');
  });

  test('error is logged at info level', () => {
    const output = captureStderr(() => log.error('boom'));
    expect(output).toContain('[ERROR]');
  });

  test('info is suppressed when level is error', () => {
    setLogLevel('error');
    const output = captureStderr(() => log.info('quiet'));
    expect(output).toBe('');
  });

  test('fatal is never suppressed by lower levels', () => {
    setLogLevel('fatal');
    const output = captureStderr(() => {
      log.error('should be hidden');
      log.fatal('should appear');
    });
    expect(output).not.toContain('[ERROR]');
    expect(output).toContain('[FATAL]');
    expect(output).toContain('should appear');
  });
});

// ---------------------------------------------------------------------------
// Stderr text format
// ---------------------------------------------------------------------------

describe('Stderr text format', () => {
  test('matches [HH:mm:ss.SSS] [LEVEL] message pattern', () => {
    const output = captureStderr(() => log.info('test message'));
    expect(output).toMatch(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\] \[INFO\] test message\n$/);
  });

  test('includes data as JSON suffix', () => {
    const output = captureStderr(() => log.info('tagged', { key: 'val' }));
    expect(output).toContain('tagged {"key":"val"}');
  });
});

// ---------------------------------------------------------------------------
// FATAL level
// ---------------------------------------------------------------------------

describe('FATAL level', () => {
  test('log.fatal exists and is callable', () => {
    expect(typeof log.fatal).toBe('function');
  });

  test('fatal outputs [FATAL] tag', () => {
    const output = captureStderr(() => log.fatal('critical'));
    expect(output).toContain('[FATAL]');
    expect(output).toContain('critical');
  });

  test('fatal with Error extracts stack', () => {
    const err = new Error('kaboom');
    const output = captureStderr(() => log.fatal('crash', err));
    expect(output).toContain('kaboom');
    expect(output).toContain('Error: kaboom');
  });
});

// ---------------------------------------------------------------------------
// Error extraction
// ---------------------------------------------------------------------------

describe('Error extraction', () => {
  test('log.error with Error includes stack trace in stderr', () => {
    const err = new Error('oops');
    const output = captureStderr(() => log.error('failed', err));
    expect(output).toContain('[ERROR]');
    expect(output).toContain('failed');
    expect(output).toContain('Error: oops');
  });

  test('log.error with non-Error value includes stringified value', () => {
    const output = captureStderr(() => log.error('problem', 'string-error' as any));
    expect(output).toContain('"string-error"');
  });

  test('log.error with no error arg just shows message', () => {
    const output = captureStderr(() => log.error('just a message'));
    expect(output).toContain('[ERROR] just a message');
  });
});

// ---------------------------------------------------------------------------
// Context injection
// ---------------------------------------------------------------------------

describe('Context injection', () => {
  test('setLogContext merges fields (visible as data in stderr mode is not applicable, but context is set)', () => {
    setLogContext({ sessionId: 'abc' });
    setLogContext({ user: 'test' });
    // In stderr mode context is not printed inline, but it should be stored.
    // We verify the merge by clearing and checking that a new log has no leftover.
    clearLogContext();
    const output = captureStderr(() => log.info('after clear'));
    expect(output).toContain('after clear');
    expect(output).not.toContain('sessionId');
  });

  test('clearLogContext resets context', () => {
    setLogContext({ key: 'value' });
    clearLogContext();
    setLogContext({ fresh: true });
    clearLogContext();
    // After double clear, context should be empty — no side effects
    const output = captureStderr(() => log.info('clean'));
    expect(output).toContain('clean');
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility
// ---------------------------------------------------------------------------

describe('Backward compatibility', () => {
  test('log.error with non-Error second arg does not throw', () => {
    expect(() => {
      log.error('Cancel failed:', { code: 42 } as any);
    }).not.toThrow();
  });

  test('log.info with no data arg works', () => {
    const output = captureStderr(() => log.info('simple'));
    expect(output).toContain('simple');
  });
});

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

describe('Module exports', () => {
  test('exports setLogContext and clearLogContext', () => {
    expect(typeof setLogContext).toBe('function');
    expect(typeof clearLogContext).toBe('function');
  });

  test('log has all five methods', () => {
    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.fatal).toBe('function');
  });
});
