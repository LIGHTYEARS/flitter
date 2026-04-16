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
