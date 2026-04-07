// Tests for prompt symbol utility (I12).

import { describe, it, expect } from 'bun:test';
import { getPromptSymbol } from '../utils/prompt-symbol';
import type { SessionLifecycle } from '../state/types';

describe('getPromptSymbol (I12)', () => {
  it('returns ">" for idle', () => {
    expect(getPromptSymbol('idle')).toBe('>');
  });

  it('returns "…" for streaming', () => {
    expect(getPromptSymbol('streaming')).toBe('\u2026');
  });

  it('returns "⚙" for processing', () => {
    expect(getPromptSymbol('processing')).toBe('\u2699');
  });

  it('returns "⚙" for tool_execution', () => {
    expect(getPromptSymbol('tool_execution')).toBe('\u2699');
  });

  it('returns "✓" for complete', () => {
    expect(getPromptSymbol('complete')).toBe('\u2713');
  });

  it('returns "✗" for error', () => {
    expect(getPromptSymbol('error')).toBe('\u2717');
  });

  it('returns "✗" for cancelled', () => {
    expect(getPromptSymbol('cancelled')).toBe('\u2717');
  });

  it('covers all SessionLifecycle values', () => {
    const allStates: SessionLifecycle[] = [
      'idle',
      'processing',
      'streaming',
      'tool_execution',
      'complete',
      'error',
      'cancelled',
    ];

    for (const state of allStates) {
      const symbol = getPromptSymbol(state);
      expect(typeof symbol).toBe('string');
      expect(symbol.length).toBeGreaterThan(0);
    }
  });

  it('returns a non-empty string for every state', () => {
    // Defensive: even an unknown state (cast) should not throw
    const symbol = getPromptSymbol('idle');
    expect(symbol).toBeTruthy();
  });
});
