import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ThreadMessage, ThreadSnapshot } from "@flitter/schemas";
import { type CompactFunction, ContextManager } from "./context-manager";
import { countMessageTokens, countThreadTokens, countTokensApprox } from "./token-counter";

// ─── Helpers ────────────────────────────────────────────

function makeTextMessage(role: "user" | "assistant", text: string): ThreadMessage {
  if (role === "assistant") {
    return {
      role,
      content: [{ type: "text", text }],
      messageId: 1,
      state: { type: "complete", stopReason: "end_turn" },
    };
  }
  return {
    role,
    content: [{ type: "text", text }],
    messageId: 1,
  };
}

function makeThread(messages: ThreadMessage[], id = "t1"): ThreadSnapshot {
  return { id, v: 1, messages } as ThreadSnapshot;
}

function makeToolUseMessage(): ThreadMessage {
  return {
    role: "assistant",
    content: [{ type: "tool_use", id: "tu1", name: "bash", input: { command: "ls" } }],
    messageId: 2,
    state: { type: "complete", stopReason: "tool_use" },
  };
}

/** Generate a large text message with approximately the given token count */
function _makeLargeTextMessage(role: "user" | "assistant", approxTokens: number): ThreadMessage {
  // ASCII: chars/4 + 4 overhead. So chars ~ (approxTokens - 4) * 4
  const charCount = Math.max(1, (approxTokens - 4) * 4);
  const text = "a".repeat(charCount);
  return makeTextMessage(role, text);
}

// ─── 1. countTokensApprox ───────────────────────────────

describe("countTokensApprox", () => {
  it("counts ASCII tokens: 'hello world' (11 chars) -> 3 tokens", () => {
    // 11 / 4 = 2.75 -> ceil = 3
    assert.equal(countTokensApprox("hello world"), 3);
  });

  it("counts CJK tokens: 4 CJK chars -> 2 tokens", () => {
    // 4 / 2 = 2
    assert.equal(countTokensApprox("\u4F60\u597D\u4E16\u754C"), 2);
  });

  it("counts mixed ASCII + CJK: 'Hello\u4F60\u597D' -> 3 tokens", () => {
    // 5 ASCII chars -> ceil(5/4) = 2
    // 2 CJK chars -> ceil(2/2) = 1
    // Total = 3
    assert.equal(countTokensApprox("Hello\u4F60\u597D"), 3);
  });

  it("returns 0 for empty string", () => {
    assert.equal(countTokensApprox(""), 0);
  });
});

// ─── 2. countMessageTokens ──────────────────────────────

describe("countMessageTokens", () => {
  it("counts tokens in a single text block message", () => {
    const msg = makeTextMessage("user", "hello world");
    // countTokensApprox("hello world") = 3, + 4 overhead = 7
    assert.equal(countMessageTokens(msg), 7);
  });

  it("counts tokens across multiple text blocks", () => {
    const msg: ThreadMessage = {
      role: "user",
      content: [
        { type: "text", text: "hello world" }, // 3 tokens
        { type: "text", text: "test" }, // ceil(4/4) = 1 token
      ],
      messageId: 1,
    };
    // 3 + 1 + 4 overhead = 8
    assert.equal(countMessageTokens(msg), 8);
  });

  it("returns 0 for message with no content array", () => {
    assert.equal(countMessageTokens({ role: "user" } as unknown as ThreadMessage), 0);
    assert.equal(
      countMessageTokens({ role: "user", content: null } as unknown as ThreadMessage),
      0,
    );
  });
});

// ─── 3. countThreadTokens ───────────────────────────────

describe("countThreadTokens", () => {
  it("sums tokens across multiple messages", () => {
    const msg1 = makeTextMessage("user", "hello world"); // 3 + 4 = 7
    const msg2 = makeTextMessage("assistant", "hello world"); // 3 + 4 = 7
    const thread = makeThread([msg1, msg2]);
    assert.equal(countThreadTokens(thread), 14);
  });

  it("returns 0 for empty thread", () => {
    assert.equal(countThreadTokens({ messages: [] }), 0);
  });
});

