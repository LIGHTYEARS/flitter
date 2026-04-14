/**
 * Permission DSL Matcher 单元测试
 *
 * 覆盖 matchToolPattern, matchDisablePattern, checkToolEnabled,
 * matchPermissionMatcher, matchPermissionEntry
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PermissionEntry, Settings } from "@flitter/schemas";
import {
  checkToolEnabled,
  matchDisablePattern,
  matchPermissionEntry,
  matchPermissionMatcher,
  matchToolPattern,
} from "./matcher";

// ─── matchToolPattern ──────────────────────────────────

describe("matchToolPattern", () => {
  it("精确匹配: 'Bash' 匹配 'Bash'", () => {
    assert.equal(matchToolPattern("Bash", "Bash"), true);
  });

  it("大小写不敏感: 'bash' 匹配 'Bash'", () => {
    assert.equal(matchToolPattern("bash", "Bash"), true);
  });

  it("单星通配: '*' 匹配任意工具名", () => {
    assert.equal(matchToolPattern("*", "anything"), true);
    assert.equal(matchToolPattern("*", "Bash"), true);
  });

  it("前缀通配: 'mcp__*' 匹配 'mcp__server'", () => {
    assert.equal(matchToolPattern("mcp__*", "mcp__server"), true);
  });

  it("多段通配: 'mcp__*__*' 匹配 'mcp__srv__tool'", () => {
    assert.equal(matchToolPattern("mcp__*__*", "mcp__srv__tool"), true);
  });

  it("不匹配: 'Read' 不匹配 'Write'", () => {
    assert.equal(matchToolPattern("Read", "Write"), false);
  });

  it("问号通配: 'Rea?' 匹配 'Read'", () => {
    assert.equal(matchToolPattern("Rea?", "Read"), true);
  });

  it("问号通配: 'Rea?' 不匹配 'Ready' (? 只匹配一个字符)", () => {
    assert.equal(matchToolPattern("Rea?", "Ready"), false);
  });

  it("双星通配: '**' 匹配包含路径分隔符的字符串", () => {
    assert.equal(matchToolPattern("/workspace/**", "/workspace/src/file.ts"), true);
  });
});

// ─── matchDisablePattern ───────────────────────────────

describe("matchDisablePattern", () => {
  it("单个匹配: ['Bash'] 匹配 'Bash'", () => {
    assert.equal(matchDisablePattern(["Bash"], "Bash"), true);
  });

  it("无匹配: ['Bash'] 不匹配 'Read'", () => {
    assert.equal(matchDisablePattern(["Bash"], "Read"), false);
  });

  it("空数组: [] 不匹配任何工具", () => {
    assert.equal(matchDisablePattern([], "Bash"), false);
  });

  it("多模式: ['Bash', 'mcp__*'] 匹配 'mcp__srv'", () => {
    assert.equal(matchDisablePattern(["Bash", "mcp__*"], "mcp__srv"), true);
  });
});

// ─── checkToolEnabled ──────────────────────────────────

describe("checkToolEnabled", () => {
  it("默认启用: 无 disable/enable 配置", () => {
    const config = {} as Settings;
    const result = checkToolEnabled("Bash", config);
    assert.equal(result.enabled, true);
    assert.equal(result.disabledReason, undefined);
  });

  it("禁用: tools.disable 匹配", () => {
    const config = { "tools.disable": ["Bash"] } as Settings;
    const result = checkToolEnabled("Bash", config);
    assert.equal(result.enabled, false);
    assert.equal(result.disabledReason, "settings");
  });

  it("重新启用: tools.disable 匹配但 tools.enable 也匹配", () => {
    const config = {
      "tools.disable": ["Bash"],
      "tools.enable": ["Bash"],
    } as Settings;
    const result = checkToolEnabled("Bash", config);
    assert.equal(result.enabled, true);
  });

  it("返回 disabledReason: 'settings' 当禁用时", () => {
    const config = { "tools.disable": ["mcp__*"] } as Settings;
    const result = checkToolEnabled("mcp__server", config);
    assert.equal(result.enabled, false);
    assert.equal(result.disabledReason, "settings");
  });

  it("glob 模式禁用: 'mcp__*' 禁用所有 mcp 工具", () => {
    const config = { "tools.disable": ["mcp__*"] } as Settings;
    assert.equal(checkToolEnabled("mcp__foo", config).enabled, false);
    assert.equal(checkToolEnabled("Read", config).enabled, true);
  });
});

// ─── matchPermissionMatcher ────────────────────────────

describe("matchPermissionMatcher", () => {
  it("字符串 glob: '*.ts' 匹配 'foo.ts'", () => {
    assert.equal(matchPermissionMatcher("*.ts", "foo.ts"), true);
  });

  it("字符串 glob: '*.ts' 不匹配 'foo.js'", () => {
    assert.equal(matchPermissionMatcher("*.ts", "foo.js"), false);
  });

  it("字符串 regex: '/^src/' 匹配 'src/index.ts'", () => {
    assert.equal(matchPermissionMatcher("/^src/", "src/index.ts"), true);
  });

  it("字符串 regex: '/\\.test\\.ts$/' 匹配 'foo.test.ts'", () => {
    assert.equal(matchPermissionMatcher("/\\.test\\.ts$/", "foo.test.ts"), true);
  });

  it("字符串 matcher 不匹配非字符串 value", () => {
    assert.equal(matchPermissionMatcher("*.ts", 42), false);
    assert.equal(matchPermissionMatcher("*.ts", null), false);
    assert.equal(matchPermissionMatcher("*.ts", true), false);
  });

  it("boolean: true 匹配 true, 不匹配 false", () => {
    assert.equal(matchPermissionMatcher(true, true), true);
    assert.equal(matchPermissionMatcher(true, false), false);
  });

  it("number: 42 匹配 42, 不匹配 43", () => {
    assert.equal(matchPermissionMatcher(42, 42), true);
    assert.equal(matchPermissionMatcher(42, 43), false);
  });

  it("null: null 匹配 null, 不匹配 undefined", () => {
    assert.equal(matchPermissionMatcher(null, null), true);
    assert.equal(matchPermissionMatcher(null, undefined), false);
  });

  it("undefined: undefined 匹配 undefined, 不匹配 null", () => {
    assert.equal(matchPermissionMatcher(undefined, undefined), true);
    assert.equal(matchPermissionMatcher(undefined, null), false);
  });

  it("数组 OR: ['*.ts', '*.js'] 匹配 'foo.ts'", () => {
    assert.equal(matchPermissionMatcher(["*.ts", "*.js"], "foo.ts"), true);
    assert.equal(matchPermissionMatcher(["*.ts", "*.js"], "foo.js"), true);
  });

  it("数组 OR: 无匹配则 false", () => {
    assert.equal(matchPermissionMatcher(["*.ts", "*.js"], "foo.py"), false);
  });

  it("record AND: { path: '*.ts' } 匹配 { path: 'foo.ts' }", () => {
    assert.equal(matchPermissionMatcher({ path: "*.ts" }, { path: "foo.ts" }), true);
  });

  it("record AND: 嵌套 { opts: { recursive: true } } 深度匹配", () => {
    assert.equal(
      matchPermissionMatcher({ opts: { recursive: true } }, { opts: { recursive: true } }),
      true,
    );
    assert.equal(
      matchPermissionMatcher({ opts: { recursive: true } }, { opts: { recursive: false } }),
      false,
    );
  });

  it("record matcher: value 不是对象时返回 false", () => {
    assert.equal(matchPermissionMatcher({ path: "*.ts" }, "string"), false);
    assert.equal(matchPermissionMatcher({ path: "*.ts" }, null), false);
  });
});

// ─── matchPermissionEntry ──────────────────────────────

describe("matchPermissionEntry", () => {
  it("tool 匹配 + 无 matches: 仅检查工具名", () => {
    const entry: PermissionEntry = { tool: "Bash", action: "allow" };
    assert.equal(matchPermissionEntry(entry, "Bash", {}), true);
  });

  it("tool 匹配 + matches 匹配: 全部通过", () => {
    const entry: PermissionEntry = {
      tool: "Write",
      action: "allow",
      matches: { file_path: "/workspace/**" },
    };
    assert.equal(
      matchPermissionEntry(entry, "Write", { file_path: "/workspace/src/index.ts" }),
      true,
    );
  });

  it("tool 匹配 + matches 不匹配: 返回 false", () => {
    const entry: PermissionEntry = {
      tool: "Write",
      action: "allow",
      matches: { file_path: "/workspace/**" },
    };
    assert.equal(matchPermissionEntry(entry, "Write", { file_path: "/etc/passwd" }), false);
  });

  it("tool 不匹配: 直接返回 false", () => {
    const entry: PermissionEntry = { tool: "Bash", action: "allow" };
    assert.equal(matchPermissionEntry(entry, "Read", {}), false);
  });

  it("多 matches 键: 所有键均需匹配", () => {
    const entry: PermissionEntry = {
      tool: "Edit",
      action: "allow",
      matches: {
        file_path: "*.ts",
        old_string: "/function/",
      },
    };
    assert.equal(
      matchPermissionEntry(entry, "Edit", {
        file_path: "index.ts",
        old_string: "function foo()",
      }),
      true,
    );
    assert.equal(
      matchPermissionEntry(entry, "Edit", {
        file_path: "index.ts",
        old_string: "class Bar",
      }),
      false,
    );
  });

  it("glob 通配 tool: 'mcp__*' 匹配 mcp 工具", () => {
    const entry: PermissionEntry = { tool: "mcp__*", action: "ask" };
    assert.equal(matchPermissionEntry(entry, "mcp__server__tool", {}), true);
    assert.equal(matchPermissionEntry(entry, "Bash", {}), false);
  });
});
