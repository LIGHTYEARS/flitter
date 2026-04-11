# Flitter Monorepo -- 外部集成分析

> 生成日期: 2026-04-12
> 根目录: `/Users/bytedance/.oh-my-coco/studio/flitter`
> 数据来源: `amp-cli-reversed/` 逆向分析代码 + `ARCHITECTURE.md`

---

## 1. LLM Provider API (5 个)

Flitter 的目标是实现多 Provider LLM 推理层，通过 `@flitter/llm` 包统一管理。
逆向代码主入口: `amp-cli-reversed/app/llm-sdk-providers.js` (10,232 行)

### 1.1 Anthropic (Claude)

| 维度 | 详情 |
|------|------|
| **SDK** | `@anthropic-ai/sdk` (Stainless 生成) |
| **Base URL** | `https://api.anthropic.com` |
| **API 版本** | `anthropic-version: 2023-06-01` |
| **认证方式** | API Key (`X-Api-Key` header) + Bearer Token |
| **端点** | `/v1/messages` (streaming) |
| **功能** | 请求构建、指数退避重试、流式传输、幂等性 header、超时管理、结构化输出 |
| **模型** | Claude 系列 (包括 `CLAUDE_HAIKU_4_5` 用于子代理) |
| **涉及模块** | `app/llm-sdk-providers.js`, `app/mcp-tools-integration.js` |

### 1.2 OpenAI

| 维度 | 详情 |
|------|------|
| **SDK** | `openai` (Stainless 生成) |
| **Base URL** | `https://api.openai.com/v1` |
| **认证方式** | API Key + Organization + Project |
| **功能** | Responses API 流式事件处理、SSE 流式累加器 |
| **模型** | `gpt-5-codex` 等 |
| **涉及模块** | `app/llm-sdk-providers.js`, `app/rpc-protocol-layer.js`, `util/web-streams-polyfill.js` |

### 1.3 Google Gemini / Vertex AI

| 维度 | 详情 |
|------|------|
| **SDK** | `@google/genai` |
| **Base URL (Gemini)** | `https://generativelanguage.googleapis.com` |
| **Base URL (Vertex AI)** | `https://{location}-aiplatform.googleapis.com/` |
| **Base URL (全球)** | `https://aiplatform.googleapis.com/` |
| **认证方式** | API Key (`x-goog-api-key`) 或 GCP OAuth (`cloud-platform` scope) |
| **功能** | 文本/图片/视频生成 |
| **涉及模块** | `app/llm-sdk-providers.js` |

### 1.4 xAI (Grok)

| 维度 | 详情 |
|------|------|
| **API 路径** | `/api/provider/xai/v1` |
| **功能** | xAI API 适配器 |
| **涉及模块** | `util/web-streams-polyfill.js` |

### 1.5 Cerebras

| 维度 | 详情 |
|------|------|
| **SDK** | `@cerebras/cerebras_cloud_sdk` |
| **功能** | 高速推理客户端 |
| **涉及模块** | `util/web-streams-polyfill.js` |

### 1.6 其他 Provider 路由

逆向代码中还发现以下 Provider 路径:

| Provider | API 路径 |
|----------|----------|
| Fireworks AI | `/api/provider/fireworks/v1` |
| BaseTen | `/api/provider/baseten/v1` |

---

## 2. MCP (Model Context Protocol)

MCP 是 Flitter 的核心工具集成协议，由 `@flitter/llm` 包负责。

### 2.1 MCP 传输层

| 传输方式 | 实现 | 说明 |
|----------|------|------|
| **Stdio** | 子进程 spawn + JSON-RPC over stdin/stdout | 本地 MCP 服务器 |
| **SSE** | Server-Sent Events over HTTP | 远程 MCP 服务器 |
| **StreamableHTTP** | HTTP 流式传输 | 新一代 MCP 传输 |
| **涉及模块** | `amp-cli-reversed/app/mcp-transport.js` (1,309 行) |

### 2.2 MCP 协议版本

| 版本 | 说明 |
|------|------|
| `2025-06-18` | 最新 |
| `2025-03-26` | 中间版本 |
| 旧版 | 向后兼容 |

### 2.3 MCP 核心操作

| JSON-RPC 方法 | 用途 |
|----------------|------|
| `initialize` | 能力协商 |
| `notifications/initialized` | 初始化完成通知 |
| `tools/list` | 列举可用工具 |
| `prompts/list` | 列举可用提示 |
| `ping` | 健康检查 |

### 2.4 MCP 服务器管理

| 功能 | 说明 |
|------|------|
| 生命周期 | 启动、停止、重启、健康监控 |
| 信任管理 | workspace 级别的 MCP 服务器审批 (`amp.mcpTrustedWorkspaces`) |
| CLI 命令 | `mcp add/remove/list/doctor/approve` |
| **涉及模块** | `amp-cli-reversed/util/otel-instrumentation.js` |

