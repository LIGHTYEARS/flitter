# Amp TUI 深度分析 #5: Focus 树 + 键盘事件冒泡 + Tab 遍历 + 快捷键系统

> 基于 Amp CLI v0.0.1774512763 混淆 JS 逆向分析 + flitter-core 完整源码对比
> 分析范围: Focus 树结构、键盘事件冒泡链、Tab 遍历策略、快捷键绑定系统、焦点恢复
> 分析日期: 2026-03-29

---

## 1. 混淆名映射表

| Amp 混淆名 | Amp 概念 | flitter-core 类 | 文件路径 |
|------------|---------|----------------|---------|
| `D9` | FocusNode | `FocusNode` | `flitter-core/src/input/focus.ts` |
| `er` | FocusManager (单例) | `FocusManager` | `flitter-core/src/input/focus.ts` |
| `t4` | FocusScope (StatefulWidget) | `FocusScope` | `flitter-core/src/widgets/focus-scope.ts` |
| `KJ` | FocusScopeState (State) | `FocusScopeState` | `flitter-core/src/widgets/focus-scope.ts` |
| `Pg` | EventDispatcher (单例) | `EventDispatcher` | `flitter-core/src/input/event-dispatcher.ts` |
| `J3` | WidgetsBinding | `WidgetsBinding` | `flitter-core/src/framework/binding.ts` |
| `ap` | SelectionList | `SelectionList` | `flitter-core/src/widgets/selection-list.ts` |

> 注: 此前文档中提到的 c8=FocusNode、Xh=FocusManager、f8=FocusScope 可能来自不同版本的混淆结果。
> 本分析以源码中标注的 D9/er/t4 为准（与 flitter-core 中的 `// Amp ref` 注释一致）。

---

## 2. FocusNode 树结构

### 2.1 Amp 实现 (class D9)

Amp 的 FocusNode 是一棵 N 叉树，每个节点维护 parent 和 children 引用。从混淆源码还原的核心字段：

```
class D9 {
  _parent: D9 | null;        // 父节点引用
  _children: D9[];            // 子节点数组
  _hasPrimaryFocus: boolean;  // 是否为当前唯一主焦点
  _canRequestFocus: boolean;  // 是否允许获取焦点
  _skipTraversal: boolean;    // Tab 遍历时是否跳过
  _disposed: boolean;         // 是否已释放

  onKey: Function | null;     // 键盘事件回调（单个）
  onPaste: Function | null;   // 粘贴事件回调

  _listeners: Function[];     // 焦点状态变化监听器
}
```

### 2.2 flitter-core 实现 (class FocusNode)

**源码位置**: `flitter-core/src/input/focus.ts:20-338`

flitter-core 完全复刻了 Amp 的 FocusNode 结构，并增加了一个扩展点：

```typescript
export class FocusNode {
  private _parent: FocusNode | null = null;
  private _children: FocusNode[] = [];
  private _hasPrimaryFocus: boolean = false;
  private _canRequestFocus: boolean;
  private _skipTraversal: boolean;
  private _disposed: boolean = false;

  onKey: ((event: KeyEvent) => KeyEventResult) | null;
  onPaste: ((text: string) => void) | null;

  // ★ flitter-core 新增: 多处理器注册
  private _keyHandlers: Array<(event: KeyEvent) => KeyEventResult> = [];

  private _listeners: Array<() => void> = [];
  readonly debugLabel: string | undefined;
}
```

### 2.3 关键差异: `_keyHandlers` 数组

| 特性 | Amp (D9) | flitter-core (FocusNode) |
|------|---------|------------------------|
| onKey 回调 | 单个 `onKey` 函数 | 单个 `onKey` 函数 |
| 额外处理器 | 无 | `_keyHandlers[]` 数组，支持 addKeyHandler/removeKeyHandler |
| 处理优先级 | onKey 唯一入口 | onKey 先执行 → 再按注册顺序执行 _keyHandlers |

flitter-core 的 `addKeyHandler` 机制允许多个 Widget 在同一 FocusNode 上注册事件处理器，提供了比 Amp 更灵活的事件拦截能力。这在 Flutter 原版中对应 `FocusNode.onKeyEvent` + `FocusNode.addOnKeyEventCallback` 的双通道设计。

### 2.4 attach/detach 生命周期

两者的树管理逻辑完全一致：

```
attach(parent):
  1. if (_parent === parent) return;        // 幂等
  2. if (_parent !== null) detach();         // 先从旧父节点脱离
  3. _parent = parent;
  4. parent._children.push(this);

detach():
  1. if (_parent === null) return;           // 幂等
  2. parent._children.splice(indexOf(this), 1);
  3. if (_hasPrimaryFocus) _clearPrimaryFocus();  // ★ 脱离时清除焦点
  4. _parent = null;

dispose():
  1. if (_disposed) return;                  // 幂等
  2. _disposed = true;
  3. if (_hasPrimaryFocus) _clearPrimaryFocus();
  4. detach();                               // 从树中移除
  5. for (child of [..._children]) child.detach();  // 断开所有子节点
  6. onKey = null; onPaste = null;           // 清除处理器
  7. _keyHandlers.length = 0;               // [flitter-core only]
  8. _listeners.length = 0;                  // 清除监听器
```

