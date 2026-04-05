// Agentic loop tests — verifies tool execution, re-submission,
// permission flow, and multi-iteration loops.

import { describe, test, expect, beforeEach } from 'bun:test';
import { PromptController } from '../state/prompt-controller';
import { SessionState } from '../state/session';
import { ToolRegistry } from '../tools/registry';
import type { Provider, PromptOptions } from '../provider/provider';
import type { ToolExecutor, ToolResult, ToolContext, RegisteredTool } from '../tools/executor';
import type { StreamEvent, ProviderMessage } from '../state/types';

// ---------------------------------------------------------------------------
// Mock Provider
// ---------------------------------------------------------------------------

/** Mock provider that yields different event sequences per call. */
class MockProvider implements Provider {
  readonly id = 'mock' as any;
  readonly name = 'Mock';
  readonly model = 'mock-model';
  readonly capabilities = { vision: true, functionCalling: true, streaming: true, systemPrompt: true };

  /** Array of event sequences — each submitPrompt() call shifts one off. */
  callSequences: StreamEvent[][] = [];
  /** Record of messages passed to each call. */
  callHistory: ProviderMessage[][] = [];
  private _cancelled = false;

  async *sendPrompt(
    messages: ProviderMessage[],
    options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    this.callHistory.push([...messages]);
    this._cancelled = false;

    const events = this.callSequences.shift() ?? [];
    for (const event of events) {
      if (this._cancelled) return;
      yield event;
    }
  }

  cancelRequest(): void {
    this._cancelled = true;
  }
}

// ---------------------------------------------------------------------------
// Mock Executor
// ---------------------------------------------------------------------------

class MockExecutor implements ToolExecutor {
  results: Map<string, ToolResult> = new Map();

  async execute(input: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const key = JSON.stringify(input);
    return this.results.get(key) ?? { content: `Executed with: ${key}` };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSession(): SessionState {
  return new SessionState({
    sessionId: 'test-session',
    cwd: '/tmp/test',
    model: 'mock-model',
  });
}

function textDelta(text: string): StreamEvent {
  return { type: 'text_delta', text };
}

function toolCallStart(id: string, name: string): StreamEvent {
  return { type: 'tool_call_start', toolCallId: id, name, title: name, kind: name };
}

function toolCallReady(id: string, name: string, input: Record<string, unknown>): StreamEvent {
  return { type: 'tool_call_ready', toolCallId: id, name, input };
}

function messageComplete(stopReason: string): StreamEvent {
  return { type: 'message_complete', stopReason };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Agentic Loop', () => {
  let provider: MockProvider;
  let session: SessionState;
  let registry: ToolRegistry;

  beforeEach(() => {
    provider = new MockProvider();
    session = createSession();
    registry = new ToolRegistry();
  });

  test('simple turn without tools completes normally', async () => {
    provider.callSequences = [[
      textDelta('Hello!'),
      messageComplete('end_turn'),
    ]];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
    });

    await ctrl.submitPrompt('Hi');
    expect(session.lifecycle).toBe('complete');
    expect(provider.callHistory).toHaveLength(1);
  });

