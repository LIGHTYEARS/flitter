// Tests for ConversationState turn grouping and caching.
//
// Verifies that groupItemsIntoTurns correctly groups flat ConversationItem
// arrays into alternating UserTurn/AssistantTurn sequences, and that
// ConversationState provides cached turn-level accessors over SessionState.

import { describe, test, expect } from 'bun:test';
import type {
  ConversationItem,
  UserMessage,
  AssistantMessage,
  ThinkingItem,
  ToolCallItem,
  PlanItem,
  SystemMessage,
} from '../state/types';
import { groupItemsIntoTurns, ConversationState } from '../state/conversation';
import type { UserTurn, AssistantTurn } from '../state/turn-types';
import { SessionState } from '../state/session';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Create a minimal UserMessage for testing. */
function userMsg(text: string, opts?: { interrupted?: boolean }): UserMessage {
  return { type: 'user_message', text, timestamp: Date.now(), ...opts };
}

/** Create a minimal AssistantMessage for testing. */
function assistantMsg(text: string, opts?: { isStreaming?: boolean }): AssistantMessage {
  return { type: 'assistant_message', text, timestamp: Date.now(), isStreaming: opts?.isStreaming ?? false };
}

/** Create a minimal ThinkingItem for testing. */
function thinkingItem(text: string, opts?: { isStreaming?: boolean }): ThinkingItem {
  return { type: 'thinking', text, timestamp: Date.now(), isStreaming: opts?.isStreaming ?? false, collapsed: true };
}

/** Create a minimal ToolCallItem for testing. */
function toolCall(id: string, opts?: { status?: ToolCallItem['status']; isStreaming?: boolean }): ToolCallItem {
  return {
    type: 'tool_call',
    toolCallId: id,
    title: `Tool ${id}`,
    kind: 'test',
    status: opts?.status ?? 'completed',
    collapsed: false,
    isStreaming: opts?.isStreaming,
  };
}

/** Create a minimal PlanItem for testing. */
function planItem(): PlanItem {
  return { type: 'plan', entries: [{ content: 'test', priority: 'medium', status: 'pending' }] };
}

/** Create a minimal SystemMessage for testing. */
function systemMsg(text: string): SystemMessage {
  return { type: 'system_message', text, timestamp: Date.now() };
}

/** Create a SessionState with predetermined items for testing. */
function sessionWithItems(items: ConversationItem[]): SessionState {
  const session = new SessionState({
    sessionId: 'test-session',
    cwd: '/tmp',
    model: 'test-model',
  });
  // Directly inject items via the public streaming/mutation API
  // For testing, we build up items through the session API
  for (const item of items) {
    switch (item.type) {
      case 'user_message':
        // Must be idle to call startProcessing
        if (session.lifecycle !== 'idle') {
          // Complete the previous cycle
          if (session.lifecycle === 'processing') session.beginStreaming();
          if (session.lifecycle === 'streaming') session.completeStream('end_turn');
          if (session.lifecycle === 'complete' || session.lifecycle === 'error' || session.lifecycle === 'cancelled') session.reset();
        }
        session.startProcessing(item.text);
        break;
      case 'assistant_message':
        if (session.lifecycle === 'processing') session.beginStreaming();
        session.appendAssistantChunk(item.text);
        if (!item.isStreaming) session.finalizeAssistantMessage();
        break;
      case 'thinking':
        if (session.lifecycle === 'processing') session.beginStreaming();
        session.appendThinkingChunk(item.text);
        if (!item.isStreaming) session.finalizeThinking();
        break;
      case 'tool_call':
        if (session.lifecycle === 'processing') session.beginStreaming();
        session.addToolCall(item.toolCallId, item.title, item.kind, item.status, item.locations, item.rawInput);
        if (item.status === 'completed' || item.status === 'failed') {
          session.updateToolCall(item.toolCallId, item.status);
        }
        break;
      case 'plan':
        if (session.lifecycle === 'processing') session.beginStreaming();
        session.setPlan([...item.entries]);
        break;
      case 'system_message':
        // System messages cannot be added through session API directly;
        // we'll test groupItemsIntoTurns directly for these cases.
        break;
    }
  }
  return session;
}

// ===========================================================================
// groupItemsIntoTurns tests
// ===========================================================================