**关键行为**: detach 时自动清除焦点。这确保了从 Widget 树移除的节点不会残留 primaryFocus 状态。测试用例 `detach clears primary focus on detached node` 验证了此行为。

---

## 3. FocusScopeNode — 作用域管理

### 3.1 Amp 实现

Amp 的 FocusScopeNode 继承自 FocusNode，增加了 `focusedChild` 追踪：

```
class FocusScopeNode extends D9 {
  _focusedChild: D9 | null;   // 作用域内最近获焦的子节点

  autofocus(node):
    if (!_isDescendant(node)) return;
    node.requestFocus();

  _setFocusedChild(node):
    _focusedChild = node;
}
```

### 3.2 flitter-core 实现

**源码位置**: `flitter-core/src/input/focus.ts:349-384`

```typescript
export class FocusScopeNode extends FocusNode {
  private _focusedChild: FocusNode | null = null;

  get focusedChild(): FocusNode | null {
    return this._focusedChild;
  }

  autofocus(node: FocusNode): void {
    if (!this._isDescendant(node)) return;
    node.requestFocus();
  }

  _setFocusedChild(node: FocusNode): void {
    this._focusedChild = node;
  }

  private _isDescendant(node: FocusNode): boolean {
    let current: FocusNode | null = node;
    while (current !== null) {
      if (current === this) return true;
      current = current.parent;
    }
    return false;
  }
}
```

### 3.3 _updateScopeFocusedChild 机制

当任意 FocusNode.requestFocus() 被调用时，会向上查找最近的 FocusScopeNode 并更新其 focusedChild：

```
FocusNode.requestFocus():
  1. 清除旧的 primaryFocus
  2. _hasPrimaryFocus = true
  3. _updateScopeFocusedChild()     // ★ 关键步骤
     └→ 向上遍历 _parent 链
        └→ 找到第一个 FocusScopeNode 实例
           └→ 调用 _setFocusedChild(this)
  4. _notifyListenersUpTree()
```

这个机制是**焦点恢复**的基础：FocusScopeNode 始终记住其作用域内最后获焦的节点。

---

## 4. FocusManager — 全局焦点管理

### 4.1 Amp 实现 (class er)

Amp 的 FocusManager 是全局单例，持有焦点树的根 FocusScopeNode：

```
class er {
  static _instance: er;
  rootScope: FocusScopeNode;

  get primaryFocus(): D9 | null {
    return _findPrimaryFocus(rootScope);   // DFS 查找
  }

  dispatchKeyEvent(event):
    node = primaryFocus;
    while (node !== null) {
      result = node.handleKeyEvent(event);
      if (result === 'handled') return 'handled';
      node = node.parent;
    }
    return 'ignored';
}
```

### 4.2 flitter-core 实现

**源码位置**: `flitter-core/src/input/focus.ts:397-513`

完全一致的单例模式。关键方法：

| 方法 | Amp (er) | flitter-core (FocusManager) | 行为 |
|------|---------|---------------------------|------|
| `primaryFocus` | DFS 搜索 | DFS 搜索 `_findPrimaryFocus(rootScope)` | 遍历整棵树找到 `_hasPrimaryFocus === true` 的节点 |
| `registerNode` | 挂载到指定父节点或根 | `node.attach(parent ?? rootScope)` | 与 Amp 一致 |
| `unregisterNode` | 调用 detach | `node.detach()` | 与 Amp 一致 |
| `dispatchKeyEvent` | 冒泡分发 | 冒泡分发（见 §5） | 与 Amp 一致 |
| `dispatchPasteEvent` | 冒泡查找 onPaste | 冒泡查找 onPaste | 与 Amp 一致 |
| `getTraversableNodes` | DFS 收集 | DFS 收集（见 §6） | 与 Amp 一致 |
| `reset` | — | 释放旧 rootScope 并置 null | 仅用于测试 |

### 4.3 primaryFocus 查找算法

```
_findPrimaryFocus(node):
  if (node.hasPrimaryFocus) return node;
  for (child of node.children):
    found = _findPrimaryFocus(child);
    if (found !== null) return found;
  return null;
```

**性能特征**: 每次访问 `primaryFocus` 都执行一次 DFS 搜索。对于 Amp TUI 这样节点数较少（通常 < 20）的场景，这是可接受的。Flutter 原版通过在 requestFocus 时直接缓存 primaryFocus 引用来优化，flitter-core 当前未做此优化。

---

## 5. 键盘事件冒泡

### 5.1 完整分发管线

```
stdin 字节流
    │
    ▼
InputParser.parseInputEvent()         // 转义序列解析
    │
    ▼
EventDispatcher.dispatch({type:'key'}) // 全局分发入口 (Amp: Pg)
    │
    ├── Step 1: Key Interceptors       // 全局拦截器（如 Ctrl+C）
    │   └── if any returns 'handled' → STOP
    │
    ├── Step 2: FocusManager.dispatchKeyEvent()  // 焦点系统冒泡
    │   └── if returns 'handled' → STOP
    │
    └── Step 3: Registered Key Handlers // 兜底处理器
        └── if any returns 'handled' → STOP
```

