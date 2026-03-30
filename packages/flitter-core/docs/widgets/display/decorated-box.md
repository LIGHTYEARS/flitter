# DecoratedBox

`来源: src/widgets/decorated-box.ts`, `src/layout/render-decorated.ts`

DecoratedBox 在子组件周围绘制装饰效果（背景色、边框）。它是 Container 内部使用的底层装饰组件。

## 构造函数

```typescript
new DecoratedBox({
  decoration: BoxDecoration,
  child?: Widget,
  key?: Key,
})
```

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| decoration | `BoxDecoration` | -- | 装饰配置（必填） |
| child | `Widget` | -- | 子组件 |

## BoxDecoration

```typescript
new BoxDecoration({
  color?: Color,        // 背景色
  border?: Border,      // 边框
})
```

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| color | `Color` | -- | 背景填充色 |
| border | `Border` | -- | 四边边框配置 |

## Border

```typescript
// 四边分别设置
new Border({
  top?: BorderSide,
  right?: BorderSide,
  bottom?: BorderSide,
  left?: BorderSide,
})

// 四边相同
Border.all(side: BorderSide): Border
```

| 属性 | 类型 | 说明 |
|------|------|------|
| top | `BorderSide` | 上边框 |
| right | `BorderSide` | 右边框 |
| bottom | `BorderSide` | 下边框 |
| left | `BorderSide` | 左边框 |
| horizontal | `number` | 左右边框宽度之和 |
| vertical | `number` | 上下边框宽度之和 |

## BorderSide

```typescript
new BorderSide({
  color?: Color,
  width?: number,
  style?: BorderStyle,
})
```

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| color | `Color` | `Color.defaultColor` | 边框颜色 |
| width | `number` | `1` | 边框宽度（自动取整） |
| style | `BorderStyle` | `'solid'` | 边框样式 |

### BorderStyle 取值

| 值 | 说明 | 角字符 | 水平 | 垂直 |
|----|------|--------|------|------|
| `'solid'` | 实线边框 | `┌ ┐ └ ┘` | `─` | `│` |
| `'rounded'` | 圆角边框 | `╭ ╮ ╰ ╯` | `─` | `│` |
| `'dashed'` | 虚线边框 | `┌ ┐ └ ┘` | `┄` | `┆` |
| `'double'` | 双线边框 | `╔ ╗ ╚ ╝` | `═` | `║` |

::: details Unicode 边框字符对照表
```
solid (实线):        rounded (圆角):
  ┌──────┐             ╭──────╮
  │      │             │      │
  └──────┘             ╰──────╯

dashed (虚线):       double (双线):
  ┌┄┄┄┄┄┄┐             ╔══════╗
  ┆      ┆             ║      ║
  └┄┄┄┄┄┄┘             ╚══════╝
```
:::

## 布局算法

1. 计算边框宽度
2. 用边框宽度缩减父约束，传给子组件
3. 子组件偏移到边框内部
4. 自身尺寸 = 子组件尺寸 + 边框宽度

## 绘制算法

1. 填充背景色（整个区域，包括边框占据的区域）
2. 按边独立绘制边框 — 每边的颜色、样式、宽度分别处理，`width <= 0` 的边跳过
3. 当相邻两边均存在时，在交角处绘制角字符（如 top + left → `┌`）
4. 递归绘制子组件

::: info
边框绘制支持单边模式 — 只设 `left` 边时不会绘制其余三边的线和角字符，仅输出左侧垂直线 `│`。
:::

## 基本用法

### 简单边框

```typescript
import { DecoratedBox } from 'flitter-core/widgets/decorated-box';
import { BoxDecoration, Border, BorderSide } from 'flitter-core/layout/render-decorated';

new DecoratedBox({
  decoration: new BoxDecoration({
    border: Border.all(new BorderSide({
      color: Color.cyan,
      style: 'rounded',
    })),
  }),
  child: contentWidget,
})
```

### 背景色

```typescript
new DecoratedBox({
  decoration: new BoxDecoration({
    color: Color.blue,
  }),
  child: label('蓝色背景'),
})
```

## 进阶用法

### 单边边框（左侧竖线指示器）

```typescript
new DecoratedBox({
  decoration: new BoxDecoration({
    border: new Border({
      left: new BorderSide({ color: Color.green, width: 2, style: 'solid' }),
    }),
  }),
  child: new Padding({
    padding: EdgeInsets.only({ left: 1 }),
    child: label('引用文本', new TextStyle({ italic: true, foreground: Color.green })),
  }),
})
```

输出效果：
```
│ 引用文本
```

### 带圆角边框和背景色的面板

```typescript
new DecoratedBox({
  decoration: new BoxDecoration({
    color: Color.brightBlack,
    border: Border.all(new BorderSide({
      color: Color.green,
      style: 'rounded',
    })),
  }),
  child: new Padding({
    padding: EdgeInsets.all(1),
    child: new Column({
      mainAxisSize: 'min',
      children: [
        label('面板标题', new TextStyle({ bold: true })),
        label('面板内容'),
      ],
    }),
  }),
})
```

### 无边框仅使用 BorderSide.none

```typescript
// 无边框
BorderSide.none  // 静态属性，width: 0
```

::: tip
大多数情况下推荐使用 [Container](/widgets/layout/container) 组件，它同时提供 decoration、padding、margin 等属性，比直接使用 DecoratedBox 更方便。
:::

## 相关组件

- [Container](/widgets/layout/container) - 组合式容器（内部使用 DecoratedBox）
- [Divider](/widgets/display/divider) - 水平分割线
