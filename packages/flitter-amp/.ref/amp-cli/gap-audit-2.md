# Gap 审计报告 #2: 布局引擎

> **审计员**: Agent-2 (布局引擎领域)
> **日期**: 2026-03-31
> **输入**: `amp-tui-analysis-2.md` + flitter-core 布局源码 + `.gap/` 相关文档
> **方法**: 逐行对比 Amp 逆向行为 vs Flitter 实现，交叉验证 `.gap/` 已知问题

---

## 审计范围

| 类别 | 审计对象 |
|------|---------|
| **核心约束** | `box-constraints.ts` (184 行) — BoxConstraints 构造、操作、查询 |
| **Flex 布局** | `render-flex.ts` (553 行) — 六步 Flex 算法、intrinsic 尺寸 |
| **约束盒** | `render-constrained.ts` (86 行) — SizedBox/ConstrainedBox 底层 |
| **填充** | `render-padded.ts` (102 行) — Padding 约束收缩 |
| **装饰盒** | `render-decorated.ts` (268 行) — Border 约束收缩 + 绘制 |
| **表格** | `render-table.ts` (409 行) — N 列网格布局 |
| **粘性头部** | `render-sticky-header.ts` (133 行) — 滚动粘附 |
| **布局工具** | `layout-helpers.ts` (107 行) — Widget 级宽度估计 |
| **父数据** | `parent-data.ts` (70 行) — FlexParentData / PositionedParentData |
| **Amp 参考** | `amp-tui-analysis-2.md` — BoxConstraints (l3) + RenderFlex (oU0) 逆向分析 |
| **已有 Gap** | `.gap/11` (RelayoutBoundary)、`.gap/14` (sizedByParent)、`.gap/15` (parentUsesSize)、`.gap/16` (nodesNeedingLayout)、`.gap/18` (LayoutBuilder)、`.gap/32` (ConstrainedBox) |

---

## Gap 清单

### GAP-2-001: RenderFlex 缺少溢出检测 (_overflow)

- **优先级**: P0
- **影响范围**: `render-flex.ts` (performLayout Step 3 之后)
- **Amp 行为**: Amp/Flutter 在布局完成后检测 `allocatedSize > maxMain`，设置 `_overflow = allocatedSize - maxMain` 字段，debug 模式输出警告（黄黑条纹指示器在 GUI 中，终端 warning 在 TUI 中）。
- **Flitter 现状**: `render-flex.ts` 完全没有溢出检测逻辑。当非弹性子项总尺寸超过可用空间时，弹性子项静默获得 0 空间，无任何诊断信息。通过 `rg overflow render-flex.ts` 确认无匹配。
- **已有 .gap 引用**: 无（新发现）
- **建议修复方向**:
  1. 在 `RenderFlex` 添加 `private _overflow: number = 0` 字段
  2. 在 Step 3 分配弹性空间前/后检测：`if (allocatedSize > mainAxisLimit && Number.isFinite(mainAxisLimit)) { this._overflow = allocatedSize - mainAxisLimit; }`
  3. 在非 production 环境下打印 `console.warn` 诊断信息
  4. 暴露 `get hasOverflow(): boolean` 供外部查询

---

### GAP-2-002: RenderFlex 在 Infinity 主轴下弹性子项行为不安全

- **优先级**: P0
- **影响范围**: `render-flex.ts` (performLayout Step 3, 第 347-348 行)
- **Amp 行为**: Flutter 在 `maxMain = Infinity` 且存在弹性子项时触发断言失败 (`assert(canFlex)`)，因为无限空间无法按比例分配给弹性子项。Amp 同样继承此限制。
- **Flitter 现状**: 当 Column 在 ScrollView 内收到 `maxHeight: Infinity`，且含有 `Expanded` 子项时：
  - `freeSpace = Math.max(0, Infinity - allocatedSize) = Infinity`
  - `spacePerFlex = Infinity / totalFlex = Infinity`
  - `childMainSize = Math.floor(Infinity * flex) = Infinity`
  - 子项收到 `tight(Infinity)` 或 `loose(0..Infinity)` 约束
  - 这不会崩溃但会产生不正确的布局（子项尺寸为 Infinity）
- **已有 .gap 引用**: 无（新发现，amp-tui-analysis-2.md §4.6 已指出此问题）
- **建议修复方向**:
  1. 在 Step 3 添加 `const canFlex = Number.isFinite(mainAxisLimit);`
  2. 当 `!canFlex` 时，`freeSpace = 0`（弹性子项获得 0 空间）
  3. 可选：在 debug 模式下 warn "Cannot flex in unbounded main axis"

