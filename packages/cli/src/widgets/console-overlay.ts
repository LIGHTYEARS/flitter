/**
 * ConsoleOverlay -- full-screen console log overlay with scroll support.
 *
 * Displays captured log entries in a bordered container, supporting
 * keyboard-driven scrolling (j/k, arrows, PageUp/PageDown, Home/End).
 * Dismissed by the parent via the `onDismiss` callback (typically Alt+C).
 *
 * 逆向: u0R (interactive_widgets.js:1234-1418)
 *   - u0R extends wR (StatefulWidget State)
 *   - scrollOffset, maxScrollOffset, contentHeight, viewportHeight
 *   - handleKeyEvent: ArrowUp/k -3, ArrowDown/j +3, Home top, End bottom,
 *     PageUp/PageDown +/-80% viewport
 *   - scroll(T): clamp to [0, maxScrollOffset]
 *   - build: bordered Container ~80% terminal size, Column with log entries,
 *     bottom hint bar "Alt+C: close ..."
 *   - formatTimestamp: HH:MM:SS.mmm
 *   - getLevelColor: error->destructive, warn->warning, info->foreground, debug->accent
 *   - formatLogEntry: [timestamp] LEVEL: message args(dimmed)
 *   - Empty state: "No log entries captured yet."
 *
 * @module
 */

import type { BuildContext, Element, KeyEventResult, Widget } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxConstraints,
  BoxDecoration,
  Center,
  Color,
  Column,
  Container,
  EdgeInsets,
  Expanded,
  Focus,
  MediaQuery,
  Padding,
  RichText,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

import { AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  LogEntry type
// ════════════════════════════════════════════════════

/**
 * A single console log entry.
 *
 * 逆向: Es.getInstance().getLogs() returns array of these.
 */
export interface LogEntry {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  args?: unknown[];
}

// ════════════════════════════════════════════════════
//  ConsoleOverlayConfig
// ════════════════════════════════════════════════════

export interface ConsoleOverlayConfig {
  /** Log entries to display. */
  logs: LogEntry[];
  /** Called when the user requests dismissal (parent handles Alt+C). */
  onDismiss: () => void;
}

// ════════════════════════════════════════════════════
//  ConsoleOverlayWidget
// ════════════════════════════════════════════════════

/**
 * Console log overlay widget.
 *
 * 逆向: u0R extends wR (interactive_widgets.js:1234)
 *   In amp, u0R is a StatefulWidget whose State pulls logs from
 *   Es.getInstance().getLogs(). In flitter, logs are passed via props
 *   to keep the widget pure and testable.
 */
export class ConsoleOverlayWidget extends StatefulWidget {
  readonly config: ConsoleOverlayConfig;

  constructor(config: ConsoleOverlayConfig) {
    super();
    this.config = config;
  }

  createState(): ConsoleOverlayState {
    return new ConsoleOverlayState();
  }
}

// ════════════════════════════════════════════════════
//  Color helpers
// ════════════════════════════════════════════════════

/**
 * Level-specific color lookup.
 *
 * 逆向: u0R.getLevelColor (interactive_widgets.js:1296-1308)
 *   error -> R.destructive (red)
 *   warn  -> R.warning (yellow)
 *   info  -> R.foreground (default)
 *   debug -> R.accent (cyan)
 */
function getLevelColor(level: string): Color {
  switch (level) {
    case "error":
      return Color.red();
    case "warn":
      return Color.yellow();
    case "debug":
      return Color.cyan();
    default:
      return Color.default();
  }
}

/**
 * Format a Date as HH:MM:SS.mmm.
 *
 * 逆向: u0R.formatTimestamp (interactive_widgets.js:1289-1294)
 */
export function formatTimestamp(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

/**
 * Stringify unknown args for log display.
 *
 * 逆向: u0R.formatLogEntry (interactive_widgets.js:1320-1322)
 *   T.args.map(h => typeof h === "string" ? h : JSON.stringify(h, null, 2)).join(" ")
 *
 * Truncates individual arg strings to MAX_ARG_LENGTH to avoid overwhelming the UI.
 */
const MAX_ARG_LENGTH = 200;

export function stringifyArgs(args: unknown[]): string {
  return args
    .map((a) => {
      const raw = typeof a === "string" ? a : JSON.stringify(a, null, 2);
      if (raw && raw.length > MAX_ARG_LENGTH) {
        return raw.slice(0, MAX_ARG_LENGTH) + "\u2026";
      }
      return raw ?? "";
    })
    .join(" ");
}

// ════════════════════════════════════════════════════
//  Default scroll amount
// ════════════════════════════════════════════════════

/**
 * Lines to scroll per j/k/arrow press.
 *
 * 逆向: u0R.handleKeyEvent — ArrowUp/k: scroll(-3), ArrowDown/j: scroll(3)
 */
const SCROLL_STEP = 3;

/**
 * Default viewport height when MediaQuery is unavailable (unit tests).
 */
const DEFAULT_VIEWPORT_HEIGHT = 20;

/**
 * Default viewport width when MediaQuery is unavailable (unit tests).
 */
const DEFAULT_VIEWPORT_WIDTH = 60;

// ════════════════════════════════════════════════════
//  ConsoleOverlayState
// ════════════════════════════════════════════════════

/**
 * State for ConsoleOverlayWidget.
 *
 * 逆向: u0R state fields (interactive_widgets.js:1235-1238)
 *   scrollOffset = 0
 *   maxScrollOffset = 0
 *   contentHeight = 0
 *   viewportHeight = 0
 *
 * Manages scroll position and key handling.
 */
export class ConsoleOverlayState extends State<ConsoleOverlayWidget> {
  /** Current scroll offset in lines. */
  private _scrollOffset = 0;

  /** Computed viewport height (updated from MediaQuery on each build). */
  private _viewportHeight = DEFAULT_VIEWPORT_HEIGHT;

  // ── Accessors (for testing) ─────────────────────────

  get scrollOffset(): number {
    return this._scrollOffset;
  }

  get viewportHeight(): number {
    return this._viewportHeight;
  }

  // ── Scroll logic ────────────────────────────────────

  /**
   * Scroll by delta lines, clamped to [0, maxScrollOffset].
   *
   * 逆向: u0R.scroll(T) (interactive_widgets.js:1269-1271)
   *   let R = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset + T));
   *   if (R !== this.scrollOffset) this.scrollOffset = R, this.setState(() => {});
   */
  scroll(delta: number): void {
    const logs = this.widget.config.logs;
    const contentHeight = logs.length;
    const maxScroll = Math.max(0, contentHeight - this._viewportHeight);
    const next = Math.max(0, Math.min(maxScroll, this._scrollOffset + delta));
    if (next !== this._scrollOffset) {
      this.setState(() => {
        this._scrollOffset = next;
      });
    }
  }

  /**
   * Jump to top.
   *
   * 逆向: u0R.scrollToTop (interactive_widgets.js:1273-1274)
   */
  scrollToTop(): void {
    if (this._scrollOffset !== 0) {
      this.setState(() => {
        this._scrollOffset = 0;
      });
    }
  }

  /**
   * Jump to bottom.
   *
   * 逆向: u0R.scrollToBottom (interactive_widgets.js:1276-1278)
   */
  scrollToBottom(): void {
    const logs = this.widget.config.logs;
    const contentHeight = logs.length;
    const maxScroll = Math.max(0, contentHeight - this._viewportHeight);
    if (this._scrollOffset !== maxScroll) {
      this.setState(() => {
        this._scrollOffset = maxScroll;
      });
    }
  }

  // ── Key handler ─────────────────────────────────────

  /**
   * Key event handler matching amp's u0R.handleKeyEvent.
   *
   * 逆向: u0R.handleKeyEvent (interactive_widgets.js:1249-1267)
   *   ArrowUp/k: scroll(-3)
   *   ArrowDown/j: scroll(3)
   *   Home: scrollToTop
   *   End: scrollToBottom
   *   PageUp: scroll(-floor(viewportHeight * 0.8))
   *   PageDown: scroll(floor(viewportHeight * 0.8))
   */
  private _handleKey = (event: { key: string }): KeyEventResult => {
    switch (event.key) {
      case "ArrowUp":
      case "k":
        this.scroll(-SCROLL_STEP);
        return "handled";
      case "ArrowDown":
      case "j":
        this.scroll(SCROLL_STEP);
        return "handled";
      case "Home":
        this.scrollToTop();
        return "handled";
      case "End":
        this.scrollToBottom();
        return "handled";
      case "PageUp":
        this.scroll(-Math.floor(this._viewportHeight * 0.8));
        return "handled";
      case "PageDown":
        this.scroll(Math.floor(this._viewportHeight * 0.8));
        return "handled";
      default:
        return "ignored";
    }
  };

  // ── Build ───────────────────────────────────────────

  /**
   * Build the console overlay widget tree.
   *
   * 逆向: u0R.build(T) (interactive_widgets.js:1330-1417)
   *
   * Structure:
   *   Center > Container(constraints ~80%, border rounded, accent color) >
   *     Padding(1) > Column [
   *       Expanded > Column(log entries or "No log entries"),
   *       hint bar
   *     ]
   *
   * Logs are displayed newest-first (reversed), matching amp's `a.slice().reverse()`.
   */
  build(context: BuildContext): Widget {
    const { logs } = this.widget.config;

    // ── Resolve terminal dimensions via MediaQuery ──
    // 逆向: u0R.build — r = T.mediaQuery; h = Math.floor(r.size.width * 0.8); i = Math.floor(r.size.height * 0.8)
    let termWidth = DEFAULT_VIEWPORT_WIDTH;
    let termHeight = DEFAULT_VIEWPORT_HEIGHT;
    try {
      const size = MediaQuery.sizeOf(context as unknown as Element);
      termWidth = size.width;
      termHeight = size.height;
    } catch {
      // MediaQuery not in tree (unit tests) — use defaults
    }
    const overlayWidth = Math.floor(termWidth * 0.8);
    const overlayHeight = Math.floor(termHeight * 0.8);

    // Update cached viewport height for scroll calculations
    // Account for padding (2 rows), title (1 row), hint bar (1 row), border (2 rows)
    this._viewportHeight = Math.max(1, overlayHeight - 6);

    // ── Resolve accent color from AppTheme ──
    // 逆向: u0R.build — R = Z0.of(T).colorScheme → R.accent
    let accentColor = Color.cyan();
    try {
      const appTheme = AppThemeController.of(context as unknown as Element);
      accentColor = appTheme.keybind; // accent-like role
    } catch {
      // No AppThemeController in tree — use default cyan
    }

    // ── Title ──
    // 逆向: u0R.build — e = `Console Log (${a.length} entries)`
    const title = `Console (${logs.length} entries)`;
    const titleWidget = new RichText({
      text: new TextSpan({
        text: title,
        style: new TextStyle({ foreground: Color.default(), bold: true }),
      }),
    });

    // ── Log content ──
    // 逆向: u0R.build — if (a.length === 0) "No log entries captured yet." else reversed logs
    let logWidgets: Widget[];
    if (logs.length === 0) {
      logWidgets = [
        new RichText({
          text: new TextSpan({
            text: "No log entries",
            style: new TextStyle({ foreground: accentColor }),
          }),
        }),
      ];
    } else {
      // 逆向: u0R.build — let p = a.slice().reverse(); for (let _ of p) t.push(...formatLogEntry(_, R))
      const reversed = logs.slice().reverse();
      const visibleStart = this._scrollOffset;
      const visibleEnd = Math.min(reversed.length, visibleStart + this._viewportHeight);
      const visible = reversed.slice(visibleStart, visibleEnd);

      logWidgets = visible.map((entry) => {
        // 逆向: u0R.formatLogEntry (interactive_widgets.js:1310-1328)
        const ts = formatTimestamp(entry.timestamp);
        const levelColor = getLevelColor(entry.level);

        const spans: TextSpan[] = [
          // [HH:MM:SS.mmm] in accent color
          new TextSpan({
            text: `[${ts}] `,
            style: new TextStyle({ foreground: accentColor }),
          }),
          // LEVEL: in level-specific color
          new TextSpan({
            text: `${entry.level.toUpperCase()}: `,
            style: new TextStyle({ foreground: levelColor }),
          }),
          // message in default color
          new TextSpan({
            text: entry.message,
            style: new TextStyle({ foreground: Color.default() }),
          }),
        ];

        // Args: JSON-stringified and dimmed
        // 逆向: if (T.args.length > 0) { ... t.push(new G(` ${r}`, new cT({ color: R.foreground, dim: !0 }))) }
        if (entry.args && entry.args.length > 0) {
          const argsStr = stringifyArgs(entry.args);
          spans.push(
            new TextSpan({
              text: ` ${argsStr}`,
              style: new TextStyle({ foreground: Color.default(), dim: true }),
            }),
          );
        }

        return new RichText({
          text: new TextSpan({ children: spans }),
        });
      });
    }

    // ── Hint bar ──
    // 逆向: u0R.build — o = Padding(..., "Alt+C: close • ↑↓/j k: scroll • Home/End: top/bottom • PgUp/PgDn: page scroll")
    const hintWidget = new Padding({
      padding: EdgeInsets.only({ top: 1 }),
      child: new RichText({
        text: new TextSpan({
          text: "Alt+C: close \u2022 \u2191\u2193/j k: scroll \u2022 Home/End: top/bottom \u2022 PgUp/PgDn: page scroll",
          style: new TextStyle({ foreground: accentColor }),
        }),
      }),
    });

    // ── Layout: Column [ title, SizedBox, Expanded(logColumn), hint ] ──
    const logColumn = new Column({
      children: logWidgets,
    });

    const innerColumn = new Column({
      children: [
        titleWidget,
        new SizedBox({ height: 1 }),
        new Expanded({ child: logColumn }),
        hintWidget,
      ],
    });

    // ── Focus wrapper for key handling ──
    // 逆向: u0R.build — new C8({ autofocus: !0, onKey: this.handleKeyEvent, child: ... })
    const focusedContent = new Focus({
      autofocus: true,
      onKey: this._handleKey,
      debugLabel: "ConsoleOverlay",
      child: new Padding({
        padding: EdgeInsets.all(1),
        child: innerColumn,
      }),
    });

    // ── Bordered container ──
    // 逆向: u0R.build — new SR({ constraints: new o0(h, h, 0, i),
    //   decoration: new p8(R.background, h9.all(new e9(R.accent, 1, "rounded"))) })
    const borderedContainer = new Container({
      constraints: new BoxConstraints({
        maxWidth: overlayWidth,
        minWidth: overlayWidth,
        maxHeight: overlayHeight,
        minHeight: 0,
      }),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(accentColor, 1, "rounded")),
      }),
      child: focusedContent,
    });

    // ── Center in the viewport ──
    // 逆向: u0R.build — new N0({ child: ... }) — N0 is Center
    return new Center({
      child: borderedContainer,
    });
  }
}
