# Flitter Monorepo -- 技术栈分析

> 生成日期: 2026-04-12
> 根目录: `/Users/bytedance/.oh-my-coco/studio/flitter`

---

## 1. 语言与运行时

| 维度 | 选择 | 证据 |
|------|------|------|
| **主语言** | TypeScript 5.4+ | `package.json` devDeps `"typescript": "^5.4.0"` |
| **运行时** | Bun | shebang `#!/usr/bin/env bun`，`bun-types` 类型定义，`bun build` 构建命令 |
| **模块系统** | ESM (ES Modules) | 所有 `package.json` 均为 `"type": "module"` |
| **JS 目标** | ES2022 | `tsconfig.json` `"target": "ES2022"` |
| **标准库** | ES2023 | `tsconfig.json` `"lib": ["ES2023"]` |
| **辅助语言** | JavaScript (逆向分析代码) | `amp-cli-reversed/` 目录全部为 `.js` 文件 |

### 运行时配置文件

- `tsconfig.json` -- 根级 TypeScript 配置
- `tmux-capture/tsconfig.json` -- tmux-capture 子项目独立 TS 配置
- `.npmrc` -- `shamefully-hoist=true`, `strict-peer-dependencies=false`
- `.gitignore` -- 排除 `node_modules/`, `dist/`, `coverage/`, lock 文件等

---

## 2. 项目结构 -- Monorepo

项目使用 **Bun workspaces monorepo** 架构，workspace 声明见 `package.json`:

```json
"workspaces": ["packages/*", "apps/*"]
```

### 2.1 Packages (7 个)

| 包名 | 路径 | 职责 | 内部依赖 |
|------|------|------|----------|
| `flitter` | `packages/flitter/package.json` | 主应用组装层 | 全部 `@flitter/*` |
| `@flitter/schemas` | `packages/schemas/package.json` | 数据类型定义、JSON Schema、协议定义 | 无 |
| `@flitter/util` | `packages/util/package.json` | 基础设施工具 (Reactive 原语、Zod 验证、Keyring、OTel、Streams) | `@flitter/schemas` |
| `@flitter/agent-core` | `packages/agent-core/package.json` | Agent 核心引擎 (ThreadWorker、工具执行、Prompt 路由) | `@flitter/schemas`, `@flitter/util` |
| `@flitter/llm` | `packages/llm/package.json` | LLM 多 Provider SDK、MCP 协议、OAuth | `@flitter/schemas`, `@flitter/util` |
| `@flitter/data` | `packages/data/package.json` | 数据与状态 (ThreadStore、配置管理、Skill 服务) | `@flitter/schemas`, `@flitter/util` |
| `@flitter/tui` | `packages/tui/package.json` | 终端 UI 框架 (Flutter-for-Terminal) | 无 |
| `@flitter/cli` | `packages/cli/package.json` | CLI 入口与命令系统 | `@flitter/agent-core`, `@flitter/tui`, `@flitter/data`, `@flitter/llm` |

### 2.2 Apps (1 个)

| 应用名 | 路径 | 职责 |
|--------|------|------|
| `flitter-cli-app` | `apps/flitter-cli/package.json` | CLI 应用入口，bin: `flitter` -> `./bin/flitter.ts` |

### 2.3 独立子项目 (1 个)

| 名称 | 路径 | 职责 |
|------|------|------|
| `tmux-capture` | `tmux-capture/package.json` | 终端截屏工具 (基于 xterm.js + Vite) |

### 2.4 逆向分析参考 (1 个)

| 名称 | 路径 | 职责 |
|------|------|------|
| `amp-cli-reversed` | `amp-cli-reversed/` | Sourcegraph Amp CLI 逆向工程代码，作为架构参考 |

---

## 3. 依赖关系图

```
flitter (主应用组装层)
├── @flitter/cli
│   ├── @flitter/agent-core
│   │   ├── @flitter/schemas (纯类型，无依赖)
│   │   └── @flitter/util
│   │       └── @flitter/schemas
│   ├── @flitter/tui (无内部依赖，可独立发布)
│   ├── @flitter/data
│   │   ├── @flitter/schemas
│   │   └── @flitter/util
│   └── @flitter/llm
│       ├── @flitter/schemas
│       └── @flitter/util
```

---

## 4. TypeScript 配置

### 4.1 根级 tsconfig (`tsconfig.json`)

