# Flitter Monorepo -- 架构分析

> 生成时间: 2026-04-12
> 范围: `/Users/bytedance/.oh-my-coco/studio/flitter`

---

## 1. 项目概览

Flitter 是一个基于逆向工程 Sourcegraph Amp CLI 的 AI Agent 终端客户端项目。它采用 **Bun + TypeScript monorepo** 架构，目标是将逆向获得的混淆代码重构为可维护的模块化代码库。

项目当前处于**脚手架阶段** -- 所有包的 `src/index.ts` 均为占位导出 (`export {}`), 实际业务逻辑尚未从 `amp-cli-reversed/` 参考目录迁移到 TypeScript 包中。

---

## 2. 架构分层

### 2.1 四层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Layer 4: 应用入口 (Apps)                          │
│  apps/flitter-cli/          -- CLI 可执行入口                        │
│  packages/cli/              -- CLI 命令树 & REPL                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ 依赖
┌────────────────────────────▼────────────────────────────────────────┐
│                  Layer 3: 领域核心 (Domain Core)                      │
│  packages/agent-core/       -- ThreadWorker, 工具执行引擎, Prompt 路由   │
│  packages/tui/              -- Flutter-for-Terminal UI 框架           │
│  packages/llm/              -- 多 Provider LLM SDK, MCP 协议          │
│  packages/data/             -- 会话管理, 配置系统, Skill 系统            │
└────────────────────────────┬────────────────────────────────────────┘
                             │ 依赖
┌────────────────────────────▼────────────────────────────────────────┐
│                  Layer 2: 基础设施 (Infrastructure)                    │
│  packages/util/             -- Reactive 原语, URI, 文件扫描, Git, OTel  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ 依赖
┌────────────────────────────▼────────────────────────────────────────┐
│                  Layer 1: 纯类型 (Pure Types)                         │
│  packages/schemas/          -- Zod schema, JSON Schema, 协议定义       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 组装层

`packages/flitter/` 作为**组装层 (Composition Root)**，依赖所有 `@flitter/*` 包，负责:
- 将所有子包组装成统一应用
- 配置依赖注入
- 提供对外的统一 API 门面

---

## 3. 依赖关系图

```
flitter-cli-app (apps/flitter-cli/)
  └── flitter (packages/flitter/) -- 组装层
        ├── @flitter/cli (packages/cli/)
        │     ├── @flitter/agent-core
        │     ├── @flitter/tui
        │     ├── @flitter/data
        │     └── @flitter/llm
        ├── @flitter/agent-core (packages/agent-core/)
        │     ├── @flitter/schemas
        │     └── @flitter/util
        ├── @flitter/tui (packages/tui/)
        │     └── (无内部依赖 -- 可独立发布)
        ├── @flitter/llm (packages/llm/)
        │     ├── @flitter/schemas
        │     └── @flitter/util
        ├── @flitter/data (packages/data/)
        │     ├── @flitter/schemas
        │     └── @flitter/util
        ├── @flitter/util (packages/util/)
        │     └── @flitter/schemas
        └── @flitter/schemas (packages/schemas/)
              └── (无依赖 -- 纯类型)
```

**关键约束**:
- 依赖方向严格单向: 上层 -> 下层
- 禁止循环依赖
- `@flitter/tui` 零内部依赖，可独立发布为通用终端 UI 框架
- `@flitter/schemas` 为纯类型包，处于依赖树叶节点

---

## 4. 核心抽象与设计模式

### 4.1 Agent 核心引擎 (`@flitter/agent-core`)

**来源**: `amp-cli-reversed/app/tool-execution-engine.js` (3,597行)

核心类 `ThreadWorker` 管理单个 Agent 线程的完整生命周期:

