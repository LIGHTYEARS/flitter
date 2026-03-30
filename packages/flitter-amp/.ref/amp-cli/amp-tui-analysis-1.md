# Amp TUI 深度分析 #1: ScreenBuffer 双缓冲 + Diff 算法 + SGR 优化

> 基于 Amp CLI v0.0.1774500280 (Bun standalone binary) 混淆 JS 逆向 + flitter-core 源码对比。
> 分析日期: 2026-03-29

---

## 1. Amp 实现细节

### 1.1 双缓冲架构 (class `ij` / ScreenBuffer)

**源码位置**: `amp-strings.txt:529716`，混淆名 `ij`（ScreenBuffer）、`$F`（Buffer）

Amp 使用经典的双缓冲（double buffering）策略：

```
┌────────────────────────┐     ┌────────────────────────┐
│  frontBuffer ($F)      │     │  backBuffer ($F)       │
│  已提交帧              │     │  当前绘制中            │
│  (上一帧渲染到屏幕的)  │     │  (widget.paint 写入)   │
└────────────────────────┘     └────────────────────────┘
          ↑                              ↑
          │                              │
    getDiff() 读取              setCell/setChar 写入
```

**关键字段**（逆向自 `class ij`）:
```js
class ij {
  frontBuffer;          // $F 实例 — 已提交帧
  backBuffer;           // $F 实例 — 当前工作帧
  width; height;
  needsFullRefresh = false;
  cursorPosition = null;  // {x, y} | null
  cursorVisible = false;
  cursorShape = 0;        // DECSCUSR 0-6
}
```

#### 1.1.1 Buffer 存储结构 (`class $F`)

Amp 的 `$F` 使用 **二维数组** `Cell[][]`（行列索引）:

```js
class $F {
  cells;            // Cell[][] — this.cells[y][x]
  width; height;
  indexToRgb = [];  // 256-color index → RGB 查找表
  defaultBg = w0.default();
  defaultFg = w0.default();

  resize(w, h) {
    this.cells = Array(h).fill(null).map(() =>
      Array(w).fill(null).map(() => yu)  // yu = EMPTY_CELL
    );
  }
}
```

核心要点：
- **`cells[y][x]`** 二维索引，行优先
- **`resize()`** 每次都创建全新的二维数组，不保留旧内容
- **`getCellRows()`** 返回 `this.cells`（原始二维数组引用）
- **`getCells()`** 返回 deep copy（用于外部消费，避免副作用）
- **`copyTo(target)`** 支持缓冲区间的深拷贝

#### 1.1.2 present() — 缓冲区交换

```js
present() {
  let g = this.frontBuffer;
  this.frontBuffer = this.backBuffer;
  this.backBuffer = g;
  // 注意: Amp 的 present() **不清除** 新的 backBuffer
}
```

**关键发现**: Amp 的 `present()` 是纯指针交换，**不清除**新的 back buffer。这意味着下一帧开始绘制前，back buffer 中残留着上一帧的 front buffer 内容（即两帧前的画面）。Widget 的 `paint()` 需要覆写所有变化区域，否则会出现残影。

#### 1.1.3 Alpha 混合 (`aF8` / blendStyle)

Amp 在 `$F.setCell()` 中实现了 Alpha 合成：

```js
setCell(x, y, cell) {
  // 如果 fg 或 bg 有 alpha < 1，与已有 cell 混合
  if (hasAlpha(cell.style.fg) || hasAlpha(cell.style.bg)) {
    let existing = this.cells[y][x];
    cell.style = aF8(cell.style, existing.style, this.defaultBg, this.defaultFg, this.indexToRgb);
  }
  this.cells[y][x] = cell;
  // 宽字符处理
  if (cell.width > 1) {
    for (r = 1; r < cell.width; r++)
      this.cells[y][x + r] = q3(' ', cell.style, 1);  // 占位符 cell
  }
}
```

混合算法 `aF8(newStyle, existingStyle, defaultBg, defaultFg, indexToRgb)`:
- fg: `blendColor(new.fg, existing.fg || defaultFg, indexToRgb)`
- bg: 先检查 alpha，type="none" 或 alpha=0 时保留 existing.bg
- Boolean 属性 (bold, italic 等): 如果 new 有定义则覆盖，否则保留 existing

### 1.2 getDiff() 算法

**源码位置**: `ij.getDiff()`

#### 1.2.1 输出格式

Amp 的 getDiff 返回 **扁平数组** `{x, y, cell}[]`:

```js
getDiff() → Array<{ x: number, y: number, cell: Cell }>
```

每个变化的 cell 独立一个条目，不做行级或区段级分组。

#### 1.2.2 全量刷新路径

```js
if (this.needsFullRefresh) {
  for (y = 0; y < height; y++) {
    let row = backRows[y];
    for (x = 0; x < width; x++) {
      let cell = row[x] ?? EMPTY_CELL;
      changes.push({ x, y, cell });
      if (cell.width > 1) x += cell.width - 1;  // 跳过宽字符续列
    }
  }
  this.needsFullRefresh = false;
  return changes;
}
```

#### 1.2.3 增量 diff 路径

```js
for (y = 0; y < height; y++) {
  let frontRow = frontRows[y];
  let backRow = backRows[y];

  for (x = 0; x < width; x++) {
    let frontCell = frontRow[x] ?? EMPTY_CELL;
    let backCell = backRow[x] ?? EMPTY_CELL;

    // 快速路径: 两者都是 EMPTY_CELL（引用相等）
    if (frontCell === EMPTY_CELL && backCell === EMPTY_CELL) continue;

    if (!cellsEqual(frontCell, backCell)) {
      changes.push({ x, y, cell: backCell });
      if (backCell.width > 1) x += backCell.width - 1;
    } else if (backCell.width > 1) {
      x += backCell.width - 1;
    }
  }
}
```

