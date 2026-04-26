# 展示 Widget

本文档涵盖 Flitter TUI 中用于信息展示的 Widget：容器装饰、标签、开关、进度条、通知、折叠面板等。

---

## Container

> 通用装饰容器（padding、margin、decoration）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `child` | `Widget` | `undefined` | 子 Widget |
| `width` | `number` | `undefined` | 固定宽度 |
| `height` | `number` | `undefined` | 固定高度 |
| `padding` | `EdgeInsets` | `undefined` | 内边距 |
| `margin` | `EdgeInsets` | `undefined` | 外边距 |
| `decoration` | `BoxDecoration` | `undefined` | 容器装饰（背景色、边框） |
| `alignment` | `Alignment` | `undefined` | 子节点对齐 |

```typescript
new Container({
  width: 40, height: 5,
  padding: EdgeInsets.all(1),
  decoration: new BoxDecoration({
    color: Color.rgb(30, 30, 40),
    border: Border.all(new BorderSide(Color.blue(), 1, 'rounded')),
  }),
  child: new Text({ data: '内容' }),
})
```

### BoxDecoration

```typescript
new BoxDecoration({
  color?: Color,       // 背景色
  border?: Border,     // 边框
})
```

### BorderSide

```typescript
new BorderSide(color?: Color, width?: number, style?: "rounded" | "solid")
// 默认: color=Color.black(), width=1, style="rounded"
```

- `"rounded"`: 圆角 `╭╮╰╯─│`
- `"solid"` width=1: 直角 `┌┐└┘─│`
- `"solid"` width=2: 粗直角 `┏┓┗┛━┃`

### Border

```typescript
Border.all(side: BorderSide): Border
new Border({ top?, bottom?, left?, right?: BorderSide })
```

**相关 Widget**: Padding, SizedBox

---

## Badge

> 内联彩色标签。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `count` | `number` | `undefined` | 数字（渲染为 `[3]`） |
| `label` | `string` | `undefined` | 文本（渲染为 `[NEW]`） |
| `color` | `Color` | `Color.yellow()` | 前景色 |
| `backgroundColor` | `Color` | `undefined` | 背景色 |
| `bold` | `boolean` | `true` | 是否粗体 |

`count` 优先于 `label`。两者都未指定时渲染 `[●]`。

```typescript
new Badge({ count: 3 })                        // [3]
new Badge({ label: "NEW" })                    // [NEW]
new Badge({ count: 42, color: Color.red() })   // [42] 红色
```

**相关 Widget**: Text, RichText

---

## Toggle

> 可聚焦的开关组件。支持键盘（Space/Enter）和鼠标点击。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `value` | `boolean` | **必填** | 当前状态 |
| `onChanged` | `(value: boolean) => void` | **必填** | 状态变化回调 |
| `label` | `string` | `undefined` | 标签文本 |
| `style` | `ToggleStyle` | `"circle"` | `"circle"` (●/○) 或 `"checkbox"` ([x]/[ ]) |
| `autofocus` | `boolean` | `false` | 自动获焦 |
| `checkedColor` | `Color` | `Color.green()` | 选中时颜色 |

```typescript
new Toggle({
  value: isEnabled,
  onChanged: (v) => { isEnabled = v; },
  label: "Enable feature",
  style: "checkbox",
})
```

**相关 Widget**: Focus, GestureDetector

---

## ProgressBar

> Unicode 子字符块进度条（`▏▎▍▌▋▊▉█` 1/8 精度平滑渲染）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `value` | `number` | **必填** | 进度值 0.0-1.0 |
| `width` | `number` | `20` | 进度条宽度（字符数） |
| `label` | `string` | `undefined` | 前置标签 |
| `color` | `Color` | `Color.green()` | 填充色 |
| `backgroundColor` | `Color` | `Color.rgb(80,80,80)` | 背景色 |

```typescript
new ProgressBar({ value: 0.75, width: 30, label: "Loading" })
```

**相关 Widget**: AnimatedProgressBar

---

## AnimatedProgressBar

> 动画彗星尾迹进度指示器。StatefulWidget，使用 setInterval 驱动动画。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `color` | `Color` | `Color.cyan()` | 彗星头颜色 |
| `trail` | `number` | `5` | 尾迹段数 |
| `speed` | `number` | `1` | 动画速度（每 tick 移动格数） |
| `backgroundColor` | `Color` | `Color.default()` | 背景色 |

Alpha 衰减因子：`[1, 0.7, 0.5, 0.35, 0.25, 0.15]`。使用 `━` 字符绘制。

```typescript
new AnimatedProgressBar({ color: Color.cyan(), trail: 5, speed: 1 })
```

**相关 Widget**: ProgressBar, BrailleSpinner

---

## BrailleSpinner

> Braille 字符动画加载指示器。基于 8-cell 细胞自动机。

非 Widget 类，需要外部定时调用 `step()` 并读取 `toBraille()`。

