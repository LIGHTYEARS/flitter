/**
 * Hook action applicator: interpret DeclarativeHookAction results
 *
 * 逆向: BI (1194_UseID_BI.js) — applyHookResult
 *
 * BI(T, R, a) interprets the hook match result and returns {abortOp: bool}:
 * - If R.action is null → {abortOp: false} (no hook matched)
 * - send-user-message → creates user:message event, calls updateThread + onThreadDelta,
 *   returns {abortOp: true}
 * - redact-tool-input → creates tool:processed event with newArgs = action.redactedInput,
 *   requires toolUseID in context, returns {abortOp: false}
 * - handoff → logs info, calls executeHandoff(goal), returns {abortOp: false}
 */

import { createLogger } from "@flitter/util";

const log = createLogger("hook-applicator");

// ─── Types ─────────────────────────────────────────────────

/**
 * Context needed to apply a hook action
 * 逆向: BI's `a` parameter (optional context with toolUseID)
 */
export interface HookActionContext {
  /** The toolUseId (required for redact-tool-input) */
  toolUseID?: string;
}

/**
 * Result of applying a hook action
 * 逆向: BI returns {abortOp: bool}
 */
export interface HookActionResult {
  /** If true, abort the current tool invocation */
  abortOp: boolean;
  /** For send-user-message: the message text to inject */
  userMessage?: string;
  /** For send-user-message: the hook ID that produced the message */
  hookID?: string;
  /** For redact-tool-input: the redacted input to replace the tool's input */
  redactedInput?: Record<string, unknown>;
  /** For redact-tool-input: the toolUseID that was redacted */
  redactedToolUseID?: string;
}

// ─── applyHookAction ───────────────────────────────────────

/**
 * Apply a hook match result and return the action outcome.
 * 逆向: BI (1194_UseID_BI.js)
 *
 * @param hookResult - The result from matchPreExecuteHook or matchPostExecuteHook
 * @param context - Optional context (toolUseID for redact actions)
 * @returns HookActionResult with abortOp and any side-effect data
 */
export function applyHookAction(
  hookResult: {
    hookID?: string;
    action: {
      type: string;
      message?: string;
      redactedInput?: Record<string, unknown>;
      goal?: string;
    } | null;
  },
  context?: HookActionContext,
): HookActionResult {
  // 逆向: if (!R.action) return { abortOp: !1 };
  if (!hookResult.action) {
    return { abortOp: false };
  }

  switch (hookResult.action.type) {
    // 逆向: case "send-user-message":
    // Creates a user:message event with the hook's message text.
    // Returns {abortOp: true} — this aborts the tool invocation.
    case "send-user-message": {
      return {
        abortOp: true,
        userMessage: hookResult.action.message,
        hookID: hookResult.hookID,
      };
    }

    // 逆向: case "redact-tool-input":
    // Requires toolUseID in context. Creates a tool:processed event with newArgs.
    // Returns {abortOp: false} — the tool still runs, just with redacted input in the thread.
    case "redact-tool-input": {
      if (!context?.toolUseID) {
        log.warn("redact-tool-input action requires toolUseID in context");
        return { abortOp: false };
      }

      log.debug("Tool input redacted", {
        hookID: hookResult.hookID,
        toolUseID: context.toolUseID,
      });

      return {
        abortOp: false,
        redactedInput: hookResult.action.redactedInput,
        redactedToolUseID: context.toolUseID,
      };
    }

    // 逆向: case "handoff":
    // Logs info. In amp, calls T.executeHandoff(R.action.goal).
    // Flitter logs but does not implement handoff yet.
    // Returns {abortOp: false}.
    case "handoff": {
      log.info("Handoff hook triggered", {
        hookID: hookResult.hookID,
        goal: hookResult.action.goal,
      });
      return { abortOp: false };
    }

    default:
      return { abortOp: false };
  }
}
