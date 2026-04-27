# LLM 集成

:::info 本页面适合...
本页面适合想要深入了解 Flitter 内部架构的开发者。如果你只是使用框架构建 TUI 应用，可以跳过这部分。如果你需要接入自定义模型、配置降级策略或使用 MCP 协议，这里提供了完整的技术细节。
:::

`@flitter/llm` 提供统一的大模型接入层和 MCP 协议实现。

## 快速开始

最简单的 LLM 调用方式——只需指定模型名称，框架会自动选择正确的 Provider：

```ts
import { getProviderForModel } from "@flitter/llm";

const provider = getProviderForModel("claude-sonnet-4-6");

for await (const delta of provider.stream({
  model: "claude-sonnet-4-6",
  messages: [{ role: "user", content: "你好！" }],
})) {
  process.stdout.write(delta.text ?? "");
}
```

:::tip 大多数用户只需使用 Anthropic Provider
如果你使用 Claude 系列模型，只需确保设置了 `ANTHROPIC_API_KEY` 环境变量即可。框架会根据模型名称前缀自动选择 `AnthropicProvider`。
:::

## Provider 架构

统一的 `LLMProvider` 接口，支持多个后端：

| Provider | 模型前缀 | 支持的模型 |
|----------|---------|-----------|
| `AnthropicProvider` | `claude-*` | Claude 系列 |
| `OpenAIProvider` | `gpt-*`, `o3-*`, `o4-*` | GPT、o 系列 |
| `GeminiProvider` | `gemini-*` | Gemini 系列（含 Vertex AI） |
| `BedrockProvider` | `bedrock:*` | AWS Bedrock 托管的 Claude 模型（SigV4 认证） |
| `OpenAICompatProvider` | `grok-*` 等 | xAI 及兼容端点 |
| `GoogleGenAILiveProvider` | `gemini-*`（Live） | Gemini WebSocket 实时双向流式通信 |

### 自动检测

```ts
// 根据模型名称前缀自动选择 Provider
const provider = getProviderForModel('claude-sonnet-4-6');
// → AnthropicProvider
```

### 流式输出

所有 Provider 实现统一的流式接口：

```ts
interface StreamParams {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  // ...
}

for await (const delta of provider.stream(params)) {
  // delta: StreamDelta
}
```

## 模型降级链

`ModelFallbackChain` 在主模型过载时自动切换备选模型：

```ts
const fallback = new ModelFallbackChain({
  chains: {
    'claude-opus-4-6': {
      primary: 'claude-opus-4-6',
      fallbacks: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001']
    }
  }
});

// 流式调用自动降级
for await (const delta of fallback.streamWithFallback(params, getProvider)) {
  // 如果 opus 返回 529/503/429，自动尝试 sonnet，再尝试 haiku
}
```

检测逻辑覆盖 HTTP 529（Overloaded）、503（Service Unavailable）、429（Rate Limit），以及消息中包含 `"overloaded"`、`"resource_exhausted"` 等关键词。

## Vertex AI 认证

`GeminiProvider` 支持 Google Cloud Vertex AI 认证模式：

- 通过配置传入 `vertexai.project`、`vertexai.location`、`vertexai.serviceAccountKeyFile`
- 自动构建 Vertex AI 认证的 `GoogleGenAI` 客户端
- 支持与公共 Gemini API 透明切换

## GenAI WebSocket Live Provider

`GoogleGenAILiveProvider` 通过 WebSocket 实现 Gemini 实时双向流式通信：

- 连接状态管理：`disconnected → connecting → connected → error`
- 支持公共 API、Vertex AI、临时 Token 三种 WebSocket URL 构建方式
- 优雅降级：WebSocket 不可用时回退到标准 HTTP SSE

## MCP 协议

:::info 什么是 MCP？
Model Context Protocol（MCP）是一个开放协议，允许 AI 应用连接到外部工具和数据源。如果你熟悉 Language Server Protocol（LSP），MCP 的概念类似——只不过 LSP 服务于 IDE，而 MCP 服务于 AI Agent。
:::

完整的 Model Context Protocol 实现：

### 传输层

| 传输方式 | 说明 |
|---------|------|
| stdio | 通过子进程的 stdin/stdout 通信 |
| SSE | Server-Sent Events 长连接 |
| StreamableHTTP | HTTP POST + SSE 事件流（新版 MCP 规范） |
| WebSocket | WebSocket 双向通信 |

### 连接管理

`MCPServerManager` 管理多个 MCP 服务器连接：
- 自动发现和连接配置的 MCP 服务器
- 动态加载服务器提供的工具
- 连接健康检查和自动重连
- Ping/Keepalive 心跳检测

### MCP 信任存储

`TrustStore`（`@flitter/data`）为 MCP 服务器连接提供访问控制：
- 基于配置的信任列表管理（`approve` / `revoke` / `isTrusted`）
- 工作区级 MCP 服务器必须经过信任审批才能连接
- 防止恶意 MCP 服务器注入

## OAuth 认证

OAuth 2.0 + PKCE 认证流程，支持：
- Anthropic
- GitHub Copilot
- OpenAI Codex

认证令牌通过系统密钥环安全存储。

## 消息转换

`BaseMessageTransformer` 和 `BaseToolTransformer` 处理不同 Provider 之间的消息格式转换，确保上层代码不需要关心 Provider 差异。

## 何时需要了解这些

| 场景 | 需要了解的部分 |
|------|---------------|
| 接入新的 LLM 模型 | Provider 架构、自动检测 |
| 处理模型过载 | 模型降级链 |
| 使用 MCP 工具服务器 | MCP 协议、连接管理 |
| 配置 Vertex AI | Vertex AI 认证 |
| 实现实时对话 | GenAI WebSocket Live Provider |
| 接入第三方 OAuth | OAuth 认证 |
