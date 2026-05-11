/**
 * MarkdownView — Markdown 内容渲染 Widget。
 *
 * 将 Markdown 文本解析为 mdast AST，再构建为 Widget 树。
 * 替代旧的 MarkdownParser + MarkdownRenderer → TextSpan[] 管线。
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1261-1280
 *   Z3 extends B0 (StatelessWidget)，build(context) 返回 Column({ crossAxisAlignment: "start", children })。
 *
 * @example
 * ```ts
 * new MarkdownView({ content: "# Hello\n\nWorld" })
 * // → Column > [RichText(heading), SizedBox, RichText(paragraph)]
 * ```
 *
 * @module
 */

import type { Content } from "mdast";
import type { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import { StatelessWidget } from "../tree/stateless-widget.js";
import { Key, Widget } from "../tree/widget.js";
import type { Element } from "../tree/element.js";
import { Column } from "../widgets/column.js";
import { buildBlocks, type BlockContext } from "./markdown-block-builder.js";
import { parse } from "./markdown-parser.js";
import { defaultMarkdownTheme, MarkdownThemeWidget } from "./markdown-theme.js";

/**
 * MarkdownView 构造参数。
 */
export interface MarkdownViewProps {
  /** Markdown 源文本 */
  content: string;
  /** 流式模式（过滤尾部空段落） */
  streaming?: boolean;
  /** 位置感知颜色变换回调 */
  colorTransform?: (offset: number, baseColor: Color) => Color;
  /** Widget key */
  key?: Key | undefined;
}

/**
 * Markdown 内容渲染 Widget。
 *
 * 解析 Markdown → mdast → Widget 树（Column 包含各块级 Widget）。
 *
 * 主题通过 MarkdownThemeWidget InheritedWidget 从 context 获取，
 * 找不到时使用默认主题。
 */
export class MarkdownView extends StatelessWidget {
  /** Markdown 源文本 */
  readonly content: string;
  /** 流式模式 */
  readonly streaming: boolean;
  /** 颜色变换 */
  readonly colorTransform?: (offset: number, baseColor: Color) => Color;

  constructor(props: MarkdownViewProps) {
    super({ key: props.key });
    this.content = props.content;
    this.streaming = props.streaming ?? false;
    this.colorTransform = props.colorTransform;
  }

  /**
   * 构建 Widget 树。
   *
   * 逆向: amp Z3.build(context) → Column({ crossAxisAlignment: "start", children })
   */
  build(context: BuildContext): Widget {
    // 从 context 获取主题（降级到默认）
    let theme = defaultMarkdownTheme();
    try {
      theme = MarkdownThemeWidget.of(context as unknown as Element);
    } catch {
      // context 类型不兼容时使用默认主题
    }

    // 解析 Markdown → mdast
    const ast = parse(this.content);

    // 流式模式: 过滤尾部空段落
    let children = ast.children as Content[];
    if (this.streaming && children.length > 0) {
      const last = children[children.length - 1];
      if (
        last.type === "paragraph" &&
        "children" in last &&
        Array.isArray(last.children) &&
        last.children.length === 0
      ) {
        children = children.slice(0, -1);
      }
    }

    // 构建 Widget 树
    const blockCtx: BlockContext = {
      theme,
      style: new TextStyle({}),
      streaming: this.streaming,
      colorTransform: this.colorTransform,
    };
    const widgets = buildBlocks(children, blockCtx);

    return new Column({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: widgets,
    });
  }
}
