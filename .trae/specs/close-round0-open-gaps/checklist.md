# Checklist — Close Round-0 Open Gaps

## Scaffold 层（guardrails）

- [x] **C6-render**: Ctrl+O 打开 Command Palette 不触发 RenderFlex overflow，正常渲染命令列表和搜索框
- [x] **C6-dismiss**: Command Palette 打开后按 Esc 可正常关闭，InputArea 恢复正常
- [x] **C4-toggle**: 空输入框键入 `?`，shortcuts help panel toggle 显示/隐藏，输入框保持空
- [x] **C4-with-text**: 输入框有文字时键入 `?`，不触发 toggle（仅追加字符）
- [x] **C5-open**: 空输入框键入 `/`，command palette 打开，输入框保持空
- [x] **C5-with-text**: 输入框有文字时键入 `/`，不触发 palette（仅追加字符）

## Detail 层（视觉细节）

- [x] **m1-gradient**: "Welcome to Amp" 文字在 ANSI 输出中包含 14 个不同的 `[38;2;R;G;Bm` 转义码
- [x] **m8-hash**: DensityOrb 核心区域渲染包含 `#` 字符（tmux capture 可验证）
- [x] **m8-all-levels**: DensityOrb 动画中 `.:-=+*#` 全部 7 个可见字符至少各出现 1 次
- [x] **m9-hint**: 启动时空输入框 → 底部 footer 显示 `? for shortcuts`
- [x] **m9-disappear**: 输入文字后 `? for shortcuts` hint 消失
- [x] **m5-count**: Command Palette 命令列表数量与 AMP 一致（不含 `context detail` 和 `context file changes`）
- [x] **m7-no-todo**: `app-shell.ts` StatusBar props 不再有 `// TODO` 硬编码 false
- [x] **c1-cursor**: StreamingCursor 使用 reverse video 或确认 flitter-core 不支持后保留 `█`

## 编译检查

- [x] **build**: `npm run build` 或 `bun build` 无 TypeScript 编译错误
- [x] **no-debug-probes**: 源码中无残留 `fs.appendFileSync('/tmp/flitter-debug` 临时调试探针
