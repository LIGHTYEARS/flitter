/**
 * @flitter/llm — GoogleGenAILiveProvider tests
 *
 * Tests: connection state machine, graceful degradation, send/receive, disconnect
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LiveConnectionState } from "./live-provider";
import { GoogleGenAILiveProvider } from "./live-provider";

// ─── Mock WebSocket ──────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  readonly url: string;
  readyState = 0; // CONNECTING
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  sentMessages: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.closed = true;
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new Event("close") as CloseEvent);
    }
  }

  // Test helper: simulate open
  _simulateOpen(): void {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event("open"));
    }
  }

  // Test helper: simulate error
  _simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }

  // Test helper: simulate message
  _simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }
}

function resetMocks(): void {
  MockWebSocket.instances = [];
}

// ─── State Machine Tests ─────────────────────────────────

describe("GoogleGenAILiveProvider", () => {
  it("should start in disconnected state", () => {
    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
    });
    assert.equal(provider.state, "disconnected");
  });

  it("should transition to connecting then connected on successful connect", async () => {
    resetMocks();
    const states: LiveConnectionState[] = [];

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    provider.on("stateChange", (state: LiveConnectionState) => {
      states.push(state);
    });

    const connectPromise = provider.connect();

    // MockWebSocket was created, simulate server accepting
    const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    ws._simulateOpen();

    await connectPromise;

    assert.equal(provider.state, "connected");
    assert.deepEqual(states, ["connecting", "connected"]);
  });

  it("should transition to error on connection failure", async () => {
    resetMocks();
    const states: LiveConnectionState[] = [];

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    provider.on("stateChange", (state: LiveConnectionState) => {
      states.push(state);
    });

    const connectPromise = provider.connect();

    const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    ws._simulateError();

    await assert.rejects(connectPromise, /WebSocket connection failed/);
    assert.equal(provider.state, "error");
    assert.deepEqual(states, ["connecting", "error"]);
  });

  it("should throw when WebSocket is not available (graceful degradation)", async () => {
    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      // Explicitly null — signals "no WebSocket in this environment"
      WebSocket: null,
    });

    await assert.rejects(provider.connect(), /WebSocket is not available/);
    assert.equal(provider.state, "error");
  });

  it("should be idempotent when already connected", async () => {
    resetMocks();

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    const p1 = provider.connect();
    MockWebSocket.instances[MockWebSocket.instances.length - 1]._simulateOpen();
    await p1;

    // Second connect should be a no-op
    await provider.connect();
    assert.equal(provider.state, "connected");
    assert.equal(MockWebSocket.instances.length, 1); // Only one WS created
  });

  it("should send JSON data when connected", async () => {
    resetMocks();

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    const p = provider.connect();
    MockWebSocket.instances[MockWebSocket.instances.length - 1]._simulateOpen();
    await p;

    provider.send({ type: "test", data: "hello" });

    const ws = MockWebSocket.instances[0];
    assert.equal(ws.sentMessages.length, 1);
    assert.deepEqual(JSON.parse(ws.sentMessages[0]), { type: "test", data: "hello" });
  });

  it("should throw when sending in disconnected state", () => {
    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
    });

    assert.throws(() => provider.send({ data: "test" }), /Cannot send.*disconnected/);
  });

  it("should emit message events for incoming data", async () => {
    resetMocks();
    const received: unknown[] = [];

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    provider.on("message", (data: unknown) => {
      received.push(data);
    });

    const p = provider.connect();
    MockWebSocket.instances[MockWebSocket.instances.length - 1]._simulateOpen();
    await p;

    const ws = MockWebSocket.instances[0];
    ws._simulateMessage(JSON.stringify({ type: "response", text: "hello" }));

    assert.equal(received.length, 1);
    assert.deepEqual(received[0], { type: "response", text: "hello" });
  });

  it("should handle non-JSON messages", async () => {
    resetMocks();
    const received: unknown[] = [];

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    provider.on("message", (data: unknown) => {
      received.push(data);
    });

    const p = provider.connect();
    MockWebSocket.instances[MockWebSocket.instances.length - 1]._simulateOpen();
    await p;

    const ws = MockWebSocket.instances[0];
    ws._simulateMessage("not-json");

    assert.equal(received.length, 1);
    assert.equal(received[0], "not-json");
  });

  it("should disconnect and transition to disconnected state", async () => {
    resetMocks();

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    const p = provider.connect();
    MockWebSocket.instances[MockWebSocket.instances.length - 1]._simulateOpen();
    await p;

    provider.disconnect();

    assert.equal(provider.state, "disconnected");
    assert.equal(MockWebSocket.instances[0].closed, true);
  });

  it("should handle disconnect when already disconnected (no-op)", () => {
    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
    });

    // Should not throw
    provider.disconnect();
    assert.equal(provider.state, "disconnected");
  });

  it("should sendSetup with correct format", async () => {
    resetMocks();

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    const p = provider.connect();
    MockWebSocket.instances[MockWebSocket.instances.length - 1]._simulateOpen();
    await p;

    provider.sendSetup({
      model: "gemini-2.0-flash",
      systemInstruction: "You are helpful",
      tools: [{ function_declarations: [{ name: "test" }] }],
    });

    const ws = MockWebSocket.instances[0];
    const sent = JSON.parse(ws.sentMessages[0]);
    assert.deepEqual(sent.setup.model, "models/gemini-2.0-flash");
    assert.ok(sent.setup.systemInstruction);
    assert.ok(sent.setup.tools);
  });

  it("should construct URL with API key", async () => {
    resetMocks();

    const provider = new GoogleGenAILiveProvider({
      apiKey: "my-secret-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    const p = provider.connect();
    const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    ws._simulateOpen();
    await p;

    assert.ok(ws.url.includes("key=my-secret-key"));
  });

  it("should use custom base URL when provided", async () => {
    resetMocks();

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      baseUrl: "wss://custom-endpoint.example.com/live",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    const p = provider.connect();
    const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1];
    ws._simulateOpen();
    await p;

    assert.ok(ws.url.startsWith("wss://custom-endpoint.example.com/live"));
  });

  it("should transition to disconnected on WebSocket close after connected", async () => {
    resetMocks();
    const states: LiveConnectionState[] = [];

    const provider = new GoogleGenAILiveProvider({
      apiKey: "test-key",
      model: "gemini-2.0-flash",
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    });

    provider.on("stateChange", (state: LiveConnectionState) => {
      states.push(state);
    });

    const p = provider.connect();
    MockWebSocket.instances[MockWebSocket.instances.length - 1]._simulateOpen();
    await p;

    // Simulate server closing connection
    const ws = MockWebSocket.instances[0];
    if (ws.onclose) {
      ws.onclose(new Event("close") as CloseEvent);
    }

    assert.equal(provider.state, "disconnected");
    assert.deepEqual(states, ["connecting", "connected", "disconnected"]);
  });
});
