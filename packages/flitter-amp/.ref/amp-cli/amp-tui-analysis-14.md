# Amp TUI 深度分析 #14: Dialog/CommandPalette/FilePicker 模态系统

> 基于 Amp CLI v0.0.1774512763 混淆 JS 逆向分析 + flitter-core / flitter-amp 完整源码对比
> 分析范围: Dialog 数据类、CommandPalette、PermissionDialog、FilePicker 模态 Widget、Overlay 管理策略（Stack+Positioned）、焦点陷阱、键盘拦截、Z-order/层叠、背景遮罩、动画/过渡
> 分析日期: 2026-03-29

---

## 1. Amp 实现细节

### 1.1 混淆名映射表

| Amp 混淆名 | 概念 | 调用位置 |
|------------|------|---------|
| `ab` | Dialog 数据类 | 应用 shell 层消费 |
| `ap` | SelectionList（交互式选择列表） | CommandPalette、PermissionDialog 内部 |
| `ng` | Stack（层叠布局） | overlay 管理根容器 |
| `L4` | Positioned（定位子节点） | 各模态的 overlay 定位 |
| `hF` | RenderStack | Stack 的 RenderObject |
| `bt` | ContainerWithOverlays | BottomGrid 四角 overlay 布局 |
| `t4` | FocusScope（焦点作用域） | 全局键盘路由 + 模态焦点陷阱 |
| `A8` | Container | 模态卡片的边框/背景容器 |

### 1.2 Amp 模态系统架构

#### 1.2.1 Overlay 优先级栈（互斥模型）

Amp 在 App.build() 中采用**状态驱动的互斥 overlay 模型**。三种模态按优先级排列：

```
Priority 1 (最高): PermissionDialog — agent 权限请求
  条件: appState.hasPendingPermission
  位置: Stack → Positioned(top:0, left:0, right:0, bottom:0) — 全屏覆盖
  
Priority 2: CommandPalette — Ctrl+O 命令面板
  条件: showCommandPalette === true
  位置: Stack → Positioned(top:0, left:0, right:0, bottom:0) — 全屏覆盖

Priority 3 (最低): FilePicker — @文件补全
  条件: showFilePicker === true && fileList.length > 0
  位置: Stack → Positioned(left:1, bottom:3) — 输入框上方左侧浮动
```

**关键设计**: 这三种 overlay 是**互斥**的（if-else if-else if 分支），同一时刻最多只显示一个。优先级高的会抢占低优先级的显示位置。

#### 1.2.2 Stack+Positioned 覆盖模式

Amp 使用 `Stack(fit:'expand')` 包裹 `mainContent` + `Positioned` overlay。PermissionDialog 和 CommandPalette 用 `Positioned(top:0, left:0, right:0, bottom:0)` 实现全屏覆盖，FilePicker 用 `Positioned(left:1, bottom:3)` 实现局部浮动。

```
Stack(fit: 'expand')
├── mainContent (FocusScope → Column → [Expanded+BottomGrid])
└── Positioned(top:0, left:0, right:0, bottom:0)   ← 全屏 overlay
    └── PermissionDialog | CommandPalette
```

#### 1.2.3 模态显示/隐藏 API

Amp 不使用 showDialog/hideDialog 命令式 API，而是纯 **state-driven（状态驱动）** 模式：

| 模态 | 打开机制 | 关闭机制 |
|------|---------|---------|
| PermissionDialog | `appState.onPermissionRequest(request)` 设置 `pendingPermission`，`notifyListeners()` 触发重建 | `appState.resolvePermission(optionId)` 清除 `pendingPermission` |
| CommandPalette | `Ctrl+O` → `setState(() => { showCommandPalette = true })` | Escape → `setState(() => { showCommandPalette = false })`；执行命令后也关闭 |
| FilePicker | `showFilePicker = true && fileList.length > 0` | Escape → `setState(() => { showFilePicker = false })`；选择文件后也关闭 |

