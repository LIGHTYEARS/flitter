# 颜色、样式与主题

本文档详细介绍 Flitter TUI 框架中与样式、颜色和主题相关的核心组件：**Color**、**TextStyle**、**AppColorScheme**、**Theme / ThemeData**、**ThemeRegistry** 和 **TOML Theme Loader**。

---

## 目录

1. [Color -- 终端颜色](#1-color----终端颜色)
2. [TextStyle -- 文本样式](#2-textstyle----文本样式)
3. [AppColorScheme -- 应用配色方案](#3-appcolorscheme----应用配色方案)
4. [Theme / ThemeData -- 主题系统](#4-theme--themedata----主题系统)
5. [ThemeRegistry -- 主题注册表](#5-themeregistry----主题注册表)
6. [TOML Theme Loader -- 自定义主题加载器](#6-toml-theme-loader----自定义主题加载器)

---

## 1. Color -- 终端颜色

### 简介

`Color` 是不可变的终端颜色值对象，支持四种颜色模式，覆盖从基础 ANSI 到 24 位真彩色的全部终端颜色能力。所有实例通过静态工厂方法创建，不可直接 `new`。

### 颜色模式

| 模式 | ColorKind | 说明 | 色域 |
|------|-----------|------|------|
| 默认色 | `"default"` | 终端默认前景/背景色 | -- |
| 命名色 | `"named"` | 标准 16 色 ANSI 颜色 | 索引 0-15 |
| 索引色 | `"index"` | 256 色扩展调色板 | 索引 0-255 |
| 真彩色 | `"rgb"` | 24 位 RGB 真彩色 | r/g/b 各 0-255 |

### 静态工厂方法

```typescript
Color.default()
Color.black()      // 索引 0
Color.red()        // 索引 1
Color.green()      // 索引 2
Color.yellow()     // 索引 3
Color.blue()       // 索引 4
Color.magenta()    // 索引 5
Color.cyan()       // 索引 6
Color.white()      // 索引 7
Color.brightBlack()    // 索引 8  (至 brightWhite() 索引 15)
Color.indexed(n: number)               // 256 色索引
Color.rgb(r: number, g: number, b: number)  // 24 位真彩色
```

### 实例方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `equals` | `equals(other: Color): boolean` | 值相等比较，模式和所有分量都相同时返回 `true` |
| `toAnsi` | `toAnsi(isForeground: boolean): string` | 生成 ANSI SGR 参数字符串 |

### ANSI SGR 输出格式

| 模式 | 前景 (`true`) | 背景 (`false`) |
|------|--------------|--------------|
| `"default"` | `"39"` | `"49"` |
| `"named"` 0-7 | `"30"` - `"37"` | `"40"` - `"47"` |
| `"named"` 8-15 | `"90"` - `"97"` | `"100"` - `"107"` |
| `"index"` | `"38;5;n"` | `"48;5;n"` |
| `"rgb"` | `"38;2;r;g;b"` | `"48;2;r;g;b"` |

### 注意事项

- `Color` 采用不可变设计，所有属性均为 `readonly`。
- `equals` 严格按模式比较：`Color.red()` 与 `Color.rgb(255, 0, 0)` 返回 `false`。
- `indexed()` 和 `rgb()` 对参数范围做校验，超出 0-255 抛出 `RangeError`。

---

## 2. TextStyle -- 文本样式

### 简介

`TextStyle` 封装终端文本的完整样式信息，包括前景色、背景色和五种文本修饰属性。采用不可变设计，通过 `copyWith` 或 `merge` 创建新实例。

### 构造参数

```typescript
new TextStyle(options?: Partial<{
  foreground: Color;       // 默认 Color.default()
  background: Color;       // 默认 Color.default()
  bold: boolean;           // 默认 false
  italic: boolean;         // 默认 false
  underline: boolean;      // 默认 false
  strikethrough: boolean;  // 默认 false
  dim: boolean;            // 默认 false
}>)
```

### 静态属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `TextStyle.NORMAL` | `TextStyle` | 共享的默认样式实例 |

### 实例方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `copyWith` | `copyWith(options): TextStyle` | 创建部分修改的新样式 |
| `merge` | `merge(other): TextStyle` | 合并另一个样式的非默认字段 |
| `equals` | `equals(other): boolean` | 值相等比较 |
| `toSgr` | `toSgr(): string` | 生成完整 SGR 参数字符串 |
| `diffSgr` | `diffSgr(previous): string` | 生成与前一样式的最小差异 SGR |

### merge 语义

- **颜色属性**：`other` 中非 `Color.default()` 的颜色会覆盖当前值
- **布尔属性**：`other` 中为 `true` 的值会覆盖（逻辑或语义）

### diffSgr 优化策略

1. **完全相同** -- 返回空字符串 `""`
2. **需要关闭 3+ 属性** -- 完整重置 `"0"` 再输出完整 SGR
3. **其他** -- 仅输出变化的部分

### 注意事项

- `TextStyle.NORMAL` 是共享的单例，请勿尝试修改其属性。
- `toSgr()` 属性输出顺序：bold(1) > dim(2) > italic(3) > underline(4) > strikethrough(9) > 前景色 > 背景色。
- `bold` 和 `dim` 共享关闭码 `"22"`。

---

## 3. AppColorScheme -- 应用配色方案

### 简介

`AppColorScheme` 定义了 TUI 应用所需的 15 种语义颜色。

### 语义颜色属性

| 属性 | 说明 | 暗色默认值 |
|------|------|-----------|
| `foreground` | 主前景色 | `Color.default()` |
| `mutedForeground` | 弱化前景色 | `Color.brightBlack()` |
| `background` | 背景色 | `Color.default()` |
| `cursor` | 光标颜色 | `Color.white()` |
| `primary` | 主要强调色 | `Color.blue()` |
| `secondary` | 次要强调色 | `Color.cyan()` |
| `accent` | 装饰强调色 | `Color.magenta()` |
| `border` | 边框颜色 | `Color.brightBlack()` |
| `success` | 成功状态色 | `Color.green()` |
| `warning` | 警告状态色 | `Color.yellow()` |
| `info` | 信息提示色 | `Color.cyan()` |
| `destructive` | 危险/错误色 | `Color.red()` |
| `selection` | 选区高亮色 | `Color.blue()` |
| `copyHighlight` | 复制高亮色 | `Color.yellow()` |
| `tableBorder` | 表格边框色 | `Color.brightBlack()` |

### 构造与静态方法

```typescript
new AppColorScheme(options: Partial<AppColorSchemeOptions>)
AppColorScheme.default(): AppColorScheme            // 暗色默认预设
AppColorScheme.fromRgb(config: Record<string, { r, g, b }>): AppColorScheme
```

### 实例方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `copyWith` | `copyWith(overrides): AppColorScheme` | 覆盖指定字段 |
| `equals` | `equals(other): boolean` | 15 个字段全部相等时返回 `true` |

### 注意事项

- 构造函数的默认值为 `Color.default()`，而非暗色预设值。如需基于暗色预设修改，应使用 `AppColorScheme.default().copyWith(...)`。
- `fromRgb` 中未指定的字段使用暗色默认值（而非 `Color.default()`）。

---

## 4. Theme / ThemeData -- 主题系统

### ThemeData 接口

```typescript
interface ThemeData {
  readonly colorScheme: AppColorScheme;
}
```

### Theme Widget

```typescript
class Theme extends StatelessWidget {
  readonly data: ThemeData;
  readonly child: Widget;
  constructor(options: { data: ThemeData; child: Widget; key?: Key });
}
```

### 静态方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `Theme.of` | `of(context): ThemeData` | 获取当前主题数据 |
| `Theme.dark` | `dark(): ThemeData` | 创建暗色默认主题 |
| `Theme.light` | `light(): ThemeData` | 创建亮色主题 |
| `Theme.withDefault` | `withDefault({ child }): Theme` | 使用暗色默认主题包裹子 Widget |

### 预设主题差异

| 属性 | 暗色 | 亮色 |
|------|------|------|
| `foreground` | `Color.default()` | `Color.black()` |
| `background` | `Color.default()` | `Color.white()` |
| `cursor` | `Color.white()` | `Color.black()` |

### 使用示例

```typescript
import { Theme } from "@flitter/tui/widgets/theme";
import { AppColorScheme } from "@flitter/tui/widgets/color-scheme";

// 使用暗色默认主题
const app = Theme.withDefault({ child: myRootWidget });

// 自定义主题
const customTheme = {
  colorScheme: AppColorScheme.default().copyWith({
    primary: Color.rgb(0, 120, 215),
  }),
};
const app2 = new Theme({ data: customTheme, child: myRootWidget });

// 在 build 中获取主题
const theme = Theme.of(context);
const colors = theme.colorScheme;
```

---

## 5. ThemeRegistry -- 主题注册表

### 简介

`ThemeRegistry` 是主题的中央注册表，管理内置主题和自定义主题的查找。自定义主题覆盖同名内置主题。

### API

```typescript
class ThemeRegistry {
  get(name: string): ThemeSpec | null;          // 查找主题（自定义优先于内置）
  getAll(): ThemeSpec[];                         // 获取所有主题（内置 + 自定义）
  getDefault(): ThemeSpec;                       // 获取默认主题（terminal）
  registerCustom(theme: ThemeSpec): void;        // 注册自定义主题
}
```

### 内置主题

8 套内置主题：

| 名称 | 说明 |
|------|------|
| `terminal` | 终端默认色（默认主题） |
| `dark` | 暗色 |
| `light` | 亮色 |
| `catppuccin-mocha` | Catppuccin Mocha |
| `solarized-dark` | Solarized Dark |
| `solarized-light` | Solarized Light |
| `gruvbox-dark-hard` | Gruvbox Dark Hard |
| `nord` | Nord |

### 查找顺序

1. 自定义主题 Map（`customThemes`）
2. 内置主题数组（`BUILTIN_THEMES`）
3. 返回 `null`

---

## 6. TOML Theme Loader -- 自定义主题加载器

### 简介

从 `~/.config/flitter/themes/{name}/colors.toml` 加载用户自定义主题。每个子目录代表一个主题。

### API

```typescript
function scanThemeDirectory(themesDir?: string): ParsedTheme[];
function parsedThemeToThemeSpec(theme: ParsedTheme): ThemeSpec;
function hexToRgb(hex: string): RgbColor | null;
function parseThemeToml(tomlText: string, dirName: string): ParsedTheme | null;
```

### colors.toml 格式

必填字段（`[colors]` section）：

| 字段 | 说明 |
|------|------|
| `background` | 背景色 `"#RRGGBB"` |
| `foreground` | 前景色 |
| `primary` | 主要强调色 |
| `success` | 成功色 |
| `warning` | 警告色 |
| `destructive` | 错误色 |

可选字段：`secondary`, `accent`, `info`

可选 `[ui]` section：`muted_foreground`, `border`, `cursor`, `selection`, `copy_highlight`, `table_border`

可选 `[syntax]` section：`keyword`, `string`, `number`, `comment`, `function`, `variable`, `type`, `operator`

### 暗/亮模式自动检测

- 如果设置了 `mode = "light"` 或 `mode = "dark"`，使用指定值
- 否则通过背景色亮度自动检测：`luminance > 0.5` 为 light

### 示例 colors.toml

```toml
name = "My Custom Theme"

[colors]
background = "#1e1e2e"
foreground = "#cdd6f4"
primary = "#89b4fa"
success = "#a6e3a1"
warning = "#f9e2af"
destructive = "#f38ba8"

[ui]
border = "#585b70"
muted_foreground = "#6c7086"
```

### 派生规则（未指定时的默认值）

| 属性 | 派生来源 |
|------|---------|
| `mutedForeground` | `ui.muted_foreground` 或 foreground |
| `border` | `ui.border` 或 foreground |
| `cursor` | `ui.cursor` 或 foreground |
| `selection` | `ui.selection` 或 border |
| `secondary` | `colors.secondary` 或 primary |
| `accent` | `colors.accent` 或 primary |
| `info` | `colors.info` 或 primary |
| `copyHighlight` | `ui.copy_highlight` 或 warning |
| `tableBorder` | `ui.table_border` 或 border |
