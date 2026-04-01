# Gap 审计报告 #1: 渲染管线

> 审计日期: 2026-03-31
> 审计范围: ScreenBuffer / diff / SGR / 双缓冲 / RepaintBoundary / Paint 管线
> 基于: Amp 分析报告 `amp-tui-analysis-1.md` vs flitter-core 当前源码

## 审计范围

### 读取的 Amp 参考文件
- `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-1.md` — ScreenBuffer 双缓冲 + Diff 算法 + SGR 优化深度分析

### 读取的 flitter-core 源码文件
| 文件 | 子系统 |
|------|--------|
| `packages/flitter-core/src/terminal/screen-buffer.ts` | 双缓冲 ScreenBuffer / Buffer |
| `packages/flitter-core/src/terminal/renderer.ts` | ANSI Renderer / SGR 状态机 |
| `packages/flitter-core/src/terminal/cell.ts` | Cell 数据结构 / cellsEqual / blendStyle |
| `packages/flitter-core/src/scheduler/paint-context.ts` | PaintContext 画布 API |
| `packages/flitter-core/src/scheduler/clip-canvas.ts` | ClipCanvas 裁剪画布 |
| `packages/flitter-core/src/scheduler/paint.ts` | Paint DFS 遍历 |
| `packages/flitter-core/src/rendering/cell-layer.ts` | CellLayer 缓存 (RepaintBoundary) |
| `packages/flitter-core/src/rendering/render-repaint-boundary.ts` | RenderRepaintBoundary |
| `packages/flitter-core/src/terminal/terminal-manager.ts` | TerminalManager flush 流程 |
| `packages/flitter-core/src/framework/binding.ts` | WidgetsBinding paint 阶段 |
| `packages/flitter-core/src/framework/render-object.ts` | markNeedsPaint / isRepaintBoundary |

### 读取的 .gap 文件
| 文件 | 主题 |
|------|------|
| `.gap/11-relayout-boundary.md` | RelayoutBoundary 提案（已实现） |
| `.gap/12-repaint-boundary.md` | RepaintBoundary 提案（Phase 1 已实现） |
| `.gap/62-terminal-buffer-mismatch.md` | 终端输出缓冲字节/字符不匹配 |

---

## Gap 清单

### GAP-1-001: Renderer 缺少连续 cell 光标跳跃优化

- **优先级**: P0
- **影响范围**: `packages/flitter-core/src/terminal/renderer.ts` — `Renderer.render()` 方法 (L358-L427)
- **Amp 行为**: Amp 的 `z_0.render(diff)` 追踪 `currentX` / `currentY`，当下一个 diff 条目满足以下条件时跳过 CUP（光标定位）和 SGR 重输出：
  - 同一行 (`change.y === lastY`)
  - 位置连续 (`change.x === lastEndX`)
  - 样式相同 (`stylesMatch(lastStyle, change.cell.style)`)
  - 超链接相同 (`hyperlinksMatch`)
  
  在大面积连续同色文本变更（如全屏滚动、全屏清除重绘）时，仅输出字符，不输出任何控制序列。
- **Flitter 现状**: `Renderer.render()` 对每个 `CellPatch` **无条件**输出 `CURSOR_MOVE(col, rowPatch.row)`（L375）。虽然 `getDiff()` 已将连续变化 cell 合并为 `CellPatch`，但同一行内如果存在多个相邻 `CellPatch`（例如短暂的未变 cell 间隔打断了连续性），每个 patch 头部仍发 CUP。更重要的是，**跨 patch 的光标连续性未被追踪**——即使上一个 patch 结束位置恰好是下一个 patch 起始位置，也会重复发 CUP。
- **已有 .gap 引用**: 无
- **建议修复方向**: 在 `Renderer.render()` 中添加 `currentCol` / `currentRow` 状态追踪。仅当位置不连续时才输出 `CURSOR_MOVE`。参照 `amp-tui-analysis-1.md` 第 4.1 节差异修复建议中的伪代码。预计减少 5-15% 的输出字节数。

---

### GAP-1-002: present() 冗余清除 back buffer

