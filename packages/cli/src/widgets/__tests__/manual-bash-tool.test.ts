// packages/cli/src/widgets/__tests__/manual-bash-tool.test.ts
import { describe, expect, it } from "bun:test";
import type { ToolItem } from "../display-items.js";
import { transformThreadToDisplayItems } from "../display-items.js";

describe("manual_bash_invocation as tool row", () => {
  it("renders manual bash invocation as bash ToolItem with output", () => {
    const messages = [
      {
        role: "info" as const,
        content: [
          {
            type: "manual_bash_invocation",
            args: { cmd: "git status" },
            hidden: false,
            toolRun: {
              status: "done",
              result: { output: "On branch master\nnothing to commit", exitCode: 0 },
            },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("tool");
    const tool = items[0] as ToolItem;
    expect(tool.kind).toBe("bash");
    expect(tool.command).toBe("git status");
    expect(tool.status).toBe("done");
    expect(tool.output).toBe("On branch master\nnothing to commit");
    expect(tool.exitCode).toBe(0);
  });

  it("renders hidden bash invocation — command stored as-is", () => {
    const messages = [
      {
        role: "info" as const,
        content: [
          {
            type: "manual_bash_invocation",
            args: { cmd: "secret-cmd" },
            hidden: true,
            toolRun: { status: "done", result: { output: "ok", exitCode: 0 } },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items[0] as ToolItem;
    expect(tool.kind).toBe("bash");
    expect(tool.command).toBe("secret-cmd");
  });

  it("handles manual bash with error status", () => {
    const messages = [
      {
        role: "info" as const,
        content: [
          {
            type: "manual_bash_invocation",
            args: { cmd: "bad-cmd" },
            toolRun: { status: "error", error: { message: "command not found" } },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items[0] as ToolItem;
    expect(tool.status).toBe("error");
    expect(tool.error).toBe("command not found");
  });

  it("falls back to system message when toolRun is missing", () => {
    const messages = [
      {
        role: "info" as const,
        content: [{ type: "manual_bash_invocation", args: { cmd: "simple-cmd" } }],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("message");
  });
});
