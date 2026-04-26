# 布局 Widget

本文档详细介绍 Flitter TUI 框架中的核心布局组件。这些组件采用 Flutter 风格的布局模型，
通过声明式的 Widget 树描述界面结构，由渲染引擎自动完成约束传递和尺寸计算。

---

## 目录

1. [Row / Column (Flex 弹性布局)](#1-row--column-flex-弹性布局)
2. [Flexible / Expanded (弹性子项)](#2-flexible--expanded-弹性子项)
3. [Stack / Positioned (层叠布局)](#3-stack--positioned-层叠布局)
4. [Padding (内边距)](#4-padding-内边距)
5. [SizedBox (固定尺寸)](#5-sizedbox-固定尺寸)
6. [Container (便捷容器)](#6-container-便捷容器)
7. [BoxConstraints (盒约束)](#7-boxconstraints-盒约束)
8. [IntrinsicHeight](#intrinsicheight)
9. [OverlapColumn](#overlapcolumn)
10. [SplitPane](#splitpane)
11. [Spacer](#spacer)
12. [ClipBox](#clipbox)
13. [Center](#center)
14. [Align](#align)
15. [MediaQuery](#mediaquery)

---

## 1. Row / Column (Flex 弹性布局)

### 简介

`Row` 和 `Column` 是最常用的线性布局组件。`Row` 沿**水平方向**排列子节点，`Column` 沿**垂直方向**排列子节点。两者内部均通过 `RenderFlex` 渲染对象实现，共享相同的布局算法。

布局分为两个阶段：
1. **第一遍**：布局所有非弹性子节点，累计已占用的主轴空间
2. **第二遍**：将剩余空间按弹性因子分配给弹性子节点（`Flexible` / `Expanded`）

### 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选的标识键，用于 Widget 复用 |
| `mainAxisAlignment` | `MainAxisAlignment` | `"start"` | 主轴对齐方式 |
| `crossAxisAlignment` | `CrossAxisAlignment` | `"start"` | 交叉轴对齐方式 |
| `mainAxisSize` | `MainAxisSize` | `"max"` | 主轴尺寸策略 |
| `children` | `Widget[]` | `[]` | 子 Widget 列表 |

#### MainAxisAlignment 主轴对齐方式

| 值 | 说明 |
|----|------|
| `"start"` | 从主轴起点开始排列 |
| `"end"` | 靠主轴末尾排列 |
| `"center"` | 在主轴居中排列 |
| `"spaceBetween"` | 首尾贴边，子项之间等间距 |
| `"spaceAround"` | 每个子项周围等间距（首尾间距为中间间距的一半） |
| `"spaceEvenly"` | 所有间距均匀分布，包含首尾两端 |

#### CrossAxisAlignment 交叉轴对齐方式

| 值 | 说明 |
|----|------|
| `"start"` | 交叉轴起点对齐 |
| `"end"` | 交叉轴末尾对齐 |
| `"center"` | 交叉轴居中对齐 |
| `"stretch"` | 拉伸填满交叉轴 |

#### MainAxisSize 主轴尺寸策略

| 值 | 说明 |
|----|------|
| `"min"` | 收缩到内容实际大小 |
| `"max"` | 填满父约束允许的最大值（默认行为） |

### 使用示例

```typescript
import { Row, Column } from "@flitter/tui/widgets";
import { Text } from "@flitter/tui/widgets";

// 水平居中排列
const row = new Row({
  mainAxisAlignment: "center",
  crossAxisAlignment: "center",
  children: [
    new Text({ data: "左侧" }),
    new Text({ data: "中间" }),
    new Text({ data: "右侧" }),
  ],
});

// 垂直方向，子项间等距分布
const column = new Column({
  mainAxisAlignment: "spaceBetween",
  children: [
    new Text({ data: "顶部" }),
    new Text({ data: "中部" }),
    new Text({ data: "底部" }),
  ],
});

// 收缩到内容大小
const compactRow = new Row({
  mainAxisSize: "min",
  children: [
    new Text({ data: "A" }),
    new Text({ data: "B" }),
  ],
});
```

### 注意事项

- `Row` 的主轴为水平方向（宽度），交叉轴为垂直方向（高度）；`Column` 则相反。
- 当 `mainAxisSize` 为 `"max"` 时，Row/Column 会尽可能占满父约束的主轴空间；设为 `"min"` 时仅占用子项实际所需的空间。
- 使用 `crossAxisAlignment: "stretch"` 时，所有子项会被拉伸至交叉轴最大约束值。
- 子项列表中可以混合普通 Widget 与 `Flexible` / `Expanded` 包裹的 Widget。

---

## 2. Flexible / Expanded (弹性子项)

### 简介

`Flexible` 和 `Expanded` 用于在 `Row` / `Column` 内按比例分配剩余空间。

- **Flexible**：以指定的弹性因子参与空间分配，适配方式默认为 `"loose"`（子项可以小于分配到的空间）。
- **Expanded**：`Flexible` 的子类，强制 `fit` 为 `"tight"`（子项必须填满分配到的空间）。

两者均为 **ParentDataWidget**，不创建自己的渲染对象，而是将 `flex` 和 `fit` 属性写入子渲染对象的 `FlexParentData`。

### Flexible 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `child` | `Widget` | **必填** | 被包裹的子 Widget |
| `flex` | `number` | `1` | 弹性因子，决定空间分配比例 |
| `fit` | `FlexFit` | `"loose"` | 适配方式：`"tight"` 或 `"loose"` |

### Expanded 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `child` | `Widget` | **必填** | 被包裹的子 Widget |
| `flex` | `number` | `1` | 弹性因子 |

> `Expanded` 不接受 `fit` 参数，其值固定为 `"tight"`。

### FlexFit 适配方式

| 值 | 说明 |
|----|------|
| `"tight"` | 强制填满分配到的空间（子项约束的 minMain = maxMain） |
| `"loose"` | 允许小于分配的空间（子项约束的 minMain = 0） |

### 使用示例

```typescript
import { Row } from "@flitter/tui/widgets";
import { Flexible, Expanded } from "@flitter/tui/widgets";
import { Text } from "@flitter/tui/widgets";

// 两个子项按 1:2 比例分配空间，都填满各自的空间
const row = new Row({
  children: [
    new Expanded({
      flex: 1,
      child: new Text({ data: "占 1/3" }),
    }),
    new Expanded({
      flex: 2,
      child: new Text({ data: "占 2/3" }),
    }),
  ],
});

// Flexible (loose)：子项可以不填满分配的空间
const flexibleRow = new Row({
  children: [
    new Flexible({
      flex: 1,
      fit: "loose",
      child: new Text({ data: "可能不填满" }),
    }),
    new Text({ data: "固定内容" }),
  ],
});
```

### 注意事项

- `Flexible` 和 `Expanded` **只能**作为 `Row` 或 `Column` 的直接子节点使用。
- 弹性因子 `flex` 为 0 时等同于非弹性子节点，会在第一遍布局中处理。
- 剩余空间的计算公式：`freeSpace = maxMain - allocatedMainAxis`，每个弹性子项分到 `freeSpace * (flex / totalFlex)` 的空间。
- `Expanded` 等价于 `new Flexible({ child, flex, fit: "tight" })`。

---

## 3. Stack / Positioned (层叠布局)

### 简介

`Stack` 将子节点**层叠**放置，后面的子节点绘制在前面的子节点之上。子节点分为两类：

- **非定位子节点**：根据 `alignment` 属性决定放置位置
- **定位子节点**：通过 `Positioned` 包裹，使用 `left`/`top`/`right`/`bottom` 精确控制偏移

Stack 自身的尺寸由所有**非定位子节点**中的最大宽高决定。

### Stack 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `alignment` | `StackAlignment` | `"topLeft"` | 非定位子节点的对齐方式 |
| `children` | `Widget[]` | `[]` | 子 Widget 列表 |

#### StackAlignment 对齐方式（9 个位置）

| 值 | 说明 |
|----|------|
| `"topLeft"` | 左上角（默认） |
| `"topCenter"` | 顶部居中 |
| `"topRight"` | 右上角 |
| `"centerLeft"` | 左侧居中 |
| `"center"` | 正中央 |
| `"centerRight"` | 右侧居中 |
| `"bottomLeft"` | 左下角 |
| `"bottomCenter"` | 底部居中 |
| `"bottomRight"` | 右下角 |

### Positioned 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `child` | `Widget` | **必填** | 被包裹的子 Widget |
| `left` | `number` | `undefined` | 距左边缘的距离 |
| `top` | `number` | `undefined` | 距顶部边缘的距离 |
| `right` | `number` | `undefined` | 距右边缘的距离 |
| `bottom` | `number` | `undefined` | 距底部边缘的距离 |

### 使用示例

```typescript
import { Stack, Positioned } from "@flitter/tui/widgets";
import { Text } from "@flitter/tui/widgets";
import { SizedBox } from "@flitter/tui/widgets";

// 基本层叠：非定位子节点居中对齐
const stack = new Stack({
  alignment: "center",
  children: [
    new SizedBox({ width: 40, height: 10 }), // 背景层，决定 Stack 尺寸
    new Text({ data: "居中文本" }),            // 居中放置
  ],
});

// 使用 Positioned 精确定位
const positioned = new Stack({
  children: [
    new SizedBox({ width: 60, height: 20 }), // 背景层
    new Positioned({
      left: 2,
      top: 1,
      child: new Text({ data: "左上角偏移" }),
    }),
    new Positioned({
      right: 2,
      bottom: 1,
      child: new Text({ data: "右下角偏移" }),
    }),
  ],
});
```

### 注意事项

- **Stack 的尺寸**仅由非定位子节点决定。如果所有子节点都是 `Positioned`，Stack 会使用约束最大值（有界时）或最小值（无界时）。
- 同时指定 `left` 和 `right` 时，子节点的宽度被固定为 `stackWidth - left - right`；同理 `top` + `bottom` 固定高度。
- `Positioned` **只能**作为 `Stack` 的直接子节点使用。
- 非定位子节点使用放松约束（`loosen()`）进行布局，即 min 归零，max 保持不变。

---

## 4. Padding (内边距)

### 简介

`Padding` 在子 Widget 周围添加指定的内边距。布局时，先将父约束收缩（减去间距部分），将收缩后的约束传给子节点，最终自身尺寸 = 子节点尺寸 + 间距。

间距通过 `EdgeInsets` 对象描述，该对象是不可变的（使用 `Object.freeze`），通过静态工厂方法创建。

### EdgeInsets 静态工厂方法

| 方法 | 说明 | 示例 |
|------|------|------|
| `EdgeInsets.all(value)` | 四边相同间距 | `EdgeInsets.all(2)` |
| `EdgeInsets.symmetric({ horizontal?, vertical? })` | 水平/垂直对称间距 | `EdgeInsets.symmetric({ horizontal: 4, vertical: 1 })` |
| `EdgeInsets.horizontal(value)` | 仅左右间距 | `EdgeInsets.horizontal(3)` |
| `EdgeInsets.vertical(value)` | 仅上下间距 | `EdgeInsets.vertical(1)` |
| `EdgeInsets.only({ left?, top?, right?, bottom? })` | 分别指定各方向 | `EdgeInsets.only({ left: 2, top: 1 })` |
| `EdgeInsets.zero` | 零间距常量 | `EdgeInsets.zero` |

### EdgeInsets 实例属性与方法

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `left` | `number` | 左侧间距 |
| `top` | `number` | 上侧间距 |
| `right` | `number` | 右侧间距 |
| `bottom` | `number` | 下侧间距 |
| `horizontal` | `number` | 水平总间距（`left + right`） |
| `vertical` | `number` | 垂直总间距（`top + bottom`） |
| `equals(other)` | `boolean` | 判断两个 EdgeInsets 是否相等 |

### Padding 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `padding` | `EdgeInsets` | **必填** | 内边距描述 |
| `child` | `Widget` | `undefined` | 可选子 Widget |

### 使用示例

```typescript
import { Padding } from "@flitter/tui/widgets";
import { EdgeInsets } from "@flitter/tui/widgets";
import { Text } from "@flitter/tui/widgets";

// 四边统一间距
const padded = new Padding({
  padding: EdgeInsets.all(2),
  child: new Text({ data: "四周有 2 格间距" }),
});

// 仅水平方向间距
const horizontal = new Padding({
  padding: EdgeInsets.horizontal(4),
  child: new Text({ data: "左右各 4 格" }),
});

// 不对称间距
const asymmetric = new Padding({
  padding: EdgeInsets.only({ left: 3, top: 1, right: 1, bottom: 0 }),
  child: new Text({ data: "不对称间距" }),
});
```

### 注意事项

- `EdgeInsets` 实例是不可变的（`Object.freeze`），创建后无法修改属性。如需新值请创建新实例。
- `Padding` 的构造函数中 `padding` 参数是**必填**的，不提供会导致错误。
- 约束收缩时会执行 `Math.max(0, ...)`，确保收缩后的约束不会出现负值。

---

## 5. SizedBox (固定尺寸)

### 简介

`SizedBox` 用于为子 Widget 指定固定的宽度和/或高度。未指定的维度保持父约束不变。

- **有子节点时**：子节点在指定维度上被紧约束（min = max = 指定值），自身尺寸等于子节点布局后的实际尺寸。
- **无子节点时**：作为空白占位空间，尺寸为 `constrain(width ?? 0, height ?? 0)`。

### 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `width` | `number` | `undefined` | 固定宽度，`undefined` 表示不约束 |
| `height` | `number` | `undefined` | 固定高度，`undefined` 表示不约束 |
| `child` | `Widget` | `undefined` | 可选子 Widget |

### 使用示例

```typescript
import { SizedBox } from "@flitter/tui/widgets";
import { Text } from "@flitter/tui/widgets";

// 固定宽高的空白区域（用作间距）
const spacer = new SizedBox({ width: 10, height: 3 });

// 限制子项的宽度，高度不约束
const fixedWidth = new SizedBox({
  width: 20,
  child: new Text({ data: "宽度固定为 20" }),
});

// 在 Row 中用作间距
import { Row } from "@flitter/tui/widgets";
const rowWithGap = new Row({
  children: [
    new Text({ data: "左" }),
    new SizedBox({ width: 4 }),  // 4 格间距
    new Text({ data: "右" }),
  ],
});
```

### 注意事项

- 指定的宽/高会经过父约束的 `constrain` 处理，实际值被限定在 `[min, max]` 范围内。
- `width` 和 `height` 都为 `undefined` 时，SizedBox 不添加任何约束，相当于透明包裹。
- 在 `Row` / `Column` 的子节点之间插入无子节点的 `SizedBox` 是创建固定间距的常用做法。

---

## 6. Container (便捷容器)

### 简介

`Container` 是一个便捷的 `StatelessWidget`，它将 `Padding` 和 `SizedBox` 组合在一起，简化常见的布局模式。

构建顺序（由内到外）：
1. `child` -- 原始子 Widget
2. `SizedBox` -- 如果指定了 `width` 或 `height`
3. `Padding` -- 如果指定了 `padding`

### 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `padding` | `EdgeInsets` | `undefined` | 可选内边距 |
| `width` | `number` | `undefined` | 可选固定宽度 |
| `height` | `number` | `undefined` | 可选固定高度 |
| `child` | `Widget` | `undefined` | 可选子 Widget |

### 使用示例

```typescript
import { Container } from "@flitter/tui/widgets";
import { EdgeInsets } from "@flitter/tui/widgets";
import { Text } from "@flitter/tui/widgets";

// 带内边距和固定宽度的容器
const container = new Container({
  width: 40,
  height: 8,
  padding: EdgeInsets.all(2),
  child: new Text({ data: "带边距的固定尺寸容器" }),
});
```

### 注意事项

- `Container` 是 `StatelessWidget`，不是渲染对象；它在 `build()` 方法中组合其他 Widget。
- 构建顺序很重要：`Padding` 在 `SizedBox` **外层**，最终占用空间 = `width + padding.horizontal` x `height + padding.vertical`。
- 当所有参数都为 `undefined` 且无 `child` 时，返回 `SizedBox({ width: 0, height: 0 })`。

---

## 7. BoxConstraints (盒约束)

### 简介

`BoxConstraints` 是布局系统的核心数据结构，描述子组件可接受的**最小/最大宽高范围**。父节点通过向下传递约束来限制子节点的尺寸。所有实例均为不可变的（`readonly` + `Object.freeze`）。

约束模型遵循以下不变式：
- `0 <= minWidth <= maxWidth`
- `0 <= minHeight <= maxHeight`

### 构造参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `minWidth` | `number` | `0` | 最小宽度 |
| `maxWidth` | `number` | `Infinity` | 最大宽度 |
| `minHeight` | `number` | `0` | 最小高度 |
| `maxHeight` | `number` | `Infinity` | 最大高度 |

### 静态工厂方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `tight` | `tight(width, height)` | 紧约束：min = max = 给定值 |
| `loose` | `loose(width, height)` | 松约束：min = 0，max = 给定值 |
| `tightFor` | `tightFor({ width?, height? })` | 指定维度紧约束，未指定维度使用 `0..Infinity` |

### 计算属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `hasBoundedWidth` | `boolean` | `maxWidth` 是否有限（非 `Infinity`） |
| `hasBoundedHeight` | `boolean` | `maxHeight` 是否有限 |
| `hasTightWidth` | `boolean` | 宽度是否为紧约束（`minWidth >= maxWidth`） |
| `hasTightHeight` | `boolean` | 高度是否为紧约束 |
| `isTight` | `boolean` | 宽高两个维度是否都是紧约束 |
| `biggest` | `Size` | 约束允许的最大尺寸 `{ width: maxWidth, height: maxHeight }` |
| `smallest` | `Size` | 约束允许的最小尺寸 `{ width: minWidth, height: minHeight }` |

### 实例方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `constrain` | `constrain(width, height): Size` | 将给定宽高限定在 `[min, max]` 范围内 |
| `loosen` | `loosen(): BoxConstraints` | 放松约束：min 归零，max 不变 |
| `tighten` | `tighten({ width?, height? }): BoxConstraints` | 收紧指定维度为紧约束 |
| `enforce` | `enforce(other): BoxConstraints` | 将当前约束的 min/max 限定到 other 的范围内 |
| `equals` | `equals(other): boolean` | 判断两个约束是否相等 |

### 使用示例

```typescript
import { BoxConstraints } from "@flitter/tui/tree";

// 创建紧约束（固定尺寸）
const tight = BoxConstraints.tight(80, 24);
console.log(tight.isTight);       // true

// 创建松约束（允许 0 到指定最大值）
const loose = BoxConstraints.loose(120, 40);
console.log(loose.minWidth);      // 0

// 限定宽高到约束范围
const constraints = new BoxConstraints({
  minWidth: 10, maxWidth: 50,
  minHeight: 5, maxHeight: 20,
});
const size = constraints.constrain(100, 3);
console.log(size);                 // { width: 50, height: 5 }
```

### 注意事项

- `BoxConstraints` 实例是不可变的，所有转换方法都返回**新实例**。
- 构造函数会校验参数合法性：`min` 不能大于 `max`，所有值不能为负数。
- `Infinity` 作为 `maxWidth`/`maxHeight` 的默认值表示无界约束。

---

## 附录：类型定义速查

```typescript
type Axis = "horizontal" | "vertical";
type MainAxisAlignment =
  | "start" | "end" | "center"
  | "spaceBetween" | "spaceAround" | "spaceEvenly";
type CrossAxisAlignment = "start" | "end" | "center" | "stretch";
type MainAxisSize = "min" | "max";
type FlexFit = "tight" | "loose";
type StackAlignment =
  | "topLeft" | "topCenter" | "topRight"
  | "centerLeft" | "center" | "centerRight"
  | "bottomLeft" | "bottomCenter" | "bottomRight";
interface Size { readonly width: number; readonly height: number; }
```

---

## IntrinsicHeight

> 强制子节点高度等于其固有高度。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `child` | `Widget` | `undefined` | 子 Widget |

在松高度约束下，强制子节点的高度等于其 `maxIntrinsicHeight`。如果约束已经是紧高度，直接透传。

```typescript
new IntrinsicHeight({
  child: new Row({
    crossAxisAlignment: "stretch",
    children: [panel1, panel2],
  }),
})
```

**注意**: 与 Flutter 的 IntrinsicHeight 相同，此 Widget 需要额外的测量 pass，性能开销较大，应谨慎使用。

**相关 Widget**: Row, Column, SizedBox

---

## OverlapColumn

> 垂直排列子节点，相邻子节点之间重叠指定行数。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `overlap` | `number` | `1` | 相邻子节点重叠的行数，必须 >= 0 |
| `crossAxisAlignment` | `OverlapCrossAxisAlignment` | `"stretch"` | 交叉轴对齐：`"start"` / `"end"` / `"center"` / `"stretch"` |
| `children` | `Widget[]` | `[]` | 子 Widget 列表 |

用于实现合并边框效果（相邻容器的上下边框合并为一行）。绘制顺序为逆序——索引较小的子节点在重叠区域视觉上"在上方"。

```typescript
new OverlapColumn({
  overlap: 1,
  children: [
    new DialogBox({ ... }),
    new DialogBox({ ... }),
  ],
})
```

**相关 Widget**: Column, Stack

---

## SplitPane

> 可调整大小的分割布局，两个子面板之间有可拖拽分隔线。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `direction` | `"horizontal" \| "vertical"` | **必填** | 分割方向 |
| `initialRatio` | `number` | `0.5` | 初始比例（0.0-1.0） |
| `children` | `[Widget, Widget]` | **必填** | 两个子 Widget |
| `onResize` | `(ratio: number) => void` | `undefined` | 拖拽回调 |
| `minRatio` | `number` | `0.1` | 最小比例 |
| `maxRatio` | `number` | `0.9` | 最大比例 |
| `dividerColor` | `Color` | `Color.rgb(108,112,134)` | 分隔线颜色 |

```typescript
new SplitPane({
  direction: "horizontal",
  initialRatio: 0.3,
  children: [leftPanel, rightPanel],
  onResize: (ratio) => console.log(`Ratio: ${ratio}`),
})
```

**相关 Widget**: Row, Column, Expanded

---

## Spacer

> Flex 布局中的弹性间隔。等价于 `Flexible({ child: SizedBox(), flex: N, fit: "tight" })`。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `flex` | `number` | `1` | 弹性因子 |

```typescript
new Row({
  children: [
    new Text({ data: "左" }),
    new Spacer(),           // 占据中间所有空间
    new Text({ data: "右" }),
  ],
})
```

**相关 Widget**: Flexible, Expanded, SizedBox

---

## ClipBox

> 裁剪容器，将子节点的绘制限制在自身边界内，超出部分被静默丢弃。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `child` | `Widget` | `undefined` | 子 Widget |

```typescript
new ClipBox({
  child: new SizedBox({
    width: 20, height: 3,
    child: new Text({ data: "这段很长的文本会被裁剪到 20x3 的区域内" }),
  }),
})
```

**相关 Widget**: Viewport, SizedBox

---

## Center

> Align 的语法糖，将子 Widget 居中放置。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `child` | `Widget` | `undefined` | 子 Widget |

等价于无 `widthFactor` / `heightFactor` 的 `Align`。自身尽可能撑满父约束，子节点居中偏移。

```typescript
new Center({
  child: new Text({ data: "居中文本" }),
})
```

**相关 Widget**: Align, Stack

---

## Align

> 将子 Widget 居中对齐，可选按比例因子缩放自身尺寸。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `widthFactor` | `number` | `undefined` | 宽度因子，自身宽度 = 子宽度 * factor |
| `heightFactor` | `number` | `undefined` | 高度因子，自身高度 = 子高度 * factor |
| `child` | `Widget` | `undefined` | 子 Widget |

未指定 factor 时，自身撑满父约束。指定 factor 时，自身尺寸按子节点尺寸乘以因子收缩。

```typescript
new Align({
  widthFactor: 2,
  heightFactor: 1.5,
  child: new Text({ data: "缩放对齐" }),
})
```

**相关 Widget**: Center, Stack

---

## MediaQuery

> InheritedWidget，向子树注入终端尺寸和能力信息。

### MediaQueryData 构造参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `size` | `{ width: number; height: number }` | 终端尺寸（列数 x 行数） |
| `capabilities` | `TerminalCapabilities` | 终端能力信息 |

### 静态方法

| 方法 | 签名 | 说明 |
|------|------|------|
| `MediaQuery.of(context)` | `MediaQueryData` | 获取终端环境数据 |
| `MediaQuery.sizeOf(context)` | `{ width, height }` | 便捷获取终端尺寸 |
| `MediaQuery.capabilitiesOf(context)` | `TerminalCapabilities` | 便捷获取终端能力 |

### 便捷属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `supportsEmojiWidth` | `boolean` | 是否支持 Emoji 宽度检测 |
| `supportsSyncOutput` | `boolean` | 是否支持同步输出 (DEC Mode 2026) |

```typescript
// 在 build() 中获取终端信息
const media = MediaQuery.of(context);
const { width, height } = media.size;
if (media.supportsEmojiWidth) { /* ... */ }
```

**相关 Widget**: Theme, InheritedWidget

---

> 📖 教程: [布局系统](/tutorial/subsystems/layout)
