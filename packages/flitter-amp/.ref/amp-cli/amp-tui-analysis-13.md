# Amp TUI 深度分析 #13: TextField/TextEditingController 完整能力对比

> 基于 Amp CLI v0.0.1774512763 (Bun standalone binary) 混淆 JS 逆向 + flitter-core 源码对比。
> 分析日期: 2026-03-29

---

## 1. Amp 实现细节

### 1.1 架构概览

Amp CLI 的 PromptBar（混淆名 `F0H`）是 TextField 的主要消费者。其架构为：

```
F0H (PromptBar, StatelessWidget)
├── qt (BorderTextOverlay — 覆盖文本支持)
│   └── jD (Stack)
│       ├── jJH (自定义 RenderObject — 带边框 + maxHeight 的容器)
│       │   └── a$ (Padding h:1)
│       │       └── leftChild → 实际的 TextInput Widget
│       ├── overlayLayer? (补全弹窗层)
│       └── $D (Positioned) → GL (MouseRegion, NS_RESIZE cursor)
│           → 拖拽调整高度
```

### 1.2 Amp TextEditingController 分析

Amp 的 TextEditingController（混淆后无法直接提取完整类名）管理以下状态：

| 状态字段 | 类型 | 说明 |
|---------|------|------|
| `text` | `string` | 当前编辑文本 |
| `selection` | `{start, end}` | 选区范围（Flutter TextSelection 模式） |
| `composing` | `{start, end}` | IME 组合范围（终端 TUI 中通常不使用） |
| `cursor position` | 隐含于 `selection.end` | 光标位置 = 选区的 extent |

#### 特征观察（从 Amp 行为逆推）：

1. **text/selection 统一模型**：Amp 沿用 Flutter 的 `TextEditingValue` 模式，text + selection 是一个原子值。光标位置 = `selection.baseOffset === selection.extentOffset` 时的偏移量。

2. **ChangeNotifier 模式**：Controller 继承 ChangeNotifier，每次 text/selection 变化后 `notifyListeners()` 触发重建。

3. **composing 字段**：虽然存在于数据模型中，但在终端 TUI 场景下基本为空范围（`-1, -1`），因为终端没有真正的 IME 组合窗口。

### 1.3 Amp 光标行为

| 特性 | Amp 实现 |
|------|---------|
| 光标渲染 | 通过 DECSCUSR 控制终端原生光标形态（闪烁块/稳定块/I-beam） |
| 光标位置追踪 | Controller.selection.extentOffset |
| 光标 blink | 终端原生 blink（DECSCUSR `\e[1 q` 闪烁块 或 `\e[5 q` 闪烁 I-beam），无自行实现 |
| Ctrl+A / Ctrl+E | 行首/行尾移动（Emacs 风格） |
| Home / End | 行首/行尾移动 |
| Arrow Left/Right | 字符级移动 |
| Ctrl+Left/Right | 单词级移动 |
| Alt+B / Alt+F | 单词级移动（Emacs 风格 backward/forward） |

### 1.4 Amp 文本选区

| 特性 | Amp 实现 |
|------|---------|
| Shift+方向键 | 扩展选区 |
| Ctrl+A | 全选（在编辑器上下文中） |
| Shift+Home/End | 选区到行首/行尾 |
| Ctrl+Shift+Left/Right | 按词扩展选区 |
| 选区高亮渲染 | 选中文本使用 `theme.selection` 背景色（RGBA alpha 混合） |
| 鼠标拖拽选区 | 支持 click-and-drag 创建选区 |
| 双击选词 | 支持双击选中整个单词 |

### 1.5 Amp 剪贴板交互

| 特性 | Amp 实现 |
|------|---------|
| Ctrl+C（有选区） | OSC 52 复制选中文本到系统剪贴板 |
| Ctrl+V | Bracketed Paste 模式接收粘贴内容（`ESC[200~...ESC[201~`） |
| Ctrl+X（有选区） | 复制到剪贴板 + 删除选区 |
| 鼠标释放自动复制 | 拖拽选区释放后自动 OSC 52 复制 |
| 双击选词自动复制 | 双击选词后自动 OSC 52 复制 |

### 1.6 Amp 多行编辑

