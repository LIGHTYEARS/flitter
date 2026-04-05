// Tests for session state gaps I1-I4 and I3 (thinking toggle):
//   I1: Parent-child tool call hierarchy
//   I2: Toggle tool calls expand/collapse
//   I3: Thinking block toggle
//   I4: Streaming output auto-expand on first chunk

import { describe, it, expect, beforeEach } from 'bun:test';
import { SessionState } from '../state/session';
import type { ToolCallItem, ThinkingItem } from '../state/types';

describe('SessionState — I1-I4 gaps', () => {
  let session: SessionState;

  beforeEach(() => {
    session = new SessionState({
      sessionId: 'test-gaps',
      cwd: '/tmp/test',
      model: 'claude-sonnet-4-20250514',
    });
  });

  // Helper: bring session to streaming state
  function goStreaming() {
    session.startProcessing('test');
    session.beginStreaming();
  }

  // ---------------------------------------------------------------------------
  // I1: Parent-child tool call hierarchy
  // ---------------------------------------------------------------------------

  describe('I1: parent-child tool call hierarchy', () => {
    it('addToolCall sets parentToolCallId from task stack', () => {
      goStreaming();

      // Add a Task tool call — pushes onto stack
      session.addToolCall('task-1', 'Task', 'task', 'in_progress');

      // Add a child tool call — should have parentToolCallId
      session.addToolCall('child-1', 'Read File', 'file', 'pending');

      const child = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'child-1',
      ) as ToolCallItem;

      expect(child).toBeDefined();
      expect(child.parentToolCallId).toBe('task-1');
    });

    it('updateToolCall pops from task stack on completion', () => {
      goStreaming();

      session.addToolCall('task-1', 'Task', 'task', 'in_progress');
      session.updateToolCall('task-1', 'completed');

      // Now add another tool call — should have no parent
      session.addToolCall('tc-2', 'Bash', 'terminal', 'pending');

      const tc2 = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-2',
      ) as ToolCallItem;

      expect(tc2.parentToolCallId).toBeUndefined();
    });

    it('getChildToolCalls returns children of a parent', () => {
      goStreaming();

      session.addToolCall('task-1', 'Task', 'task', 'in_progress');
      session.addToolCall('child-1', 'Read', 'file', 'pending');
      session.addToolCall('child-2', 'Write', 'file', 'pending');

      const children = session.getChildToolCalls('task-1');
      expect(children.length).toBe(2);
      expect(children[0].toolCallId).toBe('child-1');
      expect(children[1].toolCallId).toBe('child-2');
    });

    it('newThread clears task stack', () => {
      goStreaming();

      session.addToolCall('task-1', 'Task', 'task', 'in_progress');
      session.completeStream('end_turn');

      session.newThread();

      // After newThread, new tool calls should have no parent
      session.startProcessing('new prompt');
      session.beginStreaming();
      session.addToolCall('tc-after', 'Bash', 'terminal', 'pending');

      const tc = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-after',
      ) as ToolCallItem;

      expect(tc.parentToolCallId).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // I2: Toggle tool calls expand/collapse
  // ---------------------------------------------------------------------------

  describe('I2: toggle tool calls expand/collapse', () => {
    it('toggleToolCalls flips all tool call collapsed state', () => {
      goStreaming();

      session.addToolCall('tc-1', 'Read', 'file', 'completed');
      session.addToolCall('tc-2', 'Write', 'file', 'completed');

      // Initially collapsed = false
      expect(session.toolCallsExpanded).toBe(true);

      session.toggleToolCalls();

      // Now all should be collapsed
      expect(session.toolCallsExpanded).toBe(false);
      const toolCalls = session.items.filter(i => i.type === 'tool_call') as ToolCallItem[];
      expect(toolCalls.every(tc => tc.collapsed === true)).toBe(true);

      // Toggle back
      session.toggleToolCalls();
      expect(session.toolCallsExpanded).toBe(true);
      const toolCallsAfter = session.items.filter(i => i.type === 'tool_call') as ToolCallItem[];
      expect(toolCallsAfter.every(tc => tc.collapsed === false)).toBe(true);
    });

    it('toggleSingleToolCall flips one tool call collapsed state', () => {
      goStreaming();

      session.addToolCall('tc-1', 'Read', 'file', 'completed');
      session.addToolCall('tc-2', 'Write', 'file', 'completed');

      // Toggle tc-1 only
      session.toggleSingleToolCall('tc-1');

      const tc1 = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-1',
      ) as ToolCallItem;
      const tc2 = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-2',
      ) as ToolCallItem;

      expect(tc1.collapsed).toBe(true);
      expect(tc2.collapsed).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // I3: Thinking block toggle
  // ---------------------------------------------------------------------------

  describe('I3: thinking block toggle', () => {
    it('toggleThinking flips all thinking block collapsed state', () => {
      goStreaming();

      // Create two thinking blocks
      session.appendThinkingChunk('thought 1');
      session.finalizeThinking();
      session.appendThinkingChunk('thought 2');
      session.finalizeThinking();

      // Thinking blocks start collapsed = true
      const before = session.items.filter(i => i.type === 'thinking') as ThinkingItem[];
      expect(before.every(t => t.collapsed === true)).toBe(true);

      // Toggle: collapsed true -> false
      session.toggleThinking();
      const after = session.items.filter(i => i.type === 'thinking') as ThinkingItem[];
      expect(after.every(t => t.collapsed === false)).toBe(true);

      // Toggle again: collapsed false -> true
      session.toggleThinking();
      const afterAgain = session.items.filter(i => i.type === 'thinking') as ThinkingItem[];
      expect(afterAgain.every(t => t.collapsed === true)).toBe(true);
    });

    it('setItemCollapsed sets collapsed for thinking block', () => {
      goStreaming();

      session.appendThinkingChunk('deep thought');
      session.finalizeThinking();

      // Find the thinking item index
      const thinkingIndex = session.items.findIndex(i => i.type === 'thinking');
      expect(thinkingIndex).toBeGreaterThanOrEqual(0);

      // Initially collapsed = true
      expect((session.items[thinkingIndex] as ThinkingItem).collapsed).toBe(true);

      // Set to expanded
      session.setItemCollapsed(thinkingIndex, false);
      expect((session.items[thinkingIndex] as ThinkingItem).collapsed).toBe(false);

      // Set back to collapsed
      session.setItemCollapsed(thinkingIndex, true);
      expect((session.items[thinkingIndex] as ThinkingItem).collapsed).toBe(true);
    });

    it('setItemCollapsed sets collapsed for tool call', () => {
      goStreaming();

      session.addToolCall('tc-1', 'Read', 'file', 'completed');
      const tcIndex = session.items.findIndex(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-1',
      );

      // Initially collapsed = false
      expect((session.items[tcIndex] as ToolCallItem).collapsed).toBe(false);

      // Set to collapsed
      session.setItemCollapsed(tcIndex, true);
      expect((session.items[tcIndex] as ToolCallItem).collapsed).toBe(true);

      // Set back to expanded
      session.setItemCollapsed(tcIndex, false);
      expect((session.items[tcIndex] as ToolCallItem).collapsed).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // I4: Streaming output auto-expand on first chunk
  // ---------------------------------------------------------------------------

  describe('I4: streaming output auto-expand on first chunk', () => {
    it('appendToolOutput auto-expands on first chunk', () => {
      goStreaming();

      session.addToolCall('tc-1', 'Bash', 'terminal', 'in_progress');

      // Collapse it first
      session.toggleSingleToolCall('tc-1');
      const beforeChunk = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-1',
      ) as ToolCallItem;
      expect(beforeChunk.collapsed).toBe(true);

      // First chunk should auto-expand
      session.appendToolOutput('tc-1', 'first line\n');

      const afterChunk = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-1',
      ) as ToolCallItem;
      expect(afterChunk.collapsed).toBe(false);
    });

    it('appendToolOutput preserves collapsed on subsequent chunks', () => {
      goStreaming();

      session.addToolCall('tc-1', 'Bash', 'terminal', 'in_progress');
      session.appendToolOutput('tc-1', 'first chunk');

      // Manually collapse it
      session.toggleSingleToolCall('tc-1');
      const collapsed = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-1',
      ) as ToolCallItem;
      expect(collapsed.collapsed).toBe(true);

      // Subsequent chunk should NOT auto-expand (streamingOutput already exists)
      session.appendToolOutput('tc-1', ' second chunk');

      const afterSecond = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-1',
      ) as ToolCallItem;
      expect(afterSecond.collapsed).toBe(true);
    });

    it('appendToolOutput sets streaming result', () => {
      goStreaming();

      session.addToolCall('tc-1', 'Bash', 'terminal', 'in_progress');
      session.appendToolOutput('tc-1', 'output data');

      const tc = session.items.find(
        i => i.type === 'tool_call' && (i as ToolCallItem).toolCallId === 'tc-1',
      ) as ToolCallItem;

      expect(tc.result).toBeDefined();
      expect(tc.result!.status).toBe('streaming');
      expect(tc.result!.rawOutput).toEqual({ stdout: 'output data' });
    });
  });
});
