// Tests for I16: Content badge utility.

import { describe, it, expect } from 'bun:test';
import { getContentBadges } from '../utils/content-badge';
import type {
  UserMessage,
  AssistantMessage,
  ToolCallItem,
  ThinkingItem,
  PlanItem,
  SystemMessage,
  ConversationItem,
} from '../state/types';

describe('getContentBadges', () => {
  // ---------------------------------------------------------------------------
  // UserMessage
  // ---------------------------------------------------------------------------

  describe('user_message', () => {
    it('returns empty array for plain text message', () => {
      const item: UserMessage = {
        type: 'user_message',
        text: 'Hello',
        timestamp: Date.now(),
      };
      expect(getContentBadges(item)).toEqual([]);
    });

    it('returns [image] when images are attached', () => {
      const item: UserMessage = {
        type: 'user_message',
        text: 'Check this out',
        timestamp: Date.now(),
        images: [{ filename: 'photo.png' }],
      };
      expect(getContentBadges(item)).toEqual(['[image]']);
    });

    it('returns [image] for multiple images', () => {
      const item: UserMessage = {
        type: 'user_message',
        text: '',
        timestamp: Date.now(),
        images: [{ filename: 'a.png' }, { filename: 'b.jpg' }],
      };
      expect(getContentBadges(item)).toEqual(['[image]']);
    });

    it('returns [tool_result] when toolResults are present', () => {
      const item: UserMessage = {
        type: 'user_message',
        text: '',
        timestamp: Date.now(),
        toolResults: [
          { type: 'tool_result', tool_use_id: 'tu-1', content: 'ok' },
        ],
      };
      expect(getContentBadges(item)).toEqual(['[tool_result]']);
    });

    it('returns both [image] and [tool_result]', () => {
      const item: UserMessage = {
        type: 'user_message',
        text: '',
        timestamp: Date.now(),
        images: [{ filename: 'x.png' }],
        toolResults: [
          { type: 'tool_result', tool_use_id: 'tu-2', content: 'done' },
        ],
      };
      const badges = getContentBadges(item);
      expect(badges).toContain('[image]');
      expect(badges).toContain('[tool_result]');
    });

    it('returns empty when images array is empty', () => {
      const item: UserMessage = {
        type: 'user_message',
        text: 'hi',
        timestamp: Date.now(),
        images: [],
      };
      expect(getContentBadges(item)).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // AssistantMessage
  // ---------------------------------------------------------------------------

  describe('assistant_message', () => {
    it('returns empty array for plain assistant text', () => {
      const item: AssistantMessage = {
        type: 'assistant_message',
        text: 'Sure, I can help.',
        timestamp: Date.now(),
        isStreaming: false,
      };
      expect(getContentBadges(item)).toEqual([]);
    });

    it('returns [streaming] when actively streaming', () => {
      const item: AssistantMessage = {
        type: 'assistant_message',
        text: 'Thinking...',
        timestamp: Date.now(),
        isStreaming: true,
      };
      expect(getContentBadges(item)).toContain('[streaming]');
    });

    it('returns [tool_use] when content blocks contain tool_use', () => {
      const item: AssistantMessage = {
        type: 'assistant_message',
        text: '',
        timestamp: Date.now(),
        isStreaming: false,
        contentBlocks: [
          { type: 'tool_use', id: 'tu-1', name: 'Bash', input: {} },
        ],
      };
      expect(getContentBadges(item)).toContain('[tool_use]');
    });

    it('returns both [streaming] and [tool_use]', () => {
      const item: AssistantMessage = {
        type: 'assistant_message',
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
        contentBlocks: [
          { type: 'text', text: 'hello' },
          { type: 'tool_use', id: 'tu-1', name: 'Read', input: {} },
        ],
      };
      const badges = getContentBadges(item);
      expect(badges).toContain('[streaming]');
      expect(badges).toContain('[tool_use]');
    });

    it('does not return [tool_use] for text-only content blocks', () => {
      const item: AssistantMessage = {
        type: 'assistant_message',
        text: 'done',
        timestamp: Date.now(),
        isStreaming: false,
        contentBlocks: [{ type: 'text', text: 'just text' }],
      };
      expect(getContentBadges(item)).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // ToolCallItem
  // ---------------------------------------------------------------------------

  describe('tool_call', () => {
    it('returns [tool_call] for a completed tool call', () => {
      const item: ToolCallItem = {
        type: 'tool_call',
        toolCallId: 'tc-1',
        title: 'Read',
        kind: 'file',
        status: 'completed',
        collapsed: false,
      };
      expect(getContentBadges(item)).toContain('[tool_call]');
    });

    it('returns [tool_call] and [error] for a failed tool call', () => {
      const item: ToolCallItem = {
        type: 'tool_call',
        toolCallId: 'tc-2',
        title: 'Bash',
        kind: 'terminal',
        status: 'failed',
        collapsed: false,
      };
      const badges = getContentBadges(item);
      expect(badges).toContain('[tool_call]');
      expect(badges).toContain('[error]');
    });

    it('does not return [error] for in_progress', () => {
      const item: ToolCallItem = {
        type: 'tool_call',
        toolCallId: 'tc-3',
        title: 'Write',
        kind: 'file',
        status: 'in_progress',
        collapsed: false,
      };
      const badges = getContentBadges(item);
      expect(badges).toContain('[tool_call]');
      expect(badges).not.toContain('[error]');
    });
  });

  // ---------------------------------------------------------------------------
  // Other item types
  // ---------------------------------------------------------------------------

  describe('other item types', () => {
    it('returns [thinking] for ThinkingItem', () => {
      const item: ThinkingItem = {
        type: 'thinking',
        text: 'hmm...',
        timestamp: Date.now(),
        isStreaming: false,
        collapsed: true,
      };
      expect(getContentBadges(item)).toEqual(['[thinking]']);
    });

    it('returns [plan] for PlanItem', () => {
      const item: PlanItem = {
        type: 'plan',
        entries: [{ content: 'Step 1', priority: 'high', status: 'pending' }],
      };
      expect(getContentBadges(item)).toEqual(['[plan]']);
    });

    it('returns [system] for SystemMessage', () => {
      const item: SystemMessage = {
        type: 'system_message',
        text: 'Session started',
        timestamp: Date.now(),
      };
      expect(getContentBadges(item)).toEqual(['[system]']);
    });
  });
});
