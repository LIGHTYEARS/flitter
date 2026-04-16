# 布局系统

Flitter 的布局系统与 Flutter 一致：**约束向下传递，尺寸向上返回**。

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

`Stack` 使用层叠布局，子节点默认从左上角开始：

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