---

### GAP-2-003: BoxConstraints 缺少 normalize() 方法

- **优先级**: P1
- **影响范围**: `box-constraints.ts`
- **Amp 行为**: Amp/Flutter 提供显式 `normalize()` 方法：`min = max(0, min)`, `max = max(min, max)`。用于修复潜在的 `min > max` 非法状态。Amp 构造器不自动 normalize，但提供方法显式调用。
- **Flitter 现状**: 完全缺失。Flitter 构造器通过 `roundOrInf` 取整但不做 `min <= max` 规范化。当前使用中假设调用方总传合法值。
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `normalize(): BoxConstraints` 实例方法，返回规范化后的新实例。

---

### GAP-2-004: BoxConstraints.isNormalized 检查不完整

- **优先级**: P1
- **影响范围**: `box-constraints.ts` 第 130-132 行
- **Amp 行为**: `isNormalized` 检查 `minW >= 0 && minW <= maxW && minH >= 0 && minH <= maxH`（四个条件）。
- **Flitter 现状**: 仅检查 `minWidth <= maxWidth && minHeight <= maxHeight`（两个条件），缺少 `min >= 0` 检查。虽然 Flitter 构造器默认 min=0，但外部可能传入负值（如计算错误导致 `constraints.minWidth - h` 未经 `Math.max(0, ...)` 保护的场景）。
- **已有 .gap 引用**: 无
- **建议修复方向**: 补充 `this.minWidth >= 0 && this.minHeight >= 0` 条件。

---

### GAP-2-005: BoxConstraints 缺少 tighten() 方法

- **优先级**: P1
- **影响范围**: `box-constraints.ts`
- **Amp 行为**: `tighten({width, height})` 将指定轴的 min 和 max 都 clamp 到给定值：`min = clamp(value, oldMin, oldMax)`, `max = clamp(value, oldMin, oldMax)`。在 Flutter 的 `RenderIntrinsicHeight/Width` 中使用。
- **Flitter 现状**: 完全缺失。当 Flitter 后续实现 `IntrinsicHeight/Width` Widget 时将需要此方法。
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `tighten(opts?: { width?: number; height?: number }): BoxConstraints` 方法。

---

### GAP-2-006: RenderPadding 和 RenderDecoratedBox 手动约束收缩未保证 max >= min

- **优先级**: P1
- **影响范围**: `render-padded.ts` 第 66-71 行、`render-decorated.ts` 第 197-203 行
- **Amp 行为**: Flutter/Amp 的 `BoxConstraints.deflate()` 确保 `deflatedMaxWidth = Math.max(deflatedMinWidth, maxWidth - horizontal)`，即 max 永远不低于 min。
- **Flitter 现状**: `RenderPadding` 和 `RenderDecoratedBox` 都没有使用 `BoxConstraints.deflate()` 方法，而是手动构造约束：
  ```typescript
  // render-padded.ts 第 66-71 行
  const childConstraints = new BoxConstraints({
    minWidth: Math.max(0, constraints.minWidth - h),
    maxWidth: Math.max(0, constraints.maxWidth - h),  // ← 可能 < minWidth
    minHeight: Math.max(0, constraints.minHeight - v),
    maxHeight: Math.max(0, constraints.maxHeight - v), // ← 可能 < minHeight
  });
  ```
  当 `minWidth - h > 0` 但 `maxWidth - h < minWidth - h` 时（例如 `minWidth=50, maxWidth=60, h=20` → `deflatedMin=30, deflatedMax=40` 这个特定情况没问题，但 `minWidth=50, maxWidth=55, h=20` → `deflatedMin=30, deflatedMax=35` 也没问题）。
  
  **更精确的触发条件**：当 padding 很大导致 `maxWidth - h` 降到 0 但 `minWidth - h` 也降到 0 时，两者都被 `Math.max(0, ...)` 截断到 0，实际不会出问题。但当 `maxWidth < minWidth`（父约束本身非法时）或在特殊边界条件下可能出现 `max < min`。
  
  **核心问题**：既然 `BoxConstraints.deflate()` 已正确实现，`RenderPadding` 和 `RenderDecoratedBox` 应该直接使用它而非重复实现（不够安全的）逻辑。这是代码重复，也是潜在的边界条件 bug。
