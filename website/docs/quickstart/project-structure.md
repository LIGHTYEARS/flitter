# 项目结构

> 这一页帮助你理解 Flitter 的代码组织方式，让你能快速找到自己需要的模块。Flitter 是一个 monorepo（单仓多包）项目，不同功能分布在不同的包中。

## 新手导航指南

Flitter 包含 8 个 package，但你不需要一次性了解所有的。根据你的目标，只需关注对应的包：

:::tip 按使用场景选择关注的包
- **「我想用 Flitter 构建终端 UI 应用」** —— 重点关注 `@flitter/tui`，这是 UI 框架的核心
- **「我想构建 AI Agent / 编程助手」** —— 关注 `@flitter/agent-core`（Agent 引擎）和 `@flitter/llm`（模型接入）
- **「我想了解 Flitter CLI 的实现」** —— 从 `@flitter/cli` 入手，这是命令行界面的入口
- **「我只是想跑跑示例试试」** —— 直接看 `examples/` 目录即可，不需要深入源码
:::

## 目录结构

```
flitter/
├── packages/                # 核心代码包
│   ├── tui/                 # @flitter/tui — 终端 UI 框架（类似于 React）
│   ├── agent-core/          # @flitter/agent-core — AI Agent 核心引擎
│   ├── llm/                 # @flitter/llm — LLM 模型接入与 MCP 协议
│   ├── data/                # @flitter/data — 数据持久化与配置管理
│   ├── cli/                 # @flitter/cli — CLI 命令与界面逻辑
│   ├── flitter/             # @flitter/flitter — 依赖注入组装层
│   ├── schemas/             # @flitter/schemas — 数据类型定义（Zod Schema）
│   └── util/                # @flitter/util — 基础工具库
├── apps/
│   └── flitter-cli/         # CLI 程序的启动入口（很薄的一层）
├── examples/                # 11 个可运行的 TUI 示例
├── tests/                   # 集成测试
└── amp-cli-reversed/        # 参考：amp 逆向源码（开发用）
```

## 包之间的依赖关系

下面的依赖图展示了各个包之间的关系。箭头方向表示「依赖于」：

```
apps/flitter-cli              ← 程序入口，组装所有模块
  └── @flitter/cli            ← 命令行逻辑
        ├── @flitter/flitter  ← 依赖注入，把所有包粘合在一起
        │     ├── @flitter/agent-core  ← AI 推理引擎
        │     ├── @flitter/llm         ← LLM 模型接入
        │     ├── @flitter/data        ← 数据与配置
        │     ├── @flitter/util        ← 工具函数
        │     └── @flitter/schemas     ← 类型定义
        └── @flitter/tui      ← UI 框架（独立，无内部依赖）
```

:::info @flitter/tui 是独立的
注意 `@flitter/tui` 不依赖其他 Flitter 包。这意味着如果你只想用 TUI 框架构建终端 UI（不需要 AI 功能），只需要引入这一个包即可。这类似于你可以单独使用 React 而不需要 Next.js。
:::

## 包职责详解

下表列出了每个包的职责和关键模块，帮助你在需要修改或扩展某个功能时快速定位：

| 包名 | 一句话说明 | 关键模块 |
|------|----------|---------|
| `@flitter/tui` | 终端 UI 框架，类似于终端里的 React | Widget 树、渲染管线、布局引擎、输入系统、主题（8 套内置）、选区、物理滚动 |
| `@flitter/agent-core` | AI Agent 引擎，负责推理和工具调用 | ThreadWorker 推理循环、19 + 6 内置工具、权限引擎、插件系统、Agent 模式、Hook |
| `@flitter/llm` | LLM 接入层，统一多模型接口 | Provider 适配器（Anthropic / OpenAI / Gemini / Bedrock / Grok）、MCP 协议、模型降级链 |
| `@flitter/data` | 数据层，管理配置和持久化 | 配置合并（全局 / 工作区 / 项目）、线程存储、线程导航、MCP 信任、Skill 系统 |
| `@flitter/cli` | CLI 界面，用户交互的入口 | 12 个命令处理器、34 个斜杠命令、5 种运行模式 |
| `@flitter/flitter` | 依赖注入组装层 | ServiceContainer、工厂函数 |
| `@flitter/schemas` | 类型定义 | Zod Schema、数据验证 |
| `@flitter/util` | 基础工具函数 | 响应式原语、日志系统、Git 工具 |

## 其他重要目录

除了 `packages/` 下的核心代码，还有几个值得了解的目录：

- **`examples/`** —— 11 个独立的 TUI 示例，是学习框架用法的最佳起点。详见 [示例程序](./examples.md)
- **`tests/`** —— 端到端集成测试，验证各模块协同工作
- **`amp-cli-reversed/`** —— amp CLI 的逆向源码，Flitter 的参考实现。开发时会对照这里确保行为一致
- **`website/`** —— 就是你正在看的这个文档站点的源码

## 下一步

- **[示例程序](./examples.md)** —— 浏览可运行的示例，直观感受各组件的效果
- **[TUI 框架参考](../reference/overview.md)** —— 深入了解 Widget 系统和 API
