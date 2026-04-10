// PiAiProvider — thin adapter that bridges @mariozechner/pi-ai to flitter-cli's
// Provider/StreamEvent interface.
//
// Per D-00, D-18, D-19: this is intentionally a minimal wrapping layer.
// All provider protocol differences, streaming, and model metadata are
// handled by pi-ai internally. This adapter only maps pi-ai AssistantMessageEvent
// variants to flitter-cli StreamEvent variants.
//
// Usage mapping reference (pi-ai → flitter-cli):
//   Usage.input  → inputTokens
//   Usage.output → outputTokens
//   ToolCall.arguments → input (Record<string, unknown>)

import { stream as piAiStream } from '@mariozechner/pi-ai';
import type {
  Model,
  Api,
  AssistantMessageEvent,
  Context,
  Tool,
  Message,
  UserMessage as PiUserMessage,
  AssistantMessage as PiAssistantMessage,
  ToolResultMessage,
} from '@mariozechner/pi-ai';
import type { Provider, PromptOptions, ProviderId, ProviderCapabilities } from './provider';
import type {
  StreamEvent,
  ProviderMessage,
  UsageInfo,
  ToolDefinition,
} from '../state/types';
import { log } from '../utils/logger';

/**
 * Maps a pi-ai stop reason to the flitter-cli stop reason string.
 */
function mapStopReason(reason: string): string {
  switch (reason) {
    case 'stop':
    case 'end_turn':
      return 'end_turn';
    case 'toolUse':
    case 'tool_use':
      return 'tool_use';
    case 'length':
    case 'max_tokens':
      return 'max_tokens';
    default:
      return reason;
  }
}

/**
 * Maps a flitter-cli ToolDefinition to a pi-ai Tool.
 * The input_schema is compatible with pi-ai's TSchema (typebox-compatible JSON Schema).
 */
function mapToolDef(tool: ToolDefinition): Tool {
  return {
    name: tool.name,
    description: tool.description,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parameters: tool.input_schema as any,
  };
}

/**
 * Converts flitter-cli ProviderMessage[] + optional systemPrompt into a pi-ai Context.
 *
 * Role mapping:
 *   'user'      → pi-ai UserMessage
 *   'assistant' → pi-ai AssistantMessage (simplified text-only content)
 *   'tool'      → treated as user message with tool_result content (bundled)
 *   'system'    → extracted as Context.systemPrompt
 */
function buildPiAiContext(
  messages: ProviderMessage[],
  tools: ToolDefinition[] | undefined,
  systemPrompt: string | undefined,
): Context {
  const piMessages: Message[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // System messages are hoisted to systemPrompt; skip if already set
      continue;
    }

    if (msg.role === 'user') {
      const text = typeof msg.content === 'string'
        ? msg.content
        : msg.content
            .filter(b => b.type === 'text')
            .map(b => (b as { type: 'text'; text: string }).text)
            .join('\n');

      const userMsg: PiUserMessage = {
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      piMessages.push(userMsg);
    } else if (msg.role === 'assistant') {
      // Convert assistant message content blocks to pi-ai AssistantMessage format
      if (typeof msg.content === 'string') {
        const assistantMsg: PiAssistantMessage = {
          role: 'assistant',
          content: [{ type: 'text', text: msg.content }],
          api: 'openai-completions',
          provider: 'openai',
          model: '',
          usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          stopReason: 'stop',
          timestamp: Date.now(),
        };
        piMessages.push(assistantMsg);
      } else {
        // Structured content blocks: extract text and tool_use blocks
        const textBlocks = msg.content
          .filter(b => b.type === 'text')
          .map(b => ({ type: 'text' as const, text: (b as { type: 'text'; text: string }).text }));
        const toolCallBlocks = msg.content
          .filter(b => b.type === 'tool_use')
          .map(b => {
            const tb = b as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
            return {
              type: 'toolCall' as const,
              id: tb.id,
              name: tb.name,
              arguments: tb.input,
            };
          });

        const assistantMsg: PiAssistantMessage = {
          role: 'assistant',
          content: [...textBlocks, ...toolCallBlocks],
          api: 'openai-completions',
          provider: 'openai',
          model: '',
          usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          stopReason: 'stop',
          timestamp: Date.now(),
        };
        piMessages.push(assistantMsg);
      }
    } else if (msg.role === 'tool') {
      // tool results are ContentBlock[] with type 'tool_result'
      const content = Array.isArray(msg.content) ? msg.content : [];
      for (const block of content) {
        if (block.type === 'tool_result') {
          const tr = block as { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };
          const toolResultMsg: ToolResultMessage = {
            role: 'toolResult',
            toolCallId: tr.tool_use_id,
            toolName: '',
            content: [{ type: 'text', text: tr.content }],
            isError: tr.is_error ?? false,
            timestamp: Date.now(),
          };
          piMessages.push(toolResultMsg);
        }
      }
    }
  }

  const context: Context = {
    messages: piMessages,
    systemPrompt,
    tools: tools?.map(mapToolDef),
  };

  return context;
}

