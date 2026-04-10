// Fixture builders for Agent Test.
//
// Instead of storing large JSON dumps, builders programmatically generate
// test fixtures (sessions, stream event sequences) from compact seed configs.
// This keeps the fixtures/ directory lightweight and the data reproducible.

/**
 * Seed configuration for building a session fixture.
 * Compact representation — the builder expands this into full session items.
 */
export interface SessionSeed {
  /** Number of conversation turns to generate. */
  turns: number;
  /** Whether to include tool calls in some turns. */
  includeToolCalls?: boolean;
  /** Fraction of turns that should have tool calls (0-1). Default 0.3. */
  toolCallRatio?: number;
  /** Simulated context usage fraction (0-1). Used for compaction tests. */
  contextUsage?: number;
  /** Custom items to inject at specific positions. */
  inject?: Array<{ index: number; item: SessionItem }>;
}

/**
 * A minimal session item representation for fixture building.
 * Matches the shape expected by SessionState.
 */
export interface SessionItem {
  role: 'user' | 'assistant' | 'tool_call' | 'tool_result';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

/**
 * Build an array of session items from a seed config.
 *
 * Each "turn" produces a user message + assistant response.
 * If includeToolCalls is true, some turns also include tool_call + tool_result pairs.
 */
export function buildSessionItems(seed: SessionSeed): SessionItem[] {
  const items: SessionItem[] = [];
  const toolCallRatio = seed.toolCallRatio ?? 0.3;

  for (let i = 0; i < seed.turns; i++) {
    // User message
    items.push({
      role: 'user',
      content: `Test message ${i + 1}: ${generateUserMessage(i)}`,
    });

    // Optionally add a tool call + result
    if (seed.includeToolCalls && (i / seed.turns) < toolCallRatio) {
      const tcId = `tc-${i}-${Date.now()}`;
      items.push({
        role: 'tool_call',
        content: JSON.stringify({ name: 'bash', input: { command: `echo "step ${i}"` } }),
        toolCallId: tcId,
        toolName: 'bash',
      });
      items.push({
        role: 'tool_result',
        content: `step ${i}`,
        toolCallId: tcId,
      });
    }

    // Assistant response
    items.push({
      role: 'assistant',
      content: `Response to message ${i + 1}: ${generateAssistantMessage(i)}`,
    });
  }

  // Inject custom items at specified positions
  if (seed.inject) {
    for (const { index, item } of seed.inject.sort((a, b) => b.index - a.index)) {
      items.splice(index, 0, item);
    }
  }

  return items;
}

/**
 * Seed configuration for building a stream event sequence.
 */
export interface StreamSeed {
  /** Type of response to simulate. */
  type: 'simple-text' | 'tool-call' | 'multi-turn' | 'error' | 'thinking-then-text';
  /** Text content for text responses. */
  text?: string;
  /** Tool name for tool-call responses. */
  toolName?: string;
  /** Tool input for tool-call responses. */
  toolInput?: Record<string, unknown>;
  /** Error message for error responses. */
  errorMessage?: string;
  /** Whether the error is retryable. */
  retryable?: boolean;
  /** Context usage for usage_update events. */
  contextUsage?: { size: number; used: number };
}

/**
 * Stream event representation matching flitter's StreamEvent type.
 * We use a plain object so fixtures don't depend on flitter source imports.
 */
export interface StreamEventFixture {
  type: string;
  [key: string]: unknown;
}

/**
 * Build a stream event sequence from a seed config.
 */
export function buildStreamEvents(seed: StreamSeed): StreamEventFixture[] {
  switch (seed.type) {
    case 'simple-text':
      return buildSimpleTextStream(seed.text ?? 'Hello, this is a test response.');
    case 'tool-call':
      return buildToolCallStream(seed.toolName ?? 'bash', seed.toolInput ?? {});
    case 'multi-turn':
      return buildMultiTurnStream();
    case 'error':
      return buildErrorStream(seed.errorMessage ?? 'Test error', seed.retryable ?? false);
    case 'thinking-then-text':
      return buildThinkingThenTextStream(seed.text ?? 'After thinking, here is my answer.');
    default:
      throw new Error(`Unknown stream seed type: ${seed.type}`);
  }
}

// --- Internal helpers ---

function generateUserMessage(index: number): string {
  const topics = [
    'Explain the architecture',
    'Fix the bug in the login flow',
    'Add error handling',
    'Refactor the service layer',
    'Write unit tests',
    'Optimize the database queries',
    'Review the pull request',
    'Update the documentation',
    'Deploy to staging',
    'Investigate the memory leak',
  ];
  return topics[index % topics.length];
}

function generateAssistantMessage(index: number): string {
  const responses = [
    'I\'ll analyze the codebase structure and explain each component.',
    'I found the issue — it\'s a race condition in the auth middleware.',
    'I\'ve added try-catch blocks with proper error logging.',
    'The service layer has been refactored to use dependency injection.',
    'Here are 12 unit tests covering the main scenarios.',
    'I\'ve added indexes on the frequently queried columns.',
    'The PR looks good overall, with a few minor suggestions.',
    'Documentation has been updated with the new API endpoints.',
    'Deployed successfully. Running smoke tests now.',
    'The leak is in the event listener — it\'s not being removed on unmount.',
  ];
  return responses[index % responses.length];
}

function buildSimpleTextStream(text: string): StreamEventFixture[] {
  // Split text into chunks to simulate streaming
  const chunkSize = 20;
  const events: StreamEventFixture[] = [];

  for (let i = 0; i < text.length; i += chunkSize) {
    events.push({ type: 'text_delta', text: text.slice(i, i + chunkSize) });
  }

  events.push({ type: 'usage_update', usage: { size: 200000, used: 5000 } });
  events.push({ type: 'message_complete', stopReason: 'end_turn' });

  return events;
}

function buildToolCallStream(toolName: string, input: Record<string, unknown>): StreamEventFixture[] {
  const tcId = `tc-fixture-${Date.now()}`;
  return [
    { type: 'text_delta', text: 'Let me run that for you.' },
    { type: 'tool_call_start', toolCallId: tcId, name: toolName, title: toolName, kind: toolName },
    { type: 'tool_call_ready', toolCallId: tcId, name: toolName, input },
    { type: 'tool_call_end', toolCallId: tcId, status: 'completed', rawOutput: 'Done.' },
    { type: 'text_delta', text: 'The command completed successfully.' },
    { type: 'usage_update', usage: { size: 200000, used: 8000 } },
    { type: 'message_complete', stopReason: 'end_turn' },
  ];
}

function buildMultiTurnStream(): StreamEventFixture[] {
  // Simulates an agentic loop: text -> tool -> text -> tool -> text -> done
  return [
    { type: 'text_delta', text: 'I\'ll investigate step by step.' },
    { type: 'tool_call_start', toolCallId: 'tc-1', name: 'bash', title: 'bash', kind: 'bash' },
    { type: 'tool_call_ready', toolCallId: 'tc-1', name: 'bash', input: { command: 'ls -la' } },
    { type: 'tool_call_end', toolCallId: 'tc-1', status: 'completed', rawOutput: 'file1.ts\nfile2.ts' },
    { type: 'text_delta', text: 'Found the files. Now reading...' },
    { type: 'tool_call_start', toolCallId: 'tc-2', name: 'read', title: 'read', kind: 'read' },
    { type: 'tool_call_ready', toolCallId: 'tc-2', name: 'read', input: { file: 'file1.ts' } },
    { type: 'tool_call_end', toolCallId: 'tc-2', status: 'completed', rawOutput: 'export function main() {}' },
    { type: 'text_delta', text: 'Analysis complete. The main function is properly exported.' },
    { type: 'usage_update', usage: { size: 200000, used: 15000 } },
    { type: 'message_complete', stopReason: 'end_turn' },
  ];
}

function buildErrorStream(message: string, retryable: boolean): StreamEventFixture[] {
  return [
    { type: 'text_delta', text: 'Starting to process...' },
    { type: 'error', error: { message, code: 'TEST_ERROR', retryable } },
  ];
}

function buildThinkingThenTextStream(text: string): StreamEventFixture[] {
  return [
    { type: 'thinking_delta', text: 'Let me think about this carefully...' },
    { type: 'thinking_delta', text: 'Considering the architecture implications...' },
    { type: 'text_delta', text },
    { type: 'usage_update', usage: { size: 200000, used: 10000 } },
    { type: 'message_complete', stopReason: 'end_turn' },
  ];
}
