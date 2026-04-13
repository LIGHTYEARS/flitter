# Phase 8 — MCP 协议集成：规划上下文

## 目标

在 `@flitter/llm` 包中实现完整的 MCP (Model Context Protocol) 客户端，支持三种传输
(Stdio/StreamableHTTP/SSE)、JSON-RPC 2.0 协议、OAuth 2.0 PKCE 认证流、以及工具发现与调用。

## 已有基础设施

### @flitter/schemas (Phase 1)
- `mcp.ts`: JSON-RPC 2.0 request/response/notification/error schemas
- 连接状态 (8 种): connecting/authenticating/reconnecting/connected/denied/awaiting-approval/failed/blocked-by-registry
- Server Spec: MCPCommandServerSpec (command) / MCPURLServerSpec (url)
- 传输类型: StdioClientTransport / SSEClientTransport / StreamableHTTPClientTransport
- 工具: MCPToolSpec (name/description/inputSchema/source) + MCPToolContent (text/image)
- 连接错误: 6 种 error code

### @flitter/llm (Phase 7b)
- OAuth 基础设施: PKCE (generatePKCE) + callback server (startCallbackServer) + registry + types
- 3 个 OAuth Provider: Anthropic / GitHub Copilot / OpenAI Codex
- Provider 系统: 4 个 LLM Provider + Registry

### @flitter/util (Phase 2)
- Reactive: BehaviorSubject / Observable / pipe / operators
- Process 工具

## 逆向参考模块

| 逆向文件 | 大小 | 核心内容 |
|----------|------|---------|
| `app/mcp-transport.js` | 36KB | Stdio/SSE/StreamableHTTP 传输, 连接生命周期管理器 (Uq), 顶层服务器管理器 (jPR) |
| `app/mcp-tools-integration.js` | 85KB | 工具发现/注册/调用, 工具名前缀化, 结果处理 |
| `app/oauth-auth-provider.js` | 47KB | OAuth 流程编排, SSE/Stdio transport 类定义 |
| `vendor/esm/mcp-protocol-schemas-2.js` | 18KB | MCP 协议方法 schemas (tools/list, tools/call, initialize 等) |

## 关键架构决策

### KD-20: MCP 协议版本
支持 MCP protocol version `2025-03-26` (稳定版)，兼容 `2024-11-05` 和 `2024-10-07`。

### KD-21: 传输层抽象
`MCPTransport` 接口统一 Stdio/SSE/StreamableHTTP 三种传输:
```ts
interface MCPTransport {
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;
}
```

### KD-22: 连接生命周期
`MCPConnection` 管理单个 MCP Server 的完整生命周期:
- 连接/断开/重连 (指数退避)
- 能力协商 (initialize/initialized)
- 工具/资源/提示列表的响应式更新
- 通过 Observable 暴露连接状态和工具列表

### KD-23: 工具名命名空间
`mcp__<serverName>__<toolName>` 格式，与逆向代码一致。
serverName 和 toolName 中非字母数字替换为 `_`。

### KD-24: 零外部 MCP SDK 依赖
不依赖 `@modelcontextprotocol/sdk`，从逆向代码直译实现。
与 Phase 7 的初始决策 (KD-16) 风格一致 — 自行实现协议层。

## 波次规划

### Wave 1: 协议基础 + Stdio 传输 (Plans 08-01, 08-02)
- JSON-RPC 2.0 编解码器 + MCP 协议方法定义
- Stdio 传输 (子进程 spawn + newline-delimited JSON)

### Wave 2: HTTP 传输 (Plans 08-03, 08-04)
- StreamableHTTP 传输 (HTTP POST + SSE 响应流)
- SSE 传输 (EventSource + endpoint 发现)

### Wave 3: 认证 + 工具集成 (Plans 08-05, 08-06)
- MCP OAuth 2.0 PKCE 认证流 (401 → 发现 → 授权 → Token → 重试)
- 工具发现与调用 + 连接生命周期管理器 + 服务器管理器
