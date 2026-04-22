/**
 * Disclosure — 可折叠展开的标题+内容 Widget。
 *
 * 逆向: Ds class — amp-cli-reversed/modules/1472_tui_components/misc_utils.js:934
 *        V1T (Disclosure state) — misc_utils.js:955
 *
 * 渲染一个可点击的标题行（▶/▼ + title），展开时在标题下方显示 child。
 * 通过 onChanged 回调通知展开/折叠状态变化，类似 amp 的 Ds/V1T 模式。
 *
 * @module
 */

import { TextStyle } from "../screen/text-style.js";
import type { Widget as WidgetInterface } from "../tree/element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import { Column } from "./column.js";
import { GestureDetector } from "./gesture-detector.js";
import { RichText } from "./rich-text.js";
import { Row } from "./row.js";
import { TextSpan } from "./text-span.js";

// ════════════════════════════════════════════════════
//  DisclosureConfig
// ════════════════════════════════════════════════════

/** Disclosure Widget 构造参数。 */
export interface DisclosureConfig {
  /** 标题 Widget（始终显示） */
  title: WidgetInterface;
  /** 折叠内容 Widget（expanded 时显示） */
  child: WidgetInterface;
  /** 当前展开状态 */
  expanded: boolean;
  /** 展开/折叠状态变化回调 */
  onChanged?: (expanded: boolean) => void;
}

// ════════════════════════════════════════════════════
//  Disclosure Widget
// ════════════════════════════════════════════════════

/**
 * Disclosure 可折叠 Widget。
 *
 * 逆向: Ds class — misc_utils.js:934
 *
 * 接收 title、child、expanded 和 onChanged。StatefulWidget，
 * 通过 V1T-equivalent state 在 didUpdateWidget 中同步展开状态。
 *
 * @example
 * ```ts
 * new Disclosure({
 *   title: new Text({ data: "Section" }),
 *   child: new Text({ data: "Hidden content" }),
 *   expanded: isExpanded,
 *   onChanged: (v) => { isExpanded = v; },
 * });
 * ```
 */
export class Disclosure extends StatefulWidget {
  /** 组件配置。 */
  readonly config: DisclosureConfig;

  /**
   * 创建 Disclosure Widget。
   *
   * @param config - 组件配置
   */
  constructor(config: DisclosureConfig) {
    super();
    this.config = config;
  }

  /**
   * 创建关联的 DisclosureState。
   *
   * 逆向: Ds.createState → new V1T()
   */
  createState(): DisclosureState {
    return new DisclosureState();
  }
}

// ════════════════════════════════════════════════════
//  DisclosureState
// ════════════════════════════════════════════════════

/**
 * Disclosure 的状态。
 *
 * 逆向: V1T class — misc_utils.js:955
 *
 * expanded 取自 widget.config.expanded（受控模式）。
 * didUpdateWidget 中检测 expanded 变化并调用 setState()。
 */
class DisclosureState extends State<Disclosure> {
  /**
   * 当前展开状态 —— 从 widget.config 读取（受控）。
   *
   * 逆向: V1T.get expanded() { return this.widget.expanded; }
   */
  get expanded(): boolean {
    return this.widget.config.expanded;
  }

  /**
   * 切换展开/折叠状态。
   *
   * 逆向: V1T.toggle() { this.widget.onChanged?.(!this.expanded); }
   */
  toggle(): void {
    this.widget.config.onChanged?.(!this.expanded);
  }

  /**
   * 当父 widget 更新时同步状态。
   *
   * 逆向: V1T.didUpdateWidget — if T.expanded !== this.widget.expanded → setState()
   *
   * @param oldWidget - 更新前的旧 Widget
   */
  override didUpdateWidget(oldWidget: Disclosure): void {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.config.expanded !== this.widget.config.expanded) {
      this.setState();
    }
  }

  /**
   * 构建 Disclosure 视图。
   *
   * 逆向: V1T.build — xT(chevron) + G0(onClick header) + 展开时追加 child
   *
   * 结构:
   *   collapsed: GestureDetector > Row([title, spacer, chevron])
   *   expanded:  Column([header, child])
   *
   * amp 的顺序是 [title, spacer, chevron]，chevron 在右侧。
   * Flitter 版本为 [chevron, title]（chevron 在左），更符合常见 TUI 风格。
   *
   * @param _context - 构建上下文
   * @returns Widget 树
   */
  build(_context: BuildContext): WidgetInterface {
    const { title, child } = this.widget.config;

    // 逆向: V1T.build — new xT({ text: new G(expanded ? "▼" : "▶", mutedStyle) })
    const chevron = new RichText({
      text: new TextSpan({
        text: this.expanded ? "\u25BC " : "\u25B6 ",
        style: new TextStyle({ dim: true }),
      }),
    }) as unknown as WidgetInterface;

    // 可点击标题行: chevron + title
    const headerRow = new GestureDetector({
      onTap: () => {
        this.toggle();
      },
      child: new Row({
        children: [chevron, title as unknown as WidgetInterface],
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;

    // collapsed: 只显示标题行
    if (!this.expanded) return headerRow;

    // expanded: 标题行 + child
    return new Column({
      children: [headerRow, child as unknown as WidgetInterface],
    }) as unknown as WidgetInterface;
  }
}
