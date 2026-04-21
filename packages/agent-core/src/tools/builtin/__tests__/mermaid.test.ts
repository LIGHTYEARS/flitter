/**
 * Tests for mermaid diagram tool
 *
 * Tests: tool spec, execute (no-op), mermaid.live link generation
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMermaidTool } from "../mermaid";

// ─── Spec tests ─────────────────────────────────────────

describe("createMermaidTool spec", () => {
  const tool = createMermaidTool();

  it("should have correct name", () => {
    assert.equal(tool.name, "mermaid");
  });

  it("should be a builtin tool", () => {
    assert.equal(tool.source, "builtin");
  });

  it("should be read-only", () => {
    assert.equal(tool.isReadOnly, true);
  });

  it("should require code and citations", () => {
    const schema = tool.inputSchema as Record<string, unknown>;
    assert.deepEqual(schema.required, ["code", "citations"]);
  });

  it("should have code and citations properties", () => {
    const props = (tool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    assert.ok(props.code);
    assert.ok(props.citations);
  });

  it("should have citations as object type with string additionalProperties", () => {
    const props = (tool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    const citations = props.citations as Record<string, unknown>;
    assert.equal(citations.type, "object");
    assert.deepEqual(citations.additionalProperties, { type: "string" });
  });

  it("should mention diagrams in description", () => {
    assert.ok(tool.description.includes("diagram"));
  });

  it("should mention supported headers in description", () => {
    assert.ok(tool.description.includes("flowchart"));
    assert.ok(tool.description.includes("sequenceDiagram"));
  });
});

// ─── Execution tests ────────────────────────────────────

describe("createMermaidTool execution", () => {
  const tool = createMermaidTool();

  it("should return done status for valid code", async () => {
    const result = await tool.execute({ code: "graph TD\n    A --> B", citations: {} }, {
      threadId: "t1",
    } as never);
    assert.equal(result.status, "done");
  });

  it("should include mermaid.live link for non-empty code", async () => {
    const result = await tool.execute({ code: "graph TD\n    A --> B", citations: {} }, {
      threadId: "t1",
    } as never);
    assert.ok(result.content?.includes("mermaid.live"));
    const data = result.data as { success: boolean; liveUrl: string };
    assert.equal(data.success, true);
    assert.ok(data.liveUrl?.startsWith("https://mermaid.live/edit#base64:"));
  });

  it("should handle empty code gracefully", async () => {
    const result = await tool.execute({ code: "", citations: {} }, { threadId: "t1" } as never);
    assert.equal(result.status, "done");
    assert.equal(result.content, "Empty diagram.");
    const data = result.data as { success: boolean; liveUrl?: string };
    assert.equal(data.success, true);
    assert.equal(data.liveUrl, undefined);
  });

  it("should handle missing code arg", async () => {
    const result = await tool.execute({ citations: {} }, { threadId: "t1" } as never);
    assert.equal(result.status, "done");
    assert.equal(result.content, "Empty diagram.");
  });

  it("should encode base64 with theme dark config", async () => {
    const result = await tool.execute({ code: "flowchart LR\n    A --> B", citations: {} }, {
      threadId: "t1",
    } as never);
    const data = result.data as { liveUrl: string };
    // Decode the base64 portion and verify it contains the code and mermaid config
    const base64Part = data.liveUrl.split("base64:")[1]!;
    const decoded = JSON.parse(Buffer.from(base64Part, "base64").toString("utf8"));
    assert.equal(decoded.code, "flowchart LR\n    A --> B");
    assert.deepEqual(decoded.mermaid, { theme: "dark" });
  });
});
