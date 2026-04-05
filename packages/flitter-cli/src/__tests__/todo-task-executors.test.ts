// TodoExecutor and TaskExecutor tests — verifies the TodoWrite and Task tool executors,
// plus the ToolRegistry.replaceExecutor method.

import { describe, test, expect } from 'bun:test';
import { TodoExecutor } from '../tools/todo-executor';
import { TaskExecutor } from '../tools/task-executor';
import { ToolRegistry } from '../tools/registry';
import type { ToolContext, ToolResult } from '../tools/executor';
import type { Provider, PromptOptions } from '../provider/provider';
import type { ProviderMessage, StreamEvent } from '../state/types';

function ctx(overrides?: Partial<ToolContext>): ToolContext {
  return { cwd: '/tmp', ...overrides };
}

// ---------------------------------------------------------------------------
// TodoExecutor
// ---------------------------------------------------------------------------

describe('TodoExecutor', () => {
  const todo = new TodoExecutor();

  test('accepts valid todos array and returns summary', async () => {
    const result = await todo.execute(
      {
        todos: [
          { content: 'Step 1', status: 'pending', activeForm: 'Working on step 1' },
          { content: 'Step 2', status: 'completed', activeForm: 'Completing step 2' },
        ],
      },
      ctx(),
    );
    expect(result.isError).toBe(false);
    expect(result.content).toContain('2 total');
    expect(result.content).toContain('1 completed');
    expect(result.content).toContain('1 pending');
  });

  test('rejects non-array input', async () => {
    const result = await todo.execute({ todos: 'not an array' }, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('"todos" must be an array');
  });

  test('rejects missing todos field', async () => {
    const result = await todo.execute({}, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('"todos" must be an array');
  });

  test('calls onPlanUpdate with correct entries', async () => {
    const captured: Array<{ content: string; status: string; priority: string }>[] = [];
    const context = ctx({
      onPlanUpdate: (entries) => captured.push(entries),
    });

    await todo.execute(
      {
        todos: [
          { content: 'Task A', status: 'in_progress' },
          { content: 'Task B', status: 'pending' },
        ],
      },
      context,
    );

    expect(captured).toHaveLength(1);
    expect(captured[0]).toHaveLength(2);
    expect(captured[0][0]).toEqual({
      content: 'Task A',
      status: 'in_progress',
      priority: 'medium',
    });
    expect(captured[0][1]).toEqual({
      content: 'Task B',
      status: 'pending',
      priority: 'medium',
    });
  });

  test('counts pending/in_progress/completed correctly', async () => {
    const result = await todo.execute(
      {
        todos: [
          { content: 'A', status: 'pending' },
          { content: 'B', status: 'in_progress' },
          { content: 'C', status: 'completed' },
          { content: 'D', status: 'completed' },
          { content: 'E', status: 'in_progress' },
        ],
      },
      ctx(),
    );
    expect(result.isError).toBe(false);
    expect(result.content).toContain('2 completed');
    expect(result.content).toContain('2 in progress');
    expect(result.content).toContain('1 pending');
    expect(result.content).toContain('5 total');
  });

  test('handles empty todos array', async () => {
    const result = await todo.execute({ todos: [] }, ctx());
    expect(result.isError).toBe(false);
    expect(result.content).toContain('0 total');
  });

  test('maps unknown status to pending', async () => {
    const captured: Array<{ content: string; status: string; priority: string }>[] = [];
    const context = ctx({
      onPlanUpdate: (entries) => captured.push(entries),
    });

    await todo.execute(
      { todos: [{ content: 'X', status: 'unknown_status' }] },
      context,
    );

    expect(captured[0][0].status).toBe('pending');
  });

  test('works without onPlanUpdate callback', async () => {
    // Should not throw even without the callback
    const result = await todo.execute(
      { todos: [{ content: 'Solo', status: 'pending' }] },
      ctx(),
    );
    expect(result.isError).toBe(false);
    expect(result.content).toContain('1 total');
  });
});

// ---------------------------------------------------------------------------
// TaskExecutor
// ---------------------------------------------------------------------------

/** Create a mock provider that yields a fixed sequence of stream events. */
function mockProvider(events: StreamEvent[]): Provider {
  return {
    id: 'mock',
    name: 'Mock Provider',
    model: 'mock-model',
    sendPrompt(_messages: ProviderMessage[], _options: PromptOptions): AsyncIterable<StreamEvent> {
      return {
        [Symbol.asyncIterator]() {
          let i = 0;
          return {
            async next() {
              if (i < events.length) {
                return { value: events[i++], done: false };
              }
              return { value: undefined as unknown as StreamEvent, done: true };
            },
          };
        },
      };
    },
    cancelRequest() {},
  };
}

/** Create a mock provider that throws an error. */
function throwingProvider(error: Error): Provider {
  return {
    id: 'mock',
    name: 'Mock Provider',
    model: 'mock-model',
    sendPrompt(): AsyncIterable<StreamEvent> {
      return {
        [Symbol.asyncIterator]() {
          return {
            async next(): Promise<IteratorResult<StreamEvent>> {
              throw error;
            },
          };
        },
      };
    },
    cancelRequest() {},
  };
}

describe('TaskExecutor', () => {
  test('returns text from mocked provider stream', async () => {
    const provider = mockProvider([
      { type: 'text_delta', text: 'Hello ' },
      { type: 'text_delta', text: 'world!' },
      { type: 'message_complete', stopReason: 'end_turn' },
    ]);
    const task = new TaskExecutor(provider);

    const result = await task.execute({ prompt: 'Say hello' }, ctx());
    expect(result.isError).toBe(false);
    expect(result.content).toBe('Hello world!');
  });

  test('handles error events from provider', async () => {
    const provider = mockProvider([
      { type: 'text_delta', text: 'partial ' },
      {
        type: 'error',
        error: { message: 'rate limit exceeded', code: 'RATE_LIMIT', retryable: true },
      },
    ]);
    const task = new TaskExecutor(provider);

    const result = await task.execute({ prompt: 'Try this' }, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Sub-agent error');
    expect(result.content).toContain('rate limit exceeded');
  });

  test('requires prompt parameter', async () => {
    const provider = mockProvider([]);
    const task = new TaskExecutor(provider);

    const result = await task.execute({}, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('"prompt" is required');
  });

  test('returns empty response placeholder when no text received', async () => {
    const provider = mockProvider([
      { type: 'message_complete', stopReason: 'end_turn' },
    ]);
    const task = new TaskExecutor(provider);

    const result = await task.execute({ prompt: 'No text' }, ctx());
    expect(result.isError).toBe(false);
    expect(result.content).toBe('(empty response)');
  });

  test('handles provider exception', async () => {
    const provider = throwingProvider(new Error('connection refused'));
    const task = new TaskExecutor(provider);

    const result = await task.execute({ prompt: 'Will fail' }, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Sub-agent error');
    expect(result.content).toContain('connection refused');
  });

  test('passes system prompt to provider options', async () => {
    let capturedOptions: PromptOptions | undefined;
    const provider: Provider = {
      id: 'mock',
      name: 'Mock',
      model: 'mock',
      sendPrompt(_messages: ProviderMessage[], options: PromptOptions): AsyncIterable<StreamEvent> {
        capturedOptions = options;
        return {
          [Symbol.asyncIterator]() {
            let done = false;
            return {
              async next() {
                if (!done) {
                  done = true;
                  return {
                    value: { type: 'message_complete' as const, stopReason: 'end_turn' },
                    done: false,
                  };
                }
                return { value: undefined as unknown as StreamEvent, done: true };
              },
            };
          },
        };
      },
      cancelRequest() {},
    };

    const task = new TaskExecutor(provider, 'You are a helpful assistant');
    await task.execute({ prompt: 'Hello' }, ctx());
    expect(capturedOptions?.systemPrompt).toBe('You are a helpful assistant');
  });
});

// ---------------------------------------------------------------------------
// ToolRegistry.replaceExecutor
// ---------------------------------------------------------------------------

describe('ToolRegistry.replaceExecutor', () => {
  function makeRegistry(): ToolRegistry {
    const registry = new ToolRegistry();
    registry.register({
      definition: {
        name: 'TestTool',
        description: 'A test tool',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor: {
        async execute(): Promise<ToolResult> {
          return { content: 'original' };
        },
      },
      requiresPermission: false,
    });
    return registry;
  }

  test('replaces executor for registered tool', async () => {
    const registry = makeRegistry();

    const newExecutor = {
      async execute(): Promise<ToolResult> {
        return { content: 'replaced' };
      },
    };

    registry.replaceExecutor('TestTool', newExecutor);

    const executor = registry.getExecutor('TestTool');
    const result = await executor!.execute({}, { cwd: '/tmp' });
    expect(result.content).toBe('replaced');
  });

  test('preserves other tool properties after replacement', () => {
    const registry = makeRegistry();
    const newExecutor = {
      async execute(): Promise<ToolResult> {
        return { content: 'new' };
      },
    };

    registry.replaceExecutor('TestTool', newExecutor);

    const tool = registry.get('TestTool');
    expect(tool!.definition.name).toBe('TestTool');
    expect(tool!.definition.description).toBe('A test tool');
    expect(tool!.requiresPermission).toBe(false);
  });

  test('throws for unknown tool', () => {
    const registry = new ToolRegistry();
    const executor = {
      async execute(): Promise<ToolResult> {
        return { content: 'nope' };
      },
    };

    expect(() => registry.replaceExecutor('NonExistent', executor)).toThrow(
      'Cannot replace executor for unknown tool: NonExistent',
    );
  });
});