---

## 3. 认证与授权

### 3.1 OAuth 2.0 (MCP 服务器认证)

| 维度 | 详情 |
|------|------|
| **标准** | OAuth 2.0 + PKCE |
| **发现机制** | `/.well-known/oauth-protected-resource` (RFC 9728) |
| | `/.well-known/oauth-authorization-server` |
| **流程** | Authorization Code + PKCE (code_challenge/code_verifier) |
| **客户端注册** | 动态客户端注册 |
| **Token 管理** | Authorization code exchange + Refresh token rotation |
| **header** | `MCP-Protocol-Version` |
| **状态** | `AUTHORIZED`, `REDIRECT` |
| **涉及模块** | `amp-cli-reversed/app/oauth-auth-provider.js` (1,699 行) |

### 3.2 CLI 登录 (OAuth Callback)

| 维度 | 详情 |
|------|------|
| **方式** | 本地 HTTP 服务器接收 auth code |
| **回调路径** | `/auth/callback` |
| **CORS** | `Access-Control-Allow-Origin: ampcode.com` |
| **凭据存储** | OS 原生密钥链 (`@napi-rs/keyring`) |
| **涉及模块** | `amp-cli-reversed/framework/app-state-management.js`, `amp-cli-reversed/app/conversation-ui-logic.js` |

### 3.3 API Key 认证

| Provider | Header |
|----------|--------|
| Anthropic | `X-Api-Key` |
| OpenAI | Bearer token |
| Google | `x-goog-api-key` |
| 幂等性 | `X-Stainless-Retry-Count` (Anthropic SDK) |

### 3.4 IDE 认证

| 维度 | 详情 |
|------|------|
| **方式** | WebSocket 连接认证 |
| **错误** | `"IDE authentication failed"` |
| **涉及模块** | `amp-cli-reversed/util/connection-transport.js` |

---

## 4. 代码托管平台集成

### 4.1 GitHub

| 维度 | 详情 |
|------|------|
| **API 代理** | `/api/internal/github-proxy/{path}` |
| **认证状态** | `/api/internal/github-auth-status` |
| **API 版本** | `Accept: application/vnd.github.v3.text-match+json` |
| **功能** | 文件读取、代码搜索 (`search_github`)、目录列举 (`list_directory_github`) |
| **限制** | 仅支持 `github.com` |
| **涉及模块** | `amp-cli-reversed/util/protobuf-mime-types.js` |

### 4.2 Bitbucket Enterprise

| 维度 | 详情 |
|------|------|
| **实例 URL** | `/api/internal/bitbucket-instance-url` |
| **认证** | `bitbucketToken` 配置 |
| **功能** | 文件读取、代码搜索 |
| **涉及模块** | `amp-cli-reversed/util/protobuf-mime-types.js` |

### 4.3 Provider 自动检测

```
bitbucketToken 存在 → "bitbucket-enterprise"
否则              → "github"
```

---

## 5. DTW (Durable Thread Workers) -- 远程执行

### 5.1 WebSocket 传输

| 维度 | 详情 |
|------|------|
| **协议** | WebSocket (ws: / wss:) |
| **子协议** | `"amp"` |
| **端点** | `/api/durable-thread-workers`, `/threads` |
| **编码** | CBOR 二进制有线协议 |
| **特性** | 重连、ping/pong 保活、二进制消息帧 |
| **涉及模块** | `amp-cli-reversed/app/rpc-protocol-layer.js` (9,265 行) |

### 5.2 DTW 同步引擎

| 事件类型 | 说明 |
|----------|------|
| `message_added` | 新消息 |
| `message_edited` | 消息编辑 |
| `delta` | 增量更新 |
| `tool_progress` | 工具执行进度 |
| `agent_state` | Agent 状态变更 |
| `thread_title` | 线程标题更新 |
| `error_notice` | 错误通知 |
| **涉及模块** | `amp-cli-reversed/app/realtime-sync.js` (2,175 行) |

### 5.3 Live Sync (文件同步)

| 维度 | 详情 |
|------|------|
| **方向** | 双向 (本地 git worktree <-> 远程 DTW executor) |
| **涉及模块** | `amp-cli-reversed/framework/app-state-management.js` |

---

## 6. IDE 集成 (IDE Bridge)

### 6.1 支持的 IDE

| IDE | 连接方式 | 涉及模块 |
|-----|----------|----------|
| **VS Code** | WebSocket + 查询轮询回退 | `amp-cli-reversed/util/connection-transport.js` |
| **JetBrains** | 插件 (自动更新) | `amp-cli-reversed/_preamble.js` |
| **Zed** | 适配器 | `amp-cli-reversed/vendor/esm/ide-integration-zed.js` |

