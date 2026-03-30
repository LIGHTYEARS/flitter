/**
 * Tests for Gap #48, #49, #50.
 *
 * Gap #48: session_info_update handler with SessionInfoPayload type
 * Gap #49: Map<string, ToolCallItem> index for O(1) tool call lookup
 * Gap #50: Immutable ConversationSnapshot with streaming buffer
 *
 * Run:  bun test src/__tests__/gap-48-49-50.test.ts
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { AppState } from '../state/app-state';
import { ConversationState } from '../state/conversation';
import type { ConversationSnapshot } from '../state/immutable-types';
import type { SessionInfoPayload } from '../acp/types';

// ═══════════════════════════════════════════════════════════════════════
//  Gap #48 — session_info_update handler
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #48 — session_info_update handler', () => {
  let appState: AppState;

  beforeEach(() => {
    appState = new AppState();
  });

  test('populates agentName from session_info_update', () => {
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      agentName: 'claude-3.5-sonnet',
    });
    expect(appState.agentName).toBe('claude-3.5-sonnet');
  });

  test('populates agentVersion from session_info_update', () => {
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      agentVersion: '2.1.0',
    });
    expect(appState.agentVersion).toBe('2.1.0');
  });

  test('populates cwd from session_info_update', () => {
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      cwd: '/home/dev/project',
    });
    expect(appState.cwd).toBe('/home/dev/project');
  });

  test('populates gitBranch from session_info_update', () => {
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      gitBranch: 'feature/auth',
    });
    expect(appState.gitBranch).toBe('feature/auth');
  });

  test('clears gitBranch when null', () => {
    appState.gitBranch = 'main';
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      gitBranch: null,
    });
    expect(appState.gitBranch).toBeNull();
  });

  test('populates tools and updates skillCount', () => {
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      tools: [
        { name: 'Read', description: 'Read a file' },
        { name: 'Bash', description: 'Run a command' },
        { name: 'Edit' },
      ],
    });
    expect(appState.tools).toHaveLength(3);
    expect(appState.tools[0]!.name).toBe('Read');
    expect(appState.tools[0]!.description).toBe('Read a file');
    expect(appState.skillCount).toBe(3);
  });

  test('populates modes', () => {
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      modes: [
        { id: 'smart', name: 'Smart', description: 'Default mode' },
        { id: 'bash', name: 'Bash' },
      ],
    });
    expect(appState.modes).toHaveLength(2);
    expect(appState.modes[0]!.id).toBe('smart');
    expect(appState.modes[0]!.name).toBe('Smart');
  });

  test('populates hintText', () => {
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      hintText: 'Press / for commands',
    });
    expect(appState.hintText).toBe('Press / for commands');
  });

  test('clears hintText when null', () => {
    appState.hintText = 'old hint';
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      hintText: null,
    });
    expect(appState.hintText).toBeNull();
  });

  test('populates autocompleteTriggers', () => {
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      autocompleteTriggers: [
        { trigger: '/', description: 'Commands' },
        { trigger: '@', description: 'Mentions' },
      ],
    });
    expect(appState.autocompleteTriggers).toHaveLength(2);
    expect(appState.autocompleteTriggers[0]!.trigger).toBe('/');
  });

  test('handles full session_info_update payload', () => {
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      agentName: 'claude',
      agentVersion: '1.0.0',
      cwd: '/tmp/test',
      gitBranch: 'develop',
      tools: [{ name: 'Read' }],
      modes: [{ id: 'smart', name: 'Smart' }],
      hintText: 'Hint!',
      autocompleteTriggers: [{ trigger: '/' }],
    });
    expect(appState.agentName).toBe('claude');
    expect(appState.agentVersion).toBe('1.0.0');
    expect(appState.cwd).toBe('/tmp/test');
    expect(appState.gitBranch).toBe('develop');
    expect(appState.tools).toHaveLength(1);
    expect(appState.modes).toHaveLength(1);
    expect(appState.hintText).toBe('Hint!');
    expect(appState.autocompleteTriggers).toHaveLength(1);
    expect(appState.skillCount).toBe(1);
  });

  test('partial update does not clear unspecified fields', () => {
    // Set initial state
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      agentName: 'claude',
      cwd: '/home/dev',
      hintText: 'Some hint',
    });

    // Partial update: only agentVersion
    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      agentVersion: '2.0.0',
    });

    // Previous fields should remain unchanged
    expect(appState.agentName).toBe('claude');
    expect(appState.cwd).toBe('/home/dev');
    expect(appState.hintText).toBe('Some hint');
    expect(appState.agentVersion).toBe('2.0.0');
  });

  test('notifies listeners on session_info_update', () => {
    let notified = false;
    appState.addListener(() => { notified = true; });

    appState.onSessionUpdate('s1', {
      sessionUpdate: 'session_info_update',
      agentName: 'test',
    });

    expect(notified).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #49 — O(1) tool call lookup via Map index
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #49 — O(1) tool call lookup via Map index', () => {
  let conv: ConversationState;

  beforeEach(() => {
    conv = new ConversationState();
  });

  test('addToolCall indexes by toolCallId', () => {
    conv.addToolCall('tc-1', 'Read file', 'Read', 'in_progress');
    conv.addToolCall('tc-2', 'Run cmd', 'Bash', 'in_progress');

    // Verify both can be looked up and updated
    conv.updateToolCall('tc-1', 'completed');
    conv.updateToolCall('tc-2', 'failed');

    const items = conv.items;
    const tc1 = items.find(i => i.type === 'tool_call' && i.toolCallId === 'tc-1');
    const tc2 = items.find(i => i.type === 'tool_call' && i.toolCallId === 'tc-2');
    expect(tc1).toBeDefined();
    expect(tc1!.type === 'tool_call' && tc1!.status).toBe('completed');
    expect(tc2).toBeDefined();
    expect(tc2!.type === 'tool_call' && tc2!.status).toBe('failed');
  });

  test('updateToolCall is no-op for unknown toolCallId', () => {
    conv.addToolCall('tc-1', 'Read file', 'Read', 'in_progress');
    const vBefore = conv.snapshot.version;
    conv.updateToolCall('tc-nonexistent', 'completed');
    expect(conv.snapshot.version).toBe(vBefore);
  });

  test('appendToolOutput uses O(1) lookup', () => {
    conv.addToolCall('tc-1', 'Run cmd', 'Bash', 'in_progress');
    conv.appendToolOutput('tc-1', 'line 1\n');
    conv.appendToolOutput('tc-1', 'line 2\n');

    const item = conv.items.find(
      i => i.type === 'tool_call' && i.toolCallId === 'tc-1',
    );
    expect(item).toBeDefined();
    if (item?.type === 'tool_call') {
      expect(item.streamingOutput).toBe('line 1\nline 2\n');
      expect(item.isStreaming).toBe(true);
      expect(item.collapsed).toBe(false); // auto-expanded on first chunk
    }
  });

  test('appendToolOutput is no-op for completed tool call', () => {
    conv.addToolCall('tc-1', 'Run cmd', 'Bash', 'in_progress');
    conv.updateToolCall('tc-1', 'completed');
    const vBefore = conv.snapshot.version;
    conv.appendToolOutput('tc-1', 'should not appear');
    expect(conv.snapshot.version).toBe(vBefore);
  });

  test('setToolTerminalId uses O(1) lookup', () => {
    conv.addToolCall('tc-1', 'Run cmd', 'Bash', 'in_progress');
    conv.setToolTerminalId('tc-1', 'term-abc');

    const item = conv.items.find(
      i => i.type === 'tool_call' && i.toolCallId === 'tc-1',
    );
    if (item?.type === 'tool_call') {
      expect(item.terminalId).toBe('term-abc');
    }
  });

  test('setToolTerminalId is no-op for unknown id', () => {
    const vBefore = conv.snapshot.version;
    conv.setToolTerminalId('tc-unknown', 'term-xyz');
    expect(conv.snapshot.version).toBe(vBefore);
  });

  test('clear() resets tool call index', () => {
    conv.addToolCall('tc-1', 'Read file', 'Read', 'in_progress');
    conv.clear();

    // After clear, updateToolCall should be no-op
    const vBefore = conv.snapshot.version;
    conv.updateToolCall('tc-1', 'completed');
    expect(conv.snapshot.version).toBe(vBefore);
  });

  test('toggleSingleToolCall uses O(1) lookup', () => {
    conv.addToolCall('tc-1', 'Read file', 'Read', 'completed');
    const initialCollapsed = (conv.items.find(
      i => i.type === 'tool_call' && i.toolCallId === 'tc-1',
    ) as any).collapsed;

    conv.toggleSingleToolCall('tc-1');

    const updated = conv.items.find(
      i => i.type === 'tool_call' && i.toolCallId === 'tc-1',
    ) as any;
    expect(updated.collapsed).toBe(!initialCollapsed);
  });

  test('index survives multiple tool calls interleaved with messages', () => {
    conv.addUserMessage('Hello');
    conv.addToolCall('tc-1', 'Read', 'Read', 'in_progress');
    conv.appendAssistantChunk('Partial...');
    conv.finalizeAssistantMessage();
    conv.addToolCall('tc-2', 'Bash', 'Bash', 'in_progress');
    conv.addToolCall('tc-3', 'Grep', 'Grep', 'in_progress');

    // Update all three
    conv.updateToolCall('tc-1', 'completed');
    conv.updateToolCall('tc-3', 'failed');
    conv.appendToolOutput('tc-2', 'output');

    const items = conv.items;
    const tc1 = items.find(i => i.type === 'tool_call' && i.toolCallId === 'tc-1') as any;
    const tc2 = items.find(i => i.type === 'tool_call' && i.toolCallId === 'tc-2') as any;
    const tc3 = items.find(i => i.type === 'tool_call' && i.toolCallId === 'tc-3') as any;

    expect(tc1.status).toBe('completed');
    expect(tc2.streamingOutput).toBe('output');
    expect(tc3.status).toBe('failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Gap #50 — Immutable ConversationSnapshot with streaming buffer
// ═══════════════════════════════════════════════════════════════════════

describe('Gap #50 — Immutable ConversationSnapshot', () => {
  let conv: ConversationState;

  beforeEach(() => {
    conv = new ConversationState();
  });

  // ---- Version counter ----

  test('initial snapshot has version 0', () => {
    expect(conv.snapshot.version).toBe(0);
  });

  test('version increments on every mutation', () => {
    const v0 = conv.snapshot.version;
    conv.addUserMessage('hello');
    expect(conv.snapshot.version).toBe(v0 + 1);
    conv.appendAssistantChunk('hi');
    expect(conv.snapshot.version).toBe(v0 + 2);
    conv.finalizeAssistantMessage();
    // flush + finalize = 2 version bumps
    expect(conv.snapshot.version).toBeGreaterThan(v0 + 2);
  });

  test('clear increments version', () => {
    conv.addUserMessage('test');
    const vBefore = conv.snapshot.version;
    conv.clear();
    expect(conv.snapshot.version).toBe(vBefore + 1);
  });

  // ---- Snapshot immutability ----

  test('snapshot object identity changes on mutation', () => {
    const snap1 = conv.snapshot;
    conv.addUserMessage('hello');
    const snap2 = conv.snapshot;
    expect(snap1).not.toBe(snap2);
  });

  test('items array identity changes on mutation', () => {
    conv.addUserMessage('first');
    const items1 = conv.snapshot.items;
    conv.addUserMessage('second');
    const items2 = conv.snapshot.items;
    expect(items1).not.toBe(items2);
  });

  test('unchanged items preserve identity (structural sharing)', () => {
    conv.addUserMessage('first');
    const items1 = conv.snapshot.items;
    const item0 = items1[0];
    conv.addUserMessage('second');
    const items2 = conv.snapshot.items;
    // The first item should be the same object reference
    expect(items2[0]).toBe(item0);
  });

  test('items are frozen (Object.isFrozen)', () => {
    conv.addUserMessage('test');
    const item = conv.snapshot.items[0];
    expect(Object.isFrozen(item)).toBe(true);
  });

  // ---- Streaming buffer ----

  test('appendAssistantChunk buffers text', () => {
    conv.appendAssistantChunk('Hello ');
    conv.appendAssistantChunk('World');

    // Before explicit flush, snapshot has empty text
    const msg = conv.snapshot.items[0] as any;
    expect(msg.text).toBe(''); // not yet flushed

    // items getter auto-flushes
    const itemsMsg = conv.items[0] as any;
    expect(itemsMsg.text).toBe('Hello World');
  });

  test('flushStreamingText coalesces buffer into snapshot', () => {
    conv.appendAssistantChunk('chunk1');
    conv.appendAssistantChunk('chunk2');

    const changed = conv.flushStreamingText();
    expect(changed).toBe(true);

    const msg = conv.snapshot.items[0] as any;
    expect(msg.text).toBe('chunk1chunk2');
  });

  test('flushStreamingText returns false when nothing to flush', () => {
    conv.addUserMessage('test');
    const changed = conv.flushStreamingText();
    expect(changed).toBe(false);
  });

  test('finalizeAssistantMessage flushes buffer and marks isStreaming=false', () => {
    conv.appendAssistantChunk('text');
    conv.finalizeAssistantMessage();

    const msg = conv.snapshot.items[0] as any;
    expect(msg.text).toBe('text');
    expect(msg.isStreaming).toBe(false);
  });

  test('appendThinkingChunk buffers thinking text', () => {
    conv.appendThinkingChunk('thinking...');

    // snapshot has empty text before flush
    const thinking = conv.snapshot.items[0] as any;
    expect(thinking.text).toBe('');

    // items getter auto-flushes
    const thinkingFromItems = conv.items[0] as any;
    expect(thinkingFromItems.text).toBe('thinking...');
  });

  test('finalizeThinking flushes buffer and marks isStreaming=false', () => {
    conv.appendThinkingChunk('thought');
    conv.finalizeThinking();

    const thinking = conv.snapshot.items[0] as any;
    expect(thinking.text).toBe('thought');
    expect(thinking.isStreaming).toBe(false);
  });

  // ---- Convenience accessors ----

  test('items getter returns snapshot items (auto-flushed)', () => {
    conv.addUserMessage('test');
    expect(conv.items).toBe(conv.snapshot.items);
  });

  test('plan getter returns snapshot plan', () => {
    conv.setPlan([{ content: 'Task 1', priority: 'high', status: 'pending' }]);
    expect(conv.plan).toBe(conv.snapshot.plan);
    expect(conv.plan).toHaveLength(1);
  });

  test('usage getter returns snapshot usage', () => {
    conv.setUsage({ size: 128000, used: 50000 });
    expect(conv.usage).toBe(conv.snapshot.usage);
    expect(conv.usage!.size).toBe(128000);
  });

  test('isProcessing setter updates snapshot', () => {
    expect(conv.isProcessing).toBe(false);
    conv.isProcessing = true;
    expect(conv.isProcessing).toBe(true);
    expect(conv.snapshot.isProcessing).toBe(true);
  });

  test('toolCallsExpanded getter returns snapshot value', () => {
    expect(conv.toolCallsExpanded).toBe(false);
    conv.toggleToolCalls();
    expect(conv.toolCallsExpanded).toBe(true);
  });

  // ---- Tool call operations with immutable model ----

  test('addToolCall creates frozen tool call item', () => {
    conv.addToolCall('tc-1', 'Read file', 'Read', 'in_progress', [{ path: 'a.ts' }]);
    const item = conv.snapshot.items[0];
    expect(Object.isFrozen(item)).toBe(true);
    expect(item.type).toBe('tool_call');
    if (item.type === 'tool_call') {
      expect(item.toolCallId).toBe('tc-1');
    }
  });

  test('updateToolCall produces new frozen item', () => {
    conv.addToolCall('tc-1', 'Read file', 'Read', 'in_progress');
    const before = conv.snapshot.items[0];
    conv.updateToolCall('tc-1', 'completed', undefined, { output: 'done' });
    const after = conv.snapshot.items[0];

    expect(before).not.toBe(after); // new object
    expect(Object.isFrozen(after)).toBe(true);
    if (after.type === 'tool_call') {
      expect(after.status).toBe('completed');
    }
  });

  // ---- toggleToolCalls ----

  test('toggleToolCalls flips all tool calls collapsed state', () => {
    conv.addToolCall('tc-1', 'Read', 'Read', 'completed');
    conv.addToolCall('tc-2', 'Bash', 'Bash', 'completed');

    // Default: collapsed=true (toolCallsExpanded=false)
    expect((conv.items[0] as any).collapsed).toBe(true);
    expect((conv.items[1] as any).collapsed).toBe(true);

    conv.toggleToolCalls();
    expect(conv.toolCallsExpanded).toBe(true);
    expect((conv.items[0] as any).collapsed).toBe(false);
    expect((conv.items[1] as any).collapsed).toBe(false);
  });

  // ---- toggleThinking ----

  test('toggleThinking flips all thinking items', () => {
    conv.appendThinkingChunk('thought 1');
    conv.finalizeThinking();

    // Default: collapsed=true
    expect((conv.items[0] as any).collapsed).toBe(true);

    conv.toggleThinking();
    expect((conv.items[0] as any).collapsed).toBe(false);

    conv.toggleThinking();
    expect((conv.items[0] as any).collapsed).toBe(true);
  });

  // ---- setItemCollapsed ----

  test('setItemCollapsed sets collapsed on thinking item by index', () => {
    conv.appendThinkingChunk('thought');
    conv.finalizeThinking();

    expect((conv.items[0] as any).collapsed).toBe(true);
    conv.setItemCollapsed(0, false);
    expect((conv.items[0] as any).collapsed).toBe(false);
  });

  test('setItemCollapsed is no-op for non-collapsible item', () => {
    conv.addUserMessage('hello');
    const vBefore = conv.snapshot.version;
    conv.setItemCollapsed(0, false);
    expect(conv.snapshot.version).toBe(vBefore);
  });

  test('setItemCollapsed is no-op when already at target state', () => {
    conv.appendThinkingChunk('thought');
    conv.finalizeThinking();
    // Default collapsed=true, setting to true again is no-op
    const vBefore = conv.snapshot.version;
    conv.setItemCollapsed(0, true);
    expect(conv.snapshot.version).toBe(vBefore);
  });

  // ---- addInterruptedThinking ----

  test('addInterruptedThinking creates empty non-streaming thinking', () => {
    conv.addInterruptedThinking();
    const item = conv.items[0] as any;
    expect(item.type).toBe('thinking');
    expect(item.text).toBe('');
    expect(item.isStreaming).toBe(false);
    expect(item.collapsed).toBe(false);
  });

  // ---- setPlan ----

  test('setPlan creates frozen plan entries', () => {
    conv.setPlan([
      { content: 'Step 1', priority: 'high', status: 'completed' },
      { content: 'Step 2', priority: 'low', status: 'pending' },
    ]);
    expect(conv.plan).toHaveLength(2);
    expect(Object.isFrozen(conv.plan[0])).toBe(true);
  });

  test('setPlan updates existing plan item', () => {
    conv.setPlan([{ content: 'Step 1', priority: 'high', status: 'pending' }]);
    const itemCount1 = conv.items.length;
    conv.setPlan([
      { content: 'Step 1', priority: 'high', status: 'completed' },
      { content: 'Step 2', priority: 'medium', status: 'pending' },
    ]);
    // Should not add a second plan item
    expect(conv.items.length).toBe(itemCount1);
    const planItem = conv.items.find(i => i.type === 'plan') as any;
    expect(planItem.entries).toHaveLength(2);
  });

  // ---- clear ----

  test('clear resets all state', () => {
    conv.addUserMessage('hello');
    conv.addToolCall('tc-1', 'Read', 'Read', 'in_progress');
    conv.setUsage({ size: 100, used: 50 });
    conv.isProcessing = true;

    conv.clear();

    expect(conv.items).toHaveLength(0);
    expect(conv.plan).toHaveLength(0);
    expect(conv.usage).toBeNull();
    expect(conv.isProcessing).toBe(false);
  });

  // ---- appendToolOutput truncation ----

  test('appendToolOutput enforces buffer limit', () => {
    conv.addToolCall('tc-1', 'Bash', 'Bash', 'in_progress');

    // Use a small maxBuffer for testing
    const smallMax = 100;
    const longOutput = 'x'.repeat(150);
    conv.appendToolOutput('tc-1', longOutput, smallMax);

    const item = conv.items.find(i => i.type === 'tool_call' && i.toolCallId === 'tc-1') as any;
    expect(item.streamingOutput!.length).toBeLessThanOrEqual(smallMax + 20); // +20 for truncation prefix
    expect(item.streamingOutput).toContain('...(truncated)');
  });

  // ---- restoreFromSession ----

  test('restoreFromSession rebuilds state and tool call index', () => {
    const items = [
      { type: 'user_message' as const, text: 'hello', timestamp: 1000 },
      { type: 'tool_call' as const, toolCallId: 'tc-restored', title: 'Read', kind: 'Read',
        status: 'in_progress' as const, collapsed: true },
    ];
    const plan = [{ content: 'Step 1', priority: 'high' as const, status: 'pending' as const }];
    const usage = { size: 100, used: 50 };

    conv.restoreFromSession(items, plan, usage);

    expect(conv.items).toHaveLength(2);
    expect(conv.plan).toHaveLength(1);
    expect(conv.usage!.size).toBe(100);

    // Tool call index should be rebuilt
    conv.updateToolCall('tc-restored', 'completed');
    const tc = conv.items.find(i => i.type === 'tool_call' && i.toolCallId === 'tc-restored') as any;
    expect(tc.status).toBe('completed');
  });

  // ---- Structural sharing between snapshots ----

  test('non-mutated items share identity across snapshot versions', () => {
    conv.addUserMessage('first');
    conv.addToolCall('tc-1', 'Read', 'Read', 'in_progress');

    const userItem = conv.snapshot.items[0];
    conv.updateToolCall('tc-1', 'completed');

    // The user message should be the same object reference
    expect(conv.snapshot.items[0]).toBe(userItem);
  });

  test('concurrent streaming and tool call operations maintain consistency', () => {
    conv.appendAssistantChunk('Working...');
    conv.addToolCall('tc-1', 'Read', 'Read', 'in_progress');
    // addToolCall finalizes the assistant message

    const items = conv.items;
    expect(items).toHaveLength(2);
    expect(items[0]!.type).toBe('assistant_message');
    expect(items[1]!.type).toBe('tool_call');

    if (items[0]!.type === 'assistant_message') {
      expect(items[0]!.text).toBe('Working...');
      expect(items[0]!.isStreaming).toBe(false);
    }
  });
});
