# Amp TUI 深度分析 #2: BoxConstraints 布局协议 + Flex 算法

> 基于 Amp CLI 混淆源码逆向分析 + flitter-core 源码对比
> 分析对象: BoxConstraints (Amp: l3), RenderFlex (Amp: oU0), FlexParentData (Amp: S_)
> 日期: 2026-03-29

---

## 1. Amp 实现细节

### 1.1 BoxConstraints (Amp: l3 class)

Amp 的 BoxConstraints 实现来自 Flutter 框架移植，是一个不可变的盒模型约束类。通过逆向分析可确认以下行为：

#### 1.1.1 构造与规范化

```javascript
// Amp 混淆还原 (l3 class)
class l3 {
  constructor(minWidth = 0, minHeight = 0, maxWidth = Infinity, maxHeight = Infinity) {
    this.minWidth = minWidth;
    this.minHeight = minHeight;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
  }
}
```

**关键行为**：
- Amp 的构造函数**不做 normalize**——直接存储原始值，不强制 `min <= max`
- Amp **不做 Math.round()**——保留浮点精度，因为 Bun 运行时下 JSC 引擎处理浮点数足够高效
- Amp 使用 `Infinity` 表示无约束上界（与 Flutter 的 `double.infinity` 对应）
- Amp 的 normalize 是在 Flutter 端的 `_normalize()` 方法中显式调用的：`min = max(0, min)`, `max = max(min, max)`

#### 1.1.2 工厂构造器

| 工厂方法 | Amp 行为 |
|---------|---------|
| `tight(size)` | `min=max=size.width/height` |
| `tightFor({width, height})` | 指定轴上 `min=max=value`，未指定轴 `min=0, max=Inf` |
| `loose(size)` | `min=0, max=size` |
| `tightForFinite({width, height})` | 类似 `tightFor` 但只对有限值生效 |

#### 1.1.3 约束操作

| 操作 | Amp 行为 (l3) |
|------|-------------|
| `constrain(size)` | `clamp(width, minW, maxW)`, `clamp(height, minH, maxH)` |
| `loosen()` | `new l3(0, 0, maxW, maxH)` — 保留 max，清零 min |
| `enforce(outer)` | `clamp(this.min, outer.min, outer.max)`, `clamp(this.max, outer.min, outer.max)` |
| `deflate(edges)` | 减去 padding，`min = max(0, min - padding)`, `max = max(deflatedMin, max - padding)` |
| `normalize()` | `min = max(0, min)`, `max = max(min, max)` — **显式方法，不在构造器自动调用** |
| `tighten({width, height})` | `min = clamp(width, min, max)`, `max = clamp(width, min, max)` — 将指定轴收紧 |

#### 1.1.4 查询属性

| 属性 | Amp 语义 |
|------|---------|
| `isTight` | `minW === maxW && minH === maxH` |
| `hasBoundedWidth` | `maxW < Infinity` |
| `hasBoundedHeight` | `maxH < Infinity` |
| `isNormalized` | `minW >= 0 && minW <= maxW && minH >= 0 && minH <= maxH` |
| `biggest` | `Size(maxW, maxH)` |
| `smallest` | `Size(minW, minH)` |

### 1.2 RenderFlex (Amp: oU0 extends j9)

Amp 的 Flex 布局算法是 Flutter `RenderFlex.performLayout()` 的忠实移植。

#### 1.2.1 属性

```javascript
// Amp 混淆还原 (oU0 class)
class oU0 extends j9 {
  _direction;        // "horizontal" | "vertical"
  _mainAxisAlignment; // "start" | "end" | "center" | "spaceBetween" | "spaceAround" | "spaceEvenly"
  _crossAxisAlignment; // "start" | "end" | "center" | "stretch" | "baseline"
  _mainAxisSize;      // "min" | "max"
}
```

#### 1.2.2 六步布局算法 (performLayout)

**Step 1: 分离弹性/非弹性子项**

```javascript
// Amp 实现
let totalFlex = 0;
for (const child of this._children) {
  const pd = child.parentData; // S_ instance
  if (pd.flex > 0) {
    totalFlex += pd.flex;
    // 标记为弹性子项
  }
}
```

Amp 遍历所有子节点，根据 `FlexParentData.flex > 0` 分离弹性和非弹性子项。

**Step 2: 布局非弹性子项 (unbounded main axis)**

```javascript
// Amp: 非弹性子项使用无约束主轴
// 水平方向 Row:
if (crossAxisAlignment === "stretch") {
  innerConstraints = new l3(0, maxCross, Infinity, maxCross);
  // minW=0, minH=maxCross, maxW=Inf, maxH=maxCross
} else {
  innerConstraints = new l3(0, 0, Infinity, maxCross);
  // minW=0, minH=0, maxW=Inf, maxH=maxCross
}
child.layout(innerConstraints);
allocatedSize += child.size.width; // 累加主轴占用
maxCrossSize = max(maxCrossSize, child.size.height); // 跟踪最大交叉轴
```

**关键**: 非弹性子项在主轴方向上收到 `maxMain = Infinity` 约束，允许它们自由报告自然尺寸。

**Step 3: 分配弹性空间**

