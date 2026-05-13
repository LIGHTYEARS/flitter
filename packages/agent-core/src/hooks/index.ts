/**
 * @flitter/agent-core hooks — Lifecycle hook types & declarative hook matcher
 *
 * Barrel export. Declarative hook matcher is the canonical implementation
 * in subagent/hook-matcher.ts (merged from the duplicate in hooks/).
 */

// Re-export declarative hook matcher (canonical source)
export type {
  DeclarativeHook,
  DeclarativeHookAction,
  DeclarativeHookOn,
  HookMatchResult,
} from "../subagent/hook-matcher";
export {
  filterValidHooks,
  matchPostExecuteHook,
  matchPreExecuteHook,
} from "../subagent/hook-matcher";

export type {
  InternalHooks,
  LifecycleHookResult,
} from "./lifecycle-hooks";
