# Tasks — Chat View TUI P0+P1 对齐 Amp

> **强制流程**: 每个 Task 由 实现 subagent 完成后，必须 delegate 独立的 验证 subagent 对齐检查。
> 验收标准: amp 对齐验证通过 + `bun test` 无回归 + 类型检查通过。
> 测试: `bun test`
> 类型检查: `bunx tsc --noEmit`

---

## Wave 1: P0 性能 — Widget 缓存 + 虚拟化 (2 tasks, 顺序)

- [x] Task 1: ConversationView Widget 缓存机制 — **PASS**
  - 实现了 `_widgetCache`, `_renderItemCacheKeys`, `_streamingIndexes`
  - 缓存命中/淘汰/streaming 绕过对齐 amp
  - 验证: PASS (4 个非阻塞性差异)

- [x] Task 2: 对齐 amp 的 Column+Cache 策略 (非 ListView 虚拟化) — **PASS**
  - 验证发现 amp MessageView (f8R.build()) 不使用 ListView 虚拟化
  - amp 使用 Column + Scrollable + Widget Cache 全量构建
  - 回退了 ListView 虚拟化代码，恢复 Column 全量渲染 + Widget Cache

---

## Wave 2: P1 输入增强 (3 tasks, 并行)

- [x] Task 3: InputField 图片附件粘贴 — **PASS**
  - 实现了 extractImagePaths/extractSingleImagePath, 粘贴回调, 退格删除, 附件栏 UI
  - 验证: PASS

- [x] Task 4: InputField 动态高度 + max 40% viewport 约束 — **PARTIAL PASS**
  - 实现了 _computeTextLineCount, _buildContentRows, minLines 配置
  - ConstrainedBox maxHeight 对齐 amp 公式
  - 缺失: 超出 maxHeight 时的内部滚动 (amp RenderEditable 内置，flitter 待实现)

- [x] Task 5: Dense/Normal 模式完整切换 — **PARTIAL PASS**
  - 实现了 _isDenseViewEnabled, _denseViewItemTouched, _activityGroupTouched
  - Dense 模式下 thinking 隐藏 + activity groups 折叠 + touched 追踪
  - 缺失: deep 模式线程初始不自动启用 dense view (需在 init 时根据 agentMode 设置)

---

## Wave 3: P1 交互完善 (1 task)

- [x] Task 6: Escape 优先级链扩展 — **PARTIAL PASS**
  - 实现了 10 层 Escape 瀑布优先级链 (对齐 amp 中已有对应功能的层)
  - 实现了 Ctrl+C 双击退出确认
  - 实现了 _isConfirmingClearInput, _isConfirmingCancelProcessing, _isConfirmingExit
  - 所有确认超时对齐 amp 的 1000ms
  - 缺失: amp 中尚未在 flitter 实现的 overlay 层 (MCP modal, OAuth, IDE picker 等)

---

# Task Dependencies

- Task 2 依赖 Task 1 (虚拟化建立在缓存机制之上)
- Task 3, 4, 5 互相独立，可并行
- Task 6 独立，但建议在 Wave 2 之后执行 (需要 Image Preview 等 overlay 存在)

# Subagent 工作流

每个 Task 的执行流程:
```
1. 实现 subagent: 
   - 先读 amp 源码 (spec 中指定的文件+行号)
   - 理解 amp 的实现细节
   - 在 flitter 中严格复现
   - 添加逆向来源注释
   - 编写测试

2. 验证 subagent (独立):
   - 读 amp 逆向源码对应区域
   - 读 flitter 新写的代码
   - 逐项比对: 数据结构、状态管理、边界条件、fallback、事件流
   - 输出对齐报告 (pass/fail + 差异列表)
   
3. 如验证不通过 → 实现 subagent 修正 → 再次验证
```
