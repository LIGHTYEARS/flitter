# Tasks — Flitter vs AMP 对齐修复路线图

> 本文件基于 2026-04-02 审计结论，按 **优先级分层** + **依赖关系** 排列。
> 标记规则: `[x]` = 已完成 (本审计确认), `[ ]` = 待实施

---

## Tier 0: P0 阻断项 (Agent 崩溃不可恢复)

- [x] Task T0-1: RenderFlex 溢出检测 (GAP-SUM-004) — `_hasOverflow` + 检测 + 诊断
- [x] Task T0-2: RenderFlex Infinity 弹性安全 (GAP-SUM-005) — `canFlex = Number.isFinite`
- [x] Task T0-3: TextField Ctrl+A Emacs 行首 (GAP-SUM-006)
- [x] Task T0-4: TextField Ctrl+X 剪切 (GAP-SUM-007)
- [x] Task T0-5: Markdown styleOverrides (GAP-SUM-008)
- [x] Task T0-6: WaveSpinner + StatusBar 集成 (GAP-SUM-009)
- [x] Task T0-7: ShortcutRegistry 优先级/冲突 (GAP-SUM-010)
- [ ] Task T0-8: ACP 重连运行时集成 (GAP-SUM-001)
  - [ ] SubTask T0-8.1: `index.ts` 中 import ReconnectionManager/HeartbeatMonitor/ActivityTracker
  - [ ] SubTask T0-8.2: `onExit` 回调中调用 `shouldAutoReconnect` 决策并启动重连
  - [ ] SubTask T0-8.3: HeartbeatMonitor 在连接建立时启动
- [ ] Task T0-9: LiveHandle 热替换集成 (GAP-SUM-002)
  - [ ] SubTask T0-9.1: `index.ts` 中 `handleSubmit`/`handleCancel` 改为通过 `liveHandle.current` 间接访问
  - [ ] SubTask T0-9.2: 重连成功后调用 `liveHandle.replace(newHandle)`
- [ ] Task T0-10: Renderer 光标跳跃优化 (GAP-SUM-003)
  - [ ] SubTask T0-10.1: 确认 `_currentCol`/`_currentRow` 追踪逻辑完整性
  - [ ] SubTask T0-10.2: 确认 renderer-cursor-opt.test.ts 全部 PASS

## Tier 1: P1 用户直接可感知差异

### Tier 1A: 渲染管线 + 输入系统

- [ ] Task T1-1: present() 冗余 back buffer 清除 (GAP-SUM-013)
  - [ ] 移除 `present()` 中的 `backBuffer.clear()`
- [ ] Task T1-2: 控制字符过滤 (GAP-SUM-014)
  - [ ] Renderer 中添加 `isControlChar()` 过滤
- [ ] Task T1-3: Kitty CSI u 格式解析 (GAP-SUM-012)
  - [ ] `_resolveCSI()` 增加 CSI u 终止符分支
- [ ] Task T1-4: RepaintBoundary Phase 2/3 (GAP-SUM-016)
  - [ ] 选择性区域清除取代全屏 clear
  - [ ] dirty region diff 取代全量扫描

### Tier 1B: 文本/Markdown

- [ ] Task T1-5: GFM 表格列对齐 (GAP-SUM-025)
  - [ ] 解析 `:---`/`:---:`/`---:` 标记
  - [ ] 对应使用 padEnd/center/padStart
- [ ] Task T1-6: 代码块 fallback 背景色移除 (GAP-SUM-024)
  - [ ] 移除 fallback 路径中的 `background: bgColor`
- [ ] Task T1-7: 语法高亮 RGB 主题桥接验证 (GAP-SUM-026)

### Tier 1C: ACP 状态管理 + 连接

- [ ] Task T1-8: `as unknown as` 类型强转清理 (GAP-SUM-035)
  - [ ] 用运行时类型守卫替代双重强转
- [ ] Task T1-9: 重连后会话分隔标识 (GAP-SUM-036)
  - [ ] 依赖 T0-8 重连集成
  - [ ] 重连成功时插入 SystemMessage 分隔
- [ ] Task T1-10: 健康状态 UI 指示 (GAP-SUM-037)
  - [ ] StatusBar/BottomGrid 读取并渲染 healthStatus
- [ ] Task T1-11: FilePicker 接入 Overlay (GAP-SUM-031)
  - [ ] 转为 StatefulWidget + fuzzy-match + 文件遍历 + OverlayManager 接入

### Tier 1D: 视觉还原

- [ ] Task T1-12: Perlin 噪声动态模式颜色脉冲 (GAP-SUM-033)
- [ ] Task T1-13: Copy Highlight 自动消失 (GAP-SUM-034)
  - [ ] `setTimeout(300, () => clearSelection())`
