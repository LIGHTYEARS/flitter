# 内置 Widget

Flitter 提供 25+ 内置 Widget，覆盖文本、布局、容器、交互、滚动等常见场景。

## 文本

| Widget | 说明 |
|--------|------|
| `Text` | 单样式文本 |
| `RichText` | 多样式富文本 |
| `TextSpan` | 文本片段，用于 RichText 的子节点 |

```ts
Text('Hello World', { style: TextStyle({ bold: true, color: Color.green }) })

RichText({
  text: TextSpan({
    children: [
      TextSpan({ text: 'Bold', style: TextStyle({ bold: true }) }),
      TextSpan({ text: ' and normal' }),
    ],
  }),
})
```

## 布局

| Widget | 说明 |
|--------|------|
| `Column` | 垂直排列子节点 |
| `Row` | 水平排列子节点 |
| `Flex` | Column/Row 的通用基类 |
| `Expanded` | 填充 Flex 剩余空间 |
| `Flexible` | 按比例分配 Flex 空间 |
| `Spacer` | Flex 中的弹性间隔 |
| `Stack` | 层叠布局（绝对定位） |
| `Positioned` | Stack 中的绝对定位子节点 |

```ts
Column({
  children: [
    Text('Title'),
    Expanded({
      child: ListView({ children: items }),
    }),
    Text('Footer'),
  ],
})
```

## 容器与装饰

| Widget | 说明 |
|--------|------|
| `Container` | 通用容器（padding、decoration、alignment） |
| `Padding` | 内边距 |
| `SizedBox` | 固定尺寸盒子 |
| `Center` | 居中对齐 |
| `Align` | 自定义对齐 |
| `BoxDecoration` | 边框和背景装饰 |

```ts
Container({
  padding: EdgeInsets.all(1),
  decoration: BoxDecoration({
    border: Border.all({ color: Color.blue }),
  }),
  child: Text('Boxed'),
})
```

## 交互

| Widget | 说明 |
|--------|------|
| `MouseRegion` | 鼠标悬停/进出检测 |
| `GestureDetector` | 点击手势检测 |

## 滚动

| Widget | 说明 |
|--------|------|
| `ListView` | 可滚动列表 |
| `Scrollable` | 滚动基础组件 |
| `ScrollController` | 滚动状态控制 |

## 文本编辑

| Widget | 说明 |
|--------|------|
| `TextField` | 可编辑文本输入框 |
| `TextEditingController` | 编辑状态控制（光标、选区、历史） |

## 弹层

| Widget | 说明 |
|--------|------|
| `Overlay` | 覆盖层容器 |
| `OverlayEntry` | 覆盖层条目 |
| `CommandPalette` | 命令面板 |

## 其他

| Widget | 说明 |
|--------|------|
| `MediaQuery` | 终端尺寸查询 |
| `Theme` | 主题数据提供 |
| `ColorScheme` | 配色方案 |