```javascript
// Amp: 计算剩余空间
const freeSpace = max(0, maxMain - allocatedSize);
const spacePerFlex = totalFlex > 0 ? freeSpace / totalFlex : 0;

for (const child of flexChildren) {
  const pd = child.parentData;
  const childMainSize = max(0, floor(spacePerFlex * pd.flex));
  
  if (pd.fit === "tight") {
    // tight fit: min = max = childMainSize
    innerConstraints = ...; // tight on main axis
  } else {
    // loose fit: min = 0, max = childMainSize
    innerConstraints = ...; // loose on main axis
  }
  child.layout(innerConstraints);
  allocatedSize += child.size[mainAxisDim];
}
```

**关键行为**:
- `freeSpace` 用 `Math.max(0, ...)` 截断，非弹性子项溢出时 freeSpace=0
- Amp 使用 `Math.floor()` 对弹性空间取整（防止浮点累积溢出）
- `fit === "tight"` 时主轴约束为 tight（`min=max=childMainSize`）
- `fit === "loose"` 时主轴约束为 loose（`min=0, max=childMainSize`）
- 两种 fit 在交叉轴上的行为相同（受 crossAxisAlignment 控制）

**Step 4: 计算自身尺寸**

```javascript
// Amp:
let mainSize;
if (mainAxisSize === "max") {
  mainSize = isFinite(maxMain) ? maxMain : allocatedSize;
} else {
  // "min"
  mainSize = allocatedSize;
}

let crossSize = max(maxCrossSize, minCross);
if (isFinite(maxCross)) {
  crossSize = min(crossSize, maxCross);
}

this.size = constraints.constrain(Size(
  isHorizontal ? mainSize : crossSize,
  isHorizontal ? crossSize : mainSize,
));
```

**关键行为**:
- `mainAxisSize === "max"` 时取 `maxMain`（如果有限），否则退回到 `allocatedSize`
- `mainAxisSize === "min"` 时仅取 `allocatedSize`（内容自然大小）
- 交叉轴尺寸是所有子项交叉轴尺寸的最大值，clamp 到约束范围
- 最终 `constraints.constrain()` 确保尺寸在父约束范围内

**Step 5: 定位子项 (MainAxisAlignment)**

```javascript
// Amp: 计算 leading space 和 between space
const remainingSpace = max(0, actualMainSize - allocatedSize);
let leadingSpace, betweenSpace;

switch (mainAxisAlignment) {
  case "start":     leadingSpace = 0; betweenSpace = 0; break;
  case "end":       leadingSpace = remainingSpace; betweenSpace = 0; break;
  case "center":    leadingSpace = floor(remainingSpace / 2); betweenSpace = 0; break;
  case "spaceBetween": leadingSpace = 0; betweenSpace = n > 1 ? remainingSpace / (n-1) : 0; break;
  case "spaceAround":  betweenSpace = n > 0 ? remainingSpace / n : 0; leadingSpace = betweenSpace / 2; break;
  case "spaceEvenly":  betweenSpace = n > 0 ? remainingSpace / (n+1) : 0; leadingSpace = betweenSpace; break;
}
```

**Step 6: CrossAxisAlignment 偏移**

```javascript
// Amp: 每个子项的交叉轴位置
for (const child of this._children) {
  let crossOffset;
  switch (crossAxisAlignment) {
    case "start":    crossOffset = 0; break;
    case "center":   crossOffset = floor((actualCrossSize - childCross) / 2); break;
    case "end":      crossOffset = actualCrossSize - childCross; break;
    case "stretch":  crossOffset = 0; break;
    case "baseline": crossOffset = 0; // TUI 简化：所有字符共享基线
  }
  child.offset = isHorizontal
    ? Offset(round(mainOffset), crossOffset)
    : Offset(crossOffset, round(mainOffset));
  mainOffset += childMainSize + betweenSpace;
}
```

#### 1.2.3 Intrinsic 尺寸计算

Amp 的 intrinsic 尺寸算法:

| 方向 | getMinIntrinsicWidth | getMaxIntrinsicWidth | getMinIntrinsicHeight | getMaxIntrinsicHeight |
|------|---------------------|---------------------|----------------------|----------------------|
| 水平 | Σ nonFlex.minW (flex→0) | Σ nonFlex.maxW + maxPerFlex × totalFlex | max(children.minH) | max(children.maxH) |
| 垂直 | max(children.minW) | max(children.maxW) | Σ nonFlex.minH (flex→0) | Σ nonFlex.maxH + maxPerFlex × totalFlex |

**maxPerFlex 缩放算法**（主轴 maxIntrinsic）:
```
maxPerFlex = max(child.maxIntrinsic / child.flex)  // 对所有弹性子项
result = nonFlexTotal + maxPerFlex × totalFlex
```
这确保每个弹性子项都能获得足够空间显示其最大内容。

#### 1.2.4 Overflow 检测

Amp/Flutter 原版的 RenderFlex 在布局完成后检测溢出:
```javascript
// Flutter 原版行为 (Amp 同样实现)
if (allocatedSize > maxMain) {
  _overflow = allocatedSize - maxMain;
  // 在 debug 模式下输出警告
}
```
溢出时会打印黄黑条纹警告（Flutter debug 模式），但在 Amp TUI 中此行为可能被抑制或简化。

### 1.3 FlexParentData (Amp: S_ extends PJ)

```javascript
// Amp 混淆还原
class S_ extends PJ {
  flex;    // number, default 0
  fit;     // "tight" | "loose", default "tight"
  constructor(flex = 0, fit = "tight") {
    super();
    this.flex = flex;
    this.fit = fit;
  }
}
```

### 1.4 Widget 层 (Amp: IJ, q8, o8, lv, u3)

