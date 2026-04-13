/**
 * Tests for OAuth callback server.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startCallbackServer } from "./callback-server";

describe("startCallbackServer", () => {
  let stopFn: (() => void) | undefined;

  afterEach(() => {
    if (stopFn) {
      stopFn();
      stopFn = undefined;
    }
  });

  it("should start on an auto-assigned port", async () => {
    const server = startCallbackServer({ port: 0, timeout: 5000 });
    stopFn = server.stop;
    const port = await server.port;
    assert.ok(port > 0, "should assign a port");
    assert.ok(port < 65536, "port should be valid");
    server.stop();
    stopFn = undefined;
  });

  it("should resolve with code on successful callback", async () => {
    const server = startCallbackServer({ port: 0, path: "/callback", timeout: 5000 });
    stopFn = server.stop;
    const port = await server.port;

    // Simulate OAuth redirect
    const res = await fetch(`http://127.0.0.1:${port}/callback?code=test_auth_code_123&state=abc`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("Authorization Successful"));

    const result = await server;
    assert.equal(result.code, "test_auth_code_123");
    assert.equal(result.params.get("state"), "abc");
    stopFn = undefined; // already closed
  });

  it("should return 404 for wrong path", async () => {
    const server = startCallbackServer({ port: 0, path: "/callback", timeout: 5000 });
    stopFn = server.stop;
    const port = await server.port;

    const res = await fetch(`http://127.0.0.1:${port}/wrong-path?code=test`);
    assert.equal(res.status, 404);
    server.stop();
    stopFn = undefined;
  });

  it("should reject on OAuth error response", async () => {
    const server = startCallbackServer({ port: 0, path: "/callback", timeout: 5000 });
    stopFn = server.stop;
    const port = await server.port;

    // Attach rejection handler BEFORE the fetch to avoid unhandled rejection
    const rejection = assert.rejects(server, (err: Error) => {
      assert.ok(err.message.includes("User denied access"));
      return true;
    });

    const res = await fetch(
      `http://127.0.0.1:${port}/callback?error=access_denied&error_description=User+denied+access`,
    );
    assert.equal(res.status, 200); // renders error page with 200

    await rejection;
    stopFn = undefined;
  });

  it("should reject on timeout", async () => {
    const server = startCallbackServer({ port: 0, timeout: 100 });
    stopFn = server.stop;

    await assert.rejects(server, (err: Error) => {
      assert.ok(err.message.includes("timeout"));
      return true;
    });
    stopFn = undefined;
  });

  it("should reject on abort signal", async () => {
    const ac = new AbortController();
    const server = startCallbackServer({ port: 0, timeout: 10000, signal: ac.signal });
    stopFn = server.stop;

    // Give server time to start
    await server.port;

    // Abort
    ac.abort();

    await assert.rejects(server, (err: Error) => {
      assert.ok(err.message.includes("cancelled"));
      return true;
    });
    stopFn = undefined;
  });

  it("should reject immediately if signal already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    const server = startCallbackServer({ port: 0, timeout: 10000, signal: ac.signal });
    stopFn = server.stop;

    await assert.rejects(server, (err: Error) => {
      assert.ok(err.message.includes("cancelled"));
      return true;
    });
    stopFn = undefined;
  });
});
