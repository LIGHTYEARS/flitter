# Plan 03-04 Summary: InputParser 输入事件解析器

## Status: COMPLETE

## Artifacts Created

| File | Description |
|------|-------------|
| `packages/tui/src/vt/input-parser.ts` | InputParser (VtEvent → InputEvent 转换) |
| `packages/tui/src/vt/input-parser.test.ts` | 64 tests |
| `packages/tui/src/vt/index.ts` | vt/ barrel export |

## Test Results: 64 tests, 0 failures

## Key Details
- 两种模式: feed(data) 原始字节推荐, handleVtEvent() 手动注入
- feed() 拦截 C0 控制字节 (VtParser 会丢弃): Tab/Enter/Backspace/Ctrl+letter
- CSI 映射: 方向键, F1-F12, Home/End/Insert/Delete/PageUp/PageDown
- SGR 鼠标: button/x/y 解析, press/release/move/wheel, modifier bits
- Bracketed paste: 200~/201~ 配对, PasteEvent 含完整文本
- Focus: CSI I (gained) / CSI O (lost)
- SS3: ESC O P-S → F1-F4, ESC O A-D → 方向键
