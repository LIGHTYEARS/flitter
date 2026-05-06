/**
 * mapProgress 测试
 * 覆盖: mapSubAgentEventToProgress, mapSubAgentEventToToolResult
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapSubAgentEventToProgress, mapSubAgentEventToToolResult } from "./map-progress";
import type { SubAgentRunnerEvent, SubAgentTurn } from "./subagent-runner";

// ─── Helpers ─────────────────────────────────────────────

function makeTurn(opts: {
  message?: string;
  reasoning?: string;
  tools?: Array<{ id: string; name: string; status: string; result?: unknown }>;
}): SubAgentTurn {
  const activeTools = new Map<
    string,
    {
      id: string;
      tool_name: string;
      status: string;
      input?: unknown;
      result?: unknown;
      error?: { message: string };
    }
  >();
  for (const t of opts.tools ?? []) {
    activeTools.set(t.id, {
      id: t.id,
      tool_name: t.name,
      status: t.status,
      result: t.result,
    });
  }
  return {
    message: opts.message,
    reasoning: opts.reasoning,
    activeTools: activeTools as SubAgentTurn["activeTools"],
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("mapSubAgentEventToProgress", () => {
  it("maps turns to progress array format", () => {
    const event: SubAgentRunnerEvent = {
      status: "done",
      message: "Final answer",
      turns: [
        makeTurn({
          message: "Let me search.",
          tools: [{ id: "t1", name: "Grep", status: "done", result: "found it" }],
        }),
        makeTurn({ message: "Final answer" }),
      ],
    };

    const progress = mapSubAgentEventToProgress(event);

    assert.equal(progress.length, 2);
    assert.equal(progress[0]!.message, "Let me search.");
    assert.equal(progress[0]!.tool_uses!.length, 1);
    assert.equal(progress[0]!.tool_uses![0]!.tool_name, "Grep");
    assert.equal(progress[0]!.tool_uses![0]!.status, "done");
    assert.equal(progress[0]!.tool_uses![0]!.result, "found it");
    assert.equal(progress[1]!.message, "Final answer");
    assert.equal(progress[1]!.tool_uses!.length, 0);
  });

  it("includes reasoning in progress entries", () => {
    const event: SubAgentRunnerEvent = {
      status: "done",
      message: "Done",
      turns: [makeTurn({ message: "text", reasoning: "deep thought" })],
    };

    const progress = mapSubAgentEventToProgress(event);
    assert.equal(progress[0]!.reasoning, "deep thought");
  });
});

describe("mapSubAgentEventToToolResult", () => {
  it("maps done event to ToolResult with progress", () => {
    const event: SubAgentRunnerEvent = {
      status: "done",
      message: "The answer",
      turns: [makeTurn({ message: "The answer" })],
    };

    const result = mapSubAgentEventToToolResult(event);

    assert.equal(result.status, "done");
    assert.equal(result.content, "The answer");
    assert.ok(result.progress);
    assert.equal(result.progress!.length, 1);
  });

  it("maps error event to ToolResult with error", () => {
    const event: SubAgentRunnerEvent = {
      status: "error",
      message: "Provider timeout",
      turns: [],
    };

    const result = mapSubAgentEventToToolResult(event);

    assert.equal(result.status, "error");
    assert.equal(result.error, "Provider timeout");
    assert.ok(result.progress);
  });

  it("maps cancelled event to error ToolResult", () => {
    const event: SubAgentRunnerEvent = {
      status: "cancelled",
      turns: [makeTurn({ message: "partial work" })],
    };

    const result = mapSubAgentEventToToolResult(event);

    assert.equal(result.status, "error");
    assert.equal(result.error, "Subagent was cancelled");
    assert.equal(result.progress!.length, 1);
  });

  it("handles missing message gracefully", () => {
    const event: SubAgentRunnerEvent = {
      status: "done",
      turns: [],
    };

    const result = mapSubAgentEventToToolResult(event);

    assert.equal(result.status, "done");
    assert.equal(result.content, "(no output)");
  });
});
