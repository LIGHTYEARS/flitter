// packages/cli/src/widgets/__tests__/activity-group-builders.test.ts
/**
 * Tests for specialized activity group builders.
 *
 * 逆向: Ux0 (2171_unknown_Ux0.js), qx0 (2174_unknown_qx0.js), Hx0 (2172_unknown_Hx0.js)
 * and dispatch logic at chunk-004.js:7878-7991.
 *
 * amp handles finder, code_review, code_tour as separate top-level tool names
 * (not as Task sub-modes). Flitter additionally supports Task with mode input.
 */

import { describe, expect, it } from "bun:test";
import type { ActivityGroupItem, ToolItem } from "../display-items.js";
import { transformThreadToDisplayItems } from "../display-items.js";

// ─── Helpers ─────────────────────────────────────────

/** Build a minimal messages array with one tool_use block */
function makeToolMessages(
  name: string,
  input: Record<string, unknown>,
  resultStatus: "done" | "in-progress" | "error" | "queued" = "done",
) {
  return [
    {
      role: "assistant" as const,
      content: [
        {
          type: "tool_use",
          id: "tu-1",
          name,
          input,
          complete: true,
        },
      ],
      state: { type: "complete" as const },
    },
    {
      role: "user" as const,
      content: [
        {
          type: "tool_result",
          toolUseID: "tu-1",
          run: { status: resultStatus },
        },
      ],
    },
  ];
}

// ─── finder tool ─────────────────────────────────────

describe("finder tool rendering", () => {
  it("produces activity-group when tool name is 'finder'", () => {
    // 逆向: chunk-004.js:7878 — p === "finder" branch dispatches to Ux0
    const messages = makeToolMessages("finder", { query: "auth flow" });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group).toBeDefined();
    expect(group.summary).toContain("finder");
  });

  it("finder with query embeds query in action detail", () => {
    // 逆向: Ux0() — fallback action title "Search codebase: ${R}" when no progress actions
    const messages = makeToolMessages("finder", { query: "auth flow" });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.actions.length).toBeGreaterThan(0);
    const action = group.actions[0];
    expect(action.kind).toBe("explore");
    expect(action.detail).toContain("auth flow");
  });

  it("finder without query uses 'Search codebase' fallback", () => {
    // 逆向: Ux0() — R undefined → title: "Search codebase"
    const messages = makeToolMessages("finder", {});
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.actions[0].detail).toBe("Search codebase");
    expect(group.summary).toContain("finder");
  });

  it("finder hasInProgress = false when status is done", () => {
    const messages = makeToolMessages("finder", { query: "test" }, "done");
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.hasInProgress).toBe(false);
  });

  it("finder hasInProgress = true when status is in-progress", () => {
    // 逆向: gF(m.status) — "in-progress" | "queued" → hasInProgress: true
    const messages = makeToolMessages("finder", { query: "test" }, "in-progress");
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.hasInProgress).toBe(true);
  });
});

// ─── code_review tool ────────────────────────────────

describe("code_review tool rendering", () => {
  it("produces activity-group when tool name is 'code_review'", () => {
    // 逆向: chunk-004.js:7969 — p === "code_review" branch dispatches to qx0
    const messages = makeToolMessages("code_review", { diff_description: "main branch changes" });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group).toBeDefined();
    expect(group.summary).toContain("code review");
  });

  it("code_review summary is 'code review' by default", () => {
    // 逆向: qx0() — s = thoroughness === "quick" ? "quick code review" : "code review"
    const messages = makeToolMessages("code_review", {});
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.summary).toBe("code review");
  });

  it("code_review with thoroughness 'quick' uses 'quick code review' summary", () => {
    // 逆向: qx0() — thoroughness === "quick" → "quick code review"
    const messages = makeToolMessages("code_review", { thoroughness: "quick" });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.summary).toBe("quick code review");
  });

  it("code_review produces at least one action", () => {
    const messages = makeToolMessages("code_review", {});
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.actions.length).toBeGreaterThan(0);
  });

  it("code_review done action has 'explore' or 'thinking' kind", () => {
    // 逆向: qx0() — done status appends { kind: "explore", title: "Code review complete" }
    const messages = makeToolMessages("code_review", {}, "done");
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    const kinds = group.actions.map((a) => a.kind);
    expect(kinds.some((k) => k === "explore" || k === "thinking")).toBe(true);
  });

  it("code_review hasInProgress = true when queued", () => {
    // 逆向: gF(m.status) — "queued" → hasInProgress: true
    const messages = makeToolMessages("code_review", {}, "queued");
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.hasInProgress).toBe(true);
  });
});

// ─── code_tour tool ───────────────────────────────────

describe("code_tour tool rendering", () => {
  it("produces activity-group when tool name is 'code_tour'", () => {
    // 逆向: chunk-004.js:7981 — p === "code_tour" branch dispatches to Hx0
    const messages = makeToolMessages("code_tour", { focus: "auth flow" });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group).toBeDefined();
  });

  it("code_tour with focus produces summary 'code tour: <focus>'", () => {
    // 逆向: Hx0() — r = focus.trim() → summary: `code tour: ${r}`
    const messages = makeToolMessages("code_tour", { focus: "auth flow" });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.summary).toBe("code tour: auth flow");
  });

  it("code_tour without focus produces summary 'code tour'", () => {
    // 逆向: Hx0() — r undefined → summary: "code tour"
    const messages = makeToolMessages("code_tour", {});
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.summary).toBe("code tour");
  });

  it("code_tour focus with whitespace is trimmed", () => {
    // 逆向: Hx0() — focus.trim()
    const messages = makeToolMessages("code_tour", { focus: "  auth flow  " });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.summary).toBe("code tour: auth flow");
  });

  it("code_tour done action uses 'explore' kind", () => {
    // 逆向: Hx0() — done appends { kind: "explore", title: "Code tour complete" }
    const messages = makeToolMessages("code_tour", {}, "done");
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group.actions.some((a) => a.kind === "explore")).toBe(true);
  });
});

// ─── Task tool with mode ──────────────────────────────

describe("Task tool with mode input", () => {
  it("Task with mode='finder' produces activity-group", () => {
    // 逆向: Task branch extended to detect mode and dispatch to specialized builders
    const messages = makeToolMessages("Task", { mode: "finder", query: "auth" });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group).toBeDefined();
    expect(group.summary).toContain("finder");
  });

  it("Task with mode='code_review' produces activity-group with 'code review' summary", () => {
    const messages = makeToolMessages("Task", { mode: "code_review" });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group).toBeDefined();
    expect(group.summary).toContain("code review");
  });

  it("Task with mode='code_tour' and focus produces correct summary", () => {
    const messages = makeToolMessages("Task", { mode: "code_tour", focus: "auth flow" });
    const items = transformThreadToDisplayItems(messages);
    const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
    expect(group).toBeDefined();
    expect(group.summary).toBe("code tour: auth flow");
  });

  it("Task without mode still renders as Subagent ToolItem", () => {
    // 逆向: yx0 Task branch — no mode → generic Subagent
    const messages = makeToolMessages("Task", { description: "do something" });
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool).toBeDefined();
    expect(tool.toolName).toBe("Subagent");
  });

  it("Task with unknown mode falls back to generic Subagent", () => {
    // Only finder/code_review/code_tour get specialized treatment
    const messages = makeToolMessages("Task", { mode: "unknown_mode" });
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool).toBeDefined();
    expect(tool.toolName).toBe("Subagent");
  });
});
