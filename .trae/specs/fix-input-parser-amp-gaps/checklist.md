# Checklist

## Phase 1

- [x] `isShifted("A")` 返回 true，`isShifted("a")` 返回 false
- [x] 输入大写字母 'A' 的 print 事件包含 `modifiers.shift = true`
- [x] 输入小写字母 'a' 的 print 事件包含 `modifiers.shift = false`
- [x] `handleCsi` 方法入口调用了 `clearEscapeTimeout()`
- [x] `handleEscape` 方法入口调用了 `clearEscapeTimeout()`

## Phase 2

- [x] 当 ESC 后 25ms 内收到可打印字符时，发射带 `alt: true` 的 key 事件（pendingEscape 路径）
- [x] 当 VtParser 产生 `{ type: "escape", intermediates: "", final: "f" }` 时，发射 `{ key: "f", alt: true }`
- [x] 当 VtParser 产生 `{ type: "escape", intermediates: "", final: "\x7f" }` 时，发射 `{ key: "Backspace", alt: true }`
- [x] pendingEscape 字段不再有 biome-ignore 标记

## Phase 3a

- [x] VtParser 有 `flush()` 方法，调用后产生 pending print 事件但不重置状态
- [x] `VtExecuteEvent { type: "execute"; code: number; }` 存在于 `types.ts` 的 VtEvent union 中
- [x] VtParser processGround 对 C0 字节（0x00-0x1F 除 ESC，0x7F）产生 execute 事件
- [x] 现有 VtParser 测试全部通过（零回归）

## Phase 3b

- [x] `feed()` 不再有 C0 预拆分 for 循环
- [x] `feed()` 结尾使用 `flush()` 而非 `reset()`
- [x] `handleVtEvent` 有 `case "execute"` 分支
- [x] LF (0x0A) 通过 execute 路径映射为 `{ key: "Enter", shift: true }`
- [x] 跨 feed 调用的 CSI 序列不被截断（如 ESC 在第一次 feed，`[A` 在第二次 feed）
- [x] 所有现有 input-parser 测试通过（可能需调整 assertion）

## Phase 4

- [x] KITTY_SPECIAL_KEY_MAP 包含 >= 100 个条目（amp 有 107 个）
- [x] `CSI 57399 u` 正确映射为 KP_0（小键盘 0）
- [x] `CSI 97;1;3 u`（无 subparam eventType）被识别为 release 事件，不发射 key 事件
- [x] `CSI 97;1:1;36 u`（有 subparam eventType=1）的 params[2] 被视为 associated text
- [x] TILDE_KEY_MAP 包含 `9: "Tab"`
- [x] `CSI 27;3;102 ~` 发射 `{ key: "f", alt: true }`
- [x] handleTildeKey 过滤 release 事件（params[1] subparam = 3）
- [x] 未配对的 CSI 201~ 不发射空 paste 事件
- [x] 全部 vt 测试通过：`bun test packages/tui/src/vt/` → **238 pass, 0 fail**
