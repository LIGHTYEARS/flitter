# HTTP Inspector — amp 对齐设计

**Date:** 2026-04-28
**Status:** Design in progress (Layer 1 approved)

## Overview

Flitter 已有 `WidgetTreeDebugger` (HTTP inspector) 和 `WidgetREPLServer` (Unix socket REPL) 的实现，但未接入运行时生命周期。本设计的目标是：

1. 补齐 `sendDebugData` 基础设施（Widget 和 RenderObject 基类）
2. 将 inspector 接入 `WidgetsBinding` 生命周期
3. 接入按键记录
4. 验证序列化完整性

激活方式：环境变量 `FLITTER_INSPECTOR=1`（和 amp 的 `--inspector` flag 对齐，但用环境变量而非 CLI flag，因为 flitter 的 CLI 参数由外部框架管理）。

## amp 参考

| amp 组件 | 逆向位置 | flitter 对应 |
|----------|---------|-------------|
| class `aA` | modules/2101_unknown_aA.js / chunk-004:2706 | `WidgetTreeDebugger` |
| Widget base `_debugData` | modules/0536_unknown_Mn.js:3 | `packages/tui/src/tree/widget.ts` (待添加) |
| RenderObject base `_debugData` | modules/0533_unknown_vH.js:8 | `packages/tui/src/tree/render-object.ts` (待添加) |
| `aA.recordKeystroke` | chunk-004:2780 | `WidgetTreeDebugger.recordKeystroke()` (已实现，未接入) |
| `aA.start(rootElement)` | chunk-004:2712 | `WidgetTreeDebugger.start()` (已实现，未接入生命周期) |
| `initWidgetREPL` | chunk-004:29470 | `WidgetREPLServer` (已实现，未接入) |
| 激活条件 | chunk-004:30211 `process.env.AMP_INSPECTOR_ENABLED` | `FLITTER_INSPECTOR=1` |
| Container `sendDebugData` | chunk-004 O9.performLayout | `container.ts:140` (已实现) |
| RichText/Text `sendDebugData` | 逆向 Text widget constructor | 待添加 |
| Padding `sendDebugData` | 逆向 Padding performLayout | 待添加 |

## Layer 1: 基础层 — sendDebugData 基础设施

### 1.1 Widget base class 添加 debugData

**文件:** `packages/tui/src/tree/widget.ts`

```typescript
// amp 逆向: modules/0536_unknown_Mn.js:3-18
class Widget {
  key;
  _debugData: Record<string, unknown> = {};

  sendDebugData(data: Record<string, unknown>): void {
    this._debugData = { ...this._debugData, ...data };
  }

  get debugData(): Record<string, unknown> {
    return this._debugData;
  }
}
```

amp 中 Widget.sendDebugData 的调用时机是 **构造函数中**（Text widget 调用 `this.sendDebugData({ text })`）。

### 1.2 RenderObject base class 添加 debugData

**文件:** `packages/tui/src/tree/render-object.ts`

```typescript
// amp 逆向: modules/0533_unknown_vH.js:8-18
class RenderObject {
  _debugData: Record<string, unknown> = {};

  sendDebugData(data: Record<string, unknown>): void {
    this._debugData = { ...this._debugData, ...data };
  }

  get debugData(): Record<string, unknown> {
    return this._debugData;
  }
}
```

amp 中 RenderObject.sendDebugData 的调用时机是 **performLayout 中**（Container 和 Padding）。

### 1.3 移除 RenderBox 中的 no-op stub

**文件:** `packages/tui/src/tree/render-box.ts` (line 261)

移除当前的空方法 `sendDebugData(_data: Record<string, unknown>): void {}`，因为基类已经提供了实际实现。

### 1.4 扩展 sendDebugData 调用站点

匹配 amp 的 3 个调用站点：

| 调用站点 | 位置 | 数据 | 时机 |
|----------|------|------|------|
| RichText widget | `packages/tui/src/widgets/rich-text.ts` 构造函数 | `{ text: serializedSpan }` | constructor |
| Container RO | `packages/tui/src/widgets/container.ts:140` | `{ margin, padding, decoration, width, height, constraints }` | performLayout (已实现) |
| Padding RO | `packages/tui/src/widgets/padding.ts` performLayout | `{ padding }` | performLayout |

