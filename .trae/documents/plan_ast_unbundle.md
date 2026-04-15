# AST-Based 模块拆分方案 (AST-Based Module Splitting Plan)

## Summary (目标与摘要)
当前 `amp-cli-reversed` 目录中已生成 6 个大型的 Chunk 文件（包含 8500+ 个被 Bun 展平的顶层 AST 节点）。由于变量名被混淆（Mangled）且文件依然过大，不利于 IDE 检索与代码映射。
本计划旨在利用 `@babel/traverse` 对 AST 进行深入的依赖与特征分析，将这 6 个大文件进一步拆分为数百个具备高内聚性的小型逻辑模块（Module），并尽可能恢复其有意义的命名（如 `ThreadWorker`, `TuiController`）。

## Current State Analysis (当前状态分析)
- **代码结构**：Bun 将所有 ESM 模块和闭包展开到了顶层作用域，导致原始的模块边界完全丢失。
- **命名混淆**：原始的类名和函数名被压缩为 1-3 个字符（如 `class ov`, `class azT`）。
- **潜在特征**：
  - 类或对象内部通常保留了未混淆的字符串（如 `name: "ThreadService"`, `name: "ThreadWorker.runInference"`）。
  - 函数或变量调用具备空间局部性（相邻的变量通常属于同一个原始模块）。
  - 存在针对特定第三方库特有的调用特征（如 React/TUI 的 Widget 树结构）。

## Proposed Changes (具体执行步骤)

### 1. AST 依赖与特征提取 (Feature & Dep Extraction)
- **构建标识符图谱**：遍历所有 Chunk，记录每个顶层节点（Node）**定义了哪些变量**（Defines）以及**引用了哪些变量**（References）。
- **特征命名嗅探**：
  - 在类或对象定义中寻找 `name: "X"` 或 `type: "X"` 的属性。
  - 提取代码中的日志字符串（如 `J.debug("ThreadWorker inference stream error")`）。
  - 利用这些特征为对应的混淆类/函数（如 `ov`）赋予人类可读的猜测名称（Guessed Name）。

### 2. 逻辑聚类与切分 (Logical Clustering)
- **连通图切分**：将相互依赖程度高的连续顶层节点（如一个类和它上方的辅助变量、常量）划分为同一个“模块切片（Module Slice）”。
- **启发式分割边界**：
  - 每个大型 `ClassDeclaration` 或 `FunctionDeclaration` 作为核心锚点（Anchor）。
  - 锚点及其专属依赖（无其他节点引用的变量）打包为单个独立模块。

### 3. 文件生成与映射 (Code Generation)
- 创建 `amp-cli-reversed/modules/` 目录。
- 将切分好的每个模块切片使用 `@babel/generator` 重新生成代码。
- **文件命名规范**：
  - 若嗅探到有意义的名称，命名为 `[GuessedName]_[MangledName].js`（如 `ThreadWorker_ov.js`）。
  - 若无明显名称，命名为 `module_[Index]_[MangledName].js`。
- 生成一份 `_module-map.json`，记录每个模块包含的混淆变量名，方便全局搜索。

## Assumptions & Decisions (假设与决策)
- **决策 1**：放弃生成严格可运行的互相 `import/export` 的代码。由于这是逆向参考代码，强行重构 `import` 路径容易因为循环依赖导致语法错误。模块内的变量仍保持原样，仅在物理文件上做隔离。
- **决策 2**：切分粒度以“类/大函数 + 其强相关上下文”为基准，预计将生成 300-500 个小文件。
- **假设**：通过日志和内部属性名（StringLiteral）能够还原 40% 以上核心模块的真实名称，大幅提升检索效率。

## Verification (验证步骤)
1. 编写拆分脚本 `tmux-capture/split_modules.ts` 并执行。
2. 检查 `amp-cli-reversed/modules/` 目录下是否成功生成细粒度的小文件。
3. 随机抽取几个命名为 `ThreadWorker_*.js` 或 `ThreadService_*.js` 的文件，确认其内容确实对应预期的业务逻辑。
4. 确认 `_module-map.json` 生成正确且包含标识符索引。