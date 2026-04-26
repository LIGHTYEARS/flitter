# 滚动系统

## 概述

`@flitter/tui` 的滚动系统实现了类 Flutter 的滚动架构，将**控制器**（状态管理）、**物理特性**（边界与惯性）、**可滚动容器**（Scrollable）和**列表视图**（ListView 虚拟化）分层解耦，让任意数量的内容都能高性能渲染。

## 核心概念

| 类 | 职责 |
|---|---|
| `ScrollController` | 管理滚动偏移、跟随模式、动画；发布变化通知 |
| `ClampingScrollPhysics` | 将偏移钳位到 `[0, maxScrollExtent]`（默认） |
| `FlingScrollPhysics` | 在 Clamping 基础上叠加惯性衰减 |
| `ScrollBehavior` | 解析键盘事件，映射为滚动指令（vim + 标准键位） |
| `Scrollable` | 持有 ScrollController，驱动 RenderScrollable 布局 |
| `ListView` | 懒加载虚拟化列表，只构建视口 + 缓冲区内的子项 |

**`ScrollController` 主要 API：**

```
offset              // 当前偏移量（只读）
maxScrollExtent     // 最大可滚动范围（只读）
followMode          // 跟随模式（读写）
atTop / atBottom    // 边界检测

jumpTo(offset)               // 立即跳转
scrollUp(lines) / scrollDown(lines)
scrollToTop() / scrollToBottom()
scrollPageUp(viewport) / scrollPageDown(viewport)
animateTo(target, duration)  // easeOutCubic 动画
updateMaxScrollExtent(extent) // 内容高度变化时调用
enableFollowMode() / disableFollowMode() / toggleFollowMode()
dispose()
```

## 基本用法

```typescript
import { ScrollController } from "@flitter/tui/scroll";
import { ListView } from "@flitter/tui/scroll";

// 1. 创建控制器
const controller = new ScrollController();

// 2. 创建虚拟化列表
const list = new ListView({
  controller,
  itemCount: 1000,
  itemBuilder: (index) => new Text(`Item ${index}`),
  itemExtent: 1,    // 每项固定行高
  cacheExtent: 5,   // 视口外缓冲行数
});

// 3. 编程控制
controller.scrollDown(3);
controller.scrollToBottom();
controller.animateTo(100, 200); // 200ms 动画
```

`itemBuilder` 只在项进入"视口 + `cacheExtent`"范围时才被调用，`itemCount=100000` 依然流畅。

## 进阶用法

### Scrollbar 集成

```typescript
import { Scrollable } from "@flitter/tui/scroll";
import { Scrollbar } from "@flitter/tui/widgets";

new Scrollbar({
  controller,
  child: new Scrollable({
    controller,
    child: contentWidget,
  }),
})
```

### ScrollBehavior：vim 键绑定

`ScrollBehavior` 将键盘事件转为滚动指令，支持完整 vim 键位：

| 键 | 动作 |
|---|---|
| `j` / `k` | 向下/上滚动 step 行 |
| `g` / `G` | 跳顶部 / 跳底部 |
| `Ctrl+d` / `Ctrl+u` | 向下/上翻半页 |
| `PageDown` / `PageUp` | 翻页 |
| `ArrowUp` / `ArrowDown` | 上下滚动 step 行 |

```typescript
import { ScrollBehavior } from "@flitter/tui/scroll";

const behavior = new ScrollBehavior(controller, "vertical", {
  scrollStep: 3,
  pageScrollStep: 10,
});
// 在 FocusNode.onKeyEvent 中调用：
behavior.handleKeyEvent(keyEvent);
```

### followMode：自动追尾

适用于流式日志场景——新内容追加时自动滚到底部：

```typescript
const controller = new ScrollController(); // followMode 默认 true

// 手动滚动时自动禁用跟随
controller.addListener(() => {
  if (!controller.atBottom) {
    controller.disableFollowMode();
  }
});

// 内容更新时通知控制器
function appendLine(line: string) {
  lines.push(line);
  controller.updateMaxScrollExtent(lines.length - viewportHeight);
}
```

### FlingScrollPhysics：惯性滚动

```typescript
import { FlingScrollPhysics } from "@flitter/tui/scroll";

const controller = new ScrollController({
  physics: new FlingScrollPhysics({ friction: 0.85 }),
});
```

## 与其他子系统的配合

- **焦点系统**：将 `ScrollBehavior.handleKeyEvent` 挂入 `FocusNode.onKeyEvent`，实现键盘焦点驱动滚动。
- **主题系统**：`Scrollbar` 的轨道色、滑块色通过 `AppTheme.scrollbar` 统一配置。
- **手势系统**：`MouseRegion` 的 `onScroll` 回调调用 `controller.scrollUp/Down`，实现鼠标滚轮。

## 完整示例

自动跟随日志查看器：

```typescript
const controller = new ScrollController(); // followMode=true

const app = new Column({
  children: [
    new Expanded({
      child: new ListView({
        controller,
        itemCount: logs.length,
        itemBuilder: (i) => new Text(logs[i]),
      }),
    }),
    new Text("↑手动滚动退出跟随  G跳底部恢复"),
  ],
});
```

:::tip 运行示例
```bash
bun run examples/tui-scrollable-demo.ts
```
:::

## 下一步

> 📖 详细 API: [滚动 Widget 参考](/reference/widgets/scroll)