- **已有 .gap 引用**: 无
- **建议修复方向**:
  1. `RenderPadding.performLayout()` 改用 `constraints.deflate(this._padding)` — 需要 EdgeInsets 实现 `{ left, top, right, bottom }` 接口（已满足）
  2. `RenderDecoratedBox.performLayout()` 改用 `constraints.deflate({ left: borderLeft, top: borderTop, right: borderRight, bottom: borderBottom })`

---

### GAP-2-007: BoxConstraints 缺少 constrainWidth / constrainHeight 便利方法

- **优先级**: P2
- **影响范围**: `box-constraints.ts`
- **Amp 行为**: Flutter/Amp 提供单维度 constrain 方法：`constrainWidth(w)` 和 `constrainHeight(h)`，在很多 performLayout 中用于单轴计算。
- **Flitter 现状**: 缺失。可通过 `constrain(new Size(w, 0)).width` 间接实现，但不够简洁。
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加两个便利方法。

---

### GAP-2-008: BoxConstraints 缺少 tightForFinite() 工厂方法

- **优先级**: P2
- **影响范围**: `box-constraints.ts`
- **Amp 行为**: `tightForFinite({width, height})` 仅对有限值做 tight，Infinity 值保持 0..Infinity。
- **Flitter 现状**: 缺失。使用频率低，但是 Flutter API 完整性的一部分。
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加静态工厂方法。

---

### GAP-2-009: BoxConstraints 缺少 flipped / widthConstraints / heightConstraints

- **优先级**: P2
- **影响范围**: `box-constraints.ts`
- **Amp 行为**:
  - `flipped` — 宽高互换，在 Flex 方向切换时内部使用
  - `widthConstraints()` — 返回仅含宽度的约束
  - `heightConstraints()` — 返回仅含高度的约束
- **Flitter 现状**: 全部缺失。Flitter 用 `isHorizontal` 分支替代 `flipped`，目前无需 width/heightConstraints。
- **已有 .gap 引用**: 无
- **建议修复方向**: 按需添加。当前 TUI 场景不迫切需要。

---

### GAP-2-010: RenderFlex 缺少 Overflow Paint 指示器

- **优先级**: P2
- **影响范围**: `render-flex.ts` (paint 方法)
- **Amp 行为**: Flutter 在 debug 模式下，当 `_overflow > 0` 时在 paint 阶段绘制黄黑条纹溢出指示器。Amp TUI 中可能简化为终端 warning。
- **Flitter 现状**: 无溢出 paint 指示器（因为连溢出检测都没有，见 GAP-2-001）。
- **已有 .gap 引用**: 无（依赖 GAP-2-001）
- **建议修复方向**: 在 GAP-2-001 完成后，可选在 debug 模式下 paint 一个 `!` 或 `▶` 标记在溢出位置。TUI 环境下不需要黄黑条纹。

---

### GAP-2-011: RenderDecoratedBox 手动约束收缩缺少 borderRight / borderBottom getter

- **优先级**: P2
- **影响范围**: `render-decorated.ts` 第 174-188 行
- **Amp 行为**: Flutter 的装饰盒通过 `EdgeInsetsGeometry.deflate()` 统一处理边框收缩，可拿到各边的独立值。
- **Flitter 现状**: `RenderDecoratedBox` 仅有 `_borderHorizontal`、`_borderVertical`、`_borderLeft`、`_borderTop` 四个 getter。缺少 `_borderRight` 和 `_borderBottom`。虽然当前不直接需要它们（因为 `_borderHorizontal = left + right`），但如果要改用 `deflate()` 方法（见 GAP-2-006），则需要所有四边的独立值。这也影响代码可读性——其他开发者可能会误以为 right/bottom 被遗漏。
- **已有 .gap 引用**: 无
- **建议修复方向**: 如实施 GAP-2-006（改用 `deflate()`），则自然解决。否则可选添加 getter。

---

### GAP-2-012: RenderTable 在 maxHeight 为 Infinity 时使用硬编码回退值

- **优先级**: P2
- **影响范围**: `render-table.ts` 第 222 行、第 273 行
- **Amp 行为**: Flutter Table 在 intrinsic 列宽测量时使用无约束高度 (`Infinity`)，不使用硬编码回退。
- **Flitter 现状**: intrinsic 列宽测量阶段（第 222 行）：
  ```typescript
  maxHeight: Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 1000,
  ```
  使用 `1000` 作为 Infinity 的回退值。虽然实际 TUI 高度不太可能超过 1000 行，但这是一个不够优雅的硬编码。正式布局阶段（第 273 行）正确使用了 `Infinity`。
