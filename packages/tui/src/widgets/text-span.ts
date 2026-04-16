/**
 * 样式化文本树节点。
 *
 * {@link TextSpan} 支持嵌套子节点构建富文本，每个节点可携带可选文本内容和样式。
 * 通过 {@link TextSpan.toPlainText | toPlainText()} 递归拼接纯文本，
 * 通过 {@link TextSpan.visitTextSpan | visitTextSpan()} 深度优先遍历。
 *
 * @example
 * ```ts
 * const span = new TextSpan({
 *   text: "Hello ",
 *   style: new TextStyle({ bold: true }),
 *   children: [
 *     new TextSpan({ text: "World", style: new TextStyle({ italic: true }) }),
 *   ],
 * });
 * span.toPlainText(); // "Hello World"
 * ```
 *
 * @module
 */

import type { TextStyle } from "../screen/text-style.js";

/**
 * 样式化文本树节点。
 *
 * 支持嵌套子节点构建富文本，每个节点可携带可选文本内容和样式。
 */
export class TextSpan {
  /** 当前节点的文本内容 */
  readonly text?: string;
  /** 当前节点的文本样式 */
  readonly style?: TextStyle;
  /** 子 TextSpan 节点列表 */
  readonly children?: TextSpan[];
  /** OSC 8 超链接 URL。逆向: amp G.hyperlink */
  readonly url?: string;
  /** 点击回调。逆向: amp G.onClick */
  readonly onTap?: () => void;

  /**
   * 创建 TextSpan 实例。
   *
   * @param options - 配置选项
   * @param options.text - 文本内容
   * @param options.style - 文本样式
   * @param options.children - 子节点列表
   * @param options.url - OSC 8 超链接 URL
   * @param options.onTap - 点击回调
   */
  constructor(options: {
    text?: string;
    style?: TextStyle;
    children?: TextSpan[];
    url?: string;
    onTap?: () => void;
  }) {
    this.text = options.text;
    this.style = options.style;
    this.children = options.children;
    this.url = options.url;
    this.onTap = options.onTap;
  }

  /**
   * 递归拼接所有文本节点为纯文本字符串。
   *
   * 先拼接自身 text，再依次拼接所有子节点的 toPlainText 结果。
   *
   * @returns 拼接后的纯文本字符串
   *
   * @example
   * ```ts
   * new TextSpan({ text: "A", children: [new TextSpan({ text: "B" })] }).toPlainText();
   * // "AB"
   * ```
   */
  toPlainText(): string {
    let result = this.text ?? "";
    if (this.children) {
      for (const child of this.children) {
        result += child.toPlainText();
      }
    }
    return result;
  }

  /**
   * 深度优先遍历所有 TextSpan 节点。
   *
   * visitor 返回 false 时停止遍历。
   *
   * @param visitor - 访问回调，对每个节点调用，返回 false 停止遍历
   * @returns 遍历是否完成（未被中断则返回 true）
   *
   * @example
   * ```ts
   * const texts: string[] = [];
   * span.visitTextSpan((s) => { texts.push(s.text ?? ""); return true; });
   * ```
   */
  visitTextSpan(visitor: (span: TextSpan) => boolean): boolean {
    if (!visitor(this)) return false;
    if (this.children) {
      for (const child of this.children) {
        if (!child.visitTextSpan(visitor)) return false;
      }
    }
    return true;
  }

  /**
   * 递归值相等比较。
   *
   * 比较 text、style 和 children（递归）三个字段。
   *
   * @param other - 待比较的 TextSpan
   * @returns 结构与内容完全相同时返回 true
   */
  equals(other: TextSpan): boolean {
    if (this.text !== other.text) return false;
    // 样式比较
    if (this.style && other.style) {
      if (!this.style.equals(other.style)) return false;
    } else if (this.style !== other.style) {
      return false;
    }
    // 子节点比较
    const myChildren = this.children ?? [];
    const otherChildren = other.children ?? [];
    if (myChildren.length !== otherChildren.length) return false;
    for (let i = 0; i < myChildren.length; i++) {
      if (!myChildren[i].equals(otherChildren[i])) return false;
    }
    return true;
  }
}
