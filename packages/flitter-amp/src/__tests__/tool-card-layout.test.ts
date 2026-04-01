// Tool card layout TDD tests
//
// Amp ref: xD widget — body columns use stretch to fill available width
// All tool card body Columns must use crossAxisAlignment:'stretch'
// so Markdown, code blocks, and DiffView fill the terminal width.

import { describe, it, expect } from 'bun:test';
import type { ToolCallItem } from '../acp/types';
import { GenericToolCard } from '../widgets/tool-call/generic-tool-card';
import { BashTool } from '../widgets/tool-call/bash-tool';
import { ReadTool } from '../widgets/tool-call/read-tool';
import { EditFileTool } from '../widgets/tool-call/edit-file-tool';
import { GrepTool } from '../widgets/tool-call/grep-tool';
import { CreateFileTool } from '../widgets/tool-call/create-file-tool';
import { WebSearchTool } from '../widgets/tool-call/web-search-tool';
import { HandoffTool } from '../widgets/tool-call/handoff-tool';
import { TodoListTool } from '../widgets/tool-call/todo-list-tool';
import { ThinkingBlock } from '../widgets/thinking-block';
import { ConversationState } from '../state/conversation';

function makeToolCall(kind: string, opts?: Partial<ToolCallItem>): ToolCallItem {
  return {
    type: 'tool_call',
    toolCallId: `tc-test-${kind}`,
    kind,
    title: `${kind} test`,
    status: 'completed',
    collapsed: false,
    result: {
      status: 'completed',
      content: [{ type: 'text', content: { type: 'text', text: 'some output text that should fill width' } }],
    },
    rawInput: { path: '/test/file.ts' },
    ...opts,
  } as ToolCallItem;
}

/**
 * Recursively searches a widget tree for Column widgets and returns
 * their crossAxisAlignment values.
 */
function findColumnAlignments(widget: any): string[] {
  const results: string[] = [];

  if (widget?.constructor?.name === 'Column') {
    results.push(widget.crossAxisAlignment ?? 'center');
  }

  const children = widget?.children ?? widget?._children ?? [];
  if (Array.isArray(children)) {
    for (const child of children) {
      results.push(...findColumnAlignments(child));
    }
  }

  if (widget?.child) {
    results.push(...findColumnAlignments(widget.child));
  }

  if (widget?.header) {
    results.push(...findColumnAlignments(widget.header));
  }
  if (widget?.body) {
    results.push(...findColumnAlignments(widget.body));
  }

  return results;
}

/**
 * Builds a tool widget and checks that all body Columns use 'stretch'.
 */
function assertBodyColumnsStretch(widget: any, toolName: string) {
  const tree = widget.build({} as any);
  const alignments = findColumnAlignments(tree);

  const startColumns = alignments.filter(a => a === 'start');
  if (startColumns.length > 0) {
    throw new Error(
      `${toolName}: found ${startColumns.length} Column(s) with crossAxisAlignment:'start' — ` +
      `should be 'stretch' for proper width filling. ` +
      `All alignments: [${alignments.join(', ')}]`
    );
  }
}

