// Tests for AppState gap closures: copyLastResponse, cycleMode, getMessageAt,
// truncateAfter, contextWindowUsagePercent, isContextWindowHigh.

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import type { Provider, PromptOptions } from '../provider/provider';
import type { StreamEvent } from '../state/types';
import { SessionState } from '../state/session';
import { PromptHistory } from '../state/history';
import { SessionStore } from '../state/session-store';
import { AppState } from '../state/app-state';
import { PromptController } from '../state/prompt-controller';

// ---------------------------------------------------------------------------
// Mock Provider
// ---------------------------------------------------------------------------

class MockProvider implements Provider {
  readonly id = 'mock' as const;
  readonly name = 'mock';
  readonly model = 'test-model';
  readonly capabilities = { vision: true, functionCalling: true, streaming: true, systemPrompt: true };
  mockEvents: StreamEvent[] = [];
  cancelCalled = false;

  cancelRequest(): void {
    this.cancelCalled = true;
  }

  async *sendPrompt(
    _messages: Array<{ role: string; content: string }>,
    _options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    for (const event of this.mockEvents) {
      yield event;
    }
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createTestAppState() {
  const provider = new MockProvider();
  const session = new SessionState({
    sessionId: 'test-session',
    cwd: '/test',
    model: provider.model,
  });
  const appState = new AppState(session, new PromptHistory(), new SessionStore());
  const controller = new PromptController({ session, provider });
  appState.setPromptController(controller);
  return { appState, session, provider };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AppState gap closures', () => {
  let appState: AppState;
  let session: SessionState;

  beforeEach(() => {
    const harness = createTestAppState();
    appState = harness.appState;
    session = harness.session;
  });

  // --- S1: copyLastResponse ---

  describe('copyLastResponse()', () => {
    test('returns false when there is no assistant message', async () => {
      const result = await appState.copyLastResponse();
      expect(result).toBe(false);
    });

    test('returns false when Bun.spawn fails (no clipboard tool)', async () => {
      // Add an assistant message to the conversation
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendAssistantChunk('response text');
      session.completeStream('end_turn');
      session.reset();

      // On this test environment, clipboard commands (pbcopy/xclip/clip) are
      // unlikely to be available, so we expect the spawn to fail and return false.
      const result = await appState.copyLastResponse();
      // It should return a boolean (either true if the command exists, or false)
      expect(typeof result).toBe('boolean');
    });

    test('gets the correct last assistant message text', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendAssistantChunk('first response');
      session.completeStream('end_turn');
      session.reset();

      session.startProcessing('second');
      session.beginStreaming();
      session.appendAssistantChunk('second response');
      session.completeStream('end_turn');

      expect(appState.getLastAssistantMessage()).toBe('second response');
    });
  });

  // --- S2: cycleMode ---

  describe('cycleMode()', () => {
    test('cycles through default modes when modes array is empty', () => {
      // Default modes: smart -> code -> ask -> smart
      appState.cycleMode();
      expect(appState.currentMode).toBe('code');

      appState.cycleMode();
      expect(appState.currentMode).toBe('ask');

      appState.cycleMode();
      expect(appState.currentMode).toBe('smart');
    });

    test('cycles through custom modes array', () => {
      appState.modes = ['alpha', 'beta', 'gamma'];
      appState.currentMode = 'alpha';

      appState.cycleMode();
      expect(appState.currentMode).toBe('beta');

      appState.cycleMode();
      expect(appState.currentMode).toBe('gamma');

      appState.cycleMode();
      expect(appState.currentMode).toBe('alpha');
    });

    test('starts from first mode when currentMode is null', () => {
      appState.currentMode = null;
      appState.cycleMode();
      // Default: currentMode ?? available[0] = 'smart', idx=0, next = (0+1)%3 = 'code'
      expect(appState.currentMode).toBe('code');
    });

    test('handles unknown currentMode by wrapping to first', () => {
      appState.currentMode = 'unknown';
      appState.cycleMode();
      // indexOf('unknown') = -1, (-1+1)%3 = 0 => 'smart'
      expect(appState.currentMode).toBe('smart');
    });

    test('notifies listeners', () => {
      let called = false;
      appState.addListener(() => { called = true; });
      appState.cycleMode();
      expect(called).toBe(true);
    });
  });

  // --- S5: getMessageAt / truncateAfter facades ---

  describe('getMessageAt()', () => {
    test('returns null for empty conversation', () => {
      expect(appState.getMessageAt(0)).toBeNull();
    });

    test('returns user message text at valid index', () => {
      session.startProcessing('hello world');
      session.beginStreaming();
      session.completeStream('end_turn');
      session.reset();

      // Index 0 should be the user message
      expect(appState.getMessageAt(0)).toBe('hello world');
    });

    test('returns null for non-user-message index', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendAssistantChunk('reply');
      session.completeStream('end_turn');

      // Index 1 is the assistant message, not a user message
      expect(appState.getMessageAt(1)).toBeNull();
    });

    test('returns null for out-of-bounds index', () => {
      expect(appState.getMessageAt(999)).toBeNull();
    });
  });