- **已有 .gap 引用**: 无
- **建议修复方向**: intrinsic 测量阶段也使用 `Infinity`，或使用一个命名常量而非魔法数字。

---

### GAP-2-013: FlexParentData 缺少 toString 调试方法

- **优先级**: P2
- **影响范围**: `parent-data.ts`
- **Amp 行为**: Flutter 的 FlexParentData 有 `toString()` 方法输出 `flex: N, fit: tight/loose`，用于调试。
- **Flitter 现状**: `FlexParentData` 没有 `toString()`，调试时输出 `[object Object]`。
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `toString()` 方法。

---

### GAP-2-014: RenderFlex 缺少测试覆盖 — 溢出场景

- **优先级**: P1
- **影响范围**: `render-flex.test.ts`
- **Amp 行为**: 非弹性子项总尺寸超过可用空间是 Flutter 开发中最常见的布局错误之一。
- **Flitter 现状**: amp-tui-analysis-2.md §2.9 列出四个未覆盖场景：
  1. ❌ 非弹性子项溢出主轴（overflow 检测）
  2. ❌ Infinity 主轴约束下的弹性子项行为（Column in ScrollView）
  3. ❌ 负 flex 值处理
  4. ❌ NaN 或负值约束
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加对应测试用例。

---

## 验证通过的一致性项

以下核心行为经逐行对比确认 Flitter 与 Amp/Flutter **完全一致**，无需修改：

| 特性 | 对比结果 |
|------|---------|
| BoxConstraints `tight/tightFor/loose` 工厂方法 | ✅ 一致 |
| BoxConstraints `loosen/constrain/enforce/deflate` 操作 | ✅ 一致 |
| BoxConstraints `isTight/hasBoundedWidth/hasBoundedHeight/biggest/smallest/equals` | ✅ 一致 |
| RenderFlex Step 1: 弹性/非弹性分离 (`pd.flex > 0`) | ✅ 一致 |
| RenderFlex Step 2: 非弹性子项 unbounded 主轴 + stretch 交叉轴 tight | ✅ 一致 |
| RenderFlex Step 3: `Math.floor(spacePerFlex * flex)` 取整 | ✅ 一致 |
| RenderFlex Step 3: FlexFit tight (`min=max=childMainSize`) vs loose (`min=0`) | ✅ 一致 |
| RenderFlex Step 4: `mainAxisSize=max` 时 `isFinite(maxMain) ? maxMain : allocatedSize` | ✅ 一致 |
| RenderFlex Step 4: 交叉轴 `Math.max(maxCrossSize, minCross)` + `Math.min(crossSize, maxCross)` | ✅ 一致 |
| RenderFlex Step 5: 所有 6 种 MainAxisAlignment 的 leading/between 计算 | ✅ 一致 |
| RenderFlex Step 6: CrossAxisAlignment start/center/end/stretch/baseline 偏移 | ✅ 一致 |
| RenderFlex Step 6: `Math.round(mainOffset)` + `Math.floor((actual-child)/2)` for center | ✅ 一致 |
| RenderFlex Intrinsic: 主轴 min（flex 贡献 0）、主轴 max（maxPerFlex 缩放）、交叉轴取 max | ✅ 一致 |
| FlexParentData: `flex=0, fit='tight'` 默认值 | ✅ 一致 |
| Widget 层默认值: Flex `mainAxisAlignment='start'`, `crossAxisAlignment='center'`, `mainAxisSize='max'` | ✅ 一致 |
| Flexible `fit='loose'` / Expanded `fit='tight'` 默认值 | ✅ 一致 |
| RenderConstrainedBox: `enforce` + `constrain` 无子项 → `smallest` | ✅ 一致 |
| `RenderBox.layout()` 缓存: `!needsLayout && !constraintsChanged → skip` | ✅ 一致 |
| BoxConstraints 构造器对有限值 `Math.round()` (TUI 特化，合理差异) | ✅ 合理差异 |
| CrossAxisAlignment.baseline 简化为 `crossOffset=0` (TUI 字符格统一高度) | ✅ 合理简化 |
| 无 textDirection / verticalDirection / clipBehavior (TUI 不需要 RTL) | ✅ 合理省略 |

---

## 已有 .gap 交叉引用