| 特性 | Amp 实现 |
|------|---------|
| Shift+Enter | 插入换行符 |
| maxHeight | PromptBar `jJH` 自定义 RenderObject 实现最大高度限制 |
| 自动增高 | 内容增加时容器自动增高，受 maxHeight 约束 |
| 用户拖拽调高 | MouseRegion (NS_RESIZE cursor) + onDrag 回调实现手动调整高度 |
| Arrow Up/Down | 多行模式下行间移动 |
| Enter | 可配置为提交或换行（`submitWithMeta` 控制） |

### 1.7 Amp Undo/Redo

基于对 Amp 二进制逆向分析，**没有发现** Amp TUI 的 TextField 有独立的 Undo/Redo 历史栈实现。Amp 的行为是：

- **无 Ctrl+Z/Ctrl+Y 在 TextField 层面的处理**
- Ctrl+Z 在 Amp 中被映射到工具层面的 `undo_edit`（撤销文件编辑），而非文本输入撤销
- TextField 不维护编辑历史

### 1.8 Amp 文本删除

| 快捷键 | Amp 行为 |
|--------|---------|
| Backspace | 删除光标前一个字符 |
| Delete | 删除光标后一个字符 |
| Ctrl+Backspace | 删除光标前一个词 |
| Ctrl+Delete | 删除光标后一个词 |
| Ctrl+W | 删除光标前一个词（与 Ctrl+Backspace 等效，Emacs 风格） |
| Ctrl+U | **在 ScrollView 上下文中为向上半页滚动**，不在 TextField 中处理 |
| Ctrl+K | 未在 TextField 中观察到 kill-to-end 行为 |

### 1.9 Amp 单词移动

| 快捷键 | 行为 |
|--------|------|
| Ctrl+Left | 移到前一个词的开头 |
| Ctrl+Right | 移到后一个词的结尾 |
| Alt+B | 向后移动一个词（Emacs backward-word）|
| Alt+F | 向前移动一个词（Emacs forward-word）|

### 1.10 Amp 其他特性

| 特性 | Amp 状态 |
|------|---------|
| obscureText（密码模式） | **未实现** — Amp 的 PromptBar 不支持密码输入 |
| Placeholder 文本 | 支持 — 空输入时显示占位文本 |
| decoration/border | 通过 `jJH` 自定义 RenderObject 实现圆角边框 + 背景色 |
| Shell 模式 | `$` / `$$` 前缀实时检测，改变边框颜色 |
| Autocomplete | `@` 触发文件补全，可扩展多触发器 |
| IME 集成 | 无 — 终端通过 Bracketed Paste 或字符级输入，无真正 IME |

---

## 2. Flitter 实现细节

### 2.1 TextEditingController

**文件**: `flitter-core/src/widgets/text-field.ts` L81-568

Flitter 的 TextEditingController 继承自 `ChangeNotifier`，管理三个核心状态：

```typescript
class TextEditingController extends ChangeNotifier {
  private _text: string = '';
  private _cursorPosition: number = 0;
  private _selectionStart: number = -1;  // -1 = 无选区
  private _selectionEnd: number = -1;    // -1 = 无选区
}
```

#### 与 Flutter 模型的差异

| 方面 | Flutter | Flitter |
|------|---------|---------|
| 数据模型 | `TextEditingValue { text, selection, composing }` | 分离字段：`text`, `cursorPosition`, `selectionStart/End` |
| 光标位置 | `selection.extentOffset` | 独立 `cursorPosition` 字段 |
| 选区 | `TextSelection { base, extent }` | 独立 `selectionStart`, `selectionEnd`（-1 表示无选区）|
| composing | `TextRange { start, end }` | **无** — 没有 composing 字段 |

#### 完整 API 列表

**属性 (getter/setter)**:
- `text` — 文本内容，setter 自动 clamp 光标
- `cursorPosition` — 光标位置，自动 clamp 到 [0, text.length]
- `selectionStart` / `selectionEnd` — 选区边界（只读）
- `hasSelection` — 是否有有效选区
- `selectedText` — 选中的文本

**编辑操作**:
- `insertText(text)` — 插入文本（有选区时替换选区）
- `deleteBackward()` — Backspace
- `deleteForward()` — Delete
- `deleteWordBackward()` — Ctrl+Backspace
- `deleteWordForward()` — Ctrl+Delete

