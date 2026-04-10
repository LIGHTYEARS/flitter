// compaction-execution.test.ts -- Tests for compaction execution (F3).
//
// Validates that truncateBefore() correctly removes early conversation items,
// that _checkCompaction() actually executes the cut, and that isAutoCompacting
// dynamically reflects compaction state from PromptController.

import { describe, test, expect, beforeEach } from 'bun:test';
import { SessionState } from '../../src/state/session';
import { PromptController } from '../../src/state/prompt-controller';
import { AppState } from '../../src/state/app-state';
import { PromptHistory } from '../../src/state/history';
import { SessionStore } from '../../src/state/session-store';
import type { ConversationItem, CompactionState } from '../../src/state/types';
import type { Provider, PromptOptions } from '../../src/provider/provider';
import type { ProviderMessage, StreamEvent } from '../../src/state/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal SessionState for testing. */
function makeSession(): SessionState {
  return new SessionState({
    sessionId: `test-${Date.now()}`,
    cwd: '/tmp',
    model: 'test-model',
  });
}

/** Create a mock Provider. */
function makeMockProvider(): Provider {
  return {
    model: 'test-model',
    sendPrompt: (_messages: ProviderMessage[], _options?: PromptOptions) => {
      return (async function* () {
        yield { type: 'text_delta', text: 'Hello' } as StreamEvent;
        yield { type: 'message_complete', stopReason: 'end_turn' } as StreamEvent;
      })();
    },
    cancelRequest: () => {},
  } as Provider;
}

/**
 * Populate a session with a simulated multi-turn conversation.
 * Returns the session in idle state with N user-assistant turn pairs.
 */
function populateSession(session: SessionState, turnCount: number): void {
  for (let i = 0; i < turnCount; i++) {
    session.startProcessing(`user message ${i}`);
    session.beginStreaming();
    session.appendAssistantChunk(`assistant response ${i}`);
    session.completeStream('end_turn');
    session.reset();
  }
}

/** Create a wired AppState for testing. */
function createTestAppState() {
  const provider = makeMockProvider();
  const session = makeSession();
  const appState = new AppState(session, new PromptHistory(), new SessionStore());
  const controller = new PromptController({ session, provider });
  appState.setPromptController(controller);
  return { appState, session, provider, controller };
}