  test('single tool call iteration', async () => {
    // Register a mock tool
    const executor = new MockExecutor();
    registry.register({
      definition: {
        name: 'Bash',
        description: 'Run a command',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor,
      requiresPermission: false,
    });

    // First call: model requests a tool
    // Second call: model completes after seeing tool result
    provider.callSequences = [
      [
        toolCallStart('tc-1', 'Bash'),
        toolCallReady('tc-1', 'Bash', { command: 'ls' }),
        messageComplete('tool_use'),
      ],
      [
        textDelta('Directory listing done.'),
        messageComplete('end_turn'),
      ],
    ];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
    });

    await ctrl.submitPrompt('List files');

    expect(session.lifecycle).toBe('complete');
    // Two API calls: initial + re-submission with tool results
    expect(provider.callHistory).toHaveLength(2);
    expect(session.lastStopReason).toBe('end_turn');
  });

  test('multiple tool calls in one iteration', async () => {
    const executor = new MockExecutor();
    registry.register({
      definition: {
        name: 'Read',
        description: 'Read a file',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor,
      requiresPermission: false,
    });

    provider.callSequences = [
      [
        toolCallStart('tc-1', 'Read'),
        toolCallReady('tc-1', 'Read', { file_path: '/a.txt' }),
        toolCallStart('tc-2', 'Read'),
        toolCallReady('tc-2', 'Read', { file_path: '/b.txt' }),
        messageComplete('tool_use'),
      ],
      [
        textDelta('Both files read.'),
        messageComplete('end_turn'),
      ],
    ];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
    });

    await ctrl.submitPrompt('Read both files');

    expect(session.lifecycle).toBe('complete');
    expect(provider.callHistory).toHaveLength(2);
  });

  test('multiple agentic loop iterations', async () => {
    const executor = new MockExecutor();
    registry.register({
      definition: {
        name: 'Bash',
        description: 'Run a command',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor,
      requiresPermission: false,
    });

    // Three iterations: tool -> tool -> end
    provider.callSequences = [
      [
        toolCallStart('tc-1', 'Bash'),
        toolCallReady('tc-1', 'Bash', { command: 'step1' }),
        messageComplete('tool_use'),
      ],
      [
        toolCallStart('tc-2', 'Bash'),
        toolCallReady('tc-2', 'Bash', { command: 'step2' }),
        messageComplete('tool_use'),
      ],
      [
        textDelta('All done.'),
        messageComplete('end_turn'),
      ],
    ];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
    });

    await ctrl.submitPrompt('Do multi-step task');

    expect(session.lifecycle).toBe('complete');
    expect(provider.callHistory).toHaveLength(3);
  });

  test('unknown tool returns error result', async () => {
    // No tools registered in registry

    provider.callSequences = [
      [
        toolCallStart('tc-1', 'UnknownTool'),
        toolCallReady('tc-1', 'UnknownTool', {}),
        messageComplete('tool_use'),
      ],
      [
        textDelta('Handled error.'),
        messageComplete('end_turn'),
      ],
    ];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
    });

    await ctrl.submitPrompt('Try unknown tool');

    expect(session.lifecycle).toBe('complete');
    expect(provider.callHistory).toHaveLength(2);
  });

  test('tool executor error is caught and returned', async () => {
    const failingExecutor: ToolExecutor = {
      async execute(): Promise<ToolResult> {
        throw new Error('Disk full');
      },
    };
    registry.register({
      definition: {
        name: 'Write',
        description: 'Write a file',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor: failingExecutor,
      requiresPermission: false,
    });

    provider.callSequences = [
      [
        toolCallStart('tc-1', 'Write'),
        toolCallReady('tc-1', 'Write', { file_path: '/x.txt', content: 'data' }),
        messageComplete('tool_use'),
      ],
      [
        textDelta('Got error.'),
        messageComplete('end_turn'),
      ],
    ];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
    });

    await ctrl.submitPrompt('Write file');

    expect(session.lifecycle).toBe('complete');
    expect(provider.callHistory).toHaveLength(2);
  });

  test('permission denied stops tool execution', async () => {
    const executor = new MockExecutor();
    registry.register({
      definition: {
        name: 'Bash',
        description: 'Run command',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor,
      requiresPermission: true, // Requires permission
    });

    provider.callSequences = [
      [
        toolCallStart('tc-1', 'Bash'),
        toolCallReady('tc-1', 'Bash', { command: 'rm -rf /' }),
        messageComplete('tool_use'),
      ],
      [
        textDelta('Permission was denied.'),
        messageComplete('end_turn'),
      ],
    ];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
      onPermissionRequest: async (req) => {
        // Deny permission
        return 'deny';
      },
    });

    await ctrl.submitPrompt('Delete everything');

    expect(session.lifecycle).toBe('complete');
    expect(provider.callHistory).toHaveLength(2);
  });

  test('permission approved allows execution', async () => {
    const executor = new MockExecutor();
    executor.results.set(JSON.stringify({ command: 'ls' }), { content: 'file1.txt\nfile2.txt' });
    registry.register({
      definition: {
        name: 'Bash',
        description: 'Run command',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor,
      requiresPermission: true,
    });

    provider.callSequences = [
      [
        toolCallStart('tc-1', 'Bash'),
        toolCallReady('tc-1', 'Bash', { command: 'ls' }),
        messageComplete('tool_use'),
      ],
      [
        textDelta('Found 2 files.'),
        messageComplete('end_turn'),
      ],
    ];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
      onPermissionRequest: async (req) => {
        return 'allow';
      },
    });

    await ctrl.submitPrompt('List files');

    expect(session.lifecycle).toBe('complete');
    expect(provider.callHistory).toHaveLength(2);
  });

  test('cancellation during tool execution stops loop', async () => {
    let executionStarted = false;
    const slowExecutor: ToolExecutor = {
      async execute(): Promise<ToolResult> {
        executionStarted = true;
        // Simulate slow execution
        await new Promise(r => setTimeout(r, 100));
        return { content: 'done' };
      },
    };
    registry.register({
      definition: {
        name: 'Bash',
        description: 'Run command',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor: slowExecutor,
      requiresPermission: false,
    });

    provider.callSequences = [
      [
        toolCallStart('tc-1', 'Bash'),
        toolCallReady('tc-1', 'Bash', { command: 'sleep 10' }),
        messageComplete('tool_use'),
      ],
    ];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
    });

    // Start prompt and cancel shortly after
    const promise = ctrl.submitPrompt('Run slow command');
    // Wait briefly for streaming to begin, then cancel
    await new Promise(r => setTimeout(r, 10));
    ctrl.cancel();

    await promise;

    expect(session.lifecycle).toBe('cancelled');
  });

  test('no tool registry falls back to simple completion', async () => {
    provider.callSequences = [[
      textDelta('Hello!'),
      messageComplete('end_turn'),
    ]];

    const ctrl = new PromptController({
      session,
      provider,
      // No tool registry
    });

    await ctrl.submitPrompt('Hi');
    expect(session.lifecycle).toBe('complete');
  });

  test('tool results are included in re-submitted messages', async () => {
    const executor = new MockExecutor();
    executor.results.set(JSON.stringify({ command: 'pwd' }), { content: '/home/user' });
    registry.register({
      definition: {
        name: 'Bash',
        description: 'Run command',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor,
      requiresPermission: false,
    });

    provider.callSequences = [
      [
        toolCallStart('tc-1', 'Bash'),
        toolCallReady('tc-1', 'Bash', { command: 'pwd' }),
        messageComplete('tool_use'),
      ],
      [
        textDelta('You are in /home/user'),
        messageComplete('end_turn'),
      ],
    ];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
    });

    await ctrl.submitPrompt('Where am I?');

    // Second call should have more messages than first (includes tool results)
    expect(provider.callHistory[1].length).toBeGreaterThan(provider.callHistory[0].length);
  });

  test('onStreamComplete is called after successful completion', async () => {
    let streamCompleted = false;

    provider.callSequences = [[
      textDelta('Done!'),
      messageComplete('end_turn'),
    ]];

    const ctrl = new PromptController({
      session,
      provider,
      toolRegistry: registry,
      onStreamComplete: () => {
        streamCompleted = true;
      },
    });

    await ctrl.submitPrompt('Test');
    expect(streamCompleted).toBe(true);
  });
});
