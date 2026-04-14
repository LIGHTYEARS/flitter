import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import {
  AssistantMessageStateSchema,
  AssistantThreadMessageSchema,
  CompactionStateSchema,
  ConnectionInfoSchema,
  ConnectionModeSchema,
  ConnectionStateSchema,
  ConversationDeltaSchema,
  GuidanceFileRefSchema,
  InfoThreadMessageSchema,
  QueuedMessageEntrySchema,
  ReconnectCauseSchema,
  ThreadContentBlockSchema,
  ThreadEnvironmentSchema,
  ThreadMessageSchema,
  ThreadMetaSchema,
  ThreadRelationshipSchema,
  ThreadSnapshotSchema,
  ThreadSummarySchema,
  UserThreadMessageSchema,
} from "./thread";

// ─── Helpers ────────────────────────────────────────────

/** Minimal valid ToolRun (status: "done") for manual_bash_invocation blocks */
const toolRunDone = { status: "done" as const };

/** Minimal valid Usage object */
const usage = {
  model: "claude-opus-4-5-20251101",
  maxInputTokens: 200000,
  inputTokens: 1500,
  outputTokens: 300,
  cacheCreationInputTokens: null,
  cacheReadInputTokens: null,
  totalInputTokens: 1500,
  timestamp: "2026-04-12T00:00:00Z",
};

/** Helper: a minimal user thread message */
function makeUserMsg(overrides: Record<string, unknown> = {}) {
  return {
    role: "user",
    content: [{ type: "text", text: "hello" }],
    messageId: 1,
    ...overrides,
  };
}

/** Helper: a minimal assistant thread message */
function makeAssistantMsg(overrides: Record<string, unknown> = {}) {
  return {
    role: "assistant",
    content: [{ type: "text", text: "hi" }],
    messageId: 2,
    state: { type: "complete", stopReason: "end_turn" },
    ...overrides,
  };
}

/** Helper: a minimal info thread message */
function makeInfoMsg(overrides: Record<string, unknown> = {}) {
  return {
    role: "info",
    content: [{ type: "text", text: "info" }],
    messageId: 3,
    ...overrides,
  };
}

// ─── 1. GuidanceFileRef ─────────────────────────────────

describe("GuidanceFileRefSchema", () => {
  it("parses with content", () => {
    const result = GuidanceFileRefSchema.parse({
      uri: "file:///home/user/CLAUDE.md",
      lineCount: 42,
      content: "# Instructions\nDo things.",
    });
    assert.equal(result.uri, "file:///home/user/CLAUDE.md");
    assert.equal(result.lineCount, 42);
    assert.equal(result.content, "# Instructions\nDo things.");
  });

  it("parses without content (optional)", () => {
    const result = GuidanceFileRefSchema.parse({
      uri: "file:///project/.cursorrules",
      lineCount: 0,
    });
    assert.equal(result.content, undefined);
    assert.equal(result.lineCount, 0);
  });

  it("rejects negative lineCount", () => {
    assert.throws(() => {
      GuidanceFileRefSchema.parse({ uri: "x", lineCount: -1 });
    });
  });

  it("rejects non-integer lineCount", () => {
    assert.throws(() => {
      GuidanceFileRefSchema.parse({ uri: "x", lineCount: 3.5 });
    });
  });
});

// ─── 2. ThreadRelationship ──────────────────────────────

describe("ThreadRelationshipSchema", () => {
  it("parses full relationship", () => {
    const result = ThreadRelationshipSchema.parse({
      threadID: "thread_abc123",
      type: "handoff",
      messageIndex: 5,
      blockIndex: 2,
      comment: "Handed off from parent",
    });
    assert.equal(result.threadID, "thread_abc123");
    assert.equal(result.type, "handoff");
    assert.equal(result.messageIndex, 5);
    assert.equal(result.blockIndex, 2);
    assert.equal(result.comment, "Handed off from parent");
  });

  it("parses minimal relationship (only required fields)", () => {
    const result = ThreadRelationshipSchema.parse({
      threadID: "t1",
      type: "handoff",
    });
    assert.equal(result.messageIndex, undefined);
    assert.equal(result.blockIndex, undefined);
    assert.equal(result.comment, undefined);
  });

  it("rejects wrong type literal", () => {
    assert.throws(() => {
      ThreadRelationshipSchema.parse({ threadID: "t1", type: "fork" });
    });
  });
});

