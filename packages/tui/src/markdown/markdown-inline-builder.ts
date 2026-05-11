/**
 * Markdown 内联节点构建器 — mdast PhrasingContent → TextSpan。
 *
 * 将 mdast 内联节点（text, strong, emphasis, delete, inlineCode, link, image, break）
 * 递归转换为 TextSpan 树。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1450-1640
 *   Z3.processInline 递归处理各内联类型，应用 style.copyWith 叠加格式。
 *
 * @module
 */

import type { PhrasingContent } from "mdast";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "../widgets/text-span.js";
import type { MarkdownTheme } from "./markdown-theme.js";
import type { Color } from "../screen/color.js";

/**
 * 内联构建上下文。
 */
export interface InlineContext {
  /** 当前继承样式 */
  style: TextStyle;
  /** Markdown 主题 */
  theme: MarkdownTheme;
  /** 可选: 位置感知颜色变换 (用于流式渲染染色) */
  colorTransform?: (offset: number, baseColor: Color) => Color;
  /** 内部链接计数器 (用于 hyperlink ID 生成) */
  _linkIndex?: number;
}

/**
 * 将 mdast 内联节点数组构建为包含所有子 span 的根 TextSpan。
 *
 * @param nodes - mdast PhrasingContent 节点数组
 * @param ctx - 内联构建上下文
 * @returns 根 TextSpan（children 为各内联节点的 span）
 */
export function buildInline(nodes: PhrasingContent[], ctx: InlineContext): TextSpan {
  const children = nodes.map((node) => buildInlineNode(node, ctx));
  return new TextSpan({ children, style: ctx.style });
}

/**
 * 递归处理单个内联节点。
 *
 * @param node - mdast PhrasingContent 节点
 * @param ctx - 内联构建上下文
 * @returns 对应的 TextSpan
 */
function buildInlineNode(node: PhrasingContent, ctx: InlineContext): TextSpan {
  switch (node.type) {
    case "text":
      return new TextSpan({ text: node.value, style: ctx.style });

    case "strong": {
      const childStyle = ctx.style.copyWith({ bold: true });
      const childCtx: InlineContext = { ...ctx, style: childStyle };
      const children = node.children.map((c) => buildInlineNode(c as PhrasingContent, childCtx));
      return new TextSpan({ children, style: childStyle });
    }

    case "emphasis": {
      const childStyle = ctx.style.copyWith({ italic: true });
      const childCtx: InlineContext = { ...ctx, style: childStyle };
      const children = node.children.map((c) => buildInlineNode(c as PhrasingContent, childCtx));
      return new TextSpan({ children, style: childStyle });
    }

    case "delete": {
      const childStyle = ctx.style.copyWith({ strikethrough: true });
      const childCtx: InlineContext = { ...ctx, style: childStyle };
      const children = node.children.map((c) => buildInlineNode(c as PhrasingContent, childCtx));
      return new TextSpan({ children, style: childStyle });
    }

    case "inlineCode":
      return new TextSpan({ text: node.value, style: ctx.theme.inlineCode });

    case "link": {
      const linkIndex = ctx._linkIndex ?? 0;
      ctx._linkIndex = linkIndex + 1;
      const linkStyle = ctx.theme.link;
      const childCtx: InlineContext = { ...ctx, style: linkStyle };
      const children = node.children.map((c) => buildInlineNode(c as PhrasingContent, childCtx));
      return new TextSpan({
        children,
        style: linkStyle,
        url: node.url,
      });
    }

    case "image": {
      const alt = node.alt || "image";
      const imageStyle = ctx.theme.link.copyWith({ italic: true });
      return new TextSpan({ text: `[Image: ${alt}]`, style: imageStyle });
    }

    case "break":
      return new TextSpan({ text: "\n" });

    default:
      // 未知内联节点 — 尝试提取文本
      if ("value" in node && typeof (node as any).value === "string") {
        return new TextSpan({ text: (node as any).value, style: ctx.style });
      }
      if ("children" in node && Array.isArray((node as any).children)) {
        const children = (node as any).children.map((c: any) => buildInlineNode(c, ctx));
        return new TextSpan({ children, style: ctx.style });
      }
      return new TextSpan({ text: "", style: ctx.style });
  }
}

/**
 * 生成 OSC 8 hyperlink ID。
 *
 * 使用 DJB2 hash 算法，对齐 amp 的 eE0() 实现。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:~1590
 *
 * @param url - 链接 URL
 * @param index - 链接在文档中的序号
 * @returns `md-${hash}` 格式的 ID
 */
export function generateHyperlinkId(url: string, index: number): string {
  let hash = 5381;
  const str = `${url}:${index}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return `md-${(hash >>> 0).toString(36)}`;
}
