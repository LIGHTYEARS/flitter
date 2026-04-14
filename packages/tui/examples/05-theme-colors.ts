/**
 * 示例 05: 主题与颜色系统
 * 展示 Color、TextStyle、AppColorScheme、ThemeData 的用法
 *
 * Phase 12-14 迁移后，Theme 不再是 Widget 类，
 * 改为 ThemeController (InheritedWidget) 模式注入主题。
 * theme.ts 仅导出 ThemeData 接口和 defaultTheme 常量。
 */
import { Color } from "../src/screen/color.js";
import { TextStyle } from "../src/screen/text-style.js";
import { AppColorScheme } from "../src/widgets/color-scheme.js";
import { Column } from "../src/widgets/column.js";
import { Text } from "../src/widgets/text.js";
import { defaultTheme, type ThemeData } from "../src/widgets/theme.js";

// ── 颜色系统 ──────────────────────────────────

// ANSI 16 色
const _red = Color.red();
const _brightCyan = Color.brightCyan();

// 256 色
const _orange = Color.indexed(208);

// 24 位真彩色
const _custom = Color.rgb(100, 200, 255);

// ── 文本样式 ──────────────────────────────────

// 基础样式
const _bold = new TextStyle({ bold: true });
const _error = new TextStyle({
  foreground: Color.red(),
  bold: true,
});

// 样式组合
const base = new TextStyle({ foreground: Color.white(), bold: true });
const _derived = base.copyWith({ italic: true }); // 保留 bold + white，追加 italic

// 样式合并（非默认值覆盖）
const overlay = new TextStyle({ foreground: Color.green() });
const _merged = base.merge(overlay); // bold + green（green 覆盖 white）

// ── 配色方案 ──────────────────────────────────

// 使用暗色默认
const darkScheme = AppColorScheme.default();

// 自定义部分颜色
const _customScheme = darkScheme.copyWith({
  primary: Color.rgb(0, 120, 215),
  accent: Color.rgb(255, 140, 0),
});

// 从 RGB 配置创建
const _brandScheme = AppColorScheme.fromRgb({
  primary: { r: 0, g: 120, b: 215 },
  accent: { r: 255, g: 140, b: 0 },
});

// ── 主题系统 (Phase 12-14 迁移后) ──────────────────────────────────

// defaultTheme 是一个扁平化的字符串色值对象
console.log("默认主题名称:", defaultTheme.name);
console.log("主色调:", defaultTheme.primary);
console.log("背景色:", defaultTheme.background);

// 自定义主题 (扁平 ThemeData 接口)
const _customTheme: ThemeData = {
  ...defaultTheme,
  name: "custom",
  primary: "#FF6B6B",
  accent: "#4ECDC4",
};

// 在 Widget 树中使用 ThemeController (InheritedWidget):
// import { ThemeController } from "@flitter/cli/widgets/theme-controller";
//
// const root = new ThemeController({
//   data: defaultTheme,
//   child: new Column({
//     children: [new Text({ data: "使用默认主题" })],
//   }),
// });
//
// // 在子 Widget 的 build 方法中获取主题:
// const theme = ThemeController.of(context);
// const primary = theme.primary;
