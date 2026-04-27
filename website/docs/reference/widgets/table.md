# 表格 Widget

本页涵盖 Flitter 的表格布局组件。当你需要以行列形式展示结构化数据时，会用到这些 Widget。

:::tip 快速参考：最常用表格组件
- **Table** -- 通用表格，支持固定宽度、内容自适应、弹性和比例四种列宽策略
- **HelpTable** -- 简化的两列帮助表格，适合快捷键列表等场景
:::

---

## Table

**何时使用：** 需要以行列网格形式展示数据，并支持灵活的列宽控制时使用。

:::info 类似于 HTML table
`Table` 相当于 HTML 的 `<table>`，列宽策略中的 `"flex"` 类似于 CSS 表格列的 `width: auto` 加弹性分配。
:::

> 支持固定宽度（fixed）、内容自适应（intrinsic）、弹性（flex）和比例（proportional）四种列宽策略的表格布局。可选绘制圆角边框和行列分隔线。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | `Key` | - | 可选标识键 |
| rows | `TableRow[]` | 必填 | 行数据 |
| columnConfigs | `TableColumnConfig[]` | 必填 | 列配置列表 |
| borderColor | `Color` | - | 边框颜色 |
| showBorders | `boolean` | `true` | 是否显示边框 |
| cellPadding | `EdgeInsets` | `EdgeInsets.symmetric({ horizontal: 1 })` | 单元格内边距 |

### 列宽策略 (TableColumnWidthType)

| 策略 | 说明 |
|------|------|
| `"fixed"` | 固定宽度，需设 `fixedWidth` |
| `"intrinsic"` | 根据内容自适应宽度 |
| `"flex"` | 弹性分配剩余空间 |
| `"proportional"` | 按比例分配总宽度 |

### TableColumnConfig

| 字段 | 类型 | 说明 |
|------|------|------|
| widthType | `TableColumnWidthType` | 宽度策略 |
| fixedWidth | `number` | 仅 `"fixed"` 策略必填 |

### TableRow / TableCell

```ts
interface TableRow {
  cells: TableCell[];  // 数量须与 columnConfigs.length 一致
}

interface TableCell {
  child: Widget;       // 单元格内 Widget
}
```

### 示例

```ts
new Table({
  columnConfigs: [
    { widthType: "fixed", fixedWidth: 20 },
    { widthType: "flex" },
    { widthType: "intrinsic" },
  ],
  rows: [
    {
      cells: [
        { child: new Text({ data: "Name" }) },
        { child: new Text({ data: "Description" }) },
        { child: new Text({ data: "Status" }) },
      ],
    },
    {
      cells: [
        { child: new Text({ data: "flitter" }) },
        { child: new Text({ data: "Terminal UI framework" }) },
        { child: new Text({ data: "active" }) },
      ],
    },
  ],
  borderColor: Color.rgb(100, 100, 100),
});
```

逆向: JY (Widget) + EQT (RenderObject) at layout_widgets.js:1080-1436

---

## HelpTable

**何时使用：** 需要显示快捷键列表、参数说明等简单的「左-右」两列表格时使用。

> 两列帮助表格。每行渲染为单个 RichText，左列使用空格填充到固定宽度，右列紧跟在间隔之后。匹配 amp 的 U8R 实现。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | `Key` | - | 可选标识键 |
| rows | `HelpTableRow[]` | 必填 | 表格行 |
| leftColumnWidth | `number` | `24` | 左列固定宽度 (字符数) |

### HelpTableRow

| 字段 | 类型 | 说明 |
|------|------|------|
| left | `string \| TextSpan` | 左列内容 |
| right | `string \| TextSpan` | 右列内容 |

支持纯字符串和预样式化的 TextSpan。左列不足 `leftColumnWidth` 宽度时自动填充空格，后跟 2 字符间隔（`"  "`）再接右列。

逆向: hz0 = 24（默认左列宽度），U8R at misc_utils.js:9825-9887

### 示例

```ts
// 纯字符串
new HelpTable({
  rows: [
    { left: "Ctrl+O", right: "command palette" },
    { left: "Ctrl+R", right: "prompt history" },
  ],
});

// TextSpan 样式化
new HelpTable({
  rows: [
    {
      left: new TextSpan({
        children: [
          new TextSpan({ text: "Ctrl+O", style: keyStyle }),
          new TextSpan({ text: " command palette", style: descStyle }),
        ],
      }),
      right: new TextSpan({
        children: [
          new TextSpan({ text: "Ctrl+R", style: keyStyle }),
          new TextSpan({ text: " prompt history", style: descStyle }),
        ],
      }),
    },
  ],
});
```

---

## StickyHeader

**何时使用：** 在可滚动列表中需要分组标题始终保持可见（粘在视口顶部）时使用。

> 粘性头部。在滚动视口中，当 header 的自然位置滚过视口顶部时，header "粘"在视口顶端。

| 参数 | 类型 | 说明 |
|------|------|------|
| key | `Key` | 可选标识键 |
| header | `Widget` | 头部 Widget |
| body | `Widget` | 主体内容 Widget |

逆向: d9R (Widget) + E9R (RenderObject) at chunk-006.js:28390-28456

内部为双子节点 RenderObject，child[0] = header，child[1] = body。通过 ClipScreen 的 `getClipRegion` 检测 header 是否滚出视口，若是则将其固定在视口顶部。

### 示例

```ts
new StickyHeader({
  header: new Container({
    decoration: new BoxDecoration({
      backgroundColor: Color.rgb(30, 30, 46),
    }),
    child: new Text({ data: "Section Title" }),
  }),
  body: new Column({
    children: items.map(
      (item) => new Text({ data: item })
    ),
  }),
});
```

---

> 表格教程详见 [Layout 教程](../../tutorial/subsystems/layout)。
