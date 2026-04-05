// OpenAI-compatible provider implementation.
//
// Handles both the native OpenAI API and any OpenAI-compatible endpoint
// (Groq, OpenRouter, Together, xAI, local Ollama/vLLM, etc.) by
// accepting a configurable base URL and extra headers.
//
// Also serves as the base for the ChatGPT/Codex OAuth provider, which
// overrides the fetch function to inject OAuth tokens and rewrite URLs.

import type { Provider, PromptOptions, ProviderId, ProviderCapabilities } from './provider';
import type {
  StreamEvent, SessionError, UsageInfo, ProviderMessage,
  ToolDefinition, ContentBlock,
} from '../state/types';
import { log } from '../utils/logger';

/** Configuration for the OpenAI-compatible provider. */
export interface OpenAIProviderOptions {
  /** API key for Bearer token auth. */
  apiKey?: string;
  /** Model identifier. Defaults to gpt-4o. */
  model?: string;
  /** Base URL for the API. Defaults to https://api.openai.com/v1. */
  baseUrl?: string;
  /** Extra headers to send with every request. */
  headers?: Record<string, string>;
  /** Provider identifier override for display. */
  providerId?: ProviderId;
  /** Provider display name override. */
  providerName?: string;
  /**
   * Optional custom fetch function for OAuth-based providers.
   * When set, replaces the default fetch() for API calls, allowing
   * token injection, URL rewriting, and header manipulation.
   */
  customFetch?: typeof fetch;
}

/**
 * OpenAI-compatible provider — supports the OpenAI Chat Completions API
 * and any endpoint that follows the same format.
 *
 * Key differences from Anthropic provider:
 * - Tool calls use `tool_calls[N]` with `index` field for streaming accumulation
 * - Tool results use a separate `role: "tool"` message with `tool_call_id`
 * - `finish_reason: "tool_calls"` signals tool use (not "tool_use")
 * - Content is either a string or array of content parts
 */
export class OpenAIProvider implements Provider {
  readonly id: ProviderId;
  readonly name: string;
  readonly model: string;
  readonly capabilities: ProviderCapabilities;

  private _apiKey: string;
  private _baseUrl: string;
  private _headers: Record<string, string>;
  private _customFetch: typeof fetch;
  private _currentAbort: AbortController | null = null;

  constructor(options: OpenAIProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    if (!apiKey && !options.customFetch) {
      throw new Error(
        'OpenAI API key not found. Set OPENAI_API_KEY environment variable ' +
        'or pass apiKey in provider options.',
      );
    }
    this._apiKey = apiKey;
    this.model = options.model ?? 'gpt-4o';
    this._baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this._headers = options.headers ?? {};
    this._customFetch = options.customFetch ?? fetch;
    this.id = options.providerId ?? 'openai';
    this.name = options.providerName ?? 'OpenAI';

    // Set capabilities based on provider identity.
    // Gemini-backed providers (gemini, antigravity) have slightly different
    // capability profiles than native OpenAI.
    this.capabilities = deriveCapabilities(this.id);
  }

  cancelRequest(): void {
    if (this._currentAbort) {
      this._currentAbort.abort();
      this._currentAbort = null;
    }
  }