PermissionDialog 的打开比较特殊，它通过 Promise + 发布-订阅模式实现异步权限请求：
```
AppState.onPermissionRequest(request):
  return new Promise((resolve) => {
    this.pendingPermission = { resolve, request };
    this.notifyListeners();  // → 触发 TUI 重建，显示 dialog
  });

AppState.resolvePermission(optionId):
  this.pendingPermission.resolve(optionId);  // resolve Promise
  this.pendingPermission = null;
  this.notifyListeners();  // → 触发 TUI 重建，隐藏 dialog
```

#### 1.2.4 焦点管理

Amp 的焦点系统基于 `FocusScope` + `FocusNode` + `FocusManager` 三层架构：

1. **全局 FocusScope**: App.build() 根节点包裹 `FocusScope(autofocus: true, onKey: ...)` 处理全局快捷键
2. **模态 FocusScope**: 每个模态 Widget 内部再包裹一层 `FocusScope(autofocus: true)`
3. **SelectionList 焦点**: SelectionList.build() 内部又包裹 `FocusScope(autofocus: true, onKey: handleKeyEvent)`

焦点转移机制：
- **模态打开时**: 模态 Widget 的 `FocusScope(autofocus: true)` 在 initState 中通过 `queueMicrotask(() => focusNode.requestFocus())` 异步夺焦
- **模态关闭时**: 模态 Widget 被移除出 Widget 树 → FocusScopeState.dispose() 自动清理 FocusNode → FocusManager 将焦点回退到上一个可聚焦节点
- **无显式焦点恢复**: Amp/Flitter 没有实现焦点恢复栈（记住关闭前的聚焦位置），依赖 FocusManager 的隐式回退

#### 1.2.5 键盘事件拦截

Escape 按键的处理遵循**逐层关闭**策略，在 App.build() 的根 FocusScope.onKey 中实现：

```
Escape 处理优先级链:
1. showFilePicker → 关闭 FilePicker
2. showCommandPalette → 关闭 CommandPalette  
3. hasPendingPermission → resolvePermission(null)（拒绝权限）
4. 均无 overlay → 'ignored'（不处理）
```

Enter 按键在 SelectionList 层处理（不冒泡到 App 层）：
- SelectionList.handleKeyEvent('Enter') → 调用 onSelect → 返回 'handled'

其他全局快捷键（均在根 FocusScope.onKey 处理）：
- `Ctrl+O`: 打开 CommandPalette
- `Ctrl+C`: 取消当前操作
- `Ctrl+L`: 清空会话
- `Alt+T`: 折叠/展开工具调用
- `Ctrl+G`: 外部编辑器（TODO）
- `Ctrl+R`: 历史浏览

#### 1.2.6 背景遮罩（Backdrop）

**Amp 没有实现半透明 dim 背景遮罩**。PermissionDialog 和 CommandPalette 通过 `Positioned(top:0, left:0, right:0, bottom:0)` 全屏覆盖，但覆盖层本身没有背景色填充（即没有 `Container(color: Color.rgba(0,0,0,0.5))` 这样的 backdrop）。

模态内容只是一个带边框的 Container 居中/置顶显示，底层 mainContent 仍然可见（被模态卡片遮挡的部分除外）。

原因推测：终端 UI 不支持真正的半透明/alpha 混合。Amp 选择用**不透明黑色背景**的 Container（如 dialog-demo.ts 中 `BoxDecoration({ color: Color.black })`）来"覆盖"底层内容，但这只在 Container 范围内有效。

#### 1.2.7 Z-order / 层叠顺序

Stack 的子节点按添加顺序绘制（后添加的在上层）：
1. `children[0]`: mainContent（底层）
2. `children[1]`: Positioned overlay（顶层）

由于 overlay 互斥，不存在多个 overlay 同时存在的 Z-order 冲突问题。

#### 1.2.8 动画/过渡

