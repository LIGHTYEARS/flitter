# Flitter Monorepo -- 目录结构

> 生成时间: 2026-04-12
> 范围: `/Users/bytedance/.oh-my-coco/studio/flitter`

---

## 1. 顶层布局

```
flitter/
├── apps/                        # 可部署应用
│   └── flitter-cli/             # CLI 应用入口
├── packages/                    # 共享库包
│   ├── agent-core/              # @flitter/agent-core
│   ├── cli/                     # @flitter/cli
│   ├── data/                    # @flitter/data
│   ├── flitter/                 # flitter (组装层)
│   ├── llm/                     # @flitter/llm
│   ├── schemas/                 # @flitter/schemas
│   ├── tui/                     # @flitter/tui
│   └── util/                    # @flitter/util
├── amp-cli-reversed/            # 逆向参考代码 (只读)
├── tmux-capture/                # TUI 截屏/Golden 文件渲染工具
├── .claude/                     # Claude Code agent 配置
├── .codex/                      # Codex agent 配置
├── .trae/                       # TRAE agent 配置
├── .pi/                         # PI agent 配置
├── .gaps/                       # 质量差距追踪
├── .planning/                   # 规划文档 (本文件所在)
├── ARCHITECTURE.md              # 原始架构设计文档
├── .gitignore
├── .npmrc
└── package.json                 # Monorepo 根配置
```

---

## 2. 应用层 (`apps/`)

### `apps/flitter-cli/` -- CLI 应用入口

```
apps/flitter-cli/
├── bin/
│   └── flitter.ts               # #!/usr/bin/env bun 可执行入口
├── src/
│   └── index.ts                 # 应用主模块 (当前占位)
└── package.json                 # name: "flitter-cli-app"
```

**关键文件**:
- `apps/flitter-cli/bin/flitter.ts` -- 最终用户执行的 CLI 二进制入口
- `apps/flitter-cli/package.json` -- 依赖 `flitter` (workspace 组装层)

---

## 3. 包层 (`packages/`)

所有包遵循统一结构:

```
packages/<name>/
├── src/
│   └── index.ts                 # 包入口 (当前均为占位 `export {}`)
└── package.json                 # 包元数据与依赖声明
```

### 3.1 `packages/schemas/` -- 纯类型定义

| 字段 | 值 |
|------|-----|
| **包名** | `@flitter/schemas` |
| **依赖** | 无 |
| **职责** | Zod schema, JSON Schema, 协议定义, 消息类型 |
| **入口** | `packages/schemas/src/index.ts` |

**计划包含的类型** (来自逆向参考):
- 应用 schema (`app-schemas.js`, `app-schemas-2.js`)
- 消息 schema (`message-schemas.js`)
- 线程可见性 (`thread-visibility-schemas.js`)
- IDE 协议 (`ide-protocol-schemas.js`)
- MCP 协议 (`mcp-protocol-schemas.js`, `mcp-oauth-schemas.js`)
- Agent 模式 (`agent-modes.js`)
- 模型注册表 (`model-registry.js`)
- 配置键 (`config-keys.js`)
- 特性标志 (`feature-flags.js`)

### 3.2 `packages/util/` -- 基础设施工具库

| 字段 | 值 |
|------|-----|
| **包名** | `@flitter/util` |
| **依赖** | `@flitter/schemas` |
| **职责** | Reactive 原语, URI, 验证, Keyring, IDE Bridge, OTel, 文件扫描, Git |
| **入口** | `packages/util/src/index.ts` |