// ─── 3. ThreadMeta ──────────────────────────────────────

describe("ThreadMetaSchema", () => {
  it("parses with all optional fields", () => {
    const result = ThreadMetaSchema.parse({
      status: "running",
      executorType: "claude-code",
    });
    assert.equal(result.status, "running");
    assert.equal(result.executorType, "claude-code");
  });

  it("parses empty object (all fields optional)", () => {
    const result = ThreadMetaSchema.parse({});
    assert.equal(result.status, undefined);
    assert.equal(result.executorType, undefined);
  });
});

// ─── 4. ThreadEnvironment ───────────────────────────────

describe("ThreadEnvironmentSchema", () => {
  it("parses with trees and platform", () => {
    const result = ThreadEnvironmentSchema.parse({
      trees: [{ path: "/home/user/project" }],
      platform: "linux",
    });
    assert.equal(result.platform, "linux");
    assert.equal(result.trees.length, 1);
  });

  it("parses with initial.trees containing repository info", () => {
    const result = ThreadEnvironmentSchema.parse({
      initial: {
        trees: [{ repository: { url: "https://github.com/org/repo.git" } }, { repository: {} }, {}],
      },
      trees: [],
      platform: "darwin",
    });
    assert.equal(result.platform, "darwin");
    assert.equal(result.initial!.trees!.length, 3);
  });

  it("rejects missing platform", () => {
    assert.throws(() => {
      ThreadEnvironmentSchema.parse({ trees: [] });
    });
  });
});

// ─── 5. ThreadContentBlock — all 9 type variants ────────

describe("ThreadContentBlockSchema", () => {
  it("parses text block", () => {
    const result = ThreadContentBlockSchema.parse({
      type: "text",
      text: "Hello world",
    });
    assert.deepEqual(result, { type: "text", text: "Hello world" });
  });

  it("parses tool_use block", () => {
    const result = ThreadContentBlockSchema.parse({
      type: "tool_use",
      id: "tu_1",
      name: "Bash",
      input: { command: "ls" },
    });
    assert.equal((result as unknown as { name: string }).name, "Bash");
  });

  it("parses tool_result block", () => {
    const result = ThreadContentBlockSchema.parse({
      type: "tool_result",
      toolUseID: "tu_1",
      output: "file.txt",
      status: "success",
    });
    assert.equal((result as unknown as { toolUseID: string }).toolUseID, "tu_1");
  });

  it("parses thinking block", () => {
    const result = ThreadContentBlockSchema.parse({
      type: "thinking",
      thinking: "Let me consider...",
    });
    assert.equal((result as unknown as { thinking: string }).thinking, "Let me consider...");
  });

  it("parses redacted_thinking block", () => {
    const result = ThreadContentBlockSchema.parse({
      type: "redacted_thinking",
      data: "base64encodeddata",
    });
    assert.equal((result as unknown as { data: string }).data, "base64encodeddata");
  });

  it("parses summary block", () => {
    const result = ThreadContentBlockSchema.parse({
      type: "summary",
      summary: { type: "message", summary: "A brief summary." },
    });
    assert.equal(
      (result as unknown as { summary: { summary: string } }).summary.summary,
      "A brief summary.",
    );
  });

  it("parses manual_bash_invocation block", () => {
    const result = ThreadContentBlockSchema.parse({
      type: "manual_bash_invocation",
      args: { cmd: "echo hi" },
      toolRun: toolRunDone,
      hidden: true,
    });
    assert.equal((result as unknown as { hidden: boolean }).hidden, true);
  });

  it("parses server_tool_use block", () => {
    const result = ThreadContentBlockSchema.parse({
      type: "server_tool_use",
      id: "stu_1",
      name: "web_search",
      input: { query: "hello" },
    });
    assert.equal((result as unknown as { name: string }).name, "web_search");
  });

  it("parses image block", () => {
    const result = ThreadContentBlockSchema.parse({
      type: "image",
      source: { type: "base64", mediaType: "image/png", data: "abc" },
    });
    assert.equal(result.type, "image");
  });

  it("rejects unknown block type", () => {
    assert.throws(() => {
      ThreadContentBlockSchema.parse({ type: "video", url: "http://x" });
    });
  });
});

