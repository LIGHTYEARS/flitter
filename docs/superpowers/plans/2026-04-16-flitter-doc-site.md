# Flitter 文档站实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chinese-language documentation site for the Flitter project using rspress, covering project introduction, architecture, TUI framework guide, agent system, and quick-start tutorials.

**Architecture:** The doc site lives in a new `website/` directory at the monorepo root, following rspress conventions. Since the docs are primarily Chinese, we use a single-language setup (`lang: 'zh'`) with no i18n directory nesting. Content is organized into 4 sections: guide (入门), tui (TUI 框架), architecture (架构), and api (API 参考).

**Tech Stack:** rspress v2, React 19, TypeScript, pnpm (for the doc site workspace — independent from the monorepo's bun workspaces to avoid tool conflicts)

---

## File Structure

```
website/
├── docs/
│   ├── index.md                          # 首页 (pageType: home)
│   ├── _nav.json                         # 顶部导航栏
│   ├── guide/
│   │   ├── _meta.json                    # 侧边栏排序
│   │   ├── introduction.md               # 项目介绍
│   │   ├── getting-started.md            # 快速开始
│   │   ├── project-structure.md          # 项目结构
│   │   └── examples.md                   # 示例运行
│   ├── tui/
│   │   ├── _meta.json
│   │   ├── overview.md                   # TUI 框架概述
│   │   ├── three-tree.md                 # 三棵树架构
│   │   ├── widgets.md                    # 内置 Widget
│   │   ├── layout.md                     # 布局系统
│   │   ├── rendering.md                  # 渲染管线
│   │   └── input-handling.md             # 输入与手势
│   ├── architecture/
│   │   ├── _meta.json
│   │   ├── monorepo.md                   # Monorepo 架构
│   │   ├── agent-core.md                 # Agent 引擎
│   │   ├── llm-integration.md            # LLM 集成
│   │   └── data-layer.md                 # 数据层
│   └── api/
│       ├── _meta.json
│       ├── tui-widgets.md                # Widget API 参考
│       └── agent-tools.md                # 工具系统 API
├── public/
│   └── logo.svg                          # 站点 Logo
├── theme/
│   ├── index.tsx                         # 主题入口（重导出默认主题）
│   └── index.css                         # 品牌色自定义
├── rspress.config.ts                     # rspress 配置
├── package.json                          # 文档站依赖
└── tsconfig.json                         # TypeScript 配置
```

---

## Task 1: 初始化 rspress 项目骨架

**Files:**
- Create: `website/package.json`
- Create: `website/tsconfig.json`
- Create: `website/rspress.config.ts`
- Create: `website/theme/index.tsx`
- Create: `website/theme/index.css`
- Create: `website/public/logo.svg`

- [ ] **Step 1: 创建 `website/package.json`**

```json
{
  "name": "flitter-docs",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "rspress dev",
    "build": "rspress build",
    "preview": "rspress preview"
  },
  "devDependencies": {
    "@rspress/core": "^2.0.0-beta.12",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: 创建 `website/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["rspress.config.ts", "theme/**/*"]
}
```

- [ ] **Step 3: 创建 `website/rspress.config.ts`**

```ts
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: 'docs',
  title: 'Flitter',
  description: 'Flutter-for-Terminal AI Agent 框架',
  lang: 'zh',
  logo: '/logo.svg',
  icon: '/logo.svg',
  themeConfig: {
    footer: {
      message: '© 2025 Flitter Project. MIT License.',
    },
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/user/flitter',
      },
    ],
    lastUpdated: true,
  },
  markdown: {
    defaultWrapCode: true,
  },
});
```

- [ ] **Step 4: 创建 `website/theme/index.tsx`**

```tsx
export * from '@rspress/core/theme-original';
```

- [ ] **Step 5: 创建 `website/theme/index.css`**

```css
:root {
  --rp-c-brand: #6366f1;
  --rp-c-brand-dark: #4f46e5;
  --rp-c-brand-light: #818cf8;
}
```

- [ ] **Step 6: 创建 `website/public/logo.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="16" fill="#6366f1"/>
  <text x="50" y="62" text-anchor="middle" font-family="monospace" font-size="48" font-weight="bold" fill="white">F</text>
</svg>
```

- [ ] **Step 7: 安装依赖并验证启动**

```bash
cd website && pnpm install
```

暂时先不运行 `dev`，等内容页面创建后再验证。

- [ ] **Step 8: Commit**

```bash
git add website/package.json website/tsconfig.json website/rspress.config.ts website/theme/ website/public/
git commit -m "docs: init rspress doc site skeleton"
```

---

## Task 2: 创建首页和导航结构

**Files:**
- Create: `website/docs/index.md`
- Create: `website/docs/_nav.json`

- [ ] **Step 1: 创建 `website/docs/index.md`**

```md
---
pageType: home

hero:
  name: Flitter
  text: |
    Flutter-for-Terminal
    AI Agent 框架
  tagline: 将 Flutter 的三棵树架构带入终端，构建高性能 AI 编程助手
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/introduction
    - theme: alt
      text: TUI 框架
      link: /tui/overview

