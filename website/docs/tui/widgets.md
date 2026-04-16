# 内置 Widget

Flitter 提供 25+ 内置 Widget，覆盖文本、布局、容器、交互、滚动等常见场景。

## 文本

| Widget | 说明 |
|--------|------|
| `Text` | 单样式文本 |
| `RichText` | 多样式富文本 |
| `TextSpan` | 文本片段，用于 RichText 的子节点 |

```ts
// 单样式
new Text({
  data: 'Hello World',
  style: new TextStyle({ bold: true, foreground: Color.green() }),
})

// 富文本：每个 TextSpan 可有不同样式
new RichText({
  text: new TextSpan({
    children: [
      new TextSpan({ text: 'Bold', style: new TextStyle({ bold: true }) }),
      new TextSpan({ text: ' and ' }),
      new TextSpan({ text: 'colored', style: new TextStyle({ foreground: Color.cyan() }) }),
    ],
  }),
})
```

TextSpan 支持嵌套——子 span 继承父 span 的样式。`toPlainText()` 方法将整个 span 树拼接为纯文本。

## 布局

| Widget | 说明 | 默认值 |
|--------|------|--------|
| `Column` | 垂直排列子节点 | mainAxisAlignment: `"start"` |
| `Row` | 水平排列子节点 | mainAxisAlignment: `"start"` |
| `Flex` | Column/Row 的通用基类 | direction: `"vertical"` |
| `Expanded` | 填充 Flex 剩余空间 | fit: `"tight"` |
| `Flexible` | 按比例分配 Flex 空间 | flex: 1, fit: `"loose"` |
| `Spacer` | Flex 中的弹性间隔 | flex: 1 |

```ts
new Column({
  mainAxisAlignment: 'spaceBetween',  // 两端对齐
  crossAxisAlignment: 'center',       // 交叉轴居中
  mainAxisSize: 'max',                // 占满主轴
  children: [
    new Text({ data: '顶部' }),
    new Expanded({
      child: new Text({ data: '填充中间' }),
    }),
    new Text({ data: '底部' }),
  ],
})
```

### mainAxisAlignment 值

| 值 | 说明 |
|----|------|
| `"start"` | 起始对齐（默认） |
| `"end"` | 末尾对齐 |
| `"center"` | 居中 |
| `"spaceBetween"` | 两端对齐，中间等距 |
| `"spaceAround"` | 每项两侧等距 |
| `"spaceEvenly"` | 所有间距相等 |

### crossAxisAlignment 值

| 值 | 说明 |
|----|------|
| `"start"` | 交叉轴起始（默认） |
| `"end"` | 交叉轴末尾 |
| `"center"` | 居中 |
| `"stretch"` | 拉伸填满 |

### Expanded vs Flexible

```ts
new Row({
  children: [
    // Expanded: fit="tight"，强制填满分配的空间
    new Expanded({ child: new Text({ data: '填满' }) }),

    // Flexible: fit="loose"，可以小于分配的空间
    new Flexible({ flex: 2, child: new Text({ data: '最多 2 份' }) }),

    // Spacer: 等同于 Expanded({ child: SizedBox() })
    new Spacer(),
  ],
})
```

## 容器与装饰

| Widget | 说明 |
|--------|------|
| `Container` | 通用容器（padding、margin、decoration） |
| `Padding` | 纯内边距 |
| `SizedBox` | 固定尺寸盒子 |
| `Center` | 居中对齐 |
| `Align` | 自定义对齐（widthFactor、heightFactor） |

```ts
// Container：最常用的容器
new Container({
  width: 40,
  height: 5,
  padding: EdgeInsets.all(1),
  margin: EdgeInsets.only({ top: 1 }),
  decoration: new BoxDecoration({
    color: Color.rgb(30, 30, 40),
    border: Border.all(new BorderSide(Color.blue(), 1, 'rounded')),
  }),
  child: new Text({ data: '内容' }),
})

// SizedBox：固定尺寸或空白间隔
new SizedBox({ width: 10, height: 1 })          // 固定尺寸
new SizedBox({ width: 2 })                       // 水平间隔
new SizedBox({ height: 1 })                      // 垂直间隔

// Center：居中子节点
new Center({
  child: new Text({ data: '居中文本' }),
})
```

### BoxDecoration

```ts
new BoxDecoration({
  color: Color.rgb(30, 30, 40),   // 背景色
  border: Border.all(             // 边框
    new BorderSide(Color.blue(), 1, 'rounded'),
  ),
})
```

