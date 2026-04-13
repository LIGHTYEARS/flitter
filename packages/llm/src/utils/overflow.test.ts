/**
 * isContextOverflow — unit tests
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isContextOverflow } from "./overflow";

describe("isContextOverflow", () => {
  // Anthropic patterns
  it("should detect 'prompt is too long'", () => {
    assert.equal(isContextOverflow("prompt is too long: 250000 tokens > 200000 max"), true);
  });

  it("should detect 'exceeds the maximum number of tokens'", () => {
    assert.equal(isContextOverflow("Input exceeds the maximum number of tokens"), true);
  });

  // OpenAI patterns
  it("should detect 'maximum context length'", () => {
    assert.equal(
      isContextOverflow("This model's maximum context length is 128000 tokens"),
      true,
    );
  });

  it("should detect 'Request too large'", () => {
    assert.equal(isContextOverflow("Request too large for model gpt-4o"), true);
  });

  it("should detect 'reduce the length'", () => {
    assert.equal(
      isContextOverflow("Please reduce the length of the messages or completion"),
      true,
    );
  });

  it("should detect 'tokens exceeds'", () => {
    assert.equal(
      isContextOverflow("150000 tokens exceeds the 128000 token limit"),
      true,
    );
  });

  // Gemini patterns
  it("should detect 'exceeds the maximum token count'", () => {
    assert.equal(isContextOverflow("Input exceeds the maximum token count"), true);
  });

  it("should detect 'input too long'", () => {
    assert.equal(isContextOverflow("The input too long for this model"), true);
  });

  // Generic patterns
  it("should detect 'context window'", () => {
    assert.equal(isContextOverflow("Exceeded context window size"), true);
  });

  it("should detect 'context_window'", () => {
    assert.equal(isContextOverflow("context_window limit reached"), true);
  });

  it("should detect 'token limit'", () => {
    assert.equal(isContextOverflow("You have exceeded the token limit"), true);
  });

  it("should detect 'too many tokens'", () => {
    assert.equal(isContextOverflow("too many tokens in request"), true);
  });

  // Negative cases
  it("should return false for unrelated errors", () => {
    assert.equal(isContextOverflow("Connection refused"), false);
  });

  it("should return false for rate limit errors", () => {
    assert.equal(isContextOverflow("Rate limit exceeded, retry after 2s"), false);
  });

  it("should return false for auth errors", () => {
    assert.equal(isContextOverflow("Invalid API key provided"), false);
  });

  it("should return false for empty string", () => {
    assert.equal(isContextOverflow(""), false);
  });
});
