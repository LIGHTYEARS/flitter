/**
 * Tests for parseMemoryCommand — /memory slash command parser.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMemoryCommand } from "../memory-command";

describe("parseMemoryCommand", () => {
  it('parses "add key value"', () => {
    const result = parseMemoryCommand("add my-key my value here");
    assert.deepEqual(result, { action: "add", key: "my-key", value: "my value here" });
  });

  it('parses "remove key"', () => {
    const result = parseMemoryCommand("remove my-key");
    assert.deepEqual(result, { action: "remove", key: "my-key" });
  });

  it('parses "list"', () => {
    const result = parseMemoryCommand("list");
    assert.deepEqual(result, { action: "list" });
  });

  it('parses "" as list', () => {
    const result = parseMemoryCommand("");
    assert.deepEqual(result, { action: "list" });
  });

  it('parses "get key"', () => {
    const result = parseMemoryCommand("get some-key");
    assert.deepEqual(result, { action: "get", key: "some-key" });
  });

  it("returns error for invalid action", () => {
    const result = parseMemoryCommand("unknown action");
    assert.equal(result.action, "error");
    assert.ok("message" in result);
    assert.ok(result.message.includes("Unknown memory action"));
  });

  it("handles rm alias for remove", () => {
    const result = parseMemoryCommand("rm my-key");
    assert.deepEqual(result, { action: "remove", key: "my-key" });
  });

  it("handles delete alias for remove", () => {
    const result = parseMemoryCommand("delete my-key");
    assert.deepEqual(result, { action: "remove", key: "my-key" });
  });

  it("handles ls alias for list", () => {
    const result = parseMemoryCommand("ls");
    assert.deepEqual(result, { action: "list" });
  });

  it("handles show alias for get", () => {
    const result = parseMemoryCommand("show some-key");
    assert.deepEqual(result, { action: "get", key: "some-key" });
  });

  it("returns error when add is missing key", () => {
    const result = parseMemoryCommand("add");
    assert.equal(result.action, "error");
    assert.ok("message" in result);
    assert.ok(result.message.includes("Usage: /memory add"));
  });

  it("returns error when add is missing value", () => {
    const result = parseMemoryCommand("add only-key");
    assert.equal(result.action, "error");
    assert.ok("message" in result);
    assert.ok(result.message.includes("Usage: /memory add"));
  });

  it("returns error when remove is missing key", () => {
    const result = parseMemoryCommand("remove");
    assert.equal(result.action, "error");
    assert.ok("message" in result);
    assert.ok(result.message.includes("Usage: /memory remove"));
  });
});
