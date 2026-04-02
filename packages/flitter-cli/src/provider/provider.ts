// Abstract backend provider contract for flitter-cli.
//
// Backends implement this interface to supply LLM prompt/response streaming.
// Consumers depend only on this contract — switching backends requires only
// a new implementation, no consumer changes.

import type { StreamEvent } from '../state/types';

/**
 * Options for a sendPrompt call.
 * Configures the model, token budget, system prompt, and cancellation.
 */
export interface PromptOptions {
  /** Override the provider's default model for this request. */
  model?: string;
  /** Maximum tokens the model may generate. */
  maxTokens?: number;
  /** System prompt prepended to the conversation. */
  systemPrompt?: string;
  /** AbortSignal for cooperative cancellation. */
  abortSignal?: AbortSignal;
}

/**
 * Abstract provider interface — backends implement this contract.
 *
 * The provider is responsible for:
 * - Sending prompts to the LLM backend
 * - Streaming back events (text deltas, tool calls, usage, errors)
 * - Supporting cooperative cancellation via AbortController
 *
 * Switching backends (Anthropic, OpenAI, local model) requires only
 * implementing this interface — no consumer changes needed.
 */
export interface Provider {
  /**
   * Send a prompt and receive a stream of events.
   * The caller owns the AbortController for cancellation.
   * The async iterable yields StreamEvent variants until the stream ends.
   */
  sendPrompt(
    messages: Array<{ role: string; content: string }>,
    options: PromptOptions,
  ): AsyncIterable<StreamEvent>;

  /** Cancel the current in-flight request. */
  cancelRequest(): void;

  /** Provider display name for status UI. */
  readonly name: string;

  /** Currently configured model identifier. */
  readonly model: string;
}
