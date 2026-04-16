# Agent 引擎

`@flitter/agent-core` 实现了 AI Agent 的核心推理和工具执行循环。

## ThreadWorker

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
| `CompactionStart/Complete` | 上下文压缩 |
| `TurnComplete` | 一个完整回合结束 |

## 工具系统

### 内置工具

| 工具 | 功能 |
|------|------|
| `BashTool` | 执行 Shell 命令 |
| `ReadTool` | 读取文件内容 |
| `WriteTool` | 写入文件 |
| `EditTool` | 编辑文件（精确字符串替换） |
| `GlobTool` | 按模式搜索文件名 |
| `GrepTool` | 搜索文件内容（正则） |
| `FuzzyFindTool` | 模糊搜索 |

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

### ToolOrchestrator

编排工具执行，处理并发执行、超时、错误恢复。

## 权限系统

`PermissionEngine` 提供基于模式匹配的细粒度权限控制：

- 支持 glob 模式匹配文件路径
- 区分读/写/执行权限
- 守护文件检测（防止修改关键系统文件）
- 权限规则可在配置文件中定义

## SubAgent

`SubAgentManager` 支持创建子代理：
- 子代理拥有独立的 ThreadWorker 实例
- PreHook/PostHook 系统在工具执行前后注入逻辑
