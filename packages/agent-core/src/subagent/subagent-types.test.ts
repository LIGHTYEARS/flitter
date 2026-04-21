/**
 * Subagent Type Registry tests (GAP-CORE-18)
 *
 * Tests for:
 * 1. SUBAGENT_TYPE_REGISTRY — maps subagent types to tool patterns
 * 2. getSubAgentToolPatterns() — returns patterns for known types, ["*"] for unknown
 * 3. getSubAgentTypeConfig() — returns full config or undefined
 * 4. ToolRegistry.createFilteredRegistry() — filters tools by patterns
 *
 * 逆向: amp-cli-reversed/chunk-005.js (2026_tail_anonymous.js) ~line 64997
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ToolRegistry } from "../tools/registry";
import type { ToolSpec } from "../tools/types";
import {
  getSubAgentToolPatterns,
  getSubAgentTypeConfig,
  SUBAGENT_TYPE_REGISTRY,
} from "./subagent-types";

// ─── Mock tools ────────────────────────────────────────────

function mockTool(name: string): ToolSpec {
  return {
    name,
    source: "builtin",
    description: `Mock ${name} tool`,
    inputSchema: { type: "object", properties: {} },
    async execute() {
      return { status: "done", content: "ok" };
    },
  };
}

// ─── SUBAGENT_TYPE_REGISTRY ────────────────────────────────

describe("SUBAGENT_TYPE_REGISTRY", () => {
  it("has entries for all core subagent types", () => {
    const expectedTypes = [
      "finder",
      "oracle",
      "code-review",
      "code-tour",
      "codereview-check",
      "walkthrough",
      "task-subagent",
      "librarian",
    ];
    for (const type of expectedTypes) {
      assert.ok(SUBAGENT_TYPE_REGISTRY[type], `Missing registry entry for ${type}`);
      assert.ok(Array.isArray(SUBAGENT_TYPE_REGISTRY[type].toolPatterns));
      assert.ok(SUBAGENT_TYPE_REGISTRY[type].toolPatterns.length > 0);
    }
  });

  it("finder has read-only tools: Grep, Glob, Read", () => {
    const config = SUBAGENT_TYPE_REGISTRY.finder;
    assert.deepEqual(config.toolPatterns, ["Grep", "Glob", "Read"]);
    assert.equal(config.allowMcp, false);
    assert.equal(config.allowToolbox, false);
  });

  it("code-review has Read, Grep, Glob, web_search, read_web_page, Bash", () => {
    const config = SUBAGENT_TYPE_REGISTRY["code-review"];
    assert.ok(config.toolPatterns.includes("Read"));
    assert.ok(config.toolPatterns.includes("Bash"));
    assert.ok(config.toolPatterns.includes("web_search"));
    assert.equal(config.allowMcp, false);
  });

  it("task-subagent allows MCP and toolbox", () => {
    const config = SUBAGENT_TYPE_REGISTRY["task-subagent"];
    assert.equal(config.allowMcp, true);
    assert.equal(config.allowToolbox, true);
    assert.ok(config.toolPatterns.includes("Bash"));
    assert.ok(config.toolPatterns.includes("Edit"));
  });
});

// ─── getSubAgentToolPatterns ───────────────────────────────

describe("getSubAgentToolPatterns()", () => {
  it("returns patterns for known type", () => {
    const patterns = getSubAgentToolPatterns("finder");
    assert.deepEqual(patterns, ["Grep", "Glob", "Read"]);
  });

  it("returns ['*'] for unknown type", () => {
    const patterns = getSubAgentToolPatterns("unknown-type");
    assert.deepEqual(patterns, ["*"]);
  });

  it("returns ['*'] for empty string type", () => {
    const patterns = getSubAgentToolPatterns("");
    assert.deepEqual(patterns, ["*"]);
  });
});

// ─── getSubAgentTypeConfig ─────────────────────────────────

describe("getSubAgentTypeConfig()", () => {
  it("returns config for known type", () => {
    const config = getSubAgentTypeConfig("oracle");
    assert.ok(config);
    assert.ok(config.toolPatterns.includes("Read"));
    assert.ok(config.toolPatterns.includes("web_search"));
  });

  it("returns undefined for unknown type", () => {
    const config = getSubAgentTypeConfig("nonexistent");
    assert.equal(config, undefined);
  });
});

// ─── ToolRegistry.createFilteredRegistry ───────────────────

describe("ToolRegistry.createFilteredRegistry()", () => {
  it("filters tools by exact name patterns", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("Read"));
    registry.register(mockTool("Write"));
    registry.register(mockTool("Bash"));
    registry.register(mockTool("Grep"));

    const filtered = registry.createFilteredRegistry(["Read", "Grep"]);
    const names = filtered.list().map((t) => t.name);
    assert.deepEqual(names.sort(), ["Grep", "Read"]);
  });

  it("['*'] returns all tools", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("Read"));
    registry.register(mockTool("Write"));
    registry.register(mockTool("Bash"));

    const filtered = registry.createFilteredRegistry(["*"]);
    assert.equal(filtered.list().length, 3);
  });

  it("empty patterns returns no tools", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("Read"));
    registry.register(mockTool("Write"));

    const filtered = registry.createFilteredRegistry([]);
    assert.equal(filtered.list().length, 0);
  });

  it("filtered registry is independent snapshot", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("Read"));
    registry.register(mockTool("Write"));

    const filtered = registry.createFilteredRegistry(["Read"]);
    assert.equal(filtered.list().length, 1);

    // Adding to parent doesn't affect filtered
    registry.register(mockTool("Bash"));
    assert.equal(filtered.list().length, 1);
  });

  it("supports glob patterns for tool names", () => {
    const registry = new ToolRegistry();
    registry.register(mockTool("mcp__server__read_file"));
    registry.register(mockTool("mcp__server__write_file"));
    registry.register(mockTool("Bash"));

    const filtered = registry.createFilteredRegistry(["mcp__server__*", "Bash"]);
    const names = filtered.list().map((t) => t.name);
    assert.equal(names.length, 3);
    assert.ok(names.includes("Bash"));
    assert.ok(names.includes("mcp__server__read_file"));
  });
});