Amp 模态系统**没有打开/关闭动画**。模态的出现和消失是即时的（setState → 重建 → 立即显示/移除）。唯一的"动画"是 SelectionList 中的选中指示器 `>` 的位置切换（也是即时的）。

### 1.3 各模态 Widget 实现细节

#### 1.3.1 PermissionDialog

```
FocusScope(autofocus: true)
└── Column(mainAxisAlignment: 'center', crossAxisAlignment: 'center')
    └── Container(border: rounded/warning, padding: h:2 v:1, maxWidth: 60)
        └── Column(mainAxisSize: 'min', crossAxisAlignment: 'start')
            ├── Text("Permission Required", warning/bold)
            ├── Text("{toolCall.title} ({toolCall.kind})", foreground)
            ├── SizedBox(height: 1)
            └── SelectionList(items: options, showDescription: true)
```

- 边框颜色: `base.warning`（黄色系）
- mainAxisAlignment: `'center'` — **垂直居中**
- 权限选项来自 ACP PermissionRequest.options 动态映射
- SelectionList 的 onSelect → 调用 `appState.resolvePermission(optionId)` 解析 Promise
- SelectionList 的 onCancel → 调用 `onCancel()` → `appState.resolvePermission(null)` 拒绝

#### 1.3.2 CommandPalette

```
FocusScope(autofocus: true)
└── Column(mainAxisAlignment: 'start', crossAxisAlignment: 'center')
    ├── SizedBox(height: 2)   ← 顶部 2 行间距
    └── Container(border: rounded/info, padding: h:2 v:1, maxWidth: 50)
        └── Column(mainAxisSize: 'min', crossAxisAlignment: 'start')
            ├── Text("Command Palette", info/bold)
            ├── SizedBox(height: 1)
            └── SelectionList(items: COMMANDS, showDescription: true)
```

- 边框颜色: `base.info`（蓝色系）
- mainAxisAlignment: `'start'` — **顶部对齐**（距顶部 2 行）
- 当前硬编码 3 个命令:
  - Clear conversation (Ctrl+L)
  - Toggle tool calls (Alt+T)
  - Toggle thinking
- **无 fuzzy search 输入框** — 直接显示静态命令列表
- 执行命令后关闭面板，并在 App.build() 中 switch 分发

#### 1.3.3 FilePicker

```
FocusScope(autofocus: true)
└── Column(mainAxisAlignment: 'end', crossAxisAlignment: 'start')
    └── Container(border: rounded/success, padding: h:2 v:1, maxWidth: 60, maxHeight: 15)
        └── Column(mainAxisSize: 'min', crossAxisAlignment: 'start')
            ├── Text("Select file", success/bold)
            ├── SizedBox(height: 1)
            └── SelectionList(items: files)
```

- 边框颜色: `base.success`（绿色系）
- mainAxisAlignment: `'end'` — **底部对齐**（贴近输入框上方）
- maxHeight: 15 限制文件列表最多高度
- 文件列表从外部传入，不包含内置文件系统遍历
- 选择文件后插入 @filePath 到 InputArea（TODO，当前未实现）

### 1.4 SelectionList 共享组件

三个模态共享 `SelectionList` 作为核心交互组件：

| 功能 | 实现 |
|------|------|
| 键盘导航 | ArrowUp/k: 上移, ArrowDown/j: 下移, Tab: 循环, Ctrl+n/p: 上下 |
| 确认/取消 | Enter: onSelect(value), Escape: onCancel() |
| 选中指示 | `> label` (bold+inverse) vs `  label` (普通) |
| 禁用跳过 | disabled 项自动跳过，不可选中 |
| 环绕导航 | 到达末尾后自动环绕到首项 |
| 描述显示 | showDescription=true 时追加 ` - description` |
| 鼠标交互 | enableMouseInteraction=true 时点击即选中+确认 |

### 1.5 Autocomplete 系统（@ 触发 → FilePicker 的前置）

