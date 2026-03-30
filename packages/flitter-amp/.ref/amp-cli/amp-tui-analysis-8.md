# Amp TUI 深度分析 #8: RenderText 文本测量 + 换行 + 截断 + wcwidth

> 基于 Amp CLI 混淆源码逆向分析 + flitter-core 完整源码阅读
> 分析范围: RenderText (Amp: `gU0`) 的文本测量、换行、截断、wcwidth、emoji 处理、绘制管线全链路

---

## 1. Amp 实现细节

### 1.1 Amp RenderText 架构概览

Amp 的文本渲染核心是 `gU0` 类（RenderText），继承自 `j9`（RenderBox）。逆向分析表明 Amp 的 RenderText 采用以下架构：

```
e0 (Text widget, extends LeafRenderObjectWidget)
  └── createRenderObject() → gU0 (RenderText, extends j9/RenderBox)
      ├── _text: TextSpan 树
      ├── _textAlign: 'left' | 'center' | 'right'
      ├── _maxLines?: number
      ├── _overflow: 'clip' | 'ellipsis'
      ├── performLayout() → 文本测量 + size 计算
      └── paint(screen, offsetX, offsetY) → 逐字符绘制
```

### 1.2 Amp 文本测量算法 (performLayout)

从 Amp 混淆代码逆向，`gU0.performLayout()` 的核心流程：

```
gU0.performLayout():
  1. 从 TextSpan 树提取文本段 (visitChildren 遍历)
  2. 按 '\n' 分割为逻辑行
  3. 对每行逐字符扫描，使用 wcwidth 计算每个字符的显示宽度
  4. 累加得到每行的总宽度
  5. maxLineWidth = max(所有行宽度)
  6. intrinsicHeight = 行数
  7. size = constraints.constrain(Size(maxLineWidth, intrinsicHeight))
```

**关键特征**：
- **无自动换行（no soft-wrap）**：Amp 的 RenderText **不做自动换行**。换行仅由文本中的 `\n` 字符驱动
- **无 word-break / character-break**：不存在根据容器宽度自动断行的逻辑
- **宽度可以超出约束**：intrinsic width 是文本自然宽度，通过 `constraints.constrain()` 裁剪到最大可用宽度
- **换行发生在 Markdown 渲染层**：实际的自动换行由 Markdown widget（上层）在构建 TextSpan 时预处理，RenderText 本身只处理已经包含 `\n` 的文本

### 1.3 Amp wcwidth 实现

Amp 使用 Bun 运行时，其 wcwidth 实现基于 Unicode 宽度表查找。从二进制逆向可以确认：

**零宽字符检测**：
- 控制字符 `0x00-0x1F`, `0x7F-0x9F` → width 0
- Zero Width Space (U+200B) → width 0
- Zero Width Non-Joiner (U+200C) → width 0
- Zero Width Joiner (U+200D) → width 0
- BOM (U+FEFF) → width 0
- Word Joiner (U+2060) → width 0
- Soft Hyphen (U+00AD) → width 0
- Combining Diacritical Marks (U+0300-036F, U+1AB0-1AFF, U+1DC0-1DFF, U+20D0-20FF, U+FE20-FE2F) → width 0
- Variation Selectors (U+FE00-FE0F, U+E0100-E01EF) → width 0

**宽字符检测**：
- Hangul Jamo (U+1100-115F) → width 2
- CJK 符号与标点 (U+2E80-303E) → width 2
- 平假名/片假名/CJK 兼容 (U+3040-33FF) → width 2
- CJK 统一表意文字扩展 A (U+3400-4DBF) → width 2
- CJK 统一表意文字 (U+4E00-9FFF) → width 2
- 彝文 (U+A000-A4CF) → width 2
- Hangul Jamo Extended-A (U+A960-A97F) → width 2
- 韩文音节 (U+AC00-D7AF) → width 2
- CJK 兼容表意文字 (U+F900-FAFF) → width 2
- CJK 兼容形式 (U+FE10-FE6F) → width 2
- 全角形式 (U+FF01-FF60, U+FFE0-FFE6) → width 2
- Emoji 区块 (U+1F000-1F9FF, U+1FA00-1FA6F, U+1FA70-1FAFF) → width 2
- CJK 扩展 B+ (U+20000-2FFFF, U+30000-3FFFF) → width 2

**其余字符** → width 1

### 1.4 Amp Emoji 处理

Amp 的 emoji 处理策略：

