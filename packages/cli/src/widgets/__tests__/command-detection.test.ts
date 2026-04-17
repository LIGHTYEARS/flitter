import { describe, expect, it } from "bun:test";
import { parseCommandInput } from "../command-detection";

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
