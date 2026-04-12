# Plan 03-06 Summary: ANSI 差分渲染器

## Status: COMPLETE

## Artifacts Created

| File | Description | LOC |
|------|-------------|-----|
| `packages/tui/src/screen/ansi-renderer.ts` | AnsiRenderer 类 + ANSI 常量 | ~210 |
| `packages/tui/src/screen/ansi-renderer.test.ts` | 测试套件 | ~370 |
| `packages/tui/src/screen/index.ts` | screen/ barrel export | ~50 |
| `packages/tui/src/index.ts` | tui 包顶层导出 (更新) | 3 |

## Test Results

- **44 tests**, 6 个描述组
- **0 failures**

| Group | Tests |
|-------|-------|
| ANSI 常量 | 10 |
| 差分渲染 | 16 |
| 全屏渲染 (renderFull) | 5 |
| 光标控制 (renderCursor) | 5 |
| 端到端集成 | 5 |
| SGR 编码 | 3 |

## Key Implementation Details

1. **AnsiRenderer 类**: render(screen) / renderFull(screen) / renderCursor(screen)
2. **差分渲染优化**: 仅输出脏区域变化 Cell，跳过 width=0 续位
3. **SGR 最小化**: 使用 TextStyle.diffSgr() 避免冗余样式输出
4. **光标控制**: CUP 绝对定位，SHOW/HIDE 可见性
5. **ANSI 常量导出**: ESC/CSI/CUP/SGR/ALT_SCREEN/MOUSE/PASTE 全部可用

## Barrel Exports

- `screen/index.ts`: Color, TextStyle, Cell, ScreenBuffer, Screen, AnsiRenderer + 全部 ANSI 常量
- `tui/src/index.ts`: 重导出 vt/ + screen/ 全部 API

## Verification

```
npx tsc --noEmit → 0 errors
npx tsx --test ansi-renderer.test.ts → 44 passed, 0 failed
```
