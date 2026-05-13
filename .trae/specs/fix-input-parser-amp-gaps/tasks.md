# Tasks

## Phase 1: 快速修复（不改架构）

- [x] Task 1: 新增 `isShifted()` 辅助函数 + `handlePrint` 设置 shiftKey
  - [x] 1.1: 在 input-parser.ts 中新增 `isShifted(grapheme: string): boolean` 函数（紧邻 `keyEvent` 辅助函数之后）
  - [x] 1.2: 修改 `handlePrint` 中的 `this.emit(keyEvent(grapheme))` 为 `this.emit(keyEvent(grapheme, { ...MODIFIERS_NONE, shift: isShifted(grapheme) }))`
  - [x] 1.3: 编写测试：大写字母 'A' 的 print 事件应包含 `modifiers.shift = true`，小写字母 'a' 应为 false

- [x] Task 2: `handleCsi` 和 `handleEscape` 入口添加 `clearEscapeTimeout()`
  - [x] 2.1: 在 `handleCsi` 方法体第一行添加 `this.clearEscapeTimeout()`
  - [x] 2.2: 在 `handleEscape` 方法体第一行添加 `this.clearEscapeTimeout()`
  - [x] 2.3: 编写测试：ESC 后紧跟 CSI 序列时不应额外发射 Escape 事件

## Phase 2: 实现 Alt+key 两条路径

- [x] Task 3: `handlePrint` 实现 pendingEscape → Alt+字符检测
  - [x] 3.1: 移除 `pendingEscape` 字段上的 biome-ignore 注释（它不再 unused）
  - [x] 3.2: 在 `handlePrint` 的粘贴模式检查之后、C0 防御检查之前，添加 pendingEscape 分支：检查 pendingEscape → clearEscapeTimeout → emit keyEvent(grapheme, { alt: true, shift: isShifted(grapheme) }) → return
  - [x] 3.3: 编写测试：ESC 后 25ms 内收到 'x' → 发射 `{ key: "x", modifiers: { alt: true } }`；ESC 超时后收到 'x' → 分别发射 Escape 和 'x'

- [x] Task 4: `handleEscape` 实现 `intermediates=""` → Alt+字符 / Alt+Backspace
  - [x] 4.1: 在 handleEscape 的 SS3 处理之后，添加 `intermediates === ""` 分支
  - [x] 4.2: final charCode 32-126 → emit `keyEvent(final, { alt: true, shift: isShifted(final) })`
  - [x] 4.3: final charCode 127 → emit `keyEvent("Backspace", { ...MODIFIERS_NONE, alt: true })`
  - [x] 4.4: 编写测试：VtEscapeEvent { intermediates: "", final: "f" } → `{ key: "f", modifiers: { alt: true } }`

## Phase 3a: VtParser 增强（不改 feed 流程）

- [x] Task 5: VtParser 新增 `flush()` 方法和 execute 事件
  - [x] 5.1: 在 `types.ts` 的 VtEvent union 中新增 `VtExecuteEvent { type: "execute"; code: number; }`
  - [x] 5.2: 在 `vt-parser.ts` 中新增 `flush()` 方法：调用 `flushPrintBuffer()`（如果有 pending print 数据则产生 print 事件），不重置状态机
  - [x] 5.3: 修改 `processGround()` 使 C0 字节（0x00-0x1F 除 ESC，0x7F）产生 execute 事件而非静默丢弃
  - [x] 5.4: 编写测试：VtParser.flush() 刷新缓冲中的 print 数据但不重置状态
  - [x] 5.5: 编写测试：VtParser 收到 C0 字节后产生 execute 事件
  - [x] 5.6: 确认现有 VtParser 测试全部通过（execute 事件为新增行为，不应破坏现有事件流）

## Phase 3b: feed 重构（移除 C0 预拆分）

