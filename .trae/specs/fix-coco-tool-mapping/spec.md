# Fix Coco Tool Mapping Spec

## Why

Flitter-amp 的 tool call 渲染系统完全基于 Amp CLI 的 tool name 体系（`read_file`, `execute_command`, `str_replace_editor` 等）。
Coco 通过 ACP 协议发送的 tool call 数据结构与 Amp 有根本性差异（runtime probe 验证于 2026-03-30）：

1. `kind` 字段不可靠：所有只读工具统一为 `"read"`，写入/执行类工具**没有 kind 字段**（fallback 为 `"other"`）
2. `title` 字段是唯一可靠的工具标识：格式为 `"ToolName /path"` 或 `"toolname"`
3. `rawInput` 的 key 命名使用 PascalCase（`Command`, `Description`）而非 Amp 的 snake_case（`command`）

结果：当前所有 15 个 Coco built-in tool 都 fallback 到 GenericToolCard，没有一个命中专用渲染器。

## What Changes

- **tool-call-widget.ts**: 新增 `resolveToolName()` 函数，从 `title` 提取工具名，fallback 到 `kind`；更新 `TOOL_NAME_MAP` 增加 Coco 工具名映射；增加 `LS` 等新 switch case
- **bash-tool.ts**: 兼容 Coco 的 PascalCase rawInput keys（`Command` vs `command`）
- **grep-tool.ts**: 兼容 Coco 的 rawInput keys（`include` 等）
- **tool-header.ts**: `name` 参数改为使用 resolved 工具名而非原始 `kind`，确保显示 `Bash` 而非 `other`
- **各专用渲染器**: `pickString` 的 key fallback chain 增加 Coco 的 PascalCase 变体

## Impact

- 受影响代码: `packages/flitter-amp/src/widgets/tool-call/` 下的渲染组件
- 受影响能力: 所有 Coco tool call 的 UI 渲染（Read/LS/Grep/Glob/Bash/ApplyPatch/WebFetch/Task/Skill/TodoWrite 等）
- 无破坏性变更: 原有 Amp tool name 映射保持不变，只是新增 Coco 的映射

## ADDED Requirements

### Requirement: Title-based Tool Name Resolution
系统 SHALL 优先从 `toolCall.title` 提取工具名（第一个空格前的 token），fallback 到 `toolCall.kind`，再 fallback 到 `'other'`。

#### Scenario: Coco Read tool
- **WHEN** 收到 `{kind: "read", title: "Read /path/to/file"}`
- **THEN** 解析为工具名 `"Read"`，路由到 `ReadTool`

#### Scenario: Coco Bash tool（无 kind）
- **WHEN** 收到 `{title: "bash"}` （无 kind 字段）
- **THEN** 解析为工具名 `"bash"`，经 TOOL_NAME_MAP 规范化为 `"Bash"`，路由到 `BashTool`

#### Scenario: Amp edit_file tool（保持兼容）
- **WHEN** 收到 `{kind: "edit_file"}`
- **THEN** title 可能为空，fallback 到 `kind` = `"edit_file"`，路由到 `EditFileTool`

### Requirement: Coco PascalCase rawInput Compatibility
各专用渲染器 SHALL 同时支持 Amp 的 snake_case 和 Coco 的 PascalCase rawInput key。

#### Scenario: BashTool 兼容 Coco
- **WHEN** rawInput 为 `{Command: "echo hello", Description: "test", TimeoutMilliseconds: 30000}`
- **THEN** BashTool 正确提取 command 为 `"echo hello"` 并在 header 显示 `$ echo hello`

### Requirement: LS Tool Rendering
系统 SHALL 为 Coco 的 `LS` 工具提供渲染支持，复用 `GrepTool`（显示路径 + 目录列表输出）。

### Requirement: 工具名显示修正
`ToolHeader` 的 `name` 参数 SHALL 显示 resolved 后的规范工具名（如 `Bash`），而非原始的 `kind` 值（如 `other` 或 `read`）。

## MODIFIED Requirements