| 选项 | 值 | 说明 |
|------|-----|------|
| `target` | `ES2022` | 编译目标 |
| `module` | `ESNext` | 模块格式 |
| `moduleResolution` | `bundler` | 适配 Bun bundler |
| `strict` | `true` | 严格模式 |
| `noEmit` | `true` | 仅类型检查，不输出 |
| `composite` | `true` | 项目引用支持 |
| `jsx` | `react-jsx` | JSX 转换 |
| `types` | `["bun-types"]` | Bun 运行时类型 |
| `include` | `["packages/**/*", "apps/**/*"]` | 覆盖 packages 和 apps |
| `exclude` | `["node_modules", "amp-cli-reversed", "**/*.test.ts"]` | 排除逆向代码和测试 |

### 4.2 tmux-capture tsconfig (`tmux-capture/tsconfig.json`)

| 选项 | 值 |
|------|-----|
| `target` | `ESNext` |
| `module` | `Preserve` |
| `moduleResolution` | `bundler` |
| `strict` | `true` |
| `noUncheckedIndexedAccess` | `true` |
| `noImplicitOverride` | `true` |

---

## 5. 构建与脚本

定义在根 `package.json` 中:

| 脚本 | 命令 | 说明 |
|------|------|------|
| `build` | `bun build packages/*/src/index.ts --outdir=dist` | Bun 原生构建 |
| `test` | `bun test` | Bun 原生测试运行器 |
| `lint` | `echo 'Lint script placeholder'` | 占位 (尚未配置) |
| `typecheck` | `tsc --noEmit` | TypeScript 类型检查 |

---

## 6. 第三方依赖 (来自逆向分析目标)

> 以下依赖从 `amp-cli-reversed/DEPENDENCIES.md` 提取，
> 代表 Flitter 项目计划实现/集成的目标能力。共 75 个包。

### 6.1 AI/LLM SDK

| 包名 | 版本 | 用途 |
|------|------|------|
| `@anthropic-ai/sdk` | 未知 | Anthropic Claude API 客户端 |
| `openai` | 未知 | OpenAI API 客户端 (GPT-5-Codex 等) |
| `@google/genai` | 未知 | Google Gemini API 客户端 |
| `@cerebras/cerebras_cloud_sdk` | 未知 | Cerebras Cloud 推理客户端 |

### 6.2 可观测性 (OpenTelemetry 全栈)

| 包名 | 确认版本 |
|------|----------|
| `@opentelemetry/api` | **1.9.0** |
| `@opentelemetry/resources` | **2.2.0** |
| `@opentelemetry/otlp-exporter-base` | **0.208.0** |
| `@opentelemetry/sdk-node` | 未知 |
| `@opentelemetry/sdk-trace-base` / `sdk-trace-node` | 未知 |
| `@opentelemetry/sdk-metrics` / `sdk-logs` | 未知 |
| `@opentelemetry/exporter-prometheus` / `exporter-zipkin` | 未知 |
| `@opentelemetry/propagator-b3` / `propagator-jaeger` | 未知 |
| `@opentelemetry/instrumentation` | 未知 |

### 6.3 gRPC / Protocol Buffers

| 包名 | 版本 |
|------|------|
| `@grpc/grpc-js` | **1.13.4** |
| `@grpc/proto-loader` | 未知 |
| `protobufjs` | 未知 |

### 6.4 Schema 验证

| 包名 | 版本 |
|------|------|
| `zod` | **4.3.6** |
| `ajv` | ~8.x |
| `json-schema-traverse` | 未知 |
| `fast-deep-equal` | 未知 |

### 6.5 MCP (Model Context Protocol)

| 包名 | 说明 |
|------|------|
| `@modelcontextprotocol/sdk` | MCP 官方 SDK (StdioClientTransport, SSEClientTransport, StreamableHTTPClientTransport) |

### 6.6 CLI / 终端

| 包名 | 说明 |
|------|------|
| `commander` | CLI 命令树框架 |
| `chalk` (v5+) | 终端颜色 |
| `ansi-styles` / `supports-color` | ANSI 样式与颜色检测 |
| `@xterm/headless` | 无头终端模拟 |
| `@napi-rs/keyring` (**1.1.10**) | OS 原生密钥链 |

### 6.7 Markdown / HTML

| 包名 | 说明 |
|------|------|
| `micromark` (+ GFM 扩展) | Markdown 解析 |
| `parse5` | HTML5 解析 |
| `entities` | HTML 实体解码 |

### 6.8 网络 / HTTP

