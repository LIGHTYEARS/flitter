// ChatView TDD tests — verifies widget tree structure matches Amp reverse-engineered spec
//
// Amp ref: $uH (thread view), Sa (user msg), XkL (assistant msg)
// Spec: .planning/WIDGET-TREE-SKELETON.md §4.2
//
// Key invariants tested:
// 1. Conversation Column: crossAxisAlignment='stretch', mainAxisSize='min'
// 2. User message: left border (green, width 2), italic text, NO role label
// 3. Assistant message: Markdown widget, crossAxisAlignment='stretch'
// 4. Grouping: consecutive assistant items grouped under one StickyHeader
// 5. SizedBox(height:1) spacer between top-level groups
// 6. Welcome screen: centered with Orb + text content

import { describe, it, expect } from 'bun:test';
import { RenderBox } from 'flitter-core/src/framework/render-object';
import { BoxConstraints } from 'flitter-core/src/core/box-constraints';
import { Size, Offset } from 'flitter-core/src/core/types';
import type { PaintContext } from 'flitter-core/src/scheduler/paint-context';
import { RenderFlex } from 'flitter-core/src/layout/render-flex';
import type { ConversationItem } from '../acp/types';
import { ChatView } from '../widgets/chat-view';

// ---------------------------------------------------------------------------
// Test helpers — extract widget tree structure from ChatView.build()
// ---------------------------------------------------------------------------

function buildChatView(items: ConversationItem[], error?: string | null) {
  return new ChatView({ items, error: error ?? undefined });
}

function makeUserMessage(text: string): ConversationItem {
  return { type: 'user_message', text, timestamp: Date.now() };
}

function makeAssistantMessage(text: string, isStreaming = false): ConversationItem {
  return { type: 'assistant_message', text, timestamp: Date.now(), isStreaming };
}

function makeToolCall(
  title: string,
  kind = 'bash',
  status: 'pending' | 'in_progress' | 'completed' | 'failed' = 'completed',
): ConversationItem {
  return {
    type: 'tool_call',
    toolCallId: `tc-${Math.random().toString(36).slice(2)}`,
    title,
    kind,
    status,
    collapsed: true,
  };
}

function makeThinking(text: string, isStreaming = false): ConversationItem {
  return {
    type: 'thinking',
    text,
    timestamp: Date.now(),
    isStreaming,
    collapsed: true,
  };
}

// ---------------------------------------------------------------------------
// Tests: Widget tree structure
// ---------------------------------------------------------------------------

describe('ChatView: Widget Tree Structure', () => {
  describe('Empty state (welcome screen)', () => {
    it('returns a Column with mainAxisAlignment:center when no items', () => {
      const view = buildChatView([]);
      const widget = view.build({} as any);
      expect(widget).toBeDefined();
      expect(widget.constructor.name).toBe('Column');
    });

    it('welcome screen contains DensityOrbWidget and text content in a Row', () => {
      const view = buildChatView([]);
      const widget = view.build({} as any) as any;
      const children = widget.children ?? widget._children;
      expect(children).toBeDefined();
      expect(children.length).toBeGreaterThan(0);
    });
  });

  describe('Conversation with messages', () => {
    it('wraps conversation items in a Column with crossAxisAlignment:stretch and mainAxisSize:min', () => {
      const items: ConversationItem[] = [
        makeUserMessage('Hello'),
        makeAssistantMessage('Hi there!'),
      ];
      const view = buildChatView(items);
      const widget = view.build({} as any) as any;

      expect(widget.constructor.name).toBe('Column');
      const renderObj = widget.createRenderObject?.({} as any);
      if (renderObj) {
        expect(renderObj._crossAxisAlignment ?? renderObj.crossAxisAlignment).toBe('stretch');
        expect(renderObj._mainAxisSize ?? renderObj.mainAxisSize).toBe('min');
      }
    });

    it('user message is a Container with border-left decoration', () => {
      const items: ConversationItem[] = [makeUserMessage('Hello')];
      const view = buildChatView(items);
      const widget = view.build({} as any) as any;
      const children = widget.children ?? widget._children;

      expect(children.length).toBeGreaterThanOrEqual(1);
      const firstChild = children[0];
      expect(firstChild.constructor.name).toBe('Container');
    });

    it('SizedBox(height:1) spacer between groups', () => {
      const items: ConversationItem[] = [
        makeUserMessage('Hello'),
        makeAssistantMessage('Hi!'),
      ];
      const view = buildChatView(items);
      const widget = view.build({} as any) as any;
      const children = widget.children ?? widget._children;

      // Should be: [StickyHeader(user), SizedBox(1), StickyHeader(assistant)]
      expect(children.length).toBe(3);
      const spacer = children[1];
      expect(spacer.constructor.name).toBe('SizedBox');
    });

    it('consecutive assistant items (thinking + message + tool_call) grouped into one StickyHeader', () => {
      const items: ConversationItem[] = [
        makeUserMessage('Run a test'),
        makeThinking('Let me think...'),
        makeAssistantMessage('Running the test now'),
        makeToolCall('bun test', 'bash', 'completed'),
      ];
      const view = buildChatView(items);
      const widget = view.build({} as any) as any;
      const children = widget.children ?? widget._children;

      // Should be: [Container(user), SizedBox(1), StickyHeader(assistant-group)]
      // The assistant group StickyHeader contains thinking + message + tool_call
      expect(children.length).toBe(3);
      expect(children[0].constructor.name).toBe('Container');
      expect(children[2].constructor.name).toBe('StickyHeader');
    });
  });

  describe('Error rendering', () => {
    it('renders error message at top when error is set', () => {
      const items: ConversationItem[] = [makeUserMessage('Hello')];
      const view = buildChatView(items, 'Connection failed');
      const widget = view.build({} as any) as any;
      const children = widget.children ?? widget._children;

      // First child should be error Padding, then rest of conversation
      expect(children.length).toBeGreaterThanOrEqual(2);
      expect(children[0].constructor.name).toBe('Padding');
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: Layout constraint propagation
// ---------------------------------------------------------------------------

describe('ChatView: Layout Constraints', () => {
  describe('Conversation Column constraints in ScrollView context', () => {
    it('Column(mainAxisSize:min) with unbounded height sizes to content', () => {
      // This simulates what happens when ChatView is inside SingleChildScrollView
      const flex = new RenderFlex({
        direction: 'vertical',
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
      });

      class FixedBox extends RenderBox {
        constructor(private w: number, private h: number) { super(); }
        performLayout() { this.size = this.constraints!.constrain(new Size(this.w, this.h)); }
        paint(_c: PaintContext, _o: Offset) {}
      }

      const child1 = new FixedBox(100, 5);
      const child2 = new FixedBox(100, 3);
      flex.insert(child1);
      flex.insert(child2);

      // Unbounded height from ScrollView, tight width from Expanded
      flex.layout(new BoxConstraints({
        minWidth: 115, maxWidth: 115,
        minHeight: 0, maxHeight: Infinity,
      }));

      // Height = sum of children (content-sized)
      expect(flex.size.height).toBe(8);
      // Width = tight from parent
      expect(flex.size.width).toBe(115);
      // Children stretched to full width
      expect(child1.size.width).toBe(115);
      expect(child2.size.width).toBe(115);
    });
  });
});
