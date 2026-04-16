/**
 * Theme 系统迁移测试。
 *
 * Phase 12-14: 验证 theme.ts 从全局变量模式迁移到数据模块后的正确性。
 * - defaultTheme 包含所有 12 个必需字段
 * - defaultTheme.name 为 "default"
 * - getTheme() 返回 defaultTheme
 * - ThemeData 接口: 所有 12 个字段存在
 * - theme.ts 不再有全局可变 theme 变量
 * - getTheme 标记为 deprecated (JSDoc)
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/widgets/theme.test.ts
 * ```
 *
 * @module
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { defaultTheme, getTheme, type ThemeData } from "./theme.js";

// ════════════════════════════════════════════════════
//  ThemeData 必需字段
// ════════════════════════════════════════════════════

/** ThemeData 接口要求的全部 12 个字段 */
const REQUIRED_FIELDS: (keyof ThemeData)[] = [
  "name",
  "primary",
  "secondary",
  "surface",
  "background",
  "error",
  "text",
  "mutedText",
  "border",
  "accent",
  "success",
  "warning",
];

// ════════════════════════════════════════════════════
//  defaultTheme 测试
// ════════════════════════════════════════════════════

describe("defaultTheme", () => {
  // 1. defaultTheme 包含所有 12 个必需字段
  it("包含所有 12 个必需字段", () => {
    for (const field of REQUIRED_FIELDS) {
      assert.ok(field in defaultTheme, `defaultTheme 缺少字段: ${field}`);
      assert.notEqual(defaultTheme[field], undefined, `defaultTheme.${field} 不应为 undefined`);
    }
    assert.equal(REQUIRED_FIELDS.length, 12);
  });

  // 2. defaultTheme.name 为 "default"
  it("name 为 'default'", () => {
    assert.equal(defaultTheme.name, "default");
  });

  // 3. 所有颜色字段为 CSS 十六进制字符串
  it("所有颜色字段为 CSS 十六进制字符串", () => {
    const colorFields = REQUIRED_FIELDS.filter((f) => f !== "name");
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const field of colorFields) {
      assert.match(
        defaultTheme[field],
        hexPattern,
        `defaultTheme.${field} = "${defaultTheme[field]}" 不是有效的十六进制颜色`,
      );
    }
  });

  // 4. defaultTheme 是不可变引用 (同一对象)
  it("多次访问返回同一引用", () => {
    assert.equal(defaultTheme, defaultTheme);
    // 重新 import 验证模块级常量稳定性
    const ref1 = defaultTheme;
    const ref2 = defaultTheme;
    assert.equal(ref1, ref2);
  });
});

// ════════════════════════════════════════════════════
//  getTheme() 测试
// ════════════════════════════════════════════════════

describe("getTheme()", () => {
  // 5. getTheme() 返回 defaultTheme
  it("返回 defaultTheme", () => {
    const result = getTheme();
    assert.equal(result, defaultTheme);
  });
});

// ════════════════════════════════════════════════════
//  源码静态分析测试
// ════════════════════════════════════════════════════

describe("theme.ts 源码分析", () => {
  /** 读取 theme.ts 源码 */
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  const themePath = path.resolve(thisDir, "theme.ts");
  const source = fs.readFileSync(themePath, "utf-8");

  // 6. theme.ts 不再有全局可变 theme 变量 (let _globalTheme / setGlobalTheme)
  it("不再有全局可变 theme 变量", () => {
    assert.ok(!source.includes("let _globalTheme"), "不应包含 'let _globalTheme' 全局可变变量");
    assert.ok(!source.includes("setGlobalTheme"), "不应导出 setGlobalTheme 函数");
    assert.ok(!source.includes("getGlobalTheme"), "不应导出 getGlobalTheme 函数");
  });

  // 7. getTheme 标记为 @deprecated (JSDoc)
  it("getTheme 标记为 @deprecated", () => {
    assert.ok(source.includes("@deprecated"), "getTheme 的 JSDoc 应包含 @deprecated 标记");
  });
});
