# Title Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate thread titles from the first user message via a separate LLM call, matching amp's `triggerTitleGeneration` / `generateThreadTitle` pattern. After the first assistant response, fire a background title generation call using a fast model (Haiku), then update the thread snapshot with the title.

**Architecture:** Amp's title generation works in two layers:
1. `ThreadWorker.triggerTitleGeneration()` (`1244_ThreadWorker_ov.js:750-793`) checks preconditions (no mainThreadID, no existing title), finds the first eligible user message, then calls `generateThreadTitle()` with an AbortController.
2. `generateThreadTitle(message, threadId, configService, signal)` (`1344_unknown_tzT.js`) extracts text from the user message, calls the Anthropic API with a system prompt and `set_title` tool, then returns `{ title, usage }`.

The LLM call uses `mb = n8.CLAUDE_HAIKU_4_5.name` (a fast/cheap model), `max_tokens: 60`, `temperature: 0.7`, and forces tool use of `set_title` which returns `{ title: string }`. The system prompt asks for a max-5-word "Sentence case" title.

Flitter reuses the existing `@flitter/llm` provider infrastructure. The title generator creates a one-shot (non-streaming) Anthropic call using `claude-haiku-3-5-20241022`.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/llm` (provider), `@flitter/agent-core` (ThreadWorker), `@flitter/schemas` (ThreadSnapshot)

**Amp reference:**
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:750-793` -- `triggerTitleGeneration()`: checks preconditions, finds first user message, calls generateThreadTitle
- `amp-cli-reversed/modules/1344_unknown_tzT.js` -- `generateThreadTitle()`: system prompt, set_title tool, model=mb (Haiku 4.5), max_tokens=60, temperature=0.7
- `amp-cli-reversed/chunk-005.js:89642` -- `mb = n8.CLAUDE_HAIKU_4_5.name`
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:268` -- called after `trackFilesFromHistory()` on inference start
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:878` -- called again after agent turn completion

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/agent-core/src/title/generate-title.ts` | generateThreadTitle utility |
| Create | `packages/agent-core/src/title/__tests__/generate-title.test.ts` | Unit tests |
| Modify | `packages/agent-core/src/worker/thread-worker.ts` | Wire triggerTitleGeneration after first response |
| Modify | `packages/agent-core/src/index.ts` | Export generateThreadTitle |

---

### Task 1: Create generateThreadTitle utility

**Why first:** This is the core LLM call. The wiring in ThreadWorker depends on it.

**Files:**
- Create: `packages/agent-core/src/title/generate-title.ts`
- Create: `packages/agent-core/src/title/__tests__/generate-title.test.ts`

**Amp reference:** `amp-cli-reversed/modules/1344_unknown_tzT.js` -- full implementation:
- Extracts text from user message content via `kr()` (text extraction helper)
- Returns early if no text (`{ title: undefined, usage: undefined }`)
- Calls `messages.create()` with:
  - `model: mb` (CLAUDE_HAIKU_4_5)
  - `max_tokens: 60`
  - `temperature: 0.7`
  - System prompt: "You are an assistant that generates short, descriptive titles (maximum 5 words, "Sentence case"...)..."
  - `messages: [{ role: "user", content: "<message>${text}</message>" }]`
  - `tools: [{ name: "set_title", input_schema: { type: "object", properties: { title: { type: "string", ... } }, required: ["title"] } }]`
  - `tool_choice: { type: "tool", name: "set_title", disable_parallel_tool_use: true }`
  - `stream: false`
- Extracts `title` from the tool_use response block

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/title/__tests__/generate-title.test.ts
import { describe, expect, it, mock } from "bun:test";
import {
  generateThreadTitle,
  extractTextFromContent,
  TITLE_SYSTEM_PROMPT,
  TITLE_TOOL_DEFINITION,
} from "../generate-title";

describe("extractTextFromContent", () => {
  it("extracts text from text content blocks", () => {
    const content = [
      { type: "text", text: "Hello world" },
      { type: "text", text: " and more" },
    ];
    expect(extractTextFromContent(content)).toBe("Hello world and more");
  });

  it("returns empty string for non-text content", () => {
    const content = [{ type: "image", source: {} }];
    expect(extractTextFromContent(content)).toBe("");
  });

  it("returns empty string for empty content", () => {
    expect(extractTextFromContent([])).toBe("");
  });
});

describe("TITLE_SYSTEM_PROMPT", () => {
  it("contains key instructions", () => {
    expect(TITLE_SYSTEM_PROMPT).toContain("maximum 5 words");
    expect(TITLE_SYSTEM_PROMPT).toContain("Sentence case");
    expect(TITLE_SYSTEM_PROMPT).toContain("set_title");
  });
});

describe("TITLE_TOOL_DEFINITION", () => {
  it("has correct shape", () => {
    expect(TITLE_TOOL_DEFINITION.name).toBe("set_title");
    expect(TITLE_TOOL_DEFINITION.inputSchema.properties.title).toBeDefined();
    expect(TITLE_TOOL_DEFINITION.inputSchema.required).toContain("title");
  });
});

describe("generateThreadTitle", () => {
  it("returns undefined title for empty content", async () => {
    const result = await generateThreadTitle({
      messageContent: [],
      provider: null as any,
      signal: AbortSignal.timeout(5000),
    });
    expect(result.title).toBeUndefined();
  });

  it("calls provider and extracts title from tool_use response", async () => {
    const mockProvider = {
      createMessage: mock(async () => ({
        content: [
          {
            type: "tool_use",
            name: "set_title",
            input: { title: "Fix login bug" },
          },
        ],
        usage: { input_tokens: 100, output_tokens: 20 },
      })),
    };

    const result = await generateThreadTitle({
      messageContent: [{ type: "text", text: "Can you fix the login page bug where users get redirected incorrectly?" }],
      provider: mockProvider as any,
      signal: AbortSignal.timeout(5000),
    });

    expect(result.title).toBe("Fix login bug");
    expect(mockProvider.createMessage).toHaveBeenCalledTimes(1);

    // Verify the call used correct parameters
    const callArgs = mockProvider.createMessage.mock.calls[0][0];
    expect(callArgs.model).toContain("haiku");
    expect(callArgs.max_tokens).toBe(60);
  });

  it("returns undefined if response has no tool_use", async () => {
    const mockProvider = {
      createMessage: mock(async () => ({
        content: [{ type: "text", text: "Some text" }],
        usage: { input_tokens: 100, output_tokens: 20 },
      })),
    };

    const result = await generateThreadTitle({
      messageContent: [{ type: "text", text: "Hello" }],
      provider: mockProvider as any,
      signal: AbortSignal.timeout(5000),
    });

    expect(result.title).toBeUndefined();
  });

  it("respects abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const mockProvider = {
      createMessage: mock(async () => {
        throw new DOMException("Aborted", "AbortError");
      }),
    };

    await expect(
      generateThreadTitle({
        messageContent: [{ type: "text", text: "Hello" }],
        provider: mockProvider as any,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/title/__tests__/generate-title.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement generateThreadTitle**

```typescript
// packages/agent-core/src/title/generate-title.ts
/**
 * Thread title generation via LLM call.
 *
 * Uses a fast model (Haiku) with a forced tool call to generate a short
 * (max 5 words) descriptive title from the first user message.
 *
 * 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js (generateThreadTitle)
 *        amp uses mb = n8.CLAUDE_HAIKU_4_5.name, max_tokens: 60, temp: 0.7
 *        with a set_title tool and tool_choice forcing its use.
 */

