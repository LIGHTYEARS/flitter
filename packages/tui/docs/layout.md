# Flitter TUI 布局组件 API 文档

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

// 同时指定 left + right 来固定子项宽度
const fixedWidth = new Stack({
  children: [
    new SizedBox({ width: 50, height: 10 }),
    new Positioned({
      left: 5,
      right: 5,
      top: 2,
      child: new Text({ data: "宽度被固定为 50-5-5=40" }),
    }),
  ],
});
```

### 注意事项

- **Stack 的尺寸**仅由非定位子节点决定。如果所有子节点都是 `Positioned`，Stack 会使用约束最大值（有界时）或最小值（无界时）。
- 同时指定 `left` 和 `right` 时，子节点的宽度被固定为 `stackWidth - left - right`；同理 `top` + `bottom` 固定高度。
- `Positioned` **只能**作为 `Stack` 的直接子节点使用。
- 非定位子节点使用放松约束（`loosen()`）进行布局，即 min 归零，max 保持不变。
- 定位偏移只设置了一个方向时（如只设 `right` 未设 `left`），子节点的位置从该方向反推计算。

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

// 无子节点时，Padding 本身作为占位空间
const spacer = new Padding({
  padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
});
```

### 注意事项

- `EdgeInsets` 实例是不可变的（`Object.freeze`），创建后无法修改属性。如需新值请创建新实例。
- `Padding` 的构造函数中 `padding` 参数是**必填**的，不提供会导致错误。
- 无子节点时，`Padding` 的尺寸为间距本身经父约束限定后的结果。
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

// 同时限制宽高
const fixedSize = new SizedBox({
  width: 30,
  height: 5,
  child: new Text({ data: "30x5 的固定区域" }),
});

