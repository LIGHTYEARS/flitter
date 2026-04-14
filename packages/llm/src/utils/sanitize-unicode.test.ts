/**
 * sanitizeSurrogates — unit tests
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeSurrogates } from "./sanitize-unicode";

describe("sanitizeSurrogates", () => {
  it("should pass through normal ASCII text", () => {
    assert.equal(sanitizeSurrogates("Hello, world!"), "Hello, world!");
  });

  it("should pass through valid UTF-8 text", () => {
    assert.equal(sanitizeSurrogates("日本語テスト 🎉"), "日本語テスト 🎉");
  });

  it("should pass through valid surrogate pairs (emoji)", () => {
    // 🎉 is U+1F389, encoded as surrogate pair \uD83C\uDF89
    const emoji = "\uD83C\uDF89";
    assert.equal(sanitizeSurrogates(emoji), emoji);
  });

  it("should replace lone high surrogate", () => {
    const input = "before\uD800after";
    assert.equal(sanitizeSurrogates(input), "before\uFFFDafter");
  });

  it("should replace lone low surrogate", () => {
    const input = "before\uDC00after";
    assert.equal(sanitizeSurrogates(input), "before\uFFFDafter");
  });

  it("should replace multiple lone surrogates", () => {
    const input = "\uD800\uD801text\uDC00\uDC01";
    const result = sanitizeSurrogates(input);
    assert.equal(result, "\uFFFD\uFFFDtext\uFFFD\uFFFD");
  });

  it("should handle empty string", () => {
    assert.equal(sanitizeSurrogates(""), "");
  });

  it("should handle string with only valid surrogate pairs", () => {
    // Two emoji: 😀 (U+1F600) and 🔥 (U+1F525)
    const input = "😀🔥";
    assert.equal(sanitizeSurrogates(input), input);
  });

  it("should handle mixed valid and invalid surrogates", () => {
    // Valid pair + lone high + normal text
    const input = "😀\uD800hello";
    assert.equal(sanitizeSurrogates(input), "😀\uFFFDhello");
  });
});
