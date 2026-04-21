/**
 * Tests for look_at multimodal file analysis tool
 *
 * Tests: tool spec, preprocessArgs, MIME detection, execution with mocked Gemini
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { createLookAtTool } from "../look-at";

// ─── Spec tests ─────────────────────────────────────────

describe("createLookAtTool spec", () => {
  const tool = createLookAtTool();

  it("should have correct name", () => {
    assert.equal(tool.name, "look_at");
  });

  it("should be a builtin tool", () => {
    assert.equal(tool.source, "builtin");
  });

  it("should be read-only", () => {
    assert.equal(tool.isReadOnly, true);
  });

  it("should have disableTimeout", () => {
    assert.equal(tool.executionProfile?.disableTimeout, true);
  });

  it("should have empty resourceKeys", () => {
    assert.deepEqual(tool.executionProfile?.resourceKeys, []);
  });

  it("should require path, objective, and context", () => {
    const schema = tool.inputSchema as Record<string, unknown>;
    assert.deepEqual(schema.required, ["path", "objective", "context"]);
  });

  it("should have path, objective, context, and referenceFiles properties", () => {
    const props = (tool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    assert.ok(props.path);
    assert.ok(props.objective);
    assert.ok(props.context);
    assert.ok(props.referenceFiles);
  });

  it("should have referenceFiles as array type", () => {
    const props = (tool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    const refFiles = props.referenceFiles as Record<string, unknown>;
    assert.equal(refFiles.type, "array");
  });

  it("should mention multimodal in description", () => {
    assert.ok(tool.description.includes("multimodal"));
  });

  it("should mention images, PDFs in description", () => {
    assert.ok(tool.description.includes("image"));
    assert.ok(tool.description.includes("PDF"));
  });
});

// ─── preprocessArgs tests ───────────────────────────────

describe("createLookAtTool preprocessArgs", () => {
  const tool = createLookAtTool();

  it("should expand ~ in path", () => {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
    const result = tool.preprocessArgs!({ path: "~/test.png" });
    assert.equal(result.path, path.join(home, "test.png"));
  });

  it("should resolve relative path with workingDir", () => {
    const result = tool.preprocessArgs!({ path: "test.png" }, "/workspace");
    assert.equal(result.path, "/workspace/test.png");
  });

  it("should leave absolute paths unchanged", () => {
    const result = tool.preprocessArgs!({ path: "/absolute/test.png" }, "/workspace");
    assert.equal(result.path, "/absolute/test.png");
  });

  it("should expand ~ in referenceFiles", () => {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
    const result = tool.preprocessArgs!({
      path: "/test.png",
      referenceFiles: ["~/ref.png"],
    });
    const refs = result.referenceFiles as string[];
    assert.equal(refs[0], path.join(home, "ref.png"));
  });

  it("should resolve relative referenceFiles with workingDir", () => {
    const result = tool.preprocessArgs!(
      {
        path: "/test.png",
        referenceFiles: ["ref.png", "/abs/ref2.png"],
      },
      "/workspace",
    );
    const refs = result.referenceFiles as string[];
    assert.equal(refs[0], "/workspace/ref.png");
    assert.equal(refs[1], "/abs/ref2.png");
  });
});

// ─── Execution tests ────────────────────────────────────

describe("createLookAtTool execution", () => {
  it("should error on missing path", async () => {
    const tool = createLookAtTool();
    const result = await tool.execute!({ objective: "test", context: "test" }, {
      threadId: "t1",
    } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("path"));
  });

  it("should error on missing objective", async () => {
    const tool = createLookAtTool();
    const result = await tool.execute!({ path: "/test.png", context: "test" }, {
      threadId: "t1",
    } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("objective"));
  });

  it("should error on missing context", async () => {
    const tool = createLookAtTool();
    const result = await tool.execute!({ path: "/test.png", objective: "test" }, {
      threadId: "t1",
    } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("context"));
  });

  it("should error on missing API key", async () => {
    // Temporarily unset env vars
    const origGoogle = process.env.GOOGLE_API_KEY;
    const origGemini = process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const tool = createLookAtTool();
      const result = await tool.execute!(
        { path: "/test.png", objective: "test", context: "test" },
        { threadId: "t1" } as never,
      );
      assert.equal(result.status, "error");
      assert.ok(result.error?.includes("API key"));
    } finally {
      // Restore
      if (origGoogle) process.env.GOOGLE_API_KEY = origGoogle;
      if (origGemini) process.env.GEMINI_API_KEY = origGemini;
    }
  });

  it("should error on non-existent file", async () => {
    const tool = createLookAtTool({ apiKey: "test-key" });
    const result = await tool.execute!(
      { path: "/nonexistent/file.png", objective: "test", context: "test" },
      { threadId: "t1" } as never,
    );
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("File not found"));
  });

  it("should error on directory path", async () => {
    const tool = createLookAtTool({ apiKey: "test-key" });
    const result = await tool.execute!({ path: os.tmpdir(), objective: "test", context: "test" }, {
      threadId: "t1",
    } as never);
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("not a file"));
  });

  it("should handle Gemini API error gracefully", async () => {
    // Create a temp text file for testing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "look-at-test-"));
    const tmpFile = path.join(tmpDir, "test.txt");
    fs.writeFileSync(tmpFile, "Hello world", "utf-8");

    try {
      // Use a fake API key — the API call will fail
      const tool = createLookAtTool({ apiKey: "fake-key-for-testing" });
      const result = await tool.execute!(
        { path: tmpFile, objective: "test analysis", context: "unit test" },
        { threadId: "t1" } as never,
      );
      // Should get an error from the API call
      assert.equal(result.status, "error");
      assert.ok(result.error?.includes("Failed to analyze") || result.error?.includes("API"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
