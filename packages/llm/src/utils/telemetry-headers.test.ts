/**
 * @flitter/llm — Telemetry Headers 单元测试
 *
 * Tests for buildTelemetryHeaders() helper function.
 *
 * 逆向: amp-cli-reversed/chunk-001.js:7088-7091 — header constant definitions
 * 逆向: amp-cli-reversed/chunk-001.js:5955-5960 (Vs) — thread meta → header assembly
 * 逆向: amp-cli-reversed/chunk-002.js:1902 — [yc]: "amp.chat" default feature
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTelemetryHeaders,
  DEFAULT_FEATURE,
  HEADER_X_AMP_FEATURE,
  HEADER_X_AMP_MODE,
  HEADER_X_AMP_THREAD_ID,
} from "./telemetry-headers";

describe("buildTelemetryHeaders", () => {
  it("always includes x-amp-feature with default value when no input given", () => {
    const headers = buildTelemetryHeaders({});
    assert.equal(headers[HEADER_X_AMP_FEATURE], DEFAULT_FEATURE);
    assert.equal(headers[HEADER_X_AMP_FEATURE], "amp.chat");
  });

  it("uses custom feature when provided", () => {
    const headers = buildTelemetryHeaders({ feature: "amp.image-generation" });
    assert.equal(headers[HEADER_X_AMP_FEATURE], "amp.image-generation");
  });

  it("does not include x-amp-thread-id when threadId is absent", () => {
    const headers = buildTelemetryHeaders({});
    assert.equal(Object.hasOwn(headers, HEADER_X_AMP_THREAD_ID), false);
  });

  it("includes x-amp-thread-id when threadId is provided", () => {
    const headers = buildTelemetryHeaders({ threadId: "thread-abc-123" });
    assert.equal(headers[HEADER_X_AMP_THREAD_ID], "thread-abc-123");
  });

  it("does not include x-amp-mode when agentMode is absent", () => {
    const headers = buildTelemetryHeaders({});
    assert.equal(Object.hasOwn(headers, HEADER_X_AMP_MODE), false);
  });

  it("includes x-amp-mode when agentMode is provided", () => {
    const headers = buildTelemetryHeaders({ agentMode: "agent" });
    assert.equal(headers[HEADER_X_AMP_MODE], "agent");
  });

  it("includes x-amp-mode as empty string when agentMode is empty string", () => {
    // 逆向: amp Vs(T) returns { [FlR]: T.agentMode ?? "" } — empty string is valid
    const headers = buildTelemetryHeaders({ agentMode: "" });
    assert.equal(Object.hasOwn(headers, HEADER_X_AMP_MODE), true);
    assert.equal(headers[HEADER_X_AMP_MODE], "");
  });

  it("builds all three headers when all fields provided", () => {
    const headers = buildTelemetryHeaders({
      feature: "amp.chat",
      threadId: "t-999",
      agentMode: "deep",
    });
    assert.equal(headers[HEADER_X_AMP_FEATURE], "amp.chat");
    assert.equal(headers[HEADER_X_AMP_THREAD_ID], "t-999");
    assert.equal(headers[HEADER_X_AMP_MODE], "deep");
    // No extra keys beyond the three
    assert.equal(Object.keys(headers).length, 3);
  });

  it("returns exactly one key when only feature is set", () => {
    const headers = buildTelemetryHeaders({ feature: "amp.chat" });
    assert.equal(Object.keys(headers).length, 1);
    assert.equal(headers[HEADER_X_AMP_FEATURE], "amp.chat");
  });

  it("default feature is 'amp.chat'", () => {
    // Verify the exported constant matches amp source
    // 逆向: chunk-002.js:1902 — [yc]: "amp.chat"
    assert.equal(DEFAULT_FEATURE, "amp.chat");
  });

  it("header name constants match amp source exactly", () => {
    // 逆向: amp-cli-reversed/chunk-001.js:7088-7091
    //   yc  = "x-amp-feature"
    //   VET = "x-amp-thread-id"
    //   FlR = "x-amp-mode"
    assert.equal(HEADER_X_AMP_FEATURE, "x-amp-feature");
    assert.equal(HEADER_X_AMP_THREAD_ID, "x-amp-thread-id");
    assert.equal(HEADER_X_AMP_MODE, "x-amp-mode");
  });
});
