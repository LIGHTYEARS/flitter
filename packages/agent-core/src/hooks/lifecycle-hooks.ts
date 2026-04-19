/**
 * Lifecycle hook types for ThreadWorker internal hooks
 *
 * These hooks allow the container layer to inject behavior at key points
 * in the agent loop: task completion, assistant turn end, and inference completion.
 *
 * 逆向: 1244_ThreadWorker_ov.js lines 480-488 (onTaskCompleted),
 *        664 (onAssistantTurnEnd via P7R), 668-677 (onInferenceCompleted)
 *
 * In amp, internalHooks is a deps property on ThreadWorker:
 *   - onTaskCompleted: called when a sub-agent task completes (line 480)
 *   - onAssistantTurnEnd: called via P7R when assistant turn ends with end_turn (line 664)
 *   - onInferenceCompleted: called when inference completes and worker is idle (line 668)
 *
 * Results are processed by BI() (1194_UseID_BI.js) which handles action types:
 *   - send-user-message: injects a user message and aborts current op
 *   - redact-tool-input: replaces tool input with redacted version
 *   - handoff: triggers a handoff to a new goal
 */

import type { ThreadSnapshot } from "@flitter/schemas";

// ─── Lifecycle Hook Result ────────────────────────────────

/**
 * Result returned by lifecycle hooks.
 * `action` is null when the hook has no effect.
 *
 * 逆向: BI (1194_UseID_BI.js) processes action.type:
 *   - "send-user-message" → injects user message, aborts current op
 *   - "redact-tool-input" → replaces tool input
 *   - "handoff" → triggers handoff with goal
 */
export interface LifecycleHookResult {
  action: { type: string; message?: string; goal?: string } | null;
}

// ─── Internal Hooks Interface ─────────────────────────────

/**
 * Internal hooks injected into ThreadWorker via deps.
 *
 * All hooks are optional and async. They return a LifecycleHookResult
 * (or null) which is then applied by the hook applicator (BI).
 */
export interface InternalHooks {
  /**
   * Called when a sub-agent task completes.
   *
   * 逆向: ThreadWorker_ov.js ~480-488
   *   onTaskCompleted?.({ thread, completedTask: e.task, nextTask: e.nextTask, usage })
   *
   * Usage is derived from $h(thread) which computes totalInputTokens/maxInputTokens.
   * It may be undefined if usage info is unavailable.
   */
  onTaskCompleted?: (context: {
    thread: ThreadSnapshot;
    completedTask: { id: string; title: string };
    nextTask?: { id: string; title: string };
    usage?: { totalInputTokens: number; maxInputTokens: number };
  }) => Promise<LifecycleHookResult | null>;

  /**
   * Called when the assistant turn ends with stopReason "end_turn"
   * and there are no queued messages.
   *
   * 逆向: ThreadWorker_ov.js ~664
   *   P7R(this.deps.internalHooks?.onAssistantTurnEnd, { thread: this.thread })
   *   P7R wraps: T(R.thread) with try/catch returning { action: null } on error
   */
  onAssistantTurnEnd?: (context: {
    thread: ThreadSnapshot;
  }) => Promise<LifecycleHookResult | null>;

  /**
   * Called after onAssistantTurnEnd when the worker is idle and usage info is available.
   *
   * 逆向: ThreadWorker_ov.js ~668-677
   *   onInferenceCompleted({ thread, usage: { totalInputTokens, maxInputTokens }, isIdle: true })
   */
  onInferenceCompleted?: (context: {
    thread: ThreadSnapshot;
    usage: { totalInputTokens: number; maxInputTokens: number };
    isIdle: boolean;
  }) => Promise<LifecycleHookResult | null>;
}
