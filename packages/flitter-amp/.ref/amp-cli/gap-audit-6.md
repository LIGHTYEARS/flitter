# Gap 审计报告 — 三树生命周期领域

**审计 Agent**: Gap 审计 Agent-6
**领域**: Widget / Element / RenderObject reconciliation · InheritedWidget · StatefulWidget
**日期**: 2026-03-31
**输入**:
- Amp 分析报告: `amp-tui-analysis-10.md` (三树生命周期), `amp-tui-analysis-11.md` (InheritedWidget), `amp-tui-analysis-12.md` (StatefulWidget/setState)
- Flitter 源码: `widget.ts`, `element.ts`, `render-object.ts`, `build-owner.ts`, `pipeline-owner.ts`, `binding.ts`, `error-widget.ts`, `listenable.ts`
- 已有 Gap 提案: `.gap/01` ~ `.gap/10`

---

## 一、审计范围

本审计覆盖 flitter-core `framework/` 目录下的三树（Widget tree / Element tree / RenderObject tree）核心生命周期系统，具体包括：

| 子系统 | Amp 参考报告 | Flitter 源码 |
|--------|-------------|-------------|
| Widget 基类 / canUpdate / Key | #10 §2 | `widget.ts` |
| Element 生命周期 / mount / unmount / rebuild | #10 §3-4 | `element.ts` |
| updateChild 4-case reconciliation | #10 §5 | `element.ts` SingleChild/InheritedElement |
| updateChildren 三阶段 O(N) 算法 | #10 §6 | `element.ts` MultiChildRenderObjectElement |
| BuildOwner.buildScope / scheduleBuildFor | #10 §7, #12 §4 | `build-owner.ts` |
| 帧调度 4 阶段流水线 | #10 §8 | `binding.ts`, `pipeline-owner.ts` |
| InheritedWidget 依赖追踪 / notifyDependents | #11 §1-4 | `element.ts`, `widget.ts` |
| Theme 双层传播 | #11 §5-6 | — (flitter-amp 层) |
| StatefulWidget / State / setState | #12 §1-3 | `widget.ts`, `element.ts` |
| setState 批处理与帧调度 | #12 §4-5 | `build-owner.ts`, `binding.ts` |
| 错误边界 / ErrorWidget | #12 §6 | `error-widget.ts`, `element.ts` |

---

## 二、Gap 清单

### Gap G6-01: `any` 类型在框架边界的系统性使用

| 属性 | 值 |
|------|-----|
| **优先级** | P1 |
| **影响范围** | widget.ts, element.ts, render-object.ts, binding.ts, pipeline-owner.ts |
| **Amp 行为** | Amp 为混淆后 JS，无类型系统约束，不适用 |
| **Flitter 现状** | 约 58 处 `any` 使用分布在 5 个框架文件中。`Widget.createElement()` 返回 `any`、`Element.renderObject` 为 `any`、`_mountChild` 使用 duck-typing `(child as any).mount()`、`SingleChildRenderObjectElement` 使用 `(this.renderObject as any).child` 等。6 大类别：循环依赖返回类型(18处)、缺少 Mountable 接口(12处)、RenderObject 协议不匹配(8处)、Constructor-as-Value for instanceof(5处)、跨模块接口缺口(6处)、Widget 访问器类型(5处) |
| **已有 .gap 引用** | F09 (`09-type-safety-any-removal.md`) — 完整覆盖，含 4 阶段迁移计划 |
| **实现状态** | ❌ 未实现 |
| **建议修复方向** | 按 F09 的 4 阶段计划执行：Phase 1 为 Element 添加 `mount()` 基类方法 + 类型化 widget 访问器；Phase 2 演化 ElementLike 接口 + `createElement()` 返回类型；Phase 3 泛型化 ancestor 查询方法；Phase 4 RenderObject 协议接口 |

---

### Gap G6-02: Positioned 仍使用 SingleChildRenderObjectWidget 变通方案

| 属性 | 值 |
|------|-----|
| **优先级** | P1 |
| **影响范围** | `widgets/stack.ts` |
| **Amp 行为** | Amp 中 `L4` (Positioned) 继承 `R_` (ParentDataWidget)，不创建 RenderObject，通过 `applyParentData()` 将 `StackParentData` 写入子 RenderObject |
| **Flitter 现状** | ✅ **已修复** — 经代码验证，`Positioned` 已改为 `extends ParentDataWidget`，`RenderPositioned` 已被删除。`RenderStack` 现已统一通过 `StackParentData` 检测定位子节点 |
| **已有 .gap 引用** | F10 (`10-parent-data-widget.md`) — 完整描述了问题和迁移方案 |
| **实现状态** | ✅ 已实现 |
| **备注** | F10 提案的目标已达成，可标记为 Closed |

