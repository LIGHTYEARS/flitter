# Agent 引擎

:::info 本页面适合...
本页面适合想要深入了解 Flitter 内部架构的开发者。如果你只是使用框架构建 TUI 应用，可以跳过这部分。如果你需要自定义工具、扩展 Agent 行为或理解推理循环的工作原理，这里是最好的起点。
:::

`@flitter/agent-core` 实现了 AI Agent 的核心推理和工具执行循环。

## 整体架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    ThreadWorker                          │
│  ┌─────────┐   ┌───────────┐   ┌──────────────────┐    │
│  │ Prompt   │──>│ LLM 流式  │──>│ ToolOrchestrator │    │
│  │ 构建     │   │ 调用      │   │ 工具编排执行     │    │
│  └─────────┘   └───────────┘   └──────────────────┘    │
│       ^                              │                   │
│       │         ┌───────────┐        │                   │
│       └─────────│ 递归推理  │<───────┘                   │
│                 └───────────┘                            │
├─────────────────────────────────────────────────────────┤
│  ToolRegistry │ PermissionEngine │ PluginService         │
├─────────────────────────────────────────────────────────┤
│  RetryScheduler │ HookSystem │ SubAgentManager           │
└─────────────────────────────────────────────────────────┘
```

下面按三大模块展开介绍：**推理循环**、**工具系统**、**扩展机制**。

---

## 推理循环

### ThreadWorker

ThreadWorker 是 Agent 的核心状态机，管理完整的推理循环：

```
prompt 构建 → LLM 流式调用 → 工具执行 → 递归推理 → 回合完成
```

### 事件流

ThreadWorker 发射类型化的 `AgentEvent` 流：

| 事件 | 说明 |
|------|------|
| `InferenceStart` | 开始一次 LLM 调用 |
| `InferenceDelta` | 流式输出增量 |
| `InferenceComplete` | LLM 调用完成 |
| `InferenceError` | LLM 调用出错 |
| `ToolStart` | 开始执行工具 |
| `ToolData` | 工具执行中间数据 |
| `ToolComplete` | 工具执行完成 |
| `PermissionRequest` | 工具需要用户授权 |
| `PermissionGranted` | 用户授权通过 |
| `RetryScheduled` | 触发重试调度 |
| `HandoffComplete` | 任务移交完成 |
| `CompactionStart` | 开始上下文压缩 |
| `CompactionComplete` | 上下文压缩完成 |
| `TurnComplete` | 一个完整回合结束 |

### ThreadWorkerService

`ThreadWorkerService` 管理多个 ThreadWorker 实例池，按线程 ID 索引：

- 每个线程对应一个独立的 ThreadWorker
- 支持最多 25 个并行 Worker（超出时发出警告）
- 通过 `getOrCreate(threadId)` 获取或创建 Worker

## 工具系统

:::info 如果你不需要自定义工具
如果你只是使用 Flitter 内置的工具（如 Bash、Read、Edit 等），可以跳过工具注册部分，直接查看[Agent 模式](#agent-模式)了解如何选择不同的推理配置。
:::

### 内置工具（19 个）

| 工具 | 名称 | 功能 |
|------|------|------|
| `BashTool` | `Bash` | 执行 Shell 命令，支持超时（默认 2 分钟） |
| `ReadTool` | `Read` | 读取文件内容，支持行号偏移和限制 |
| `WriteTool` | `Write` | 写入文件，自动创建中间目录 |
| `EditTool` | `Edit` | 精确字符串替换编辑 |
| `GlobTool` | `Glob` | 按模式搜索文件名 |
| `GrepTool` | `Grep` | 正则表达式搜索文件内容 |
| `FuzzyFindTool` | `FuzzyFind` | 模糊搜索文件（多层评分策略） |
| `DeleteFileTool` | `delete_file` | 删除文件，支持 undo |
| `UndoEditTool` | `undo_edit` | 撤销最近的编辑操作 |
| `WebSearchTool` | `web_search` | Web 搜索 |
| `ReadWebPageTool` | `read_web_page` | 读取网页内容 |
| `ReadMcpResourceTool` | `read_mcp_resource` | 读取 MCP 服务器资源 |
| `SkillTool` | `Skill` | 调用注册的 Skill |
| `TaskTool` | `Task` | 启动子代理执行任务 |
| `TaskListTool` | `task_list` | 任务规划与进度追踪 |
| `FindThreadTool` | `find_thread` | 搜索会话线程 |
| `ReadThreadTool` | `read_thread` | 读取线程内容 |
| `CodeReviewTool` | `code_review` | 结构化代码审查 |
| `FinderTool` | `finder` | 智能多步代码搜索 |

### GitHub 工具（6 个）

| 工具 | 名称 | 功能 |
|------|------|------|
| `CommitSearchTool` | `commit_search` | 搜索仓库 Commit（支持作者/日期/路径过滤） |
| `GlobGithubTool` | `glob_github` | 按 glob 模式搜索 GitHub 仓库文件 |
| `ListDirectoryGithubTool` | `list_directory_github` | 列出 GitHub 仓库目录内容 |
| `ListRepositoriesTool` | `list_repositories` | 列出/搜索 GitHub 仓库 |
| `ReadGithubTool` | `read_github` | 读取 GitHub 仓库文件内容 |
| `SearchGithubTool` | `search_github` | 搜索 GitHub 仓库代码 |

### ToolRegistry

工具通过 `ToolRegistry` 注册和管理。每个工具实现统一的接口：

```ts
interface Tool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  execute(input: unknown): Promise<ToolResult>;
}
```

`ToolRegistry` 额外支持工具过滤：

```ts
// CLI 工具过滤器——限制特定模式下可用的工具集
registry.setCliFilters({ includeTools: ['Bash', 'Read', 'Edit'] });
registry.getCliFilters(); // → { includeTools: [...] }
```

### ToolOrchestrator

编排工具执行，处理并发执行、超时、错误恢复：

- 支持批量并行执行（检查所有批次的资源冲突，非仅最后一批）
- 工具级超时守卫
- `preprocessArgs` 支持在执行前预处理工具参数

## Agent 模式

:::info 大多数用户使用 `auto` 模式即可
`auto` 模式会自动平衡能力与速度。只有在需要处理特别复杂的任务时，才需要手动切换到 `smart` 或 `deep` 模式。
:::

`AgentMode` 支持 6 种预设模式，每种对应不同的模型和推理配置：

| 模式 | 主模型 | 推理强度 | 适用场景 |
|------|--------|---------|---------|
| `smart` | `claude-opus-4-6` | 默认 | 最强能力，复杂任务 |
| `fast` | `claude-haiku-4-5` | 默认 | 简单任务，速度优先 |
| `deep` | `claude-opus-4-6` | `high` | 需要深度推理的复杂问题 |
| `auto` | `claude-sonnet-4-6` | 默认 | 自动选择，平衡能力与速度 |
| `rush` | `claude-haiku-4-5` | 默认 | fast 的别名 |
| `large` | `claude-opus-4-6` | 默认 | 最大上下文窗口 |

```ts
getModeSpec(mode: AgentMode): AgentModeSpec;
getModelForMode(mode: AgentMode): string;
isDeepReasoningMode(mode: AgentMode): boolean;
```

---

## 扩展机制

### 插件系统

`PluginService` 支持用户自定义 TypeScript 插件：

### 插件发现

插件从两个目录自动发现：
- 项目级：`.flitter/plugins/`
- 用户级：`~/.config/flitter/plugins/`

### 插件架构

```
PluginService → PluginHost(子进程) → PluginRuntime(JSON-RPC)
```

- `PluginHost` 通过子进程启动插件，使用 JSON-RPC 2.0 协议通信
- 每个插件运行在独立进程中，崩溃不影响主进程

### 拦截钩子

插件可注册工具执行拦截：
- `onToolCall(toolName, input)` — 工具调用前拦截，可修改参数
- `onToolResult(toolName, result)` — 工具返回后拦截，可修改结果

### Hook 系统

生命周期 Hook 在工具执行前后注入自定义逻辑：

### Hook 类型

| 动作类型 | 触发时机 | 用途 |
|---------|---------|------|
| `PreToolUse` | 工具执行前 | 参数检查、审批拦截 |
| `PostToolUse` | 工具执行后 | 结果处理、日志记录 |
| `send-user-message` | 发送用户消息时 | 消息拦截 |
| `redact-tool-input` | 工具输入记录时 | 敏感信息脱敏 |
| `handoff` | 任务移交时 | 移交逻辑定制 |

### HookMatcher

`HookMatcher` 使用 glob 模式匹配决定 Hook 是否应用：

```ts
// 只对 Bash 工具的特定命令应用 Hook
{ tool: 'Bash', pattern: 'rm *', action: 'PreToolUse' }
```

### Handoff 机制

`ThreadWorker.executeHandoff()` 支持跨 Agent 任务移交：

- 发起方指定目标 Agent 和移交目标
- `HandoffState` 追踪移交进度
- 完成后发射 `HandoffComplete` 事件

### 重试调度器

智能错误分类 + 指数退避重试：

| 错误类型 | 检测方式 | 处理策略 |
|---------|---------|---------|
| 过载（529/503） | `isOverloadedError()` | 指数退避（5s 基础，60s 上限，最多 5 次） |
| 速率限制（429） | `isRateLimitError()` | 解析 Retry-After 头 |
| 上下文溢出 | `isContextWindowError()` | 触发 Compaction 后重试 |
| 其他错误 | — | 直接抛出 |

### 权限系统

`PermissionEngine` 提供基于模式匹配的细粒度权限控制，使用 4 层决策层级：

```
守护文件检测 → 用户规则 → 默认规则 → 回退 ask
```

- 支持 glob 模式匹配文件路径
- 区分读/写/执行权限
- 守护文件检测（防止修改关键系统文件）
- 权限规则可在配置文件中定义
- `reevaluateBlockedTools()` — 配置变更后动态重评估已阻塞的工具调用

```ts
type PermissionCheckResult = 'allowed' | 'denied' | 'ask';
```

### SubAgent

`SubAgentManager` 支持创建子代理：
- 子代理拥有独立的 ThreadWorker 实例
- PreHook/PostHook 系统在工具执行前后注入逻辑
- `HookApplicator` 将 Hook 规则应用到子代理的工具调用链

## 何时需要了解这些

| 场景 | 需要了解的部分 |
|------|---------------|
| 自定义 Agent 工具 | ToolRegistry、Tool 接口 |
| 控制工具权限 | PermissionEngine |
| 编写插件 | PluginService、拦截钩子 |
| 调试推理行为 | ThreadWorker、事件流 |
| 处理 LLM 错误 | 重试调度器 |
| 创建子任务 | SubAgent、Handoff |