// ─── 6. UserThreadMessage ───────────────────────────────

describe("UserThreadMessageSchema", () => {
  it("parses full user message with all optional fields", () => {
    const result = UserThreadMessageSchema.parse({
      role: "user",
      content: [{ type: "text", text: "hi" }],
      messageId: 1,
      dtwMessageID: "dtw_001",
      meta: { sentAt: 1712880000 },
      userState: { lastFile: "foo.ts" },
      readAt: 1712880001,
      agentMode: "code",
      discoveredGuidanceFiles: [{ uri: "file:///CLAUDE.md", lineCount: 10, content: "rules" }],
      parentToolUseId: "tu_parent",
    });
    assert.equal(result.role, "user");
    assert.equal(result.dtwMessageID, "dtw_001");
    assert.equal(result.agentMode, "code");
    assert.equal(result.discoveredGuidanceFiles!.length, 1);
    assert.equal(result.parentToolUseId, "tu_parent");
  });

  it("parses minimal user message", () => {
    const result = UserThreadMessageSchema.parse(makeUserMsg());
    assert.equal(result.role, "user");
    assert.equal(result.messageId, 1);
  });
});

// ─── 7. AssistantThreadMessage ──────────────────────────

describe("AssistantThreadMessageSchema", () => {
  it("parses with state=complete (end_turn)", () => {
    const result = AssistantThreadMessageSchema.parse(makeAssistantMsg());
    assert.equal(result.state.type, "complete");
  });

  it("parses with state=complete (tool_use)", () => {
    const result = AssistantThreadMessageSchema.parse(
      makeAssistantMsg({
        state: { type: "complete", stopReason: "tool_use" },
      }),
    );
    assert.equal((result.state as { type: "complete"; stopReason: string }).stopReason, "tool_use");
  });

  it("parses with state=streaming", () => {
    const result = AssistantThreadMessageSchema.parse(
      makeAssistantMsg({ state: { type: "streaming" } }),
    );
    assert.equal(result.state.type, "streaming");
  });

  it("parses with state=cancelled", () => {
    const result = AssistantThreadMessageSchema.parse(
      makeAssistantMsg({
        state: { type: "cancelled" },
        cancelled: true,
      }),
    );
    assert.equal(result.state.type, "cancelled");
    assert.equal(result.cancelled, true);
  });

  it("parses with usage", () => {
    const result = AssistantThreadMessageSchema.parse(makeAssistantMsg({ usage }));
    assert.equal(result.usage!.model, "claude-opus-4-5-20251101");
  });

  it("rejects invalid stopReason", () => {
    assert.throws(() => {
      AssistantMessageStateSchema.parse({
        type: "complete",
        stopReason: "max_tokens",
      });
    });
  });
});

// ─── 8. InfoThreadMessage ───────────────────────────────

describe("InfoThreadMessageSchema", () => {
  it("parses info message", () => {
    const result = InfoThreadMessageSchema.parse(makeInfoMsg());
    assert.equal(result.role, "info");
    assert.equal(result.messageId, 3);
  });

  it("parses with optional fields", () => {
    const result = InfoThreadMessageSchema.parse(
      makeInfoMsg({
        dtwMessageID: "dtw_info",
        parentToolUseId: "tu_parent",
      }),
    );
    assert.equal(result.dtwMessageID, "dtw_info");
    assert.equal(result.parentToolUseId, "tu_parent");
  });
});

// ─── 9. ThreadMessage discriminated union ────────────────

describe("ThreadMessageSchema (discriminated union)", () => {
  it("parses user message by role", () => {
    const result = ThreadMessageSchema.parse(makeUserMsg());
    assert.equal(result.role, "user");
  });

  it("parses assistant message by role", () => {
    const result = ThreadMessageSchema.parse(makeAssistantMsg());
    assert.equal(result.role, "assistant");
  });

  it("parses info message by role", () => {
    const result = ThreadMessageSchema.parse(makeInfoMsg());
    assert.equal(result.role, "info");
  });

  it("rejects unknown role", () => {
    assert.throws(() => {
      ThreadMessageSchema.parse({
        role: "system",
        content: [],
        messageId: 0,
      });
    });
  });
});

