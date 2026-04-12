/**
 * 示例 05: 主题与颜色系统
 * 展示 Color、TextStyle、AppColorScheme、Theme 的用法
 */
import { Color } from "../src/screen/color.js";
import { TextStyle } from "../src/screen/text-style.js";
import { AppColorScheme } from "../src/widgets/color-scheme.js";
import { Theme } from "../src/widgets/theme.js";
import { Text } from "../src/widgets/text.js";
import { Column } from "../src/widgets/column.js";

// ── 颜色系统 ──────────────────────────────────

// ANSI 16 色
const red = Color.red();
const brightCyan = Color.brightCyan();

// 256 色
const orange = Color.indexed(208);

// 24 位真彩色
const custom = Color.rgb(100, 200, 255);

// ── 文本样式 ──────────────────────────────────

// 基础样式
const bold = new TextStyle({ bold: true });
const error = new TextStyle({
  foreground: Color.red(),
  bold: true,
});

// 样式组合
const base = new TextStyle({ foreground: Color.white(), bold: true });
const derived = base.copyWith({ italic: true }); // 保留 bold + white，追加 italic

// 样式合并（非默认值覆盖）
const overlay = new TextStyle({ foreground: Color.green() });
const merged = base.merge(overlay); // bold + green（green 覆盖 white）

// ── 配色方案 ──────────────────────────────────

// 使用暗色默认
const darkScheme = AppColorScheme.default();

// 自定义部分颜色
const customScheme = darkScheme.copyWith({
  primary: Color.rgb(0, 120, 215),
  accent: Color.rgb(255, 140, 0),
});

// 从 RGB 配置创建
const brandScheme = AppColorScheme.fromRgb({
  primary: { r: 0, g: 120, b: 215 },
  accent: { r: 255, g: 140, b: 0 },
});

// ── 主题系统 ──────────────────────────────────

// 使用暗色默认主题
const app = Theme.withDefault({
  child: new Column({
    children: [
      new Text({ data: "使用默认主题" }),
    ],
  }),
});

// 自定义主题
const customTheme = new Theme({
  data: { colorScheme: customScheme },
  child: new Column({
    children: [
      new Text({ data: "自定义主题" }),
    ],
  }),
});

// 在 build 中读取主题
// class MyWidget extends StatelessWidget {
//   build(context: BuildContext) {
//     const theme = Theme.of(context);
//     const fg = theme.colorScheme.foreground;
//     const primary = theme.colorScheme.primary;
//     return new Text({
//       data: "主题色文本",
//       style: new TextStyle({ foreground: primary }),
//     });
//   }
// }