---

### Gap G6-03: `didChangeDependencies()` 生命周期方法

| 属性 | 值 |
|------|-----|
| **优先级** | P2（Flitter 超越 Amp 的扩展） |
| **影响范围** | `element.ts`, `widget.ts` |
| **Amp 行为** | Amp 的 `Z_0.notifyDependents()` 直接调用 `dep.markNeedsRebuild()`，无 `didChangeDependencies` 回调 |
| **Flitter 现状** | ✅ 已实现 — `Element.didChangeDependencies()` 在 element.ts:259 定义，`StatefulElement` 在 element.ts:601 覆写以调用 `State.didChangeDependencies()`。`InheritedElement.notifyDependents()` 在 element.ts:849 调用 `dep.didChangeDependencies()` 替代 `markNeedsRebuild()` |
| **已有 .gap 引用** | F01 (`01-did-change-dependencies.md`) |
| **实现状态** | ✅ 已实现 |
| **备注** | Flutter-faithful 扩展，非 Amp 行为复刻 |

---

### Gap G6-04: `deactivate()` / `activate()` 生命周期阶段

| 属性 | 值 |
|------|-----|
| **优先级** | P2（Flitter 超越 Amp 的扩展） |
| **影响范围** | `element.ts`, `build-owner.ts`, `binding.ts` |
| **Amp 行为** | Amp Element 只有 3 态（created / mounted / unmounted），无 deactivate/activate 中间态 |
| **Flitter 现状** | ✅ 已实现 — `_ElementLifecycleState` 4 态枚举（initial / active / inactive / defunct）在 element.ts:46。`deactivate()` 在 element.ts:190，`activate()` 在 element.ts:207。`BuildOwner._inactiveElements` Set 在 build-owner.ts:79 追踪非活跃元素。`finalizeTree()` 在 build-owner.ts:271 永久卸载非活跃元素 |
| **已有 .gap 引用** | F02 (`02-deactivate-lifecycle.md`) |
| **实现状态** | ✅ 已实现 |
| **备注** | 为 GlobalKey reparenting 提供基础设施 |

---

### Gap G6-05: `reassemble()` 热重载支持

| 属性 | 值 |
|------|-----|
| **优先级** | P3（Flitter 超越 Amp 的扩展） |
| **影响范围** | `element.ts`, `widget.ts`, `binding.ts` |
| **Amp 行为** | Amp 无热重载支持，无 reassemble 方法 |
| **Flitter 现状** | ✅ 已实现 — `Element.reassemble()` 在 element.ts:355 递归标脏子树。`StatefulElement.reassemble()` 在 element.ts:587 调用 `State.reassemble()`。`WidgetsBinding.reassemble()` 作为入口 |
| **已有 .gap 引用** | F03 (`03-hot-reload-reassemble.md`) |
| **实现状态** | ✅ 已实现 |

---

### Gap G6-06: GlobalKey 功能性实现

| 属性 | 值 |
|------|-----|
| **优先级** | P2 |
| **影响范围** | `widget.ts`, `build-owner.ts` |
| **Amp 行为** | Amp 有 `Zs` (GlobalKey) 但实现较简化，主要用于 `_currentElement` 追踪 |
| **Flitter 现状** | ✅ 已实现 — `GlobalKey` 有 `_currentElement` / `_setElement` / `_clearElement`。`currentElement` / `currentWidget` / `currentState` getter 可用。`GlobalKeyRegistry` 在 build-owner.ts 管理全局注册表 |
| **已有 .gap 引用** | F04 (`04-global-key-implementation.md`) |
| **实现状态** | ✅ 已实现 |

---

### Gap G6-07: ErrorWidget 构建时错误替换

| 属性 | 值 |
|------|-----|
| **优先级** | P1 |
| **影响范围** | `error-widget.ts`, `element.ts`, `build-owner.ts` |
| **Amp 行为** | Amp 的 `buildScopes()` 内部循环无 per-element try-catch。build 异常为致命错误（catch-log-continue 模式仅在外层），无 ErrorWidget 替换 |
| **Flitter 现状** | ✅ 已实现 — `ErrorWidget` 作为 `LeafRenderObjectWidget` 在 error-widget.ts 中定义，`RenderErrorBox` 绘制红底白字错误信息。`BuildOwner.buildScope()` 在 build-owner.ts:140 有 per-element try-catch，捕获 build 异常后用 ErrorWidget 替换子树。`ErrorWidget.builder` 静态钩子允许自定义错误 UI |
| **已有 .gap 引用** | F05 (`05-error-widget.md`) |
| **实现状态** | ✅ 已实现 |
| **备注** | 这是 flitter 相比 Amp 的显著增强 — Amp 中 build 异常会导致整个 buildScopes 循环中断 |

