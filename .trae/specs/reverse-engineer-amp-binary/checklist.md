# Checklist

## 文档完整性
- [x] AMP-BINARY-REVERSE-ANALYSIS.md 存在且内容完整
- [x] 文档包含全部 7 个分析维度的独立章节

## 维度 1: TUI Rendering Core
- [x] 包含 Widget 原语混淆名映射表（NR/B0/wR/xT/T0/xR/Ta/ca/SR/uR/j0/XT/N0/I3/Q3/o0 等）
- [x] 包含 PaintContext cell-level API 说明
- [x] 包含 LeafRenderObject 自定义渲染示例（d8R = 粒子系统, N8R = 水平分隔线）

## 维度 2: Data Flow
- [x] 包含 User Input → LLM → UI 的正向数据流图
- [x] 包含 ThreadService 的 cache/upload/version 管理说明
- [x] 包含 Observable 管线操作符说明（AR, f0, Y3, JR, da, E9, L9）

## 维度 3: State Management
- [x] 包含 InheritedWidget 枚举表
- [x] 包含 Controller 模式枚举表
- [x] 包含 dependencies DI 接口枚举表

## 维度 4: Overall Architecture
- [x] 包含四层架构图（ASCII art）
- [x] 包含每层的核心组件及其职责说明

## 维度 5: Different Modes
- [x] 包含 Agent Modes 表格（smart/code/deep/ask + fast variants）
- [x] 包含 UI Modes 互斥关系说明
- [x] 包含 Modal Modes 完整枚举（15+ overlays）

## 维度 6: Chat View Widgets
- [x] 包含 AppState.build() 完整 Widget 树（ASCII tree）
- [x] 包含 buildBottomWidget() / YrT 完整结构
- [x] 包含快捷键列表（ZgT 数组内容）

## 维度 7: Subagent Invocation
- [x] 包含 SubagentRunner (wi) 的 inference loop 说明
- [x] 包含 Handoff 机制（DTW + Legacy）说明
- [x] 包含 TaskTool / OracleTool / PainterTool 差异表
- [x] 包含 Skill 注入管线说明

## 附录
- [x] 附录 A: 完整混淆名全局映射表
- [x] 附录 B: 快捷键完整列表