## Layer 2: 生命周期集成

### 2.1 WidgetsBinding.runApp() 中启动 inspector

**文件:** `packages/tui/src/binding/widgets-binding.ts`

在 `runApp()` 方法中，root element mount 完成后启动 inspector：

```typescript
// 逆向: chunk-004:30211-30212
//   if (l) process.env.AMP_INSPECTOR_ENABLED = "1";
//   let o = new aA(l, 1000, R.inspectorPort),
// amp 在 renderApp 顶层创建 aA 实例，通过 --inspector flag 控制 enabled

async runApp(widget: Widget, opts?: RunAppOptions): Promise<void> {
  // ... existing code ...
  
  // After rootElement mount:
  const inspectorEnabled = process.env.FLITTER_INSPECTOR === "1";
  const inspectorPort = parseInt(process.env.FLITTER_INSPECTOR_PORT || "9876", 10);
  const debugger_ = new WidgetTreeDebugger(inspectorEnabled, 1000, inspectorPort);
  debugger_.start(this.rootElement!);
  
  // ... existing code ...
  
  // In cleanup:
  debugger_.stop();
}
```

### 2.2 WidgetREPLServer 同步启动

**文件:** `packages/tui/src/binding/widgets-binding.ts`

```typescript
// 逆向: chunk-004:29470 — initWidgetREPL guards on --inspector flag
if (inspectorEnabled) {
  const repl = new WidgetREPLServer(this.rootElement!);
  repl.start();
  // cleanup: repl.stop();
}
```

### 2.3 环境变量设计

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `FLITTER_INSPECTOR` | `undefined` (disabled) | 设为 `"1"` 启用 HTTP inspector + REPL |
| `FLITTER_INSPECTOR_PORT` | `9876` | HTTP inspector 监听端口 |

amp 对应: `--inspector` CLI flag → 内部设 `process.env.AMP_INSPECTOR_ENABLED = "1"`。

## Layer 3: 按键记录接入

### 3.1 接入 WidgetsBinding.handleKeyEvent()

**文件:** `packages/tui/src/binding/widgets-binding.ts`

在 `handleKeyEvent()` 中调用 `WidgetTreeDebugger.recordKeystroke()`：

```typescript
// 逆向: amp 的 handleKeyEvent 在处理完成后调用 aA.recordKeystroke
handleKeyEvent(event: KeyEvent): void {
  // ... existing event processing ...
  const handled = FocusManager.instance.handleKeyEvent(event);
  
  // Record keystroke for inspector
  WidgetTreeDebugger.recordKeystroke(
    event.key,
    this._getFocusPath(),
    handled,
  );
}
```

### 3.2 焦点路径提取

```typescript
private _getFocusPath(): string[] {
  // Walk from focused node up to root, collect debugLabels
  const path: string[] = [];
  let node = FocusManager.instance.primaryFocus;
  while (node) {
    path.unshift(node.debugLabel ?? node.constructor.name);
    node = node.parent;
  }
  return path;
}
```

## Layer 4: 序列化验证

### 4.1 验证 getDebugData() 整合

`WidgetTreeDebugger.getDebugData(element, ro)` 已实现，合并 `element.widget.debugData` 和 `ro.debugData`。Layer 1 完成后，此方法将能够获取到实际数据。

### 4.2 验证清单

实现完成后，用 curl 验证各端点输出符合预期：

```bash
FLITTER_INSPECTOR=1 bun run src/main.ts &
sleep 2

# Health check
curl -s http://localhost:9876/health | jq .
# Expected: { "status": "ok", "enabled": true }

# Widget tree — 验证 debugData 字段存在
curl -s http://localhost:9876/widget-tree | jq '.rootRenderObject.debugData'
# Container 节点应包含 { margin, padding, decoration, width, height, constraints }

# Focus tree
curl -s http://localhost:9876/focus-tree | jq '.rootScope'
# 应展示完整焦点树结构
```

### 4.3 amp 序列化格式对照

确保 `renderObjectToRenderTreeDebugInfo` 输出字段与 amp 的 `aA.renderObjectToRenderTreeDebugInfo` 完全一致：

