// Gaps #39 + #40 — BaseToolProps, onToggle propagation, toggleSingleToolCall
//
// Tests verify:
// 1. BaseToolProps interface re-exports ToolCallItem correctly
// 2. All specialized renderers accept and store onToggle
// 3. onToggle propagates to ToolHeader in all renderer build() outputs
// 4. ToolCallWidget forwards onToggle to every dispatch branch
// 5. ConversationState.toggleSingleToolCall toggles one card without affecting others
// 6. ChatView passes onToggleToolCall to each ToolCallWidget

import { describe, it, expect, mock } from 'bun:test';
import type { ToolCallItem } from '../acp/types';
import type { BaseToolProps } from '../widgets/tool-call/base-tool-props';
import { ToolCallWidget } from '../widgets/tool-call/tool-call-widget';
import { GenericToolCard } from '../widgets/tool-call/generic-tool-card';
import { BashTool } from '../widgets/tool-call/bash-tool';
import { ReadTool } from '../widgets/tool-call/read-tool';
import { EditFileTool } from '../widgets/tool-call/edit-file-tool';
import { GrepTool } from '../widgets/tool-call/grep-tool';
import { CreateFileTool } from '../widgets/tool-call/create-file-tool';
import { WebSearchTool } from '../widgets/tool-call/web-search-tool';
import { TaskTool } from '../widgets/tool-call/task-tool';
import { TodoListTool } from '../widgets/tool-call/todo-list-tool';
import { ConversationState } from '../state/conversation';
import { ChatView } from '../widgets/chat-view';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToolCall(kind: string, opts?: Partial<ToolCallItem>): ToolCallItem {
  return {
    type: 'tool_call',
    toolCallId: `tc-${kind}-${Math.random().toString(36).slice(2)}`,
    kind,
    title: `${kind} test`,
    status: 'completed',
    collapsed: false,
    rawInput: { path: '/test/file.ts', command: 'echo hello' },
    result: {
      status: 'completed',
      content: [{ type: 'text', content: { type: 'text', text: 'some output' } }],
    },
    ...opts,
  };
}

/**
 * Recursively searches a widget tree for ToolHeader widgets
 * and returns their onToggle values.
 */
function findToolHeaderOnToggle(widget: any): Array<(() => void) | undefined> {
  const results: Array<(() => void) | undefined> = [];

  if (widget?.constructor?.name === 'ToolHeader') {
    results.push(widget.onToggle);
  }

  // Check children arrays
  const children = widget?.children ?? widget?._children ?? [];
  if (Array.isArray(children)) {
    for (const child of children) {
      results.push(...findToolHeaderOnToggle(child));
    }
  }

  // Check single child references
  if (widget?.child) {
    results.push(...findToolHeaderOnToggle(widget.child));
  }

  // Check StickyHeader's header and body
  if (widget?.header) {
    results.push(...findToolHeaderOnToggle(widget.header));
  }
  if (widget?.body) {
    results.push(...findToolHeaderOnToggle(widget.body));
  }

  return results;
}

/**
 * Builds a widget and searches for ToolHeader onToggle references.
 */
function getToolHeaderOnToggles(widget: any): Array<(() => void) | undefined> {
  const tree = widget.build({} as any);
  return findToolHeaderOnToggle(tree);
}

// ---------------------------------------------------------------------------
// Tests: BaseToolProps type contract
// ---------------------------------------------------------------------------