/**
 * PiAiProvider — implements the flitter-cli Provider interface using pi-ai
 * as the unified streaming backend.
 *
 * This is a thin adapter per D-00: all protocol differences are handled by
 * pi-ai. The adapter only maps AssistantMessageEvent → StreamEvent.
 */
export class PiAiProvider implements Provider {
  /** pi-ai Model object, exposed per D-18 for callers needing metadata. */
  readonly piModel: Model<Api>;

  /** Provider identifier (flitter-cli ProviderId). */
  readonly id: ProviderId;

  /** Provider display name for status UI. */
  readonly name: string;

  /** Currently configured model identifier (from piModel.id). */
  readonly model: string;

  /** Provider capabilities, derived from piModel metadata. */
  readonly capabilities: ProviderCapabilities;

  private readonly _apiKey: string;
  private readonly _headers?: Record<string, string>;
  private _abort: AbortController | null = null;

  /**
   * @param piModel - The pi-ai Model object resolved via getModel().
   * @param providerId - The flitter-cli ProviderId for this provider.
   * @param providerName - Human-readable display name (e.g., 'Anthropic').
   * @param apiKey - API key for authentication (or OAuth access token).
   * @param headers - Optional custom HTTP headers (e.g., User-Agent for antigravity).
   */
  constructor(
    piModel: Model<Api>,
    providerId: ProviderId,
    providerName: string,
    apiKey: string,
    headers?: Record<string, string>,
  ) {
    this.piModel = piModel;
    this.id = providerId;
    this.name = providerName;
    this.model = piModel.id;
    this._apiKey = apiKey;
    this._headers = headers;

    // Derive capabilities from piModel metadata
    this.capabilities = {
      vision: Array.isArray(piModel.input) && piModel.input.includes('image'),
      functionCalling: true,
      streaming: true,
      systemPrompt: true,
    };
  }

  /** Cancel the current in-flight request by aborting the controller. */
  cancelRequest(): void {
    if (this._abort) {
      this._abort.abort();
      this._abort = null;
    }
  }

  /**
   * Send a prompt to the model and stream back events.
   *
   * Maps pi-ai AssistantMessageEvent variants to flitter-cli StreamEvent:
   *   text_delta     → text_delta
   *   thinking_delta → thinking_delta
   *   toolcall_start → tool_call_start
   *   toolcall_delta → tool_call_input_delta
   *   toolcall_end   → tool_call_ready
   *   done           → usage_update + message_complete
   *   error          → error
   *   start/text_start/text_end/thinking_start/thinking_end → skipped
   */
  async *sendPrompt(
    messages: ProviderMessage[],
    options: PromptOptions,
  ): AsyncIterable<StreamEvent> {
    // Create abort controller, combining with caller's signal if provided
    const abort = new AbortController();
    this._abort = abort;

    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', () => abort.abort(), { once: true });
    }

