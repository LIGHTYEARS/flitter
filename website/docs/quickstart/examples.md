# 示例程序

> 这一页列出了 Flitter 的所有可运行示例。每个示例都是独立的单文件程序，直接用 `bun run` 即可执行。建议按照「推荐学习顺序」逐个体验，从简单到复杂，循序渐进。

## 推荐学习顺序

如果你是第一次接触 Flitter，建议按以下顺序学习：

1. **综合展示** —— 先跑一遍，对框架能力有个整体印象
2. **文本样式** —— 了解最基础的文本渲染
3. **布局系统** —— 学习 Column、Row、Flex 等核心布局概念
4. **Container 与装饰** —— 了解容器、边框、间距的用法
5. **交互演示** —— 学习状态管理和事件处理
6. **滚动列表** —— 掌握长内容的滚动展示
7. **其余示例** —— 根据兴趣自由探索

---

## 入门示例

这些示例展示基础概念，适合刚开始学习 Flitter 的新手。

### 综合展示

```bash
bun run examples/tui-kitchen-sink.ts
```

一次看到所有核心 Widget 的综合 Demo。包括文本样式、各种布局、交互组件、滚动列表等。**这是了解 Flitter 能做什么的最快方式。**

运行后你会看到一个多区域的终端界面，可以用鼠标点击各个区域进行交互。

### 文本样式

```bash
bun run examples/tui-text-demo.ts
```

展示 Text、RichText、TextSpan 等文本渲染能力。你会看到不同颜色、粗体、斜体、下划线等样式效果。这是终端 UI 中最基础的组件，类似于 HTML 中的 `<span>` 标签。

### 布局系统

```bash
bun run examples/tui-layout-demo.ts
```

展示 Column（垂直排列）、Row（水平排列）、Flex（弹性布局）、Stack（层叠布局）、Expanded、Spacer 等布局 Widget 的使用。如果你用过 CSS Flexbox，这些概念会非常熟悉。

---

## 进阶示例

这些示例展示更丰富的交互和组件，适合已经理解基础概念的开发者。

### Container 与装饰

```bash
bun run examples/tui-container-demo.ts
```

展示 Container、BoxDecoration、Border、Padding 等装饰性 Widget。类似于 CSS 中的 `box-model` 概念 —— 容器可以有边框、内边距、背景色等。

### 交互演示

```bash
bun run examples/tui-interactive-demo.ts
```

演示鼠标点击、悬停状态变化、StatefulWidget 状态管理。这个示例展示了 Flitter 的事件处理机制，类似于 React 中的 `onClick` 和 `useState`。试着点击界面中的各个元素，观察状态变化。

### 滚动列表

```bash
bun run examples/tui-scroll-demo.ts
```

展示 ListView、ScrollController、ScrollPhysics 等滚动系统。你会看到一个可滚动的长列表，支持鼠标滚轮和惯性滚动（类似于手机上的滑动效果）。

### Markdown 渲染

```bash
bun run examples/tui-markdown-demo.ts
```

展示终端内的 Markdown 渲染能力，支持 GFM（GitHub Flavored Markdown）语法、代码块语法高亮。这是 AI 编程助手展示回答内容的核心组件。

---

## 高级示例

这些示例展示框架的高级能力，适合想深入了解 Flitter 架构的开发者。

### 文本编辑

```bash
bun run examples/tui-editing-demo.ts
```

展示 TextField、TextEditingController、光标移动、编辑历史。这是一个完整的终端文本编辑器组件，支持光标导航、文本选择、撤销 / 重做等操作。

### Overlay 弹层

```bash
bun run examples/tui-overlay-demo.ts
```

展示 Overlay、OverlayEntry、LayerLink 等弹层系统。弹层是「浮动在其他内容之上」的 UI 元素，类似于 Web 中的模态框（Modal）或下拉菜单（Dropdown）。

### 命令面板

```bash
bun run examples/tui-command-palette-demo.ts
```

展示 CommandPalette 和 FuzzyPicker 的交互式模糊搜索、键盘导航、快捷键显示。类似于 VS Code 中按 `Cmd+Shift+P` 打开的命令面板 —— 输入关键词即可快速搜索和执行命令。

### 调试绘制管线

```bash
bun run examples/debug-paint-pipeline.ts
```

这是一个开发调试工具，可视化展示 Widget 的完整渲染流程：Build → Layout → Paint → Render。适合想深入理解 Flitter 三棵树架构内部工作原理的开发者。

---

## CLI Agent 使用示例

除了 TUI 组件示例外，Flitter 的核心功能是作为 AI 编程助手运行。以下是几种常见的使用方式。

:::info 前提条件
使用 CLI Agent 功能需要配置 LLM API Key。详见 [快速开始](./getting-started.md) 中的配置说明。
:::

### 交互式对话

```bash
# 启动交互式 TUI 界面
bun run apps/flitter-cli/src/index.ts
```

启动后你会进入一个交互式终端界面，可以直接与 AI 对话。以下是一些常用的斜杠命令：

| 命令 | 功能 |
|------|------|
| `/help` | 查看所有可用命令 |
| `/model` | 切换 LLM 模型 |
| `/mode` | 切换 Agent 模式（smart / fast / deep / auto） |
| `/theme` | 切换界面主题 |
| `/compact` | 压缩上下文（对话太长时使用） |
| `/cost` | 查看 Token 消耗和费用 |
| `/mcp` | 管理 MCP 服务器连接 |

### 单次执行

适合脚本集成或快速提问的场景：

```bash
# Print 模式 —— 问一个问题，得到答案后退出
bun run apps/flitter-cli/src/index.ts --print "列出所有 TODO"

# Pipe 模式 —— 将文件内容通过管道传给 AI
cat src/main.ts | bun run apps/flitter-cli/src/index.ts --pipe "审查这段代码"

# Execute 模式 —— 让 AI 自主完成一个任务
bun run apps/flitter-cli/src/index.ts --execute "重构 utils 目录"
```

:::tip 退出示例程序
所有示例和 CLI 程序都可以通过 `Ctrl+C` 退出。如果界面异常，按 `Ctrl+C` 后终端会自动恢复正常显示。
:::