**三个优化点**:
1. **EMPTY_CELL 引用相等** (`===`): 当两端都是空白时直接跳过，避免深比较
2. **宽字符跳跃**: `x += cell.width - 1` 跳过续列
3. **逐行逐列全扫描**: 无脏区域追踪，无行级 hash，每帧扫描全部 W×H 单元

### 1.3 Renderer (class `z_0`)

**源码位置**: `z_0.render(diff)`

#### 1.3.1 SGR 状态机

Renderer 维护全局 SGR 状态 `currentStyle`，跨帧保持：

```js
class z_0 {
  currentStyle = {};   // 上次输出的 SGR 状态
  currentX = 0;        // 上次输出的列位置 ← 关键优化！
  currentY = 0;        // 上次输出的行位置 ← 关键优化！
}
```

#### 1.3.2 render() 连续 cell 优化

Amp 的 `z_0.render(diff)` 有一个**关键优化**——当连续 cell 满足条件时，跳过光标移动和 SGR 重新输出：

```js
render(diff) {
  let lastStyle = null;
  let lastHyperlink;
  let lastEndX = -1, lastY = -1;
  let currentRowY = -1, skipUntilX = -1;

  for (let change of diff) {
    // 行切换重置
    if (change.y !== currentRowY) {
      currentRowY = change.y;
      skipUntilX = -1;
    }
    // 宽字符跳过
    if (skipUntilX !== -1 && change.x < skipUntilX) continue;

    // ★ 核心优化: 连续 cell 判定
    if (!(lastStyle !== null
      && change.y === lastY
      && change.x === lastEndX                       // 紧接上一个 cell
      && stylesMatch(lastStyle, change.cell.style)    // 样式相同
      && hyperlinksMatch(lastHyperlink, change.cell.hyperlink))) // 超链接相同
    {
      // 需要移动光标（仅当位置不连续时）
      if (this.currentX !== change.x || this.currentY !== change.y) {
        out.append(moveTo(change.y, change.x));
      }
      // 输出 SGR delta
      out.append(buildSgrDelta(change.cell.style, this.currentStyle, this.capabilities));
      out.append(buildHyperlinkDelta(change.cell.hyperlink, this.currentStyle));
      lastStyle = change.cell.style;
      lastHyperlink = change.cell.hyperlink;
    }
    // 否则: 光标自动前进，样式不变 → 只输出字符

    out.append(formatCell(change.cell, this.capabilities));
    this.currentX += change.cell.width;
    lastEndX = change.x + change.cell.width;
    lastY = change.y;
  }
}
```

**关键差异**: 当连续变化 cell 在同一行、位置连续、样式+超链接完全相同时，Amp **跳过所有控制序列**，只输出字符。这在大面积同色文本变更时极大减少输出字节数。

#### 1.3.3 buildSgrDelta (`WF8`)

Amp 的 SGR delta 策略：

```js
function WF8(desired, currentState, capabilities) {
  let s = '';
  // 1. Foreground delta
  if (!colorsEqual(desired.fg, currentState.fg)) {
    if (desired.fg === undefined && currentState.fg !== undefined)
      s += CSI + '39m';     // reset to default
    else
      s += colorToSgr(desired.fg, true, capabilities);
    currentState.fg = desired.fg;  // ★ 直接修改 currentState
  }
  // 2. Background delta (同理)
  // 3. Bold/Dim 互斥处理:
  //    - 关闭 bold 用 22m（也关闭 dim），若 dim 仍需要则重新发 2m
  //    - 关闭 dim 用 22m（也关闭 bold），若 bold 仍需要则重新发 1m
  // 4. Italic: 3m / 23m
  // 5. Underline: 4m / 24m (检查 capabilities.underlineSupport)
  // 6. Strikethrough: 9m / 29m
  // 7. Reverse: 7m / 27m
  return s;
}
```

**关键**: Amp 的 `WF8` **直接修改** `currentState` 对象（副作用式），不返回新对象。每个属性独立比较、独立输出 SGR 码。

#### 1.3.4 colorToSgr (`Wu0`)

```js
function Wu0(color, isForeground, capabilities) {
  switch (color.type) {
    case 'none':    return '';
    case 'default': return CSI + (isFg ? '39' : '49') + 'm';
    case 'index':   return CSI + `${isFg ? '38' : '48'};5;${color.value}m`;
    case 'rgb':
      if (!capabilities.canRgb) {
        // ★ 降级: RGB → 最近 256 色
        let idx = sJ(r, g, b);   // Euclidean 最近匹配 + Map 缓存
        return CSI + `${isFg ? '38' : '48'};5;${idx}m`;
      }
      return CSI + `${isFg ? '38' : '48'};2;${r};${g};${b}m`;
  }
}
```

注意: Amp 的 `Wu0` 每个颜色输出独立的完整 `CSI...m` 序列。

#### 1.3.5 RGB → 256 色最近匹配 (`sJ`)