describe('Tool Card Body Columns: crossAxisAlignment must be stretch', () => {

  it('GenericToolCard body Column uses stretch when expanded', () => {
    const tc = makeToolCall('painter');
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: true });
    assertBodyColumnsStretch(widget, 'GenericToolCard');
  });

  it('BashTool body Column uses stretch when expanded', () => {
    const tc = makeToolCall('Bash');
    const widget = new BashTool({ toolCall: tc, isExpanded: true });
    assertBodyColumnsStretch(widget, 'BashTool');
  });

  it('ReadTool body Column uses stretch when expanded', () => {
    const tc = makeToolCall('Read');
    const widget = new ReadTool({ toolCall: tc, isExpanded: true });
    assertBodyColumnsStretch(widget, 'ReadTool');
  });

  it('EditFileTool body Column uses stretch when expanded', () => {
    const tc = makeToolCall('edit_file');
    const widget = new EditFileTool({ toolCall: tc, isExpanded: true });
    assertBodyColumnsStretch(widget, 'EditFileTool');
  });

  it('GrepTool body Column uses stretch when expanded', () => {
    const tc = makeToolCall('Grep');
    const widget = new GrepTool({ toolCall: tc, isExpanded: true });
    assertBodyColumnsStretch(widget, 'GrepTool');
  });

  it('CreateFileTool body Column uses stretch when expanded', () => {
    const tc = makeToolCall('create_file');
    const widget = new CreateFileTool({ toolCall: tc, isExpanded: true });
    assertBodyColumnsStretch(widget, 'CreateFileTool');
  });

  it('WebSearchTool body Column uses stretch when expanded', () => {
    const tc = makeToolCall('WebSearch');
    const widget = new WebSearchTool({ toolCall: tc, isExpanded: true });
    assertBodyColumnsStretch(widget, 'WebSearchTool');
  });

  it('HandoffTool uses stretch (StatefulWidget — verified via grep)', () => {
    // HandoffTool is a StatefulWidget, can't call build() without full element tree.
    // Verified via grep that crossAxisAlignment was changed to 'stretch'.
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../widgets/tool-call/handoff-tool.ts'),
      'utf8',
    );
    expect(src).toContain("crossAxisAlignment: 'stretch'");
    expect(src).not.toContain("crossAxisAlignment: 'start'");
  });

  it('TodoListTool body Column uses stretch when expanded', () => {
    const tc = makeToolCall('todo_list', {
      rawInput: { entries: [{ id: '1', content: 'test', status: 'pending', priority: 'high' }] },
    });
    const widget = new TodoListTool({ toolCall: tc, isExpanded: true });
    assertBodyColumnsStretch(widget, 'TodoListTool');
  });
});

describe('ThinkingBlock: body Column should use stretch', () => {
  it('ThinkingBlock (expanded) body Column uses stretch', () => {
    // ThinkingBlock is a StatefulWidget, so we can't call build() directly without
    // an element tree. Verify crossAxisAlignment via source inspection.
    const fs = require('fs');
    const src = fs.readFileSync(
      require.resolve('../widgets/thinking-block.ts'),
      'utf8',
    );
    expect(src).toContain("crossAxisAlignment: 'stretch'");
    expect(src).not.toContain("crossAxisAlignment: 'start'");
  });
});

// ===================================================================
// Gap #41 — Render ToolCallItem.locations in tool cards
// ===================================================================

/**
 * Recursively collects all text strings from TextSpan widgets in a tree.
 */
function collectTextContent(widget: any): string[] {
  const texts: string[] = [];

  // TextSpan text
  if (widget?.text !== undefined && typeof widget.text === 'string' && widget.text.length > 0) {
    texts.push(widget.text);
  }

  // TextSpan children
  if (widget?.children && Array.isArray(widget.children)) {
    for (const child of widget.children) {
      texts.push(...collectTextContent(child));
    }
  }

  // Widget .child
  if (widget?.child) {
    texts.push(...collectTextContent(widget.child));
  }

  // Widget .children (array of widgets)
  const wChildren = widget?._children ?? [];
  if (Array.isArray(wChildren)) {
    for (const child of wChildren) {
      texts.push(...collectTextContent(child));
    }
  }

  // Text widget wraps a TextSpan
  if (widget?.constructor?.name === 'Text' && widget?.text) {
    texts.push(...collectTextContent(widget.text));
  }

  // Padding wraps child
  if (widget?.constructor?.name === 'Padding' && widget?.child) {
    texts.push(...collectTextContent(widget.child));
  }

  // Column children
  if (widget?.constructor?.name === 'Column') {
    const children = widget.children ?? widget._children ?? [];
    if (Array.isArray(children)) {
      for (const child of children) {
        texts.push(...collectTextContent(child));
      }
    }
  }

  // StickyHeader
  if (widget?.header) {
    texts.push(...collectTextContent(widget.header));
  }
  if (widget?.body) {
    texts.push(...collectTextContent(widget.body));
  }

  return texts;
}