### Requirement: TOOL_NAME_MAP 扩展
在现有 Amp 映射基础上，增加 Coco 工具名到规范名的映射：
- `bash` → `Bash`, `BashOutput` → `Bash`, `KillShell` → `Bash`
- `apply_patch` → `apply_patch`, `ApplyPatch` → `apply_patch`
- `WebFetch` → `WebSearch`
- `Skill` → `skill`, `TodoWrite` → `todo_write`
- `Task` → `Task`

## 如何获取 Coco 实际 ACP 数据流

获取 Coco ACP 真实数据的方法是：**编写一个 ACP client probe 脚本**，通过 `coco acp serve` 子进程启动 Coco，使用 `@agentclientprotocol/sdk` 建立 JSON-RPC 连接，发送 prompt 触发各种 tool，捕获所有 `session/update` 通知中的 `tool_call` 和 `tool_call_update` 事件。

### Probe 脚本关键步骤

1. **启动 Coco ACP server**: `spawn('coco', ['acp', 'serve'])` — Coco 通过 stdin/stdout 进行 ndjson JSON-RPC 通信
2. **初始化 ACP 连接**: 使用 `@agentclientprotocol/sdk` 的 `ClientSideConnection` + `ndJsonStream`
3. **实现 `Client` 接口**: 
   - `requestPermission()`: 自动批准所有权限请求
   - `sessionUpdate()`: 记录所有 update 到数组，筛选 `tool_call` / `tool_call_update` 事件
   - `readTextFile()` / `writeTextFile()`: 实现文件系统回调（Coco 的 ApplyPatch 通过此接口写文件）
4. **创建 session**: `connection.newSession({ cwd: '...', mcpServers: [] })`
5. **发送 prompt 触发工具**: 设计一个 prompt 让 Coco 逐一使用所有想要测试的工具
6. **捕获结果**: `tool_call` event 包含 `kind`, `title`, `rawInput`, `status` 等字段；`tool_call_update` event 包含 `result` (含 `rawOutput` 和 `content[]`)

### 示例脚本位置

```
packages/flitter-amp/acp-probe.ts  (临时脚本，使用后删除)
```

### 使用方式

```bash
cd packages/flitter-amp
bun run acp-probe.ts 2>/tmp/acp-probe-stderr.log 1>/tmp/acp-probe-stdout.log
```

### 关键发现

通过 probe 获取的运行时数据：

**Probe 1**: 触发 Read/LS/Grep/Glob/Bash，获取 `tool_call` 创建事件的 `kind`/`title`/`rawInput`:
```json
{"kind":"read","title":"Read /.../.../AGENTS.md","rawInput":{"path":"/abs/path"}}
{"kind":"read","title":"LS /.../packages","rawInput":{"path":"/abs/path"}}
{"kind":"read","title":"Grep /.../file","rawInput":{"include":"","path":"/abs/path","pattern":"attach"}}
{"kind":"read","title":"Glob /.../src","rawInput":{"path":"/abs/path","pattern":"**/*.test.ts"}}
{"title":"bash","rawInput":{"Command":"echo hello","Description":"test","TimeoutMilliseconds":30000}}
```

**Probe 2**: 触发 ApplyPatch（创建+编辑文件），获取写入类工具的行为:
```json
{"title":"apply_patch","rawInput":null}
```
ApplyPatch 不通过 `rawInput` 传递内容，而是通过 ACP 的 `fs.writeTextFile` RPC 回调写文件。

**Probe 3**: 直接让 Coco 列出所有 built-in tools:
```
Read, LS, Grep, Glob, Bash, BashOutput, KillShell, ApplyPatch,
WebFetch, Task, Skill, TodoWrite, EnterPlanMode, ExitPlanMode,
multi_tool_use.parallel
```

### 结论

- `kind` 字段只有两种值：`"read"`（所有只读工具）和 `undefined`（其它工具）
- `title` 第一个空格前的 token 是工具名的唯一可靠来源
- `rawInput` 的 key 命名风格因 agent 实现而异（Amp: snake_case, Coco: PascalCase）
- 未来如果接入新 agent，应重复此 probe 流程验证其 ACP 数据结构
