# 对齐所有部分完成 & 未实现能力 Spec

## Why
Gap 审计汇总发现 10 个 P0、30 个 P1、39 个 P2 gap。其中约 20 个 `.gap/` 处于 ⚠️ 部分完成或 ❌ 未实现状态。当前策略：**TDD 驱动、guardrails first、scaffold first** — 先写失败测试定义期望行为，再最小化实现通过测试。按「基础设施 → 核心引擎 → 应用层」分层推进。

## What Changes
- **Phase 1 — Guardrails**: 为所有 P0 + 关键 P1 能力编写 failing test scaffolds
- **Phase 2 — Core Engine Scaffold**: 补全 flitter-core 缺失的基础设施（BoxConstraints API / Flex 安全检查 / Renderer 优化 / 控制字符过滤）
- **Phase 3 — Input & Focus**: 键盘编辑快捷键 + Focus Trap + Shortcut Registry scaffold
- **Phase 4 — ACP Runtime Integration**: 接入 ReconnectionManager / HeartbeatMonitor / LiveHandle
- **Phase 5 — Visual Components**: WaveSpinner / ThinkingBlock 增强 / Markdown StyleScheme / StatusBar 状态
- **Phase 6 — Polish**: P1 剩余项（Hyperlink id / 表格列对齐 / 代码块背景 / ensureVisible 等）

## Impact
- Affected code: `packages/flitter-core/src/**`, `packages/flitter-amp/src/**`
- Affected tests: 新增 ~100+ 测试用例
- Affected gaps: `.gap/` 中所有 ⚠️ 和 ❌ 状态项

## ADDED Requirements

### Requirement: P0 能力全部实现
系统 SHALL 实现所有 10 个 P0 gap 的能力。

#### Scenario: RenderFlex 溢出检测
- **WHEN** 非弹性子项总尺寸超过父约束
- **THEN** `_hasOverflow` 为 true + debug 模式输出警告

#### Scenario: RenderFlex Infinity 安全
- **WHEN** 主轴约束为 Infinity 且存在弹性子项
- **THEN** 弹性子项被跳过（freeSpace = 0），不会产生 Infinity 尺寸

#### Scenario: TextField Emacs 键绑定
- **WHEN** 用户按 Ctrl+A / Ctrl+E / Ctrl+X / Ctrl+W / Alt+B / Alt+F
- **THEN** 分别执行 行首 / 行尾 / 剪切 / 删除前词 / 前词 / 后词

#### Scenario: Markdown StyleScheme 覆盖
- **WHEN** Markdown 组件传入 `styleOverrides`
- **THEN** ThinkingBlock 渲染使用 dim+italic 样式

#### Scenario: ACP 重连集成
- **WHEN** Agent 进程崩溃
- **THEN** ReconnectionManager 启动重连 + HeartbeatMonitor 恢复 + LiveHandle 热替换

#### Scenario: Renderer 光标优化
- **WHEN** 连续两个 cell 位于同一行且相邻列
- **THEN** 不输出 CUP 移动序列

## MODIFIED Requirements

### Requirement: BoxConstraints API 补全
- 新增 `normalize()`, `tighten()`, `isNormalized` 修正, `constrainWidth/Height`

### Requirement: Shortcut 系统
- 新增 ShortcutRegistry scaffold（注册 / 优先级 / 冲突检测的基础接口）