// ─── 10. QueuedMessageEntry ─────────────────────────────

describe("QueuedMessageEntrySchema", () => {
  it("parses with user message", () => {
    const result = QueuedMessageEntrySchema.parse({
      id: "q_1",
      interrupt: false,
      queuedMessage: makeUserMsg(),
    });
    assert.equal(result.id, "q_1");
    assert.equal(result.interrupt, false);
    assert.equal(result.queuedMessage.role, "user");
  });

  it("rejects missing interrupt field", () => {
    assert.throws(() => {
      QueuedMessageEntrySchema.parse({
        id: "q_2",
        queuedMessage: makeUserMsg(),
      });
    });
  });
});

// ─── 11. ThreadSnapshot ─────────────────────────────────

describe("ThreadSnapshotSchema", () => {
  it("parses full snapshot with messages and queue", () => {
    const result = ThreadSnapshotSchema.parse({
      id: "thread_snap_1",
      v: 42,
      title: "Fix bug in parser",
      agentMode: "code",
      messages: [makeUserMsg(), makeAssistantMsg()],
      queuedMessages: [
        {
          id: "q_1",
          interrupt: true,
          queuedMessage: makeUserMsg({ messageId: 10 }),
        },
      ],
      relationships: [{ threadID: "t_parent", type: "handoff" }],
      nextMessageId: 11,
      meta: { status: "active", executorType: "claude" },
      env: { trees: [], platform: "linux" },
    });
    assert.equal(result.id, "thread_snap_1");
    assert.equal(result.v, 42);
    assert.equal(result.messages.length, 2);
    assert.equal(result.queuedMessages!.length, 1);
    assert.equal(result.relationships!.length, 1);
    assert.equal(result.nextMessageId, 11);
  });

  it("parses minimal snapshot", () => {
    const result = ThreadSnapshotSchema.parse({
      id: "snap_min",
      v: 1,
      messages: [],
    });
    assert.equal(result.messages.length, 0);
    assert.equal(result.title, undefined);
    assert.equal(result.queuedMessages, undefined);
  });
});

// ─── 12. ConnectionState ────────────────────────────────

describe("ConnectionStateSchema", () => {
  const validStates = [
    "connected",
    "reconnecting",
    "disconnected",
    "connecting",
    "authenticating",
  ] as const;

  for (const state of validStates) {
    it(`accepts "${state}"`, () => {
      assert.equal(ConnectionStateSchema.parse(state), state);
    });
  }

  it("rejects invalid state", () => {
    assert.throws(() => {
      ConnectionStateSchema.parse("idle");
    });
  });
});

// ─── 13. ConnectionInfo ─────────────────────────────────

describe("ConnectionInfoSchema", () => {
  it("parses with reconnect cause", () => {
    const result = ConnectionInfoSchema.parse({
      state: "reconnecting",
      role: "executor",
      clientId: "client_abc",
      threadId: "thread_xyz",
      reconnectCause: {
        type: "websocket_error",
        at: 1712880000,
        code: 1006,
        reason: "abnormal closure",
        error: "ECONNRESET",
      },
    });
    assert.equal(result.state, "reconnecting");
    assert.equal(result.role, "executor");
    assert.equal(result.reconnectCause!.code, 1006);
  });

  it("parses minimal connection info", () => {
    const result = ConnectionInfoSchema.parse({ state: "connected" });
    assert.equal(result.state, "connected");
    assert.equal(result.role, undefined);
    assert.equal(result.reconnectCause, undefined);
  });

  it("parses observer role", () => {
    const result = ConnectionInfoSchema.parse({
      state: "connected",
      role: "observer",
    });
    assert.equal(result.role, "observer");
  });
});

// ─── 14. CompactionState ────────────────────────────────

describe("CompactionStateSchema", () => {
  it('accepts "idle"', () => {
    assert.equal(CompactionStateSchema.parse("idle"), "idle");
  });

  it('accepts "compacting"', () => {
    assert.equal(CompactionStateSchema.parse("compacting"), "compacting");
  });

  it("rejects invalid value", () => {
    assert.throws(() => {
      CompactionStateSchema.parse("running");
    });
  });
});

