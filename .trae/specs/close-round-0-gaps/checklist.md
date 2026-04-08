# Checklist — Close Round 0 Gaps

## GAP-C1: DensityOrb ASCII Art 渲染
- [x] `PerlinNoise.fbm()` 返回值范围为 `[0, 1]`（公式: `(total / maxValue + 1) * 0.5`）
- [x] DensityOrb ASCII art 显示多层密度字符（`.:-=+*`，不仅仅是空格和 `.`）
- [x] `bun test` 通过（含 DensityOrb 和 WelcomeScreen 测试）

## GAP-M1: DensityOrb Per-Cell Green Gradient
- [x] `density-orb-widget.ts` 中 `level > 0` 的 cell 使用 `Color.rgb(r, g, b)` 渲染 — C1 修复后自动生效，无需额外修改

## GAP-C2 + GAP-M2: Footer StatusBar
- [x] `status-bar.ts` 的 `@deprecated` 标记已移除
- [x] `getFooterText()` 适配 AMP `yB()`/`iO0()` 状态映射（Running tools, Waiting for approval, Streaming response, Waiting for response）
- [x] Footer 有状态文本时包含静态波浪字符前缀（`≋` U+224B 或 `∼` U+223C）
- [x] AppShell Column children 中 InputArea 之后有条件渲染 StatusBar
- [x] idle 时 StatusBar 不渲染（返回 SizedBox.shrink()）

## GAP-M3: Permission Reason Text
- [x] `_buildContentPreview()` bash 分支返回含 `reason: 'Matches built-in permissions rule: ask Bash'`
- [x] PermissionDialog 正确渲染 `(Matches built-in permissions rule: ask Bash)` 文本（复用现有 permission-dialog.ts:320-327 逻辑）

## GAP-m3: Bottom-Right Path Format
- [x] Bottom-right overlay 显示 `~/` 缩写路径（非全路径截断）
- [x] Git branch 以 `(branch)` 格式追加
- [x] 路径指向项目根目录而非子目录

## GAP-m4 + GAP-c2: Bash Tool Compact Display
- [x] 已完成的 bash 命令显示为 `$ {command}`（无 "Bash" 工具名前缀）
- [x] 运行中的 bash 命令显示为 `{spinner} {command}`（无 "Bash"，无 `$`）
- [x] `tool-header.ts` 在 name 为空字符串时不渲染多余空格

## Regression Guard
- [x] `bun test packages/flitter-cli` 无新增失败（1126 pass / 7 fail，全部预先存在）
- [x] TypeScript typecheck 通过: `cd packages/flitter-cli && bunx tsc --noEmit`（exit code 0）
