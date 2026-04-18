/**
 * Declarative hook matcher: filter and match hooks from the new config format
 *
 * 逆向:
 * - LWT (1190_unknown_LWT.js) — filterValidHooks: checks compatibilityDate === "2025-05-13"
 *   and validates action/event combos via b7R
 * - u7R (1191_unknown_u7R.js) — matchPreExecuteHook: iterates hooks for "tool:pre-execute",
 *   checks tool name match and input.contains, returns {hookID, action} or {action: null}
 * - y7R (1192_unknown_y7R.js) — matchPostExecuteHook: iterates hooks for "tool:post-execute",
 *   checks tool name match, returns {hookID, action} or {action: null}
 * - b7R (chunk-002.js:18773-18776) — validation: redact-tool-input only with post-execute,
 *   send-user-message only with pre-execute
 */

import { createLogger } from "@flitter/util";

const log = createLogger("hook-matcher");

// ─── Declarative Hook types ────────────────────────────────

/**
 * Declarative hook action
 * 逆向: a.action in u7R/y7R — has type, message (for send-user-message),
 * redactedInput (for redact-tool-input), goal (for handoff)
 */
export interface DeclarativeHookAction {
  type: "send-user-message" | "redact-tool-input" | "handoff";
  message?: string;
  redactedInput?: Record<string, unknown>;
  goal?: string;
}

/**
 * Declarative hook "on" specifier
 * 逆向: a.on in u7R/y7R — has event, tool (string | string[]),
 * "input.contains" (string | string[])
 */
export interface DeclarativeHookOn {
  event: "tool:pre-execute" | "tool:post-execute";
  tool: string | string[];
  "input.contains"?: string | string[];
}

/**
 * Declarative hook config entry (new format with compatibilityDate)
 * 逆向: entries in the hooks array, filtered by LWT
 */
export interface DeclarativeHook {
  id: string;
  compatibilityDate: string;
  if?: boolean;
  on: DeclarativeHookOn;
  action: DeclarativeHookAction;
}

/**
 * Result of hook matching
 * 逆向: u7R/y7R return {hookID, action} or {action: null}
 */
export interface HookMatchResult {
  hookID?: string;
  action: DeclarativeHookAction | null;
}

// ─── b7R — validate action/event combos ────────────────────

/**
 * Validate that a hook's action type is compatible with its event type.
 * 逆向: b7R (chunk-002.js:18773-18776)
 *
 * - redact-tool-input can only be used with tool:post-execute
 * - send-user-message can only be used with tool:pre-execute
 *
 * @returns error message string if invalid, null if valid
 */
function validateHookActionEvent(hook: DeclarativeHook): string | null {
  if (hook.action.type === "redact-tool-input" && hook.on.event !== "tool:post-execute") {
    return "redact-tool-input action can only be used with tool:post-execute event";
  }
  if (hook.action.type === "send-user-message" && hook.on.event !== "tool:pre-execute") {
    return "send-user-message action can only be used with tool:pre-execute event";
  }
  return null;
}

// ─── LWT — filterValidHooks ────────────────────────────────

/**
 * Filter hooks to only those with compatibilityDate === "2025-05-13" and valid action/event combos.
 * 逆向: LWT (1190_unknown_LWT.js)
 *
 * @param hooks - Raw hooks array from config
 * @returns Array of valid DeclarativeHook entries
 */
export function filterValidHooks(hooks: unknown): DeclarativeHook[] {
  if (!hooks || !Array.isArray(hooks)) return [];

  return hooks.filter((hook: DeclarativeHook) => {
    if (hook.compatibilityDate !== "2025-05-13") return false;

    const err = validateHookActionEvent(hook);
    if (err) {
      log.warn(`Hook "${hook.id}" is invalid: ${err}`);
      return false;
    }

    return true;
  });
}

// ─── u7R — matchPreExecuteHook ─────────────────────────────

