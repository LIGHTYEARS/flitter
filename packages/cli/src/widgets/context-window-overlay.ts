/**
 * ContextWindowOverlay — token usage & cost detail overlay widget.
 *
 * Displays context window details (token usage, cost, usage entitlement)
 * in a bordered overlay that can be dismissed with keyboard shortcuts.
 *
 * 逆向: f0R (StatefulWidget) + I0R (State) in
 *   - misc_utils.js:5820-5839 (widget definition)
 *   - text_rendering.js:2637-2856 (state with build, key handling, scroll)
 *
 * f0R props:
 *   - tokenUsage: { totalInputTokens, maxInputTokens, cacheReadInputTokens, cacheCreationInputTokens }
 *   - costInfo: { totalCostUSD, entitlement: { remainingUSD, limitUSD, percentUsed, windowPeriod, windowResetsInSeconds } }
 *   - onDismiss: () => void
 *   - onOpenCostBreakdown: () => void
 *
 * I0R state:
 *   - showExactNumbers: boolean (toggled with 'e')
 *   - scrollOffset / maxScrollOffset / contentHeight / viewportHeight for scrolling
 *   - Key handling: Escape=dismiss, e=toggle exact, b=open breakdown, j/k/arrows/PgUp/PgDn/Home/End=scroll
 *   - formatTokens(T): showExactNumbers ? T.toLocaleString() : XM(T)
 *   - XM(T) in chunk-004.js:24704: >= 1e6 -> round(T/1e6)+"M", >= 1000 -> round(T/1000)+"k", else toString()
 *   - build() returns Center > Container(border: primary rounded) > Column[title, scrollable content, hint bar]
 *
 * @module
 */

import type { BuildContext, Element, KeyEventResult } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxDecoration,
  Center,
  Color,
  Column,
  Container,
  EdgeInsets,
  Focus,
  Padding,
  RichText,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Data for the context window overlay.
 *
 * 逆向: f0R.tokenUsage + f0R.costInfo combined into a flat structure
 * for ease of use.
 */
export interface ContextWindowData {
  /** Total input tokens used so far */
  usedTokens: number;
  /** Maximum input tokens allowed */
  maxTokens: number;
  /** Percentage of context window used (usedTokens / maxTokens * 100) */
  usedPercent: number;
  /** Cache-read input tokens (if any) */
  cachedTokens?: number;
  /** Cache-creation input tokens (if any) */
  cacheCreation?: number;
  /** Thread cost in USD */
  threadCost?: number;
  /** Total cost in USD */
  totalCost?: number;
  /** Remaining USD in usage entitlement */
  remainingUsd?: number;
  /** Usage limit in USD */
  limitUsd?: number;
  /** Percentage of usage limit consumed */
  usagePercent?: number;
  /** Human-readable countdown string until usage resets */
  resetCountdown?: string;
}

/**
 * Config for ContextWindowOverlay widget.
 *
 * 逆向: f0R constructor params (misc_utils.js:5825-5835)
 */
export interface ContextWindowOverlayConfig {
  /** Token usage and cost data to display */
  data: ContextWindowData;
  /** Called when the overlay should be dismissed */
  onDismiss: () => void;
  /** Optional: called when user requests cost breakdown (press 'b') */
  onOpenBreakdown?: () => void;
}

// ════════════════════════════════════════════════════
//  Formatting helpers
// ════════════════════════════════════════════════════

/**
 * Format a token count compactly with K/M suffixes.
 *
 * 逆向: XM(T) in chunk-004.js:24704-24707
 *   if (T >= 1e6) return `${Math.round(T / 1e6)}M`;
 *   if (T >= 1000) return `${Math.round(T / 1000)}k`;
 *   return T.toString();
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return value.toString();
}

/**
 * Format a USD amount for display.
 *
 * 逆向: AP function (chunk-004.js ~24684) — simplified
 */
function formatUSD(usd: number): string {
  if (usd % 1 === 0) return `$${usd}`;
  return `$${usd.toFixed(2)}`;
}

// ════════════════════════════════════════════════════
//  ContextWindowOverlay Widget
// ════════════════════════════════════════════════════

/**
 * ContextWindowOverlay — StatefulWidget for token usage detail overlay.
 *
 * 逆向: f0R extends NR (StatefulWidget) in misc_utils.js:5820-5839
 * - f0R({ tokenUsage, costInfo, onDismiss, onOpenCostBreakdown, key })
 * - createState() -> new I0R()
 */
