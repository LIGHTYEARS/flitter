// Pipeline debug logging tests — applyEnvDebugFlags, resetDebugFlags, pipelineLog
// Tests for Task 1: environment-variable-driven debug logging

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { debugFlags, resetDebugFlags, applyEnvDebugFlags } from '../debug-flags';
import { pipelineLog } from '../pipeline-debug';

// ---------------------------------------------------------------------------
// applyEnvDebugFlags
// ---------------------------------------------------------------------------

describe('applyEnvDebugFlags', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.FLITTER_DEBUG;
    resetDebugFlags();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FLITTER_DEBUG;
    } else {
      process.env.FLITTER_DEBUG = originalEnv;
    }
    resetDebugFlags();
  });

  it('FLITTER_DEBUG=pipeline sets only debugShowFrameStats', () => {
    process.env.FLITTER_DEBUG = 'pipeline';
    applyEnvDebugFlags();

    expect(debugFlags.debugShowFrameStats).toBe(true);
    expect(debugFlags.debugPrintBuilds).toBe(false);
    expect(debugFlags.debugPrintLayouts).toBe(false);
    expect(debugFlags.debugPrintPaints).toBe(false);
    expect(debugFlags.debugPaintSize).toBe(false);
    expect(debugFlags.debugRepaintRainbow).toBe(false);
    expect(debugFlags.debugInspectorEnabled).toBe(false);
  });

  it('FLITTER_DEBUG=verbose sets all 4 diagnostic flags', () => {
    process.env.FLITTER_DEBUG = 'verbose';
    applyEnvDebugFlags();

    expect(debugFlags.debugShowFrameStats).toBe(true);
    expect(debugFlags.debugPrintBuilds).toBe(true);
    expect(debugFlags.debugPrintLayouts).toBe(true);
    expect(debugFlags.debugPrintPaints).toBe(true);
    expect(debugFlags.debugPaintSize).toBe(false);
    expect(debugFlags.debugRepaintRainbow).toBe(false);
    expect(debugFlags.debugInspectorEnabled).toBe(false);
  });

  it('unset FLITTER_DEBUG leaves all flags false', () => {
    delete process.env.FLITTER_DEBUG;
    applyEnvDebugFlags();

    for (const key of Object.keys(debugFlags) as Array<keyof typeof debugFlags>) {
      expect(debugFlags[key]).toBe(false);
    }
  });

  it('unknown FLITTER_DEBUG value leaves all flags false', () => {
    process.env.FLITTER_DEBUG = 'unknown_value';
    applyEnvDebugFlags();

    for (const key of Object.keys(debugFlags) as Array<keyof typeof debugFlags>) {
      expect(debugFlags[key]).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// resetDebugFlags
// ---------------------------------------------------------------------------

describe('resetDebugFlags', () => {
  it('resets all flags back to false', () => {
    debugFlags.debugShowFrameStats = true;
    debugFlags.debugPrintBuilds = true;
    debugFlags.debugPrintLayouts = true;
    debugFlags.debugPrintPaints = true;
    debugFlags.debugPaintSize = true;
    debugFlags.debugRepaintRainbow = true;
    debugFlags.debugInspectorEnabled = true;

    resetDebugFlags();

    for (const key of Object.keys(debugFlags) as Array<keyof typeof debugFlags>) {
      expect(debugFlags[key]).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// pipelineLog
// ---------------------------------------------------------------------------

describe('pipelineLog', () => {
  let stderrWrites: string[];
  let originalWrite: typeof process.stderr.write;

  beforeEach(() => {
    stderrWrites = [];
    originalWrite = process.stderr.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderrWrites.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stderr.write = originalWrite;
  });

  it('writes formatted message to stderr', () => {
    pipelineLog('TEST', 'hello world');

    expect(stderrWrites.length).toBe(1);
    expect(stderrWrites[0]).toBe('[TEST] hello world\n');
  });

  it('formats tag and message correctly', () => {
    pipelineLog('FRAME', 'total=1.23ms build=0.45ms');

    expect(stderrWrites[0]).toBe('[FRAME] total=1.23ms build=0.45ms\n');
  });
});