| Widget | Amp 混淆名 | 行为 |
|--------|----------|------|
| Flex | IJ | `createRenderObject() → new oU0(direction, mainAxisAlignment, crossAxisAlignment, mainAxisSize)` |
| Row | q8 extends IJ | `direction = "horizontal"` |
| Column | o8 extends IJ | `direction = "vertical"` |
| Flexible | lv | `applyParentData: pd.flex = this.flex, pd.fit = this.fit` |
| Expanded | u3 extends lv | `fit = "tight"`, 等价于 `Flexible(fit: "tight")` |

**Amp Widget 默认值**:
- `Flex.mainAxisAlignment` = `"start"`
- `Flex.crossAxisAlignment` = `"center"` (Flutter 默认)
- `Flex.mainAxisSize` = `"max"` (Flutter 默认)

### 1.5 RenderConstrainedBox (Amp: xU0)

```javascript
// Amp 混淆还原
class xU0 extends j9 {
  _additionalConstraints;
  performLayout() {
    const enforced = this._additionalConstraints.enforce(this.constraints);
    if (this._child) {
      this._child.layout(enforced);
      this.size = enforced.constrain(this._child.size);
    } else {
      this.size = enforced.constrain(enforced.smallest);
    }
  }
}
```

### 1.6 Amp 中的布局使用模式

从已提取的混淆源码中观察到的布局模式：

```javascript
// user-message-Sa.js — 用户消息
new s$({mainAxisSize:"min", crossAxisAlignment:"start", children: M});
// → Column(mainAxisSize: min, crossAxisAlignment: start)

// tool-call-header-xD.js — 工具头部
new Y$({children: E, mainAxisSize:"min"});
// → Row(mainAxisSize: min)

// thinking-block-zk.js
new s$({mainAxisSize:"min", crossAxisAlignment:"start", children: l});
// → Column(mainAxisSize: min, crossAxisAlignment: start)

// expand-collapse-lT.js
new Y$({mainAxisSize:"min", children: [...]});
// → Row(mainAxisSize: min)

// 选中消息 — width:1/0 (即 Infinity) 模式
new m$({..., width: 1/0, child: p});
// → Container(width: Infinity) — 使用 RenderConstrainedBox 填满父宽度
```

观察：
- Amp 大量使用 `mainAxisSize: "min"` 让容器仅占据内容需要的空间
- 顶层布局用 `mainAxisSize: "max"` 配合 `Expanded` 来占满可用空间
- `width: 1/0` (`Infinity`) 技巧用于让容器填满父约束的最大宽度
- `crossAxisAlignment: "start"` 在文本内容中非常常见（左对齐）
- `crossAxisAlignment: "stretch"` 在顶层布局中使用（`Column(stretch)` 让子项填满宽度）

---

## 2. Flitter 实现细节

### 2.1 BoxConstraints

**源码**: `flitter-core/src/core/box-constraints.ts` (184 行)

#### 2.1.1 构造与规范化

```typescript
constructor(opts?: {
  minWidth?: number;    // 默认 0
  minHeight?: number;   // 默认 0
  maxWidth?: number;    // 默认 Infinity
  maxHeight?: number;   // 默认 Infinity
}) {
  const raw = opts ?? {};
  this.minWidth = roundOrInf(raw.minWidth ?? 0);    // Math.round(), Infinity 保留
  this.minHeight = roundOrInf(raw.minHeight ?? 0);
  this.maxWidth = roundOrInf(raw.maxWidth ?? Infinity);
  this.maxHeight = roundOrInf(raw.maxHeight ?? Infinity);
}

function roundOrInf(v: number): number {
  return Number.isFinite(v) ? Math.round(v) : v;
}
```

**关键差异**: Flitter 在构造器中对所有有限值执行 `Math.round()` 取整。这是 TUI 特化——终端单元格是整数坐标，不需要亚像素精度。

#### 2.1.2 缺失的方法

与 Flutter/Amp 相比，Flitter BoxConstraints **缺少**:

| 方法 | Flutter/Amp 有 | Flitter 有 | 说明 |
|------|:---:|:---:|------|
| `normalize()` | ✅ | ❌ | 显式规范化：`min = max(0, min)`, `max = max(min, max)` |
| `tighten({width, height})` | ✅ | ❌ | 将指定轴收紧为 tight |
| `tightForFinite({w, h})` | ✅ | ❌ | 仅对有限值做 tight |
| `widthConstraints()` | ✅ | ❌ | 返回仅宽度约束 |
| `heightConstraints()` | ✅ | ❌ | 返回仅高度约束 |
| `flipped` | ✅ | ❌ | 宽高互换 |
| `constrainDimensions(w, h)` | ✅ | ❌ | 等价于 constrain 但接受两个参数 |
| `constrainWidth(w)` | ✅ | ❌ | 单维度 constrain |
| `constrainHeight(h)` | ✅ | ❌ | 单维度 constrain |

#### 2.1.3 已实现方法语义对比