```
用户输入
  → Snapshot 创建
  → Skill 注入 (prompt-classification)
  → System Prompt 生成 (prompt-routing)
  → LLM 推理调用
  → tool_use 解析
  → 权限检查 (tool-permissions)
  → 并行工具执行
  → tool_result 回传
  → 循环: 推理 → 工具 → 推理
  → 会话持久化 (session-management)
```

**状态机**:
```
idle → streaming → blocked-on-user → idle
                 → tool:data → tool:processed → streaming
```

### 4.2 TUI 框架 (`@flitter/tui`)

**来源**: `amp-cli-reversed/framework/` (10 个模块, ~26,243 行)

实现了 **Flutter-for-Terminal** 的三棵树架构:

```
Widget Tree (声明式配置)
  → Element Tree (生命周期管理)
    → RenderObject Tree (布局与绘制)
```

**渲染管线** (由 `FrameScheduler` 驱动, ~16ms 帧间隔):
```
Build Phase → Layout Phase → Paint Phase → Render Phase
(重建脏元素)  (约束传递)     (绘制命令)    (ANSI 差分输出)
```

**关键组件**:
| 模块 | 职责 |
|------|------|
| `tui-widget-framework` | VT/ANSI 解析器状态机, RenderObject 基类 |
| `tui-render-pipeline` | WidgetsBinding, `runApp()` 入口, TextStyle/TextSpan |
| `tui-layout-engine` | FrameScheduler, BuildOwner, 性能追踪 |
| `tui-widget-library` | TextEditingController, 主题系统, Activity 分类管线 |
| `micromark-parser` | CommonMark + GFM Markdown 解析器 |
| `clipboard-and-input` | 终端能力检测, 跨平台剪贴板, TUI 控制器 |

### 4.3 LLM 多 Provider SDK (`@flitter/llm`)

**来源**: `amp-cli-reversed/app/llm-sdk-providers.js` (10,232行 -- 最大模块)

支持的 LLM Provider:
- **Anthropic**: Claude 系列 (含 streaming, thinking blocks)
- **OpenAI**: GPT 系列 (Responses API 适配器)
- **Google**: Vertex AI / Gemini
- **xAI**: Grok
- **其他**: Cerebras, Fireworks, BaseTen, Kimi

**请求流**:
```
内部消息格式
  → Provider 特定格式转换 (tool_use/tool_result, images, guidance files)
  → HTTP 请求 (含重试, 超时, 指数退避)
  → SSE 流式响应解析
  → 统一内部消息格式
```

### 4.4 MCP 协议传输 (`@flitter/llm` 的一部分)

**来源**: `amp-cli-reversed/app/mcp-transport.js` (1,309行)

支持两种传输:
1. **Stdio**: 通过子进程 stdin/stdout 的 JSON-RPC
2. **SSE (StreamableHTTP)**: Server-Sent Events HTTP 传输, 含 OAuth 2.0 认证

生命周期: `initialize → capabilities → tools/list → prompts/list → [usage] → close`

### 4.5 数据与状态层 (`@flitter/data`)

**来源**: `amp-cli-reversed/app/session-management.js`, `claude-config-system.js`, `skills-agents-system.js`

三大子系统:
1. **ThreadStore**: 线程持久化 (缓存, 脏追踪, 远程同步)
2. **ConfigService**: 设置管理 (`settings.json`/`settings.jsonc`, 全局/工作区作用域)
3. **SkillService**: Skill 发现与加载 (`SKILL.md` + YAML front-matter)

### 4.6 基础设施工具 (`@flitter/util`)

**来源**: `amp-cli-reversed/util/` (9 个模块, ~27,869 行)

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

---

## 5. 入口点

### 5.1 主入口: CLI 可执行文件

```
apps/flitter-cli/bin/flitter.ts     -- #!/usr/bin/env bun 入口
  └── packages/flitter/src/index.ts  -- 组装层
        └── packages/cli/bin/flitter.ts  -- CLI 命令树
```

### 5.2 两种运行模式 (设计目标)

