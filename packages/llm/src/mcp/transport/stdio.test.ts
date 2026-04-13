/**
 * Tests for MCP Stdio Transport.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { StdioTransport } from "./stdio";
import { ReadBuffer } from "./read-buffer";
import type { JSONRPCMessage } from "../types";

// ─── ReadBuffer Tests ──────────────────────────────────

describe("ReadBuffer", () => {
  let buf: ReadBuffer;
  beforeEach(() => { buf = new ReadBuffer(); });

  it("should return null when empty", () => {
    assert.equal(buf.readMessage(), null);
  });

  it("should return null for incomplete message (no newline)", () => {
    buf.append(Buffer.from('{"jsonrpc":"2.0","id":1,"method":"ping"}'));
    assert.equal(buf.readMessage(), null);
  });

  it("should parse complete message with newline", () => {
    buf.append(Buffer.from('{"jsonrpc":"2.0","id":1,"method":"ping"}\n'));
    const msg = buf.readMessage();
    assert.ok(msg);
    assert.equal((msg as any).method, "ping");
  });

  it("should handle multiple messages in one chunk", () => {
    buf.append(Buffer.from(
      '{"jsonrpc":"2.0","id":1,"method":"a"}\n{"jsonrpc":"2.0","id":2,"method":"b"}\n'
    ));
    const m1 = buf.readMessage();
    const m2 = buf.readMessage();
    const m3 = buf.readMessage();
    assert.equal((m1 as any).method, "a");
    assert.equal((m2 as any).method, "b");
    assert.equal(m3, null);
  });

  it("should handle messages split across chunks", () => {
    buf.append(Buffer.from('{"jsonrpc":"2.0","id":1,'));
    assert.equal(buf.readMessage(), null);
    buf.append(Buffer.from('"method":"ping"}\n'));
    const msg = buf.readMessage();
    assert.ok(msg);
    assert.equal((msg as any).method, "ping");
  });

  it("should strip \\r before \\n", () => {
    buf.append(Buffer.from('{"jsonrpc":"2.0","id":1,"method":"ping"}\r\n'));
    const msg = buf.readMessage();
    assert.ok(msg);
    assert.equal((msg as any).method, "ping");
  });

  it("should clear buffer", () => {
    buf.append(Buffer.from('{"jsonrpc":"2.0","id":1,"method":"ping"}\n'));
    buf.clear();
    assert.equal(buf.readMessage(), null);
  });

  it("should handle Uint8Array input", () => {
    const data = new TextEncoder().encode('{"jsonrpc":"2.0","id":1,"method":"ping"}\n');
    buf.append(data);
    const msg = buf.readMessage();
    assert.ok(msg);
  });
});

// ─── StdioTransport Tests ──────────────────────────────

describe("StdioTransport", () => {
  let transport: StdioTransport;

  afterEach(async () => {
    if (transport) {
      try { await transport.close(); } catch {}
    }
  });

  it("should start and connect to echo server", async () => {
    // Node script that echoes JSON-RPC ping response
    transport = new StdioTransport({
      command: "node",
      args: ["-e", `
        process.stdin.setEncoding('utf8');
        let buf = '';
        process.stdin.on('data', (d) => {
          buf += d;
          let idx;
          while ((idx = buf.indexOf('\\n')) !== -1) {
            const line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            const msg = JSON.parse(line);
            if (msg.method === 'ping') {
              process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,result:{}}) + '\\n');
            }
          }
        });
      `],
    });

    await transport.start();
    assert.ok(transport.pid);
  });

  it("should throw if started twice", async () => {
    transport = new StdioTransport({ command: "node", args: ["-e", "setTimeout(()=>{},60000)"] });
    await transport.start();
    await assert.rejects(() => transport.start(), /already started/i);
  });

  it("should send and receive messages", async () => {
    transport = new StdioTransport({
      command: "node",
      args: ["-e", `
        process.stdin.setEncoding('utf8');
        let buf = '';
        process.stdin.on('data', (d) => {
          buf += d;
          let idx;
          while ((idx = buf.indexOf('\\n')) !== -1) {
            const line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            const msg = JSON.parse(line);
            process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,result:{echo:msg.method}}) + '\\n');
          }
        });
      `],
    });

    await transport.start();

    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    await transport.send({ jsonrpc: "2.0", id: 1, method: "test", params: {} });

    // Wait for response
    await new Promise<void>((resolve) => {
      const check = () => {
        if (received.length > 0) resolve();
        else setTimeout(check, 10);
      };
      check();
    });

    assert.equal(received.length, 1);
    assert.deepEqual((received[0] as any).result, { echo: "test" });
  });

  it("should call onclose when process exits", async () => {
    transport = new StdioTransport({
      command: "node",
      args: ["-e", "process.exit(0)"],
    });

    let closed = false;
    transport.onclose = () => { closed = true; };

    await transport.start();

    // Wait for close
    await new Promise<void>((resolve) => {
      const check = () => {
        if (closed) resolve();
        else setTimeout(check, 10);
      };
      check();
    });

    assert.ok(closed);
  });

  it("should call onerror on invalid command", async () => {
    transport = new StdioTransport({
      command: "nonexistent_command_xyz_123",
    });

    await assert.rejects(() => transport.start());
  });

  it("should handle backpressure on send", async () => {
    transport = new StdioTransport({
      command: "node",
      args: ["-e", `
        process.stdin.setEncoding('utf8');
        let buf = '';
        process.stdin.on('data', (d) => {
          buf += d;
          let idx;
          while ((idx = buf.indexOf('\\n')) !== -1) {
            const line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            const msg = JSON.parse(line);
            process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,result:'ok'}) + '\\n');
          }
        });
      `],
    });

    await transport.start();

    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    // Send multiple messages
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(transport.send({ jsonrpc: "2.0", id: i, method: "test" }));
    }
    await Promise.all(promises);

    // Wait for all responses
    await new Promise<void>((resolve) => {
      const check = () => {
        if (received.length >= 5) resolve();
        else setTimeout(check, 10);
      };
      check();
    });

    assert.equal(received.length, 5);
  });

  it("should close gracefully with stdin.end()", async () => {
    transport = new StdioTransport({
      command: "node",
      args: ["-e", `
        process.stdin.on('end', () => process.exit(0));
        setTimeout(() => {}, 60000);
      `],
    });

    await transport.start();
    const pid = transport.pid;
    assert.ok(pid);

    await transport.close();
    assert.equal(transport.pid, null);
  });

  it("should pass environment variables", async () => {
    transport = new StdioTransport({
      command: "node",
      args: ["-e", `
        const val = process.env.TEST_VAR;
        process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:1,result:val}) + '\\n');
        process.stdin.resume();
      `],
      env: { TEST_VAR: "hello_mcp" },
    });

    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    await transport.start();

    await new Promise<void>((resolve) => {
      const check = () => {
        if (received.length > 0) resolve();
        else setTimeout(check, 10);
      };
      check();
    });

    assert.equal((received[0] as any).result, "hello_mcp");
  });

  it("should return null pid when not started", () => {
    transport = new StdioTransport({ command: "node", args: ["-e", ""] });
    assert.equal(transport.pid, null);
  });

  it("should handle stderr output", async () => {
    transport = new StdioTransport({
      command: "node",
      args: ["-e", `
        process.stderr.write('error output\\n');
        setTimeout(() => process.exit(0), 100);
      `],
    });

    await transport.start();
    assert.ok(transport.stderr);

    // Wait for close
    await new Promise<void>((resolve) => {
      transport.onclose = () => resolve();
    });
  });

  it("should send throws when not connected", async () => {
    transport = new StdioTransport({ command: "node", args: ["-e", ""] });
    await assert.rejects(
      () => transport.send({ jsonrpc: "2.0", id: 1, method: "test" }),
      /Not connected/
    );
  });
});
