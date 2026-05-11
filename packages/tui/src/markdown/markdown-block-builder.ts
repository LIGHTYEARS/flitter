/**
 * Markdown 块级节点构建器 — mdast Content → Widget[]。
 *
 * 将 mdast 块级节点（paragraph, heading, code, blockquote, list, table,
 * thematicBreak, html）映射为 TUI Widget 树。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1300-1450
 *   Z3.build() 返回 Column({ children: blocks.map(processBlock) })。
 *
 * @module
 */

import type { Content, List, ListItem, Node, Table as MdastTable } from "mdast";
import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "../widgets/text-span.js";
import { RichText } from "../widgets/rich-text.js";
import { Column } from "../widgets/column.js";
import { Row } from "../widgets/row.js";
import { Container } from "../widgets/container.js";
import { Expanded } from "../widgets/flexible.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { SizedBox } from "../widgets/sized-box.js";
import { Table } from "../widgets/table.js";
import type { TableRow, TableColumnConfig } from "../widgets/table.js";
import { Widget } from "../tree/widget.js";
import { buildInline, type InlineContext } from "./markdown-inline-builder.js";
import type { MarkdownTheme } from "./markdown-theme.js";
import { SyntaxHighlighter } from "./syntax-highlight.js";

/**
 * 块级构建上下文。
 */
export interface BlockContext {
  /** Markdown 渲染主题 */
  theme: MarkdownTheme;
  /** 当前基础文本样式 */
  style: TextStyle;
  /** 是否处于流式渲染模式 */
  streaming: boolean;
  /** 可选: 位置感知颜色变换 */
  colorTransform?: (offset: number, baseColor: Color) => Color;
}

/**
 * 判断两个相邻节点之间是否存在空行。
 *
 * 通过比较下一个节点的起始行号和前一个节点的结束行号来判断。
 * 如果差值 > 1，说明中间有空行。无 position 信息时默认视为有空行。
 *
 * 逆向: amp Z3 在块之间插入 spacing widget 的判断逻辑。
 *
 * @param prev - 前一个节点
 * @param next - 下一个节点
 * @returns 是否存在空行
 */
export function hasBlankLineBetween(prev: Node, next: Node): boolean {
  if (!prev.position || !next.position) {
    return true;
  }
  return next.position.start.line - prev.position.end.line > 1;
}

/**
 * 将 mdast 块级节点数组构建为 Widget 数组。
 *
 * 遍历 nodes，逐个映射为 Widget。在相邻有空行的块之间插入 SizedBox({ height: 1 })。
 *
 * 逆向: amp Z3.build() — blocks.map(processBlock) + spacing 逻辑。
 *
 * @param nodes - mdast Content 节点数组
 * @param ctx - 块级构建上下文
 * @returns Widget 数组
 */
export function buildBlocks(nodes: Content[], ctx: BlockContext): Widget[] {
  const widgets: Widget[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const widget = buildBlock(node, ctx);
    if (widget === null) continue;

    // 在相邻有空行的块之间插入间隔
    if (widgets.length > 0 && i > 0) {
      const prev = nodes[i - 1];
      if (hasBlankLineBetween(prev, node)) {
        widgets.push(new SizedBox({ height: 1 }));
      }
    }

    widgets.push(widget);
  }

  return widgets;
}

/**
 * 将单个 mdast 块级节点映射为 Widget。
 *
 * @param node - mdast Content 节点
 * @param ctx - 块级构建上下文
 * @returns 对应的 Widget，或 null 表示跳过
 */
function buildBlock(node: Content, ctx: BlockContext): Widget | null {
  switch (node.type) {
    case "paragraph":
      return buildParagraph(node, ctx);
    case "heading":
      return buildHeading(node, ctx);
    case "code":
      return buildCode(node, ctx);
    case "blockquote":
      return buildBlockquote(node, ctx);
    case "list":
      return buildList(node, ctx);
    case "table":
      return buildTable(node, ctx);
    case "thematicBreak":
      return buildThematicBreak();
    case "html":
      return buildHtml(node, ctx);
    default:
      return null;
  }
}

/**
 * paragraph → RichText。
 */
function buildParagraph(node: { type: "paragraph"; children: any[] }, ctx: BlockContext): Widget {
  const inlineCtx = makeInlineCtx(ctx);
  return new RichText({ text: buildInline(node.children, inlineCtx) });
}

/**
 * heading → RichText（带标题颜色和粗体）。
 */