**计划模块映射** (逆向参考 -> TypeScript):
| 逆向来源 | 计划子模块 | 能力 |
|---------|-----------|------|
| `util/http-sdk-core.js` | `reactive/` | Observable, BehaviorSubject |
| `util/http-sdk-core.js` | `uri/` | VS Code 风格 URI 类 |
| `util/json-schema-validator.js` | `validation/` | JSON Schema -> Zod 转换, i18n |
| `util/keyring-native-loader.js` | `keyring/` | OS 原生密钥链 |
| `util/connection-transport.js` | `ide-bridge/` | VS Code/JetBrains WebSocket |
| `util/otel-instrumentation.js` | `telemetry/` | OpenTelemetry 遥测 |
| `util/file-scanner.js` | `scanner/` | rg/fd 目录扫描 |
| `util/http-request-executor.js` | `git/`, `search/` | Git 操作, 模糊搜索 |
| `util/web-streams-polyfill.js` | `streams/` | Web Streams polyfill |

### 3.3 `packages/tui/` -- 终端 UI 框架

| 字段 | 值 |
|------|-----|
| **包名** | `@flitter/tui` |
| **依赖** | 无 (可独立发布) |
| **职责** | Flutter-for-Terminal 三棵树架构, VT 解析, 渲染管线 |
| **入口** | `packages/tui/src/index.ts` |

**计划模块映射**:
| 逆向来源 | 计划子模块 | 能力 |
|---------|-----------|------|
| `framework/tui-widget-framework.js` | `core/parser.ts`, `core/render-object.ts` | VT 解析状态机, RenderObject 基类 |
| `framework/tui-render-pipeline.js` | `core/binding.ts`, `text/` | WidgetsBinding, TextStyle, TextSpan |
| `framework/tui-layout-engine.js` | `core/scheduler.ts`, `core/build-owner.ts` | 帧调度, 构建协调 |
| `framework/tui-widget-library.js` | `widgets/editor.ts`, `theme/` | 文本编辑器, 主题系统 |
| `framework/tui-thread-widgets.js` | `widgets/thread/` | 线程 UI, 图表, 手动切换 |
| `framework/activity-feed-ui.js` | `widgets/activity-feed.ts` | Activity 视图 |
| `framework/clipboard-and-input.js` | `platform/clipboard.ts`, `platform/tui.ts` | 剪贴板, TUI 控制器 |
| `framework/app-state-management.js` | `state/` | 同步状态, 认证状态 |
| `framework/widget-property-system.js` | `widgets/scroll.ts`, `widgets/selection.ts` | 滚动, 选择 |
| `framework/micromark-parser.js` | `markdown/` | CommonMark + GFM 解析 |

### 3.4 `packages/agent-core/` -- Agent 核心引擎

| 字段 | 值 |
|------|-----|
| **包名** | `@flitter/agent-core` |
| **依赖** | `@flitter/schemas`, `@flitter/util` |
| **职责** | ThreadWorker, 工具执行, Prompt 路由, 权限系统 |
| **入口** | `packages/agent-core/src/index.ts` |

**计划模块映射**:
| 逆向来源 | 计划子模块 | 能力 |
|---------|-----------|------|
| `app/tool-execution-engine.js` | `worker/thread-worker.ts` | Agent 线程生命周期, 工具循环 |
| `app/prompt-routing.js` | `prompt/routing.ts` | System prompt 生成 (aggman, smart) |
| `app/prompt-classification.js` | `prompt/classification.ts`, `hooks/` | Hook 系统, Skill 加载 |
| `app/tool-permissions.js` | `tools/permissions.ts`, `tools/registry.ts` | 工具注册, 权限匹配 |
| `app/cli-command-router.js` | `hooks/lifecycle.ts` | 工具生命周期钩子 |
| `app/html-sanitizer-repl.js` | `tools/repl.ts`, `tools/review.ts` | REPL 工具, Code Review |
| `app/realtime-sync.js` | `sync/dtw.ts` | DTW 实时线程同步 |
| `app/process-runner.js` | `terminal/emulator.ts`, `update/` | 终端模拟, 自动更新 |

### 3.5 `packages/llm/` -- LLM & MCP 集成