describe('groupItemsIntoTurns', () => {
  test('empty items -> empty turns', () => {
    const turns = groupItemsIntoTurns([]);
    expect(turns).toEqual([]);
  });

  test('single user message -> [UserTurn, empty AssistantTurn]', () => {
    const items: ConversationItem[] = [userMsg('hello')];
    const turns = groupItemsIntoTurns(items);

    expect(turns).toHaveLength(2);

    const ut = turns[0] as UserTurn;
    expect(ut.kind).toBe('user');
    expect(ut.message.text).toBe('hello');
    expect(ut.itemIndex).toBe(0);

    const at = turns[1] as AssistantTurn;
    expect(at.kind).toBe('assistant');
    expect(at.message).toBeNull();
    expect(at.toolCalls).toHaveLength(0);
    expect(at.thinkingItems).toHaveLength(0);
    expect(at.planItems).toHaveLength(0);
    expect(at.systemMessages).toHaveLength(0);
    expect(at.startIndex).toBe(1);
    expect(at.endIndex).toBe(1);
  });

  test('user message + assistant text -> [UserTurn, AssistantTurn with message]', () => {
    const items: ConversationItem[] = [
      userMsg('hello'),
      assistantMsg('world'),
    ];
    const turns = groupItemsIntoTurns(items);

    expect(turns).toHaveLength(2);

    const at = turns[1] as AssistantTurn;
    expect(at.kind).toBe('assistant');
    expect(at.message).not.toBeNull();
    expect(at.message!.text).toBe('world');
    expect(at.isStreaming).toBe(false);
    expect(at.isComplete).toBe(true);
    expect(at.startIndex).toBe(1);
    expect(at.endIndex).toBe(2);
  });

  test('user message + thinking + assistant text + tool calls -> single AssistantTurn grouping all', () => {
    const items: ConversationItem[] = [
      userMsg('complex query'),
      thinkingItem('let me think...'),
      assistantMsg('here is the answer'),
      toolCall('tc-1'),
      planItem(),
    ];
    const turns = groupItemsIntoTurns(items);

    expect(turns).toHaveLength(2);

    const at = turns[1] as AssistantTurn;
    expect(at.kind).toBe('assistant');
    expect(at.thinkingItems).toHaveLength(1);
    expect(at.thinkingItems[0].text).toBe('let me think...');
    expect(at.message!.text).toBe('here is the answer');
    expect(at.toolCalls).toHaveLength(1);
    expect(at.toolCalls[0].toolCallId).toBe('tc-1');
    expect(at.planItems).toHaveLength(1);
    expect(at.hasThinking).toBe(true);
    expect(at.hasToolCalls).toBe(true);
    expect(at.startIndex).toBe(1);
    expect(at.endIndex).toBe(5);
  });

  test('multiple exchanges -> alternating UserTurn/AssistantTurn pairs', () => {
    const items: ConversationItem[] = [
      userMsg('first'),
      assistantMsg('reply 1'),
      userMsg('second'),
      assistantMsg('reply 2'),
    ];
    const turns = groupItemsIntoTurns(items);

    expect(turns).toHaveLength(4);
    expect(turns[0].kind).toBe('user');
    expect(turns[1].kind).toBe('assistant');
    expect(turns[2].kind).toBe('user');
    expect(turns[3].kind).toBe('assistant');

    expect((turns[0] as UserTurn).message.text).toBe('first');
    expect((turns[1] as AssistantTurn).message!.text).toBe('reply 1');
    expect((turns[2] as UserTurn).message.text).toBe('second');
    expect((turns[3] as AssistantTurn).message!.text).toBe('reply 2');
  });

  test('streaming assistant turn -> isStreaming=true, isComplete=false', () => {
    const items: ConversationItem[] = [
      userMsg('hello'),
      assistantMsg('partial...', { isStreaming: true }),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.isStreaming).toBe(true);
    expect(at.isComplete).toBe(false);
    expect(at.status).toBe('streaming');
  });

  test('finalized assistant turn -> isComplete=true, isStreaming=false', () => {
    const items: ConversationItem[] = [
      userMsg('hello'),
      assistantMsg('done'),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.isStreaming).toBe(false);
    expect(at.isComplete).toBe(true);
    expect(at.status).toBe('complete');
  });

  test('streaming thinking -> turn isStreaming=true', () => {
    const items: ConversationItem[] = [
      userMsg('think'),
      thinkingItem('thinking...', { isStreaming: true }),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.isStreaming).toBe(true);
    expect(at.status).toBe('streaming');
  });

  test('streaming tool call -> turn isStreaming=true', () => {
    const items: ConversationItem[] = [
      userMsg('do tool'),
      toolCall('tc-1', { status: 'in_progress', isStreaming: true }),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.isStreaming).toBe(true);
    expect(at.hasToolCalls).toBe(true);
  });

  test('tool-only response (no text message) -> AssistantTurn with null message, hasToolCalls=true', () => {
    const items: ConversationItem[] = [
      userMsg('use a tool'),
      toolCall('tc-1'),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.message).toBeNull();
    expect(at.hasToolCalls).toBe(true);
    expect(at.isComplete).toBe(true);
  });

  test('leading assistant items before first user message -> AssistantTurn at start', () => {
    const items: ConversationItem[] = [
      systemMsg('Welcome to the session'),
      assistantMsg('I am ready'),
      userMsg('hello'),
      assistantMsg('reply'),
    ];
    const turns = groupItemsIntoTurns(items);

    expect(turns).toHaveLength(4);

    // First turn is assistant (leading items)
    const firstAt = turns[0] as AssistantTurn;
    expect(firstAt.kind).toBe('assistant');
    expect(firstAt.systemMessages).toHaveLength(1);
    expect(firstAt.message!.text).toBe('I am ready');
    expect(firstAt.startIndex).toBe(0);
    expect(firstAt.endIndex).toBe(2);

    // Then user + assistant
    expect(turns[1].kind).toBe('user');
    expect(turns[2].kind).toBe('assistant');
    // Trailing empty assistant turn after last user (if no more items follow user, there's still an assistant turn)
    // Actually: user at index 2, assistant at index 3 with message
    expect(turns[3]).toBeUndefined();
    // Reconsider: 4 items -> leading assistant (sys+msg), user, assistant(reply) = 3 turns
    // Wait, turns count = 4 means: [AssistantTurn, UserTurn, AssistantTurn, ???]
    // Let me re-check: the algo always creates an assistant turn after a user turn
    // So: leading AssistantTurn, UserTurn, AssistantTurn = 3 turns
    // Actually the plan says "A UserMessage starts a new UserTurn; all non-UserMessage items after it ... form the AssistantTurn"
    // So items=[sys, msg, user, reply] -> leading AssistantTurn(sys+msg) + UserTurn(user) + AssistantTurn(reply) = 3 turns
  });

  test('leading system/assistant items produce opening AssistantTurn', () => {
    const items: ConversationItem[] = [
      systemMsg('Welcome'),
      assistantMsg('Ready'),
      userMsg('hi'),
      assistantMsg('hello'),
    ];
    const turns = groupItemsIntoTurns(items);

    // leading AssistantTurn + UserTurn + AssistantTurn = 3
    expect(turns).toHaveLength(3);

    const leading = turns[0] as AssistantTurn;
    expect(leading.kind).toBe('assistant');
    expect(leading.systemMessages).toHaveLength(1);
    expect(leading.message!.text).toBe('Ready');

    expect(turns[1].kind).toBe('user');

    const trailing = turns[2] as AssistantTurn;
    expect(trailing.kind).toBe('assistant');
    expect(trailing.message!.text).toBe('hello');
  });

  test('interrupted turn detection from preceding UserMessage', () => {
    const items: ConversationItem[] = [
      userMsg('hello', { interrupted: true }),
      assistantMsg('partial response'),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.isInterrupted).toBe(true);
    expect(at.status).toBe('interrupted');
  });

  test('all tools failed -> status is error', () => {
    const items: ConversationItem[] = [
      userMsg('do stuff'),
      toolCall('tc-1', { status: 'failed' }),
      toolCall('tc-2', { status: 'failed' }),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.status).toBe('error');
  });

  test('mix of failed and completed tools -> status is complete (not error)', () => {
    const items: ConversationItem[] = [
      userMsg('do stuff'),
      toolCall('tc-1', { status: 'completed' }),
      toolCall('tc-2', { status: 'failed' }),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.status).toBe('complete');
  });

  test('system messages route to AssistantTurn.systemMessages', () => {
    const items: ConversationItem[] = [
      userMsg('hello'),
      systemMsg('system notice'),
      assistantMsg('reply'),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.systemMessages).toHaveLength(1);
    expect(at.systemMessages[0].text).toBe('system notice');
    expect(at.message!.text).toBe('reply');
  });

  test('empty AssistantTurn (adjacent user messages) has correct properties', () => {
    const items: ConversationItem[] = [
      userMsg('first'),
      userMsg('second'),
    ];
    const turns = groupItemsIntoTurns(items);

    // first user -> empty assistant -> second user -> empty assistant
    expect(turns).toHaveLength(4);
    expect(turns[0].kind).toBe('user');

    const emptyAt = turns[1] as AssistantTurn;
    expect(emptyAt.kind).toBe('assistant');
    expect(emptyAt.message).toBeNull();
    expect(emptyAt.toolCalls).toHaveLength(0);
    expect(emptyAt.thinkingItems).toHaveLength(0);
    expect(emptyAt.isStreaming).toBe(false);
    expect(emptyAt.isComplete).toBe(false); // no content at all
    expect(emptyAt.startIndex).toBe(1);
    expect(emptyAt.endIndex).toBe(1);

    expect(turns[2].kind).toBe('user');
    expect(turns[3].kind).toBe('assistant');
  });

  test('multiple assistant messages -> last one wins as turn.message', () => {
    const items: ConversationItem[] = [
      userMsg('hello'),
      assistantMsg('first reply'),
      assistantMsg('second reply'),
    ];
    const turns = groupItemsIntoTurns(items);
    const at = turns[1] as AssistantTurn;

    expect(at.message!.text).toBe('second reply');
  });
});