| 方法 | Flitter 实现 | 与 Amp/Flutter 一致性 |
|------|------------|:---:|
| `tight(size)` | `min=max=size` | ✅ 完全一致 |
| `tightFor({w,h})` | 指定轴 tight，未指定轴 0..Inf | ✅ 完全一致 |
| `loose(size)` | `min=0, max=size` | ✅ 完全一致 |
| `loosen()` | `min=0, keep max` | ✅ 完全一致 |
| `constrain(size)` | `clamp(value, min, max)` | ✅ 完全一致 |
| `enforce(outer)` | `clamp(this.min/max, outer.min, outer.max)` | ✅ 完全一致 |
| `deflate(edges)` | `min=max(0, min-pad)`, `max=max(deflatedMin, max-pad)` | ✅ 完全一致 |
| `isTight` | `minW===maxW && minH===maxH` | ✅ 完全一致 |
| `hasBoundedWidth` | `maxW < Infinity` | ✅ 完全一致 |
| `hasBoundedHeight` | `maxH < Infinity` | ✅ 完全一致 |
| `isNormalized` | `minW<=maxW && minH<=maxH` | ⚠️ Amp 还检查 `min >= 0` |
| `biggest` | `Size(maxW, maxH)` | ✅ 完全一致 |
| `smallest` | `Size(minW, minH)` | ✅ 完全一致 |
| `equals()` | 四字段严格相等 | ✅ 完全一致 |

### 2.2 RenderFlex

**源码**: `flitter-core/src/layout/render-flex.ts` (554 行)

#### 2.2.1 六步算法实现

**Step 1: 分离弹性/非弹性子项** — ✅ 与 Amp 完全一致

**Step 2: 布局非弹性子项**

```typescript
// Flitter 实现
for (const child of nonFlexChildren) {
  if (isHorizontal) {
    if (crossAxisAlignment === 'stretch') {
      innerConstraints = new BoxConstraints({
        minWidth: 0, maxWidth: Infinity,
        minHeight: maxCross, maxHeight: maxCross,  // tight cross
      });
    } else {
      innerConstraints = new BoxConstraints({
        minWidth: 0, maxWidth: Infinity,
        minHeight: 0, maxHeight: maxCross,  // loose cross
      });
    }
  }
  child.layout(innerConstraints);
  allocatedSize += childMainSize;
  maxCrossSize = max(maxCrossSize, childCrossSize);
}
```

与 Amp 完全一致。非弹性子项在主轴方向上使用 `Infinity` 约束。

**Step 3: 分配弹性空间**

```typescript
const mainAxisLimit = maxMain;
const freeSpace = Math.max(0, mainAxisLimit - allocatedSize);
const spacePerFlex = totalFlex > 0 ? freeSpace / totalFlex : 0;

for (const child of flexChildren) {
  const pd = child.parentData as FlexParentData;
  const childMainSize = Math.max(0, Math.floor(spacePerFlex * pd.flex));
  // tight: min=max=childMainSize
  // loose: min=0, max=childMainSize
}
```

与 Amp 完全一致。使用 `Math.floor()` 取整。

**Step 4: 计算自身尺寸**

```typescript
let mainSize: number;
if (this._mainAxisSize === 'max') {
  mainSize = Number.isFinite(maxMain) ? maxMain : allocatedSize;
} else {
  mainSize = allocatedSize;
}
let crossSize = Math.max(maxCrossSize, minCross);
if (Number.isFinite(maxCross)) {
  crossSize = Math.min(crossSize, maxCross);
}
this.size = constraints.constrain(new Size(...));
```

与 Amp 完全一致。

**Step 5 & 6: 定位 + CrossAxisAlignment** — 与 Amp 完全一致。

#### 2.2.2 Intrinsic 尺寸

Flitter 的 intrinsic 尺寸实现与 Amp 完全一致，包括：
- 主轴 min: 非弹性子项求和，弹性子项贡献 0
- 主轴 max: 非弹性子项求和 + maxPerFlex × totalFlex
- 交叉轴 min: 所有子项取 max
- 交叉轴 max: 所有子项取 max

#### 2.2.3 缺失特性

| 特性 | Flutter/Amp | Flitter | 影响 |
|------|:-----------:|:-------:|------|
| Overflow 检测 | ✅ `_overflow` 字段 + 警告 | ❌ 无溢出检测 | 布局溢出时静默裁剪 |
| Overflow paint | ✅ 黄黑条纹指示器 | ❌ 无 | debug 可视化缺失 |
| textDirection | ✅ RTL 支持 | ❌ 仅 LTR | TUI 不需要 |
| verticalDirection | ✅ up/down | ❌ 仅 down | TUI 不需要 |
| textBaseline | ✅ alphabetic/ideographic | ❌ baseline=0 简化 | TUI 字符格统一高度 |
| clipBehavior | ✅ Clip.hardEdge/antiAlias | ❌ 无裁剪控制 | 交由 paint 层处理 |

### 2.3 FlexParentData

**源码**: `flitter-core/src/layout/parent-data.ts`

```typescript
export class FlexParentData extends BoxParentData {
  flex: number;      // default 0
  fit: FlexFit;      // "tight" | "loose", default "tight"
  
  constructor(flex: number = 0, fit: FlexFit = 'tight') {
    super();
    this.flex = flex;
    this.fit = fit;
  }
}
```

与 Amp 的 `S_ extends PJ` 完全一致。

### 2.4 RenderConstrainedBox

**源码**: `flitter-core/src/layout/render-constrained.ts` (86 行)

```typescript
performLayout(): void {
  const enforced = this._additionalConstraints.enforce(constraints);
  if (this._child) {
    this._child.layout(enforced);
    this.size = enforced.constrain(this._child.size);
  } else {
    this.size = enforced.constrain(enforced.smallest);
  }
}
```

与 Amp 的 `xU0` 完全一致。`enforce` 将额外约束 clamp 到父约束范围内。

### 2.5 Widget 层