**光标移动**:
- `moveCursorLeft()` / `moveCursorRight()` — 字符级移动
- `moveCursorHome()` / `moveCursorEnd()` — 全局首尾
- `moveCursorWordLeft()` / `moveCursorWordRight()` — 词级移动
- `moveCursorUp()` / `moveCursorDown()` — 多行行间移动
- `moveCursorLineHome()` / `moveCursorLineEnd()` — 当前行首尾

**选区操作**:
- `selectLeft()` / `selectRight()` — Shift+方向键
- `selectWordLeft()` / `selectWordRight()` — Ctrl+Shift+方向键
- `selectUp()` / `selectDown()` — Shift+Up/Down
- `selectHome()` / `selectEnd()` — Shift+Home/End
- `selectAll()` — Ctrl+A
- `selectWordAt(pos)` — 双击选词
- `setSelection(start, end)` — 直接设置选区
- `clearSelection()` — 清除选区

**其他**:
- `clear()` — 清空所有状态

### 2.2 TextField Widget

**文件**: `flitter-core/src/widgets/text-field.ts` L592-1140

```typescript
class TextField extends StatefulWidget {
  controller?: TextEditingController;
  placeholder?: string;
  style?: TextStyle;
  selectionColor?: Color;        // 选区背景色
  cursorChar?: string;           // 光标字符（默认 '\u2502' 细竖线）
  maxLines?: number;             // 1=单行, >1/undefined=多行
  submitOnEnter?: boolean;       // true=Enter 提交（即使多行模式）
  onSubmit?: (text: string) => void;
  onSubmitted?: (text: string) => void;
  onChanged?: (text: string) => void;
  autofocus?: boolean;
  focusNode?: FocusNode;
}
```

### 2.3 键盘事件处理

TextFieldState 的 `handleKeyEvent` 处理以下键绑定：

| 分类 | 快捷键 | 处理 |
|------|--------|------|
| **Ctrl 组合** | Ctrl+A | selectAll |
| | Ctrl+Backspace | deleteWordBackward |
| | Ctrl+Delete | deleteWordForward |
| | Ctrl+Left | moveCursorWordLeft |
| | Ctrl+Right | moveCursorWordRight |
| | Ctrl+Enter | 始终提交 |
| **Ctrl+Shift** | Ctrl+Shift+Left | selectWordLeft |
| | Ctrl+Shift+Right | selectWordRight |
| **Shift** | Shift+Left/Right | selectLeft/selectRight |
| | Shift+Up/Down | selectUp/selectDown |
| | Shift+Home/End | selectHome/selectEnd |
| | Shift+Enter | 插入换行 |
| **Alt** | Alt+Enter | 插入换行 |
| **普通键** | Backspace | deleteBackward |
| | Delete | deleteForward |
| | ArrowLeft/Right | 移动或折叠选区 |
| | ArrowUp/Down | 多行模式行间移动（单行返回 ignored） |
| | Home/End | 多行→行首尾，单行→全局首尾 |
| | Enter | 多行→换行（除非 submitOnEnter），单行→提交 |
| | Tab | 返回 ignored（交由焦点系统） |
| | 可打印字符 | insertText |
| | Space | insertText(' ') |

### 2.4 光标渲染

Flitter 使用**字符级光标**而非终端原生光标：

- 在 `build()` 中将光标字符（默认 `\u2502` 或自定义）插入到文本的光标位置
- 通过 `TextSpan` 构建包含光标字符的显示文本
- 选区通过 `TextSpan` 的 `background` 颜色属性渲染高亮
- 无光标 blink 动画（光标字符始终可见）

### 2.5 剪贴板

| 操作 | Flitter 实现 |
|------|-------------|
| 复制 (OSC 52) | `_copySelectionToClipboard()` — 通过 `WidgetsBinding.instance.tui.copyToClipboard()` |
| 粘贴 (Bracketed Paste) | `FocusNode.onPaste` → `_handlePaste()` → `controller.insertText(text)` |
| 自动复制 | 双击选词、拖拽释放后自动复制 |

### 2.6 鼠标交互

| 操作 | 实现 |
|------|------|
| 单击 | 清除选区，放置光标 |
| 双击 | `selectWordAt()` 选中整个单词 + 自动复制 |
| 拖拽 | `press` → `drag` → `release` 创建/更新/完成选区 |
| 坐标转换 | `_getCharPositionFromCoords(x, y)` — 支持多行 |

### 2.7 InputArea 使用

**文件**: `flitter-amp/src/widgets/input-area.ts`

InputAreaState 创建和管理 TextEditingController：