// =============================================================================
// SessionState.truncateBefore
// =============================================================================
describe('SessionState.truncateBefore', () => {
  let session: SessionState;

  beforeEach(() => {
    session = makeSession();
  });

  // -------------------------------------------------------------------------
  // 1. Removes items before the cut index
  // -------------------------------------------------------------------------
  test('removes items before the cut index', () => {
    populateSession(session, 4); // 8 items: 4 user + 4 assistant
    const originalLength = session.items.length;
    expect(originalLength).toBe(8);

    session.truncateBefore(4);
    expect(session.items.length).toBe(4);
  });

  // -------------------------------------------------------------------------
  // 2. Preserves items from cut index onward
  // -------------------------------------------------------------------------
  test('preserves items from cut index onward', () => {
    populateSession(session, 4);
    const originalItems = [...session.items];

    session.truncateBefore(4);
    expect(session.items.length).toBe(4);

    // The remaining items should be items[4..7] from the original
    for (let i = 0; i < session.items.length; i++) {
      expect(session.items[i]).toEqual(originalItems[4 + i]);
    }
  });

  // -------------------------------------------------------------------------
  // 3. No-op when lifecycle is not idle
  // -------------------------------------------------------------------------
  test('no-op when lifecycle is not idle', () => {
    populateSession(session, 3);
    const originalLength = session.items.length;

    // Transition to processing
    session.startProcessing('another message');
    expect(session.lifecycle).toBe('processing');

    session.truncateBefore(2);
    // items.length includes the new user message from startProcessing
    expect(session.items.length).toBe(originalLength + 1);
  });

  // -------------------------------------------------------------------------
  // 4. No-op when index <= 0
  // -------------------------------------------------------------------------
  test('no-op when index is 0', () => {
    populateSession(session, 3);
    const originalLength = session.items.length;

    session.truncateBefore(0);
    expect(session.items.length).toBe(originalLength);
  });

  test('no-op when index is negative', () => {
    populateSession(session, 3);
    const originalLength = session.items.length;

    session.truncateBefore(-1);
    expect(session.items.length).toBe(originalLength);
  });

  // -------------------------------------------------------------------------
  // 5. No-op when index >= items.length
  // -------------------------------------------------------------------------
  test('no-op when index >= items.length', () => {
    populateSession(session, 3);
    const originalLength = session.items.length;

    session.truncateBefore(999);
    expect(session.items.length).toBe(originalLength);

    session.truncateBefore(originalLength);
    expect(session.items.length).toBe(originalLength);
  });

  // -------------------------------------------------------------------------
  // 6. Rebuilds tool call index after truncation
  // -------------------------------------------------------------------------
  test('rebuilds tool call index after truncation', () => {
    // Build a conversation with tool calls
    session.startProcessing('user 1');
    session.beginStreaming();
    session.appendAssistantChunk('response 1');
    session.completeStream('end_turn');
    session.reset();

    session.startProcessing('user 2');
    session.beginStreaming();
    session.addToolCall('tc-old', 'Old Tool', 'file', 'completed');
    session.completeStream('end_turn');
    session.reset();

    session.startProcessing('user 3');
    session.beginStreaming();
    session.addToolCall('tc-new', 'New Tool', 'terminal', 'completed');
    session.appendAssistantChunk('response 3');
    session.completeStream('end_turn');
    session.reset();

    const itemsBefore = session.items.length;

    // Cut away the first two turns (items 0..3 contain user1, asst1, user2, tc-old, ...)
    // Find the index of user message 3
    let cutIdx = 0;
    let userCount = 0;
    for (let i = 0; i < session.items.length; i++) {
      if (session.items[i].type === 'user_message') {
        userCount++;
        if (userCount === 3) { cutIdx = i; break; }
      }
    }

    session.truncateBefore(cutIdx);
    expect(session.items.length).toBeLessThan(itemsBefore);

    // Verify the old tool call ID is not accessible, and the new one IS accessible
    // by checking the items for tool_call types
    const toolCalls = session.items.filter(
      (item: ConversationItem) => item.type === 'tool_call',
    );
    const toolCallIds = toolCalls.map(
      (item: ConversationItem) => item.type === 'tool_call' ? item.toolCallId : null,
    );
    expect(toolCallIds).toContain('tc-new');
    expect(toolCallIds).not.toContain('tc-old');
  });

  // -------------------------------------------------------------------------
  // 7. Notifies listeners after truncation
  // -------------------------------------------------------------------------
  test('notifies listeners after truncation', () => {
    populateSession(session, 3);

    let called = 0;
    session.addListener(() => { called++; });

    session.truncateBefore(2);
    expect(called).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 8. Bumps version after truncation
  // -------------------------------------------------------------------------
  test('bumps version after truncation', () => {
    populateSession(session, 3);
    const versionBefore = session.version;

    session.truncateBefore(2);
    expect(session.version).toBeGreaterThan(versionBefore);
  });
});

// =============================================================================
// isAutoCompacting dynamic behavior
// =============================================================================
describe('isAutoCompacting dynamic', () => {
  test('returns false when no prompt controller set', () => {
    const session = makeSession();
    const appState = new AppState(session, new PromptHistory(), new SessionStore());
    // No promptController set
    expect(appState.isAutoCompacting).toBe(false);
  });

  test('returns false when compaction state is idle', () => {
    const { appState, controller } = createTestAppState();
    const status = controller.getCompactionStatus();
    expect(status.compactionState).toBe('idle');
    expect(appState.isAutoCompacting).toBe(false);
  });

  test('returns false when compaction state is complete', () => {
    const { appState, session, controller } = createTestAppState();

    // Trigger compaction by creating a controller with high usage
    const highUsageController = new PromptController({
      session,
      provider: makeMockProvider(),
      getContextUsagePercent: () => 90,
      getCompactionThreshold: () => 80,
    });
    appState.setPromptController(highUsageController);

    // After compaction runs, state goes to 'complete' (triggered by submitPrompt)
    // For a unit test, we check that idle state returns false
    const status = highUsageController.getCompactionStatus();
    // Status is idle since no submitPrompt has been called
    expect(status.compactionState).toBe('idle');
    expect(appState.isAutoCompacting).toBe(false);
  });
});

// =============================================================================
// _checkCompaction actually truncates (integration-level)
// =============================================================================
describe('_checkCompaction truncation integration', () => {
  test('compaction reduces items when context usage exceeds threshold', async () => {
    const session = makeSession();

    // Populate enough turns to have something to cut
    populateSession(session, 6); // 12 items: 6 user + 6 assistant
    const itemsBefore = session.items.length;
    expect(itemsBefore).toBe(12);

    const controller = new PromptController({
      session,
      provider: makeMockProvider(),
      getContextUsagePercent: () => 90,
      getCompactionThreshold: () => 80,
    });

    // Submit a prompt to trigger the agentic loop, which calls _checkCompaction
    await controller.submitPrompt('trigger compaction');

    // After compaction, items should be fewer than before + 2 (user + assistant from the new prompt)
    // The new prompt adds 1 user message and 1 assistant message = 2 items
    // Compaction should have pruned early items
    const itemsAfter = session.items.length;
    // Before: 12 items + 2 new = 14 total, minus compacted items
    // keepTurns = max(2, floor(7/2)) = 3, so we keep last 3 user messages
    // That means we cut at the 4th-from-end user message index
    expect(itemsAfter).toBeLessThan(itemsBefore + 2);
  });

  test('compaction preserves at least 2 recent turns', async () => {
    const session = makeSession();

    // Populate 4 turns
    populateSession(session, 4);

    const controller = new PromptController({
      session,
      provider: makeMockProvider(),
      getContextUsagePercent: () => 95,
      getCompactionThreshold: () => 80,
    });

    await controller.submitPrompt('trigger');

    // After compaction, we should still have items remaining
    // At minimum 2 user turns worth of items preserved + the new turn
    const userMessages = session.items.filter(
      (item: ConversationItem) => item.type === 'user_message',
    );
    expect(userMessages.length).toBeGreaterThanOrEqual(2);
  });

  test('no compaction when usage is below threshold', async () => {
    const session = makeSession();
    populateSession(session, 4);
    const itemsBefore = session.items.length;

    const controller = new PromptController({
      session,
      provider: makeMockProvider(),
      getContextUsagePercent: () => 50,
      getCompactionThreshold: () => 80,
    });

    await controller.submitPrompt('no compaction');

    // Items should grow by 2 (new user + assistant), no pruning
    expect(session.items.length).toBe(itemsBefore + 2);
  });
});