---

### Gap G6-08: ProxyWidget / ProxyElement 中间基类

| 属性 | 值 |
|------|-----|
| **优先级** | P2 |
| **影响范围** | `widget.ts`, `element.ts` |
| **Amp 行为** | Amp 无 ProxyWidget/ProxyElement — `Bt` (InheritedWidget) 和 `R_` (ParentDataWidget) 均直接继承 `Sf` (Widget) |
| **Flitter 现状** | ✅ 已实现 — `ProxyWidget` 在 widget.ts 中定义为 `Widget` 的子类，持有 `child: Widget`。`ProxyElement` 在 element.ts 中定义，提供单子节点生命周期（mount/unmount/update）和 `_swapWidget()` / `_updateChild()` split 模式。`InheritedWidget extends ProxyWidget`，`InheritedElement extends ProxyElement`。`ParentDataWidget extends ProxyWidget`，`ParentDataElement extends ProxyElement` |
| **已有 .gap 引用** | F06 (`06-proxy-widget.md`) |
| **实现状态** | ✅ 已实现 |
| **备注** | Amp 偏差但为纯结构重构，零行为差异 |

---

### Gap G6-09: `_inheritedWidgets` HashMap 实现 O(1) InheritedWidget 查找

| 属性 | 值 |
|------|-----|
| **优先级** | P2（性能优化） |
| **影响范围** | `element.ts` |
| **Amp 行为** | Amp 使用 O(depth) 父链线性遍历查找 InheritedWidget — `T$.dependOnInheritedWidgetOfExactType()` 逐级 while 循环 |
| **Flitter 现状** | ✅ 已实现 — `Element._inheritedWidgets: Map<Function, InheritedElement> | null` 在 element.ts:76。`addChild()` 传播 map (element.ts:145)，`InheritedElement._updateInheritedWidgets()` 在 element.ts:782 创建扩展 map。`dependOnInheritedWidgetOfExactType()` 在 element.ts:272 使用 `_inheritedWidgets?.get(widgetType)` 实现 O(1) 查找 |
| **已有 .gap 引用** | F07 (`07-inherited-widget-map.md`) |
| **实现状态** | ✅ 已实现 |
| **备注** | 经运行时验证的 Amp 偏差，匹配 Flutter 生产实现 |

---

### Gap G6-10: InheritedModel 基于 Aspect 的细粒度依赖追踪

| 属性 | 值 |
|------|-----|
| **优先级** | P2（性能优化） |
| **影响范围** | `widget.ts`, `element.ts` |
| **Amp 行为** | Amp 无 InheritedModel，所有 InheritedWidget 依赖为全量通知 |
| **Flitter 现状** | ✅ 已实现 — `InheritedModel<T>` 在 widget.ts 中定义，含 `updateShouldNotifyDependent(oldWidget, dependencies)` 抽象方法。`InheritedModelElement<T>` 在 element.ts 中定义，使用 `Map<Element, Set<T> | null>` 追踪 aspect 依赖。`dependOnInheritedModel()` 方法在 Element 和 BuildContextImpl 上均可用。`InheritedModel.inheritFrom()` 静态便捷方法提供类型安全的 aspect 订阅 |
| **已有 .gap 引用** | F08 (`08-inherited-model.md`) |
| **实现状态** | ✅ 已实现 |
| **备注** | 匹配 Flutter API，但非 Amp 行为。Theme/MediaQuery 尚未迁移至 InheritedModel |

---

### Gap G6-11: `setState()` 缺少 build 中调用的防护检查

| 属性 | 值 |
|------|-----|
| **优先级** | P2 |
| **影响范围** | `widget.ts` |
| **Amp 行为** | Amp 的 `_8.setState(fn)` 不检查是否在 build 过程中被调用。在 build 中调用 setState 在 Amp 中不会报错但可能导致不可预测行为 |
| **Flitter 现状** | `State.setState()` (widget.ts) 检查 `_disposed` 状态，但**未检查**是否在 `build()` 执行期间被调用。Flutter 的 setState 会在 build 期间抛出异常 `setState() or markNeedsBuild() called during build` |
| **已有 .gap 引用** | 无 |
| **实现状态** | ❌ 未实现 |
| **建议修复方向** | 在 `BuildOwner.buildScope()` 进入/退出时设置 `_building` 标志，`scheduleBuildFor()` 中检查并在 build 期间的 setState 调用抛出明确错误。这是 Flutter 的标准防护，有助于在开发阶段捕获时序 bug |

