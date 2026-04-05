// Tests for session state gaps I5 (addSystemMessage), I6 (getMessageAt, truncateAfter).

import { describe, it, expect, beforeEach } from 'bun:test';
import { SessionState } from '../state/session';

describe('SessionState gaps', () => {
  let session: SessionState;

  beforeEach(() => {
    session = new SessionState({
      sessionId: 'test-gaps',
      cwd: '/tmp/test',
      model: 'claude-sonnet-4-20250514',
    });
  });

  // ---------------------------------------------------------------------------
  // I5: addSystemMessage
  // ---------------------------------------------------------------------------

  describe('addSystemMessage (I5)', () => {
    it('inserts a system message item', () => {
      session.addSystemMessage('Session reconnected');
      expect(session.items.length).toBe(1);
      const item = session.items[0];
      expect(item.type).toBe('system_message');
    });

    it('sets correct timestamp and text', () => {
      const before = Date.now();
      session.addSystemMessage('New thread started');
      const after = Date.now();

      const item = session.items[0];
      expect(item.type).toBe('system_message');
      if (item.type === 'system_message') {
        expect(item.text).toBe('New thread started');
        expect(item.timestamp).toBeGreaterThanOrEqual(before);
        expect(item.timestamp).toBeLessThanOrEqual(after);
      }
    });

    it('bumps version', () => {
      const vBefore = session.version;
      session.addSystemMessage('test');
      expect(session.version).toBeGreaterThan(vBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // I6: getMessageAt
  // ---------------------------------------------------------------------------

  describe('getMessageAt (I6)', () => {
    it('returns user message text', () => {
      session.startProcessing('hello world');
      // Complete the lifecycle so we can test in idle state
      session.beginStreaming();
      session.completeStream('end_turn');
      session.reset();

      expect(session.getMessageAt(0)).toBe('hello world');
    });

    it('returns null for non-user-message', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendAssistantChunk('reply');
      session.completeStream('end_turn');
      session.reset();

      // Index 1 is the assistant message
      expect(session.getMessageAt(1)).toBeNull();
    });

    it('returns null for out-of-bounds', () => {
      expect(session.getMessageAt(99)).toBeNull();
      expect(session.getMessageAt(-1)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // I6: truncateAfter
  // ---------------------------------------------------------------------------

  describe('truncateAfter (I6)', () => {
    it('removes items after index', () => {
      // Build a conversation with multiple items
      session.startProcessing('first');
      session.beginStreaming();
      session.appendAssistantChunk('reply 1');
      session.completeStream('end_turn');
      session.reset();

      session.startProcessing('second');
      session.beginStreaming();
      session.appendAssistantChunk('reply 2');
      session.completeStream('end_turn');
      session.reset();

      // Should have 4 items: user, assistant, user, assistant
      expect(session.items.length).toBe(4);

      // Truncate after index 1 (keep first user + first assistant)
      session.truncateAfter(1);
      expect(session.items.length).toBe(2);
      expect(session.items[0].type).toBe('user_message');
      expect(session.items[1].type).toBe('assistant_message');
    });

    it('rebuilds tool call index', () => {
      session.startProcessing('run tools');
      session.beginStreaming();
      session.addToolCall('tc-1', 'Read', 'file', 'completed');
      session.addToolCall('tc-2', 'Write', 'file', 'completed');
      session.completeStream('end_turn');
      session.reset();

      // Items: user(0), tc-1(1), tc-2(2)
      expect(session.items.length).toBe(3);

      // Truncate after tc-1 (index 1), removing tc-2
      session.truncateAfter(1);
      expect(session.items.length).toBe(2);

      // tc-2 should no longer be findable — updating it should be a no-op
      session.startProcessing('next');
      session.beginStreaming();
      session.updateToolCall('tc-2', 'failed');
      // tc-1 should still be in the index and can be updated
      session.updateToolCall('tc-1', 'failed');
      const tc1 = session.items.find(
        i => i.type === 'tool_call' && i.toolCallId === 'tc-1',
      );
      expect(tc1).toBeDefined();
      if (tc1 && tc1.type === 'tool_call') {
        expect(tc1.status).toBe('failed');
      }
    });

    it('resets streaming state', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendAssistantChunk('partial');
      session.completeStream('end_turn');
      session.reset();

      // Now truncate back to just the user message
      session.truncateAfter(0);
      expect(session.items.length).toBe(1);

      // Start a new stream — should create a fresh assistant message at index 1
      session.startProcessing('again');
      session.beginStreaming();
      session.appendAssistantChunk('new reply');
      session.flushStreamingText();

      const assistant = session.items.find(i => i.type === 'assistant_message');
      expect(assistant).toBeDefined();
      if (assistant && assistant.type === 'assistant_message') {
        expect(assistant.text).toBe('new reply');
      }
    });

    it('is no-op when lifecycle is not idle', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendAssistantChunk('streaming...');

      const itemsBefore = session.items.length;

      // lifecycle is 'streaming', truncateAfter should be a no-op
      session.truncateAfter(0);
      expect(session.items.length).toBe(itemsBefore);
    });

    it('is no-op for out-of-bounds index', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.completeStream('end_turn');
      session.reset();

      const vBefore = session.version;
      const lenBefore = session.items.length;

      session.truncateAfter(-1);
      expect(session.items.length).toBe(lenBefore);

      session.truncateAfter(999);
      expect(session.items.length).toBe(lenBefore);

      // Version should not have changed
      expect(session.version).toBe(vBefore);
    });

    it('resets _openTaskStack to avoid stale parent-child relationships (I6)', () => {
      // Add a Task tool call that pushes onto the open task stack
      session.startProcessing('run task');
      session.beginStreaming();
      session.addToolCall('task-1', 'Task', 'task', 'in_progress');
      // Add a child under task-1
      session.addToolCall('child-1', 'Read', 'file', 'completed');
      session.completeStream('end_turn');
      session.reset();

      // Items: user(0), task-1(1), child-1(2)
      expect(session.items.length).toBe(3);

      // Verify child-1 has parentToolCallId set to task-1
      const child1 = session.items[2];
      expect(child1.type).toBe('tool_call');
      if (child1.type === 'tool_call') {
        expect(child1.parentToolCallId).toBe('task-1');
      }

      // Truncate after user message (index 0), removing both tool calls
      session.truncateAfter(0);
      expect(session.items.length).toBe(1);

      // Now add a new tool call — it should NOT have a parent from the stale stack
      session.startProcessing('new prompt');
      session.beginStreaming();
      session.addToolCall('tc-new', 'Bash', 'terminal', 'pending');

      const newTc = session.items.find(
        i => i.type === 'tool_call' && i.toolCallId === 'tc-new',
      );
      expect(newTc).toBeDefined();
      if (newTc && newTc.type === 'tool_call') {
        expect(newTc.parentToolCallId).toBeUndefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // N10: defaultToolExpanded config propagation
  // ---------------------------------------------------------------------------

  describe('defaultToolExpanded (N10)', () => {
    it('defaults to true when not specified', () => {
      const s = new SessionState({
        sessionId: 'n10-default',
        cwd: '/tmp/test',
        model: 'test-model',
      });
      expect(s.toolCallsExpanded).toBe(true);
    });

    it('respects defaultToolExpanded: false', () => {
      const s = new SessionState({
        sessionId: 'n10-false',
        cwd: '/tmp/test',
        model: 'test-model',
        defaultToolExpanded: false,
      });
      expect(s.toolCallsExpanded).toBe(false);
    });

    it('respects defaultToolExpanded: true', () => {
      const s = new SessionState({
        sessionId: 'n10-true',
        cwd: '/tmp/test',
        model: 'test-model',
        defaultToolExpanded: true,
      });
      expect(s.toolCallsExpanded).toBe(true);
    });

    it('toggleToolCalls still works after setting defaultToolExpanded', () => {
      const s = new SessionState({
        sessionId: 'n10-toggle',
        cwd: '/tmp/test',
        model: 'test-model',
        defaultToolExpanded: false,
      });
      expect(s.toolCallsExpanded).toBe(false);
      s.toggleToolCalls();
      expect(s.toolCallsExpanded).toBe(true);
      s.toggleToolCalls();
      expect(s.toolCallsExpanded).toBe(false);
    });
  });
});
