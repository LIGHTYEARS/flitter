# Widget 树子系统

> Widget → Element → RenderObject 三棵树的核心抽象。

---

## Widget

> 不可变的 UI 配置描述符，是所有 Widget 的抽象基类。

Widget 本身不持有状态，也不直接渲染——它描述"需要什么"，由 Element 负责实例化与协调。

**核心抽象方法**

```ts
abstract createElement(): Element
```

每种 Widget 子类必须实现此方法，返回与之配对的 Element 类型。

**canUpdate 规则**

```ts
// Widget 是否可以复用现有 Element（避免重新 mount）
// 规则：widget 构造函数相同 && key 相等（或均为 undefined）
Widget.canUpdate(oldWidget, newWidget): boolean
```

**Key**

```ts
import { Key, GlobalKey } from "@flitter/tui";

const k = new Key("my-key");        // 字符串或数字键
const gk = new GlobalKey("global");  // 全局键，可访问关联 Element
```

| 类 | 用途 |
|----|------|
| `Key` | 标识 Widget 以控制协调行为（值相等比较） |
| `GlobalKey` | 额外提供 `currentElement` 属性访问关联 Element |

---

## Element

> Widget 树的运行时节点，维护父子关系、脏标记和生命周期。

每个 Widget 对应一个 Element 实例（Widget 是蓝图，Element 是实例）。

### 生命周期

```
mount(parent, slot)    → 挂载到树，初始 dirty=true
  ↓ 首次 build/attach
update(newWidget)      → Widget 配置更新（可复用）
  ↓ 多次
deactivate()           → 从树中临时移除（等待复用或 unmount）
unmount()              → 永久移除，释放资源
```

**属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `widget` | `Widget` | 当前关联的 Widget |
| `parent` | `Element \| undefined` | 父元素（未挂载时为 undefined） |
| `children` | `readonly Element[]` | 子元素列表 |
| `dirty` | `boolean` | 是否需要重建（新元素默认 true） |
| `mounted` | `boolean` | 是否已挂载 |
| `depth` | `number` | 在树中的深度（根节点为 0） |
| `renderObject` | `RenderObject \| undefined` | 关联的渲染对象（仅 RenderObjectElement 有值） |

**BuildContext 接口**

Element 自身实现 BuildContext，build 方法接收的 `context` 即为 Element：

```ts
interface BuildContext {
  widget: Widget;
  findRenderObject(): RenderObject | undefined;
  findAncestorStateOfType<T>(type: new (...) => T): T | null;
}
```

**InheritedWidget 依赖**

```ts
// 在 build() 中订阅最近祖先的 InheritedWidget（订阅后数据变化自动触发重建）
context.dependOnInheritedWidgetOfExactType<MyTheme>()

// 查找祖先 Widget，不订阅（不触发重建）
context.findAncestorWidgetOfExactType<MyTheme>()
```

---

## 三种 Element 类型

| 类型 | 对应 Widget | 说明 |
|------|-------------|------|
| `StatelessElement` | `StatelessWidget` | 调用 widget.build(context) 获取子树 |
| `StatefulElement` | `StatefulWidget` | 持有 State 实例，State.build() 构建子树 |
| `RenderObjectElement` | `RenderObjectWidget` | 直接关联 RenderObject，不再 build 子 Widget |
| `InheritedElement` | `InheritedWidget` | 维护依赖方集合，数据变化时通知依赖方重建 |

### StatelessWidget

```ts
abstract class StatelessWidget extends Widget {
  abstract build(context: BuildContext): Widget;
  createElement(): Element { return new StatelessElement(this); }
}
```

### StatefulWidget + State

```ts
abstract class StatefulWidget extends Widget {
  abstract createState(): State<StatefulWidget>;
}

abstract class State<T extends StatefulWidget> {
  abstract build(context: BuildContext): Widget;
  setState(fn: () => void): void  // 触发重建
  // 生命周期: initState() → build() → didUpdateWidget() → dispose()
}
```

### InheritedWidget

```ts
abstract class InheritedWidget {
  abstract updateShouldNotify(oldWidget: this): boolean;
  // 返回 true → 通知所有依赖方重建
}
```

---

## RenderObject

> 渲染树节点，负责布局与绘制。抽象基类，子类必须实现 performLayout()。

**属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `parent` | `RenderObject \| null` | 父节点 |
| `children` | `readonly RenderObject[]` | 子节点列表 |
| `needsLayout` | `boolean` | 是否需要重新布局 |
| `needsPaint` | `boolean` | 是否需要重新绘制 |
| `attached` | `boolean` | 是否已挂载到渲染树 |
| `depth` | `number` | 在渲染树中的深度 |
| `allowHitTestOutsideBounds` | `boolean` | 允许命中测试穿透到节点边界外的子节点（默认 false） |

**抽象方法**

```ts
abstract performLayout(): void
// 子类在此设置 this.size，并为子节点调用 child.layout(constraints)
```

**关键方法**

| 方法 | 说明 |
|------|------|
| `markNeedsLayout()` | 标记需要重新布局（向上传播到布局边界） |
| `markNeedsPaint()` | 标记需要重新绘制（向上传播） |
| `paint(screen, offset)` | 绘制到 Screen（子类覆盖实现具体绘制） |
| `performHitTest(result, position)` | 命中测试（子类覆盖，默认检查 size 矩形） |
| `adoptChild(child)` | 将子节点挂载到本节点 |
| `dropChild(child)` | 从本节点移除子节点 |

---

## RenderBox

> 盒模型渲染对象，在 RenderObject 基础上添加尺寸、偏移和约束。

```ts
abstract class RenderBox extends RenderObject {
  get size(): Size                          // 当前尺寸（浅拷贝）
  set size(value: Size)                     // 只允许有限数值
  get offset(): Position                    // 相对父节点的偏移
  set offset(value: Position)
  layout(constraints: BoxConstraints): void // 布局入口（带约束缓存优化）
  abstract performLayout(): void            // 子类实现
}
```

---

## BoxConstraints

> 描述子组件可接受的最小/最大宽高范围，不可变。

**构造**

```ts
new BoxConstraints({ minWidth?, maxWidth?, minHeight?, maxHeight? })
```

**工厂方法**

| 方法 | 说明 |
|------|------|
| `BoxConstraints.tight(w, h)` | 紧约束：min === max |
| `BoxConstraints.loose(w, h)` | 松约束：min=0, max=给定值 |
| `BoxConstraints.tightFor({ width?, height? })` | 指定维度紧约束，未指定为 0..∞ |

**计算属性**

| 属性 | 说明 |
|------|------|
| `hasBoundedWidth` | maxWidth 是否有限 |
| `hasBoundedHeight` | maxHeight 是否有限 |
| `hasTightWidth` / `hasTightHeight` | 是否为紧约束 |
| `isTight` | 宽高均为紧约束 |

**实例方法**

```ts
constraints.constrain(size: Size): Size
// 将尺寸限制在约束范围内

constraints.enforce(other: BoxConstraints): BoxConstraints
// 返回两个约束的交集

constraints.copyWith({ minWidth?, maxWidth?, minHeight?, maxHeight? }): BoxConstraints
```