| 字段 | 值 |
|------|-----|
| **包名** | `@flitter/llm` |
| **依赖** | `@flitter/schemas`, `@flitter/util` |
| **职责** | 多 Provider LLM SDK, MCP 协议, OAuth 认证 |
| **入口** | `packages/llm/src/index.ts` |

**计划模块映射**:
| 逆向来源 | 计划子模块 | 能力 |
|---------|-----------|------|
| `app/llm-sdk-providers.js` | `providers/anthropic.ts`, `providers/openai.ts`, `providers/gemini.ts` | 各 Provider SDK |
| `app/mcp-tools-integration.js` | `providers/anthropic-client.ts` | Anthropic API 客户端 |
| `app/mcp-transport.js` | `mcp/transport-stdio.ts`, `mcp/transport-sse.ts` | MCP 传输层 |
| `app/oauth-auth-provider.js` | `auth/oauth.ts` | OAuth 2.0 + PKCE |
| `app/rpc-protocol-layer.js` | `transport/websocket.ts`, `providers/openai-adapter.ts` | DTW WebSocket, OpenAI 适配 |
| `app/conversation-ui-logic.js` | `auth/callback.ts` | OAuth 回调服务器 |

### 3.6 `packages/data/` -- 数据与状态层

| 字段 | 值 |
|------|-----|
| **包名** | `@flitter/data` |
| **依赖** | `@flitter/schemas`, `@flitter/util` |
| **职责** | 线程持久化, 配置管理, Skill 服务, 权限规则 |
| **入口** | `packages/data/src/index.ts` |

**计划模块映射**:
| 逆向来源 | 计划子模块 | 能力 |
|---------|-----------|------|
| `app/session-management.js` | `store/thread-store.ts`, `trust/` | 线程持久化, MCP 信任管理 |
| `app/claude-config-system.js` | `config/settings.ts` | 设置读写 (JSON/JSONC) |
| `app/skills-agents-system.js` | `skills/service.ts`, `skills/loader.ts` | Skill 发现/加载/管理 |
| `app/permission-rule-defs.js` | `ui/commands.ts`, `ui/renderer.ts` | 命令面板, 消息渲染 |

### 3.7 `packages/cli/` -- CLI 入口与命令系统

| 字段 | 值 |
|------|-----|
| **包名** | `@flitter/cli` |
| **依赖** | `@flitter/agent-core`, `@flitter/tui`, `@flitter/data`, `@flitter/llm` |
| **职责** | 命令树定义, 交互式 REPL, Headless 模式 |
| **入口** | `packages/cli/src/index.ts`, `packages/cli/bin/flitter.ts` |

**计划模块映射**:
| 逆向来源 | 计划子模块 | 能力 |
|---------|-----------|------|
| `app/cli-commander-system.js` | `commands/` | Commander.js 命令树 |
| `app/cli-entrypoint.js` | `headless/` | Headless 流式 JSON 模式 |

### 3.8 `packages/flitter/` -- 组装层

| 字段 | 值 |
|------|-----|
| **包名** | `flitter` |
| **依赖** | 所有 `@flitter/*` 包 |
| **职责** | 聚合所有子包, 依赖注入, 统一 API |
| **入口** | `packages/flitter/src/index.ts` |

---

## 4. 逆向参考代码 (`amp-cli-reversed/`)

