# Gap 3: Agent Mode Selection

> Implementation plan for the smart/deep/auto/fast agent mode system.

## Overview

Amp supports 4+ agent modes that control model selection, reasoning effort, tool availability, and system prompt behavior. Flitter currently has no mode system — it always uses whatever model is configured.

## Amp Reference

**Mode definitions:** `chunk-005.js:67177` — `Ab` object with `key`, `displayName`, `description`, `primaryModel`, `includeTools`, `deferredTools`, `visible`, `reasoningEffort`.

**Mode → model mapping:** `chunk-001.js:6163` — `nk(mode)` returns the model for a mode.

**Reasoning effort resolver:** `chunk-002.js:18124` — `t7R(modelId, settings, agentMode)` computes effort per provider.

**Mode-specific tool lists:** `chunk-005.js:67167` — `UW` (full), `$iT` (minimal), `SiT`/`OiT` (deep-mode).

## Design

### Mode Definitions

**New file:** `packages/agent-core/src/modes/agent-modes.ts`

```typescript
export type AgentMode = "smart" | "fast" | "deep" | "auto";

export interface AgentModeSpec {
  key: AgentMode;
  displayName: string;
  description: string;
  primaryModel: string;
  reasoningEffort?: "low" | "medium" | "high" | "max";
  includeTools: string[];   // tool name allowlist (empty = all)
  deferredTools: string[];  // loaded lazily via skill tool
}

export const AGENT_MODES: Record<AgentMode, AgentModeSpec> = {
  smart: {
    key: "smart",
    displayName: "Smart",
    description: "Balanced mode using Claude Opus for complex tasks",
    primaryModel: "claude-opus-4-6",
    includeTools: [],  // all tools
    deferredTools: ["code_review", "code_tour"],
  },
  fast: {
    key: "fast",
    displayName: "Fast",
    description: "Quick responses using Claude Haiku",
    primaryModel: "claude-haiku-4-5-20251001",
    includeTools: [],  // all tools, smaller model
    deferredTools: [],
  },
  deep: {
    key: "deep",
    displayName: "Deep",
    description: "Extended reasoning for complex problems",
    primaryModel: "claude-opus-4-6",
    reasoningEffort: "high",
    includeTools: [],
    deferredTools: [],
  },
  auto: {
    key: "auto",
    displayName: "Auto",
    description: "Automatically selects mode based on task complexity",
    primaryModel: "claude-sonnet-4-6",  // start with Sonnet, escalate if needed
    includeTools: [],
    deferredTools: [],
  },
};
```

**Amp ref mode→model mapping:**
| Mode | Amp model | Flitter model |
|---|---|---|
| smart | `claude-opus-4-6` | `claude-opus-4-6` |
| rush/fast | `claude-haiku-4-5-20251001` | `claude-haiku-4-5-20251001` |
| deep | `gpt-5.4` (reasoning) | `claude-opus-4-6` (with high effort) |
| auto | varies | `claude-sonnet-4-6` (default) |

### Reasoning Effort Resolution

**New file:** `packages/agent-core/src/modes/reasoning-effort.ts`

```typescript
export type ReasoningEffort = "low" | "medium" | "high" | "max";

export function resolveReasoningEffort(
  modelId: string,
  settings: Settings,
  agentMode?: AgentMode,
): ReasoningEffort | undefined {
  const provider = modelId.split("/")[0] || inferProvider(modelId);
  const modeSpec = agentMode ? AGENT_MODES[agentMode] : undefined;
  const modeEffort = modeSpec?.reasoningEffort;

  switch (provider) {
    case "anthropic":
      return settings["anthropic.effort"] ?? modeEffort ?? undefined;
    case "openai":
      return settings["agent.deepReasoningEffort"] ?? modeEffort ?? "medium";
    case "google":
      return settings["gemini.thinkingLevel"] ?? modeEffort ?? "medium";
    default:
      return modeEffort ?? undefined;
  }
}
```

**Amp ref:** `chunk-002.js:18124` — `t7R()` resolves per-provider with fallback chain.

### Settings Changes

**File:** `packages/schemas/src/config.ts`

