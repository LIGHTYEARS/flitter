/**
 * Admin/config hook matcher — filterValidHooks, matchPreExecuteHook, matchPostExecuteHook
 *
 * These handle the structured hook configs from admin settings (not the shell-based
 * PreToolUse/PostToolUse hooks in subagent/hooks.ts which are a different system).
 *
 * 逆向:
 *   LWT  (1190_unknown_LWT.js) — filterValidHooks: validates compatibilityDate + action/event pairing
 *   b7R  (1189_unknown_b7R.js) — validateHook: checks action.type ↔ on.event compatibility
 *   u7R  (1191_unknown_u7R.js) — matchPreExecuteHook: matches tool:pre-execute hooks with input.contains
 *   y7R  (1192_unknown_y7R.js) — matchPostExecuteHook: matches tool:post-execute hooks
 */

// ─── Admin Hook Config Types ──────────────────────────────

/**
 * Structured admin hook action.
 *
 * 逆向: BI (1194_UseID_BI.js) processes these action types:
 *   - send-user-message: injects a user message
 *   - redact-tool-input: replaces tool input with redactedInput
 *   - handoff: triggers handoff with goal
 */
export interface AdminHookAction {
  type: "send-user-message" | "redact-tool-input" | "handoff";
  message?: string;
  goal?: string;
  redactedInput?: Record<string, unknown>;
}

/**
 * Structured admin hook "on" condition.
 *
 * 逆向: u7R/y7R — on.event is "tool:pre-execute" or "tool:post-execute",
 *   on.tool is string | string[], on["input.contains"] is string | string[]
 */
export interface AdminHookOn {
  event: "tool:pre-execute" | "tool:post-execute";
  tool: string | string[];
  "input.contains"?: string | string[];
}

/**
 * A single structured admin hook config entry.
 *
 * 逆向: LWT — requires compatibilityDate === "2025-05-13",
 *   validated by b7R for action/event compatibility.
 */
export interface AdminHookConfig {
  id: string;
  compatibilityDate: string;
  on: AdminHookOn;
  action: AdminHookAction;
  /** When false, the hook is skipped. 逆向: u7R/y7R check `a.if === !1` */
  if?: boolean;
}

// ─── Hook Match Result ────────────────────────────────────

export interface HookMatchResult {
  hookID?: string;
  action: AdminHookAction | null;
}

// ─── Pre-execute Match Context ────────────────────────────

export interface PreExecuteContext {
  threadID: string;
  toolUse: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
}

// ─── Post-execute Match Context ───────────────────────────

export interface PostExecuteContext {
  threadID: string;
  toolUse: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
}

// ─── Required compatibility date ──────────────────────────

const REQUIRED_COMPATIBILITY_DATE = "2025-05-13";

// ─── validateHook (b7R) ───────────────────────────────────

/**
 * Validate that action.type and on.event are compatible.
 * Returns an error message string if invalid, null if valid.
 *
 * 逆向: b7R (1189_unknown_b7R.js)
 *   - redact-tool-input requires tool:post-execute
 *   - send-user-message requires tool:pre-execute
 */
function validateHook(hook: AdminHookConfig): string | null {
  if (
    hook.action.type === "redact-tool-input" &&
    hook.on.event !== "tool:post-execute"
  ) {
    return "redact-tool-input action can only be used with tool:post-execute event";
  }
  if (
    hook.action.type === "send-user-message" &&
    hook.on.event !== "tool:pre-execute"
  ) {
    return "send-user-message action can only be used with tool:pre-execute event";
  }
  return null;
}

// ─── filterValidHooks (LWT) ──────────────────────────────

/**
 * Filter hooks to only those that are valid:
 *   1. Must have compatibilityDate === "2025-05-13"
 *   2. Must pass action/event validation (b7R)
 *
 * Invalid hooks are silently dropped (with warning log in amp).
 *
 * 逆向: LWT (1190_unknown_LWT.js)
 *   if (!T || !Array.isArray(T)) return [];
 *   return T.filter(R => {
 *     if (R.compatibilityDate !== "2025-05-13") return false;
 *     let a = b7R(R);
 *     if (a) return warn(...), false;
 *     return true;
 *   });
 */