export class ContextWindowOverlay extends StatefulWidget {
  readonly config: ContextWindowOverlayConfig;

  constructor(config: ContextWindowOverlayConfig) {
    super();
    this.config = config;
  }

  createState(): ContextWindowOverlayState {
    return new ContextWindowOverlayState();
  }
}

// ════════════════════════════════════════════════════
//  ContextWindowOverlayState
// ════════════════════════════════════════════════════

/**
 * State for ContextWindowOverlay.
 *
 * 逆向: I0R extends wR (State) in text_rendering.js:2637-2856
 *
 * State fields:
 *   - scrollOffset = 0
 *   - maxScrollOffset = 0
 *   - contentHeight = 0
 *   - viewportHeight = 0
 *   - showExactNumbers = false
 *
 * Key handling:
 *   - Escape -> onDismiss
 *   - ArrowUp/k -> scroll(-3)
 *   - ArrowDown/j -> scroll(3)
 *   - Home -> scrollToTop
 *   - End -> scrollToBottom
 *   - PageUp -> scroll(-floor(viewportHeight * 0.8))
 *   - PageDown -> scroll(floor(viewportHeight * 0.8))
 *   - b -> onOpenCostBreakdown (if provided)
 *   - e -> toggle showExactNumbers
 */
export class ContextWindowOverlayState extends State<ContextWindowOverlay> {
  /** Whether to show exact numbers or compact K/M format */
  showExact = false;

  /**
   * Scroll state fields.
   *
   * 逆向: I0R lines 2638-2641
   * In a full implementation these would drive a viewport offset.
   * We track them here for key handler correctness; the content is
   * typically short enough to fit without scrolling.
   */
  scrollOffset = 0;
  maxScrollOffset = 0;
  contentHeight = 0;
  viewportHeight = 20;

  /**
   * Format a token count based on current showExact setting.
   *
   * 逆向: I0R.formatTokens(T) at text_rendering.js:2643-2646
   *   if (this.showExactNumbers) return T.toLocaleString();
   *   return XM(T);
   */
  formatTokens(value: number): string {
    if (this.showExact) return value.toLocaleString();
    return formatCompact(value);
  }

  /**
   * Key event handler.
   *
   * 逆向: I0R.handleKeyEvent at text_rendering.js:2647-2672
   */
  handleKeyEvent = (event: { key: string }): KeyEventResult => {
    switch (event.key) {
      case "Escape":
        this.widget.config.onDismiss();
        return "handled";
      case "ArrowUp":
      case "k":
        this.scroll(-3);
        return "handled";
      case "ArrowDown":
      case "j":
        this.scroll(3);
        return "handled";
      case "Home":
        this.scrollToTop();
        return "handled";
      case "End":
        this.scrollToBottom();
        return "handled";
      case "PageUp":
        this.scroll(-Math.floor(this.viewportHeight * 0.8));
        return "handled";
      case "PageDown":
        this.scroll(Math.floor(this.viewportHeight * 0.8));
        return "handled";
      case "b":
        if (this.widget.config.onOpenBreakdown) {
          this.widget.config.onOpenBreakdown();
          return "handled";
        }
        return "ignored";
      case "e":
        this.showExact = !this.showExact;
        this.setState(() => {});
        return "handled";
      default:
        return "ignored";
    }
  };