| Widget | Flitter 默认值 | Amp/Flutter 默认值 | 一致? |
|--------|-------------|-----------------|:---:|
| `Flex.mainAxisAlignment` | `'start'` | `'start'` | ✅ |
| `Flex.crossAxisAlignment` | `'center'` | `'center'` | ✅ |
| `Flex.mainAxisSize` | `'max'` | `'max'` | ✅ |
| `RenderFlex._crossAxisAlignment` (无Widget时) | `'start'` | `'start'`* | ✅ |
| `Flexible.flex` | 1 | 1 | ✅ |
| `Flexible.fit` | `'loose'` | `'loose'` | ✅ |
| `Expanded.fit` | `'tight'` | `'tight'` | ✅ |

注: RenderFlex 构造器默认 `crossAxisAlignment: 'start'`，但通过 Flex Widget 创建时会被覆盖为 `'center'`（Widget 层默认值）。

### 2.6 Layout 协议 (RenderBox.layout)

```typescript
// Flitter: RenderBox.layout()
layout(constraints: BoxConstraints): void {
  const constraintsChanged =
    !this._lastConstraints ||
    !constraints.equals(this._lastConstraints);
  if (!this._needsLayout && !constraintsChanged) return;
  this._lastConstraints = constraints;
  this._needsLayout = false;
  this.performLayout();
}
```

与 Amp 完全一致。跳过条件：`!needsLayout && !constraintsChanged`。

### 2.7 Infinity 约束传播

Flitter 中 Infinity 的传播路径：

1. **根约束**: `BoxConstraints.tight(Size(cols, rows))` — 紧约束，无 Infinity
2. **Column 内非弹性子项**: 主轴（高度）传入 `maxHeight: Infinity`，子项可自由报告高度
3. **Column 内弹性子项**: 主轴传入 tight/loose 约束（有限值），由 freeSpace 分配
4. **嵌套 Column 内 Column**: 外层 Column 给非弹性子项 `maxHeight: Infinity` → 内层 Column(`mainAxisSize: "min"`) 收到 `maxMain = Infinity` → 内层的 Step 4 使用 `allocatedSize`（因为 `mainAxisSize="min"` 或 `!isFinite(maxMain)`）
5. **SizedBox.expand (Infinity tight constraints)**: `BoxConstraints.tight(Infinity, Infinity)` → `enforce(parent)` → 被 parent 约束 clamp 到有限值

### 2.8 Zero 约束处理

当子项收到 `maxMain = 0` 的约束时:
- 弹性子项: `freeSpace = max(0, 0 - allocatedSize) = 0` → `childMainSize = 0` → 给子项 `tight(0)` 或 `loose(0..0)`
- 非弹性子项: 正常布局，可能报告尺寸为 0

### 2.9 测试覆盖的边界条件

从 `render-flex.test.ts` (939 行) 中覆盖的边界条件：

| 场景 | 测试状态 | 描述 |
|------|:------:|------|
| 空子项 (horizontal) | ✅ | `tight(80,24)` → size = `(80,24)` |
| 空子项 (vertical) | ✅ | `tight(80,24)` → size = `(80,24)` |
| mainAxisSize=min + 空子项 | ✅ | → size.mainAxis = 0 |
| 水平排列 | ✅ | 三个子项正确左右排列 |
| 垂直排列 | ✅ | 两个子项正确上下排列 |
| 1:1 弹性比例 | ✅ | 平分空间 |
| 1:2:3 弹性比例 | ✅ | 按比例分配 |
| 混合弹性/非弹性 | ✅ | 非弹性固定 + 弹性填充剩余 |
| 所有 MainAxisAlignment | ✅ | start/end/center/spaceBetween/spaceAround/spaceEvenly |
| spaceBetween 单子项 | ✅ | 子项在 start (leading=0) |
| 所有 CrossAxisAlignment | ✅ | start/center/end/stretch |
| baseline CrossAxisAlignment | ✅ | crossOffset = 0（TUI 简化） |
| mainAxisSize max | ✅ | 占满约束空间 |
| mainAxisSize min | ✅ | 缩到内容尺寸 |
| FlexFit tight | ✅ | 子项必须填满分配空间 |
| FlexFit loose | ✅ | 子项可以小于分配空间 |
| 混合 tight/loose | ✅ | tight 和 loose 各自行为正确 |
| 嵌套 Flex | ✅ | flex-in-flex 正确传递约束 |
| 零剩余空间 | ✅ | 非弹性占满 → 弹性 size=0 |
| 单弹性子项 | ✅ | 占满所有空间 |
| 全弹性子项 | ✅ | 按比例均分 |
| Paint 偏移传递 | ✅ | 正确累加父偏移 |
| 属性变更触发重布局 | ✅ | setter → markNeedsLayout |

