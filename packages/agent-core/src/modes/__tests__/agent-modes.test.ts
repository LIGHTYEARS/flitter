/**
 * Tests for Agent Mode System
 *
 * Covers:
 * - Mode definitions (AGENT_MODES)
 * - getModelForMode() returns correct model per mode
 * - isDeepReasoningMode() returns true only for "deep"
 * - isValidAgentMode() validates mode strings
 * - getModeSpec() returns the correct spec
 * - resolveReasoningEffort() per-provider resolution chain
 * - inferProviderFromModel() provider inference
 */
import { describe, expect, test } from "bun:test";
import type { Settings } from "@flitter/schemas";
import {
  AGENT_MODES,
  getModelForMode,
  getModeSpec,
  inferProviderFromModel,
  isDeepReasoningMode,
  isFreeMode,
  isToolAllowedInMode,
  isValidAgentMode,
  resolveReasoningEffort,
} from "../index";

// ── Helper to build a minimal Settings object ──
function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...overrides } as Settings;
}

// ─── AGENT_MODES ────────────────────────────────────────

describe("AGENT_MODES", () => {
  test("has exactly 8 modes: smart, fast, deep, auto, rush, large, free, agg-man", () => {
    const keys = Object.keys(AGENT_MODES).sort();
    expect(keys).toEqual(["agg-man", "auto", "deep", "fast", "free", "large", "rush", "smart"]);
  });

  test("each mode has required fields", () => {
    for (const [key, spec] of Object.entries(AGENT_MODES)) {
      expect(spec.key).toBe(key);
      expect(typeof spec.displayName).toBe("string");
      expect(typeof spec.description).toBe("string");
      expect(typeof spec.primaryModel).toBe("string");
      expect(Array.isArray(spec.includeTools)).toBe(true);
      expect(Array.isArray(spec.deferredTools)).toBe(true);
    }
  });

  test("deep mode has reasoningEffort = 'high'", () => {
    expect(AGENT_MODES.deep.reasoningEffort).toBe("high");
  });

  test("smart mode has no reasoningEffort", () => {
    expect(AGENT_MODES.smart.reasoningEffort).toBeUndefined();
  });
});

// ─── getModelForMode ────────────────────────────────────

describe("getModelForMode", () => {
  test("returns claude-opus-4-6 for smart", () => {
    expect(getModelForMode("smart")).toBe("claude-opus-4-6");
  });

  test("returns claude-haiku-4-5-20251001 for fast", () => {
    expect(getModelForMode("fast")).toBe("claude-haiku-4-5-20251001");
  });

  test("returns claude-opus-4-6 for deep", () => {
    expect(getModelForMode("deep")).toBe("claude-opus-4-6");
  });

  test("returns claude-sonnet-4-6 for auto", () => {
    expect(getModelForMode("auto")).toBe("claude-sonnet-4-6");
  });

  // 逆向: Ab.RUSH (chunk-005.js:67221-67242) — CLAUDE_HAIKU_4_5
  test("returns claude-haiku-4-5-20251001 for rush", () => {
    expect(getModelForMode("rush")).toBe("claude-haiku-4-5-20251001");
  });

  // 逆向: Ab.LARGE (chunk-005.js:67263-67284) — CLAUDE_OPUS_4_6
  test("returns claude-opus-4-6 for large", () => {
    expect(getModelForMode("large")).toBe("claude-opus-4-6");
  });

  // 逆向: Ab.FREE (2026_tail_anonymous.js:61034-61052) — CLAUDE_HAIKU_4_5
  test("returns claude-haiku-4-5-20251001 for free", () => {
    expect(getModelForMode("free")).toBe("claude-haiku-4-5-20251001");
  });

  // 逆向: Ab.AGG (chunk-005.js:67243-67261) — CLAUDE_OPUS_4_6
  test("returns claude-opus-4-6 for agg-man", () => {
    expect(getModelForMode("agg-man")).toBe("claude-opus-4-6");
  });
});

// ─── isDeepReasoningMode ────────────────────────────────

describe("isDeepReasoningMode", () => {
  test("returns true for deep", () => {
    expect(isDeepReasoningMode("deep")).toBe(true);
  });

  test("returns false for smart", () => {
    expect(isDeepReasoningMode("smart")).toBe(false);
  });

  test("returns false for fast", () => {
    expect(isDeepReasoningMode("fast")).toBe(false);
  });

  test("returns false for auto", () => {
    expect(isDeepReasoningMode("auto")).toBe(false);
  });
});

// ─── isValidAgentMode ───────────────────────────────────