features:
  - title: 三棵树架构
    details: 完整实现 Flutter 的 Widget → Element → RenderObject 三棵树架构，声明式 UI 开发体验
    icon: "\U0001F333"
  - title: 25+ 内置 Widget
    details: Text、Flex、Stack、ListView、TextField、Overlay 等丰富的终端 UI 组件库
    icon: "\U0001F9E9"
  - title: 多 LLM 支持
    details: 统一接口对接 Anthropic、OpenAI、Gemini、Grok 等主流大模型
    icon: "\U0001F916"
  - title: MCP 协议
    details: 完整的 Model Context Protocol 实现，支持 stdio、SSE、WebSocket 多种传输
    icon: "\U0001F50C"
  - title: 内置工具系统
    details: Bash、Read、Write、Edit、Glob、Grep、FuzzyFind 七大内置工具
    icon: "\U0001F6E0"
  - title: 极速性能
    details: 基于 Bun 运行时，TypeScript 原生执行，毫秒级启动
    icon: "\U000026A1"
---
```

- [ ] **Step 2: 创建 `website/docs/_nav.json`**

```json
[
  {
    "text": "指南",
    "link": "/guide/introduction",
    "activeMatch": "/guide/"
  },
  {
    "text": "TUI 框架",
    "link": "/tui/overview",
    "activeMatch": "/tui/"
  },
  {
    "text": "架构",
    "link": "/architecture/monorepo",
    "activeMatch": "/architecture/"
  },
  {
    "text": "API",
    "link": "/api/tui-widgets",
    "activeMatch": "/api/"
  }
]
```

- [ ] **Step 3: Commit**

```bash
git add website/docs/index.md website/docs/_nav.json
git commit -m "docs: add homepage and top navigation"
```

---

## Task 3: 编写「指南」部分文档

**Files:**
- Create: `website/docs/guide/_meta.json`
- Create: `website/docs/guide/introduction.md`
- Create: `website/docs/guide/getting-started.md`
- Create: `website/docs/guide/project-structure.md`
- Create: `website/docs/guide/examples.md`

- [ ] **Step 1: 创建 `website/docs/guide/_meta.json`**

```json
["introduction", "getting-started", "project-structure", "examples"]
```

- [ ] **Step 2: 创建 `website/docs/guide/introduction.md`**

读取 `ARCHITECTURE.md` 的前两节作为参考素材，编写项目介绍页：

```md
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
```

- [ ] **Step 3: 创建 `website/docs/guide/getting-started.md`**

```md
# 快速开始

## 环境要求

