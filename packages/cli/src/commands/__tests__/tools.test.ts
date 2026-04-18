// packages/cli/src/commands/__tests__/tools.test.ts

import { describe, expect, it } from "bun:test";
import { ToolRegistry } from "@flitter/agent-core";
import { handleToolsList } from "../tools";

describe("handleToolsList", () => {
  it("lists registered tools", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "Read",
      description: "Read files",
      inputSchema: { type: "object" },
      source: "builtin",
      execute: async () => ({ status: "done" }),
    });
    registry.register({
      name: "mcp__server__search",
      description: "Search",
      inputSchema: { type: "object" },
      source: { mcp: "server" },
      execute: async () => ({ status: "done" }),
    });

    // Capture stdout
    const chunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => {
      chunks.push(chunk);
      return true;
    }) as typeof process.stdout.write;

    try {
      await handleToolsList({ toolRegistry: registry }, {});
    } finally {
      process.stdout.write = origWrite;
    }

    const output = chunks.join("");
    expect(output).toContain("Read");
    expect(output).toContain("mcp__server__search");
    expect(output).toContain("builtin");
    expect(output).toContain("mcp:server");
  });
});
