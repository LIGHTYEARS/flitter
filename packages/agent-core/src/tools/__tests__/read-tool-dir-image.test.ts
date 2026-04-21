/**
 * Tests for TOOL-31: Read tool directory listing and image support
 *
 * 逆向: amp-cli-reversed/chunk-001.js:9481-9512 (directory listing)
 * 逆向: amp-cli-reversed/chunk-001.js:9514-9543 (image handling)
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ReadTool } from "../builtin/read";
import type { ToolContext } from "../types";

// ─── Test Fixtures ───────────────────────────────────────

const TEST_DIR = path.join(os.tmpdir(), `flitter-read-test-${Date.now()}`);
const mockContext: ToolContext = {
  workingDirectory: "/tmp",
  signal: new AbortController().signal,
  threadId: "test-thread",
  config: { settings: {} as never, secrets: {} as never },
};

beforeAll(() => {
  // Create test directory structure
  fs.mkdirSync(path.join(TEST_DIR, "subdir_a"), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, "subdir_b"), { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, "file_c.txt"), "hello");
  fs.writeFileSync(path.join(TEST_DIR, "file_a.txt"), "world");
  fs.writeFileSync(path.join(TEST_DIR, "file_b.js"), "code");

  // Create a small PNG image (1x1 pixel, minimal valid PNG)
  const minimalPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  fs.writeFileSync(path.join(TEST_DIR, "tiny.png"), minimalPng);
  fs.writeFileSync(path.join(TEST_DIR, "photo.jpg"), minimalPng); // Not a real JPEG but has the extension

  // Create a binary file (not an image)
  const binaryData = Buffer.alloc(100);
  binaryData[0] = 0x00;
  binaryData[50] = 0x00;
  fs.writeFileSync(path.join(TEST_DIR, "binary.dat"), binaryData);
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

// ─── Directory Listing Tests ─────────────────────────────

describe("Read tool: directory listing (TOOL-31)", () => {
  it("returns sorted directory listing with dirs first", async () => {
    const result = await ReadTool.execute({ file_path: TEST_DIR }, mockContext);

    expect(result.status).toBe("done");
    expect(result.data?.isDirectory).toBe(true);

    const content = result.content!;
    const lines = content.split("\n").filter((l) => !l.startsWith("["));

    // Directories come first (with trailing /)
    expect(lines[0]).toBe("subdir_a/");
    expect(lines[1]).toBe("subdir_b/");

    // Then files alphabetically
    expect(lines[2]).toBe("binary.dat");
    expect(lines[3]).toBe("file_a.txt");
    expect(lines[4]).toBe("file_b.js");
    expect(lines[5]).toBe("file_c.txt");
  });

  it("returns directoryEntries in data field", async () => {
    const result = await ReadTool.execute({ file_path: TEST_DIR }, mockContext);

    expect(result.data?.directoryEntries).toBeInstanceOf(Array);
    const entries = result.data!.directoryEntries as string[];
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]).toBe("subdir_a/");
  });

  it("respects offset and limit for directory listing", async () => {
    const result = await ReadTool.execute(
      { file_path: TEST_DIR, offset: 3, limit: 2 },
      mockContext,
    );

    expect(result.status).toBe("done");
    const content = result.content!;

    // Should have an omission marker at the start
    expect(content).toContain("omitted 2 entries");

    // Should contain entries at positions 3-4
    const entries = result.data!.directoryEntries as string[];
    expect(entries.length).toBe(2);
  });

  it("handles empty directory", async () => {
    const emptyDir = path.join(TEST_DIR, "subdir_a");
    const result = await ReadTool.execute({ file_path: emptyDir }, mockContext);

    expect(result.status).toBe("done");
    expect(result.content).toBe("");
    expect(result.data?.isDirectory).toBe(true);
  });

  it("handles nonexistent directory", async () => {
    const result = await ReadTool.execute(
      { file_path: path.join(TEST_DIR, "nonexistent") },
      mockContext,
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("not found");
  });
});

// ─── Image Handling Tests ────────────────────────────────

describe("Read tool: image handling (TOOL-31)", () => {
  it("returns base64-encoded PNG image", async () => {
    const result = await ReadTool.execute(
      { file_path: path.join(TEST_DIR, "tiny.png") },
      mockContext,
    );

    expect(result.status).toBe("done");
    expect(result.data?.isImage).toBe(true);
    expect(result.data?.base64Content).toBeDefined();
    expect(typeof result.data?.base64Content).toBe("string");

    const imageInfo = result.data?.imageInfo as { mimeType: string; size: number };
    expect(imageInfo.mimeType).toBe("image/png");
    expect(imageInfo.size).toBeGreaterThan(0);
  });

  it("returns base64-encoded JPG image", async () => {
    const result = await ReadTool.execute(
      { file_path: path.join(TEST_DIR, "photo.jpg") },
      mockContext,
    );

    expect(result.status).toBe("done");
    expect(result.data?.isImage).toBe(true);
    const imageInfo = result.data?.imageInfo as { mimeType: string };
    expect(imageInfo.mimeType).toBe("image/jpeg");
  });

  it("returns Image: prefix in content for images", async () => {
    const result = await ReadTool.execute(
      { file_path: path.join(TEST_DIR, "tiny.png") },
      mockContext,
    );

    expect(result.content).toContain("Image:");
    expect(result.content).toContain("tiny.png");
  });

  it("still rejects non-image binary files", async () => {
    const result = await ReadTool.execute(
      { file_path: path.join(TEST_DIR, "binary.dat") },
      mockContext,
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("binary");
  });

  it("still reads text files normally", async () => {
    const result = await ReadTool.execute(
      { file_path: path.join(TEST_DIR, "file_a.txt") },
      mockContext,
    );

    expect(result.status).toBe("done");
    expect(result.content).toContain("world");
    expect(result.data?.isImage).toBeUndefined();
    expect(result.data?.isDirectory).toBeUndefined();
  });
});
