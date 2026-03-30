# Amp TUI 深度分析 #11: InheritedWidget 依赖追踪 + Theme 传播

> 基于 Amp CLI 混淆二进制逆向 + flitter-core / flitter-amp 源码的指令级深度对比分析。

---

## 1. Amp 实现细节

### 1.1 InheritedWidget 框架层

#### 1.1.1 类层次

```
Amp 混淆名      →  Flutter 对应       →  Flitter 对应
───────────────────────────────────────────────────
Sf              →  Widget             →  Widget
Bt              →  InheritedWidget    →  InheritedWidget
T$              →  Element            →  Element
Z_0             →  InheritedElement   →  InheritedElement
jd              →  BuildContext       →  BuildContextImpl
```

#### 1.1.2 dependOnInheritedWidgetOfExactType 查找算法

Amp 的 `T$.dependOnInheritedWidgetOfExactType(widgetType)` 实现为 **线性父链遍历**：

```javascript
// Amp 混淆 (T$ class):
dependOnInheritedWidgetOfExactType(widgetType) {
  let ancestor = this.parent;
  while (ancestor) {
    if (ancestor.widget.constructor === widgetType) {
      if (ancestor instanceof Z_0) {        // InheritedElement
        ancestor.addDependent(this);         // 注册依赖
        this._inheritedDependencies.add(ancestor);
      }
      return ancestor;
    }
    ancestor = ancestor.parent;
  }
  return null;
}
```

**关键观察**：Amp **不使用** Flutter 的 `_inheritedWidgets` HashMap 优化。Flutter 标准实现中，每个 Element 维护一个 `Map<Type, InheritedElement>` 缓存，在 mount 时从父节点继承并添加自身的 InheritedElement。Amp 简化为每次查找都线性向上遍历 parent 链，复杂度 O(depth)。

这是因为 TUI 场景下 Widget 树深度有限（通常 < 50 层），线性遍历的开销可以忽略不计。

#### 1.1.3 _dependents Set 管理

Amp 的 `Z_0` (InheritedElement) 使用 `Set<Element>` 管理依赖者：

```javascript
// Z_0 (InheritedElement):
class Z_0 extends T$ {
  _child;
  _dependents = new Set();       // 所有依赖此 InheritedWidget 的 Element

  addDependent(element) {
    this._dependents.add(element);
  }

  removeDependent(element) {
    this._dependents.delete(element);
  }

  notifyDependents() {
    for (const dep of this._dependents) {
      dep.markNeedsRebuild();    // 标记所有依赖者为脏
    }
  }
}
```

依赖清理发生在两处：
1. **Element.unmount()** — 遍历 `_inheritedDependencies` 调用 `removeDependent(this)`
2. **InheritedElement.unmount()** — 调用 `_dependents.clear()`

#### 1.1.4 updateShouldNotify 语义

```javascript
// Z_0.update(newWidget):
update(newWidget) {
  const oldWidget = this.inheritedWidget;  // 保存旧 widget 引用
  super.update(newWidget);                 // 替换 widget
  const newInherited = this.inheritedWidget;

  // 先检查是否需要通知（对比新旧数据）
  if (newInherited.updateShouldNotify(oldWidget)) {
    this.notifyDependents();               // 通知所有依赖者
  }

  // 再更新子树
  // ...child update/replace logic...
}
```

关键语义：**先通知再更新子树**。`updateShouldNotify` 接收旧 widget，返回 true 表示数据已变化、需要通知依赖者。通知机制为 `markNeedsRebuild()` → 将依赖者加入 BuildOwner 的脏队列。

#### 1.1.5 依赖失效通知传播链

完整传播链：

```
StatefulWidget.setState()  或  父 Widget 更新
  → 包含 InheritedWidget 的 StatefulWidget rebuild
    → 创建新的 InheritedWidget (新 data)
      → InheritedElement.update(newWidget)
        → updateShouldNotify(oldWidget) == true?
          → notifyDependents()
            → 遍历 _dependents Set
              → dep.markNeedsRebuild()
                → getBuildScheduler().scheduleBuildFor(dep)
                  → 加入 BuildOwner._dirtyElements
                    → 下一帧 buildScopes() 重建所有脏 Element
```

Amp **没有** `didChangeDependencies()` 生命周期回调。在标准 Flutter 中，State 有 `didChangeDependencies()` 方法在依赖的 InheritedWidget 变化时被调用。Amp 简化为直接 markNeedsRebuild → rebuild → build()，省略了这个中间回调。

### 1.2 Amp 的主题系统架构

#### 1.2.1 双层主题容器

Amp 使用 **两个独立的 InheritedWidget 风格的访问器** 来提供主题：