```
amp-cli-reversed/
├── app/                         # 应用核心 (20 模块, ~58K 行)
│   ├── cli-commander-system.js  # CLI 命令树 (6,228L)
│   ├── cli-entrypoint.js        # Headless 模式 (1,494L)
│   ├── tool-execution-engine.js # ThreadWorker 核心 (3,597L)
│   ├── prompt-routing.js        # System prompt (132L)
│   ├── prompt-classification.js # Hook 系统 + Skill (619L)
│   ├── cli-command-router.js    # 工具生命周期钩子 (732L)
│   ├── tool-permissions.js      # 工具注册与权限 (675L)
│   ├── html-sanitizer-repl.js   # REPL + Code Review (2,774L)
│   ├── llm-sdk-providers.js     # 多 Provider LLM SDK (10,232L) ★最大
│   ├── mcp-tools-integration.js # Anthropic SDK 客户端 (3,234L)
│   ├── mcp-transport.js         # MCP Stdio/SSE 传输 (1,309L)
│   ├── oauth-auth-provider.js   # OAuth 2.0 + PKCE (1,699L)
│   ├── rpc-protocol-layer.js    # DTW WebSocket + 文件检测 (9,265L)
│   ├── realtime-sync.js         # DTW 实时同步 (2,175L)
│   ├── session-management.js    # 线程持久化 + 信任 (2,345L)
│   ├── claude-config-system.js  # 设置管理 (1,604L)
│   ├── skills-agents-system.js  # Skill 服务 (3,393L)
│   ├── permission-rule-defs.js  # 命令面板 + 消息渲染 (6,415L)
│   ├── conversation-ui-logic.js # OAuth 回调 + DTW 观察 (324L)
│   └── process-runner.js        # 终端模拟 + 自更新 (3,935L)
├── framework/                   # TUI 框架 (10 模块, ~26K 行)
│   ├── tui-widget-framework.js  # VT 解析 + RenderObject (2,598L)
│   ├── tui-render-pipeline.js   # WidgetsBinding + runApp (783L)
│   ├── tui-layout-engine.js     # 帧调度 + 构建所有者 (1,193L)
│   ├── tui-widget-library.js    # 编辑器 + 主题 (3,400L)
│   ├── tui-thread-widgets.js    # 线程 UI + 图表 (3,167L)
│   ├── activity-feed-ui.js      # Activity 视图 (227L)
│   ├── clipboard-and-input.js   # 剪贴板 + TUI 控制 (619L)
│   ├── app-state-management.js  # 同步 + 认证状态 (577L)
│   ├── widget-property-system.js# 滚动 + 选择 (1,246L)
│   └── micromark-parser.js      # Markdown 解析 (12,483L) ★框架最大
├── util/                        # 基础设施 (9 模块, ~28K 行)
│   ├── http-sdk-core.js         # Reactive + URI + Schema (4,141L)
│   ├── json-schema-validator.js # Zod + i18n (4,378L)
│   ├── keyring-native-loader.js # 原生密钥链 (539L)
│   ├── connection-transport.js  # IDE Bridge + 权限 (2,717L)
│   ├── otel-instrumentation.js  # MCP 管理 + OTel (2,199L)
│   ├── web-streams-polyfill.js  # LLM 适配 + Streams (4,279L)
│   ├── protobuf-mime-types.js   # Thread 服务 + 子代理 (7,341L) ★util 最大
│   ├── file-scanner.js          # 文件系统扫描 (428L)
│   └── http-request-executor.js # 模糊搜索 + Git (1,847L)
├── vendor/
│   ├── esm/                     # 内部 ESM 模块 (~200+)
│   │   ├── app-schemas*.js      # 应用 schema (6 文件)
│   │   ├── mcp-*.js             # MCP 协议 schema (5 文件)
│   │   ├── agent-modes*.js      # Agent 模式 (3 文件)
│   │   ├── model-registry.js    # LLM 模型目录
│   │   ├── config-keys.js       # 配置键定义
│   │   ├── feature-flags.js     # 特性标志
│   │   ├── tool-*.js            # 工具服务 + 错误 (4 文件)
│   │   ├── zod-*.js             # Zod 库 (~40 文件)
│   │   ├── anthropic-*.js       # Anthropic SDK 类型 (~8 文件)
│   │   ├── init-*.js            # 依赖初始化存根 (~80 文件)
│   │   └── ...                  # 其他 (Auth, Skill, Utils)
│   └── cjs/                     # 第三方 CJS 依赖 (~500+)
│       ├── opentelemetry-*.js   # OpenTelemetry SDK
│       ├── grpc-*.js            # gRPC 客户端
│       ├── ajv*.js              # JSON Schema 验证
│       └── ...                  # YAML, Protobuf, 加密等
├── bun-internal/                # Bun 运行时内部模块
├── esbuild-bundles/             # esbuild 打包产物 (6 个)
├── AMP-MODULES.md               # 模块分析文档
├── DEPENDENCIES.md              # 依赖分析
├── README.md                    # 逆向说明
├── _module-index.json           # 模块索引 (332KB)
└── _preamble.js                 # Bundle 序言
```

