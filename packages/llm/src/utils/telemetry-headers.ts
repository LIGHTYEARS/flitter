/**
 * @flitter/llm — Request-level telemetry header builder
 *
 * Assembles the standard set of headers that amp sends with every LLM API request.
 * These allow server-side correlation by thread, feature, and mode.
 *
 * Header constants:
 *   x-amp-feature   — feature identifier (e.g. "amp.chat")
 *   x-amp-thread-id — thread ID for request grouping
 *   x-amp-mode      — agent mode string (empty when not set)
 *
 * 逆向: amp-cli-reversed/chunk-001.js:7088-7091
 *   yc  = "x-amp-feature"
 *   VET = "x-amp-thread-id"
 *   FlR = "x-amp-mode"
 *
 * 逆向: amp-cli-reversed/chunk-001.js:5955-5960 (Vs function)
 *   function Vs(T) {
 *     if (!T) return {};
 *     return { [VET]: T.id, [FlR]: T.agentMode ?? "" };
 *   }
 *
 * 逆向: amp-cli-reversed/chunk-002.js:1897-1910 (JN function)
 *   return {
 *     ...Xs(),                    // client identification headers
 *     ...(i ? { "x-amp-override-provider": i } : {}),
 *     [yc]: "amp.chat",           // feature default
 *     ...(e != null ? { [zA]: String(e) } : {}),
 *     ...Vs(R)                    // threadId + mode
 *   };
 *
 * @example
 * ```ts
 * const headers = buildTelemetryHeaders({ threadId: "t-123", agentMode: "agent", feature: "amp.chat" });
 * // { "x-amp-feature": "amp.chat", "x-amp-thread-id": "t-123", "x-amp-mode": "agent" }
 * ```
 */

/** Header name constants — matching amp's source exactly */
export const HEADER_X_AMP_FEATURE = "x-amp-feature";
export const HEADER_X_AMP_THREAD_ID = "x-amp-thread-id";
export const HEADER_X_AMP_MODE = "x-amp-mode";

/** Default feature value used by amp for chat sessions */
export const DEFAULT_FEATURE = "amp.chat";

export interface TelemetryHeadersInput {
  /** Feature identifier. Defaults to "amp.chat". */
  feature?: string;
  /** Thread ID — maps to x-amp-thread-id */
  threadId?: string;
  /** Agent mode string — maps to x-amp-mode. Empty string is allowed (amp sends "" for default). */
  agentMode?: string;
}

/**
 * Build the amp-style request telemetry headers.
 *
 * Always includes x-amp-feature (defaults to "amp.chat").
 * Includes x-amp-thread-id only when threadId is provided.
 * Includes x-amp-mode only when agentMode is provided (sends empty string for unset mode,
 * matching amp's `T.agentMode ?? ""`).
 *
 * 逆向: amp Vs(threadMeta) + JN() header assembly
 */
export function buildTelemetryHeaders(input: TelemetryHeadersInput): Record<string, string> {
  const headers: Record<string, string> = {};

  // x-amp-feature is always sent, defaulting to "amp.chat"
  // 逆向: amp-cli-reversed/chunk-002.js:1902 — [yc]: "amp.chat" default
  headers[HEADER_X_AMP_FEATURE] = input.feature ?? DEFAULT_FEATURE;

  // x-amp-thread-id — only when a thread ID is available
  // 逆向: amp-cli-reversed/chunk-001.js:5957 — [VET]: T.id
  if (input.threadId) {
    headers[HEADER_X_AMP_THREAD_ID] = input.threadId;
  }

  // x-amp-mode — send agentMode when set (amp sends empty string for default mode)
  // 逆向: amp-cli-reversed/chunk-001.js:5958 — [FlR]: T.agentMode ?? ""
  if (input.agentMode !== undefined) {
    headers[HEADER_X_AMP_MODE] = input.agentMode;
  }

  return headers;
}
