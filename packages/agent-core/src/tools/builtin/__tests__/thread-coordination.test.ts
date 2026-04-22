/**
 * Tests for cross-thread coordination tools (thread_status, send_message_to_thread)
 *
 * 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
 *   - ThreadWorkerService.get() returns worker or undefined
 *   - f3T() computes status with inferenceState + toolState + interactionState
 *
 * 逆向: amp-cli-reversed/modules/1208_unknown_V7R.js (Agg Man prompt)
 *   - send_message_to_thread: enqueues user message on target thread
 *   - workflow param: "merge_changes" | "code_review" for canonical prompts
 */
import { describe, expect, test } from "bun:test";
import type { ThreadSnapshot } from "@flitter/schemas";
import {
  createSendMessageToThreadTool,
  createThreadStatusTool,
  type SendMessageToThreadCallbacks,
  type ThreadStatusCallbacks,
  type ThreadStatusInfo,
} from "../thread-coordination.js";

// ─── Helpers ────────────────────────────────────────────

function makeStatusCallbacks(opts?: {
  status?: ThreadStatusInfo;
  snapshot?: ThreadSnapshot;
  activeIds?: string[];
}): ThreadStatusCallbacks {
  return {
    getThreadStatus: (_id: string) => opts?.status,
    getThreadSnapshot: (_id: string) => opts?.snapshot,
    getActiveThreadIds: () => opts?.activeIds ?? [],
  };
}

function makeSnapshot(overrides?: Partial<ThreadSnapshot>): ThreadSnapshot {
  return {
    id: "thread-123",
    v: 1,
    title: "Test Thread",
    messages: [],
    env: "local",
    agentMode: "smart",
    relationships: [],
    ...overrides,
  } as unknown as ThreadSnapshot;
}

function makeActiveStatus(overrides?: Partial<ThreadStatusInfo>): ThreadStatusInfo {
  return {
    inferenceState: "running",
    toolState: { running: 1, blocked: 0 },
    interactionState: "tool-running",
    ...overrides,
  };
}

function makeSendCallbacks(opts?: {
  hasThread?: boolean;
  sendResult?: boolean;
  shouldThrow?: boolean;
}): {
  calls: Array<{ threadId: string; message: string; workflow?: string }>;
  callbacks: SendMessageToThreadCallbacks;
} {
  const calls: Array<{ threadId: string; message: string; workflow?: string }> = [];
  return {
    calls,
    callbacks: {
      sendMessage: async (threadId: string, message: string, workflow?: string) => {
        calls.push({ threadId, message, workflow });
        if (opts?.shouldThrow) throw new Error("Connection lost");
        return opts?.sendResult ?? true;
      },
      hasThread: () => opts?.hasThread ?? true,
    },
  };
}

// ─── thread_status tool ─────────────────────────────────