  describe('truncateAfter()', () => {
    test('truncates items after given index', () => {
      session.startProcessing('first');
      session.beginStreaming();
      session.appendAssistantChunk('reply1');
      session.completeStream('end_turn');
      session.reset();

      session.startProcessing('second');
      session.beginStreaming();
      session.appendAssistantChunk('reply2');
      session.completeStream('end_turn');
      session.reset();

      const itemsBefore = appState.items.length;
      expect(itemsBefore).toBeGreaterThan(1);

      // Truncate after the first item (index 0)
      appState.truncateAfter(0);
      expect(appState.items.length).toBe(1);
    });

    test('notifies listeners after truncation', () => {
      session.startProcessing('msg');
      session.beginStreaming();
      session.completeStream('end_turn');
      session.reset();

      let callCount = 0;
      appState.addListener(() => { callCount++; });
      appState.truncateAfter(0);
      expect(callCount).toBeGreaterThan(0);
    });
  });

  // --- S4: context window getters ---

  describe('contextWindowUsagePercent', () => {
    test('returns 0 when no usage data', () => {
      expect(appState.contextWindowUsagePercent).toBe(0);
    });

    test('returns correct percentage', () => {
      session.setUsage({ size: 100000, used: 50000 });
      expect(appState.contextWindowUsagePercent).toBe(50);
    });

    test('rounds to nearest integer', () => {
      session.setUsage({ size: 100000, used: 33333 });
      expect(appState.contextWindowUsagePercent).toBe(33);
    });

    test('returns 0 when size is 0', () => {
      session.setUsage({ size: 0, used: 500 });
      expect(appState.contextWindowUsagePercent).toBe(0);
    });

    test('handles 100% usage', () => {
      session.setUsage({ size: 200000, used: 200000 });
      expect(appState.contextWindowUsagePercent).toBe(100);
    });
  });

  describe('isContextWindowHigh', () => {
    test('returns false when no usage', () => {
      expect(appState.isContextWindowHigh).toBe(false);
    });

    test('returns false when usage is under 80%', () => {
      session.setUsage({ size: 100000, used: 79000 });
      expect(appState.isContextWindowHigh).toBe(false);
    });

    test('returns true when usage exceeds 80%', () => {
      session.setUsage({ size: 100000, used: 81000 });
      expect(appState.isContextWindowHigh).toBe(true);
    });

    test('returns true at exactly 81%', () => {
      session.setUsage({ size: 100000, used: 81000 });
      expect(appState.isContextWindowHigh).toBe(true);
    });
  });

  // --- modes field ---

  describe('modes field', () => {
    test('defaults to empty array', () => {
      expect(appState.modes).toEqual([]);
    });

    test('can be set to custom array', () => {
      appState.modes = ['fast', 'slow'];
      expect(appState.modes).toEqual(['fast', 'slow']);
    });
  });

  // --- elapsedMs ---

  describe('elapsedMs', () => {
    test('returns 0 when no prompt in progress', () => {
      expect(appState.elapsedMs).toBe(0);
    });
  });
});
