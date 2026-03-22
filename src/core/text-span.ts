// Amp ref: amp-strings.txt (TextSpan tree for styled text)
// A tree structure for styled text. Each node has optional text, style, and children.

import { TextStyle } from './text-style.js';
import { stringWidth } from './wcwidth.js';

/** OSC 8 terminal hyperlink descriptor. */
export interface TextSpanHyperlink {
  readonly uri: string;
  readonly id?: string;
}

export class TextSpan {
  readonly text?: string;
  readonly style?: TextStyle;
  readonly children?: readonly TextSpan[];
  readonly hyperlink?: TextSpanHyperlink;
  readonly onClick?: () => void;

  constructor(opts?: {
    text?: string;
    style?: TextStyle;
    children?: TextSpan[];
    hyperlink?: TextSpanHyperlink;
    onClick?: () => void;
  }) {
    this.text = opts?.text;
    this.style = opts?.style;
    this.children = opts?.children ? Object.freeze([...opts.children]) : undefined;
    this.hyperlink = opts?.hyperlink;
    this.onClick = opts?.onClick;
  }

  /**
   * Visit each text segment with its effective (merged) style, hyperlink, and onClick.
   * Callback receives (text, style, hyperlink, onClick) for each text segment in tree order.
   * parentStyle is the inherited style from ancestors.
   * parentHyperlink is the inherited hyperlink from ancestors.
   * parentOnClick is the inherited onClick from ancestors.
   */
  visitChildren(
    visitor: (
      text: string,
      style: TextStyle,
      hyperlink?: TextSpanHyperlink,
      onClick?: () => void,
    ) => void,
    parentStyle?: TextStyle,
    parentHyperlink?: TextSpanHyperlink,
    parentOnClick?: () => void,
  ): void {
    // Compute effective style by merging parent style with this node's style
    const effectiveStyle = this._computeEffectiveStyle(parentStyle);
    // Compute effective hyperlink: this node's overrides parent's
    const effectiveHyperlink = this.hyperlink !== undefined ? this.hyperlink : parentHyperlink;
    // Compute effective onClick: this node's overrides parent's
    const effectiveOnClick = this.onClick !== undefined ? this.onClick : parentOnClick;

    // Visit this node's text if present
    if (this.text !== undefined && this.text.length > 0) {
      visitor(this.text, effectiveStyle, effectiveHyperlink, effectiveOnClick);
    }

    // Visit children with the effective values as their parent
    if (this.children) {
      for (const child of this.children) {
        child.visitChildren(visitor, effectiveStyle, effectiveHyperlink, effectiveOnClick);
      }
    }
  }

  /**
   * Extract all text content without any styling, in tree order.
   */
  toPlainText(): string {
    const parts: string[] = [];
    this._collectPlainText(parts);
    return parts.join('');
  }

  /**
   * Compute the display width in terminal columns.
   * Handles CJK characters (width 2), control chars (width 0), regular chars (width 1).
   */
  computeWidth(): number {
    return stringWidth(this.toPlainText());
  }

  /**
   * Deep structural comparison of two TextSpan trees.
   * Compares text, style (via TextStyle.equals), hyperlink, onClick identity,
   * and recursively compares children arrays.
   */
  equals(other: TextSpan): boolean {
    // Compare text
    if (this.text !== other.text) return false;

    // Compare style
    if (this.style === undefined && other.style === undefined) {
      // both undefined, ok
    } else if (this.style !== undefined && other.style !== undefined) {
      if (!this.style.equals(other.style)) return false;
    } else {
      return false;
    }

    // Compare hyperlink
    if (this.hyperlink === undefined && other.hyperlink === undefined) {
      // both undefined, ok
    } else if (this.hyperlink !== undefined && other.hyperlink !== undefined) {
      if (this.hyperlink.uri !== other.hyperlink.uri) return false;
      if (this.hyperlink.id !== other.hyperlink.id) return false;
    } else {
      return false;
    }

    // Compare onClick by reference identity
    if (this.onClick !== other.onClick) return false;

    // Compare children
    if (this.children === undefined && other.children === undefined) {
      // both undefined, ok
    } else if (this.children !== undefined && other.children !== undefined) {
      if (this.children.length !== other.children.length) return false;
      for (let i = 0; i < this.children.length; i++) {
        if (!this.children[i]!.equals(other.children[i]!)) return false;
      }
    } else {
      return false;
    }

    return true;
  }

  toString(): string {
    const parts: string[] = [];
    if (this.text !== undefined) parts.push(`text: "${this.text}"`);
    if (this.style !== undefined) parts.push(`style: ${this.style}`);
    if (this.hyperlink !== undefined) parts.push(`hyperlink: ${this.hyperlink.uri}`);
    if (this.onClick !== undefined) parts.push(`onClick: [Function]`);
    if (this.children !== undefined && this.children.length > 0) {
      parts.push(`children: [${this.children.length}]`);
    }
    return `TextSpan(${parts.join(', ')})`;
  }

  private _computeEffectiveStyle(parentStyle?: TextStyle): TextStyle {
    if (parentStyle === undefined && this.style === undefined) {
      return new TextStyle();
    }
    if (parentStyle === undefined) {
      return this.style!;
    }
    if (this.style === undefined) {
      return parentStyle;
    }
    return parentStyle.merge(this.style);
  }

  private _collectPlainText(parts: string[]): void {
    if (this.text !== undefined) {
      parts.push(this.text);
    }
    if (this.children) {
      for (const child of this.children) {
        child._collectPlainText(parts);
      }
    }
  }
}
