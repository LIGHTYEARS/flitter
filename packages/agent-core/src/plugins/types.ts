/**
 * @flitter/agent-core — Plugin system types
 *
 * 逆向: amp-cli-reversed/chunk-002.js:26937-27070 ($aT class, tool.call/tool.result protocol)
 * 逆向: amp-cli-reversed/chunk-002.js:21007-21058 (action handling: error, reject-and-continue, synthesize, modify)
 * 逆向: amp-cli-reversed/chunk-002.js:27565-27641 (tool call/result interception flow)
 * 逆向: amp-cli-reversed/chunk-005.js:145466-145492 (V5T disabled plugin service defaults)
 *
 * @example
 * ```ts
 * import type { PluginToolCallEvent, PluginAction, PluginInfo } from '@flitter/agent-core';
 * ```
 */

// ─── JSON-RPC Protocol Messages ─────────────────────────

/**
 * JSON-RPC message types exchanged between host and plugin subprocess.
 * 逆向: chunk-005.js:145637-145643 (handleMessage) + chunk-002.js:27067-27078 (nuT/NWR)
 */
export interface JsonRpcRequest {
  type: "request";
  id: string;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  type: "response";
  id: string;
  result?: unknown;
  error?: string;
}

export interface JsonRpcEvent {
  type: "event";
  event: string;
  data?: unknown;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcEvent;

// ─── Plugin Tool Events ─────────────────────────────────

/**
 * Event sent to plugins when a tool is about to be called.
 * 逆向: chunk-002.js:27565-27609 (iT function — tool.call interception)
 */
export interface PluginToolCallEvent {
  /** Tool name being called */
  tool: string;
  /** Tool input arguments */
  input: Record<string, unknown>;
  /** Thread context */
  thread?: { id: string };
}

/**
 * Event sent to plugins after a tool has produced a result.
 * 逆向: chunk-002.js:27610-27641 (aT function — tool.result interception)
 */
export interface PluginToolResultEvent {
  /** Tool name that was called */
  tool: string;
  /** Tool input arguments */
  input: Record<string, unknown>;
  /** Tool result output */
  output: string;
  /** Tool result status */
  status: "done" | "error" | "cancelled";
  /** Thread context */
  thread?: { id: string };
}

// ─── Plugin Actions ─────────────────────────────────────

/**
 * Actions a plugin can return from a tool.call hook.
 * 逆向: chunk-002.js:21007-21058 (action handling in ToolOrchestrator)
 * 逆向: chunk-002.js:27600-27608 (action priority: error > reject-and-continue > synthesize > modify > allow)
 */

/** Allow the tool call to proceed as normal */
export interface PluginActionAllow {
  action: "allow";
}

/** Block the tool call with an error */
export interface PluginActionError {
  action: "error";
  message: string;
}

/** Reject the tool call but continue the conversation (soft rejection) */
export interface PluginActionRejectAndContinue {
  action: "reject-and-continue";
  message: string;
}

/** Synthesize a result without actually executing the tool */
export interface PluginActionSynthesize {
  action: "synthesize";
  result: { output: string };
}

/** Modify the tool's input before execution */
export interface PluginActionModify {
  action: "modify";
  input: Record<string, unknown>;
}

export type PluginAction =
  | PluginActionAllow
  | PluginActionError
  | PluginActionRejectAndContinue
  | PluginActionSynthesize
  | PluginActionModify;

// ─── Plugin Tool Result Action ──────────────────────────

/**
 * Result a plugin can return from a tool.result hook (to override the result).
 * 逆向: chunk-002.js:26963-26974 (requestToolResult validation)
 */
export interface PluginToolResultOverride {
  status: "done" | "error" | "cancelled";
  result?: string;
  error?: string;
}

// ─── Plugin Info ─────────────────────────────────────────

/**
 * Plugin status states matching amp lifecycle.
 * 逆向: chunk-002.js:27239-27255 (status transitions: loading → active | error)
 * 逆向: chunk-005.js:145503 (hasReachedReadyState)
 */
export type PluginStatus = "loading" | "active" | "error";

/**
 * Runtime information about a loaded plugin.
 * 逆向: chunk-002.js:27174-27188 (puT function creating plugin record)
 * 逆向: chunk-002.js:27351-27361 (v function serializing plugin info)
 */
export interface PluginInfo {
  /** Plugin file URI */
  uri: string;
  /** Current status */
  status: PluginStatus;
  /** Set of events this plugin has registered for */
  registeredEvents: Set<string>;
}

// ─── Plugin Host Configuration ──────────────────────────

/**
 * Configuration for PluginHost subprocess management.
 * 逆向: chunk-005.js:145518-145521 (vaT constructor options)
 */
export interface PluginHostOptions {
  /** Callback for stderr output */
  onStderr?: (data: string) => void;
  /** Callback for incoming JSON-RPC requests from plugin */
  onRequest?: Record<string, (params: unknown) => Promise<unknown>>;
  /** Callback for incoming events from plugin */
  onEvent?: (event: string, data: unknown) => void;
  /** Callback for state changes */
  onStateChange?: (state: PluginStateChange) => void;
  /** Maximum auto-restart attempts (default: 3) */
  maxAutoRestarts?: number;
  /** Base restart delay in ms (default: 200, exponential backoff) */
  restartDelayMs?: number;
  /** Shutdown grace period in ms (default: 3000) */
  shutdownGracePeriodMs?: number;
  /** Request timeout in ms (default: 5000) */
  requestTimeoutMs?: number;
}

/**
 * State change events emitted by PluginHost.
 * 逆向: chunk-005.js:145572-145573 (ready), 145613 (failed), 145619 (restarting)
 */
export type PluginStateChange =
  | { type: "ready" }
  | { type: "failed"; error: Error }
  | { type: "restarting"; attempt: number; delayMs: number; error: Error };

// ─── Plugin Service Configuration ───────────────────────

/**
 * Configuration for PluginService.
 * 逆向: chunk-002.js:27190-27200 (X5T constructor params)
 */
export interface PluginServiceOptions {
  /** Working directory (workspace root) for discovering workspace plugins */
  workspaceDir?: string;
  /** User config directory for discovering global plugins (default: ~/.config/flitter) */
  userConfigDir?: string;
  /** Plugin filter: "all" | "off" | specific plugin name substring */
  pluginFilter?: string;
}

/**
 * Plugin discovery directories.
 * 逆向: chunk-002.js:27363-27367 (I function computing plugin dirs)
 */
export const WORKSPACE_PLUGIN_DIR = ".flitter/plugins";
export const GLOBAL_PLUGIN_DIR = "plugins";

/**
 * Ready event name that plugins emit when loaded.
 * 逆向: chunk-005.js:19746 (QWR = "runtime.ready")
 */
export const PLUGIN_READY_EVENT = "runtime.ready";

/**
 * Default constants matching amp's values.
 * 逆向: chunk-005.js:19742-19745
 */
export const PLUGIN_READY_TIMEOUT_MS = 2000;    // KWR
export const MAX_AUTO_RESTARTS = 3;               // VWR
export const RESTART_DELAY_MS = 200;              // XWR
export const SHUTDOWN_GRACE_PERIOD_MS = 3000;     // YWR
export const REQUEST_TIMEOUT_MS = 5000;
