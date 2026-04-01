# Gap 审计报告 — 输入系统 (Agent-3)

> **领域**: 键盘协议 / Focus 树 / 鼠标 / HitTest / 快捷键
> **审计日期**: 2026-03-31
> **审计依据**: amp-tui-analysis-4 (InputParser), amp-tui-analysis-5 (Focus), amp-tui-analysis-6 (Mouse)
> **源码基线**: `packages/flitter-core/src/input/` 全量 11 文件 + `terminal/renderer.ts`, `terminal/platform.ts`

---

## 一、现有 Gap 状态核查

| Gap # | 标题 | 当前状态 | 说明 |
|-------|------|---------|------|
| 13 | `render-object-hit-test` | ✅ **Phase 1-2 已完成，Phase 3-4 待清理** | `RenderBox.hitTest()` / `hitTestSelf()` / `hitTestChildren()` 已实现（`render-object.ts:519-606`）；`BoxHitTestResult` / `BoxHitTestEntry` 已定义（`hit-test.ts:1-89`）；`MouseManager._performHitTest()` 已切换到统一协议（`mouse-manager.ts:181-201`）。但 `hit-test.ts:91-189` 中遗留 `hitTest()` / `hitTestSelf()` 自由函数虽标注 `@deprecated` 仍未删除。 |
| 22 | `unify-hit-test` | ✅ **核心统一已完成，残留待清理** | 与 Gap 13 同步完成。残留问题同上：deprecated 自由函数、`HitTestResult` / `HitTestEntry` 旧接口仍导出。 |
| 29 | `focus-restoration` | ✅ **已实现** | `FocusManager._focusHistory[]` 栈（MAX=8）、`restoreFocus()`、`_pushFocusHistory()`、`clearFocusHistory()`、`previousFocus` getter 均已实现（`focus.ts:427-510`）。`FocusNode.detach()` 已清理 `_focusedChild` 引用。有完整测试（`focus-restoration.test.ts`，276 行）。 |
| 30 | `shortcut-registry` | ❌ **未实现** | `shortcuts.ts` 仅 37 行，只有 `ShortcutBinding` 接口 + `matchesShortcut()` 函数。无 `ShortcutRegistry` 类、无分类、无发现机制、无冲突检测。 |

---

## 二、新发现 Gap

### GAP-3-001: Kitty CSI u 格式解析缺失

- **优先级**: P1
- **子系统**: InputParser (`input-parser.ts`)
- **Amp 对齐度**: Amp 同样缺失（analysis-4 §4.1 明确标注 Amp emitKeys 无 CSI u 解析）

**现状**: `InputParser._resolveCSI()` 通过 `CSI_NUMERIC_RE` 和 `CSI_LETTER_RE` 解析 CSI 序列，但不识别 Kitty 键盘协议的 CSI u 格式（`ESC[codepoint;modifiers:event_type u`）。终端层面已实现 Kitty 协议的开启/关闭（`renderer.ts:493-501` 的 `enableKittyKeyboard()` / `disableKittyKeyboard()`，对应 `CSI > 5 u` / `CSI < u`），以及能力查询（`platform.ts:331` 的 `KITTY_KEYBOARD_QUERY`），但 InputParser 收到 CSI u 响应后会走入 `_resolveCSI` 的未知序列分支，emit `Undefined` key。

**影响**: 在支持 Kitty 协议的终端（kitty, WezTerm, foot, Ghostty）中，开启 flags=5 后所有按键事件都会以 CSI u 格式上报，当前代码全部丢失。

**修复方向**: 在 `_resolveCSI()` 中增加 CSI u 终止符（`u`）的分支，解析 `codepoint;modifiers:event_type` 参数，映射到 `LogicalKey`。需注意 event_type 字段（1=press, 2=repeat, 3=release）和 alternate key reporting。

---

### GAP-3-002: 遗留 hit-test 自由函数未删除

- **优先级**: P2
- **子系统**: HitTest (`hit-test.ts`)
- **关联 Gap**: Gap 13 Phase 3, Gap 22

**现状**: `hit-test.ts:91-189` 中 `hitTest(root, x, y)` 和 `hitTestSelf(renderObject, localX, localY)` 自由函数已标注 `@deprecated`，但仍然导出。同时旧的 `HitTestEntry` / `HitTestResult` 接口也仍然导出。新的 `BoxHitTestEntry` / `BoxHitTestResult` + `RenderBox.hitTest()` 方法已在 `MouseManager` 中全面使用。

**影响**: 双重实现增加维护成本，外部消费者可能误用旧 API。

**修复方向**: 搜索全代码库确认旧 API 无调用点后，删除 deprecated 函数和旧接口，仅保留 `BoxHitTestEntry` / `BoxHitTestResult` 导出。

---

### GAP-3-003: MouseManager 中 RenderMouseRegion 的懒加载 require() 残留

- **优先级**: P2
- **子系统**: MouseManager (`mouse-manager.ts`)
- **关联 Gap**: Gap 13 Phase 4