// 仅限制高度
const fixedHeight = new SizedBox({
  height: 1,
  child: new Text({ data: "单行高度" }),
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
- 无子节点且 `width`/`height` 为 `undefined` 时，对应维度的尺寸为 0。
- 在 `Row` / `Column` 的子节点之间插入无子节点的 `SizedBox` 是创建固定间距的常用做法。

---

## 6. Container (便捷容器)

### 简介

`Container` 是一个便捷的 `StatelessWidget`，它将 `Padding` 和 `SizedBox` 组合在一起，简化常见的布局模式。

构建顺序（由内到外）：
1. `child` -- 原始子 Widget
2. `SizedBox` -- 如果指定了 `width` 或 `height`
3. `Padding` -- 如果指定了 `padding`

如果没有任何配置且无子 Widget，返回一个零尺寸的 `SizedBox`。

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

// 等价于手动嵌套：
// new Padding({
//   padding: EdgeInsets.all(2),
//   child: new SizedBox({
//     width: 40,
//     height: 8,
//     child: new Text({ data: "带边距的固定尺寸容器" }),
//   }),
// });

// 仅内边距
const paddedOnly = new Container({
  padding: EdgeInsets.symmetric({ horizontal: 3, vertical: 1 }),
  child: new Text({ data: "仅有间距" }),
});

// 仅固定尺寸
const sizedOnly = new Container({
  width: 20,
  height: 5,
});

// 空容器（返回 0x0 的 SizedBox）
const empty = new Container();
```

### 注意事项

- `Container` 是 `StatelessWidget`，不是渲染对象；它在 `build()` 方法中组合其他 Widget。
- 构建顺序很重要：`Padding` 在 `SizedBox` **外层**，这意味着指定的 `width`/`height` 是**不含内边距**的内容区域尺寸，最终占用空间 = `width + padding.horizontal` x `height + padding.vertical`。
- 如果只需要其中一种功能（间距或尺寸），直接使用 `Padding` 或 `SizedBox` 会更明确。
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
console.log(tight.biggest);       // { width: 80, height: 24 }

// 创建松约束（允许 0 到指定最大值）
const loose = BoxConstraints.loose(120, 40);
console.log(loose.minWidth);      // 0
console.log(loose.maxWidth);      // 120

// 限定宽高到约束范围
const constraints = new BoxConstraints({
  minWidth: 10,
  maxWidth: 50,
  minHeight: 5,
  maxHeight: 20,
});
const size = constraints.constrain(100, 3);
console.log(size);                 // { width: 50, height: 5 }

// 放松约束
const loosened = constraints.loosen();
console.log(loosened.minWidth);    // 0
console.log(loosened.maxWidth);    // 50

// 收紧宽度为 30
const tightened = constraints.tighten({ width: 30 });
console.log(tightened.minWidth);   // 30
console.log(tightened.maxWidth);   // 30
console.log(tightened.minHeight);  // 5  (未指定，保持原值)

// 检查边界
const unbounded = new BoxConstraints(); // 默认 0..Infinity
console.log(unbounded.hasBoundedWidth);  // false
console.log(unbounded.hasBoundedHeight); // false

// 仅对宽度创建紧约束
const tightWidth = BoxConstraints.tightFor({ width: 60 });
console.log(tightWidth.minWidth);   // 60
console.log(tightWidth.maxWidth);   // 60
console.log(tightWidth.minHeight);  // 0
console.log(tightWidth.maxHeight);  // Infinity
```

### 注意事项

- `BoxConstraints` 实例是不可变的，所有转换方法都返回**新实例**。
- 构造函数会校验参数合法性：`min` 不能大于 `max`，所有值不能为负数，违反时抛出 `Error`。
- `Infinity` 作为 `maxWidth`/`maxHeight` 的默认值表示无界约束，在 TUI 场景中通常由终端的实际行列数提供有界约束。
- `constrain` 方法使用 `clamp(value, min, max)` 算法，确保结果始终满足约束范围。
- `enforce` 方法将当前约束"嵌入"到另一个约束中，常用于父子约束传递时的范围裁剪。

---

## 综合示例

以下示例展示如何将多种布局组件组合使用，构建一个典型的 TUI 布局：

```typescript
import { Column, Row } from "@flitter/tui/widgets";
import { Expanded, Flexible } from "@flitter/tui/widgets";
import { Stack, Positioned } from "@flitter/tui/widgets";
import { Container } from "@flitter/tui/widgets";
import { Padding } from "@flitter/tui/widgets";
import { SizedBox } from "@flitter/tui/widgets";
import { EdgeInsets } from "@flitter/tui/widgets";
import { Text } from "@flitter/tui/widgets";

// 经典三栏布局：顶栏 + 内容区（侧边栏 + 主区域）+ 底栏
const app = new Column({
  children: [
    // 顶栏：固定高度
    new Container({
      height: 3,
      padding: EdgeInsets.horizontal(2),
      child: new Row({
        mainAxisAlignment: "spaceBetween",
        crossAxisAlignment: "center",
        children: [
          new Text({ data: "Flitter TUI App" }),
          new Text({ data: "[菜单]" }),
        ],
      }),
    }),

    // 内容区：填满剩余空间
    new Expanded({
      child: new Row({
        children: [
          // 侧边栏：固定宽度
          new SizedBox({
            width: 20,
            child: new Column({
              children: [
                new Padding({
                  padding: EdgeInsets.all(1),
                  child: new Text({ data: "导航项 1" }),
                }),
                new Padding({
                  padding: EdgeInsets.all(1),
                  child: new Text({ data: "导航项 2" }),
                }),
                new Padding({
                  padding: EdgeInsets.all(1),
                  child: new Text({ data: "导航项 3" }),
                }),
              ],
            }),
          }),

          // 主区域：弹性填满
          new Expanded({
            child: new Stack({
              alignment: "center",
              children: [
                new Container({
                  padding: EdgeInsets.all(2),
                  child: new Text({ data: "主内容区域" }),
                }),
                new Positioned({
                  right: 1,
                  bottom: 1,
                  child: new Text({ data: "[帮助]" }),
                }),
              ],
            }),
          }),
        ],
      }),
    }),

    // 底栏：固定高度
    new Container({
      height: 1,
      padding: EdgeInsets.horizontal(1),
      child: new Text({ data: "状态栏: 就绪" }),
    }),
  ],
});
```

---

## 附录：类型定义速查

```typescript
// 轴方向
type Axis = "horizontal" | "vertical";

// 主轴对齐
type MainAxisAlignment =
  | "start" | "end" | "center"
  | "spaceBetween" | "spaceAround" | "spaceEvenly";

// 交叉轴对齐
type CrossAxisAlignment = "start" | "end" | "center" | "stretch";

// 主轴尺寸
type MainAxisSize = "min" | "max";

// 弹性适配
type FlexFit = "tight" | "loose";

// 层叠对齐
type StackAlignment =
  | "topLeft" | "topCenter" | "topRight"
  | "centerLeft" | "center" | "centerRight"
  | "bottomLeft" | "bottomCenter" | "bottomRight";

// 尺寸
interface Size {
  readonly width: number;
  readonly height: number;
}
```
