# Widget API 参考

## Text

单样式文本组件。

```ts
Text(text: string, props?: {
  style?: TextStyle;
  maxLines?: number;
  overflow?: TextOverflow;
})
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `text` | `string` | 文本内容 |
| `style` | `TextStyle` | 文本样式 |
| `maxLines` | `number` | 最大行数 |
| `overflow` | `TextOverflow` | 溢出处理方式 |

---

## RichText

多样式富文本组件。

```ts
RichText(props: {
  text: TextSpan;
})
```

---

## TextStyle

文本样式对象。

```ts
TextStyle(props?: {
  color?: Color;
  backgroundColor?: Color;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dim?: boolean;
})
```

---

## Column / Row

Flex 布局容器。

```ts
Column(props: {
  children: Widget[];
  mainAxisAlignment?: MainAxisAlignment;
  crossAxisAlignment?: CrossAxisAlignment;
})

Row(props: {
  children: Widget[];
  mainAxisAlignment?: MainAxisAlignment;
  crossAxisAlignment?: CrossAxisAlignment;
})
```

### MainAxisAlignment

| 值 | 说明 |
|----|------|
| `start` | 起始对齐 |
| `end` | 末尾对齐 |
| `center` | 居中 |
| `spaceBetween` | 两端对齐，中间等距 |
| `spaceAround` | 每项两侧等距 |
| `spaceEvenly` | 所有间距相等 |

---

## Container

通用容器组件。

```ts
Container(props?: {
  child?: Widget;
  width?: number;
  height?: number;
  padding?: EdgeInsets;
  margin?: EdgeInsets;
  decoration?: BoxDecoration;
  alignment?: Alignment;
})
```

---

## Stack / Positioned

层叠布局。

```ts
Stack(props: {
  children: Widget[];
})

Positioned(props: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  child: Widget;
})
```

---

## ListView

可滚动列表。

```ts
ListView(props: {
  children: Widget[];
  controller?: ScrollController;
})
```

---

## TextField

可编辑文本输入。

```ts
TextField(props: {
  controller: TextEditingController;
  placeholder?: string;
  style?: TextStyle;
  maxLines?: number;
})
```

---

## MouseRegion

鼠标区域检测。

```ts
MouseRegion(props: {
  child: Widget;
  onEnter?: (event: MouseEvent) => void;
  onExit?: (event: MouseEvent) => void;
  onHover?: (event: MouseEvent) => void;
})
```

---

## GestureDetector

手势检测。

```ts
GestureDetector(props: {
  child: Widget;
  onTap?: () => void;
})
```

:::warning
以上 API 签名为概要描述。具体参数类型和默认值请参考源码中的 TypeScript 类型定义。
:::
