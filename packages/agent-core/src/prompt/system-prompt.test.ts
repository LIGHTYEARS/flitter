/**
 * System Prompt Assembly — unit tests
 *
 * Covers collectContextBlocks (environment, guidance, skills, custom prompt,
 * repo info) and buildSystemPrompt (role, tools, context, sub-agent modifier).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GuidanceFile, GuidanceLoadOptions } from "@flitter/data";
import type { SystemPromptBlock, ToolDefinition } from "@flitter/llm";
import type { Config, Settings } from "@flitter/schemas";
import { type ContextBlocksOptions, collectContextBlocks } from "./context-blocks";
import { BASE_ROLE_PROMPT, buildSystemPrompt, SUB_AGENT_MODIFIER } from "./system-prompt";

// ─── Test Helpers ───────────────────────────────────────

function createMockConfig(overrides?: Record<string, unknown>): Config {
  return {
    settings: { ...overrides } as Settings,
    secrets: {
      getToken: async () => undefined,
      isSet: () => false,
    },
  };
}

function createDefaultOpts(overrides?: Partial<ContextBlocksOptions>): ContextBlocksOptions {
  return {
    getConfig: () => createMockConfig(),
    listSkills: () => [],
    workspaceRoot: "/workspace",
    workingDirectory: "/workspace",
    ...overrides,
  };
}

function createMockToolDef(name: string, description: string): ToolDefinition {
  return {
    name,
    description,
    inputSchema: { type: "object", properties: {} },
  };
}

function createMockGuidanceFile(
  uri: string,
  content: string,
  opts?: Partial<GuidanceFile>,
): GuidanceFile {
  return {
    uri,
    type: "project",
    content,
    frontMatter: null,
    exclude: false,
    lineCount: content.split("\n").length,
    ...opts,
  };
}

// ─── collectContextBlocks ───────────────────────────────

describe("collectContextBlocks", () => {
  it("environment block: contains today's date", async () => {
    const blocks = await collectContextBlocks(createDefaultOpts());
    const envBlock = blocks[0];
    assert.ok(envBlock);
    const today = new Date().toISOString().split("T")[0];
    assert.ok(envBlock.text.includes(`Today's date: ${today}`));
  });

  it("environment block: contains working directory", async () => {
    const blocks = await collectContextBlocks(
      createDefaultOpts({ workingDirectory: "/home/user/project" }),
    );
    assert.ok(blocks[0].text.includes("Working directory: /home/user/project"));
  });

  it("environment block: contains OS and platform info", async () => {
    const blocks = await collectContextBlocks(createDefaultOpts());
    const envText = blocks[0].text;
    assert.ok(envText.includes("Platform:"));
    assert.ok(envText.includes("OS Version:"));
  });

  it("environment block: git repo Yes when git info present", async () => {
    const blocks = await collectContextBlocks(
      createDefaultOpts({ git: { isRepo: true, branch: "main" } }),
    );
    assert.ok(blocks[0].text.includes("Is directory a git repo: Yes"));
  });

  it("environment block: git repo No when git info absent", async () => {
    const blocks = await collectContextBlocks(createDefaultOpts());
    assert.ok(blocks[0].text.includes("Is directory a git repo: No"));
  });

  it("guidance blocks: wraps content in <instructions> tags", async () => {
    const mockDiscover = async (_opts: GuidanceLoadOptions) => [
      createMockGuidanceFile("/workspace/CLAUDE.md", "Follow these rules."),
    ];

    const blocks = await collectContextBlocks(
      createDefaultOpts({ discoverGuidanceFiles: mockDiscover }),
    );

    const guidanceBlock = blocks.find((b) => b.text.includes("<instructions"));
    assert.ok(guidanceBlock);
    assert.ok(guidanceBlock.text.includes("Follow these rules."));
    assert.ok(guidanceBlock.text.includes("</instructions>"));
    assert.ok(guidanceBlock.text.includes('source="CLAUDE.md"'));
  });

  it("guidance blocks: skips excluded files", async () => {
    const mockDiscover = async () => [
      createMockGuidanceFile("/workspace/CLAUDE.md", "content", {
        exclude: true,
      }),
    ];

    const blocks = await collectContextBlocks(
      createDefaultOpts({ discoverGuidanceFiles: mockDiscover }),
    );

    const guidanceBlock = blocks.find((b) => b.text.includes("<instructions"));
    assert.equal(guidanceBlock, undefined);
  });

  it("guidance blocks: sets cache_control ephemeral", async () => {
    const mockDiscover = async () => [createMockGuidanceFile("/workspace/CLAUDE.md", "content")];

    const blocks = await collectContextBlocks(
      createDefaultOpts({ discoverGuidanceFiles: mockDiscover }),
    );

    const guidanceBlock = blocks.find((b) => b.text.includes("<instructions"));
    assert.ok(guidanceBlock);
    assert.deepEqual(guidanceBlock.cache_control, { type: "ephemeral" });
  });

  it("skills block: formats as bullet list", async () => {
    const blocks = await collectContextBlocks(
      createDefaultOpts({
        listSkills: () => [
          { name: "web-search", description: "Search the web" },
          { name: "code-review", description: "Review code" },
        ],
      }),
    );

    const skillsBlock = blocks.find((b) => b.text.includes("Available skills:"));
    assert.ok(skillsBlock);
    assert.ok(skillsBlock.text.includes("- web-search: Search the web"));
    assert.ok(skillsBlock.text.includes("- code-review: Review code"));
  });

  it("skills block: not generated when no skills", async () => {
    const blocks = await collectContextBlocks(createDefaultOpts({ listSkills: () => [] }));

    const skillsBlock = blocks.find((b) => b.text.includes("Available skills:"));
    assert.equal(skillsBlock, undefined);
  });

  it("custom system prompt: included when settings.systemPrompt exists", async () => {
    const blocks = await collectContextBlocks(
      createDefaultOpts({
        getConfig: () => createMockConfig({ systemPrompt: "Always be helpful." }),
      }),
    );

    const customBlock = blocks.find((b) => b.text.includes("Always be helpful"));
    assert.ok(customBlock);
  });

  it("custom system prompt: skipped when empty", async () => {
    const blocks = await collectContextBlocks(
      createDefaultOpts({
        getConfig: () => createMockConfig({ systemPrompt: "" }),
      }),
    );

    // Only environment block should exist (no guidance, no skills, no custom, no repo)
    assert.equal(blocks.length, 1);
  });

  it("repository info: includes branch when git info present", async () => {
    const blocks = await collectContextBlocks(
      createDefaultOpts({ git: { isRepo: true, branch: "feature/xyz" } }),
    );

    const repoBlock = blocks.find((b) => b.text.includes("Current branch:"));
    assert.ok(repoBlock);
    assert.ok(repoBlock.text.includes("Current branch: feature/xyz"));
  });

  it("repository info: not generated without git", async () => {
    const blocks = await collectContextBlocks(createDefaultOpts());

    const repoBlock = blocks.find((b) => b.text.includes("Current branch:"));
    assert.equal(repoBlock, undefined);
  });

  it("AbortSignal: stops guidance loading when aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const mockDiscover = async () => [createMockGuidanceFile("/workspace/CLAUDE.md", "content")];

    const blocks = await collectContextBlocks(
      createDefaultOpts({
        discoverGuidanceFiles: mockDiscover,
        signal: controller.signal,
      }),
    );

    // Guidance block should be skipped because signal was already aborted
    const guidanceBlock = blocks.find((b) => b.text.includes("<instructions"));
    assert.equal(guidanceBlock, undefined);
  });

  it("all blocks are { type: 'text', text: string }", async () => {
    const blocks = await collectContextBlocks(
      createDefaultOpts({
        listSkills: () => [{ name: "s1", description: "d1" }],
        git: { isRepo: true, branch: "main" },
      }),
    );

    for (const block of blocks) {
      assert.equal(block.type, "text");
      assert.equal(typeof block.text, "string");
      assert.ok(block.text.length > 0);
    }
  });
});

// ─── buildSystemPrompt ──────────────────────────────────

describe("buildSystemPrompt", () => {
  it("first block contains BASE_ROLE_PROMPT", () => {
    const blocks = buildSystemPrompt({
      toolDefinitions: [],
      contextBlocks: [],
    });
    assert.ok(blocks.length >= 1);
    assert.equal(blocks[0].text, BASE_ROLE_PROMPT);
  });

  it("first block has cache_control ephemeral", () => {
    const blocks = buildSystemPrompt({
      toolDefinitions: [],
      contextBlocks: [],
    });
    assert.deepEqual(blocks[0].cache_control, { type: "ephemeral" });
  });

  it("tool instructions block: lists tool names and descriptions", () => {
    const blocks = buildSystemPrompt({
      toolDefinitions: [
        createMockToolDef("Read", "Read a file"),
        createMockToolDef("Bash", "Execute a command"),
      ],
      contextBlocks: [],
    });

    const toolBlock = blocks.find((b) =>
      b.text.includes("You have access to the following tools:"),
    );
    assert.ok(toolBlock);
    assert.ok(toolBlock.text.includes("**Read**: Read a file"));
    assert.ok(toolBlock.text.includes("**Bash**: Execute a command"));
  });

  it("tool instructions block: not generated when no tools", () => {
    const blocks = buildSystemPrompt({
      toolDefinitions: [],
      contextBlocks: [],
    });

    const toolBlock = blocks.find((b) =>
      b.text.includes("You have access to the following tools:"),
    );
    assert.equal(toolBlock, undefined);
  });

  it("context blocks: appended to output", () => {
    const contextBlocks: SystemPromptBlock[] = [
      { type: "text", text: "Context block 1" },
      { type: "text", text: "Context block 2" },
    ];

    const blocks = buildSystemPrompt({
      toolDefinitions: [],
      contextBlocks,
    });

    assert.ok(blocks.some((b) => b.text === "Context block 1"));
    assert.ok(blocks.some((b) => b.text === "Context block 2"));
  });

  it("sub-agent modifier: appended when isSubAgent=true", () => {
    const blocks = buildSystemPrompt({
      toolDefinitions: [],
      contextBlocks: [],
      isSubAgent: true,
    });

    const lastBlock = blocks[blocks.length - 1];
    assert.equal(lastBlock.text, SUB_AGENT_MODIFIER);
  });

  it("sub-agent modifier: not appended when isSubAgent=false", () => {
    const blocks = buildSystemPrompt({
      toolDefinitions: [],
      contextBlocks: [],
      isSubAgent: false,
    });

    const modifierBlock = blocks.find((b) => b.text === SUB_AGENT_MODIFIER);
    assert.equal(modifierBlock, undefined);
  });

  it("sub-agent modifier: not appended when isSubAgent undefined", () => {
    const blocks = buildSystemPrompt({
      toolDefinitions: [],
      contextBlocks: [],
    });

    const modifierBlock = blocks.find((b) => b.text === SUB_AGENT_MODIFIER);
    assert.equal(modifierBlock, undefined);
  });

  it("returns multiple SystemPromptBlock array", () => {
    const blocks = buildSystemPrompt({
      toolDefinitions: [createMockToolDef("Read", "Read a file")],
      contextBlocks: [{ type: "text", text: "ctx" }],
      isSubAgent: true,
    });

    // Should have: role + tools + context + sub-agent = 4
    assert.equal(blocks.length, 4);
    for (const block of blocks) {
      assert.equal(block.type, "text");
      assert.equal(typeof block.text, "string");
    }
  });
});
