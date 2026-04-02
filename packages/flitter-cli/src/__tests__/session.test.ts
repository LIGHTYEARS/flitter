// Session state machine tests — verifies lifecycle transitions, observer
// pattern, conversation item management, streaming buffer, and metadata tracking.

import { describe, it, expect, beforeEach } from 'bun:test';
import { SessionState } from '../state/session';
import type { SessionLifecycle, SessionError, PlanEntry, UsageInfo } from '../state/types';

describe('SessionState', () => {
  let session: SessionState;

  beforeEach(() => {
    session = new SessionState({
      sessionId: 'test-session',
      cwd: '/tmp/test',
      model: 'claude-sonnet-4-20250514',
    });
  });

  // --- Lifecycle Transitions ---

  describe('lifecycle transitions', () => {
    it('starts in idle state', () => {
      expect(session.lifecycle).toBe('idle');
    });

    it('transitions idle -> processing on startProcessing', () => {
      session.startProcessing('hello');
      expect(session.lifecycle).toBe('processing');
    });

    it('transitions processing -> streaming on beginStreaming', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      expect(session.lifecycle).toBe('streaming');
    });

    it('transitions streaming -> complete on completeStream', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.completeStream('end_turn');
      expect(session.lifecycle).toBe('complete');
    });

    it('transitions streaming -> cancelled on cancelStream', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.cancelStream();
      expect(session.lifecycle).toBe('cancelled');
    });

    it('transitions processing -> cancelled on cancelStream', () => {
      session.startProcessing('hello');
      session.cancelStream();
      expect(session.lifecycle).toBe('cancelled');
    });

    it('transitions streaming -> error on handleError', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      const err: SessionError = { message: 'boom', code: 'ERR', retryable: false };
      session.handleError(err);
      expect(session.lifecycle).toBe('error');
      expect(session.error).toEqual(err);
    });

    it('transitions processing -> error on handleError', () => {
      session.startProcessing('hello');
      const err: SessionError = { message: 'boom', code: null, retryable: true };
      session.handleError(err);
      expect(session.lifecycle).toBe('error');
    });

    it('transitions complete -> idle on reset', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.completeStream('end_turn');
      session.reset();
      expect(session.lifecycle).toBe('idle');
      expect(session.error).toBeNull();
    });

    it('transitions error -> idle on reset', () => {
      session.startProcessing('hello');
      session.handleError({ message: 'boom', code: null, retryable: false });
      session.reset();
      expect(session.lifecycle).toBe('idle');
    });

    it('transitions cancelled -> idle on reset', () => {
      session.startProcessing('hello');
      session.cancelStream();
      session.reset();
      expect(session.lifecycle).toBe('idle');
    });
  });

  // --- Invalid Transitions (no-ops) ---

  describe('invalid transitions', () => {
    it('idle -> streaming is a no-op', () => {
      session.beginStreaming();
      expect(session.lifecycle).toBe('idle');
    });

    it('idle -> complete is a no-op', () => {
      session.completeStream('end_turn');
      expect(session.lifecycle).toBe('idle');
    });

    it('idle -> cancelled is a no-op', () => {
      session.cancelStream();
      expect(session.lifecycle).toBe('idle');
    });

    it('processing -> complete is a no-op', () => {
      session.startProcessing('hello');
      session.completeStream('end_turn');
      expect(session.lifecycle).toBe('processing');
    });

    it('complete -> processing is a no-op', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.completeStream('end_turn');
      session.startProcessing('again');
      expect(session.lifecycle).toBe('complete');
    });

    it('reset from idle is a no-op', () => {
      session.reset();
      expect(session.lifecycle).toBe('idle');
    });

    it('reset from processing is a no-op', () => {
      session.startProcessing('hello');
      session.reset();
      expect(session.lifecycle).toBe('processing');
    });
  });

  // --- Observer Pattern ---

  describe('listener management', () => {
    it('notifies listeners on state transitions', () => {
      const calls: SessionLifecycle[] = [];
      session.addListener(() => calls.push(session.lifecycle));

      session.startProcessing('hello');
      session.beginStreaming();
      session.completeStream('end_turn');

      expect(calls).toEqual(['processing', 'streaming', 'complete']);
    });

    it('removed listeners stop receiving notifications', () => {
      const calls: string[] = [];
      const listener = () => calls.push('called');

      session.addListener(listener);
      session.startProcessing('hello');
      expect(calls.length).toBe(1);

      session.removeListener(listener);
      session.beginStreaming();
      expect(calls.length).toBe(1); // no new call
    });

    it('multiple listeners all receive notifications', () => {
      let count1 = 0;
      let count2 = 0;
      session.addListener(() => count1++);
      session.addListener(() => count2++);

      session.startProcessing('hello');
      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });

  // --- Session Metadata ---

  describe('metadata tracking', () => {
    it('increments turnCount on startProcessing', () => {
      expect(session.metadata.turnCount).toBe(0);
      session.startProcessing('turn 1');
      expect(session.metadata.turnCount).toBe(1);

      session.beginStreaming();
      session.completeStream('end_turn');
      session.reset();
      session.startProcessing('turn 2');
      expect(session.metadata.turnCount).toBe(2);
    });

    it('preserves session identity across turns', () => {
      expect(session.metadata.sessionId).toBe('test-session');
      session.startProcessing('hello');
      session.beginStreaming();
      session.completeStream('end_turn');
      expect(session.metadata.sessionId).toBe('test-session');
    });

    it('records lastStopReason on completeStream', () => {
      expect(session.lastStopReason).toBeNull();
      session.startProcessing('hello');
      session.beginStreaming();
      session.completeStream('end_turn');
      expect(session.lastStopReason).toBe('end_turn');
    });
  });

  // --- Conversation Items ---

  describe('conversation items', () => {
    it('adds user message on startProcessing', () => {
      session.startProcessing('hello world');
      expect(session.items.length).toBe(1);
      const item = session.items[0];
      expect(item.type).toBe('user_message');
      if (item.type === 'user_message') {
        expect(item.text).toBe('hello world');
      }
    });

    it('manages streaming assistant text', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendAssistantChunk('Hello ');
      session.appendAssistantChunk('world!');
      session.flushStreamingText();

      expect(session.items.length).toBe(2); // user + assistant
      const assistant = session.items[1];
      expect(assistant.type).toBe('assistant_message');
      if (assistant.type === 'assistant_message') {
        expect(assistant.text).toBe('Hello world!');
        expect(assistant.isStreaming).toBe(true);
      }
    });

    it('finalizes assistant message on completeStream', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendAssistantChunk('reply');
      session.completeStream('end_turn');

      const assistant = session.items[1];
      if (assistant.type === 'assistant_message') {
        expect(assistant.isStreaming).toBe(false);
      }
    });

    it('manages thinking chunks', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendThinkingChunk('thinking...');
      session.flushStreamingText();

      const thinking = session.items[1];
      expect(thinking.type).toBe('thinking');
      if (thinking.type === 'thinking') {
        expect(thinking.text).toBe('thinking...');
        expect(thinking.isStreaming).toBe(true);
      }
    });

    it('finalizes thinking blocks', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendThinkingChunk('thought');
      session.finalizeThinking();

      const thinking = session.items[1];
      if (thinking.type === 'thinking') {
        expect(thinking.isStreaming).toBe(false);
      }
    });
  });

  // --- Tool Call Management ---

  describe('tool calls', () => {
    it('adds and retrieves tool calls by id', () => {
      session.startProcessing('do something');
      session.beginStreaming();
      session.addToolCall('tc-1', 'Read File', 'file', 'pending');

      const item = session.items[1];
      expect(item.type).toBe('tool_call');
      if (item.type === 'tool_call') {
        expect(item.toolCallId).toBe('tc-1');
        expect(item.title).toBe('Read File');
        expect(item.status).toBe('pending');
      }
    });

    it('updates tool call status', () => {
      session.startProcessing('do something');
      session.beginStreaming();
      session.addToolCall('tc-1', 'Read File', 'file', 'pending');
      session.updateToolCall('tc-1', 'completed');

      const item = session.items[1];
      if (item.type === 'tool_call') {
        expect(item.status).toBe('completed');
      }
    });

    it('appends streaming output to tool calls', () => {
      session.startProcessing('run command');
      session.beginStreaming();
      session.addToolCall('tc-1', 'Bash', 'terminal', 'in_progress');
      session.appendToolOutput('tc-1', 'line 1\n');
      session.appendToolOutput('tc-1', 'line 2\n');

      const item = session.items[1];
      if (item.type === 'tool_call') {
        expect(item.streamingOutput).toBe('line 1\nline 2\n');
      }
    });

    it('ignores updates for unknown tool call ids', () => {
      session.startProcessing('test');
      session.beginStreaming();
      // Should not throw
      session.updateToolCall('unknown-id', 'completed');
      session.appendToolOutput('unknown-id', 'data');
      expect(session.items.length).toBe(1); // just the user message
    });
  });

  // --- Plan and Usage ---

  describe('plan and usage', () => {
    it('sets and retrieves plan entries', () => {
      const entries: PlanEntry[] = [
        { content: 'Step 1', priority: 'high', status: 'pending' },
        { content: 'Step 2', priority: 'medium', status: 'pending' },
      ];
      session.setPlan(entries);
      expect(session.plan.length).toBe(2);
      expect(session.plan[0].content).toBe('Step 1');
    });

    it('sets and retrieves usage info', () => {
      const usage: UsageInfo = { size: 200000, used: 50000 };
      session.setUsage(usage);
      expect(session.usage).toEqual(usage);
    });
  });

  // --- newThread ---

  describe('newThread', () => {
    it('clears conversation items but preserves session identity', () => {
      session.startProcessing('hello');
      session.beginStreaming();
      session.appendAssistantChunk('world');
      session.completeStream('end_turn');

      expect(session.items.length).toBe(2);
      const prevSessionId = session.metadata.sessionId;

      session.newThread();

      expect(session.items.length).toBe(0);
      expect(session.lifecycle).toBe('idle');
      expect(session.metadata.sessionId).toBe(prevSessionId);
    });

    it('clears plan and usage', () => {
      session.setPlan([{ content: 'Step', priority: 'high', status: 'pending' }]);
      session.setUsage({ size: 100000, used: 50000 });
      session.newThread();
      expect(session.plan.length).toBe(0);
      expect(session.usage).toBeNull();
    });
  });
});
