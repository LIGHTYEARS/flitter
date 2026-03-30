# PaintContext

`来源: src/scheduler/paint-context.ts`

渲染对象的画布 API。提供绘制原语（字符、文本、矩形、边框），支持通过 `withClip()` 创建裁剪子上下文。所有坐标为绝对屏幕位置。

## 构造函数

```typescript
new PaintContext(screen: ScreenBuffer)
```

创建时裁剪区域默认为整个屏幕。

## 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| screen | `ScreenBuffer` | 底层屏幕缓冲区（受保护） |
| clipX | `number` | 裁剪区域左边界 |
| clipY | `number` | 裁剪区域上边界 |
| clipW | `number` | 裁剪区域宽度 |
| clipH | `number` | 裁剪区域高度 |

## 绘制方法

### `drawChar(x, y, char, style?, width?): void`

在 (x, y) 绘制单个字符。自动计算字符宽度（CJK 宽字符处理）。超出裁剪区域时静默忽略。

### `drawText(x, y, text, style?): void`

从 (x, y) 开始绘制文本字符串。逐字符处理，正确处理 CJK 宽字符（宽度 2）和零宽字符。

```typescript
context.drawText(5, 3, 'Hello, World!', { fg: Color.green });
```

### `drawTextSpan(x, y, span, maxWidth?): number`

绘制 TextSpan 树。遍历 span 树，提取文本和合并后的样式，逐字符绘制。返回实际绘制的列数。

```typescript
const span = new TextSpan({
  children: [
    new TextSpan({ text: 'Status: ', style: dimStyle }),
    new TextSpan({ text: 'OK', style: greenBoldStyle }),
  ],
});
const width = context.drawTextSpan(0, 0, span, 40);
```

### `fillRect(x, y, w, h, char?, style?): void`

用指定字符和样式填充矩形区域。默认字符为空格。仅填充裁剪区域内的单元格。

```typescript
// 用蓝色背景填充区域
context.fillRect(0, 0, 80, 1, ' ', { bg: Color.blue });
```

### `drawBorder(x, y, w, h, borderStyle, color?): void`

绘制 Unicode 盒线边框（四边统一样式和颜色）。需要 `w >= 2` 且 `h >= 2`。

```typescript
type BorderStyle = 'rounded' | 'solid' | 'dashed' | 'double';
```

| 样式 | 角字符 | 水平 | 垂直 |
|------|--------|------|------|
| solid | `┌ ┐ └ ┘` | `─` | `│` |
| rounded | `╭ ╮ ╰ ╯` | `─` | `│` |
| dashed | `┌ ┐ └ ┘` | `┄` | `┆` |
| double | `╔ ╗ ╚ ╝` | `═` | `║` |

```typescript
context.drawBorder(0, 0, 40, 10, 'rounded', Color.cyan);
```

### `drawBorderSides(x, y, w, h, sides): void`

按边独立绘制边框。每边可有不同的颜色、样式和宽度。`width <= 0` 的边跳过。当所有四边存在且样式/颜色一致时，内部优化回退到 `drawBorder()`。

```typescript
interface BorderSideDesc {
  width: number;
  style: BorderStyle;
  color?: Color;
}

context.drawBorderSides(x, y, w, h, {
  top?: BorderSideDesc,
  right?: BorderSideDesc,
  bottom?: BorderSideDesc,
  left?: BorderSideDesc,
});
```

绘制规则：
- 单边模式：只绘制存在的边（如仅 left → 只输出 `│` 竖线列）
- 角字符：仅当相邻两边均存在时才绘制（如 top + left → `┌`）
- 每边的线条使用该边自身的 `style` 对应的字符集

```typescript
// 仅绘制左侧绿色竖线
context.drawBorderSides(0, 0, 40, 3, {
  left: { width: 2, style: 'solid', color: Color.green },
});
// 输出:
// │（第 0 行）
// │（第 1 行）
// │（第 2 行）

// 四边不同颜色
context.drawBorderSides(0, 0, 20, 5, {
  top:    { width: 1, style: 'solid', color: Color.red },
  bottom: { width: 1, style: 'solid', color: Color.blue },
  left:   { width: 1, style: 'solid', color: Color.green },
  right:  { width: 1, style: 'solid', color: Color.yellow },
});
```

## 裁剪

### `withClip(x, y, w, h): PaintContext`

创建裁剪子上下文。新裁剪区域与当前裁剪区域取交集。子上下文中的绘制调用超出裁剪区域时静默忽略。

```typescript
// 创建只能在 (5, 2) 到 (35, 12) 范围内绘制的子上下文
const clipped = context.withClip(5, 2, 30, 10);
clipped.drawText(0, 0, 'This will be clipped');
// 只有在裁剪区域内的字符会被绘制
```

::: warning
裁剪是单向收缩的。子上下文的裁剪区域不能大于父级的裁剪区域。
:::

## 示例

```typescript
import { PaintContext } from './scheduler/paint-context';
import { ScreenBuffer } from './terminal/screen-buffer';

const screen = new ScreenBuffer(80, 24);
const ctx = new PaintContext(screen);

// 绘制标题栏
ctx.fillRect(0, 0, 80, 1, ' ', { bg: Color.blue, fg: Color.white });
ctx.drawText(2, 0, ' My App ', { bg: Color.blue, fg: Color.white, bold: true });

// 绘制内容区域的边框
ctx.drawBorder(1, 2, 78, 20, 'rounded', Color.white);

// 在边框内绘制内容（使用裁剪）
const inner = ctx.withClip(2, 3, 76, 18);
inner.drawText(0, 0, '这里是内容区域');

// 绘制 TextSpan
const richText = new TextSpan({
  children: [
    new TextSpan({ text: '错误: ', style: new TextStyle({ foreground: Color.red }) }),
    new TextSpan({ text: '文件未找到' }),
  ],
});
inner.drawTextSpan(0, 2, richText);
```