### 5.2 焦点系统内的冒泡链

**源码位置**: `flitter-core/src/input/focus.ts:455-463`

```typescript
dispatchKeyEvent(event: KeyEvent): KeyEventResult {
  let node: FocusNode | null = this.primaryFocus;
  while (node !== null) {
    const result = node.handleKeyEvent(event);
    if (result === 'handled') return 'handled';
    node = node.parent;                             // ★ 向上冒泡
  }
  return 'ignored';
}
```

### 5.3 单个 FocusNode 的处理顺序

**源码位置**: `flitter-core/src/input/focus.ts:241-255`

```typescript
handleKeyEvent(event: KeyEvent): KeyEventResult {
  // ① 先调用 onKey 回调
  if (this.onKey !== null) {
    const result = this.onKey(event);
    if (result === 'handled') return 'handled';
  }

  // ② 再调用注册的 key handlers (Amp 无此机制)
  for (const handler of this._keyHandlers) {
    const result = handler(event);
    if (result === 'handled') return 'handled';
  }

  return 'ignored';
}
```

### 5.4 冒泡示例 (Amp 典型场景)

```
焦点树:
  Root FocusScopeNode (er.rootScope)
    └── App FocusScope (t4, autofocus:true, onKey: 全局快捷键)
        └── TextField FocusNode (输入框, onKey: 文字输入处理)
                ↑
           primaryFocus

键盘事件 Ctrl+O 的冒泡路径:
  1. TextField.onKey(Ctrl+O) → 'ignored' (不处理)
  2. App FocusScope.onKey(Ctrl+O) → 'handled' (打开 CommandPalette)
  → 事件停止传播

键盘事件 'a' 的冒泡路径:
  1. TextField.onKey('a') → 'handled' (插入字符)
  → 事件停止传播（不冒泡到 App）
```

### 5.5 KeyEventResult 语义

| 值 | Amp | flitter-core | 含义 |
|----|-----|-------------|------|
| `'handled'` | ✅ | ✅ | 事件已处理，停止冒泡 |
| `'ignored'` | ✅ | ✅ | 事件未处理，继续冒泡到 parent |
| `'skipRemainingHandlers'` | ❌ (Amp 无) | ❌ (flitter-core 也无) | Flutter 原版有，跳过同节点剩余 handler 但继续冒泡 |

**关键差异**: Flutter 原版的 `KeyEventResult` 有三个值（handled / ignored / skipRemainingHandlers），Amp 和 flitter-core 都简化为两个值。`skipRemainingHandlers` 在 TUI 场景中较少使用，省略合理。

### 5.6 EventDispatcher 三阶段管线

**源码位置**: `flitter-core/src/input/event-dispatcher.ts:206-237`

```typescript
dispatchKeyEvent(event: KeyEvent): KeyEventResult {
  // Step 1: Key interceptors (全局优先级最高)
  for (const interceptor of this._keyInterceptors) {
    const result = interceptor(event);
    if (result === 'handled') return 'handled';
  }

  // Step 2: FocusManager dispatch (焦点树冒泡)
  try {
    const { FocusManager } = require('./focus');
    if (FocusManager?.instance) {
      const result = FocusManager.instance.dispatchKeyEvent(event);
      if (result === 'handled') return 'handled';
    }
  } catch { /* FocusManager not available yet */ }

  // Step 3: Registered key handlers (兜底)
  for (const handler of this._keyHandlers) {
    const result = handler(event);
    if (result === 'handled') return 'handled';
  }

  return 'ignored';
}
```

这与 Amp 的 `Pg` 类行为一致。Amp 在 `J3`（WidgetsBinding）构造时注册全局拦截器（如 Ctrl+C 信号处理），然后将剩余事件交给焦点系统。

---

## 6. Tab 遍历

### 6.1 遍历节点收集

**源码位置**: `flitter-core/src/input/focus.ts:486-512`

```typescript
getTraversableNodes(): FocusNode[] {
  const result: FocusNode[] = [];
  this._collectTraversable(this.rootScope, result);
  return result;
}

private _collectTraversable(node: FocusNode, result: FocusNode[]): void {
  if (node !== this.rootScope && node.canRequestFocus && !node.skipTraversal) {
    result.push(node);
  }
  for (const child of node.children) {
    this._collectTraversable(child, result);
  }
}
```

**收集规则**:
1. DFS（深度优先）遍历整棵焦点树
2. 排除 rootScope 自身
3. 仅收集 `canRequestFocus === true` 且 `skipTraversal === false` 的节点
4. 遍历顺序 = 注册顺序（即 `_children[]` 的 push 顺序）

### 6.2 nextFocus / previousFocus

**源码位置**: `flitter-core/src/input/focus.ts:185-221`