```
InputArea → Column
  ├── topWidget?
  └── Stack (fit: passthrough)
      ├── Container (border: rounded, padding h:1, height:5)
      │   └── Autocomplete
      │       └── TextField (controller, autofocus, submitOnEnter:true, cursorChar:'█')
      ├── Positioned (top:0, right:1) → 模式标签
      └── Positioned (bottom:0, left:1) → 图片计数
```

关键细节：
- `cursorChar: '\u2588'`（全宽块字符，比默认的细竖线更醒目）
- `submitOnEnter: true` — Enter 直接提交（非多行模式的换行）
- Shell 模式检测：监听 controller text 变化，检测 `$` / `$$` 前缀
- 实时边框颜色变化：Shell 模式时边框 = `theme.app.shellMode`

### 2.8 Autocomplete 集成

**文件**: `flitter-core/src/widgets/autocomplete.ts`

Autocomplete 包装 TextField，监听 controller 变化进行触发器检测：

- 支持多个 `AutocompleteTrigger`（如 `@` 触发文件补全）
- 光标前 100 字符范围内查找触发字符
- 模糊匹配过滤（subsequence 算法）
- 选中后替换触发区间文本
- 最多显示 10 个选项（可配置 `maxOptionsVisible`）
- 支持异步 `optionsBuilder`

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **TextEditingController 数据模型** | `TextEditingValue { text, selection, composing }` 统一值 | 分离字段: `text`, `cursorPosition`, `selectionStart/End` | 🟡 中 | Flitter 模型更简单直观，但缺少 composing；语义等价但 API 形态不同 |
| **composing (IME)** | 数据模型中存在但终端不使用 | 无 | 🟢 无 | 终端环境下两者均不使用 IME composing |
| **text getter/setter** | 统一 value 模型 | 独立 text 属性 + clamp cursor | 🟢 无 | 行为等价 |
| **光标位置** | `selection.extentOffset` | 独立 `cursorPosition` 字段 | 🟢 无 | 行为等价，API 命名不同 |
| **光标渲染方式** | 终端原生 DECSCUSR 光标 | 字符级光标（插入 `cursorChar` 到文本中） | 🟡 中 | Amp 利用终端原生光标（可 blink），Flitter 使用文本字符模拟 |
| **光标 blink** | 终端原生 blink（DECSCUSR） | 无 blink | 🟡 中 | Flitter 光标始终可见，无闪烁效果 |
| **Ctrl+A (行首)** | 支持（Emacs 风格，光标移到行首） | 映射为 selectAll | 🔴 高 | **冲突**: Amp 的 Ctrl+A = 行首（Emacs），Flitter 的 Ctrl+A = 全选。Amp 的全选可能通过其他方式实现 |
| **Ctrl+E (行尾)** | 支持（Emacs 风格） | 未实现 | 🟡 中 | Flitter 无 Ctrl+E 行尾移动 |
| **Home/End** | 支持 | 支持 | 🟢 无 | 等价 |
| **Arrow Left/Right** | 支持 | 支持（含选区折叠逻辑） | 🟢 无 | Flitter 实现了有选区时 Left→选区起点、Right→选区终点的折叠行为 |
| **Ctrl+Left/Right (词移动)** | 支持 | 支持 | 🟢 无 | 等价 |
| **Alt+B/F (Emacs 词移动)** | 支持 | 未实现 | 🟡 中 | Flitter 不响应 Alt+B / Alt+F |
| **Arrow Up/Down (多行)** | 支持 | 支持（含列保持/clamp） | 🟢 无 | 等价 |
| **Shift+方向键选区** | 完整支持 | 完整支持 | 🟢 无 | Left/Right/Up/Down/Home/End 均支持 |
| **Ctrl+Shift+Left/Right** | 支持按词选区 | 支持按词选区 | 🟢 无 | 等价 |
| **Ctrl+A 全选** | 不在 TextField 层（Emacs 行首） | 在 TextField 层实现 | 🔴 高 | 见上方 Ctrl+A 冲突说明 |
| **选区背景高亮** | `theme.selection` 颜色（RGBA alpha 混合） | TextSpan background（`selectionColor` 属性，默认 `rgb(50,50,180)`） | 🟡 中 | 渲染机制不同：Amp 可能使用 RenderText 的原生选区，Flitter 通过 TextSpan 分段着色 |
| **Ctrl+C (复制)** | OSC 52 | OSC 52（通过 WidgetsBinding.tui） | 🟢 无 | 等价实现 |
| **Ctrl+V (粘贴)** | Bracketed Paste 接收 | Bracketed Paste → FocusNode.onPaste → insertText | 🟢 无 | 完整实现 |
| **Ctrl+X (剪切)** | OSC 52 复制 + 删除选区 | **未实现** | 🟡 中 | Flitter TextField 无 Ctrl+X 处理 |
| **鼠标拖拽释放自动复制** | 支持 | 支持 | 🟢 无 | 等价 |
| **双击选词自动复制** | 支持 | 支持 | 🟢 无 | 等价 |
| **Shift+Enter (换行)** | 插入 `\n` | 插入 `\n` | 🟢 无 | 等价 |
| **Alt+Enter (换行)** | 插入 `\n` | 插入 `\n` | 🟢 无 | 等价 |
| **maxLines 控制** | PromptBar 通过 `jJH` 自定义 RenderObject 的 `maxHeight` 控制 | TextField 的 `maxLines` 属性传递给内部 `Text` widget | 🟡 中 | Amp 用像素级 maxHeight，Flitter 用行数级 maxLines |
| **自动增高** | `jJH` RenderObject 根据内容自动增高至 maxHeight | 未明确实现 — Container height=5 固定 | 🟡 中 | InputArea 当前用固定 height:5，缺少弹性增高 |
| **用户拖拽调高** | MouseRegion (NS_RESIZE) + onDrag + onInitializeHeight | **未实现** | 🟡 中 | Flitter InputArea 缺少拖拽调整高度功能 |
| **Undo/Redo** | 未在 TextField 层实现 | 未实现 | 🟢 无 | 两者均无 TextField 级别的 undo/redo |
| **Ctrl+Z/Ctrl+Y** | 不在 TextField 处理 | 不在 TextField 处理 | 🟢 无 | 等价（均无） |
| **Backspace** | 删除前一字符 / 删除选区 | 删除前一字符 / 删除选区 | 🟢 无 | 等价 |
| **Delete** | 删除后一字符 / 删除选区 | 删除后一字符 / 删除选区 | 🟢 无 | 等价 |
| **Ctrl+Backspace (删词)** | 支持 | 支持（deleteWordBackward） | 🟢 无 | 等价 |
| **Ctrl+Delete (删词)** | 支持 | 支持（deleteWordForward） | 🟢 无 | 等价 |
| **Ctrl+W (删词)** | 删除前一个词（Emacs kill-word） | **未实现** | 🟡 中 | Flitter 不响应 Ctrl+W |
| **Ctrl+U (删除到行首)** | 在 ScrollView 上下文为半页滚动；在某些 readline 环境下为 kill-line | **未实现** | 🟡 中 | Amp 的 Ctrl+U 主要用于滚动而非 TextField 编辑 |
| **Ctrl+K (删除到行尾)** | 未在 TextField 中观察到 | 未实现 | 🟢 无 | 两者均无 |
| **obscureText (密码模式)** | 未实现 | 未实现 | 🟢 无 | 两者均无，Amp 的 PromptBar 不需要密码输入 |
| **Placeholder 文本** | 支持 | 支持 | 🟢 无 | 等价 |
| **onChanged 回调** | 支持 | 支持 | 🟢 无 | 等价 |
| **onSubmitted 回调** | 支持 | 支持（onSubmit + onSubmitted 双回调） | 🟢 无 | Flitter 额外提供 backward-compat 的 onSubmit |
| **focusNode 集成** | 支持 | 支持（可外部传入或自动创建） | 🟢 无 | 等价，含 dispose 生命周期管理 |
| **decoration/border** | `jJH` 自定义 RenderObject（圆角边框 + 背景色 + borderStyle） | TextField 自身无 decoration；由外部 Container + BoxDecoration 包裹 | 🟡 中 | Amp 的 PromptBar 是一体化带边框容器，Flitter 需要手动组合 |
| **style 自定义** | 通过 theme 系统 | `style: TextStyle` 属性 | 🟢 无 | 等价 |
| **submitOnEnter** | 可配置（与 `submitWithMeta` 对应） | 支持（`submitOnEnter` 属性） | 🟢 无 | 等价 |
| **Shell 模式检测** | PromptBar 层面检测 `$` / `$$` 前缀 | InputArea 层面检测 `$` / `$$` 前缀 | 🟢 无 | 等价实现 |
| **Autocomplete** | 支持多触发器 + 异步 | 支持多触发器 + 异步 + 模糊匹配 | 🟢 无 | Flitter 实现完整 |
| **鼠标交互** | 单击/双击/拖拽 | 单击/双击/拖拽 | 🟢 无 | 等价 |
| **向后兼容 string key API** | N/A | 支持 `handleKeyEvent(string)` 旧接口 | 🟢 无 | Flitter 额外特性 |
| **Word boundary 算法** | 标准 `\w` 正则 | 标准 `\w` 正则（`isWordChar` 函数） | 🟢 无 | 等价 |
| **Prompt 历史 (Ctrl+R)** | 支持（App 层面 `promptHistory.previous()`） | App 层有骨架（TODO 注释） | 🟡 中 | Flitter 有框架但未完成注入 |
| **外部编辑器 (Ctrl+G)** | 支持 suspend TUI → 打开 $EDITOR → resume | TODO 注释 | 🟡 中 | Flitter 尚未实现 TUI suspend/resume |
| **图片附件** | 支持 Ctrl+V 粘贴图片 + `[N images]` badge | InputArea 有 `imageAttachments` badge 渲染 | 🟡 中 | Flitter 有 UI 但缺少实际图片粘贴处理 |
| **BorderTextOverlay** | `qt` 组件 — 在边框线上叠加文本（top/bottom × left/right） | InputArea 通过 Stack + Positioned 模拟 | 🟡 中 | Amp 有专用 BorderOverlay widget，Flitter 用通用 Stack 近似 |

