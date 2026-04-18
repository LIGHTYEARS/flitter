// packages/cli/src/commands/__tests__/mcp.test.ts
import { describe, expect, it } from "bun:test";
import { parseMcpAddArgs } from "../mcp";

describe("parseMcpAddArgs", () => {
  it("parses URL-based server", () => {
    const result = parseMcpAddArgs(["https://example.com/mcp"]);
    expect(result).toEqual({ url: "https://example.com/mcp" });
  });

  it("parses command-based server", () => {
    const result = parseMcpAddArgs(["npx", "-y", "@upstash/context7-mcp"]);
    expect(result).toEqual({
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
    });
  });

  it("parses command after -- separator", () => {
    const result = parseMcpAddArgs(["--", "node", "server.js"]);
    expect(result).toEqual({
      command: "node",
      args: ["server.js"],
    });
  });

  it("parses command with no extra args", () => {
    const result = parseMcpAddArgs(["my-server-binary"]);
    expect(result).toEqual({
      command: "my-server-binary",
      args: [],
    });
  });
});
