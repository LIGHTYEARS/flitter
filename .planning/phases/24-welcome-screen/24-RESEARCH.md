# Phase 24: Welcome Screen — Research

**Researched:** 2026-04-07
**Status:** Complete

---

## 摘要

Phase 24 的任务是将 `chat-view.ts` 中的 `buildWelcomeScreen()` 函数替换为一个独立的 `WelcomeScreen` StatefulWidget。该 widget 渲染 AMP ASCII Art "amp" 密度场 Logo（通过复用现有的 `DensityOrbWidget`）加上三行静态提示文字，布局为 Logo 左、提示右。提示文字样式、颜色、布局均以 golden file 为准。

---

## 1. DensityOrbWidget 实际接口

文件: [density-orb-widget.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/density-orb-widget.ts)

```typescript
export type DensityOrbVariant = 'default' | 'welcome';

export class DensityOrbWidget extends StatefulWidget {
  readonly variant: DensityOrbVariant;

  constructor(opts?: { variant?: DensityOrbVariant }) {
    super();
    this.variant = opts?.variant ?? 'default';
  }

  createState(): DensityOrbWidgetState { ... }
}
```

**关键发现：**
- `DensityOrbWidget` 只接受 `variant` 一个 prop（可选，默认 `'default'`）。
- **没有 `agentMode` prop**。CONTEXT.md D-06 提到"接收 agentMode prop"，但当前代码并不存在该 prop。
- `variant: 'welcome'` 使用较慢的动画速度（tickMs: 120, timeStep: 0.03）和精简字符集（`WELCOME_DENSITY_CHARS = ' .:-=+*'`）。
- 颜色硬编码为绿色渐变（`darkG=55, brightG=255`），无 agentMode 颜色切换。
- CELL_COLS = 40, CELL_ROWS = 20（即 40列 × 20行的 ASCII 矩形）。
- 动画由内部 `setInterval` 驱动，Widget 外部无需管理计时器。

**结论：** Phase 24 中的 `WelcomeScreen` 只需传 `variant: 'welcome'` 给 `DensityOrbWidget`，无需传 `agentMode`。`agentMode` 的颜色驱动是未来增强，Phase 24 按现有接口复用即可。

---

## 2. buildWelcomeScreen() 现有内容（需替换）

