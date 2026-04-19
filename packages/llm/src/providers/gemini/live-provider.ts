/**
 * @flitter/llm — Google GenAI Live (WebSocket) Provider
 *
 * Connects to Google's Gemini Live API via WebSocket for streaming responses.
 * Falls back gracefully to REST GeminiProvider if WebSocket is unavailable.
 *
 * 逆向: amp-cli-reversed/modules/0908_GoogleGenAI_P6T.js — P6T class
 *   P6T.connect(T) builds WebSocket URL:
 *   - Public API: `${wsBase}/ws/google.ai.generativelanguage.${version}.GenerativeService.BidiGenerateContent?key=${apiKey}`
 *   - Vertex AI: `${wsBase}/ws/google.cloud.aiplatform.${version}.LlmBidiService/BidiGenerateContent`
 *   - Ephemeral tokens: uses BidiGenerateContentConstrained + access_token param
 *   - Sends setup message with model name and config as first frame
 *   - Wraps in k6T session object with send/receive
 *
 * @module
 */

import type { LLMProvider } from "../../provider";
import type { StreamDelta, StreamParams } from "../../types";
import { ProviderError, TransformState } from "../../types";
import { GeminiProvider } from "./provider";

// ─── Types ──────────────────────────────────────────────

/** WebSocket connection state */
export type LiveConnectionState = "disconnected" | "connecting" | "connected" | "error";

/** Configuration for the live provider */
export interface LiveProviderConfig {
  /** API key for authentication */
  apiKey?: string;
  /** API version (default: "v1beta") */
  apiVersion?: string;
  /** Whether using Vertex AI endpoint */
  vertexAI?: boolean;
  /** Vertex AI project */
  project?: string;
  /** Vertex AI location */
  location?: string;
  /** Custom WebSocket base URL */
  wsBaseUrl?: string;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatIntervalMs?: number;
  /** Connection timeout in ms (default: 10000) */
  connectionTimeoutMs?: number;
  /** WebSocket factory (injectable for testing) */
  createWebSocket?: (url: string, protocols?: string[]) => WebSocket;
}

/**
 * WebSocket message frame from the Gemini Live API.
 *
 * 逆向: amp-cli-reversed/modules/0908_GoogleGenAI_P6T.js — LOR() message handler
 *   parses server messages containing candidates with content parts.
 */
export interface LiveServerMessage {
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        thought?: boolean;
      }>;
    };
    turnComplete?: boolean;
  };
  toolCall?: {
    functionCalls?: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
  setupComplete?: boolean;
}

// ─── GoogleGenAILiveProvider ────────────────────────────

/**
 * Google Gemini Live API provider using WebSocket streaming.
 *
 * Falls back to REST GeminiProvider when:
 * - WebSocket is not available in the runtime
 * - Connection fails or times out
 * - The model doesn't support Live API
 *
 * 逆向: amp P6T class (0908_GoogleGenAI_P6T.js)
 *   - Constructs WS URL based on Vertex vs public endpoint
 *   - Sends setup frame with model + config
 *   - Receives streaming message frames
 *   - k6T session wraps the connection with send/close
 */
export class GoogleGenAILiveProvider implements LLMProvider {
  readonly name = "gemini" as const;