```
_$ (AppTheme accessor)  →  提供 Qt（完整 Theme 容器）
  Qt.colors → wd (ColorScheme, 15 基础色)
  Qt.app → x1 (AppTheme, 50+ 语义色)

YL (BaseTheme accessor)  →  提供 YB（BaseTheme 包装）
  YB.colorScheme → wd (ColorScheme)
```

消费者代码示例：

```javascript
// 大多数 Widget 使用 _$.of(context) — 获取完整主题
let L = _$.of(H);           // L: Qt { base: YB, app: x1 }
let colors = L.colors;       // wd (ColorScheme) 快捷访问
let app = L.app;             // x1 (AppTheme) 语义色

// 少数基础 Widget 使用 YL.of(context) — 只需基础色
let A = YL.of(H);            // A: YB { colorScheme: wd }
let cs = A.colorScheme;      // wd (ColorScheme)
```

实际混淆代码中的使用分布：

| 访问器 | 使用位置 | 用途 |
|--------|---------|------|
| `_$.of(H)` | Sa (UserMessage), RQ (SelectedUserMessage), xD (ToolCallHeader), wQ (ToolHeader), iJH (StatusBar) | 需要 app 语义色（toolSuccess, toolError, keybind 等） |
| `YL.of(H)` | zk (ThinkingBlock), lT (ExpandCollapse), F0H (PromptBar) | 只需基础色（foreground, warning, accent, border 等） |
| `_$.maybeOf(H)` | XkL (AssistantMessage) | 优雅降级：`_$.maybeOf(H)?.colors ?? YL.of(H).colorScheme` |

#### 1.2.2 ColorScheme (wd) — 15 基础色

```javascript
class wd {
  foreground;         // 默认前景
  mutedForeground;    // 次要前景
  background;         // 背景
  cursor;             // 光标
  primary;            // 主色调
  secondary;          // 次色调
  accent;             // 强调色
  border;             // 边框
  success;            // 成功
  warning;            // 警告
  info;               // 信息
  destructive;        // 错误/危险
  selection;          // 选中
  copyHighlight;      // 复制高亮
  tableBorder;        // 表格边框
}
```

ANSI 回退默认值使用 `gH.default()`, `gH.none()`, `gH.blue` 等命名 ANSI 色。
RGB 主题（如 DSH dark）使用 `gH.rgb(r,g,b)` 精确指定。

#### 1.2.3 AppTheme (x1) — 50+ 语义色

x1 class 包含远超 flitter 的语义色域：

| 类别 | 字段数 | 字段 |
|------|--------|------|
| 工具状态 | 5 | toolRunning, toolSuccess, toolError, toolCancelled, toolName |
| 消息角色 | 3 | userMessage, assistantMessage, systemMessage |
| 代码渲染 | 3+8 | codeBlock, inlineCode, syntaxHighlight.{keyword,string,number,comment,function,variable,type,operator} |
| 文件/命令 | 4 | fileReference, filename, command, keybind |
| 交互状态 | 5 | processing, waiting, completed, cancelled, recommendation |
| UI 元素 | 7 | button, link, suggestion, shellMode, shellModeHidden, handoffMode, handoffModeDim |
| 特殊模式 | 3 | queueMode, smartModeColor, rushModeColor |
| Diff 显示 | 3 | diffAdded, diffRemoved, diffChanged, diffContext |
| IDE 集成 | 3 | ideConnected, ideDisconnected, ideWarning |
| 滚动/选择 | 5 | scrollbarThumb, scrollbarTrack, tableBorder, selectionBackground, selectionForeground |
| 选中消息 | 1 | selectedMessage |
| 线程图 | 3 | threadGraphNode, threadGraphNodeSelected, threadGraphConnector |

**总计：约 53 个色字段**（对比 flitter-amp 的 AmpAppColors 仅 22 个）。

#### 1.2.4 Theme 容器 (Qt) — 组合模式

```javascript
class Qt {
  base;  // YB (BaseTheme, 内含 colorScheme: wd)
  app;   // x1 (AppTheme, 50+ 语义色)

  get colors() { return this.base.colorScheme; }  // 快捷访问

  static default() {
    return new Qt({ base: YB.default(), app: x1.default() });
  }

  static fromBaseTheme(baseTheme, mode = "dark") {
    return new Qt({ base: baseTheme, app: x1.default(mode) });
  }
}
```

#### 1.2.5 RGB 主题映射

Amp 支持从终端颜色配置生成 RGB 主题：

```javascript
// AZH = Terminal theme provider definition
AZH = {
  name: "terminal",
  label: "Terminal",
  source: { type: "builtin" },
  buildBaseTheme: (config) =>
    config.rgbColors ? YB.withRgb(config.rgbColors) : YB.default(),
  buildAppTheme: (config, baseTheme) =>
    Qt.fromBaseTheme(baseTheme, config.background),
};
```

