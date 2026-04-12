<!-- GSD:project-start source:PROJECT.md -->
## Project

**Flitter — Personal Amp CLI**

Flitter 是一个通过逆向工程 Sourcegraph Amp CLI 并逐模块迁移到 TypeScript 的 AI Agent 终端客户端。项目采用 Bun + TypeScript monorepo 架构，目标是将 `amp-cli-reversed/` 中的 116K 行逆向 JS 代码忠实翻译为类型安全的 TypeScript 模块，最终对齐原版 Amp CLI 的完整交互体验。面向开发者个人使用。

**Core Value:** 在终端中提供与原版 Amp CLI 功能对等的 AI Agent 交互体验——包括完整的 Flutter 三棵树 TUI 框架、多 LLM Provider 对话、MCP 工具集成和 Thread 管理。

### Constraints

- **运行时**: Bun >= 1.1.0，不考虑 Node.js 兼容
- **语言**: TypeScript 5.4+ strict mode，ESM-only
- **迁移方式**: JS → TS 直译，保持相同的函数签名和数据结构
- **测试**: TDD 模式，每个迁移模块先写测试后实现
- **注释**: JSDoc 中文为主，包含功能说明和使用示例
- **依赖**: 复用逆向识别的第三方库版本（如 Zod 4.3.6、@grpc/grpc-js 1.13.4 等）
- **还原度**: 纯还原，不做功能差异化改动
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

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
## 2. 项目结构 -- Monorepo
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
## 3. 依赖关系图
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
## 5. 构建与脚本
| 脚本 | 命令 | 说明 |
|------|------|------|
| `build` | `bun build packages/*/src/index.ts --outdir=dist` | Bun 原生构建 |
| `test` | `bun test` | Bun 原生测试运行器 |
| `lint` | `echo 'Lint script placeholder'` | 占位 (尚未配置) |
| `typecheck` | `tsc --noEmit` | TypeScript 类型检查 |
## 6. 第三方依赖 (来自逆向分析目标)
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
## 7. 开发工具与配置
### 7.1 devDependencies (根级)
| 包名 | 版本 |
|------|------|
| `bun-types` | ^1.1.0 |
| `typescript` | ^5.4.0 |
### 7.2 AI Agent 工具链
| 目录 | 框架 | 配置 |
|------|------|------|
| `.claude/` | Claude Code (Anthropic) | `package.json`, `settings.json`, agents/, commands/, hooks/ |
| `.codex/` | Codex (OpenAI) | `config.toml`, agents/ (含 .toml 配置), skills/ |
| `.trae/` | Trae (字节跳动) | agents/, skills/, specs/, `gsd-file-manifest.json` |
| `.pi/` | Pi | `agents/supervisor.md`, `taskplane.json` |
### 7.3 GSD (Get Shit Done) 工作流
- **命令**: 60+ 条 (autonomous, plan-phase, execute-phase, code-review 等)
- **子代理**: 25+ 个专门角色 (executor, planner, verifier, security-auditor 等)
- **上下文**: dev, research, review 三种上下文模式
- **模板**: 项目、路线图、调试、UAT、UI 规范等
## 8. 架构分层总结
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## 1. 项目概貌
### 目录结构
## 2. 语言与运行时
| 项目 | 规范 |
|------|------|
| 语言 | TypeScript (strict mode) |
| 运行时 | **Bun** (非 Node.js) |
| 模块系统 | ESM (`"type": "module"`) |
| 类型库 | `bun-types` ^1.1.0 |
| TypeScript | ^5.4.0 |
| 构建 | `bun build packages/*/src/index.ts --outdir=dist` |
| 类型检查 | `tsc --noEmit` |
- **关键约束**: 运行入口使用 `#!/usr/bin/env bun` shebang (见 `packages/cli/bin/flitter.ts`、`apps/flitter-cli/bin/flitter.ts`)。
- 配置于根 `package.json` 的 `"type": "module"` 和每个子包的 `"type": "module"` 确保全项目 ESM-only。
## 3. TypeScript 配置
### 3.1 严格性设置
### 3.2 模块解析
### 3.3 tmux-capture 子项目差异
- `"noUncheckedIndexedAccess": true` -- 索引访问返回 `T | undefined`
- `"noImplicitOverride": true` -- 强制 `override` 关键字
- `"noFallthroughCasesInSwitch": true` -- 禁止 switch 穿透
- `"verbatimModuleSyntax": true` -- 强制 `import type` 语法
- `"allowImportingTsExtensions": true` -- 允许 `.ts` 扩展名导入
## 4. 包管理与依赖
| 配置 | 值 | 来源 |
|------|----|------|
| 包管理器 | Bun (兼容 pnpm workspace 协议) | `package.json` |
| Workspace 协议 | `"workspace:*"` | 子包 `package.json` |
| `.npmrc` | `shamefully-hoist=true`, `strict-peer-dependencies=false` | `.npmrc` |
### 4.1 Monorepo Workspace 定义
### 4.2 包间依赖方向 (单向，禁止循环)
## 5. 命名规范
### 5.1 包命名
- 内部包使用 `@flitter/` scope: `@flitter/schemas`, `@flitter/util`, `@flitter/tui` 等。
- 顶层聚合包使用裸名: `flitter`。
- CLI 应用包: `flitter-cli-app` (私有，不发布)。
### 5.2 文件命名
- TypeScript 源文件: **kebab-case** (推断自逆向参考代码 `amp-cli-reversed/` 的模块命名: `cli-entrypoint.js`, `tool-execution-engine.js`, `tui-widget-framework.js` 等)。
- 包入口: `src/index.ts` (统一)。
- CLI 入口: `bin/flitter.ts`。
- 每个文件开头包含单行模块注释: `// @flitter/schemas - Data schemas`。
### 5.3 导出约定
- 每个包通过 `src/index.ts` 统一导出，配合 `package.json` 的 `exports` 字段:
## 6. 代码风格
### 6.1 格式化工具
### 6.2 观察到的风格 (来自 `tmux-capture/render.ts`)
- 缩进: 2 空格。
- 字符串: 双引号 (`"`)。
- 分号: 有分号。
- 函数: 优先使用具名函数声明 (`function parseSize(...)`)。
- 类型注解: 显式标注参数和返回值类型 (`function parseSize(filename: string): { rows: number; cols: number } | null`)。
- 变量: `const` 优先, `let` 用于可变。
- 箭头函数: 用于简短的工具函数 (`const sleep = (ms: number) => ...`)。
- 错误处理: `try/finally` 确保清理; 空 `catch {}` 用于忽略已知不重要的错误。
## 7. 架构模式
### 7.1 分层架构
- **横向拆分**: 基于模块的职责和耦合度。
- **纵向分层**: 基于架构层次。
- **依赖方向**: 只允许上层依赖下层，禁止循环依赖。
- **可独立演进**: 每个 subpackage 有清晰的边界。
### 7.2 模块注释头
### 7.3 CLI 入口模式
#!/usr/bin/env bun
## 8. 错误处理
### 8.1 自定义错误类
### 8.2 Promise-based 错误传播
### 8.3 权限检查模式
## 9. 逆向参考代码约定
### 9.1 模块分类
| 目录 | 类型 | 用途 |
|------|------|------|
| `app/` | scope-hoisted | 应用逻辑 (CLI, Agent, LLM, 权限) |
| `framework/` | scope-hoisted | TUI 框架 (Widget, Layout, Render) |
| `util/` | scope-hoisted | 工具模块 (HTTP, 文件扫描, Keyring) |
| `vendor/cjs/` | CJS | npm 第三方包 |
| `vendor/esm/` | ESM | ESM 第三方模块 + Schema |
| `bun-internal/` | Bun runtime | Bun 内部模块 |
| `esbuild-bundles/` | CJS bundle | esbuild 预打包模块 |
### 9.2 使用约定
- **只读参考**: 逆向代码不参与构建和测试。
- **命名映射**: 逆向模块名 (如 `tool-execution-engine`) 直接对应目标包的功能模块。
- **模块索引**: `_module-index.json` 提供所有模块的元数据索引。
## 10. 配置文件索引
| 文件 | 路径 | 用途 |
|------|------|------|
| 根 package.json | `package.json` | Monorepo 配置, scripts, workspace 定义 |
| 根 tsconfig.json | `tsconfig.json` | TypeScript 编译选项 |
| .npmrc | `.npmrc` | pnpm/bun 包管理配置 |
| .gitignore | `.gitignore` | Git 忽略规则 |
| ARCHITECTURE.md | `ARCHITECTURE.md` | 架构设计文档 |
| tmux tsconfig | `tmux-capture/tsconfig.json` | tmux 工具的 TS 配置 |
| GSD config | `.codex/config.toml` | GSD Agent 子代理配置 |
## 11. 待建立的规范 (Gap)
| Gap | 说明 | 优先级 |
|-----|------|--------|
| Linter | 无 ESLint/Biome 配置 | 高 |
| Formatter | 无 Prettier/Biome 配置 | 高 |
| CI/CD | 无 GitHub Actions workflow | 高 |
| Commit Convention | 无 commitlint/conventional commits 配置 | 中 |
| Import Ordering | 无自动 import 排序规则 | 中 |
| API Documentation | 无 TSDoc/JSDoc 规范文档 | 中 |
| Error Handling | 无统一的自定义 Error 类体系 | 高 |
| Logging | 无统一日志框架配置 | 中 |
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## 1. 项目概览
## 2. 架构分层
### 2.1 四层架构
```
```
### 2.2 组装层
- 将所有子包组装成统一应用
- 配置依赖注入
- 提供对外的统一 API 门面
## 3. 依赖关系图
```
```
- 依赖方向严格单向: 上层 -> 下层
- 禁止循环依赖
- `@flitter/tui` 零内部依赖，可独立发布为通用终端 UI 框架
- `@flitter/schemas` 为纯类型包，处于依赖树叶节点
## 4. 核心抽象与设计模式
### 4.1 Agent 核心引擎 (`@flitter/agent-core`)
```
```
```
```
### 4.2 TUI 框架 (`@flitter/tui`)
```
```
```
```
| 模块 | 职责 |
|------|------|
| `tui-widget-framework` | VT/ANSI 解析器状态机, RenderObject 基类 |
| `tui-render-pipeline` | WidgetsBinding, `runApp()` 入口, TextStyle/TextSpan |
| `tui-layout-engine` | FrameScheduler, BuildOwner, 性能追踪 |
| `tui-widget-library` | TextEditingController, 主题系统, Activity 分类管线 |
| `micromark-parser` | CommonMark + GFM Markdown 解析器 |
| `clipboard-and-input` | 终端能力检测, 跨平台剪贴板, TUI 控制器 |
### 4.3 LLM 多 Provider SDK (`@flitter/llm`)
- **Anthropic**: Claude 系列 (含 streaming, thinking blocks)
- **OpenAI**: GPT 系列 (Responses API 适配器)
- **Google**: Vertex AI / Gemini
- **xAI**: Grok
- **其他**: Cerebras, Fireworks, BaseTen, Kimi
```
```
### 4.4 MCP 协议传输 (`@flitter/llm` 的一部分)
### 4.5 数据与状态层 (`@flitter/data`)
### 4.6 基础设施工具 (`@flitter/util`)
| 子系统 | 来源模块 | 能力 |
|--------|---------|------|
| Reactive | `http-sdk-core.js` | Observable, BehaviorSubject, pipe/map/filter |
| URI | `http-sdk-core.js` | VS Code 风格 URI 类 |
| Schema | `json-schema-validator.js` | JSON Schema -> Zod 转换 |
| Keyring | `keyring-native-loader.js` | OS 原生密钥链凭据存储 |
| IDE Bridge | `connection-transport.js` | VS Code/JetBrains WebSocket 桥 |
| OTel | `otel-instrumentation.js` | OpenTelemetry 遥测 |
| File Scanner | `file-scanner.js` | rg/fd 驱动的目录扫描 |
| Git | `http-request-executor.js` | git status/diff/patch 操作 |
| Fuzzy Search | `http-request-executor.js` | 多层评分模糊文件搜索 |
## 5. 入口点
### 5.1 主入口: CLI 可执行文件
```
```
### 5.2 两种运行模式 (设计目标)
## 6. 关键数据流
### 6.1 用户交互 -> Agent 执行
```
```
### 6.2 TUI 渲染管线
```
```
### 6.3 MCP 工具通信
```
```
## 7. 架构模式
| 模式 | 应用位置 |
|------|---------|
| **Monorepo + Workspace** | 根 `package.json` (`workspaces: ["packages/*", "apps/*"]`) |
| **组装层 (Composition Root)** | `packages/flitter/` 聚合所有子包 |
| **Flutter 三棵树** | `@flitter/tui` (Widget → Element → RenderObject) |
| **游戏循环 / 帧调度** | `FrameScheduler` ~16ms 帧, build→layout→paint→render |
| **脏标记 (Dirty Flag)** | `BuildOwner` 追踪脏元素, 按深度排序重建 |
| **状态机** | VT 解析器, Agent 状态, WebSocket 连接状态 |
| **观察者 / Reactive** | Observable, BehaviorSubject (RxJS 风格), 事件发射 |
| **策略模式** | LLM 多 Provider, 跨平台剪贴板, 渲染模式 |
| **门面模式** | TUI Controller 封装终端底层操作 |
| **钩子系统** | `tool:pre-execute`, `tool:post-execute`, `assistant:end-turn` |
| **Provider 注册表** | 工具注册表, LLM Provider 注册表, 模型目录 |
| **权限 DSL** | 工具权限规则匹配 (glob + picomatch) |
## 8. 构建与运行时
- **运行时**: Bun (>= 1.1.0)
- **语言**: TypeScript 5.4+, ESM (`"type": "module"`)
- **包管理**: Bun workspaces (`workspace:*` 协议)
- **构建**: `bun build packages/*/src/index.ts --outdir=dist`
- **类型检查**: `tsc --noEmit`
- **测试**: `bun test`
## 9. 逆向参考代码 (`amp-cli-reversed/`)
| 目录 | 模块数 | 总行数 | 职责 |
|------|--------|--------|------|
| `app/` | 20 | ~58,243 | 应用核心 (CLI, Agent, LLM, MCP, State) |
| `framework/` | 10 | ~26,243 | TUI 框架 (Flutter-for-Terminal) |
| `util/` | 9 | ~27,869 | 基础设施 (Reactive, URI, Git, FileScanner) |
| `vendor/esm/` | ~200 | -- | 内部 ESM 模块 (Schemas, Auth, Tools, Config) |
| `vendor/cjs/` | ~500+ | -- | 第三方 CJS 依赖 (OpenTelemetry, gRPC, YAML, etc.) |
## 10. 架构决策记录 (ADR) 摘要
| ADR | 决策 | 理由 |
|-----|------|------|
| ADR-001 | Monorepo 结构 | 清晰职责分离, 便于团队协作 |
| ADR-002 | `@flitter/tui` 无内部依赖 | 可独立发布为通用终端 UI 框架 |
| ADR-003 | `@flitter/schemas` 纯类型 | 依赖树叶节点, 所有包共享类型定义 |
| ADR-004 | Bun 运行时 | 原始 Amp 使用 Bun, 保持运行时一致性 |
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.trae/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