import { createLogger } from "@flitter/util";

const log = createLogger("title-gen");

/**
 * Model used for title generation.
 *
 * 逆向: amp chunk-005.js:89642 — mb = n8.CLAUDE_HAIKU_4_5.name
 * Haiku is used because it's fast and cheap for this simple task.
 */
export const TITLE_MODEL = "claude-haiku-3-5-20241022";

/**
 * System prompt for title generation.
 *
 * 逆向: amp 1344_unknown_tzT.js:19 — exact system prompt text
 */
export const TITLE_SYSTEM_PROMPT =
  'You are an assistant that generates short, descriptive titles (maximum 5 words, "Sentence case" with the first word capitalized not "Title Case") based on user\'s message to an agentic coding tool. Your titles should be concise (max 5 words) and capture the essence of the query or topic. DO NOT ASSUME OR GUESS the user\'s intent beyond what is in their message. Omit generic words like "question", "request", etc. Be professional and precise. Use common software engineering terms and acronyms if they are helpful. Use the set_title tool to provide your answer.';

/**
 * Tool definition for title extraction.
 *
 * 逆向: amp 1344_unknown_tzT.js:24-35 — set_title tool schema
 */
export const TITLE_TOOL_DEFINITION = {
  name: "set_title",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description:
          'The short thread title (maximum 5 words, "Sentence case" with the first word capitalized not "Title Case") that you generated for the message',
      },
    },
    required: ["title"],
  },
};