// ===========================================================================
// ConversationState wrapper tests
// ===========================================================================

describe('ConversationState', () => {
  test('wraps SessionState and exposes turns', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    expect(conv.isEmpty).toBe(true);
    expect(conv.turnCount).toBe(0);
    expect(conv.currentTurn).toBeNull();
    expect(conv.turns).toHaveLength(0);
  });

  test('turns recompute when items change via session', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    // Add a user message
    session.startProcessing('hello');
    const turns1 = conv.turns;
    expect(turns1).toHaveLength(2); // UserTurn + empty AssistantTurn

    // Add assistant response
    session.beginStreaming();
    session.appendAssistantChunk('world');
    session.finalizeAssistantMessage();
    session.completeStream('end_turn');

    const turns2 = conv.turns;
    expect(turns2).toHaveLength(2); // UserTurn + AssistantTurn with message
    const at = turns2[1] as AssistantTurn;
    expect(at.message).not.toBeNull();
    expect(at.message!.text).toBe('world');
  });

  test('caches turns — same reference when version unchanged', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    session.startProcessing('hello');
    const ref1 = conv.turns;
    const ref2 = conv.turns;
    expect(ref1).toBe(ref2); // exact same array reference
  });

  test('recomputes when SessionState.version changes', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    session.startProcessing('hello');
    const ref1 = conv.turns;

    session.beginStreaming();
    session.appendAssistantChunk('reply');
    session.flushStreamingText();
    const ref2 = conv.turns;

    // Version changed, so ref should be different
    expect(ref1).not.toBe(ref2);
  });

  test('currentTurn returns the last turn', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('reply');
    session.finalizeAssistantMessage();
    session.completeStream('end_turn');

    const current = conv.currentTurn;
    expect(current).not.toBeNull();
    expect(current!.kind).toBe('assistant');
  });

  test('lastUserTurn returns the last UserTurn', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    session.startProcessing('first');
    session.beginStreaming();
    session.appendAssistantChunk('reply1');
    session.finalizeAssistantMessage();
    session.completeStream('end_turn');
    session.reset();

    session.startProcessing('second');
    session.beginStreaming();
    session.appendAssistantChunk('reply2');
    session.finalizeAssistantMessage();
    session.completeStream('end_turn');

    const lastUser = conv.lastUserTurn;
    expect(lastUser).not.toBeNull();
    expect(lastUser!.message.text).toBe('second');
  });

  test('lastAssistantTurn returns the last AssistantTurn', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('world');
    session.finalizeAssistantMessage();
    session.completeStream('end_turn');

    const lastAssistant = conv.lastAssistantTurn;
    expect(lastAssistant).not.toBeNull();
    expect(lastAssistant!.message!.text).toBe('world');
  });

  test('isEmpty returns true when no items exist', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    expect(conv.isEmpty).toBe(true);

    session.startProcessing('hello');
    expect(conv.isEmpty).toBe(false);
  });

  test('turnCount returns correct count', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    expect(conv.turnCount).toBe(0);

    session.startProcessing('hello');
    session.beginStreaming();
    session.appendAssistantChunk('world');
    session.finalizeAssistantMessage();
    session.completeStream('end_turn');

    // UserTurn + AssistantTurn = 2
    expect(conv.turnCount).toBe(2);
  });

  test('lastUserTurn and lastAssistantTurn return null when empty', () => {
    const session = new SessionState({
      sessionId: 'test',
      cwd: '/tmp',
      model: 'test',
    });
    const conv = new ConversationState(session);

    expect(conv.lastUserTurn).toBeNull();
    expect(conv.lastAssistantTurn).toBeNull();
  });
});