**现状**: `MouseManager._extractMouseRegions()` 使用静态缓存 `_RenderMouseRegionClass` 通过 `require('../widgets/mouse-region')` 懒加载，以避免循环依赖。这是 Gap 13 Phase 4 遗留项。

**影响**: 运行时 `require()` 绕过了 TypeScript 类型检查，且 bundler 无法 tree-shake。如果 `mouse-region.ts` 路径变更会导致运行时而非编译时错误。

**修复方向**: 使用 Protocol/Interface 模式（定义 `IsMouseRegion` 接口或 symbol tag）替代 `instanceof` 检查，消除循环依赖。

---

### GAP-3-004: Focus Trap（焦点陷阱）未实现

- **优先级**: P1
- **子系统**: Focus (`focus.ts`)
- **Amp 对齐度**: Amp 的 Dialog/CommandPalette 使用 FocusTrap 限制 Tab 遍历范围（analysis-5 §5.3.3）

**现状**: `FocusManager._collectTraversable()` 从 `rootScope` 开始做全树 DFS 收集可遍历节点，Tab/Shift+Tab 在整棵树的所有可遍历节点间轮转。没有机制将 Tab 遍历限制在某个 scope 内。

**影响**: 当 overlay（Dialog、CommandPalette、ShortcutHelp）打开时，用户按 Tab 焦点会跳出 overlay 到达底层 UI，与 Amp 行为不一致且违反可访问性规范。

**修复方向**: 在 `FocusScopeNode` 上添加 `trapFocus: boolean` 属性。当 `_collectTraversable()` 遇到 `trapFocus === true` 的 scope 时，如果当前焦点节点在该 scope 内，则只收集该 scope 的后代；否则跳过该 scope。`FocusScope` widget 增加 `trapFocus` prop 透传。

---

### GAP-3-005: OSC / DCS 输入响应序列未处理

- **优先级**: P2
- **子系统**: InputParser (`input-parser.ts`)
- **Amp 对齐度**: Amp 同样缺失（analysis-4 §4.2）

**现状**: `platform.ts` 已定义了 DA1/DA2/DA3、XTVERSION、颜色查询等多种终端能力检测查询（`platform.ts:308-345`），以及响应匹配模式 `CAPABILITY_RESPONSE_PATTERNS`。但 `InputParser` 的 5 状态机（Idle → Escape → CSI / SS3 / Paste）不处理 OSC（`ESC ]`）和 DCS（`ESC P`）序列。这些查询的响应会在 stdin 中到达，当前会被 `_processEscape()` 误解析为普通按键。

**影响**: 终端能力检测响应会被误解析为用户输入事件（幽灵按键），干扰正常输入流。

