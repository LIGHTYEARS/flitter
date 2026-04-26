# 渲染管线

Flitter 采用 diff-based ANSI 渲染，最小化终端输出量。

## Screen Buffer

框架维护一个 `Screen` 对象，本质是一个二维的 Cell 数组：

```ts
interface Cell {
  char: string;       // 单个字符
  style: TextStyle;   // 样式（颜色、加粗等）
}
```

## 渲染流程

```
RenderObject.paint()
  ↓ 写入 Screen buffer（前台缓冲区）
AnsiRenderer.render()
  ↓ 对比前后两帧的 Screen buffer
  ↓ 只输出差异部分的 ANSI 转义序列
终端显示
```

### Diff 算法

逐 Cell 对比两帧的 Screen：
1. 如果 Cell 没有变化，跳过
2. 如果连续多个 Cell 变化且样式相同，合并为一次 ANSI 输出
3. 使用光标移动（`\x1b[H`）跳转到需要更新的位置

## ANSI 转义序列

框架使用标准 ANSI 转义序列控制终端：

| 功能 | 序列 |
|------|------|
| 移动光标 | `\x1b[{row};{col}H` |
| 设置前景色（256色） | `\x1b[38;5;{n}m` |
| 设置背景色（256色） | `\x1b[48;5;{n}m` |
| RGB 前景色 | `\x1b[38;2;{r};{g};{b}m` |
| 加粗 | `\x1b[1m` |
| 重置样式 | `\x1b[0m` |

## 性能优化

- **Diff 渲染**：只输出变化的区域，避免全屏重绘
- **样式合并**：相邻相同样式的 Cell 合并为一次输出
- **脏区域追踪**：paint 阶段只处理 `markNeedsPaint()` 标记的子树
