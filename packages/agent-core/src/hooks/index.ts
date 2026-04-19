/**
 * @flitter/agent-core hooks — Lifecycle hook types & admin hook matcher
 *
 * Barrel export for the hooks module.
 */

export type {
  InternalHooks,
  LifecycleHookResult,
} from "./lifecycle-hooks";

export type {
  AdminHookAction,
  AdminHookConfig,
  AdminHookOn,
  HookMatchResult,
  PostExecuteContext,
  PreExecuteContext,
} from "./hook-matcher";

export {
  filterValidHooks,
  matchPostExecuteHook,
  matchPreExecuteHook,
} from "./hook-matcher";