/**
 * Extract plain text from message content blocks.
 *
 * 逆向: amp's kr() function extracts text from content array
 */
export function extractTextFromContent(
  content: Array<{ type: string; text?: string }>,
): string {
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text!)
    .join(" ");
}

/**
 * Provider interface for title generation (non-streaming create).
 *
 * This is a subset of the Anthropic SDK messages.create interface.
 * We use a minimal interface to avoid coupling to any specific SDK.
 */
export interface TitleGenerationProvider {
  createMessage(params: {
    model: string;
    max_tokens: number;
    temperature?: number;
    system: string;
    messages: Array<{ role: string; content: string }>;
    tools: Array<{
      name: string;
      input_schema: Record<string, unknown>;
    }>;
    tool_choice: { type: string; name: string; disable_parallel_tool_use?: boolean };
    signal?: AbortSignal;
  }): Promise<{
    content: Array<{
      type: string;
      name?: string;
      input?: Record<string, unknown>;
      text?: string;
    }>;
    usage?: { input_tokens: number; output_tokens: number };
  }>;
}

export interface GenerateTitleOptions {
  /** Content blocks from the first user message */
  messageContent: Array<{ type: string; text?: string }>;
  /** LLM provider for the title generation call */
  provider: TitleGenerationProvider;
  /** Abort signal for cancellation */
  signal: AbortSignal;
}

export interface GenerateTitleResult {
  /** Generated title, or undefined if generation failed/was skipped */
  title: string | undefined;
  /** Token usage from the title generation call */
  usage?: { inputTokens: number; outputTokens: number };
}

/**
 * Generate a thread title from user message content.
 *
 * 逆向: amp 1344_unknown_tzT.js (tzT function, full implementation)
 *
 * Flow:
 * 1. Extract text from content blocks
 * 2. Return early if no text
 * 3. Call LLM with set_title tool (forced)
 * 4. Extract title from tool_use response
 *
 * @param opts - Generation options
 * @returns Title and usage, or undefined title if skipped
 */
