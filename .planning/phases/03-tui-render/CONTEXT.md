# Phase 3: TUI 底层渲染基础 — Context

**Phase:** 03-tui-render
**Package:** `@flitter/tui`
**Requirements:** TUI-01, TUI-02
**Depends on:** Phase 1 (schemas)

---

## Domain Analysis

Phase 3 建立 Flitter TUI 框架的底层基础——终端输入解析和屏幕渲染输出。这是 TUI 四阶段中的第一阶段，为后续的三棵树引擎 (Phase 4)、Widget 库 (Phase 5)、高级交互组件 (Phase 6) 提供基础设施。

TUI 框架是整个项目最大的单一子系统（26K 行逆向代码，12/26 陷阱），Phase 3 聚焦于最底层的两个支柱：VT/ANSI 解析器和 Screen 缓冲区。

### 逆向参考代码源

| 领域 | 参考文件 | 关键发现 |
|------|---------|---------|
| VT/ANSI 解析器 | `framework/tui-widget-framework.js` (前 200 行) | 完整状态机: ground/escape/csi_dispatch/osc_start/dcs/apc，context 对象含 params/intermediates/private/oscData/dcsData/printBuffer/textBuffer |
| 终端输入事件 | `framework/clipboard-and-input.js` (619 行) | KeyEvent/MouseEvent/PasteEvent 结构，SGR 鼠标模式，modifier bitmask (Shift=2,Alt=3,Ctrl=5)，CSI→key 映射表 |
| Screen/Cell 缓冲区 | `framework/tui-render-pipeline.js` (783 行) | Zx 类 (front/back buffer)，pY 类 (cells 二维数组)，G 类 (TextSpan)，cT 类 (TextStyle)，LT 类 (Color) |
| 差分渲染 | `framework/tui-render-pipeline.js` | getDiff() 逐行逐列比较，dm0() 单元格相等性，ANSI SGR 编码，光标位置管理 |

### 核心架构

```
@flitter/tui (Phase 3 scope)
├── vt/                    # TUI-01: VT/ANSI 解析层
│   ├── vt-parser.ts            # VT 状态机 (CSI/OSC/DCS/APC/SS3 序列解析)
│   ├── input-parser.ts         # CSI→KeyEvent/MouseEvent/PasteEvent 映射
│   └── types.ts                # VT 事件类型 + 输入事件类型定义
├── screen/                # TUI-02: 屏幕渲染层
│   ├── cell.ts                 # Cell 数据结构 (字符+颜色+属性+宽度)
│   ├── text-style.ts           # TextStyle (前景色/背景色/粗体/斜体/下划线/删除线/暗淡)
│   ├── color.ts                # Color 类 (default/named16/index256/rgb)
│   ├── buffer.ts               # ScreenBuffer (2D Cell 矩阵)
│   ├── screen.ts               # Screen 双缓冲 (front/back + diff + present)
│   └── ansi-renderer.ts        # ANSI 差分输出 (Cell 比较→最小 SGR 序列)
└── index.ts               # 统一导出
```

### 技术约束

- **零外部依赖**: VT 解析器完全自实现（不用 xterm.js/vt100 库）
- **UTF-8 正确性**: 支持多字节 UTF-8 序列，grapheme cluster 分割
- **CJK 宽度**: 双宽字符需 2 个 Cell 占位（PIT-E1 陷阱）
- **状态机完备**: 覆盖 CSI/OSC/DCS/APC/SS3 全部序列类型
- **性能**: Screen diff 渲染是帧循环热路径，必须高效
- **ESM-only**: 所有导出使用 ESM `export` 语法
- **沙箱限制**: Node.js v24 + npx tsx 运行测试

### 依赖库

| 库 | 用途 |
|----|------|
| `@flitter/util` | Disposable 模式 (IDisposable/DisposableCollection) |
| 无新外部依赖 | VT 解析器 + Screen 缓冲区全部自实现 |

### 关键陷阱

| ID | 陷阱 | 影响 | 缓解策略 |
|----|------|------|---------|
| PIT-C4 | VT 解析器不完整 | 丢失 DCS/OSC 序列导致终端功能异常 | 状态机覆盖所有序列类型 + 100+ 测试用例 |
| PIT-E1 | CJK 宽度计算 | 双宽字符导致屏幕错位 | 使用 Unicode East Asian Width + grapheme segmenter |

---

## Plan Overview (3 Waves)

| Wave | Plans | 描述 |
|------|-------|------|
| 1 | 03-01, 03-02 | 类型定义层 (VT 事件类型 + Screen 数据结构) — 纯类型，无依赖 |
| 2 | 03-03, 03-04 | 解析器层 (VT 状态机 + 输入事件映射) — 依赖 Wave 1 类型 |
| 3 | 03-05, 03-06 | 渲染输出层 (Screen 双缓冲 + ANSI 差分渲染) — 依赖 Wave 1+2 |

Wave 1 建立所有类型定义和数据结构。Wave 2 实现输入解析。Wave 3 实现屏幕输出。
