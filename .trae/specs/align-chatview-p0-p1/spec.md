# Chat View TUI P0+P1 对齐 Amp Spec

## Why

Flitter Chat View 在核心性能和交互体验上与 amp 存在 6 个关键差距：长对话全量渲染导致帧率下降（无 Widget 缓存 + 无虚拟化）、图片附件粘贴不可用、Dense 模式不完整、输入区高度不自适应、Escape 优先级链覆盖不足。这些直接影响日常使用体验。

## What Changes

- **P0-1**: ConversationView 增加 Widget 缓存机制，避免已渲染消息的重复构建
- **P0-2**: ConversationView 集成 ListView 虚拟化，只构建视口内+缓冲区的 Widget
- **P1-1**: InputField 连线图片附件粘贴 (Ctrl+V 图片 / base64 检测)
- **P1-2**: 完善 Dense/Normal 模式切换 (Alt+T 真正切换 denseView)
- **P1-3**: InputField 底部区域增加 max height 40% viewport 约束
- **P1-4**: Escape 优先级链扩展到覆盖所有 overlay/modal 层

## Impact

- Affected code:
  - `packages/cli/src/widgets/conversation-view.ts` — Widget 缓存 + ListView 集成
  - `packages/cli/src/widgets/input-field.ts` — 图片附件 + 动态高度
  - `packages/cli/src/widgets/thread-state-widget.ts` — Dense 模式 + Escape 层级
- Affected specs: 无破坏性变更

---

## 强制约束: Amp 逆向源码对齐

### 实现约束

每个实现 subagent **必须**:
1. **先读 amp 源码**：在写任何代码之前，先定位并阅读 `amp-cli-reversed/` 中对应功能的源码实现
2. **严格匹配行为**：实现逻辑、数据结构、状态管理方式必须忠实复现 amp 的设计，不允许自由发挥或"等效替代"
3. **注释标注来源**：关键实现处必须注释 `// 逆向: <amp 文件>:<行号范围> <功能描述>`

### 对齐验证约束

每个实现 subagent 完成编码后，**必须 delegate 另一个独立的验证 subagent**:
1. **验证 subagent 独立运行**：不参与实现，只做对齐审查
2. **验证内容**：
   - 读取 amp 逆向源码中对应功能的实现
   - 读取 flitter 新写的实现代码
   - 逐项比对：数据结构、状态管理、边界条件处理、fallback 策略、事件流
   - 输出对齐报告：列出每个关键行为点的 amp 实现 vs flitter 实现对比
3. **不通过则退回**：如验证 subagent 发现偏离 amp 的行为，实现 subagent 必须修正后重新验证

### Amp 源码定位指引

| 功能 | Amp 源码位置 | 关键类/函数 |
|------|-------------|-------------|
| Widget 缓存 | `chunk-006.js:31664` | `f8R._widgetCache`, `_renderItemCacheKeys`, `_streamingIndexes` |
| ListView 虚拟化 | `chunk-006.js:5640-5720` | ListView class, `itemBuilder`, `estimatedItemExtent`, `cacheExtent` |
| 图片附件粘贴 | `chunk-006.js:13249-13560` | `Td` (autocomplete field), `gE0()` base64 检测, image 附件 state |
| Dense 模式 | `chunk-006.js:34278` | `uhT._isDenseViewEnabled`, `x8R`/`n8R` 渲染委托, `denseViewItemStates` |
| 底部高度 40% | `chunk-006.js:36850-37027` | `uhT.buildBottomWidget`, `ConstrainedBox` max height 计算 |
| Escape 优先级链 | `chunk-006.js:34278` (uhT state) | `_handleEscape` 方法, 17 层优先级判断 |

---

## ADDED Requirements

### Requirement: Widget 缓存 (P0-1)

ConversationView SHALL 维护一个 `_widgetCache: Map<string, Widget>` 缓存，key 为 DisplayItem 的唯一标识 + 内容 hash。

#### Scenario: 非 streaming 消息命中缓存
- **WHEN** ConversationView rebuild 且 DisplayItem 的 cacheKey 与上次相同
- **THEN** 直接复用缓存中的 Widget 实例，不重新构建