Autocomplete Widget 是 InputArea 内部的补全机制，检测 `@` 触发字符后：
1. 扫描光标前 100 字符找到最后一个 `@`
2. 提取 `@` 后的 query 字符串
3. 调用 `optionsBuilder(query)` 获取选项（支持异步）
4. fuzzyMatch 子序列过滤，最多显示 10 项
5. 渲染 Column [SelectionList (上方), TextField (下方)]

这是 Amp 中 `@` 文件补全的核心机制。Autocomplete 位于 InputArea 内部，与 FilePicker overlay 是两个不同的补全路径。

---

## 2. Flitter 实现细节

### 2.1 flitter-core 基础设施

#### 2.1.1 Dialog 数据类

**文件**: `flitter-core/src/widgets/dialog.ts`

Dialog 是一个**纯数据类**（NOT a widget），对应 Amp 混淆名 `ab`。它持有 dialog 的配置信息，由应用 shell 层消费来构建实际的 widget 树。

```typescript
class Dialog {
  readonly title: string;              // 标题
  readonly type: DialogType;           // 'info' | 'warning' | 'error' | 'confirm' | 'custom'
  readonly subtitle?: string;          // 副标题
  readonly body?: Widget;              // 自定义内容 Widget
  readonly footerStyle: FooterStyle;   // 'buttons' | 'text' | 'none'
  readonly buttons?: readonly DialogButton[];  // 按钮配置（frozen array）
  readonly dimensions?: DialogDimensions;      // 可选尺寸
  readonly border: boolean;            // 是否显示边框（默认 true）
}
```

设计特点：
- **不可变**: 所有字段 readonly，buttons 数组被 `Object.freeze()` 冻结
- **copyWith 模式**: 提供 `copyWith()` 方法创建修改后的副本
- **与 Widget 分离**: Dialog 本身不关心渲染方式，渲染逻辑在 shell 层（App.build()）
- **5 种 DialogType**: info、warning、error、confirm、custom

**当前状态**: Dialog 数据类已完成，但**没有被 flitter-amp 的任何代码消费**。PermissionDialog 和 CommandPalette 直接作为 Widget 实现，没有使用 Dialog 数据类。

#### 2.1.2 Stack + Positioned

**文件**: `flitter-core/src/widgets/stack.ts`

Stack 是核心的层叠布局 Widget，实现了 Amp 混淆名 `ng` 的功能：

```
RenderStack.performLayout():
  Pass 1: 布局非定位子节点 → 确定 Stack 自身尺寸
  Pass 2: 根据 Positioned 数据计算定位子节点的约束和偏移

Positioned 数据通过 RenderPositioned 传递:
  - left/top/right/bottom: 边距定位
  - width/height: 显式尺寸
  - 当 left+right 同时设置: 宽度由 Stack 宽度减去两侧边距确定
  - 当 top+bottom 同时设置: 高度由 Stack 高度减去上下边距确定
```

StackFit 三种模式：
- `'loose'`: 非定位子节点用松约束（0 到父约束最大值）
- `'expand'`: 非定位子节点用紧约束（等于父约束最大值）— **overlay 使用此模式**
- `'passthrough'`: 非定位子节点透传父约束

**Positioned 实现注意**: Flitter 用 `SingleChildRenderObjectWidget + RenderPositioned` 而非 Flutter 的 `ParentDataWidget`。RenderPositioned 直接存储定位数据（left/top/right/bottom），RenderStack 通过 `instanceof RenderPositioned` 检测而非 parentData。

#### 2.1.3 ContainerWithOverlays

**文件**: `flitter-core/src/widgets/container-with-overlays.ts`

ContainerWithOverlays 是 Amp `bt` 类的实现，用于 BottomGrid 的四角 overlay 布局。它在内部将 Container + 多个 Positioned 包裹在 `Stack(fit:'passthrough')` 中。

