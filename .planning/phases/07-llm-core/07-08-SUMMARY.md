---
plan: 07-08
status: done
tests: 29
test_command: npx tsx --test packages/llm/src/providers/integration.test.ts
files_created:
  - packages/llm/src/testing/mock-sse-server.ts
  - packages/llm/src/testing/fixtures.ts
  - packages/llm/src/providers/integration.test.ts
---

## Summary

跨 Provider 集成测试完成，29 个测试全部通过。

### 测试基础设施

**mock-sse-server.ts** — 基于 `node:http` 的 MockSSEServer:
- `setResponse()` 配置 SSE 事件序列、状态码、延迟、断流
- `getLastRequest()` 记录请求细节用于断言
- `createSSEEvents()` 辅助生成 SSE 事件

**fixtures.ts** — 4 个 Provider 的预录 SSE 事件:
- Anthropic: simpleText (7), thinkingText (10), toolUse (7)
- OpenAI: simpleText (6), reasoning (8), toolCall (6)
- Gemini: simpleText (2), thinking (2), toolCall (1)
- xAI: simpleText (4), toolCall (3)
- 共享: testConfig, testTools

### 测试覆盖 (29 tests, 10 suites)

| Suite | Tests | 覆盖内容 |
|-------|-------|---------|
| MockSSEServer | 4 | SSE 发送/收集、请求记录、断流、延迟 |
| Anthropic e2e | 3 | 文本、thinking+文本、tool_use |
| OpenAI e2e | 3 | 文本、reasoning+文本、tool_call |
| Gemini e2e | 3 | 文本、thinking+文本、tool_call |
| xAI e2e | 3 | 文本、tool_call、多 tool_call |
| Cross-provider | 3 | 一致性: complete/end_turn、tool_use blocks、usage |
| AbortSignal | 1 | 中断取消 |
| Request format | 4 | Headers/URL 格式验证 (每 Provider 1 个) |
| Message roundtrip | 2 | 消息转换 + 工具转换 |
| Registry integration | 3 | createProvider、getProviderForModel、resolveProvider |

### 测试模式

- Provider e2e: `globalThis.fetch` mock → ReadableStream SSE → Provider.stream() → StreamDelta
- MockSSEServer: 真实 HTTP 连接 → fetchSSE() → SSE 事件收集
- `captureFetch()` 变体用于请求格式断言
- `try/finally` 确保 fetch 恢复

### 全套件结果

```
207 tests, 0 failures (43 suites)
- types: 27 | sse-parser: 17 | retry: 21 | fetch-sse: 6
- anthropic: 26 | openai: 29 | gemini: 24 | xai: 23
- registry: 38 | integration: 29 (← new)
```
