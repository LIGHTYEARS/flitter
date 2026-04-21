/**
 * @flitter/llm — Google GenAI Live Provider (WebSocket streaming)
 *
 * Implements a persistent WebSocket-based streaming provider for Gemini's
 * multimodal live API (audio/video input). This is separate from the standard
 * generateContent REST API in provider.ts.
 *
 * 逆向: amp-cli-reversed/modules/0973_GoogleGenAI_L6T.js — constructor creates
 *   this.live = new P6T(this.apiClient, l, new j6T())
 *   Live connections use WebSocket transport with session management.
 *
 * Connection state machine:
 *   disconnected → connecting → connected → error
 *                                   ↓
 *                              disconnected (on close/error)
 *
 * Note: amp does not appear to use the live API in its CLI mode — this
 * is primarily for future extension. No direct amp CLI reference for the
 * live streaming code path beyond the SDK constructor wiring.
 */

import { EventEmitter } from "node:events";

// ─── Connection States ───────────────────────────────────

export type LiveConnectionState = "disconnected" | "connecting" | "connected" | "error";

// ─── Events ──────────────────────────────────────────────

export interface LiveProviderEvents {
  stateChange: [state: LiveConnectionState, previousState: LiveConnectionState];
  message: [data: unknown];
  error: [error: Error];
}

// ─── Config ──────────────────────────────────────────────

export interface LiveProviderConfig {
  /** Gemini API key */
  apiKey: string;
  /** Model to use (e.g. "gemini-2.0-flash") */
  model: string;
  /** Base URL override (for Vertex AI or testing) */
  baseUrl?: string;
  /** WebSocket constructor (for testing / environments without native WebSocket; pass null to disable) */
  WebSocket?: (new (url: string, protocols?: string | string[]) => WebSocket) | null;
}

// ─── LiveProvider ────────────────────────────────────────

/**
 * GoogleGenAILiveProvider — WebSocket-based streaming for Gemini Live API.
 *
 * 逆向: No direct amp CLI usage of live streaming found — this is based on
 *   the @google/genai SDK's P6T/j6T classes and their session management.
 *
 * Provides graceful degradation: if WebSocket is unavailable in the runtime,
 * connect() throws a clear error rather than crashing.
 */
export class GoogleGenAILiveProvider extends EventEmitter {
  private _state: LiveConnectionState = "disconnected";
  private _ws: WebSocket | null = null;
  private readonly _config: LiveProviderConfig;

  constructor(config: LiveProviderConfig) {
    super();
    this._config = config;
  }

  /** Current connection state */
  get state(): LiveConnectionState {
    return this._state;
  }

  /**
   * Connect to the Gemini Live WebSocket endpoint.
   * Transitions: disconnected → connecting → connected (or → error)
   */
  async connect(): Promise<void> {
    if (this._state === "connected" || this._state === "connecting") {
      return;
    }

    // Check WebSocket availability (graceful degradation)
    // If WebSocket is explicitly null, it means "no WebSocket available"
    const WS =
      this._config.WebSocket === null
        ? undefined
        : (this._config.WebSocket ??
          (typeof globalThis !== "undefined"
            ? (globalThis as Record<string, unknown>).WebSocket
            : undefined));

    if (!WS) {
      this._transition("error");
      throw new Error(
        "WebSocket is not available in this environment. " +
          "GoogleGenAILiveProvider requires a WebSocket implementation.",
      );
    }

    this._transition("connecting");

    const baseUrl =
      this._config.baseUrl ??
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

    const url = `${baseUrl}?key=${this._config.apiKey}`;

    return new Promise<void>((resolve, reject) => {
      try {
        this._ws = new (WS as new (url: string) => WebSocket)(url);
      } catch (err) {
        this._transition("error");
        reject(
          err instanceof Error ? err : new Error(`WebSocket construction failed: ${String(err)}`),
        );
        return;
      }

      const onOpen = () => {
        cleanup();
        this._reconnectAttempts = 0;
        this._transition("connected");

        // Send setup message
        this._ws!.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(String(event.data));
            this.emit("message", data);
          } catch {
            this.emit("message", event.data);
          }
        };

        this._ws!.onclose = () => {
          this._ws = null;
          this._transition("disconnected");
        };

        this._ws!.onerror = (event: Event) => {
          const error = new Error(`WebSocket error: ${String(event)}`);
          this.emit("error", error);
          this._ws?.close();
          this._ws = null;
          this._transition("error");
        };

        resolve();
      };

      const onError = (event: Event) => {
        cleanup();
        this._ws = null;
        this._transition("error");
        reject(new Error(`WebSocket connection failed: ${String(event)}`));
      };

      const cleanup = () => {
        if (this._ws) {
          this._ws.onopen = null;
          this._ws.onerror = null;
        }
      };

      this._ws.onopen = onOpen;
      this._ws.onerror = onError;
    });
  }

  /**
   * Send a message over the WebSocket connection.
   * @throws if not connected
   */
  send(data: unknown): void {
    if (this._state !== "connected" || !this._ws) {
      throw new Error(`Cannot send: state is "${this._state}", expected "connected"`);
    }
    this._ws.send(JSON.stringify(data));
  }

  /**
   * Disconnect gracefully.
   * Transitions: * → disconnected
   */
  disconnect(): void {
    if (this._ws) {
      try {
        this._ws.close();
      } catch {
        // ignore close errors
      }
      this._ws = null;
    }
    if (this._state !== "disconnected") {
      this._transition("disconnected");
    }
  }

  /**
   * Send setup configuration for the live session.
   * Must be called after connect() succeeds.
   */
  sendSetup(config: {
    model: string;
    generationConfig?: Record<string, unknown>;
    systemInstruction?: string;
    tools?: unknown[];
  }): void {
    this.send({
      setup: {
        model: `models/${config.model}`,
        generationConfig: config.generationConfig ?? {},
        ...(config.systemInstruction
          ? { systemInstruction: { parts: [{ text: config.systemInstruction }] } }
          : {}),
        ...(config.tools ? { tools: config.tools } : {}),
      },
    });
  }

  /** Transition state and emit event */
  private _transition(newState: LiveConnectionState): void {
    const prev = this._state;
    if (prev === newState) return;
    this._state = newState;
    this.emit("stateChange", newState, prev);
  }
}