export function filterValidHooks(
  hooks: AdminHookConfig[] | null | undefined,
): AdminHookConfig[] {
  if (!hooks || !Array.isArray(hooks)) return [];

  return hooks.filter((hook) => {
    // 逆向: R.compatibilityDate !== "2025-05-13" → silently drop
    if (hook.compatibilityDate !== REQUIRED_COMPATIBILITY_DATE) return false;

    // 逆向: b7R(R) — validate action/event pairing
    const validationError = validateHook(hook);
    if (validationError) {
      // In amp: J.warn(`Hook "${R.id}" is invalid: ${a}`)
      // We silently drop — caller can add logging if needed
      return false;
    }

    return true;
  });
}

// ─── matchPreExecuteHook (u7R) ────────────────────────────

/**
 * Match pre-execute hooks against a tool use context.
 * Returns the first matching hook's action, or { action: null }.
 *
 * 逆向: u7R (1191_unknown_u7R.js)
 *   1. Filter valid hooks via LWT
 *   2. Skip hooks with if === false
 *   3. Match on.event === "tool:pre-execute"
 *   4. Match on.tool includes toolUse.name
 *   5. Match on["input.contains"] — JSON.stringify(input).includes(pattern)
 *   6. Only "send-user-message" action type triggers a match
 */
export function matchPreExecuteHook(
  hooks: AdminHookConfig[] | null | undefined,
  context: PreExecuteContext,
): HookMatchResult {
  if (!hooks) return { action: null };

  const validHooks = filterValidHooks(hooks);

  for (const hook of validHooks) {
    // 逆向: if (a.if === !1) continue
    if (hook.if === false) continue;

    if (hook.on.event === "tool:pre-execute") {
      // 逆向: (Array.isArray(a.on.tool) ? a.on.tool : [a.on.tool]).includes(R.toolUse.name)
      const tools = Array.isArray(hook.on.tool)
        ? hook.on.tool
        : [hook.on.tool];
      if (!tools.includes(context.toolUse.name)) continue;

      // 逆向: JSON.stringify(R.toolUse.input) then check input.contains
      const inputJson = JSON.stringify(context.toolUse.input);
      const patterns = Array.isArray(hook.on["input.contains"])
        ? hook.on["input.contains"]
        : [hook.on["input.contains"]];

      for (const pattern of patterns) {
        if (pattern !== undefined && inputJson.includes(pattern)) {
          // 逆向: only send-user-message triggers a match for pre-execute
          if (hook.action.type === "send-user-message") {
            return { hookID: hook.id, action: hook.action };
          }
        }
      }
    }
  }

  return { action: null };
}

// ─── matchPostExecuteHook (y7R) ───────────────────────────

/**
 * Match post-execute hooks against a tool use context.
 * Returns the first matching hook's action, or { action: null }.
 *
 * 逆向: y7R (1192_unknown_y7R.js)
 *   1. Filter valid hooks via LWT
 *   2. Skip hooks with if === false
 *   3. Match on.event === "tool:post-execute"
 *   4. Match on.tool includes toolUse.name
 *   5. Only "redact-tool-input" action type triggers a match
 */
export function matchPostExecuteHook(
  hooks: AdminHookConfig[] | null | undefined,
  context: PostExecuteContext,
): HookMatchResult {
  if (!hooks) return { action: null };

  const validHooks = filterValidHooks(hooks);

  for (const hook of validHooks) {
    // 逆向: if (a.if === !1) continue
    if (hook.if === false) continue;

    if (hook.on.event === "tool:post-execute") {
      // 逆向: (Array.isArray(a.on.tool) ? a.on.tool : [a.on.tool]).includes(R.toolUse.name)
      const tools = Array.isArray(hook.on.tool)
        ? hook.on.tool
        : [hook.on.tool];
      if (!tools.includes(context.toolUse.name)) continue;

      // 逆向: only redact-tool-input triggers a match for post-execute
      if (hook.action.type === "redact-tool-input") {
        return { hookID: hook.id, action: hook.action };
      }
    }
  }

  return { action: null };
}