// ─── 14b. ConnectionMode ────────────────────────────────

describe("ConnectionModeSchema", () => {
  it('accepts "observer"', () => {
    assert.equal(ConnectionModeSchema.parse("observer"), "observer");
  });

  it('accepts "executor+observer"', () => {
    assert.equal(ConnectionModeSchema.parse("executor+observer"), "executor+observer");
  });
});

// ─── 15. ThreadSummary ──────────────────────────────────

describe("ThreadSummarySchema", () => {
  it("parses full summary with description", () => {
    const result = ThreadSummarySchema.parse({
      id: "thread_001",
      title: "Refactor auth module",
      updatedAt: "2026-04-12T10:30:00Z",
      description: {
        timeAgo: "2 hours ago",
        title: "Refactor auth module",
        shortThreadID: "001",
      },
      diffStats: { insertions: 42, deletions: 10 },
      workspaceURI: "file:///home/user/project",
      relationships: [{ threadID: "t_0", type: "handoff" }],
      agentMode: "code",
      details: { messageCount: 15 },
      archived: false,
    });
    assert.equal(result.id, "thread_001");
    assert.equal(result.description.timeAgo, "2 hours ago");
    assert.equal(result.details.messageCount, 15);
    assert.equal(result.archived, false);
  });

  it("parses minimal summary (required fields only)", () => {
    const result = ThreadSummarySchema.parse({
      id: "t_min",
      title: "Quick task",
      updatedAt: "2026-04-12T00:00:00Z",
      description: {
        timeAgo: "just now",
        title: "Quick task",
        shortThreadID: "min",
      },
      details: { messageCount: 1 },
    });
    assert.equal(result.diffStats, undefined);
    assert.equal(result.workspaceURI, undefined);
    assert.equal(result.archived, undefined);
  });
});

// ─── 16. ConversationDelta — at least 8 variants ────────

describe("ConversationDeltaSchema", () => {
  it("parses cancelled delta", () => {
    const result = ConversationDeltaSchema.parse({ type: "cancelled" });
    assert.equal(result.type, "cancelled");
  });

  it("parses user:message delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "user:message",
      message: { role: "user", content: [] },
      index: 0,
    });
    assert.equal(result.type, "user:message");
  });

  it("parses user:message:interrupt delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "user:message:interrupt",
      messageIndex: 3,
    });
    assert.equal(result.type, "user:message:interrupt");
    assert.equal((result as unknown as { messageIndex: number }).messageIndex, 3);
  });

  it("parses user:message:append-content delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "user:message:append-content",
      messageId: 5,
      content: { type: "text", text: "more" },
    });
    assert.equal(result.type, "user:message:append-content");
  });

  it("parses user:message-queue:enqueue delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "user:message-queue:enqueue",
      message: { id: "q1" },
    });
    assert.equal(result.type, "user:message-queue:enqueue");
  });

  it("parses user:message-queue:dequeue delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "user:message-queue:dequeue",
    });
    assert.equal(result.type, "user:message-queue:dequeue");
  });

  it("parses user:message-queue:discard delta with id", () => {
    const result = ConversationDeltaSchema.parse({
      type: "user:message-queue:discard",
      id: "q_discard",
    });
    assert.equal((result as unknown as { id: string }).id, "q_discard");
  });

  it("parses assistant:message delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "assistant:message",
      message: { role: "assistant", content: [] },
    });
    assert.equal(result.type, "assistant:message");
  });

  it("parses assistant:message-update delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "assistant:message-update",
      message: { content: [{ type: "text", text: "updated" }] },
    });
    assert.equal(result.type, "assistant:message-update");
  });

  it("parses inference:completed delta with usage", () => {
    const result = ConversationDeltaSchema.parse({
      type: "inference:completed",
      usage,
      model: "claude-opus-4-5-20251101",
    });
    assert.equal(result.type, "inference:completed");
    assert.equal((result as unknown as { model: string }).model, "claude-opus-4-5-20251101");
  });

  it("parses title delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "title",
      value: "New title",
    });
    assert.equal((result as unknown as { value: string }).value, "New title");
  });

  it("parses thread:truncate delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "thread:truncate",
      fromIndex: 5,
    });
    assert.equal((result as unknown as { fromIndex: number }).fromIndex, 5);
  });

  it("parses relationship delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "relationship",
      relationship: { threadID: "t_child", type: "handoff" },
    });
    assert.equal(result.type, "relationship");
  });

  it("parses draft delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "draft",
      content: "draft text",
      autoSubmit: true,
    });
    assert.equal((result as unknown as { autoSubmit: boolean }).autoSubmit, true);
  });

  it("parses agent-mode delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "agent-mode",
      mode: "code",
    });
    assert.equal((result as unknown as { mode: string }).mode, "code");
  });

  it("parses environment delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "environment",
      env: { trees: [], platform: "linux" },
    });
    assert.equal(result.type, "environment");
  });

  it("parses trace:start delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "trace:start",
      span: { id: "span_1" },
    });
    assert.equal(result.type, "trace:start");
  });

  it("parses trace:end delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "trace:end",
      span: { id: "span_1" },
    });
    assert.equal(result.type, "trace:end");
  });

  it("parses tool:data delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "tool:data",
      toolUse: "tu_1",
      data: { partial: true },
    });
    assert.equal((result as unknown as { toolUse: string }).toolUse, "tu_1");
  });

  it("parses info:manual-bash-invocation delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "info:manual-bash-invocation",
      args: { cmd: "echo hello" },
      toolRun: toolRunDone,
      hidden: false,
    });
    assert.equal(result.type, "info:manual-bash-invocation");
  });

  it("parses setPendingNavigation delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "setPendingNavigation",
      threadID: "thread_nav",
    });
    assert.equal((result as unknown as { threadID: string }).threadID, "thread_nav");
  });

  it("parses clearPendingNavigation delta", () => {
    const result = ConversationDeltaSchema.parse({
      type: "clearPendingNavigation",
    });
    assert.equal(result.type, "clearPendingNavigation");
  });
});

