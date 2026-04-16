# 核心类型

Flitter 框架中有一些基础类型贯穿整个 API，理解它们是高效使用框架的前提。

## EdgeInsets

`EdgeInsets` 表示四个方向的间距，用于 padding、margin 等场景。

### 创建方式

```ts
// 四边相同
EdgeInsets.all(2)
// → left: 2, top: 2, right: 2, bottom: 2

// 对称间距
EdgeInsets.symmetric({ horizontal: 2, vertical: 1 })
// → left: 2, top: 1, right: 2, bottom: 1

// 单方向
EdgeInsets.horizontal(2)  // 左右各 2
EdgeInsets.vertical(1)    // 上下各 1

// 精确指定
EdgeInsets.only({ left: 1, top: 0, right: 2, bottom: 0 })

// 零间距
EdgeInsets.zero
```

### 属性

```ts
const e = EdgeInsets.symmetric({ horizontal: 2, vertical: 1 });
e.left       // 2
e.top        // 1
e.right      // 2
e.bottom     // 1
e.horizontal // 4 (left + right)
e.vertical   // 2 (top + bottom)
```

### 使用场景

```ts
// Container padding
new Container({
  padding: EdgeInsets.all(1),
  child: new Text({ data: '有内边距' }),
})

// Padding Widget
new Padding({
  padding: EdgeInsets.symmetric({ horizontal: 2 }),
  child: new Text({ data: '左右各缩进 2' }),
})

// Container margin
new Container({
  margin: EdgeInsets.only({ top: 1 }),
  padding: EdgeInsets.all(1),
  child: new Text({ data: '上方有外边距' }),
})
```

## BoxConstraints

`BoxConstraints` 是布局系统的核心——父级通过约束告诉子级可用空间。

### 创建方式

```ts
// 精确尺寸（min = max）
BoxConstraints.tight(40, 10)
// → minWidth: 40, maxWidth: 40, minHeight: 10, maxHeight: 10

// 最大尺寸（min = 0）
BoxConstraints.loose(40, 10)
// → minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 10

// 部分约束
BoxConstraints.tightFor({ width: 40 })
// → minWidth: 40, maxWidth: 40, minHeight: 0, maxHeight: Infinity

// 完全自定义
new BoxConstraints({
  minWidth: 10,
  maxWidth: 80,
  minHeight: 0,
  maxHeight: 24,
})
```

### 属性与方法

```ts
const c = BoxConstraints.tight(40, 10);

// 查询属性
c.hasBoundedWidth    // maxWidth < Infinity
c.hasBoundedHeight   // maxHeight < Infinity
c.hasTightWidth      // minWidth === maxWidth
c.hasTightHeight     // minHeight === maxHeight
c.isTight            // 宽高都是 tight
c.biggest            // { width: maxWidth, height: maxHeight }
c.smallest           // { width: minWidth, height: minHeight }

// 约束操作
c.constrain(50, 20)  // 将尺寸夹到约束范围内 → { width: 40, height: 10 }
c.loosen()           // minWidth/minHeight 归零
c.tighten({ width: 30 })  // 收紧指定维度
c.enforce(other)     // 在 other 范围内再应用 c
```

### 在布局中的角色

```
父级生成约束
    ↓
child.layout(constraints)
    ↓
子级在约束范围内确定自身尺寸
    ↓
父级读取 child.size，确定子级偏移
```

## Size

```ts
interface Size {
  readonly width: number;
  readonly height: number;
}
```

`RenderBox.size` 在 `performLayout()` 中通过 `setSize(w, h)` 设置。

## Key

`Key` 用于帮助框架在 Widget 树 diff 时识别节点身份。

```ts
// 普通 Key
new Key('item-1')

// GlobalKey — 可以从任何地方访问 Element 和 State
const key = new GlobalKey('my-widget');

// 在 Widget 中使用
new Text({ key: new Key('title'), data: 'Hello' })

// GlobalKey 访问能力
key.currentElement   // 对应的 Element（如已挂载）
key.currentState     // 对应的 State（仅 StatefulWidget）
```

### 何时使用 Key

- **列表项重排**：没有 Key，框架按位置匹配，可能复用错误的 State
- **跨父级移动 Widget**：Key 帮助框架识别「同一个 Widget 移动了」而非「旧的销毁，新的创建」
- **GlobalKey**：需要从外部访问某个 Widget 的 State 时使用

### canUpdate 规则

框架通过 `canUpdate(oldWidget, newWidget)` 判断是否可以复用：

```
同一构造函数 + 同一 Key → 复用（调用 update）
否则 → 销毁旧的，创建新的
```

## BuildContext

`BuildContext` 是 Widget `build()` 方法的参数，提供树的上下文信息：

```ts
interface BuildContext {
  readonly widget: Widget;
  findRenderObject(): RenderObject | undefined;
}
```

主要用于查找祖先 Widget：

```ts
// 获取最近的 MediaQuery 数据
const mediaData = MediaQuery.of(context);
const { width, height } = mediaData.size;

// 查找最近的 InheritedWidget
const inherited = context.dependOnInheritedWidgetOfExactType(MyInheritedWidget);
```

## TerminalCapabilities

`MediaQuery` 除了终端尺寸，还暴露终端能力检测结果：

```ts
const media = MediaQuery.of(context);

media.size.width          // 终端列数
media.size.height         // 终端行数
media.capabilities.emojiWidth       // Emoji 宽度是否准确
media.capabilities.syncOutput       // 是否支持同步输出（DEC PM 2026）
media.capabilities.kittyKeyboard    // 是否支持 Kitty 键盘协议
media.capabilities.xtversion        // 终端版本标识
```