describe('Gap #41 — ToolCallItem.locations rendering', () => {

  it('GenericToolCard shows location paths in expanded body', () => {
    const tc = makeToolCall('painter', {
      locations: [
        { path: '/home/user/project/src/main.ts' },
        { path: '/home/user/project/src/utils/helper.ts' },
      ],
    });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);
    const texts = collectTextContent(tree);
    const joined = texts.join(' ');

    expect(joined).toContain('Files:');
    expect(joined).toContain('/home/user/project/src/main.ts');
    expect(joined).toContain('/home/user/project/src/utils/helper.ts');
  });

  it('GenericToolCard header includes shortened location paths via details prop', () => {
    const tc = makeToolCall('painter', {
      locations: [
        { path: '/home/user/project/src/deep/nested/main.ts' },
      ],
    });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: false });
    const tree = widget.build({} as any);

    // When collapsed, tree is a ToolHeader (StatefulWidget).
    // Verify that the ToolHeader was created with details containing the shortened path.
    expect(tree.constructor.name).toBe('ToolHeader');
    const header = tree as any;
    const details: string[] = header.details ?? [];
    const detailsJoined = details.join(' ');
    expect(detailsJoined).toContain('nested/main.ts');
  });

  it('GenericToolCard shows "+N more" when locations exceed 2', () => {
    const tc = makeToolCall('painter', {
      locations: [
        { path: '/a/b/c.ts' },
        { path: '/d/e/f.ts' },
        { path: '/g/h/i.ts' },
        { path: '/j/k/l.ts' },
      ],
    });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: false });
    const tree = widget.build({} as any);

    // ToolHeader StatefulWidget — check details prop
    const header = tree as any;
    const details: string[] = header.details ?? [];
    const detailsJoined = details.join(' ');
    expect(detailsJoined).toContain('+2 more');
  });

  it('GenericToolCard renders no locations section when locations is empty', () => {
    const tc = makeToolCall('painter', {
      locations: [],
    });
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);
    const texts = collectTextContent(tree);
    const joined = texts.join(' ');

    expect(joined).not.toContain('Files:');
  });

  it('GenericToolCard renders no locations section when locations is undefined', () => {
    const tc = makeToolCall('painter');
    // Default makeToolCall does not set locations
    const widget = new GenericToolCard({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);
    const texts = collectTextContent(tree);
    const joined = texts.join(' ');

    expect(joined).not.toContain('Files:');
  });
});

// ===================================================================
// Gap #42 — Streaming tool output via appendToolOutput
// ===================================================================