| 包名 | 说明 |
|------|------|
| `gaxios` (**7.1.2**) | Google HTTP 客户端 |
| `https-proxy-agent` | HTTPS 代理 |
| `node-fetch` | Fetch polyfill |
| `ws` | WebSocket 客户端/服务端 |
| `bufferutil` (**4.0.9**) / `utf-8-validate` (**6.0.5**) | WebSocket 性能优化 |

### 6.9 状态管理与响应式

| 包名 | 说明 |
|------|------|
| `rxjs` | 响应式编程 (BehaviorSubject, pipe, operators) |
| `immer` (~10.x) | 不可变状态管理 |
| `zen-observable` | Observable 实现 |

### 6.10 实用工具

| 包名 | 说明 |
|------|------|
| `debug` | 调试日志 |
| `ms` | 时间字符串解析 |
| `diff` | 文本差异比较 |
| `decimal.js` | 高精度数学 |
| `cross-spawn` / `which` | 跨平台进程管理 |
| `picomatch` | Glob 模式匹配 |
| `qs` / `yaml` | 查询字符串和 YAML 处理 |
| `vscode-uri` | VS Code 风格 URI |
| `image-size` / `file-type` | 文件类型检测 |

### 6.11 tmux-capture 独有依赖

| 包名 | 版本 | 说明 |
|------|------|------|
| `@xterm/xterm` | **^6.0.0** | 终端模拟器 |
| `@xterm/headless` | **^6.0.0** | 无头终端 |
| `@xterm/addon-canvas` | ^0.7.0 | Canvas 渲染器 |
| `@xterm/addon-fit` | ^0.11.0 | 自适应尺寸 |
| `@xterm/addon-serialize` | ^0.14.0 | 序列化 |
| `@xterm/addon-unicode11` | ^0.9.0 | Unicode 11 支持 |
| `@xterm/addon-webgl` | ^0.19.0 | WebGL 渲染器 |
| `vite` | ^8.0.3 | 构建工具 |

---

## 7. 开发工具与配置

### 7.1 devDependencies (根级)

| 包名 | 版本 |
|------|------|
| `bun-types` | ^1.1.0 |
| `typescript` | ^5.4.0 |

### 7.2 AI Agent 工具链

项目集成了多套 AI agent 工作流框架：

| 目录 | 框架 | 配置 |
|------|------|------|
| `.claude/` | Claude Code (Anthropic) | `package.json`, `settings.json`, agents/, commands/, hooks/ |
| `.codex/` | Codex (OpenAI) | `config.toml`, agents/ (含 .toml 配置), skills/ |
| `.trae/` | Trae (字节跳动) | agents/, skills/, specs/, `gsd-file-manifest.json` |
| `.pi/` | Pi | `agents/supervisor.md`, `taskplane.json` |

### 7.3 GSD (Get Shit Done) 工作流

所有三个 agent 目录 (`.claude/`, `.codex/`, `.trae/`) 均部署了 GSD 工作流系统：

- **命令**: 60+ 条 (autonomous, plan-phase, execute-phase, code-review 等)
- **子代理**: 25+ 个专门角色 (executor, planner, verifier, security-auditor 等)
- **上下文**: dev, research, review 三种上下文模式
- **模板**: 项目、路线图、调试、UAT、UI 规范等

---

## 8. 架构分层总结

```
┌─────────────────────────────────────────────────────┐
│                  CLI 入口层                           │
│  @flitter/cli · flitter-cli-app                     │
├──────────────────────┬──────────────────────────────┤
│   Agent 核心引擎      │   终端 UI 框架               │
│   @flitter/agent-core │   @flitter/tui              │
│   ThreadWorker        │   Flutter-for-Terminal       │
│   工具执行 · Prompt 路由│   Widget→Element→RenderObject│
├──────────────────────┼──────────────────────────────┤
│              集成层                                   │
│   @flitter/llm (Anthropic·OpenAI·Gemini·xAI·Cerebras)│
│   MCP 协议 · OAuth · IDE Bridge · Git                │
├──────────────────────┬──────────────────────────────┤
│   数据层              │   基础设施工具层               │
│   @flitter/data       │   @flitter/util              │
│   ThreadStore         │   FileScanner · Keyring      │
│   ConfigService       │   OTel · Streams · URI       │
│   SkillService        │   Validation · i18n          │
├──────────────────────┴──────────────────────────────┤
│              Schema 层 (纯类型)                       │
│              @flitter/schemas                        │
└─────────────────────────────────────────────────────┘
```