```js
var Uu0 = [...216 色立方 + 24 灰阶];  // 预计算调色板
var Hu0 = new Map();                     // "r,g,b" → index 缓存

function sJ(r, g, b) {
  let key = `${r},${g},${b}`;
  if (Hu0.has(key)) return Hu0.get(key);
  // Euclidean 距离遍历 240 个候选色
  let bestIdx = 16, bestDist = Infinity;
  for (i = 0; i < Uu0.length; i++) {
    dist = (r-pr)² + (g-pg)² + (b-pb)²;
    if (dist < bestDist) { bestDist = dist; bestIdx = i + 16; }
  }
  Hu0.set(key, bestIdx);
  return bestIdx;
}
```

缓存键是字符串 `"r,g,b"`，用 `Map` 做 memoization。

### 1.4 TerminalManager 渲染流程 (class `wB0`)

完整渲染流程:

```
wB0.render():
  1. screen.getDiff()                    → {x,y,cell}[]
  2. new bJ() (StringBuilder)
  3. renderer.startSync()                → ESC[?2026h (BSU)
  4. renderer.hideCursor()               → ESC[?25l
  5. renderer.reset()                    → ESC[0m + 关闭 OSC8
  6. renderer.moveTo(0, 0)               → ESC[1;1H
  7. renderer.render(diff)               → SGR delta + 字符
  8. 光标定位: moveTo(cursor.x, cursor.y)
  9. 光标形状: setCursorShape(shape)       → ESC[n q
  10. 光标显示: showCursor()              → ESC[?25h (如果 visible)
  11. renderer.endSync()                 → ESC[?2026l (ESU)
  12. process.stdout.write(output)
  13. screen.present()                   → 交换指针
```

**关键**: Amp 在 render 开始时 **先 reset SGR + home cursor**（步骤 5-6），然后 renderer.render() 从 (0,0) 开始追踪 currentX/currentY。

### 1.5 Cell 数据结构

```js
function q3(char = ' ', style = {}, width = 1, hyperlink) {
  return { char, style: {...style}, width, hyperlink };
}

var yu = q3(' ', {});  // EMPTY_CELL (非冻结，但共享引用)
```

**样式属性**: `{ fg, bg, bold, dim, italic, underline, strikethrough, reverse }`

**Color 类型** (`w0`):
- `{ type: "none" }` — 无色（透明）
- `{ type: "default" }` — 终端默认色
- `{ type: "index", value: N }` — 256 色
- `{ type: "rgb", value: {r, g, b} }` — TrueColor
- 可带 `alpha` 属性用于合成

**Hyperlink**: `{ uri: string, id: string }` 对象，用于 OSC 8。

### 1.6 控制字符处理

Amp 的 renderer 包含**控制字符检测和替换**:

```js
let isControl = isControlChar(char);
let displayChar = isControl ? replacementChar(char) : char;
out.append(formatCell(change.cell, capabilities));
```

这防止控制字符（如 `\x00`-`\x1f`）破坏终端输出。

---

## 2. Flitter 实现细节

### 2.1 双缓冲架构

**文件**: [screen-buffer.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/screen-buffer.ts)

flitter-core 的 `ScreenBuffer`（L143-L426）与 Amp 同构:

```typescript
export class ScreenBuffer {
  private frontBuffer: Buffer;
  private backBuffer: Buffer;
  width: number;
  height: number;
  needsFullRefresh: boolean;
  cursorPosition: { x: number; y: number } | null;
  cursorVisible: boolean;
  cursorShape: number;
  defaultBg?: Color;
  defaultFg?: Color;
  indexRgbMapping?: Map<number, Color>;
}
```

#### 2.1.1 Buffer 存储结构

