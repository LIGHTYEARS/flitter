// Abstract backend provider contract for flitter-cli.
//
// Backends implement this interface to supply LLM prompt/response streaming.
// Consumers depend only on this contract — switching backends requires only
// a new implementation, no consumer changes.
//
// All providers normalize their backend-specific events into the unified
// StreamEvent vocabulary defined in state/types.ts.

import type { StreamEvent, ProviderMessage, ToolDefinition } from '../state/types';
import type { KnownProvider, Model, Api } from '@mariozechner/pi-ai';

/**
 * Capabilities that a provider may or may not support.
 *
 * Used for capability negotiation — callers can inspect these flags
 * to adapt their behavior (e.g., skip image attachments when vision
 * is not supported, or fall back to non-streaming when streaming is off).
 */
export interface ProviderCapabilities {
  /** Whether the provider supports vision / image inputs. */
  vision: boolean;
  /** Whether the provider supports function calling / tool use. */
  functionCalling: boolean;
  /** Whether the provider supports streaming responses. */
  streaming: boolean;
  /** Whether the provider supports a system prompt (separate from user messages). */
  systemPrompt: boolean;
}

/**
 * Options for a sendPrompt call.
 * Configures the model, token budget, system prompt, tools, and cancellation.
 */
export interface PromptOptions {
  /** Override the provider's default model for this request. */
  model?: string;
  /** Maximum tokens the model may generate. */
  maxTokens?: number;
  /** System prompt prepended to the conversation. */
  systemPrompt?: string;
  /** Tool definitions to enable tool use. When provided, the model may return tool_use blocks. */
  tools?: ToolDefinition[];
  /** Controls whether/how the model uses tools: 'auto' | 'required' | 'none' | {name: string}. */
  toolChoice?: 'auto' | 'required' | 'none' | { type: 'tool'; name: string };
  /** AbortSignal for cooperative cancellation. */
  abortSignal?: AbortSignal;
}

/**
 * Provider identifier — based on pi-ai's KnownProvider with forward compatibility.
 * All pi-ai provider names are valid; arbitrary strings accepted for custom providers.
 */
export type ProviderId = KnownProvider | (string & {});

/**
 * Abstract provider interface — backends implement this contract.
 *
 * The provider is responsible for:
 * - Sending prompts to the LLM backend
 * - Streaming back events (text deltas, tool calls, usage, errors)
 * - Supporting cooperative cancellation via AbortController
 * - Normalizing backend-specific formats into the unified StreamEvent vocabulary
 *
 * Switching backends (Anthropic, OpenAI, Gemini, Copilot) requires only
 * implementing this interface — no consumer changes needed.
 */
export interface Provider {
  /**
   * Send a prompt and receive a stream of events.
   * The caller owns the AbortController for cancellation.
   * The async iterable yields StreamEvent variants until the stream ends.
   *
   * Messages use the ProviderMessage format which supports structured
   * content blocks (text, tool_use, tool_result) for multi-turn tool conversations.
   */
  sendPrompt(
    messages: ProviderMessage[],
    options: PromptOptions,
  ): AsyncIterable<StreamEvent>;

  /** Cancel the current in-flight request. */
  cancelRequest(): void;

  /** Provider identifier (e.g., 'anthropic', 'openai', 'chatgpt-codex'). */
  readonly id: ProviderId;

  /** Provider display name for status UI. */
  readonly name: string;

  /** Currently configured model identifier. */
  readonly model: string;

  /**
   * Provider capability flags.
   *
   * Returns the set of features this provider supports (vision, function calling,
   * streaming, system prompt). Callers use this for capability negotiation — e.g.,
   * deciding whether to attach images or enable tool definitions.
   *
   * Implementations should return conservative defaults and override per-model
   * when specific models have different feature sets.
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * The underlying pi-ai Model object with full metadata.
   *
   * Exposes contextWindow, maxTokens, cost, reasoning flag, and input types
   * for callers that need model-level metadata. Per D-18.
   */
  readonly piModel: Model<Api>;

  /**
   * Optional health check / heartbeat (N5).
   * Returns true if the provider is reachable and operational.
   * Implementations may perform a lightweight API call or simply return true.
   */
  ping?(): Promise<boolean>;
}

/**
 * Configuration for creating a provider instance.
 * Used by the provider factory to instantiate the correct backend.
 */
export interface ProviderConfig {
  /** Provider identifier. */
  id: ProviderId;
  /** API key for authentication (API-key-based providers). */
  apiKey?: string;
  /** Model identifier override. */
  model?: string;
  /** Base URL override (for OpenAI-compatible providers). */
  baseUrl?: string;
  /** Extra headers to send with every request. */
  headers?: Record<string, string>;
  /** OAuth tokens (for ChatGPT/Codex, Antigravity, Copilot). */
  auth?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    accountId?: string;
  };
}

/**
 * Provider factory function type.
 * Given a config, returns a Provider instance.
 */
export type ProviderFactory = (config: ProviderConfig) => Provider;