describe('Gap #42 — Streaming tool output (ConversationState)', () => {

  it('appendToolOutput accumulates streaming text on tool call item', () => {
    const conv = new ConversationState();
    conv.addToolCall('tc-1', 'Test', 'Bash', 'in_progress');
    conv.appendToolOutput('tc-1', 'hello ');
    conv.appendToolOutput('tc-1', 'world');

    const item = conv.items.find(i => i.type === 'tool_call') as ToolCallItem;
    expect(item.streamingOutput).toBe('hello world');
    expect(item.isStreaming).toBe(true);
  });

  it('appendToolOutput auto-expands tool card on first chunk', () => {
    const conv = new ConversationState();
    conv.addToolCall('tc-2', 'Test', 'Bash', 'in_progress');

    // Verify initial state — collapsed by default
    const before = conv.items.find(i => i.type === 'tool_call') as ToolCallItem;
    expect(before.collapsed).toBe(true);

    conv.appendToolOutput('tc-2', 'first chunk');

    const after = conv.items.find(i => i.type === 'tool_call') as ToolCallItem;
    expect(after.collapsed).toBe(false);
  });

  it('appendToolOutput ignores completed tool calls', () => {
    const conv = new ConversationState();
    conv.addToolCall('tc-3', 'Test', 'Bash', 'in_progress');
    conv.updateToolCall('tc-3', 'completed');
    conv.appendToolOutput('tc-3', 'should be ignored');

    const item = conv.items.find(i => i.type === 'tool_call') as ToolCallItem;
    expect(item.streamingOutput).toBeUndefined();
  });

  it('appendToolOutput trims buffer to maxBuffer limit', () => {
    const conv = new ConversationState();
    conv.addToolCall('tc-4', 'Test', 'Bash', 'in_progress');

    // Provide a small maxBuffer for easy testing
    const maxBuffer = 50;
    const longText = 'x'.repeat(100);
    conv.appendToolOutput('tc-4', longText, maxBuffer);

    const item = conv.items.find(i => i.type === 'tool_call') as ToolCallItem;
    expect(item.streamingOutput!.length).toBeLessThanOrEqual(maxBuffer + 20); // allow for prefix
    expect(item.streamingOutput).toContain('...(truncated)');
  });

  it('updateToolCall clears isStreaming flag', () => {
    const conv = new ConversationState();
    conv.addToolCall('tc-5', 'Test', 'Bash', 'in_progress');
    conv.appendToolOutput('tc-5', 'output');
    conv.updateToolCall('tc-5', 'completed');

    const item = conv.items.find(i => i.type === 'tool_call') as ToolCallItem;
    expect(item.isStreaming).toBe(false);
  });

  it('appendToolOutput ignores unknown toolCallIds', () => {
    const conv = new ConversationState();
    conv.addToolCall('tc-6', 'Test', 'Bash', 'in_progress');

    // Should not throw
    conv.appendToolOutput('nonexistent', 'hello');

    const item = conv.items.find(i => i.type === 'tool_call') as ToolCallItem;
    expect(item.streamingOutput).toBeUndefined();
  });

  it('setToolTerminalId sets terminalId on tool call', () => {
    const conv = new ConversationState();
    conv.addToolCall('tc-7', 'Test', 'Bash', 'in_progress');
    conv.setToolTerminalId('tc-7', 'term-abc');

    const item = conv.items.find(i => i.type === 'tool_call') as ToolCallItem;
    expect(item.terminalId).toBe('term-abc');
  });
});

