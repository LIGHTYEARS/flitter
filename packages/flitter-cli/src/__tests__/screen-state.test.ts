// Unit tests for ScreenState — derivation of screen states from session and conversation state.
//
// Tests the pure deriveScreenState function with explicit inputs covering all six
// screen state variants: welcome, empty, loading, processing, error, ready.
// Verifies priority ordering (error > loading > processing > welcome > empty > ready).

import { describe, test, expect } from 'bun:test';
import type { SessionLifecycle, SessionError } from '../state/types';
import { deriveScreenState } from '../state/screen-state';
import type { ScreenState } from '../state/screen-state';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('deriveScreenState', () => {

  // --- Welcome screen ---

  describe('welcome screen', () => {
    test('returns welcome when idle, empty, and turnCount is 0', () => {
      const result = deriveScreenState('idle', true, 0, null);
      expect(result.kind).toBe('welcome');
    });

    test('welcome has no error property', () => {
      const result = deriveScreenState('idle', true, 0, null);
      expect(result.kind).toBe('welcome');
      expect('error' in result).toBe(false);
    });
  });

  // --- Empty screen ---

  describe('empty screen', () => {
    test('returns empty when idle, empty, and turnCount > 0 (new thread after conversation)', () => {
      const result = deriveScreenState('idle', true, 5, null);
      expect(result.kind).toBe('empty');
    });

    test('returns empty when idle, empty, turnCount is 1', () => {
      const result = deriveScreenState('idle', true, 1, null);
      expect(result.kind).toBe('empty');
    });
  });

  // --- Loading screen ---

  describe('loading screen', () => {
    test('returns loading when processing and conversation is empty (first prompt)', () => {
      const result = deriveScreenState('processing', true, 0, null);
      expect(result.kind).toBe('loading');
    });

    test('returns loading when processing, empty, and turnCount > 0', () => {
      const result = deriveScreenState('processing', true, 3, null);
      expect(result.kind).toBe('loading');
    });
  });

  // --- Processing screen ---

  describe('processing screen', () => {
    test('returns processing when processing with items', () => {
      const result = deriveScreenState('processing', false, 1, null);
      expect(result.kind).toBe('processing');
    });

    test('returns processing when streaming with items', () => {
      const result = deriveScreenState('streaming', false, 2, null);
      expect(result.kind).toBe('processing');
    });

    test('returns processing when streaming and empty (stream started before items)', () => {
      const result = deriveScreenState('streaming', true, 0, null);
      expect(result.kind).toBe('processing');
    });
  });

  // --- Error screen ---

  describe('error screen', () => {
    test('returns error when lifecycle is error with error object', () => {
      const err: SessionError = { message: 'Rate limited', code: '429', retryable: true };
      const result = deriveScreenState('error', false, 2, err);
      expect(result.kind).toBe('error');
      if (result.kind === 'error') {
        expect(result.error).toBe(err);
        expect(result.error.message).toBe('Rate limited');
        expect(result.error.retryable).toBe(true);
      }
    });

    test('returns error when lifecycle is error and conversation is empty', () => {
      const err: SessionError = { message: 'Auth failed', code: '401', retryable: false };
      const result = deriveScreenState('error', true, 0, err);
      expect(result.kind).toBe('error');
    });

    test('error takes priority over other derivations', () => {
      const err: SessionError = { message: 'fail', code: null, retryable: false };
      // Even with empty=true and turnCount=0 (would be welcome), error wins
      const result = deriveScreenState('error', true, 0, err);
      expect(result.kind).toBe('error');
    });
  });

  // --- Ready screen ---

  describe('ready screen', () => {
    test('returns ready when idle with items', () => {
      const result = deriveScreenState('idle', false, 2, null);
      expect(result.kind).toBe('ready');
    });

    test('returns ready when complete with items', () => {
      const result = deriveScreenState('complete', false, 1, null);
      expect(result.kind).toBe('ready');
    });

    test('returns ready when cancelled with items', () => {
      const result = deriveScreenState('cancelled', false, 1, null);
      expect(result.kind).toBe('ready');
    });
  });

  // --- Priority ordering ---

  describe('priority ordering', () => {
    test('error has highest priority', () => {
      const err: SessionError = { message: 'err', code: null, retryable: false };
      // error lifecycle should always produce error screen
      const result = deriveScreenState('error', false, 0, err);
      expect(result.kind).toBe('error');
    });

    test('loading has priority over welcome when processing and empty', () => {
      // processing + empty -> loading (not welcome)
      const result = deriveScreenState('processing', true, 0, null);
      expect(result.kind).toBe('loading');
    });

    test('processing has priority over ready when processing with items', () => {
      const result = deriveScreenState('processing', false, 1, null);
      expect(result.kind).toBe('processing');
    });
  });

  // --- ScreenState discriminated union exhaustiveness ---

  describe('exhaustive coverage', () => {
    test('all six variants are distinguishable by kind', () => {
      const err: SessionError = { message: 'x', code: null, retryable: false };

      const welcome = deriveScreenState('idle', true, 0, null);
      const empty = deriveScreenState('idle', true, 3, null);
      const loading = deriveScreenState('processing', true, 0, null);
      const processing = deriveScreenState('streaming', false, 1, null);
      const error = deriveScreenState('error', false, 1, err);
      const ready = deriveScreenState('idle', false, 2, null);

      const kinds = new Set([
        welcome.kind,
        empty.kind,
        loading.kind,
        processing.kind,
        error.kind,
        ready.kind,
      ]);

      expect(kinds.size).toBe(6);
      expect(kinds.has('welcome')).toBe(true);
      expect(kinds.has('empty')).toBe(true);
      expect(kinds.has('loading')).toBe(true);
      expect(kinds.has('processing')).toBe(true);
      expect(kinds.has('error')).toBe(true);
      expect(kinds.has('ready')).toBe(true);
    });
  });
});
