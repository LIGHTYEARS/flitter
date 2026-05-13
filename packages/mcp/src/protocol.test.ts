/**
 * Tests for MCP JSON-RPC 2.0 protocol.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  _resetIdCounter,
  createErrorResponse,
  createNotification,
  createRequest,
  createSuccessResponse,
  McpError,
  parseMessage,
  RequestManager,
  serializeMessage,
} from "./protocol";
import type {
  JSONRPCErrorResponse,
  JSONRPCNotification,
  JSONRPCRequest,
  JSONRPCSuccessResponse,
} from "./types";
import { ErrorCode } from "./types";

describe("createRequest", () => {
  beforeEach(() => _resetIdCounter());

  it("should create request with auto-increment id", () => {
    const r1 = createRequest("ping");
    const r2 = createRequest("ping");
    assert.equal(r1.jsonrpc, "2.0");
    assert.equal(r1.id, 1);
    assert.equal(r2.id, 2);
    assert.equal(r1.method, "ping");
  });

  it("should include params when provided", () => {
    const r = createRequest("tools/call", { name: "test" });
    assert.deepEqual(r.params, { name: "test" });
  });

  it("should omit params when undefined", () => {
    const r = createRequest("ping");
    assert.equal("params" in r, false);
  });
});

describe("createNotification", () => {
  it("should create notification without id", () => {
    const n = createNotification("notifications/initialized");
    assert.equal(n.jsonrpc, "2.0");
    assert.equal("id" in n, false);
    assert.equal(n.method, "notifications/initialized");
  });

  it("should include params when provided", () => {
    const n = createNotification("notifications/cancelled", { requestId: 1, reason: "timeout" });
    assert.deepEqual(n.params, { requestId: 1, reason: "timeout" });
  });

  it("should omit params when undefined", () => {
    const n = createNotification("notifications/initialized");
    assert.equal("params" in n, false);
  });
});

describe("createSuccessResponse", () => {
  it("should create success response with result", () => {
    const r = createSuccessResponse(1, { tools: [] });
    assert.equal(r.jsonrpc, "2.0");
    assert.equal(r.id, 1);
    assert.deepEqual(r.result, { tools: [] });
  });

  it("should handle string id", () => {
    const r = createSuccessResponse("abc", null);
    assert.equal(r.id, "abc");
    assert.equal(r.result, null);
  });
});

describe("createErrorResponse", () => {
  it("should create error response", () => {
    const r = createErrorResponse(1, ErrorCode.MethodNotFound, "Method not found");
    assert.equal(r.jsonrpc, "2.0");
    assert.equal(r.id, 1);
    assert.equal(r.error.code, -32601);
    assert.equal(r.error.message, "Method not found");
  });

  it("should include data when provided", () => {
    const r = createErrorResponse(1, ErrorCode.InternalError, "fail", { detail: "x" });
    assert.deepEqual(r.error.data, { detail: "x" });
  });

  it("should omit data when undefined", () => {
    const r = createErrorResponse(1, ErrorCode.ParseError, "bad json");
    assert.equal("data" in r.error, false);
  });
});

describe("parseMessage", () => {
  it("should parse a valid request", () => {
    const msg = parseMessage('{"jsonrpc":"2.0","id":1,"method":"ping"}') as JSONRPCRequest;
    assert.equal(msg.method, "ping");
    assert.equal(msg.id, 1);
  });

  it("should parse a valid notification", () => {
    const msg = parseMessage(
      '{"jsonrpc":"2.0","method":"notifications/initialized"}',
    ) as JSONRPCNotification;
    assert.equal(msg.method, "notifications/initialized");
    assert.equal("id" in msg, false);
  });

  it("should parse a success response", () => {
    const msg = parseMessage(
      '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',
    ) as JSONRPCSuccessResponse;
    assert.deepEqual(msg.result, { tools: [] });
  });

  it("should parse an error response", () => {
    const msg = parseMessage(
      '{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"not found"}}',
    ) as JSONRPCErrorResponse;
    assert.equal(msg.error.code, -32601);
  });

  it("should throw McpError on invalid JSON", () => {
    assert.throws(
      () => parseMessage("not json"),
      (err: unknown) => {
        assert.ok(err instanceof McpError);
        assert.equal(err.code, ErrorCode.ParseError);
        return true;
      },
    );
  });

  it("should throw McpError on non-JSONRPC message", () => {
    assert.throws(
      () => parseMessage('{"hello":"world"}'),
      (err: unknown) => {
        assert.ok(err instanceof McpError);
        assert.equal(err.code, ErrorCode.InvalidRequest);
        return true;
      },
    );
  });

  it("should throw on missing jsonrpc field", () => {
    assert.throws(() => parseMessage('{"id":1,"method":"ping"}'));
  });

  it("should throw on wrong jsonrpc version", () => {
    assert.throws(() => parseMessage('{"jsonrpc":"1.0","id":1,"method":"ping"}'));
  });

  it("should parse request with params", () => {
    const msg = parseMessage(
      '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test"}}',
    ) as JSONRPCRequest;
    assert.deepEqual(msg.params, { name: "test" });
  });
});

describe("serializeMessage", () => {
  it("should serialize to JSON with trailing newline", () => {
    const msg = createNotification("ping");
    const out = serializeMessage(msg);
    assert.ok(out.endsWith("\n"));
    assert.deepEqual(JSON.parse(out), msg);
  });

  it("should produce parseable output", () => {
    _resetIdCounter();
    const original = createRequest("tools/list", { cursor: "abc" });
    const serialized = serializeMessage(original);
    const parsed = parseMessage(serialized.trimEnd());
    assert.deepEqual(parsed, original);
  });
});

describe("McpError", () => {
  it("should have correct name and code", () => {
    const err = new McpError(ErrorCode.ConnectionClosed, "closed");
    assert.equal(err.name, "McpError");
    assert.equal(err.code, ErrorCode.ConnectionClosed);
    assert.ok(err.message.includes("-32000"));
    assert.ok(err.message.includes("closed"));
  });

  it("should store data", () => {
    const err = new McpError(ErrorCode.InternalError, "fail", { x: 1 });
    assert.deepEqual(err.data, { x: 1 });
  });

  it("should be instanceof Error", () => {
    assert.ok(new McpError(0, "test") instanceof Error);
  });

  it("fromError should wrap non-McpError", () => {
    const err = McpError.fromError(new TypeError("bad type"));
    assert.equal(err.code, ErrorCode.InternalError);
    assert.ok(err.message.includes("bad type"));
  });

  it("fromError should return existing McpError unchanged", () => {
    const original = new McpError(ErrorCode.ParseError, "parse fail");
    assert.equal(McpError.fromError(original), original);
  });

  it("fromError should handle string errors", () => {
    const err = McpError.fromError("string error");
    assert.ok(err.message.includes("string error"));
  });

  it("toJSON should return code and message", () => {
    const err = new McpError(ErrorCode.InvalidParams, "bad params", { field: "x" });
    const json = err.toJSON();
    assert.equal(json.code, ErrorCode.InvalidParams);
    assert.ok(json.message.includes("bad params"));
    assert.deepEqual(json.data, { field: "x" });
  });

  it("toJSON should omit data when undefined", () => {
    const json = new McpError(0, "test").toJSON();
    assert.equal("data" in json, false);
  });
});

describe("RequestManager", () => {
  let manager: RequestManager;

  beforeEach(() => {
    manager = new RequestManager();
  });

  it("should create requests with auto-increment ids", () => {
    const r1 = manager.createRequest("ping");
    const r2 = manager.createRequest("tools/list");
    assert.equal(r1.id, 1);
    assert.equal(r2.id, 2);
    assert.equal(manager.nextId, 3);
  });

  it("should resolve on success response", async () => {
    const { message, response } = manager.request("ping");
    manager.handleResponse({ jsonrpc: "2.0", id: message.id, result: "pong" });
    const result = await response;
    assert.equal(result, "pong");
    assert.equal(manager.pendingCount, 0);
  });

  it("should reject on error response", async () => {
    const { message, response } = manager.request("bad");
    manager.handleResponse({
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32601, message: "not found" },
    });
    await assert.rejects(response, (err: unknown) => {
      assert.ok(err instanceof McpError);
      assert.equal(err.code, -32601);
      return true;
    });
  });

  it("should return false for unknown response id", () => {
    const handled = manager.handleResponse({ jsonrpc: "2.0", id: 999, result: null });
    assert.equal(handled, false);
  });

  it("should timeout pending requests", async () => {
    const { response } = manager.request("slow", undefined, { timeout: 50 });
    await assert.rejects(response, (err: unknown) => {
      assert.ok(err instanceof McpError);
      assert.equal(err.code, ErrorCode.RequestTimeout);
      return true;
    });
    assert.equal(manager.pendingCount, 0);
  });

  it("should cancel via abort signal", async () => {
    const ac = new AbortController();
    const { response } = manager.request("cancel-me", undefined, { signal: ac.signal });
    ac.abort();
    await assert.rejects(response, (err: unknown) => {
      assert.ok(err instanceof McpError);
      assert.equal(err.code, ErrorCode.RequestTimeout);
      return true;
    });
  });

  it("should cancel all pending requests", async () => {
    const { response: r1 } = manager.request("a");
    const { response: r2 } = manager.request("b");
    assert.equal(manager.pendingCount, 2);
    manager.cancelAll("shutting down");
    await assert.rejects(r1, (err: unknown) => err instanceof McpError);
    await assert.rejects(r2, (err: unknown) => err instanceof McpError);
    assert.equal(manager.pendingCount, 0);
  });

  it("should track pending count", () => {
    manager.request("a");
    manager.request("b");
    assert.equal(manager.pendingCount, 2);
  });
});
