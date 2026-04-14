/**
 * AppColorScheme / Theme 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖配色方案构造、
 * 预设主题、copyWith、equals、ThemeData 以及 Theme Widget。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/widgets/theme.test.ts
 * ```
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Color } from "../screen/color.js";
import type { Element } from "../tree/element.js";
import { Widget } from "../tree/widget.js";
import { AppColorScheme } from "./color-scheme.js";
import { getGlobalTheme, setGlobalTheme, Theme } from "./theme.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/**
 * 测试用的最小 Widget 子类，仅用于作为 Theme 的 child。
 */
class DummyWidget extends Widget {
  createElement(): Element {
    throw new Error("Not implemented in test");
  }
}

// ════════════════════════════════════════════════════
//  AppColorScheme 构造
// ════════════════════════════════════════════════════

describe("AppColorScheme 构造", () => {
  // 1. 默认构造: 所有字段为 Color.default()
  it("默认构造时所有字段为 Color.default()", () => {
    const scheme = new AppColorScheme({});
    const defaultColor = Color.default();
    assert.ok(scheme.foreground.equals(defaultColor));
    assert.ok(scheme.mutedForeground.equals(defaultColor));
    assert.ok(scheme.background.equals(defaultColor));
    assert.ok(scheme.cursor.equals(defaultColor));
    assert.ok(scheme.primary.equals(defaultColor));
    assert.ok(scheme.secondary.equals(defaultColor));
    assert.ok(scheme.accent.equals(defaultColor));
    assert.ok(scheme.border.equals(defaultColor));
    assert.ok(scheme.success.equals(defaultColor));
    assert.ok(scheme.warning.equals(defaultColor));
    assert.ok(scheme.info.equals(defaultColor));
    assert.ok(scheme.destructive.equals(defaultColor));
    assert.ok(scheme.selection.equals(defaultColor));
    assert.ok(scheme.copyHighlight.equals(defaultColor));
    assert.ok(scheme.tableBorder.equals(defaultColor));
  });

  // 2. 部分指定: 指定的字段正确赋值，其余为默认
  it("部分指定字段时，指定的字段正确赋值，其余为 Color.default()", () => {
    const scheme = new AppColorScheme({
      primary: Color.red(),
      warning: Color.yellow(),
    });
    assert.ok(scheme.primary.equals(Color.red()));
    assert.ok(scheme.warning.equals(Color.yellow()));
    assert.ok(scheme.foreground.equals(Color.default()));
    assert.ok(scheme.background.equals(Color.default()));
    assert.ok(scheme.secondary.equals(Color.default()));
  });
});

// ════════════════════════════════════════════════════
//  AppColorScheme.default()
// ════════════════════════════════════════════════════

describe("AppColorScheme.default()", () => {
  // 3. foreground 为 Color.default()
  it("foreground 为 Color.default()", () => {
    const scheme = AppColorScheme.default();
    assert.ok(scheme.foreground.equals(Color.default()));
  });

  // 4. primary 为 Color.blue()
  it("primary 为 Color.blue()", () => {
    const scheme = AppColorScheme.default();
    assert.ok(scheme.primary.equals(Color.blue()));
  });

  // 5. success 为 Color.green()
  it("success 为 Color.green()", () => {
    const scheme = AppColorScheme.default();
    assert.ok(scheme.success.equals(Color.green()));
  });

  // 6. warning 为 Color.yellow()
  it("warning 为 Color.yellow()", () => {
    const scheme = AppColorScheme.default();
    assert.ok(scheme.warning.equals(Color.yellow()));
  });

  // 7. destructive 为 Color.red()
  it("destructive 为 Color.red()", () => {
    const scheme = AppColorScheme.default();
    assert.ok(scheme.destructive.equals(Color.red()));
  });

  // 8. 所有 15 个属性均为 Color 实例
  it("所有 15 个属性均为 Color 实例", () => {
    const scheme = AppColorScheme.default();
    const fields: (keyof AppColorScheme)[] = [
      "foreground",
      "mutedForeground",
      "background",
      "cursor",
      "primary",
      "secondary",
      "accent",
      "border",
      "success",
      "warning",
      "info",
      "destructive",
      "selection",
      "copyHighlight",
      "tableBorder",
    ];
    for (const field of fields) {
      assert.ok(scheme[field] instanceof Color, `${field} 应为 Color 实例`);
    }
  });
});

// ════════════════════════════════════════════════════
//  AppColorScheme.fromRgb()
// ════════════════════════════════════════════════════

describe("AppColorScheme.fromRgb()", () => {
  // 9. 传入 primary RGB 值正确创建
  it("传入 primary RGB 值正确创建", () => {
    const scheme = AppColorScheme.fromRgb({
      primary: { r: 100, g: 150, b: 200 },
    });
    assert.ok(scheme.primary.equals(Color.rgb(100, 150, 200)));
  });

  // 10. 未指定的字段使用默认值
  it("未指定的字段使用默认值", () => {
    const scheme = AppColorScheme.fromRgb({
      primary: { r: 100, g: 150, b: 200 },
    });
    const defaultScheme = AppColorScheme.default();
    assert.ok(scheme.foreground.equals(defaultScheme.foreground));
    assert.ok(scheme.success.equals(defaultScheme.success));
    assert.ok(scheme.warning.equals(defaultScheme.warning));
  });

  // 11. 多个 RGB 值同时指定
  it("多个 RGB 值同时指定", () => {
    const scheme = AppColorScheme.fromRgb({
      primary: { r: 100, g: 150, b: 200 },
      destructive: { r: 255, g: 0, b: 0 },
      success: { r: 0, g: 255, b: 0 },
    });
    assert.ok(scheme.primary.equals(Color.rgb(100, 150, 200)));
    assert.ok(scheme.destructive.equals(Color.rgb(255, 0, 0)));
    assert.ok(scheme.success.equals(Color.rgb(0, 255, 0)));
  });
});