**未覆盖的场景**:
- ❌ 非弹性子项溢出主轴（overflow 检测）
- ❌ Infinity 主轴约束下的弹性子项行为（Column in ScrollView）
- ❌ 负 flex 值处理
- ❌ NaN 或负值约束

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|:------:|------|
| **BoxConstraints 构造器取整** | 不取整，保留浮点 | `Math.round()` 取整所有有限值 | 🟢 低 | TUI 场景下坐标必须为整数，Flitter 的做法更合理。Amp 在 paint 时也必须取整。 |
| **BoxConstraints.normalize()** | ✅ 显式方法可调用 | ❌ 缺失 | 🟡 中 | Amp/Flutter 有 `normalize()` 修复 `min > max` 的非法状态。Flitter 假设调用方总是传入合法值。当前实际使用中不会触发，但防御性编程应该有。 |
| **BoxConstraints.tighten()** | ✅ 将指定轴收紧 | ❌ 缺失 | 🟡 中 | Flutter 的 `tighten` 在 IntrinsicHeight/Width 中使用。Flitter 暂未遇到需要的场景。 |
| **BoxConstraints.tightForFinite()** | ✅ 仅对有限值 tight | ❌ 缺失 | 🟢 低 | 少见使用场景。 |
| **BoxConstraints.isNormalized** | 检查 `min >= 0 && min <= max` | 仅检查 `min <= max` | 🟢 低 | Flitter 不检查 `min >= 0`，但 Flitter 构造器保证 min 默认为 0，实际不会出现负 min。 |
| **BoxConstraints.constrainWidth/Height** | ✅ 单维度 constrain | ❌ 缺失 | 🟢 低 | 可通过 `constrain(Size(w, 0)).width` 间接实现。 |
| **BoxConstraints.flipped** | ✅ 宽高互换 | ❌ 缺失 | 🟢 低 | 仅在 Flex 方向切换时内部使用，Flitter 用 `isHorizontal` 分支替代。 |
| **RenderFlex 6步算法** | Flutter 原版移植 | 忠实复刻 Flutter | ✅ 一致 | Step 1-6 逻辑完全对应，包括弹性空间分配、MainAxisAlignment、CrossAxisAlignment。 |
| **Flex 空间分配取整** | `Math.floor(spacePerFlex * flex)` | `Math.floor(spacePerFlex * flex)` | ✅ 一致 | 两者都用 floor 防止浮点溢出。 |
| **MainAxisSize.min 行为** | `mainSize = allocatedSize` | `mainSize = allocatedSize` | ✅ 一致 | 当 maxMain=Infinity 且 mainAxisSize=max 时，两者都回退到 allocatedSize。 |
| **MainAxisSize.max + Infinity** | `isFinite(maxMain) ? maxMain : allocatedSize` | `Number.isFinite(maxMain) ? maxMain : allocatedSize` | ✅ 一致 | Infinity 主轴下两者行为相同。 |
| **CrossAxisAlignment.stretch** | tight cross: `min=max=maxCross` | tight cross: `min=max=maxCross` | ✅ 一致 | stretch 在交叉轴上施加 tight 约束。 |
| **CrossAxisAlignment.baseline** | 使用真实 textBaseline 偏移 | `crossOffset = 0` 简化 | 🟡 中 | Flutter 有 alphabetic/ideographic baseline 查询。Flitter 简化为 0 是合理的（TUI 字符格高度统一），但与 Flutter 语义不同。 |
| **FlexFit.tight** | `min=max=childMainSize` | `min=max=childMainSize` | ✅ 一致 | — |
| **FlexFit.loose** | `min=0, max=childMainSize` | `min=0, max=childMainSize` | ✅ 一致 | — |
| **Overflow 检测** | ✅ `_overflow` 字段，检测 `allocatedSize > maxMain` | ❌ 无溢出检测 | 🔴 高 | Flitter 不检测也不报告溢出。当非弹性子项总尺寸超过可用空间时，弹性子项获得 0 空间但无警告。 |
| **Overflow paint** | ✅ 黄黑条纹警告 (debug) | ❌ 无 | 🟡 中 | Amp TUI 可能不显示条纹，但会在终端输出 warning。Flitter 完全静默。 |
| **Intrinsic 尺寸: min 主轴** | flex 子项贡献 0 | flex 子项贡献 0 | ✅ 一致 | — |
| **Intrinsic 尺寸: max 主轴** | maxPerFlex 缩放算法 | maxPerFlex 缩放算法 | ✅ 一致 | `maxPerFlex = max(child.maxIntrinsic / child.flex)` |
| **Intrinsic 尺寸: 交叉轴** | max of children | max of children | ✅ 一致 | — |
| **RenderBox.layout 缓存** | 约束相等 + !needsLayout → 跳过 | 约束相等 + !needsLayout → 跳过 | ✅ 一致 | — |
| **Flex Widget 默认 crossAxisAlignment** | `'center'` | `'center'` | ✅ 一致 | — |
| **Row/Column 默认 crossAxisAlignment** | `'center'` | `'center'` | ✅ 一致 | — |
| **RenderFlex 默认 crossAxisAlignment** | `'start'` | `'start'` | ✅ 一致 | RenderFlex 构造器默认值与 Widget 层默认值不同（Widget 层覆盖为 center）。 |
| **FlexParentData 默认 fit** | `'tight'` | `'tight'` | ✅ 一致 | — |
| **Flexible 默认 fit** | `'loose'` | `'loose'` | ✅ 一致 | — |
| **mainOffset 取整** | `Math.round()` | `Math.round()` | ✅ 一致 | 定位时取整，确保整数坐标。 |
| **crossOffset 取整** | `Math.floor()` (center) | `Math.floor()` (center) | ✅ 一致 | center 居中用 floor 向下取整。 |
| **textDirection / verticalDirection** | ✅ RTL + up 支持 | ❌ 仅 LTR + down | 🟢 低 | TUI 不需要 RTL 支持。 |
| **clipBehavior** | ✅ Clip enum | ❌ 无 | 🟢 低 | Flitter 在 paint 层通过 ClipCanvas 处理裁剪。 |
| **estimateIntrinsicWidth** | ❌ 无等价物 | ✅ `layout-helpers.ts` | 🟢 低 | Flitter 额外提供了 Widget 级宽度估计工具函数（不走 RenderObject）。 |
| **RenderConstrainedBox 无子项行为** | `enforced.constrain(enforced.smallest)` | `enforced.constrain(enforced.smallest)` | ✅ 一致 | — |
| **Container width: Infinity 技巧** | `new m$({width: 1/0})` → tight(Inf) → enforce → 填满父 | 等价路径 | ✅ 一致 | `SizedBox.expand()` / `Container(width: Infinity)` 都通过 `enforce` 被 clamp 到父约束。 |

