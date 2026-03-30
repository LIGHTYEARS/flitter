# Add Subagent Nesting Spec

## Why

Coco 使用 Task tool 创建 dynamic subagent 执行子任务。ACP 协议中 subagent 内部的工具调用是**平铺在主 agent 同一层级**发送的（runtime probe 验证于 2026-03-30），没有任何显式的父子关系标识。当前 flitter-amp 将所有 tool call 平铺渲染，导致 subagent 的内部工具调用和主 agent 的混在一起，用户无法区分。

## ACP Runtime Evidence

通过 acp-probe-subagent.ts 直接和 `coco acp serve` 交互，发送 prompt 触发 Task tool 调用，捕获完整的 session update 流。

### Task tool 创建事件

```json
{
  "sessionUpdate": "tool_call",
  "title": "task",
  "toolCallId": "call_wrOUBj5z6cfJ4ZZLs6F1mLqO",
  "status": "in_progress",
  "rawInput": {
    "Description": "Count AGENTS.md lines",
    "Prompt": "...(发给 subagent 的完整指令)...",
    "SubagentType": "Explore"
  }
}
```

### Subagent 内部工具调用（平铺在同一层级）

```
[  5] tool_call     title=task            id=call_wrOUBj5  (Task 开始)
[  6] tool_call     title=Glob /...       id=call_YBVDDJR  (subagent 内部)
[ 97] tool_call     title=Glob /...       id=call_SayKGz8  (subagent 内部)
[318] tool_call     title=bash            id=call_dOm2UJr  (subagent 内部)
[415] tool_call     title=Read /...       id=call_BfK9UyD  (subagent 内部)
[744] tool_call_update  id=call_wrOUBj5   status=completed  (Task 完成)
```

### 关键发现

- `_meta` 中无 `parentToolCallId` 或任何父子关系字段
- 区分方式只有**时序嵌套**：Task `in_progress` → 子工具调用 → Task `completed` 之间的所有 tool_call 属于该 subagent
- `rawInput` 包含 `Description`（任务描述）、`Prompt`（完整指令）、`SubagentType`（如 `"Explore"`）

## What Changes

- **types.ts**: `ToolCallItem` 增加可选 `parentToolCallId?: string` 字段
- **immutable-types.ts**: `ImmutableToolCallItem` 同步增加 `parentToolCallId`
- **conversation.ts**: 维护 `_openTaskStack: string[]`，在 `addToolCall` 中自动关联父子，在 `updateToolCall` 中出栈
- **chat-view.ts**: 渲染时将有 `parentToolCallId` 的 tool call 从顶层过滤掉（它们由父 Task 的渲染器负责显示）
- **task-tool.ts**: 重写为 subagent 专用渲染器，显示 Description/SubagentType header + 嵌套的子工具调用列表

## Impact

- 受影响代码: `conversation.ts`, `types.ts`, `immutable-types.ts`, `chat-view.ts`, `task-tool.ts`
- 受影响能力: Task tool 渲染、conversation item 数据模型
- 无破坏性变更: 新增字段为可选，现有数据结构完全兼容

## ADDED Requirements

### Requirement: Subagent Tool Call 父子关系跟踪
ConversationState SHALL 维护一个打开的 Task tool 栈。当 `addToolCall` 被调用时：
- 如果 tool call 的 title 解析为 `"task"` 或 `"Task"`，将其 toolCallId 压入栈
- 如果栈非空，将当前 tool call 的 `parentToolCallId` 设为栈顶的 toolCallId

当 `updateToolCall` 将 Task tool 标记为 completed/failed 时，从栈中弹出。

#### Scenario: 主 agent 读取文件 → 创建 subagent → subagent 内部 Glob → subagent 完成
- **WHEN** 收到 `addToolCall("id-1", "Read /file", "read", "in_progress")`
- **THEN** id-1 的 `parentToolCallId` 为 `undefined`（栈为空）
- **WHEN** 收到 `addToolCall("id-2", "task", "", "in_progress")`
- **THEN** id-2 的 `parentToolCallId` 为 `undefined`，id-2 被压入栈
- **WHEN** 收到 `addToolCall("id-3", "Glob /...", "read", "in_progress")`
- **THEN** id-3 的 `parentToolCallId` 为 `"id-2"`
- **WHEN** 收到 `updateToolCall("id-2", "completed")`
- **THEN** id-2 从栈中弹出

### Requirement: ChatView 过滤子 Tool Call
ChatView 在渲染 conversation items 时，SHALL 跳过任何 `parentToolCallId` 非空的 tool call（由其父 Task 的渲染器负责显示）。

### Requirement: TaskTool 专用渲染器
TaskTool SHALL 渲染为：
1. Header: 显示 subagent 类型（`SubagentType`）和任务描述（`Description`）
2. Body（展开时）: 按顺序显示所有 `parentToolCallId === this.toolCallId` 的子 tool call，每个子 call 用 ToolCallWidget 渲染
3. 折叠时: 仅显示 header + 子工具数量摘要

#### Scenario: subagent 有 5 个内部工具调用
- **WHEN** 用户查看折叠态的 Task tool
- **THEN** 显示 `▸ task Explore · Count AGENTS.md lines (5 tools)`
- **WHEN** 用户展开
- **THEN** 显示完整的子工具列表（Glob, Read, bash 等），每个缩进 2 列

### Requirement: 从 conversation items 获取子 tool calls
TaskTool 需要能从 conversation state 获取属于自己的子 tool call 列表。方案：在 `ConversationState` 中增加 `getChildToolCalls(parentId: string): ImmutableToolCallItem[]` 方法。

## MODIFIED Requirements

### Requirement: ToolCallItem 类型扩展
`ToolCallItem` 和 `ImmutableToolCallItem` 增加可选字段 `parentToolCallId?: string`。默认为 `undefined`（表示顶层 tool call）。
