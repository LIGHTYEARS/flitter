# 示例程序

Flitter 提供了 11 个独立的 TUI 示例，覆盖框架的各项核心能力。每个示例都可以直接用 `bun run` 执行。

## 综合展示

```bash
bun run examples/tui-kitchen-sink.ts
```

展示所有核心 Widget 的综合 Demo，包括文本样式、布局、交互、滚动等。

## 交互演示

```bash
bun run examples/tui-interactive-demo.ts
```

演示鼠标点击、悬停状态变化、StatefulWidget 状态管理。

## 布局系统

```bash
bun run examples/tui-layout-demo.ts
```

展示 Column、Row、Flex、Stack、Expanded、Spacer 等布局 Widget 的使用。

## Container 与装饰

```bash
bun run examples/tui-container-demo.ts
```

展示 Container、BoxDecoration、Border、Padding 等装饰性 Widget。

## 文本样式

```bash
bun run examples/tui-text-demo.ts
```

展示 Text、RichText、TextSpan 等文本渲染能力。

## 滚动列表

```bash
bun run examples/tui-scroll-demo.ts
```

展示 ListView、ScrollController、ScrollPhysics 等滚动系统。

## Markdown 渲染

```bash
bun run examples/tui-markdown-demo.ts
```

展示终端内 Markdown 渲染，支持 GFM 语法、代码高亮。

## 文本编辑

```bash
bun run examples/tui-editing-demo.ts
```

展示 TextField、TextEditingController、光标移动、编辑历史。

## Overlay 弹层

```bash
bun run examples/tui-overlay-demo.ts
```

展示 Overlay、OverlayEntry、LayerLink、CommandPalette 等弹层系统。

## 命令面板

```bash
bun run examples/tui-command-palette-demo.ts
```

展示 CommandPalette 和 FuzzyPicker 的交互式模糊搜索、键盘导航、快捷键显示。

## 调试绘制管线

```bash
bun run examples/debug-paint-pipeline.ts
```

调试工具：可视化 Widget 的 Build → Layout → Paint → Render 帧管线流程。

## CLI Agent 使用示例

除了 TUI 组件示例外，Flitter 的核心功能是作为 AI 编程助手运行。

### 交互式对话

```bash
# 启动交互式 TUI（需要设置 ANTHROPIC_API_KEY）
bun run apps/flitter-cli/src/index.ts
```

启动后可使用斜杠命令：
- `/help` — 查看所有可用命令
- `/model` — 切换 LLM 模型
- `/mode` — 切换 Agent 模式（smart/fast/deep/auto）
- `/theme` — 切换主题
- `/compact` — 压缩上下文
- `/cost` — 查看 Token 消耗和费用
- `/mcp` — 管理 MCP 服务器

### 单次执行

```bash
# Print 模式：单次输出
bun run apps/flitter-cli/src/index.ts --print "列出所有 TODO"

# Pipe 模式：从 stdin 读取
cat src/main.ts | bun run apps/flitter-cli/src/index.ts --pipe "审查这段代码"

# Execute 模式
bun run apps/flitter-cli/src/index.ts --execute "重构 utils 目录"
```