---

## 4. 差异修复建议（按优先级排序）

### P0 — 高优先级（影响布局正确性或调试体验）

#### 4.1 添加 RenderFlex Overflow 检测

**问题**: Flitter 的 RenderFlex 在非弹性子项总尺寸超过可用空间时，不检测也不报告。这会导致弹性子项获得 0 空间，且无任何调试信息。

**修复方案**:

```typescript
// render-flex.ts performLayout() Step 3 之后添加:
if (allocatedSize > mainAxisLimit && Number.isFinite(mainAxisLimit)) {
  this._overflow = allocatedSize - mainAxisLimit;
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `RenderFlex overflow: children exceed available ${isHorizontal ? 'width' : 'height'} ` +
      `by ${this._overflow} (allocated=${allocatedSize}, available=${mainAxisLimit})`
    );
  }
} else {
  this._overflow = 0;
}
```

**优先级**: P0 — 布局溢出是最常见的开发期错误，无警告会极大增加调试难度。

#### 4.2 在测试中补充溢出场景

**修复方案**: 在 `render-flex.test.ts` 添加:

```typescript
describe('overflow detection', () => {
  test('non-flex children exceeding available space', () => {
    const flex = new RenderFlex({ direction: 'horizontal' });
    addChild(flex, new FixedSizeBox(60, 10));
    addChild(flex, new FixedSizeBox(60, 10));
    // total=120, available=100 → overflow=20
    flex.layout(BoxConstraints.tight(new Size(100, 20)));
    // 验证不会 crash，弹性空间正确为 0
  });

  test('overflow with flex children: flex gets zero', () => {
    const flex = new RenderFlex({ direction: 'horizontal' });
    addChild(flex, new FixedSizeBox(120, 10)); // 超过 100
    const flexible = new GreedyBox();
    addChild(flex, flexible, 1);
    flex.layout(BoxConstraints.tight(new Size(100, 20)));
    expect(flexible.size.width).toBe(0);
  });
});
```

### P1 — 中等优先级（完善 API 或改进防御性编程）

#### 4.3 添加 BoxConstraints.normalize()

**问题**: `normalize()` 是 Flutter 在边界条件下的防御措施。虽然 Flitter 当前不会触发非法约束，但后续扩展可能产生 `min > max` 的情况（如手动构造约束、热重载后状态不一致）。

**修复方案**:

```typescript
// box-constraints.ts
normalize(): BoxConstraints {
  if (this.isNormalized) return this;
  return new BoxConstraints({
    minWidth: Math.max(0, this.minWidth),
    maxWidth: Math.max(Math.max(0, this.minWidth), this.maxWidth),
    minHeight: Math.max(0, this.minHeight),
    maxHeight: Math.max(Math.max(0, this.minHeight), this.maxHeight),
  });
}
```

**优先级**: P1 — 防御性 API，防止未来引入的 bug。

#### 4.4 添加 BoxConstraints.tighten()

**问题**: `tighten()` 在 `RenderIntrinsicHeight` 和其他需要将约束收紧到特定值的场景中有用。

**修复方案**:

```typescript
// box-constraints.ts
tighten(opts?: { width?: number; height?: number }): BoxConstraints {
  return new BoxConstraints({
    minWidth: opts?.width == null ? this.minWidth : clamp(opts.width, this.minWidth, this.maxWidth),
    maxWidth: opts?.width == null ? this.maxWidth : clamp(opts.width, this.minWidth, this.maxWidth),
    minHeight: opts?.height == null ? this.minHeight : clamp(opts.height, this.minHeight, this.maxHeight),
    maxHeight: opts?.height == null ? this.maxHeight : clamp(opts.height, this.minHeight, this.maxHeight),
  });
}
```

**优先级**: P1 — 当前 RenderIntrinsicHeight 可能用到。

#### 4.5 完善 isNormalized 检查

**问题**: Flitter 的 `isNormalized` 只检查 `min <= max`，不检查 `min >= 0`。Flutter 的版本还要求非负。

**修复方案**:

```typescript
get isNormalized(): boolean {
  return this.minWidth >= 0
    && this.minWidth <= this.maxWidth
    && this.minHeight >= 0
    && this.minHeight <= this.maxHeight;
}
```

**优先级**: P1 — 符合 Flutter 语义。

#### 4.6 补充 Infinity 主轴约束下的弹性子项测试

**修复方案**: 在测试中添加 Column 在 ScrollView 内的场景（`maxHeight: Infinity`），验证弹性子项获得 0 空间（因为 `freeSpace = max(0, Infinity - allocatedSize) = Infinity` → 弹性子项获得 Infinity 空间 → 但 `Math.floor(Infinity * flex)` = `Infinity`）。

这是一个潜在 bug：当 `maxMain = Infinity` 且存在弹性子项时，`spacePerFlex = Infinity / totalFlex = Infinity`，`childMainSize = Math.floor(Infinity * flex) = Infinity`。子项会收到 `tight(Infinity)` 或 `loose(0..Infinity)` 约束。这在 Flutter 中会触发断言失败。