// ════════════════════════════════════════════════════
//  AppColorScheme.copyWith()
// ════════════════════════════════════════════════════

describe("AppColorScheme.copyWith()", () => {
  // 12. 覆盖 primary 不影响其他字段
  it("覆盖 primary 不影响其他字段", () => {
    const original = AppColorScheme.default();
    const modified = original.copyWith({ primary: Color.red() });
    assert.ok(modified.primary.equals(Color.red()));
    assert.ok(modified.foreground.equals(original.foreground));
    assert.ok(modified.success.equals(original.success));
    assert.ok(modified.warning.equals(original.warning));
    assert.ok(modified.destructive.equals(original.destructive));
  });

  // 13. 覆盖多个字段正确
  it("覆盖多个字段正确", () => {
    const original = AppColorScheme.default();
    const modified = original.copyWith({
      primary: Color.red(),
      success: Color.magenta(),
      cursor: Color.cyan(),
    });
    assert.ok(modified.primary.equals(Color.red()));
    assert.ok(modified.success.equals(Color.magenta()));
    assert.ok(modified.cursor.equals(Color.cyan()));
    // 未覆盖的保持不变
    assert.ok(modified.foreground.equals(original.foreground));
    assert.ok(modified.warning.equals(original.warning));
  });

  // 14. 空覆盖返回相同值的新实例
  it("空覆盖返回相同值的新实例", () => {
    const original = AppColorScheme.default();
    const copied = original.copyWith({});
    assert.ok(original.equals(copied));
    // 验证确实是不同的实例
    assert.notEqual(original, copied);
  });
});

// ════════════════════════════════════════════════════
//  AppColorScheme.equals()
// ════════════════════════════════════════════════════

describe("AppColorScheme.equals()", () => {
  // 15. 两个 default() 相等
  it("两个 default() 相等", () => {
    const a = AppColorScheme.default();
    const b = AppColorScheme.default();
    assert.ok(a.equals(b));
  });

  // 16. 不同 primary 不相等
  it("不同 primary 不相等", () => {
    const a = AppColorScheme.default();
    const b = a.copyWith({ primary: Color.red() });
    assert.ok(!a.equals(b));
  });
});

// ════════════════════════════════════════════════════
//  ThemeData
// ════════════════════════════════════════════════════

describe("ThemeData", () => {
  // 17. Theme.dark() 返回暗色配色方案
  it("Theme.dark() 返回暗色配色方案", () => {
    const dark = Theme.dark();
    assert.ok(dark.colorScheme.equals(AppColorScheme.default()));
  });

  // 18. Theme.light() 返回亮色配色方案
  it("Theme.light() 返回亮色配色方案", () => {
    const light = Theme.light();
    // 亮色方案与暗色方案不同
    const dark = Theme.dark();
    assert.ok(!light.colorScheme.equals(dark.colorScheme));
  });

  // 19. Theme.light() 的 foreground 为 Color.black()
  it("Theme.light() 的 foreground 为 Color.black()", () => {
    const light = Theme.light();
    assert.ok(light.colorScheme.foreground.equals(Color.black()));
  });
});

// ════════════════════════════════════════════════════
//  Theme Widget
// ════════════════════════════════════════════════════

describe("Theme Widget", () => {
  // 20. Theme.of() 返回全局默认 ThemeData
  it("Theme.of() 返回全局默认 ThemeData", () => {
    // 重置为暗色主题
    setGlobalTheme(Theme.dark());
    const themeData = Theme.of(null as unknown as import("../tree/element.js").Element);
    assert.ok(themeData.colorScheme.equals(AppColorScheme.default()));
  });

  // 21. Theme.withDefault() 创建暗色主题 Widget
  it("Theme.withDefault() 创建暗色主题 Widget", () => {
    const child = new DummyWidget();
    const theme = Theme.withDefault({ child });
    assert.ok(theme instanceof Theme);
    assert.ok(theme.data.colorScheme.equals(AppColorScheme.default()));
    assert.equal(theme.child, child);
  });

  // 22. setGlobalTheme/getGlobalTheme works
  it("setGlobalTheme/getGlobalTheme 正确设置和获取全局主题", () => {
    const lightTheme = Theme.light();
    setGlobalTheme(lightTheme);
    const current = getGlobalTheme();
    assert.ok(current.colorScheme.equals(lightTheme.colorScheme));

    // 恢复默认
    setGlobalTheme(Theme.dark());
    const restored = getGlobalTheme();
    assert.ok(restored.colorScheme.equals(AppColorScheme.default()));
  });
});
