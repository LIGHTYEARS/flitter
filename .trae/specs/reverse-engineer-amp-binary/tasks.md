# Tasks

- [x] Task 1: 提取并整理 TUI Rendering Core 原语的完整混淆名映射
  - [x] SubTask 1.1: 从二进制中提取所有 Widget/Element/RenderObject 相关类的混淆名
  - [x] SubTask 1.2: 提取 paint/layout/hit-test 管线的方法签名
  - [x] SubTask 1.3: 整理成「混淆名 → 推断真实名 → 用途说明」的三列表

- [x] Task 2: 提取并绘制完整的 Data Flow 管线
  - [x] SubTask 2.1: 追踪 User Input → submitPrompt → Thread mutation 的完整调用链
  - [x] SubTask 2.2: 追踪 LLM Response → streaming → Widget rebuild 的反向数据流
  - [x] SubTask 2.3: 追踪 ThreadService 的 cache/upload/dirty-tracking 机制
  - [x] SubTask 2.4: 追踪 Tool execution Observable 管线（AR → Y3 → JR → ...）

- [x] Task 3: 提取并文档化 State Management 的完整模式
  - [x] SubTask 3.1: 枚举所有 InheritedWidget（Z0, $R, I9, IW, vb, VH, bW, cb 等）
  - [x] SubTask 3.2: 枚举所有 Controller 模式实例
  - [x] SubTask 3.3: 枚举所有 `this.widget.dependencies.*` 的 service 接口
  - [x] SubTask 3.4: 分析 BehaviorSubject/Observable 的使用场景

- [x] Task 4: 整理 Overall Architecture 的四层结构
  - [x] SubTask 4.1: CLI Entry 层（命令解析、auth、config）
  - [x] SubTask 4.2: Services 层（ThreadService, SkillService, MCPService, ToolService）
  - [x] SubTask 4.3: Widget 层（AppState 及其子组件图谱）
  - [x] SubTask 4.4: TUI Framework 层（三树、渲染管线、输入系统）

- [x] Task 5: 枚举并分类所有 Mode 系统
  - [x] SubTask 5.1: Agent Modes（smart/code/deep/ask）的切换逻辑和 UI 表现
  - [x] SubTask 5.2: UI Modes（shell/handoff/queue/selection/DTW/actors）的互斥关系
  - [x] SubTask 5.3: Modal Modes（15+ overlays）的叠加规则
  - [x] SubTask 5.4: 提取 agentModeController 的可见模式管理逻辑

- [x] Task 6: 提取 Chat View Widget 树的完整结构
  - [x] SubTask 6.1: AppState.build() 的完整返回树（含条件分支）
  - [x] SubTask 6.2: buildBottomWidget() 的 YrT(BottomGrid) 完整结构
  - [x] SubTask 6.3: 每个 Modal overlay widget 的 props 接口
  - [x] SubTask 6.4: ToolCallWidget 的 35+ 工具类型分发 switch-case

- [x] Task 7: 提取 Subagent Invocation 的完整调用链
  - [x] SubTask 7.1: SubagentRunner (wi) 的 inference loop 完整流程
  - [x] SubTask 7.2: Handoff 机制的 DTW vs Legacy 两条路径
  - [x] SubTask 7.3: TaskTool/OracleTool/PainterTool 的配置差异
  - [x] SubTask 7.4: Skill 加载和注入系统的完整管线

- [x] Task 8: 汇总产出综合文档 AMP-BINARY-REVERSE-ANALYSIS.md
  - [x] SubTask 8.1: 将 Task 1-7 的成果汇总为单一 markdown 文档
  - [x] SubTask 8.2: 添加完整的混淆名全局映射表（附录 A）
  - [x] SubTask 8.3: 添加快捷键完整列表（附录 B）
  - [x] SubTask 8.4: 保存到 packages/flitter-amp/.ref/amp-cli/AMP-BINARY-REVERSE-ANALYSIS.md

# Task Dependencies
- Task 1-7 可完全并行（各维度独立分析）
- Task 8 依赖 Task 1-7（汇总需要所有维度完成）
