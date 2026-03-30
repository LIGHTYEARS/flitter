# Tasks

- [x] Task 1: 扩展数据模型 — 增加 parentToolCallId 字段
  - [x] 1.1: `types.ts` — `ToolCallItem` 增加 `parentToolCallId?: string`
  - [x] 1.2: `immutable-types.ts` — `ImmutableToolCallItem` 增加 `parentToolCallId?: string`

- [x] Task 2: ConversationState 增加子 agent 跟踪逻辑
  - [x] 2.1: 新增 `_openTaskStack: string[]` 私有字段
  - [x] 2.2: `addToolCall` 中：若栈非空则设 `parentToolCallId = 栈顶`；若 title 第一个 token 为 `task`/`Task` 则将 toolCallId 压栈
  - [x] 2.3: `updateToolCall` 中：若完成的 toolCallId 在栈中，则弹出
  - [x] 2.4: 新增 `getChildToolCalls(parentId: string): ImmutableToolCallItem[]` 方法

- [x] Task 3: ChatView 过滤子 tool calls
  - [x] 3.1: 在 `chat-view.ts` 的 items 遍历中，跳过 `parentToolCallId` 非空的 `tool_call`
  - [x] 3.2: 对 Task 类型 tool call，从 items 列表构建 childWidgets 并传给 ToolCallWidget

- [x] Task 4: TaskTool 专用渲染器
  - [x] 4.1: 重写 `task-tool.ts`：从 `rawInput` 提取 `Description`/`SubagentType`/`Prompt`
  - [x] 4.2: Header 显示: SubagentType · Description (N tools)
  - [x] 4.3: 展开时通过 childWidgets prop 嵌套渲染子工具列表
  - [x] 4.4: 通过 childWidgets prop 避免循环依赖（ChatView 构建 → ToolCallWidget 透传 → TaskTool 渲染）

- [x] Task 5: 运行测试验证无回归
  - [x] 5.1: `cd packages/flitter-amp && bun test` — 771 pass, 0 fail
  - [x] 5.2: `cd packages/flitter-core && bun test` — 3586 pass (1 pre-existing failure in HotReloadWatcher)

# Task Dependencies
- Task 2 依赖 Task 1（需要先有字段才能设置）
- Task 3 依赖 Task 1（需要 parentToolCallId 字段存在）
- Task 4 依赖 Task 2 + Task 3（需要跟踪逻辑和过滤逻辑都就位）
- Task 5 依赖 Task 1-4 全部完成
- Task 1 和 Task 3 可部分并行（字段添加是简单的类型扩展）