```
nextFocus():
  traversable = FocusManager.getTraversableNodes();
  if (traversable.length === 0) return false;

  currentIndex = traversable.indexOf(this);
  if (currentIndex === -1):
    traversable[0].requestFocus();   // 不在列表中 → 聚焦第一个
  else:
    nextIndex = (currentIndex + 1) % traversable.length;  // 循环
    traversable[nextIndex].requestFocus();
  return true;

previousFocus():
  // 同理，(currentIndex - 1 + length) % length
```

**关键特性**:
- **循环遍历**: 到达末尾自动回到开头
- **不在列表时的降级**: 如果当前节点不在遍历列表中（已注销/被跳过），nextFocus 聚焦第一个节点，previousFocus 聚焦最后一个
- **返回值**: boolean，用于判断是否成功移动

### 6.3 遍历顺序示意

```
焦点树:                      DFS 收集顺序:
  rootScope
  ├── parent1 (p1)           [0] p1
  │   ├── child1 (c1)        [1] c1
  │   └── child2 (c2)        [2] c2
  └── parent2 (p2)           [3] p2
      └── child3 (c3)        [4] c3

Tab 顺序: p1 → c1 → c2 → p2 → c3 → p1 (循环)
Shift+Tab: p1 → c3 → p2 → c2 → c1 → p1 (反向循环)
```

### 6.4 Amp 中 Tab 的实际用途

在 Amp 的 TUI 中，Tab/Shift+Tab 有两种含义：

| 上下文 | Tab 行为 | 实现位置 |
|--------|---------|---------|
| 焦点区域内（如 SelectionList） | 在列表项之间循环 | `SelectionList.handleKeyEvent` |
| 全局级别 | 在消息之间导航（Amp BINARY-RE-SPEC 记录的 "Navigate messages"） | 需要 App 层 onKey 实现 |

flitter-core 的 SelectionList 已实现了 Tab/Shift+Tab 的列表内循环：

```typescript
// SelectionList.handleKeyEvent (selection-list.ts:138-194)
case 'Tab':
  this._moveNext();       // 循环向下
  return 'handled';
// Shift+Tab:
if (shift && key === 'Tab') {
  this._movePrevious();   // 循环向上
  return 'handled';
}
```

### 6.5 Amp vs flitter-core: FocusTraversalPolicy

| 特性 | Flutter 原版 | Amp (D9/er) | flitter-core |
|------|------------|------------|-------------|
| FocusTraversalPolicy | 抽象策略类 | 无（硬编码 DFS） | 无（硬编码 DFS） |
| OrderedTraversalPolicy | 带 order 参数 | 无 | 无 |
| ReadingOrderTraversalPolicy | 按视觉位置排序 | 无 | 无 |
| WidgetOrderTraversalPolicy | 按 Widget 树顺序 | ✅（事实上就是这个） | ✅（事实上就是这个） |

Amp 和 flitter-core 均使用最简化的遍历策略：DFS Widget 树顺序。对于 TUI 场景（通常是简单的线性/嵌套布局），这已足够。Flutter 原版提供的多种 TraversalPolicy 主要服务于 2D GUI 的复杂焦点导航需求。

---

## 7. FocusScope Widget

### 7.1 Amp 实现 (class t4 / State: KJ)

Amp 的 FocusScope 是一个 behavior-only StatefulWidget：

```
class t4 extends StatefulWidget {
  focusNode?: D9;         // 外部传入的 FocusNode
  child: Widget;
  autofocus: boolean;
  canRequestFocus: boolean;
  skipTraversal: boolean;
  onKey?: Function;
  onPaste?: Function;
  onFocusChange?: Function;
}

class KJ extends State<t4> {
  _ownedFocusNode?: D9;   // 内部创建的 FocusNode

  effectiveFocusNode:
    return widget.focusNode ?? _ownedFocusNode;

  initState():
    _createOrAttachNode();
    _setupHandlers();
    _registerNode();
    if (widget.autofocus) queueMicrotask(() => effectiveFocusNode.requestFocus());

  dispose():
    effectiveFocusNode.removeListener(_onFocusChanged);
    FocusManager.unregisterNode(effectiveFocusNode);
    if (_ownedFocusNode) _ownedFocusNode.dispose();

  build(): return widget.child;  // ★ 透传 child，不添加任何 UI
}
```

### 7.2 flitter-core 实现

**源码位置**: `flitter-core/src/widgets/focus-scope.ts:35-243`

完全对齐 Amp 的 t4/KJ 实现，核心行为：

**7.2.1 节点注册** — 自动查找祖先 FocusScopeState

```typescript
private _registerNode(): void {
  let parentFocusNode: FocusNode | null = null;

  const ctx = this.context as any;
  if (typeof ctx.findAncestorStateOfType === 'function') {
    const ancestorState = ctx.findAncestorStateOfType(FocusScopeState);
    if (ancestorState && ancestorState instanceof FocusScopeState) {
      parentFocusNode = ancestorState.effectiveFocusNode;
    }
  }

  FocusManager.instance.registerNode(this.effectiveFocusNode, parentFocusNode);
}
```