  async *sendPrompt(
    messages: ProviderMessage[],
    options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    this._currentAbort = new AbortController();
    const signal = options.abortSignal
      ? combineAbortSignals(this._currentAbort.signal, options.abortSignal)
      : this._currentAbort.signal;

    const model = options.model ?? this.model;
    const maxTokens = options.maxTokens ?? 8192;

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: serializeMessagesForOpenAI(messages, options.systemPrompt),
      stream: true,
      stream_options: { include_usage: true },
    };

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));
    }
    if (options.toolChoice) {
      if (typeof options.toolChoice === 'string') {
        body.tool_choice = options.toolChoice;
      } else {
        body.tool_choice = { type: 'function', function: { name: options.toolChoice.name } };
      }
    }

    const url = `${this._baseUrl}/chat/completions`;
    log.debug(`OpenAIProvider: POST ${url} model=${model} tools=${options.tools?.length ?? 0}`);

    let response: Response;
    try {
      response = await this._customFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this._apiKey ? { 'Authorization': `Bearer ${this._apiKey}` } : {}),
          ...this._headers,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if (signal.aborted) return;
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error(`OpenAIProvider: fetch failed: ${errMsg}`);
      yield { type: 'error', error: { message: `Network error: ${errMsg}`, code: 'NETWORK_ERROR', retryable: true } };
      return;
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const status = response.status;
      const retryable = status === 429 || status >= 500;
      let message = `OpenAI API error ${status}`;
      if (errorBody) {
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed.error?.message) message = parsed.error.message;
        } catch {
          message = `${message}: ${errorBody.slice(0, 200)}`;
        }
      }
      log.error(`OpenAIProvider: HTTP ${status}: ${message}`);
      yield { type: 'error', error: { message, code: `HTTP_${status}`, retryable } };
      return;
    }

    yield* this._parseSSEStream(response, signal);
  }

  private async *_parseSSEStream(
    response: Response,
    signal: AbortSignal,
  ): AsyncGenerator<StreamEvent> {
    if (!response.body) {
      yield { type: 'error', error: { message: 'Response body is null', code: 'NO_BODY', retryable: false } };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Accumulate tool calls by index
    const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();

    try {
      while (true) {
        if (signal.aborted) return;

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const chunk = JSON.parse(data);
            const events = this._processChunk(chunk, toolCalls);
            for (const event of events) {
              yield event;
            }
          } catch {
            log.debug(`OpenAIProvider: failed to parse chunk: ${data.slice(0, 100)}`);
          }
        }
      }
    } catch (err) {
      if (signal.aborted) return;
      const errMsg = err instanceof Error ? err.message : String(err);
      yield { type: 'error', error: { message: `Stream error: ${errMsg}`, code: 'STREAM_ERROR', retryable: true } };
    } finally {
      reader.releaseLock();
      this._currentAbort = null;
    }
  }

  /**
   * Process a single SSE chunk from the OpenAI Chat Completions API.
   *
   * OpenAI streaming format:
   * - choices[0].delta.content: text chunks
   * - choices[0].delta.tool_calls[N]: tool call chunks (accumulated by index)
   * - choices[0].finish_reason: "stop" | "tool_calls" | "length"
   * - usage: token counts (only in the final chunk with stream_options.include_usage)
   */
  private _processChunk(
    chunk: Record<string, unknown>,
    toolCalls: Map<number, { id: string; name: string; arguments: string }>,
  ): StreamEvent[] {
    const events: StreamEvent[] = [];

    // Usage info (final chunk)
    const usage = chunk.usage as Record<string, number> | undefined;
    if (usage) {
      events.push({
        type: 'usage_update',
        usage: {
          size: 0,
          used: (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
        },
      });
    }

    const choices = chunk.choices as Array<Record<string, unknown>> | undefined;
    if (!choices || choices.length === 0) return events;

    const choice = choices[0];
    const delta = choice.delta as Record<string, unknown> | undefined;
    const finishReason = choice.finish_reason as string | null;

    if (delta) {
      // Text content
      if (typeof delta.content === 'string' && delta.content) {
        events.push({ type: 'text_delta', text: delta.content });
      }

      // Tool call chunks
      const tcDeltas = delta.tool_calls as Array<Record<string, unknown>> | undefined;
      if (tcDeltas) {
        for (const tcDelta of tcDeltas) {
          const index = tcDelta.index as number;
          const fn = tcDelta.function as Record<string, string> | undefined;

          if (!toolCalls.has(index)) {
            // New tool call
            const id = (tcDelta.id as string) ?? '';
            const name = fn?.name ?? '';
            toolCalls.set(index, { id, name, arguments: '' });
            events.push({
              type: 'tool_call_start',
              toolCallId: id,
              name,
              title: name,
              kind: 'tool',
            });
          }

          // Accumulate arguments JSON
          const tc = toolCalls.get(index)!;
          if (fn?.name && !tc.name) tc.name = fn.name;
          if (tcDelta.id && !tc.id) tc.id = tcDelta.id as string;
          if (fn?.arguments) {
            tc.arguments += fn.arguments;
            events.push({
              type: 'tool_call_input_delta',
              toolCallId: tc.id,
              partialJson: fn.arguments,
            });
          }
        }
      }
    }

    // Finish reason
    if (finishReason) {
      // Emit tool_call_ready for all accumulated tool calls
      if (finishReason === 'tool_calls') {
        for (const [, tc] of toolCalls) {
          let input: Record<string, unknown> = {};
          try {
            input = tc.arguments ? JSON.parse(tc.arguments) : {};
          } catch {
            log.warn(`OpenAIProvider: failed to parse tool arguments for ${tc.name}`);
          }
          events.push({
            type: 'tool_call_ready',
            toolCallId: tc.id,
            name: tc.name,
            input,
          });
        }
        toolCalls.clear();
        events.push({ type: 'message_complete', stopReason: 'tool_use' });
      } else {
        const stopReason = finishReason === 'stop' ? 'end_turn'
          : finishReason === 'length' ? 'max_tokens'
          : finishReason;
        events.push({ type: 'message_complete', stopReason });
      }
    }

    return events;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive provider capabilities based on the provider identity.
 *
 * OpenAI and OpenAI-compatible providers support all features.
 * Gemini-backed providers (gemini, antigravity) have vision and streaming
 * but more limited system prompt handling (sent via developer role, not
 * a dedicated field). We still report systemPrompt: true since the OpenAI
 * compatibility layer handles the translation.
 */
function deriveCapabilities(providerId: ProviderId): ProviderCapabilities {
  switch (providerId) {
    case 'gemini':
    case 'antigravity':
      return {
        vision: true,
        functionCalling: true,
        streaming: true,
        systemPrompt: true,
      };
    case 'copilot':
      return {
        vision: false,        // Copilot proxy may not support vision
        functionCalling: true,
        streaming: true,
        systemPrompt: true,
      };
    case 'openai':
    case 'chatgpt-codex':
    case 'openai-compatible':
    default:
      return {
        vision: true,
        functionCalling: true,
        streaming: true,
        systemPrompt: true,
      };
  }
}

/**
 * Serialize ProviderMessage[] into the OpenAI Chat Completions API format.
 *
 * OpenAI expects:
 * - role: 'system' | 'user' | 'assistant' | 'tool'
 * - content: string | null
 * - tool_calls: [{id, function: {name, arguments}}] (assistant messages)
 * - tool_call_id: string (tool result messages)
 */
function serializeMessagesForOpenAI(
  messages: ProviderMessage[],
  systemPrompt?: string,
): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];

  // System prompt first
  if (systemPrompt) {
    result.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of messages) {
    if (msg.role === 'system') {
      result.push({ role: 'system', content: typeof msg.content === 'string' ? msg.content : '' });
      continue;
    }

    if (typeof msg.content === 'string') {
      result.push({ role: msg.role, content: msg.content });
      continue;
    }

    // Structured content blocks
    const textParts: string[] = [];
    const toolUseParts: Array<{ id: string; type: string; function: { name: string; arguments: string } }> = [];
    const toolResultParts: Array<{ role: string; tool_call_id: string; content: string }> = [];

    for (const block of msg.content) {
      switch (block.type) {
        case 'text':
          textParts.push(block.text);
          break;
        case 'tool_use':
          toolUseParts.push({
            id: block.id,
            type: 'function',
            function: { name: block.name, arguments: JSON.stringify(block.input) },
          });
          break;
        case 'tool_result':
          toolResultParts.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: block.content,
          });
          break;
      }
    }

    if (msg.role === 'assistant') {
      const assistantMsg: Record<string, unknown> = { role: 'assistant' };
      if (textParts.length > 0) assistantMsg.content = textParts.join('');
      else assistantMsg.content = null;
      if (toolUseParts.length > 0) assistantMsg.tool_calls = toolUseParts;
      result.push(assistantMsg);
    } else if (msg.role === 'tool' || toolResultParts.length > 0) {
      // Each tool result is a separate message in OpenAI format
      for (const tr of toolResultParts) {
        result.push(tr);
      }
    } else {
      result.push({ role: msg.role, content: textParts.join('') });
    }
  }

  return result;
}

function combineAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (a.aborted || b.aborted) { controller.abort(); return controller.signal; }
  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });
  return controller.signal;
}
