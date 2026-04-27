# TUI 框架概述

本页是 Flitter 参考文档的入口。无论你是刚上手的新开发者，还是需要快速查阅 API 细节的老用户，都可以从这里找到方向。

`@flitter/tui` 是 Flitter 的核心包——一个完整的 Flutter-for-Terminal UI 框架。它将 Flutter 的三棵树架构（Widget → Element → RenderObject）完整移植到终端环境。

## 如何使用本参考文档

:::tip 教程 vs 参考
**教程**（Tutorial）是循序渐进的学习路径，适合第一次接触 Flitter 的开发者，带你从零搭建应用。

**参考**（Reference）是按主题组织的 API 速查手册，适合已经了解基本概念、需要查阅具体参数和用法的开发者。

如果你还没跑过 Flitter 的 Hello World，建议先去教程区走一遍，再回来查参考。
:::

**推荐阅读顺序：**

1. **核心类型** -- 先了解 `EdgeInsets`、`BoxConstraints`、`Key` 等贯穿全框架的基础类型
2. **颜色与样式** -- 掌握 `Color`、`TextStyle` 和主题系统
3. **Widget 参考** -- 按需查阅布局、文本、交互等各类 Widget 的详细 API
4. **工具系统** -- 了解内置工具的接口和用法
5. **子系统 API** -- 仅在需要深度定制时查阅（大多数开发者不需要）

## 核心理念

与 Flutter 一样，Flitter TUI 采用声明式 UI 范式：

1. **Widget** — 不可变的 UI 描述，定义「界面长什么样」
2. **Element** — Widget 的实例化，管理生命周期和子树协调
3. **RenderObject** — 负责实际的布局计算和绘制

开发者只需关心 Widget 层——框架负责高效地将声明式描述转化为终端输出。

## 最小示例

```ts
import { runApp, Center, Text } from '@flitter/tui';

runApp(
  Center({
    child: Text('Hello, Terminal!'),
  })
);
```

## 帧管线

每一帧的处理流程：

1. **Build** — 脏 Element 重新调用 `widget.build()`，生成新的子 Widget 树
2. **Layout** — 从根开始，向下传递约束（BoxConstraints），向上返回尺寸
3. **Paint** — 遍历需要重绘的 RenderObject，写入 Screen buffer
4. **Render** — diff-based ANSI 渲染，只输出变化的单元格

## 模块组成

| 模块 | 路径 | 职责 |
|------|------|------|
| 三棵树核心 | `tree/` | Widget、Element、RenderObject 基类 |
| 绑定层 | `binding/` | WidgetsBinding、帧调度、runApp |
| 屏幕模型 | `screen/` | Screen buffer、AnsiRenderer |
| 输入解析 | `vt/` | VT/ANSI 输入解析、SGR 鼠标 |
| 终端控制 | `tui/` | TuiController、raw mode、resize |
| 手势系统 | `gestures/` | MouseManager、HitTest |
| 内置 Widget | `widgets/` | 30+ 预置组件 |
| 滚动系统 | `scroll/` | ScrollController、ListView、Scrollbar、ScrollBehavior、FlingScrollPhysics、VelocityTracker |
| 文本编辑 | `editing/` | TextEditingController、TextField |
| 弹层系统 | `overlay/` | Overlay、CommandPalette、FuzzyPicker、ConfirmDialog、PopupOverlay、PromptDialog |
| 焦点系统 | `focus/` | FocusNode、FocusManager |
| Actions 系统 | `actions/` | Actions、Shortcuts、Intent、KeyActivator |
| Markdown | `markdown/` | MarkdownParser、MarkdownRenderer |
| 主题系统 | `theme/` | ThemeRegistry、ThemeSpec、ColorPalette，8 套内置主题 + 自定义主题 |
| 选区系统 | `selection/` | SelectionArea、Selectable、Clipboard，跨 Widget 文本选择 |

:::tip 快速参考：最常用模块
大多数应用开发只需关注三个模块：**内置 Widget**（`widgets/`）用于搭建界面，**绑定层**（`binding/`）中的 `runApp` 用于启动应用，以及**主题系统**（`theme/`）用于控制视觉风格。其余模块在需要深度定制时再查阅即可。
:::