```typescript
class ContainerWithOverlays extends StatelessWidget {
  overlays: OverlaySpec[];  // { child, position: 'top'|'bottom', alignment: 'left'|'center'|'right', offsetX? }
  
  build():
    // 无 overlay → 返回纯 Container
    // 有 overlay → Stack(fit:'passthrough') { Container, ...Positioned[] }
    //   overlay 按 position+alignment 分组
    //   同组多个 overlay → Row 排列
}
```

**注意**: ContainerWithOverlays 用于**边缘/角落的小标签 overlay**（如状态栏四角），不用于模态对话框。模态对话框直接使用 Stack + Positioned。

#### 2.1.4 SelectionList

**文件**: `flitter-core/src/widgets/selection-list.ts`

SelectionList (Amp `ap`) 是模态系统的核心交互组件：

```
SelectionList (StatefulWidget)
└── SelectionListState
    ├── _selectedIndex: number
    ├── handleKeyEvent(): ArrowUp/k/Ctrl+p → _movePrevious
    │                     ArrowDown/j/Tab/Ctrl+n → _moveNext
    │                     Enter → _confirmSelection → onSelect(value)
    │                     Escape → onCancel()
    │                     Shift+Tab → _movePrevious
    ├── handleMouseClick(index): setState + _confirmSelection
    └── build():
        FocusScope(autofocus: true, onKey: handleKeyEvent)
        └── Column(crossAxisAlignment: 'start', mainAxisSize: 'min')
            ├── Text("> label" bold+inverse)   ← 选中项
            └── Text("  label" normal)         ← 未选中项
```

导航特性：
- 环绕导航（最后一项 → 第一项，反之亦然）
- 自动跳过 disabled 项
- 如果所有项 disabled → 停留在当前位置

#### 2.1.5 FocusScope

**文件**: `flitter-core/src/widgets/focus-scope.ts`

FocusScope 是行为-only Widget（不渲染，只管理焦点），对应 Amp `t4`：

```
FocusScopeState:
  initState():
    创建/附加 FocusNode
    设置 onKey/onPaste handlers
    注册到 FocusManager
    if (autofocus) queueMicrotask(() → requestFocus())
  
  dispose():
    解除 listeners
    注销 FocusNode
    if (自己创建的) 销毁 FocusNode
  
  build():
    return child;  // 透传子 Widget
```

关键设计：autofocus 用 `queueMicrotask` 延迟请求焦点，确保 Widget 树完全挂载后再执行。

### 2.2 flitter-amp 应用层

#### 2.2.1 App.build() 模态管理

**文件**: `flitter-amp/src/app.ts`

App 的 build() 方法按优先级构建 overlay：

```typescript
// Phase 1: 构建主内容
let result: Widget = mainContent;

// Phase 2: 按优先级叠加 overlay
if (appState.hasPendingPermission) {
  result = new Stack({ fit: 'expand', children: [mainContent, Positioned(全屏, PermissionDialog)] });
} else if (this.showCommandPalette) {
  result = new Stack({ fit: 'expand', children: [mainContent, Positioned(全屏, CommandPalette)] });
} else if (this.showFilePicker && this.fileList.length > 0) {
  result = new Stack({ fit: 'expand', children: [mainContent, Positioned(局部, FilePicker)] });
}

// Phase 3: 包裹主题
return new AmpThemeProvider({ theme, child: result });
```

#### 2.2.2 AppState 权限异步模型

**文件**: `flitter-amp/src/state/app-state.ts`

```typescript
class AppState {
  private pendingPermission: {
    resolve: (optionId: string | null) => void;
    request: PermissionRequest;
  } | null = null;

  // ACP 回调 — 外部调用
  async onPermissionRequest(request): Promise<string | null> {
    return new Promise((resolve) => {
      this.pendingPermission = { resolve, request };
      this.notifyListeners();  // 触发 UI 显示 dialog
    });
  }

  // UI 回调 — PermissionDialog 调用
  resolvePermission(optionId: string | null): void {
    this.pendingPermission.resolve(optionId);  // 解析 Promise
    this.pendingPermission = null;
    this.notifyListeners();  // 触发 UI 隐藏 dialog
  }
}
```

