/**
 * Tests for generateThreadTitle utility
 * 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js
 */
import { describe, expect, it } from "bun:test";
import {
  extractTextFromContent,
  generateThreadTitle,
  TITLE_MODEL,
  TITLE_SYSTEM_PROMPT,
  TITLE_TOOL_DEFINITION,
  type TitleGenerationProvider,
} from "../generate-title";

// ─── extractTextFromContent ──────────────────────────────

describe("extractTextFromContent", () => {
  it("extracts text from text blocks", () => {
    const content = [
      { type: "text" as const, text: "Hello" },
      { type: "text" as const, text: "World" },
    ];
    expect(extractTextFromContent(content)).toBe("Hello\n\nWorld");
  });

  it("skips non-text blocks", () => {
    const content = [
      { type: "text" as const, text: "Hello" },
      { type: "tool_use" as const, id: "t1", name: "bash", input: {} },
      { type: "text" as const, text: "World" },
    ];
    expect(extractTextFromContent(content)).toBe("Hello\n\nWorld");
  });

  it("returns empty string for no text blocks", () => {
    const content = [{ type: "tool_use" as const, id: "t1", name: "bash", input: {} }];
    expect(extractTextFromContent(content)).toBe("");
  });

  it("returns empty string for empty array", () => {
    expect(extractTextFromContent([])).toBe("");
  });
});

// ─── Constants ───────────────────────────────────────────

describe("TITLE_MODEL", () => {
  it("is claude-haiku-4-5-20251001", () => {
    expect(TITLE_MODEL).toBe("claude-haiku-4-5-20251001");
  });
});

describe("TITLE_SYSTEM_PROMPT", () => {
  it("contains key phrases", () => {
    expect(TITLE_SYSTEM_PROMPT).toContain("maximum 5 words");
    expect(TITLE_SYSTEM_PROMPT).toContain("Sentence case");
    expect(TITLE_SYSTEM_PROMPT).toContain("set_title");
    expect(TITLE_SYSTEM_PROMPT).toContain("agentic coding tool");
  });
});

describe("TITLE_TOOL_DEFINITION", () => {
  it("has correct shape", () => {
    expect(TITLE_TOOL_DEFINITION.name).toBe("set_title");
    expect(TITLE_TOOL_DEFINITION.input_schema.type).toBe("object");
    expect(TITLE_TOOL_DEFINITION.input_schema.properties.title.type).toBe("string");
    expect(TITLE_TOOL_DEFINITION.input_schema.required).toEqual(["title"]);
  });
});

// ─── generateThreadTitle ─────────────────────────────────

describe("generateThreadTitle", () => {
  it("returns undefined for empty content", async () => {
    const provider: TitleGenerationProvider = {
      createMessage: async () => ({ content: [], usage: { input_tokens: 0, output_tokens: 0 } }),
    };
    const result = await generateThreadTitle({
      content: [],
      threadId: "thread-1",
      provider,
    });
    expect(result.title).toBeUndefined();
  });

  it("extracts title from tool_use response", async () => {
    const provider: TitleGenerationProvider = {
      createMessage: async () => ({
        content: [
          {
            type: "tool_use" as const,
            id: "tu1",
            name: "set_title",
            input: { title: "Fix login bug" },
          },
        ],
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
    };
    const result = await generateThreadTitle({
      content: [{ type: "text" as const, text: "Fix the login bug" }],
      threadId: "thread-1",
      provider,
    });
    expect(result.title).toBe("Fix login bug");
  });

  it("returns undefined if no tool_use in response", async () => {
    const provider: TitleGenerationProvider = {
      createMessage: async () => ({
        content: [{ type: "text" as const, text: "Some text response" }],
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
    };
    const result = await generateThreadTitle({
      content: [{ type: "text" as const, text: "Hello there" }],
      threadId: "thread-1",
      provider,
    });
    expect(result.title).toBeUndefined();
  });

  it("returns undefined if tool_use has wrong name", async () => {
    const provider: TitleGenerationProvider = {
      createMessage: async () => ({
        content: [
          {
            type: "tool_use" as const,
            id: "tu1",
            name: "wrong_tool",
            input: { title: "Should not use" },
          },
        ],
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
    };
    const result = await generateThreadTitle({
      content: [{ type: "text" as const, text: "Hello" }],
      threadId: "thread-1",
      provider,
    });
    expect(result.title).toBeUndefined();
  });

  it("returns undefined if tool_use input has no title string", async () => {
    const provider: TitleGenerationProvider = {
      createMessage: async () => ({
        content: [
          {
            type: "tool_use" as const,
            id: "tu1",
            name: "set_title",
            input: { wrong: 123 },
          },
        ],
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
    };
    const result = await generateThreadTitle({
      content: [{ type: "text" as const, text: "Hello" }],
      threadId: "thread-1",
      provider,
    });
    expect(result.title).toBeUndefined();
  });

  it("passes correct params to provider.createMessage", async () => {
    let capturedParams: Record<string, unknown> | null = null;
    const provider: TitleGenerationProvider = {
      createMessage: async (params) => {
        capturedParams = params as Record<string, unknown>;
        return {
          content: [
            {
              type: "tool_use" as const,
              id: "tu1",
              name: "set_title",
              input: { title: "Test title" },
            },
          ],
          usage: { input_tokens: 100, output_tokens: 20 },
        };
      },
    };
    await generateThreadTitle({
      content: [{ type: "text" as const, text: "Fix the login" }],
      threadId: "thread-1",
      provider,
    });

    expect(capturedParams).not.toBeNull();
    expect(capturedParams!.model).toBe(TITLE_MODEL);
    expect(capturedParams!.max_tokens).toBe(60);
    expect(capturedParams!.temperature).toBe(0.7);
    expect(capturedParams!.system).toBe(TITLE_SYSTEM_PROMPT);
    expect((capturedParams!.messages as Array<Record<string, unknown>>)[0].role).toBe("user");
    expect((capturedParams!.tool_choice as Record<string, unknown>).type).toBe("tool");
    expect((capturedParams!.tool_choice as Record<string, unknown>).name).toBe("set_title");
  });

  it("respects abort signal", async () => {
    const abortController = new AbortController();
    abortController.abort();

    const provider: TitleGenerationProvider = {
      createMessage: async (_params, opts) => {
        // Simulate SDK behavior: check signal
        if (opts?.signal?.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        return {
          content: [],
          usage: { input_tokens: 0, output_tokens: 0 },
        };
      },
    };

    await expect(
      generateThreadTitle({
        content: [{ type: "text" as const, text: "Hello" }],
        threadId: "thread-1",
        provider,
        signal: abortController.signal,
      }),
    ).rejects.toThrow();
  });
});