这复现了 Amp 的 `KJ` 使用 `context.findAncestorStateOfType(KJ)` 查找父焦点节点的行为。

**7.2.2 autofocus 机制** — 通过 microtask 延迟

```typescript
if (this.widget.autofocus && this.effectiveFocusNode.canRequestFocus) {
  queueMicrotask(() => {
    if (this.mounted && this.effectiveFocusNode.canRequestFocus) {
      this.effectiveFocusNode.requestFocus();
    }
  });
}
```

使用 `queueMicrotask` 而非同步调用，确保 initState 完成后（整个子树挂载后）再请求焦点。这与 Amp 的行为一致。

**7.2.3 焦点变化回调**

```typescript
private _onFocusChanged = (): void => {
  if (!this.mounted) return;
  const hasFocus = this.effectiveFocusNode.hasFocus;
  if (hasFocus !== this._hadFocus) {
    this._hadFocus = hasFocus;
    this.widget.onFocusChange?.(hasFocus);
  }
};
```

仅在 `hasFocus` 状态发生转换时才触发回调，防止重复通知。

**7.2.4 didUpdateWidget — 热更新**

当 Widget 树重建时，FocusScopeState 处理三种情况：
1. 外部 focusNode 改变 → 更新引用
2. 从外部 → 内部 → 创建新的 owned node
3. 从内部 → 外部 → dispose owned node

---

## 8. 快捷键系统

### 8.1 Amp 的快捷键实现

Amp 使用**直接模式匹配**而非 Flutter 的 Shortcuts/Actions 模式。在 Amp 中：

```js
// Amp app 根 FocusScope.onKey (还原自混淆代码)
onKey: (event) => {
  if (event.key === 'Escape') { /* 关闭 overlay */ return 'handled'; }
  if (event.ctrlKey && event.key === 'o') { /* command palette */ return 'handled'; }
  if (event.ctrlKey && event.key === 'c') { /* cancel */ return 'handled'; }
  if (event.ctrlKey && event.key === 'l') { /* clear */ return 'handled'; }
  if (event.altKey && event.key === 't') { /* toggle tools */ return 'handled'; }
  if (event.ctrlKey && event.key === 'g') { /* editor */ return 'handled'; }
  if (event.ctrlKey && event.key === 'r') { /* history */ return 'handled'; }
  return 'ignored';
}
```

### 8.2 flitter-core 的快捷键绑定

**源码位置**: `flitter-core/src/input/shortcuts.ts`

flitter-core 提供了一个轻量级的 `ShortcutBinding` + `matchesShortcut` 工具：

```typescript
interface ShortcutBinding {
  key: string;         // "ArrowUp", "Enter", "o", etc.
  ctrl?: boolean;      // 默认 false
  alt?: boolean;       // 默认 false
  shift?: boolean;     // 默认 false
  meta?: boolean;      // 默认 false
}

function matchesShortcut(event: KeyEvent, binding: ShortcutBinding): boolean {
  return (
    event.key === binding.key &&
    event.ctrlKey === (binding.ctrl ?? false) &&
    event.altKey === (binding.alt ?? false) &&
    event.shiftKey === (binding.shift ?? false) &&
    event.metaKey === (binding.meta ?? false)
  );
}
```

**设计决策**: 未实现 Flutter 的 `Shortcuts` Widget / `ShortcutActivator` / `Intent` / `Action` 模式。原因：
- Amp 本身不使用 Intent/Action 模式
- TUI 场景的快捷键数量有限（< 15 个），不需要 Intent 系统的间接层
- 直接在 FocusScope.onKey 中做 if-else 匹配即可

### 8.3 flitter-amp 中的实际使用

**源码位置**: `flitter-amp/src/app.ts:119-183`

```typescript
const mainContent = new FocusScope({
  autofocus: true,
  onKey: (event: KeyEvent): KeyEventResult => {
    // Escape — 逐层关闭 overlay
    if (event.key === 'Escape') {
      if (this.showFilePicker)      { /* 关闭 FilePicker */ return 'handled'; }
      if (this.showCommandPalette)  { /* 关闭 CommandPalette */ return 'handled'; }
      if (appState.hasPendingPermission) { /* 关闭 PermissionDialog */ return 'handled'; }
      return 'ignored';
    }

    // Ctrl+O — 打开命令面板
    if (event.ctrlKey && event.key === 'o') { /* ... */ return 'handled'; }

    // Ctrl+C — 取消
    if (event.ctrlKey && event.key === 'c') { /* ... */ return 'handled'; }

    // Ctrl+L — 清空对话
    if (event.ctrlKey && event.key === 'l') { /* ... */ return 'handled'; }

    // Alt+T — 切换工具展开
    if (event.altKey && event.key === 't') { /* ... */ return 'handled'; }

    // Ctrl+G — 外部编辑器
    if (event.ctrlKey && event.key === 'g') { /* ... */ return 'handled'; }

    // Ctrl+R — 历史浏览
    if (event.ctrlKey && event.key === 'r') { /* ... */ return 'handled'; }

    return 'ignored';
  },
  child: /* Column layout */,
});
```

