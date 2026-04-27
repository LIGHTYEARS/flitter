# 项目介绍

> 这一页帮助你快速理解 Flitter 是什么、能做什么、为什么值得学习。如果你已经迫不及待想动手，可以直接跳到 [快速开始](./getting-started.md)。

## 什么是 Flitter？

Flitter 是一个 **Flutter-for-Terminal** 框架，用于构建高性能的终端 UI 应用和 AI 编程助手。

简单来说：**如果 Flutter 是用来构建移动端 App 的，那么 Flitter 就是用来构建终端 App 的。** 它将 Flutter 的核心架构（Widget → Element → RenderObject 三棵树）完整移植到了终端环境，让你能用声明式的方式构建复杂的终端界面。

项目名称 = **Fl**utter + Fl**itter**（终端中的 Flutter）。

:::tip 如果你熟悉 React 或 Flutter
Flitter 的开发体验和 React/Flutter 非常相似 —— 用组件（Widget）描述你想要的界面，框架负责高效地渲染和更新。如果你写过 `useState` 或 `StatefulWidget`，上手 Flitter 会非常自然。
:::

## Flitter 能做什么？

Flitter 不只是一个 UI 框架，它是一个完整的 AI Agent 开发平台。以下是几个典型的使用场景：

### 构建精美的终端 UI

告别简陋的命令行输出。用 40+ 内置组件构建真正交互式的终端应用 —— 带有布局系统、滚动列表、输入框、弹层、主题切换，就像在浏览器中用 React 构建 Web 应用一样。

### 打造你自己的 AI 编程助手

类似于 Cursor 或 Claude Code，但完全由你掌控。Flitter 提供了完整的 Agent 引擎 —— 从 LLM 对话、工具调用到多轮推理循环，开箱即用。

### 对接任意大模型

一套代码，自由切换 Claude、GPT、Gemini、Grok 等主流模型。内置模型降级链，主模型过载时自动切换备选，确保服务稳定。

### 通过 MCP 连接一切

Model Context Protocol（MCP）让你的 AI Agent 能够连接外部工具、数据库、API。Flitter 完整实现了 MCP 协议，你的 Agent 可以轻松扩展能力边界。

---

## 核心特性详解

下面是 Flitter 各模块的详细能力介绍。如果你是初次了解，建议先看完上面的概览，再按需深入。

### 终端 UI 框架（@flitter/tui）

这是 Flitter 的 UI 层，类似于 React 在 Web 中的角色，但运行在终端里。

**架构与渲染**
- 完整的 Flutter 三棵树架构：Widget、Element、RenderObject
- 声明式 UI：用 `StatefulWidget` / `StatelessWidget` 描述界面，就像写 React 组件
- 高性能渲染管线：diff-based ANSI 渲染，只更新变化的区域（类似于 React 的虚拟 DOM diff）

**组件库**
- 40+ 内置 Widget：Text、Column、Row、Flex、Stack、ListView、TextField、Badge、Toggle、ProgressBar、NotificationBanner、SplitPane、BrailleSpinner 等
- 8 套内置主题 + 自定义主题支持，颜色深度自适应（truecolor / 256 / 16 色）

**交互系统**
- 输入系统：键盘事件、SGR 鼠标协议、焦点管理、Actions / Shortcuts 快捷键
- 选区系统：跨 Widget 文本选择与剪贴板复制
- 物理滚动：FlingScrollPhysics 惯性滚动 + VelocityTracker 速度追踪

### AI Agent 引擎（@flitter/agent-core）

这是 Flitter 的「大脑」—— 负责 AI 推理、工具调用和任务编排。

**推理循环**
- ThreadWorker 推理循环：prompt 构建 → LLM 流式输出 → 工具执行 → 递归推理
- ThreadWorkerService：管理多线程 ThreadWorker 实例池
- 6 种 Agent 模式：Smart（Opus）、Fast（Haiku）、Deep（高推理）、Auto（自动选择）、Rush、Large

**工具系统**
- 19 个内置工具：Bash、Read、Write、Edit、Glob、Grep、FuzzyFind、DeleteFile、UndoEdit、WebSearch、ReadWebPage、ReadMcpResource、Skill、Task、TaskList、FindThread、ReadThread、CodeReview、Finder
- 6 个 GitHub 工具：仓库搜索、代码搜索、文件读取、目录列表、Diff 查看、Commit 搜索
- 工具权限系统：基于模式匹配的细粒度权限控制

**扩展机制**
- 插件系统：用户自定义 TypeScript 插件，支持 onToolCall / onToolResult 拦截钩子
- Hook 系统：PreToolUse / PostToolUse 生命周期钩子
- Handoff 机制：跨 Agent 任务移交

### 多模型集成（@flitter/llm）

统一的 LLM 接口层，让你不必关心底层模型差异。

**支持的模型提供商**
- Anthropic（Claude 系列）
- OpenAI（GPT / o 系列）
- Google Gemini（含 Vertex AI 认证）
- AWS Bedrock（Claude via SigV4）
- xAI（Grok 系列）
- 任意 OpenAI 兼容端点

**高级能力**
- 模型降级链：主模型过载时自动切换备选模型
- GenAI WebSocket Live Provider：实时双向流式通信
- 完整的 MCP（Model Context Protocol）实现，支持 stdio、SSE、StreamableHTTP、WebSocket
- MCP 信任存储：基于配置的 MCP 服务器访问控制
- OAuth 2.0 + PKCE 认证

### CLI 命令系统（@flitter/cli）

Flitter 的命令行入口，提供多种使用方式。

- 12 个命令处理器：login / logout、config、mcp、permissions、plugins、review、threads、tools、update 等
- 34 个斜杠命令：覆盖帮助、上下文管理、模型切换、主题、MCP、任务管理等
- 5 种运行模式：Interactive TUI、Execute、Headless JSON、Print、Pipe
- 完整的 CLI 标志：`--model`、`--mode`、`--api-key`、`--system-prompt`、`--max-turns` 等

### 数据层（@flitter/data）

负责状态持久化和配置管理。

- 线程持久化与上传管道
- 浏览器式线程导航（前进 / 后退历史栈）
- 多级配置合并（全局 / 工作区 / 项目三级）
- Skill 发现与解析
- 上下文压缩（Compaction）

## 技术栈

| 领域 | 技术 |
|------|------|
| 运行时 | Bun |
| 语言 | TypeScript 5.4（严格模式）|
| 模块系统 | ESM |
| 单仓管理 | Bun workspaces |
| 代码规范 | Biome 2.4 |
| 测试 | Bun test |
| Schema | Zod v4 |

:::info 技术选型说明
Flitter 选择 Bun 而非 Node.js 作为运行时，主要是因为 Bun 原生支持 TypeScript 执行（无需编译步骤），启动速度更快，且内置了测试框架和包管理器，简化了工具链。
:::

## 下一步

准备好动手了吗？

- **[快速开始](./getting-started.md)** —— 克隆项目、安装依赖、运行第一个示例
- **[项目结构](./project-structure.md)** —— 了解代码仓库的组织方式
- **[示例程序](./examples.md)** —— 浏览 11 个可运行的 TUI 示例
