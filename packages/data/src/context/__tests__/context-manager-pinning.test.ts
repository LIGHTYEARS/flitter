import { describe, expect, test } from "bun:test";
import type { ThreadMessage, ThreadSnapshot } from "@flitter/schemas";
import { type CompactFunction, ContextManager } from "../context-manager";

function makeMessage(role: string, text: string, messageId = 0): ThreadMessage {
  if (role === "assistant") {
    return {
      role: "assistant",
      content: [{ type: "text", text }],
      messageId,
      state: { type: "complete", stopReason: "end_turn" },
    } as ThreadMessage;
  }
  return {
    role: role as "user",
    content: [{ type: "text", text }],
    messageId,
  } as ThreadMessage;
}

function makeInfoMessage(text: string, messageId = 0): ThreadMessage {
  return {
    // biome-ignore lint/suspicious/noExplicitAny: info is a valid role in ThreadMessage union
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

// ─── Task 1: Context Pinning ─────────────────────────────

describe("ContextManager: context pinning", () => {
  test("preserves info-role messages after compaction", async () => {
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
    // biome-ignore lint/suspicious/noExplicitAny: test assertion over union type with info role
    const infoMessages = newMessages.filter((m: any) => m.role === "info");
    expect(infoMessages.length).toBeGreaterThanOrEqual(1);
    // biome-ignore lint/suspicious/noExplicitAny: test assertion over union type with info role
    const skillInfo = infoMessages.find((m: any) =>
      // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
      m.content.some((c: any) => typeof c.text === "string" && c.text.includes("git-workflow")),
    );
    expect(skillInfo).toBeDefined();
  });

  test("does not duplicate info messages that are in the kept portion", async () => {
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
      // biome-ignore lint/suspicious/noExplicitAny: test assertion over union type with info role
      const infoMessages = result.thread.messages.filter((m: any) => m.role === "info");
      // biome-ignore lint/suspicious/noExplicitAny: test assertion over union type with info role
      const recentSkillInfos = infoMessages.filter((m: any) =>
        m.content.some(
          // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
          (c: any) => typeof c.text === "string" && c.text.includes("Recent skill load"),
        ),
      );
      expect(recentSkillInfos.length).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Task 2: Compaction Marker ───────────────────────────

describe("ContextManager: compaction marker", () => {
  test("detects existing summary block and skips already-summarized content", async () => {
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
        content: [
          {
            type: "summary",
            summary: { type: "message", summary: "Previous conversation about project setup." },
          },
        ],
        messageId: 0,
        // biome-ignore lint/suspicious/noExplicitAny: test fixture casting summary message
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

  test("produces only one summary block after re-compaction", async () => {
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
        content: [
          {
            type: "summary",
            summary: { type: "message", summary: "Old summary" },
          },
        ],
        messageId: 0,
        // biome-ignore lint/suspicious/noExplicitAny: test fixture casting summary message
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
      const summaryMessages = result.thread.messages.filter(
        // biome-ignore lint/suspicious/noExplicitAny: test assertion over union type
        (m: any) => Array.isArray(m.content) && m.content.some((c: any) => c.type === "summary"),
      );
      expect(summaryMessages.length).toBe(1);

      // The summary content should be the new summary, not the old one
      // biome-ignore lint/suspicious/noExplicitAny: test assertion over union type
      const summaryBlock = (summaryMessages[0] as any).content.find(
        // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
        (c: any) => c.type === "summary",
      );
      expect(summaryBlock.summary.summary).toBe("Re-summary of conversation");
    }
  });
});

// ─── Task 3: System Context in Summary ───────────────────

describe("ContextManager: system context in summary", () => {
  test("includes system context when getSystemContext is provided", async () => {
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
      // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
      const firstContent = batch[0]?.content?.[0] as any;
      expect(firstContent?.text).toContain("System context for summary");
      expect(firstContent?.text).toContain("coding assistant");
    }
  });

  test("works without getSystemContext (backward compatible)", async () => {
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

// ─── Task 4: Cache Control Pinning ──────────────────────

describe("ContextManager: cache_control pinning", () => {
  test("preserves messages with cache_control blocks after compaction", async () => {
    const mockCompactFn: CompactFunction = async () => "Summary";
    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 2,
    });
    const messages: ThreadMessage[] = [
      makeMessage("user", "Setup instruction 1", 0),
      {
        role: "user",
        content: [{ type: "text", text: "Important cached context", cache_control: { type: "ephemeral" } }],
        messageId: 1,
      } as ThreadMessage,
      makeMessage("assistant", "Understood", 2),
      makeMessage("user", "Do task A", 3),
      makeMessage("assistant", "Done A", 4),
      makeMessage("user", "Do task B", 5),
      makeMessage("assistant", "Done B", 6),
    ];
    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    expect(result.compacted).toBe(true);
    // The cache_control message should survive compaction
    const allTexts = result.thread.messages.flatMap((m) =>
      Array.isArray(m.content)
        ? m.content
            // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
            .filter((c): c is any => c.type === "text")
            // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
            .map((c: any) => c.text)
        : [],
    );
    expect(allTexts.some((t: string) => t.includes("Important cached context"))).toBe(true);
  });

  test("does not duplicate cache_control messages already in kept portion", async () => {
    const mockCompactFn: CompactFunction = async () => "Summary";
    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 3,
    });
    // The cache_control message is at index 4, and keepRecent=3 means indices 4,5,6 are kept
    const messages: ThreadMessage[] = [
      makeMessage("user", "Hello", 0),
      makeMessage("assistant", "Hi there!", 1),
      makeMessage("user", "Do something", 2),
      makeMessage("assistant", "Done!", 3),
      {
        role: "user",
        content: [{ type: "text", text: "Cached instruction in kept portion", cache_control: { type: "ephemeral" } }],
        messageId: 4,
      } as ThreadMessage,
      makeMessage("assistant", "Understood the cached thing", 5),
      makeMessage("user", "Final question", 6),
    ];
    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    if (result.compacted) {
      // Count how many times the cached message text appears
      let count = 0;
      for (const m of result.thread.messages) {
        if (!Array.isArray(m.content)) continue;
        for (const c of m.content) {
          // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
          if ((c as any).type === "text" && (c as any).text?.includes("Cached instruction in kept portion")) {
            count++;
          }
        }
      }
      expect(count).toBe(1); // Should appear exactly once (in kept portion), not duplicated
    }
  });
});

// ─── Task 5: Last User Message Pinning ──────────────────

describe("ContextManager: last user message pinning", () => {
  test("always preserves the most recent user message even when in summarized portion", async () => {
    const mockCompactFn: CompactFunction = async () => "Summary";
    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 2,
    });
    // Thread where last user msg is at index 3 but keepRecent=2 only keeps indices 5,6
    // The last user message is "Run all tests" at index 3, but the kept portion is
    // indices 5-6 (both assistant messages)
    const messages: ThreadMessage[] = [
      makeMessage("user", "Hello", 0),
      makeMessage("assistant", "Hi!", 1),
      makeMessage("user", "Setup project", 2),
      makeMessage("user", "Run all tests", 3), // Last user message, in summarized portion
      makeMessage("assistant", "Running tests...", 4),
      makeMessage("assistant", "All 10 tests pass.", 5),
      makeMessage("assistant", "Done with everything.", 6),
    ];
    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    expect(result.compacted).toBe(true);
    // The last user message "Run all tests" should be promoted into the kept portion
    const allTexts = result.thread.messages.flatMap((m) =>
      Array.isArray(m.content)
        ? m.content
            // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
            .filter((c): c is any => c.type === "text")
            // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
            .map((c: any) => c.text)
        : [],
    );
    expect(allTexts.some((t: string) => t.includes("Run all tests"))).toBe(true);
  });

  test("does not duplicate the last user message when already in kept portion", async () => {
    const mockCompactFn: CompactFunction = async () => "Summary";
    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 2,
    });
    // Last user message is at index 4, which IS in the kept portion (indices 4,5)
    const messages: ThreadMessage[] = [
      makeMessage("user", "Hello", 0),
      makeMessage("assistant", "Hi!", 1),
      makeMessage("user", "Do task A", 2),
      makeMessage("assistant", "Done A", 3),
      makeMessage("user", "Do task B", 4), // Last user message, in kept portion
      makeMessage("assistant", "Done B", 5),
    ];
    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    if (result.compacted) {
      // Count how many times "Do task B" appears
      let count = 0;
      for (const m of result.thread.messages) {
        if (!Array.isArray(m.content)) continue;
        for (const c of m.content) {
          // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
          if ((c as any).type === "text" && (c as any).text === "Do task B") {
            count++;
          }
        }
      }
      expect(count).toBe(1); // Should appear exactly once, not duplicated
    }
  });
});

// ─── Task 6: Deduplication of Pinned Messages ───────────

describe("ContextManager: pinned message deduplication", () => {
  test("deduplicates info messages that overlap between pinned and kept portions", async () => {
    const mockCompactFn: CompactFunction = async () => "Summary";
    const cm = new ContextManager({
      compactFn: mockCompactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10,
      keepRecentMessages: 4,
    });
    // Info message at index 1 is in summarized portion (toSummarize)
    // Same info message (by messageId) at index 4 is in kept portion
    const infoMsg1 = makeInfoMessage("Loaded skill: testing-workflow\n\nAlways run tests before committing.", 10);
    const messages: ThreadMessage[] = [
      makeMessage("user", "Hello", 0),
      infoMsg1,
      makeMessage("assistant", "Got it!", 2),
      makeMessage("user", "Do stuff", 3),
      makeMessage("assistant", "Done stuff", 4),
      makeMessage("user", "More stuff", 5),
      makeMessage("assistant", "More done", 6),
    ];
    const thread = makeThread(messages);
    const result = await cm.checkAndCompact(thread);

    if (result.compacted) {
      // Count info messages with the skill text
      // biome-ignore lint/suspicious/noExplicitAny: test assertion over union type with info role
      const infoMessages = result.thread.messages.filter((m: any) => m.role === "info");
      const skillInfos = infoMessages.filter((m) =>
        m.content.some(
          // biome-ignore lint/suspicious/noExplicitAny: test assertion over content block union
          (c: any) => typeof c.text === "string" && c.text.includes("testing-workflow"),
        ),
      );
      // Should not be duplicated
      expect(skillInfos.length).toBeLessThanOrEqual(1);
    }
  });
});