describe('Gap #39/40: BaseToolProps interface', () => {
  it('BaseToolProps has toolCall, isExpanded, and onToggle fields', () => {
    // Type-level test: create an object conforming to BaseToolProps
    const fn = () => {};
    const props: BaseToolProps = {
      toolCall: makeToolCall('test'),
      isExpanded: true,
      onToggle: fn,
    };
    expect(props.toolCall).toBeDefined();
    expect(props.isExpanded).toBe(true);
    expect(props.onToggle).toBe(fn);
  });

  it('BaseToolProps allows onToggle to be omitted', () => {
    const props: BaseToolProps = {
      toolCall: makeToolCall('test'),
      isExpanded: false,
    };
    expect(props.onToggle).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: All StatelessWidget renderers store and propagate onToggle
// ---------------------------------------------------------------------------

describe('Gap #39/40: onToggle stored in all renderers', () => {
  const renderers = [
    { name: 'BashTool', Ctor: BashTool, kind: 'Bash' },
    { name: 'ReadTool', Ctor: ReadTool, kind: 'Read' },
    { name: 'EditFileTool', Ctor: EditFileTool, kind: 'edit_file' },
    { name: 'GrepTool', Ctor: GrepTool, kind: 'Grep' },
    { name: 'CreateFileTool', Ctor: CreateFileTool, kind: 'create_file' },
    { name: 'WebSearchTool', Ctor: WebSearchTool, kind: 'WebSearch' },
    { name: 'TodoListTool', Ctor: TodoListTool, kind: 'todo_list' },
    { name: 'GenericToolCard', Ctor: GenericToolCard, kind: 'painter' },
  ];

  for (const { name, Ctor, kind } of renderers) {
    it(`${name} stores onToggle from constructor props`, () => {
      const fn = mock(() => {});
      const tc = makeToolCall(kind);
      const widget = new Ctor({ toolCall: tc, isExpanded: true, onToggle: fn }) as any;
      expect(widget.onToggle).toBe(fn);
    });

    it(`${name} propagates onToggle to ToolHeader in build()`, () => {
      const fn = mock(() => {});
      const tc = makeToolCall(kind);
      const widget = new Ctor({ toolCall: tc, isExpanded: true, onToggle: fn });
      const toggles = getToolHeaderOnToggles(widget);
      expect(toggles.length).toBeGreaterThan(0);
      expect(toggles[0]).toBe(fn);
    });

    it(`${name} ToolHeader has no onToggle when omitted`, () => {
      const tc = makeToolCall(kind);
      const widget = new Ctor({ toolCall: tc, isExpanded: true });
      const toggles = getToolHeaderOnToggles(widget);
      // When there is a ToolHeader, its onToggle should be undefined
      if (toggles.length > 0) {
        expect(toggles[0]).toBeUndefined();
      }
    });
  }
});

describe('Gap #39/40: TaskTool forwards onToggle to ToolHeader', () => {
  it('TaskTool stores and propagates onToggle', () => {
    const fn = mock(() => {});
    const tc = makeToolCall('Task');
    const widget = new TaskTool({ toolCall: tc, isExpanded: false, onToggle: fn }) as any;
    expect(widget.onToggle).toBe(fn);

    const tree = widget.build({} as any);
    expect(tree.constructor.name).toBe('ToolHeader');
    expect((tree as any).onToggle).toBe(fn);
  });
});

// ---------------------------------------------------------------------------
// Tests: ToolCallWidget dispatch propagates onToggle
// ---------------------------------------------------------------------------

describe('Gap #40: ToolCallWidget dispatch forwards onToggle', () => {
  const toolKinds = [
    'Read',
    'edit_file',
    'apply_patch',
    'undo_edit',
    'create_file',
    'Bash',
    'shell_command',
    'Grep',
    'glob',
    'Glob',
    'Search',
    'WebSearch',
    'read_web_page',
    'Task',
    'oracle',
    'handoff',
    'todo_list',
    'todo_write',
    'todo_read',
    'painter',
    'unknown_tool',
  ];

  for (const kind of toolKinds) {
    it(`ToolCallWidget('${kind}') passes onToggle to child renderer`, () => {
      const fn = mock(() => {});
      const tc = makeToolCall(kind, { toolCallId: `tc-${kind}` });
      const widget = new ToolCallWidget({
        toolCall: tc,
        isExpanded: true,
        onToggle: fn,
      });
      const child = widget.build({} as any) as any;

      // Every dispatched child should have onToggle set
      expect(child.onToggle).toBe(fn);
    });
  }

  it('sa__ prefixed tools get onToggle forwarded', () => {
    const fn = mock(() => {});
    const tc = makeToolCall('sa__agent_1');
    const widget = new ToolCallWidget({
      toolCall: tc,
      isExpanded: true,
      onToggle: fn,
    });
    const child = widget.build({} as any) as any;
    expect(child.onToggle).toBe(fn);
  });

  it('tb__ prefixed tools get onToggle forwarded', () => {
    const fn = mock(() => {});
    const tc = makeToolCall('tb__custom_tool');
    const widget = new ToolCallWidget({
      toolCall: tc,
      isExpanded: true,
      onToggle: fn,
    });
    const child = widget.build({} as any) as any;
    expect(child.onToggle).toBe(fn);
  });
});

// ---------------------------------------------------------------------------
// Tests: ConversationState.toggleSingleToolCall
// ---------------------------------------------------------------------------

describe('Gap #39: ConversationState.toggleSingleToolCall', () => {
  it('toggles collapsed state of a single tool call', () => {
    const state = new ConversationState();
    state.addToolCall('tc1', 'Test 1', 'Bash', 'completed');
    state.addToolCall('tc2', 'Test 2', 'Read', 'completed');

    // Both should start collapsed (toolCallsExpanded defaults to false)
    const tc1Before = state.items.find(
      (i): i is any => i.type === 'tool_call' && i.toolCallId === 'tc1',
    );
    const tc2Before = state.items.find(
      (i): i is any => i.type === 'tool_call' && i.toolCallId === 'tc2',
    );
    expect(tc1Before.collapsed).toBe(true);
    expect(tc2Before.collapsed).toBe(true);

    // Toggle only tc1
    state.toggleSingleToolCall('tc1');

    const tc1After = state.items.find(
      (i): i is any => i.type === 'tool_call' && i.toolCallId === 'tc1',
    );
    const tc2After = state.items.find(
      (i): i is any => i.type === 'tool_call' && i.toolCallId === 'tc2',
    );
    expect(tc1After.collapsed).toBe(false);
    expect(tc2After.collapsed).toBe(true); // unchanged
  });

  it('toggles back to collapsed on second call', () => {
    const state = new ConversationState();
    state.addToolCall('tc1', 'Test', 'Bash', 'completed');

    state.toggleSingleToolCall('tc1'); // expand
    state.toggleSingleToolCall('tc1'); // collapse again

    const tc1 = state.items.find(
      (i): i is any => i.type === 'tool_call' && i.toolCallId === 'tc1',
    );
    expect(tc1.collapsed).toBe(true);
  });

  it('is a no-op for nonexistent toolCallId', () => {
    const state = new ConversationState();
    state.addToolCall('tc1', 'Test', 'Bash', 'completed');

    const versionBefore = state.snapshot.version;
    state.toggleSingleToolCall('nonexistent');
    // version should NOT change
    expect(state.snapshot.version).toBe(versionBefore);
  });

  it('does not affect the global toolCallsExpanded flag', () => {
    const state = new ConversationState();
    state.addToolCall('tc1', 'Test', 'Bash', 'completed');

    expect(state.toolCallsExpanded).toBe(false);
    state.toggleSingleToolCall('tc1');
    // Global flag should remain false
    expect(state.toolCallsExpanded).toBe(false);
  });

  it('creates a new snapshot (version increments)', () => {
    const state = new ConversationState();
    state.addToolCall('tc1', 'Test', 'Bash', 'completed');

    const versionBefore = state.snapshot.version;
    state.toggleSingleToolCall('tc1');
    expect(state.snapshot.version).toBe(versionBefore + 1);
  });

  it('produces structurally shared items (unchanged items keep identity)', () => {
    const state = new ConversationState();
    state.addUserMessage('Hello');
    state.addToolCall('tc1', 'Test 1', 'Bash', 'completed');
    state.addToolCall('tc2', 'Test 2', 'Read', 'completed');

    const itemsBefore = state.snapshot.items;
    state.toggleSingleToolCall('tc1');
    const itemsAfter = state.snapshot.items;

    // The user message (index 0) should be the same object reference
    expect(itemsAfter[0]).toBe(itemsBefore[0]);
    // tc1 (index 1) should be a different object
    expect(itemsAfter[1]).not.toBe(itemsBefore[1]);
    // tc2 (index 2) should be the same object (structural sharing)
    expect(itemsAfter[2]).toBe(itemsBefore[2]);
  });
});

// ---------------------------------------------------------------------------
// Tests: ChatView passes onToggleToolCall through to ToolCallWidget
// ---------------------------------------------------------------------------

describe('Gap #40: ChatView wires onToggleToolCall', () => {
  it('ChatView stores onToggleToolCall callback', () => {
    const fn = mock(() => {});
    const view = new ChatView({
      items: [],
      onToggleToolCall: fn,
    }) as any;
    expect(view.onToggleToolCall).toBe(fn);
  });

  it('ChatView passes onToggle closure to ToolCallWidget for tool_call items', () => {
    const calls: string[] = [];
    const onToggle = (id: string) => calls.push(id);

    const tc: ToolCallItem = {
      type: 'tool_call',
      toolCallId: 'tc-123',
      kind: 'Bash',
      title: 'echo hello',
      status: 'completed',
      collapsed: false,
      rawInput: { command: 'echo hello' },
    };

    const view = new ChatView({
      items: [
        { type: 'user_message', text: 'do thing', timestamp: Date.now() },
        tc,
      ],
      onToggleToolCall: onToggle,
    });

    const tree = view.build({} as any) as any;

    // Navigate to find the ToolCallWidget in the tree
    const toolCallWidgets = findToolCallWidgets(tree);
    expect(toolCallWidgets.length).toBeGreaterThanOrEqual(1);

    // Find the one with our toolCallId
    const widget = toolCallWidgets.find((w: any) => w.toolCall?.toolCallId === 'tc-123') as any;
    expect(widget).toBeDefined();
    expect(widget.onToggle).toBeDefined();
    expect(typeof widget.onToggle).toBe('function');

    // Call the closure and verify it invokes onToggleToolCall with the right ID
    widget.onToggle();
    expect(calls).toEqual(['tc-123']);
  });

  it('ChatView does not set onToggle when onToggleToolCall is not provided', () => {
    const tc: ToolCallItem = {
      type: 'tool_call',
      toolCallId: 'tc-456',
      kind: 'Bash',
      title: 'test',
      status: 'completed',
      collapsed: true,
    };

    const view = new ChatView({
      items: [
        { type: 'user_message', text: 'test', timestamp: Date.now() },
        tc,
      ],
    });

    const tree = view.build({} as any) as any;
    const toolCallWidgets = findToolCallWidgets(tree);
    expect(toolCallWidgets.length).toBeGreaterThanOrEqual(1);

    const widget = toolCallWidgets.find((w: any) => w.toolCall?.toolCallId === 'tc-456') as any;
    expect(widget).toBeDefined();
    expect(widget.onToggle).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Helper: find ToolCallWidgets in a widget tree
// ---------------------------------------------------------------------------

function findToolCallWidgets(widget: any): any[] {
  const results: any[] = [];

  if (widget?.constructor?.name === 'ToolCallWidget') {
    results.push(widget);
  }

  const children = widget?.children ?? widget?._children ?? [];
  if (Array.isArray(children)) {
    for (const child of children) {
      results.push(...findToolCallWidgets(child));
    }
  }

  if (widget?.child) {
    results.push(...findToolCallWidgets(widget.child));
  }

  if (widget?.header) {
    results.push(...findToolCallWidgets(widget.header));
  }
  if (widget?.body) {
    results.push(...findToolCallWidgets(widget.body));
  }

  return results;
}
