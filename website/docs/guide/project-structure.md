# 项目结构

Flitter 是一个 Bun workspaces 管理的 monorepo，包含 8 个 package 和 1 个 app。

## 目录结构

```
flitter/
├── packages/
│   ├── tui/           # @flitter/tui — 终端 UI 框架
│   ├── agent-core/    # @flitter/agent-core — Agent 核心引擎
│   ├── llm/           # @flitter/llm — LLM & MCP 集成
│   ├── data/          # @flitter/data — 数据持久化与配置
│   ├── cli/           # @flitter/cli — CLI 入口与命令
│   ├── flitter/       # @flitter/flitter — DI 组装层
│   ├── schemas/       # @flitter/schemas — Zod 数据 Schema
│   └── util/          # @flitter/util — 基础工具库
├── apps/
│   └── flitter-cli/   # CLI 二进制入口
├── examples/          # 9 个可运行的 TUI 示例
├── tests/             # 集成测试
└── amp-cli-reversed/  # 参考：amp 逆向源码
```

## 依赖关系

```
apps/flitter-cli
  └── @flitter/cli
        ├── @flitter/flitter (组装层)
        │     ├── @flitter/agent-core
        │     ├── @flitter/llm
        │     ├── @flitter/data
        │     ├── @flitter/util
        │     └── @flitter/schemas
        └── @flitter/tui (无内部依赖)
```

## 包职责概览

| 包名 | 职责 | 关键模块 |
|------|------|---------|
| `@flitter/tui` | Flutter-for-Terminal UI 框架 | Widget 树、渲染管线、布局引擎、输入系统、主题注册表（8 内置主题）、选区系统、物理滚动 |
| `@flitter/agent-core` | AI Agent 引擎 | ThreadWorker、ThreadWorkerService、19 内置工具 + 6 GitHub 工具、权限引擎、插件系统、Agent 模式、Hook 系统、Handoff、重试调度器 |
| `@flitter/llm` | LLM 接入层 | Provider 接口（Anthropic/OpenAI/Gemini/Bedrock/Grok）、MCP 协议、模型降级链、Vertex AI 认证、GenAI WebSocket、OAuth |
| `@flitter/data` | 状态与持久化 | 配置管理、线程存储与上传、线程导航、MCP 信任存储、Skill 系统、记忆系统 |
| `@flitter/cli` | CLI 界面 | 12 命令处理器、34 斜杠命令、5 种运行模式（交互/执行/无头/打印/管道）、CLI 标志转发 |
| `@flitter/flitter` | 依赖注入组装 | ServiceContainer、工厂函数 |
| `@flitter/schemas` | 类型定义 | Zod Schema、数据验证 |
| `@flitter/util` | 工具函数 | 响应式原语、日志、Git 工具 |
