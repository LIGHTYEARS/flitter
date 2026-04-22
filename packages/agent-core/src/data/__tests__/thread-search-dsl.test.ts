/**
 * Tests for Thread Search DSL Parser
 *
 * 逆向: chunk-005.js:147059-147070 (amp find_thread DSL spec)
 */

import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { parseDate, parseThreadQuery } from "../thread-search-dsl";

// ─── parseDate ─────────────────────────────────────────────

describe("parseDate", () => {
  it("parses ISO date", () => {
    const d = parseDate("2024-01-15");
    assert.ok(d instanceof Date);
    assert.equal(d.toISOString().slice(0, 10), "2024-01-15");
  });

  it("parses relative days", () => {
    const before = Date.now();
    const d = parseDate("7d");
    const after = Date.now();
    assert.ok(d instanceof Date);
    // Should be 7 days ago (midnight UTC)
    const expected = new Date(before);
    expected.setDate(expected.getDate() - 7);
    expected.setHours(0, 0, 0, 0);
    // Allow up to 1 second slop for test execution time
    assert.ok(Math.abs(d.getTime() - expected.getTime()) < 1000);
    void after;
  });

  it("parses relative weeks", () => {
    const before = Date.now();
    const d = parseDate("2w");
    assert.ok(d instanceof Date);
    const expected = new Date(before);
    expected.setDate(expected.getDate() - 14);
    expected.setHours(0, 0, 0, 0);
    assert.ok(Math.abs(d.getTime() - expected.getTime()) < 1000);
  });

  it("parses 1d", () => {
    const d = parseDate("1d");
    assert.ok(d instanceof Date);
  });

  it("parses 1w", () => {
    const d = parseDate("1w");
    assert.ok(d instanceof Date);
  });

  it("returns null for invalid input", () => {
    assert.equal(parseDate("foobar"), null);
    assert.equal(parseDate(""), null);
    assert.equal(parseDate("2024-13-01"), null); // invalid month → NaN
  });
});

// ─── parseThreadQuery ──────────────────────────────────────

describe("parseThreadQuery", () => {
  it("parses bare keywords", () => {
    const q = parseThreadQuery("hello world");
    assert.deepEqual(q.keywords, ["hello", "world"]);
    assert.equal(q.file, undefined);
  });

  it("parses quoted phrases", () => {
    const q = parseThreadQuery('"hello world" foo');
    assert.deepEqual(q.keywords, ["hello world", "foo"]);
  });

  it("parses file filter", () => {
    const q = parseThreadQuery("file:src/auth.ts");
    assert.equal(q.file, "src/auth.ts");
    assert.deepEqual(q.keywords, []);
  });

  it("parses repo filter", () => {
    const q = parseThreadQuery("repo:owner/repo");
    assert.equal(q.repo, "owner/repo");
    assert.deepEqual(q.keywords, []);
  });

  it("parses author filter", () => {
    const q = parseThreadQuery("author:alice");
    assert.equal(q.author, "alice");
    assert.deepEqual(q.keywords, []);
  });

  it("parses author:me", () => {
    const q = parseThreadQuery("author:me");
    assert.equal(q.author, "me");
  });

  it("parses after: ISO date", () => {
    const q = parseThreadQuery("after:2024-01-15");
    assert.ok(q.after instanceof Date);
    assert.equal(q.after.toISOString().slice(0, 10), "2024-01-15");
  });

  it("parses before: ISO date", () => {
    const q = parseThreadQuery("before:2024-12-31");
    assert.ok(q.before instanceof Date);
    assert.equal(q.before.toISOString().slice(0, 10), "2024-12-31");
  });

  it("parses after: relative days (7d)", () => {
    const before = Date.now();
    const q = parseThreadQuery("after:7d");
    assert.ok(q.after instanceof Date);
    const expected = new Date(before);
    expected.setDate(expected.getDate() - 7);
    expected.setHours(0, 0, 0, 0);
    assert.ok(Math.abs(q.after.getTime() - expected.getTime()) < 1000);
  });

  it("parses before: relative weeks (2w)", () => {
    const before = Date.now();
    const q = parseThreadQuery("before:2w");
    assert.ok(q.before instanceof Date);
    const expected = new Date(before);
    expected.setDate(expected.getDate() - 14);
    expected.setHours(0, 0, 0, 0);
    assert.ok(Math.abs(q.before.getTime() - expected.getTime()) < 1000);
  });

  it("parses is:archived", () => {
    const q = parseThreadQuery("is:archived");
    assert.equal(q.isArchived, true);
    assert.deepEqual(q.keywords, []);
  });

  it("treats unknown is:X as keyword", () => {
    const q = parseThreadQuery("is:open");
    assert.equal(q.isArchived, undefined);
    assert.deepEqual(q.keywords, ["is:open"]);
  });

  it("parses label filter", () => {
    const q = parseThreadQuery("label:bug");
    assert.equal(q.label, "bug");
    assert.deepEqual(q.keywords, []);
  });

  it("parses combined query", () => {
    const q = parseThreadQuery("auth bug file:login.ts after:7d");
    assert.deepEqual(q.keywords, ["auth", "bug"]);
    assert.equal(q.file, "login.ts");
    assert.ok(q.after instanceof Date);
    assert.equal(q.repo, undefined);
  });

  it("treats unknown key:value as keyword", () => {
    const q = parseThreadQuery("task:142 foo");
    assert.deepEqual(q.keywords, ["task:142", "foo"]);
  });

  it("returns empty query for empty string", () => {
    const q = parseThreadQuery("");
    assert.deepEqual(q.keywords, []);
    assert.equal(q.file, undefined);
    assert.equal(q.repo, undefined);
    assert.equal(q.author, undefined);
    assert.equal(q.after, undefined);
    assert.equal(q.before, undefined);
    assert.equal(q.isArchived, undefined);
    assert.equal(q.label, undefined);
  });

  it("returns empty query for whitespace-only string", () => {
    const q = parseThreadQuery("   ");
    assert.deepEqual(q.keywords, []);
  });

  it("treats key: with empty value as keyword", () => {
    // "file:" with no value after colon
    const q = parseThreadQuery("file:");
    // value is empty string → not a valid filter → falls through as keyword
    assert.equal(q.file, undefined);
    assert.deepEqual(q.keywords, ["file:"]);
  });

  it("handles multiple filters and keywords", () => {
    const q = parseThreadQuery(
      'repo:github.com/owner/repo author:alice "race condition" is:archived',
    );
    assert.equal(q.repo, "github.com/owner/repo");
    assert.equal(q.author, "alice");
    assert.deepEqual(q.keywords, ["race condition"]);
    assert.equal(q.isArchived, true);
  });
});