---

### Gap G6-12: `BuildOwner.buildScope()` 缺少深度排序（depth-sorted rebuild）的完整性保证

| 属性 | 值 |
|------|-----|
| **优先级** | P2 |
| **影响范围** | `build-owner.ts` |
| **Amp 行为** | Amp `NB0.buildScopes()` 将脏元素按深度排序后逐个 rebuild，while 循环允许级联标脏（rebuild A 可能标脏 B，B 被追加到有序队列中）。排序使用 `_cachedDepth` 比较 |
| **Flitter 现状** | `BuildOwner.buildScope()` 在 build-owner.ts:120 实现了 while 循环和深度排序（`sorted.sort((a, b) => a.depth - b.depth)`）。但排序在**每次循环迭代**中对整个脏集进行，Amp 的实现更高效（使用有序插入而非全量重排） |
| **已有 .gap 引用** | 无 |
| **实现状态** | ⚠️ 功能正确但性能非最优 |
| **建议修复方向** | 考虑使用优先队列（min-heap by depth）替代每次迭代的全量排序。当前实现在小树中可接受，但在大型 TUI 应用中可能成为瓶颈 |

---

### Gap G6-13: InheritedModel 尚未被 Theme / MediaQuery 等核心组件采用

| 属性 | 值 |
|------|-----|
| **优先级** | P3 |
| **影响范围** | `widgets/theme.ts`, `widgets/media-query.ts`, `widgets/app-theme.ts` |
| **Amp 行为** | 不适用 — Amp 无 InheritedModel |
| **Flitter 现状** | InheritedModel 基础设施已就绪（G6-10），但 `Theme`（15 色彩字段）、`MediaQuery`（size + capabilities）、`AppTheme`（SyntaxHighlightConfig 13 字段 + colors 5 字段）仍为 `InheritedWidget`，使用全量通知。任何单字段变更都会触发所有依赖方 rebuild |
| **已有 .gap 引用** | F08 (`08-inherited-model.md`) §2.7-2.8 提供了 MediaQuery 和 Theme 的迁移示例 |
| **实现状态** | ❌ 未迁移 |
| **建议修复方向** | 优先迁移 `Theme` → `InheritedModel<ThemeAspect>`（15 字段 → 15 aspect，收益最大），其次 `MediaQuery` → `InheritedModel<MediaQueryAspect>`（size vs capabilities），最后 `AppTheme`。F08 提案已包含完整迁移代码 |

---

### Gap G6-14: Element 基类缺少 `mount()` 方法定义

| 属性 | 值 |
|------|-----|
| **优先级** | P1 |
| **影响范围** | `element.ts` |
| **Amp 行为** | Amp 的 `T$` (Element) 基类有 `mount()` 方法（设置 `_mounted = true`，处理 depth 等） |
| **Flitter 现状** | `Element` 基类**无 `mount()` 方法**。仅子类（StatelessElement, StatefulElement, ProxyElement, RenderObjectElement 等）各自定义 `mount()`。框架内 12 处使用 duck-typing `(child as any).mount()` 来调用子元素的 mount |
| **已有 .gap 引用** | F09 (`09-type-safety-any-removal.md`) Solution 2 提出在 Element 基类添加 `mount(): void {}` |
| **实现状态** | ❌ 未实现 |
| **建议修复方向** | 在 `Element` 基类添加空 `mount(): void {}` 方法。所有子类已使用 `override`，不会破坏现有代码。此改动一举消除 12 处 duck-typing `as any`，是 F09 中 ROI 最高的单一改动 |

---

### Gap G6-15: `_repaintBoundary` 追踪与 RepaintBoundary Widget 的缺失

| 属性 | 值 |
|------|-----|
| **优先级** | P2 |
| **影响范围** | `render-object.ts` |
| **Amp 行为** | Amp 无 RepaintBoundary 概念 — 每次 paint 从 root 开始 |
| **Flitter 现状** | `RenderObject.isRepaintBoundary` getter 在 render-object.ts:151 存在（默认 `false`）。`_repaintBoundary` 字段存在。paint 传播中检查 `isRepaintBoundary`。但**缺少 `RepaintBoundary` Widget**（Flutter 中为一个 SingleChildRenderObjectWidget，其 RenderObject 返回 `isRepaintBoundary = true`） |
| **已有 .gap 引用** | 无（属于 RenderObject 层而非三树生命周期的典型 gap，但与此领域交叉） |
| **实现状态** | ⚠️ 基础设施就绪但缺少用户面 Widget |
| **建议修复方向** | 添加 `RepaintBoundary extends SingleChildRenderObjectWidget`，其 `createRenderObject()` 返回一个 `isRepaintBoundary = true` 的 RenderObject。这是标准 Flutter 性能优化组件 |

