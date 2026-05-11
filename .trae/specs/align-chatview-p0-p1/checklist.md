# Checklist — Chat View TUI P0+P1 对齐 Amp

## P0: 性能

- [x] ConversationView 有 `_widgetCache` Map，严格对齐 amp `f8R._widgetCache` 的数据结构
- [x] `_renderItemCacheKeys` 对齐 amp 的 index→cacheKey 映射
- [x] `_streamingIndexes` 对齐 amp 的 streaming 标记机制
- [x] rebuild 时非 streaming item 命中缓存不重建 Widget
- [x] 缓存条目在对应 item 移除后被清理，无内存泄漏
- [x] **Widget 缓存对齐验证 subagent 输出 PASS**
- [x] ConversationView 使用 Column+Cache 策略 (amp 不使用 ListView 虚拟化)
- [N/A] cacheExtent 和 estimatedItemExtent (amp 不使用 ListView)
- [N/A] position="bottom" + followMode 在虚拟化后 (amp 不使用 ListView)
- [N/A] Scrollbar 与虚拟化 ListView 联动 (amp 不使用 ListView)
- [x] **Column+Cache 策略对齐验证 subagent 输出 PASS**

## P1: 图片附件

- [x] `_imageAttachments` 数据结构对齐 amp `Td` 的附件 state
- [x] `extractImagePaths()` / `extractSingleImagePath()` 检测逻辑对齐 amp `gE0()`/`IE0()` 实现
- [x] 粘贴事件处理优先级对齐 amp (先图片后文本)
- [x] 附件栏 UI 渲染对齐 amp 的视觉布局
- [x] 退格移除附件的条件判断对齐 amp
- [x] 提交消息时 imageAttachments 被传递给 onSubmit 回调
- [x] **图片附件对齐验证 subagent 输出 PASS**

## P1: Dense 模式

- [x] `_isDenseViewEnabled` 状态管理对齐 amp `uhT`
- [x] Alt+T toggle 逻辑对齐 amp 的 `Ut.instance` 联动
- [x] Dense 模式下 thinking blocks 默认不渲染 (除非 touched)
- [x] Dense 模式下 activity groups 默认折叠 (除非 touched)
- [x] `_denseViewItemTouched` Set 对齐 amp 的 per-item touched 追踪
- [x] **Dense 模式对齐验证 subagent 输出 PARTIAL PASS** (缺: deep 初始值)

## P1: 动态高度

- [x] InputField 高度随内容行数增长，配置对齐 amp TextField (minLines/dynamic rows)
- [x] 底部区域有 `max(floor(viewportHeight * 0.4), 12)` 最大高度约束，公式对齐 amp
- [ ] 超过最大高度时输入区内部可滚动 (amp RenderEditable 内置，flitter 待实现)
- [x] **动态高度对齐验证 subagent 输出 PARTIAL PASS** (缺: 内部滚动)

## P1: Escape 层级

- [x] Escape 优先级链对齐 amp 已实现功能的层 (10 层 / amp 有 28 层)
- [x] 每层的条件判断和副作用对齐 amp 的 waterfall 语义
- [x] 二次确认逻辑 (clear input, cancel processing) 对齐 amp 的 1000ms timeout
- [x] Ctrl+C → onExitPressed 双击退出对齐 amp
- [x] **Escape 层级对齐验证 subagent 输出 PARTIAL PASS** (缺: 未实现的 overlay 层)

## 回归

- [x] `bun test` 全量通过无回归 (7635 tests, 0 fail)
- [x] `bunx tsc --noEmit` 类型检查通过 (仅 1 个预存无关错误)
- [x] 所有新增代码包含 `// 逆向: <文件>:<行号>` 注释
