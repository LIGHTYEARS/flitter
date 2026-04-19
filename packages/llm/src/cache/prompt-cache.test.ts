/**
 * prompt-cache.test.ts — PromptCacheTracker unit tests
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PromptCacheTracker } from "./prompt-cache.js";

describe("PromptCacheTracker", () => {
  describe("recordResponse", () => {
    it("counts a cache hit when read tokens > 0", () => {
      const tracker = new PromptCacheTracker();
      tracker.recordResponse({
        cache_read_input_tokens: 5000,
        cache_creation_input_tokens: 0,
      });

      const stats = tracker.getStats();
      assert.equal(stats.hits, 1);
      assert.equal(stats.misses, 0);
      assert.equal(stats.savedTokens, 5000);
    });

    it("counts a cache miss when creation tokens > 0 and read = 0", () => {
      const tracker = new PromptCacheTracker();
      tracker.recordResponse({
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 3000,
      });

      const stats = tracker.getStats();
      assert.equal(stats.hits, 0);
      assert.equal(stats.misses, 1);
      assert.equal(stats.creationTokens, 3000);
    });

    it("does not count when both are 0", () => {
      const tracker = new PromptCacheTracker();
      tracker.recordResponse({
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      });

      const stats = tracker.getStats();
      assert.equal(stats.hits, 0);
      assert.equal(stats.misses, 0);
    });

    it("handles null values", () => {
      const tracker = new PromptCacheTracker();
      tracker.recordResponse({
        cache_read_input_tokens: null,
        cache_creation_input_tokens: null,
      });

      const stats = tracker.getStats();
      assert.equal(stats.hits, 0);
      assert.equal(stats.misses, 0);
    });

    it("handles undefined values", () => {
      const tracker = new PromptCacheTracker();
      tracker.recordResponse({});

      const stats = tracker.getStats();
      assert.equal(stats.hits, 0);
      assert.equal(stats.misses, 0);
    });

    it("accumulates stats across multiple responses", () => {
      const tracker = new PromptCacheTracker();

      // First call: cache miss (creation)
      tracker.recordResponse({
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 2000,
      });

      // Second call: cache hit
      tracker.recordResponse({
        cache_read_input_tokens: 2000,
        cache_creation_input_tokens: 0,
      });

      // Third call: cache hit
      tracker.recordResponse({
        cache_read_input_tokens: 2000,
        cache_creation_input_tokens: 0,
      });

      const stats = tracker.getStats();
      assert.equal(stats.hits, 2);
      assert.equal(stats.misses, 1);
      assert.equal(stats.savedTokens, 4000);
      assert.equal(stats.creationTokens, 2000);
    });
  });

  describe("getStats", () => {
    it("returns hitRate of 0 when no responses recorded", () => {
      const tracker = new PromptCacheTracker();
      assert.equal(tracker.getStats().hitRate, 0);
    });

    it("computes hitRate correctly", () => {
      const tracker = new PromptCacheTracker();
      tracker.recordResponse({ cache_read_input_tokens: 100 });
      tracker.recordResponse({ cache_creation_input_tokens: 50 });
      tracker.recordResponse({ cache_read_input_tokens: 100 });

      const stats = tracker.getStats();
      assert.ok(Math.abs(stats.hitRate - 2 / 3) < 0.001);
    });
  });

  describe("reset", () => {
    it("clears all counters", () => {
      const tracker = new PromptCacheTracker();
      tracker.recordResponse({ cache_read_input_tokens: 500 });
      tracker.recordResponse({ cache_creation_input_tokens: 300 });
      tracker.reset();

      const stats = tracker.getStats();
      assert.equal(stats.hits, 0);
      assert.equal(stats.misses, 0);
      assert.equal(stats.savedTokens, 0);
      assert.equal(stats.creationTokens, 0);
    });
  });

  describe("getCachePolicy", () => {
    it("returns default auto policy when no config", () => {
      const tracker = new PromptCacheTracker();
      const policy = tracker.getCachePolicy({});

      assert.equal(policy.strategy, "auto");
      assert.equal(policy.ttlSeconds, 300);
    });

    it("reads cache.strategy from config", () => {
      const tracker = new PromptCacheTracker();
      const policy = tracker.getCachePolicy({
        "cache.strategy": "aggressive",
      });

      assert.equal(policy.strategy, "aggressive");
    });

    it("reads cache.ttl from config", () => {
      const tracker = new PromptCacheTracker();
      const policy = tracker.getCachePolicy({
        "cache.ttl": 600,
      });

      assert.equal(policy.ttlSeconds, 600);
    });

    it("falls back to auto for invalid strategy", () => {
      const tracker = new PromptCacheTracker();
      const policy = tracker.getCachePolicy({
        "cache.strategy": "invalid-strategy",
      });

      assert.equal(policy.strategy, "auto");
    });

    it("falls back to 300s for invalid ttl", () => {
      const tracker = new PromptCacheTracker();
      const policy = tracker.getCachePolicy({
        "cache.ttl": -1,
      });

      assert.equal(policy.ttlSeconds, 300);
    });

    it("returns none strategy when configured", () => {
      const tracker = new PromptCacheTracker();
      const policy = tracker.getCachePolicy({
        "cache.strategy": "none",
      });

      assert.equal(policy.strategy, "none");
    });
  });
});