---

## 三、已有 .gap 文件交叉引用表

| .gap 文件 | Gap ID | 标题 | 实现状态 | 审计中对应 Gap |
|-----------|--------|------|---------|---------------|
| `01-did-change-dependencies.md` | F01 | didChangeDependencies() 生命周期 | ✅ 已实现 | G6-03 |
| `02-deactivate-lifecycle.md` | F02 | deactivate/activate 4 态生命周期 | ✅ 已实现 | G6-04 |
| `03-hot-reload-reassemble.md` | F03 | reassemble() 热重载 | ✅ 已实现 | G6-05 |
| `04-global-key-implementation.md` | F04 | GlobalKey 功能性实现 | ✅ 已实现 | G6-06 |
| `05-error-widget.md` | F05 | ErrorWidget 构建错误替换 | ✅ 已实现 | G6-07 |
| `06-proxy-widget.md` | F06 | ProxyWidget / ProxyElement 基类 | ✅ 已实现 | G6-08 |
| `07-inherited-widget-map.md` | F07 | _inheritedWidgets O(1) Map 查找 | ✅ 已实现 | G6-09 |
| `08-inherited-model.md` | F08 | InheritedModel aspect 依赖追踪 | ✅ 基础设施已实现，核心组件未迁移 | G6-10, G6-13 |
| `09-type-safety-any-removal.md` | F09 | 系统性 `any` 类型移除 | ❌ 未实现 | G6-01, G6-14 |
| `10-parent-data-widget.md` | F10 | Positioned 迁移至 ParentDataWidget | ✅ 已实现 | G6-02 |

---

## 四、未被现有 .gap 文件覆盖的新发现 Gap

| Gap ID | 标题 | 优先级 | 简述 |
|--------|------|--------|------|
| G6-11 | setState() 缺少 build 中调用防护 | P2 | Flutter 标准防护：在 build 期间调用 setState 应抛出异常 |
| G6-12 | buildScope 全量排序性能问题 | P2 | 每次 while 迭代全量 sort，应使用优先队列 |
| G6-13 | InheritedModel 未被核心组件采用 | P3 | Theme/MediaQuery/AppTheme 未迁移至 InheritedModel |
| G6-15 | 缺少 RepaintBoundary Widget | P2 | RenderObject 层 isRepaintBoundary 已就绪但缺少用户面 Widget |

---

## 五、总结

### 实现状态统计

| 类别 | 数量 |
|------|------|
| ✅ 已完整实现（含超越 Amp 的扩展） | 9（F01-F08, F10） |
| ⚠️ 基础设施就绪但未完全落地 | 2（G6-13 InheritedModel 未迁移, G6-15 RepaintBoundary Widget） |
| ❌ 未实现 | 4（G6-01 any 移除, G6-11 setState 防护, G6-12 buildScope 排序优化, G6-14 Element.mount() 基类方法） |

### 建议优先级排序

1. **P1 — 立即修复**:
   - G6-14: 为 Element 基类添加 `mount()`（消除 12 处 duck-typing）
   - G6-01: 按 F09 Phase 1 执行 `any` 类型移除（非破坏性基础）

2. **P2 — 近期修复**:
   - G6-11: setState build 期间防护
   - G6-12: buildScope 排序优化
   - G6-15: RepaintBoundary Widget

3. **P3 — 中期优化**:
   - G6-13: Theme/MediaQuery 迁移至 InheritedModel

### Amp 保真度评估

Flitter 在三树生命周期领域已**完整复刻**了 Amp 的核心行为，并在多个维度上超越了 Amp（didChangeDependencies、deactivate/activate、ErrorWidget 替换、_inheritedWidgets O(1) 查找、InheritedModel、ProxyWidget/ProxyElement）。这些扩展均匹配 Flutter 生产实现，偏差方向正确。

唯一的 Amp 保真度缺陷（Positioned 使用错误基类 — F10）已被修复。

当前的主要技术债务在于**类型安全**（F09 的 ~58 处 `any`），这不影响运行时正确性但影响代码可维护性和 IDE 体验。