**修复方案（代码）**:

```typescript
// render-flex.ts Step 3 前添加:
const canFlex = Number.isFinite(mainAxisLimit);
// 只有在主轴有界时才分配弹性空间
const freeSpace = canFlex ? Math.max(0, mainAxisLimit - allocatedSize) : 0;
```

**优先级**: P1 — 影响 Column in ScrollView 场景。

### P2 — 低优先级（API 完整性）

#### 4.7 添加 constrainWidth / constrainHeight 便利方法

```typescript
constrainWidth(width: number = Infinity): number {
  return clamp(width, this.minWidth, this.maxWidth);
}
constrainHeight(height: number = Infinity): number {
  return clamp(height, this.minHeight, this.maxHeight);
}
```

**优先级**: P2 — 便利 API，可以简化部分 performLayout 代码。

#### 4.8 添加 BoxConstraints.tightForFinite()

```typescript
static tightForFinite(opts?: { width?: number; height?: number }): BoxConstraints {
  return new BoxConstraints({
    minWidth: opts?.width != null && Number.isFinite(opts.width) ? opts.width : 0,
    maxWidth: opts?.width != null && Number.isFinite(opts.width) ? opts.width : Infinity,
    minHeight: opts?.height != null && Number.isFinite(opts.height) ? opts.height : 0,
    maxHeight: opts?.height != null && Number.isFinite(opts.height) ? opts.height : Infinity,
  });
}
```

**优先级**: P2 — 少见使用场景。

---

## 附录 A: Amp 混淆符号完整映射 (布局相关)

| Amp 混淆名 | Flutter/Flitter 类名 | 用途 |
|-----------|---------------------|------|
| `l3` | `BoxConstraints` | 盒模型约束 |
| `j9` | `RenderBox` | 渲染盒基类 |
| `n_` | `RenderObject` | 渲染对象基类 |
| `oU0` | `RenderFlex` | Flex 布局引擎 |
| `S_` | `FlexParentData` | Flex 子项父数据 |
| `PJ` | `BoxParentData` | 盒模型父数据 |
| `IJ` | `Flex` (Widget) | Flex Widget |
| `q8` | `Row` | 水平排列 |
| `o8` | `Column` | 垂直排列 |
| `s$` | `Column` (混淆别名) | 在 widget build 中使用 |
| `Y$` | `Row` (混淆别名) | 在 widget build 中使用 |
| `lv` | `Flexible` | 弹性子项 |
| `u3` | `Expanded` | 扩展填充子项 |
| `hL` | `Expanded` (混淆别名) | 在 widget build 中使用 |
| `xU0` | `RenderConstrainedBox` | 约束盒渲染 |
| `X0` | `SizedBox` (Widget) | 尺寸盒 Widget |
| `m$` / `mH` | `Container` (Widget) | 容器 Widget |
| `An` | `MultiChildRenderObjectWidget` | 多子项 RenderObject Widget |
| `R_` | `ParentDataWidget` | 父数据 Widget |

## 附录 B: 关键布局路径追踪

### B.1 Amp App 主布局约束传播

```
WidgetsBinding.drawFrameSync()
  └── rootNode.layout(BoxConstraints.tight(Size(cols, rows)))      // 如 tight(120, 40)
      └── RenderFlex(vertical, max, stretch).performLayout()       // App 根 Column
          ├── [非弹性] statusBar.layout({minW:120,maxW:120,minH:0,maxH:Inf})  // stretch → tight width
          │   └── size = (120, 1)
          ├── [非弹性] inputArea.layout({minW:120,maxW:120,minH:0,maxH:Inf})  // stretch → tight width
          │   └── size = (120, 3)
          └── [弹性 flex=1 tight] chatArea.layout({minW:120,maxW:120,minH:36,maxH:36})
              │                                     // 40 - 1 - 3 = 36
              └── RenderFlex(horizontal, max, stretch).performLayout()   // Row
                  ├── [弹性 flex=1 tight] scrollContent.layout({minW:119,maxW:119,minH:36,maxH:36})
                  │   └── SingleChildScrollView
                  │       └── content.layout({minW:0,maxW:119,minH:0,maxH:Inf})  // 无限高度
                  │           └── Column(mainAxisSize:min, crossAxisAlignment:stretch)
                  │               └── 各消息 Widget...
                  └── [非弹性] scrollbar.layout({minW:0,maxW:Inf,minH:36,maxH:36})
                      └── size = (1, 36)
```

### B.2 Column in ScrollView 的约束链

```
ScrollView 给内容: BoxConstraints(minW:0, maxW:parentW, minH:0, maxH:Infinity)
  └── Column(mainAxisSize:"min", crossAxisAlignment:"stretch")
      │   constraints: {minW:0, maxW:119, minH:0, maxH:Infinity}
      │   maxMain = Infinity
      │   maxCross = 119, minCross = 0
      │
      ├── 非弹性子项: layout({minW:119,maxW:119,minH:0,maxH:Infinity})  // stretch=tight width
      │   各消息自由报告高度
      │
      ├── 弹性子项: ⚠️ freeSpace = max(0, Infinity - allocatedSize) = Infinity
      │   childMainSize = floor(Infinity * flex) = Infinity
      │   ⚠️ 这会给子项传入 tight(Infinity) 或 loose(0..Infinity) 约束!
      │
      └── self.size: mainSize = allocatedSize (因为 mainAxisSize="min")
                     constrain → Size(119, allocatedSize)
```
