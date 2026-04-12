# Flitter TUI 样式与主题系统

本文档详细介绍 Flitter TUI 框架中与样式、颜色和主题相关的四个核心组件：**Color**、**TextStyle**、**AppColorScheme** 和 **Theme / ThemeData**。它们共同构成了终端 UI 的视觉表现层。

---

## 目录

1. [Color -- 终端颜色](#1-color----终端颜色)
2. [TextStyle -- 文本样式](#2-textstyle----文本样式)
3. [AppColorScheme -- 应用配色方案](#3-appcolorscheme----应用配色方案)
4. [Theme / ThemeData -- 主题系统](#4-theme--themedata----主题系统)
5. [综合示例](#5-综合示例)

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
// 默认色
Color.default()

// 标准 8 色（索引 0-7）
Color.black()      // 索引 0
Color.red()        // 索引 1
Color.green()      // 索引 2
Color.yellow()     // 索引 3
Color.blue()       // 索引 4
Color.magenta()    // 索引 5
Color.cyan()       // 索引 6
Color.white()      // 索引 7

// 亮色 8 色（索引 8-15）
Color.brightBlack()    // 索引 8
Color.brightRed()      // 索引 9
Color.brightGreen()    // 索引 10
Color.brightYellow()   // 索引 11
Color.brightBlue()     // 索引 12
Color.brightMagenta()  // 索引 13
Color.brightCyan()     // 索引 14
Color.brightWhite()    // 索引 15

// 256 色索引（0-255，超范围抛出 RangeError）
Color.indexed(n: number)

// 24 位 RGB 真彩色（各分量 0-255，超范围抛出 RangeError）
Color.rgb(r: number, g: number, b: number)
```

### 实例方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `equals` | `equals(other: Color): boolean` | 值相等比较，模式和所有分量都相同时返回 `true` |
| `toAnsi` | `toAnsi(isForeground: boolean): string` | 生成 ANSI SGR 参数字符串 |

### ANSI SGR 输出格式

`toAnsi(isForeground)` 根据颜色模式生成如下 SGR 参数：

| 模式 | 前景 (`true`) | 背景 (`false`) |
|------|--------------|--------------|
| `"default"` | `"39"` | `"49"` |
| `"named"` 0-7 | `"30"` - `"37"` | `"40"` - `"47"` |
| `"named"` 8-15 | `"90"` - `"97"` | `"100"` - `"107"` |
| `"index"` | `"38;5;n"` | `"48;5;n"` |
| `"rgb"` | `"38;2;r;g;b"` | `"48;2;r;g;b"` |

### 使用示例

```typescript
import { Color } from "@flitter/tui/screen/color";

// 命名色
const red = Color.red();
red.toAnsi(true);   // "31"
red.toAnsi(false);  // "41"

// 亮色
const brightRed = Color.brightRed();
brightRed.toAnsi(true);  // "91"

// 256 色索引
const indexed = Color.indexed(128);
indexed.toAnsi(true);   // "38;5;128"
indexed.toAnsi(false);  // "48;5;128"

// 24 位真彩色
const orange = Color.rgb(255, 128, 0);
orange.toAnsi(true);   // "38;2;255;128;0"
orange.toAnsi(false);  // "48;2;255;128;0"

// 拼接 ANSI 转义序列输出彩色文本
const fg = Color.red();
const bg = Color.rgb(30, 30, 30);
console.log(`\x1b[${fg.toAnsi(true)};${bg.toAnsi(false)}m红字深灰底\x1b[0m`);

// 相等性比较
Color.red().equals(Color.red());           // true
Color.red().equals(Color.rgb(255, 0, 0));  // false（模式不同）
```

### 注意事项

- `Color` 采用不可变设计，所有属性均为 `readonly`，没有修改方法。
- `equals` 严格按模式比较：`Color.red()`（named 模式）与 `Color.rgb(255, 0, 0)`（rgb 模式）虽然视觉上相同，但 `equals` 返回 `false`。
- `indexed()` 和 `rgb()` 对参数范围做校验，超出 0-255 会抛出 `RangeError`。
- `rgb` 模式下 `index` 属性为 `-1`；`default` 模式下 `index` 同样为 `-1`。

---

## 2. TextStyle -- 文本样式

### 简介

`TextStyle` 封装终端文本的完整样式信息，包括前景色、背景色和五种文本修饰属性。采用不可变设计，通过 `copyWith` 或 `merge` 创建新实例。能够生成完整的 SGR 参数序列，以及与前一状态之间的最小差异序列以优化终端输出。

### 构造参数

```typescript
interface TextStyleOptions {
  foreground: Color;       // 前景色，默认 Color.default()
  background: Color;       // 背景色，默认 Color.default()
  bold: boolean;           // 粗体，默认 false
  italic: boolean;         // 斜体，默认 false
  underline: boolean;      // 下划线，默认 false
  strikethrough: boolean;  // 删除线，默认 false
  dim: boolean;            // 暗淡，默认 false
}

// 构造函数接受 Partial<TextStyleOptions>，所有字段可选
new TextStyle(options?: Partial<TextStyleOptions>)
```

### 静态属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `TextStyle.NORMAL` | `TextStyle` | 共享的默认样式实例，所有颜色为终端默认，所有修饰为 `false` |

### 实例方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `copyWith` | `copyWith(options: Partial<TextStyleOptions>): TextStyle` | 创建部分修改的新样式，原实例不受影响 |
| `merge` | `merge(other: TextStyle): TextStyle` | 合并另一个样式的非默认字段 |
| `equals` | `equals(other: TextStyle): boolean` | 值相等比较 |
| `toSgr` | `toSgr(): string` | 生成完整 SGR 参数字符串 |
| `diffSgr` | `diffSgr(previous: TextStyle): string` | 生成与前一样式的最小差异 SGR |

### merge 语义

`merge(other)` 的覆盖规则：

- **颜色属性**：`other` 中非 `Color.default()` 的颜色会覆盖当前值
- **布尔属性**：`other` 中为 `true` 的值会覆盖（逻辑或语义）

```typescript
const base = new TextStyle({ bold: true, foreground: Color.red() });
const overlay = new TextStyle({ italic: true, foreground: Color.blue() });
const merged = base.merge(overlay);
// 结果: bold=true, italic=true, foreground=blue
```

### diffSgr 优化策略

`diffSgr(previous)` 采用三级优化：

1. **完全相同** -- 返回空字符串 `""`
2. **需要关闭 3 个或更多属性** -- 使用完整重置 `"0"` 再输出完整 SGR（如 `"0;1;31"`）
3. **其他情况** -- 仅输出变化的部分

关闭属性对应的 SGR 代码：

| 属性关闭 | SGR 代码 | 说明 |
|---------|---------|------|
| bold off | `"22"` | 与 dim off 共享关闭码 |
| dim off | `"22"` | 与 bold off 共享关闭码 |
| italic off | `"23"` | |
| underline off | `"24"` | |
| strikethrough off | `"29"` | |

### 使用示例

```typescript
import { TextStyle } from "@flitter/tui/screen/text-style";
import { Color } from "@flitter/tui/screen/color";

// 创建样式
const style = new TextStyle({
  bold: true,
  foreground: Color.red(),
});
console.log(`\x1b[${style.toSgr()}m粗体红字\x1b[0m`);
// toSgr() 输出: "1;31"

// 使用 NORMAL
TextStyle.NORMAL.toSgr();  // ""

// copyWith: 基于现有样式派生
const derived = style.copyWith({ italic: true });
// derived: bold=true, italic=true, foreground=red
// style 不受影响: bold=true, italic=false

// merge: 合并两个样式
const base = new TextStyle({ bold: true, foreground: Color.red() });
const overlay = new TextStyle({ italic: true, foreground: Color.blue() });
const merged = base.merge(overlay);
// merged: bold=true, italic=true, foreground=blue

// diffSgr: 计算最小差异
const a = new TextStyle({ bold: true });
const b = new TextStyle({ bold: true, italic: true });
b.diffSgr(a);  // "3"（仅新增斜体）

const c = TextStyle.NORMAL;
c.diffSgr(b);  // "0"（关闭多个属性，触发完整重置）

// 利用 diffSgr 优化连续输出
let prev = TextStyle.NORMAL;
const styles = [
  new TextStyle({ bold: true, foreground: Color.green() }),
  new TextStyle({ bold: true, foreground: Color.yellow() }),
  new TextStyle({ italic: true, foreground: Color.cyan() }),
];
for (const s of styles) {
  const diff = s.diffSgr(prev);
  if (diff) process.stdout.write(`\x1b[${diff}m`);
  process.stdout.write("文本内容");
  prev = s;
}
process.stdout.write("\x1b[0m\n");
```

### 注意事项

- `TextStyle` 同样为不可变设计，修改操作均返回新实例。
- `TextStyle.NORMAL` 是共享的单例，请勿尝试修改其属性。
- `toSgr()` 的属性输出顺序固定为：bold(1) > dim(2) > italic(3) > underline(4) > strikethrough(9) > 前景色 > 背景色。
- `bold` 和 `dim` 共享关闭码 `"22"`，因此在 `diffSgr` 中关闭 bold 可能同时影响 dim 状态。

---

## 3. AppColorScheme -- 应用配色方案

### 简介

`AppColorScheme` 定义了 TUI 应用所需的 15 种语义颜色，为整个应用提供统一的配色规范。支持暗色默认预设、RGB 自定义构造、复制覆盖和值相等比较。

### 语义颜色属性

所有属性类型均为 `Color`，且为 `readonly`：

| 属性 | 说明 | 暗色默认值 |
|------|------|-----------|
| `foreground` | 主前景色，用于普通文本 | `Color.default()` |
| `mutedForeground` | 弱化前景色，用于次要文本和提示 | `Color.brightBlack()` |
| `background` | 背景色 | `Color.default()` |
| `cursor` | 光标颜色 | `Color.white()` |
| `primary` | 主要强调色，用于关键交互元素 | `Color.blue()` |
| `secondary` | 次要强调色，用于辅助信息 | `Color.cyan()` |
| `accent` | 装饰强调色，用于特殊高亮 | `Color.magenta()` |
| `border` | 边框颜色 | `Color.brightBlack()` |
| `success` | 成功状态色 | `Color.green()` |
| `warning` | 警告状态色 | `Color.yellow()` |
| `info` | 信息提示色 | `Color.cyan()` |
| `destructive` | 危险/错误状态色 | `Color.red()` |
| `selection` | 选区高亮色 | `Color.blue()` |
| `copyHighlight` | 复制高亮色 | `Color.yellow()` |
| `tableBorder` | 表格边框色 | `Color.brightBlack()` |

### 构造与静态方法

```typescript
// 构造函数：接受部分选项，未指定的字段默认为 Color.default()
new AppColorScheme(options: Partial<AppColorSchemeOptions>)

// 暗色默认预设
AppColorScheme.default(): AppColorScheme

// 从 RGB 配置构造（未指定的字段使用暗色默认值）
AppColorScheme.fromRgb(
  config: Record<string, { r: number; g: number; b: number }>
): AppColorScheme
```

### 实例方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `copyWith` | `copyWith(overrides: Partial<AppColorSchemeOptions>): AppColorScheme` | 覆盖指定字段，其余保持原值 |
| `equals` | `equals(other: AppColorScheme): boolean` | 15 个字段全部相等时返回 `true` |

### 使用示例

```typescript
import { AppColorScheme } from "@flitter/tui/widgets/color-scheme";
import { Color } from "@flitter/tui/screen/color";

// 使用暗色默认方案
const scheme = AppColorScheme.default();
scheme.primary;     // Color.blue()
scheme.success;     // Color.green()
scheme.destructive; // Color.red()

// 自定义部分颜色
const custom = scheme.copyWith({
  primary: Color.rgb(0, 120, 215),
  accent: Color.magenta(),
});

// 从 RGB 配置批量创建
const branded = AppColorScheme.fromRgb({
  primary:     { r: 0, g: 120, b: 215 },
  destructive: { r: 255, g: 59, b: 48 },
  success:     { r: 52, g: 199, b: 89 },
});

// 空构造（所有字段为 Color.default()）
const empty = new AppColorScheme({});

// 相等性比较
AppColorScheme.default().equals(AppColorScheme.default());  // true
scheme.equals(custom);  // false
```

### 注意事项

- 构造函数的默认值为 `Color.default()`（终端默认色），而非暗色预设的值。如需基于暗色预设修改，应使用 `AppColorScheme.default().copyWith(...)` 而非 `new AppColorScheme({...})`。
- `fromRgb` 中未指定的字段使用 `AppColorScheme.default()` 的值（暗色预设），而非 `Color.default()`。这与构造函数行为不同。
- `equals` 会逐一比较所有 15 个颜色字段。

---

## 4. Theme / ThemeData -- 主题系统

### 简介

主题系统由 `ThemeData` 接口和 `Theme` Widget 组成。`ThemeData` 封装完整的主题配置数据，`Theme` 作为 `StatelessWidget` 将主题数据注入子 Widget 树。子 Widget 可通过 `Theme.of(context)` 获取当前主题。

> **实现阶段说明**：当前（Phase 5）采用模块级全局变量存储主题数据，`Theme.of()` 直接返回全局值。Phase 6 将迁移到基于 `InheritedWidget` 的上下文查找机制。

### ThemeData 接口

```typescript
interface ThemeData {
  readonly colorScheme: AppColorScheme;
}
```

`ThemeData` 是一个简单的数据接口，目前仅包含 `colorScheme` 字段，未来可扩展排版、间距等属性。

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
| `Theme.of` | `of(context: BuildContext): ThemeData` | 获取当前主题数据 |
| `Theme.dark` | `dark(): ThemeData` | 创建暗色默认主题数据 |
| `Theme.light` | `light(): ThemeData` | 创建亮色主题数据 |
| `Theme.withDefault` | `withDefault(options: { child: Widget }): Theme` | 使用暗色默认主题包裹子 Widget |

### 预设主题

**暗色主题** (`Theme.dark()`)：使用 `AppColorScheme.default()`，适合深色终端背景。

**亮色主题** (`Theme.light()`)：适合浅色终端背景，关键差异如下：

| 属性 | 暗色 | 亮色 |
|------|------|------|
| `foreground` | `Color.default()` | `Color.black()` |
| `background` | `Color.default()` | `Color.white()` |
| `cursor` | `Color.white()` | `Color.black()` |

其余语义颜色（primary、success、warning 等）在两种预设中相同。

### 使用示例

```typescript
import { Theme } from "@flitter/tui/widgets/theme";
import type { ThemeData } from "@flitter/tui/widgets/theme";
import { AppColorScheme } from "@flitter/tui/widgets/color-scheme";
import { Color } from "@flitter/tui/screen/color";

// ---- 使用预设主题包裹应用 ----

// 方式一：使用暗色默认主题（最简写法）
const app1 = Theme.withDefault({ child: myRootWidget });

// 方式二：显式指定暗色主题
const app2 = new Theme({
  data: Theme.dark(),
  child: myRootWidget,
});

// 方式三：使用亮色主题
const app3 = new Theme({
  data: Theme.light(),
  child: myRootWidget,
});

// ---- 自定义主题 ----

const customTheme: ThemeData = {
  colorScheme: AppColorScheme.default().copyWith({
    primary: Color.rgb(0, 120, 215),
    accent: Color.rgb(255, 87, 51),
    destructive: Color.rgb(255, 59, 48),
  }),
};

const app4 = new Theme({
  data: customTheme,
  child: myRootWidget,
});

// ---- 从 RGB 配置创建品牌主题 ----

const brandTheme: ThemeData = {
  colorScheme: AppColorScheme.fromRgb({
    primary:     { r: 98, g: 0, b: 238 },
    secondary:   { r: 3, g: 218, b: 198 },
    accent:      { r: 255, g: 87, b: 34 },
    destructive: { r: 207, g: 34, b: 46 },
    success:     { r: 0, g: 200, b: 83 },
  }),
};

const app5 = new Theme({
  data: brandTheme,
  child: myRootWidget,
});

// ---- 在 build 方法中获取主题 ----

class MyWidget extends StatelessWidget {
  build(context: BuildContext): Widget {
    const theme = Theme.of(context);
    const colors = theme.colorScheme;

    // 使用语义颜色构建样式
    const titleStyle = new TextStyle({
      bold: true,
      foreground: colors.primary,
    });

    const errorStyle = new TextStyle({
      foreground: colors.destructive,
    });

    const mutedStyle = new TextStyle({
      dim: true,
      foreground: colors.mutedForeground,
    });

    // ... 使用样式构建 UI
  }
}
```

### 注意事项

- `Theme.of(context)` 在当前 Phase 5 实现中忽略 `context` 参数，始终返回全局主题。Phase 6 迁移到 `InheritedWidget` 后，`context` 将用于在 Widget 树中向上查找最近的 `Theme`。
- `Theme.build()` 执行时会将自身的 `data` 设置为全局主题，因此最内层的 `Theme` Widget 优先生效。
- `Theme.withDefault()` 是 `new Theme({ data: Theme.dark(), child })` 的语法糖。

---

## 5. 综合示例

### 示例 1：各颜色模式的 ANSI 输出

```typescript
import { Color } from "@flitter/tui/screen/color";

// 默认色 -- 恢复终端默认
const def = Color.default();
def.toAnsi(true);   // "39" (默认前景)
def.toAnsi(false);  // "49" (默认背景)

// 命名色（16 色 ANSI）
const green = Color.green();         // 索引 2
green.toAnsi(true);                  // "32"
green.toAnsi(false);                 // "42"

const brightCyan = Color.brightCyan(); // 索引 14
brightCyan.toAnsi(true);              // "96"
brightCyan.toAnsi(false);             // "106"

// 256 色索引
const coral = Color.indexed(209);
coral.toAnsi(true);   // "38;5;209"
coral.toAnsi(false);  // "48;5;209"

// 24 位 RGB 真彩色
const teal = Color.rgb(0, 128, 128);
teal.toAnsi(true);   // "38;2;0;128;128"
teal.toAnsi(false);  // "48;2;0;128;128"
```

### 示例 2：构建完整的文本样式管线

```typescript
import { TextStyle } from "@flitter/tui/screen/text-style";
import { Color } from "@flitter/tui/screen/color";

// 定义基础样式
const heading = new TextStyle({
  bold: true,
  underline: true,
  foreground: Color.brightWhite(),
});

// 派生警告标题样式
const warningHeading = heading.copyWith({
  foreground: Color.yellow(),
});

// 合并额外装饰
const decoratedWarning = warningHeading.merge(
  new TextStyle({ italic: true })
);
// 结果: bold=true, underline=true, italic=true, foreground=yellow

// 生成 SGR 并输出
const sgr = decoratedWarning.toSgr();
// sgr = "1;3;4;33"
console.log(`\x1b[${sgr}m WARNING: 磁盘空间不足 \x1b[0m`);
```

### 示例 3：主题驱动的组件开发

```typescript
import { Theme } from "@flitter/tui/widgets/theme";
import { TextStyle } from "@flitter/tui/screen/text-style";
import { AppColorScheme } from "@flitter/tui/widgets/color-scheme";
import { Color } from "@flitter/tui/screen/color";

// 1. 定义应用主题
const appTheme = {
  colorScheme: AppColorScheme.fromRgb({
    primary:     { r: 66, g: 133, b: 244 },   // Google Blue
    success:     { r: 52, g: 168, b: 83 },     // Google Green
    warning:     { r: 251, g: 188, b: 4 },     // Google Yellow
    destructive: { r: 234, g: 67, b: 53 },     // Google Red
  }),
};

// 2. 在应用入口包裹主题
const app = new Theme({
  data: appTheme,
  child: rootWidget,
});

// 3. 子组件中使用主题颜色
class StatusBar extends StatelessWidget {
  build(context: BuildContext): Widget {
    const { colorScheme } = Theme.of(context);

    // 根据语义选择颜色，而非硬编码
    const okStyle = new TextStyle({
      foreground: colorScheme.success,
      bold: true,
    });

    const errStyle = new TextStyle({
      foreground: colorScheme.destructive,
      bold: true,
    });

    const infoStyle = new TextStyle({
      foreground: colorScheme.info,
      dim: true,
    });

    // ... 根据状态选择对应样式构建 UI
  }
}
```

### 示例 4：diffSgr 优化渲染流水线

```typescript
import { TextStyle } from "@flitter/tui/screen/text-style";
import { Color } from "@flitter/tui/screen/color";

// 模拟一行中多种样式的文本片段
const segments = [
  { text: "INFO ",    style: new TextStyle({ foreground: Color.cyan(), bold: true }) },
  { text: "2024-01 ", style: new TextStyle({ foreground: Color.brightBlack() }) },
  { text: "服务启动成功", style: new TextStyle({ foreground: Color.green() }) },
  { text: " [OK]",   style: new TextStyle({ foreground: Color.green(), bold: true }) },
];

// 使用 diffSgr 最小化转义序列输出
let prev = TextStyle.NORMAL;
let output = "";

for (const seg of segments) {
  const diff = seg.style.diffSgr(prev);
  if (diff) {
    output += `\x1b[${diff}m`;
  }
  output += seg.text;
  prev = seg.style;
}

// 末尾重置
output += "\x1b[0m";
process.stdout.write(output + "\n");
```