这与 Amp 原版的快捷键绑定方式完全一致：在根 FocusScope 的 onKey 中处理全局快捷键，利用冒泡机制让子节点先处理（子节点不处理的事件才会到达这里）。

### 8.4 完整快捷键分发表

| 快捷键 | 处理位置 | 优先级 | 行为 |
|--------|---------|--------|------|
| `Ctrl+C` | EventDispatcher interceptor / App FocusScope | 最高 | 取消当前操作 |
| `Escape` | App FocusScope.onKey | 高（冒泡到根） | 逐层关闭: FilePicker → CommandPalette → PermissionDialog |
| `Ctrl+O` | App FocusScope.onKey | 冒泡 | 打开命令面板 |
| `Ctrl+L` | App FocusScope.onKey | 冒泡 | 清空对话 |
| `Alt+T` | App FocusScope.onKey | 冒泡 | 切换工具展开/折叠 |
| `Ctrl+G` | App FocusScope.onKey | 冒泡 | 外部编辑器（TODO） |
| `Ctrl+R` | App FocusScope.onKey | 冒泡 | 历史浏览 |
| `Enter` | TextField / InputArea | 叶子节点 | 提交/换行 |
| `ArrowUp/Down` | SelectionList / ScrollView | 叶子节点 | 列表导航/滚动 |
| `Tab/Shift+Tab` | SelectionList | 叶子节点 | 列表项循环 |
| 可打印字符 | TextField | 叶子节点 | 文字输入 |

---

## 9. 焦点恢复 (Focus Restoration)

### 9.1 Amp 的焦点恢复机制

在 Amp 中，当 overlay（如 CommandPalette、PermissionDialog）关闭时，焦点需要恢复到之前的位置（通常是 InputArea 的 TextField）。Amp 通过以下方式实现：

1. **FocusScopeNode.focusedChild** 记住最后的焦点节点
2. Overlay 使用独立的 FocusScope 获取焦点
3. Overlay 关闭时，不做显式恢复 — 因为主 FocusScope 的 autofocus:true 会在下次 build 时重新获取焦点

### 9.2 flitter-core 当前实现

flitter-core 的 FocusScopeNode 已实现 `focusedChild` 追踪，但**尚未实现显式的焦点恢复**。

```
当前焦点恢复流程:
  1. Overlay 打开 → 新 FocusScope 的 autofocus 获取焦点
  2. Overlay 关闭 → Widget 从树中移除 → FocusScopeState.dispose()
     → FocusNode 被 unregister
  3. 主 FocusScope 仍在树中，但不会自动 requestFocus
  4. ★ 焦点可能处于"无焦点"状态（primaryFocus === null）
```

### 9.3 Flutter 原版 vs Amp vs flitter-core

| 特性 | Flutter 原版 | Amp (D9/er) | flitter-core |
|------|------------|------------|-------------|
| FocusScopeNode.focusedChild | ✅ | ✅ | ✅ |
| FocusScope.skipRequestFocus | ✅ (进入时不自动夺焦) | ❌ | ❌ |
| RequestFocusAction | ✅ (Intent/Action 模式) | ❌ | ❌ |
| 自动恢复到 focusedChild | ✅ (FocusScopeNode._doRequestFocus) | 隐式 (overlay 关闭后 build) | ❌ (需手动实现) |
| FocusTrapArea | ✅ (阻止焦点逃逸) | ❌ | ❌ |

### 9.4 改进建议

flitter-core 可以添加以下增强：

1. **焦点陷阱 (Focus Trap)**: 让 overlay 的 FocusScope 阻止 Tab 遍历逃逸到 overlay 外部
2. **自动恢复**: overlay 销毁时，检查 `FocusScopeNode.focusedChild` 并自动恢复焦点
3. **skipRequestFocus**: 允许 FocusScope 不在挂载时自动获取焦点

---

## 10. 粘贴事件分发

### 10.1 分发路径

粘贴事件使用与键盘事件类似但略有不同的冒泡模式：

```
EventDispatcher.dispatchPasteEvent(event):
  1. 尝试 FocusManager.dispatchPasteEvent(event.text)
     └── FocusManager.dispatchPasteEvent:
         node = primaryFocus;
         while (node !== null):
           if (node.onPaste !== null):
             node.onPaste(text);
             return;                    // ★ 找到第一个 onPaste 即停止
           node = node.parent;
  2. 若无 primaryFocus 或无 onPaste → 兜底 paste handlers
```

与键盘事件的区别：
- 键盘事件调用每个节点的 `handleKeyEvent`（先 onKey 再 _keyHandlers）
- 粘贴事件只查找第一个有 `onPaste` 处理器的节点

### 10.2 Amp 中的粘贴用途

| 粘贴场景 | 目标节点 | 行为 |
|---------|---------|------|
| 终端粘贴文本 | TextField (InputArea) | 插入文本到光标位置 |
| Ctrl+V 图片粘贴 | 特殊处理器 | base64 解码 + 图片附件 |
| 括号粘贴 (Bracketed Paste) | TextField | 大段文本插入 |

