# Tasks

- [x] Task 1: 安装 `@xterm/addon-unicode11` 依赖
  - [x] SubTask 1.1: `bun add @xterm/addon-unicode11`
  - [x] SubTask 1.2: 确认 package.json 已包含 `@xterm/xterm`、`@xterm/addon-canvas`、`@xterm/addon-fit`、`@xterm/addon-unicode11`、`@xterm/addon-serialize`

- [x] Task 2: 创建 `tmux-capture/viewer.html` 浏览器端 xterm.js 渲染页面
  - [x] SubTask 2.1: 使用裸模块导入（由 Vite 从 node_modules 解析）引用 xterm.js 及 addons
  - [x] SubTask 2.2: 从 URL query 参数 `?file=<path>` 读取 golden 文件路径，通过 fetch 加载 ANSI 数据
  - [x] SubTask 2.3: 从 URL query 参数 `?cols=<N>&rows=<N>` 读取终端尺寸，创建 Terminal 实例
  - [x] SubTask 2.4: 配置 GitHub Dark 主题色
  - [x] SubTask 2.5: 加载 CanvasAddon、Unicode11Addon，激活 unicode11 版本
  - [x] SubTask 2.6: `terminal.write(ansiData)` 后，设置 `window.__XTERM_READY = true` 作为渲染完成信号
  - [x] SubTask 2.7: 页面 body 背景色与 xterm 主题一致，terminal container 无多余 padding/margin

- [x] Task 3: 重写 `tmux-capture/render.ts` 为自动化截图 pipeline（使用 Vite dev server）
  - [x] SubTask 3.1: 从 golden 文件名解析 rows/cols（沿用现有 `parseSize` 逻辑）
  - [x] SubTask 3.2: 启动 Vite dev server serve `tmux-capture/` 目录
  - [x] SubTask 3.3: 用 `agent-browser` CLI 打开 `viewer.html?file=<path>&cols=<N>&rows=<N>`
  - [x] SubTask 3.4: 等待 `window.__XTERM_READY === true`（通过 `agent-browser wait --fn`）
  - [x] SubTask 3.5: 用 `agent-browser screenshot --full` 截图保存到 golden 文件同目录下的 `screenshot-{rows}x{cols}.png`
  - [x] SubTask 3.6: 支持批量模式（无参数时遍历所有 `screens/*/ansi-*.golden`）和单文件模式
  - [x] SubTask 3.7: 渲染完成后关闭 Vite server 和 browser

- [x] Task 4: 清理旧的 `ansi-*.html` 产物
  - [x] SubTask 4.1: 删除所有 `screens/*/ansi-*.html` 文件
  - [x] SubTask 4.2: 删除 `tmux-capture/` 下的 debug-*.ts 临时调试脚本

- [x] Task 5: 验证所有 screen 的截图结果
  - [x] SubTask 5.1: 运行 `bun run render.ts` 批量渲染所有 golden 文件（9 个 screen 全部成功）
  - [x] SubTask 5.2: skills-popup 截图中 Canvas renderer 使用 Unicode11 宽度计算，CJK 字符正确占 2 列
  - [x] SubTask 5.3: welcome 截图渲染效果正常（PNG 1952x4574）

# Task Dependencies
- Task 2 和 Task 1 可并行
- Task 3 依赖 Task 1 和 Task 2
- Task 4 可与 Task 3 并行
- Task 5 依赖 Task 3