---

## 4. 差异修复建议（按优先级排序）

### P0 — 功能冲突（影响核心交互）

#### 4.1 Ctrl+A 行为冲突
- **问题**: Flitter 将 Ctrl+A 映射为 `selectAll()`，而 Amp 在 TextField 上下文中 Ctrl+A 是 Emacs 风格的行首移动。Amp 的全选可能是在没有 TextField 焦点时的行为，或者通过其他快捷键实现。
- **建议**: 调研 Amp 实际在 PromptBar 中按 Ctrl+A 的行为。如果确认是行首移动，需要将 TextField 的 Ctrl+A 改为 `moveCursorLineHome()`（或 `moveCursorHome()` 单行模式），另提供 Ctrl+Shift+A 或其他方式实现全选。
- **影响范围**: `text-field.ts` L762-763

#### 4.2 Ctrl+X 剪切缺失
- **问题**: Flitter TextField 不处理 Ctrl+X。有选区时应执行「OSC 52 复制 + 删除选区」。
- **建议**: 在 `handleKeyEvent` 的 Ctrl 组合分支中添加 `case 'x'`：
  - `this._copySelectionToClipboard()`
  - `this._controller._deleteSelection()` (需要暴露或调用 deleteBackward)
- **影响范围**: `text-field.ts` handleKeyEvent Ctrl 分支