`wd.fromRgb(H)` 将终端 ANSI 256 色索引映射到 RGB ColorScheme 字段：

| ColorScheme 字段 | 映射源 |
|-----------------|--------|
| foreground | `H.fg` |
| mutedForeground | `H.indices[7]` |
| primary | `H.indices[4]` (blue) |
| secondary | `H.indices[6]` (cyan) |
| accent | `H.indices[5]` (magenta) |
| success | `H.indices[2]` (green) |
| warning | `H.indices[3]` (yellow) |
| destructive | `H.indices[1]` (red) |

#### 1.2.6 主题热切换

Amp 的主题热切换流程：

```
用户选择新主题 (settings/command palette)
  → 配置更新 → RxJS Observable 发射新值
    → App StatefulWidget 的 setState()
      → rebuild: 创建新的 AmpThemeProvider(theme: newTheme, child: ...)
        → InheritedElement.update(newAmpThemeProvider)
          → updateShouldNotify(old) → ampThemeEquals(new, old) → true
            → notifyDependents()
              → 所有调用过 _$.of(context) 或 YL.of(context) 的 Widget
                → markNeedsRebuild()
                  → 下一帧全部 rebuild，读取新主题色
```

关键：Amp 使用深度颜色比较（字段级 `equals`）来决定是否通知，避免无意义的重建。

### 1.3 Amp 的 didChangeDependencies 缺失

Amp 的 State（`R$`/`_8`）**完全没有** `didChangeDependencies()` 回调。传播链简化为：

```
InheritedElement 数据变化
  → notifyDependents()
    → dep.markNeedsRebuild()
      → 下一帧 rebuild()
        → state.build(context) ← 此时 of(context) 读取到新值
```

这意味着消费者无法区分"因依赖变化而重建"和"因父 Widget 重建而重建"——都走同一条 `build()` 路径。

---

## 2. Flitter 实现细节

### 2.1 InheritedWidget 框架层

#### 2.1.1 InheritedWidget 类定义

