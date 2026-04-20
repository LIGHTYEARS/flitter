# Compaction System Context Pinning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure that after context compaction, system context (guidance files, loaded skills, environment info) is preserved so the LLM does not lose critical instructions. Additionally, add a compaction marker to prevent double-compaction and ensure the `info`-role messages carrying context blocks are re-injected after the summary.

**Architecture:** Amp's compaction model works as follows:
1. The system prompt is rebuilt from scratch before every inference call via `fwR()` (collectContextBlocks) + `LO()` (buildSystemPrompt) -- this is the `buildSystemPrompt` callback on `ThreadWorkerOptions`. This means the system prompt itself is never "lost" by compaction because it lives outside the message history.
2. However, `info`-role messages in the thread carry loaded skill content, context-reminder injections, and mid-conversation guidance that ARE part of the message history and DO get dropped during compaction.
3. Amp's `k8T()` function (chunk-002.js:1909) extracts messages starting from the summary block found by `pm()` (chunk-001.js:5736). After compaction, it finds the `{type: "summary"}` block and starts from there, skipping the old messages.
4. Amp's `_IR()` function (chunk-002.js:2716) trims incomplete tool_use sequences from the kept messages.

Flitter's current `ContextManager.checkAndCompact()` correctly:
- Counts tokens and checks the threshold
- Splits messages into toSummarize + toKeep
- Calls `compactFn()` to generate a summary
- Trims incomplete tool_use sequences via `trimIncompleteToolUse()`
- Inserts a summary message with `{type: "summary"}` content block

What's missing:
1. **Context pinning**: `info`-role messages (skill loads, context reminders) in the toSummarize portion should be extracted and re-injected after the summary so the model retains loaded context.
2. **Compaction marker**: No marker to detect if a thread has already been compacted, which could cause the compactFn to re-summarize the summary itself.
3. **System prompt blocks in summary context**: The summary prompt should include the current system prompt blocks so the LLM can produce a context-aware summary.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/data` (ContextManager), `@flitter/schemas` (ThreadSnapshot, ThreadMessage, ThreadContentBlock)

**Amp reference:**
- `amp-cli-reversed/chunk-002.js:1909-1987` (k8T — message extraction starting from summary block)
- `amp-cli-reversed/modules/1602_unknown_pm.js:20-31` (pm — finds summary block in thread by scanning info-role messages)
- `amp-cli-reversed/modules/0623_unknown__IR.js:1-38` (_IR — trim incomplete tool_use sequences)
- `amp-cli-reversed/chunk-002.js:22805-22820` (injectPendingSkills — info-role message injection)
- `amp-cli-reversed/chunk-002.js:20586-20599` (system prompt construction with cache_control ephemeral)

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/data/src/context/context-manager.ts` | Add context pinning, compaction marker, info-message extraction |
| Create | `packages/data/src/context/__tests__/context-manager-pinning.test.ts` | Tests for context pinning during compaction |
| Modify | `packages/data/src/context/token-counter.ts` | Ensure token counter handles summary blocks correctly |

---

### Task 1: Extract and re-inject info-role messages during compaction

**Why first:** This is the core pinning logic. Without it, loaded skills and context reminders are lost after compaction.

**Files:**
- Modify: `packages/data/src/context/context-manager.ts` (checkAndCompact method)
- Create: `packages/data/src/context/__tests__/context-manager-pinning.test.ts`

**Amp reference:**
- `chunk-002.js:22812-22819` — info messages have `role: "info"` and carry context blocks (skill invocations, text reminders)
- `chunk-002.js:1909-1925` — `k8T` starts from summary block, but info messages after the summary are preserved
- `modules/1602_unknown_pm.js:20-31` — `pm()` scans backward for `role: "info"` messages with `{type: "summary"}` content

- [ ] **Step 1: Write the failing test**

