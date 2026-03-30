# Checklist

- [x] `ToolCallItem` 和 `ImmutableToolCallItem` 包含可选 `parentToolCallId?: string` 字段
- [x] `ConversationState` 有 `_openTaskStack` 私有字段
- [x] `addToolCall` 中：当栈非空时，新 tool call 的 `parentToolCallId` 被设为栈顶 toolCallId
- [x] `addToolCall` 中：当 title 解析为 "task"/"Task" 时，toolCallId 被压入栈
- [x] `updateToolCall` 中：当完成的 toolCallId 在栈中时，正确弹出
- [x] `getChildToolCalls(parentId)` 返回所有 `parentToolCallId === parentId` 的 tool call
- [x] ChatView 渲染时跳过 `parentToolCallId` 非空的 tool call（不在顶层显示）
- [x] TaskTool 渲染 header 显示 SubagentType + Description
- [x] TaskTool 展开时显示嵌套的子工具调用列表
- [x] 主 agent 工具调用（`parentToolCallId === undefined`）不受影响
- [x] `bun test`（flitter-amp）全部通过
- [x] `bun test`（flitter-core）全部通过