#### 2.2.3 模态主题一致性

三个模态使用不同的主题色调来传达语义：

| 模态 | 边框色 | 标题色 | 语义 |
|------|--------|--------|------|
| PermissionDialog | `base.warning` (黄) | `base.warning` (黄) | 警告/需要注意 |
| CommandPalette | `base.info` (蓝) | `base.info` (蓝) | 信息/中性 |
| FilePicker | `base.success` (绿) | `base.success` (绿) | 正常操作 |

#### 2.2.4 Autocomplete 补全管线

**文件**: `flitter-core/src/widgets/autocomplete.ts`

```
Autocomplete (StatefulWidget)
├── _detectTrigger(): 光标前 100 字符扫描 triggerCharacter
├── _buildOptions(trigger, query): 调用 optionsBuilder → 支持 async
├── _applyOptions(options, query): fuzzyMatch 过滤 → 最多 maxOptionsVisible(10)
├── _selectOption(option): 替换 trigger...cursor 区间 → triggerChar + option.value
└── build():
    _isVisible ? Column [optionsView, child] : child
    
fuzzyMatch(query, text): 子序列匹配（case-insensitive）
  "abc" matches "a-big-cat" ✓
  "abc" matches "xyz" ✗
```

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|----------|-------------|---------|------|
| **Overlay 互斥模型** | if-else if 优先级分支，同时最多 1 个 overlay | 完全一致 | ✅ 一致 | App.build() 中实现完全相同的互斥逻辑 |
| **Overlay 定位** | Stack(fit:'expand') + Positioned(全屏/局部) | 完全一致 | ✅ 一致 | PermissionDialog/CommandPalette 全屏，FilePicker 局部 |
| **PermissionDialog 位置** | 全屏覆盖，内容垂直居中 | 全屏覆盖，mainAxisAlignment:'center' | ✅ 一致 | |
| **CommandPalette 位置** | 全屏覆盖，内容顶部偏移 | 全屏覆盖，mainAxisAlignment:'start' + SizedBox(h:2) | ✅ 一致 | |
| **FilePicker 位置** | Positioned(left:1, bottom:3) 局部浮动 | 完全一致 | ✅ 一致 | |
| **焦点转移** | FocusScope(autofocus:true) 在模态 Widget 内 | 完全一致 | ✅ 一致 | 三个模态都包裹 FocusScope(autofocus:true) |
| **焦点恢复** | 无显式焦点恢复栈，依赖 FocusManager 隐式回退 | 相同：依赖 FocusNode.dispose() 后的隐式回退 | ⚠️ 基本一致 | Amp 原始实现也没有焦点恢复栈 |
| **Escape 逐层关闭** | App 根 FocusScope.onKey 中按优先级处理 | 完全一致 | ✅ 一致 | FilePicker → CommandPalette → PermissionDialog 顺序 |
| **Enter 确认** | SelectionList.handleKeyEvent → onSelect | 完全一致 | ✅ 一致 | Enter 在 SelectionList 层处理，不冒泡 |
| **背景遮罩 (Backdrop)** | **无 dim backdrop** — 底层内容仍可见 | **无 dim backdrop** — 底层内容仍可见 | ✅ 一致 | Amp 原始实现也没有半透明遮罩 |
| **Dialog 数据类** | Amp 有 `ab` 数据类但实际通过直接 Widget 实现模态 | flitter-core 有 Dialog 数据类但 flitter-amp **未消费** | ⚠️ 设计差异 | Dialog 数据类已实现但未被使用 |
| **CommandPalette 搜索** | Amp 原始实现有 fuzzy search 输入框 | **无搜索输入框** — 仅硬编码 3 个命令的静态列表 | 🔴 功能缺失 | Flitter 的 CommandPalette 极度简化 |
| **CommandPalette 命令数** | Amp 有 10+ 命令（model切换、线程管理、设置等） | 仅 3 个命令（clear/toggle-tools/toggle-thinking） | 🔴 功能缺失 | 缺少大量命令 |
| **FilePicker 文件遍历** | Amp 内置文件系统遍历 + glob 匹配 | 文件列表从外部传入，无内置遍历 | 🔴 功能缺失 | FilePicker 本身不负责文件发现 |
| **FilePicker 与 Autocomplete 集成** | `@` 触发 → Autocomplete → FilePicker 联动 | Autocomplete 已实现但 FilePicker 与输入框 **未集成** | 🔴 集成缺失 | TODO 注释标记了此缺失 |
| **Z-order** | Stack 绘制顺序（后添加在上） | 完全一致 | ✅ 一致 | |
| **动画/过渡** | 无动画，即时显示/移除 | 无动画，即时显示/移除 | ✅ 一致 | Amp 原始实现也没有模态动画 |
| **SelectionList Ctrl+n/p** | Amp 有 Ctrl+n/p 导航 | Flitter 有 Ctrl+n/p 导航 | ✅ 一致 | |
| **SelectionList Shift+Tab** | Amp 有 Shift+Tab 反向循环 | Flitter 有 Shift+Tab 反向循环 | ✅ 一致 | |
| **SelectionList 鼠标** | 支持点击选中+确认 | 支持 handleMouseClick(index) | ✅ 一致 | |
| **PermissionDialog 选项** | 来自 ACP PermissionRequest 动态映射 | 完全一致 | ✅ 一致 | |
| **PermissionDialog 异步模型** | Promise + resolve 模式 | 完全一致 | ✅ 一致 | AppState.onPermissionRequest / resolvePermission |
| **主题色** | PermissionDialog=warning, CommandPalette=info, FilePicker=success | 完全一致 | ✅ 一致 | 三种模态使用不同语义色 |
| **边框样式** | rounded 圆角边框 | `style: 'rounded' as any` | ⚠️ 类型问题 | BorderSide.style 类型定义可能不包含 'rounded' |
| **焦点陷阱 (Focus Trap)** | Amp 的 FocusScope 不提供严格的焦点陷阱 | 相同：FocusScope 仅夺焦，不阻止 Tab 出逃 | ⚠️ 基本一致 | 两者均无严格 focus trap |
| **Positioned 实现** | ParentDataWidget 机制 | SingleChildRenderObjectWidget + RenderPositioned | ⚠️ 实现差异 | 功能等价但实现路径不同 |
| **StackFit.expand 行为** | 非定位子节点紧约束=父尺寸 | 完全一致 | ✅ 一致 | |
| **Skill 技能浏览器** | Amp 有 Skill Modal（技能列表+invoke） | **未实现** | 🔴 功能缺失 | Amp BINARY-RE-SPEC 提到 "Skill Modal" |
| **Prompt History 浏览器** | Ctrl+R 弹出历史选择 | Ctrl+R 存在但 **无历史 UI overlay** | 🟡 部分实现 | 逻辑在但无可视化 |