---

## 5. 辅助工具 (`tmux-capture/`)

```
tmux-capture/
├── render.ts                    # Golden 文件渲染器 (xterm.js + Vite + agent-browser)
├── package.json                 # 依赖: @xterm/xterm, @xterm/headless, vite
└── screens/                     # Golden 截屏文件 (ansi-*.golden)
```

用途: 将 ANSI golden 文件渲染为 xterm.js 终端截图 (PNG), 用于 TUI 框架的视觉回归测试。

---

## 6. Agent 配置目录

项目同时支持多个 AI Agent 平台, 各有独立配置:

### `.claude/` -- Claude Code

```
.claude/
├── agents/                      # 22 个 GSD 子代理 (*.md)
├── commands/gsd/                # 65+ 个 GSD 命令 (*.md)
├── get-shit-done/               # GSD 工作流框架
│   ├── bin/lib/                 # CJS 工具函数 (13 个)
│   ├── contexts/                # 上下文模板 (dev, research, review)
│   ├── templates/               # 文档模板 (8 个)
│   └── workflows/               # 工作流定义 (18 个)
├── hooks/                       # Git/Session 钩子 (9 个)
└── settings.json                # Claude 配置
```

### `.codex/` -- Codex

```
.codex/
├── agents/                      # GSD 子代理 (*.md + *.toml)
├── get-shit-done/               # GSD 框架 (同 .claude/ 结构)
├── skills/                      # 51 个 GSD 技能 (各含 SKILL.md)
└── config.toml                  # Codex 配置
```

### `.trae/` -- TRAE

```
.trae/
├── agents/                      # GSD 子代理 (24 个 *.md)
├── get-shit-done/               # GSD 框架
├── skills/                      # 50 个 GSD 技能
├── specs/                       # 任务规范 (9 个目录)
└── gsd-file-manifest.json       # 文件清单
```

### `.pi/` -- PI

```
.pi/
├── agents/
│   └── supervisor.md            # 监督者代理
└── taskplane.json               # 任务面板配置
```

---

## 7. 命名约定

### 7.1 包命名

| 层级 | 命名格式 | 示例 |
|------|---------|------|
| 作用域包 | `@flitter/<name>` | `@flitter/tui`, `@flitter/llm` |
| 组装层 | `flitter` (无作用域) | `packages/flitter/` |
| 应用 | `<name>-app` | `flitter-cli-app` |

### 7.2 目录命名

- **包目录**: 短名, 小写, 连字符分隔 (`agent-core`, `tui`, `llm`)
- **源码入口**: 统一 `src/index.ts`
- **可执行入口**: `bin/flitter.ts`

### 7.3 逆向参考命名

- **模块文件**: 语义化连字符命名 (`tool-execution-engine.js`, `tui-widget-framework.js`)
- **Vendor ESM**: 功能前缀 + 标识符 (`app-schemas.js`, `zod-core-types.js`, `init-*.js`)
- **Vendor CJS**: 库名 + 功能 (`grpc-server.js`, `opentelemetry-api.js`)

### 7.4 文件类型约定