```typescript
const spinner = new BrailleSpinner();
// 每 200ms 调用
spinner.step();
const char = spinner.toBraille();  // 返回一个 U+2800-U+28FF 范围的 braille 字符
```

规则：活细胞存活需 2-3 个活邻居；死细胞复活需 3 或 6 个活邻居。停滞时自动重新播种（至少 3 个活细胞）。

**相关 Widget**: AnimatedProgressBar, SpinnerOverlay

---

## NotificationBanner

> 内联通知横幅（非浮层 toast），带类型图标和颜色。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `type` | `NotificationType` | **必填** | `"info"` / `"warning"` / `"error"` / `"success"` |
| `message` | `string` | **必填** | 消息文本 |
| `onDismiss` | `() => void` | `undefined` | 关闭回调（渲染 [x] 按钮） |
| `action` | `{ label, onPressed }` | `undefined` | 可选操作按钮 |

类型图标：info=ℹ(蓝), warning=⚠(黄), error=✗(红), success=✓(绿)。

```typescript
new NotificationBanner({
  type: "warning",
  message: "Rate limit approaching",
  action: { label: "View", onPressed: () => showDetails() },
  onDismiss: () => removeBanner(),
})
```

**相关 Widget**: Container, GestureDetector

---

## Disclosure

> 可折叠展开的标题+内容 Widget。StatefulWidget，受控模式。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `Widget` | **必填** | 标题 Widget（始终显示） |
| `child` | `Widget` | **必填** | 折叠内容 |
| `expanded` | `boolean` | **必填** | 当前展开状态 |
| `onChanged` | `(expanded: boolean) => void` | `undefined` | 状态变化回调 |

渲染为可点击的标题行（▶/▼ + title），展开时在标题下方显示 child。

```typescript
new Disclosure({
  title: new Text({ data: "Section" }),
  child: new Text({ data: "Hidden content" }),
  expanded: isExpanded,
  onChanged: (v) => { isExpanded = v; },
})
```

**相关 Widget**: Column, GestureDetector

---

## DialogBox

> 带边框的两列对话框布局。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `children` | `Widget[]` | **必填** | 最多 3 个子节点：[左列, 右列上, 右列下] |
| `maxHeight` | `number` | `undefined` | 最大高度 |
| `borderColor` | `Color` | **必填** | 边框颜色 |
| `backgroundColor` | `Color` | **必填** | 背景色 |
| `borderStyle` | `"rounded" \| "square"` | `"rounded"` | 边框样式 |
| `hasBanner` | `boolean` | `false` | 是否为横幅模式（顶部使用 ├ 而非角落字符） |
| `userHeight` | `number` | `undefined` | 固定高度 |

多个子节点时在 `floor(width/2)` 处绘制列分隔线。

```typescript
new DialogBox({
  children: [leftPanel, rightTopPanel, rightBottomPanel],
  borderColor: Color.brightBlack(),
  backgroundColor: Color.default(),
  borderStyle: "rounded",
})
```

**相关 Widget**: Container, OverlapColumn

---

## Offstage

> 隐藏子节点但保持其状态。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `offstage` | `boolean` | `true` | 是否隐藏 |
| `child` | `Widget` | `undefined` | 子 Widget |

`offstage=true` 时：尺寸 0x0，不绘制，不命中测试，但子节点仍布局（保持状态）。`offstage=false` 时：透明传递。

```typescript
new Offstage({
  offstage: !isVisible,
  child: expensiveWidget,
})
```

**相关 Widget**: ClipBox, Opacity

---

## ForceDimWidget

> InheritedWidget，向子树传播 dim（暗淡）状态。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `forceDim` | `boolean` | **必填** | 是否强制 dim |
| `child` | `Widget` | **必填** | 子 Widget |

消费侧通过 `ForceDimWidget.shouldForceDim(context)` 查询。

```typescript
new ForceDimWidget({
  forceDim: !hasFocus,
  child: myPanel,
})

// 消费侧
const isDimmed = ForceDimWidget.shouldForceDim(context);
```

**相关 Widget**: Theme, InheritedWidget

---

## SizeChangedNotifier

> 包裹子节点，在布局尺寸变化时触发回调。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `Key` | `undefined` | 可选标识键 |
| `child` | `Widget` | `undefined` | 子 Widget |
| `onSizeChange` | `(size: { width, height }) => void` | **必填** | 尺寸变化回调 |

回调在 post-frame 中触发（避免布局期间的重入），同一帧内多次尺寸变化只触发一次。

```typescript
new SizeChangedNotifier({
  onSizeChange: (size) => {
    console.log(`New size: ${size.width}x${size.height}`);
  },
  child: dynamicContent,
})
```

**相关 Widget**: MediaQuery, IntrinsicHeight

---

> 📖 相关教程: [自定义 Widget](/tutorial/core-concepts/custom-widgets)