文件: [chat-view.ts L403-L446](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/chat-view.ts#L403-L446)

```typescript
/**
 * Welcome screen — first launch, no history.
 * Center with "flitter-cli" title, "Ctrl+O for help" hint, and cwd display.
 */
function buildWelcomeScreen(appState: AppState): Widget {
  return new Center({
    child: new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'center',
      children: [
        new Text({
          text: new TextSpan({
            text: 'flitter-cli',
            style: new TextStyle({
              foreground: Color.cyan,
              bold: true,
            }),
          }),
        }),
        new SizedBox({ height: 1 }),
        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: 'Ctrl+O',
                style: new TextStyle({ foreground: Color.blue }),
              }),
              new TextSpan({
                text: ' for help',
                style: new TextStyle({ foreground: Color.yellow }),
              }),
            ],
          }),
        }),
        new SizedBox({ height: 1 }),
        new Text({
          text: new TextSpan({
            text: `cwd: ${appState.metadata.cwd}`,
            style: new TextStyle({
              foreground: Color.brightBlack,
              dim: true,
            }),
          }),
        }),
      ],
    }),
  });
}
```

**需要变更：**
1. 整个函数替换为 `return new WelcomeScreen({ appState });`
2. 删除 "flitter-cli" 标题和 cwd 显示（golden file 中没有）
3. 新增 `DensityOrbWidget` 作为 Logo
4. 三行提示文字改为 golden file 中的 AMP 原文

---

## 3. AppState 类型与 agentMode

文件: [app-state.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/state/app-state.ts)

```typescript
export class AppState {
  /** Current agent mode (e.g., 'smart', 'code', 'ask'). */
  currentMode: string | null = null;

  // 监听器 API:
  addListener(fn: StateListener): void { this._listeners.add(fn); }
  removeListener(fn: StateListener): void { this._listeners.delete(fn); }
}
```

- **agentMode** 字段在 AppState 中命名为 `currentMode: string | null`（不是 `agentMode`）。
- `CONTEXT.md D-08` 要求 `WelcomeScreen` 注册 AppState listener 以响应模式变化重新 build。
- 但由于 `DensityOrbWidget` 目前无 agentMode prop，listener 在 Phase 24 中的实际作用仅保持架构完整性（为将来添加颜色切换预留）。

---

## 4. StatefulWidget 模式

项目中所有有状态 Widget 遵循统一模式，以 `DensityOrbWidgetState` 和 `BorderShimmerState` 为范例：

```typescript
export class WelcomeScreen extends StatefulWidget {
  readonly appState: AppState;

  constructor(opts: { appState: AppState }) {
    super();
    this.appState = opts.appState;
  }

  createState(): WelcomeScreenState {
    return new WelcomeScreenState();
  }
}

class WelcomeScreenState extends State<WelcomeScreen> {
  private _onChange: (() => void) | null = null;

  override initState(): void {
    super.initState();
    this._onChange = () => { this.setState(); };
    this.widget.appState.addListener(this._onChange);
  }

  override dispose(): void {
    if (this._onChange) {
      this.widget.appState.removeListener(this._onChange);
      this._onChange = null;
    }
    super.dispose();
  }

  build(context: BuildContext): Widget { ... }
}
```

**参考来源：**
- AppState listener 模式: [chat-view.ts L82-L133](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/chat-view.ts#L82-L133)
- setInterval 动画模式: [border-shimmer.ts L108-L147](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/border-shimmer.ts#L108-L147)
- `DensityOrbWidget` 内置 `setInterval` 无需 WelcomeScreen 管理计时器

---

## 5. Golden File 实际布局分析

文件: [plain-63x244.golden](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/screens/amp/welcome/plain-63x244.golden)

Plain 内容显示：
- **密度 Orb** 出现于大约第 22-38 行，位于屏幕**右侧**（大量前导空格）
- **提示文字** 出现在 Orb 的右侧，垂直对齐约在 Orb 中段（行 26, 29, 32-33）
- 三行提示的确切字符串：
  - 行 26: `Welcome to Amp`
  - 行 29: `Ctrl+O for help`
  - 行 32-33: `Use Tab/Shift+Tab to navigate to previous` / `messages to edit or restore to a previous state`

**ANSI 颜色分析** ([ansi-63x244.golden](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/screens/amp/welcome/ansi-63x244.golden)):

| 提示行 | ANSI 序列解析 | 含义 |
|--------|-------------|------|
| `Welcome to Amp` | `[38;2;0;174;89mW...` | 逐字符绿色渐变（RGB, Perlin 动画色） |
| `Ctrl+O` | `[38;5;4m` | **ANSI 颜色 4 = 蓝色** (Color.blue / keybind 颜色) |
| ` for ` | `[2m[39m` | dim + 默认前景 |
| `help` | `[38;5;3m` | **ANSI 颜色 3 = 黄色** |
| `Use Tab/Shift+Tab to navigate to previous` | `[38;5;6m` | **ANSI 颜色 6 = 青色** (Color.cyan) |
| `messages to edit or restore to a previous state` | `[38;5;6m` | **ANSI 颜色 6 = 青色** (Color.cyan) |

**关键颜色对应：**
- `Welcome to Amp`: 绿色逐字符渐变（与 DensityOrbWidget 相同绿色系）
  - 注: 这是静态文字，但 golden file 显示它有渐变色。CONTEXT.md D-05 说 hint 文字是静态的（无动画），所以可简化用单一 dim 绿色或沿用 CliThemeProvider 颜色
  - 实际 ANSI `[38;2;0;174;89m` 到 `[38;2;0;92;41m` 是绿色渐变但不是动画，是单帧截图
  - 对应 Color.rgb(0, 174, 89) 到 Color.rgb(0, 92, 41)——这是单色绿系，可用 `Color.green` 或 `Color.rgb(0, 160, 80)` 近似
- `Ctrl+O`: `[38;5;4m` = `Color.blue` = 主题 keybind 颜色
- ` for ` + `help`: `[2m` (dim) + 黄色 `[38;5;3m`
  - **重要**: ANSI 文件行 29 结构为 `[38;5;4mCtrl+O[2m[39m for [0m[38;5;3mhelp[39m`
  - `for` 是 dim 默认前景，`help` 是黄色
  - CONTEXT.md D-03 只说 "keybind color for `Ctrl+O`, dim for ` for help`"——但实际 `help` 是黄色而非 dim
- Tab 提示行: `[38;5;6m` = ANSI 颜色 6 = `Color.cyan`（两行同色）

---

## 6. 需要的 Import 路径

基于现有 widget 文件的 import 模式，`welcome-screen.ts` 需要：

```typescript
import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Center } from '../../../flitter-core/src/widgets/center';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { DensityOrbWidget } from './density-orb-widget';
import type { AppState } from '../state/app-state';
```

chat-view.ts 需要新增的 import：
```typescript
import { WelcomeScreen } from './welcome-screen';
```

`CliThemeProvider` import（用于 keybind 颜色）：
```typescript
import { CliThemeProvider } from '../themes';
```

---

## 7. chat-view.ts 中的调用点

[chat-view.ts L119-L120](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/chat-view.ts#L119-L120):

```typescript
case 'welcome':
  return buildWelcomeScreen(this.widget.appState);
```

变更后：
```typescript
case 'welcome':
  return new WelcomeScreen({ appState: this.widget.appState });
```

`buildWelcomeScreen` 函数（[L403-L446](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/chat-view.ts#L403-L446)）整体删除。

---

## 8. 测试模式分析

参考 [chat-view.test.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/__tests__/chat-view.test.ts) 中的测试工具函数和模式：

### 测试 Helper 模式（可复用）

```typescript
// 1. 创建测试 AppState
function createTestAppState(): { appState: AppState; session: SessionState; ... } {
  const provider = new MockProvider();
  const session = new SessionState({ sessionId: 'test', cwd: '/test', model: 'test-model' });
  const appState = new AppState(session, new PromptHistory(), new SessionStore());
  const controller = new PromptController({ session, provider });
  appState.setPromptController(controller);
  return { appState, session, provider };
}

// 2. 直接调用 build() 而不走 framework 生命周期
function buildWidget(widget, state): Widget {
  (state as any)._widget = widget;
  state.initState();
  return state.build(stubContext);
}

// 3. 递归查找 Widget
function findAllWidgets<T>(root, type): T[] { ... }
```

### D-10 要求的四个测试 case

1. **渲染路径**：`WelcomeScreen` build 不抛出；widget 树中存在 `DensityOrbWidget` 且 `variant === 'welcome'`
2. **提示文字存在**：widget 树中存在 `"Welcome to Amp"`、`"Ctrl+O for help"`、`"Use Tab/Shift+Tab to navigate"`
3. **清理路径**：initState → dispose 后 AppState._listeners.size 恢复原值（无泄漏）
4. **集成**：`screenState.kind === 'welcome'` 触发路径返回 `WelcomeScreen` 实例（不是 `Center` with 'flitter-cli'）

### stub context 模式
```typescript
const stubContext: BuildContext = { widget: null!, mounted: true } as unknown as BuildContext;
```

---

## 9. 现有 StatefulWidget lifecycle 详细对比

| 类 | initState | dispose |
|----|-----------|---------|
| `DensityOrbWidgetState` | `setInterval` 启动动画 | `clearInterval` |
| `BorderShimmerState` | 记录初始 trigger 值 | `clearInterval` |
| `ChatViewState` | `appState.addListener()` | `appState.removeListener()` |
| `AppShellState` | `appState.addListener()` + `overlayManager.addListener()` | 两个都 remove |
| **WelcomeScreenState（目标）** | `appState.addListener()` | `appState.removeListener()` |

注：`DensityOrbWidget` 自管理 `setInterval`，`WelcomeScreen` 不需要额外 timer。

---

## 10. 关于 "Welcome to Amp" 的颜色决策

Golden file ANSI 行 26 显示 "Welcome to Amp" 的每个字符有单独 RGB 颜色（绿色渐变），例如 `W` = rgb(0,174,89), `p` = rgb(0,92,41)。

但 CONTEXT.md D-05 明确指出："The hint text is **static** — no color animation on hint lines."

**结论：** `"Welcome to Amp"` 的逐字符渐变是 AMP 在截图时刻的动画帧快照，不是固定样式。Phase 24 应当将其实现为 **静态 dim 绿色**（例如 `Color.rgb(0, 160, 80)` 或 `Color.green` 配合 dim），而非实现动画。这符合 D-05 决策。

---

## 11. 布局方案

根据 golden file 和 D-02 决策：

```typescript
new Center({
  child: new Row({
    mainAxisSize: 'min',
    crossAxisAlignment: 'center',  // 或 D-Claude-discretion
    children: [
      new DensityOrbWidget({ variant: 'welcome' }),
      new SizedBox({ width: 4 }),  // gap (4-8 列可接受)
      new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',  // D-Claude-discretion: start
        children: [
          // Line 1: "Welcome to Amp" - dim green
          // Line 2: "Ctrl+O for help" - keybind blue + dim + yellow
          // Line 3-4: "Use Tab/Shift+Tab..." - cyan (两行)
        ],
      }),
    ],
  }),
})
```

**注意：** `Row` 从 `'../../../flitter-core/src/widgets/flex'` import，已在 `app-shell.ts` 中使用。

---

## Validation Architecture

### 可测试标准（D-10 映射）

| 测试 ID | 断言 | 验证方法 |
|---------|------|--------|
| T1 | WelcomeScreen build 不抛出 | `expect(() => state.build(ctx)).not.toThrow()` |
| T2 | tree 中存在 `DensityOrbWidget` with `variant:'welcome'` | `findAllWidgets(tree, DensityOrbWidget)` 长度 ≥ 1 且 `.variant === 'welcome'` |
| T3 | tree 中包含 "Welcome to Amp" | `findAllWidgets(tree, Text)` 某个含该字符串 |
| T4 | tree 中包含 "Ctrl+O for help" 片段 | 找到含 "Ctrl+O" 或 "for help" 的 TextSpan |
| T5 | tree 中包含 "Use Tab/Shift+Tab" 片段 | 找到含该字符串的 Text widget |
| T6 | dispose 清除 listener（无泄漏） | `appState._listeners.size` before == after |
| T7 | `screenState.kind === 'welcome'` 触发路径返回 WelcomeScreen | `buildChatView(appState)` 时 tree 包含 `DensityOrbWidget`（而非 'flitter-cli' 文字） |

### 测试结构建议

```
packages/flitter-cli/src/__tests__/welcome-screen.test.ts

Group 1: WelcomeScreen render path
  1.1 builds without throwing
  1.2 contains DensityOrbWidget with variant:'welcome'
  1.3 layout is Row with Center wrapper

Group 2: Hint text content
  2.1 "Welcome to Amp" text present
  2.2 "Ctrl+O" TextSpan with keybind (blue) color
  2.3 "for help" text present
  2.4 "Use Tab/Shift+Tab to navigate to previous" text present
  2.5 "messages to edit or restore to a previous state" text present

Group 3: Cleanup / lifecycle
  3.1 initState registers AppState listener
  3.2 dispose removes AppState listener (no leak)

Group 4: Integration
  4.1 welcome screenState in chat-view produces WelcomeScreen (not bare Center with flitter-cli)
```

---

## 附注：CONTEXT.md D-06 与实际代码的差异

CONTEXT.md D-06 说："DensityOrbWidget 接收 agentMode prop to drive its color palette"。

**实际代码检查结果：** `DensityOrbWidget` 当前 **没有 `agentMode` prop**，颜色硬编码为绿色系。该功能尚未实现。

**Phase 24 处理策略：**
- 不扩展 `DensityOrbWidget` 接口（超出 Phase 24 范围）
- `WelcomeScreen` 仍然接收 `appState`，为将来添加 agentMode 颜色预留架构（监听 currentMode 变化）
- `DensityOrbWidget` 保持现状：`new DensityOrbWidget({ variant: 'welcome' })`

---

## RESEARCH COMPLETE