- [ ] Task T1-14: RenderPadding/DecoratedBox 改用 deflate() (GAP-SUM-020)
- [x] Task T1-15: Focus Trap (GAP-SUM-011) — 已修复
- [x] Task T1-16: Hyperlink OSC 8 id (GAP-SUM-015) — 已修复
- [x] Task T1-17: BoxConstraints API (GAP-SUM-017/018/019) — 已修复
- [x] Task T1-18: TextField Emacs 键绑定 (GAP-SUM-028/029/030) — 已修复
- [x] Task T1-19: SelectionList 自动滚动 (GAP-SUM-022) — 已修复
- [x] Task T1-20: ScrollController ensureVisible (GAP-SUM-023) — 已修复
- [x] Task T1-21: AmpAppColors 语义色 (GAP-SUM-032) — 已修复
- [x] Task T1-22: ThinkingBlock chevron + BrailleSpinner (GAP-SUM-039) — 已修复
- [x] Task T1-23: UserMessage interrupted (GAP-SUM-040) — 已修复

### Tier 1E: 新发现 P1

- [ ] Task T1-24: Tab/Shift+Tab 用户消息导航 (NEW-001)
  - [ ] App 层 onKey 添加 Tab/Shift+Tab 处理
  - [ ] AppState 维护 selectedMessageIndex
  - [ ] ChatView 渲染选中消息差异化样式
- [ ] Task T1-25: 选中消息 e 编辑 / r 恢复删除 (NEW-002)
  - [ ] 选中状态下 `e` 将消息内容回填到 InputArea
  - [ ] 选中状态下 `r` 删除该消息后的所有对话项
- [ ] Task T1-26: CommandPalette 完整命令集 (NEW-006)
  - [ ] 扩展命令列表: New thread, Switch model, Copy last response, Toggle dense view, Open thread list, View usage, Show shortcuts help
- [ ] Task T1-27: Token 使用量 + 成本 + 耗时显示 (NEW-008)
  - [ ] BottomGrid top-left 区域实现 `X% of Yk / $0.XX / 1m 23s` 格式
  - [ ] 阈值着色: <50% 蓝, 50-80% 黄, >80% 红

### Tier 1F: 动画框架迁移 (GAP-SUM-038)

- [ ] Task T1-28: ScrollController.animateTo 迁移到 AnimationController
- [ ] Task T1-29: BrailleSpinner/WaveSpinner 迁移到 Ticker-based 驱动

## Tier 2: P2 质量提升

### Tier 2A: `any` 类型 + 框架清理

- [ ] Task T2-1: 系统性 `any` 移除 (~58 处) (GAP-SUM-027)
- [ ] Task T2-2: setState() build 中调用防护 (GAP-SUM-069)
- [ ] Task T2-3: BuildOwner.buildScope() 优先队列替代全量排序 (GAP-SUM-070)
- [ ] Task T2-4: InheritedModel 迁移到核心组件 (GAP-SUM-071)

### Tier 2B: 渲染管线优化

- [ ] Task T2-5: Buffer.resize() 冗余拷贝 (GAP-SUM-042)
- [ ] Task T2-6: getDiff() EMPTY_CELL 优化 (GAP-SUM-044)
- [ ] Task T2-7: CellLayer blit 裁剪防御 (GAP-SUM-045)
- [ ] Task T2-8: BoxConstraints tightForFinite/flipped 等便利方法 (GAP-SUM-048)

### Tier 2C: 输入系统

- [ ] Task T2-9: OSC/DCS 输入响应处理 (GAP-SUM-055)
- [ ] Task T2-10: In-Band Resize 解析 (GAP-SUM-056)
- [ ] Task T2-11: MouseManager/EventDispatcher require() 清理 (GAP-SUM-054)
- [ ] Task T2-12: 遗留 hit-test 自由函数删除 (GAP-SUM-053)

### Tier 2D: TextField/InputArea

- [ ] Task T2-13: InputArea 自动增高 (GAP-SUM-073)
- [ ] Task T2-14: InputArea 拖拽调整高度 (GAP-SUM-074)
- [ ] Task T2-15: TextField 选区颜色对接主题 (GAP-SUM-075)
- [ ] Task T2-16: TextField 光标 blink (GAP-SUM-076)

### Tier 2E: 视觉还原

- [ ] Task T2-17: ThinkingBlock 内容 Markdown 渲染 (GAP-SUM-081)
- [ ] Task T2-18: ToolHeader 更多状态 (cancelled/queued/blocked) (GAP-SUM-083)
- [ ] Task T2-19: StatusBar 上下文窗口警告 + 12 种状态消息 (GAP-SUM-086 + NEW-019)
- [ ] Task T2-20: UserMessage 图片附件/guidanceFiles (GAP-SUM-087)
- [ ] Task T2-21: Scanning Bar 扫描动画 (GAP-SUM-088)
- [ ] Task T2-22: Rainbow 彩蛋 "You're absolutely right" (GAP-SUM-068)
- [ ] Task T2-23: SelectedUserMessage 差异化渲染 (GAP-SUM-093)
- [ ] Task T2-24: apply_patch DiffCard 统计头部 (GAP-SUM-094)
- [ ] Task T2-25: ThinkingBlock "Thinking" 标签颜色对齐 (GAP-SUM-080)
- [ ] Task T2-26: ToolHeader normalizedInput (GAP-SUM-084)
- [ ] Task T2-27: ExpandCollapse 独立可点击组件 (GAP-SUM-085)
- [ ] Task T2-28: tableBorder alpha 支持 (GAP-SUM-090)

