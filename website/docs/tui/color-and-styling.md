# 颜色与样式

`Color` 和 `TextStyle` 是 Flitter 中最基础的视觉类型，几乎所有 Widget 都依赖它们。

## Color

`Color` 表示终端颜色。支持四种颜色模式：

| 模式 | 说明 | 终端支持 |
|------|------|---------|
| `default` | 终端默认色 | 所有终端 |
| `named` | 16 色命名色（索引 0-15） | 所有终端 |
| `index` | 256 色（索引 0-255） | 大多数现代终端 |
| `rgb` | 24-bit 真彩色 | iTerm2、kitty、WezTerm 等 |

### 创建颜色

```ts
// 终端默认色
Color.default()

// 16 色命名色
Color.black()        // 索引 0
Color.red()          // 索引 1
Color.green()        // 索引 2
Color.yellow()       // 索引 3
Color.blue()         // 索引 4
Color.magenta()      // 索引 5
Color.cyan()         // 索引 6
Color.white()        // 索引 7

// 亮色变体
Color.brightBlack()  // 索引 8（通常是灰色）
Color.brightRed()    // 索引 9
Color.brightGreen()  // 索引 10
Color.brightYellow() // 索引 11
Color.brightBlue()   // 索引 12
Color.brightMagenta()// 索引 13
Color.brightCyan()   // 索引 14
Color.brightWhite()  // 索引 15

// 256 色索引
Color.indexed(196)   // 亮红色
Color.indexed(46)    // 亮绿色

// 24-bit RGB 真彩色
Color.rgb(100, 149, 237)  // 矢车菊蓝
Color.rgb(255, 165, 0)    // 橙色
```

### 颜色属性

```ts
const c = Color.rgb(100, 149, 237);
c.kind   // "rgb"
c.r      // 100
c.g      // 149
c.b      // 237

const n = Color.red();
n.kind   // "named"
n.index  // 1

c.equals(Color.rgb(100, 149, 237))  // true
c.toAnsi(true)   // 前景色 ANSI 序列
c.toAnsi(false)  // 背景色 ANSI 序列
```

## TextStyle

`TextStyle` 定义文本的视觉样式，包括颜色和装饰。

### 创建样式

```ts
// 默认样式（无颜色，无装饰）
TextStyle.NORMAL

// 自定义样式
new TextStyle({
  foreground: Color.green(),      // 前景色
  background: Color.default(),    // 背景色
  bold: true,                     // 加粗
  italic: false,                  // 斜体
  underline: false,               // 下划线
  strikethrough: false,           // 删除线
  dim: false,                     // 暗淡
})
```

所有属性都是可选的，默认值为 `Color.default()` 和 `false`。

### 样式操作

```ts
const base = new TextStyle({ foreground: Color.white(), bold: true });

// copyWith：基于现有样式创建新样式
const warning = base.copyWith({ foreground: Color.yellow() });
// → bold: true, foreground: yellow

// merge：合并两个样式（other 的非默认值覆盖）
const merged = base.merge(new TextStyle({ italic: true }));
// → bold: true, italic: true, foreground: white
```

### 常用样式组合

```ts
// 标题样式
new TextStyle({ foreground: Color.cyan(), bold: true })

// 错误提示
new TextStyle({ foreground: Color.red(), bold: true })

// 代码高亮 - 关键字
new TextStyle({ foreground: Color.magenta() })

// 代码高亮 - 字符串
new TextStyle({ foreground: Color.yellow() })

// 代码高亮 - 注释
new TextStyle({ foreground: Color.brightBlack(), italic: true, dim: true })

// 链接样式
new TextStyle({ foreground: Color.blue(), underline: true })

// 选中文本
new TextStyle({
  foreground: Color.white(),
  background: Color.rgb(60, 60, 90),
})
```

## 在 Widget 中使用

### Text

```ts
new Text({
  data: 'Hello World',
  style: new TextStyle({ bold: true, foreground: Color.green() }),
})
```

### RichText + TextSpan

```ts
new RichText({
  text: new TextSpan({
    children: [
      new TextSpan({
        text: 'const ',
        style: new TextStyle({ foreground: Color.magenta() }),
      }),
      new TextSpan({
        text: 'greeting',
        style: new TextStyle({ foreground: Color.cyan() }),
      }),
      new TextSpan({
        text: ' = ',
        style: new TextStyle({ foreground: Color.white() }),
      }),
      new TextSpan({
        text: '"Hello"',
        style: new TextStyle({ foreground: Color.yellow() }),
      }),
    ],
  }),
})
```

TextSpan 支持嵌套——子 span 继承父 span 的样式，再覆盖自己的属性。

### Container 背景色

```ts
new Container({
  decoration: new BoxDecoration({ color: Color.rgb(30, 30, 40) }),
  child: new Text({ data: '深色背景' }),
})
```

### 边框颜色

```ts
new Container({
  decoration: new BoxDecoration({
    border: Border.all(new BorderSide(Color.blue(), 1, 'rounded')),
  }),
  child: new Text({ data: '蓝色边框' }),
})
```

## ANSI 渲染细节

TextStyle 通过 SGR（Select Graphic Rendition）序列控制终端输出：

| 装饰 | SGR 参数 | 终端效果 |
|------|---------|---------|
| `bold` | `1` | 加粗（或高亮前景色） |
| `dim` | `2` | 暗淡 |
| `italic` | `3` | 斜体（部分终端不支持） |
| `underline` | `4` | 下划线 |
| `strikethrough` | `9` | 删除线（部分终端不支持） |

渲染器使用 `diffSgr(previous)` 方法计算最小 SGR 差异，避免重复输出不变的样式属性。