| .gap 编号 | 标题 | 状态 | 是否仍然有效 | 与本审计的关系 |
|-----------|------|------|:----------:|-------------|
| `.gap/11` (R01) | RelayoutBoundary | Proposal | ✅ 仍然有效 | 布局优化的基础设施。当前 `markNeedsLayout()` 无条件传播到根节点，每次脏标记都导致全树重布局。本审计聚焦布局算法正确性，R01 聚焦布局性能优化，两者互补。 |
| `.gap/14` (R04) | sizedByParent / performResize() | Proposal | ✅ 仍然有效 | 两阶段布局优化。与本审计中 GAP-2-002（Infinity 主轴弹性子项）相关——`sizedByParent` 节点在 Infinity 约束下也能正确确定自身尺寸而无需子项布局。 |
| `.gap/15` (R05) | parentUsesSize | Proposal | ✅ 仍然有效 | `layout()` 签名扩展。当前 Flitter 的 `layout(constraints)` 缺少第二个参数。此 gap 方案完整且与本审计无冲突。R05 建议默认 `true` 保持向后兼容。 |
| `.gap/16` (R12) | nodesNeedingLayout | Proposal | ✅ 仍然有效 | `PipelineOwner._nodesNeedingLayout` 列表。当前 Flitter 始终从根开始布局（无脏节点列表）。依赖 R01 才有意义。与本审计无直接冲突。 |
| `.gap/18` (U09) | LayoutBuilder | Proposal | ✅ 仍然有效 | 当前 LayoutBuilder 实现"架构性破损"（使用 StatefulWidget 而非 RenderObjectWidget）。与本审计 GAP-2-002 相关——LayoutBuilder 在 unbounded 约束下如何处理弹性子项。 |
| `.gap/32` (U10) | ConstrainedBox Widget | Proposal | ✅ 仍然有效 | Widget 层缺少 `ConstrainedBox`。`RenderConstrainedBox` 已完全实现（本审计验证其与 Amp 一致），但只能通过 `SizedBox`（tight-only）访问。Container 对非 tight 约束的处理是有损的。此 gap 方案完整可行。 |

---

## 优先级汇总

| 优先级 | GAP 编号 | 标题 | 类型 |
|:------:|---------|------|------|
| **P0** | GAP-2-001 | RenderFlex 缺少溢出检测 | 布局正确性 / 调试体验 |
| **P0** | GAP-2-002 | Infinity 主轴下弹性子项行为不安全 | 布局正确性 |
| **P1** | GAP-2-003 | BoxConstraints 缺少 normalize() | API 完整性 / 防御性编程 |
| **P1** | GAP-2-004 | isNormalized 检查不完整 | 语义正确性 |
| **P1** | GAP-2-005 | BoxConstraints 缺少 tighten() | API 完整性 |
| **P1** | GAP-2-006 | RenderPadding / RenderDecoratedBox 手动约束收缩 | 代码质量 / 潜在 bug |
| **P1** | GAP-2-014 | RenderFlex 缺少溢出/边界条件测试覆盖 | 测试完整性 |
| **P2** | GAP-2-007 | 缺少 constrainWidth / constrainHeight | API 便利性 |
| **P2** | GAP-2-008 | 缺少 tightForFinite() | API 完整性 |
| **P2** | GAP-2-009 | 缺少 flipped / widthConstraints / heightConstraints | API 完整性 |
| **P2** | GAP-2-010 | 缺少 Overflow Paint 指示器 | 调试体验 |
| **P2** | GAP-2-011 | RenderDecoratedBox 缺少 borderRight/Bottom getter | 代码完整性 |
| **P2** | GAP-2-012 | RenderTable intrinsic 测量硬编码回退值 | 代码质量 |
| **P2** | GAP-2-013 | FlexParentData 缺少 toString() | 调试体验 |

---

## 修复建议执行顺序

```
Phase 1 (P0 — 布局正确性):
  GAP-2-002 → 修复 Infinity 弹性空间分配（1-2 小时）
  GAP-2-001 → 添加溢出检测 + 诊断输出（1-2 小时）

Phase 2 (P1 — 健壮性 + API):
  GAP-2-006 → RenderPadding/DecoratedBox 改用 deflate()（30 分钟）
  GAP-2-003 → 添加 normalize()（30 分钟）
  GAP-2-004 → 修复 isNormalized（5 分钟）
  GAP-2-005 → 添加 tighten()（30 分钟）
  GAP-2-014 → 补充测试覆盖（1-2 小时）

Phase 3 (P2 — API 完整性):
  按需添加，优先级不高。
```
