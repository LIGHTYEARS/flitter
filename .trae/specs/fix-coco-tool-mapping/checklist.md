# Checklist

- [x] `resolveToolName()` 函数存在于 `resolve-tool-name.ts`，优先从 `title` 提取，fallback 到 `kind`
- [x] `build()` 方法使用 `resolveToolName()` 而非直接读取 `toolCall.kind`
- [x] TOOL_NAME_MAP 包含 Coco 工具名映射（`bash`, `BashOutput`, `KillShell`, `ApplyPatch`, `WebFetch`, `Skill`, `TodoWrite`）
- [x] switch 中有 `case 'LS':` 路由到 `GrepTool`
- [x] switch 中有 `case 'EnterPlanMode':` 和 `case 'ExitPlanMode':` 路由到 `GenericToolCard`
- [x] BashTool 的 `pickString` 包含 PascalCase key `'Command'`
- [x] 各渲染器传给 ToolHeader 的 `name` 参数使用 resolved 工具名（非原始 `kind`）
- [x] Amp 原有工具名映射未被破坏（`read_file→Read`, `execute_command→Bash` 等仍有效）
- [x] `bun test`（flitter-amp）全部通过 — 772 pass, 0 fail
- [x] `bun test`（flitter-core）全部通过 — 3587 pass, 0 fail
