// Anthropic/Claude API implementation of the Provider interface.
//
// Uses native fetch() (provided by Bun) to stream SSE responses from the
// Anthropic Messages API. No external HTTP dependencies.

import type { Provider, PromptOptions } from './provider';
import type { StreamEvent, SessionError, UsageInfo } from '../state/types';
import { log } from '../utils/logger';

/** Configuration for the Anthropic provider. */
export interface AnthropicProviderOptions {
  /** API key for authentication. Falls back to ANTHROPIC_API_KEY env var. */
  apiKey?: string;
  /** Model identifier. Defaults to claude-sonnet-4-20250514. */
  model?: string;
  /** Base URL for the API. Defaults to https://api.anthropic.com. */
  baseUrl?: string;
}

/**
 * Anthropic provider — streams SSE responses from the Claude Messages API.
 *
 * Implements the Provider interface with:
 * - Native fetch() for HTTP (no external deps)
 * - SSE parsing for streaming responses
 * - Cooperative cancellation via AbortController
 * - Proper HTTP error handling with retryable flag for 429/5xx
 */
export class AnthropicProvider implements Provider {
  readonly name = 'Anthropic';
  readonly model: string;

  private _apiKey: string;
  private _baseUrl: string;
  private _currentAbort: AbortController | null = null;