// ─── 17. Reject invalid data ────────────────────────────

describe("Reject invalid data", () => {
  it("rejects ThreadMessage with wrong role", () => {
    assert.throws(() => {
      ThreadMessageSchema.parse({
        role: "system",
        content: [],
        messageId: 0,
      });
    });
  });

  it("rejects ConversationDelta with invalid type", () => {
    assert.throws(() => {
      ConversationDeltaSchema.parse({ type: "nonexistent:delta" });
    });
  });

  it("rejects AssistantThreadMessage missing state", () => {
    assert.throws(() => {
      AssistantThreadMessageSchema.parse({
        role: "assistant",
        content: [],
        messageId: 1,
      });
    });
  });

  it("rejects ThreadSnapshot missing id", () => {
    assert.throws(() => {
      ThreadSnapshotSchema.parse({ v: 1, messages: [] });
    });
  });

  it("rejects ThreadSnapshot missing v", () => {
    assert.throws(() => {
      ThreadSnapshotSchema.parse({ id: "x", messages: [] });
    });
  });

  it("rejects ConnectionInfo with invalid role enum", () => {
    assert.throws(() => {
      ConnectionInfoSchema.parse({ state: "connected", role: "admin" });
    });
  });

  it("rejects ReconnectCause missing required fields", () => {
    assert.throws(() => {
      ReconnectCauseSchema.parse({ type: "error" });
    });
  });
});

// ─── 18. JSON Schema conversion ─────────────────────────

describe("JSON Schema conversion", () => {
  it("converts ThreadSnapshotSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(ThreadSnapshotSchema);
    assert.equal(typeof jsonSchema, "object");
    assert.ok(jsonSchema !== null);
    assert.ok(
      "type" in jsonSchema ||
        "anyOf" in jsonSchema ||
        "$ref" in jsonSchema ||
        "properties" in jsonSchema,
    );
  });

  it("converts ConnectionStateSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(ConnectionStateSchema);
    assert.equal(typeof jsonSchema, "object");
    assert.ok(jsonSchema !== null);
  });

  it("converts ConversationDeltaSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(ConversationDeltaSchema);
    assert.equal(typeof jsonSchema, "object");
    assert.ok(jsonSchema !== null);
  });
});
