# Tasks

- [x] Task 1: 实现 `resolveToolName()` 函数并替换 `kind` 直接引用
  - [x] 1.1: 在 `resolve-tool-name.ts` 中新增 `resolveToolName(toolCall)` 函数，从 `title` 第一个空格前的 token 提取工具名，fallback 到 `kind`，再 fallback 到 `'other'`
  - [x] 1.2: 将 `build()` 中 `const rawName = this.toolCall.kind` 改为 `const rawName = resolveToolName(this.toolCall)`
  - [x] 1.3: 将各渲染器传给 `ToolHeader` 的 `name` 参数从 `this.toolCall.kind` 改为 `resolveToolDisplayName(this.toolCall)`

- [x] Task 2: 更新 `TOOL_NAME_MAP` 和 switch 分支
  - [x] 2.1: 在 `TOOL_NAME_MAP` 中增加 Coco 工具名映射: `bash→Bash`, `BashOutput→Bash`, `KillShell→Bash`, `ApplyPatch→apply_patch`, `WebFetch→WebSearch`, `Skill→skill`, `TodoWrite→todo_write`, `Task→Task`
  - [x] 2.2: 在 switch 中增加 `case 'LS':` 路由到 `GrepTool`
  - [x] 2.3: 在 switch 中增加 `case 'EnterPlanMode':` 和 `case 'ExitPlanMode':` 路由到 `GenericToolCard`

- [x] Task 3: 各渲染器兼容 Coco PascalCase rawInput keys
  - [x] 3.1: `BashTool` 的 `pickString` key chain 增加 `'Command'`：`pickString(input, ['command', 'Command', 'cmd', 'shell_command', 'script', 'args'])`
  - [x] 3.2: `GrepTool` 的 `pickString` key chains 确认已兼容 Coco 的 `pattern`/`path`/`include` keys（当前已包含 `pattern` 和 `path`，无需改动）
  - [x] 3.3: `ReadTool` 确认已兼容 Coco 的 `path` key（已包含在 `['file_path', 'path', 'filename', 'file']` 中）

- [x] Task 4: 运行测试验证无回归
  - [x] 4.1: 运行 `cd packages/flitter-amp && bun test` — 772 pass, 0 fail
  - [x] 4.2: 运行 `cd packages/flitter-core && bun test` — 3587 pass, 0 fail

# Task Dependencies
- Task 2 依赖 Task 1（需要先有 resolveToolName 才能正确映射）
- Task 3 与 Task 1/2 可并行（rawInput key 兼容独立于工具名解析）
- Task 4 依赖 Task 1/2/3 全部完成