| 扩展名 | 用途 |
|--------|------|
| `.ts` | TypeScript 源码 (所有新代码) |
| `.js` | 逆向参考代码 (只读) |
| `.md` | 文档, Agent 指令, Skill 定义 |
| `.json` / `.jsonc` | 配置文件 |
| `.toml` | Agent 配置 (Codex) |
| `.cjs` | GSD 工具函数 (CommonJS) |
| `.golden` | TUI 截屏 golden 文件 |

---

## 8. 关键位置速查

| 需要找什么 | 去哪里看 |
|-----------|---------|
| CLI 可执行入口 | `apps/flitter-cli/bin/flitter.ts` |
| 组装层 | `packages/flitter/src/index.ts` |
| 包入口 (任意包) | `packages/<name>/src/index.ts` |
| 包依赖声明 | `packages/<name>/package.json` |
| Monorepo 配置 | `package.json` (根) |
| 架构设计文档 | `ARCHITECTURE.md` (根) |
| 逆向参考 -- Agent 核心 | `amp-cli-reversed/app/tool-execution-engine.js` |
| 逆向参考 -- CLI 命令 | `amp-cli-reversed/app/cli-commander-system.js` |
| 逆向参考 -- LLM SDK | `amp-cli-reversed/app/llm-sdk-providers.js` |
| 逆向参考 -- TUI 框架 | `amp-cli-reversed/framework/tui-widget-framework.js` |
| 逆向参考 -- MCP 传输 | `amp-cli-reversed/app/mcp-transport.js` |
| 逆向参考 -- 模块分析 | `amp-cli-reversed/AMP-MODULES.md` |
| 逆向参考 -- Schema | `amp-cli-reversed/vendor/esm/app-schemas.js` |
| TUI 视觉测试 | `tmux-capture/render.ts` |
| GSD 工作流 | `.claude/get-shit-done/workflows/` |
| GSD 子代理 | `.claude/agents/gsd-*.md` |
| 质量差距追踪 | `.gaps/v0.4.0/` |

---

## 9. 模块边界与职责分界

```
┌──────────────────────────────────────────────────────────────┐
│ apps/flitter-cli/                                            │
│   职责: 仅作为可执行入口, 零业务逻辑                              │
│   边界: 只依赖 flitter 组装层                                   │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ packages/flitter/                                             │
│   职责: 组装所有子包, 提供统一 API                                │
│   边界: 依赖所有 @flitter/* 包, 不包含业务逻辑                    │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ packages/cli/                                                 │
│   职责: Commander.js 命令树, REPL, Headless 模式                │
│   边界: 协调其他包, 不直接实现 Agent/LLM/TUI 逻辑               │
├───────────────────────────────────────────────────────────────┤
│ packages/agent-core/                                          │
│   职责: ThreadWorker, 工具执行循环, Prompt 路由, 权限检查         │
│   边界: 不直接调用 LLM API (通过 @flitter/llm 抽象)             │
├───────────────────────────────────────────────────────────────┤
│ packages/tui/                                                 │
│   职责: Flutter-for-Terminal UI 框架                            │
│   边界: 零内部依赖, 不引用任何 @flitter/* 包                     │
├───────────────────────────────────────────────────────────────┤
│ packages/llm/                                                 │
│   职责: 多 Provider LLM 推理, MCP 传输, OAuth                   │
│   边界: Provider 适配, 不包含 Agent 逻辑                         │
├───────────────────────────────────────────────────────────────┤
│ packages/data/                                                │
│   职责: 线程持久化, 配置读写, Skill 管理                          │
│   边界: 纯数据层, 不包含 UI 或 Agent 编排逻辑                    │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ packages/util/                                                │
│   职责: 跨切面基础设施 (Reactive, URI, Git, Scanner)             │
│   边界: 无领域逻辑, 仅依赖 @flitter/schemas                     │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ packages/schemas/                                             │
│   职责: 纯类型定义 (零运行时逻辑)                                │
│   边界: 零依赖, 仅导出类型和 Zod schema                         │
└───────────────────────────────────────────────────────────────┘
```
