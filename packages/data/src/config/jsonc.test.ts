/**
 * Tests for JSONC stripper.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripJsonComments } from "./jsonc";

describe("stripJsonComments", () => {
  it("should remove line comments", () => {
    const input = '{ "key": "value" } // trailing comment';
    const result = stripJsonComments(input);
    assert.equal(JSON.parse(result).key, "value");
  });

  it("should remove block comments", () => {
    const input = '{ /* block */ "key": "value" }';
    const result = stripJsonComments(input);
    assert.equal(JSON.parse(result).key, "value");
  });

  it("should remove multi-line block comments", () => {
    const input = `{
  /* this is
     a multi-line
     comment */
  "key": "value"
}`;
    const result = stripJsonComments(input);
    assert.equal(JSON.parse(result).key, "value");
  });

  it("should not strip // inside strings", () => {
    const input = '{ "url": "http://example.com" }';
    const result = stripJsonComments(input);
    assert.equal(JSON.parse(result).url, "http://example.com");
  });

  it("should handle escaped quotes in strings", () => {
    const input = '{ "val": "he said \\"hi\\" // not a comment" }';
    const result = stripJsonComments(input);
    assert.equal(JSON.parse(result).val, 'he said "hi" // not a comment');
  });

  it("should handle trailing line comment after value", () => {
    const input = `{
  "a": 1, // first
  "b": 2  // second
}`;
    const result = stripJsonComments(input);
    const obj = JSON.parse(result);
    assert.equal(obj.a, 1);
    assert.equal(obj.b, 2);
  });

  it("should return pure JSON unchanged", () => {
    const input = '{"key": "value", "num": 42}';
    const result = stripJsonComments(input);
    assert.equal(result, input);
  });

  it("should handle empty input", () => {
    assert.equal(stripJsonComments(""), "");
  });

  it("should handle consecutive comments", () => {
    const input = `{
  // first comment
  // second comment
  "key": "value"
  /* block 1 */
  /* block 2 */
}`;
    const result = stripJsonComments(input);
    assert.equal(JSON.parse(result).key, "value");
  });

  it("should handle comment-only input", () => {
    const result = stripJsonComments("// just a comment");
    assert.equal(result.trim(), "");
  });

  it("should produce parseable JSON after stripping", () => {
    const input = `{
  // Anthropic settings
  "anthropic.speed": "normal",
  /* MCP servers */
  "mcpServers": {} // empty for now
}`;
    const result = stripJsonComments(input);
    const obj = JSON.parse(result);
    assert.equal(obj["anthropic.speed"], "normal");
    assert.deepEqual(obj.mcpServers, {});
  });

  it("should not break /* inside strings", () => {
    const input = '{ "pattern": "/* not a comment */" }';
    const result = stripJsonComments(input);
    assert.equal(JSON.parse(result).pattern, "/* not a comment */");
  });
});
