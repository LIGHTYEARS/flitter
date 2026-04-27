# 布局系统

任何 TUI 应用都需要把 Widget 排列到终端屏幕上——决定每个元素占多大空间、放在什么位置。布局系统就是解决这个问题的核心子系统。当你需要构建一个自适应终端宽度的多栏界面，或者让某些元素填充剩余空间时，就需要了解布局系统的工作方式。

Flitter 的布局系统与 Flutter 一致：**约束向下传递，尺寸向上返回**。

### 你将学到什么

- BoxConstraints 约束模型的基本概念
- 布局流程中约束和尺寸如何在树中传递
- Flex 布局（Row/Column）和 Stack 布局的用法
- 脏标记机制如何优化布局性能

## BoxConstraints

每个 RenderObject 在布局时接收一个 `BoxConstraints`，包含四个值：

```ts
interface BoxConstraints {
  minWidth: number;   // 最小宽度
  maxWidth: number;   // 最大宽度
  minHeight: number;  // 最小高度
  maxHeight: number;  // 最大高度
}
```

## 布局流程

下面的 ASCII 图展示了约束和尺寸在渲染树中的传递方向：

```
         ┌─────────────────────────────────┐
         │           根 RenderObject         │
         │   接收终端尺寸 (cols x rows)      │
         └──────────┬──────────────────────┘
                    │
           Constraints 向下传递
                    │
                    ▼
         ┌─────────────────────────────────┐
         │        父 RenderObject           │
         │   为每个子节点生成约束            │
         │   调用 child.layout(constraints) │
         └──────────┬──────────────────────┘
                    │
           Constraints 向下传递
                    │
                    ▼
         ┌─────────────────────────────────┐
         │        子 RenderObject           │
         │   在约束范围内确定自身 Size       │
         └──────────┬──────────────────────┘
                    │
            Size 向上返回
                    │
                    ▼
         ┌─────────────────────────────────┐
         │        父 RenderObject           │
         │   根据子节点 Size 确定偏移       │
         │   确定自身 Size 并向上返回       │
         └─────────────────────────────────┘
```

用代码表示整个流程：

```
根 RenderObject
  ├── 接收终端尺寸作为约束
  ├── performLayout()
  │     ├── 为每个子节点生成约束
  │     ├── 调用 child.layout(constraints)
  │     ├── 子节点返回 Size
  │     └── 确定自身 Size 和子节点偏移
  └── 向父级返回 Size
```

## Flex 布局

`Column`（垂直）和 `Row`（水平）使用 Flex 布局算法：

1. **第一轮**：布局非弹性子节点，计算已使用空间
2. **第二轮**：将剩余空间按 flex 比例分配给 `Expanded`/`Flexible` 子节点
3. **定位**：根据 `mainAxisAlignment` 和 `crossAxisAlignment` 确定每个子节点的偏移

:::info 如果你用过 CSS Flexbox
Flitter 的 `Row` 和 `Column` 与 CSS Flexbox 的概念非常相似。`Row` 相当于 `flex-direction: row`，`Column` 相当于 `flex-direction: column`。`Expanded` 的效果类似 `flex: 1`，`Flexible` 允许你指定不同的 flex 比例。`mainAxisAlignment` 对应 `justify-content`，`crossAxisAlignment` 对应 `align-items`。如果你熟悉 Flexbox，上手会很快。
:::

下面的例子展示了固定宽度元素和弹性元素的混合使用：

```ts
Row({
  children: [
    Text('固定'),                           // 非弹性，占用实际宽度
    Expanded({ child: Text('填充剩余') }),  // flex=1，填充剩余空间
    Flexible({ flex: 2, child: Text('2x') }), // flex=2，按比例
  ],
})
```

## Stack 布局

`Stack` 使用层叠布局，子节点默认从左上角开始。适合需要将 Widget 叠放在一起的场景，比如在背景上放置标签：

```ts
Stack({
  children: [
    Container({ width: 40, height: 10 }),  // 底层
    Positioned({
      top: 1,
      right: 1,
      child: Text('浮在上面'),
    }),
  ],
})
```

## 脏标记机制

布局使用脏标记（dirty flag）优化：
- `markNeedsLayout()` — 标记当前 RenderObject 需要重新布局
- `PipelineOwner` 收集所有脏节点，在帧的 layout 阶段统一处理
- 只有脏节点及其受影响的子树才会重新布局

## 与其他子系统的配合

- **滚动系统**：滚动容器在布局阶段计算内容总高度与视口高度之差，得出 `maxScrollExtent`。
- **浮层系统**：`Positioned` 和 `Stack` 是浮层定位的基础，`OverlayEntry` 内部使用 Stack 布局。
- **手势系统**：命中测试依赖布局阶段计算出的每个 RenderObject 的位置和尺寸。

## 下一步

- [滚动系统](./scroll.md) — 当内容超出视口时如何处理
- [浮层系统](./overlay.md) — 使用 Stack 和 Positioned 构建弹出层
- [性能与调试](./performance.md) — 布局阶段的性能优化
