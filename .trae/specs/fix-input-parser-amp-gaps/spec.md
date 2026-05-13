# input-parser.ts 全面对齐 amp 修复 Spec

## Why

`input-parser.ts` 在审计中发现了 7 个 P0、9 个 P1 级别的功能 gap，导致 Alt+key 快捷键完全不工作、shiftKey 永远为 false、跨 feed 序列可能被截断等严重问题。这些 gap 来自对 amp `csiToKey`/`handlePrintEvent`/`handleExecuteEvent`/`escapeToKey` 的不完整还原。

## What Changes

- **Phase 1**（不改架构的快速修复）：
  - 新增 `isShifted()` 辅助函数
  - `handlePrint` 设置 shiftKey
  - `handleCsi`/`handleEscape` 入口添加 `clearEscapeTimeout()`

- **Phase 2**（实现 Alt+key 两条路径）：
  - `handlePrint` 中实现 `pendingEscape` → Alt+字符检测
  - `handleEscape` 中实现 `intermediates=""` → Alt+字符 / Alt+Backspace

- **Phase 3a**（VtParser 增强，不改 feed 流程）：
  - VtParser 新增 `flush()` 方法（仅刷缓冲区不 reset 状态机）
  - VtParser processGround 对 C0 字节产生 `execute` 事件（而非静默丢弃）
  - 新增 `VtExecuteEvent` 类型到 VtEvent union
  - 所有改动仅在 VtParser 内部，`feed()` 暂不修改

- **Phase 3b**（feed 重构，移除 C0 预拆分）：
  - `feed()` 移除 C0 预拆分 for 循环
  - `feed()` 结尾使用 `flush()` 替代 `reset()`
  - `handleVtEvent` 增加 `case "execute"` 分发到新的 `handleExecuteEvent`
  - LF (0x0A) 映射为 Shift+Enter

- **Phase 4**（补全性修复）：
  - KITTY_SPECIAL_KEY_MAP 补全 60 个条目
  - `handleKittyKey` 修正 params[2] 的 eventType vs text 歧义
  - `handleTildeKey` 增加 `params[0]=27` ESC 编码处理
  - TILDE_KEY_MAP 增加 `9: "Tab"`
  - 粘贴模式退出 (`201~`) 增加 `pasteMode` 守卫

## Impact

- Affected code: `packages/tui/src/vt/input-parser.ts`, `packages/tui/src/vt/vt-parser.ts`, `packages/tui/src/vt/types.ts`
- Affected tests: `packages/tui/src/vt/input-parser.test.ts`, `packages/tui/src/vt/vt-parser.test.ts`
- Downstream: 所有使用 `KeyEvent.modifiers.shift`/`.alt` 的 Widget 将开始正确收到修饰键信息

## ADDED Requirements

### Requirement: isShifted 辅助函数
系统 SHALL 提供 `isShifted(grapheme: string): boolean` 函数，当 grapheme 与其 `toLowerCase()` 不同时返回 true。

#### Scenario: 大写字母
- **WHEN** grapheme = "A"
- **THEN** isShifted 返回 true

#### Scenario: 小写字母
- **WHEN** grapheme = "a"
- **THEN** isShifted 返回 false

#### Scenario: 符号
- **WHEN** grapheme = "$"（shift+4 产生的符号）
- **THEN** isShifted 返回 true（"$" !== "$".toLowerCase() 为 false，实际上符号不变）

### Requirement: handlePrint 设置 shiftKey
`handlePrint` 发射的 KeyEvent SHALL 在 grapheme 为 shifted 字符时设置 `modifiers.shift = true`。

### Requirement: Alt+key 检测 (pendingEscape 路径)
当 `pendingEscape = true` 且收到 print 事件时，SHALL 清除 escape timeout 并发射 `{ key: grapheme, modifiers: { alt: true, shift: isShifted(grapheme) } }`。

### Requirement: Alt+key 检测 (escape 事件路径)
当收到 VtEscapeEvent 且 `intermediates === ""` 且 final 为可打印字符(32-126)时，SHALL 发射 `{ key: final, modifiers: { alt: true, shift: isShifted(final) } }`。当 final charCode = 127 时，SHALL 发射 `{ key: "Backspace", modifiers: { alt: true } }`。

### Requirement: VtParser flush 方法
VtParser SHALL 提供 `flush()` 方法，仅刷新打印缓冲区产生 print 事件，不重置状态机状态。

### Requirement: feed 架构对齐
`feed()` SHALL 不再做 C0 预拆分，将完整数据交给 VtParser。VtParser 的 execute 事件通过 `handleVtEvent` 中的 `case "execute"` 分发到新的 `handleExecuteEvent` 方法。

### Requirement: LF 映射为 Shift+Enter
C0 字符 LF (0x0A) SHALL 映射为 `{ key: "Enter", modifiers: { shift: true } }`，与 amp 行为一致。

### Requirement: KITTY_SPECIAL_KEY_MAP 补全
KITTY_SPECIAL_KEY_MAP SHALL 包含 amp IxT 表的全部 107 个条目（当前 47 个，需补充 60 个）。

### Requirement: handleKittyKey params[2] 歧义修正
当 `params.length >= 3` 且未从 `params[1].subparams[0]` 获取到 eventType 时，`params[2].value` SHALL 被解释为 eventType 而非 associated text。

### Requirement: handleTildeKey ESC 编码
当 `params[0].value === 27 && params.length >= 3` 时，handleTildeKey SHALL 从 `params[2]` 解析实际 keycode，从 `params[1]` 解析 modifier。

### Requirement: 粘贴模式退出守卫
收到 CSI 201~ 时，SHALL 检查 `pasteMode === true` 才执行退出逻辑；否则静默忽略。

## MODIFIED Requirements

### Requirement: clearEscapeTimeout 调用点
handleCsi 和 handleEscape 方法入口 SHALL 调用 `this.clearEscapeTimeout()`，防止 ESC timeout 竞态。

### Requirement: TILDE_KEY_MAP
TILDE_KEY_MAP SHALL 包含 `9: "Tab"` 条目。

### Requirement: handleTildeKey event type
handleTildeKey SHALL 从 `params[1].subparams?.[0]` 提取 event type，过滤 release 事件（eventType=3）。