function buildHeading(
  node: { type: "heading"; depth: 1 | 2 | 3 | 4 | 5 | 6; children: any[] },
  ctx: BlockContext,
): Widget {
  const depth = node.depth;
  const color = ctx.theme.headingColors[depth - 1];
  const bold = depth <= ctx.theme.headingBoldLevels;
  const headingStyle = ctx.style.copyWith({ foreground: color, bold });
  const inlineCtx: InlineContext = {
    style: headingStyle,
    theme: ctx.theme,
    colorTransform: ctx.colorTransform,
  };
  return new RichText({ text: buildInline(node.children, inlineCtx) });
}

/**
 * code → Container 包裹高亮代码。空代码块返回 null。
 */
function buildCode(
  node: { type: "code"; value: string; lang?: string | null },
  ctx: BlockContext,
): Widget | null {
  if (node.value.trim() === "") {
    return null;
  }

  const lang = node.lang ?? "plain";
  const highlighter = new SyntaxHighlighter(ctx.theme.syntaxTheme);
  const spans = highlighter.highlight(node.value, lang);

  return new Container({
    padding: EdgeInsets.only({ left: 4, right: 4 }),
    child: new RichText({
      text: new TextSpan({ children: spans }),
    }),
  });
}

/**
 * blockquote → Container（左边框 + 左内边距）包裹递归块。
 */
function buildBlockquote(
  node: { type: "blockquote"; children: any[] },
  ctx: BlockContext,
): Widget {
  return new Container({
    padding: EdgeInsets.only({ left: 1 }),
    decoration: new BoxDecoration({
      border: new Border(
        undefined, // top
        undefined, // right
        undefined, // bottom
        new BorderSide(ctx.theme.blockquoteBorder, 1), // left
      ),
    }),
    child: new Column({ mainAxisSize: "min", children: buildBlocks(node.children as Content[], ctx) }),
  });
}

/**
 * list → Column 包裹 listItem。
 */
function buildList(node: List, ctx: BlockContext): Widget {
  const items = node.children.map((item, index) =>
    buildListItem(item, node, index, ctx),
  );
  return new Column({ mainAxisSize: "min", children: items });
}

/**
 * listItem → Row（bullet + Expanded(Column(blocks))）。
 */
function buildListItem(
  item: ListItem,
  list: List,
  index: number,
  ctx: BlockContext,
): Widget {
  let bullet: string;
  if (item.checked === true) {
    bullet = "[✓] ";
  } else if (item.checked === false) {
    bullet = "[ ] ";
  } else if (list.ordered) {
    const start = list.start ?? 1;
    bullet = `${start + index}. `;
  } else {
    bullet = "• ";
  }

  return new Row({
    crossAxisAlignment: "start",
    children: [
      new RichText({ text: new TextSpan({ text: bullet, style: ctx.style }) }),
      new Expanded({
        child: new Column({ mainAxisSize: "min", children: buildBlocks(item.children as Content[], ctx) }),
      }),
    ],
  });
}

/**
 * table → Table Widget。
 */
function buildTable(node: MdastTable, ctx: BlockContext): Widget {
  const mdRows = node.children as Array<{ type: "tableRow"; children: Array<{ type: "tableCell"; children: any[] }> }>;
  const inlineCtx = makeInlineCtx(ctx);

  // 确定列数（取第一行的 cell 数）
  const colCount = mdRows.length > 0 ? mdRows[0].children.length : 0;

  const columnConfigs: TableColumnConfig[] = Array.from({ length: colCount }, () => ({
    widthType: "proportional" as const,
  }));

  const rows: TableRow[] = mdRows.map((row) => ({
    cells: row.children.map((cell) => ({
      child: new RichText({ text: buildInline(cell.children, inlineCtx) }),
    })),
  }));

  return new Table({
    rows,
    columnConfigs,
    borderColor: ctx.theme.tableBorder,
    showBorders: true,
  });
}

/**
 * thematicBreak → RichText("---")。
 */
function buildThematicBreak(): Widget {
  return new RichText({ text: new TextSpan({ text: "---" }) });
}

/**
 * html → 去标签提取纯文本，空则返回 null。
 */
function buildHtml(node: { type: "html"; value: string }, ctx: BlockContext): Widget | null {
  const text = node.value.replace(/<[^>]*>/g, "").trim();
  if (text === "") {
    return null;
  }
  return new RichText({ text: new TextSpan({ text, style: ctx.style }) });
}

/**
 * 从 BlockContext 创建 InlineContext。
 */
function makeInlineCtx(ctx: BlockContext): InlineContext {
  return {
    style: ctx.style,
    theme: ctx.theme,
    colorTransform: ctx.colorTransform,
  };
}