/**
 * Match a pre-execute hook against the current tool invocation.
 * 逆向: u7R (1191_unknown_u7R.js)
 *
 * Algorithm:
 * 1. filterValidHooks(hooks)
 * 2. For each hook where if !== false and on.event === "tool:pre-execute":
 *    a. Check if tool name matches on.tool (string or string[])
 *    b. JSON.stringify the input, check if it includes any of on["input.contains"]
 *    c. If match found and action.type === "send-user-message", return {hookID, action}
 * 3. Return {action: null} if no match
 *
 * @param hooks - Raw hooks array from config
 * @param context - { toolName, toolInput }
 */
export function matchPreExecuteHook(
  hooks: unknown,
  context: { toolName: string; toolInput: Record<string, unknown> },
): HookMatchResult {
  if (!hooks) return { action: null };

  const validHooks = filterValidHooks(hooks);

  for (const hook of validHooks) {
    // 逆向: if (a.if === !1) continue;
    if (hook.if === false) continue;

    if (hook.on.event !== "tool:pre-execute") continue;

    // 逆向: (Array.isArray(a.on.tool) ? a.on.tool : [a.on.tool]).includes(R.toolUse.name)
    const toolNames = Array.isArray(hook.on.tool) ? hook.on.tool : [hook.on.tool];
    if (!toolNames.includes(context.toolName)) continue;

    // 逆向: let e = JSON.stringify(R.toolUse.input),
    //        t = Array.isArray(a.on["input.contains"]) ? a.on["input.contains"] : [a.on["input.contains"]];
    const inputStr = JSON.stringify(context.toolInput);
    const inputContains = hook.on["input.contains"];
    const patterns = Array.isArray(inputContains) ? inputContains : [inputContains];

    for (const pattern of patterns) {
      if (pattern !== undefined && inputStr.includes(pattern)) {
        log.debug(`Hook triggered: ${hook.id}`, {
          hookID: hook.id,
          toolName: context.toolName,
          matchString: pattern,
          action: hook.action,
        });

        // 逆向: if (a.action.type === "send-user-message") return { hookID: a.id, action: a.action };
        if (hook.action.type === "send-user-message") {
          return { hookID: hook.id, action: hook.action };
        }
      }
    }
  }

  return { action: null };
}

// ─── y7R — matchPostExecuteHook ────────────────────────────

/**
 * Match a post-execute hook against the current tool invocation.
 * 逆向: y7R (1192_unknown_y7R.js)
 *
 * Algorithm:
 * 1. filterValidHooks(hooks)
 * 2. For each hook where if !== false and on.event === "tool:post-execute":
 *    a. Check if tool name matches on.tool
 *    b. If action.type === "redact-tool-input", return {hookID, action}
 * 3. Return {action: null} if no match
 *
 * @param hooks - Raw hooks array from config
 * @param context - { toolName }
 */
export function matchPostExecuteHook(
  hooks: unknown,
  context: { toolName: string },
): HookMatchResult {
  if (!hooks) return { action: null };

  const validHooks = filterValidHooks(hooks);

  for (const hook of validHooks) {
    // 逆向: if (a.if === !1) continue;
    if (hook.if === false) continue;

    if (hook.on.event !== "tool:post-execute") continue;

    // 逆向: (Array.isArray(a.on.tool) ? a.on.tool : [a.on.tool]).includes(R.toolUse.name)
    const toolNames = Array.isArray(hook.on.tool) ? hook.on.tool : [hook.on.tool];
    if (!toolNames.includes(context.toolName)) continue;

    log.debug(`Post-execution hook triggered: ${hook.id}`, {
      hookID: hook.id,
      toolName: context.toolName,
      action: hook.action,
    });

    // 逆向: if (a.action.type === "redact-tool-input") return { hookID: a.id, action: a.action };
    if (hook.action.type === "redact-tool-input") {
      return { hookID: hook.id, action: hook.action };
    }
  }

  return { action: null };
}