### P1 — 功能缺失（影响 Emacs 用户体验）

#### 4.3 Ctrl+E 行尾移动
- **问题**: 缺少 Emacs 风格 Ctrl+E 行尾移动。
- **建议**: 在 Ctrl 组合分支添加 `case 'e': this._controller.moveCursorLineEnd()`（多行）或 `moveCursorEnd()`（单行）。

#### 4.4 Alt+B / Alt+F 词移动
- **问题**: 缺少 Emacs 风格 Alt+B (backward-word) / Alt+F (forward-word)。
- **建议**: 在 Alt 组合处理分支添加 `case 'b': moveCursorWordLeft()` 和 `case 'f': moveCursorWordRight()`。

#### 4.5 Ctrl+W 删除前一个词
- **问题**: 缺少 Emacs 风格 Ctrl+W kill-word。
- **建议**: 在 Ctrl 组合分支添加 `case 'w': this._controller.deleteWordBackward()`。

### P2 — 视觉/交互差异

#### 4.6 光标 blink
- **问题**: Flitter 使用字符级光标（无 blink），Amp 使用终端原生光标（可 blink）。
- **建议**: 考虑两种方案：
  1. **简单方案**: 通过 `setInterval` 在 build() 中切换光标字符的可见性（500ms 间隔）
  2. **原生方案**: 将光标位置报告给 TerminalManager，利用终端原生光标（DECSCUSR）— 但这需要重构渲染管线