  /**
   * Scroll by a delta amount.
   *
   * 逆向: I0R.scroll(T) at text_rendering.js:2674-2676
   */
  scroll(delta: number): void {
    const next = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset + delta));
    if (next !== this.scrollOffset) {
      this.scrollOffset = next;
      this.setState(() => {});
    }
  }

  /**
   * Scroll to the top.
   *
   * 逆向: I0R.scrollToTop() at text_rendering.js:2678-2679
   */
  scrollToTop(): void {
    if (this.scrollOffset !== 0) {
      this.scrollOffset = 0;
      this.setState(() => {});
    }
  }

  /**
   * Scroll to the bottom.
   *
   * 逆向: I0R.scrollToBottom() at text_rendering.js:2680-2682
   */
  scrollToBottom(): void {
    if (this.scrollOffset !== this.maxScrollOffset) {
      this.scrollOffset = this.maxScrollOffset;
      this.setState(() => {});
    }
  }

  /**
   * Build the overlay widget tree.
   *
   * 逆向: I0R.build(T) at text_rendering.js:2694-2856
   *
   * Structure:
   *   Center > Container(border: primary, rounded) >
   *     Column [
   *       Padding(title: "Context Window Details"),
   *       Focus(autofocus, onKey) > Padding(content spans),
   *       Padding(hint bar)
   *     ]
   */
  build(context: BuildContext) {
    // 逆向: let R = Z0.of(T).colorScheme, a = $R.of(T).app
    // We use AppThemeController for app-semantic colors.
    // ThemeController provides base palette but we use direct Color
    // for simplicity matching amp's pattern.
    const appTheme = AppThemeController.maybeOf(context as unknown as Element);

    // Color setup matching amp's I0R.build styles
    // 逆向: l = new cT({ color: R.primary, bold: true })
    const _primaryColor = appTheme?.keybind ?? Color.blue();
    const accentColor = appTheme?.toolSuccess ?? Color.green();
    const keybindColor = appTheme?.keybind ?? Color.blue();
    const borderColor = appTheme?.keybind ?? Color.blue();

    const titleStyle = new TextStyle({ foreground: borderColor, bold: true });
    // 逆向: o = new cT({ color: R.foreground })
    const fgStyle = new TextStyle({ foreground: Color.default() });
    // 逆向: n = new cT({ color: R.foreground, dim: true })
    const dimStyle = new TextStyle({ foreground: Color.default(), dim: true });
    // 逆向: p = new cT({ color: R.accent })
    const accentStyle = new TextStyle({ foreground: accentColor });
    // 逆向: _ = new cT({ color: a.keybind })
    const keybindStyle = new TextStyle({ foreground: keybindColor });

    const { data } = this.widget.config;

    // ── Build content spans ──────────────────────────
    // 逆向: b = [] array of TextSpan children (text_rendering.js:2727-2778)
    const contentSpans: TextSpan[] = [];

    // Token usage block
    // 逆向: if (r) { ... } at text_rendering.js:2728-2737
    const pct = this.showExact
      ? data.usedPercent.toFixed(2)
      : String(Math.max(0, Math.min(Math.round(data.usedPercent), 100)));

    contentSpans.push(
      new TextSpan({
        text: `Used:    ${this.formatTokens(data.usedTokens)} tokens (${pct}%)\n`,
        style: fgStyle,
      }),
    );
    contentSpans.push(
      new TextSpan({
        text: `Maximum: ${this.formatTokens(data.maxTokens)} tokens\n`,
        style: dimStyle,
      }),
    );

    // 逆向: if (r.cacheReadInputTokens || r.cacheCreationInputTokens) push cached line
    if ((data.cachedTokens ?? 0) > 0 || (data.cacheCreation ?? 0) > 0) {
      contentSpans.push(
        new TextSpan({
          text: `Cached:  ${this.formatTokens(data.cachedTokens ?? 0)} tokens\n`,
          style: accentStyle,
        }),
      );
    }

    // blank line separator
    contentSpans.push(new TextSpan({ text: "\n" }));

    // Thread cost block
    // 逆向: if (e && y?.totalCostUSD !== void 0 ...) at text_rendering.js:2741-2756
    if (data.threadCost !== undefined || data.totalCost !== undefined) {
      contentSpans.push(
        new TextSpan({
          text: "Thread Cost\n",
          style: new TextStyle({ foreground: accentColor, bold: true }),
        }),
      );

      if (data.totalCost !== undefined) {
        contentSpans.push(
          new TextSpan({
            text: `  Total: ${formatUSD(data.totalCost)}\n`,
            style: fgStyle,
          }),
        );
      }
      if (data.threadCost !== undefined && data.threadCost !== data.totalCost) {
        contentSpans.push(
          new TextSpan({
            text: `  Thread: ${formatUSD(data.threadCost)}\n`,
            style: fgStyle,
          }),
        );
      }

      // 逆向: if (this.widget.onOpenCostBreakdown) push "Press b to view breakdown"
      if (this.widget.config.onOpenBreakdown) {
        contentSpans.push(new TextSpan({ text: "  Press ", style: dimStyle }));
        contentSpans.push(new TextSpan({ text: "b", style: keybindStyle }));
        contentSpans.push(new TextSpan({ text: " to view breakdown\n", style: dimStyle }));
      }

      contentSpans.push(new TextSpan({ text: "\n" }));
    }

    // Usage entitlement block
    // 逆向: if (u) { ... } at text_rendering.js:2757-2778
    if (data.remainingUsd !== undefined && data.limitUsd !== undefined) {
      contentSpans.push(
        new TextSpan({
          text: "Usage Entitlement\n",
          style: new TextStyle({ foreground: accentColor, bold: true }),
        }),
      );

      const remaining = formatUSD(data.remainingUsd);
      const limit = formatUSD(data.limitUsd);
      contentSpans.push(
        new TextSpan({
          text: `  ${remaining} remaining of ${limit} limit\n`,
          style: fgStyle,
        }),
      );

      if (data.usagePercent !== undefined) {
        const usagePctStr = this.showExact
          ? data.usagePercent.toFixed(2)
          : String(Math.round(data.usagePercent));
        contentSpans.push(
          new TextSpan({
            text: `  ${usagePctStr}% used`,
            style: dimStyle,
          }),
        );

        if (data.resetCountdown) {
          contentSpans.push(new TextSpan({ text: " \u00B7 ", style: dimStyle }));
          contentSpans.push(
            new TextSpan({
              text: `resets in ${data.resetCountdown}\n`,
              style: dimStyle,
            }),
          );
        } else {
          contentSpans.push(new TextSpan({ text: "\n" }));
        }
      }
    }

    // ── Title ──────────────────────────────────────
    // 逆向: P = new uR({ padding: TR.only({ left:2, right:2, top:1, bottom:1 }),
    //   child: new xT({ text: new G("Context Window Details", l) }) })
    const title = new Padding({
      padding: EdgeInsets.only({ left: 2, right: 2, top: 1, bottom: 1 }),
      child: new RichText({
        text: new TextSpan({
          text: "Context Window Details",
          style: titleStyle,
        }),
      }),
    });

    // ── Content area ─────────────────────────────
    // 逆向: Focus(autofocus, onKey, child: scrollable content)
    // We wrap in Focus for key handling; scrollable viewport is simplified.
    const content = new Focus({
      autofocus: true,
      onKey: this.handleKeyEvent,
      debugLabel: "ContextWindowOverlay",
      child: new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
        child: new RichText({
          text: new TextSpan({
            children: contentSpans,
          }),
        }),
      }),
    });

    // ── Hint bar ─────────────────────────────────
    // 逆向: text_rendering.js:2791-2799
    // "Press Escape to close • e to show exact numbers • ↑↓ or j/k to scroll"
    const hintSpans: TextSpan[] = [
      new TextSpan({ text: "Press ", style: fgStyle }),
      new TextSpan({ text: "Escape", style: keybindStyle }),
      new TextSpan({ text: " to close", style: fgStyle }),
      new TextSpan({ text: " \u2022 ", style: fgStyle }),
      new TextSpan({ text: "e", style: keybindStyle }),
      new TextSpan({
        text: this.showExact ? " to show rounded" : " to show exact numbers",
        style: fgStyle,
      }),
    ];

    // 逆向: if (k) x.push(... scroll hint)
    hintSpans.push(
      new TextSpan({ text: " \u2022 ", style: fgStyle }),
      new TextSpan({ text: "\u2191\u2193", style: keybindStyle }),
      new TextSpan({ text: " or ", style: fgStyle }),
      new TextSpan({ text: "j/k", style: keybindStyle }),
      new TextSpan({ text: " to scroll", style: fgStyle }),
    );

    if (this.widget.config.onOpenBreakdown) {
      hintSpans.push(
        new TextSpan({ text: " \u2022 ", style: fgStyle }),
        new TextSpan({ text: "b", style: keybindStyle }),
        new TextSpan({ text: " breakdown", style: fgStyle }),
      );
    }

    const hintBar = new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1, vertical: 0 }),
      child: new RichText({
        text: new TextSpan({ children: hintSpans }),
      }),
    });

    // ── Assemble column ──────────────────────────
    // 逆向: S = new xR({ mainAxisSize: "min", crossAxisAlignment: "stretch",
    //   children: [P, I, f] })
    const column = new Column({
      mainAxisSize: "min",
      crossAxisAlignment: "stretch",
      children: [title, content, hintBar],
    });

    // ── Outer container with border ──────────────
    // 逆向: return new N0({ child: new SR({
    //   constraints: new o0(A, A, 0, s),
    //   decoration: { color: R.background, border: h9.all(new e9(R.primary, 1, "rounded")) },
    //   child: S }) })
    const container = new Container({
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(borderColor, 1, "rounded")),
      }),
      child: column,
    });

    // 逆向: wrapped in N0 (Center widget) for overlay centering
    return new Center({ child: container });
  }
}