---

## 11. 对比总结: Amp vs flitter-core vs Flutter

### 11.1 已对齐特性 ✅

| 特性 | Amp | flitter-core | 对齐程度 |
|------|-----|-------------|---------|
| FocusNode 树 (parent/children) | ✅ | ✅ | 100% |
| FocusScopeNode (focusedChild 追踪) | ✅ | ✅ | 100% |
| FocusManager 单例 (primaryFocus 追踪) | ✅ | ✅ | 100% |
| 键盘事件冒泡 (leaf → root) | ✅ | ✅ | 100% |
| KeyEventResult (handled/ignored) | ✅ | ✅ | 100% |
| Tab/Shift+Tab DFS 遍历 | ✅ | ✅ | 100% |
| skipTraversal | ✅ | ✅ | 100% |
| canRequestFocus (含自动 unfocus) | ✅ | ✅ | 100% |
| FocusScope Widget (behavior-only) | ✅ | ✅ | 100% |
| autofocus (microtask 延迟) | ✅ | ✅ | 100% |
| onFocusChange 回调 | ✅ | ✅ | 100% |
| 祖先监听器通知 | ✅ | ✅ | 100% |
| EventDispatcher 三阶段管线 | ✅ | ✅ | 100% |
| dispatchPasteEvent 冒泡 | ✅ | ✅ | 100% |
| ShortcutBinding 匹配 | ✅ | ✅ | 100% |
| dispose 完整清理 | ✅ | ✅ | 100% |

### 11.2 flitter-core 有但 Amp 没有的 🟢

| 特性 | flitter-core | 说明 |
|------|-------------|------|
| `addKeyHandler` / `removeKeyHandler` | 多处理器注册 | 允许同一 FocusNode 注册多个键盘处理器，比 Amp 的单 onKey 更灵活 |
| `FocusManager.reset()` | 测试工具 | 重置单例状态，方便单元测试隔离 |
| `debugLabel` 属性 | 调试标签 | FocusNode 构造时可附加标签，便于调试 |
| `EventDispatcher.addKeyInterceptor` | 拦截器注册 API | Amp 内联在 WidgetsBinding 中，flitter-core 提供了独立的注册 API |
| `EventDispatcher.addFocusHandler` | 终端焦点事件 | 处理终端窗口 focus/blur 事件 |

### 11.3 Amp 有但 flitter-core 缺失的 🔴

| 特性 | Amp 行为 | flitter-core 现状 | 影响 |
|------|---------|------------------|------|
| Tab 消息间导航 | Tab/Shift+Tab 在消息气泡之间跳转 | 未实现 | 需要在 App 层 onKey 中添加消息级 Tab 导航 |
| Alt+D 切换深度模式 | 快捷键切换 agent mode | 未实现（App 层可扩展） | 低影响，待 agent mode 支持后添加 |
| Ctrl+S 切换模式 | 快捷键切换 smart/code/ask | 未实现 | 低影响 |
| Ctrl+V 图片粘贴 | base64 图片解析 | 未实现 | 需要粘贴内容类型检测 |
| 焦点陷阱 (Focus Trap) | Overlay 内 Tab 不逃逸 | 未实现 | 中等影响，overlay 场景需要 |
| 显式焦点恢复 | Overlay 关闭后恢复 | 依赖 autofocus 机制 | 低影响，当前机制可工作 |

### 11.4 Flutter 原版有但 Amp 和 flitter-core 都没有的 ⚪

| 特性 | Flutter 原版 | 说明 |
|------|------------|------|
| `Shortcuts` Widget | Intent/Action 模式 | 声明式快捷键绑定，支持继承和覆盖 |
| `ShortcutActivator` | 抽象快捷键匹配器 | SingleActivator, CharacterActivator, LogicalKeySet |
| `Intent` / `Action` | 命令模式 | 将快捷键与具体行为解耦 |
| `FocusTraversalPolicy` | 可替换的遍历策略 | ReadingOrder, Ordered, Widget Order |
| `FocusTraversalGroup` | 遍历分组 | 限制 Tab 遍历在特定子树内 |
| `FocusTrapArea` | 焦点陷阱 | 防止焦点逃出 overlay |
| `skipRequestFocus` | FocusScope 属性 | 进入时不自动获取焦点 |
| `KeyEventResult.skipRemainingHandlers` | 第三种结果 | 跳过同节点剩余 handler 但继续冒泡 |
| `onKeyEvent` (新版) | 替代 onKey | Flutter 新版使用 KeyEvent 替代 RawKeyEvent |
| `FocusNode.enclosingScope` | 获取最近作用域 | 便利方法 |
| `FocusManager.highlightMode` | 高亮策略 | touch vs traversal 模式 |

---

## 12. 运行时焦点树可视化

### 12.1 Amp 典型运行时焦点树

