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
  isValidAgentMode,
  resolveReasoningEffort,
} from "../index";

// ── Helper to build a minimal Settings object ──
function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...overrides } as Settings;
}

// ─── AGENT_MODES ────────────────────────────────────────

describe("AGENT_MODES", () => {
  test("has exactly 4 modes: smart, fast, deep, auto", () => {
    const keys = Object.keys(AGENT_MODES).sort();
    expect(keys).toEqual(["auto", "deep", "fast", "smart"]);
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
  });

  test("returns false for invalid strings", () => {
    expect(isValidAgentMode("rush")).toBe(false);
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
