# Amp TUI 深度分析 #4: InputParser 终端协议解析全对比

> 基于 Amp CLI v0.0.1774512763 (Bun standalone binary) 混淆 JS 逆向 + flitter-core 源码的指令级对比。
> 分析范围: 转义序列解析状态机、CSI/SS3/OSC/DCS 序列、Kitty 键盘协议、鼠标协议、粘贴模式、修饰键、终端能力检测。
> 分析日期: 2026-03-29

---

## 1. Amp 实现细节

### 1.1 核心解析器 — emitKeys 状态机

Amp 使用 Bun/Node readline 风格的 `emitKeys` 生成器函数解析 stdin 转义序列。混淆代码位于 `amp-strings.txt:241761`。

#### 1.1.1 状态机状态

Amp 的 emitKeys 不是显式的 enum 状态机，而是通过 generator 函数中的控制流隐式表达状态。还原后的状态等价于:

```
Idle          → 等待下一个字符
Escape        → 收到 ESC (0x1B)，等待后续字节
CSI           → 收到 ESC [，收集参数字节直到终止符
SS3           → 收到 ESC O，收集一个终止字母
Paste         → 收到 [200~，收集文本直到 [201~
```

#### 1.1.2 CSI 序列解析

Amp 的 CSI 解析通过两个核心正则完成（`amp-strings.txt:241795, 241800`）:

```js
// 数字终止类: "11~", "2;5~", "200~" 等
/^(?:(\d\d?)(?:;(\d+))?([~^$])|(\d{3}~))$/

// 字母终止类: "A", "1;5A", "5A" 等
/^((\d+;)?(\d+))?([A-Za-z])$/
```

参数收集阶段: 收集 0x30-0x3F 范围字节（数字、分号、`<`、`?`），以及中间字节 `[`（用于 Linux console 双括号功能键 `[[A`）。

终止字节: 0x40-0x7E（标准 CSI final byte），加上 `$` (0x24, rxvt 风格 shift 终止符)。

#### 1.1.3 修饰键解码

Amp 使用标准 xterm 修饰键编码（`amp-strings.txt:241805`）:

```
modifier = (param || 1) - 1
bit 0 = Shift   (1)
bit 1 = Alt     (2)
bit 2 = Ctrl    (4)
bit 3 = Meta    (8)
```

示例: `\e[1;5A` → param=5, modifier=4 → Ctrl+ArrowUp

#### 1.1.4 SS3 序列处理

Amp 处理 ESC O 后的单字母终止符:
- `OA-OD`: 方向键 (up/down/right/left)
- `OE`: clear, `OF`: end, `OH`: home
- `OP-OS`: F1-F4
- `Oa-Oe`: rxvt 风格 Ctrl+方向键

SS3 也支持可选的数字修饰前缀（如 `ESC O 5 A` = Ctrl+ArrowUp）。

#### 1.1.5 SGR 鼠标解析

Amp **仅**支持 SGR 鼠标协议 (DECSET 1006):

```
正则: /^<(\d+);(\d+);(\d+)$/
格式: \e[<button;col;row M/m
```

按钮编码 (Cb 字段):
- 0=左键, 1=中键, 2=右键
- 64=滚轮上, 65=滚轮下, 66=滚轮左, 67=滚轮右
- +4=Shift, +8=Alt, +16=Ctrl, +32=Motion

终止符: `M`=按下/移动, `m`=释放

#### 1.1.6 粘贴模式 (Bracketed Paste)

Amp 通过检测 `\e[200~` 进入粘贴状态，收集所有字节直到 `\e[201~`:

```
开始: \e[200~ → 进入 paste 状态
收集: 所有字符累加到 paste buffer
结束: 检测到 \e[201~ → 截断结束标记 → emit PasteEvent
```

#### 1.1.7 焦点事件

Amp 解析 DECSET 1004 的焦点报告:
- `\e[I` → focus in
- `\e[O` → focus out

#### 1.1.8 Escape 超时机制

Amp 使用 500ms 超时（`amp-strings.txt:242115`, 常量 `ESCAPE_CODE_TIMEOUT`）。当收到单独的 ESC 字节后，如果 500ms 内无后续字节，则作为裸 Escape 键事件发出。

#### 1.1.9 键码映射表

Amp 的键码映射从 `amp-strings.txt:241805-242030` 的 switch 语句中还原:

**数字码 (tilde-terminated)**:
| 代码 | 键名 |
|------|------|
| 1 | home |
| 2 | insert |
| 3 | delete |
| 4 | end |
| 5 | pageup |
| 6 | pagedown |
| 7 | home (rxvt) |
| 8 | end (rxvt) |
| 11-14 | f1-f4 |
| 15 | f5 |
| 17-19 | f6-f8 |
| 20-21 | f9-f10 |
| 23-24 | f11-f12 |
| 200 | paste start |
| 201 | paste end |

