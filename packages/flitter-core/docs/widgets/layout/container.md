# Container

`来源: src/widgets/container.ts`

Container 是一个便捷的组合组件，将常用的绘制、定位和尺寸调整功能集成在一起。它内部通过组合 Padding、SizedBox 和 DecoratedBox 来实现。

## 构造函数

```typescript
new Container({
  child?: Widget,
  width?: number,
  height?: number,
  padding?: EdgeInsets,
  margin?: EdgeInsets,
  decoration?: BoxDecoration,
  constraints?: BoxConstraints,
  key?: Key,
})
```

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| child | `Widget` | -- | 子组件 |
| width | `number` | -- | 固定宽度 |
| height | `number` | -- | 固定高度 |
| padding | `EdgeInsets` | -- | 内边距（子组件与装饰之间） |
| margin | `EdgeInsets` | -- | 外边距（最外层） |
| decoration | `BoxDecoration` | -- | 装饰（背景色、边框） |
| constraints | `BoxConstraints` | -- | 额外的尺寸约束 |

## 组合层级

Container 的 build 方法按以下顺序组合子组件（由外到内）：

```
Padding (margin)           ← 最外层
  └─ SizedBox (constraints/width/height)
       └─ DecoratedBox (decoration)
            └─ Padding (padding)
                 └─ child              ← 最内层
```

::: info
如果没有设置任何属性且没有 child，Container 会返回一个 `SizedBox.shrink()`（零尺寸）。
:::

## 基本用法

### 固定尺寸容器

```typescript
import { Container } from 'flitter-core/widgets/container';

new Container({
  width: 40,
  height: 10,
  child: someWidget,
})
```

### 带边框的面板

```typescript
import { BoxDecoration, Border, BorderSide } from 'flitter-core/layout/render-decorated';
import { Color } from 'flitter-core/core/color';

new Container({
  decoration: new BoxDecoration({
    border: Border.all(new BorderSide({
      color: Color.cyan,
      style: 'rounded',
    })),
  }),
  child: contentWidget,
})
```

### 带背景色和内边距

```typescript
import { EdgeInsets } from 'flitter-core/layout/edge-insets';

new Container({
  decoration: new BoxDecoration({ color: Color.blue }),
  padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
  child: label('标题', new TextStyle({ bold: true })),
})
```

### 左侧竖线指示器

仅设置单边边框时，其余三边不会绘制。适合用于引用样式、用户消息标记等场景。

```typescript
new Container({
  decoration: new BoxDecoration({
    border: new Border({
      left: new BorderSide({ color: Color.green, width: 2, style: 'solid' }),
    }),
  }),
  padding: EdgeInsets.only({ left: 1 }),
  child: label('delegate subagent to explore the flitter-core',
    new TextStyle({ italic: true, foreground: Color.green })),
})
```

输出效果：
```
│ delegate subagent to explore the flitter-core
```

## 进阶用法

### 卡片式面板

```typescript
// 带标题栏和内容区的面板
new Container({
  decoration: new BoxDecoration({
    border: Border.all(new BorderSide({
      color: Color.green,
      style: 'rounded',
    })),
  }),
  child: new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children: [
      // 标题栏（带背景色）
      new Container({
        decoration: new BoxDecoration({ color: Color.green }),
        child: label(' System Info ', new TextStyle({ bold: true })),
      }),
      // 内容区
      new Padding({
        padding: EdgeInsets.all(1),
        child: new Column({
          mainAxisSize: 'min',
          children: [
            label('CPU: 45%'),
            label('Memory: 2.1 GB'),
          ],
        }),
      }),
    ],
  }),
})
```

### 按钮样式容器

```typescript
new Container({
  width: 5,
  height: 1,
  decoration: new BoxDecoration({ color: Color.blue }),
  child: new Center({
    child: label('OK', new TextStyle({ bold: true })),
  }),
})
```

::: tip
Container 是一个 `StatelessWidget`，每次构建时都会重新创建内部的组件树。对于性能敏感的场景，可以直接使用 Padding、SizedBox、DecoratedBox 等底层组件。
:::

## 相关组件

- [Padding](/widgets/layout/padding) - 内/外边距
- [SizedBox](/widgets/layout/sized-box) - 尺寸约束
- [DecoratedBox](/widgets/display/decorated-box) - 装饰绘制
- [Center](/widgets/layout/center) - 居中