  constructor(options: AnthropicProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable ' +
        'or pass apiKey in provider options.',
      );
    }
    this._apiKey = apiKey;
    this.model = options.model ?? 'claude-sonnet-4-20250514';
    this._baseUrl = (options.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
  }

  /** Cancel the current in-flight request by aborting the fetch. */
  cancelRequest(): void {
    if (this._currentAbort) {
      this._currentAbort.abort();
      this._currentAbort = null;
    }
  }

  /**
   * Send a prompt to the Anthropic Messages API and yield StreamEvent variants.
   *
   * Makes an HTTP POST with streaming enabled, parses the SSE stream, and
   * maps Anthropic event types to our StreamEvent discriminated union.
   */
  async *sendPrompt(
    messages: Array<{ role: string; content: string }>,
    options: PromptOptions,
  ): AsyncGenerator<StreamEvent> {
    // Set up cancellation
    this._currentAbort = new AbortController();
    const signal = options.abortSignal
      ? combineAbortSignals(this._currentAbort.signal, options.abortSignal)
      : this._currentAbort.signal;

    const model = options.model ?? this.model;
    const maxTokens = options.maxTokens ?? 8192;

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages,
      stream: true,
    };
    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    }

    const url = `${this._baseUrl}/v1/messages`;
    log.debug(`AnthropicProvider: POST ${url} model=${model} maxTokens=${maxTokens}`);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this._apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if (signal.aborted) {
        // Cancelled — not an error
        return;
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error(`AnthropicProvider: fetch failed: ${errMsg}`);
      yield {
        type: 'error',
        error: { message: `Network error: ${errMsg}`, code: 'NETWORK_ERROR', retryable: true },
      };
      return;
    }

    // Handle HTTP error responses
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const status = response.status;
      const retryable = status === 429 || status >= 500;
      const code = `HTTP_${status}`;
      let message = `Anthropic API error ${status}`;

      if (status === 401) {
        message = 'Invalid API key — check ANTHROPIC_API_KEY';
      } else if (status === 429) {
        message = 'Rate limited — try again shortly';
      } else if (status >= 500) {
        message = `Anthropic server error ${status}`;
      } else if (errorBody) {
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed.error?.message) {
            message = parsed.error.message;
          }
        } catch {
          message = `${message}: ${errorBody.slice(0, 200)}`;
        }
      }

      log.error(`AnthropicProvider: HTTP ${status}: ${message}`);
      yield { type: 'error', error: { message, code, retryable } };
      return;
    }

    // Parse SSE stream
    yield* this._parseSSEStream(response, signal);
  }

  /**
   * Parse the SSE stream from an Anthropic Messages API response.
   * Maps Anthropic event types to StreamEvent variants.
   */
  private async *_parseSSEStream(
    response: Response,
    signal: AbortSignal,
  ): AsyncGenerator<StreamEvent> {
    if (!response.body) {
      yield {
        type: 'error',
        error: { message: 'Response body is null', code: 'NO_BODY', retryable: false },
      };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Track active tool call input JSON buffers for assembly
    const toolInputBuffers = new Map<number, { id: string; name: string; json: string }>();

    try {
      while (true) {
        if (signal.aborted) return;

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          } else if (line === '' && eventType && eventData) {
            // End of event — process it
            const events = this._processSSEEvent(eventType, eventData, toolInputBuffers);
            for (const event of events) {
              yield event;
            }
            eventType = '';
            eventData = '';
          }
        }
      }
    } catch (err) {
      if (signal.aborted) return;
      const errMsg = err instanceof Error ? err.message : String(err);
      log.error(`AnthropicProvider: SSE parse error: ${errMsg}`);
      yield {
        type: 'error',
        error: { message: `Stream error: ${errMsg}`, code: 'STREAM_ERROR', retryable: true },
      };
    } finally {
      reader.releaseLock();
      this._currentAbort = null;
    }
  }

  /**
   * Process a single SSE event from the Anthropic API.
   * Returns zero or more StreamEvent variants.
   */
  private _processSSEEvent(
    eventType: string,
    data: string,
    toolInputBuffers: Map<number, { id: string; name: string; json: string }>,
  ): StreamEvent[] {
    try {
      const parsed = JSON.parse(data);
      const events: StreamEvent[] = [];

      switch (eventType) {
        case 'message_start': {
          // Extract usage from the initial message
          const usage = parsed.message?.usage;
          if (usage) {
            const usageInfo: UsageInfo = {
              size: 0, // Context window size not in message_start
              used: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
            };
            events.push({ type: 'usage_update', usage: usageInfo });
            log.debug(`AnthropicProvider: message_start input=${usage.input_tokens} output=${usage.output_tokens}`);
          }
          break;
        }

        case 'content_block_start': {
          const block = parsed.content_block;
          if (block?.type === 'tool_use') {
            // Track this tool call's input buffer
            toolInputBuffers.set(parsed.index, {
              id: block.id,
              name: block.name,
              json: '',
            });
            events.push({
              type: 'tool_call_start',
              toolCallId: block.id,
              title: block.name,
              kind: 'tool',
            });
          } else if (block?.type === 'thinking') {
            // Thinking block started — first chunk will come via content_block_delta
          }
          break;
        }

        case 'content_block_delta': {
          const delta = parsed.delta;
          if (delta?.type === 'text_delta' && delta.text) {
            events.push({ type: 'text_delta', text: delta.text });
          } else if (delta?.type === 'thinking_delta' && delta.thinking) {
            events.push({ type: 'thinking_delta', text: delta.thinking });
          } else if (delta?.type === 'input_json_delta' && delta.partial_json !== undefined) {
            // Accumulate tool input JSON
            const buf = toolInputBuffers.get(parsed.index);
            if (buf) {
              buf.json += delta.partial_json;
            }
          }
          break;
        }

        case 'content_block_stop': {
          // If this was a tool_use block, the tool call input is now complete
          const buf = toolInputBuffers.get(parsed.index);
          if (buf) {
            toolInputBuffers.delete(parsed.index);
            // Tool call end will be signaled separately when the tool result arrives
            // For now, the tool_call_start has already been emitted
          }
          break;
        }

        case 'message_delta': {
          // Extract final usage and stop reason
          const usage = parsed.usage;
          if (usage) {
            const usageInfo: UsageInfo = {
              size: 0,
              used: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
            };
            events.push({ type: 'usage_update', usage: usageInfo });
          }
          if (parsed.delta?.stop_reason) {
            events.push({ type: 'message_complete', stopReason: parsed.delta.stop_reason });
          }
          break;
        }

        case 'message_stop': {
          // Final event — stream is done
          // message_complete already emitted from message_delta stop_reason
          break;
        }

        case 'error': {
          const err = parsed.error ?? {};
          const sessionErr: SessionError = {
            message: err.message ?? 'Unknown API error',
            code: err.type ?? 'API_ERROR',
            retryable: false,
          };
          events.push({ type: 'error', error: sessionErr });
          break;
        }

        case 'ping': {
          // Keep-alive — ignore
          break;
        }

        default: {
          log.debug(`AnthropicProvider: unhandled SSE event type: ${eventType}`);
          break;
        }
      }

      return events;
    } catch (err) {
      log.warn(`AnthropicProvider: failed to parse SSE data: ${data.slice(0, 100)}`);
      return [];
    }
  }
}

/**
 * Combine two AbortSignals into one that aborts when either fires.
 * Returns a signal that tracks both sources.
 */
function combineAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const onAbort = () => controller.abort();

  if (a.aborted || b.aborted) {
    controller.abort();
    return controller.signal;
  }

  a.addEventListener('abort', onAbort, { once: true });
  b.addEventListener('abort', onAbort, { once: true });

  return controller.signal;
}