describe("isValidAgentMode", () => {
  test("returns true for all valid modes", () => {
    expect(isValidAgentMode("smart")).toBe(true);
    expect(isValidAgentMode("fast")).toBe(true);
    expect(isValidAgentMode("deep")).toBe(true);
    expect(isValidAgentMode("auto")).toBe(true);
    expect(isValidAgentMode("rush")).toBe(true);
    expect(isValidAgentMode("large")).toBe(true);
    expect(isValidAgentMode("free")).toBe(true);
    expect(isValidAgentMode("agg-man")).toBe(true);
  });

  test("returns false for invalid strings", () => {
    expect(isValidAgentMode("turbo")).toBe(false);
    expect(isValidAgentMode("")).toBe(false);
    expect(isValidAgentMode("SMART")).toBe(false);
  });
});

// ─── getModeSpec ────────────────────────────────────────

describe("getModeSpec", () => {
  test("returns the full spec for each mode", () => {
    const spec = getModeSpec("smart");
    expect(spec.key).toBe("smart");
    expect(spec.displayName).toBe("Smart");
    expect(spec.primaryModel).toBe("claude-opus-4-6");
  });
});

// ─── isToolAllowedInMode ───────────────────────────────

describe("isToolAllowedInMode", () => {
  describe("smart mode (full tool set)", () => {
    test("allows Read", () => {
      expect(isToolAllowedInMode("Read", "smart")).toBe(true);
    });

    test("allows Bash", () => {
      expect(isToolAllowedInMode("Bash", "smart")).toBe(true);
    });

    test("allows deferred tool code_review", () => {
      expect(isToolAllowedInMode("code_review", "smart")).toBe(true);
    });

    test("rejects tool not in smart list", () => {
      expect(isToolAllowedInMode("nonexistent_tool", "smart")).toBe(false);
    });
  });

  describe("deep mode (restricted set)", () => {
    test("allows shell_command", () => {
      expect(isToolAllowedInMode("shell_command", "deep")).toBe(true);
    });

    test("allows apply_patch", () => {
      expect(isToolAllowedInMode("apply_patch", "deep")).toBe(true);
    });

    test("rejects Read (not in deep tools)", () => {
      expect(isToolAllowedInMode("Read", "deep")).toBe(false);
    });

    test("rejects Edit (not in deep tools)", () => {
      expect(isToolAllowedInMode("Edit", "deep")).toBe(false);
    });

    test("rejects Glob (not in deep tools)", () => {
      expect(isToolAllowedInMode("Glob", "deep")).toBe(false);
    });

    test("allows deferred tool code_review", () => {
      expect(isToolAllowedInMode("code_review", "deep")).toBe(true);
    });
  });

  describe("auto mode (empty includeTools = all allowed)", () => {
    test("allows any tool", () => {
      expect(isToolAllowedInMode("Read", "auto")).toBe(true);
      expect(isToolAllowedInMode("whatever_tool", "auto")).toBe(true);
    });
  });

  describe("MCP tools always pass through", () => {
    test("allows mcp__ prefixed tools regardless of mode", () => {
      expect(isToolAllowedInMode("mcp__server__tool", "deep")).toBe(true);
      expect(isToolAllowedInMode("mcp__myserver__custom", "smart")).toBe(true);
    });
  });

  describe("fast mode", () => {
    test("allows Read", () => {
      expect(isToolAllowedInMode("Read", "fast")).toBe(true);
    });

    test("allows Grep", () => {
      expect(isToolAllowedInMode("Grep", "fast")).toBe(true);
    });
  });

  describe("free mode (reduced tool set)", () => {
    test("allows Read", () => {
      expect(isToolAllowedInMode("Read", "free")).toBe(true);
    });

    test("allows Bash", () => {
      expect(isToolAllowedInMode("Bash", "free")).toBe(true);
    });

    test("allows skill", () => {
      expect(isToolAllowedInMode("skill", "free")).toBe(true);
    });

    test("rejects oracle (not in free tools)", () => {
      expect(isToolAllowedInMode("oracle", "free")).toBe(false);
    });

    test("rejects librarian (not in free tools)", () => {
      expect(isToolAllowedInMode("librarian", "free")).toBe(false);
    });

    test("rejects Task (not in free tools)", () => {
      expect(isToolAllowedInMode("Task", "free")).toBe(false);
    });

    test("rejects restore_snapshot (not in free tools)", () => {
      expect(isToolAllowedInMode("restore_snapshot", "free")).toBe(false);
    });

    test("MCP tools still pass through", () => {
      expect(isToolAllowedInMode("mcp__server__tool", "free")).toBe(true);
    });
  });
});

// ─── Tool list consistency ─────────────────────────────

