# Phase 7: Protocol Correctness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 07-protocol-correctness
**Areas discussed:** Agent crash handling, Usage data model, Terminal output collection, Error path unification

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Agent 崩溃处理策略 | PROTO-04: connection.closed 后如何恢复 | ✓ |
| Usage 数据模型重设计 | PROTO-02: SDK 的 UsageUpdate 和现有 UsageInfo 结构不同 | ✓ |
| Terminal 输出收集架构 | PROTO-05: 当前每次调用注册新 listener（泄漏） | ✓ |
| Error 路径统一 | PROTO-07: handleSubmit/连接失败/agent 崩溃的 error 处理 | ✓ |

**User's choice:** "按照你的推荐来" — all areas selected, recommended defaults used.

---

## Agent 崩溃处理策略

| Option | Description | Selected |
|--------|-------------|----------|
| Error banner + reset state | 显示错误信息，重置 processing 状态，不退出 | ✓ |
| Auto-reconnect | 自动重启 agent 并恢复会话 | |
| Exit app | 直接退出应用 | |

**User's choice:** Recommended default — error banner + reset state
**Notes:** Auto-reconnect deferred to v0.3.0 (DEFER-05)

---

## Usage 数据模型重设计

| Option | Description | Selected |
|--------|-------------|----------|
| 直接切到 SDK 结构 | `{size, used, cost:{amount, currency}}` 完全替换 | ✓ |
| 保留两种映射兼容 | 同时支持旧 `{inputTokens, outputTokens}` 和新格式 | |

**User's choice:** Recommended default — direct switch to SDK structure
**Notes:** Old fields have no corresponding SDK fields, dual-mapping would be dead code

---

## Terminal 输出收集架构

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent buffer from createTerminal | createTerminal 时启动收集，terminalOutput 读 buffer | ✓ |
| Stream-based per-call | 每次 terminalOutput 调用收集一段 | |

**User's choice:** Recommended default — persistent buffer
**Notes:** Also implement outputByteLimit from CreateTerminalRequest

---

## Error 路径统一

| Option | Description | Selected |
|--------|-------------|----------|
| 统一 handleError 方法 | AppState.handleError() 封装所有清理+通知 | ✓ |
| 各处独立处理 | 每个 catch 自己处理 | |

**User's choice:** Recommended default — unified handleError method
**Notes:** Prevents forgetting notifyListeners() or finalizeAssistantMessage()

---

## Claude's Discretion

- Whether to add no-op stubs for `user_message_chunk`, `available_commands_update`, `config_option_update`
- Whether `readTextFile` should respect `line`/`limit` params

## Deferred Ideas

- Auto-reconnection on agent crash (DEFER-05, v0.3.0+)
- `authenticate()` flow (DEFER-06, v0.3.0+)
- `readTextFile` line/limit params
