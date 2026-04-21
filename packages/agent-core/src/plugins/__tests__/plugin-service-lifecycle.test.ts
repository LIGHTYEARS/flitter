/**
 * Tests for CORE-15: agentStart/agentEnd plugin lifecycle hooks
 *
 * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:808-826 (agentStart)
 * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:574-579,682-689,1005-1013 (agentEnd)
 */
import { describe, expect, it } from "bun:test";
import { PluginService } from "../plugin-service";
import type { PluginAgentEndEvent, PluginAgentStartEvent } from "../types";

// ─── Tests ───────────────────────────────────────────────

describe("PluginService.onAgentStart", () => {
  it("returns empty result when no plugins are loaded", async () => {
    const service = new PluginService();
    const event: PluginAgentStartEvent = {
      message: "Hello",
      id: 1,
      thread: { id: "thread-1" },
    };

    const result = await service.onAgentStart(event);
    expect(result).toEqual({});
  });

  it("returns empty result when no plugins registered for agent.start", async () => {
    const service = new PluginService();
    // No plugins loaded, so no registered events
    const result = await service.onAgentStart({
      message: "Hello",
      id: 1,
    });
    expect(result).toEqual({});
  });
});

describe("PluginService.onAgentEnd", () => {
  it("returns empty result when no plugins are loaded", async () => {
    const service = new PluginService();
    const event: PluginAgentEndEvent = {
      message: "Hello",
      id: 1,
      status: "done",
      thread: { id: "thread-1" },
    };

    const result = await service.onAgentEnd(event);
    expect(result).toEqual({});
  });

  it("returns empty result when no plugins registered for agent.end", async () => {
    const service = new PluginService();
    const result = await service.onAgentEnd({
      message: "Hello",
      id: 1,
      status: "interrupted",
    });
    expect(result).toEqual({});
  });

  it("returns empty result for error status", async () => {
    const service = new PluginService();
    const result = await service.onAgentEnd({
      message: "Hello",
      id: 1,
      status: "error",
    });
    expect(result).toEqual({});
  });
});

describe("PluginAgentStart/End types", () => {
  it("PluginAgentStartEvent has correct shape", () => {
    const event: PluginAgentStartEvent = {
      message: "Fix the login bug",
      id: 42,
      thread: { id: "thread-abc" },
    };
    expect(event.message).toBe("Fix the login bug");
    expect(event.id).toBe(42);
    expect(event.thread?.id).toBe("thread-abc");
  });

  it("PluginAgentEndEvent has all three status values", () => {
    const done: PluginAgentEndEvent = { message: "x", id: 1, status: "done" };
    const interrupted: PluginAgentEndEvent = { message: "x", id: 1, status: "interrupted" };
    const error: PluginAgentEndEvent = { message: "x", id: 1, status: "error" };

    expect(done.status).toBe("done");
    expect(interrupted.status).toBe("interrupted");
    expect(error.status).toBe("error");
  });
});
