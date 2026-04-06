# Checklist

- [x] `@xterm/addon-unicode11` 已安装且在 package.json 中存在
- [x] `viewer.html` 存在于 `tmux-capture/` 目录
- [x] `viewer.html` 使用真实的 xterm.js Terminal（非 headless）+ CanvasAddon 渲染
- [x] `viewer.html` 加载并激活了 Unicode11Addon
- [x] `viewer.html` 从 URL query 参数读取 golden 文件路径和终端尺寸
- [x] `viewer.html` 渲染完成后设置 `window.__XTERM_READY = true` 信号
- [x] `render.ts` 使用 agent-browser 打开 viewer.html 并截图
- [x] `render.ts` 支持单文件模式和批量模式
- [x] 运行 `bun run render.ts` 后，所有 `screens/*/screenshot-*.png` 正确生成
- [x] `skills-popup` 截图中 CJK 字符正确占 2 列宽度，边框对齐无错位
- [x] `welcome` 截图渲染效果正常（logo、文字、边框完整）
- [x] 旧的 `screens/*/ansi-*.html` 文件已清理