describe("thread_status tool", () => {
  describe("spec", () => {
    const callbacks = makeStatusCallbacks();
    const tool = createThreadStatusTool(callbacks);

    test("has correct name and source", () => {
      expect(tool.name).toBe("thread_status");
      expect(tool.source).toBe("builtin");
    });

    test("is read-only", () => {
      expect(tool.isReadOnly).toBe(true);
    });

    test("has required param: thread_id", () => {
      const schema = tool.inputSchema as { required: string[] };
      expect(schema.required).toEqual(["thread_id"]);
    });

    test("has thread_id property in schema", () => {
      const schema = tool.inputSchema as {
        properties: Record<string, { type: string }>;
      };
      expect(schema.properties.thread_id).toBeDefined();
      expect(schema.properties.thread_id.type).toBe("string");
    });

    test("has empty resourceKeys", () => {
      expect(tool.executionProfile?.resourceKeys).toEqual([]);
    });
  });

  describe("execute", () => {
    test("returns error when thread_id is missing", async () => {
      const callbacks = makeStatusCallbacks();
      const tool = createThreadStatusTool(callbacks);
      const result = await tool.execute!({});
      expect(result.status).toBe("error");
      expect(result.error).toContain("thread_id");
    });

    test("returns error when thread_id is not a string", async () => {
      const callbacks = makeStatusCallbacks();
      const tool = createThreadStatusTool(callbacks);
      const result = await tool.execute!({ thread_id: 123 });
      expect(result.status).toBe("error");
      expect(result.error).toContain("thread_id");
    });

    test("returns error for non-existent thread with active thread list", async () => {
      const callbacks = makeStatusCallbacks({
        activeIds: ["thread-A", "thread-B"],
      });
      const tool = createThreadStatusTool(callbacks);
      const result = await tool.execute!({ thread_id: "thread-unknown" });
      expect(result.status).toBe("error");
      expect(result.error).toContain("not found");
      expect(result.error).toContain("thread-A");
      expect(result.error).toContain("thread-B");
    });

    test("returns error for non-existent thread with no active threads", async () => {
      const callbacks = makeStatusCallbacks({ activeIds: [] });
      const tool = createThreadStatusTool(callbacks);
      const result = await tool.execute!({ thread_id: "thread-unknown" });
      expect(result.status).toBe("error");
      expect(result.error).toContain("none");
    });

    test("returns active status for running thread", async () => {
      const callbacks = makeStatusCallbacks({
        status: makeActiveStatus({
          inferenceState: "running",
          toolState: { running: 2, blocked: 1 },
          interactionState: "tool-running",
        }),
        snapshot: makeSnapshot({
          id: "thread-123",
          title: "My Task",
          messages: [
            { role: "user", content: "test" } as never,
            { role: "assistant", content: "ok" } as never,
          ],
        }),
      });
      const tool = createThreadStatusTool(callbacks);
      const result = await tool.execute!({ thread_id: "thread-123" });

      expect(result.status).toBe("done");
      const data = result.data as Record<string, unknown>;
      expect(data.state).toBe("active");
      expect(data.inference_state).toBe("running");
      expect(data.tools_running).toBe(2);
      expect(data.tools_blocked).toBe(1);
      expect(data.interaction_state).toBe("tool-running");
      expect(data.title).toBe("My Task");
      expect(data.message_count).toBe(2);
    });

    test("returns idle status for active idle thread", async () => {
      const callbacks = makeStatusCallbacks({
        status: makeActiveStatus({
          inferenceState: "idle",
          toolState: { running: 0, blocked: 0 },
          interactionState: "user-message-reply",
        }),
        snapshot: makeSnapshot({ title: "Done Task" }),
      });
      const tool = createThreadStatusTool(callbacks);
      const result = await tool.execute!({ thread_id: "thread-123" });

      expect(result.status).toBe("done");
      const data = result.data as Record<string, unknown>;
      expect(data.state).toBe("active");
      expect(data.inference_state).toBe("idle");
      expect(data.interaction_state).toBe("user-message-reply");
    });

    test("returns inactive status for thread with snapshot but no worker", async () => {
      const callbacks = makeStatusCallbacks({
        status: undefined, // no active worker
        snapshot: makeSnapshot({
          id: "thread-456",
          title: "Old Thread",
          messages: [{ role: "user", content: "hello" } as never],
        }),
      });
      const tool = createThreadStatusTool(callbacks);
      const result = await tool.execute!({ thread_id: "thread-456" });

      expect(result.status).toBe("done");
      const data = result.data as Record<string, unknown>;
      expect(data.state).toBe("inactive");
      expect(data.inference_state).toBe("idle");
      expect(data.tools_running).toBe(0);
      expect(data.tools_blocked).toBe(0);
      expect(data.interaction_state).toBe(false);
      expect(data.message_count).toBe(1);
    });

    test("returns content as JSON string", async () => {
      const callbacks = makeStatusCallbacks({
        status: makeActiveStatus(),
        snapshot: makeSnapshot(),
      });
      const tool = createThreadStatusTool(callbacks);
      const result = await tool.execute!({ thread_id: "thread-123" });

      expect(result.status).toBe("done");
      expect(typeof result.content).toBe("string");
      const parsed = JSON.parse(result.content!);
      expect(parsed.thread_id).toBe("thread-123");
    });
  });
});

// ─── send_message_to_thread tool ────────────────────────

