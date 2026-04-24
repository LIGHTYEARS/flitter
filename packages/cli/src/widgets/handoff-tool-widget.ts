/**
 * HandoffToolWidget — displays thread handoff tool results.
 *
 * Renders a bordered box (NOT ExpandableToolHeader) showing the status of a
 * thread-handoff operation. The bullet icon blinks green when the child thread
 * is actively working.
 *
 * 逆向: chunk-006.js line 28233 — S9R (HandoffToolWidget, StatefulWidget)
 * 逆向: chunk-006.js line 28243 — O9R (State)
 *
 * Layout:
 *   DecoratedBox (rounded border, destructive if error, else normal border color)
 *     padding symmetric(vertical=1, horizontal=0)
 *     width max(60, floor(termWidth * 0.7))
 *     Column(crossAxisAlignment: start):
 *       Header row: "● " (blink green/muted) + "Handoff" (bold, toolName color) + thread title (muted)
 *       Body row (one of):
 *         - In-progress:  "↳ <braille spinner>" (muted)
 *         - Done+thread:  "↳ " (muted) + threadId (accent, underlined)
 *         - Error:        error message (destructive, maxLines=1)
 *
 * Bullet blinking:
 *   Green  = toolSuccess color (when isActivelyWorking)
 *   Muted  = mutedForeground color (when NOT actively working or not done+newThread)
 *   Toggle interval: 700ms
 *
 * @module handoff-tool-widget
 */

import type { BuildContext, Element, Widget } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxDecoration,
  BrailleSpinner,
  Color,
  Column,
  Container,
  EdgeInsets,
  GestureDetector,
  MediaQuery,
  RichText,
  Row,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import type { AppTheme } from "./app-theme-controller.js";
import { AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  Color constants (fallbacks for when no theme in tree)
// ════════════════════════════════════════════════════

/** Fallback: muted foreground */
const MUTED_COLOR = Color.default();

/** Fallback: tool name color */
const TOOL_NAME_COLOR = Color.default();

/** Fallback: green (toolSuccess) */
const GREEN_COLOR = Color.indexed(2);

/** Fallback: accent / link color */
const ACCENT_COLOR = Color.indexed(6);

/** Fallback: destructive / error color */
const DESTRUCTIVE_COLOR = Color.indexed(1);

/** Fallback: border color */
const BORDER_COLOR = Color.default();

/** Minimum container width (逆向: m = 60) */
const MIN_WIDTH = 60;

/** Width fraction of terminal (逆向: b = 0.7) */
const WIDTH_FRACTION = 0.7;

// ════════════════════════════════════════════════════
//  HandoffToolWidgetConfig
// ════════════════════════════════════════════════════

/**
 * Tool run status matching amp's status enum.
 * 逆向: S9R.props.toolRun.status
 */
export type HandoffStatus = "in-progress" | "done" | "error";

/**
 * Props for HandoffToolWidget.
 *
 * 逆向: S9R constructor({ toolRun, threadViewState, onNavigateToThread })
 */
export interface HandoffToolWidgetConfig {
  /**
   * Current status of the handoff operation.
   * 逆向: toolRun.status — "in-progress" | "done" | "error"
   */
  status: HandoffStatus;

  /**
   * Title of the spawned thread (shown in header, after "Handoff").
   * 逆向: vb.getThreadTitle(T, h.newThreadID)
   */
  threadTitle?: string;

  /**
   * ID of the new thread created by this handoff.
   * 逆向: h.newThreadID (result.newThreadID when status === "done")
   */
  newThreadId?: string;

  /**
   * Error message if the handoff failed.
   * 逆向: i.message when status === "error"
   */
  error?: string;

  /**
   * Whether the child thread is actively working (used for blink control).
   * 逆向: O9R._isActivelyWorking(props) — N7(props.threadViewState)
   * When true, bullet blinks green; when false, bullet stays muted.
   */
  isActivelyWorking?: boolean;

  /**
   * Callback when user clicks the thread ID link.
   * 逆向: IW.of(T) — navigate-to-thread intent, line 28347
   */
  onNavigateToThread?: (threadId: string) => void;
}

// ════════════════════════════════════════════════════
//  HandoffToolWidget (StatefulWidget)
// ════════════════════════════════════════════════════

/**
 * Stateful widget that displays handoff tool status with a blinking bullet.
 *
 * 逆向: S9R extends NR (StatefulWidget) — chunk-006.js:28233
 */
export class HandoffToolWidget extends StatefulWidget {
  readonly config: HandoffToolWidgetConfig;

  constructor(config: HandoffToolWidgetConfig) {
    super();
    this.config = config;
  }

  createState(): HandoffToolWidgetState {
    return new HandoffToolWidgetState();
  }
}

// ════════════════════════════════════════════════════
//  HandoffToolWidgetState
// ════════════════════════════════════════════════════

/**
 * State for HandoffToolWidget.
 *
 * Manages:
 * - _isGreen: current bullet blink state (green vs muted)
 * - _blinkTimer: 700ms interval to toggle _isGreen when actively working
 * - _spinnerTimer: 200ms interval for braille spinner when in-progress
 * - _spinner: BrailleSpinner instance
 * - _titleTimedOut: after 5s waiting for thread title, show "Untitled"
 *
 * 逆向: O9R extends wR — chunk-006.js:28243
 */
export class HandoffToolWidgetState extends State<HandoffToolWidget> {
  /**
   * Whether bullet is currently green.
   * 逆向: O9R._isGreen = !0
   */
  private _isGreen = true;

  /**
   * 700ms blink timer for bullet icon.
   * 逆向: O9R._blinkTimer
   */
  private _blinkTimer: ReturnType<typeof setInterval> | undefined;

  /**
   * 200ms spinner animation timer.
   * 逆向: O9R._spinnerTimer
   */
  private _spinnerTimer: ReturnType<typeof setInterval> | undefined;

  /**
   * 5s title timeout timer.
   * 逆向: O9R._titleTimeoutTimer
   */
  private _titleTimeoutTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Whether the title timeout has fired (show "Untitled").
   * 逆向: O9R._titleTimedOut = !1
   */
  private _titleTimedOut = false;

  /**
   * Braille spinner state.
   * 逆向: O9R._spinner = new xa()
   */
  private _spinner = new BrailleSpinner();

  // ────────────────────────────────────────────────
  //  Lifecycle
  //  逆向: O9R.initState / didUpdateWidget / dispose
  // ────────────────────────────────────────────────

  override initState(): void {
    super.initState();
    this._restartTimers();
  }

  override didUpdateWidget(oldWidget: HandoffToolWidget): void {
    super.didUpdateWidget(oldWidget);

    const wasInProgress = oldWidget.config.status === "in-progress";
    const nowInProgress = this.widget.config.status === "in-progress";
    const wasActive = oldWidget.config.isActivelyWorking === true;
    const nowActive = this.widget.config.isActivelyWorking === true;

    // 逆向: O9R.didUpdateWidget — restart timers when status or active flag changes
    if (wasInProgress !== nowInProgress || wasActive !== nowActive) {
      this._restartTimers();
    }
  }

  override dispose(): void {
    this._stopTimers();
    super.dispose();
  }

  // ────────────────────────────────────────────────
  //  Timer management
  //  逆向: O9R._restartTimers / _stopTimers
  // ────────────────────────────────────────────────

  /**
   * Stop all timers and restart based on current widget state.
   * 逆向: O9R._restartTimers (chunk-006.js:28267-28277)
   */
  private _restartTimers(): void {
    this._stopTimers();

    const isInProgress = this.widget.config.status === "in-progress";
    const isActive = this.widget.config.isActivelyWorking === true;

    // Spinner timer: active while in-progress
    // 逆向: if (T) this._spinnerTimer = setInterval(() => { this._spinner.step(), this.setState(); }, 200)
    if (isInProgress) {
      this._spinnerTimer = setInterval(() => {
        this._spinner.step();
        this.setState();
      }, 200);
    }

    // Blink timer: active while child thread is working
    // 逆向: if (R) this._blinkTimer = setInterval(() => { this._isGreen = !this._isGreen, this.setState(); }, 700)
    if (isActive) {
      this._blinkTimer = setInterval(() => {
        this._isGreen = !this._isGreen;
        this.setState();
      }, 700);
    }

    this._startTitleTimeout();
  }

  /**
   * Stop all timers.
   * 逆向: O9R._stopTimers (chunk-006.js:28291-28294)
   */
  private _stopTimers(): void {
    if (this._spinnerTimer) {
      clearInterval(this._spinnerTimer);
      this._spinnerTimer = undefined;
    }
    if (this._blinkTimer) {
      clearInterval(this._blinkTimer);
      this._blinkTimer = undefined;
    }
    this._stopTitleTimeout();
  }

  /**
   * Start 5s title timeout when done+newThread but title is not yet available.
   * 逆向: O9R._startTitleTimeout (chunk-006.js:28279-28287)
   */
  _startTitleTimeout(): void {
    if (this._titleTimeoutTimer || this._titleTimedOut) return;

    const { status, newThreadId } = this.widget.config;
    if (status === "done" && newThreadId) {
      this._titleTimeoutTimer = setTimeout(() => {
        this._titleTimedOut = true;
        this._stopTitleTimeout();
        this.setState();
      }, 5000);
    }
  }

  /**
   * Cancel the title timeout timer.
   * 逆向: O9R._stopTitleTimeout (chunk-006.js:28289-28290)
   */
  _stopTitleTimeout(): void {
    if (this._titleTimeoutTimer) {
      clearTimeout(this._titleTimeoutTimer);
      this._titleTimeoutTimer = undefined;
    }
  }

  // ────────────────────────────────────────────────
  //  Build
  //  逆向: O9R.build (chunk-006.js:28296-28387)
  // ────────────────────────────────────────────────

  override build(context: BuildContext): Widget {
    const { status, threadTitle, newThreadId, error, isActivelyWorking, onNavigateToThread } =
      this.widget.config;

    // ── Resolve colors from AppTheme if available ──
    // 逆向: e = Z0.of(T), t = $R.of(T), r = e.colorScheme
    let appTheme: AppTheme | undefined;
    try {
      appTheme = AppThemeController.of(context as unknown as Element);
    } catch {
      // No AppThemeController in tree (e.g., unit tests) — use fallbacks
    }

    const mutedColor = MUTED_COLOR;
    const toolNameColor = appTheme ? appTheme.toolName : TOOL_NAME_COLOR;
    const greenColor = appTheme ? appTheme.toolSuccess : GREEN_COLOR;
    const accentColor = ACCENT_COLOR;
    const destructiveColor = DESTRUCTIVE_COLOR;

    // ── Status flags ──
    // 逆向: h = result (if done), i = error (if error), c = done+newThread, s = error, A = in-progress
    const isDone = status === "done";
    const isError = status === "error";
    const isInProgress = status === "in-progress";
    const hasDoneThread = isDone && !!newThreadId;

    // ── Border color ──
    // 逆向: n = s ? r.destructive : r.border — destructive if error, else border
    const borderColor = isError ? destructiveColor : BORDER_COLOR;
    const borderDecoration = new BoxDecoration({
      border: Border.all(new BorderSide(borderColor, 1, "rounded")),
    });

    // ── Terminal width ──
    // 逆向: _ = I9.of(T).size.width, y = Math.max(60, Math.floor(_ * 0.7))
    let termWidth = 80;
    try {
      termWidth = MediaQuery.sizeOf(context as unknown as Element).width;
    } catch {
      // MediaQuery not in tree — use default
    }
    const containerWidth = Math.max(MIN_WIDTH, Math.floor(termWidth * WIDTH_FRACTION));

    // ── Bullet color ──
    // 逆向: P = c ? l ? this._isGreen ? t.app.toolSuccess : r.mutedForeground : r.mutedForeground : r.mutedForeground
    // Green only when done+newThread AND actively working AND currently green phase
    let bulletColor: Color;
    if (hasDoneThread && isActivelyWorking) {
      bulletColor = this._isGreen ? greenColor : mutedColor;
    } else {
      bulletColor = mutedColor;
    }

    // ── Header spans ──
    // 逆向: u.push(new G("● ", ...bold)), u.push(new G("Handoff", ...toolName))
    const headerSpans: TextSpan[] = [
      new TextSpan({
        text: "\u25CF ", // ●
        style: new TextStyle({ foreground: bulletColor, bold: true }),
      }),
      new TextSpan({
        text: "Handoff",
        style: new TextStyle({ foreground: toolNameColor, bold: true }),
      }),
    ];

    // ── Thread title in header ──
    // 逆向: k = o === "Untitled" ? undefined : o, x = k !== void 0
    //        if (x) stopTitleTimeout, push(" " + k)
    //        else if (c) startTitleTimeout
    //        if (x) push(" k"), else if (_titleTimedOut) push(" Untitled" dim), else push(" ..." dim)
    //
    // NOTE: amp ALWAYS appends a title span (the fallback "..." is shown unconditionally when no
    // resolved title exists). The title span is NOT gated on hasDoneThread.
    const resolvedTitle = threadTitle === "Untitled" ? undefined : threadTitle;
    const hasTitleText = resolvedTitle !== undefined;

    if (hasTitleText) {
      // Title available (and not "Untitled") — stop title timeout
      // 逆向: if (x) this._stopTitleTimeout()
      this._stopTitleTimeout();
      headerSpans.push(
        new TextSpan({
          text: ` ${resolvedTitle}`,
          style: new TextStyle({ foreground: mutedColor }),
        }),
      );
    } else {
      // No resolved title — start title timeout if done+newThread
      // 逆向: else if (c) this._startTitleTimeout()
      if (hasDoneThread) {
        this._startTitleTimeout();
      }

      if (this._titleTimedOut) {
        // 逆向: u.push(new G(" Untitled", new cT({ color: r.mutedForeground, dim: true })))
        headerSpans.push(
          new TextSpan({
            text: " Untitled",
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        );
      } else {
        // 逆向: u.push(new G(" ...", new cT({ color: r.mutedForeground, dim: true })))
        headerSpans.push(
          new TextSpan({
            text: " ...",
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        );
      }
    }

    const headerRow = new RichText({
      text: new TextSpan({ children: headerSpans }),
    });

    // ── Body row ──
    // 逆向: build lines 28341-28375 — A (in-progress) / c+h (done+newThread) / s+i (error)
    let bodyRow: Widget | undefined;

    if (isInProgress) {
      // 逆向: v = new xT({ text: new G("↳ " + this._spinner.toBraille(), { color: r.mutedForeground }) })
      bodyRow = new RichText({
        text: new TextSpan({
          text: `\u21B3 ${this._spinner.toBraille()}`,
          style: new TextStyle({ foreground: mutedColor }),
        }),
      });
    } else if (hasDoneThread && newThreadId) {
      // 逆向: Row([RichText("↳ "), GestureDetector/RichText(threadID, accent, underline)])
      const threadIdWidget = new RichText({
        text: new TextSpan({
          text: newThreadId,
          style: new TextStyle({ foreground: accentColor, underline: !!onNavigateToThread }),
        }),
      });

      const clickableThreadId = onNavigateToThread
        ? (new GestureDetector({
            onTap: () => onNavigateToThread(newThreadId),
            child: threadIdWidget as unknown as Widget,
          }) as unknown as Widget)
        : (threadIdWidget as unknown as Widget);

      bodyRow = new Row({
        mainAxisSize: "min",
        children: [
          new RichText({
            text: new TextSpan({
              text: "\u21B3 ",
              style: new TextStyle({ foreground: mutedColor }),
            }),
          }) as unknown as Widget,
          clickableThreadId,
        ],
      }) as unknown as Widget;
    } else if (isError) {
      // 逆向: v = new xT({ text: new G(i.message || "Failed to create handoff thread", { color: r.destructive }), maxLines: 1 })
      bodyRow = new RichText({
        text: new TextSpan({
          text: error || "Failed to create handoff thread",
          style: new TextStyle({ foreground: destructiveColor }),
        }),
        maxLines: 1,
      });
    }

    // ── Assemble column ──
    // 逆向: g = [f]; if (v) g.push(v)
    const columnChildren: Widget[] = [headerRow as unknown as Widget];
    if (bodyRow) {
      columnChildren.push(bodyRow);
    }

    // ── Wrap in Container with border + padding + width ──
    // 逆向: new SR({ decoration: new p8(r.background, p), padding: TR.symmetric(1, 0), width: y, child: Column })
    return new Container({
      decoration: borderDecoration,
      padding: EdgeInsets.symmetric({ vertical: 1 }),
      width: containerWidth,
      child: new Column({
        crossAxisAlignment: "start",
        children: columnChildren,
      }) as unknown as Widget,
    }) as unknown as Widget;
  }
}
