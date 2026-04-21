/**
 * OpenAI-Compatible provider presets — unit tests
 *
 * 逆向: amp-cli-reversed/modules/1085_unknown_Z4R.js (fireworks)
 *        amp-cli-reversed/modules/1092_unknown_hLR.js (baseten)
 *        amp-cli-reversed/modules/1173_unknown_xWT.js (moonshotai)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectCompatFromURL, KNOWN_COMPAT_CONFIGS } from "./compat";

// ─── KNOWN_COMPAT_CONFIGS preset existence & values ────────

describe("KNOWN_COMPAT_CONFIGS", () => {
  describe("fireworks", () => {
    it("should exist in KNOWN_COMPAT_CONFIGS", () => {
      assert.ok(KNOWN_COMPAT_CONFIGS.fireworks, "fireworks preset missing");
    });

    it("should have correct baseURL", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.fireworks.baseURL, "https://api.fireworks.ai/inference/v1");
    });

    it("should have supportsStore=false", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.fireworks.supportsStore, false);
    });

    it("should have supportsDeveloperRole=false", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.fireworks.supportsDeveloperRole, false);
    });

    it("should have supportsReasoningEffort=false", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.fireworks.supportsReasoningEffort, false);
    });
  });

  describe("baseten", () => {
    it("should exist in KNOWN_COMPAT_CONFIGS", () => {
      assert.ok(KNOWN_COMPAT_CONFIGS.baseten, "baseten preset missing");
    });

    it("should have correct baseURL", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.baseten.baseURL, "https://bridge.baseten.co/v1");
    });

    it("should have supportsStore=false", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.baseten.supportsStore, false);
    });

    it("should have supportsDeveloperRole=false", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.baseten.supportsDeveloperRole, false);
    });

    it("should have supportsReasoningEffort=false", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.baseten.supportsReasoningEffort, false);
    });
  });

  describe("moonshotai", () => {
    it("should exist in KNOWN_COMPAT_CONFIGS", () => {
      assert.ok(KNOWN_COMPAT_CONFIGS.moonshotai, "moonshotai preset missing");
    });

    it("should have correct baseURL", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.moonshotai.baseURL, "https://api.moonshot.cn/v1");
    });

    it("should have supportsStore=false", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.moonshotai.supportsStore, false);
    });

    it("should have supportsDeveloperRole=false", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.moonshotai.supportsDeveloperRole, false);
    });

    it("should have supportsReasoningEffort=false", () => {
      assert.equal(KNOWN_COMPAT_CONFIGS.moonshotai.supportsReasoningEffort, false);
    });
  });
});

// ─── detectCompatFromURL ───────────────────────────────────

describe("detectCompatFromURL", () => {
  describe("fireworks", () => {
    it("should detect fireworks from full baseURL", () => {
      const result = detectCompatFromURL("https://api.fireworks.ai/inference/v1");
      assert.deepEqual(result, KNOWN_COMPAT_CONFIGS.fireworks);
    });

    it("should detect fireworks case-insensitively", () => {
      const result = detectCompatFromURL("https://API.FIREWORKS.AI/inference/v1");
      assert.deepEqual(result, KNOWN_COMPAT_CONFIGS.fireworks);
    });
  });

  describe("baseten", () => {
    it("should detect baseten from full baseURL", () => {
      const result = detectCompatFromURL("https://bridge.baseten.co/v1");
      assert.deepEqual(result, KNOWN_COMPAT_CONFIGS.baseten);
    });

    it("should detect baseten from subdomain URL", () => {
      const result = detectCompatFromURL("https://custom.baseten.co/v1/chat/completions");
      assert.deepEqual(result, KNOWN_COMPAT_CONFIGS.baseten);
    });

    it("should detect baseten case-insensitively", () => {
      const result = detectCompatFromURL("https://BRIDGE.BASETEN.CO/v1");
      assert.deepEqual(result, KNOWN_COMPAT_CONFIGS.baseten);
    });
  });

  describe("moonshotai", () => {
    it("should detect moonshotai from full baseURL", () => {
      const result = detectCompatFromURL("https://api.moonshot.cn/v1");
      assert.deepEqual(result, KNOWN_COMPAT_CONFIGS.moonshotai);
    });

    it("should detect moonshotai case-insensitively", () => {
      const result = detectCompatFromURL("https://API.MOONSHOT.CN/v1");
      assert.deepEqual(result, KNOWN_COMPAT_CONFIGS.moonshotai);
    });
  });

  it("should return undefined for unknown URLs", () => {
    assert.equal(detectCompatFromURL("https://unknown.example.com/v1"), undefined);
  });
});
