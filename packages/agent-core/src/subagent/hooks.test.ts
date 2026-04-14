/**
 * Hook 系统测试
 * 覆盖: parseHooksConfig, matchHookToTool, executePreHook, executePostHook, 超时处理
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseHooksConfig,
  matchHookToTool,
  executePreHook,
  executePostHook,
  type HookConfig,
  type PreHookContext,
  type PostHookContext,
} from "./hooks";

// ─── 辅助函数 ──────────────────────────────────────────

function createPreHookContext(
  overrides?: Partial<PreHookContext>,
): PreHookContext {
  return {
    threadId: "thread-1",
    toolUse: {
      name: "Bash",
      input: { command: "echo hello" },
    },
    ...overrides,
  };
}

function createPostHookContext(
  overrides?: Partial<PostHookContext>,
): PostHookContext {
  return {
    threadId: "thread-1",
    toolUse: {
      name: "Bash",
      input: { command: "echo hello" },
    },
    result: {
      status: "done",
      content: "hello",
    },
    ...overrides,
  };
}

// ─── parseHooksConfig ──────────────────────────────────

describe("Hook System", () => {
  describe("parseHooksConfig", () => {
    it("有效配置返回 HookConfig[]", () => {
      const hooks = {
        PreToolUse: [
          { matcher: "Bash", command: "echo pre" },
          { command: "echo all-pre" },
        ],
        PostToolUse: [{ command: "echo post" }],
        Notification: [{ command: "notify-send done", timeout: 5000 }],
      };

      const result = parseHooksConfig(hooks);

      assert.equal(result.length, 4);

      assert.equal(result[0].type, "PreToolUse");
      assert.equal(result[0].matcher, "Bash");
      assert.equal(result[0].command, "echo pre");

      assert.equal(result[1].type, "PreToolUse");
      assert.equal(result[1].matcher, undefined);
      assert.equal(result[1].command, "echo all-pre");

      assert.equal(result[2].type, "PostToolUse");
      assert.equal(result[2].command, "echo post");

      assert.equal(result[3].type, "Notification");
      assert.equal(result[3].timeout, 5000);
    });

    it("空对象返回空数组", () => {
      assert.deepEqual(parseHooksConfig({}), []);
    });

    it("null/undefined 输入返回空数组", () => {
      assert.deepEqual(parseHooksConfig(null as any), []);
      assert.deepEqual(parseHooksConfig(undefined as any), []);
    });

    it("跳过无效条目 (缺少 command)", () => {
      const hooks = {
        PreToolUse: [
          { matcher: "Bash" }, // 缺少 command
          { command: "" }, // 空 command
          { command: "   " }, // 空白 command
          { command: "echo ok" }, // 有效
        ],
      };

      const result = parseHooksConfig(hooks);
      assert.equal(result.length, 1);
      assert.equal(result[0].command, "echo ok");
    });

    it("跳过未知 hook type", () => {
      const hooks = {
        UnknownHook: [{ command: "echo bad" }],
        PreToolUse: [{ command: "echo good" }],
      };

      const result = parseHooksConfig(hooks);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, "PreToolUse");
    });

    it("跳过非数组 entries", () => {
      const hooks = {
        PreToolUse: "not-an-array",
        PostToolUse: [{ command: "echo ok" }],
      };

      const result = parseHooksConfig(hooks as any);
      assert.equal(result.length, 1);
      assert.equal(result[0].type, "PostToolUse");
    });

    it("跳过非对象 entry", () => {
      const hooks = {
        PreToolUse: [null, 42, "string", { command: "echo ok" }],
      };

      const result = parseHooksConfig(hooks as any);
      assert.equal(result.length, 1);
      assert.equal(result[0].command, "echo ok");
    });
  });

  // ─── matchHookToTool ──────────────────────────────────

  describe("matchHookToTool", () => {
    it("无 matcher 匹配所有工具", () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        command: "echo pre",
      };

      assert.equal(matchHookToTool(hook, "Bash"), true);
      assert.equal(matchHookToTool(hook, "Read"), true);
      assert.equal(matchHookToTool(hook, "mcp__server__tool"), true);
    });

    it("精确 matcher 匹配对应工具名", () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        matcher: "Bash",
        command: "echo pre",
      };

      assert.equal(matchHookToTool(hook, "Bash"), true);
      assert.equal(matchHookToTool(hook, "Read"), false);
    });

    it("glob matcher 匹配 (如 mcp__*)", () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        matcher: "mcp__*",
        command: "echo pre",
      };

      assert.equal(matchHookToTool(hook, "mcp__server__tool"), true);
      assert.equal(matchHookToTool(hook, "Bash"), false);
    });

    it("不匹配时返回 false", () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        matcher: "Write",
        command: "echo pre",
      };

      assert.equal(matchHookToTool(hook, "Bash"), false);
      assert.equal(matchHookToTool(hook, "Read"), false);
    });
  });

  // ─── executePreHook ──────────────────────────────────

  describe("executePreHook", () => {
    it("执行命令并返回 exitCode/stdout/stderr", async () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        command: 'echo "hello from hook"',
      };

      const result = await executePreHook(hook, createPreHookContext());

      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout.trim(), "hello from hook");
      assert.equal(result.stderr, "");
    });

    it("通过环境变量传递 TOOL_NAME 和 TOOL_INPUT", async () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        command: 'echo "$TOOL_NAME"',
      };

      const ctx = createPreHookContext({
        toolUse: { name: "Read", input: { path: "/tmp/test" } },
      });

      const result = await executePreHook(hook, ctx);
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout.trim(), "Read");
    });

    it("TOOL_INPUT 以 JSON 形式传递", async () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        command: 'echo "$TOOL_INPUT"',
      };

      const ctx = createPreHookContext({
        toolUse: { name: "Read", input: { path: "/tmp/test" } },
      });

      const result = await executePreHook(hook, ctx);
      assert.equal(result.exitCode, 0);
      const parsed = JSON.parse(result.stdout.trim());
      assert.deepEqual(parsed, { path: "/tmp/test" });
    });

    it("解析 stdout JSON 中的 abort 指令", async () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        command:
          'echo \'{"abort": true, "message": "Blocked by policy"}\'',
      };

      const result = await executePreHook(hook, createPreHookContext());

      assert.equal(result.exitCode, 0);
      assert.equal(result.abort, true);
      assert.equal(result.message, "Blocked by policy");
    });

    it("解析 stdout JSON 中的 modifiedArgs", async () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        command:
          'echo \'{"modifiedArgs": {"command": "echo safe"}}\'',
      };

      const result = await executePreHook(hook, createPreHookContext());

      assert.equal(result.exitCode, 0);
      assert.deepEqual(result.modifiedArgs, { command: "echo safe" });
    });

    it("非 JSON stdout 不解析指令", async () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        command: "echo 'not json'",
      };

      const result = await executePreHook(hook, createPreHookContext());

      assert.equal(result.exitCode, 0);
      assert.equal(result.abort, undefined);
      assert.equal(result.modifiedArgs, undefined);
    });

    it("非零退出码正确返回", async () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        command: "exit 42",
      };

      const result = await executePreHook(hook, createPreHookContext());
      assert.equal(result.exitCode, 42);
    });
  });

  // ─── executePostHook ──────────────────────────────────

  describe("executePostHook", () => {
    it("通过环境变量传递 TOOL_RESULT", async () => {
      const hook: HookConfig = {
        type: "PostToolUse",
        command: 'echo "$TOOL_RESULT"',
      };

      const ctx = createPostHookContext({
        result: { status: "done", content: "file contents" },
      });

      const result = await executePostHook(hook, ctx);
      assert.equal(result.exitCode, 0);
      const parsed = JSON.parse(result.stdout.trim());
      assert.equal(parsed.status, "done");
      assert.equal(parsed.content, "file contents");
    });

    it("返回 HookResult (exitCode/stdout/stderr)", async () => {
      const hook: HookConfig = {
        type: "PostToolUse",
        command: 'echo "post ok" && echo "warn" >&2',
      };

      const result = await executePostHook(hook, createPostHookContext());
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout.trim(), "post ok");
      assert.equal(result.stderr.trim(), "warn");
    });

    it("解析 post-hook stdout 中的 message", async () => {
      const hook: HookConfig = {
        type: "PostToolUse",
        command: 'echo \'{"message": "Post hook note"}\'',
      };

      const result = await executePostHook(hook, createPostHookContext());
      assert.equal(result.message, "Post hook note");
      // PostToolUse 不应该有 abort
      assert.equal(result.abort, undefined);
    });
  });

  // ─── 超时处理 ──────────────────────────────────────────

  describe("超时处理", () => {
    it("hook 超时时终止子进程并返回 exitCode 124", { timeout: 10000 }, async () => {
      const hook: HookConfig = {
        type: "PreToolUse",
        command: "while true; do :; done",
        timeout: 200, // 200ms 超时
      };

      const result = await executePreHook(hook, createPreHookContext());
      assert.equal(result.exitCode, 124);
    });
  });
});
