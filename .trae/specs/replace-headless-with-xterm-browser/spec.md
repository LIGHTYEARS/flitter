# Replace @xterm/headless with Browser-based xterm.js Rendering Spec

## Why

当前方案使用 `@xterm/headless` + `@xterm/addon-serialize` 的 `serializeAsHTML()` 输出 HTML。该方案存在根本性缺陷：CJK/全角字符在 HTML 中每个字符只占 1 列宽度（而终端中占 2 列），导致包含中文的界面（如 skills-popup）布局错乱。这是 serializeAsHTML 的固有限制，无法通过补丁修复。

需要切换到真正的 xterm.js 浏览器渲染方案：在浏览器中创建真实的 xterm Terminal 实例，使用 Canvas/WebGL renderer 像真正的终端一样渲染，然后截图。这样 CJK 字符的宽度由字体度量决定，布局与真实终端完全一致。

## What Changes

- **BREAKING**: 移除 `@xterm/headless` + `serializeAsHTML` 渲染路径
- 新增 `tmux-capture/viewer.html`：一个浏览器端页面，加载 xterm.js（含 canvas renderer、fit addon、unicode11 addon），从 URL query 参数读取 `.golden` 文件路径，通过 fetch 加载 ANSI 数据并写入 xterm Terminal
- 修改 `tmux-capture/render.ts`：不再自行生成 HTML，改为启动本地 HTTP server、用 agent-browser 打开 viewer.html（传入 golden 文件路径）、等待渲染完成后截图保存 PNG
- 新增 addon：`@xterm/addon-canvas`（Canvas renderer）、`@xterm/addon-fit`（自适应尺寸）、`@xterm/addon-unicode11`（正确的 CJK 宽度计算）
- 可移除 `@xterm/addon-webgl`（headless 环境中 WebGL 不可用，Canvas 足够）

## Impact

- Affected code: `tmux-capture/render.ts`（重写）、新增 `tmux-capture/viewer.html`
- Affected assets: 所有 `screens/*/ansi-*.html` 将不再生成（由 PNG 截图替代），可以保留 `.golden` 文件不变
- Affected deps: `package.json` 中移除 `@xterm/headless`，新增 `@xterm/addon-unicode11`；保留 `@xterm/xterm`、`@xterm/addon-canvas`、`@xterm/addon-fit`、`@xterm/addon-serialize`

## ADDED Requirements

### Requirement: Browser-based xterm.js Viewer Page
系统 SHALL 提供一个 `viewer.html` 页面，在浏览器中用真实的 xterm.js + Canvas Renderer 渲染 ANSI golden 文件。

#### Scenario: 渲染包含 CJK 字符的界面
- **WHEN** viewer.html 加载一个包含中文的 ansi golden 文件（如 skills-popup）
- **THEN** CJK 字符正确占 2 列宽度，边框对齐，无错位

#### Scenario: 渲染普通 ASCII 界面
- **WHEN** viewer.html 加载一个纯 ASCII 的 ansi golden 文件（如 welcome）
- **THEN** 渲染效果与之前 headless 方案一致

### Requirement: Unicode11 Addon
系统 SHALL 加载 `@xterm/addon-unicode11` 并激活 `unicode11` 版本，确保 CJK 字符宽度计算正确。

### Requirement: 自动化截图 Pipeline
`render.ts` SHALL 自动启动 HTTP server、用 Puppeteer/agent-browser 打开 viewer.html、等待 xterm 渲染完成后截图保存。

#### Scenario: 批量渲染
- **WHEN** 执行 `bun run render.ts`（无参数）
- **THEN** 遍历所有 `screens/*/ansi-*.golden` 文件，逐个渲染并截图

#### Scenario: 单文件渲染
- **WHEN** 执行 `bun run render.ts screens/welcome/ansi-63x244.golden`
- **THEN** 只渲染指定文件

## MODIFIED Requirements

### Requirement: 输出产物变更
- 之前：每个 screen 输出 `ansi-*.html`（serializeAsHTML 生成的 HTML）
- 现在：每个 screen 输出 `screenshot-*.png`（浏览器截图），`ansi-*.html` 不再生成
- `plain-*.golden` 和 `ansi-*.golden` 保持不变

## REMOVED Requirements

### Requirement: serializeAsHTML HTML 输出
**Reason**: serializeAsHTML 无法正确处理 CJK 字符宽度，导致布局错乱
**Migration**: 由浏览器截图 PNG 替代
