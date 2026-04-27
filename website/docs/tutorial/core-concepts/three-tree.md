# 三棵树架构

## 为什么要了解这个？

Flitter（和 Flutter）的核心设计就是「三棵树」。无论你是写一个简单的文本标签，还是构建复杂的交互界面，背后都是这三棵树在协同工作。理解它们之间的分工，能帮你搞清楚「为什么 Widget 要重新创建」「State 为什么能保留」这类常见困惑。

:::tip 一句话总结
Widget 描述界面长什么样，Element 管理生命周期，RenderObject 负责实际布局和绘制。
:::

## 三棵树的关系

如果你有 React 背景，可以这样类比：

| Flitter | React 类比 | 职责 |
|---------|-----------|------|
| Widget | JSX / `React.createElement()` 的返回值 | 不可变的配置描述 |
| Element | Fiber 节点（内部实现） | 管理生命周期、协调 diff |
| RenderObject | 真实 DOM 节点 | 执行布局和绘制 |

下面是一个直观的示意图：

```
你写的代码                框架内部管理              实际渲染
─────────────          ──────────────          ──────────────

Widget 树               Element 树              RenderObject 树
┌───────────┐          ┌────────────┐          ┌──────────────┐
│ Container │ ──创建──▶ │ C-Element  │ ──创建──▶ │ C-RenderObj  │
│           │          │ (持有State) │          │ (布局+绘制)   │
├───────────┤          ├────────────┤          ├──────────────┤
│   Text    │ ──创建──▶ │ T-Element  │ ──创建──▶ │ T-RenderObj  │
└───────────┘          └────────────┘          └──────────────┘

  每次 rebuild              尽量复用               尽量复用
  都是全新对象             只更新变化部分           只重新布局变化部分
```

核心流程是：**Widget 变了 → Element 对比新旧 Widget 决定是否复用 → 需要时更新 RenderObject**。

## Widget 树

Widget 是 **不可变的配置描述**。每次状态变化时，框架会创建新的 Widget 树，与旧树对比。

:::info 什么是「不可变」？为什么 Widget 是不可变的？
「不可变」意味着 Widget 一旦创建，它的属性就不会改变。想修改界面？不是去改已有的 Widget，而是创建一个新的。这听起来浪费，但实际上 Widget 只是轻量的配置对象（类似 React 的 JSX 描述），创建它的代价非常低。真正昂贵的 Element 和 RenderObject 会被框架复用，不会每次都重建。
:::

```ts
// StatelessWidget：无状态，纯函数式
class MyLabel extends StatelessWidget {
  build() {
    return Text('Hello');
  }
}

// StatefulWidget：持有可变 State
class MyCounter extends StatefulWidget {
  createState() {
    return new MyCounterState();
  }
}

class MyCounterState extends State<MyCounter> {
  count = 0;

  build() {
    return Text(`Count: ${this.count}`);
  }
}
```

### 关键概念
- Widget 是轻量对象，创建和销毁代价很低
- `StatefulWidget` 的 State 跨重建保持
- `InheritedWidget` 用于向子树传递数据（类似 React Context）

## Element 树

Element 是 **Widget 的实例化**，负责：
- 管理 Widget 的生命周期（挂载、更新、卸载）
- 协调子树的 diff 和复用（reconciliation）
- 持有对 RenderObject 的引用

:::info Element 就像 React 的 Fiber
开发者通常不直接操作 Element 树。就像你写 React 时不需要了解 Fiber 的内部细节一样，Flitter 的 Element 也是框架内部的实现机制。它在幕后帮你做「脏检查」和「子树复用」——当父级重建时，Element 会对比新旧 Widget 的类型和 key，决定是复用已有的子树还是创建新的。这就是为什么 State 能在 rebuild 之间保持不变：State 挂在 Element 上，而 Element 被复用了。
:::

## RenderObject 树

RenderObject 负责 **实际的布局和绘制**：
- `performLayout()` -- 接收父级约束，计算自身尺寸，布局子节点
- `paint()` -- 将内容写入 Screen buffer

### BoxConstraints

布局系统使用 `BoxConstraints`（最小/最大宽高）向下传递：

```
父级约束 → RenderObject.performLayout() → 确定尺寸 + 布局子节点
```

:::info 类比 CSS 盒模型
如果你熟悉 CSS，可以把 BoxConstraints 理解为父元素对子元素的尺寸限制。不同的是，CSS 的约束规则分散在各种属性里（`width`、`max-width`、`flex` 等），而 Flitter 把它统一成了一个简洁的 `BoxConstraints` 对象，包含 `minWidth`、`maxWidth`、`minHeight`、`maxHeight` 四个值。
:::

## BuildOwner 与 PipelineOwner

- **BuildOwner** -- 管理脏 Element 列表，驱动 build 阶段
- **PipelineOwner** -- 管理需要 layout/paint 的 RenderObject 列表，驱动 layout 和 paint 阶段

这两个 Owner 由 `WidgetsBinding` 在每一帧中按序调用。

:::tip 帧循环的完整顺序
每一帧的处理顺序是固定的：**build → layout → paint → 渲染到终端**。BuildOwner 负责前半段（哪些 Widget 需要重建），PipelineOwner 负责后半段（哪些 RenderObject 需要重新布局和绘制）。分开管理意味着框架可以精确追踪「什么变了」，避免不必要的工作。
:::
