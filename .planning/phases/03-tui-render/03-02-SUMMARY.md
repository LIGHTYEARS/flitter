# Plan 03-02 Summary: VT 事件类型定义

## Status: COMPLETE

## Artifacts Created

| File | Description |
|------|-------------|
| `packages/tui/src/vt/types.ts` | VtEvent (6 variants) + InputEvent (5 variants) + 工具函数 |
| `packages/tui/src/vt/types.test.ts` | 14 tests |

## Test Results: 14 tests, 0 failures

## Key Details
- VtEvent: print/csi/escape/osc/dcs/apc — 联合类型 + type 判别
- InputEvent: key/mouse/paste/focus/resize — 联合类型 + type 判别
- CsiParam: value + subparams[], Modifiers: shift/ctrl/alt/meta
- 工具函数: MODIFIERS_NONE, hasModifier(), modifierFromCsiParam()
