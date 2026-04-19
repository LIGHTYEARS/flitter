# 项目介绍

## 什么是 Flitter？

Flitter 是一个 **Flutter-for-Terminal** AI Agent 框架。它将 Flutter 的核心架构（三棵树：Widget → Element → RenderObject）完整移植到终端环境，用于构建高性能的 AI 编程助手 TUI 应用。

项目名称 = **Fl**utter + Fl**itter**（终端中的 Flutter）。

## 核心特性

### 终端 UI 框架（@flitter/tui）
- 完整的 Flutter 三棵树架构：Widget、Element、RenderObject
- 声明式 UI：用 `StatefulWidget`/`StatelessWidget` 描述界面
- 40+ 内置 Widget：Text、Column、Row、Flex、Stack、ListView、TextField、Badge、Toggle、ProgressBar、NotificationBanner、SplitPane、BrailleSpinner 等
- 高性能渲染管线：diff-based ANSI 渲染，只更新变化的区域
- 输入系统：键盘事件、SGR 鼠标协议、焦点管理、Actions/Shortcuts
- 8 套内置主题 + 自定义主题支持，颜色深度自适应（truecolor/256/16）
- 选区系统：跨 Widget 文本选择与剪贴板复制
- 物理滚动：FlingScrollPhysics 惯性滚动 + VelocityTracker 速度追踪

### AI Agent 引擎（@flitter/agent-core）
- ThreadWorker 推理循环：prompt 构建 → LLM 流式输出 → 工具执行 → 递归推理
- ThreadWorkerService：管理多线程 ThreadWorker 实例池
- 19 个内置工具：Bash、Read、Write、Edit、Glob、Grep、FuzzyFind、DeleteFile、UndoEdit、WebSearch、ReadWebPage、ReadMcpResource、Skill、Task、TaskList、FindThread、ReadThread、CodeReview、Finder
- 6 个 GitHub 工具：仓库搜索、代码搜索、文件读取、目录列表、Diff 查看、Commit 搜索
- 工具权限系统：基于模式匹配的细粒度权限控制 + reevaluateBlockedTools 动态重评估
- 6 种 Agent 模式：Smart（Opus）、Fast（Haiku）、Deep（高推理）、Auto（自动选择）、Rush、Large
- 插件系统：用户自定义 TypeScript 插件，支持 onToolCall/onToolResult 拦截钩子
- Hook 系统：PreToolUse/PostToolUse 生命周期钩子
- Handoff 机制：跨 Agent 任务移交
- 重试调度器：智能错误分类 + 指数退避重试

### 多模型集成（@flitter/llm）
- 统一 LLM Provider 接口，支持：
  - Anthropic（Claude 系列）
  - OpenAI（GPT/o 系列）
  - Google Gemini（含 Vertex AI 认证）
  - AWS Bedrock（Claude via SigV4）
  - xAI（Grok 系列）
  - 任意 OpenAI 兼容端点
- 模型降级链：主模型过载时自动切换备选模型
- GenAI WebSocket Live Provider：实时双向流式通信
- 完整的 MCP（Model Context Protocol）实现，支持 stdio、SSE、StreamableHTTP、WebSocket
- MCP 信任存储：基于配置的 MCP 服务器访问控制
- OAuth 2.0 + PKCE 认证

### CLI 命令系统（@flitter/cli）
- 12 个命令处理器：login/logout、config、mcp、permissions、plugins、review、threads、tools、update 等
- 34 个斜杠命令：/help、/clear、/compact、/cost、/model、/mode、/theme、/status、/new、/switch、/delete、/archive、/settings、/mcp、/tasks、/refresh、/editor、/history、/permissions、/plugins、/handoff、/back、/forward、/queue、/dequeue、/rename、/label、/visibility、/copy-url、/copy-id、/toggle-thinking-blocks、/dashboard 等
- 5 种运行模式：Interactive TUI、Execute、Headless JSON、Print、Pipe
- 完整的 CLI 标志：--model、--mode、--api-key、--system-prompt、--max-turns、--print、--pipe、--execute 等

### 数据层（@flitter/data）
- 线程持久化与上传管道
- 浏览器式线程导航（前进/后退历史栈）
- 多级配置合并（全局/工作区/项目三级）
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