- [Bun](https://bun.sh/) v1.1+
- Node.js 20+（可选，用于某些工具链）
- Git

## 克隆项目

\`\`\`bash
git clone https://github.com/user/flitter.git
cd flitter
\`\`\`

## 安装依赖

\`\`\`bash
bun install
\`\`\`

## 运行示例

项目提供了 9 个可运行的 TUI 示例，可以快速体验框架能力：

\`\`\`bash
# 综合展示
bun run examples/tui-kitchen-sink.ts

# 交互演示（点击、悬停、状态）
bun run examples/tui-interactive-demo.ts

# 布局系统
bun run examples/tui-layout-demo.ts

# 滚动列表
bun run examples/tui-scroll-demo.ts
\`\`\`

:::tip
所有示例都支持鼠标交互。确保终端支持 SGR 鼠标协议（iTerm2、kitty、WezTerm 等现代终端均支持）。
:::

## 运行测试

\`\`\`bash
bun test
\`\`\`

## 类型检查

\`\`\`bash
bun run typecheck
\`\`\`

## 代码检查

\`\`\`bash
bun run check
\`\`\`
```

- [ ] **Step 4: 创建 `website/docs/guide/project-structure.md`**

```md
# 项目结构

Flitter 是一个 Bun workspaces 管理的 monorepo，包含 8 个 package 和 1 个 app。

## 目录结构

\`\`\`
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
\`\`\`

## 依赖关系

\`\`\`
apps/flitter-cli
  └── @flitter/cli
        ├── @flitter/flitter (组装层)
        │     ├── @flitter/agent-core
        │     ├── @flitter/llm
        │     ├── @flitter/data
        │     ├── @flitter/util
        │     └── @flitter/schemas
        └── @flitter/tui (无内部依赖)
\`\`\`

## 包职责概览

| 包名 | 职责 | 关键模块 |
|------|------|---------|
| `@flitter/tui` | Flutter-for-Terminal UI 框架 | Widget 树、渲染管线、布局引擎、输入系统 |
| `@flitter/agent-core` | AI Agent 引擎 | ThreadWorker、工具系统、权限引擎 |
| `@flitter/llm` | LLM 接入层 | Provider 接口、MCP 协议、OAuth |
| `@flitter/data` | 状态与持久化 | 配置管理、会话存储、Skill 系统 |
| `@flitter/cli` | CLI 界面 | 命令路由、交互模式、TUI Widget |
| `@flitter/flitter` | 依赖注入组装 | ServiceContainer、工厂函数 |
| `@flitter/schemas` | 类型定义 | Zod Schema、数据验证 |
| `@flitter/util` | 工具函数 | 响应式原语、日志、Git 工具 |
```

- [ ] **Step 5: 创建 `website/docs/guide/examples.md`**

```md
# 示例程序

Flitter 提供了 9 个独立的 TUI 示例，覆盖框架的各项核心能力。每个示例都可以直接用 `bun run` 执行。

## 综合展示

\`\`\`bash
bun run examples/tui-kitchen-sink.ts
\`\`\`

展示所有核心 Widget 的综合 Demo，包括文本样式、布局、交互、滚动等。

## 交互演示

\`\`\`bash
bun run examples/tui-interactive-demo.ts
\`\`\`

演示鼠标点击、悬停状态变化、StatefulWidget 状态管理。

## 布局系统

\`\`\`bash
bun run examples/tui-layout-demo.ts
\`\`\`

展示 Column、Row、Flex、Stack、Expanded、Spacer 等布局 Widget 的使用。

## Container 与装饰

\`\`\`bash
bun run examples/tui-container-demo.ts
\`\`\`

展示 Container、BoxDecoration、Border、Padding 等装饰性 Widget。

## 文本样式

\`\`\`bash
bun run examples/tui-text-demo.ts
\`\`\`

展示 Text、RichText、TextSpan 等文本渲染能力。

## 滚动列表

\`\`\`bash
bun run examples/tui-scroll-demo.ts
\`\`\`

展示 ListView、ScrollController、ScrollPhysics 等滚动系统。

## Markdown 渲染

\`\`\`bash
bun run examples/tui-markdown-demo.ts
\`\`\`

展示终端内 Markdown 渲染，支持 GFM 语法、代码高亮。

## 文本编辑

\`\`\`bash
bun run examples/tui-editing-demo.ts
\`\`\`

展示 TextField、TextEditingController、光标移动、编辑历史。

## Overlay 弹层

\`\`\`bash
bun run examples/tui-overlay-demo.ts
\`\`\`

展示 Overlay、OverlayEntry、LayerLink、CommandPalette 等弹层系统。
```

- [ ] **Step 6: Commit**

```bash
git add website/docs/guide/
git commit -m "docs: add guide section — introduction, getting-started, structure, examples"
```

---

## Task 4: 编写「TUI 框架」部分文档

**Files:**
- Create: `website/docs/tui/_meta.json`
- Create: `website/docs/tui/overview.md`
- Create: `website/docs/tui/three-tree.md`
- Create: `website/docs/tui/widgets.md`
- Create: `website/docs/tui/layout.md`
- Create: `website/docs/tui/rendering.md`
- Create: `website/docs/tui/input-handling.md`

编写此部分前，**必须先阅读** `packages/tui/src/` 的实际源码，确保文档准确反映实现细节。以下为各页面的内容框架和关键要点。

- [ ] **Step 1: 创建 `website/docs/tui/_meta.json`**

```json
["overview", "three-tree", "widgets", "layout", "rendering", "input-handling"]
```

- [ ] **Step 2: 创建 `website/docs/tui/overview.md`**

阅读 `packages/tui/src/index.ts` 了解导出结构，阅读 `packages/tui/src/binding/` 了解 `runApp` 入口。

```md
# TUI 框架概述

`@flitter/tui` 是 Flitter 的核心包——一个完整的 Flutter-for-Terminal UI 框架。它将 Flutter 的三棵树架构（Widget → Element → RenderObject）完整移植到终端环境。

## 核心理念

与 Flutter 一样，Flitter TUI 采用声明式 UI 范式：

1. **Widget** — 不可变的 UI 描述，定义「界面长什么样」
2. **Element** — Widget 的实例化，管理生命周期和子树协调
3. **RenderObject** — 负责实际的布局计算和绘制

开发者只需关心 Widget 层——框架负责高效地将声明式描述转化为终端输出。

## 最小示例

\`\`\`ts
import { runApp, Center, Text } from '@flitter/tui';

runApp(
  Center({
    child: Text('Hello, Terminal!'),
  })
);
\`\`\`

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
| 内置 Widget | `widgets/` | 25+ 预置组件 |
| 滚动系统 | `scroll/` | ScrollController、ListView |
| 文本编辑 | `editing/` | TextEditingController、TextField |
| 弹层系统 | `overlay/` | Overlay、CommandPalette |
| Markdown | `markdown/` | MarkdownParser、MarkdownRenderer |
```

- [ ] **Step 3: 创建 `website/docs/tui/three-tree.md`**

阅读 `packages/tui/src/tree/` 目录下的 `widget.ts`、`element.ts`、`render-object.ts`、`build-owner.ts`、`pipeline-owner.ts`。

```md
# 三棵树架构

Flitter 完整实现了 Flutter 的三棵树（Three Trees）架构。理解这三棵树是掌握整个框架的关键。

## Widget 树

Widget 是 **不可变的配置描述**。每次状态变化时，框架会创建新的 Widget 树，与旧树对比。

\`\`\`ts
// StatelessWidget：无状态，纯函数式
class MyLabel extends StatelessWidget {
  build() {
    return Text('Hello');
  }
}

// StatefulWidget：持有可变 State
class MyCounter extends StatefulWidget {
  createState() {
    return new MyCounterState();
  }
}

class MyCounterState extends State<MyCounter> {
  count = 0;

  build() {
    return Text(\`Count: \${this.count}\`);
  }
}
\`\`\`

### 关键概念
- Widget 是轻量对象，创建和销毁代价很低
- `StatefulWidget` 的 State 跨重建保持
- `InheritedWidget` 用于向子树传递数据（类似 React Context）

## Element 树

Element 是 **Widget 的实例化**，负责：
- 管理 Widget 的生命周期（挂载、更新、卸载）
- 协调子树的 diff 和复用（reconciliation）
- 持有对 RenderObject 的引用

开发者通常不直接操作 Element 树。

## RenderObject 树

RenderObject 负责 **实际的布局和绘制**：
- `performLayout()` — 接收父级约束，计算自身尺寸，布局子节点
- `paint()` — 将内容写入 Screen buffer

### BoxConstraints

布局系统使用 `BoxConstraints`（最小/最大宽高）向下传递：

\`\`\`
父级约束 → RenderObject.performLayout() → 确定尺寸 + 布局子节点
\`\`\`

## BuildOwner 与 PipelineOwner

- **BuildOwner** — 管理脏 Element 列表，驱动 build 阶段
- **PipelineOwner** — 管理需要 layout/paint 的 RenderObject 列表，驱动 layout 和 paint 阶段

这两个 Owner 由 `WidgetsBinding` 在每一帧中按序调用。
```

- [ ] **Step 4: 创建 `website/docs/tui/widgets.md`**

阅读 `packages/tui/src/widgets/` 目录了解所有导出 Widget。

```md
# 内置 Widget

Flitter 提供 25+ 内置 Widget，覆盖文本、布局、容器、交互、滚动等常见场景。

## 文本

| Widget | 说明 |
|--------|------|
| `Text` | 单样式文本 |
| `RichText` | 多样式富文本 |
| `TextSpan` | 文本片段，用于 RichText 的子节点 |

\`\`\`ts
Text('Hello World', { style: TextStyle({ bold: true, color: Color.green }) })

RichText({
  text: TextSpan({
    children: [
      TextSpan({ text: 'Bold', style: TextStyle({ bold: true }) }),
      TextSpan({ text: ' and normal' }),
    ],
  }),
})
\`\`\`

## 布局

| Widget | 说明 |
|--------|------|
| `Column` | 垂直排列子节点 |
| `Row` | 水平排列子节点 |
| `Flex` | Column/Row 的通用基类 |
| `Expanded` | 填充 Flex 剩余空间 |
| `Flexible` | 按比例分配 Flex 空间 |
| `Spacer` | Flex 中的弹性间隔 |
| `Stack` | 层叠布局（绝对定位） |
| `Positioned` | Stack 中的绝对定位子节点 |

\`\`\`ts
Column({
  children: [
    Text('Title'),
    Expanded({
      child: ListView({ children: items }),
    }),
    Text('Footer'),
  ],
})
\`\`\`

## 容器与装饰

| Widget | 说明 |
|--------|------|
| `Container` | 通用容器（padding、decoration、alignment） |
| `Padding` | 内边距 |
| `SizedBox` | 固定尺寸盒子 |
| `Center` | 居中对齐 |
| `Align` | 自定义对齐 |
| `BoxDecoration` | 边框和背景装饰 |

\`\`\`ts
Container({
  padding: EdgeInsets.all(1),
  decoration: BoxDecoration({
    border: Border.all({ color: Color.blue }),
  }),
  child: Text('Boxed'),
})
\`\`\`

## 交互

| Widget | 说明 |
|--------|------|
| `MouseRegion` | 鼠标悬停/进出检测 |
| `GestureDetector` | 点击手势检测 |

## 滚动

| Widget | 说明 |
|--------|------|
| `ListView` | 可滚动列表 |
| `Scrollable` | 滚动基础组件 |
| `ScrollController` | 滚动状态控制 |

## 文本编辑

| Widget | 说明 |
|--------|------|
| `TextField` | 可编辑文本输入框 |
| `TextEditingController` | 编辑状态控制（光标、选区、历史） |

## 弹层

| Widget | 说明 |
|--------|------|
| `Overlay` | 覆盖层容器 |
| `OverlayEntry` | 覆盖层条目 |
| `CommandPalette` | 命令面板 |

## 其他

| Widget | 说明 |
|--------|------|
| `MediaQuery` | 终端尺寸查询 |
| `Theme` | 主题数据提供 |
| `ColorScheme` | 配色方案 |
```

- [ ] **Step 5: 创建 `website/docs/tui/layout.md`**

阅读 `packages/tui/src/tree/render-object.ts` 中的布局逻辑和 `packages/tui/src/widgets/` 中的布局 Widget。

```md
# 布局系统

Flitter 的布局系统与 Flutter 一致：**约束向下传递，尺寸向上返回**。

## BoxConstraints

每个 RenderObject 在布局时接收一个 `BoxConstraints`，包含四个值：

\`\`\`ts
interface BoxConstraints {
  minWidth: number;   // 最小宽度
  maxWidth: number;   // 最大宽度
  minHeight: number;  // 最小高度
  maxHeight: number;  // 最大高度
}
\`\`\`

## 布局流程

\`\`\`
根 RenderObject
  ├── 接收终端尺寸作为约束
  ├── performLayout()
  │     ├── 为每个子节点生成约束
  │     ├── 调用 child.layout(constraints)
  │     ├── 子节点返回 Size
  │     └── 确定自身 Size 和子节点偏移
  └── 向父级返回 Size
\`\`\`

## Flex 布局

`Column`（垂直）和 `Row`（水平）使用 Flex 布局算法：

1. **第一轮**：布局非弹性子节点，计算已使用空间
2. **第二轮**：将剩余空间按 flex 比例分配给 `Expanded`/`Flexible` 子节点
3. **定位**：根据 `mainAxisAlignment` 和 `crossAxisAlignment` 确定每个子节点的偏移

\`\`\`ts
Row({
  children: [
    Text('固定'),                           // 非弹性，占用实际宽度
    Expanded({ child: Text('填充剩余') }),  // flex=1，填充剩余空间
    Flexible({ flex: 2, child: Text('2x') }), // flex=2，按比例
  ],
})
\`\`\`

## Stack 布局

`Stack` 使用层叠布局，子节点默认从左上角开始：

\`\`\`ts
Stack({
  children: [
    Container({ width: 40, height: 10 }),  // 底层
    Positioned({
      top: 1,
      right: 1,
      child: Text('浮在上面'),
    }),
  ],
})
\`\`\`

## 脏标记机制

布局使用脏标记（dirty flag）优化：
- `markNeedsLayout()` — 标记当前 RenderObject 需要重新布局
- `PipelineOwner` 收集所有脏节点，在帧的 layout 阶段统一处理
- 只有脏节点及其受影响的子树才会重新布局
```

- [ ] **Step 6: 创建 `website/docs/tui/rendering.md`**

阅读 `packages/tui/src/screen/` 目录。

```md
# 渲染管线

Flitter 采用 diff-based ANSI 渲染，最小化终端输出量。

## Screen Buffer

框架维护一个 `Screen` 对象，本质是一个二维的 Cell 数组：

\`\`\`ts
interface Cell {
  char: string;       // 单个字符
  style: TextStyle;   // 样式（颜色、加粗等）
}
\`\`\`

## 渲染流程

\`\`\`
RenderObject.paint()
  ↓ 写入 Screen buffer（前台缓冲区）
AnsiRenderer.render()
  ↓ 对比前后两帧的 Screen buffer
  ↓ 只输出差异部分的 ANSI 转义序列
终端显示
\`\`\`

### Diff 算法

逐 Cell 对比两帧的 Screen：
1. 如果 Cell 没有变化，跳过
2. 如果连续多个 Cell 变化且样式相同，合并为一次 ANSI 输出
3. 使用光标移动（`\x1b[H`）跳转到需要更新的位置

## ANSI 转义序列

框架使用标准 ANSI 转义序列控制终端：

| 功能 | 序列 |
|------|------|
| 移动光标 | `\x1b[{row};{col}H` |
| 设置前景色（256色） | `\x1b[38;5;{n}m` |
| 设置背景色（256色） | `\x1b[48;5;{n}m` |
| RGB 前景色 | `\x1b[38;2;{r};{g};{b}m` |
| 加粗 | `\x1b[1m` |
| 重置样式 | `\x1b[0m` |

## 性能优化

- **Diff 渲染**：只输出变化的区域，避免全屏重绘
- **样式合并**：相邻相同样式的 Cell 合并为一次输出
- **脏区域追踪**：paint 阶段只处理 `markNeedsPaint()` 标记的子树
```

- [ ] **Step 7: 创建 `website/docs/tui/input-handling.md`**

阅读 `packages/tui/src/vt/` 和 `packages/tui/src/gestures/` 目录。

```md
# 输入与手势

Flitter 提供完整的键盘和鼠标输入处理系统。

## 输入解析

### VtParser

`VtParser` 将终端原始字节流解析为结构化事件：

\`\`\`
原始字节 → VtParser → InputEvent (KeyEvent | MouseEvent | ResizeEvent | ...)
\`\`\`

### 键盘事件

支持的键盘输入：
- 普通字符输入
- 功能键（F1-F12、方向键、Home/End 等）
- 修饰键组合（Ctrl+、Alt+、Shift+）

### 鼠标事件

使用 **SGR 鼠标协议**（终端需支持 `\x1b[?1003h` 和 `\x1b[?1006h`）：

| 事件 | SGR 编码 |
|------|---------|
| 左键按下 | `\x1b[<0;{col};{row}M` |
| 左键释放 | `\x1b[<0;{col};{row}m` |
| 鼠标移动 | `\x1b[<35;{col};{row}M` |
| 滚轮上滚 | `\x1b[<64;{col};{row}M` |
| 滚轮下滚 | `\x1b[<65;{col};{row}M` |

## 手势系统

### HitTest

当鼠标事件到达时，框架执行 **命中测试**：

1. 从 RenderObject 树的根开始
2. 检查鼠标坐标是否在当前节点的布局区域内
3. 递归检查子节点（后绘制的在前，实现 z-order）
4. 收集所有命中的节点，形成 HitTest 路径

### MouseRegion

\`\`\`ts
MouseRegion({
  onEnter: () => { /* 鼠标进入 */ },
  onExit: () => { /* 鼠标离开 */ },
  onHover: (event) => { /* 鼠标移动 */ },
  child: Text('Hover me'),
})
\`\`\`

### GestureDetector

\`\`\`ts
GestureDetector({
  onTap: () => { /* 点击 */ },
  child: Text('Click me'),
})
\`\`\`

## 焦点管理

框架提供焦点系统，管理键盘输入的路由目标：
- 焦点节点接收键盘事件
- Tab 键在可聚焦节点间切换
- `TextField` 等 Widget 自动管理焦点
```

- [ ] **Step 8: Commit**

```bash
git add website/docs/tui/
git commit -m "docs: add TUI framework section — architecture, widgets, layout, rendering, input"
```

---

## Task 5: 编写「架构」部分文档

**Files:**
- Create: `website/docs/architecture/_meta.json`
- Create: `website/docs/architecture/monorepo.md`
- Create: `website/docs/architecture/agent-core.md`
- Create: `website/docs/architecture/llm-integration.md`
- Create: `website/docs/architecture/data-layer.md`

编写此部分前，**必须先阅读** 对应 package 的实际源码。

- [ ] **Step 1: 创建 `website/docs/architecture/_meta.json`**

```json
["monorepo", "agent-core", "llm-integration", "data-layer"]
```

- [ ] **Step 2: 创建 `website/docs/architecture/monorepo.md`**

参考 `ARCHITECTURE.md` 并阅读根 `package.json` 和各包的 `package.json`。

```md
# Monorepo 架构

## 设计原则

Flitter 采用以下架构分层原则：

- **横向拆分**：基于模块的职责和耦合度
- **纵向分层**：framework → core → integration → cli
- **依赖方向**：只允许上层依赖下层，禁止循环依赖
- **可独立演进**：每个包有清晰边界，可独立测试

## 架构层次

\`\`\`
┌─────────────────────────────┐
│     apps/flitter-cli        │  应用层
├─────────────────────────────┤
│     @flitter/cli            │  CLI 层
├─────────────────────────────┤
│     @flitter/flitter        │  组装层（DI）
├───────────┬───────┬─────────┤
│ agent-core│  llm  │  data   │  核心层
├───────────┴───────┴─────────┤
│     @flitter/schemas        │  Schema 层
├─────────────────────────────┤
│     @flitter/util           │  工具层
├─────────────────────────────┤
│     @flitter/tui            │  框架层（独立）
└─────────────────────────────┘
\`\`\`

## 包管理

使用 Bun workspaces 管理 monorepo：

\`\`\`json
// package.json
{
  "workspaces": ["packages/*", "apps/*"]
}
\`\`\`

所有包使用 ESM（`"type": "module"`），TypeScript 严格模式。

## 组装层

`@flitter/flitter` 是 DI 组装层，提供 `ServiceContainer`：

\`\`\`ts
const container = createContainer({
  configDir: '~/.flitter',
  // ...
});

// 通过 container 获取任何服务
const worker = container.threadWorker;
const config = container.configService;
\`\`\`

这一层负责将所有下层包的服务组装在一起，上层（CLI）只需依赖组装层。
```

- [ ] **Step 3: 创建 `website/docs/architecture/agent-core.md`**

阅读 `packages/agent-core/src/` 目录，特别是 `worker/`、`tools/`、`permissions/`。

```md
# Agent 引擎

`@flitter/agent-core` 实现了 AI Agent 的核心推理和工具执行循环。

## ThreadWorker

ThreadWorker 是 Agent 的核心状态机，管理完整的推理循环：

\`\`\`
prompt 构建 → LLM 流式调用 → 工具执行 → 递归推理 → 回合完成
\`\`\`

### 事件流

ThreadWorker 发射类型化的 `AgentEvent` 流：

| 事件 | 说明 |
|------|------|
| `InferenceStart` | 开始一次 LLM 调用 |
| `InferenceDelta` | 流式输出增量 |
| `InferenceComplete` | LLM 调用完成 |
| `InferenceError` | LLM 调用出错 |
| `ToolStart` | 开始执行工具 |
| `ToolData` | 工具执行中间数据 |
| `ToolComplete` | 工具执行完成 |
| `CompactionStart/Complete` | 上下文压缩 |
| `TurnComplete` | 一个完整回合结束 |

## 工具系统

### 内置工具

| 工具 | 功能 |
|------|------|
| `BashTool` | 执行 Shell 命令 |
| `ReadTool` | 读取文件内容 |
| `WriteTool` | 写入文件 |
| `EditTool` | 编辑文件（精确字符串替换） |
| `GlobTool` | 按模式搜索文件名 |
| `GrepTool` | 搜索文件内容（正则） |
| `FuzzyFindTool` | 模糊搜索 |

### ToolRegistry

工具通过 `ToolRegistry` 注册和管理。每个工具实现统一的接口：

\`\`\`ts
interface Tool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  execute(input: unknown): Promise<ToolResult>;
}
\`\`\`

### ToolOrchestrator

编排工具执行，处理并发执行、超时、错误恢复。

## 权限系统

`PermissionEngine` 提供基于模式匹配的细粒度权限控制：

- 支持 glob 模式匹配文件路径
- 区分读/写/执行权限
- 守护文件检测（防止修改关键系统文件）
- 权限规则可在配置文件中定义

## SubAgent

`SubAgentManager` 支持创建子代理：
- 子代理拥有独立的 ThreadWorker 实例
- PreHook/PostHook 系统在工具执行前后注入逻辑
```

- [ ] **Step 4: 创建 `website/docs/architecture/llm-integration.md`**

阅读 `packages/llm/src/` 目录。

```md
# LLM 集成

`@flitter/llm` 提供统一的大模型接入层和 MCP 协议实现。

## Provider 架构

统一的 `LLMProvider` 接口，支持多个后端：

| Provider | 模型前缀 | 支持的模型 |
|----------|---------|-----------|
| `AnthropicProvider` | `claude-*` | Claude 系列 |
| `OpenAIProvider` | `gpt-*`, `o3-*`, `o4-*` | GPT、o 系列 |
| `GeminiProvider` | `gemini-*` | Gemini 系列 |
| `OpenAICompatProvider` | `grok-*` 等 | xAI 及兼容端点 |

### 自动检测

\`\`\`ts
// 根据模型名称前缀自动选择 Provider
const provider = getProviderForModel('claude-sonnet-4-6');
// → AnthropicProvider
\`\`\`

### 流式输出

所有 Provider 实现统一的流式接口：

\`\`\`ts
interface StreamParams {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  // ...
}

for await (const delta of provider.stream(params)) {
  // delta: StreamDelta
}
\`\`\`

## MCP 协议

完整的 Model Context Protocol 实现：

### 传输层

| 传输方式 | 说明 |
|---------|------|
| stdio | 通过子进程的 stdin/stdout 通信 |
| SSE | Server-Sent Events |
| WebSocket | WebSocket 双向通信 |

### 连接管理

`MCPServerManager` 管理多个 MCP 服务器连接：
- 自动发现和连接配置的 MCP 服务器
- 动态加载服务器提供的工具
- 连接健康检查和自动重连

## OAuth 认证

OAuth 2.0 + PKCE 认证流程，支持：
- Anthropic
- GitHub Copilot
- OpenAI Codex

认证令牌通过系统密钥环安全存储。

## 消息转换

`BaseMessageTransformer` 和 `BaseToolTransformer` 处理不同 Provider 之间的消息格式转换，确保上层代码不需要关心 Provider 差异。
```

- [ ] **Step 5: 创建 `website/docs/architecture/data-layer.md`**

阅读 `packages/data/src/` 目录。

```md
# 数据层

`@flitter/data` 管理配置、会话、Skill 等持久化状态。

## 配置系统

`ConfigService` 提供分层配置管理：

\`\`\`
默认值 → 全局配置(~/.flitter/) → 项目配置(.flitter/) → 环境变量 → CLI 参数
\`\`\`

底层使用 `FileSettingsStorage` 读写 JSONC 格式的配置文件。

## 会话管理

### ThreadStore

内存中的会话状态管理：
- 创建/获取/列出会话
- 追加消息到会话历史

### ThreadPersistence

会话的磁盘持久化：
- 将会话序列化到磁盘
- 支持新建、继续、归档、删除会话

## 上下文管理

`ContextManager` 管理 LLM 的上下文窗口：
- `countTokensApprox()` — 近似 Token 计数
- 上下文窗口压缩（compaction）— 当上下文接近限制时自动压缩历史消息

## Skill 系统

`SkillService` 管理 Skill 文件：
- 扫描和解析 Skill 文件（支持 frontmatter 元数据）
- 每个 Skill 可关联 MCP 服务器配置
- 动态加载和热更新

## Guidance 系统

加载 CLAUDE.md 风格的引导文件：
- 支持 frontmatter 和 `@` 引用语法
- Glob 匹配决定哪些引导文件生效
- 为 Agent 提供项目级别的行为指导
```

- [ ] **Step 6: Commit**

```bash
git add website/docs/architecture/
git commit -m "docs: add architecture section — monorepo, agent-core, llm, data-layer"
```

---

## Task 6: 编写「API 参考」部分文档

**Files:**
- Create: `website/docs/api/_meta.json`
- Create: `website/docs/api/tui-widgets.md`
- Create: `website/docs/api/agent-tools.md`

- [ ] **Step 1: 创建 `website/docs/api/_meta.json`**

```json
["tui-widgets", "agent-tools"]
```

- [ ] **Step 2: 创建 `website/docs/api/tui-widgets.md`**

阅读 `packages/tui/src/widgets/` 下各文件的导出接口和 Props 定义。

```md
# Widget API 参考

## Text

单样式文本组件。

\`\`\`ts
Text(text: string, props?: {
  style?: TextStyle;
  maxLines?: number;
  overflow?: TextOverflow;
})
\`\`\`

| 参数 | 类型 | 说明 |
|------|------|------|
| `text` | `string` | 文本内容 |
| `style` | `TextStyle` | 文本样式 |
| `maxLines` | `number` | 最大行数 |
| `overflow` | `TextOverflow` | 溢出处理方式 |

---

## RichText

多样式富文本组件。

\`\`\`ts
RichText(props: {
  text: TextSpan;
})
\`\`\`

---

## TextStyle

文本样式对象。

\`\`\`ts
TextStyle(props?: {
  color?: Color;
  backgroundColor?: Color;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dim?: boolean;
})
\`\`\`

---

## Column / Row

Flex 布局容器。

\`\`\`ts
Column(props: {
  children: Widget[];
  mainAxisAlignment?: MainAxisAlignment;
  crossAxisAlignment?: CrossAxisAlignment;
})

Row(props: {
  children: Widget[];
  mainAxisAlignment?: MainAxisAlignment;
  crossAxisAlignment?: CrossAxisAlignment;
})
\`\`\`

### MainAxisAlignment

| 值 | 说明 |
|----|------|
| `start` | 起始对齐 |
| `end` | 末尾对齐 |
| `center` | 居中 |
| `spaceBetween` | 两端对齐，中间等距 |
| `spaceAround` | 每项两侧等距 |
| `spaceEvenly` | 所有间距相等 |

---

## Container

通用容器组件。

\`\`\`ts
Container(props?: {
  child?: Widget;
  width?: number;
  height?: number;
  padding?: EdgeInsets;
  margin?: EdgeInsets;
  decoration?: BoxDecoration;
  alignment?: Alignment;
})
\`\`\`

---

## Stack / Positioned

层叠布局。

\`\`\`ts
Stack(props: {
  children: Widget[];
})

Positioned(props: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  child: Widget;
})
\`\`\`

---

## ListView

可滚动列表。

\`\`\`ts
ListView(props: {
  children: Widget[];
  controller?: ScrollController;
})
\`\`\`

---

## TextField

可编辑文本输入。

\`\`\`ts
TextField(props: {
  controller: TextEditingController;
  placeholder?: string;
  style?: TextStyle;
  maxLines?: number;
})
\`\`\`

---

## MouseRegion

鼠标区域检测。

\`\`\`ts
MouseRegion(props: {
  child: Widget;
  onEnter?: (event: MouseEvent) => void;
  onExit?: (event: MouseEvent) => void;
  onHover?: (event: MouseEvent) => void;
})
\`\`\`

---

## GestureDetector

手势检测。

\`\`\`ts
GestureDetector(props: {
  child: Widget;
  onTap?: () => void;
})
\`\`\`

:::warning
以上 API 签名为概要描述。具体参数类型和默认值请参考源码中的 TypeScript 类型定义。
:::
```

- [ ] **Step 3: 创建 `website/docs/api/agent-tools.md`**

阅读 `packages/agent-core/src/tools/` 目录。

```md
# 工具系统 API

## Tool 接口

所有工具实现统一接口：

\`\`\`ts
interface Tool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  execute(input: unknown): Promise<ToolResult>;
}

interface ToolResult {
  content: string;
  isError?: boolean;
}
\`\`\`

## 内置工具

### BashTool

执行 Shell 命令。

\`\`\`ts
// 输入
{
  command: string;     // 要执行的命令
  timeout?: number;    // 超时时间（毫秒）
}

// 输出
{
  content: string;     // 命令输出（stdout + stderr）
}
\`\`\`

---

### ReadTool

读取文件内容。

\`\`\`ts
// 输入
{
  file_path: string;   // 文件绝对路径
  offset?: number;     // 起始行号
  limit?: number;      // 读取行数
}
\`\`\`

---

### WriteTool

写入文件。

\`\`\`ts
// 输入
{
  file_path: string;   // 文件绝对路径
  content: string;     // 文件内容
}
\`\`\`

---

### EditTool

精确字符串替换编辑。

\`\`\`ts
// 输入
{
  file_path: string;   // 文件路径
  old_string: string;  // 要替换的原文本
  new_string: string;  // 替换后的新文本
}
\`\`\`

---

### GlobTool

按模式搜索文件名。

\`\`\`ts
// 输入
{
  pattern: string;     // glob 模式，如 "**/*.ts"
  path?: string;       // 搜索根目录
}
\`\`\`

---

### GrepTool

搜索文件内容。

\`\`\`ts
// 输入
{
  pattern: string;     // 正则表达式
  path?: string;       // 搜索目录
  glob?: string;       // 文件过滤 glob
}
\`\`\`

---

### FuzzyFindTool

模糊搜索文件。

\`\`\`ts
// 输入
{
  query: string;       // 搜索关键词
  path?: string;       // 搜索目录
}
\`\`\`

## ToolRegistry

\`\`\`ts
class ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
}
\`\`\`

## PermissionEngine

\`\`\`ts
class PermissionEngine {
  check(toolName: string, input: unknown): PermissionResult;
}

type PermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string };
\`\`\`
```

- [ ] **Step 4: Commit**

```bash
git add website/docs/api/
git commit -m "docs: add API reference section — widget API, tool system API"
```

---

## Task 7: 验证文档站构建和本地预览

**Files:**
- Modify: `website/rspress.config.ts` (如果构建报错需要修复)
- Modify: `website/package.json` (如果依赖缺失需要补充)

- [ ] **Step 1: 安装依赖**

```bash
cd website && pnpm install
```

- [ ] **Step 2: 运行 dev server**

```bash
cd website && pnpm run dev
```

Expected: 开发服务器在 `http://localhost:5173` 启动，无构建错误。

- [ ] **Step 3: 浏览器验证**

打开浏览器访问 `http://localhost:5173`，检查：
- 首页 Hero 区域和 Feature 卡片正确渲染
- 顶部导航栏 4 个链接可点击
- 「指南」→「项目介绍」页面内容正确，侧边栏显示 4 个条目
- 「TUI 框架」→「概述」页面，侧边栏显示 6 个条目
- 「架构」→「Monorepo 架构」页面内容正确
- 「API」→「Widget API 参考」页面代码块正确高亮
- 中文内容全部正确显示，无乱码

- [ ] **Step 4: 修复发现的问题**

根据实际浏览中发现的问题逐一修复。常见问题：
- `_meta.json` 文件名与实际 md 文件名不匹配
- frontmatter 格式错误
- 代码块语法有误
- 导航链接路径错误

- [ ] **Step 5: 构建生产版本**

```bash
cd website && pnpm run build
```

Expected: 构建成功，输出到 `website/doc_build/` 目录（rspress 默认输出目录）。

- [ ] **Step 6: 预览生产构建**

```bash
cd website && pnpm run preview
```

Expected: 可以在浏览器中预览生产构建结果，所有页面正常渲染。

- [ ] **Step 7: Commit**

```bash
git add website/
git commit -m "docs: fix build issues and verify doc site"
```

---

## Task 8: 添加 .gitignore 和 monorepo 集成

**Files:**
- Create: `website/.gitignore`
- Modify: 根 `package.json`（添加 docs 脚本，可选）

- [ ] **Step 1: 创建 `website/.gitignore`**

```
node_modules/
doc_build/
.rspress/
.temp/
```

- [ ] **Step 2: 在根 `package.json` 添加文档站脚本（可选）**

在根 `package.json` 的 `scripts` 中添加：

```json
{
  "scripts": {
    "docs:dev": "cd website && pnpm run dev",
    "docs:build": "cd website && pnpm run build"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add website/.gitignore package.json
git commit -m "docs: add gitignore and root scripts for doc site"
```

---

## 自审核检查

### Spec 覆盖
- [x] rspress 文档站 — Task 1-2 建立骨架
- [x] 中文为主 — `lang: 'zh'`，所有内容中文
- [x] 项目介绍 — Task 3 (guide/)
- [x] TUI 框架详解 — Task 4 (tui/) 包含 6 篇
- [x] 架构文档 — Task 5 (architecture/) 包含 4 篇
- [x] API 参考 — Task 6 (api/) 包含 2 篇
- [x] 构建验证 — Task 7 实际运行验证
- [x] 仓库集成 — Task 8 gitignore 和脚本

### Placeholder 扫描
- 无 TBD、TODO、"implement later" 等占位符
- 所有代码步骤包含完整代码

### 类型一致性
- Widget API 签名与文档中其他引用一致
- 工具名称全文统一

### 注意事项
- API 参考（Task 6）中的签名为概要描述，实现时**必须阅读源码**确认实际类型定义
- TUI 框架文档（Task 4）中的源码路径基于探索结果，实现时需确认路径是否仍然正确
- `rspress.config.ts` 中的 GitHub 链接需要替换为实际仓库地址