- [x] Task 6: 重写 `feed()` 移除 C0 预拆分
  - [x] 6.1: 移除 feed() 中的 for 循环（C0 预拆分逻辑）
  - [x] 6.2: feed() 新逻辑：standalone ESC 检测 → clearEscapeTimeout if pending → 直接 `this.vtParser.parse(data)` → `this.vtParser.flush()`（替代 reset）
  - [x] 6.3: 在 `handleVtEvent` 的 switch 中添加 `case "execute": this.handleExecuteEvent(event); break;`
  - [x] 6.4: 新增 `handleExecuteEvent(event: VtExecuteEvent)` 方法，含粘贴模式分支和完整 C0 映射
  - [x] 6.5: LF (0x0A) 在 handleExecuteEvent 中映射为 `keyEvent("Enter", shiftMod())`
  - [x] 6.6: 编写测试：feed 完整字节流（含 C0 字符）后事件序列正确；跨 feed 的多字节序列不被截断

- [x] Task 7: 修复因架构变更而失败的现有测试
  - [x] 7.1: 运行 `bun test packages/tui/src/vt/` 检查回归
  - [x] 7.2: 更新受影响的测试用例（如 C0 处理路径变化、shiftKey 新增）

## Phase 4: 补全性修复

- [x] Task 8: KITTY_SPECIAL_KEY_MAP 补全 60 个条目
  - [x] 8.1: 读取 amp 的 IxT 表（`amp-cli-reversed/modules/2026_tail_anonymous.js` 约 L156722-156829）
  - [x] 8.2: 将缺失的 60 个条目补入 KITTY_SPECIAL_KEY_MAP（F25-F35, KP_0-KP_9, 小键盘运算符, 多媒体键等）
  - [x] 8.3: 编写测试：验证新增 keycode 能正确映射到键名

- [x] Task 9: handleKittyKey params[2] 歧义修正
  - [x] 9.1: 在 handleKittyKey 的 `params.length >= 3` 分支中，检查是否已有 eventType（来自 params[1].subparams[0]）
  - [x] 9.2: 如果没有 eventType 且 final="u"，将 params[2].value 作为 eventType（3=release 则 return，1/2 为 press/repeat）
  - [x] 9.3: 仅当已有 eventType 时，将 params[2].value 作为 associated text codepoint
  - [x] 9.4: 编写测试：`CSI 97;1;3 u` 应被识别为 release 事件而非文本插入

- [x] Task 10: handleTildeKey 增强
  - [x] 10.1: TILDE_KEY_MAP 增加 `9: "Tab"`
  - [x] 10.2: 添加 `params[0].value === 27` 分支：从 params[2] 解析 keycode，从 params[1] 解析 modifier
  - [x] 10.3: 提取 `params[1].subparams?.[0]` 作为 eventType，过滤 release（eventType=3）
  - [x] 10.4: 粘贴模式退出 `code === 201` 分支增加 `if (!this.pasteMode) return;` 守卫
  - [x] 10.5: 编写测试：CSI 27;3;102 ~ → Alt+f；CSI 9 ~ → Tab；未配对 201~ 不 emit 空 paste

# Task Dependencies

- Task 1 无依赖
- Task 2 无依赖
- Task 3 depends on Task 1（需要 isShifted 函数）
- Task 4 depends on Task 1（需要 isShifted 函数）
- Task 5 无依赖（VtParser 独立修改）
- Task 6 depends on Task 5（需要 flush 方法和 execute 事件）+ Task 1（需要 isShifted）
- Task 7 depends on Task 6
- Task 8 无依赖
- Task 9 无依赖
- Task 10 无依赖

# 并行化策略

- **Wave 1**: Task 1 + Task 2 + Task 5 + Task 8 + Task 9 + Task 10（全部独立）✅
- **Wave 2**: Task 3 + Task 4（依赖 Task 1）✅
- **Wave 3**: Task 6（依赖 Task 5，Phase 3b 在 3a 验证通过后执行）✅
- **Wave 4**: Task 7（依赖 Task 6，运行测试验证全量回归）✅

# 风险控制

- Phase 3a 完成后必须运行 `bun test packages/tui/src/vt/vt-parser.test.ts` 确认零回归后才可进入 Phase 3b ✅
- Phase 3b 是整体风险最高的变更，因为它修改了 feed() 的控制流——所有 input-parser 测试都可能受影响 ✅ 无回归
- Task 7 是 Phase 3b 的安全网，不可跳过 ✅ 238 tests pass