[InheritedWidget](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/framework/widget.ts#L284-L303):

```typescript
export abstract class InheritedWidget extends Widget {
  readonly child: Widget;

  constructor(opts: { key?: Key; child: Widget }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.child = opts.child;
  }

  createElement(): any {
    const { InheritedElement } = require('./element');
    return new InheritedElement(this);
  }

  abstract updateShouldNotify(oldWidget: InheritedWidget): boolean;
}
```

与 Amp 的 `Bt` 完全一致：单子节点、抽象 `updateShouldNotify`、createElement 返回 InheritedElement。

#### 2.1.2 dependOnInheritedWidgetOfExactType 查找算法

[Element.dependOnInheritedWidgetOfExactType](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/framework/element.ts#L164-L177):

```typescript
dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
  let ancestor = this.parent;
  while (ancestor) {
    if (ancestor.widget.constructor === widgetType) {
      if (ancestor instanceof InheritedElement) {
        ancestor.addDependent(this);
        this._inheritedDependencies.add(ancestor);
      }
      return ancestor as InheritedElement;
    }
    ancestor = ancestor.parent;
  }
  return null;
}
```

**与 Amp 完全一致**：线性父链遍历，使用 `widget.constructor === widgetType` 做精确类型匹配，双向注册依赖（InheritedElement._dependents ← 和 → Element._inheritedDependencies）。

同样**不使用** Flutter 的 `_inheritedWidgets` HashMap 缓存。

#### 2.1.3 InheritedElement._dependents Set

[InheritedElement](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/framework/element.ts#L411-L498):

```typescript
export class InheritedElement extends Element {
  _child: Element | undefined = undefined;
  _dependents: Set<Element> = new Set();

  addDependent(element: Element): void {
    this._dependents.add(element);
  }

  removeDependent(element: Element): void {
    this._dependents.delete(element);
  }

  notifyDependents(): void {
    for (const dep of this._dependents) {
      dep.markNeedsRebuild();
    }
  }
}
```

与 Amp Z_0 完全一致。

#### 2.1.4 InheritedElement.update — 通知+子树更新

[InheritedElement.update](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/framework/element.ts#L450-L474):

```typescript
override update(newWidget: Widget): void {
  const oldWidget = this.inheritedWidget;
  super.update(newWidget);
  const newInherited = this.inheritedWidget;

  if (newInherited.updateShouldNotify(oldWidget)) {
    this.notifyDependents();
  }

  if (this._child && this._child.widget.canUpdate(newInherited.child)) {
    this._child.update(newInherited.child);
  } else {
    if (this._child) {
      this._child.unmount();
      this.removeChild(this._child);
    }
    this._child = newInherited.child.createElement();
    this.addChild(this._child);
    this._mountChild(this._child);
  }
}
```

语义完全匹配 Amp：先保存旧 widget → swap → 检查 updateShouldNotify → 通知 → 更新子树。

#### 2.1.5 Element.unmount — 清理依赖

[Element.unmount](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/framework/element.ts#L130-L139):

```typescript
unmount(): void {
  this._mounted = false;
  this._dirty = false;
  this._cachedDepth = undefined;
  for (const dep of this._inheritedDependencies) {
    dep.removeDependent(this);
  }
  this._inheritedDependencies.clear();
}
```

双向清理：从所有依赖的 InheritedElement 中注销自己，然后清空自己的依赖集合。

### 2.2 Theme InheritedWidget

#### 2.2.1 ThemeData — 15 颜色字段

[ThemeData](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/theme.ts#L15-L31):

```typescript
export interface ThemeData {
  readonly primary: Color;
  readonly background: Color;
  readonly surface: Color;
  readonly text: Color;
  readonly textSecondary: Color;
  readonly success: Color;
  readonly error: Color;
  readonly warning: Color;
  readonly info: Color;
  readonly border: Color;
  readonly scrollbarThumb: Color;
  readonly scrollbarTrack: Color;
  readonly diffAdded: Color;
  readonly diffRemoved: Color;
  readonly selectionBackground: Color;
}
```

对比 Amp 的 `wd` (ColorScheme) 15 字段：

| Flitter ThemeData | Amp wd | 匹配度 |
|-------------------|--------|--------|
| primary | primary | ✅ 精确 |
| background | background | ✅ 精确 |
| surface | — | ❌ Amp 无对应 |
| text | foreground | ⚠️ 名称不同 |
| textSecondary | mutedForeground | ⚠️ 名称不同 |
| success | success | ✅ 精确 |
| error | destructive | ⚠️ 名称不同 |
| warning | warning | ✅ 精确 |
| info | info | ✅ 精确 |
| border | border | ✅ 精确 |
| scrollbarThumb | — | ❌ Amp 在 x1 中 |
| scrollbarTrack | — | ❌ Amp 在 x1 中 |
| diffAdded | — | ❌ Amp 在 x1 中 |
| diffRemoved | — | ❌ Amp 在 x1 中 |
| selectionBackground | selection | ⚠️ 名称不同 |
| — | secondary | ❌ Flitter 缺失 |
| — | accent | ❌ Flitter 缺失 |
| — | cursor | ❌ Flitter 缺失 |
| — | copyHighlight | ❌ Flitter 缺失 |
| — | tableBorder | ❌ Flitter 缺失 |

#### 2.2.2 Theme.of / Theme.maybeOf

[Theme.of](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/theme.ts#L62-L71):

```typescript
static of(context: BuildContext): ThemeData {
  const result = Theme.maybeOf(context);
  if (result === undefined) {
    throw new Error('Theme.of() called with a context that does not contain a Theme ancestor.');
  }
  return result;
}

static maybeOf(context: BuildContext): ThemeData | undefined {
  const ctx = context as any;
  if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
    const element = ctx.dependOnInheritedWidgetOfExactType(Theme);
    if (element) {
      const widget = element.widget as Theme;
      return widget.data;
    }
  }
  return undefined;
}
```

与 Amp 的 `_$.of(H)` 和 `_$.maybeOf(H)` 模式完全一致。区别在于 Amp 返回整个 Qt (Theme container)，Flitter 只返回 ThemeData。

#### 2.2.3 updateShouldNotify 深度比较

[themeDataEquals](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/theme.ts#L122-L139):

```typescript
function themeDataEquals(a: ThemeData, b: ThemeData): boolean {
  return (
    a.primary.equals(b.primary) &&
    a.background.equals(b.background) &&
    // ... 所有 15 个字段逐一 Color.equals 比较
    a.selectionBackground.equals(b.selectionBackground)
  );
}
```

与 Amp 一致：逐字段深度比较，避免引用比较导致的误通知。

#### 2.2.4 多层 Theme 嵌套

测试文件 [theme.test.ts:L202-L221](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/__tests__/theme.test.ts#L202-L221) 验证内层覆盖外层：

```typescript
const inner = new Theme({ data: innerData, child: leaf });
const outer = new Theme({ data: outerData, child: inner });
// ...
const result = Theme.of(context);
expect(result.primary.equals(Color.rgb(255, 0, 0))).toBe(true);  // 内层值
```

这是 `dependOnInheritedWidgetOfExactType` 线性向上遍历的自然结果 — 先遇到内层 Theme 就停止搜索。

### 2.3 AppTheme InheritedWidget

#### 2.3.1 AppThemeData — 13 语法色 + 5 应用色

[AppThemeData](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/app-theme.ts#L18-L48):

```typescript
export interface SyntaxHighlightConfig {
  readonly keyword: Color;
  readonly string: Color;
  readonly comment: Color;
  readonly number: Color;
  readonly type: Color;
  readonly function: Color;
  readonly operator: Color;
  readonly punctuation: Color;     // ← Amp 无
  readonly variable: Color;
  readonly property: Color;        // ← Amp 无
  readonly tag: Color;             // ← Amp 无
  readonly attribute: Color;       // ← Amp 无
  readonly default: Color;         // ← Amp 无
}

export interface AppThemeData {
  readonly syntaxHighlight: SyntaxHighlightConfig;
  readonly colors: {
    readonly background: Color;
    readonly foreground: Color;
    readonly accent: Color;
    readonly muted: Color;
    readonly border: Color;
  };
}
```

Flitter 的 SyntaxHighlightConfig 有 13 个 token 类型（多出 punctuation, property, tag, attribute, default），
Amp 只有 8 个（keyword, string, number, comment, function, variable, type, operator）。

Flitter 的 AppThemeData.colors 只有 5 个字段，对比 Amp 的 x1 有 50+ 字段 — **差距巨大**。

#### 2.3.2 Theme 与 AppTheme 共存

测试文件 [app-theme.test.ts:L199-L253](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/__tests__/app-theme.test.ts#L199-L253) 验证：

```typescript
// Theme -> AppTheme -> leaf 的树结构
const resultTheme = Theme.of(context);      // 找到 Theme
const resultAppTheme = AppTheme.of(context); // 找到 AppTheme
// 互不干扰，因为 dependOnInheritedWidgetOfExactType 按精确类型匹配
```

### 2.4 DefaultTextStyle InheritedWidget

[DefaultTextStyle](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/default-text-style.ts#L21-L61):

```typescript
export class DefaultTextStyle extends InheritedWidget {
  readonly style: TextStyle;

  static of(context: BuildContext): TextStyle {
    return DefaultTextStyle.maybeOf(context) ?? new TextStyle();  // 安全回退
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as DefaultTextStyle;
    return !this.style.equals(old.style);
  }
}
```

特点：
- `of()` 永远不会 throw，找不到时返回空 TextStyle
- 使用 TextStyle.equals 深度比较
- Amp 中对应的是 Markdown Widget 的 `styleScheme` 参数，而非独立的 InheritedWidget

### 2.5 AmpThemeProvider — flitter-amp 层

#### 2.5.1 AmpTheme 数据结构

[AmpThemeProvider](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-amp/src/themes/index.ts#L133-L177):

```typescript
export class AmpThemeProvider extends InheritedWidget {
  readonly theme: AmpTheme;  // { base: AmpBaseTheme, app: AmpAppColors }

  static of(context: BuildContext): AmpTheme { ... }
  static maybeOf(context: BuildContext): AmpTheme | undefined { ... }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as AmpThemeProvider;
    return !ampThemeEquals(this.theme, old.theme);
  }
}
```

AmpTheme = `{ base: AmpBaseTheme (15色+8语法色+isLight), app: AmpAppColors (22语义色) }`

#### 2.5.2 deriveAppColors — 语义色派生

[deriveAppColors](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-amp/src/themes/index.ts#L66-L91):

```typescript
export function deriveAppColors(base: AmpBaseTheme): AmpAppColors {
  return {
    toolName: base.foreground,
    toolSuccess: base.success,
    toolError: base.destructive,
    toolCancelled: base.warning,
    fileReference: base.primary,
    command: base.warning,
    keybind: base.info,
    // ... 共 22 个字段，全部从 base 派生
  };
}
```

对比 Amp 的 `x1.default(mode)` 直接写死所有值，flitter-amp 使用函数从基础色派生语义色 — 更简洁但灵活性略低。

#### 2.5.3 AmpThemeProvider 与 core Theme/AppTheme 的关系

**重要架构差异**：flitter-amp 使用独立的 `AmpThemeProvider` InheritedWidget 而非复用 core 的 Theme/AppTheme。

```
Flitter 树结构:
  App (StatefulWidget)
    └── AmpThemeProvider (InheritedWidget, flitter-amp)  ← 单一主题入口
        └── ... 应用树 ...

Amp 原版树结构 (推断):
  App (StatefulWidget)
    └── _$ provider  (InheritedWidget)  ← 提供 Qt (完整主题)
        └── YL provider  (InheritedWidget)  ← 提供 YB (基础主题)
            └── ... 应用树 ...
```

Flitter 将 base + app 合并在一个 AmpThemeProvider 中传播，Amp 可能有两个独立的 InheritedWidget（_$ 和 YL 分开），某些 Widget 只依赖 YL 以减少不必要的重建。

#### 2.5.4 深度相等比较

[ampBaseThemeEquals](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-amp/src/themes/index.ts#L193-L219) 和 [ampAppColorsEquals](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-amp/src/themes/index.ts#L225-L249)：

逐字段 Color.equals 比较，包括 isLight 布尔值。AmpBaseTheme 比较 16 个颜色 + 8 个语法色 + 1 个布尔 = 25 次比较；AmpAppColors 比较 22 个颜色 = 22 次比较。总计 47 次 Color.equals。

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **InheritedWidget 查找算法** | 线性父链遍历 O(depth) | 线性父链遍历 O(depth) | ✅ 一致 | 都不使用 Flutter 的 _inheritedWidgets HashMap |
| **类型匹配方式** | `widget.constructor === widgetType` | `widget.constructor === widgetType` (ancestor check) + `instanceof InheritedElement` | ✅ 一致 | 精确类型匹配，非 instanceof |
| **_dependents 数据结构** | `Set<Element>` | `Set<Element>` | ✅ 一致 | Set 保证去重和 O(1) 增删 |
| **依赖双向注册** | Element._inheritedDependencies + InheritedElement._dependents | Element._inheritedDependencies + InheritedElement._dependents | ✅ 一致 | unmount 时双向清理 |
| **updateShouldNotify 语义** | 先保存 old → swap → 比较 → 通知 → 更新子树 | 先保存 old → swap → 比较 → 通知 → 更新子树 | ✅ 一致 | 顺序完全匹配 |
| **didChangeDependencies** | ❌ 不存在 | ❌ 不存在 | ✅ 一致 | 两者都省略了此 Flutter 生命周期 |
| **deactivate/activate** | ❌ 不存在（mounted→unmounted） | ❌ 不存在（mounted→unmounted） | ✅ 一致 | Amp 简化：无 inactive 状态 |
| **主题 InheritedWidget 数量** | 2 个（_$ 提供 Qt，YL 提供 YB） | 1 个（AmpThemeProvider 提供 AmpTheme） | ⚠️ 中等 | Amp 可分层订阅，flitter 合并为一个 |
| **基础色 (ColorScheme) 字段数** | 15 字段 (wd) | 15 字段 (ThemeData) | ✅ 一致 | 数量匹配，部分命名不同 |
| **基础色命名** | foreground, mutedForeground, destructive | text, textSecondary, error | ⚠️ 低 | 语义相同，命名差异 |
| **基础色缺失字段** | secondary, accent, cursor, copyHighlight, tableBorder | surface (Amp 无) | ⚠️ 中等 | Flitter ThemeData 缺少 5 个 Amp 核心字段 |
| **AppTheme 语义色字段数** | 53+ (x1) | 22 (AmpAppColors) | 🔴 高 | Amp 多出 30+ 字段 |
| **AppTheme 缺失字段** | — | userMessage, assistantMessage, systemMessage, codeBlock, inlineCode, suggestion, filename, button, shellModeHidden, handoffModeDim, diffChanged, diffContext, ideConnected/Disconnected/Warning, selectionForeground, selectedMessage, threadGraph* 等 | 🔴 高 | 大量 UI 语义色未覆盖 |
| **语法高亮 token 数** | 8 (keyword, string, number, comment, function, variable, type, operator) | 13 (+punctuation, property, tag, attribute, default) | ⚠️ 低 | Flitter 多出 5 个，但 Amp 够用的 8 个是正确子集 |
| **App色派生方式** | `x1.default(mode)` 手写所有值 | `deriveAppColors(base)` 从 base 派生 | ⚠️ 中等 | Flitter 更 DRY 但灵活性有限 |
| **flitter-core Theme vs flitter-amp AmpThemeProvider** | 不适用 | 两套系统并存 (core Theme/AppTheme 和 amp AmpThemeProvider) | ⚠️ 中等 | core 层 Theme 面向通用场景，AmpThemeProvider 面向 Amp 复刻 |
| **DefaultTextStyle 传播** | Markdown styleScheme 参数直接传入 | DefaultTextStyle InheritedWidget 独立传播 | ⚠️ 低 | Amp 的 Markdown 通过 props 传样式，不用 InheritedWidget |
| **主题热切换通知范围** | _$ 和 YL 独立通知（部分 Widget 仅订阅 YL） | 单一 AmpThemeProvider 通知所有消费者 | ⚠️ 中等 | Flitter 粒度较粗，所有消费者都会重建 |
| **深度相等比较** | Qt 内嵌 wd 和 x1 的逐字段比较（约 68 次） | AmpTheme 内嵌 base 和 app 的逐字段比较（约 47 次） | ⚠️ 低 | 字段数不同导致比较次数不同 |
| **RGB true-color 主题值** | DSH dark: rgb(11,13,11) 背景等 | darkTheme: Color.rgb(11,13,11) 等 | ✅ 一致 | 7 个内置主题的 RGB 值完全匹配 |
| **7 个内置主题** | dark, light, catppuccin-mocha, solarized-dark/light, gruvbox-dark, nord | dark, light, catppuccin-mocha, solarized-dark/light, gruvbox-dark, nord | ✅ 一致 | 主题名和数量完全匹配 |
| **终端色回退** | gH.default(), gH.blue 等 ANSI 命名色 | Color.blue, Color.defaultColor 等 | ✅ 一致 | ANSI 回退策略一致 |

---

## 4. 差异修复建议（按优先级排序）

### P0（阻塞级 — 功能缺失）

#### 4.1 AmpAppColors 缺失 30+ 语义色字段

**问题**：Amp 的 `x1` 有 53+ 语义色字段，flitter-amp 的 `AmpAppColors` 仅 22 个。大量 UI 组件所需的语义色缺失。

**缺失关键字段**：
- 消息角色：`userMessage`, `assistantMessage`, `systemMessage`
- 代码显示：`codeBlock`, `inlineCode`
- 状态：`processing`, `completed`, `cancelled`
- UI：`suggestion`, `filename`, `button`, `shellModeHidden`, `handoffModeDim`
- Diff：`diffChanged`（只有 added/removed，缺 changed）
- IDE：`ideConnected`, `ideDisconnected`, `ideWarning`
- 选中：`selectionForeground`, `selectedMessage`
- 线程图：`threadGraphNode`, `threadGraphNodeSelected`, `threadGraphConnector`

**修复**：扩展 `AmpAppColors` interface，在 `deriveAppColors()` 中添加派生逻辑。对于 Amp 中手写的值（如 `handoffModeDim: gH.rgb(128,0,128)`），需要在派生函数中硬编码或增加基础色字段。

### P1（重要 — 架构差异）

#### 4.2 双 InheritedWidget 主题分层

**问题**：Amp 使用 `_$` 和 `YL` 两个独立的主题访问器。像 ThinkingBlock (`zk`) 和 ExpandCollapse (`lT`) 这样的基础 Widget 只订阅 `YL`（基础色），不会因 AppTheme 变化而重建。Flitter 的单一 `AmpThemeProvider` 导致任何主题字段变化都会触发所有消费者重建。

**影响**：主题切换时重建范围过大。虽然 TUI 场景下性能影响有限，但不忠实于 Amp 的优化策略。

**修复方案**：
1. **保持现状**（推荐）— TUI 场景下性能可接受，单入口更简单
2. **拆分为两层** — 引入 `AmpBaseThemeProvider` + `AmpAppThemeProvider`，让基础 Widget 只订阅 base

#### 4.3 core Theme/AppTheme 与 AmpThemeProvider 的角色重叠

**问题**：flitter-core 定义了 `Theme` 和 `AppTheme` InheritedWidget，flitter-amp 又定义了 `AmpThemeProvider`。消费者该用哪个？当前 flitter-amp 的 Widget 使用 `AmpThemeProvider.of(context)`，而 flitter-core 的通用 Widget（如 DiffView、Scrollbar）可能使用 `Theme.of(context)`。

**影响**：如果不在树中同时注入 `Theme` + `AmpThemeProvider`，core Widget 找不到 Theme 会 throw。

**修复**：在 `App.build()` 中同时注入：
```typescript
AmpThemeProvider({ theme: ampTheme,
  child: Theme({ data: mapAmpThemeToThemeData(ampTheme),
    child: AppTheme({ data: mapAmpThemeToAppThemeData(ampTheme),
      child: appRoot
    })
  })
})
```

### P2（改进级 — 字段命名/对齐）

#### 4.4 ThemeData 字段命名与 Amp 不一致

**问题**：
- `text` vs `foreground` — Amp 用 foreground（更准确）
- `textSecondary` vs `mutedForeground` — Amp 用 mutedForeground（更准确）
- `error` vs `destructive` — Amp 用 destructive（覆盖更广）

**修复**：考虑在 core ThemeData 中添加别名字段或迁移命名。但这是 API 变更，需谨慎。

#### 4.5 ThemeData 缺失 Amp 的 5 个核心字段

**缺失**：`secondary`, `accent`, `cursor`, `copyHighlight`, `tableBorder`

**修复**：扩展 ThemeData interface 添加这 5 个字段。这些是 Amp 几乎所有组件都使用的核心色。

### P3（低优先级 — 细微差异）

#### 4.6 deriveAppColors vs 硬编码

Amp 的 `x1.default("dark")` 对所有 53 个字段直接赋值（大部分是 ANSI 命名色），而 flitter-amp 的 `deriveAppColors(base)` 从 base 自动派生。

当 Amp 使用 RGB 主题时，它通过 `Qt.fromBaseTheme(baseTheme, mode)` 生成 AppTheme，此时 `x1.default(mode)` 使用的仍是 ANSI 命名色（不是 RGB），只有 ColorScheme 使用 RGB。这意味着 Amp 的 RGB 主题下 App 色和 Base 色来源不同。

Flitter 的 `deriveAppColors(base)` 统一从 base（可能是 RGB）派生，实际行为更正确但与 Amp 原始行为略有差异。

#### 4.7 DefaultTextStyle 传播方式

Amp 的 Markdown Widget 通过 `styleScheme` props 直接传入样式配置（如 thinking block 中的 dim+italic 覆盖），而不使用 InheritedWidget。Flitter 的 `DefaultTextStyle` InheritedWidget 是通用方案但不是 Amp 的方式。

这不是 bug — DefaultTextStyle 作为 core 工具仍有其价值，但 Markdown 组件也应支持直接 styleScheme 参数。

#### 4.8 语法高亮 token 数量差异

Flitter 的 SyntaxHighlightConfig 有 13 个 token（多出 punctuation, property, tag, attribute, default），Amp 只有 8 个。多出的 5 个不会造成问题但增加了未使用的配置面积。AmpSyntaxHighlight 已经正确只定义了 8 个。

---

## 附录 A: InheritedWidget 类型精确匹配的重要性

`dependOnInheritedWidgetOfExactType` 使用 `widget.constructor === widgetType`（非 `instanceof`）。这意味着：

```typescript
// Theme 和 AppTheme 不会互相干扰
Theme.of(context)     // 只找 widget.constructor === Theme
AppTheme.of(context)  // 只找 widget.constructor === AppTheme
```

即使 Theme 和 AppTheme 都继承自 InheritedWidget，它们的 constructor 不同，所以查找结果独立。这是"Exact Type"命名的由来。

## 附录 B: 主题热切换时序图

```
[User selects new theme]
        │
        ▼
[Settings Observable emits new theme name]
        │
        ▼
[App.setState(() => { this.currentTheme = newTheme })]
        │
        ▼
[App.build(context) creates new AmpThemeProvider]
        │  AmpThemeProvider(theme: createAmpTheme(newBaseTheme), child: ...)
        ▼
[InheritedElement.update(newAmpThemeProvider)]
        │
        ├── ampThemeEquals(new, old) → false
        │       │
        │       ▼
        ├── notifyDependents()
        │       │
        │       ├── ChatView.markNeedsRebuild()
        │       ├── ToolHeader.markNeedsRebuild()
        │       ├── StatusBar.markNeedsRebuild()
        │       ├── InputArea.markNeedsRebuild()
        │       └── ... (all consumers)
        │
        └── child.update(newChild)
                │
                ▼
[Next frame: BuildOwner.buildScopes()]
        │
        ├── ChatView.rebuild() → AmpThemeProvider.of(ctx) → new colors
        ├── ToolHeader.rebuild() → AmpThemeProvider.of(ctx) → new colors
        └── ... all dirty elements rebuilt with new theme
```

## 附录 C: Amp 主题访问器使用统计

从混淆源码中提取的访问器使用分布：

| 文件 | 访问器 | 读取字段 |
|------|--------|---------|
| user-message-Sa.js | `_$.of(H)` → colors, app | colors.success, colors.warning, colors.background, app.selectedMessage |
| selected-user-message-RQ.js | `_$.of(H)` → colors, app | app.selectedMessage, colors.warning, colors.success, colors.background, app.keybind, app.diffAdded/Removed |
| tool-header-wQ.js | `_$.of(H)` → colors, app | colors.foreground, app.toolName, app.diffAdded, app.diffRemoved |
| tool-call-header-xD.js | `_$.of(H)` → colors, app | app.toolName, colors.mutedForeground |
| thinking-block-zk.js | `YL.of(H)` → colorScheme | colorScheme.warning, accent, success, foreground |
| expand-collapse-lT.js | `YL.of(H)` → colorScheme | colorScheme.mutedForeground |
| prompt-bar-F0H.js | `YL.of(H)` → colorScheme | colorScheme.border, colorScheme.background |
| status-bar-iJH.js | `_$.of(H)` → colors, app | colors.primary, mutedForeground, foreground, warning, destructive; app.recommendation, command |
| assistant-message-XkL.js | `_$.maybeOf(H)?.colors ?? YL.of(H).colorScheme` | colors.foreground |