**修复方向**: 在 `_processEscape()` 中增加 OSC（`]`）和 DCS（`P`）状态转移，收集到 ST（`ESC \`）或 BEL（`\x07`）时整包丢弃或路由给 capability 检测回调。

---

### GAP-3-006: EventDispatcher 中 FocusManager 的懒加载 require() 模式

- **优先级**: P3
- **子系统**: EventDispatcher (`event-dispatcher.ts`)

**现状**: `EventDispatcher` 在 `dispatchKeyEvent()` 内通过 `require('./focus')` 懒加载 `FocusManager`，原因是两个单例间存在循环依赖。

**影响**: 与 GAP-3-003 相同 — 运行时依赖绕过类型系统，bundler 不友好。

**修复方向**: 通过依赖注入（`EventDispatcher.setFocusManager()`）或中间 interface 模块打破循环依赖。

---

### GAP-3-007: In-Band Resize 序列解析未接入 InputParser

- **优先级**: P2
- **子系统**: InputParser (`input-parser.ts`) + Renderer (`renderer.ts`)
- **关联 Gap**: Gap 20 (terminal-capabilities-wiring)

**现状**: `renderer.ts` 已定义 `IN_BAND_RESIZE_ON` / `IN_BAND_RESIZE_OFF` 常量（TPRO-04），`terminalCleanup()` 会关闭 in-band resize。但 InputParser 不识别 in-band resize 通知序列（`CSI 8 ; rows ; cols t`）。当前 resize 事件只能通过 Node.js `process.stdout.on('resize')` 获取。

**影响**: 在支持 in-band resize 的终端中，resize 通知会被 `_resolveCSI()` 误解析为未知 CSI 序列。且 `process.stdout.on('resize')` 可能存在延迟或丢失。

**修复方向**: 在 `_resolveCSI()` 中识别 `t` 终止符且参数以 `8;` 开头的序列，解析 rows/cols 并 emit `ResizeEvent`。

---

### GAP-3-008: Shortcut 系统缺乏层级优先级和冲突检测

- **优先级**: P1
- **子系统**: Shortcuts (`shortcuts.ts`) + EventDispatcher (`event-dispatcher.ts`)
- **关联 Gap**: Gap 30 (shortcut-registry)

**现状**: `matchesShortcut(event, binding)` 是纯函数，一次只能匹配一个 binding。`EventDispatcher` 的 3 阶段分发（interceptors → FocusManager → handlers）中，快捷键匹配散落在各组件的 `onKey` 回调中，没有集中式注册和优先级排序。

**影响**: 
1. 组件间快捷键冲突无法自动检测（如两个组件都注册 `Ctrl+K`）
2. 上下文相关快捷键（如 "仅在 overlay 打开时生效"）需要手动在各 `onKey` 中判断
3. `?` 快捷键帮助面板（Gap 23）无法自动发现所有已注册的快捷键

**修复方向**: 按 Gap 30 设计实现 `ShortcutRegistry`，支持 `register(binding, handler, options)` / `dispatch(event)` / `getGroupedEntries()`，并与 `EventDispatcher` 的 interceptor 阶段集成。

---

### GAP-3-009: 鼠标光标形状管理缺少 OSC 22 支持

- **优先级**: P3
- **子系统**: MouseCursors (`mouse-cursors.ts`)
- **Amp 对齐度**: Amp 使用 OSC 22 设置鼠标指针形状（analysis-6 §6.2）

**现状**: `mouse-cursors.ts` 中 `cursorToAnsi()` 使用 DECSCUSR（`CSI n q`）控制文本光标形状（block/beam/underline），`SystemMouseCursors` 定义了 DEFAULT/POINTER/TEXT/NONE。但 DECSCUSR 控制的是文本光标而非鼠标指针形状。Amp 额外使用 OSC 22（`ESC ] 22 ; shape ST`）来改变鼠标指针形状（pointer、text、default），这是两个不同的概念。

**影响**: 在支持 OSC 22 的终端（如 foot, kitty）中，鼠标悬停在超链接上时应显示 pointer 手型光标，当前只会改变文本光标形状。

**修复方向**: 在 `mouse-cursors.ts` 中增加 `mousePointerToAnsi()` 函数，使用 OSC 22 序列。`MouseManager` 的 cursor 更新逻辑应同时输出 DECSCUSR（文本光标）和 OSC 22（鼠标指针）。

---

## 三、对齐度总结

| 子系统 | 对齐度 | 关键差距 |
|--------|--------|---------|
| **InputParser** (转义序列解析) | 🟢 95% | CSI u 格式不识别（GAP-3-001）；OSC/DCS 响应未处理（GAP-3-005）；In-Band Resize 未接入（GAP-3-007） |
| **Focus 树** (FocusNode / FocusManager) | 🟢 90% | Focus Trap 缺失（GAP-3-004）；Gap 29 已实现 ✅ |
| **鼠标 / HitTest** | 🟢 95% | 遗留 deprecated 函数待清理（GAP-3-002）；懒加载 require() 残留（GAP-3-003）；OSC 22 鼠标指针缺失（GAP-3-009） |
| **快捷键** | 🔴 30% | 无注册中心、无优先级、无冲突检测、无发现（GAP-3-008 / Gap 30 未实现） |
| **事件分发** (EventDispatcher) | 🟢 90% | 懒加载循环依赖（GAP-3-006）；与快捷键注册中心未集成 |

---

## 四、修复优先级排序

| 优先级 | Gap | 理由 |
|--------|-----|------|
| **P1** | GAP-3-004 Focus Trap | Overlay 场景焦点泄漏直接影响用户体验 |
| **P1** | GAP-3-008 / Gap 30 Shortcut Registry | 快捷键系统是 Amp CLI 的核心交互，30% 对齐度不可接受 |
| **P1** | GAP-3-001 Kitty CSI u | Kitty/WezTerm/Ghostty 用户群体庞大，开启协议后输入全部失效 |
| **P2** | GAP-3-005 OSC/DCS 输入处理 | 能力检测响应干扰输入流，表现为随机幽灵按键 |
| **P2** | GAP-3-007 In-Band Resize | 比 SIGWINCH 更可靠的 resize 通知 |
| **P2** | GAP-3-002 遗留 hit-test 清理 | 技术债务，维护成本 |
| **P2** | GAP-3-003 require() 清理 | 技术债务，类型安全 |
| **P3** | GAP-3-006 EventDispatcher require() | 技术债务 |
| **P3** | GAP-3-009 OSC 22 鼠标指针 | 仅影响少数支持终端，体验增强 |

---

## 五、交叉引用

- **Gap 13** → GAP-3-002（Phase 3-4 残留清理）
- **Gap 22** → GAP-3-002（同上，Gap 22 是 Gap 13 的诊断文档）
- **Gap 29** → ✅ 已实现，无新 Gap
- **Gap 30** → GAP-3-008（快捷键注册中心，是 Gap 30 的审计重述）
- **Gap 20** → GAP-3-005 / GAP-3-007（能力检测查询的响应需要 InputParser 配合处理）
- **Gap 23** (shortcut-help-overlay) → GAP-3-008（帮助面板依赖 ShortcutRegistry 的 `getGroupedEntries()`）