describe("includeTools consistency", () => {
  test("smart and large share the same tool set", () => {
    expect(AGENT_MODES.smart.includeTools).toEqual(AGENT_MODES.large.includeTools);
  });

  test("fast and rush share the same tool set", () => {
    expect(AGENT_MODES.fast.includeTools).toEqual(AGENT_MODES.rush.includeTools);
  });

  test("deep is a strict subset of smart", () => {
    const smartSet = new Set(AGENT_MODES.smart.includeTools);
    for (const tool of AGENT_MODES.deep.includeTools) {
      expect(smartSet.has(tool)).toBe(true);
    }
  });

  test("deep has fewer tools than smart", () => {
    expect(AGENT_MODES.deep.includeTools.length).toBeLessThan(
      AGENT_MODES.smart.includeTools.length,
    );
  });

  test("free is a strict subset of fast", () => {
    const fastSet = new Set(AGENT_MODES.fast.includeTools);
    for (const tool of AGENT_MODES.free.includeTools) {
      expect(fastSet.has(tool)).toBe(true);
    }
  });

  test("free has fewer tools than fast", () => {
    expect(AGENT_MODES.free.includeTools.length).toBeLessThan(AGENT_MODES.fast.includeTools.length);
  });

  test("auto mode has empty includeTools (all tools allowed)", () => {
    expect(AGENT_MODES.auto.includeTools).toEqual([]);
  });
});

// ─── isFreeMode ───────────────────────────────────────

describe("isFreeMode", () => {
  test("returns true for free", () => {
    expect(isFreeMode("free")).toBe(true);
  });

  test("returns true for free- prefixed variants", () => {
    expect(isFreeMode("free-trial")).toBe(true);
    expect(isFreeMode("free-limited")).toBe(true);
  });

  test("returns false for other modes", () => {
    expect(isFreeMode("smart")).toBe(false);
    expect(isFreeMode("fast")).toBe(false);
    expect(isFreeMode("deep")).toBe(false);
    expect(isFreeMode("auto")).toBe(false);
  });
});

// ─── agg-man mode ─────────────────────────────────────

