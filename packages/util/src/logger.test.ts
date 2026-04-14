import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLogger } from "./logger.ts";

function createCaptureLogger(name: string) {
  const lines: string[] = [];
  const output = (line: string) => {
    lines.push(line);
  };
  const logger = createLogger(name, output);
  return { logger, lines };
}

function parseLastLine(lines: string[]): Record<string, unknown> {
  assert.ok(lines.length > 0, "Expected at least one log line");
  return JSON.parse(lines[lines.length - 1]);
}

describe("createLogger", () => {
  it("returns a Logger with correct name", () => {
    const { logger, lines } = createCaptureLogger("test-module");
    logger.info("hello");
    const entry = parseLastLine(lines);
    assert.equal(entry.name, "test-module");
  });
});

describe("Logger level methods", () => {
  it("info() outputs JSON with timestamp, level=info, name, and message", () => {
    const { logger, lines } = createCaptureLogger("app");
    logger.info("server started");
    const entry = parseLastLine(lines);
    assert.equal(entry.level, "info");
    assert.equal(entry.name, "app");
    assert.equal(entry.message, "server started");
    assert.ok(typeof entry.timestamp === "string");
  });

  it("debug() sets level to debug", () => {
    const { logger, lines } = createCaptureLogger("app");
    logger.debug("debug msg");
    const entry = parseLastLine(lines);
    assert.equal(entry.level, "debug");
    assert.equal(entry.message, "debug msg");
  });

  it("warn() sets level to warn", () => {
    const { logger, lines } = createCaptureLogger("app");
    logger.warn("warning msg");
    const entry = parseLastLine(lines);
    assert.equal(entry.level, "warn");
    assert.equal(entry.message, "warning msg");
  });

  it("error() sets level to error", () => {
    const { logger, lines } = createCaptureLogger("app");
    logger.error("error msg");
    const entry = parseLastLine(lines);
    assert.equal(entry.level, "error");
    assert.equal(entry.message, "error msg");
  });

  it("extra args appear in output", () => {
    const { logger, lines } = createCaptureLogger("app");
    logger.info("test", { port: 3000 }, "extra");
    const entry = parseLastLine(lines);
    assert.ok(Array.isArray(entry.args));
    const args = entry.args as unknown[];
    assert.equal(args.length, 2);
    assert.deepEqual(args[0], { port: 3000 });
    assert.equal(args[1], "extra");
  });

  it("no args field when no extra args passed", () => {
    const { logger, lines } = createCaptureLogger("app");
    logger.info("simple");
    const entry = parseLastLine(lines);
    assert.equal(entry.args, undefined);
  });
});

describe("child logger", () => {
  it("creates logger with merged context", () => {
    const { logger, lines } = createCaptureLogger("app");
    const child = logger.child({ requestId: "abc" });
    child.info("handling");
    const entry = parseLastLine(lines);
    assert.equal(entry.requestId, "abc");
    assert.equal(entry.name, "app");
    assert.equal(entry.message, "handling");
  });

  it("child context overrides parent on conflict", () => {
    const { logger, lines } = createCaptureLogger("app");
    const child1 = logger.child({ env: "prod" });
    const child2 = child1.child({ env: "staging" });
    child2.info("test");
    const entry = parseLastLine(lines);
    assert.equal(entry.env, "staging");
  });

  it("nested child().child() accumulates context", () => {
    const { logger, lines } = createCaptureLogger("app");
    const child = logger.child({ a: 1 }).child({ b: 2 });
    child.info("test");
    const entry = parseLastLine(lines);
    assert.equal(entry.a, 1);
    assert.equal(entry.b, 2);
  });
});

describe("wsMessage", () => {
  it("logs direction, clientId, and data at debug level", () => {
    const { logger, lines } = createCaptureLogger("ws");
    logger.wsMessage("SEND", "client-1", { type: "ping" });
    const entry = parseLastLine(lines);
    assert.equal(entry.level, "debug");
    assert.equal(entry.direction, "SEND");
    assert.equal(entry.clientId, "client-1");
    assert.deepEqual(entry.data, { type: "ping" });
    assert.equal(entry.message, "WebSocket message");
  });
});

describe("timestamp", () => {
  it("is valid ISO 8601", () => {
    const { logger, lines } = createCaptureLogger("app");
    logger.info("test");
    const entry = parseLastLine(lines);
    const ts = entry.timestamp as string;
    const parsed = new Date(ts);
    assert.ok(!Number.isNaN(parsed.getTime()), `Invalid timestamp: ${ts}`);
    // ISO 8601 format check
    assert.match(ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
