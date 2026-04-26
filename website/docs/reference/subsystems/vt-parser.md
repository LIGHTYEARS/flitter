# VT 解析器子系统

> 原始字节流 → VT 低层事件 → 语义化输入事件的两级解析管线。

---

## VtParser

> 字节流状态机，将原始终端字节解析为结构化 VtEvent。

逆向自 VT500 标准状态机，支持跨 `parse()` 调用的状态持久化。

**构造**

```ts
import { VtParser } from "@flitter/tui";
new VtParser()
```

**方法**

| 方法 | 说明 |
|------|------|
| `onEvent(cb: (evt: VtEvent) => void)` | 注册事件回调 |
| `parse(data: Buffer)` | 解析字节块，触发零个或多个事件回调 |
| `reset()` | 重置状态机到 `ground` 状态 |

### VtEvent 类型

```ts
type VtEvent =
  | VtPrintEvent      // 可显示字形簇
  | VtCsiEvent        // CSI 序列：ESC [ params final
  | VtEscapeEvent     // ESC 序列：ESC intermediates final
  | VtOscEvent        // OSC 序列：ESC ] data ST
  | VtDcsEvent        // DCS 序列：ESC P ... ST
  | VtApcEvent        // APC 序列：ESC _ data ST
```

**VtPrintEvent**

```ts
{ type: "print", grapheme: string }
// grapheme 为完整 Unicode 字形簇（包括 Emoji ZWJ 序列）
```

**VtCsiEvent**

```ts
{
  type: "csi",
  params: CsiParam[],       // 参数列表（支持子参数，如 "4:3"）
  intermediates: string,    // 中间字节，如 " "
  private_marker: string,   // 私有标记，如 "?" "<"
  final: string,            // 终止字节，如 "A" "m" "h"
}
```

**CsiParam**

```ts
interface CsiParam {
  value: number;           // -1 表示省略（使用默认值）
  subparams?: number[];    // 冒号分隔的子参数
}
```

示例：CSI `38;2;255;0;0 m` → `[{value:38}, {value:2}, {value:255}, {value:0}, {value:0}]`

**VtEscapeEvent**

```ts
{ type: "escape", intermediates: string, final: string }
```

**VtOscEvent / VtDcsEvent / VtApcEvent**

```ts
{ type: "osc" | "dcs" | "apc", data: string, /* dcs 额外包含 params/intermediates/final */ }
```

---

## InputParser

> 将 VtEvent 转换为面向 Widget 层的语义化 InputEvent。

同时在 `feed()` 方法中直接拦截 C0 控制字符（0x00–0x1F），在交给 VtParser 之前转换为对应的 KeyEvent。

**构造**

```ts
import { InputParser } from "@flitter/tui";
new InputParser()
```

**方法**

| 方法 | 说明 |
|------|------|
| `onInput(cb: (evt: InputEvent) => void)` | 注册输入事件回调 |
| `feed(data: Buffer)` | 处理原始字节（推荐路径，自动处理 C0） |
| `handleVtEvent(evt: VtEvent)` | 手动传入 VtEvent（测试/自定义路径） |
| `reset()` | 重置 paste 缓冲区和 VtParser 状态 |

### InputEvent 类型

```ts
type InputEvent =
  | KeyEvent               // 键盘按键
  | MouseEvent             // 鼠标操作
  | PasteEvent             // Bracketed Paste
  | FocusEvent             // 终端焦点获得/失去
  | ResizeEvent            // 终端尺寸变化（SIGWINCH 路径）
  | InbandResizeEvent      // 带内尺寸通知（DEC ?2048）
  | CursorPositionEvent    // CPR 响应（ESC [ row ; col R）
  | KittyKeyboardResponseEvent  // Kitty 键盘协议能力响应
```

---

## KeyEvent

```ts
interface KeyEvent {
  type: "key";
  key: string;           // 逻辑键名："Enter" "ArrowUp" "a" "F1" 等
  modifiers: Modifiers;
}
```

---

## MouseEvent

```ts
interface MouseEvent {
  type: "mouse";
  x: number;             // 列位置（0 起始）
  y: number;             // 行位置（0 起始）
  button: "left" | "middle" | "right" | "none";
  action: "press" | "release" | "move" | "wheel_up" | "wheel_down";
  modifiers: Modifiers;
}
```

### SGR 鼠标协议解码

终端以 `ESC [ < button;col;row M` （按下）或 `... m`（释放）格式上报鼠标事件。

```
ESC [ < 0 ; 10 ; 5 M   →  left press  at col=10, row=5 (0-based: x=9, y=4)
ESC [ < 0 ; 10 ; 5 m   →  left release
ESC [ < 32 ; 10 ; 5 M  →  left drag (move with button held)
ESC [ < 64 ; 10 ; 5 M  →  wheel up
ESC [ < 65 ; 10 ; 5 M  →  wheel down
```

button 字段低 2 位为按键（0=左键，1=中键，2=右键，3=无按键），高位为修饰键和拖动标志。

---

## PasteEvent / FocusEvent / InbandResizeEvent

```ts
interface PasteEvent   { type: "paste"; text: string }
interface FocusEvent   { type: "focus"; focused: boolean }
interface InbandResizeEvent {
  type: "inband_resize";
  width: number; height: number;
  pixelWidth: number; pixelHeight: number;
}
```

---

## Modifiers

```ts
interface Modifiers {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}

const MODIFIERS_NONE: Readonly<Modifiers>  // 所有修饰键均为 false 的共享常量

function hasModifier(m: Modifiers): boolean  // 判断是否有任意修饰键按下
```

### modifierFromCsiParam

CSI 修饰键参数编码规则：`param = 1 + bitmask`

| 参数值 | 修饰键 |
|--------|--------|
| 1 | 无（MODIFIERS_NONE） |
| 2 | Shift |
| 3 | Alt |
| 5 | Ctrl |
| 6 | Ctrl+Shift |
| 9 | Meta |

```ts
import { modifierFromCsiParam } from "@flitter/tui";

const mods = modifierFromCsiParam(6);
// → { shift: true, alt: false, ctrl: true, meta: false }
```

---

## CursorPositionEvent / KittyKeyboardResponseEvent

```ts
interface CursorPositionEvent {
  type: "cursor_position";
  row: number;  // 1-based，来自 CPR 响应
  col: number;  // 1-based
}

interface KittyKeyboardResponseEvent {
  type: "kitty_keyboard_response";
  flags: number;  // 终端上报的协议标志位
}
```

`CursorPositionEvent` 由 TuiController 路由到 QueryParser，用于检测 Kitty 显式字符宽度支持。