    const context = buildPiAiContext(messages, options.tools, options.systemPrompt);

    log.info(`PiAiProvider.sendPrompt: model=${this.model} provider=${this.id}`);

    const streamOptions: Record<string, unknown> = {
      apiKey: this._apiKey,
      signal: abort.signal,
      maxTokens: options.maxTokens,
    };

    // Pass custom headers (e.g., antigravity User-Agent spoofing)
    if (this._headers) {
      streamOptions['headers'] = this._headers;
    }

    const eventStream = piAiStream(this.piModel, context, streamOptions as Parameters<typeof piAiStream>[2]);

    // Track active toolcall IDs for delta events
    let activeToolCallId: string | null = null;

    for await (const event of eventStream) {
      yield* this._mapEvent(event, { activeToolCallId: (id) => { activeToolCallId = id; }, getActiveToolCallId: () => activeToolCallId });
    }

    this._abort = null;
  }

  /**
   * Maps a single pi-ai AssistantMessageEvent to zero or more StreamEvent variants.
   * Kept as a private generator so sendPrompt stays readable.
   */
  private *_mapEvent(
    event: AssistantMessageEvent,
    toolCallState: {
      activeToolCallId: (id: string) => void;
      getActiveToolCallId: () => string | null;
    },
  ): Iterable<StreamEvent> {
    switch (event.type) {
      case 'start':
      case 'text_start':
      case 'text_end':
      case 'thinking_start':
      case 'thinking_end':
        // No flitter-cli equivalent — skip silently
        break;

      case 'text_delta':
        yield { type: 'text_delta', text: event.delta };
        break;

      case 'thinking_delta':
        yield { type: 'thinking_delta', text: event.delta };
        break;

      case 'toolcall_start': {
        // Extract tool call ID from the partial message's last content item
        const partial = event.partial;
        const lastContent = partial.content[partial.content.length - 1];
        const toolCallId = lastContent && lastContent.type === 'toolCall'
          ? (lastContent as { type: 'toolCall'; id: string; name: string }).id
          : `tc-${event.contentIndex}`;
        const toolName = lastContent && lastContent.type === 'toolCall'
          ? (lastContent as { type: 'toolCall'; id: string; name: string }).name
          : '';

        toolCallState.activeToolCallId(toolCallId);

        yield {
          type: 'tool_call_start',
          toolCallId,
          name: toolName,
          title: toolName,
          kind: 'tool',
        };
        break;
      }

      case 'toolcall_delta': {
        const activeId = toolCallState.getActiveToolCallId() ?? `tc-${event.contentIndex}`;
        yield {
          type: 'tool_call_input_delta',
          toolCallId: activeId,
          partialJson: event.delta,
        };
        break;
      }

      case 'toolcall_end': {
        const toolCall = event.toolCall;
        yield {
          type: 'tool_call_ready',
          toolCallId: toolCall.id,
          name: toolCall.name,
          input: toolCall.arguments as Record<string, unknown>,
        };
        break;
      }

      case 'done': {
        const msg = event.message;
        const usage = msg.usage;

        // Emit usage_update with token and cost info
        const usageInfo: UsageInfo = {
          size: this.piModel.contextWindow,
          used: (usage?.input ?? 0) + (usage?.output ?? 0),
          inputTokens: usage?.input,
          outputTokens: usage?.output,
          cacheReadTokens: usage?.cacheRead,
          cacheWriteTokens: usage?.cacheWrite,
          cost: usage?.cost?.total != null
            ? { amount: usage.cost.total, currency: '$' }
            : null,
        };

        yield { type: 'usage_update', usage: usageInfo };
        yield { type: 'message_complete', stopReason: mapStopReason(event.reason) };
        break;
      }

      case 'error': {
        const errMsg = event.error.errorMessage ?? 'Unknown pi-ai error';
        yield {
          type: 'error',
          error: {
            message: errMsg,
            code: 'PI_AI_ERROR',
            retryable: true,
          },
        };
        break;
      }
    }
  }
}
