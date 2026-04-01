import { describe, test, expect, afterEach } from 'bun:test';
import { pipelineLog, setPipelineLogSink, resetPipelineLogSink } from '../pipeline-debug';

describe('setPipelineLogSink / resetPipelineLogSink', () => {
  afterEach(() => {
    resetPipelineLogSink();
  });

  test('default sink writes formatted message to stderr', () => {
    const stderrWrites: string[] = [];
    const originalWrite = process.stderr.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderrWrites.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stderr.write;

    try {
      pipelineLog('TAG', 'hello');
      expect(stderrWrites).toEqual(['[TAG] hello\n']);
    } finally {
      process.stderr.write = originalWrite;
    }
  });

  test('setPipelineLogSink replaces the sink', () => {
    const calls: Array<{ tag: string; msg: string }> = [];
    setPipelineLogSink((tag, msg) => {
      calls.push({ tag, msg });
    });

    pipelineLog('CUSTOM', 'data');

    expect(calls).toEqual([{ tag: 'CUSTOM', msg: 'data' }]);
  });

  test('resetPipelineLogSink restores default stderr behavior', () => {
    setPipelineLogSink(() => {});
    resetPipelineLogSink();

    const stderrWrites: string[] = [];
    const originalWrite = process.stderr.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderrWrites.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stderr.write;

    try {
      pipelineLog('RESET', 'check');
      expect(stderrWrites).toEqual(['[RESET] check\n']);
    } finally {
      process.stderr.write = originalWrite;
    }
  });
});
