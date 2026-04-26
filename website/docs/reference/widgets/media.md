# 媒体 Widget

本页涵盖 Flitter 的图像显示和图表渲染组件。

---

## ImageWidget

> 使用 Kitty 终端图形协议在终端中显示图像。通过 APC 分块传输将 PNG base64 数据发送给终端，并在布局区域内填充 Unicode 占位符格网。StatefulWidget，内部管理图像 ID 分配和生命周期。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | `Key` | - | 可选标识键 |
| base64Data | `string` | 必填 | PNG 图像的 base64 编码字符串 |
| mediaType | `string` | - | 媒体类型（如 `"image/png"`） |
| width | `number` | 必填 | 图像宽度（终端列数） |
| height | `number` | 必填 | 图像高度（终端行数） |
| backgroundColor | `Color` | - | 可选背景色 |
| inTmux | `boolean` | `false` | 是否在 tmux 会话内 |

### 生命周期

- `initState()` — 分配 imageId (1-255)，通过 APC 序列传输图像
- `didUpdateWidget()` — 尺寸变化时删除旧图像并重新传输
- `dispose()` — 发送 APC 删除序列释放终端侧资源
- 不支持 Kitty 协议或 imageId 分配失败时回退为空白占位盒

### 终端兼容性

支持 Kitty 图形协议的终端: Kitty、WezTerm、Konsole (部分)。
不支持的终端将显示空白区域。tmux 内需启用 `inTmux: true` 以使用 DCS passthrough 包装。

逆向: VQT (State) + XQT (RenderObjectWidget) + YQT (RenderBox) at misc_utils.js:1220-1378

```ts
new ImageWidget({
  base64Data: pngBase64,
  mediaType: "image/png",
  width: 40,
  height: 20,
});
```

---

## RenderImage

> ImageWidget 的渲染对象。在布局区域内绘制 Kitty 占位符格网。

| 属性 | 类型 | 说明 |
|------|------|------|
| imageId | `number` | Kitty 图像 ID |
| width | `number` | 格网宽度（列） |
| height | `number` | 格网高度（行） |
| backgroundColor | `Color` | 可选背景色 |

绘制时为每个终端格子写入:
- char: `PLACEHOLDER_BASE` (U+10EEEE) + 行变音符 + 列变音符
- fg: `Color.indexed(imageId)` — 终端通过前景色索引识别图像 ID
- bg: 可选背景色

### Kitty 协议工具函数 (render-image.ts)

| 函数 | 说明 |
|------|------|
| `allocateImageId()` | 分配图像 ID (1-255 循环) |
| `encodeKittyGraphicsTransmit(base64, opts)` | 生成 APC 传输序列（4096 字节/块分片） |
| `encodeKittyGraphicsDelete(id, inTmux?)` | 生成 APC 删除序列 |
| `buildPlaceholderGrid(w, h, id)` | 构建占位符格网 |
| `wrapTmux(seq)` | DCS passthrough 包装 |

**常量:**

| 名称 | 值 | 说明 |
|------|-----|------|
| `PLACEHOLDER_BASE` | `0x10EEEE` (1109742) | Kitty 占位符基础码位 |
| `CHUNK_SIZE` | `4096` | APC 分块大小（字节） |
| `DIACRITICS` | `number[]` (297 项) | Unicode 组合变音符，编码行/列索引 |

---

## RenderChart

> 独立图表渲染器，生成终端 ANSI 转义字符串行。支持 6 种图表类型，使用 Unicode 方块字符和 Braille 点阵绘制。

### ChartData

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| chartType | `string` | 必填 | 图表类型（见下表） |
| series | `ChartSeries[]` | 必填 | 数据系列 |
| xLabels | `string[]` | - | X 轴刻度标签 |
| title | `string` | - | 图表标题 |
| xAxisLabel | `string` | - | X 轴标签 |
| yAxisLabel | `string` | - | Y 轴标签 |
| valueFormatter | `(v: number) => string` | - | 自定义值格式化 |

### 图表类型

| chartType | 说明 | 绘制方式 |
|-----------|------|----------|
| `"bar"` | 柱状图 | Unicode 竖向方块 (█▇▆▅▄▃▂▁) |
| `"stacked-bar"` | 堆叠柱状图 | 同上，多系列堆叠 |
| `"line"` | 折线图 | Braille 点阵 (U+2800 基址) |
| `"sparkline"` | 迷你折线 | Braille 点阵，简化版 |
| `"stacked-area"` | 堆叠面积图 | Braille 点阵填充 |
| `"horizontal-bar"` | 水平柱状图 | Unicode 横向方块 (▏▎▍▌▋▊▉█) |

### ChartSeries

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| label | `string` | 必填 | 图例标签 |
| values | `number[]` | 必填 | 数据值 |
| color | `string` | 自动分配 | ANSI 转义颜色字符串 |

### 构造与渲染

```ts
const chart = new RenderChart(
  {
    chartType: "bar",
    series: [{ label: "Sales", values: [10, 20, 30, 25, 15] }],
    xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    title: "Weekly Sales",
  },
  {
    showAxes: true,      // 默认 true
    colors: undefined,   // 使用默认 8 色调色板
    highlightIndex: null, // 高亮数据点索引
  },
);

const lines: string[] = chart.renderToLines(80, 0); // width=80, height=auto
```

### 布局常量 (逆向)

| 常量 | 值 | 说明 |
|------|----|------|
| `MIN_HEIGHT` | 10 | 最小内容高度（行） |
| `MAX_HEIGHT` | 35 | 最大内容高度（行） |
| `ASPECT_RATIO_DIV` | 2 | 纵横比除数 (height = width / 2) |
| `Y_AXIS_WIDTH` | 8 | Y 轴标签区宽度 |
| `X_AXIS_HEIGHT` | 2 | X 轴标签区高度 |
| `MAX_LABEL_WIDTH` | 20 | 水平柱状图最大标签宽度 |
| `BRAILLE_BASE` | 0x2800 | Braille 点阵基础码位 |
| `THICK_THRESHOLD` | 8 | 折线图粗点阈值 |

### 默认调色板

green, magenta, cyan, yellow, blue, red, bright-green, bright-cyan（8 色循环）

---

> 媒体教程详见 [Widget 概览 — 媒体](../../tui/widgets#媒体)。