---

## 4. 差异修复建议（按优先级排序）

### P0 — 核心功能缺失

#### 4.1 CommandPalette Fuzzy Search + 完整命令列表

**问题**: 当前 CommandPalette 仅有 3 个硬编码命令，无搜索功能。Amp 原版有 10+ 命令和 fuzzy search 输入框。

**修复方案**:
1. 在 CommandPalette 内添加 `TextField` 搜索框
2. 将命令列表扩展为完整的 Amp 功能集：
   - Clear conversation (Ctrl+L)
   - Toggle tool calls (Alt+T)
   - Toggle thinking
   - New thread
   - Switch model (smart/code/deep/ask)
   - Copy last response
   - Toggle dense view
   - Open thread list
   - View usage
   - Show shortcuts help
3. 使用 `fuzzyMatch()` 对命令 label 和 description 进行过滤
4. 搜索框置于命令列表上方，实时过滤

**影响文件**: `flitter-amp/src/widgets/command-palette.ts`

#### 4.2 FilePicker 文件系统遍历 + Autocomplete 集成

**问题**: FilePicker 当前不负责文件发现，且 `@` 触发的 Autocomplete 与 FilePicker overlay 未集成。

**修复方案**:
1. 创建 `FileService` 工具类，使用 `readdir` / `glob` 进行工作目录文件遍历
2. 将 `@` 触发从 Autocomplete 路径改为或同时启用 FilePicker overlay
3. 在 InputArea 内将 Autocomplete 的 `@` trigger 的 optionsBuilder 绑定到 FileService
4. 实现模糊匹配的文件路径补全