```json
{
  "id": "inspector-0",
  "type": "RenderFlex",
  "constraints": { "minWidth": 0, "maxWidth": 80, "minHeight": 0, "maxHeight": 24 },
  "size": { "width": 80, "height": 24 },
  "offset": { "x": 0, "y": 0 },
  "needsLayout": false,
  "needsPaint": false,
  "properties": {},
  "debugData": { "margin": null, "padding": { "top": 1, "right": 2, "bottom": 1, "left": 2 } },
  "elementId": "inspector-1",
  "children": []
}
```

## 修改文件清单

| 文件 | 修改 |
|------|------|
| `packages/tui/src/tree/widget.ts` | 添加 `_debugData`, `sendDebugData()`, `get debugData()` |
| `packages/tui/src/tree/render-object.ts` | 添加 `_debugData`, `sendDebugData()`, `get debugData()` |
| `packages/tui/src/tree/render-box.ts` | 移除 no-op `sendDebugData` stub |
| `packages/tui/src/widgets/rich-text.ts` | 构造函数中调用 `sendDebugData({ text })` |
| `packages/tui/src/widgets/padding.ts` | performLayout 中调用 `sendDebugData({ padding })` |
| `packages/tui/src/binding/widgets-binding.ts` | 启动 inspector/REPL，接入 keystroke 记录 |

## 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 激活方式 | 环境变量 `FLITTER_INSPECTOR=1` | flitter CLI 参数由外部框架管理，环境变量更灵活 |
| API 格式 | 纯 JSON (无 HTML/Web UI) | 与 amp 一致，保持简单 |
| 端口 | 9876 (可配置) | amp 默认端口 |
| 扫描间隔 | 1000ms | amp 默认值 |
| REPL 协议 | Unix socket (现有实现) | 与 amp 一致 |
| sendDebugData 是否 gate | 否 — 始终执行 | amp 不 gate；对象属性 spread 开销可忽略；gate 会增加代码复杂度 |

## Acceptance Scenarios

### Scenario 1: 开发者启动 inspector 并查看 widget tree
```
Given flitter 应用未运行
When 开发者执行 FLITTER_INSPECTOR=1 bun run src/main.ts
And WidgetsBinding.runApp() 检测到环境变量 FLITTER_INSPECTOR=1
And 创建 WidgetTreeDebugger(enabled=true) 并调用 start(rootElement)
And HTTP server 在 localhost:9876 开始监听
And 周期扫描每 1000ms 序列化一次 widget tree
Then 开发者 curl http://localhost:9876/health 返回 {"status":"ok","enabled":true}
And curl http://localhost:9876/widget-tree 返回完整的 JSON widget tree 快照
```

### Scenario 2: debugData 在 tree 中正确传播
```
Given inspector 已启动，界面包含 Container + RichText widgets
When 周期扫描执行
And Container.performLayout 已调用 sendDebugData({margin, padding, ...})
And RichText 构造函数已调用 sendDebugData({text})
Then /widget-tree 响应中 Container 对应的 render node 包含 debugData.padding
And RichText 对应的 widget node 包含 debugData.text
```

### Scenario 3: 按键事件被记录
```
Given inspector 已启动
When 用户按下 'j' 键
And WidgetsBinding.handleKeyEvent 处理该事件
And 调用 WidgetTreeDebugger.recordKeystroke("j", focusPath, handled)
Then /widget-tree 响应中 recentKeystrokes 数组包含该按键记录
And 记录包含 timestamp、key="j"、focusPath 和 handled 字段
```

### Scenario 4: inspector 未启用时零开销
```
Given FLITTER_INSPECTOR 环境变量未设置
When 应用正常启动
Then 不创建 HTTP server，不监听端口
And sendDebugData 调用仍然执行（数据存储到对象上），但无扫描消耗
And 应用性能不受影响
```

### Scenario 5: 自定义端口
```
Given 开发者设置 FLITTER_INSPECTOR=1 FLITTER_INSPECTOR_PORT=8080
When 应用启动
Then HTTP server 在 localhost:8080 监听
And curl http://localhost:8080/health 返回正常
```

### Scenario 6: 应用退出时 inspector 清理
```
Given inspector 正在运行
When 应用退出（用户 Ctrl+C 或正常结束）
And WidgetsBinding cleanup 执行
And 调用 debugger_.stop()
Then HTTP server 关闭，端口释放
And 定时扫描停止
And WidgetTreeDebugger._instance 设为 null
```