- **优先级**: P1
- **影响范围**: `packages/flitter-core/src/terminal/screen-buffer.ts` — `present()` (L322-L327)
- **Amp 行为**: Amp 的 `ij.present()` 是纯指针交换，**不清除**新的 back buffer。依赖上层 `WidgetsBinding.paint()` 中的 `screen.clear()` 在每帧 paint 前将 back buffer 清零。
- **Flitter 现状**: `present()` 在指针交换后立即执行 `this.backBuffer.clear()`（L326），而 `WidgetsBinding.paint()` 中也会调用 `screen.clear()`（binding.ts L639）。这意味着 **back buffer 在一帧内被清除了两次**：一次在 present() 交换后，一次在下帧 paint 前。对于 200×60 终端（12000 cells），每帧多一次 O(W×H) 的冗余写入。
- **已有 .gap 引用**: `.gap/12-repaint-boundary.md` Phase 2 提到"Eliminate Full Buffer Clear"
- **建议修复方向**: 
  - **短期**: 移除 `present()` 中的 `this.backBuffer.clear()` 调用，因为 `WidgetsBinding.paint()` 已保证 paint 前清除。
  - **中期**: 配合 RepaintBoundary Phase 2，用选择性区域清除替代全屏清除。

---

### GAP-1-003: 缺少控制字符过滤

- **优先级**: P1
- **影响范围**: `packages/flitter-core/src/terminal/renderer.ts` — `Renderer.render()` 中字符输出 (L400)
- **Amp 行为**: Amp 的 renderer 包含**控制字符检测和替换逻辑**：`isControlChar(char)` 检测 U+0000-U+001F / U+007F / U+0080-U+009F 范围的控制字符，然后用 `replacementChar(char)` 替换为安全的可见字符（通常是 Unicode 替换字符或控制字符的可视表示）。这防止恶意或意外的控制字符破坏终端状态。
- **Flitter 现状**: `Renderer.render()` 直接 `parts.push(cell.char)`（L400），没有任何控制字符检查。如果 widget 错误地将控制字符写入 Cell（例如 `\x00`, `\x1b`, `\x07`），这些字符会直接输出到终端，可能导致：
  - 终端钟声 (`\x07`)
  - ESC 序列注入 (`\x1b`)
  - 终端状态异常
  - 显示错位
- **已有 .gap 引用**: 无
- **建议修复方向**: 在 `Renderer.render()` 字符输出前增加简单的控制字符过滤：
  ```typescript
  const ch = cell.char;
  const cp = ch.codePointAt(0) ?? 0;
  parts.push((cp < 0x20 || cp === 0x7f || (cp >= 0x80 && cp < 0xa0)) ? ' ' : ch);
  ```

---

### GAP-1-004: Hyperlink 缺少 OSC 8 `id` 参数支持

- **优先级**: P1
- **影响范围**: 
  - `packages/flitter-core/src/terminal/cell.ts` — `Cell.hyperlink` 类型 (L29)
  - `packages/flitter-core/src/terminal/renderer.ts` — `buildHyperlinkDelta()` (L585-L597)