### 6.2 IDE 协议操作

| 操作 | 说明 |
|------|------|
| `getDiagnostics` | 获取代码诊断信息 |
| `openURI` | 在 IDE 中打开文件 |
| **Schemas** | `amp-cli-reversed/vendor/esm/ide-protocol-schemas.js` |

### 6.3 JetBrains 插件更新

| 维度 | 详情 |
|------|------|
| **检查 URL** | `https://storage.googleapis.com/amp-public-assets-prod-0/jetbrains/latest.json` |
| **插件 ID** | `amp-jetbrains-plugin` |

---

## 7. 可观测性 (OpenTelemetry)

### 7.1 全栈 OTel

| 层 | 组件 |
|----|------|
| **Traces** | `BasicTracerProvider`, `BatchSpanProcessor`, `NodeTracerProvider` |
| **Metrics** | `MeterProvider`, `PeriodicExportingMetricReader` |
| **Logs** | `BatchLogRecordProcessor`, `LogRecordImpl` |

### 7.2 Exporter

| 格式 | 目标 |
|------|------|
| OTLP/gRPC | 通用 OTLP 后端 |
| OTLP/HTTP | 通用 OTLP 后端 |
| Prometheus | Prometheus 抓取端点 |
| Zipkin | Zipkin 追踪后端 |

### 7.3 传播器

| 传播器 | 说明 |
|--------|------|
| W3C TraceContext | 默认 |
| B3 (Single + Multi) | Zipkin 兼容 |
| Jaeger | Jaeger 原生格式 |

### 7.4 Fetch Instrumentation

| 维度 | 详情 |
|------|------|
| **名称** | `fetch-instrumentation` |
| **版本** | `1.0.0` |
| **涉及模块** | `amp-cli-reversed/util/otel-instrumentation.js` |

---

## 8. Ampcode 服务端 API

### 8.1 核心端点

| 端点/域名 | 用途 |
|-----------|------|
| `https://ampcode.com` | 主应用 URL |
| `https://ampcode.com/threads/{id}` | Thread 链接 |
| `https://ampcode.com/manual` | 文档手册 |
| `https://static.ampcode.com/cli` | CLI 静态资源 |
| `https://static.ampcode.com/cli/cli-version.txt` | 版本检查 |
| `https://cdn.ampcode.com/` | 二进制下载 CDN |

### 8.2 内部 API

| 端点 | 用途 |
|------|------|
| `/api/internal/github-proxy/` | GitHub API 代理 |
| `/api/internal/github-auth-status` | GitHub 认证状态 |
| `/api/internal/bitbucket-instance-url` | Bitbucket 实例配置 |
| `/api/durable-thread-workers` | DTW WebSocket 入口 |

### 8.3 Google Cloud Storage

| URL | 用途 |
|-----|------|
| `https://storage.googleapis.com/amp-public-assets-prod-0/ripgrep/` | ripgrep 二进制下载 |
| `https://storage.googleapis.com/amp-public-assets-prod-0/jetbrains/latest.json` | JetBrains 插件版本 |

---

## 9. 线程持久化 (ThreadStore)

### 9.1 本地存储

| 维度 | 详情 |
|------|------|
| **格式** | JSON 文件 |
| **操作** | 创建、读取、更新、删除、归档 |
| **机制** | 缓存线程 + dirty tracking + 节流上传 |
| **涉及模块** | `amp-cli-reversed/app/session-management.js`, `amp-cli-reversed/util/protobuf-mime-types.js` |

### 9.2 远程同步

| 维度 | 详情 |
|------|------|
| **服务** | ThreadService |
| **操作** | get/observe/delete/archive/flush |
| **同步方式** | DTW WebSocket 增量同步 |
| **标题生成** | Claude 自动生成线程标题 |

---

## 10. 配置系统

### 10.1 设置文件搜索路径

| 路径 | 范围 |
|------|------|
| `.amp/settings.json` | 工作区级 |
| `~/.config/amp/settings.json` | 用户级 |
| `/Library/Application Support/ampcode/managed-settings.json` | macOS 受管理 |
| `/etc/ampcode/managed-settings.json` | Linux 受管理 |

### 10.2 格式支持

- `settings.json` -- 标准 JSON
- `settings.jsonc` -- 带注释的 JSON (JSONC)

---

## 11. Skill 系统 (外部插件)

### 11.1 Skill 发现路径

| 路径 | 范围 |
|------|------|
| `.agents/skills/` | 工作区级 |
| `.amp/skills/` | 项目级 |
| `~/.config/amp/skills/` | 用户全局级 |

