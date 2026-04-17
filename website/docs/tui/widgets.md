# 内置 Widget

Flitter 提供 30+ 内置 Widget，覆盖文本、布局、容器、交互、滚动、焦点、快捷键等常见场景。

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

// RichText 支持对齐、溢出控制和行数限制
new RichText({
  text: new TextSpan({ text: '这是一段很长的文本...' }),
  textAlign: 'center',      // "left" | "center" | "right"
  overflow: 'ellipsis',     // "clip" | "ellipsis" | "visible"
  maxLines: 2,              // 超过 2 行时截断并显示 …
})
```

TextSpan 支持嵌套——子 span 继承父 span 的样式。`toPlainText()` 方法将整个 span 树拼接为纯文本。

### TextSpan 交互属性

TextSpan 支持 `url` 和 `onTap`，可实现可点击的超链接文本：

```ts
new RichText({
  text: new TextSpan({
    children: [
      new TextSpan({ text: '访问 ' }),
      new TextSpan({
        text: 'Flitter 文档',
        url: 'https://flitter.dev',          // OSC 8 终端超链接
        onTap: () => { openBrowser(url); },  // 点击回调
        style: new TextStyle({ foreground: Color.cyan(), underline: true }),
      }),
    ],
  }),
})

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
| `ClipBox` | 裁剪容器（子内容超出边界时裁剪） |

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

// ClipBox：裁剪超出边界的子内容
new ClipBox({
  child: new SizedBox({
    width: 20,
    height: 3,
    child: new Text({ data: '这段很长的文本会被裁剪到 20x3 的区域内' }),
  }),
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

### Scrollbar

滚动条 Widget，使用 Unicode 块元素（`▁▂▃▄▅▆▇█`）实现 1/8 字符精度的滑块渲染。支持鼠标交互：

- 点击轨道上方 → 上翻一页
- 点击轨道下方 → 下翻一页
- 拖拽滑块 → 按比例滚动

```ts
const controller = new ScrollController();

new Row({
  children: [
    new Expanded({
      child: new ListView({
        itemCount: 100,
        itemBuilder: (i) => new Text({ data: `Item ${i}` }),
        controller,
      }),
    }),
    new Scrollbar({
      controller,
      getScrollInfo: () => ({
        totalContentHeight: 100,
        viewportHeight: 24,
        scrollOffset: controller.offset,
      }),
      thickness: 1,                          // 宽度（默认 1）
      thumbColor: Color.rgb(150, 150, 150),  // 滑块颜色
      trackColor: Color.rgb(60, 60, 60),     // 轨道颜色
      showTrack: true,                       // 是否显示轨道背景
    }),
  ],
})
```

### ScrollBehavior

`ScrollBehavior` 提供开箱即用的 vim 风格键盘滚动绑定：

```ts
const controller = new ScrollController();
const behavior = new ScrollBehavior(controller, {
  scrollStep: 3,      // 方向键/vim 键每次滚动行数
  pageScrollStep: 10,  // PageUp/PageDown 滚动行数
});
```

| 按键 | 动作 |
|------|------|
| `↑` / `k` | 上滚 scrollStep 行 |
| `↓` / `j` | 下滚 scrollStep 行 |
| `PageUp` / `Ctrl+U` | 上翻一页 |
| `PageDown` / `Ctrl+D` | 下翻一页 |
| `Home` / `g` | 滚到顶部 |
| `End` / `G` / `Shift+G` | 滚到底部 |

## 文本编辑

| Widget | 说明 |
|--------|------|
| `TextField` | 可编辑文本输入框 |
| `Scrollbar` | 滚动条指示器（支持拖拽和点击导航） |

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
| `FuzzyPicker` | 通用模糊搜索选择器（CommandPalette 的底层实现） |
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

// FuzzyPicker：通用模糊搜索选择器
new FuzzyPicker({
  items: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'],
  getLabel: (item) => item,
  onAccept: (item, { hasUserInteracted }) => {
    console.log(`选择了: ${item}`);
  },
  onDismiss: () => { /* 按 Escape 关闭 */ },
  title: '选择水果',
  maxRenderItems: 10,
})
```

FuzzyPicker 内置键盘导航：`↑/↓`、`Tab/Shift+Tab`、`Ctrl+N/P` 移动选中项，`Enter` 确认，`Escape` 关闭。支持鼠标滚轮和双击确认。

### fuzzyMatch

`fuzzyMatch` 是 FuzzyPicker 使用的模糊匹配算法，也可独立使用：

```ts
import { fuzzyMatch } from '@flitter/tui';

const result = fuzzyMatch('fp', 'FuzzyPicker');
// { matches: true, score: 0.72 }

const miss = fuzzyMatch('xyz', 'FuzzyPicker');
// { matches: false, score: 0.05 }
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

## 焦点

| Widget | 说明 |
|--------|------|
| `Focus` | 焦点管理 Widget（自动创建和管理 FocusNode） |

```ts
// Focus Widget：声明式焦点管理
new Focus({
  autofocus: true,               // 自动获取焦点
  onFocusChange: (hasFocus) => {
    console.log(hasFocus ? '获得焦点' : '失去焦点');
  },
  onKey: (event) => {
    if (event.key === 'Enter') return 'handled';
    return 'ignored';
  },
  child: new Text({ data: '可聚焦内容' }),
})

// 使用外部 FocusNode
const node = new FocusNode({ debugLabel: 'my-input' });
new Focus({
  focusNode: node,               // 接管外部节点的生命周期
  child: myWidget,
})
```

`Focus` 是一个纯副作用 Widget——它不改变子节点的渲染，只负责在 Widget 树中注册焦点节点。详见 [焦点系统](./focus-system) 页面。

## 快捷键与 Actions

| Widget | 说明 |
|--------|------|
| `Shortcuts` | 按键 → Intent 映射 |
| `Actions` | Intent → Action 映射 |

```ts
import { Actions, Shortcuts, KeyActivator, Intent, Action } from '@flitter/tui';

// 定义 Intent 和 Action
class SaveIntent extends Intent {}
class SaveAction extends Action<SaveIntent> {
  invoke() { save(); return 'handled'; }
}

// 在 Widget 树中组装
new Actions({
  actions: new Map([[SaveIntent, new SaveAction()]]),
  child: new Shortcuts({
    shortcuts: new Map([[KeyActivator.ctrl('s'), new SaveIntent()]]),
    child: myEditor,
  }),
})
```

详见 [Actions 与 Shortcuts](./actions-shortcuts) 页面。
