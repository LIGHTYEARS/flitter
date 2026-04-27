---
pageType: home

hero:
  name: Flitter
  text: |
    用 Flutter 的方式
    构建终端应用
  tagline: 像写 React 组件一样构建终端 UI，像用 VS Code 一样使用 AI 编程助手 —— 全部运行在你的终端里
  actions:
    - theme: brand
      text: 快速开始
      link: /quickstart/introduction
    - theme: alt
      text: TUI 框架
      link: /reference/overview

features:
  - title: 🌳 声明式 UI，终端也能用
    details: 将 Flutter 的 Widget → Element → RenderObject 三棵树架构带入终端。如果你用过 React 或 Flutter，会立刻感到熟悉 —— 用组件描述界面，框架负责高效渲染。
  - title: 🧩 40+ 开箱即用的组件
    details: 从基础的 Text、Flex 布局，到进阶的 ListView 滚动列表、TextField 输入框、Overlay 弹层 —— 常用的终端 UI 组件都已内置，拿来即用。
  - title: 🤖 一套代码对接多家大模型
    details: 统一的 LLM 接口，轻松切换 Anthropic Claude、OpenAI GPT、Google Gemini、xAI Grok 等主流模型，无需为每个模型写适配代码。
  - title: 🔌 MCP 协议全面支持
    details: 完整实现 Model Context Protocol，让你的 AI Agent 能够连接外部工具和数据源。支持 stdio、SSE、WebSocket 多种传输方式。
  - title: 🛠 丰富的内置工具集
    details: 19 个内置工具覆盖日常开发场景 —— 文件读写、代码搜索、Web 搜索、代码审查等。还有 6 个 GitHub 专用工具，开箱即用。
  - title: ⚡ 毫秒级启动，流畅交互
    details: 基于 Bun 运行时，TypeScript 原生执行无需编译。diff-based 渲染引擎只更新变化的区域，终端 UI 也能像 Web 一样流畅。
  - title: 🎨 8 套主题，一键切换
    details: 内置 Terminal、Dark、Light、Catppuccin Mocha 等 8 套精心设计的主题，支持自定义主题和运行时热切换，让终端也赏心悦目。
  - title: 🔧 全面可扩展
    details: TypeScript 插件系统 + 用户自定义 Shell 工具 + 34 个斜杠命令。无论是添加新工具、新命令还是新主题，都有清晰的扩展点。
---