#### Scenario: Streaming 消息不缓存
- **WHEN** DisplayItem 处于 streaming 状态 (isStreaming=true)
- **THEN** 每次 rebuild 重新构建该 item 的 Widget

#### Scenario: 缓存淘汰
- **WHEN** DisplayItem 从列表中移除
- **THEN** 对应的缓存条目被清除

---

### Requirement: 虚拟化消息列表 (P0-2)

ConversationView SHALL 使用 ListView (或等效虚拟化策略) 替代 Column 全量渲染。

#### Scenario: 长对话只渲染视口内容
- **WHEN** 对话包含 100+ 条消息且视口仅能显示 20 行
- **THEN** 只构建视口内 + cacheExtent 缓冲区内的 Widget (约 40-60 行范围)

#### Scenario: 滚动时按需构建
- **WHEN** 用户滚动使新消息进入视口
- **THEN** 按需构建进入视口的 Widget，移出视口的 Widget 被回收

#### Scenario: position="bottom" + followMode 保持兼容
- **WHEN** 虚拟化 ListView 与 position="bottom" 和 followMode 共同使用
- **THEN** 新消息到来时自动滚动到底部的行为不变

---

### Requirement: 图片附件粘贴 (P1-1)

InputField SHALL 支持从系统剪贴板粘贴图片。

#### Scenario: Ctrl+V 粘贴图片
- **WHEN** 用户按 Ctrl+V 且系统剪贴板包含图片数据
- **THEN** 读取图片、显示在输入区下方的附件栏、并在提交时随消息发送

#### Scenario: 粘贴 base64 图片文本
- **WHEN** 粘贴的文本内容匹配 base64 图片模式 (data:image/...)
- **THEN** 解析为图片附件而非纯文本插入

#### Scenario: 退格移除附件
- **WHEN** 输入框文本为空时按退格键
- **THEN** 移除最后添加的图片附件

---

### Requirement: Dense/Normal 模式完整切换 (P1-2)

系统 SHALL 提供完整的 Dense 视图模式，影响 thinking blocks 和 activity groups 的默认展开行为。

#### Scenario: Alt+T 切换 dense mode
- **WHEN** 用户按 Alt+T
- **THEN** 切换 `_isDenseViewEnabled` 状态：
  - Dense 模式：thinking blocks 默认隐藏，activity groups 默认折叠
  - Normal 模式：thinking blocks 默认显示，activity groups 默认展开

#### Scenario: Dense 模式下用户手动展开仍有效
- **WHEN** Dense 模式下用户手动点击展开某个 thinking block
- **THEN** 该 block 被标记为 "touched"，不受 dense 模式全局折叠影响

---

### Requirement: 底部输入区 max height 40% (P1-3)

InputField 所在的底部区域 SHALL 有视口高度 40% 的最大高度限制。

#### Scenario: 多行输入自适应增长
- **WHEN** 用户输入多行文本
- **THEN** 输入区高度随内容增长，直至达到 `max(floor(viewportHeight * 0.4), 12)` 上限

#### Scenario: 超出上限滚动
- **WHEN** 输入内容超过最大高度限制
- **THEN** 输入区内部可滚动，高度不再增长

---

### Requirement: Escape 优先级链扩展 (P1-4)

ThreadStateWidget 的 Escape 处理 SHALL 覆盖所有 overlay/modal 层级。

#### Scenario: 完整优先级链
- **WHEN** 用户按 Escape
- **THEN** 按以下优先级处理 (高→低):
  1. 关闭 Command Palette
  2. 关闭 MCP Trust Dialog
  3. 关闭 Error Dialog
  4. 关闭 Image Preview Modal
  5. 关闭 Context Window Overlay
  6. 关闭 Shortcuts Help
  7. 退出消息选择模式
  8. 关闭 Toast
  9. 取消 Approval 流程
  10. 清除文本选择 (SelectionArea)
  11. 确认取消 streaming/inference
  12. 清除输入文本 (二次确认)

#### Scenario: 逐层消费
- **WHEN** 某层的 Escape 条件不满足
- **THEN** 事件传递到下一层