### Tier 2F: ACP 协议 + 持久化

- [ ] Task T2-29: SessionStore 原子写入保护 (GAP-SUM-091)
- [ ] Task T2-30: PromptHistory 极端输入边界 (GAP-SUM-092)
- [ ] Task T2-31: ACP 类型安全 capabilities/overlay (GAP-SUM-077)
- [ ] Task T2-32: connectToAgentWithResume fallback UI 通知 (GAP-SUM-078)
- [ ] Task T2-33: Agent 退出后闭包持有死连接 (GAP-SUM-079)

### Tier 2G: 滚动 + 虚拟化

- [ ] Task T2-34: Scrollbar hover 视觉反馈 (GAP-SUM-062)
- [ ] Task T2-35: SelectionList 滚动条 (GAP-SUM-063)
- [ ] Task T2-36: animateTo 缓动曲线 (GAP-SUM-059)
- [ ] Task T2-37: ListView.builder 虚拟化 (GAP-SUM-061)

### Tier 2H: 其他

- [ ] Task T2-38: RenderText 超链接传递 Cell (GAP-SUM-064)
- [ ] Task T2-39: _emojiWidthSupported 死代码清理 (GAP-SUM-065)
- [ ] Task T2-40: RenderTable intrinsic 硬编码 1000 (GAP-SUM-051)
- [ ] Task T2-41: FlexParentData toString() (GAP-SUM-052)
- [ ] Task T2-42: RenderDecoratedBox borderRight/Bottom getter (GAP-SUM-050)
- [ ] Task T2-43: Skill 浏览器 / Dialog buttons (GAP-SUM-096)
- [ ] Task T2-44: 鼠标滚轮步长可配置 (GAP-SUM-058)

### Tier 2I: 新发现 P2

- [ ] Task T2-45: Ctrl+S 模式切换 (NEW-003)
- [ ] Task T2-46: Alt+D 深度推理切换 (NEW-004)
- [ ] Task T2-47: Dense View 密集视图模式 (NEW-005)
- [ ] Task T2-48: 线程管理 UI (NEW-007)
- [ ] Task T2-49: 欢迎屏 30+ 分类建议/名言 (NEW-011)
- [ ] Task T2-50: Mystery Sequence 彩蛋 (NEW-012)
- [ ] Task T2-51: Text Morph 动画 (NEW-013)
- [ ] Task T2-52: Prompt History UI Overlay (NEW-014)
- [ ] Task T2-53: @@ 双 at / @: commit 模式 (NEW-015)
- [ ] Task T2-54: 图片粘贴检测 (NEW-016)
- [ ] Task T2-55: 模态全屏背景遮罩 (NEW-017)
- [ ] Task T2-56: 焦点恢复栈 (NEW-018)
- [ ] Task T2-57: Auto-Compacting 通知 (NEW-020)
- [ ] Task T2-58: Debug Inspector HTTP (NEW-021)
- [ ] Task T2-59: 终端能力查询完整解析 (NEW-022)
- [ ] Task T2-60: Emoji 宽度模式 2027 (NEW-023)
- [ ] Task T2-61: 终端进度条 OSC 9;4 (NEW-024)

---

# Task Dependencies

- T0-9 依赖 T0-8 (LiveHandle 替换需要重连先集成)
- T1-9 依赖 T0-8 (会话分隔需要重连先集成)
- T1-10 依赖 T0-8 (健康状态依赖心跳监控)
- T1-25 依赖 T1-24 (编辑/恢复依赖消息选中导航)
- T2-5~T2-8 可并行
- T2-9~T2-12 可并行
- T2-13~T2-16 可并行
- T2-17~T2-28 可并行
- T2-45~T2-61 可并行

# 推荐执行顺序

1. **Sprint 1 (P0 收尾)**: T0-8, T0-9, T0-10 — 完成 ACP 重连集成和 Renderer 优化
2. **Sprint 2 (P1 渲染/输入)**: T1-1~T1-4 — 渲染管线和输入协议
3. **Sprint 3 (P1 文本/ACP)**: T1-5~T1-11 — 文本渲染和 ACP 状态
4. **Sprint 4 (P1 新功能)**: T1-24~T1-27 — 消息导航/编辑, CommandPalette, Token 显示
5. **Sprint 5 (P1 视觉/动画)**: T1-12~T1-14, T1-28~T1-29 — 视觉还原和动画迁移
6. **Sprint 6+ (P2)**: 按 Tier 2A~2I 分组并行推进