describe("agg-man mode", () => {
  // 逆向: Ab.AGG (chunk-005.js:67243-67261)
  test("AGENT_MODES has agg-man entry", () => {
    expect(AGENT_MODES["agg-man"]).toBeDefined();
    expect(AGENT_MODES["agg-man"].displayName).toBe("Agg");
  });

  test("agg-man description matches amp reference", () => {
    expect(AGENT_MODES["agg-man"].description).toBe(
      "Navigate work across projects, threads, and context",
    );
  });

  test("agg-man is not visible in mode picker", () => {
    // 逆向: Ab.AGG.visible = false (chunk-005.js:67249)
    expect(AGENT_MODES["agg-man"].visible).toBe(false);
  });

  test("agg-man has correct uiHints", () => {
    // 逆向: Ab.AGG.uiHints (chunk-005.js:67250-67260)
    expect(AGENT_MODES["agg-man"].uiHints?.primaryColor).toEqual({ r: 26, g: 0, b: 77 });
    expect(AGENT_MODES["agg-man"].uiHints?.secondaryColor).toEqual({ r: 102, g: 153, b: 255 });
  });

  test("agg-man mode allows navigation tools", () => {
    // 逆向: jiT includes find_thread, read_thread, web_search (chunk-005.js:67177)
    expect(isToolAllowedInMode("find_thread", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("web_search", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("read_thread", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("github_repo_ci_status", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("create_thread", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("archive_thread", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("unarchive_thread", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("send_message_to_thread", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("render_agg_man", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("create_project", "agg-man")).toBe(true);
    expect(isToolAllowedInMode("diff", "agg-man")).toBe(true);
  });

  test("agg-man mode blocks execution tools", () => {
    // 逆向: jiT does NOT include Bash, Read, Edit, Write, Grep, Glob, shell_command, apply_patch
    expect(isToolAllowedInMode("Bash", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("Read", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("Edit", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("Write", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("Grep", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("Glob", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("shell_command", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("apply_patch", "agg-man")).toBe(false);
    expect(isToolAllowedInMode("Task", "agg-man")).toBe(false);
  });

  test("agg-man uses claude-opus-4-6", () => {
    // 逆向: Ab.AGG.primaryModel = ya("CLAUDE_OPUS_4_6") (chunk-005.js:67247)
    expect(AGENT_MODES["agg-man"].primaryModel).toBe("claude-opus-4-6");
  });

  test("agg-man has no deferred tools", () => {
    expect(AGENT_MODES["agg-man"].deferredTools).toEqual([]);
  });

  test("agg-man MCP tools still pass through", () => {
    expect(isToolAllowedInMode("mcp__server__tool", "agg-man")).toBe(true);
  });
});

// ─── inferProviderFromModel ──────────────────────────────

describe("inferProviderFromModel", () => {
  test("extracts provider from provider/model format", () => {
    expect(inferProviderFromModel("anthropic/claude-opus-4-6")).toBe("anthropic");
    expect(inferProviderFromModel("openai/gpt-4o")).toBe("openai");
    expect(inferProviderFromModel("vertexai/gemini-2.5-pro")).toBe("vertexai");
  });

  test("infers anthropic from claude- prefix", () => {
    expect(inferProviderFromModel("claude-opus-4-6")).toBe("anthropic");
    expect(inferProviderFromModel("claude-sonnet-4-20250514")).toBe("anthropic");
  });

  test("infers openai from gpt-/o3/o4/codex- prefixes", () => {
    expect(inferProviderFromModel("gpt-4o")).toBe("openai");
    expect(inferProviderFromModel("o3")).toBe("openai");
    expect(inferProviderFromModel("o4-mini")).toBe("openai");
    expect(inferProviderFromModel("codex-mini")).toBe("openai");
  });

  test("infers gemini from gemini- prefix", () => {
    expect(inferProviderFromModel("gemini-2.5-pro")).toBe("gemini");
  });

  test("returns empty string for unknown models", () => {
    expect(inferProviderFromModel("llama-3")).toBe("");
    expect(inferProviderFromModel("unknown-model")).toBe("");
  });
});

// ─── resolveReasoningEffort ─────────────────────────────

describe("resolveReasoningEffort", () => {
  describe("anthropic provider", () => {
    test("uses anthropic.effort setting when present", () => {
      const settings = makeSettings({ "anthropic.effort": "medium" });
      expect(resolveReasoningEffort("claude-opus-4-6", settings)).toBe("medium");
    });

    test("uses anthropic.effort from provider/model format", () => {
      const settings = makeSettings({ "anthropic.effort": "low" });
      expect(resolveReasoningEffort("anthropic/claude-opus-4-6", settings)).toBe("low");
    });

    test("falls back to mode reasoningEffort when no setting", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("claude-opus-4-6", settings, "deep")).toBe("high");
    });

    test("returns undefined when no setting and no mode effort", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("claude-opus-4-6", settings)).toBeUndefined();
    });

    test("returns undefined for smart mode (no effort on mode)", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("claude-opus-4-6", settings, "smart")).toBeUndefined();
    });

    test("setting takes priority over mode", () => {
      const settings = makeSettings({ "anthropic.effort": "low" });
      expect(resolveReasoningEffort("claude-opus-4-6", settings, "deep")).toBe("low");
    });
  });

  describe("openai provider", () => {
    test("returns mode effort for non-codex models", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("gpt-4o", settings, "deep")).toBe("high");
    });

    test("falls back to medium with no mode", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("gpt-4o", settings)).toBe("medium");
    });

    test("uses agent.deepReasoningEffort for codex models when set", () => {
      const settings = makeSettings({ "agent.deepReasoningEffort": "xhigh" });
      expect(resolveReasoningEffort("codex-mini", settings, "deep")).toBe("xhigh");
    });

    test("codex without deepReasoningEffort falls to mode effort", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("codex-mini", settings, "deep")).toBe("high");
    });

    test("codex with provider/model format uses deepReasoningEffort", () => {
      const settings = makeSettings({ "agent.deepReasoningEffort": "medium" });
      expect(resolveReasoningEffort("openai/codex-mini", settings)).toBe("medium");
    });
  });

  describe("gemini/vertexai provider", () => {
    test("uses gemini.thinkingLevel setting when present", () => {
      const settings = makeSettings({ "gemini.thinkingLevel": "high" });
      expect(resolveReasoningEffort("gemini-2.5-pro", settings)).toBe("high");
    });

    test("falls back to mode effort when no setting", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("gemini-2.5-pro", settings, "deep")).toBe("high");
    });

    test("falls back to medium with no mode and no setting", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("gemini-2.5-pro", settings)).toBe("medium");
    });

    test("vertexai provider/model format uses gemini.thinkingLevel", () => {
      const settings = makeSettings({ "gemini.thinkingLevel": "low" });
      expect(resolveReasoningEffort("vertexai/gemini-2.5-pro", settings)).toBe("low");
    });
  });

  describe("unknown provider", () => {
    test("uses mode effort when present", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("llama-3", settings, "deep")).toBe("high");
    });

    test("falls back to medium with no mode", () => {
      const settings = makeSettings({});
      expect(resolveReasoningEffort("llama-3", settings)).toBe("medium");
    });
  });
});