- **Amp 行为**: Amp 的 Cell 使用 `hyperlink: { uri: string, id: string }` 对象。在 `buildHyperlinkDelta()` 中输出 `ESC]8;id=xxx;uri ESC\`。终端使用 `id` 字段识别跨行的同一超链接（例如跨行的长 URL），使得悬停时能高亮同一链接的所有部分。
- **Flitter 现状**: `Cell.hyperlink` 是 `string | undefined`（仅 URI，L29）。`renderer.ts` 中的 `hyperlinkOpen()` 函数（L54-L57）虽然**已经**支持可选的 `id` 参数，但 Cell 层面无法传递 id，导致 `buildHyperlinkDelta()` 总是传 `undefined`。
- **已有 .gap 引用**: 无
- **建议修复方向**: 
  1. 扩展 `Cell.hyperlink` 类型为 `string | { uri: string; id?: string } | undefined`
  2. 或增加 `Cell.hyperlinkId?: string` 字段
  3. 更新 `cellsEqual()` 比较逻辑
  4. 更新 `buildHyperlinkDelta()` 传递 id

---

### GAP-1-005: 每帧无条件全屏 paint DFS 遍历（RepaintBoundary Phase 2/3 未实现）

- **优先级**: P1
- **影响范围**: 
  - `packages/flitter-core/src/framework/binding.ts` — `paint()` (L627-L652)
  - `packages/flitter-core/src/scheduler/paint.ts` — `paintRenderTree()` (L38-L44)
  - `packages/flitter-core/src/terminal/screen-buffer.ts` — `getDiff()` (L337-L425)
- **Amp 行为**: Amp 同样是全量 paint + 全量 diff（无 RepaintBoundary）。但 Amp 的 TUI 树通常较浅。
- **Flitter 现状**: 
  - **Phase 1 已完成**: `RenderRepaintBoundary` + `CellLayer` 已实现。`markNeedsPaint()` 在 boundary 处停止传播。`paint()` 对 clean boundary 执行 blit 而非 re-paint。
  - **未实现**: 
    - Phase 2: `screen.clear()` 仍然每帧全屏清除（binding.ts L639），这会破坏 clean boundary 的 blit 效果（清除后再 blit 是冗余的）。正确做法是只清除 dirty boundary 的区域。
    - Phase 3: `getDiff()` 仍然全扫描 W×H cells。配合 dirty region 追踪可以只扫描 dirty 行。
  - 注意：即使是 Phase 1 的 blit，由于 `screen.clear()` 在前，所有 boundary（包括 clean 的）都被迫 blit 来覆盖被清空的区域。
- **已有 .gap 引用**: `.gap/12-repaint-boundary.md` Phase 2 (Eliminate Full Buffer Clear) 和 Phase 3 (Region-Optimized Diff)
- **建议修复方向**: 
  1. Phase 2: `WidgetsBinding.paint()` 不再无条件 `screen.clear()`。改为仅清除 dirty boundary 覆盖的区域。需要 `ScreenBuffer.clearRegion(x, y, w, h)` 方法。
  2. Phase 3: 在 `ScreenBuffer` 上增加 `_dirtyRects` 追踪。`getDiff()` 可选只扫描 dirty 行。

---

### GAP-1-006: Renderer 帧末 SGR reset 导致下帧首 cell 必定输出 SGR

- **优先级**: P2
- **影响范围**: `packages/flitter-core/src/terminal/renderer.ts` — `render()` (L421-L424)
- **Amp 行为**: Amp 在**帧首**执行 `reset()` + `moveTo(0,0)`（wB0.render 步骤 5-6），然后 renderer 的 `currentStyle` 跨帧保持。但由于帧首 reset 了 SGR，所以 `currentStyle` 也被重置。效果等价：每帧的第一个 cell 总是需要完整的 SGR 设置。
- **Flitter 现状**: Flitter 在**帧末**输出 `SGR_RESET`（L422），然后清空 `lastStyle = {}`（L423）和 `lastHyperlink = undefined`（L424）。这意味着：
  1. 每帧末额外输出 4 bytes (`\x1b[0m`)
  2. 下帧首个 cell 必定触发完整 SGR 输出（因为 lastStyle 是空的）
  
  Amp 的帧首 reset 也有相同效果，但 Amp 的 reset 兼具"从已知状态开始"的安全语义——如果上一帧输出被中断或发生错误，帧首 reset 确保终端 SGR 状态干净。
- **已有 .gap 引用**: 无
- **建议修复方向**: 考虑将帧末 `SGR_RESET` 移到帧首（在 BSU + CURSOR_HIDE 之后）。这样 `lastStyle` 可以跨帧保持（因为帧首的 reset 会使其归零），语义更接近 Amp，且在异常情况下更健壮。代价不变（仍是每帧 4 bytes reset）。

---

### GAP-1-007: Buffer.resize() 冗余的旧内容拷贝

- **优先级**: P2
- **影响范围**: `packages/flitter-core/src/terminal/screen-buffer.ts` — `Buffer.resize()` (L89-L105)
- **Amp 行为**: Amp 的 `$F.resize()` 每次创建全新空数组，不保留旧内容。
- **Flitter 现状**: `Buffer.resize()` 创建新 cells 数组后，逐 cell 拷贝旧内容的重叠区域（L96-L100）。由于 `resize()` 后必然触发 `markForRefresh()`（screen-buffer.ts L221），下帧全量重绘，保留的旧内容会被完全覆盖，拷贝是纯冗余工作。
- **已有 .gap 引用**: 无
- **建议修复方向**: 简化 `Buffer.resize()` 为直接创建空数组：
  ```typescript
  resize(newWidth: number, newHeight: number): void {
    if (newWidth === this.width && newHeight === this.height) return;
    this.width = newWidth;
    this.height = newHeight;
    this.cells = Buffer.createCells(newWidth, newHeight);
  }
  ```
  节省 `O(min(oldW, newW) × min(oldH, newH))` 拷贝开销。

---

### GAP-1-008: RenderRepaintBoundary.paint() 未检查 `_needsPaint` 一致性

- **优先级**: P2
- **影响范围**: `packages/flitter-core/src/rendering/render-repaint-boundary.ts` — `paint()` (L61-L93)
- **Amp 行为**: Amp 无 RepaintBoundary（此为 Flitter 独有增强）。
- **Flitter 现状**: `RenderRepaintBoundary.paint()` 的 fast path（L70-L81）条件是：
  ```typescript
  this._layer && !this._layer.isDirty && !this._needsPaint && 
  this._layer.lastOffsetX === ox && this._layer.lastOffsetY === oy &&
  this._layer.width === w && this._layer.height === h
  ```
  这个条件中包含 `!this._needsPaint`，但 `_needsPaint` 在 `PipelineOwner.flushPaint()` 中已被清除（通过 `clearNeedsPaint()`）。这意味着在 paint 阶段执行时，**所有**节点的 `_needsPaint` 都已经是 `false`，这个条件永远为 true（关于 paint 标志部分）。实际的脏状态应完全依赖 `_layer.isDirty`。
  
  **潜在问题**：如果 `flushPaint()` 的执行顺序在将来变化（例如 flushPaint 不再在 paint 前调用），fast path 可能产生正确性问题。当前代码正确工作，但脏状态的真实来源（`_layer.isDirty` vs `_needsPaint`）之间的语义关系不够清晰。
- **已有 .gap 引用**: `.gap/12-repaint-boundary.md`（Phase 1 设计中提到 `_needsPaint` 作为 dirty 信号之一）
- **建议修复方向**: 
  1. 明确 `_layer.isDirty` 作为 RepaintBoundary paint 缓存的唯一脏状态来源
  2. 考虑在 `markNeedsPaint()` 到达 boundary 时同步设置 `_layer.markDirty()`（当前由 `captureFrom()` 设置 clean，但 dirty 标记路径不明确）
  3. 添加注释说明 `_needsPaint` 在 paint 阶段为何总是 false

---

### GAP-1-009: getDiff() 全量刷新路径将整行合并为单个 CellPatch

- **优先级**: P2
- **影响范围**: `packages/flitter-core/src/terminal/screen-buffer.ts` — `getDiff()` 全量刷新路径 (L346-L372)
- **Amp 行为**: Amp 的全量刷新路径逐 cell 输出 `{x, y, cell}`，正确跳过宽字符续列（`if (cell.width > 1) x += cell.width - 1`）。
- **Flitter 现状**: 全量刷新路径将每行所有 cell 合并为一个 `CellPatch`（L353-L364）：
  ```typescript
  for (let x = 0; x < w; ) {
    const cell = backCells[y * w + x] ?? EMPTY_CELL;
    if (runStart === -1) {
      runStart = x;
      runCells = [cell];
    } else {
      runCells.push(cell);
    }
    x += Math.max(1, cell.width);
  }
  ```
  这将**包括 EMPTY_CELL** 在内的所有 cell 都收入 patch。对于 80×24 终端，全量刷新时每行产生一个包含 80 个 cell 的 CellPatch。虽然 renderer 会对宽字符续列（width=0）做 skip，但大量的 EMPTY_CELL 也被包含在 patch 中，导致 renderer 为它们计算不必要的 SGR delta。
- **已有 .gap 引用**: 无
- **建议修复方向**: 全量刷新路径可以跳过尾部连续的 EMPTY_CELL，或在 renderer 中对 EMPTY_CELL 做快速路径跳过（char=' ', style={}, width=1 → 如果上一个 cell 也是空的，只需移动光标）。但当前行为功能正确，仅影响全量刷新的性能（通常只在初始化和 resize 时发生）。

---

### GAP-1-010: 宽字符续列标记方式差异

- **优先级**: P2（不需修复）
- **影响范围**: 
  - `packages/flitter-core/src/terminal/screen-buffer.ts` — `Buffer.setCell()` (L67-L74)
  - `packages/flitter-core/src/terminal/cell.ts` — `createCell()` (L47-L59)
- **Amp 行为**: 宽字符续列标记为 `width=1, char=' '`，继承主 cell 样式。续列在视觉上是普通空格。
- **Flitter 现状**: 宽字符续列标记为 `width=0, char=''`，继承主 cell 样式（screen-buffer.ts L71: `createCell('', cell.style, 0)`）。Renderer 通过 `cell.width === 0` 跳过续列（renderer.ts L381-L383）。
- **已有 .gap 引用**: 无
- **建议修复方向**: **不需修复**。Flitter 的 `width=0` 方式语义更清晰——renderer 可以精确判断续列 vs 普通空格。Amp 的 `width=1` 续列在某些边界场景下可能被误认为普通单列字符。两种方式功能等价，Flitter 更优。

---

### GAP-1-011: CellLayer blit 时未考虑裁剪区域

- **优先级**: P2
- **影响范围**: `packages/flitter-core/src/rendering/cell-layer.ts` — `blitTo()` (L121-L131)
- **Amp 行为**: Amp 无 RepaintBoundary/CellLayer。
- **Flitter 现状**: `CellLayer.blitTo()` 直接写入 back buffer，没有通过 `PaintContext` 的裁剪系统。如果一个 RepaintBoundary 的 parent 有 clip（例如 ScrollView 内的 RepaintBoundary），blit 可能写入 clip 区域之外的 cells。
  
  但实际上，`captureFrom()` 捕获的是已经经过裁剪的 paint 结果（因为 paint 时经过了 ClipCanvas），所以 blit 的内容本身就是被裁剪后的。**真正的问题**只在以下场景出现：
  - boundary 的 parent clip 区域在两帧之间发生了变化（例如 ScrollView 滚动导致 viewport 边界移动）
  - 此时 boundary 的 cache 是旧 clip 的结果，blit 到新位置可能越界
  
  不过在这种场景下，ScrollView 的滚动必然触发子节点 `markNeedsPaint()`，使 boundary 变 dirty 而不走 blit 路径。所以**当前实际上安全**，但缺少防御性边界检查。
- **已有 .gap 引用**: `.gap/12-repaint-boundary.md` 风险表中提到 "Clip interaction with cache — Medium"
- **建议修复方向**: 在 `blitTo()` 中添加 bounds 检查，确保写入不超出 back buffer 边界。当前 `Buffer.setCell()` 已有 bounds 检查（screen-buffer.ts L61），所以写入是安全的。但 `blitTo()` 中可以提前剪裁循环范围以减少无效调用。

---

### GAP-1-012: paint 阶段 screen.clear() 与 RepaintBoundary 效能冲突

- **优先级**: P1
- **影响范围**: `packages/flitter-core/src/framework/binding.ts` — `paint()` (L639)
- **Amp 行为**: Amp 同样在 paint 前执行 `screen.clear()`，每帧全量清除 back buffer。
- **Flitter 现状**: `WidgetsBinding.paint()` 中 `screen.clear()` 将 back buffer 填充为 EMPTY_CELL。随后 `paintRenderTree()` 执行 DFS，RepaintBoundary 的 fast path（`blitTo`）将缓存 cells 写回 buffer。这意味着：
  - Clean boundary: 先清空区域，再 blit 回同样的内容 → **O(W×H) 冗余写入**
  - 对于有 10 个 clean boundary 的 120×40 终端，每帧浪费约 48000 次 cell 写入（清零）+ 数千次 blit（回填）
  
  **这是 RepaintBoundary Phase 1 的已知限制**——功能正确但性能未优化。
- **已有 .gap 引用**: `.gap/12-repaint-boundary.md` Phase 2: "Eliminate Full Buffer Clear"
- **建议修复方向**: 与 GAP-1-005 一致。改为选择性区域清除，仅清除 dirty boundary 覆盖的矩形区域。

---

### GAP-1-013: Renderer.render() 缺少 Amp 帧首 reset + home 语义

- **优先级**: P2
- **影响范围**: `packages/flitter-core/src/terminal/renderer.ts` — `render()` (L358-L427)
- **Amp 行为**: Amp 的 `wB0.render()` 在 BSU + CURSOR_HIDE 之后、调用 `renderer.render(diff)` 之前，先执行：
  1. `renderer.reset()` → 输出 `ESC[0m` + 关闭 OSC 8
  2. `renderer.moveTo(0, 0)` → 输出 `ESC[1;1H`
  
  这确保 renderer 从 (0,0) 已知位置和干净 SGR 状态开始追踪。
- **Flitter 现状**: `Renderer.render()` 是一体化方法，内部直接从 patch 数据开始渲染。没有帧首 reset 和 home cursor。帧末的 `SGR_RESET` + 清空 `lastStyle` 提供了等价的状态重置。
  
  **功能等价**，但 Amp 的帧首 reset 在边界情况（如上一帧输出被意外中断、终端状态被外部进程修改）下更健壮。
- **已有 .gap 引用**: 无
- **建议修复方向**: 低优先级。可以在 `render()` 中 BSU + CURSOR_HIDE 之后增加 `SGR_RESET`。但当前行为已正确工作。

---

## 已有 .gap 交叉引用

| .gap 编号 | 标题 | 状态 | 是否仍然有效 | 本报告关联 GAP |
|-----------|------|------|-------------|---------------|
| `.gap/11-relayout-boundary.md` | RelayoutBoundary | **已实现** (Phase 1) | ✅ 有效 — Phase 2/3 (sizedByParent, parentUsesSize) 尚未实现 | 不在本审计范围（Layout 阶段） |
| `.gap/12-repaint-boundary.md` | RepaintBoundary / CellLayer | **Phase 1 已实现** | ✅ 有效 — Phase 2 (消除全屏清除) 和 Phase 3 (区域优化 Diff) 未实现 | GAP-1-005, GAP-1-008, GAP-1-011, GAP-1-012 |
| `.gap/62-terminal-buffer-mismatch.md` | 终端输出缓冲字节/字符不匹配 | 提案 | ✅ 有效 — 属于 flitter-amp 包，不在渲染管线范围 | 不在本审计范围 |

---

## 汇总

| GAP 编号 | 标题 | 优先级 | 来源 |
|----------|------|--------|------|
| GAP-1-001 | Renderer 缺少连续 cell 光标跳跃优化 | P0 | Amp 有，Flitter 缺失 |
| GAP-1-002 | present() 冗余清除 back buffer | P1 | Flitter 比 Amp 多一次 O(W×H) 清除 |
| GAP-1-003 | 缺少控制字符过滤 | P1 | Amp 有，Flitter 缺失 |
| GAP-1-004 | Hyperlink 缺少 OSC 8 `id` 参数支持 | P1 | Amp 有，Flitter 部分支持 |
| GAP-1-005 | RepaintBoundary Phase 2/3 未实现 | P1 | Flitter 自身增强未完成 |
| GAP-1-006 | Renderer 帧末 SGR reset 策略差异 | P2 | 行为等价，Amp 更健壮 |
| GAP-1-007 | Buffer.resize() 冗余的旧内容拷贝 | P2 | Amp 不保留，Flitter 冗余拷贝 |
| GAP-1-008 | RenderRepaintBoundary paint 脏状态语义不清 | P2 | Flitter 自身实现问题 |
| GAP-1-009 | getDiff() 全量刷新包含大量 EMPTY_CELL | P2 | 性能微优化 |
| GAP-1-010 | 宽字符续列标记方式差异 | P2 | **不需修复**，Flitter 更优 |
| GAP-1-011 | CellLayer blit 缺少裁剪边界防御 | P2 | Flitter 自身增强的防御性 |
| GAP-1-012 | screen.clear() 与 RepaintBoundary 效能冲突 | P1 | = GAP-1-005 细化 |
| GAP-1-013 | Renderer 缺少帧首 reset+home 语义 | P2 | 行为等价，Amp 更健壮 |

### 按优先级分布
- **P0**: 1 个 (GAP-1-001)
- **P1**: 4 个 (GAP-1-002, GAP-1-003, GAP-1-004, GAP-1-005/012)
- **P2**: 7 个 (GAP-1-006 ~ GAP-1-011, GAP-1-013)