1. **逐 codepoint 扫描**：使用 `for...of` 遍历字符串（JS 的 `for...of` 能正确处理 surrogate pair，但不会合并 emoji 序列）
2. **ZWJ 序列**：ZWJ（U+200D）被识别为零宽字符（width 0），连接符本身不占宽度
3. **Variation Selector**：VS15 (U+FE0E) 和 VS16 (U+FE0F) 被识别为零宽字符
4. **Skin Tone Modifier**：Fitzpatrick 修饰符（U+1F3FB-1F3FF）在 emoji 范围内（U+1F000-1F9FF），被视为 width 2
5. **模式 2027**：Amp 发送 `\e[?2027h` 启用终端 emoji 宽度模式，让终端以一致的方式处理 emoji 宽度

**Emoji 宽度的核心问题**：
- 单个 emoji codepoint（如 😀 U+1F600）→ width 2（在 emoji 范围内）
- 复合 emoji（如 👨‍👩‍👧 = U+1F468 + U+200D + U+1F469 + U+200D + U+1F467）→ 各 codepoint 单独计算：2+0+2+0+2 = width 6，但终端通常渲染为 width 2
- 这是一个已知的不一致性，Amp 通过模式 2027 将处理责任交给终端

### 1.5 Amp 文本截断

Amp 的 `_overflow` 支持两种模式：

**clip 模式（默认）**：
```
paint 时，当 col + charW > availWidth 时，break 退出当前行的绘制循环
字符级裁剪 —— 宽字符如果超出边界则整个跳过
```

**ellipsis 模式**：
```
当 maxLines 触发截断 OR 行宽超出 availWidth:
  targetWidth = availWidth - 3  (为 '...' 预留)
  逐字符累加宽度直到超出 targetWidth → 截断
  追加 '...'（每个 '.' width 1，共 width 3）
  
边界情况:
  availWidth <= 3 → 只显示 availWidth 个 '.' 字符
```

### 1.6 Amp 文本对齐

Amp 支持三种对齐方式：

| 对齐 | leftOffset 公式 |
|------|----------------|
| `left`（默认）| `0` |
| `center` | `floor((availWidth - lineW) / 2)` |
| `right` | `availWidth - lineW` |

`leftOffset < 0` 时 clamp 为 0（防止负偏移）。

### 1.7 Amp TextSpan 树遍历

Amp 的 TextSpan 遍历采用深度优先、父→子顺序：

```
visitChildren(visitor, parentStyle, parentHyperlink, parentOnClick):
  effectiveStyle = parentStyle.merge(this.style)     // 父样式 + 当前节点样式
  effectiveHyperlink = this.hyperlink ?? parentHyperlink  // 就近覆盖
  effectiveOnClick = this.onClick ?? parentOnClick        // 就近覆盖
  
  if (this.text) visitor(text, effectiveStyle, effectiveHyperlink, effectiveOnClick)
  if (this.children) for each child: child.visitChildren(visitor, effectiveStyle, ...)
```

**样式合并算法** (TextStyle.merge)：
- 对每个字段：如果 `other` 的字段 !== undefined，使用 `other` 的值；否则保留 `this` 的值
- 这是"overlay"语义 —— 子节点样式覆盖父节点的对应字段，未定义的字段继承

### 1.8 Amp paint 流程

```
gU0.paint(screen, offsetX, offsetY):
  1. 从 TextSpan 提取行数据（同 performLayout）
  2. 应用 maxLines 裁剪
  3. 对每行:
     a. 计算 leftOffset（对齐）
     b. 如果是截断行且 overflow='ellipsis' → 应用省略号
     c. 逐字符绘制:
        - col = offset.col + leftOffset
        - 对每个字符: 计算 charW = wcwidth(cp)
        - 如果 col + charW > availWidth → break（clip）
        - 如果有选区高亮 → 替换 background 为 selectionColor
        - 调用 ctx.drawChar(col, row, char, cellStyle)
        - col += charW
```

### 1.9 Amp 超链接 (OSC 8) 支持

Amp 的超链接流转：
1. **TextSpan** 节点可携带 `hyperlink: { uri, id? }`
2. **visitChildren** 遍历时继承/覆盖 hyperlink
3. **RenderText** 在 layout 时构建 `_characterInteractions[]` 缓存
4. **Cell** 对象携带 `hyperlink?: string` 字段
5. **Renderer.render()** 时通过 `buildHyperlinkDelta()` 输出 OSC 8 转义序列：
   - 开始: `\e]8;params;uri\e\\`
   - 结束: `\e]8;;\e\\`

### 1.10 Amp 文本选区

Amp 的 RenderText 支持文本选区：
- `selectable: boolean` — 是否可选
- `selectedRanges: TextSelectionRange[]` — 选中范围
- `highlightMode: 'selection' | 'copy' | 'none'` — 高亮模式
- `selectionColor` / `copyHighlightColor` — 高亮颜色

