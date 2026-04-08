// Unit tests for pipeline-bridge — sink installation, frame-overrun detection, teardown.
// Uses mock.module() to intercept flitter-core and logger dependencies.

import { describe, test, expect, beforeEach, mock } from 'bun:test';

// ---------------------------------------------------------------------------
// Capture setPipelineLogSink / resetPipelineLogSink calls
// ---------------------------------------------------------------------------

let installedSink: ((tag: string, msg: string) => void) | null = null;
let resetCalled = false;
const warnCalls: Array<[string, Record<string, unknown> | undefined]> = [];

mock.module('flitter-core', () => ({
  setPipelineLogSink: (sink: (tag: string, msg: string) => void) => {
    installedSink = sink;
  },
  resetPipelineLogSink: () => {
    resetCalled = true;
  },
}));

mock.module('../utils/logger', () => ({
  log: {
    warn: (msg: string, data?: Record<string, unknown>) => {
      warnCalls.push([msg, data]);
    },
    debug: () => {},
    info: () => {},
    error: () => {},
    fatal: () => {},
  },
  writeEntry: () => {},
}));

// Import after mocking
import { initPipelineBridge, teardownPipelineBridge } from '../utils/pipeline-bridge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetState() {
  installedSink = null;
  resetCalled = false;
  warnCalls.length = 0;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pipeline-bridge', () => {
  beforeEach(() => {
    resetState();
  });

  test('initPipelineBridge installs a pipeline log sink', () => {
    initPipelineBridge();
    expect(installedSink).not.toBeNull();
    expect(typeof installedSink).toBe('function');
  });

  test('pipeline sink emits frame-overrun warning for slow frames', () => {
    initPipelineBridge();
    expect(installedSink).not.toBeNull();

    // 20.50ms total — above 16.67ms budget
    installedSink!('FRAME', 'total=20.50ms build=5.00ms layout=3.00ms paint=10.00ms render=2.50ms');

    expect(warnCalls.length).toBe(1);
    const [msg, data] = warnCalls[0];
    expect(msg).toContain('frame-overrun');
    expect(data).toBeDefined();
    expect((data as Record<string, unknown>).totalMs).toBe(20.5);
  });

  test('pipeline sink ignores frames within budget', () => {
    initPipelineBridge();
    expect(installedSink).not.toBeNull();

    // 10.00ms total — under 16.67ms budget
    installedSink!('FRAME', 'total=10.00ms build=2.00ms layout=2.00ms paint=4.00ms render=2.00ms');

    expect(warnCalls.length).toBe(0);
  });

  test('pipeline sink ignores non-FRAME tags', () => {
    initPipelineBridge();
    expect(installedSink).not.toBeNull();

    installedSink!('BUILD', 'some build message');

    expect(warnCalls.length).toBe(0);
  });

  test('teardownPipelineBridge resets the sink', () => {
    teardownPipelineBridge();
    expect(resetCalled).toBe(true);
  });
});
