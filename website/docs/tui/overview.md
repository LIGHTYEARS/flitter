# TUI 框架概述

`@flitter/tui` 是 Flitter 的核心包——一个完整的 Flutter-for-Terminal UI 框架。它将 Flutter 的三棵树架构（Widget → Element → RenderObject）完整移植到终端环境。

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
| 滚动系统 | `scroll/` | ScrollController、ListView、Scrollbar、ScrollBehavior |
| 文本编辑 | `editing/` | TextEditingController、TextField |
| 弹层系统 | `overlay/` | Overlay、CommandPalette、FuzzyPicker |
| 焦点系统 | `focus/` | FocusNode、FocusManager |
| Actions 系统 | `actions/` | Actions、Shortcuts、Intent、KeyActivator |
| Markdown | `markdown/` | MarkdownParser、MarkdownRenderer |
