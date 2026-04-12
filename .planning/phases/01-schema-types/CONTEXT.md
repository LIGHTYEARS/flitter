# Phase 1: Schema 类型地基 — Context

**Phase:** 01-schema-types
**Package:** `@flitter/schemas`
**Requirements:** SCHM-01, SCHM-02, SCHM-03, SCHM-04, SCHM-05

---

## Domain Analysis

Phase 1 定义整个 Flitter 项目的类型基础层。所有上层包（`@flitter/util`, `@flitter/llm`, `@flitter/data`, `@flitter/agent-core`, `@flitter/cli`）都依赖此包提供的类型定义。

### 逆向参考代码源

| 领域 | 参考文件 | 关键发现 |
|------|---------|---------|
| LLM 消息类型 | `app/llm-sdk-providers.js` (10,232 行) | 3 种消息角色 (user/assistant/info)，11 种内容块类型，4 种消息状态 |
| MCP 协议 | `app/mcp-transport.js` + `app/mcp-tools-integration.js` | JSON-RPC 2.0，8 种连接状态，工具定义结构 |
| 配置系统 | `vendor/esm/config-keys.js` + `app/process-runner.js` | 三级配置合并 (global/workspace/override)，40+ 设置键 |
| Thread 持久化 | `app/realtime-sync.js` (2,175 行) | 线程快照格式，脏追踪，消息序列化 |
| 工具权限 DSL | `vendor/esm/message-schemas.js` + `app/tool-permissions.js` | Zod 验证的权限条目，递归匹配器，glob 模式 |

### 核心类型谱系

```
Message (role 判别)
├── UserMessage        → TextBlock | ImageBlock | ToolResultBlock
├── AssistantMessage   → TextBlock | ToolUseBlock | ThinkingBlock | RedactedThinkingBlock | ServerToolUseBlock
└── InfoMessage        → ManualBashInvocationBlock | TextBlock | SummaryBlock

MessageState (type 判别)
├── streaming
├── complete (stopReason: end_turn | tool_use | max_tokens)
├── cancelled
└── error (message)

ToolRun (status 判别)
├── done (result, trackFiles?)
├── error (message)
├── cancelled (reason?)
├── rejected-by-user (reason?)
└── in-progress (progress)

PermissionEntry
├── tool: string (工具名匹配)
├── action: allow | ask | reject | delegate
├── matches?: Record<string, PermissionMatcher>  (递归)
└── context?: thread | subagent
```

### 技术约束

- **Zod 版本**: 项目使用 Zod（逆向代码中确认），TypeScript 版本安装 `zod@^3.23`
- **JSON Schema**: 通过 `zod-to-json-schema` 桥接 Zod → JSON Schema
- **Zero `any`**: 所有类型必须完全具体化，禁止 `any` 逃逸
- **ESM-only**: 所有导出使用 ESM `export` 语法
- **Bun 运行时**: 测试使用 `bun test`

### 依赖库

| 库 | 用途 |
|----|------|
| `zod` | 运行时 schema 验证 |
| `zod-to-json-schema` | Zod → JSON Schema 转换 |

---

## Plan Overview (3 Waves)

| Wave | Plans | 描述 |
|------|-------|------|
| 1 | 01-01, 01-02 | 核心协议类型 (LLM 消息 + MCP 协议) |
| 2 | 01-03, 01-04 | 存储层类型 (配置系统 + Thread 持久化) |
| 3 | 01-05 | 控制层类型 (工具权限 DSL) |

Wave 1 无内部依赖。Wave 2 引用 Wave 1 的消息类型。Wave 3 引用 Wave 1 的工具名类型。
