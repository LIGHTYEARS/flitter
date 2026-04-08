// Integration tests for agentic loop span emission.
// Verifies that submitPrompt() emits the correct spans to the NDJSON logger.
//
// Uses MockProvider from prompt-controller.test.ts pattern.
// Mocks writeEntry to capture all NDJSON entries (spans + error records).

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import type { Provider, PromptOptions } from '../provider/provider';
import type { StreamEvent, SessionError } from '../state/types';

// ---------------------------------------------------------------------------
// Capture all writeEntry / writeDataLog output
// ---------------------------------------------------------------------------

const allEntries: Record<string, unknown>[] = [];

mock.module('../utils/logger', () => ({
  writeEntry: (entry: Record<string, unknown>) => {
    allEntries.push(entry);
  },
  log: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
  },
}));

// Import after mocking
import { SessionState } from '../state/session';
import { PromptController } from '../state/prompt-controller';
import { ToolRegistry } from '../tools/registry';
import type { RegisteredTool, ToolExecutor, ToolContext, ToolResult } from '../tools/executor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter captured entries to span records only. */
function collectSpans(entries: Record<string, unknown>[]): Record<string, unknown>[] {
  return entries.filter(e => e.kind === 'span');
}

/** Reset captures between tests. */
function resetEntries() {
  allEntries.length = 0;
}

// ---------------------------------------------------------------------------
// MockProvider — yields a controlled sequence of StreamEvents
// ---------------------------------------------------------------------------

class MockProvider implements Provider {
  readonly id = 'mock' as const;
  readonly name = 'MockProvider';
  readonly model = 'mock-model';
  readonly capabilities = { vision: true, functionCalling: true, streaming: true, systemPrompt: true };
  readonly piModel = {} as any;

  events: StreamEvent[] = [];
  throwOnSend: Error | null = null;

  private _abort: AbortController | null = null;

  cancelRequest(): void {
    if (this._abort) {
      this._abort.abort();
      this._abort = null;
    }
  }

  async *sendPrompt(
    _messages: Array<{ role: string; content: string }>,
    options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    if (this.throwOnSend) {
      throw this.throwOnSend;
    }

    this._abort = new AbortController();
    const signal = options.abortSignal;

    for (const event of this.events) {
      if (signal?.aborted || this._abort?.signal.aborted) return;
      yield event;
    }
  }
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

function createHarness() {
  const session = new SessionState({
    sessionId: 'test-session',
    cwd: '/test',
    model: 'mock-model',
  });
  const provider = new MockProvider();
  const controller = new PromptController({ session, provider });
  return { session, provider, controller };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PromptController tracing integration', () => {
  beforeEach(() => {
    resetEntries();
  });

  test('submitPrompt emits agent span with start and end', async () => {
    const { provider, controller } = createHarness();
    provider.events = [
      { type: 'text_delta', text: 'Hello' },
      { type: 'message_complete', stopReason: 'end_turn' },
    ];

    await controller.submitPrompt('hello');

    const spans = collectSpans(allEntries);
    const agentSpan = spans.find(s => s.name === 'agent');
    expect(agentSpan).toBeDefined();
    expect(agentSpan!.status).toBe('ok');
    expect(typeof agentSpan!.duration).toBe('number');
    expect(agentSpan!.duration as number).toBeGreaterThanOrEqual(0);
  });

  test('inference span captures TTFT and usage', async () => {
    const { provider, controller } = createHarness();
    provider.events = [
      { type: 'text_delta', text: 'Hi' },
      { type: 'usage_update', usage: { size: 100000, used: 2000, inputTokens: 100, outputTokens: 50 } },
      { type: 'message_complete', stopReason: 'end_turn' },
    ];

    await controller.submitPrompt('test');

    const spans = collectSpans(allEntries);
    const inferenceSpan = spans.find(s => s.name === 'inference');
    expect(inferenceSpan).toBeDefined();

    // Should have a first-token event from TTFT recording
    const events = inferenceSpan!.events as Array<Record<string, unknown>>;
    const ttftEvent = events.find(e => e.name === 'first-token');
    expect(ttftEvent).toBeDefined();

    // Should have usage attributes merged in
    const attributes = inferenceSpan!.attributes as Record<string, unknown>;
    expect(attributes.inputTokens).toBe(100);
  });

  test('tool execution emits tools and tool:bash spans', async () => {
    const { session, provider, controller: baseController } = createHarness();

    // Create a ToolRegistry with a mock bash executor
    const registry = new ToolRegistry();
    const bashExecutor: ToolExecutor = {
      async execute(_input: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
        return { content: 'mock bash output', isError: false };
      },
    };
    const bashTool: RegisteredTool = {
      definition: {
        name: 'bash',
        description: 'Run bash commands',
        input_schema: { type: 'object', properties: { command: { type: 'string' } } },
      },
      executor: bashExecutor,
      requiresPermission: false,
    };
    registry.register(bashTool);

    const controller = new PromptController({ session, provider, toolRegistry: registry });

    // First iteration: tool_use stop, second: end_turn
    const firstIterationEvents: StreamEvent[] = [
      { type: 'tool_call_start', toolCallId: 'tc-1', title: 'bash', kind: 'bash', name: 'bash' },
      { type: 'tool_call_ready', toolCallId: 'tc-1', name: 'bash', input: { command: 'echo hello' } },
      { type: 'message_complete', stopReason: 'tool_use' },
    ];
    const secondIterationEvents: StreamEvent[] = [
      { type: 'text_delta', text: 'Done' },
      { type: 'message_complete', stopReason: 'end_turn' },
    ];

    let callCount = 0;
    provider.sendPrompt = async function* (_messages, options) {
      callCount++;
      const events = callCount === 1 ? firstIterationEvents : secondIterationEvents;
      for (const event of events) {
        yield event;
      }
    };

    await controller.submitPrompt('run bash');

    const spans = collectSpans(allEntries);
    const spanNames = spans.map(s => s.name as string);

    expect(spanNames).toContain('agent');
    expect(spanNames).toContain('prompt-assembly');
    expect(spanNames).toContain('inference');
    expect(spanNames).toContain('tools');
    expect(spanNames).toContain('tool:bash');

    // Two inference spans (two agentic loop iterations)
    const inferenceSpans = spans.filter(s => s.name === 'inference');
    expect(inferenceSpans.length).toBeGreaterThanOrEqual(2);
  });

  test('provider error emits agent span with error status', async () => {
    const { provider, controller } = createHarness();
    provider.throwOnSend = new Error('Network failure');

    await controller.submitPrompt('hello');

    const spans = collectSpans(allEntries);
    const agentSpan = spans.find(s => s.name === 'agent');
    expect(agentSpan).toBeDefined();
    expect(agentSpan!.status).toBe('error');

    // Should also emit a kind: 'error' entry with category: 'provider'
    const errorEntries = allEntries.filter(e => e.kind === 'error');
    expect(errorEntries.length).toBeGreaterThanOrEqual(1);
    const providerError = errorEntries.find(e => e.category === 'provider');
    expect(providerError).toBeDefined();
  });
});