### BorderSide 样式

| 参数 | 说明 |
|------|------|
| `color` | 边框颜色（默认 `Color.black()`） |
| `width` | 边框宽度（默认 1） |
| `style` | `"rounded"`（圆角 `╭╮╰╯`）或 `"solid"`（直角 `┌┐└┘`） |

```ts
// 圆角边框
Border.all(new BorderSide(Color.cyan(), 1, 'rounded'))

// 粗直角边框
Border.all(new BorderSide(Color.red(), 2, 'solid'))
// → 使用 ┏┓┗┛━┃

// 不同方向不同样式
new Border({
  top: new BorderSide(Color.red()),
  bottom: new BorderSide(Color.blue()),
  left: new BorderSide(Color.green()),
  right: new BorderSide(Color.yellow()),
})
```

## Stack 层叠

| Widget | 说明 |
|--------|------|
| `Stack` | 层叠容器（子节点可重叠） |
| `Positioned` | Stack 中的绝对定位子节点 |

```ts
new Stack({
  alignment: 'topLeft',  // 非定位子节点的默认对齐
  children: [
    // 非定位子节点：按 alignment 放置
    new Container({ width: 40, height: 10 }),

    // 定位子节点：绝对定位
    new Positioned({
      top: 1,
      right: 1,
      child: new Text({ data: '右上角' }),
    }),
    new Positioned({
      bottom: 0,
      left: 0,
      child: new Text({ data: '左下角' }),
    }),
  ],
})
```

### StackAlignment 值

`"topLeft"` | `"topCenter"` | `"topRight"` | `"centerLeft"` | `"center"` | `"centerRight"` | `"bottomLeft"` | `"bottomCenter"` | `"bottomRight"`

## 交互

| Widget | 说明 |
|--------|------|
| `MouseRegion` | 鼠标区域（hover、click、drag 等全部事件） |
| `GestureDetector` | 高级手势（onTap，内部使用 MouseRegion） |

```ts
// MouseRegion：底层鼠标事件
new MouseRegion({
  onClick: (e) => { console.log(`点击 (${e.x}, ${e.y})`); },
  onEnter: (e) => { /* 鼠标进入 */ },
  onExit: (e) => { /* 鼠标离开 */ },
  onHover: (e) => { /* 鼠标移动 */ },
  onScroll: (e) => { /* 滚轮 */ },
  onDrag: (e) => { /* 拖拽 */ },
  onRelease: (e) => { /* 释放 */ },
  opaque: true,    // 是否阻止事件穿透（默认 true）
  child: new Text({ data: 'Hover me' }),
})

// GestureDetector：简化的点击检测
new GestureDetector({
  onTap: () => { console.log('Tapped!'); },
  child: new Text({ data: 'Click me' }),
})
```

## 滚动

| Widget | 说明 |
|--------|------|
| `ListView` | 虚拟化可滚动列表 |
| `Scrollable` | 滚动基础 Widget |
| `Viewport` | 裁剪视口 |
| `ViewportWithPosition` | 带定位的视口（支持 `"bottom"` 锚定） |

```ts
const controller = new ScrollController();

// ListView：虚拟化列表（只渲染可见项）
new ListView({
  itemCount: 1000,
  itemBuilder: (index) => new Text({ data: `Item ${index}` }),
  itemExtent: 1,       // 每项固定高度（可选，提升性能）
  controller,
  cacheExtent: 5,      // 视口外缓存项数
})
```

### ScrollController

```ts
const sc = new ScrollController();

sc.jumpTo(100);            // 跳转到偏移量
sc.scrollUp(3);            // 上滚 3 行
sc.scrollDown(3);          // 下滚 3 行
sc.scrollToTop();          // 滚到顶部
sc.scrollToBottom();       // 滚到底部
sc.scrollPageUp(24);       // 上翻一页（传入视口高度）
sc.scrollPageDown(24);     // 下翻一页
sc.animateTo(50, 200);    // 动画滚动到偏移 50，时长 200ms

// 状态查询
sc.offset             // 当前偏移
sc.maxScrollExtent    // 最大滚动范围
sc.atTop              // 是否在顶部
sc.atBottom           // 是否在底部

// Follow 模式（新内容自动滚到底部）
sc.enableFollowMode();
sc.disableFollowMode();
sc.toggleFollowMode();

// 监听变化
sc.addListener(() => {
  console.log('offset changed:', sc.offset);
});

sc.dispose();
```