Add new settings:
```typescript
"agent.mode": z.enum(["smart", "fast", "deep", "auto"]).optional(),
"agent.deepReasoningEffort": z.enum(["medium", "high", "xhigh"]).optional(),
"anthropic.effort": z.enum(["low", "medium", "high", "max"]).optional(),
"anthropic.interleavedThinking.enabled": z.boolean().optional(),
"anthropic.speed": z.enum(["normal", "fast"]).optional(),
"gemini.thinkingLevel": z.enum(["low", "medium", "high"]).optional(),
```

### CLI Flag

**File:** `packages/cli/src/program.ts`

Add `--mode <mode>` global option:
```typescript
program.option("--mode <mode>", "agent mode: smart, fast, deep, auto")
```

### Thread-Level Mode

Each thread stores its mode:
```typescript
// packages/schemas/src/thread.ts
interface ThreadSnapshot {
  // ... existing fields
  agentMode?: AgentMode;
}
```

Mode is set at thread creation time from CLI flag or settings default, and persists for the thread lifetime.

### Integration with LLM Provider

**File:** `packages/llm/src/providers/anthropic.ts`

When mode specifies reasoning effort:
1. If effort is set and model supports thinking: add `thinking: { type: "enabled", budget_tokens: N }` to request
2. If `anthropic.interleavedThinking.enabled`: add `interleaved-thinking-2025-05-14` beta header
3. If `anthropic.speed === "fast"`: add `fast-mode-2026-02-01` beta header

Budget tokens by effort:
- `low`: 5000
- `medium`: 10000
- `high`: 32000
- `max`: 100000

**Amp ref:** `chunk-002.js:2584` — `jwT()` computes budget from heuristics; EAP models use `output_config.effort`.

### Integration with ThreadWorker

**File:** `packages/agent-core/src/worker/thread-worker.ts`

At inference time:
1. Look up mode: `this.thread.agentMode ?? settings["agent.mode"] ?? "smart"`
2. Resolve model: `AGENT_MODES[mode].primaryModel` (overridden by `--model` flag or `internal.model` setting)
3. Resolve reasoning effort: `resolveReasoningEffort(modelId, settings, mode)`
4. Pass effort to LLM provider in request options

### Mode Switching (TUI)

**File:** `packages/cli/src/commands/slash-handlers.ts`

Enhance `/model` slash command to support mode switching:
```
/mode smart    — switch to Smart mode
/mode fast     — switch to Fast mode  
/mode deep     — switch to Deep mode
```

Or register a new `/mode` slash command.

---

## Implementation Tasks

### Task 1: Define mode types and specs
- Create `packages/agent-core/src/modes/agent-modes.ts`
- Create `packages/agent-core/src/modes/reasoning-effort.ts`
- Export from `packages/agent-core/src/modes/index.ts`

### Task 2: Add config settings
- Add `agent.mode`, `agent.deepReasoningEffort`, `anthropic.effort`, `anthropic.interleavedThinking.enabled`, `anthropic.speed`, `gemini.thinkingLevel` to `packages/schemas/src/config.ts`

### Task 3: Wire mode into ThreadWorker
- At inference start, resolve mode → model + effort
- Pass to LLM provider

### Task 4: Wire mode into LLM providers
- Anthropic: thinking config, beta headers
- OpenAI: reasoning effort parameter
- Gemini: thinking level parameter

### Task 5: Add CLI flag
- `--mode <mode>` global option
- Pass through CliContext to thread creation

### Task 6: Add `/mode` slash command
- Register in slash-handlers.ts
- Switch thread's agentMode, re-resolve model

### Task 7: Tests
- Unit test mode resolution logic
- Unit test reasoning effort resolver
- Integration test: mode flag → correct model in LLM request

---

## Estimated Scope

| Task | Files | Complexity |
|---|---|---|
| Mode definitions | 2 new | Low |
| Config settings | 1 modified | Low |
| ThreadWorker integration | 1 modified | Medium |
| LLM provider changes | 3-4 modified | Medium |
| CLI flag | 2 modified | Low |
| Slash command | 1 modified | Low |
| Tests | 3-4 new | Medium |
