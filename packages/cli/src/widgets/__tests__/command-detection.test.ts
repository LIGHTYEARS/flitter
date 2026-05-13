import { describe, expect, it } from "bun:test";
import {
  getShellPromptInfo,
  getVisualCursorPosition,
  parseCommandInput,
  SHELL_PROMPT_SPACING,
} from "../command-detection";

describe("parseCommandInput", () => {
  it("returns null for non-command input", () => {
    expect(parseCommandInput("hello world")).toBeNull();
    expect(parseCommandInput("")).toBeNull();
  });

  it("parses /command with no args", () => {
    const result = parseCommandInput("/help");
    expect(result).toEqual({ command: "help", args: "" });
  });

  it("parses /command with args", () => {
    const result = parseCommandInput("/model claude-opus");
    expect(result).toEqual({ command: "model", args: "claude-opus" });
  });

  it("parses /command with multi-word args", () => {
    const result = parseCommandInput("/config set model claude-opus");
    expect(result).toEqual({ command: "config", args: "set model claude-opus" });
  });

  it("ignores / in the middle of text", () => {
    expect(parseCommandInput("hello /world")).toBeNull();
  });

  it("trims whitespace", () => {
    const result = parseCommandInput("  /help  ");
    expect(result).toEqual({ command: "help", args: "" });
  });
});

describe("getShellPromptInfo", () => {
  it("returns null for non-shell input", () => {
    expect(getShellPromptInfo("hello world")).toBeNull();
    expect(getShellPromptInfo("")).toBeNull();
    expect(getShellPromptInfo("not$shell")).toBeNull();
  });

  it("detects visible shell mode ($ prefix)", () => {
    const info = getShellPromptInfo("$ ls -la");
    expect(info).not.toBeNull();
    expect(info!.prefix).toBe("$");
    expect(info!.prefixLength).toBe(1);
    expect(info!.visibility).toBe("visible");
    expect(info!.command).toBe(" ls -la");
  });

  it("detects hidden shell mode ($$ prefix)", () => {
    const info = getShellPromptInfo("$$ curl api.example.com");
    expect(info).not.toBeNull();
    expect(info!.prefix).toBe("$$");
    expect(info!.prefixLength).toBe(2);
    expect(info!.visibility).toBe("hidden");
    expect(info!.command).toBe(" curl api.example.com");
  });

  it("handles $$ before $ (double prefix checked first)", () => {
    const hidden = getShellPromptInfo("$$test");
    expect(hidden!.visibility).toBe("hidden");
    expect(hidden!.prefixLength).toBe(2);
  });

  it("works with empty command after prefix", () => {
    const single = getShellPromptInfo("$");
    expect(single!.prefix).toBe("$");
    expect(single!.command).toBe("");

    const double = getShellPromptInfo("$$");
    expect(double!.prefix).toBe("$$");
    expect(double!.command).toBe("");
  });
});

describe("getVisualCursorPosition", () => {
  it("returns original position when not in shell mode", () => {
    expect(getVisualCursorPosition(0, null)).toBe(0);
    expect(getVisualCursorPosition(5, null)).toBe(5);
  });

  it("adds spacing when cursor is at or after prefix (visible mode)", () => {
    // 文本: $ls (注意没有空格 — 自动空格由渲染添加)
    // 原始索引: $=0, l=1, s=2
    // 视觉显示: $ ls (自动添加了 spacing 空格)
    // 视觉索引: $=0, (spacing)=1, l=2, s=3
    const info = getShellPromptInfo("$ls");
    expect(info!.prefixLength).toBe(1);
    expect(SHELL_PROMPT_SPACING).toBe(1);

    // cursor at 0 ($) -> visual 0
    // cursor at 1 (between $ and l) -> visual 2 ($ + spacing 之后)
    // cursor at 2 (between l and s) -> visual 3
    expect(getVisualCursorPosition(0, info)).toBe(0);
    expect(getVisualCursorPosition(1, info)).toBe(2);
    expect(getVisualCursorPosition(2, info)).toBe(3);
  });

  it("adds spacing when cursor is at or after prefix (hidden mode)", () => {
    // 文本: $$cmd
    // 原始索引: $=0, $=1, c=2, m=3, d=4
    // 视觉显示: $$ cmd (自动添加了 spacing 空格)
    // 视觉索引: $=0, $=1, (spacing)=2, c=3, m=4, d=5
    const info = getShellPromptInfo("$$cmd");
    expect(info!.prefixLength).toBe(2);

    expect(getVisualCursorPosition(0, info)).toBe(0);
    expect(getVisualCursorPosition(1, info)).toBe(1);
    expect(getVisualCursorPosition(2, info)).toBe(3); // 在 $$ 后, 加 spacing
    expect(getVisualCursorPosition(3, info)).toBe(4);
  });
});