// ─── 4. ContextManager: checkAndCompact ─────────────────

describe("ContextManager", () => {
  const noopCompactFn: CompactFunction = async () => "summary";

  it("does not compact when under threshold", async () => {
    const mgr = new ContextManager({ compactFn: noopCompactFn });
    const thread = makeThread([
      makeTextMessage("user", "hi"),
      makeTextMessage("assistant", "hello"),
    ]);
    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, false);
    assert.equal(result.thread, thread); // same reference
    assert.equal(result.tokensBefore, result.tokensAfter);
  });

  it("compacts when over threshold", async () => {
    const compactFn: CompactFunction = async () => "This is the summary.";
    // Use a tiny context window so even small messages exceed threshold
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 20, // 20 tokens window
      compactionThresholdPercent: 50, // threshold = 10 tokens
      keepRecentMessages: 1,
    });

    const messages: ThreadMessage[] = [
      makeTextMessage("user", "a]".repeat(20)), // many tokens
      makeTextMessage("assistant", "b".repeat(20)), // many tokens
      makeTextMessage("user", "c".repeat(20)), // many tokens
      makeTextMessage("assistant", "d".repeat(20)), // many tokens
      makeTextMessage("user", "recent message"), // will be kept
    ];
    const thread = makeThread(messages);

    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, true);
    assert.equal(result.summary, "This is the summary.");
    assert.ok(result.tokensAfter <= result.tokensBefore);
    // First message should be the summary
    const firstMsg = result.thread.messages[0] as unknown as {
      content: Array<{ type: string; summary: { summary: string } }>;
    };
    assert.equal(firstMsg.content[0].type, "summary");
    assert.equal(firstMsg.content[0].summary.summary, "This is the summary.");
  });

  it("transitions compactionState: idle -> compacting -> idle", async () => {
    const states: string[] = [];
    let resolveCompact: (v: string) => void;
    const compactPromise = new Promise<string>((r) => {
      resolveCompact = r;
    });

    const compactFn: CompactFunction = async () => {
      return compactPromise;
    };

    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 10,
      compactionThresholdPercent: 1,
      keepRecentMessages: 1,
    });

    // Track state changes
    mgr.compactionState.subscribe({ next: (s) => states.push(s) });

    const messages: ThreadMessage[] = [];
    for (let i = 0; i < 10; i++) {
      messages.push(makeTextMessage(i % 2 === 0 ? "user" : "assistant", "x".repeat(100)));
    }
    const thread = makeThread(messages);

    const resultPromise = mgr.checkAndCompact(thread);

    // At this point, compactFn is being awaited, state should be "compacting"
    assert.equal(mgr.compactionState.value, "compacting");

    resolveCompact!("done");
    await resultPromise;

    assert.equal(mgr.compactionState.value, "idle");
    // States should include: idle (initial subscribe), compacting, idle
    assert.ok(states.includes("compacting"));
    assert.equal(states[states.length - 1], "idle");
  });

  it("inserts summary as first message after compaction", async () => {
    const compactFn: CompactFunction = async () => "Summary of earlier messages.";
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 10,
      compactionThresholdPercent: 1,
      keepRecentMessages: 2,
    });

    const messages: ThreadMessage[] = [];
    for (let i = 0; i < 8; i++) {
      messages.push(makeTextMessage(i % 2 === 0 ? "user" : "assistant", "x".repeat(100)));
    }
    const thread = makeThread(messages);

    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, true);
    const first = result.thread.messages[0] as unknown as {
      role: string;
      content: Array<{ type: string; summary: { type: string; summary: string } }>;
    };
    assert.equal(first.role, "user");
    assert.equal(first.content[0].type, "summary");
    assert.equal(first.content[0].summary.type, "message");
    assert.equal(first.content[0].summary.summary, "Summary of earlier messages.");
  });

  it("preserves recent messages after compaction", async () => {
    const compactFn: CompactFunction = async () => "summary";
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 10,
      compactionThresholdPercent: 1,
      keepRecentMessages: 2,
    });

    const messages: ThreadMessage[] = [
      makeTextMessage("user", "old1_" + "x".repeat(100)),
      makeTextMessage("assistant", "old2_" + "x".repeat(100)),
      makeTextMessage("user", "old3_" + "x".repeat(100)),
      makeTextMessage("assistant", "old4_" + "x".repeat(100)),
      makeTextMessage("user", "recent1"),
      makeTextMessage("assistant", "recent2"),
    ];
    const thread = makeThread(messages);

    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, true);
    // Should have: summary + 2 recent messages = 3 total
    assert.equal(result.thread.messages.length, 3);
    const kept1 = result.thread.messages[1] as unknown as { content: Array<{ text: string }> };
    const kept2 = result.thread.messages[2] as unknown as { content: Array<{ text: string }> };
    assert.equal(kept1.content[0].text, "recent1");
    assert.equal(kept2.content[0].text, "recent2");
  });

  it("passes correct messages to compactFn (only older messages)", async () => {
    let receivedMessages: ThreadMessage[] = [];
    const compactFn: CompactFunction = async (msgs) => {
      receivedMessages = msgs;
      return "summary";
    };
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 10,
      compactionThresholdPercent: 1,
      keepRecentMessages: 1,
    });

    const m1 = makeTextMessage("user", "first_" + "x".repeat(100));
    const m2 = makeTextMessage("assistant", "second_" + "x".repeat(100));
    const m3 = makeTextMessage("user", "third_recent");
    const thread = makeThread([m1, m2, m3]);

    await mgr.checkAndCompact(thread);
    // compactFn should receive the first 2 messages (not the last 1 which is kept)
    assert.equal(receivedMessages.length, 2);
    assert.equal(
      (receivedMessages[0] as unknown as { content: Array<{ text: string }> }).content[0].text,
      "first_" + "x".repeat(100),
    );
    assert.equal(
      (receivedMessages[1] as unknown as { content: Array<{ text: string }> }).content[0].text,
      "second_" + "x".repeat(100),
    );
  });

  it("recovers gracefully when compactFn throws", async () => {
    const compactFn: CompactFunction = async () => {
      throw new Error("LLM unavailable");
    };
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 10,
      compactionThresholdPercent: 1,
      keepRecentMessages: 1,
    });

    const messages: ThreadMessage[] = [];
    for (let i = 0; i < 6; i++) {
      messages.push(makeTextMessage(i % 2 === 0 ? "user" : "assistant", "x".repeat(100)));
    }
    const thread = makeThread(messages);

    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, false);
    assert.equal(result.thread, thread); // original thread returned
    assert.equal(result.tokensBefore, result.tokensAfter);
    // State should be back to idle
    assert.equal(mgr.compactionState.value, "idle");
  });

  it("does not compact an empty thread", async () => {
    const mgr = new ContextManager({ compactFn: noopCompactFn });
    const thread = makeThread([]);
    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, false);
    assert.equal(result.thread, thread);
  });

  it("trims trailing incomplete tool_use messages from kept messages", async () => {
    const compactFn: CompactFunction = async () => "summary";
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 10,
      compactionThresholdPercent: 1,
      keepRecentMessages: 3,
    });

    const messages: ThreadMessage[] = [
      makeTextMessage("user", "old_" + "x".repeat(100)),
      makeTextMessage("assistant", "old_" + "x".repeat(100)),
      makeTextMessage("user", "old_" + "x".repeat(100)),
      makeTextMessage("user", "kept_user"),
      makeTextMessage("assistant", "kept_assistant"),
      makeToolUseMessage(), // incomplete: no following tool_result
    ];
    const thread = makeThread(messages);

    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, true);
    // The trailing tool_use message should be trimmed
    // summary + kept_user + kept_assistant = 3 (tool_use removed)
    const msgContents = result.thread.messages.map((m: ThreadMessage) => {
      const first = (
        m.content as Array<{ type: string; text?: string; summary?: { summary: string } }>
      )[0];
      if (first.type === "summary") return "summary";
      if (first.type === "text") return first.text;
      return first.type;
    });
    assert.ok(!msgContents.includes("tool_use"), "tool_use message should be trimmed");
    assert.ok(msgContents.includes("kept_user"));
    assert.ok(msgContents.includes("kept_assistant"));
  });

  it("respects custom modelContextWindow", async () => {
    let called = false;
    const compactFn: CompactFunction = async () => {
      called = true;
      return "s";
    };

    // With a large window, messages should be under threshold
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 1_000_000,
      keepRecentMessages: 1,
    });

    const messages: ThreadMessage[] = [];
    for (let i = 0; i < 10; i++) {
      messages.push(makeTextMessage(i % 2 === 0 ? "user" : "assistant", "x".repeat(20)));
    }
    const thread = makeThread(messages);

    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, false);
    assert.equal(called, false);
  });

  it("respects custom compactionThresholdPercent", async () => {
    let called = false;
    const compactFn: CompactFunction = async () => {
      called = true;
      return "s";
    };

    // Window = 100, threshold at 10% = 10 tokens
    // Even a small thread will exceed 10 tokens
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 100,
      compactionThresholdPercent: 10, // threshold = 10 tokens
      keepRecentMessages: 1,
    });

    const messages: ThreadMessage[] = [
      makeTextMessage("user", "x".repeat(100)), // well over 10 tokens
      makeTextMessage("assistant", "x".repeat(100)),
      makeTextMessage("user", "x".repeat(100)),
      makeTextMessage("assistant", "x".repeat(100)),
      makeTextMessage("user", "last"),
    ];
    const thread = makeThread(messages);

    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, true);
    assert.equal(called, true);
  });

  it("returns correct CompactionResult fields", async () => {
    const compactFn: CompactFunction = async () => "My summary text";
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 10,
      compactionThresholdPercent: 1,
      keepRecentMessages: 1,
    });

    const messages: ThreadMessage[] = [
      makeTextMessage("user", "x".repeat(200)),
      makeTextMessage("assistant", "y".repeat(200)),
      makeTextMessage("user", "z".repeat(200)),
      makeTextMessage("assistant", "w".repeat(200)),
      makeTextMessage("user", "last"),
    ];
    const thread = makeThread(messages);

    const result = await mgr.checkAndCompact(thread);

    assert.equal(typeof result.tokensBefore, "number");
    assert.equal(typeof result.tokensAfter, "number");
    assert.ok(result.tokensBefore > 0);
    assert.ok(result.tokensAfter > 0);
    assert.ok(result.tokensAfter < result.tokensBefore);
    assert.equal(result.compacted, true);
    assert.equal(result.summary, "My summary text");
    assert.ok(result.thread.id === "t1");
    assert.ok(result.thread.v === 1);
  });

  it("does not compact when message count is at or below keepRecent", async () => {
    let called = false;
    const compactFn: CompactFunction = async () => {
      called = true;
      return "s";
    };
    const mgr = new ContextManager({
      compactFn,
      modelContextWindow: 10, // tiny window
      compactionThresholdPercent: 1, // very low threshold
      keepRecentMessages: 4,
    });

    // Only 4 messages = keepRecent, so no compaction even if over threshold
    const messages: ThreadMessage[] = [
      makeTextMessage("user", "x".repeat(200)),
      makeTextMessage("assistant", "y".repeat(200)),
      makeTextMessage("user", "z".repeat(200)),
      makeTextMessage("assistant", "w".repeat(200)),
    ];
    const thread = makeThread(messages);

    const result = await mgr.checkAndCompact(thread);
    assert.equal(result.compacted, false);
    assert.equal(called, false);
  });
});