**文件**: [screen-buffer.ts L30-L136](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/screen-buffer.ts#L30-L136)

flitter-core 的 `Buffer` 使用 **一维扁平数组** `Cell[]`，行优先索引:

```typescript
export class Buffer {
  private cells: Cell[];  // index = y * width + x

  getCell(x: number, y: number): Cell {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return EMPTY_CELL;
    return this.cells[y * this.width + x]!;
  }
}
```

与 Amp 的 `Cell[][]` 二维数组不同，flitter 用扁平数组 + 手动索引计算。

#### 2.1.2 present() — 清除新 back buffer

**文件**: [screen-buffer.ts L322-L327](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/screen-buffer.ts#L322-L327)

```typescript
present(): void {
  const tmp = this.frontBuffer;
  this.frontBuffer = this.backBuffer;
  this.backBuffer = tmp;
  this.backBuffer.clear();  // ← 额外步骤: 清除新 back buffer
}
```

flitter 在交换后**立即清除**新的 back buffer（填充 EMPTY_CELL），确保下一帧从干净画布开始。

#### 2.1.3 resize() — 保留旧内容

**文件**: [screen-buffer.ts L89-L105](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/screen-buffer.ts#L89-L105)

```typescript
resize(newWidth: number, newHeight: number): void {
  const newCells = Buffer.createCells(newWidth, newHeight);
  const copyW = Math.min(this.width, newWidth);
  const copyH = Math.min(this.height, newHeight);
  for (let y = 0; y < copyH; y++) {
    for (let x = 0; x < copyW; x++) {
      newCells[y * newWidth + x] = this.cells[y * this.width + x]!;
    }
  }
  this.cells = newCells;
}
```

flitter 的 `resize()` 保留旧内容（拷贝重叠区域），而 Amp 的 `resize()` 每次创建全新空数组。

#### 2.1.4 setCell() — 无 Alpha 混合

**文件**: [screen-buffer.ts L60-L75](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/screen-buffer.ts#L60-L75)

```typescript
setCell(x: number, y: number, cell: Cell): void {
  if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
  this.cells[y * this.width + x] = cell;
  if (cell.width > 1) {
    for (let r = 1; r < cell.width; r++) {
      const nx = x + r;
      if (nx < this.width) {
        this.cells[y * this.width + nx] = createCell('', cell.style, 0);
      }
    }
  }
}
```

flitter 的 `Buffer.setCell()` **不做 alpha 混合**——直接覆写。Alpha 合成由上层 `PaintContext` / `blendStyle()` 处理（[cell.ts L138-L166](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/cell.ts#L138-L166)）。

### 2.2 getDiff() 算法

**文件**: [screen-buffer.ts L337-L425](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/screen-buffer.ts#L337-L425)

#### 2.2.1 输出格式

flitter 返回 **分组结构** `RowPatch[]`:

```typescript
interface CellPatch { col: number; cells: Cell[]; }  // 连续变化段
interface RowPatch { row: number; patches: CellPatch[]; }  // 一行的所有变化段
```

相比 Amp 的扁平 `{x,y,cell}[]`，flitter 将变化组织为**行→段→cell**的层次结构。

#### 2.2.2 增量 diff 实现

```typescript
for (let y = 0; y < h; y++) {
  const rowPatches: CellPatch[] = [];
  let runStart = -1;
  let runCells: Cell[] = [];

  for (let x = 0; x < w; ) {
    const frontCell = frontCells[y * w + x] ?? EMPTY_CELL;
    const backCell = backCells[y * w + x] ?? EMPTY_CELL;

    if (frontCell === EMPTY_CELL && backCell === EMPTY_CELL) {
      // 快速路径: EMPTY_CELL 引用相等
      if (runCells.length > 0) {
        rowPatches.push({ col: runStart, cells: runCells });
        runStart = -1; runCells = [];
      }
      x++;
      continue;
    }

    if (!cellsEqual(frontCell, backCell)) {
      if (runCells.length === 0) runStart = x;
      runCells.push(backCell);
      x += Math.max(1, backCell.width);
    } else {
      if (runCells.length > 0) {
        rowPatches.push({ col: runStart, cells: runCells });
        runStart = -1; runCells = [];
      }
      x += Math.max(1, backCell.width);
    }
  }
  // Flush remaining run
  if (runCells.length > 0) rowPatches.push({ col: runStart, cells: runCells });
  if (rowPatches.length > 0) patches.push({ row: y, patches: rowPatches });
}
```

**连续段合并**: flitter 将同一行内连续变化的 cell 合并为一个 `CellPatch`，减少后续 renderer 的光标移动次数。

### 2.3 Renderer

**文件**: [renderer.ts L303-L427](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/renderer.ts#L303-L427)

#### 2.3.1 SGR 状态追踪

```typescript
export class Renderer {
  private lastStyle: CellStyle;        // 跨帧 SGR 状态
  private lastHyperlink: string | undefined;
  // 注意: 没有 currentX/currentY 追踪
}
```

#### 2.3.2 render() 实现

```typescript
render(patches: RowPatch[], cursor?: CursorState): string {
  const parts: string[] = [];
  parts.push(BSU);         // 同步更新开始
  parts.push(CURSOR_HIDE); // 隐藏光标

  const sortedPatches = [...patches].sort((a, b) => a.row - b.row);

  for (const rowPatch of sortedPatches) {
    for (const cellPatch of rowPatch.patches) {
      let col = cellPatch.col;
      parts.push(CURSOR_MOVE(col, rowPatch.row));  // ★ 每个 CellPatch 都移动光标

      for (const cell of cellPatch.cells) {
        if (cell.width === 0) { col++; continue; }  // 跳过续列

        const sgrDelta = buildSgrDelta(this.lastStyle, cell.style, this._capabilities);
        if (sgrDelta) parts.push(sgrDelta);
        this.lastStyle = cell.style;

        const hlDelta = this.buildHyperlinkDelta(cell.hyperlink);
        if (hlDelta) parts.push(hlDelta);

        parts.push(cell.char);
        col += cell.width;
      }
    }
  }

  // 光标处理
  if (cursor?.visible && cursor.position) {
    parts.push(CURSOR_MOVE(cursor.position.x, cursor.position.y));
    if (cursor.shape > 0) parts.push(CURSOR_SHAPE(cursor.shape));
    parts.push(CURSOR_SHOW);
  }

  parts.push(ESU);        // 同步更新结束
  parts.push(SGR_RESET);  // 重置 SGR
  this.lastStyle = {};
  this.lastHyperlink = undefined;
  return parts.join('');
}
```

#### 2.3.3 buildSgrDelta

**文件**: [renderer.ts L144-L170](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/renderer.ts#L144-L170)

```typescript
export function buildSgrDelta(prev: CellStyle, next: CellStyle, caps?): string {
  if (stylesEqual(prev, next)) return '';

  const needsReset = checkNeedsReset(prev, next);  // bold/dim 互斥检查
  const codes: string[] = [];

  if (needsReset) {
    codes.push('0');
    // 全量重设 next 的所有属性
    addColorCodes(codes, undefined, next.fg, true, caps);
    addColorCodes(codes, undefined, next.bg, false, caps);
    if (next.bold) codes.push('1');
    // ...
  } else {
    // 增量 delta
    addColorCodes(codes, prev.fg, next.fg, true, caps);
    addColorCodes(codes, prev.bg, next.bg, false, caps);
    addBoolAttrDelta(codes, prev, next);
  }

  if (codes.length === 0) return '';
  return `${CSI}${codes.join(';')}m`;  // ★ 合并为单个 CSI...m
}
```

**SGR 合并优化**: flitter 将所有变化的 SGR code 合并到**单个** `ESC[code1;code2;...m` 序列中，而 Amp 的 `WF8` 为每个属性变化独立输出 `ESC[...m`。

#### 2.3.4 addColorCodes — SGR 参数内联

**文件**: [renderer.ts L256-L279](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/renderer.ts#L256-L279)

```typescript
function addColorCodes(codes, prevColor, nextColor, isFg, caps) {
  if (prevColor === nextColor) return;
  if (prevColor && nextColor && prevColor.equals(nextColor)) return;

  if (nextColor === undefined) {
    codes.push(isFg ? '39' : '49');
  } else {
    let color = nextColor;
    if (caps && !caps.trueColor && color.mode === 'rgb') {
      color = color.toAnsi256();  // RGB → 256色降级
    }
    codes.push(isFg ? color.toSgrFg() : color.toSgrBg());
  }
}
```

`Color.toSgrFg()` 返回的是 **参数部分**（如 `"38;2;255;128;0"`），不包含 `CSI` 和 `m`，这样可以和其他属性合并。

### 2.4 TerminalManager 渲染流程

**文件**: [terminal-manager.ts L184-L233](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/terminal-manager.ts#L184-L233)

```
flush():
  1. screenBuffer.getDiff()               → RowPatch[]
  2. 统计变化 cell 数 (遍历 RowPatch)
  3. 构建 CursorState
  4. renderer.render(diff, cursorState)    → ANSI 字符串
     内部: BSU → hideCursor → patches → cursor → ESU → SGR_RESET
  5. platform.writeStdout(output)
  6. screenBuffer.present()               → 交换 + 清除
```

与 Amp 的差异:
- flitter 的 `renderer.render()` 是**一体化**方法，BSU/ESU/cursor 都在内部处理
- Amp 的 `wB0.render()` 将 BSU/hideCursor/reset/homeCursor/render/cursor/ESU 分步骤调用

### 2.5 Cell 数据结构

**文件**: [cell.ts L1-L166](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/cell.ts)

```typescript
export interface Cell {
  char: string;
  style: CellStyle;
  width: number;
  hyperlink?: string;  // ← Amp 用 {uri, id} 对象
}

export const EMPTY_CELL: Readonly<Cell> = Object.freeze({
  char: ' ',
  style: Object.freeze({}) as CellStyle,
  width: 1,
});
```

**CellStyle**: `{ fg?, bg?, bold?, italic?, underline?, strikethrough?, dim?, inverse? }`

**cellsEqual()** ([cell.ts L93-L101](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/cell.ts#L93-L101)):

```typescript
export function cellsEqual(a: Cell, b: Cell): boolean {
  if (a === b) return true;  // 引用相等快速路径
  return a.char === b.char && a.width === b.width
    && stylesEqual(a.style, b.style)
    && a.hyperlink === b.hyperlink;
}
```

### 2.6 Color 系统

**文件**: [color.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/core/color.ts)

flitter 的 `Color` 是不可变值类型:

```typescript
export class Color {
  readonly mode: 'named' | 'ansi256' | 'rgb';
  readonly value: number;  // packed: rgb → (r<<16 | g<<8 | b)
  readonly alpha: number;

  toSgrFg(): string { ... }  // 返回 "38;2;R;G;B" 格式（仅参数，无 CSI/m）
  toSgrBg(): string { ... }  // 返回 "48;2;R;G;B" 格式
  toAnsi256(): Color { ... } // RGB → 最近 256 色
  equals(other): boolean { ... }
}
```

RGB → 256 色转换使用同样的 Euclidean 距离 + `Map` 缓存，但缓存键是 packed integer `(r<<16 | g<<8 | b)` 而非字符串。

### 2.7 ANSI Parser

**文件**: [ansi-parser.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/ansi-parser.ts)

`parseAnsiToTextSpan(input)` 将 ANSI 转义字符串解析为 `TextSpan` 树，用于显示外部命令输出。支持:
- SGR (0-107 所有标准码)
- 256-color (38;5;N / 48;5;N)
- TrueColor (38;2;R;G;B / 48;2;R;G;B)
- OSC 8 超链接

对应 Amp 的 `oX8` SGR 解析函数。

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **Buffer 存储** | `Cell[][]` 二维数组 | `Cell[]` 扁平数组 `[y*w+x]` | 🟢 等价 | flitter 的扁平数组内存连续，cache 友好。Amp 的二维数组每行是独立分配。性能上 flitter 可能略优。 |
| **present() 语义** | 纯指针交换，**不清除** back buffer | 指针交换 + **清除** back buffer (fill EMPTY_CELL) | 🟡 差异 | Amp 不清除→下帧 paint 必须覆盖所有区域（由 WidgetsBinding 保证 `screen.clear()` 在 paint 前调用）。flitter 在 present 内部清除→更安全但多一次 O(W×H) 清除开销。 |
| **resize() 内容保留** | 创建全新空数组，不保留旧内容 | 保留旧内容（拷贝重叠区域） | 🟢 无影响 | resize 后都会 `markForRefresh()`，下帧全量重绘，保留旧内容无实际意义。 |
| **getDiff 输出格式** | 扁平 `{x,y,cell}[]` | 层次 `RowPatch[{row, CellPatch[{col, cells}]}]` | 🟡 差异 | flitter 的分组格式在 renderer 中减少光标移动次数（每个 CellPatch 只需一次 CURSOR_MOVE）。Amp 在 renderer 层做连续判定来弥补。最终效果等价。 |
| **getDiff EMPTY_CELL 快速路径** | `front === yu && back === yu` | `front === EMPTY_CELL && back === EMPTY_CELL` | 🟢 等价 | 都使用引用相等 (`===`) 避免深比较。flitter 的 EMPTY_CELL 是 `Object.freeze()` 的，Amp 的 `yu` 非冻结。 |
| **getDiff 脏区域追踪** | 无（全扫描） | 无（全扫描） | 🟢 等价 | 两者都逐 cell 扫描整个 W×H 网格，无行级 hash 或块级 diff。 |
| **Renderer 连续 cell 优化** | ★ 有: 同行+连续位置+同样式→跳过 CUP+SGR | ❌ 无: 每个 CellPatch 都发 CURSOR_MOVE | 🔴 **重要差异** | Amp 在 renderer 层追踪 currentX/currentY，连续 cell 只输出字符。flitter 依赖 getDiff 的分组来减少 CURSOR_MOVE，但每个 CellPatch 开头仍无条件发 CUP。对于大面积连续变化（如全屏滚动），flitter 多输出约 N 个 CUP 序列。 |
| **Renderer SGR 输出格式** | 每个属性独立 `CSI...m` | 合并为单个 `CSI code1;code2;...m` | 🟢 flitter 更优 | flitter 合并所有 SGR codes 到一个序列，减少 CSI 和 'm' 的开销。如 `ESC[1;38;2;255;0;0m` 而非 `ESC[1m ESC[38;2;255;0;0m`。 |
| **Renderer 帧首 reset** | 先 `reset()` + `moveTo(0,0)`，从干净状态开始 | 帧内不 reset，依赖跨帧 `lastStyle` 追踪 | 🟡 差异 | Amp 每帧开头重置 SGR+光标到 (0,0)。flitter 帧末重置 (`SGR_RESET` + 清空 lastStyle)。净效果等价，但 Amp 的帧首 reset 更健壮（防止状态泄漏）。**flitter 每帧末重置 SGR 后下帧首个 cell 总需重新设样式，Amp 的做法相同。** |
| **Renderer SGR 状态持久性** | `currentStyle` 跨帧保持，帧首显式 reset | `lastStyle` 每帧末重置为 `{}` | 🟡 差异 | Amp 的 currentStyle 只在帧首 reset 时清零。flitter 在 render() 结尾 reset。两者都确保每帧 SGR 状态干净。 |
| **buildSgrDelta 副作用** | `WF8` 直接修改 `currentState` 对象 | `buildSgrDelta` 是纯函数（不修改参数） | 🟢 等价 | flitter 在调用方用 `this.lastStyle = cell.style` 更新状态。Amp 在 delta 函数内部修改。 |
| **bold/dim 互斥处理** | `22m` off-code 同时关闭 bold 和 dim；需要时重新发对应 on-code | 同 Amp: `checkNeedsReset()` → 需要时 SGR 0 + 全量重设 | 🟢 等价 | 两者都正确处理了 SGR 22 同时关闭 bold/dim 的语义。flitter 额外支持全局 reset 路径。 |
| **RGB → 256 色降级** | `sJ()` + `Map<string, number>` 缓存 ("r,g,b" key) | `findNearestAnsi256()` + `Map<number, number>` 缓存 (packed int key) | 🟢 flitter 微优 | flitter 用 packed int key 避免字符串拼接和哈希，Map 查找更快。 |
| **Color 类型系统** | POD 对象 `{type, value}` | 不可变 `Color` class 带方法 | 🟢 等价 | flitter 的 `Color` class 更 TypeScript 友好，方法封装更好。 |
| **Hyperlink 类型** | `{uri, id}` 对象 | `string` (仅 URI) | 🟡 差异 | Amp 支持 OSC 8 的 `id` 参数（同 ID 的链接可被终端识别为同一目标）。flitter 简化为纯 URI 字符串。 |
| **控制字符处理** | `isControlChar()` 检测 + `replacementChar()` 替换 | ❌ 无 | 🟡 差异 | Amp 防止控制字符（U+0000-U+001F 等）破坏终端输出。flitter 直接输出字符。 |
| **setCell Alpha 混合** | `$F.setCell()` 内部调用 `aF8()` 做即时混合 | `Buffer.setCell()` 直接覆写，混合在上层 `PaintContext` | 🟢 等价 | 架构差异但结果等价。flitter 分层更清晰。 |
| **宽字符续列标记** | width=1, char=' ', 继承主 cell 样式 | width=0, char='', 继承主 cell 样式 | 🟡 差异 | Amp 用 width=1 + 空格作续列标记。flitter 用 width=0 + 空字符串。flitter 的 renderer 用 `cell.width === 0` 跳过续列，语义更清晰。 |
| **EMPTY_CELL 冻结** | 非冻结 (`yu = q3(' ', {})`) | `Object.freeze()` 冻结 | 🟢 flitter 更安全 | 防止意外修改共享哨兵对象。 |
| **字符串拼接** | `bJ` StringBuilder class (链式 append) | `string[]` + `join('')` | 🟢 等价 | V8/JSC 对两种方式都有优化。`join` 在 Bun/V8 中通常更快。 |
| **性能追踪** | `lastRenderDiffStats` 含 repaintedCellCount/percent/bytesWritten | 同 Amp: `RenderStats` 含相同字段 | 🟢 等价 | 完全匹配。 |
| **同步更新** | BSU/ESU (`ESC[?2026h` / `ESC[?2026l`) | 同 Amp | 🟢 等价 | — |
| **终端协议扩展** | Kitty keyboard, ModifyOtherKeys, emoji width, in-band resize, progress bar, OSC 22, pixel mouse | 同 Amp: 所有 TPRO-01~08 | 🟢 等价 | flitter 完整复刻了所有终端协议扩展。 |

---

## 4. 差异修复建议（按优先级排序）

### P0: Renderer 连续 cell 优化缺失

**问题**: flitter 的 `Renderer.render()` 对每个 `CellPatch` 无条件输出 `CURSOR_MOVE(col, row)`。在大面积连续变化场景（如全屏滚动、全屏清除后重绘），即使相邻 CellPatch 在同一行紧邻，仍会输出冗余的 CUP 序列。

**Amp 做法**: 追踪 `currentX` / `currentY`，当下一个 cell 恰好在预期位置且样式匹配时，跳过 CUP 和 SGR。

**影响**:
- 80×24 终端，全屏重绘时 Amp 可能只输出 ~24 个 CUP（每行开头一个），而 flitter 输出 ~24 个（getDiff 合并后每行一个 CellPatch）。
- 但在局部散射变化场景（多个独立小区域变化），flitter 的 `RowPatch` 分组可能产生更多 CellPatch 且各自带 CUP。

**修复建议**:

在 `Renderer.render()` 中添加 `currentCol` / `currentRow` 追踪：

```typescript
render(patches, cursor) {
  let currentCol = -1, currentRow = -1;
  // ...
  for (const rowPatch of sortedPatches) {
    for (const cellPatch of rowPatch.patches) {
      let col = cellPatch.col;
      // 仅当位置不连续时才输出 CUP
      if (col !== currentCol || rowPatch.row !== currentRow) {
        parts.push(CURSOR_MOVE(col, rowPatch.row));
      }
      currentRow = rowPatch.row;

      for (const cell of cellPatch.cells) {
        if (cell.width === 0) { col++; currentCol = col; continue; }
        // SGR delta...
        parts.push(cell.char);
        col += cell.width;
      }
      currentCol = col;
    }
  }
}
```

预计减少 5-15% 的输出字节数（取决于场景）。

### P0: present() 清除开销优化

**问题**: flitter 的 `present()` 在交换后执行 `backBuffer.clear()`，这是 O(W×H) 操作。对于 200×60 (12000 cells) 的终端，每帧额外清除开销约 0.01-0.05ms，但对于超大终端（如 tmux 中 400×100 = 40000 cells）可能显著。

**Amp 做法**: `present()` 不清除。依赖 WidgetsBinding 在 paint 阶段前调用 `screen.clear()`。

**当前 flitter 行为**: `WidgetsBinding.paint()` 先 `screenBuffer.clear()` 再绘制。

**分析**: 由于 flitter 的 paint 前已有 `clear()`，`present()` 中的额外 `clear()` 实际是冗余的。但它提供了安全保证（即使 paint 忘记 clear 也不会出现残影）。

**修复建议**: 权衡安全 vs 性能。考虑移除 `present()` 中的 `clear()`，或在 debug 模式保留。当前优先级不高，因为 `clear()` 成本远小于 diff+render。

### P1: 控制字符过滤

**问题**: flitter 的 Renderer 直接输出 `cell.char`，不检查是否为控制字符（U+0000-U+001F, U+007F, U+0080-U+009F）。如果 Widget 错误地将控制字符写入 Cell，可能导致终端状态异常。

**Amp 做法**: `isControlChar(char)` → `replacementChar(char)` (通常替换为 Unicode 替换字符或可见表示)。

**修复建议**: 在 `Renderer.render()` 的字符输出前添加简单的控制字符检查:

```typescript
const ch = cell.char;
parts.push(ch.length === 1 && ch.charCodeAt(0) < 0x20 ? ' ' : ch);
```

### P1: Hyperlink ID 支持

**问题**: flitter 的 `Cell.hyperlink` 是 `string`（仅 URI），不支持 OSC 8 的 `id` 参数。终端使用 `id` 来识别同一超链接的不同部分（如跨行的长 URL）。

**Amp 做法**: `hyperlink: { uri: string, id: string }`，在 `HYPERLINK_OPEN` 中输出 `ESC]8;id=xxx;uri ESC\`。

**修复建议**: 扩展 `Cell.hyperlink` 为 `string | { uri: string; id?: string }`，或添加 `hyperlinkId?: string` 字段。更新 `buildHyperlinkDelta` 和 `cellsEqual` 相应逻辑。

### P2: EMPTY_CELL 宽字符续列标记差异

**问题**: flitter 用 `width=0, char=''` 标记宽字符续列，Amp 用 `width=1, char=' '`。虽然 flitter 的方式语义更清晰（renderer 通过 `width===0` 跳过），但与 Amp 行为不完全一致。

**影响**: 极低。两种方式都能正确工作。flitter 的 `width=0` 方式甚至更优——renderer 可以精确判断续列，而 Amp 的 `width=1` 续列在某些边界情况下可能被误认为普通空格。

**修复建议**: 保持现状。flitter 的方式更好。

### P2: Renderer 帧首/帧末 reset 策略

**问题**: Amp 在帧首做 `reset() + moveTo(0,0)`，flitter 在帧末做 `SGR_RESET + 清空 lastStyle`。

**影响**: 功能等价。Amp 的帧首 reset 在边界情况下（如上一帧输出被中断）更健壮，因为它不假设上一帧末尾正确 reset 了。

**修复建议**: 考虑在 `render()` 开头也输出 `SGR_RESET`，确保每帧从已知状态开始。代价是额外 4 bytes (`ESC[0m`)。

### P2: Buffer resize 内容保留策略

**问题**: flitter 的 `Buffer.resize()` 保留旧内容，Amp 创建全新空数组。

**影响**: 无功能影响（resize 后必然 `markForRefresh` → 全量重绘）。flitter 的拷贝是冗余工作。

**修复建议**: 可选优化——`resize()` 不保留旧内容，直接创建空数组。节省 `O(min(oldW, newW) × min(oldH, newH))` 的拷贝。

---

## 附录 A: 混淆名映射快速参考

| 混淆名 | 语义名 | 位置 |
|--------|--------|------|
| `ij` | ScreenBuffer | amp-strings.txt:529716 |
| `$F` | Buffer | amp-strings.txt:529716 |
| `wB0` | TerminalManager | amp-strings.txt:529716 |
| `z_0` | Renderer | amp-strings.txt:529716 |
| `bJ` | StringBuilder | amp-strings.txt:529716 |
| `q3` | createCell | amp-strings.txt:529716 |
| `yu` | EMPTY_CELL | amp-strings.txt:529716 |
| `w0` | Color | amp-strings.txt:529716 |
| `bF8` | cellsEqual | amp-strings.txt:529716 |
| `sF8` | stylesEqual | amp-strings.txt:529716 |
| `Nu0` | colorsEqual | amp-strings.txt:529716 |
| `aF8` | blendStyle | amp-strings.txt:529716 |
| `WF8` | buildSgrDelta | amp-strings.txt:529716 |
| `Wu0` | colorToSgr | amp-strings.txt:529716 |
| `DF8` | buildHyperlinkDelta | amp-strings.txt:529716 |
| `sJ` | rgbToNearest256 | amp-strings.txt:529716 |
| `Hu0` | rgb256Cache (Map) | amp-strings.txt:529716 |
| `Uu0` | ansi256Palette | amp-strings.txt:529716 |
| `$F8` | BSU constant | amp-strings.txt:529716 |
| `iF8` | ESU constant | amp-strings.txt:529716 |
| `nF8` | CURSOR_HIDE | amp-strings.txt:529716 |
| `lF8` | CURSOR_SHOW | amp-strings.txt:529716 |
| `_u0` | SGR_RESET | amp-strings.txt:529716 |
| `Bu0` | CURSOR_MOVE | amp-strings.txt:529716 |
| `dF8` | CLEAR_SCREEN | amp-strings.txt:529716 |
| `oX8` | parseSgrParams | amp-strings.txt:529716 |
| `J3` | WidgetsBinding | amp-strings.txt:529716 |
| `c9` | FrameScheduler | amp-strings.txt:529716 |

## 附录 B: 渲染流程对比图

```
═══════════════════════════════════════════════════════
                  Amp CLI 渲染流程
═══════════════════════════════════════════════════════
  WidgetsBinding.drawFrameSync()
  │
  ├── beginFrame()
  ├── processResizeIfPending()
  ├── buildOwner.buildScopes()          [BUILD]
  ├── pipelineOwner.flushLayout()       [LAYOUT]
  ├── paint()                           [PAINT]
  │   ├── screenBuffer.clear()
  │   └── paintRenderTree(root, screen) → setCell/setChar
  │
  └── render()                          [RENDER]
      └── wB0.render()
          ├── screen.getDiff()          → {x,y,cell}[]
          ├── bJ.append(startSync)      → ESC[?2026h
          ├── bJ.append(hideCursor)     → ESC[?25l
          ├── bJ.append(reset)          → ESC[0m + close OSC8
          ├── bJ.append(moveTo(0,0))    → ESC[1;1H
          ├── renderer.render(diff)     → CUP+SGR+char (with consecutive optimization)
          ├── bJ.append(cursor stuff)
          ├── bJ.append(endSync)        → ESC[?2026l
          ├── stdout.write(bJ.toString())
          └── screen.present()          → swap (no clear)

═══════════════════════════════════════════════════════
               flitter-core 渲染流程
═══════════════════════════════════════════════════════
  WidgetsBinding.drawFrameSync()
  │
  ├── beginFrame()
  ├── processResizeIfPending()
  ├── buildOwner.buildScopes()          [BUILD]
  ├── pipelineOwner.flushLayout()       [LAYOUT]
  ├── paint()                           [PAINT]
  │   ├── screenBuffer.clear()
  │   └── paintRenderTree(root, screen) → setCell/setChar
  │
  └── render()                          [RENDER]
      └── terminalManager.flush()
          ├── screen.getDiff()          → RowPatch[] (grouped)
          ├── renderer.render(diff, cursor)
          │   ├── push(BSU)             → ESC[?2026h
          │   ├── push(CURSOR_HIDE)     → ESC[?25l
          │   ├── for each RowPatch:
          │   │   for each CellPatch:
          │   │     push(CURSOR_MOVE)   → ESC[row;colH (every patch!)
          │   │     for each cell:
          │   │       buildSgrDelta     → single ESC[...m (merged codes)
          │   │       push(cell.char)
          │   ├── cursor handling
          │   ├── push(ESU)             → ESC[?2026l
          │   └── push(SGR_RESET)       → ESC[0m
          ├── platform.writeStdout(output)
          └── screen.present()          → swap + clear backBuffer
```
