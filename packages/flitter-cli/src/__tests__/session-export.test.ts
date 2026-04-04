import { describe, expect, it } from 'bun:test';

import { exportToMarkdown, exportToText } from '../state/session-export';
import type { SessionFile } from '../state/session-store';
import type { ConversationItem } from '../state/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<SessionFile> = {}): SessionFile {
  return {
    version: 1,
    sessionId: 'test-session-001',
    cwd: '/tmp/project',
    gitBranch: 'main',
    model: 'claude-4',
    createdAt: 1700000000000,
    updatedAt: 1700001000000,
    items: [],
    plan: [],
    usage: null,
    currentMode: null,
    ...overrides,
  };
}

function userMsg(text: string): ConversationItem {
  return { type: 'user_message', text, timestamp: Date.now() };
}

function assistantMsg(text: string): ConversationItem {
  return { type: 'assistant_message', text, timestamp: Date.now(), isStreaming: false };
}

function toolCall(title: string, rawOutput?: string): ConversationItem {
  return {
    type: 'tool_call',
    toolCallId: 'tc-1',
    title,
    kind: 'bash',
    status: 'completed',
    collapsed: false,
    rawInput: { command: 'echo hello' },
    result: rawOutput ? { status: 'completed', rawOutput } : undefined,
  };
}

function thinkingItem(text: string): ConversationItem {
  return { type: 'thinking', text, timestamp: Date.now(), isStreaming: false, collapsed: false };
}

// ---------------------------------------------------------------------------
// exportToMarkdown
// ---------------------------------------------------------------------------

describe('exportToMarkdown', () => {
  it('includes metadata header', () => {
    const md = exportToMarkdown(makeSession());
    expect(md).toContain('# Session Export');
    expect(md).toContain('test-session-001');
    expect(md).toContain('claude-4');
    expect(md).toContain('/tmp/project');
    expect(md).toContain('main');
  });

  it('renders user and assistant messages', () => {
    const md = exportToMarkdown(makeSession({
      items: [userMsg('Hello'), assistantMsg('Hi there')],
    }));
    expect(md).toContain('### 🧑 User');
    expect(md).toContain('Hello');
    expect(md).toContain('### 🤖 Assistant');
    expect(md).toContain('Hi there');
  });

  it('renders tool calls with input and output', () => {
    const md = exportToMarkdown(makeSession({
      items: [toolCall('bash echo hello', 'hello\n')],
    }));
    expect(md).toContain('#### 🔧 Tool: bash echo hello');
    expect(md).toContain('```json');
    expect(md).toContain('"command"');
    expect(md).toContain('**Result:**');
    expect(md).toContain('hello');
  });

  it('renders thinking blocks as collapsible details', () => {
    const md = exportToMarkdown(makeSession({
      items: [thinkingItem('Let me think...')],
    }));
    expect(md).toContain('<details>');
    expect(md).toContain('💭 Thinking');
    expect(md).toContain('Let me think...');
    expect(md).toContain('</details>');
  });

  it('renders plan section with checkboxes', () => {
    const md = exportToMarkdown(makeSession({
      plan: [
        { content: 'Step 1', status: 'completed', priority: 'high' },
        { content: 'Step 2', status: 'pending', priority: 'medium' },
      ],
    }));
    expect(md).toContain('## Plan');
    expect(md).toContain('- [x] Step 1 (high)');
    expect(md).toContain('- [ ] Step 2');
  });

  it('handles empty session', () => {
    const md = exportToMarkdown(makeSession({ items: [], plan: [], usage: null }));
    expect(md).toContain('# Session Export');
    expect(md).toContain('## Conversation');
    expect(md).not.toContain('## Plan');
  });

  it('renders usage section when present', () => {
    const md = exportToMarkdown(makeSession({
      usage: { size: 200000, used: 50000, inputTokens: 30000, outputTokens: 20000, cost: { amount: 0.05, currency: '$' } },
    }));
    expect(md).toContain('## Usage');
    expect(md).toContain('50000 / 200000 tokens');
    expect(md).toContain('0.05 $');
  });
});

// ---------------------------------------------------------------------------
// exportToText
// ---------------------------------------------------------------------------

describe('exportToText', () => {
  it('includes header fields', () => {
    const txt = exportToText(makeSession());
    expect(txt).toContain('Session: test-session-001');
    expect(txt).toContain('Model: claude-4');
    expect(txt).toContain('CWD: /tmp/project');
    expect(txt).toContain('Branch: main');
  });

  it('renders user and assistant messages', () => {
    const txt = exportToText(makeSession({
      items: [userMsg('Hello'), assistantMsg('Hi')],
    }));
    expect(txt).toContain('[User]');
    expect(txt).toContain('Hello');
    expect(txt).toContain('[Assistant]');
    expect(txt).toContain('Hi');
  });

  it('renders tool calls with status and output', () => {
    const txt = exportToText(makeSession({
      items: [toolCall('bash echo', 'output-text')],
    }));
    expect(txt).toContain('[Tool: bash echo] (completed)');
    expect(txt).toContain('output-text');
  });

  it('renders thinking items', () => {
    const txt = exportToText(makeSession({
      items: [thinkingItem('reasoning...')],
    }));
    expect(txt).toContain('[Thinking]');
    expect(txt).toContain('reasoning...');
  });

  it('renders plan section', () => {
    const txt = exportToText(makeSession({
      plan: [
        { content: 'Done task', status: 'completed', priority: 'medium' },
        { content: 'Pending task', status: 'pending', priority: 'low' },
      ],
    }));
    expect(txt).toContain('Plan:');
    expect(txt).toContain('[x] Done task');
    expect(txt).toContain('[ ] Pending task');
  });

  it('handles empty session', () => {
    const txt = exportToText(makeSession({ items: [], plan: [], usage: null, gitBranch: null }));
    expect(txt).toContain('Session: test-session-001');
    expect(txt).not.toContain('Branch:');
    expect(txt).not.toContain('Plan:');
  });
});