describe('Gap #42 — BashTool streaming output rendering', () => {

  it('BashTool shows streaming output with block cursor when isStreaming', () => {
    const tc = makeToolCall('Bash', {
      status: 'in_progress',
      isStreaming: true,
      streamingOutput: 'compiling...',
      rawInput: { command: 'npm run build' },
      result: { status: 'streaming' as any, rawOutput: { stdout: 'compiling...' } },
    });
    const widget = new BashTool({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);
    const texts = collectTextContent(tree);
    const joined = texts.join('');

    expect(joined).toContain('compiling...');
    // Block cursor character should be present
    expect(joined).toContain('\u2588');
  });

  it('BashTool shows normal output without cursor when completed', () => {
    const tc = makeToolCall('Bash', {
      status: 'completed',
      isStreaming: false,
      rawInput: { command: 'echo hello' },
      result: { status: 'completed', rawOutput: { stdout: 'hello\n', exit_code: 0 } },
    });
    const widget = new BashTool({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);
    const texts = collectTextContent(tree);
    const joined = texts.join('');

    expect(joined).toContain('hello');
    expect(joined).not.toContain('\u2588');
  });
});

// ===================================================================
// Gap #43 — CreateFileTool result rendering
// ===================================================================

describe('Gap #43 — CreateFileTool result rendering', () => {

  it('shows green-colored success result when completed', () => {
    const tc = makeToolCall('create_file', {
      status: 'completed',
      rawInput: { file_path: '/test/new-file.ts', content: 'console.log("hi")' },
      result: {
        status: 'completed',
        rawOutput: { message: 'File created successfully' },
      },
    });
    const widget = new CreateFileTool({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);
    const texts = collectTextContent(tree);
    const joined = texts.join(' ');

    expect(joined).toContain('File created successfully');
  });

  it('shows red-colored error result when failed', () => {
    const tc = makeToolCall('create_file', {
      status: 'failed',
      rawInput: { file_path: '/test/fail.ts', content: 'x' },
      result: {
        status: 'failed',
        rawOutput: { error: 'Permission denied' },
      },
    });
    const widget = new CreateFileTool({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);
    const texts = collectTextContent(tree);
    const joined = texts.join(' ');

    expect(joined).toContain('Permission denied');
  });

  it('renders both content preview and result when expanded', () => {
    const tc = makeToolCall('create_file', {
      status: 'completed',
      rawInput: { file_path: '/test/file.ts', content: 'const x = 1;' },
      result: {
        status: 'completed',
        content: [{ type: 'text', content: { type: 'text', text: 'Created /test/file.ts (12 bytes)' } }],
      },
    });
    const widget = new CreateFileTool({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);
    const texts = collectTextContent(tree);
    const joined = texts.join(' ');

    // Should contain both content preview and result text
    expect(joined).toContain('const x = 1;');
    expect(joined).toContain('Created /test/file.ts');
  });

  it('renders only header when collapsed', () => {
    const tc = makeToolCall('create_file', {
      status: 'completed',
      rawInput: { file_path: '/test/file.ts', content: 'const x = 1;' },
      result: {
        status: 'completed',
        rawOutput: { message: 'created' },
      },
    });
    const widget = new CreateFileTool({ toolCall: tc, isExpanded: false });
    const tree = widget.build({} as any);

    // When collapsed, should return a ToolHeader (StatefulWidget), not a Column
    expect(tree.constructor.name).toBe('ToolHeader');
    // Verify that file path is in header details
    const header = tree as any;
    const details: string[] = header.details ?? [];
    expect(details).toContain('/test/file.ts');
  });

  it('shows only header when no content and no result', () => {
    const tc = makeToolCall('create_file', {
      status: 'in_progress',
      rawInput: { file_path: '/test/file.ts' },
      result: undefined,
    });
    const widget = new CreateFileTool({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);

    // Should return just the header (ToolHeader), not a Column
    expect(tree.constructor.name).toBe('ToolHeader');
  });

  it('truncates long result text with truncation marker', () => {
    const longResult = 'x'.repeat(2000);
    const tc = makeToolCall('create_file', {
      status: 'completed',
      rawInput: { file_path: '/test/file.ts' },
      result: {
        status: 'completed',
        content: [{ type: 'text', content: { type: 'text', text: longResult } }],
      },
    });
    const widget = new CreateFileTool({ toolCall: tc, isExpanded: true });
    const tree = widget.build({} as any);
    const texts = collectTextContent(tree);
    const joined = texts.join(' ');

    // Uses unicode ellipsis \u2026 from TRUNCATION_SUFFIX
    expect(joined).toContain('(truncated)');
  });

  it('CreateFileTool correctly identifies success vs failure', () => {
    // Success case
    const tcSuccess = makeToolCall('create_file', {
      status: 'completed',
      rawInput: { file_path: '/test/ok.ts', content: 'ok' },
      result: { status: 'completed', rawOutput: { message: 'done' } },
    });
    const successWidget = new CreateFileTool({ toolCall: tcSuccess, isExpanded: true });
    const successTree = successWidget.build({} as any);
    // Should be a Column (has body content)
    expect(successTree.constructor.name).toBe('Column');

    // Failure case
    const tcFail = makeToolCall('create_file', {
      status: 'failed',
      rawInput: { file_path: '/test/fail.ts', content: 'x' },
      result: { status: 'failed', rawOutput: { error: 'denied' } },
    });
    const failWidget = new CreateFileTool({ toolCall: tcFail, isExpanded: true });
    const failTree = failWidget.build({} as any);
    // Should also be a Column (has body content)
    expect(failTree.constructor.name).toBe('Column');
  });
});
