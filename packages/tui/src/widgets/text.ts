/**
 * 便捷文本 Widget。
 *
 * {@link Text} 是单样式纯文本的简写 Widget，内部构建
 * {@link RichText} + {@link TextSpan}。
 *
 * @example
 * ```ts
 * const text = new Text({ data: "Hello World" });
 * const styled = new Text({
 *   data: "Bold text",
 *   style: new TextStyle({ bold: true }),
 * });
 * ```
 *
 * @module
 */

import { StatelessWidget, type BuildContext } from "../tree/stateless-widget.js";
import type { Widget as WidgetInterface } from "../tree/element.js";
import type { Key } from "../tree/widget.js";
import { TextStyle } from "../screen/text-style.js";
import { TextSpan } from "./text-span.js";
import { RichText } from "./rich-text.js";

/** Text 构造函数参数。 */
interface TextArgs {
  /** 可选标识键 */
  key?: Key;
  /** 文本内容 */
  data: string;
  /** 可选文本样式 */
  style?: TextStyle;
}

/**
 * 便捷文本 Widget。
 *
 * 单样式纯文本的简写，内部构建 RichText + TextSpan。
 */
export class Text extends StatelessWidget {
  /** 文本内容 */
  readonly data: string;
  /** 可选文本样式 */
  readonly style?: TextStyle;

  /**
   * 创建 Text Widget。
   *
   * @param args - 配置参数
   */
  constructor(args: TextArgs) {
    super({ key: args.key });
    this.data = args.data;
    this.style = args.style;
  }

  /**
   * 构建子 Widget。
   *
   * 返回包含 TextSpan 的 RichText Widget。
   *
   * @param _context - 构建上下文（未使用）
   * @returns RichText Widget 实例
   */
  build(_context: BuildContext): WidgetInterface {
    return new RichText({
      text: new TextSpan({ text: this.data, style: this.style }),
    }) as unknown as WidgetInterface;
  }
}