### 11.2 Skill 格式

| 维度 | 详情 |
|------|------|
| **入口文件** | `SKILL.md` |
| **元数据** | YAML front-matter |
| **模板变量** | `{{arguments}}` 替换 |
| **可见性** | `public_discoverable`, `thread_workspace_shared` |

### 11.3 内置 Skill

| Skill 名称 | 说明 |
|-------------|------|
| `code-review` | 代码审查 |
| `code-tour` | 代码导览 |
| `tmux-setup` | tmux 环境配置 |

---

## 12. 安全检测

### 12.1 敏感文件模式

| 模式 | 说明 |
|------|------|
| SSH 密钥 | `~/.ssh/id_*` 等 |
| `.env` 文件 | 环境变量文件 |
| 凭据文件 | credentials, tokens 等 |
| **涉及模块** | `amp-cli-reversed/vendor/esm/npm-licensed-e9T.js` |

### 12.2 Secret Scanner

| 维度 | 详情 |
|------|------|
| **功能** | 正则检测 15+ Provider 的密钥/凭据 |
| **涉及模块** | `amp-cli-reversed/vendor/esm/secret-scanner-patterns.js` |

---

## 13. 工具权限系统

### 13.1 权限 DSL

| 维度 | 详情 |
|------|------|
| **匹配** | 工具名 glob 模式 (picomatch) |
| **决策** | `allow` / `ask` / `reject` / `delegate` |
| **限制** | 子代理不允许某些工具 (`"not allowed for subagents"`) |
| **配置键** | `tools.enable`, `tools.disable` |
| **涉及模块** | `amp-cli-reversed/app/tool-permissions.js`, `amp-cli-reversed/util/connection-transport.js` |

### 13.2 工具名归一化

| 原始名 | 归一化 |
|--------|--------|
| `ShellCommand` | `Bash` |
| `mcp__*` | MCP 工具前缀 |
| `builtin:*` | 内置工具前缀 |
| `toolbox:*` | 工具箱前缀 |

---

## 14. 自更新系统

| 维度 | 详情 |
|------|------|
| **版本检查** | `https://static.ampcode.com/cli/cli-version.txt` |
| **二进制下载** | `https://cdn.ampcode.com/` |
| **校验** | SHA-256 |
| **替换** | 原子二进制替换 |
| **包管理器检测** | npm, pnpm, yarn, bun, brew |
| **npm 包名** | `@sourcegraph/amp` |
| **brew tap** | `ampcode/tap/ampcode` |
| **检查周期** | 604,800,000 ms (7 天) |

---

## 15. 集成依赖关系图

```
                    ┌──────────────────┐
                    │  Ampcode 服务端   │
                    │  (ampcode.com)   │
                    └───┬──────────┬───┘
                        │          │
              DTW WS    │   REST   │
              (CBOR)    │   API    │
                        │          │
┌───────────────────────┼──────────┼──────────────────────┐
│                   Flitter CLI                           │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Anthropic│  │ OpenAI   │  │ Google   │  │ xAI/    │ │
│  │Claude   │  │ GPT      │  │ Gemini   │  │Cerebras │ │
│  │  API    │  │  API     │  │  API     │  │  API    │ │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       └─────┬──────┴─────────────┘              │      │
│             │                                    │      │
│       ┌─────▼───────────────────────────────────▼┐     │
│       │          @flitter/llm                     │     │
│       │  Multi-Provider SDK + MCP + OAuth 2.0     │     │
│       └─────────────────┬────────────────────────┘     │
│                         │                               │
│   ┌────────┐  ┌─────────▼──────────┐  ┌─────────────┐ │
│   │ GitHub │  │ MCP Servers        │  │ IDE Bridge   │ │
│   │  API   │  │ (Stdio/SSE/HTTP)   │  │ (VS Code/   │ │
│   │ proxy  │  │ + OAuth Auth       │  │  JetBrains/  │ │
│   └────────┘  └────────────────────┘  │  Zed)        │ │
│                                        └─────────────┘ │
│   ┌───────────┐  ┌──────────────────┐                  │
│   │Bitbucket  │  │ OpenTelemetry    │                  │
│   │Enterprise │  │ (Traces+Metrics  │                  │
│   │  API      │  │  +Logs→OTLP/     │                  │
│   └───────────┘  │  gRPC/Prom/Zip)  │                  │
│                   └──────────────────┘                  │
│                                                         │
│   ┌──────────────┐  ┌─────────────────┐                │
│   │ OS Keychain  │  │ Google Cloud    │                │
│   │ (@napi-rs/   │  │ Storage (GCS)  │                │
│   │  keyring)    │  │ (assets/rg/jb) │                │
│   └──────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────┘
```