  private readonly _config: LiveProviderConfig;
  private readonly _restFallback: GeminiProvider;
  private _ws: WebSocket | null = null;
  private _connectionState: LiveConnectionState = "disconnected";
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: LiveProviderConfig = {}, restFallback?: GeminiProvider) {
    this._config = {
      apiVersion: "v1beta",
      heartbeatIntervalMs: 30_000,
      connectionTimeoutMs: 10_000,
      ...config,
    };
    this._restFallback = restFallback ?? new GeminiProvider();
  }

  get connectionState(): LiveConnectionState {
    return this._connectionState;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamDelta> {
    // Determine if we can use WebSocket
    const canUseWS = this._canUseWebSocket();

    if (!canUseWS) {
      // Fall back to REST provider
      yield* this._restFallback.stream(params);
      return;
    }

    try {
      yield* this._streamViaWebSocket(params);
    } catch (err) {
      // If WebSocket failed during connection, fall back to REST
      if (
        this._connectionState === "error" ||
        this._connectionState === "disconnected"
      ) {
        if (
          typeof process !== "undefined" &&
          process.env?.FLITTER_LOG_LEVEL === "debug"
        ) {
          // eslint-disable-next-line no-console
          console.error(
            `[llm:gemini-live] WebSocket failed, falling back to REST: ${err instanceof Error ? err.message : err}`,
          );
        }
        yield* this._restFallback.stream(params);
        return;
      }
      throw err;
    } finally {
      this._cleanup();
    }
  }

  /**
   * Build the WebSocket URL.
   *
   * 逆向: amp P6T.connect() lines 8-28
   *   - Public: `${wsBase}/ws/google.ai.generativelanguage.${version}.GenerativeService.BidiGenerateContent?key=${apiKey}`
   *   - Vertex: `${wsBase}/ws/google.cloud.aiplatform.${version}.LlmBidiService/BidiGenerateContent`
   */
  buildWebSocketUrl(apiKey: string): string {
    const version = this._config.apiVersion ?? "v1beta";

    if (this._config.vertexAI && this._config.project && this._config.location) {
      const base =
        this._config.wsBaseUrl ??
        `wss://${this._config.location}-aiplatform.googleapis.com`;
      return `${base}/ws/google.cloud.aiplatform.${version}.LlmBidiService/BidiGenerateContent`;
    }

    const base = this._config.wsBaseUrl ?? "wss://generativelanguage.googleapis.com";
    return `${base}/ws/google.ai.generativelanguage.${version}.GenerativeService.BidiGenerateContent?key=${apiKey}`;
  }

  /**
   * Build the setup message sent as the first WebSocket frame.
   *
   * 逆向: amp P6T.connect() lines 68-73
   *   Constructs { model, config, callbacks } then serializes
   *   without the config key for Vertex vs public.
   */
  buildSetupMessage(model: string, config: Record<string, unknown>): Record<string, unknown> {
    // 逆向: amp g8() resolves model name
    const modelName = this._config.vertexAI
      ? `projects/${this._config.project}/locations/${this._config.location}/publishers/google/models/${model}`
      : model;

    return {
      setup: {
        model: modelName,
        generationConfig: config,
      },
    };
  }

  /**
   * Parse a server message from the WebSocket.
   */
  parseServerMessage(data: string): LiveServerMessage {
    try {
      return JSON.parse(data) as LiveServerMessage;
    } catch {
      return {};
    }
  }

  // ─── Private ──────────────────────────────────────────

  private _canUseWebSocket(): boolean {
    // Check if WebSocket is available in the runtime
    return (
      typeof WebSocket !== "undefined" ||
      this._config.createWebSocket !== undefined
    );
  }

  private async *_streamViaWebSocket(params: StreamParams): AsyncGenerator<StreamDelta> {
    const { model, config, signal } = params;

    const apiKey = await config.secrets.getToken("apiKey");
    if (!apiKey) {
      throw new ProviderError(401, "gemini", false, "Gemini API key not configured");
    }

    const url = this.buildWebSocketUrl(apiKey);
    const state = new TransformState();
    let blockIndex = 0;
    let resolve: (() => void) | null = null;
    let reject: ((err: Error) => void) | null = null;
    const messageQueue: LiveServerMessage[] = [];
    let done = false;

    // Connect WebSocket
    this._connectionState = "connecting";

    const ws = this._config.createWebSocket
      ? this._config.createWebSocket(url)
      : new WebSocket(url);

    this._ws = ws;

    // Wait for connection
    await new Promise<void>((res, rej) => {
      const timeout = setTimeout(() => {
        this._connectionState = "error";
        rej(new ProviderError(408, "gemini", true, "WebSocket connection timeout"));
      }, this._config.connectionTimeoutMs);

      ws.onopen = () => {
        clearTimeout(timeout);
        this._connectionState = "connected";
        res();
      };

      ws.onerror = (event) => {
        clearTimeout(timeout);
        this._connectionState = "error";
        rej(new ProviderError(502, "gemini", true, "WebSocket connection failed"));
      };
    });

    // Send setup message
    const setupMsg = this.buildSetupMessage(model, {
      maxOutputTokens: 8192,
    });
    ws.send(JSON.stringify(setupMsg));

    // Start heartbeat
    // 逆向: amp k6T session keeps connection alive
    this._startHeartbeat(ws);

    // Handle incoming messages
    ws.onmessage = (event) => {
      const msg = this.parseServerMessage(
        typeof event.data === "string" ? event.data : "",
      );

      if (msg.setupComplete) {
        // Setup acknowledged, ready for content
        return;
      }

      messageQueue.push(msg);
      resolve?.();
    };

    ws.onclose = () => {
      done = true;
      this._connectionState = "disconnected";
      resolve?.();
    };

    ws.onerror = () => {
      done = true;
      this._connectionState = "error";
      reject?.(new ProviderError(502, "gemini", true, "WebSocket error during streaming"));
    };

    // Handle abort
    const onAbort = () => {
      done = true;
      ws.close();
      resolve?.();
    };
    signal.addEventListener("abort", onAbort, { once: true });

    // Yield messages as they arrive
    try {
      while (!done) {
        if (messageQueue.length === 0) {
          await new Promise<void>((res, rej) => {
            resolve = res;
            reject = rej;
          });
        }

        while (messageQueue.length > 0) {
          const msg = messageQueue.shift()!;

          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.thought) {
                // Thinking block
                state.addBlock(blockIndex, "thinking", { thinking: part.text ?? "" });
                state.completeBlock(blockIndex);
                blockIndex++;
              } else if (part.text !== undefined) {
                // Text block
                if (!state.blocks.has(blockIndex) || state.blocks.get(blockIndex)?.type !== "text") {
                  state.addBlock(blockIndex, "text", { text: part.text });
                } else {
                  state.updateBlock(blockIndex, { text: part.text });
                }
              }
            }

            yield {
              content: state.getContent(),
              state: "streaming",
            } as unknown as StreamDelta;
          }

          if (msg.serverContent?.turnComplete) {
            if (state.blocks.has(blockIndex)) {
              state.completeBlock(blockIndex);
            }
            yield {
              content: state.getContent(),
              state: "complete",
            } as unknown as StreamDelta;
            done = true;
            break;
          }

          if (msg.toolCall?.functionCalls) {
            for (const call of msg.toolCall.functionCalls) {
              state.addBlock(blockIndex, "tool_use", {
                id: call.id,
                name: call.name,
                input: call.args,
                complete: true,
              });
              state.completeBlock(blockIndex);
              blockIndex++;
            }
            yield {
              content: state.getContent(),
              state: "streaming",
            } as unknown as StreamDelta;
          }
        }
      }
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }

  /**
   * Start heartbeat to keep WebSocket alive.
   *
   * 逆向: amp k6T session — connection lifecycle management
   */
  private _startHeartbeat(ws: WebSocket): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
    }
    this._heartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send empty object as heartbeat
        ws.send("{}");
      }
    }, this._config.heartbeatIntervalMs);
  }

  private _cleanup(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    if (this._ws) {
      try {
        this._ws.close();
      } catch {
        // Ignore close errors
      }
      this._ws = null;
    }
    this._connectionState = "disconnected";
  }
}
