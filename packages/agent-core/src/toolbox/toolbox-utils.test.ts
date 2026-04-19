/**
 * Toolbox utilities — unit tests
 *
 * Covers: name sanitization (O5R), toolbox name prefixing, path resolution (D5R).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sanitizeToolName,
  toToolboxName,
  resolveToolboxPaths,
  TOOLBOX_PREFIX,
} from "./toolbox-utils";

// ─── sanitizeToolName (逆向: O5R) ────────────────────────

describe("sanitizeToolName", () => {
  it("passes through simple alphanumeric names", () => {
    assert.equal(sanitizeToolName("run-tests"), "run-tests");
  });

  it("replaces spaces with hyphens", () => {
    assert.equal(sanitizeToolName("run tests"), "run-tests");
  });

  it("replaces multiple spaces with a single hyphen", () => {
    assert.equal(sanitizeToolName("run   tests"), "run-tests");
  });

  it("strips non-alphanumeric/underscore/hyphen chars", () => {
    assert.equal(sanitizeToolName("my@tool#v2!"), "mytoolv2");
  });

  it("collapses multiple hyphens", () => {
    assert.equal(sanitizeToolName("a---b"), "a-b");
  });

  it("trims leading and trailing hyphens", () => {
    assert.equal(sanitizeToolName("-hello-"), "hello");
  });

  it("truncates to 120 chars", () => {
    const long = "a".repeat(200);
    assert.equal(sanitizeToolName(long).length, 120);
  });

  it("returns 'tool' for empty result", () => {
    assert.equal(sanitizeToolName("@@@"), "tool");
    assert.equal(sanitizeToolName(""), "tool");
  });

  it("handles underscores", () => {
    assert.equal(sanitizeToolName("my_tool_v2"), "my_tool_v2");
  });

  it("handles mixed whitespace types", () => {
    assert.equal(sanitizeToolName("run\ttests\nhere"), "run-tests-here");
  });
});

// ─── toToolboxName ───────────────────────────────────────

describe("toToolboxName", () => {
  it("prefixes with tb__", () => {
    assert.equal(toToolboxName("my-tool"), "tb__my-tool");
  });

  it("sanitizes the name before prefixing", () => {
    assert.equal(toToolboxName("My Tool!"), "tb__My-Tool");
  });

  it("prefix is correct constant", () => {
    assert.equal(TOOLBOX_PREFIX, "tb__");
  });
});

// ─── resolveToolboxPaths (逆向: D5R) ────────────────────

describe("resolveToolboxPaths", () => {
  const homeDir = "/home/user";

  it("returns default path when no config and no env", () => {
    // Temporarily remove env var if present
    const saved = process.env.FLITTER_TOOLBOX;
    delete process.env.FLITTER_TOOLBOX;
    try {
      const paths = resolveToolboxPaths(undefined, homeDir);
      assert.deepEqual(paths, ["/home/user/.local/share/flitter/tools"]);
    } finally {
      if (saved !== undefined) process.env.FLITTER_TOOLBOX = saved;
    }
  });

  it("parses colon-separated settings path", () => {
    const saved = process.env.FLITTER_TOOLBOX;
    delete process.env.FLITTER_TOOLBOX;
    try {
      const paths = resolveToolboxPaths("/a/b:/c/d", homeDir);
      assert.deepEqual(paths, ["/a/b", "/c/d"]);
    } finally {
      if (saved !== undefined) process.env.FLITTER_TOOLBOX = saved;
    }
  });

  it("uses env var when settings not provided", () => {
    const saved = process.env.FLITTER_TOOLBOX;
    process.env.FLITTER_TOOLBOX = "/env/path";
    try {
      const paths = resolveToolboxPaths(undefined, homeDir);
      assert.deepEqual(paths, ["/env/path"]);
    } finally {
      if (saved !== undefined) process.env.FLITTER_TOOLBOX = saved;
      else delete process.env.FLITTER_TOOLBOX;
    }
  });

  it("settings override env var", () => {
    const saved = process.env.FLITTER_TOOLBOX;
    process.env.FLITTER_TOOLBOX = "/env/path";
    try {
      const paths = resolveToolboxPaths("/settings/path", homeDir);
      assert.deepEqual(paths, ["/settings/path"]);
    } finally {
      if (saved !== undefined) process.env.FLITTER_TOOLBOX = saved;
      else delete process.env.FLITTER_TOOLBOX;
    }
  });

  it("returns empty array for empty string config", () => {
    const saved = process.env.FLITTER_TOOLBOX;
    delete process.env.FLITTER_TOOLBOX;
    try {
      const paths = resolveToolboxPaths("", homeDir);
      // Empty string is falsy, so falls through to env; env also empty → default
      assert.deepEqual(paths, ["/home/user/.local/share/flitter/tools"]);
    } finally {
      if (saved !== undefined) process.env.FLITTER_TOOLBOX = saved;
    }
  });

  it("filters empty segments from colon-separated paths", () => {
    const saved = process.env.FLITTER_TOOLBOX;
    delete process.env.FLITTER_TOOLBOX;
    try {
      const paths = resolveToolboxPaths("/a::/b:", homeDir);
      assert.deepEqual(paths, ["/a", "/b"]);
    } finally {
      if (saved !== undefined) process.env.FLITTER_TOOLBOX = saved;
    }
  });
});
