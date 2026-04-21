/**
 * @flitter/agent-core — Plugin system barrel exports
 *
 * Re-exports all plugin types and classes for external consumption.
 */

// ─── Classes ──────────────────────────────────────────────
export { PluginHost } from "./plugin-host";
// ─── Runtime ──────────────────────────────────────────────
export { generatePluginRuntime, validateRuntimeTemplate } from "./plugin-runtime";
export { PluginService } from "./plugin-service";
// ─── Types ────────────────────────────────────────────────
export type {
  JsonRpcEvent,
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  PluginAction,
  PluginActionAllow,
  PluginActionError,
  PluginActionModify,
  PluginActionRejectAndContinue,
  PluginActionSynthesize,
  PluginAgentEndEvent,
  PluginAgentEndResult,
  PluginAgentStartEvent,
  PluginAgentStartResult,
  PluginHostOptions,
  PluginInfo,
  PluginServiceOptions,
  PluginStateChange,
  PluginStatus,
  PluginToolCallEvent,
  PluginToolResultEvent,
  PluginToolResultOverride,
} from "./types";
// ─── Constants ────────────────────────────────────────────
export {
  GLOBAL_PLUGIN_DIR,
  MAX_AUTO_RESTARTS,
  PLUGIN_READY_EVENT,
  PLUGIN_READY_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  RESTART_DELAY_MS,
  SHUTDOWN_GRACE_PERIOD_MS,
  WORKSPACE_PLUGIN_DIR,
} from "./types";