## 文本编辑

| Widget | 说明 |
|--------|------|
| `TextField` | 可编辑文本输入框 |

```ts
const ctrl = new TextEditingController({ text: '', width: 40 });

new TextField({
  controller: ctrl,
  placeholder: '请输入...',
  readOnly: false,
})
```

### TextEditingController

```ts
const ctrl = new TextEditingController({ text: 'Hello', width: 60 });

// 属性
ctrl.text              // 当前文本
ctrl.cursorPosition    // 光标位置（grapheme 索引）
ctrl.cursorLine        // 光标所在行
ctrl.cursorColumn      // 光标所在列
ctrl.lineCount         // 总行数
ctrl.hasSelection      // 是否有选区

// 编辑操作
ctrl.insertText('World');           // 在光标处插入
ctrl.deleteText(1);                 // 向后删除 1 个字符
ctrl.deleteForward(1);              // 向前删除 1 个字符
ctrl.deleteWordLeft();              // 删除左侧一个单词
ctrl.deleteWordRight();             // 删除右侧一个单词
ctrl.deleteToLineEnd();             // 删除到行尾（Ctrl+K）
ctrl.deleteCurrentLine();           // 删除当前行
ctrl.yankText();                    // 粘贴 kill buffer（Ctrl+Y）

// 光标移动
ctrl.moveCursorLeft();              // 左移
ctrl.moveCursorRight();             // 右移
ctrl.moveCursorUp();                // 上移
ctrl.moveCursorDown();              // 下移
ctrl.moveCursorToLineStart();       // 行首（Home/Ctrl+A）
ctrl.moveCursorToLineEnd();         // 行尾（End/Ctrl+E）
ctrl.moveCursorToStart();           // 文档首
ctrl.moveCursorToEnd();             // 文档尾
ctrl.moveCursorWordBoundary('left');  // 按单词左移
ctrl.moveCursorWordBoundary('right'); // 按单词右移

// 选区
ctrl.moveCursorRight({ extend: true });  // 扩展选区
ctrl.setSelectionRange(0, 5);            // 设置选区
ctrl.selectWordAt(3);                    // 选中光标处单词
ctrl.selectLineAt(0);                    // 选中一行
ctrl.clearSelection();                   // 清除选区
ctrl.deleteSelectedText();               // 删除选中文本

// 监听
ctrl.addListener(() => { /* 文本或光标变化 */ });
ctrl.dispose();
```

## 弹层

| Widget | 说明 |
|--------|------|
| `Overlay` | 覆盖层容器 |
| `OverlayEntry` | 覆盖层条目 |
| `CommandPalette` | 命令面板（模糊搜索 + 快捷键显示） |
| `AutocompleteController` | 自动补全控制器 |
| `LayerLink` | 锚点定位（连接 overlay 与触发元素） |

```ts
// OverlayEntry
const entry = new OverlayEntry({
  builder: () => new Container({
    width: 30, height: 5,
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide(Color.yellow(), 1, 'rounded')),
    }),
    child: new Text({ data: '弹层内容' }),
  }),
  maintainState: true,  // 隐藏时保持状态
});

// CommandPalette
new CommandPalette({
  commands: [
    { id: 'save', label: '保存', shortcut: 'Ctrl+S', action: () => save() },
    { id: 'quit', label: '退出', description: '关闭应用', shortcut: 'Ctrl+Q', action: () => quit() },
  ],
  onDismiss: () => { /* 关闭面板 */ },
})
```

## 信息查询

| Widget | 说明 |
|--------|------|
| `MediaQuery` | 终端尺寸和能力查询 |

```ts
// 在 build() 中获取终端信息
const media = MediaQuery.of(context);
media.size.width          // 终端列数
media.size.height         // 终端行数
media.capabilities        // 终端能力检测结果
```

## 主题

| 类型 | 说明 |
|------|------|
| `AppColorScheme` | 15 色配色方案（foreground、primary、accent 等） |
| `ThemeData` | 主题数据 |

```ts
// 默认暗色配色
const colors = AppColorScheme.default();

// 自定义配色
const custom = AppColorScheme.default().copyWith({
  primary: Color.rgb(99, 102, 241),
  accent: Color.rgb(139, 92, 246),
});

// 从 RGB 配置创建
const fromConfig = AppColorScheme.fromRgb({
  primary: { r: 99, g: 102, b: 241 },
  accent: { r: 139, g: 92, b: 246 },
});
```