- **优先级说明**: 字符级光标在终端中已是可接受的实践方式

#### 4.7 自动增高输入框
- **问题**: InputArea 当前使用固定 `height: 5`，缺少根据内容自动增高的能力。
- **建议**: 将 Container 的 height 改为动态计算（基于 controller.text 的行数），并增加 maxHeight 约束。或引入类似 Amp 的 `jJH` 自定义 RenderObject。

#### 4.8 拖拽调整输入框高度
- **问题**: 缺少 Amp 的 NS_RESIZE 拖拽调高功能。
- **建议**: 在 InputArea 顶部添加 MouseRegion（cursor: NS_RESIZE），通过 onDrag 回调调整 Container 高度。

### P3 — 完善性改进

#### 4.9 Prompt 历史注入
- **问题**: App 层有 `promptHistory.previous()` 骨架代码但标注 TODO，未能注入文本到 InputArea。
- **建议**: 暴露 InputArea 的 TextEditingController 引用（通过 GlobalKey 或 callback），让 App 层可以 `controller.text = historyEntry`。

#### 4.10 BorderTextOverlay 组件
- **问题**: Amp 有专用的 `qt` (BorderTextOverlay) 组件可在边框线上精确叠加文本（如模式标签叠在右上角边框上），Flitter 用 Stack+Positioned 近似模拟。
- **建议**: 考虑实现专用的 `BorderTextOverlay` widget，在 border 的 top/bottom 线条上 "打洞" 显示叠加文本，实现更精确的视觉效果。

#### 4.11 maxLines 像素级 vs 行数级
- **问题**: Amp 的 PromptBar 使用 `maxHeight`（像素/行数级别的 RenderObject 约束），Flitter 的 TextField 的 `maxLines` 传递给内部 Text widget。
- **建议**: 当前实现足够满足需求。如果需要更精确的高度控制，可考虑在 TextField 外层用 `ConstrainedBox` 或 `LimitedBox`。

#### 4.12 选区颜色对接主题
- **问题**: Flitter TextField 默认选区颜色为硬编码的 `Color.rgb(50, 50, 180)`，未对接 AmpTheme 的 `base.selection` 颜色。
- **建议**: InputArea 在创建 TextField 时传入 `selectionColor: theme.base.selection`。

---

## 附录 A: Flitter TextEditingController 完整方法索引

| 方法 | 行号 | 功能 |
|------|------|------|
| `constructor` | L87 | 初始化（可选 text 参数） |
| `get/set text` | L97-108 | 文本内容 |
| `get/set cursorPosition` | L112-121 | 光标位置 |
| `get selectionStart/End` | L125-131 | 选区边界 |
| `get hasSelection` | L133 | 是否有有效选区 |
| `get selectedText` | L138-143 | 获取选中文本 |
| `setSelection` | L149-158 | 设置选区范围 |
| `clearSelection` | L161-166 | 清除选区 |
| `insertText` | L174-192 | 插入/替换文本 |
| `deleteBackward` | L198-209 | Backspace |
| `deleteForward` | L215-225 | Delete |
| `deleteWordBackward` | L230-240 | Ctrl+Backspace |
| `deleteWordForward` | L245-254 | Ctrl+Delete |
| `moveCursorLeft/Right` | L258-274 | 字符级移动 |
| `moveCursorHome/End` | L276-292 | 全局首尾 |
| `moveCursorWordLeft/Right` | L297-316 | 词级移动 |
| `moveCursorUp/Down` | L321-366 | 行间移动 |
| `moveCursorLineHome/End` | L368-399 | 当前行首尾 |
| `selectLeft/Right` | L403-447 | Shift 字符选区 |
| `selectWordLeft/Right` | L425-447 | Ctrl+Shift 词选区 |
| `selectUp/Down` | L449-489 | Shift 行选区 |
| `selectHome/End` | L491-511 | Shift 全局选区 |
| `selectAll` | L515-520 | 全选 |
| `selectWordAt` | L523-529 | 双击选词 |
| `clear` | L533-539 | 清空 |

## 附录 B: Flitter TextField 键盘快捷键完整映射

