# Phase 7: LLM Provider 核心层 — 上下文文档

**Package:** `@flitter/llm`
**Requirements:** LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, LLM-06
**Depends on:** Phase 1 (schemas), Phase 2 (util)

---

## 逆向代码映射

| 逆向标识 | TypeScript 目标 | 源文件 |
|----------|----------------|--------|
| `OwT` | `AnthropicProvider` | llm-sdk-providers.js:1254 |
| `_UT` | `OpenAIProvider` | llm-sdk-providers.js:9882 |
| `tNT` | `GeminiProvider` | llm-sdk-providers.js:8296 |
| `k8T` | `toAnthropicMessages()` | llm-sdk-providers.js (消息转换) |
| `P3T` / `R4R` | `toOpenAIMessages()` | llm-sdk-providers.js (消息转换) |
| `rNT` | `toGeminiMessages()` | llm-sdk-providers.js (消息转换) |
| `VfR` | `fromAnthropicDelta()` | llm-sdk-providers.js (响应解析) |
| `kO` | `toAnthropicTools()` | llm-sdk-providers.js (工具转换) |
| `V8T` | `toGeminiTools()` | llm-sdk-providers.js (工具转换) |
| `k3T` | `toOpenAITools()` | llm-sdk-providers.js (工具转换) |
| `PAT` | `mergeUsage()` | llm-sdk-providers.js (Usage 累积) |
| `_K` | `mergeUsage()` | llm-sdk-providers.js (Usage 合并) |
| `SwT` | Anthropic stream 内部 | llm-sdk-providers.js |
| `ss` | Gemini client 类 | llm-sdk-providers.js |

---

## 核心接口设计

### Provider 接口 (保持 Amp 一致)

```typescript
interface LLMProvider {
  readonly name: string;
  stream(params: StreamParams): AsyncGenerator<StreamDelta>;
}

interface StreamParams {
  model: string;
  messages: Message[];
  systemPrompt: TextBlock[];
  tools: ToolDefinition[];
  config: Config;
  signal: AbortSignal;
  reasoningEffort?: ReasoningEffort;
}

type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
```

### StreamDelta (统一输出)

复用 `@flitter/schemas` 的 `AssistantMessage` 结构:
- `content: AssistantContentBlock[]` — 增量追加 text/tool_use/thinking blocks
- `state: MessageState` — streaming → complete/error
- `usage?: Usage` — 最终 token 统计

### 消息转换器

每个 Provider 需要:
1. **Input Transformer**: `Message[] → ProviderNativeMessages` (Thread 消息 → Provider API 格式)
2. **Tool Transformer**: `ToolDefinition[] → ProviderNativeTools` (统一工具 → Provider 工具格式)
3. **Output Parser**: `ProviderStreamChunk → StreamDelta` (Provider 流事件 → 统一 Delta)

---

## 依赖关系

### 来自 @flitter/schemas
- `Message`, `UserMessage`, `AssistantMessage` — 消息类型
- `AssistantContentBlock`, `UserContentBlock` — 内容块类型
- `ToolUseBlock`, `ThinkingBlock`, `TextContentBlock` — 具体块类型
- `Usage`, `MessageState` — 状态和用量类型
- `Config`, `Settings`, `SecretStore` — 配置和密钥
- `CacheControl` — Anthropic 缓存控制

### 来自 @flitter/util
- `BehaviorSubject`, `Observable` — 响应式流
- `DisposableCollection` — 资源清理
- `FlitterError`, `assert` — 错误处理

---

## 关键陷阱预警

| ID | 陷阱 | 缓解策略 |
|----|------|---------|
| PIT-D1 | SSE 半截消息 (UTF-8 多字节切断) | TextDecoder 流模式 + Block 级独立缓冲区 |
| PIT-D2 | 多 Provider 格式不统一 | 严格的 Transformer 层隔离，每个 Provider 独立文件 |
| PIT-D3 | thinking/tool_use 交错事件排序 | 维护 Block index Map，按 content_block_start 排序 |
| PIT-A3 | SDK 版本漂移 | 不依赖官方 SDK 包，自行封装 HTTP 调用 |

---

## 关键设计决策

1. **不依赖官方 SDK 包**: 用户要求不依赖 Amp 的官方接口，自行封装处理 Provider API 差异。使用原生 `fetch` + SSE 手动解析。
2. **保持 Amp 抽象一致**: Provider 接口签名、消息格式、流式处理模式与 Amp 逆向代码保持一致。
3. **TDD 先行**: 每个 Provider 使用录制/回放 mock 测试。
4. **零 `any` 类型**: 所有外部 API 响应通过 Zod schema 验证。

---

## 波次规划

```
Wave 1 (基础设施): Plan 07-01 + 07-02
  → 统一消息格式抽象 (types/provider/transformers)
  → SSE 流式解析管线 (SSEParser + fetchSSE + RetryPolicy)
  → 奠定所有 Provider 的公共基础

Wave 2 (核心 Provider): Plan 07-03 + 07-04
  → Anthropic Claude Provider (Messages API, SSE 事件模型, M3 里程碑)
  → OpenAI Provider (Responses API — 非 ChatCompletion)

Wave 3 (扩展 Provider + 注册): Plan 07-05 + 07-06 + 07-07
  → Gemini Provider (generateContent API, 双端点 Public/Vertex AI)
  → xAI Grok Provider (OpenAI-compatible ChatCompletion API)
  → Provider 工厂注册表 + index.ts 公共导出

Wave 4 (质量收尾): Plan 07-08
  → MockSSEServer + Fixtures 测试框架
  → 跨 Provider 集成测试 + 一致性验证
```