**影响文件**: `flitter-amp/src/widgets/file-picker.ts`, `flitter-amp/src/widgets/input-area.ts`, 新建 `flitter-amp/src/services/file-service.ts`

### P1 — 体验增强

#### 4.3 背景 Dim 遮罩

**问题**: 全屏 overlay 没有背景遮罩，底层内容分散注意力。

**修复方案**:
在 PermissionDialog 和 CommandPalette 的 Positioned 内部，包裹一层 `Container(color: Color.ansi256(0))` 全屏黑色背景，然后在内部居中显示模态卡片。这不是真正的半透明（终端不支持），但能有效遮挡底层内容。

```typescript
new Positioned({
  top: 0, left: 0, right: 0, bottom: 0,
  child: new Container({
    color: theme.base.background,  // 全屏背景色覆盖
    child: existingModalWidget,
  }),
});
```

**影响文件**: `flitter-amp/src/app.ts` 或各模态 Widget 内部

#### 4.4 焦点恢复栈

**问题**: 模态关闭后焦点可能不回到预期位置（如 InputArea 的 TextField）。

**修复方案**:
1. 在 AppStateWidget 中维护 `previousFocusNode: FocusNode | null`
2. 模态打开前记录当前 `FocusManager.instance.primaryFocus`
3. 模态关闭后恢复 `previousFocusNode.requestFocus()`

**影响文件**: `flitter-amp/src/app.ts`, 可能需要 `flitter-core/src/input/focus.ts` 扩展

#### 4.5 Dialog 数据类消费

**问题**: `flitter-core/src/widgets/dialog.ts` 的 Dialog 数据类已实现但未被使用。

**修复方案**:
考虑两种路径：
- **保留并消费**: 让 PermissionDialog 和 CommandPalette 内部使用 Dialog 数据类来描述配置，但这可能过度抽象
- **标记 Deprecated**: 如果直接 Widget 实现已经足够灵活，将 Dialog 数据类标记为 Deprecated

建议选择方案 B（标记 Deprecated），因为当前的直接 Widget 模式已经足够灵活。

### P2 — 代码质量

#### 4.6 BorderSide.style 类型修复

**问题**: 三个模态中使用 `style: 'rounded' as any` 进行类型断言绕过。

**修复方案**:
在 `flitter-core/src/layout/render-decorated.ts` 中将 BorderStyle 类型扩展为包含 `'rounded'`：

```typescript
type BorderStyle = 'solid' | 'double' | 'rounded' | 'dashed' | 'none';
```

**影响文件**: `flitter-core/src/layout/render-decorated.ts`

#### 4.7 Prompt History UI Overlay

**问题**: Ctrl+R 有历史逻辑但无可视化 UI。

**修复方案**:
创建 PromptHistoryPicker overlay，类似 CommandPalette 但显示历史输入列表。添加为第四个 overlay 优先级层。

**影响文件**: 新建 `flitter-amp/src/widgets/prompt-history-picker.ts`, `flitter-amp/src/app.ts`

#### 4.8 Skill 浏览器模态

**问题**: Amp 有 Skill Modal 但 Flitter 未实现。

**修复方案**:
创建 SkillBrowser overlay Widget，显示已安装 skills 列表，支持搜索和调用。

**影响文件**: 新建 `flitter-amp/src/widgets/skill-browser.ts`, `flitter-amp/src/app.ts`
