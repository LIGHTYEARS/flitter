# Gap 7: Hooks Enhancements

> Implementation plan for missing hook features: compatibilityDate, new actions, and lifecycle hooks.

## Overview

Flitter already supports hooks in two formats (legacy object and declarative array). The gaps are:
1. `compatibilityDate` validation (required for hooks to activate)
2. `redact-tool-input` post-execute action
3. `send-user-message` pre-execute action (already partially implemented in `hook-applicator.ts`)
4. Internal lifecycle hooks: `onTaskCompleted`, `onAssistantTurnEnd`, `onInferenceCompleted`

## Amp Reference

| Feature | File | Key function |
|---|---|---|
| `compatibilityDate` validation | `modules/1190_unknown_LWT.js` | `LWT()` — filters by `"2025-05-13"` |
| Hook validation | `modules/1189_unknown_b7R.js` | `b7R()` — action/event pairing rules |
| `send-user-message` pre-hook | `modules/1191_unknown_u7R.js` | `u7R()` — matches tool name + input.contains |
| `redact-tool-input` post-hook | `modules/1192_unknown_y7R.js` | `y7R()` — matches tool name only |
| Hook action dispatcher | `modules/1194_UseID_BI.js` | `BI()` — three action types |
| Lifecycle hooks | `modules/1244_ThreadWorker_ov.js:486,664,668` | `onTaskCompleted`, `onAssistantTurnEnd`, `onInferenceCompleted` |

## Current Flitter State

**`packages/agent-core/src/subagent/hook-applicator.ts`** already handles:
- `null` → no-op
- `"send-user-message"` → `{ abortOp: true, userMessage, hookID }`
- `"redact-tool-input"` → `{ abortOp: false, redactedInput, redactedToolUseID }`
- `"handoff"` → logged but not implemented

**`packages/agent-core/src/subagent/hooks.ts`** handles legacy format only.

**`packages/agent-core/src/subagent/hook-matcher.ts`** — likely handles declarative format matching.

---

## Implementation Tasks

### Task 1: `compatibilityDate` validation

**File:** `packages/agent-core/src/subagent/hook-validator.ts` (new)

```typescript
export const REQUIRED_COMPATIBILITY_DATE = "2025-05-13";

export interface DeclarativeHook {
  compatibilityDate?: string;
  on: { event: "tool:pre-execute" | "tool:post-execute"; tool?: string | string[]; "input.contains"?: string[] };
  action: { type: string; message?: string; redactedInput?: Record<string, unknown>; goal?: string };
}

export function validateHook(hook: DeclarativeHook): string | null {
  // 1. Check compatibilityDate
  if (hook.compatibilityDate !== REQUIRED_COMPATIBILITY_DATE) {
    return `Hook requires compatibilityDate "${REQUIRED_COMPATIBILITY_DATE}", got "${hook.compatibilityDate}"`;
  }

  // 2. Check action/event pairing (amp's b7R rules)
  if (hook.action.type === "redact-tool-input" && hook.on.event !== "tool:post-execute") {
    return "redact-tool-input action can only be used with tool:post-execute event";
  }
  if (hook.action.type === "send-user-message" && hook.on.event !== "tool:pre-execute") {
    return "send-user-message action can only be used with tool:pre-execute event";
  }

  return null; // valid
}

export function filterValidHooks(hooks: DeclarativeHook[]): DeclarativeHook[] {
  return hooks.filter(hook => {
    const error = validateHook(hook);
    if (error) {
      logger.warn(`Skipping invalid hook: ${error}`);
      return false;
    }
    return true;
  });
}
```

**Amp ref:** `modules/1190_unknown_LWT.js` — `LWT()` silently drops hooks with wrong date.

### Task 2: Wire validation into hook processing

**File:** `packages/flitter/src/container.ts`

In `createThreadWorker`, when processing declarative hooks:
```typescript
// Before matching hooks
const validHooks = filterValidHooks(hooks);
const preHook = matchPreExecuteHook(validHooks, { toolName, input });
```

### Task 3: Pre-execute matching with `input.contains`

**File:** `packages/agent-core/src/subagent/hook-matcher.ts`

Ensure the pre-execute hook matching checks `input.contains`:

```typescript
export function matchPreExecuteHook(
  hooks: DeclarativeHook[],
  context: { toolName: string; input: Record<string, unknown> },
): { hookID: string; action: DeclarativeHook["action"] } | null {
  const inputStr = JSON.stringify(context.input);

  for (const hook of hooks) {
    if (hook.on.event !== "tool:pre-execute") continue;

    // Match tool name
    const tools = Array.isArray(hook.on.tool) ? hook.on.tool : hook.on.tool ? [hook.on.tool] : [];
    if (tools.length > 0 && !tools.includes(context.toolName)) continue;

    // Match input.contains (all strings must be present)
    if (hook.on["input.contains"]) {
      const allMatch = hook.on["input.contains"].every(s => inputStr.includes(s));
      if (!allMatch) continue;
    }

    return { hookID: hook.compatibilityDate ?? "unknown", action: hook.action };
  }
  return null;
}
```

**Amp ref:** `modules/1191_unknown_u7R.js` — `u7R()` checks tool name AND serialized input contains.

### Task 4: Post-execute matching