describe("send_message_to_thread tool", () => {
  describe("spec", () => {
    const { callbacks } = makeSendCallbacks();
    const tool = createSendMessageToThreadTool(callbacks);

    test("has correct name and source", () => {
      expect(tool.name).toBe("send_message_to_thread");
      expect(tool.source).toBe("builtin");
    });

    test("has required params: thread_id, message", () => {
      const schema = tool.inputSchema as { required: string[] };
      expect(schema.required).toEqual(["thread_id", "message"]);
    });

    test("has optional workflow param", () => {
      const schema = tool.inputSchema as {
        properties: Record<string, unknown>;
      };
      expect(schema.properties.workflow).toBeDefined();
    });

    test("has thread_id and message in properties", () => {
      const schema = tool.inputSchema as {
        properties: Record<string, { type: string }>;
      };
      expect(schema.properties.thread_id.type).toBe("string");
      expect(schema.properties.message.type).toBe("string");
    });

    test("has empty resourceKeys", () => {
      expect(tool.executionProfile?.resourceKeys).toEqual([]);
    });
  });

  describe("execute", () => {
    test("returns error when thread_id is missing", async () => {
      const { callbacks } = makeSendCallbacks();
      const tool = createSendMessageToThreadTool(callbacks);
      const result = await tool.execute!({ message: "hello" });
      expect(result.status).toBe("error");
      expect(result.error).toContain("thread_id");
    });

    test("returns error when message is missing", async () => {
      const { callbacks } = makeSendCallbacks();
      const tool = createSendMessageToThreadTool(callbacks);
      const result = await tool.execute!({ thread_id: "thread-1" });
      expect(result.status).toBe("error");
      expect(result.error).toContain("message");
    });

    test("returns error when thread does not exist", async () => {
      const { callbacks } = makeSendCallbacks({ hasThread: false });
      const tool = createSendMessageToThreadTool(callbacks);
      const result = await tool.execute!({ thread_id: "thread-gone", message: "hello" });
      expect(result.status).toBe("error");
      expect(result.error).toContain("not found");
      expect(result.error).toContain("thread-gone");
    });

    test("sends message to existing thread", async () => {
      const { calls, callbacks } = makeSendCallbacks();
      const tool = createSendMessageToThreadTool(callbacks);
      const result = await tool.execute!({
        thread_id: "thread-1",
        message: "Fix the failing test",
      });

      expect(result.status).toBe("done");
      expect(calls).toHaveLength(1);
      expect(calls[0].threadId).toBe("thread-1");
      expect(calls[0].message).toBe("Fix the failing test");
      expect(calls[0].workflow).toBeUndefined();
      expect(result.content).toContain("thread-1");
    });

    test("passes workflow parameter to callback", async () => {
      const { calls, callbacks } = makeSendCallbacks();
      const tool = createSendMessageToThreadTool(callbacks);
      const result = await tool.execute!({
        thread_id: "thread-1",
        message: "Ship it",
        workflow: "merge_changes",
      });

      expect(result.status).toBe("done");
      expect(calls[0].workflow).toBe("merge_changes");
      expect(result.content).toContain("merge_changes");
      expect(result.data?.workflow).toBe("merge_changes");
    });

    test("returns error when sendMessage returns false", async () => {
      const { callbacks } = makeSendCallbacks({ sendResult: false });
      const tool = createSendMessageToThreadTool(callbacks);
      const result = await tool.execute!({
        thread_id: "thread-1",
        message: "hello",
      });
      expect(result.status).toBe("error");
      expect(result.error).toContain("Failed to send");
      expect(result.error).toContain("disposed");
    });

    test("returns error when sendMessage throws", async () => {
      const { callbacks } = makeSendCallbacks({ shouldThrow: true });
      const tool = createSendMessageToThreadTool(callbacks);
      const result = await tool.execute!({
        thread_id: "thread-1",
        message: "hello",
      });
      expect(result.status).toBe("error");
      expect(result.error).toContain("Connection lost");
    });

    test("returns success data with thread_id and null workflow", async () => {
      const { callbacks } = makeSendCallbacks();
      const tool = createSendMessageToThreadTool(callbacks);
      const result = await tool.execute!({
        thread_id: "thread-1",
        message: "do it",
      });

      expect(result.status).toBe("done");
      const data = result.data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.thread_id).toBe("thread-1");
      expect(data.workflow).toBeNull();
    });
  });
});