```
FocusScopeNode [Root Focus Scope]          ← FocusManager.rootScope
└── FocusNode [App FocusScope]              ← t4, autofocus:true
    ├── FocusNode [ScrollView]              ← SingleChildScrollView.FocusScope
    │   └── (skipTraversal: true)
    ├── FocusNode [InputArea TextField]     ← TextField 内部的 FocusScope
    │       ↑ primaryFocus (通常)
    └── FocusNode [SelectionList]           ← 仅在 overlay 激活时存在
            ↑ primaryFocus (overlay 模式)
```

### 12.2 键盘事件路由示例

```
场景 1: 用户在 InputArea 输入字符 'a'
  stdin → InputParser → EventDispatcher
    → Step 1: interceptors (无匹配)
    → Step 2: FocusManager.dispatch
      → TextField.handleKeyEvent('a') → 'handled' (插入字符)
    → STOP

场景 2: 用户按 Ctrl+O 打开命令面板
  stdin → InputParser → EventDispatcher
    → Step 1: interceptors (无匹配)
    → Step 2: FocusManager.dispatch
      → TextField.handleKeyEvent(Ctrl+O) → 'ignored'
      → App FocusScope.handleKeyEvent(Ctrl+O) → 'handled' (打开 CommandPalette)
    → STOP

场景 3: 用户按 Ctrl+C
  stdin → InputParser → EventDispatcher
    → Step 1: interceptors → 'handled' (Ctrl+C 被全局拦截器捕获)
    → STOP (不进入焦点系统)

场景 4: CommandPalette 打开，用户按 Escape
  stdin → InputParser → EventDispatcher
    → Step 1: interceptors (无匹配)
    → Step 2: FocusManager.dispatch
      → SelectionList.handleKeyEvent(Escape) → 'handled' (调用 onCancel)
      → App FocusScope 收到 onDismiss 回调 → setState → 关闭 CommandPalette
    → STOP

    注: Escape 在 SelectionList 层就被处理，不冒泡到 App FocusScope。
    但 App FocusScope 的 onKey 也有 Escape 处理，作为备选路径。
```

---

## 13. 测试覆盖

### 13.1 focus.test.ts 测试矩阵

| 测试类别 | 用例数 | 覆盖范围 |
|---------|-------|---------|
| FocusNode 创建 | 3 | 默认选项 / 自定义选项 / 部分选项 |
| 树结构管理 | 7 | attach / detach / 多子节点 / 重新挂载 / 幂等 / 深层树 |
| requestFocus | 6 | 基本获焦 / 祖先 hasFocus / 焦点切换 / canRequestFocus=false / disposed / 重复请求 |
| unfocus | 3 | 基本取消 / 祖先 hasFocus 清除 / 无焦点时的幂等 |
| canRequestFocus setter | 2 | 设为 false 自动 unfocus / 同值幂等 |
| key event handling | 7 | onKey / ignored / 无 handler / addKeyHandler / 多 handler 优先级 / onKey 优先 / fallthrough |
| listeners | 4 | add/remove / 多监听器 / 祖先通知 / 移除不存在的监听器 |
| focus traversal | 9 | nextFocus / wrap around / previousFocus / skipTraversal / canRequestFocus / DFS 顺序 / 返回值 / 不在列表中 |
| dispose | 5 | 清除焦点 / detach 父节点 / detach 子节点 / 清除 handlers / 幂等 |
| FocusScopeNode | 5 | 继承关系 / focusedChild 追踪 / autofocus / 非后代 autofocus / 深层后代 |
| FocusManager | 12 | 单例 / reset / rootScope / primaryFocus / 焦点切换 / register/unregister / dispatchKeyEvent / 冒泡 / 停止传播 / 多级冒泡 / dispatchPasteEvent / getTraversableNodes |

**总计: ~60+ 测试用例**，覆盖焦点系统的所有核心路径。

### 13.2 shortcuts.test.ts 测试矩阵

| 测试类别 | 用例数 | 覆盖范围 |
|---------|-------|---------|
| 精确匹配 | 6 | 无修饰键 / ctrl / alt / shift / meta / 错误 key |
| 修饰键不匹配 | 3 | event 有 ctrl 但 binding 没有 / binding 要 ctrl 但 event 没有 / 默认 false |
| 组合修饰键 | 4 | ctrl+shift / 部分匹配失败 / ctrl+alt+delete / 四修饰键全 |
| 特殊键 | 3 | 箭头键 / Escape / Space |

**总计: 16 测试用例**

### 13.3 keyboard.test.ts 测试矩阵

| 测试类别 | 用例数 | 覆盖范围 |
|---------|-------|---------|
| LogicalKey 常量 | 4 | 箭头键 / F 键 / 导航键 / 动作键 |
| isModifierKey | 2 | 修饰键识别 / 非修饰键排除 |
| keyFromCharCode | 3 | 控制字符映射 / 可打印 ASCII / 特殊单字节 |
| isPrintableKey | 4 | 字母/数字 / Space / 特殊键排除 / 修饰键排除 |
| LOW_LEVEL_TO_TUI_KEY | 3 | 箭头映射 / 导航映射 / 动作键映射 |

**总计: 16 测试用例**
