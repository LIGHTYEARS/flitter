# 逆向工程更新计划：清理旧产物与纯净解包

## Summary (目标与摘要)
删除之前遗留的 `amp-cli-reversed` 目录及其内部所有的 `.js` 文件，消除旧逆向代码对 IDE 检索、AI 上下文和后续 TypeScript 迁移造成的噪音干扰。随后基于刚才从二进制中直接提取的纯净 Payload (`extracted.js`) 实施更为精准的 AST 解包，剔除第三方依赖。

## Current State Analysis (当前状态分析)
- 项目根目录下存在旧版的 `amp-cli-reversed/` 文件夹（包含约 116K 行代码）。其中混杂了大量的第三方依赖（如 `@opentelemetry`、`zod` 等）以及未彻底还原的打包包装器。
- 我们已在上一轮中成功从目标二进制文件中物理提取了核心 Payload，即 `/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/extracted.js`（约 8.49MB）。
- 旧有的 `.js` 文件由于体量巨大且存在冗杂信息，会在使用 `ripgrep` / `SearchCodebase` 时严重污染搜索结果，干扰后续分析。

## Proposed Changes (具体执行步骤)

### 1. 清理旧逆向产物与临时文件
- **删除旧目录**：递归删除整个 `/Users/bytedance/.oh-my-coco/studio/flitter/amp-cli-reversed/` 目录。
- **清理中间文件**：删除提取过程产生的二进制与中间脚本：
  - `tmux-capture/extracted_bun.bin`
  - `tmux-capture/extract.js`
  - `tmux-capture/extract.ts`
  *(保留 `tmux-capture/extracted.js` 作为新的数据源基准)*。

### 2. 基于 AST 的精准解包 (Unbundling)
- **安装工具**：在 `tmux-capture/` 中临时安装 `@babel/parser`, `@babel/traverse`, `@babel/generator` 等 AST 处理工具。
- **编写脚本**：新建 `tmux-capture/unbundle.ts`：
  - 扫描 `extracted.js` 中的 `var 模块名 = EW((exports, module) => { ... })` 模式。
  - 根据路径特征，**剔除**所有包含 `node_modules` 或明确为第三方开源库的代码片段。
  - 仅将应用的核心业务逻辑 (`app/`, `framework/`, `util/` 等) 提取并重新格式化。
- **生成新参考代码**：将提纯后的业务代码重新写入一个干净的 `amp-cli-reversed/` 目录中，供后续 TypeScript 翻译使用。

## Assumptions & Decisions (假设与决策)
- **决策**：直接删除 `amp-cli-reversed` 而不进行重命名备份。原始二进制文件及 `extracted.js` 已作为事实源保存，随时可以恢复或重新生成。
- **决策**：新生成的参考代码依然存放在 `amp-cli-reversed/` 目录中，这样可以无需修改 `PROJECT.md` 和 `CLAUDE.md` 等文档中的约束路径。

## Verification (验证步骤)
1. 执行删除命令后，通过 `ls` 和 `fd` 确认 `amp-cli-reversed/` 已被完全清除。
2. 确认 `tmux-capture` 下只剩 `extracted.js` 及其原有环境。
3. 运行新编写的 AST 拆包脚本，检查新生成的 `amp-cli-reversed/` 内是否排除了第三方依赖包，且业务代码结构清晰。