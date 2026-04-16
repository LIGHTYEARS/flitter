# 项目介绍

## 什么是 Flitter？

Flitter 是一个 **Flutter-for-Terminal** AI Agent 框架。它将 Flutter 的核心架构（三棵树：Widget → Element → RenderObject）完整移植到终端环境，用于构建高性能的 AI 编程助手 TUI 应用。

项目名称 = **Fl**utter + Fl**itter**（终端中的 Flutter）。

## 核心特性

### 终端 UI 框架（@flitter/tui）
- 完整的 Flutter 三棵树架构：Widget、Element、RenderObject
- 声明式 UI：用 `StatefulWidget`/`StatelessWidget` 描述界面
- 25+ 内置 Widget：Text、Column、Row、Flex、Stack、ListView、TextField 等
- 高性能渲染管线：diff-based ANSI 渲染，只更新变化的区域
- 输入系统：键盘事件、SGR 鼠标协议、焦点管理

### AI Agent 引擎（@flitter/agent-core）
- ThreadWorker 推理循环：prompt 构建 → LLM 流式输出 → 工具执行 → 递归推理
- 7 个内置工具：Bash、Read、Write、Edit、Glob、Grep、FuzzyFind
- 工具权限系统：基于模式匹配的细粒度权限控制
- SubAgent 支持：子代理管理与 Hook 系统

### 多模型集成（@flitter/llm）
- 统一 LLM Provider 接口，支持：
  - Anthropic（Claude 系列）
  - OpenAI（GPT/o 系列）
  - Google（Gemini 系列）
  - xAI（Grok 系列）
  - 任意 OpenAI 兼容端点
- 完整的 MCP（Model Context Protocol）实现
- OAuth 2.0 + PKCE 认证

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
