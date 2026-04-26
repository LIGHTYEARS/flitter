# 三棵树架构

Flitter 完整实现了 Flutter 的三棵树（Three Trees）架构。理解这三棵树是掌握整个框架的关键。

## Widget 树

Widget 是 **不可变的配置描述**。每次状态变化时，框架会创建新的 Widget 树，与旧树对比。

```ts
// StatelessWidget：无状态，纯函数式
class MyLabel extends StatelessWidget {
  build() {
    return Text('Hello');
  }
}

// StatefulWidget：持有可变 State
class MyCounter extends StatefulWidget {
  createState() {
    return new MyCounterState();
  }
}

class MyCounterState extends State<MyCounter> {
  count = 0;

  build() {
    return Text(`Count: ${this.count}`);
  }
}
```

### 关键概念
- Widget 是轻量对象，创建和销毁代价很低
- `StatefulWidget` 的 State 跨重建保持
- `InheritedWidget` 用于向子树传递数据（类似 React Context）

## Element 树

Element 是 **Widget 的实例化**，负责：
- 管理 Widget 的生命周期（挂载、更新、卸载）
- 协调子树的 diff 和复用（reconciliation）
- 持有对 RenderObject 的引用

开发者通常不直接操作 Element 树。

## RenderObject 树

RenderObject 负责 **实际的布局和绘制**：
- `performLayout()` — 接收父级约束，计算自身尺寸，布局子节点
- `paint()` — 将内容写入 Screen buffer

### BoxConstraints

布局系统使用 `BoxConstraints`（最小/最大宽高）向下传递：

```
父级约束 → RenderObject.performLayout() → 确定尺寸 + 布局子节点
```

## BuildOwner 与 PipelineOwner

- **BuildOwner** — 管理脏 Element 列表，驱动 build 阶段
- **PipelineOwner** — 管理需要 layout/paint 的 RenderObject 列表，驱动 layout 和 paint 阶段

这两个 Owner 由 `WidgetsBinding` 在每一帧中按序调用。