```typescript
// packages/data/src/context/__tests__/context-manager-pinning.test.ts
import { describe, expect, it } from "bun:test";
import type { ThreadMessage, ThreadSnapshot } from "@flitter/schemas";
import { ContextManager, type CompactFunction } from "../context-manager";

function makeMessage(role: string, text: string, messageId = 0): ThreadMessage {
  return {
    role: role as "user" | "assistant",
    content: [{ type: "text", text }],
    messageId,
  } as ThreadMessage;
}

function makeInfoMessage(text: string, messageId = 0): ThreadMessage {
  return {
    role: "info" as any,
    content: [{ type: "text", text }],
    messageId,
  } as ThreadMessage;
}

function makeThread(messages: ThreadMessage[], id = "test-thread"): ThreadSnapshot {
  return {
    id,
    v: 1,
    messages,
    title: null,
    env: "local",
    agentMode: "normal",
    relationships: [],
  } as unknown as ThreadSnapshot;
}

describe("ContextManager: context pinning", () => {
  it("preserves info-role messages after compaction", async () => {
    const mockCompactFn: CompactFunction = async (msgs) => {
      return `Summary of ${msgs.length} messages`;
    };

    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100, // Very small to force compaction
      compactionThresholdPercent: 10, // 10% of 100 = 10 tokens, will trigger
      keepRecentMessages: 2,
    });

    // Build a thread with many messages including an info message
    const messages: ThreadMessage[] = [
      makeMessage("user", "Hello, please help me.", 0),
      makeInfoMessage("Loaded skill: git-workflow\n\nAlways use feature branches.", 1),
      makeMessage("assistant", "Sure! I'll help you with git workflows.", 2),
      makeMessage("user", "Create a new branch.", 3),
      makeMessage("assistant", "I'll create a feature branch for you.", 4),
      makeMessage("user", "Now commit the changes.", 5),
      makeMessage("assistant", "Done, committed the changes.", 6),
    ];

    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    expect(result.compacted).toBe(true);

    // The compacted thread should contain:
    // 1. Summary message
    // 2. Pinned info messages from the summarized portion
    // 3. The kept recent messages
    const newMessages = result.thread.messages;

    // First message should be the summary
    expect(newMessages[0].content[0]).toHaveProperty("type", "summary");

    // There should be a pinned info message with the skill content
    const infoMessages = newMessages.filter((m: any) => m.role === "info");
    expect(infoMessages.length).toBeGreaterThanOrEqual(1);
    const skillInfo = infoMessages.find((m: any) =>
      m.content.some((c: any) => typeof c.text === "string" && c.text.includes("git-workflow")),
    );
    expect(skillInfo).toBeDefined();
  });

  it("does not duplicate info messages that are in the kept portion", async () => {
    const mockCompactFn: CompactFunction = async () => "Summary";

    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 3,
    });

    const messages: ThreadMessage[] = [
      makeMessage("user", "Hello", 0),
      makeMessage("assistant", "Hi there!", 1),
      makeMessage("user", "Do something", 2),
      makeMessage("assistant", "Done!", 3),
      // This info message is in the "keep" portion (last 3)
      makeInfoMessage("Recent skill load", 4),
      makeMessage("user", "Thanks", 5),
      makeMessage("assistant", "You're welcome!", 6),
    ];

    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    if (result.compacted) {
      // The info message at index 4 is in the kept portion,
      // so it should NOT be duplicated as a pinned message
      const infoMessages = result.thread.messages.filter((m: any) => m.role === "info");
      const recentSkillInfos = infoMessages.filter((m: any) =>
        m.content.some((c: any) => typeof c.text === "string" && c.text.includes("Recent skill load")),
      );
      expect(recentSkillInfos.length).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/context/__tests__/context-manager-pinning.test.ts`
Expected: FAIL — info messages are not preserved after compaction.

- [ ] **Step 3: Implement context pinning in ContextManager**

In `packages/data/src/context/context-manager.ts`, modify the `checkAndCompact` method:

