---
phase: 13
phase_name: tui-launch-blocker-fix
completed_at: 2026-04-15
status: completed
---

# Phase 13 执行总结

## 概述

本阶段修复了 TUI 启动阻塞器的三个关键问题，这些问题导致 CLI 在交互模式下无法正常运行。

## 修复内容

### 1. TuiController.getSize() - 4 层终端尺寸防御

**问题**: `getSize()` 在 Bun 环境中返回 `Infinity`，因为 `process.stdout.columns` 和 `process.stdout.rows` 可能返回 `Infinity` 而不是 `undefined`，导致 `??` 操作符不会触发默认值。

**修复**:
- 添加了 `isTtyStream()` 辅助函数，检查流是否为真实 TTY 流
- 添加了 `terminalSize` 缓存字段，存储最后一次有效尺寸
- 添加了 `getStreamSize()` 方法，实现 4 层防御：
  - Layer 1: `_refreshSize()` 强制刷新终端尺寸
  - Layer 2: `isTTY && columns && rows` 真值检查 + `Number.isFinite` 检查
  - Layer 3: `getWindowSize()` 备选
  - Layer 4: 返回 `null`（调用方使用缓存）
- 添加了 `updateTerminalSize()` 方法，更新缓存的终端尺寸
- 修改了 `getSize()` 返回缓存值的副本
- 修改了 `init()` 和 `handleResize()` 调用 `updateTerminalSize()`

### 2. TuiController.cleanup()/handleSuspend() - 同步清理

**问题**: `cleanup()` 和 `handleSuspend()` 调用异步的 `deinit()` 方法，但它们被信号处理器（SIGINT, SIGTERM, exit）调用。在信号处理上下文中不能 `await` 异步函数，这会导致终端状态没有被正确恢复（光标隐藏、备用屏幕未退出等）。

**修复**:
- 添加了 `suspended` 状态字段，跟踪是否处于暂停状态
- 添加了 `boundHandleResume` 绑定引用，用于移除监听器
- 添加了 `restoreTerminalSync()` 同步方法，直接写入 ANSI 序列恢复终端状态
- 重写了 `cleanup()` 为同步方法：
  - 调用 `restoreTerminalSync()` 恢复终端状态
  - 同步释放 tty 输入/输出
  - 移除所有信号监听器
  - 清除计时器
- 重写了 `handleSuspend()` 使用同步模式：
  - 调用 `restoreTerminalSync()` 恢复终端状态
  - 暂停 tty 输入
  - 设置 `suspended = true`
  - 发送 SIGTSTP 信号
- 添加了 `handleResume()` 方法，处理 SIGCONT 信号：
  - 恢复 tty 输入
  - 重置解析器状态
  - 重新进入备用屏幕
  - 重新启用鼠标追踪和 bracketed paste
  - 标记屏幕需要全量刷新
  - 设置 `suspended = false`
- 更新了 `setupCleanupHandlers()` 注册更多信号：
  - `exit` 信号（进程退出时）
  - `SIGCONT` 信号（进程恢复时）
- 更新了 `deinit()` 方法：
  - 调用 `restoreTerminalSync()` 恢复终端状态
  - 移除 `exit` 和 `SIGCONT` 监听器

### 3. RenderObject.hitTest() - allowHitTestOutsideBounds 支持

**问题**: `hitTest()` 方法缺少 `allowHitTestOutsideBounds` 分支，导致 Overlay/Dropdown 等渲染在父节点裁剪区域外的组件无法正确处理命中测试。

**修复**:
- 添加了 `allowHitTestOutsideBounds` 属性（默认 `false`）
- 在 `hitTest()` 方法中添加了缺失的分支：
  - 当点在本节点边界外但 `allowHitTestOutsideBounds` 为 `true` 时
  - 逆序递归子节点
  - 如果任何子节点命中，返回 `true`

### 4. 辅助修改

**InputParser.reset()**:
- 添加了 `reset()` 方法，用于终端恢复后清除可能的部分解析状态
- 刷新 VtParser 的打印缓冲区
- 重置粘贴模式和粘贴缓冲区

**Screen.needsFullRefresh**:
- 修复了 `handleResume()` 中的 `screen.markForRefresh?.()` 调用
- 改为 `screen.needsFullRefresh = true`，这是 Screen 类已有的属性

## 修改的文件

| 文件 | 修改内容 |
|------|----------|
| `packages/tui/src/tui/tui-controller.ts` | 4 层尺寸防御、同步清理、暂停/恢复处理 |
| `packages/tui/src/vt/input-parser.ts` | 添加 `reset()` 方法 |
| `packages/tui/src/tree/render-object.ts` | 添加 `allowHitTestOutsideBounds` 支持 |

## 验证

### 类型检查

类型检查显示我修改的文件没有类型错误。项目中存在的其他类型错误是已有的问题，与本阶段修复无关。

### 关键修复验证

1. **getSize() 4 层防御**:
   - `isTtyStream()` 检查流是否为真实 TTY
   - `getStreamSize()` 实现 4 层防御，拒绝 `Infinity` 值
   - `updateTerminalSize()` 更新缓存
   - `getSize()` 返回缓存值的副本

2. **同步清理**:
   - `restoreTerminalSync()` 直接写入 ANSI 序列
   - `cleanup()` 是同步方法，可被信号处理器调用
   - `handleSuspend()` 使用同步模式
   - `handleResume()` 处理 SIGCONT 信号

3. **allowHitTestOutsideBounds**:
   - `RenderObject.allowHitTestOutsideBounds` 属性（默认 `false`）
   - `hitTest()` 方法中的缺失分支已添加

## 下一步

本阶段修复了 TUI 启动阻塞器的三个关键问题。下一步应该验证这些修复是否解决了 CLI 交互模式启动后立即退出的问题。

## 注意事项

1. 类型检查中存在的其他错误是项目中已有的问题，与本阶段修复无关。
2. 本阶段的修复是基于逆向分析的 amp 代码实现的，保持了与原版的一致性。
3. `allowHitTestOutsideBounds` 默认值为 `false`，与现有行为完全兼容。