```
┌─────────────────────────────────────────────────────────────┐
│                    Ctrl 组合 (无 Shift, 无 Alt)               │
├──────────────────┬──────────────────────────────────────────┤
│ Ctrl+A           │ selectAll()                              │
│ Ctrl+Backspace   │ deleteWordBackward()                     │
│ Ctrl+Delete      │ deleteWordForward()                      │
│ Ctrl+Left        │ moveCursorWordLeft()                     │
│ Ctrl+Right       │ moveCursorWordRight()                    │
│ Ctrl+Enter       │ submit (always)                          │
├──────────────────┼──────────────────────────────────────────┤
│                    Ctrl+Shift 组合                           │
├──────────────────┼──────────────────────────────────────────┤
│ Ctrl+Shift+Left  │ selectWordLeft()                         │
│ Ctrl+Shift+Right │ selectWordRight()                        │
├──────────────────┼──────────────────────────────────────────┤
│                    Shift 组合 (无 Ctrl, 无 Alt)              │
├──────────────────┼──────────────────────────────────────────┤
│ Shift+Left       │ selectLeft()                             │
│ Shift+Right      │ selectRight()                            │
│ Shift+Up         │ selectUp()                               │
│ Shift+Down       │ selectDown()                             │
│ Shift+Home       │ selectHome()                             │
│ Shift+End        │ selectEnd()                              │
│ Shift+Enter      │ insertText('\n')                         │
├──────────────────┼──────────────────────────────────────────┤
│                    Alt 组合                                   │
├──────────────────┼──────────────────────────────────────────┤
│ Alt+Enter        │ insertText('\n')                         │
├──────────────────┼──────────────────────────────────────────┤
│                    普通键 (无修饰)                            │
├──────────────────┼──────────────────────────────────────────┤
│ Backspace        │ deleteBackward()                         │
│ Delete           │ deleteForward()                          │
│ ArrowLeft        │ moveCursorLeft() / collapse selection    │
│ ArrowRight       │ moveCursorRight() / collapse selection   │
│ ArrowUp          │ moveCursorUp() [multi] / ignored [single]│
│ ArrowDown        │ moveCursorDown() [multi] / ignored       │
│ Home             │ lineHome [multi] / home [single]         │
│ End              │ lineEnd [multi] / end [single]           │
│ Enter            │ newline [multi] / submit [single]        │
│ Tab              │ ignored (focus traversal)                │
│ 可打印字符        │ insertText(key)                          │
│ Space            │ insertText(' ')                          │
└──────────────────┴──────────────────────────────────────────┘
```

## 附录 C: 测试覆盖统计

Flitter 的 `text-field.test.ts` 包含 **1264 行**测试代码，覆盖以下模块：

| 模块 | 测试数 | 覆盖范围 |
|------|--------|---------|
| TextEditingController - Word Operations | 12 | deleteWordBackward, deleteWordForward, moveCursorWordLeft/Right |
| TextEditingController - Multi-line | 12 | moveCursorUp/Down, moveCursorLineHome/End, insertText newline |
| TextEditingController - Selection | 24 | hasSelection, selectedText, clearSelection, setSelection, selectLeft/Right/WordLeft/WordRight/Up/Down/Home/End/All/WordAt, insertText replace, deleteBackward/Forward with selection |
| TextField - Properties | 10 | 构造函数参数验证 |
| TextField State - Single-line | 5 | Enter/Ctrl+Enter/Shift+Enter/Alt+Enter 行为 |
| TextField State - Multi-line | 9 | Enter/Ctrl+Enter, ArrowUp/Down, Home/End |
| TextField State - Character Ops | 4 | 打字、Backspace、Delete、Space |
| TextField State - Word Ops | 4 | Ctrl+Backspace/Delete/Left/Right |
| TextField State - Cursor Movement | 6 | Arrow, Home/End, selection collapse |
| TextField State - Selection | 10 | Shift+arrows, Ctrl+A, Ctrl+Shift+arrows, Shift+Home/End/Up/Down |
| TextField State - Mouse | 6 | click, multi-line click, double-click, drag, release, clamp |
| TextField State - onChanged | 2 | typing, backspace |
| TextField State - onSubmitted | 3 | single-line, multi-line, no-submit-on-enter |
| TextField State - Backward Compat | 9 | string-based key handling |
| TextField State - Tab | 1 | Tab → ignored |
| TextField State - Focus | 3 | internal/external focusNode, onPaste wiring |
| TextField State - Paste | 4 | insert, replace selection, multi-line, onChanged |
| **总计** | **~124** | **覆盖率: 高** |