1. **交互式 TUI 模式**: 全屏终端 UI, Widget 渲染管线
   - 来源: `amp-cli-reversed/app/cli-commander-system.js`
2. **Headless 流式模式**: JSON 结构化事件输出到 stdout
   - 来源: `amp-cli-reversed/app/cli-entrypoint.js`
   - 事件类型: `system/init`, `user/message`, `assistant/message`, `tool/call`, `result`

---

## 6. 关键数据流

### 6.1 用户交互 -> Agent 执行

```
[终端输入]
  → @flitter/cli: 命令解析 (Commander.js)
  → @flitter/agent-core: ThreadWorker.processMessage()
     ├── @flitter/data: SkillService.loadSkills() -- 注入 SKILL.md
     ├── prompt-routing: 生成 system prompt
     ├── @flitter/llm: LLM 推理 (Anthropic/OpenAI/Gemini)
     ├── tool-permissions: 权限检查 (allow/ask/reject/delegate)
     ├── [工具执行: Bash, Read, edit_file, Grep, ...]
     ├── @flitter/llm: 回传 tool_result, 继续推理
     └── @flitter/data: ThreadStore.persist()
  → @flitter/tui: Widget 树更新 → 差分渲染
[终端输出]
```

### 6.2 TUI 渲染管线

```
[原始终端字节]
  → VT/ANSI 解析器 (状态机: ground/escape/csi_entry/osc_string/...)
  → 输入事件 (键盘/鼠标/粘贴/焦点)
  → Widget.build() -- 声明式 UI 构建
  → Element 差分协调
  → RenderObject 布局 (约束传递: 父→子)
  → Paint (绘制命令 -> 屏幕缓冲区)
  → ANSI 差分渲染 (仅输出变更单元格)
[终端序列输出]
```

### 6.3 MCP 工具通信

```
@flitter/llm: MCP Client
  ├── Stdio 传输: spawn(server) → stdin/stdout JSON-RPC
  └── SSE 传输: HTTP POST → SSE 流
       └── OAuth 2.0: PKCE → authorization_code → token
```

---

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

---

## 8. 构建与运行时

- **运行时**: Bun (>= 1.1.0)
- **语言**: TypeScript 5.4+, ESM (`"type": "module"`)
- **包管理**: Bun workspaces (`workspace:*` 协议)
- **构建**: `bun build packages/*/src/index.ts --outdir=dist`
- **类型检查**: `tsc --noEmit`
- **测试**: `bun test`

---

## 9. 逆向参考代码 (`amp-cli-reversed/`)

这是从 Sourcegraph Amp 二进制文件逆向获得的 JavaScript 代码，作为重构参考:

| 目录 | 模块数 | 总行数 | 职责 |
|------|--------|--------|------|
| `app/` | 20 | ~58,243 | 应用核心 (CLI, Agent, LLM, MCP, State) |
| `framework/` | 10 | ~26,243 | TUI 框架 (Flutter-for-Terminal) |
| `util/` | 9 | ~27,869 | 基础设施 (Reactive, URI, Git, FileScanner) |
| `vendor/esm/` | ~200 | -- | 内部 ESM 模块 (Schemas, Auth, Tools, Config) |
| `vendor/cjs/` | ~500+ | -- | 第三方 CJS 依赖 (OpenTelemetry, gRPC, YAML, etc.) |

---

## 10. 架构决策记录 (ADR) 摘要

| ADR | 决策 | 理由 |
|-----|------|------|
| ADR-001 | Monorepo 结构 | 清晰职责分离, 便于团队协作 |
| ADR-002 | `@flitter/tui` 无内部依赖 | 可独立发布为通用终端 UI 框架 |
| ADR-003 | `@flitter/schemas` 纯类型 | 依赖树叶节点, 所有包共享类型定义 |
| ADR-004 | Bun 运行时 | 原始 Amp 使用 Bun, 保持运行时一致性 |