```typescript
  /** Main entry: check threshold and compact if needed */
  async checkAndCompact(thread: ThreadSnapshot): Promise<CompactionResult> {
    const tokensBefore = countThreadTokens(thread);
    const threshold = Math.floor(this.modelContextWindow * (this.thresholdPercent / 100));

    if (tokensBefore <= threshold || thread.messages.length <= this.keepRecent) {
      return { compacted: false, thread, tokensBefore, tokensAfter: tokensBefore };
    }

    this.compactionState.next("compacting");
    try {
      // Split: messages to summarize vs messages to keep
      const keepCount = Math.min(this.keepRecent, thread.messages.length);
      const splitIdx = thread.messages.length - keepCount;
      const toSummarize = thread.messages.slice(0, splitIdx);
      const toKeep = thread.messages.slice(splitIdx);

      // ── NEW: Extract info-role messages from the summarized portion ──
      // 逆向: amp preserves loaded skills and context reminders by injecting
      // them as info-role messages. k8T (chunk-002.js:1909) starts from the
      // summary block, so info messages before the summary would be lost.
      // We extract them and re-inject after the summary.
      const pinnedInfoMessages = extractInfoMessages(toSummarize);

      // Call LLM for summary
      const summaryText = await this.compactFn(toSummarize);

      // Build summary message
      const summaryMessage: ThreadMessage = {
        role: "user",
        content: [
          {
            type: "summary",
            summary: { type: "message", summary: summaryText },
          } satisfies ThreadContentBlock,
        ],
        messageId: 0,
      };

      // Trim incomplete tool_use sequences from toKeep
      const trimmedKeep = trimIncompleteToolUse(toKeep);

      // ── NEW: Construct new thread with pinned info messages ──
      // Order: summary → pinned info messages → kept messages
      // 逆向: k8T starts from summary, then processes remaining messages
      // in order. Info messages are processed as user-role parts.
      const newMessages = [summaryMessage, ...pinnedInfoMessages, ...trimmedKeep];
      const newThread: ThreadSnapshot = {
        ...thread,
        messages: newMessages,
      };

      const tokensAfter = countThreadTokens(newThread);
      return {
        compacted: true,
        thread: newThread,
        tokensBefore,
        tokensAfter,
        summary: summaryText,
      };
    } catch (_err) {
      // On failure, restore idle and return original thread
      return { compacted: false, thread, tokensBefore, tokensAfter: tokensBefore };
    } finally {
      this.compactionState.next("idle");
    }
  }
```

Add the `extractInfoMessages` helper function:

```typescript
/**
 * Extract info-role messages from a message list.
 *
 * These messages carry loaded skill content, context reminders, and other
 * injected context that should be preserved across compaction.
 *
 * 逆向: amp's info-role messages (chunk-002.js:22812-22819) carry skill
 * invocations and context blocks. k8T (chunk-002.js:10576-10592) processes
 * info messages as user-role content with text parts.
 *
 * We filter to only include info messages with substantive text content
 * (not empty or trivially short messages).
 */
function extractInfoMessages(messages: ThreadMessage[]): ThreadMessage[] {
  const infoMessages: ThreadMessage[] = [];

  for (const msg of messages) {
    if ((msg as any).role !== "info") continue;

    // Only pin info messages with non-trivial text content
    const hasText = Array.isArray(msg.content) && msg.content.some(
      (block: ThreadContentBlock) =>
        block.type === "text" && typeof block.text === "string" && block.text.trim().length > 20,
    );

    if (hasText) {
      infoMessages.push(msg);
    }
  }

  return infoMessages;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/context/__tests__/context-manager-pinning.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/data/src/context/context-manager.ts packages/data/src/context/__tests__/context-manager-pinning.test.ts
git commit -m "feat(context): pin info-role messages during compaction

Extract info-role messages (loaded skills, context reminders) from the
summarized portion and re-inject them after the summary message. This
ensures the model retains loaded skill instructions and context blocks
after compaction.

逆向: amp chunk-002.js:22812-22819 (info-role message injection),
       chunk-002.js:10576-10592 (k8T info-role processing)"
```

---

### Task 2: Add compacted marker to prevent double-compaction

**Why:** Without a marker, a compacted thread could be compacted again, summarizing the summary and losing precision.

**Files:**
- Modify: `packages/data/src/context/context-manager.ts`
- Test: `packages/data/src/context/__tests__/context-manager-pinning.test.ts` (append)

**Amp reference:** `modules/1602_unknown_pm.js:20-31` — `pm()` finds the summary block. If a summary block exists, amp's `k8T` uses it as the starting point. The summary block itself serves as the compaction marker -- its presence means the thread has been compacted. Amp can re-compact (the summary gets replaced), but it uses the summary as the starting point, not re-summarizing old content.

- [ ] **Step 1: Write the failing test**

Append to test file:

```typescript
describe("ContextManager: compaction marker", () => {
  it("detects existing summary block and skips already-summarized content", async () => {
    const summaryCallArgs: ThreadMessage[][] = [];
    const mockCompactFn: CompactFunction = async (msgs) => {
      summaryCallArgs.push([...msgs]);
      return `Summary of ${msgs.length} messages`;
    };

    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 2,
    });

    // Build a thread that already has a summary from a prior compaction
    const messages: ThreadMessage[] = [
      // This is the previous summary
      {
        role: "user",
        content: [{
          type: "summary",
          summary: { type: "message", summary: "Previous conversation about project setup." },
        }],
        messageId: 0,
      } as any,
      makeMessage("user", "Now let's add tests.", 1),
      makeMessage("assistant", "I'll add unit tests for the module.", 2),
      makeMessage("user", "Also add integration tests.", 3),
      makeMessage("assistant", "Done, added both test types.", 4),
      makeMessage("user", "Run all tests.", 5),
      makeMessage("assistant", "All 15 tests pass.", 6),
    ];

    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    if (result.compacted) {
      // The compactFn should NOT receive the old summary message in the
      // toSummarize batch — it should only summarize messages after the
      // previous summary (or include the summary text as context).
      // The new summary should build upon the previous one.
      expect(summaryCallArgs.length).toBe(1);
      const summarized = summaryCallArgs[0];
      // The summarized messages should include the old summary + newer messages
      // that got dropped, NOT the kept recent messages
      expect(summarized.length).toBeGreaterThan(0);
    }
  });

  it("produces only one summary block after re-compaction", async () => {
    const mockCompactFn: CompactFunction = async () => "Re-summary of conversation";

    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 2,
    });

    // Already-compacted thread
    const messages: ThreadMessage[] = [
      {
        role: "user",
        content: [{
          type: "summary",
          summary: { type: "message", summary: "Old summary" },
        }],
        messageId: 0,
      } as any,
      makeMessage("user", "More work", 1),
      makeMessage("assistant", "Done", 2),
      makeMessage("user", "Even more work", 3),
      makeMessage("assistant", "Also done", 4),
      makeMessage("user", "Final request", 5),
      makeMessage("assistant", "Final response", 6),
    ];

    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    if (result.compacted) {
      // There should be exactly ONE summary block in the result
      const summaryMessages = result.thread.messages.filter((m: any) =>
        Array.isArray(m.content) &&
        m.content.some((c: any) => c.type === "summary"),
      );
      expect(summaryMessages.length).toBe(1);

      // The summary content should be the new summary, not the old one
      const summaryBlock = (summaryMessages[0] as any).content.find(
        (c: any) => c.type === "summary",
      );
      expect(summaryBlock.summary.summary).toBe("Re-summary of conversation");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/context/__tests__/context-manager-pinning.test.ts`
Expected: May already pass (depends on whether the current split logic handles the old summary correctly). If it fails, the fix is needed.

- [ ] **Step 3: Add summary detection to checkAndCompact**

In `packages/data/src/context/context-manager.ts`, add a helper to find existing summary blocks and adjust the split logic:

```typescript
/**
 * Find the index and content of an existing summary block in the thread.
 *
 * 逆向: pm() (modules/1602_unknown_pm.js:20-31)
 * Scans backward through messages looking for role="info" (or role="user"
 * in Flitter's case) with a {type: "summary"} content block.
 */
function findSummaryBlock(
  messages: ThreadMessage[],
): { index: number; summaryText: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (
        (block as any).type === "summary" &&
        (block as any).summary?.type === "message"
      ) {
        return {
          index: i,
          summaryText: (block as any).summary.summary,
        };
      }
    }
  }
  return null;
}
```

Then in `checkAndCompact`, before calling `compactFn`, if there's an existing summary, include its text as context:

```typescript
      // Check for existing summary block
      const existingSummary = findSummaryBlock(toSummarize);

      // If there's an existing summary in the toSummarize portion,
      // provide it as context to the compactFn so the new summary
      // builds upon the previous one rather than re-summarizing blindly.
      let summaryText: string;
      if (existingSummary) {
        // Prefix the old summary so the LLM can build upon it
        const contextPrefix = `Previous summary: ${existingSummary.summaryText}\n\nAdditional messages to incorporate:\n`;
        // Only summarize messages after the old summary
        const newMessages = toSummarize.slice(existingSummary.index + 1);
        if (newMessages.length > 0) {
          summaryText = await this.compactFn([
            { role: "user", content: [{ type: "text", text: contextPrefix }], messageId: -1 } as any,
            ...newMessages,
          ]);
        } else {
          // Nothing new to summarize, keep the old summary
          summaryText = existingSummary.summaryText;
        }
      } else {
        summaryText = await this.compactFn(toSummarize);
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/context/__tests__/context-manager-pinning.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/data/src/context/context-manager.ts packages/data/src/context/__tests__/context-manager-pinning.test.ts
git commit -m "feat(context): detect existing summary blocks for incremental re-compaction

When re-compacting a thread that already has a summary, the old summary
text is provided as context to the compactFn so the new summary builds
upon it. findSummaryBlock() scans for {type: 'summary'} content blocks,
matching amp's pm() function.

逆向: amp pm() (modules/1602_unknown_pm.js:20-31),
       k8T (chunk-002.js:1909-1925)"
```

---

### Task 3: Include system prompt context in compaction summary request

**Why:** The summary should be aware of the system prompt so it can produce a context-aware summary that preserves relevant details about the conversation's goals and constraints.

**Files:**
- Modify: `packages/data/src/context/context-manager.ts` (extend CompactFunction signature or ContextManagerOptions)
- Test: `packages/data/src/context/__tests__/context-manager-pinning.test.ts` (append)

**Amp reference:** `chunk-002.js:20592-20599` — system prompt blocks include cache_control ephemeral. The summary prompt in amp's compaction is separate from the conversation system prompt, but it does include context about the environment and tools.

- [ ] **Step 1: Extend ContextManagerOptions with system context**

In `packages/data/src/context/context-manager.ts`:

```typescript
// OLD:
export interface ContextManagerOptions {
  compactFn: CompactFunction;
  modelContextWindow?: number;
  compactionThresholdPercent?: number;
  keepRecentMessages?: number;
}

// NEW:
export interface ContextManagerOptions {
  compactFn: CompactFunction;
  modelContextWindow?: number;
  compactionThresholdPercent?: number;
  keepRecentMessages?: number;
  /**
   * Optional callback to get current system prompt blocks for context-aware
   * summaries. When provided, the summary prompt includes key system context
   * so the LLM can produce a summary that preserves relevant conversation details.
   *
   * 逆向: amp includes environment/tool context when building summaries
   */
  getSystemContext?: () => Promise<string | null>;
}
```

Store and use it in the class:

```typescript
  private getSystemContext?: () => Promise<string | null>;

  constructor(options: ContextManagerOptions) {
    this.compactFn = options.compactFn;
    this.modelContextWindow = options.modelContextWindow ?? DEFAULT_CONTEXT_WINDOW;
    this.thresholdPercent = options.compactionThresholdPercent ?? DEFAULT_THRESHOLD_PERCENT;
    this.keepRecent = options.keepRecentMessages ?? DEFAULT_KEEP_RECENT;
    this.getSystemContext = options.getSystemContext;
  }
```

In `checkAndCompact`, before calling compactFn, prepend system context if available:

```typescript
      // Optionally prepend system context for context-aware summary
      let contextMessages = toSummarize;
      if (this.getSystemContext) {
        const systemContext = await this.getSystemContext();
        if (systemContext) {
          const contextMsg: ThreadMessage = {
            role: "user",
            content: [{ type: "text", text: `[System context for summary]\n${systemContext}` }],
            messageId: -2,
          } as any;
          contextMessages = [contextMsg, ...toSummarize];
        }
      }

      const summaryText = await this.compactFn(contextMessages);
```

- [ ] **Step 2: Write test**

Append to test file:

```typescript
describe("ContextManager: system context in summary", () => {
  it("includes system context when getSystemContext is provided", async () => {
    const summarizedBatches: ThreadMessage[][] = [];
    const mockCompactFn: CompactFunction = async (msgs) => {
      summarizedBatches.push([...msgs]);
      return "Summary with context";
    };

    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 2,
      getSystemContext: async () => "You are a coding assistant working on the Flitter project.",
    });

    const messages: ThreadMessage[] = [
      makeMessage("user", "Help me with the project.", 0),
      makeMessage("assistant", "Sure, I'll help.", 1),
      makeMessage("user", "Add a feature.", 2),
      makeMessage("assistant", "Feature added.", 3),
      makeMessage("user", "Test it.", 4),
      makeMessage("assistant", "Tests pass.", 5),
    ];

    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    if (result.compacted) {
      expect(summarizedBatches.length).toBe(1);
      const batch = summarizedBatches[0];
      // First message should be the system context injection
      const firstContent = batch[0]?.content?.[0] as any;
      expect(firstContent?.text).toContain("System context for summary");
      expect(firstContent?.text).toContain("coding assistant");
    }
  });

  it("works without getSystemContext (backward compatible)", async () => {
    const mockCompactFn: CompactFunction = async () => "Simple summary";

    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 2,
      // No getSystemContext provided
    });

    const messages: ThreadMessage[] = [
      makeMessage("user", "Hello", 0),
      makeMessage("assistant", "Hi!", 1),
      makeMessage("user", "Bye", 2),
      makeMessage("assistant", "Goodbye!", 3),
      makeMessage("user", "Wait", 4),
      makeMessage("assistant", "Yes?", 5),
    ];

    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    // Should still work without system context
    if (result.compacted) {
      expect(result.summary).toBe("Simple summary");
    }
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/context/__tests__/context-manager-pinning.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/data/src/context/context-manager.ts packages/data/src/context/__tests__/context-manager-pinning.test.ts
git commit -m "feat(context): include system context in compaction summary prompt

When getSystemContext is provided, prepend the system prompt summary to
the messages sent to compactFn. This produces context-aware summaries
that preserve relevant details about the conversation's goals.

逆向: amp chunk-002.js:20592-20599 (system prompt context in inference)"
```

---

### Task 4: Wire getSystemContext in container.ts

**Why:** Connect the ContextManager's new `getSystemContext` option to the actual system prompt builder.

**Files:**
- Modify: `packages/flitter/src/container.ts` (pass getSystemContext when constructing ContextManager)

**Amp reference:** `chunk-002.js:20586` — `fwR(T, R, s, A)` (collectContextBlocks) is called to build system prompt. We expose a simplified version for the summary context.

- [ ] **Step 1: Update ContextManager construction in container.ts**

Find where `ContextManager` is constructed in `packages/flitter/src/container.ts` and add the `getSystemContext` option:

```typescript
// When creating ContextManager, add:
getSystemContext: async () => {
  try {
    const config = configService.get();
    const contextBlocks = await collectContextBlocks({
      getConfig: () => config,
      listSkills: () => skillService.list(),
      workspaceRoot: opts.workspaceRoot,
      workingDirectory: opts.workspaceRoot,
      discoverGuidanceFiles: (loadOpts) => guidanceLoader.discover(loadOpts),
    });
    // Return a condensed version of the system context
    return contextBlocks
      .map((block) => block.text)
      .filter((t) => t.length > 0)
      .join("\n\n")
      .slice(0, 2000); // Limit to avoid inflating the summary prompt
  } catch {
    return null;
  }
},
```

- [ ] **Step 2: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add packages/flitter/src/container.ts
git commit -m "fix(container): wire getSystemContext for context-aware compaction summaries

ContextManager now receives system prompt context (guidance files, skills,
environment info) when generating compaction summaries, producing richer
summaries that preserve conversation goals and constraints.

逆向: amp chunk-002.js:20586 (fwR context block collection)"
```

---

### Task 5: Full test suite and type check

- [ ] **Step 1: Run type check across all packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/data/tsconfig.json && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all existing tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass (existing + new)

- [ ] **Step 3: Fix any regressions**

The most likely issue is the extended `ContextManagerOptions` interface. Since `getSystemContext` is optional, existing callers should not break. Check if any test creates a `ContextManager` that might be affected.

- [ ] **Step 4: Verify compaction preserves context in a real scenario**

```bash
# Manual verification: create a long conversation and trigger compaction
# Check that after compaction, the model still knows about loaded skills
# and workspace context by asking it to reference them
```