**字母终止码 (CSI)**:
| 代码 | 键名 |
|------|------|
| [A-D | up/down/right/left |
| [E | clear |
| [F | end |
| [H | home |
| [P-S | f1-f4 |
| [Z | shift+tab |

**Linux console 双括号**:
| 代码 | 键名 |
|------|------|
| [[A-[[E | f1-f5 |

**rxvt 移位变体** (`$` 终止 = shift):
`[a-e` → shift + up/down/right/left/clear

**rxvt Ctrl 变体** (`^` 终止 / SS3 小写):
`[2^`-`[8^` → ctrl + insert/delete/pageup/pagedown/home/end
`Oa-Oe` → ctrl + up/down/right/left/clear

#### 1.1.10 协议启用/禁用

Amp `wB0.init()` 启用:
```
\e[?1002h   Button Event Tracking
\e[?1003h   Any Event Tracking
\e[?1004h   Focus Event Reporting
\e[?1006h   SGR Mouse Mode
\e[?2004h   Bracketed Paste
\e[?1049h   Alt Screen
\e[>5u      Kitty Keyboard (progressive enhancement flags=5)
\e[>4;1m    ModifyOtherKeys mode 1
```

Amp `zG8` cleanup 禁用:
```
\e[<u       Kitty Keyboard off
\e[>4;0m    ModifyOtherKeys off
\e[?2027l   Emoji width off
\e[?2048l   In-band resize off
\e]9;4;0\e\\ Progress bar off
\e[?1002l   Button Event off
\e[?1003l   Any Event off
\e[?1004l   Focus Event off
\e[?1006l   SGR Mouse off
\e[?1016l   Pixel Mouse off
\e[?2004l   Bracketed Paste off
\e[?1049l   Alt Screen off
\e[0 q      Cursor shape default
\e[?25h     Cursor show
\e[0m       SGR reset
\e]8;;\e\\  Hyperlink close
```

#### 1.1.11 Amp 不支持的协议

从混淆源码分析，Amp 的 emitKeys 生成器**不**解析以下序列:
- **X10 鼠标** (`\e[M` + 3 raw bytes): 不支持
- **URxvt 鼠标** (`\e[Cb;Cx;CyM` decimal without `<`): 不支持
- **OSC 序列** (`\e]...ST`): emitKeys 层面不解析（由其他模块处理 ANSI 输出渲染）
- **DCS 序列** (`\eP...ST`): emitKeys 层面不解析
- **APC 序列** (`\e_...ST`): 不解析
- **Kitty keyboard CSI u** (`\e[codepoint;modifiers u`): emitKeys 不显式处理此格式

**关于 Kitty keyboard 的关键发现**: Amp 虽然在初始化时发送 `\e[>5u` 启用 Kitty keyboard protocol (flags=5, 表示所有 progressive enhancement)，但其 emitKeys 解析器并没有显式解析 Kitty 特有的 `CSI unicode-codepoint ; modifiers u` 格式。这是因为:

1. Kitty protocol flags=5 启用的是 **progressive enhancement**——终端在兼容模式下编码大多数键，仅对传统编码有歧义的键使用 CSI u 格式
2. 标准方向键、功能键等在 Kitty protocol 下仍使用传统 CSI 序列
3. 对于 CSI u 格式的序列（如 `\e[97;1u` = 'a'），emitKeys 的正则 `CSI_LETTER_RE` 会将 `u` 作为字母终止符匹配，但不会正确解码 codepoint——这些序列会落入 "unknown CSI" 路径

### 1.2 终端能力检测

Amp 的 `vF` queryParser 解析终端响应:

| 查询 | 序列 | 响应格式 |
|------|------|---------|
| DA1 | `\e[c` | `\e[?Ps;Ps;...c` |
| DA2 | `\e[>c` | `\e[>Ps;Ps;Psc` |
| Kitty Keyboard | `\e[?u` | `\e[?flagsu` |
| Kitty Graphics | `\e]G...ST` | `\e_G...ST` |
| XTVERSION | `\e[>0q` | `\ePR\|version-stringESC\\` |
| Color | `\e]10;?ST` / `\e]11;?ST` | `\e]Ps;rgb:rr/gg/bbST` |

---

## 2. Flitter 实现细节

### 2.1 InputParser 状态机

**文件**: [input-parser.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts)

flitter-core 实现了一个推送式 (push-based) 状态机 `InputParser` 类（vs Amp 的 generator-based 拉取式）。5 个显式状态通过 TypeScript const enum 定义:

```typescript
const enum ParserState {
  Idle,     // 等待下一个字符
  Escape,   // 收到 ESC
  CSI,      // ESC [ 内
  SS3,      // ESC O 内
  Paste,    // 粘贴模式
}
```

[ParserState 定义](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L19-L30)

主入口 `feed(data)` 逐字符调用 `_processChar(char)` 分发到对应状态处理器:
[feed 方法](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L77-L84)

### 2.2 CSI 序列解析

**参数收集**: [_processCSI](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L227-L251)

收集 0x30-0x3F 范围字节（包括 `<`, `?`, `;`, 数字）和 `[` 前缀（Linux console）。

**终止字节**: 0x40-0x7E 加 `$` (0x24)。

**CSI 解析正则**: [CSI_NUMERIC_RE 和 CSI_LETTER_RE](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L35-L39)

```typescript
const CSI_NUMERIC_RE = /^(?:(\d\d?)(?:;(\d+))?([~^$])|(\d{3}~))$/;
const CSI_LETTER_RE = /^((\d+;)?(\d+))?([A-Za-z])$/;
```

**CSI 解析流程** [_resolveCSI](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L256-L320):
1. SGR 鼠标检测: `params.startsWith('<')` + final `M/m`
2. 焦点事件: params="" + final `I`/`O`
3. 粘贴边界: `200~` / `201~`
4. Linux console 双括号: `params.startsWith('[')`
5. 数字码正则匹配
6. 字母码正则匹配
7. 未知序列 → emit `Undefined`

### 2.3 SS3 序列处理

**文件**: [_processSS3](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L446-L499)

SS3 状态收集可选数字（修饰符前缀），然后匹配终止字母:
- 标准映射 (`SS3_CODE_MAP`): OA-OD (方向), OE (clear), OF (end), OH (home), OP-OS (F1-F4)
- rxvt Ctrl 变体 (`RXVT_CTRL_SS3_MAP`): Oa-Oe (ctrl+方向/clear)

### 2.4 SGR 鼠标解析

**文件**: [_parseSGRMouse](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L531-L555) + [mouse.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/mouse.ts)

```typescript
const SGR_MOUSE_RE = /^<(\d+);(\d+);(\d+)$/;
```

解析后调用三个辅助函数:
- [extractMouseModifiers](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/mouse.ts#L39-L51): 位掩码 Shift(4)/Alt(8)/Ctrl(16)/Motion(32)
- [extractBaseButton](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/mouse.ts#L62-L68): 剥离修饰位，保留按钮 ID
- [determineMouseAction](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/mouse.ts#L76-L98): `m`→release, 64-67→scroll, bit5→move, else→press

坐标转换: SGR 1-based → 0-based (col-1, row-1)

### 2.5 粘贴模式

**文件**: [_processPaste](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L505-L522)

粘贴模式使用字符串后缀检测结束标记:

```typescript
const PASTE_END = '\x1b[201~';
if (this._pasteBuffer.endsWith(PASTE_END)) {
  const text = this._pasteBuffer.slice(0, -PASTE_END.length);
  // ...emit PasteEvent
}
```

### 2.6 修饰键解码

**文件**: [_decodeModifier](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L601-L613)

```typescript
private _decodeModifier(modifier: number) {
  return {
    shift: !!(modifier & 1),
    alt:   !!(modifier & 2),
    ctrl:  !!(modifier & 4),
    meta:  !!(modifier & 8),
  };
}
```

与 Amp 的 xterm 标准位编码完全一致。

### 2.7 单字符处理

**文件**: [_emitSingleChar](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L133-L177)

处理逻辑:
- `\r` / `\n` → Enter
- `\t` → Tab
- `\b` / 0x7F → Backspace
- ` ` → Space
- 0x01-0x1A → Ctrl + 对应字母 (code + 0x60)
- 0x41-0x5A → shift=true + 小写化
- 其他可打印 ASCII → 直接作为 key
- Unicode 字符 → 直接作为 key

### 2.8 Alt/Meta 键处理

**文件**: [_processEscape](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L183-L220)

ESC + 非序列字符 = Alt 修饰: 进入 `_emitSingleChar(char, code, meta=true)`

双 ESC: 第一个 ESC 作为 Escape 键发出，第二个 ESC 开始新的 escape 序列。

### 2.9 Escape 超时

**文件**: [_startEscapeTimeout](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L561-L568)

超时值: `ESCAPE_TIMEOUT_MS = 500`，与 Amp 完全一致。

提供 `flushEscapeTimeout()` 方法用于测试中强制触发超时。

### 2.10 事件类型

**文件**: [events.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/events.ts)

```typescript
type InputEvent = KeyEvent | MouseEvent | ResizeEvent | FocusEvent | PasteEvent;
```

| 事件 | 字段 | 说明 |
|------|------|------|
| KeyEvent | key, ctrlKey, altKey, shiftKey, metaKey, sequence | 键盘事件 |
| MouseEvent | action, button, x, y, ctrlKey, altKey, shiftKey | 鼠标事件 |
| ResizeEvent | width, height | 终端尺寸变化 |
| FocusEvent | focused | 焦点获得/失去 |
| PasteEvent | text | 粘贴内容 |

### 2.11 键名映射

**文件**: [keyboard.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/keyboard.ts#L119-L137)

低级名 → TUI 级名映射 (`LOW_LEVEL_TO_TUI_KEY`):

```
up → ArrowUp, down → ArrowDown, left → ArrowLeft, right → ArrowRight
home → Home, end → End, pageup → PageUp, pagedown → PageDown
insert → Insert, delete → Delete, clear → Clear
enter → Enter, tab → Tab, escape → Escape, backspace → Backspace, space → Space
```

### 2.12 终端能力检测

**文件**: [platform.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L309-L500)

**查询序列**:
- [DA1_QUERY](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L319): `\e[c`
- [DA2_QUERY](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L322): `\e[>c`
- [DA3_QUERY](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L325): `\e[=c`
- [DSR_QUERY](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L328): `\e[5n`
- [KITTY_KEYBOARD_QUERY](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L332): `\e[?u`
- [KITTY_GRAPHICS_QUERY](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L336): `\e]G\x1fq=1;...ST`
- [XTVERSION_QUERY](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L339): `\e[>0q`
- [FG_COLOR_QUERY](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L342) / [BG_COLOR_QUERY](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L343): `\e]10;?ST` / `\e]11;?ST`

**响应解析正则** [CAPABILITY_RESPONSE_PATTERNS](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L350-L369):

| 模式 | 正则 |
|------|------|
| DA1 | `\x1b\[\?([0-9;]+)c` |
| DA2 | `\x1b\[>([0-9;]+)c` |
| DA3 | `\x1bP!\|([0-9a-fA-F]+)\x1b\\` |
| DSR | `\x1b\[0n` |
| Kitty KB | `\x1b\[\?(\d+)u` |
| Kitty GFX | `\x1b_G([^\x1b]*)\x1b\\` |
| XTVERSION | `\x1bP>\|([^\x1b]*)\x1b\\` |
| Color | `\x1b\](\d+);rgb:([0-9a-fA-F/]+)` |
| DECRPM | `\x1b\[\?(\d+);(\d+)\$y` |

**解析函数**: [parseCapabilityResponse](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/platform.ts#L429-L500) 一次性解析所有已知响应模式。

### 2.13 协议启用/禁用

**文件**: [renderer.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/renderer.ts#L59-L101)

| 协议 | 启用 | 禁用 | TPRO 编号 |
|------|------|------|-----------|
| Kitty Keyboard | `\e[>5u` | `\e[<u` | TPRO-01 |
| ModifyOtherKeys | `\e[>4;1m` | `\e[>4;0m` | TPRO-02 |
| Emoji Width | `\e[?2027h` | `\e[?2027l` | TPRO-03 |
| In-Band Resize | `\e[?2048h` | `\e[?2048l` | TPRO-04 |
| Progress Bar | `\e]9;4;3ST` (indeterminate) | `\e]9;4;0ST` | TPRO-05 |
| Window Title | `\e]0;titleBEL` | — | TPRO-06 |
| Mouse Shape | `\e]22;nameST` | — | TPRO-07 |
| Pixel Mouse | `\e[?1016h` | `\e[?1016l` | TPRO-08 |
| Mouse Tracking | `\e[?1003h\e[?1006h` | `\e[?1003l\e[?1006l` | — |
| Bracketed Paste | `\e[?2004h` | `\e[?2004l` | — |

**清理函数**: [terminalCleanup](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/terminal-cleanup.ts#L41-L65) 严格遵循 Amp 的 `zG8` 清理顺序。

### 2.14 Input Bridge

**文件**: [input-bridge.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-bridge.ts)

`InputBridge` 连接 `InputParser` → `EventDispatcher`:
```
stdin → InputBridge.feed() → InputParser.feed() → callback → EventDispatcher.dispatch()
```

支持 `attachStdin(process.stdin)` 自动绑定 `'data'` 事件。

### 2.15 测试覆盖

**文件**: [input-parser.test.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/__tests__/input-parser.test.ts)

872 行测试代码，覆盖:
- 单字符 (printable, control, special)
- 方向键 (CSI + SS3 两种编码)
- 功能键 (F1-F12, numeric/SS3/CSI letter/Linux console 四种编码)
- 导航键 (Home/End/Insert/Delete/PageUp/PageDown, 多种编码变体)
- 修饰键组合 (Ctrl/Shift/Alt/Meta + 方向键/功能键/导航键)
- rxvt 风格变体 (shift `$`, ctrl `^`, shift 小写, ctrl SS3 小写)
- SGR 鼠标 (press/release/scroll/move, 修饰键, 坐标转换, 大坐标)
- 粘贴模式 (简单/空/换行/特殊字符)
- Escape 超时 (flush/real timeout)
- Alt/Meta (ESC+字符, ESC+Enter)
- 焦点事件 (focus in/out)
- 逐字节输入 (CSI/SGR/功能键/修饰键/粘贴 逐字符 feed)
- 混合序列
- 双 ESC
- Buffer 输入
- dispose 清理

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **状态机架构** | Generator-based (emitKeys yield), 隐式状态 | Push-based class (InputParser.feed), 显式 ParserState enum | 🟡 微差 | 行为等价，flitter 的 push-based 更适合 Node/Bun stream 模型 |
| **CSI 参数收集范围** | 0x30-0x3F + `[` | 0x30-0x3F + `[` | 🟢 一致 | 完全相同的字节范围 |
| **CSI 终止字节** | 0x40-0x7E + `$` (0x24) | 0x40-0x7E + `$` (0x24) | 🟢 一致 | 包含 rxvt 的 `$` 终止符 |
| **CSI 数字码正则** | `/^(?:(\d\d?)(?:;(\d+))?([~^$])│(\d{3}~))$/` | 完全相同 | 🟢 一致 | 1:1 复刻 |
| **CSI 字母码正则** | `/^((\d+;)?(\d+))?([A-Za-z])$/` | 完全相同 | 🟢 一致 | 1:1 复刻 |
| **SGR 鼠标正则** | `/^<(\d+);(\d+);(\d+)$/` | 完全相同 | 🟢 一致 | 仅支持 SGR 编码 |
| **X10 鼠标** | ❌ 不支持 | ❌ 不支持 | 🟢 一致 | 两者均未实现 raw byte 解码 |
| **URxvt 鼠标** | ❌ 不支持 | ❌ 不支持 | 🟢 一致 | 两者均未实现 decimal 编码 |
| **SS3 标准映射** | OA-OD, OE, OF, OH, OP-OS | 完全相同 (SS3_CODE_MAP) | 🟢 一致 | |
| **SS3 rxvt Ctrl** | Oa-Oe → ctrl+方向/clear | 完全相同 (RXVT_CTRL_SS3_MAP) | 🟢 一致 | |
| **rxvt shift `$`** | `[2$`-`[8$` → shift+nav | 完全相同 | 🟢 一致 | |
| **rxvt ctrl `^`** | `[2^`-`[8^` → ctrl+nav | 完全相同 | 🟢 一致 | |
| **rxvt shift 小写** | `[a-e` → shift+方向/clear | 完全相同 (RXVT_SHIFT_MAP) | 🟢 一致 | |
| **Linux console 双括号** | `[[A`-`[[E` → f1-f5 | 完全相同 (LINUX_CONSOLE_FKEY_MAP) | 🟢 一致 | |
| **修饰键位编码** | bit0=Shift, bit1=Alt, bit2=Ctrl, bit3=Meta | 完全相同 (_decodeModifier) | 🟢 一致 | xterm 标准 |
| **Escape 超时** | 500ms (ESCAPE_CODE_TIMEOUT) | 500ms (ESCAPE_TIMEOUT_MS) | 🟢 一致 | |
| **双 ESC 处理** | 第一个作为 Escape 键，第二个开启新序列 | 完全相同 | 🟢 一致 | |
| **Alt/Meta 编码** | ESC + char → meta=true | 完全相同 | 🟢 一致 | |
| **单字符 Ctrl** | 0x01-0x1A → ctrl + 对应字母 | 完全相同 | 🟢 一致 | code + 0x60 |
| **大写字母处理** | shift=true + 小写化 | 完全相同 | 🟢 一致 | |
| **Enter 映射** | \r 和 \n 均映射为 enter | 完全相同 | 🟢 一致 | |
| **Backspace** | 0x08 和 0x7F 均为 backspace | 完全相同 | 🟢 一致 | |
| **粘贴模式** | [200~ 开始, [201~ 结束 | 完全相同 | 🟢 一致 | 字符串后缀检测 |
| **焦点事件** | `\e[I` / `\e[O` | 完全相同 | 🟢 一致 | |
| **Unicode 字符** | 直接作为 key | 直接作为 key | 🟢 一致 | feed() 使用 `for..of` 按 codepoint 迭代 |
| **键名映射** | emitKeys 内部 → 上层映射 | LOW_LEVEL_TO_TUI_KEY 表 | 🟢 一致 | 映射值完全相同 |
| **Mouse 按钮常量** | 0-2, 64-67 | MouseButton.Left(0)..ScrollRight(67) | 🟢 一致 | |
| **Mouse 修饰位** | Shift(4), Alt(8), Ctrl(16), Motion(32) | MouseModifier 完全相同 | 🟢 一致 | |
| **Mouse 坐标** | 1-based → 0-based | 1-based → 0-based | 🟢 一致 | |
| **Mouse 动作判定** | m→release, 64-67→scroll, bit5→move, else→press | 完全相同 | 🟢 一致 | |
| **OSC 输入解析** | emitKeys 不解析 OSC | InputParser 不解析 OSC | 🟢 一致 | OSC 由 ansi-parser.ts 处理输出渲染 |
| **DCS 输入解析** | emitKeys 不解析 DCS | InputParser 不解析 DCS | 🟢 一致 | |
| **Kitty KB 启用** | `\e[>5u` (flags=5) | `\e[>5u` (KITTY_KEYBOARD_ON) | 🟢 一致 | progressive enhancement mode 5 |
| **Kitty KB 禁用** | `\e[<u` | `\e[<u` (KITTY_KEYBOARD_OFF) | 🟢 一致 | |
| **Kitty CSI u 解析** | ❌ emitKeys 不显式解码 CSI u 格式 | ❌ InputParser 不显式解码 CSI u 格式 | 🟡 共同缺陷 | 两者都启用 Kitty KB 但不解析其特有编码 |
| **Kitty KB 查询** | `\e[?u` → 解析响应 `\e[?flagsu` | KITTY_KEYBOARD_QUERY + CAPABILITY_RESPONSE_PATTERNS.kittyKeyboard | 🟢 一致 | |
| **DA1/DA2 查询** | vF queryParser 解析 | parseCapabilityResponse 解析 | 🟢 一致 | |
| **DA3 查询** | vF 解析 `\ePR!\|hex\e\\` | DA3_QUERY + 正则 | 🟢 一致 | |
| **XTVERSION 查询** | vF 解析 `\ePR>\|version\e\\` | XTVERSION_QUERY + 正则 | 🟢 一致 | |
| **Color 查询** | vF 解析 OSC 10/11 响应 | FG/BG_COLOR_QUERY + colorResponse 正则 | 🟢 一致 | |
| **DECRPM 解析** | vF 解析 `\e[?Pd;Ps$y` | modeReport 正则 | 🟢 一致 | |
| **DSR 查询** | `\e[5n` → 检测 `\e[0n` | DSR_QUERY + dsr 正则 | 🟢 一致 | |
| **Kitty GFX 查询** | 发送查询解析响应 | KITTY_GRAPHICS_QUERY + kittyGraphics 正则 | 🟢 一致 | |
| **ModifyOtherKeys** | `\e[>4;1m` / `\e[>4;0m` | MODIFY_OTHER_KEYS_ON/OFF | 🟢 一致 | |
| **Emoji Width** | `\e[?2027h` / `\e[?2027l` | EMOJI_WIDTH_ON/OFF | 🟢 一致 | |
| **In-Band Resize** | `\e[?2048h` / `\e[?2048l` | IN_BAND_RESIZE_ON/OFF | 🟢 一致 | |
| **Progress Bar** | OSC 9;4;N | PROGRESS_BAR_OFF/INDETERMINATE/PAUSED | 🟢 一致 | |
| **Window Title** | OSC 0 | windowTitle() | 🟢 一致 | |
| **Mouse Shape** | OSC 22 | mouseShape() | 🟢 一致 | |
| **Pixel Mouse** | 仅在 cleanup 禁用 1016 | 有 enable/disable API + cleanup 禁用 | 🟡 微差 | flitter 多了 TPRO-08 API |
| **OSC 52 Clipboard** | 未确认 | Renderer.copyToClipboard() | 🟡 微差 | flitter 额外支持 |
| **Cleanup 顺序** | zG8: KB→visual→mouse→paste→screen→cursor→SGR→hyperlink | terminalCleanup: 完全相同顺序 | 🟢 一致 | |
| **InputBridge 架构** | stdin→emitKeys→Pg.dispatch | stdin→InputBridge→InputParser→EventDispatcher | 🟢 一致 | 三层管线完全对齐 |
| **事件类型** | key/mouse/resize/focus/paste | KeyEvent/MouseEvent/ResizeEvent/FocusEvent/PasteEvent | 🟢 一致 | 5 种事件类型 |
| **flushEscapeTimeout** | 无 (generator 无此需求) | ✅ 有 (用于测试) | 🟢 增强 | flitter 增加了测试便利方法 |
| **中间字节 (0x20-0x2F)** | emitKeys 收集但不使用 | _processCSI 跳过中间字节（仅收集参数字节） | 🟡 微差 | flitter 不在 input-parser 中收集中间字节（不影响已知序列） |
| **Capability 查询组合** | 按需单独发送 | buildCapabilityQuery() 批量组合 | 🟡 微差 | flitter 可一次发送所有查询 |

---

## 4. 差异修复建议（按优先级排序）

### P0: 无

InputParser 的核心解析逻辑（CSI、SS3、鼠标、粘贴、修饰键、键码映射）与 Amp 完全一致，无 P0 级别问题。

### P1: Kitty Keyboard CSI u 格式解析

**问题**: Amp 和 flitter 都在初始化时发送 `\e[>5u` 启用 Kitty keyboard protocol (flags=5)，但两者的 emitKeys/InputParser 均不显式解析 Kitty 特有的 `CSI codepoint ; modifiers u` 格式。

**影响范围**: 在支持 Kitty keyboard protocol 的终端（Kitty, WezTerm, Ghostty, foot）中，以下按键可能产生 CSI u 编码:
- 消歧键: `Ctrl+I` vs `Tab`, `Ctrl+M` vs `Enter`, `Ctrl+[` vs `Escape`
- 释放事件 (flag bit 2): `CSI codepoint ; modifiers : event_type u`
- 文本报告 (flag bit 3): 关联的 text 参数
- 带修饰的普通键: `Ctrl+.`, `Ctrl+,`, `Alt+Space` 等在传统编码中无法区分的组合

**当前行为**: CSI u 序列（如 `\e[97;5u` = Ctrl+a）会被 `CSI_LETTER_RE` 正则匹配为 `letter='u'`、`modStr='5'`，但 `[u` 不在 `CSI_LETTER_MAP` 中，结果落入 rxvt shift map 检查也不匹配，最终 emit `Undefined`。

**建议**: 在 `_resolveCSI` 中增加 CSI u 格式检测:

```
if (final === 'u' && 数字参数匹配 codepoint;modifiers 格式) {
  const codepoint = 第一个参数;
  const modifiers = 第二个参数;
  const key = String.fromCodePoint(codepoint);
  emit(keyEvent(key, decodeModifier(modifiers - 1)));
}
```

**优先级说明**: 标记为 P1 而非 P0，因为:
1. Amp 本身也有同样的缺陷——这是 **功能对齐** 而非 bug
2. Kitty protocol flags=5 是 progressive enhancement，大多数常用键仍使用传统编码
3. 实际受影响的场景有限（主要是键消歧和释放事件）

### P2: CSI 中间字节处理

**问题**: 标准 VT 序列格式为 `ESC [ params intermediate final`，其中中间字节 (0x20-0x2F) 出现在参数和终止符之间。flitter 的 `_processCSI` 不收集中间字节——参数收集阶段遇到中间字节范围的字符会直接跳到终止符检测。

**影响**: 极少。已知使用中间字节的序列:
- DECRPM 响应 `\e[?Pd;Ps$y` 中的 `$` (0x24) 实际在参数范围内（0x24 < 0x30）——flitter 通过将 `$` 作为终止符特殊处理来正确解析
- CSI 中间字节主要出现在终端输出序列（SGR、cursor movement），不在 stdin 输入中
- 能力检测响应由 `parseCapabilityResponse` 直接用正则解析，不经过 InputParser

**建议**: 保持现状。当前实现足够覆盖所有已知的终端输入序列。如果未来需要解析更多终端响应（如 DECRPM），可以在 InputParser 中增加响应解析分支或使用独立的响应解析器。

### P2: OSC/DCS 输入序列解析

**问题**: flitter 的 InputParser 不解析 OSC (`\e]...ST`) 和 DCS (`\eP...ST`) 输入序列。这些序列在 stdin 中可能出现为:
- 终端能力查询响应 (DA3: `\ePR!|hex\e\\`, XTVERSION: `\ePR>|version\e\\`)
- Kitty 图形协议响应 (`\e_G...\e\\` via APC)
- 颜色查询响应 (`\e]10;rgb:...\e\\`)

**当前行为**: ESC 后遇到 `]` 或 `P` 时，进入 `_processEscape` 的 alt-char 路径，将 `]`/`P` 作为 alt+] / alt+P 发出，后续字节被当作独立字符处理——可能产生多个虚假事件。

**影响**: 当前 flitter 的能力检测通过 `parseCapabilityResponse` 直接在 raw stdin 数据上运行正则匹配，不经过 InputParser。因此在实际使用中，终端响应数据不会同时经过 InputParser 处理，影响有限。

**建议**: 如果未来需要在同一数据流中混合处理用户输入和终端响应，应增加 OSC/DCS 跳过（或解析）状态:

```
ESC ] → 进入 OSC 状态 → 消费字节直到 BEL 或 ESC\ → emit 或丢弃
ESC P → 进入 DCS 状态 → 消费字节直到 ESC\ → emit 或丢弃
ESC _ → 进入 APC 状态 → 消费字节直到 ESC\ → emit 或丢弃
```

### P2: CSI 中间字节消歧的完备性

**问题**: CSI 序列的标准格式允许参数字节 (0x30-0x3F) 中包含 `:` (0x3A) 作为子参数分隔符，而 flitter 的正则 `CSI_NUMERIC_RE` 和 `CSI_LETTER_RE` 只处理 `;` 分隔的参数。这在 Kitty keyboard protocol 的扩展格式中是相关的:

```
CSI codepoint : shifted-key ; modifiers : event-type u
```

Kitty 使用 `:` 分隔子参数（如 shifted key 和 event type），当前正则无法匹配。

**影响**: 与 P1 (Kitty CSI u) 相关——如果实现 CSI u 解析，需要同时支持 `:` 子参数。

**建议**: 在实现 P1 时一并考虑子参数解析。

### P2: In-Band Resize 序列解析

**问题**: flitter 通过 TPRO-04 (`\e[?2048h`) 启用 in-band resize，该协议会在 stdin 中发送 resize 通知序列 `\e[8;rows;colst`。当前 InputParser 不解析此序列。

**影响**: 当前 flitter 通过 `process.stdout` 的 `'resize'` 事件（SIGWINCH）检测终端尺寸变化，in-band resize 是备选方案。Amp 也通过 SIGWINCH 为主要途径。

**建议**: 低优先级。保持 SIGWINCH 为主要 resize 检测机制。In-band resize 作为对不可靠 SIGWINCH 传递场景（如通过 SSH 的嵌套终端）的补充，可在需要时添加。

### P2: 能力检测响应与 InputParser 的隔离

**问题**: 当前实现中，终端能力查询响应和用户输入可能在同一 stdin 流中交错到达。flitter 通过 `parseCapabilityResponse` 在 raw 数据上用正则匹配来处理，而 InputParser 不知道这些响应序列——如果响应混入 InputParser 的数据流中，会产生虚假事件。

**影响**: Amp 也有同样的架构——emitKeys 不处理查询响应。实际使用中，能力检测通常在 TUI 启动的最早阶段完成（在 InputParser 开始处理之前），时序上不会冲突。

**建议**: 保持现状。如果未来出现时序问题，可以增加一个 "capability response filter" 层在 InputParser 之前过滤掉已知的响应序列。

---

## 附录 A: 完整状态机状态转换图

```
                    ┌──────────────────────────────────────────────────┐
                    │                                                  │
                    ▼                                                  │
              ┌──────────┐                                            │
   char ──→   │   IDLE   │ ◄─── [timeout / unexpected]               │
              └──────────┘                                            │
                    │                                                  │
                    │ \x1b                                             │
                    ▼                                                  │
              ┌──────────┐                                            │
              │  ESCAPE  │ ──── [500ms timeout] ──→ emit Escape ──→ IDLE
              └──────────┘                                            │
                    │                                                  │
        ┌──────────┼──────────┐                                       │
        │          │          │                                       │
        │ [        │ O        │ other char                            │
        ▼          ▼          ▼                                       │
  ┌──────────┐ ┌──────────┐ emit alt+char ──→ IDLE                  │
  │   CSI    │ │   SS3    │                                          │
  └──────────┘ └──────────┘                                          │
        │            │                                                │
        │ collect    │ collect digit                                   │
        │ params     │ + final letter                                 │
        │ + final    │                                                │
        ▼            ▼                                                │
   resolveCSI   resolveSS3 ──→ emit KeyEvent ──→ IDLE               │
        │                                                             │
        ├── SGR mouse (<...M/m) ──→ emit MouseEvent ──→ IDLE        │
        ├── focus (I/O) ──→ emit FocusEvent ──→ IDLE                │
        ├── paste start (200~) ──→ PASTE                              │
        ├── numeric code (NN~) ──→ emit KeyEvent ──→ IDLE           │
        ├── letter code (A-Z) ──→ emit KeyEvent ──→ IDLE            │
        └── unknown ──→ emit Undefined ──→ IDLE                      │
                                                                      │
              ┌──────────┐                                            │
              │  PASTE   │ ──── [collect until \e[201~] ──→           │
              └──────────┘      emit PasteEvent ─────────────────────┘
```

## 附录 B: 键码映射完整性对比

### B.1 数字码 (NUMERIC_CODE_MAP)

| 代码 | Amp 键名 | Flitter 键名 | TUI 映射 | 状态 |
|------|---------|-------------|---------|------|
| 1 | home | home | Home | ✅ |
| 2 | insert | insert | Insert | ✅ |
| 3 | delete | delete | Delete | ✅ |
| 4 | end | end | End | ✅ |
| 5 | pageup | pageup | PageUp | ✅ |
| 6 | pagedown | pagedown | PageDown | ✅ |
| 7 | home (rxvt) | home | Home | ✅ |
| 8 | end (rxvt) | end | End | ✅ |
| 11 | f1 | f1 | f1 | ✅ |
| 12 | f2 | f2 | f2 | ✅ |
| 13 | f3 | f3 | f3 | ✅ |
| 14 | f4 | f4 | f4 | ✅ |
| 15 | f5 | f5 | f5 | ✅ |
| 17 | f6 | f6 | f6 | ✅ |
| 18 | f7 | f7 | f7 | ✅ |
| 19 | f8 | f8 | f8 | ✅ |
| 20 | f9 | f9 | f9 | ✅ |
| 21 | f10 | f10 | f10 | ✅ |
| 23 | f11 | f11 | f11 | ✅ |
| 24 | f12 | f12 | f12 | ✅ |

### B.2 CSI 字母码

| 代码 | Amp 键名 | Flitter 键名 | 状态 |
|------|---------|-------------|------|
| [A | up | up → ArrowUp | ✅ |
| [B | down | down → ArrowDown | ✅ |
| [C | right | right → ArrowRight | ✅ |
| [D | left | left → ArrowLeft | ✅ |
| [E | clear | clear → Clear | ✅ |
| [F | end | end → End | ✅ |
| [H | home | home → Home | ✅ |
| [P | f1 | f1 | ✅ |
| [Q | f2 | f2 | ✅ |
| [R | f3 | f3 | ✅ |
| [S | f4 | f4 | ✅ |
| [Z | tab (shift) | tab (shift) → Tab | ✅ |

### B.3 SS3 码

| 代码 | Amp 键名 | Flitter 键名 | 状态 |
|------|---------|-------------|------|
| OA-OD | up/down/right/left | up/down/right/left | ✅ |
| OE | clear | clear | ✅ |
| OF | end | end | ✅ |
| OH | home | home | ✅ |
| OP-OS | f1-f4 | f1-f4 | ✅ |
| Oa-Oe | ctrl+up/down/right/left/clear | ctrl+up/down/right/left/clear | ✅ |

## 附录 C: Amp 独有 vs Flitter 独有的协议支持

### C.1 Amp 独有（flitter 中无对应）

**无**。Amp 的 emitKeys 解析器没有 flitter InputParser 不支持的协议。

### C.2 Flitter 独有（Amp 中无对应）

| 特性 | Flitter 实现 | Amp 对应 | 说明 |
|------|-------------|---------|------|
| `flushEscapeTimeout()` | InputParser 方法 | 无（generator 不需要） | 测试辅助方法 |
| `Pixel Mouse API` | TPRO-08 enable/disable | 仅在 cleanup 禁用 | 额外的 pixel 鼠标 mode 1016 API |
| `OSC 52 Clipboard` | Renderer.copyToClipboard() | 未确认 | 系统剪贴板集成 |
| `buildCapabilityQuery()` | 批量查询组合 | 逐个发送 | 查询效率优化 |
| `_keyHandlers[] 数组` | FocusNode.addKeyHandler() | 仅单个 onKey | 多处理器注册（在 Focus 层而非 InputParser 层） |

### C.3 共同缺失

| 特性 | 标准 | 说明 |
|------|------|------|
| Kitty CSI u 解码 | `CSI codepoint ; modifiers u` | 两者都启用 Kitty KB 但不解析 CSI u 格式 |
| X10 鼠标 | `\e[M` + 3 raw bytes | 已过时，不影响现代终端 |
| URxvt 鼠标 | `\e[Cb;Cx;CyM` (无 `<` 前缀) | 已过时，不影响现代终端 |
| OSC 输入解析 | `\e]...ST` | 输入流中的 OSC 未被解析 |
| DCS 输入解析 | `\eP...ST` | 输入流中的 DCS 未被解析 |
| In-Band Resize | `\e[8;rows;colst` (mode 2048) | 依赖 SIGWINCH 而非 in-band 通知 |
