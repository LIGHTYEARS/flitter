# Screen 子系统

> 双缓冲屏幕模型、单元格矩阵与 ANSI 差分渲染器。

---

## Screen

> 双缓冲屏幕，维护 front/back 两个 ScreenBuffer 并追踪脏区域。

```ts
import { Screen } from "@flitter/tui";

const screen = new Screen(80, 24);
screen.writeChar(0, 0, "H", boldStyle);
const output = renderer.render(screen);
screen.present();
```

**构造**

```ts
new Screen(width: number, height: number)
```

初始 `needsFullRefresh = true`，首帧执行全量刷新。

**属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `width` | `number` | 列数 |
| `height` | `number` | 行数 |
| `front` | `ScreenBuffer` | 前缓冲区——当前已显示内容（只读） |
| `back` | `ScreenBuffer` | 后缓冲区——绘制目标（只读） |
| `needsFullRefresh` | `boolean` | 是否需要全量刷新 |
| `cursorPosition` | `{ x, y } \| null` | 光标位置，null 表示未设置 |
| `cursorVisible` | `boolean` | 光标是否可见，默认 `true` |
| `cursorShape` | `number` | DECSCUSR 光标形状（0-6） |
| `defaultFg` | `RgbColor \| null` | 终端默认前景色 |
| `defaultBg` | `RgbColor \| null` | 终端默认背景色 |
| `indexRgbMap` | `(RgbColor \| null)[]` | 256 色调色板映射表 |

**方法**

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getCell(x, y)` | `Cell` | 从后缓冲区读取单元格 |
| `setCell(x, y, cell)` | `void` | 写入单元格，相同内容跳过 |
| `writeChar(x, y, char, style, width?)` | `void` | 写入字符（宽字符 width=2 时自动标记续位） |
| `fill(x, y, w, h, char, style)` | `void` | 填充矩形区域 |
| `mergeBorderChar(x, y, char, style)` | `void` | 写入边框字符（用于 box-drawing） |
| `clear()` | `void` | 清空后缓冲区并标记全量刷新 |
| `resize(w, h)` | `void` | 调整尺寸，保留交集内容 |
| `getDirtyRegions()` | `DirtyRegion[]` | 获取脏区域列表 |
| `present()` | `void` | back → front 提交帧，清除脏标记 |
| `setDefaultColors(fg, bg)` | `void` | 更新终端默认颜色 |
| `setIndexRgbMapping(indices)` | `void` | 更新 256 色调色板 |

---

## ScreenBuffer

> 二维 Cell 矩阵，终端屏幕的单层缓冲区。

**构造**

```ts
new ScreenBuffer(width: number, height: number)
```

所有单元格初始化为 `Cell.EMPTY`。

**方法**

| 方法 | 说明 |
|------|------|
| `getCell(x, y)` | 读取单元格，越界返回 `Cell.EMPTY` |
| `setCell(x, y, cell)` | 写入单元格，越界静默忽略 |
| `writeChar(x, y, char, style, width?)` | 写字符（自动继承父层背景色） |
| `fill(x, y, w, h, cell)` | 矩形填充 |
| `resize(newWidth, newHeight)` | 调整尺寸，保留交集 |
| `clear()` | 全部重置为 `Cell.EMPTY` |
| `copyTo(target)` | 拷贝到另一个同尺寸缓冲区 |

---

## Cell

> 终端屏幕缓冲区的最小单元，不可变。

**构造**

```ts
new Cell(char: string, style: TextStyle, width?: number, url?: string)
```

**属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `char` | `string` | 显示字符（续位占位符为空字符串） |
| `style` | `TextStyle` | 文本样式 |
| `width` | `number` | 显示宽度：1=普通，2=宽字符，0=续位占位符 |
| `url` | `string \| undefined` | OSC 8 超链接 URL |

**静态成员**

```ts
Cell.EMPTY  // 等价于 new Cell(" ", TextStyle.NORMAL, 1)
```

**实例方法**

```ts
cell.equals(other: Cell): boolean  // 值相等比较（char + style + width + url）
```

---

## ColorDepth

> 终端颜色深度枚举。

```ts
type ColorDepth = "16" | "256" | "truecolor"
```

| 值 | 说明 |
|----|------|
| `"16"` | 基础 16 色 ANSI |
| `"256"` | xterm 256 色调色板 |
| `"truecolor"` | 24 位真彩色 |

---

## AnsiRenderer

> ANSI 差分渲染器，将 Screen 变化区域转换为最小化转义序列字符串。

**构造**

```ts
new AnsiRenderer()
```

**方法**

| 方法 | 说明 |
|------|------|
| `render(screen)` | 差分渲染，返回 ANSI 字符串 |
| `renderFull(screen)` | 强制全屏刷新 |
| `renderCursor(screen)` | 仅生成光标控制序列 |
| `setColorDepth(depth)` | 设置颜色深度 |
| `getColorDepth()` | 获取当前颜色深度 |

---

## 转义序列常量

| 常量 | 值 | 说明 |
|------|----|------|
| `ESC` | `\x1b` | Escape 字符 |
| `CSI` | `\x1b[` | Control Sequence Introducer |
| `CUP(row, col)` | `\x1b[r;cH` | 光标绝对定位（0-based 转 1-based） |
| `SGR(...params)` | `\x1b[...m` | 字符属性设置 |
| `ALT_SCREEN_ON` | `\x1b[?1049h` | 启用备用屏幕缓冲区 |
| `ALT_SCREEN_OFF` | `\x1b[?1049l` | 禁用备用屏幕缓冲区 |
| `MOUSE_ON` | `\x1b[?1002h\x1b[?1003h\x1b[?1004h\x1b[?1006h` | 启用鼠标追踪（SGR 模式） |
| `MOUSE_OFF` | `\x1b[?1002l...` | 禁用鼠标追踪 |
| `PASTE_ON` / `PASTE_OFF` | `\x1b[?2004h/l` | Bracketed Paste 模式 |
| `HIDE_CURSOR` / `SHOW_CURSOR` | `\x1b[?25l/h` | 光标可见性 |
| `SET_CURSOR_SHAPE(n)` | `\x1b[n q` | DECSCUSR 光标形状（0-6） |
| `SYNC_START` / `SYNC_END` | `\x1b[?2026h/l` | 同步输出（防撕裂） |
| `KITTY_KEYBOARD_ON` / `OFF` | `\x1b[>7u` / `\x1b[<u` | Kitty 键盘协议（flags=7） |
| `MODIFY_OTHER_KEYS_ON` | `\x1b[>4;1m` | modifyOtherKeys 模式 1（非 tmux） |
| `MODIFY_OTHER_KEYS_ON_MODE2` | `\x1b[>4;2m` | modifyOtherKeys 模式 2（tmux） |
| `IN_BAND_RESIZE_ON` / `OFF` | `\x1b[?2048h/l` | 带内尺寸通知 |
| `EMOJI_WIDTH_ON` / `OFF` | `\x1b[?2027h/l` | Emoji 宽度模式 |