```typescript
export function matchPostExecuteHook(
  hooks: DeclarativeHook[],
  context: { toolName: string },
): { hookID: string; action: DeclarativeHook["action"] } | null {
  for (const hook of hooks) {
    if (hook.on.event !== "tool:post-execute") continue;

    const tools = Array.isArray(hook.on.tool) ? hook.on.tool : hook.on.tool ? [hook.on.tool] : [];
    if (tools.length > 0 && !tools.includes(context.toolName)) continue;

    return { hookID: hook.compatibilityDate ?? "unknown", action: hook.action };
  }
  return null;
}
```

**Amp ref:** `modules/1192_unknown_y7R.js` — `y7R()` matches tool name only (no input check for post hooks).

### Task 5: Wire `redact-tool-input` into orchestrator

**File:** `packages/agent-core/src/tools/orchestrator.ts`

After tool execution, in `applyPostHookResult`:
```typescript
if (hookResult.redactedInput) {
  // Replace the original tool input in the thread with redacted version
  await this.callbacks.updateThread({
    type: "tool:redact",
    toolUseId,
    redactedInput: hookResult.redactedInput,
  });
}
```

The thread update replaces the `tool_use` content block's `input` field with `redactedInput`, hiding sensitive information from the conversation history.

### Task 6: Wire `send-user-message` into orchestrator

Already partially done. Verify that when `applyHookResult` returns `{ abortOp: true, userMessage }`:
1. The tool execution is aborted
2. A user message is injected into the thread
3. The inference loop re-runs with the injected message

**File:** `packages/agent-core/src/tools/orchestrator.ts` and `packages/agent-core/src/worker/thread-worker.ts`

### Task 7: Internal lifecycle hooks

**New file:** `packages/agent-core/src/hooks/lifecycle-hooks.ts`

```typescript
export interface InternalHooks {
  onTaskCompleted?: (context: {
    thread: ThreadSnapshot;
    completedTask: { id: string; title: string };
    nextTask?: { id: string; title: string };
  }) => Promise<HookActionResult | null>;

  onAssistantTurnEnd?: (context: {
    thread: ThreadSnapshot;
  }) => Promise<HookActionResult | null>;

  onInferenceCompleted?: (context: {
    thread: ThreadSnapshot;
    usage: { totalInputTokens: number; maxInputTokens: number };
    isIdle: boolean;
  }) => Promise<HookActionResult | null>;
}
```

**Wire into ThreadWorker:**

In the inference completion handler:
```typescript
// After stopReason === "end_turn" and no queued messages:
if (this.deps.internalHooks?.onAssistantTurnEnd) {
  const result = await this.deps.internalHooks.onAssistantTurnEnd({ thread });
  if (result) await applyHookAction(result);
}

if (this.deps.internalHooks?.onInferenceCompleted) {
  const result = await this.deps.internalHooks.onInferenceCompleted({
    thread,
    usage: { totalInputTokens: this.tokenCount, maxInputTokens: this.maxTokens },
    isIdle: true,
  });
  if (result) await applyHookAction(result);
}
```

In the Task tool result handler:
```typescript
if (result.nextTask && this.deps.internalHooks?.onTaskCompleted) {
  const result = await this.deps.internalHooks.onTaskCompleted({
    thread, completedTask, nextTask: result.nextTask
  });
  if (result) await applyHookAction(result);
}
```

**Amp ref:** `modules/1244_ThreadWorker_ov.js:486,664,668` — all three hooks called in thread worker.

### Task 8: Hook config schema

**File:** `packages/schemas/src/config.ts`

Add a proper schema for the declarative hook format (currently `Record<string, unknown>`):

```typescript
const DeclarativeHookSchema = z.object({
  compatibilityDate: z.string(),
  on: z.object({
    event: z.enum(["tool:pre-execute", "tool:post-execute"]),
    tool: z.union([z.string(), z.array(z.string())]).optional(),
    "input.contains": z.array(z.string()).optional(),
  }),
  action: z.object({
    type: z.enum(["allow", "deny", "send-user-message", "redact-tool-input", "handoff"]),
    message: z.string().optional(),
    redactedInput: z.record(z.unknown()).optional(),
    goal: z.string().optional(),
  }),
});
```

### Task 9: Tests

- **Validation:** Hook with wrong/missing compatibilityDate is rejected
- **Validation:** `redact-tool-input` with `tool:pre-execute` is rejected
- **Validation:** `send-user-message` with `tool:post-execute` is rejected
- **Pre-execute matching:** Tool name match + input.contains match
- **Post-execute matching:** Tool name match only
- **send-user-message:** Tool aborted, user message injected
- **redact-tool-input:** Tool runs, thread input replaced
- **Lifecycle:** onAssistantTurnEnd called at end_turn with no queued messages

---

## Estimated Scope

| Task | Files | Complexity |
|---|---|---|
| Hook validator | 1 new | Low |
| Wire validation | 1 modified | Low |
| Pre-execute matching | 1 modified | Medium |
| Post-execute matching | 1 modified | Low |
| Wire redact-tool-input | 1 modified | Medium |
| Wire send-user-message | 2 modified | Medium |
| Lifecycle hooks | 1 new + 1 modified | Medium |
| Hook schema | 1 modified | Low |
| Tests | 2-3 new | Medium |
