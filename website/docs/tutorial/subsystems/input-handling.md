# 输入与手势

Flitter 提供完整的键盘和鼠标输入处理系统。

## 输入解析

### VtParser

`VtParser` 将终端原始字节流解析为结构化事件：

```
原始字节 → VtParser → InputEvent (KeyEvent | MouseEvent | ResizeEvent | ...)
```

### 键盘事件

支持的键盘输入：
- 普通字符输入
- 功能键（F1-F12、方向键、Home/End 等）
- 修饰键组合（Ctrl+、Alt+、Shift+）

### 鼠标事件

使用 **SGR 鼠标协议**（终端需支持 `\x1b[?1003h` 和 `\x1b[?1006h`）：

| 事件 | SGR 编码 |
|------|---------|
| 左键按下 | `\x1b[<0;{col};{row}M` |
| 左键释放 | `\x1b[<0;{col};{row}m` |
| 鼠标移动 | `\x1b[<35;{col};{row}M` |
| 滚轮上滚 | `\x1b[<64;{col};{row}M` |
| 滚轮下滚 | `\x1b[<65;{col};{row}M` |

## 手势系统

### HitTest

当鼠标事件到达时，框架执行 **命中测试**：

1. 从 RenderObject 树的根开始
2. 检查鼠标坐标是否在当前节点的布局区域内
3. 递归检查子节点（后绘制的在前，实现 z-order）
4. 收集所有命中的节点，形成 HitTest 路径

### MouseRegion

```ts
MouseRegion({
  onEnter: () => { /* 鼠标进入 */ },
  onExit: () => { /* 鼠标离开 */ },
  onHover: (event) => { /* 鼠标移动 */ },
  child: Text('Hover me'),
})
```

### GestureDetector

```ts
GestureDetector({
  onTap: () => { /* 点击 */ },
  child: Text('Click me'),
})
```

## 焦点管理

框架提供焦点系统，管理键盘输入的路由目标：
- 焦点节点接收键盘事件
- Tab 键在可聚焦节点间切换
- `TextField` 等 Widget 自动管理焦点
- `Focus` Widget 提供声明式焦点管理

## 双击检测

MouseManager 内置双击检测（`_calculateClickCount`），在 300ms 窗口内的连续点击会累加 `clickCount`。该计数通过 `GlobalClickInfo` 传递给全局点击回调。

## 全局鼠标回调

`MouseManager` 支持注册全局回调，在所有 MouseRegion 之前触发：

```ts
// 全局释放回调（在 per-target 释放之前触发）
MouseManager.instance.addGlobalReleaseCallback(() => {
  console.log('鼠标释放');
});

// 全局点击回调（包含完整命中信息）
MouseManager.instance.addGlobalClickCallback((info) => {
  console.log(`点击位置: (${info.globalPosition.x}, ${info.globalPosition.y})`);
  console.log(`点击次数: ${info.clickCount}`);  // 双击为 2
  console.log(`命中目标数: ${info.mouseTargets.length}`);
});
```

### GlobalClickInfo

```ts
interface GlobalClickInfo {
  event: MouseEvent;
  globalPosition: { x: number; y: number };
  mouseTargets: Array<{
    target: RenderMouseRegion;
    localPosition: { x: number; y: number };
  }>;
  clickCount: number;    // 1 = 单击, 2 = 双击, 3 = 三击...
}
```