选区在 paint 时通过 `_buildHighlightSet()` 构建索引集合，对命中的字符用 `style.copyWith({ background: highlightColor })` 替换背景色。

---

## 2. Flitter 实现细节

### 2.1 RenderText 核心实现

**文件**: [text.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts)

Flitter 的 RenderText 完整复刻了 Amp 的 `gU0` 类，包含 688 行代码，分为以下核心部分：

#### 2.1.1 Text Widget (对应 Amp e0)

[Text](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts#L68-L103) 是一个 `LeafRenderObjectWidget`，接收参数：
- `text: TextSpan` — 富文本树（必填）
- `textAlign: 'left' | 'center' | 'right'` — 默认 `'left'`
- `maxLines?: number` — 最大行数
- `overflow: 'clip' | 'ellipsis'` — 默认 `'clip'`

#### 2.1.2 performLayout 文本测量算法

[performLayout](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts#L473-L499) 实现：

```typescript
performLayout(): void {
  const constraints = this.constraints!;
  const lines = this._getLines();        // Step 1: TextSpan → 字符行

  const displayLines = this._maxLines !== undefined
    ? lines.slice(0, this._maxLines)      // Step 2: maxLines 裁剪
    : lines;

  let maxLineWidth = 0;
  for (const line of displayLines) {
    const w = this._lineWidth(line);      // Step 3: 逐行 wcwidth 宽度
    if (w > maxLineWidth) maxLineWidth = w;
  }

  const intrinsicHeight = displayLines.length;  // Step 4: 行数

  this.size = constraints.constrain(       // Step 5: 约束裁剪
    new Size(maxLineWidth, intrinsicHeight),
  );

  this._rebuildPositionCache(displayLines); // Step 6: 位置缓存
}
```

**_getLines()** ([L436-L459](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts#L436-L459)) 的算法：
1. 调用 `TextSpan.visitChildren()` 收集所有文本段
2. 初始化 `lines = [[]]`（至少一个空行）
3. 逐字符遍历每个段的文本:
   - `\n` → 开始新行 (`lines.push([])`)
   - 其他 → 追加到当前行 `{ char, style, hyperlink, onClick }`

**_lineWidth()** ([L464-L470](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts#L464-L470))：
```typescript
private _lineWidth(line): number {
  let w = 0;
  for (const { char } of line) {
    w += stringWidth(char);    // stringWidth → wcwidth(cp) 逐 codepoint
  }
  return w;
}
```

#### 2.1.3 字符位置缓存

[_rebuildPositionCache](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts#L505-L549) 构建三个缓存数组：

1. **`_characterPositions: CharacterPosition[]`** — 每个字符的 `{ col, row, width }`
2. **`_visualLines: VisualLine[]`** — 每个可视行的 `{ startIndex, endIndex, row }`
3. **`_characterInteractions: CharacterInteraction[]`** — 每个字符的 `{ hyperlink?, onClick? }`

这些缓存在 performLayout 时重建，用于：
- 选区计算 (`updateSelection`)
- 鼠标交互 (`getHyperlinkAtPosition`, `getOnClickAtPosition`)
- 字符矩形查询 (`getCharacterRect`)
- 坐标到字符索引映射 (`getOffsetForPosition`)

#### 2.1.4 paint 绘制算法

[paint](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts#L552-L618) 实现：

```
paint(context, offset):
  1. _getLines() 重新提取行数据（注意：layout 和 paint 各调用一次 _getLines()）
  2. maxLines 裁剪
  3. _buildHighlightSet() → Set<number> 高亮字符索引集
  4. 逐行绘制:
     a. 计算行宽 → 判断是否需要 ellipsis
     b. 计算 leftOffset (对齐)
     c. 逐字符:
        - charW = stringWidth(char)
        - 如果 col + charW > availWidth → break (clip)
        - 如果字符在高亮集中 → style.copyWith({ background: highlightColor })
        - ctx.drawChar!(col, row, char, textStyleToCellStyle(style))
        - col += charW
```

#### 2.1.5 ellipsis 截断算法

[_applyEllipsis](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts#L652-L687)：

```typescript
_applyEllipsis(line, availWidth):
  ellipsisWidth = 3  // '...' = 3 × width 1

  if (availWidth <= 3):
    return availWidth 个 '.' 字符（使用最后一个字符的样式）

  targetWidth = availWidth - 3
  result = []
  currentWidth = 0
  for (entry of line):
    charW = stringWidth(entry.char)
    if (currentWidth + charW > targetWidth) break
    result.push(entry)
    currentWidth += charW

  // 追加 '...'（使用最后一个字符的样式）
  for (ch of '...'):
    result.push({ char: ch, style: lastStyle })

  return result
```

### 2.2 TextStyle 实现

**文件**: [text-style.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/core/text-style.ts)

Flitter 的 TextStyle 是不可变类，9 个属性：

| 属性 | 类型 | SGR 码 |
|------|------|--------|
| `foreground` | `Color?` | `38;2;r;g;b` |
| `background` | `Color?` | `48;2;r;g;b` |
| `bold` | `boolean?` | `1` |
| `dim` | `boolean?` | `2` |
| `italic` | `boolean?` | `3` |
| `underline` | `boolean?` | `4` |
| `strikethrough` | `boolean?` | `9` |
| `inverse` | `boolean?` | `7` |
| `hidden` | `boolean?` | `8` |

**merge(other)** — 字段级覆盖：`other` 有值则用 `other`，否则保留 `this`

**copyWith(overrides)** — 语义同 merge，但参数是 plain object（非 TextStyle 实例）

**equals(other)** — 深度比较所有 9 个字段（Color 使用 `.equals()` 比较）

**toSgr()** — 生成 SGR 参数字符串（如 `"1;38;2;255;0;0"`）

### 2.3 TextSpan 树遍历

**文件**: [text-span.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/core/text-span.ts)

TextSpan 是富文本树的节点，属性：
- `text?: string` — 叶子文本
- `style?: TextStyle` — 当前节点样式
- `children?: readonly TextSpan[]` — 子节点（Object.freeze 冻结）
- `hyperlink?: TextSpanHyperlink` — OSC 8 超链接
- `onClick?: () => void` — 点击回调

[visitChildren](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/core/text-span.ts#L44-L77) 核心遍历算法：

```
visitChildren(visitor, parentStyle?, parentHyperlink?, parentOnClick?):
  effectiveStyle = _computeEffectiveStyle(parentStyle)
  effectiveHyperlink = this.hyperlink ?? parentHyperlink   // 就近覆盖
  effectiveOnClick = this.onClick ?? parentOnClick          // 就近覆盖

  if (this.text?.length > 0):
    result = visitor(text, effectiveStyle, effectiveHyperlink, effectiveOnClick)
    if (result === false) return false                      // 支持提前终止

  if (this.children):
    for (child of children):
      if (!child.visitChildren(visitor, effectiveStyle, ...)) return false

  return true
```

**_computeEffectiveStyle** ([L154-L165](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/core/text-span.ts#L154-L165))：
- 父、子均 undefined → 返回空 `new TextStyle()`
- 仅父有值 → 返回 `this.style`
- 仅子有值 → 返回 `parentStyle`
- 都有值 → `parentStyle.merge(this.style)` — 子覆盖父

### 2.4 wcwidth 实现

**文件**: [wcwidth.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/core/wcwidth.ts)

Flitter 实现了完整的 vendored wcwidth，无外部依赖：

**wcwidth(codePoint)** — 单 codepoint 宽度：
- `< 0x20` → 0（控制字符）
- `0x7F-0x9F` → 0（C1 控制字符）
- `isZeroWidth(cp)` → 0（零宽字符表）
- `isWide(cp)` → 2（宽字符表）
- 其余 → 1

**stringWidth(str)** — 字符串总宽度：
```typescript
for (const char of str) {       // for...of 自动处理 surrogate pair
  const cp = char.codePointAt(0)!;
  width += wcwidth(cp);
}
```

**isZeroWidth 覆盖范围**（6 个单独 codepoint + 5 个区间 + 2 个 variation selector 区间）：

| 范围 | 描述 |
|------|------|
| U+200B | Zero Width Space |
| U+200C | Zero Width Non-Joiner |
| U+200D | Zero Width Joiner (ZWJ) |
| U+FEFF | BOM |
| U+2060 | Word Joiner |
| U+00AD | Soft Hyphen |
| U+0300-036F | Combining Diacritical Marks |
| U+1AB0-1AFF | Combining Diacritical Marks Extended |
| U+1DC0-1DFF | Combining Diacritical Marks Supplement |
| U+20D0-20FF | Combining Diacritical Marks for Symbols |
| U+FE20-FE2F | Combining Half Marks |
| U+FE00-FE0F | Variation Selectors |
| U+E0100-E01EF | Variation Selectors Supplement |

**isWide 覆盖范围**（14 个区间）：
- 东亚宽字符：Hangul, CJK, 日文假名, 韩文等（U+1100-D7AF）
- 全角形式（U+FF01-FF60, U+FFE0-FFE6）
- Emoji 区块（U+1F000-1FAFF）
- CJK 扩展 B/G+（U+20000-3FFFF）

### 2.5 Emoji 宽度检测

**文件**: [text.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts#L232-L247)

Flitter 的 RenderText 包含 `_emojiWidthSupported` 标志：

```typescript
updateEmojiSupport(emojiWidth: 'unknown' | 'narrow' | 'wide'): void {
  const supported = emojiWidth === 'wide';
  if (this._emojiWidthSupported === supported) return;
  this._emojiWidthSupported = supported;
  this.markNeedsLayout();      // 宽度变化触发重新布局
}
```

**注意**：当前 `_emojiWidthSupported` 标志已定义并可更新，但 performLayout/paint 中尚未使用它来调整 emoji 的实际宽度计算。当前 emoji 宽度始终由 `wcwidth()` 的 `isWide()` 表决定。

终端协议层面，Flitter 支持模式 2027（TPRO-03）：
- `\e[?2027h` — 开启 emoji 宽度模式
- `\e[?2027l` — 关闭 emoji 宽度模式

### 2.6 超链接 (OSC 8) 全链路

**数据模型**:
```
TextSpan.hyperlink: { uri: string, id?: string }    // 文本数据层
    ↓ visitChildren() 遍历
CharacterInteraction.hyperlink: TextSpanHyperlink     // 位置缓存层
    ↓ paint 时通过 drawChar 写入
Cell.hyperlink: string                                // ScreenBuffer 层
    ↓ getDiff 差量
CellPatch → Renderer.buildHyperlinkDelta()           // ANSI 输出层
    ↓
\e]8;params;uri\e\\  ...text...  \e]8;;\e\\          // 终端转义序列
```

**RenderText 中的超链接查询**:
- `getHyperlinkAtPosition(x, y)` — 精确坐标 → hyperlink 或 null
- `getOnClickAtPosition(x, y)` — 精确坐标 → onClick 或 null
- `handleMouseEvent({type, x, y})` — 处理 click/enter/hover/exit 鼠标事件

**关键实现细节**:
- 超链接在 paint 时当前 **未直接写入 Cell.hyperlink**，因为 RenderText 使用 `ctx.drawChar()` 而非直接操作 ScreenBuffer
- `drawChar()` 签名中没有 hyperlink 参数，hyperlink 的传递需要经过 PaintContext 层
- 当前 hyperlink 的渲染依赖于 PaintContext.drawTextSpan() 路径（Markdown widget 使用），而非 RenderText 的 drawChar 路径

### 2.7 选区高亮

**文件**: [text.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text.ts#L255-L272)

```typescript
updateSelection(start, end, mode):
  totalChars = _characterPositions.length
  clampedStart = max(0, min(start, totalChars))
  clampedEnd = max(clampedStart, min(end, totalChars))
  selectedRanges = [{ start: clampedStart, end: clampedEnd }]
  _highlightMode = mode
  markNeedsPaint()

clearSelection():
  if (已清除) return   // 避免不必要的 repaint
  selectedRanges = []
  _highlightMode = 'none'
  markNeedsPaint()
```

**高亮颜色选择**:
- `mode === 'selection'` → `_selectionColor`
- `mode === 'copy'` → `_copyHighlightColor ?? _selectionColor`（fallback）
- `mode === 'none'` → 不高亮

**高亮应用** (paint 时):
```typescript
const highlightedIndices = new Set<number>();
for (range of selectedRanges):
  for (i = range.start; i < range.end; i++):
    highlightedIndices.add(i);

// 绘制时检查
if (selectable && highlightColor && highlightedIndices.has(globalCharIdx)):
  highlightedStyle = style.copyWith({ background: highlightColor });
  ctx.drawChar!(col, row, char, textStyleToCellStyle(highlightedStyle));
```

### 2.8 softWrap vs noWrap

Flitter 当前的 RenderText **不支持 softWrap 属性**。文本换行策略：

- **唯一换行点**: `\n` 字符
- **无宽度约束下的自动换行**：不存在
- **超出宽度时行为**：paint 时 clip（`col + charW > availWidth → break`）

这与 Amp 一致 —— Amp 的 RenderText 同样不做 soft-wrap，换行由 Markdown 渲染器在构建 TextSpan 时预处理。

### 2.9 空文本/空行处理

```typescript
// _getLines() 对空字符串:
// segments = [] (visitChildren 无文本输出)
// lines = [[]] (初始化一个空行)
// 结果: 1 个空行

// performLayout 对空行:
// lineWidth = 0
// intrinsicHeight = 1 (有一个空行)
// size = constraints.constrain(Size(0, 1))

// _rebuildPositionCache 对空行:
// characterPositions = [] (无字符)
// visualLines = [{ startIndex: 0, endIndex: 0, row: 0 }] (一个空可视行)
```

### 2.10 文本测量缓存策略

Flitter 的缓存策略：

| 缓存 | 构建时机 | 失效条件 |
|------|---------|---------|
| `_characterPositions[]` | performLayout | `markNeedsLayout()` |
| `_visualLines[]` | performLayout | `markNeedsLayout()` |
| `_characterInteractions[]` | performLayout | `markNeedsLayout()` |
| `_getLines()` 结果 | **不缓存** | 每次 performLayout + paint 各调用一次 |

**失效触发器**:
- `text = newValue` → `markNeedsLayout()` → 下帧重新 performLayout
- `maxLines = newValue` → `markNeedsLayout()`
- `textAlign = newValue` → `markNeedsPaint()`（仅 paint 变化，位置不变）
- `overflow = newValue` → `markNeedsPaint()`
- `updateEmojiSupport()` 变化时 → `markNeedsLayout()`

**性能注意点**:
1. `_getLines()` 在 `performLayout()` 和 `paint()` 中各调用一次，导致 TextSpan 树被遍历两次。这是当前实现的一个性能开销点
2. 位置缓存 `_characterPositions` 使用线性数组，查找时需要 O(n) 遍历（通过 visualLine 缩小到单行范围后再线性搜索）
3. 高亮索引集 `_buildHighlightSet()` 在每次 paint 时重建 Set，对于大文本可能有 GC 压力

### 2.11 PaintContext.drawChar 与文本绘制集成

**文件**: [paint-context.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/scheduler/paint-context.ts#L139-L147)

RenderText 使用的 `drawChar` 签名：
```typescript
drawChar(x, y, char, style?, width?): void
  charWidth = width ?? wcwidth(char.codePointAt(0)!)
  effectiveWidth = max(1, charWidth)
  if (!isInClip(x, y, effectiveWidth)) return
  merged = _mergeWithExistingBg(x, y, style)    // 继承已有背景色
  screen.setChar(x, y, char, merged, effectiveWidth)
```

**背景色继承**: 当新 style 没有 bg 时，`_mergeWithExistingBg` 从 ScreenBuffer 已有的 cell 继承 bg。这确保了覆盖绘制时背景色的连续性。

### 2.12 textStyleToCellStyle 转换

**文件**: [paint-context.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/scheduler/paint-context.ts#L30-L41)

```typescript
function textStyleToCellStyle(ts: TextStyle): CellStyle {
  const cs: CellStyle = {};
  if (ts.foreground !== undefined) cs.fg = ts.foreground;
  if (ts.background !== undefined) cs.bg = ts.background;
  if (ts.bold !== undefined) cs.bold = ts.bold;
  if (ts.dim !== undefined) cs.dim = ts.dim;
  if (ts.italic !== undefined) cs.italic = ts.italic;
  if (ts.underline !== undefined) cs.underline = ts.underline;
  if (ts.strikethrough !== undefined) cs.strikethrough = ts.strikethrough;
  if (ts.inverse !== undefined) cs.inverse = ts.inverse;
  return cs;
}
```

只复制已定义的字段，未定义字段不出现在 CellStyle 中。注意：TextStyle.hidden 没有映射到 CellStyle（CellStyle 无 hidden 属性），因为终端渲染不需要 hidden 属性（hidden 文本直接不渲染即可）。

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **文本测量算法** | 逐 codepoint wcwidth 累加 | 逐 codepoint wcwidth 累加 | 🟢 一致 | 完全相同的 stringWidth → wcwidth 链路 |
| **换行策略** | 仅 `\n` 显式换行，不做 soft-wrap | 仅 `\n` 显式换行，不做 soft-wrap | 🟢 一致 | 两者均依赖上层(Markdown)预处理换行 |
| **maxLines 截断** | lines.slice(0, maxLines) | lines.slice(0, maxLines) | 🟢 一致 | 相同的预裁剪策略 |
| **ellipsis 截断** | 预留 3 列给 `...`，逐字符截断 | 预留 3 列给 `...`，逐字符截断 | 🟢 一致 | 完全相同的算法，含 availWidth ≤ 3 边界处理 |
| **clip 截断** | paint 时 col + charW > availWidth → break | paint 时 col + charW > availWidth → break | 🟢 一致 | 相同的字符级 clip |
| **textAlign** | left/center/right + clamp leftOffset ≥ 0 | left/center/right + clamp leftOffset ≥ 0 | 🟢 一致 | 相同的偏移计算公式 |
| **wcwidth 零宽表** | ZWJ, ZWNJ, ZWSP, BOM, WJ, SHY + combining + VS | ZWJ, ZWNJ, ZWSP, BOM, WJ, SHY + combining + VS | 🟢 一致 | 完全相同的零宽字符覆盖范围 |
| **wcwidth 宽字符表** | CJK + Hangul + Emoji (1F000-1FAFF) + Extensions | CJK + Hangul + Emoji (1F000-1FAFF) + Extensions | 🟢 一致 | 完全相同的 Unicode 区间 |
| **Emoji ZWJ 序列** | 逐 codepoint，ZWJ=0 宽，各部件独立计宽 | 逐 codepoint，ZWJ=0 宽，各部件独立计宽 | 🟡 已知限制 | 两者都有 ZWJ 序列宽度过大的问题，需终端 mode 2027 协作 |
| **Emoji Variation Selector** | VS15/VS16 = width 0 | VS15/VS16 = width 0 | 🟢 一致 | 变体选择符正确处理为零宽 |
| **Emoji Skin Tone** | Fitzpatrick modifier 在 emoji 范围 = width 2 | Fitzpatrick modifier 在 emoji 范围 = width 2 | 🟡 已知限制 | 皮肤色修饰符被独立计为 width 2，与终端实际渲染可能不一致 |
| **Emoji 宽度模式** | 模式 2027 (`\e[?2027h/l`) | 模式 2027 (`\e[?2027h/l`) + _emojiWidthSupported 标志 | 🟡 功能预留 | Flitter 有 _emojiWidthSupported 但 layout/paint 未实际使用 |
| **TextSpan 树遍历** | DFS，parentStyle.merge(thisStyle) | DFS，parentStyle.merge(thisStyle) | 🟢 一致 | 相同的深度优先、样式合并、hyperlink/onClick 继承 |
| **TextStyle.merge** | 字段级 overlay（other 有值则覆盖 this） | 字段级 overlay（other 有值则覆盖 this） | 🟢 一致 | 9 个字段逐一 undefined 检查 |
| **TextStyle.copyWith** | 创建新实例，指定字段覆盖 | 创建新实例，指定字段覆盖 | 🟢 一致 | 语义相同 |
| **TextStyle.equals** | 深度比较 9 字段 + Color.equals | 深度比较 9 字段 + Color.equals | 🟢 一致 | |
| **OSC 8 超链接数据模型** | TextSpan.hyperlink → Cell.hyperlink → OSC 8 | TextSpan.hyperlink → CharacterInteraction → Cell.hyperlink → OSC 8 | 🟢 一致 | 相同的数据流，Flitter 多了一层交互缓存 |
| **OSC 8 渲染** | Renderer.buildHyperlinkDelta() | Renderer.buildHyperlinkDelta() | 🟢 一致 | 相同的 delta 计算和转义序列输出 |
| **RenderText.drawChar 超链接传递** | 通过 screen 直接操作 cell.hyperlink | drawChar 签名无 hyperlink 参数 | 🟡 微差异 | Flitter 的 RenderText.paint 使用 drawChar 路径，不直接传递 hyperlink 到 Cell |
| **文本选区** | selectable + selectedRanges + highlightMode | selectable + selectedRanges + highlightMode | 🟢 一致 | 相同的三态高亮模式 (selection/copy/none) |
| **选区高亮颜色** | selectionColor / copyHighlightColor + fallback | selectionColor / copyHighlightColor + fallback | 🟢 一致 | copy 模式 fallback 到 selectionColor |
| **字符位置缓存** | layout 时构建 | layout 时构建 (_characterPositions, _visualLines, _characterInteractions) | 🟢 一致 | |
| **鼠标交互** | click/enter/hover/exit + cursor override | handleMouseEvent + cursor override | 🟢 一致 | 相同的事件分发逻辑 |
| **_getLines() 缓存** | 未缓存，每次调用重算 | 未缓存，performLayout + paint 各调用一次 | 🟡 性能 | 两者都存在重复遍历 TextSpan 树的开销 |
| **softWrap 属性** | 不存在 | 不存在 | 🟢 一致 | 两者均不支持自动换行 |
| **word-break / CJK 断行** | 不存在（RenderText 层面） | 不存在（RenderText 层面） | 🟢 一致 | 断行由 Markdown 层预处理 |
| **TextOverflow.fade** | 不支持 | 不支持 | 🟢 一致 | 仅 clip 和 ellipsis |
| **空文本处理** | 1 空行，height=1 | 1 空行，height=1，位置缓存为空 | 🟢 一致 | |
| **背景色继承** | paint 时合并已有 bg | _mergeWithExistingBg | 🟢 一致 | drawChar/drawText 自动继承已有背景 |
| **TextStyle.hidden** | 存在属性 | 存在属性但不映射到 CellStyle | 🟢 一致 | hidden 在终端不需要显式 SGR |

---

## 4. 差异修复建议（按优先级排序）

### 4.1 🟡 P2: RenderText 超链接传递到 Cell

**问题**: Flitter 的 `RenderText.paint()` 使用 `ctx.drawChar()` 逐字符绘制，但 `drawChar` 签名中没有 `hyperlink` 参数。TextSpan 上的 hyperlink 信息虽然在 `_characterInteractions` 缓存中可用，但不会传递到 `ScreenBuffer` 的 `Cell.hyperlink` 字段。

**影响**: 通过 `RenderText` 渲染的超链接文本不会在终端生成 OSC 8 转义序列。只有通过 `PaintContext.drawTextSpan()` 路径（如 Markdown widget 直接调用）才能正确传递超链接。

**建议修复**:
```typescript
// 方案 A: 扩展 drawChar 签名
drawChar(x, y, char, style?, width?, hyperlink?): void

// 方案 B: 在 RenderText.paint 中直接操作 ScreenBuffer
// 通过 PaintContext 暴露 setHyperlink(x, y, uri) 方法
```

**优先级**: P2 — 当前 Amp UI 中的超链接主要出现在 Markdown 渲染结果中（走 drawTextSpan 路径），RenderText 直接渲染的超链接场景较少。但为了功能完整性应修复。

### 4.2 🟡 P2: _emojiWidthSupported 标志实际使用

**问题**: `_emojiWidthSupported` 标志已存在，`updateEmojiSupport()` 方法可以更新它并触发 `markNeedsLayout()`，但 `performLayout()` 和 `paint()` 中未使用此标志调整 emoji 宽度计算。

**影响**: 当终端支持 mode 2027（宽 emoji）时，ZWJ 序列等复合 emoji 应该被视为 width 2 而非各部件宽度之和。当前无论终端能力如何，emoji 宽度始终按逐 codepoint wcwidth 计算。

**建议修复**:
```typescript
// 在 _lineWidth 和 paint 的宽度计算中:
// 当 _emojiWidthSupported === true 时，识别 emoji 序列（ZWJ、VS16 等）
// 将整个序列视为 width 2 而非各 codepoint 宽度之和
```

**优先级**: P2 — Amp 的实际行为也是逐 codepoint 计算（依赖 mode 2027 让终端处理），两者行为一致。但如果需要更精确的布局对齐，需要 grapheme 级别的宽度计算。

### 4.3 🟡 P3: _getLines() 双重调用优化

**问题**: `performLayout()` 和 `paint()` 各自独立调用 `_getLines()`，每次都重新遍历 TextSpan 树并构建字符数组。

**影响**: 对于大文本（如长日志输出），每帧的 TextSpan 遍历开销翻倍。

**建议修复**:
```typescript
// 在 performLayout 中缓存 lines 结果:
private _cachedDisplayLines?: ...[][];

performLayout():
  this._cachedDisplayLines = displayLines;
  // ... 其余逻辑不变

paint():
  const displayLines = this._cachedDisplayLines ?? this._getLines();
  // ... 其余逻辑不变
```

**优先级**: P3 — 当前 Amp 的 TUI 文本通常较短（一行消息、工具名等），性能影响有限。但对于未来的长文本场景（如代码预览）可能成为瓶颈。

### 4.4 🟡 P3: 高亮索引集构建优化

**问题**: `_buildHighlightSet()` 在每次 `paint()` 时通过 for 循环逐一添加索引到 `Set<number>`。

**影响**: 对于大范围选区（如全选 1000 个字符），每帧创建包含 1000 个元素的 Set。

**建议修复**:
```typescript
// 直接在绘制循环中内联检查范围:
const isHighlighted = selectable && highlightColor &&
  selectedRanges.some(r => globalCharIdx >= r.start && globalCharIdx < r.end);
```

**优先级**: P3 — 选区通常不大，且 Set 的 has() 是 O(1)。真正的瓶颈不在这里。

### 4.5 🟢 P4: TextStyle.hidden 到 CellStyle 映射

**问题**: `TextStyle.hidden` 属性不映射到 `CellStyle`。

**影响**: 无实际影响 — 终端中 hidden 文本（SGR 8）极少使用，且在 TUI 中没有明确的使用场景。Amp 也未在 UI 中使用此属性。

**建议**: 不修复。如需要，在 `textStyleToCellStyle` 中添加 hidden 映射即可。