export async function generateThreadTitle(
  opts: GenerateTitleOptions,
): Promise<GenerateTitleResult> {
  const text = extractTextFromContent(opts.messageContent);

  if (!text.trim()) {
    log.info("No text to generate title for");
    return { title: undefined };
  }

  // 逆向: amp 1344_unknown_tzT.js:11-50 — messages.create call
  const response = await opts.provider.createMessage({
    model: TITLE_MODEL,
    max_tokens: 60,
    temperature: 0.7,
    system: TITLE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `<message>${text}</message>`,
      },
    ],
    tools: [
      {
        name: TITLE_TOOL_DEFINITION.name,
        input_schema: TITLE_TOOL_DEFINITION.inputSchema as Record<string, unknown>,
      },
    ],
    tool_choice: {
      type: "tool",
      name: "set_title",
      disable_parallel_tool_use: true,
    },
    signal: opts.signal,
  });

  // 逆向: amp 1344_unknown_tzT.js:63-67 — extract title from tool_use block
  const toolBlock = response.content.find(
    (block) => block.type === "tool_use" && block.name === "set_title",
  );

  if (!toolBlock) {
    log.info("No set_title tool_use in response");
    return { title: undefined };
  }

  const title =
    toolBlock.input &&
    typeof toolBlock.input === "object" &&
    "title" in toolBlock.input &&
    typeof toolBlock.input.title === "string"
      ? toolBlock.input.title
      : undefined;

  return {
    title,
    usage: response.usage
      ? {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        }
      : undefined,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/title/__tests__/generate-title.test.ts`
Expected: PASS

- [ ] **Step 5: Export from agent-core index**

In `packages/agent-core/src/index.ts`, add:

```typescript
export { generateThreadTitle, extractTextFromContent, TITLE_MODEL, TITLE_SYSTEM_PROMPT } from "./title/generate-title";
export type { GenerateTitleOptions, GenerateTitleResult, TitleGenerationProvider } from "./title/generate-title";
```

- [ ] **Step 6: Commit**

```bash
git add packages/agent-core/src/title/generate-title.ts packages/agent-core/src/title/__tests__/generate-title.test.ts packages/agent-core/src/index.ts
git commit -m "feat(agent-core): add generateThreadTitle utility

Uses Claude Haiku 3.5 with max_tokens=60, temperature=0.7, and a forced
set_title tool call to generate max-5-word Sentence case titles from the
first user message content.

逆向: amp 1344_unknown_tzT.js (generateThreadTitle), uses mb = CLAUDE_HAIKU_4_5,
system prompt exact match, set_title tool with forced tool_choice."
```

---

### Task 2: Wire title generation into ThreadWorker

**Why:** The utility exists but is never called. Amp triggers it in `triggerTitleGeneration()` which is called after the first inference start and after each turn completion.

**Files:**
- Modify: `packages/agent-core/src/worker/thread-worker.ts`
- Create: `packages/agent-core/src/worker/__tests__/title-generation-wiring.test.ts`

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:750-793`
- Called at line 268: `this.triggerTitleGeneration()` (after `trackFilesFromHistory()` in `runInferenceAndUpdateThread`)
- Called at line 878: `this.triggerTitleGeneration()` (after agent turn completion)
- Preconditions: `this.thread.mainThreadID !== void 0 || this.thread.title` -- skip if child thread or already titled
- Uses `this.ops.titleGeneration?.abort()` to cancel any in-flight generation
- Creates new AbortController: `this.ops.titleGeneration = new AbortController()`
- On success: `this.updateThread({ type: "title", value: r, usage: h })`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/worker/__tests__/title-generation-wiring.test.ts
import { describe, expect, it, mock, beforeEach } from "bun:test";
import { ThreadWorker } from "../thread-worker";
import type { ThreadWorkerOptions } from "../thread-worker";
import type { ThreadSnapshot } from "@flitter/schemas";

function createMockOptions(overrides?: Partial<ThreadWorkerOptions>): ThreadWorkerOptions {
  const snapshot: ThreadSnapshot = {
    id: "test-thread",
    v: 1,
    title: null,
    messages: [],
    env: "local",
    agentMode: "normal",
    relationships: [],
  } as unknown as ThreadSnapshot;

  return {
    getThreadSnapshot: () => snapshot,
    updateThreadSnapshot: mock((s: ThreadSnapshot) => {
      Object.assign(snapshot, s);
    }),
    getMessages: () => snapshot.messages as any,
    provider: {
      stream: async function* () {
        yield {
          content: [{ type: "text", text: "Hello!" }],
          state: { type: "complete" },
          usage: { inputTokens: 100, outputTokens: 20, model: "claude-sonnet-4-20250514", maxInputTokens: 200000, cacheCreationInputTokens: null, cacheReadInputTokens: null, totalInputTokens: 100, timestamp: new Date().toISOString() },
        };
      },
    } as any,
    toolOrchestrator: {
      executeToolsWithPlan: mock(async () => {}),
      cancelAll: mock(() => {}),
      dispose: mock(() => {}),
    } as any,
    buildSystemPrompt: async () => [{ type: "text" as const, text: "You are helpful." }],
    checkAndCompact: async () => null,
    getConfig: () => ({ settings: { model: "claude-sonnet-4-20250514" } }) as any,
    toolRegistry: { getToolDefinitions: () => [] } as any,
    ...overrides,
  };
}

describe("ThreadWorker title generation", () => {
  it("has triggerTitleGeneration method", () => {
    const opts = createMockOptions();
    const worker = new ThreadWorker(opts);
    expect(typeof (worker as any).triggerTitleGeneration).toBe("function");
    worker.dispose();
  });

  it("does not generate title if thread already has one", () => {
    const snapshot = {
      id: "test", v: 1, title: "Existing title",
      messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
      relationships: [],
    } as unknown as ThreadSnapshot;

    const opts = createMockOptions({
      getThreadSnapshot: () => snapshot,
    });
    const worker = new ThreadWorker(opts);

    // triggerTitleGeneration should be a no-op
    (worker as any).triggerTitleGeneration();
    // No crash, no error
    worker.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/title-generation-wiring.test.ts`
Expected: FAIL -- `triggerTitleGeneration` does not exist.

- [ ] **Step 3: Add triggerTitleGeneration to ThreadWorker**

In `packages/agent-core/src/worker/thread-worker.ts`, add import:

```typescript
import { generateThreadTitle, type TitleGenerationProvider } from "../title/generate-title";
```

Add to the class body (after `private disposed = false;`):

```typescript
  /** AbortController for in-flight title generation */
  // 逆向: amp 1244_ThreadWorker_ov.js:89 — ops.titleGeneration = null
  private titleGenerationAbort: AbortController | null = null;
```

Add the `triggerTitleGeneration` method (before `dispose()`):

```typescript
  /**
   * Trigger background title generation from the first user message.
   *
   * 逆向: amp 1244_ThreadWorker_ov.js:750-793 (triggerTitleGeneration)
   *
   * Preconditions:
   * 1. Thread has no existing title
   * 2. Thread is not a child thread (no mainThreadID)
   * 3. Thread has at least one user message with text content
   *
   * On success, updates the thread snapshot with the generated title.
   */
  private triggerTitleGeneration(): void {
    const snapshot = this.opts.getThreadSnapshot();

    // Skip if already titled
    // 逆向: amp line 751 — if (this.thread.mainThreadID !== void 0 || this.thread.title) return
    if (snapshot.title) return;

    // Skip if child thread (has parent relationship)
    const relationships = (snapshot as any).relationships ?? [];
    if (relationships.some((r: any) => r.type === "child-of")) return;

    // Find first user message with text content
    const firstUserMessage = snapshot.messages.find(
      (m) => m.role === "user" && Array.isArray(m.content) && m.content.some(
        (block: any) => block.type === "text" && typeof block.text === "string" && block.text.trim(),
      ),
    );
    if (!firstUserMessage) return;

    // Cancel any in-flight generation
    // 逆向: amp line 752 — this.ops.titleGeneration?.abort()
    this.titleGenerationAbort?.abort();
    this.titleGenerationAbort = new AbortController();
    const signal = this.titleGenerationAbort.signal;

    // The title generation needs a provider that supports createMessage (non-streaming).
    // We check if the provider has this method; if not, skip.
    const provider = this.opts.provider as unknown as { createMessage?: TitleGenerationProvider["createMessage"] };
    if (typeof provider.createMessage !== "function") {
      // Provider doesn't support non-streaming calls; skip title generation
      return;
    }

    // Fire and forget — title generation is background work
    generateThreadTitle({
      messageContent: firstUserMessage.content as Array<{ type: string; text?: string }>,
      provider: provider as unknown as TitleGenerationProvider,
      signal,
    })
      .then(({ title }) => {
        if (signal.aborted || this.disposed) return;
        if (title && !this.opts.getThreadSnapshot().title) {
          // 逆向: amp line 775-778 — this.updateThread({ type: "title", value: r })
          const current = this.opts.getThreadSnapshot();
          this.opts.updateThreadSnapshot({
            ...current,
            title,
          } as ThreadSnapshot);
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        // Log but don't fail — title is non-critical
        // Using console.error as fallback since logger may not be available
      });
  }
```

Add call in `runInference()` -- after the `turn:complete` event (around line 215):

```typescript
      if (toolUses.length > 0) {
        await this.opts.toolOrchestrator.executeToolsWithPlan(toolUses);
        await this.runInference();
      } else {
        this.events$.next({ type: "turn:complete" });
        this.inferenceState$.next("idle");
        // 逆向: amp 1244_ThreadWorker_ov.js:878 — this.triggerTitleGeneration()
        this.triggerTitleGeneration();
      }
```

In `dispose()`, abort title generation:

```typescript
    // 逆向: amp 1244_ThreadWorker_ov.js:1357 — this.ops.titleGeneration?.abort()
    if (this.titleGenerationAbort) {
      this.titleGenerationAbort.abort();
      this.titleGenerationAbort = null;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/title-generation-wiring.test.ts`
Expected: PASS

- [ ] **Step 5: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/agent-core/tsconfig.json`
Expected: No new type errors

- [ ] **Step 6: Commit**

```bash
git add packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/worker/__tests__/title-generation-wiring.test.ts
git commit -m "feat(agent-core): wire title generation into ThreadWorker

triggerTitleGeneration() fires after turn:complete (no tool_use).
Checks preconditions: no existing title, not a child thread, has user
message with text. Calls generateThreadTitle with Haiku, updates
snapshot on success. Aborted on dispose.

逆向: amp 1244_ThreadWorker_ov.js:750-793 (triggerTitleGeneration),
called at line 878 after turn completion."
```

---

### Task 3: Add createMessage to Anthropic provider (if needed)

**Why:** `generateThreadTitle` needs a `createMessage` (non-streaming) method on the provider. Check if the Anthropic provider already has one; if not, add it.

**Files:**
- Modify: `packages/llm/src/providers/anthropic/provider.ts` (if needed)

**Amp reference:** `amp-cli-reversed/modules/1344_unknown_tzT.js:11-50` -- uses `messages.create()` directly from the Anthropic SDK with `stream: false`.

- [ ] **Step 1: Check if AnthropicProvider has createMessage**

Run: `cd /Users/bytedance/workspace/flitter && grep -n "createMessage" packages/llm/src/providers/anthropic/provider.ts`

If it exists, skip to Step 4. If not, continue.

- [ ] **Step 2: Add createMessage to AnthropicProvider**

Add a `createMessage` method that wraps the Anthropic SDK's `messages.create` with `stream: false`:

```typescript
  /**
   * Non-streaming message creation (used for title generation and other one-shot calls).
   *
   * 逆向: amp 1344_unknown_tzT.js uses messages.create with stream: false
   */
  async createMessage(params: {
    model: string;
    max_tokens: number;
    temperature?: number;
    system: string;
    messages: Array<{ role: string; content: string }>;
    tools?: Array<{ name: string; input_schema: Record<string, unknown> }>;
    tool_choice?: { type: string; name: string; disable_parallel_tool_use?: boolean };
    signal?: AbortSignal;
  }): Promise<{
    content: Array<{ type: string; name?: string; input?: Record<string, unknown>; text?: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  }> {
    const client = this.getClient();
    const response = await client.messages.create(
      {
        model: params.model,
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        system: params.system,
        messages: params.messages as any,
        tools: params.tools as any,
        tool_choice: params.tool_choice as any,
      },
      {
        signal: params.signal,
      },
    );
    return {
      content: response.content as any,
      usage: response.usage
        ? { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens }
        : undefined,
    };
  }
```

- [ ] **Step 3: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/llm/tsconfig.json`
Expected: No new type errors

- [ ] **Step 4: Commit**

```bash
git add packages/llm/src/providers/anthropic/provider.ts
git commit -m "feat(llm): add createMessage to AnthropicProvider for non-streaming calls

Used by title generation (generateThreadTitle) which needs a one-shot
messages.create call with stream: false and forced tool_choice.

逆向: amp 1344_unknown_tzT.js:11 — messages.create({...}, {stream: false})"
```

---

### Task 4: Run full test suite and verify

- [ ] **Step 1: Run type check across packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/agent-core/tsconfig.json && bunx tsc --noEmit -p packages/llm/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 3: Fix any regressions**

Likely regression: existing tests that create ThreadWorker mocks may need to account for the new `triggerTitleGeneration` call. If a mock provider doesn't have `createMessage`, it's safely skipped (the method checks for its existence).
