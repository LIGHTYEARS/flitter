/**
 * Permission Engine + Guarded Files 单元测试
 *
 * 覆盖 getToolFilePaths, checkGuardedFile, PermissionEngine (四级决策),
 * context 过滤, requestApproval, DEFAULT_PERMISSION_RULES
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  Config,
  Settings,
  PermissionEntry,
  ToolApprovalRequest,
  PermissionContext,
} from "@flitter/schemas";
import { PermissionEngine, DEFAULT_PERMISSION_RULES } from "./engine";
import { getToolFilePaths, checkGuardedFile } from "./guarded-files";

// ─── 测试辅助函数 ──────────────────────────────────────

function createMockSettings(overrides?: Partial<Settings>): Settings {
  return { ...overrides } as Settings;
}

function createMockConfig(settings?: Partial<Settings>): Config {
  return {
    settings: createMockSettings(settings),
    secrets: {
      getToken: async () => undefined,
      isSet: () => false,
    },
  };
}

interface MockSubject<T> {
  lastValue: T | undefined;
  next(value: T): void;
}

function createMockSubject<T>(): MockSubject<T> {
  return {
    lastValue: undefined as T | undefined,
    next(value: T) {
      this.lastValue = value;
    },
  };
}

function createEngine(opts?: {
  settings?: Partial<Settings>;
  workspaceRoot?: string;
}): { engine: PermissionEngine; approvals$: MockSubject<ToolApprovalRequest[]> } {
  const approvals$ = createMockSubject<ToolApprovalRequest[]>();
  const config = createMockConfig(opts?.settings);
  const engine = new PermissionEngine({
    getConfig: () => config,
    pendingApprovals$: approvals$ as unknown as import("@flitter/util").Subject<ToolApprovalRequest[]>,
    workspaceRoot: opts?.workspaceRoot ?? "/workspace",
  });
  return { engine, approvals$ };
}

// ─── getToolFilePaths ──────────────────────────────────

describe("getToolFilePaths", () => {
  it("Read: 提取 file_path", () => {
    const paths = getToolFilePaths("Read", { file_path: "/home/user/file.ts" });
    assert.deepEqual(paths, ["/home/user/file.ts"]);
  });

  it("Write: 提取 file_path", () => {
    const paths = getToolFilePaths("Write", { file_path: "/home/user/file.ts" });
    assert.deepEqual(paths, ["/home/user/file.ts"]);
  });

  it("Edit: 提取 file_path", () => {
    const paths = getToolFilePaths("Edit", { file_path: "/home/user/file.ts" });
    assert.deepEqual(paths, ["/home/user/file.ts"]);
  });

  it("Bash: 从 command 提取绝对路径", () => {
    const paths = getToolFilePaths("Bash", { command: "cat /etc/passwd /home/user/file.ts" });
    assert.deepEqual(paths, ["/etc/passwd", "/home/user/file.ts"]);
  });

  it("Bash: command 无路径返回空数组", () => {
    const paths = getToolFilePaths("Bash", { command: "echo hello" });
    assert.deepEqual(paths, []);
  });

  it("Grep: 提取 path 参数", () => {
    const paths = getToolFilePaths("Grep", { path: "/workspace/src" });
    assert.deepEqual(paths, ["/workspace/src"]);
  });

  it("未知工具: 返回空数组", () => {
    const paths = getToolFilePaths("CustomTool", { file_path: "/foo/bar" });
    assert.deepEqual(paths, []);
  });

  it("相对路径被忽略", () => {
    const paths = getToolFilePaths("Read", { file_path: "relative/path.ts" });
    assert.deepEqual(paths, []);
  });
});

// ─── checkGuardedFile ──────────────────────────────────

describe("checkGuardedFile", () => {
  it("文件不在 allowlist 中 → 受保护 (true)", () => {
    assert.equal(checkGuardedFile("/etc/passwd", ["/workspace/**"]), true);
  });

  it("文件匹配 allowlist glob → 不受保护 (false)", () => {
    assert.equal(checkGuardedFile("/workspace/src/index.ts", ["/workspace/**"]), false);
  });

  it("空 allowlist → 受保护 (true)", () => {
    assert.equal(checkGuardedFile("/workspace/file.ts", []), true);
  });

  it("多个 allowlist 模式: 匹配任一即不受保护", () => {
    assert.equal(
      checkGuardedFile("/tmp/test.ts", ["/workspace/**", "/tmp/**"]),
      false,
    );
  });
});

// ─── PermissionEngine: Level 1 — Guarded Files ────────

describe("PermissionEngine — Level 1: Guarded Files", () => {
  it("受保护文件触发 ask + 'Guarded file' reason", () => {
    const { engine } = createEngine({
      settings: { "guardedFiles.allowlist": ["/workspace/**"] },
    });
    const result = engine.checkPermission("Write", { file_path: "/etc/passwd" });
    assert.equal(result.permitted, false);
    assert.equal(result.action, "ask");
    assert.ok(result.reason.includes("Guarded file"));
  });

  it("allowlist 中的文件绕过检查", () => {
    const { engine } = createEngine({
      settings: { "guardedFiles.allowlist": ["/workspace/**"] },
      workspaceRoot: "/workspace",
    });
    const result = engine.checkPermission("Write", { file_path: "/workspace/src/index.ts" });
    // Not guarded, falls through to default rules
    assert.equal(result.permitted, true);
  });

  it("guardedFiles 未配置 → 跳过检查", () => {
    const { engine } = createEngine({ settings: {} });
    const result = engine.checkPermission("Read", { file_path: "/etc/passwd" });
    // Falls through to default rules: Read is allowed
    assert.equal(result.permitted, true);
  });
});

// ─── PermissionEngine: Level 2 — User Rules ───────────

describe("PermissionEngine — Level 2: User Rules", () => {
  it("用户 allow 规则: 匹配时 permitted=true", () => {
    const { engine } = createEngine({
      settings: {
        permissions: [{ tool: "Bash", action: "allow" }],
      },
    });
    const result = engine.checkPermission("Bash", { command: "echo hi" });
    assert.equal(result.permitted, true);
    assert.equal(result.source, "user-settings");
  });

  it("用户 reject 规则: 匹配时 permitted=false, action=reject", () => {
    const { engine } = createEngine({
      settings: {
        permissions: [{ tool: "Bash", action: "reject", message: "No bash allowed" }],
      },
    });
    const result = engine.checkPermission("Bash", { command: "rm -rf /" });
    assert.equal(result.permitted, false);
    assert.equal(result.action, "reject");
    assert.ok(result.reason.includes("No bash allowed"));
  });

  it("用户 ask 规则: 匹配时 permitted=false, action=ask", () => {
    const { engine } = createEngine({
      settings: {
        permissions: [{ tool: "Read", action: "ask" }],
      },
    });
    const result = engine.checkPermission("Read", {});
    assert.equal(result.permitted, false);
    assert.equal(result.action, "ask");
    assert.equal(result.source, "user-settings");
  });

  it("第一个匹配的规则生效 (顺序优先)", () => {
    const { engine } = createEngine({
      settings: {
        permissions: [
          { tool: "Bash", action: "allow" },
          { tool: "Bash", action: "reject" },
        ],
      },
    });
    const result = engine.checkPermission("Bash", {});
    assert.equal(result.permitted, true);
  });

  it("用户规则优先于默认规则", () => {
    // Default rule: Bash → ask. User rule: Bash → allow
    const { engine } = createEngine({
      settings: {
        permissions: [{ tool: "Bash", action: "allow" }],
      },
    });
    const result = engine.checkPermission("Bash", {});
    assert.equal(result.permitted, true);
    assert.equal(result.source, "user-settings");
  });
});

// ─── PermissionEngine: Level 3 — Default Rules ────────

describe("PermissionEngine — Level 3: Default Rules", () => {
  it("Read 工具默认允许", () => {
    const { engine } = createEngine();
    const result = engine.checkPermission("Read", {});
    assert.equal(result.permitted, true);
    assert.equal(result.source, "default");
  });

  it("Grep 工具默认允许", () => {
    const { engine } = createEngine();
    const result = engine.checkPermission("Grep", {});
    assert.equal(result.permitted, true);
  });

  it("Glob 工具默认允许", () => {
    const { engine } = createEngine();
    const result = engine.checkPermission("Glob", {});
    assert.equal(result.permitted, true);
  });

  it("FuzzyFind 工具默认允许", () => {
    const { engine } = createEngine();
    const result = engine.checkPermission("FuzzyFind", {});
    assert.equal(result.permitted, true);
  });

  it("TodoWrite 工具默认允许", () => {
    const { engine } = createEngine();
    const result = engine.checkPermission("TodoWrite", {});
    assert.equal(result.permitted, true);
  });

  it("Write 在 workspace 内默认允许", () => {
    const { engine } = createEngine({ workspaceRoot: "/workspace" });
    const result = engine.checkPermission("Write", { file_path: "/workspace/src/index.ts" });
    assert.equal(result.permitted, true);
  });

  it("Write 在 workspace 外需要确认", () => {
    const { engine } = createEngine({ workspaceRoot: "/workspace" });
    // No match on the workspace rule, falls to fallback
    const result = engine.checkPermission("Write", { file_path: "/etc/config" });
    assert.equal(result.permitted, false);
    assert.equal(result.action, "ask");
  });

  it("Bash 默认需要确认 (ask)", () => {
    const { engine } = createEngine();
    const result = engine.checkPermission("Bash", { command: "ls" });
    assert.equal(result.permitted, false);
    assert.equal(result.action, "ask");
    assert.equal(result.source, "default");
  });

  it("mcp__* 工具默认需要确认 (ask)", () => {
    const { engine } = createEngine();
    const result = engine.checkPermission("mcp__server__tool", {});
    assert.equal(result.permitted, false);
    assert.equal(result.action, "ask");
  });

  it("Task 工具默认允许", () => {
    const { engine } = createEngine();
    const result = engine.checkPermission("Task", {});
    assert.equal(result.permitted, true);
  });
});

// ─── PermissionEngine: Level 4 — Fallback ─────────────

describe("PermissionEngine — Level 4: Fallback", () => {
  it("无规则匹配时返回 ask", () => {
    const { engine } = createEngine();
    const result = engine.checkPermission("UnknownTool", {});
    assert.equal(result.permitted, false);
    assert.equal(result.action, "ask");
    assert.ok(result.reason.includes("No matching"));
  });
});

// ─── PermissionEngine: Context Filtering ───────────────

describe("PermissionEngine — Context Filtering", () => {
  it("规则 context='subagent' 在 thread 上下文中不生效", () => {
    const { engine } = createEngine({
      settings: {
        permissions: [
          { tool: "Bash", action: "allow", context: "subagent" },
        ],
      },
    });
    // In thread context, the subagent-only rule is skipped → falls to default (ask)
    const result = engine.checkPermission("Bash", {}, "thread");
    assert.equal(result.permitted, false);
    assert.equal(result.action, "ask");
  });

  it("规则 context='subagent' 在 subagent 上下文中生效", () => {
    const { engine } = createEngine({
      settings: {
        permissions: [
          { tool: "Bash", action: "allow", context: "subagent" },
        ],
      },
    });
    const result = engine.checkPermission("Bash", {}, "subagent");
    assert.equal(result.permitted, true);
    assert.equal(result.source, "user-settings");
  });

  it("规则无 context 限制: 在任意上下文中生效", () => {
    const { engine } = createEngine({
      settings: {
        permissions: [{ tool: "Bash", action: "allow" }],
      },
    });
    assert.equal(engine.checkPermission("Bash", {}, "thread").permitted, true);
    assert.equal(engine.checkPermission("Bash", {}, "subagent").permitted, true);
  });
});

// ─── requestApproval ───────────────────────────────────

describe("requestApproval", () => {
  it("推送到 pendingApprovals$ Subject", () => {
    const { engine, approvals$ } = createEngine();
    const request: ToolApprovalRequest = {
      threadId: "t1",
      mainThreadId: "t1",
      toolUseId: "u1",
      toolName: "Bash",
      args: { command: "rm -rf /" },
      reason: "Dangerous command",
      context: "thread",
    };
    engine.requestApproval(request);
    assert.ok(approvals$.lastValue);
    assert.equal(approvals$.lastValue!.length, 1);
    assert.equal(approvals$.lastValue![0].toolName, "Bash");
  });
});

// ─── DEFAULT_PERMISSION_RULES ──────────────────────────

describe("DEFAULT_PERMISSION_RULES", () => {
  it("包含预期的规则集合", () => {
    const toolNames = DEFAULT_PERMISSION_RULES.map((r) => r.tool);
    assert.ok(toolNames.includes("Read"));
    assert.ok(toolNames.includes("Grep"));
    assert.ok(toolNames.includes("Glob"));
    assert.ok(toolNames.includes("FuzzyFind"));
    assert.ok(toolNames.includes("TodoWrite"));
    assert.ok(toolNames.includes("Write"));
    assert.ok(toolNames.includes("Edit"));
    assert.ok(toolNames.includes("Bash"));
    assert.ok(toolNames.includes("mcp__*"));
    assert.ok(toolNames.includes("Task"));
  });

  it("Write/Edit 规则包含 ${workspaceRoot} 占位符", () => {
    const writeRule = DEFAULT_PERMISSION_RULES.find((r) => r.tool === "Write");
    assert.ok(writeRule?.matches);
    assert.ok(
      (writeRule!.matches!.file_path as string).includes("${workspaceRoot}"),
    );
  });
});
