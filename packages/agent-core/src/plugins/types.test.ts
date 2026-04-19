/**
 * Plugin types unit tests
 *
 * Tests type-level exhaustiveness and constant correctness.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  PluginAction,
  PluginActionAllow,
  PluginActionError,
  PluginActionModify,
  PluginActionRejectAndContinue,
  PluginActionSynthesize,
  PluginStatus,
  PluginToolCallEvent,
  PluginToolResultEvent,
} from "./types";
import {
  GLOBAL_PLUGIN_DIR,
  MAX_AUTO_RESTARTS,
  PLUGIN_READY_EVENT,
  PLUGIN_READY_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  RESTART_DELAY_MS,
  SHUTDOWN_GRACE_PERIOD_MS,
  WORKSPACE_PLUGIN_DIR,
} from "./types";

describe("Plugin types", () => {
  // ─── Constants match amp values ─────────────────────────

  describe("constants", () => {
    it("PLUGIN_READY_EVENT matches amp QWR", () => {
      // 逆向: chunk-005.js:19746 QWR = "runtime.ready"
      assert.equal(PLUGIN_READY_EVENT, "runtime.ready");
    });

    it("PLUGIN_READY_TIMEOUT_MS matches amp KWR", () => {
      // 逆向: chunk-005.js:19742 KWR = 2000
      assert.equal(PLUGIN_READY_TIMEOUT_MS, 2000);
    });

    it("MAX_AUTO_RESTARTS matches amp VWR", () => {
      // 逆向: chunk-005.js:19743 VWR = 3
      assert.equal(MAX_AUTO_RESTARTS, 3);
    });

    it("RESTART_DELAY_MS matches amp XWR", () => {
      // 逆向: chunk-005.js:19744 XWR = 200
      assert.equal(RESTART_DELAY_MS, 200);
    });

    it("SHUTDOWN_GRACE_PERIOD_MS matches amp YWR", () => {
      // 逆向: chunk-005.js:19745 YWR = 3000
      assert.equal(SHUTDOWN_GRACE_PERIOD_MS, 3000);
    });

    it("REQUEST_TIMEOUT_MS is 5 seconds", () => {
      assert.equal(REQUEST_TIMEOUT_MS, 5000);
    });

    it("WORKSPACE_PLUGIN_DIR is .flitter/plugins", () => {
      assert.equal(WORKSPACE_PLUGIN_DIR, ".flitter/plugins");
    });

    it("GLOBAL_PLUGIN_DIR is plugins", () => {
      assert.equal(GLOBAL_PLUGIN_DIR, "plugins");
    });
  });

  // ─── Action union exhaustiveness ────────────────────────

  describe("PluginAction union", () => {
    it("allow action has correct shape", () => {
      const action: PluginActionAllow = { action: "allow" };
      assert.equal(action.action, "allow");
    });

    it("error action includes message", () => {
      const action: PluginActionError = {
        action: "error",
        message: "blocked",
      };
      assert.equal(action.action, "error");
      assert.equal(action.message, "blocked");
    });

    it("reject-and-continue action includes message", () => {
      const action: PluginActionRejectAndContinue = {
        action: "reject-and-continue",
        message: "not allowed",
      };
      assert.equal(action.action, "reject-and-continue");
      assert.equal(action.message, "not allowed");
    });

    it("synthesize action includes result", () => {
      const action: PluginActionSynthesize = {
        action: "synthesize",
        result: { output: "synthesized output" },
      };
      assert.equal(action.action, "synthesize");
      assert.equal(action.result.output, "synthesized output");
    });

    it("modify action includes new input", () => {
      const action: PluginActionModify = {
        action: "modify",
        input: { cmd: "echo safe" },
      };
      assert.equal(action.action, "modify");
      assert.deepEqual(action.input, { cmd: "echo safe" });
    });

    it("exhaustive switch covers all action types", () => {
      // 逆向: chunk-002.js:27600-27608 (action priority)
      const actions: PluginAction[] = [
        { action: "allow" },
        { action: "error", message: "err" },
        { action: "reject-and-continue", message: "rej" },
        { action: "synthesize", result: { output: "out" } },
        { action: "modify", input: {} },
      ];

      for (const action of actions) {
        switch (action.action) {
          case "allow":
          case "error":
          case "reject-and-continue":
          case "synthesize":
          case "modify":
            break;
          default: {
            // TypeScript exhaustiveness check — this should never be reached
            const _exhaustive: never = action;
            assert.fail(`Unhandled action: ${JSON.stringify(_exhaustive)}`);
          }
        }
      }

      assert.equal(actions.length, 5);
    });
  });

  // ─── Event types ────────────────────────────────────────

  describe("PluginToolCallEvent", () => {
    it("has required fields", () => {
      const event: PluginToolCallEvent = {
        tool: "bash",
        input: { command: "ls" },
      };
      assert.equal(event.tool, "bash");
      assert.deepEqual(event.input, { command: "ls" });
      assert.equal(event.thread, undefined);
    });

    it("supports optional thread context", () => {
      const event: PluginToolCallEvent = {
        tool: "write",
        input: { path: "/tmp/test" },
        thread: { id: "thread-123" },
      };
      assert.equal(event.thread?.id, "thread-123");
    });
  });

  describe("PluginToolResultEvent", () => {
    it("has required fields", () => {
      const event: PluginToolResultEvent = {
        tool: "bash",
        input: { command: "ls" },
        output: "file1.txt\nfile2.txt",
        status: "done",
      };
      assert.equal(event.tool, "bash");
      assert.equal(event.status, "done");
      assert.ok(event.output.includes("file1.txt"));
    });

    it("supports error status", () => {
      const event: PluginToolResultEvent = {
        tool: "bash",
        input: { command: "bad-cmd" },
        output: "",
        status: "error",
      };
      assert.equal(event.status, "error");
    });
  });

  // ─── PluginStatus ───────────────────────────────────────

  describe("PluginStatus", () => {
    it("covers all states from amp lifecycle", () => {
      // 逆向: chunk-002.js:27239-27255 (status transitions)
      const statuses: PluginStatus[] = ["loading", "active", "error"];
      assert.equal(statuses.length, 3);
    });
  });
});
