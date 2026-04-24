/**
 * ExpandableToolHeader — reusable expand/collapse tool header widget.
 *
 * Renders a clickable header row with a status icon, title, optional trailing
 * content, and a chevron indicator. When expanded, the child content is shown
 * below the header; when collapsed, only the header row is visible.
 *
 * 逆向: nf class (misc_utils.js:6358-6437) — the ExpandableToolHeader pattern
 *   - Props: expanded, label, meta, status, statusColor, onToggle
 *   - State c9R: manages spinner animation timer
 *   - build(): [statusIcon + label + meta, spacer, chevron] wrapped in G0 (GestureDetector)
 *   - Chevron: ▼ expanded / ▶ collapsed, positioned AFTER label, uses mutedForeground
 *   - onClick calls onToggle(!expanded)
 *
 * 逆向: xW function (modules/2820_unknown_xW.js) — status icon mapping:
 *   done → ✓, error/cancelled/rejected → ✕, in-progress/queued/blocked → ⋯
 *
 * 逆向: qr function (modules/2821_unknown_qr.js) — status color mapping:
 *   done → toolSuccess, error → toolError, cancelled → toolCancelled,
 *   in-progress → toolRunning, queued/blocked → waiting
 *
 * The parent pattern (e.g., misc_utils.js:6457-6471) conditionally renders
 * child content based on `expanded`. This widget combines the header (nf) and
 * the parent's show/hide logic into a single reusable component.
 *
 * Supports both controlled mode (parent passes isExpanded + onToggle) and
 * uncontrolled mode (widget manages its own expansion state internally).
 *
 * @module expandable-tool-header
 *
 * @example
 * ```ts
 * new ExpandableToolHeader({
 *   title: "Read file",
 *   statusColor: Color.fromRgb(0x9e, 0xce, 0x6a),
 *   trailing: new Text({ data: "src/index.ts" }),
 *   child: new Text({ data: "file contents here..." }),
 * });
 * ```
 */

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  GestureDetector,
  RichText,
  Row,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Tool run status values matching amp's status enum.
 *
 * 逆向: xW switch cases (modules/2820_unknown_xW.js:2-14)
 */
export type ToolStatus =
  | "done"
  | "error"
  | "cancelled"
  | "rejected-by-user"
  | "cancellation-requested"
  | "in-progress"
  | "queued"
  | "blocked-on-user";

/** ExpandableToolHeader configuration. */
export interface ExpandableToolHeaderConfig {
  /** Tool name/title displayed in the header row. */
  title: string;

  /**
   * Current expansion state (controlled mode).
   * When omitted, the widget manages its own state starting collapsed.
   */
  isExpanded?: boolean;

  /**
   * Callback when expansion is toggled (controlled mode).
   * Receives the new expanded value.
   *
   * 逆向: nf.props.onToggle — onClick calls onToggle(!expanded)
   */
  onToggle?: (expanded: boolean) => void;

  /**
   * Color for the status icon. When provided alongside `status`, overrides
   * the default color derived from qr().
   *
   * 逆向: nf.props.statusColor — passed to cT({ color: h })
   */
  statusColor?: Color;

  /**
   * Tool run status. Controls the status icon character.
   *
   * 逆向: nf.props.status — fed to xW() for icon, _shouldAnimate() for spinner
   */
  status?: ToolStatus;

  /**
   * Optional widget rendered after the title (before chevron).
   * Corresponds to amp's `meta` prop on nf.
   *
   * 逆向: nf.props.meta — either string or TextSpan[], appended after label
   */
  trailing?: Widget;

  /**
   * Content widget shown when expanded.
   *
   * 逆向: parent pattern (misc_utils.js:6466-6471) — conditionally shown below header
   */
  child: Widget;
}

// ════════════════════════════════════════════════════
//  Status icon helper
// ════════════════════════════════════════════════════

/**
 * Map tool status to a Unicode icon character.
 *
 * 逆向: xW function (modules/2820_unknown_xW.js)
 */
function statusToIcon(status: ToolStatus): string {
  switch (status) {
    case "done":
      return "\u2713"; // ✓
    case "error":
    case "cancelled":
    case "rejected-by-user":
    case "cancellation-requested":
      return "\u2715"; // ✕
    case "in-progress":
    case "queued":
    case "blocked-on-user":
      return "\u22EF"; // ⋯
  }
}

/**
 * Whether a status should animate (show spinner).
 *
 * 逆向: c9R._shouldAnimate (misc_utils.js:6383-6384)
 */
function shouldAnimate(status: ToolStatus): boolean {
  return status === "in-progress" || status === "queued";
}

// ════════════════════════════════════════════════════
//  Default colors
// ════════════════════════════════════════════════════

/** Muted foreground for chevron and secondary text.
 * 逆向: R.colors.mutedForeground — terminal default + dim */
const MUTED_COLOR = Color.default();

/** Default tool name color.
 * 逆向: R.app.toolName — typically a dim foreground */
const TOOL_NAME_COLOR = Color.default();

// ════════════════════════════════════════════════════
//  ExpandableToolHeader Widget
// ════════════════════════════════════════════════════

/**
 * ExpandableToolHeader — a clickable header with chevron, status icon,
 * title, and optional trailing content. Shows/hides child on toggle.
 *
 * 逆向: nf class (misc_utils.js:6358) + parent expand/collapse pattern
 *
 * In controlled mode (isExpanded + onToggle provided), the parent manages state.
 * In uncontrolled mode, the widget manages its own _expanded flag.
 */
export class ExpandableToolHeader extends StatefulWidget {
  readonly config: ExpandableToolHeaderConfig;

  constructor(config: ExpandableToolHeaderConfig) {
    super();
    this.config = config;
  }

  createState(): ExpandableToolHeaderState {
    return new ExpandableToolHeaderState();
  }
}

// ════════════════════════════════════════════════════
//  ExpandableToolHeaderState
// ════════════════════════════════════════════════════

/**
 * State for ExpandableToolHeader.
 *
 * 逆向: c9R state class (misc_utils.js:6368-6437)
 *
 * Manages:
 * - _expanded: internal expansion state (uncontrolled mode)
 * - _animationTimer: spinner animation for in-progress/queued status
 * - _spinnerFrame: current braille spinner frame index
 */
export class ExpandableToolHeaderState extends State<ExpandableToolHeader> {
  /** Internal expanded state for uncontrolled mode. */
  private _expanded = false;

  /** Spinner animation timer.
   * 逆向: c9R._animationTimer (misc_utils.js:6369) */
  private _animationTimer: ReturnType<typeof setInterval> | undefined;

  /** Current spinner frame (0-7 braille cycle).
   * 逆向: c9R._spinner = new xa() — xa tracks frame internally */
  private _spinnerFrame = 0;

  /** Braille spinner characters matching amp's xa class.
   * 逆向: BrailleSpinner.toBraille() pattern */
  private static readonly BRAILLE_FRAMES = [
    "\u2801",
    "\u2803",
    "\u2807",
    "\u280F",
    "\u281F",
    "\u283F",
    "\u287F",
    "\u28FF",
    "\u28FE",
    "\u28FC",
    "\u28F8",
    "\u28F0",
    "\u28E0",
    "\u28C0",
    "\u2880",
    "\u2800",
  ];

  // ────────────────────────────────────────────────
  //  Resolved expansion state
  // ────────────────────────────────────────────────

  /**
   * Resolve whether currently expanded.
   * Controlled mode: read from widget.config.isExpanded
   * Uncontrolled mode: read from internal _expanded
   */
  private get _isExpanded(): boolean {
    return this.widget.config.isExpanded ?? this._expanded;
  }

  /** Whether we are in controlled mode. */
  private get _isControlled(): boolean {
    return this.widget.config.isExpanded !== undefined;
  }

  // ────────────────────────────────────────────────
  //  Lifecycle: animation timer
  //  逆向: c9R.initState / didUpdateWidget / dispose
  // ────────────────────────────────────────────────

  override initState(): void {
    super.initState();
    const status = this.widget.config.status;
    if (status && shouldAnimate(status)) {
      this._startAnimation();
    }
  }

  override didUpdateWidget(oldWidget: ExpandableToolHeader): void {
    super.didUpdateWidget(oldWidget);
    const oldStatus = oldWidget.config.status;
    const newStatus = this.widget.config.status;
    const wasAnimating = oldStatus ? shouldAnimate(oldStatus) : false;
    const nowAnimating = newStatus ? shouldAnimate(newStatus) : false;

    if (!wasAnimating && nowAnimating) {
      this._startAnimation();
    } else if (wasAnimating && !nowAnimating) {
      this._stopAnimation();
    }

    // Sync uncontrolled → controlled transition
    if (!this._isControlled) return;
    // In controlled mode, external isExpanded may have changed
    // setState is needed so build() picks up the new value
    if (oldWidget.config.isExpanded !== this.widget.config.isExpanded) {
      this.setState();
    }
  }

  override dispose(): void {
    this._stopAnimation();
    super.dispose();
  }

  // ────────────────────────────────────────────────
  //  Animation helpers
  //  逆向: c9R._startAnimation / _stopAnimation (misc_utils.js:6386-6395)
  // ────────────────────────────────────────────────

  private _startAnimation(): void {
    if (this._animationTimer) return;
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinnerFrame =
          (this._spinnerFrame + 1) % ExpandableToolHeaderState.BRAILLE_FRAMES.length;
      });
    }, 200);
  }

  private _stopAnimation(): void {
    if (!this._animationTimer) return;
    clearInterval(this._animationTimer);
    this._animationTimer = undefined;
  }

  // ────────────────────────────────────────────────
  //  Toggle handler
  //  逆向: nf onClick → onToggle(!expanded) (misc_utils.js:6432)
  // ────────────────────────────────────────────────

  private _toggle = (): void => {
    const newExpanded = !this._isExpanded;
    if (this._isControlled) {
      // Controlled: delegate to parent
      this.widget.config.onToggle?.(newExpanded);
    } else {
      // Uncontrolled: manage internally
      this.setState(() => {
        this._expanded = newExpanded;
      });
      this.widget.config.onToggle?.(newExpanded);
    }
  };

  // ────────────────────────────────────────────────
  //  Build
  //  逆向: c9R.build (misc_utils.js:6397-6437) + parent show/hide
  // ────────────────────────────────────────────────

  build(_context: BuildContext): Widget {
    const { title, status, statusColor, trailing, child } = this.widget.config;
    const isExpanded = this._isExpanded;

    // ── Build header text spans ──
    // 逆向: c9R.build lines 6407-6421
    const headerSpans: TextSpan[] = [];

    // Status icon (if status provided)
    // 逆向: if (r) { let l = _shouldAnimate(r) ? spinner.toBraille() : xW(r); ... }
    if (status) {
      const icon = shouldAnimate(status)
        ? ExpandableToolHeaderState.BRAILLE_FRAMES[this._spinnerFrame]
        : statusToIcon(status);
      const iconColor = statusColor ?? MUTED_COLOR;
      headerSpans.push(
        new TextSpan({
          text: `${icon} `,
          style: new TextStyle({ foreground: iconColor }),
        }),
      );
    }

    // Title (tool name)
    // 逆向: c.push(new G(e, new cT({ color: R.app.toolName })))
    headerSpans.push(
      new TextSpan({
        text: title,
        style: new TextStyle({ foreground: TOOL_NAME_COLOR }),
      }),
    );

    const labelWidget = new RichText({
      text: new TextSpan({ children: headerSpans }),
    }) as unknown as Widget;

    // Chevron indicator
    // 逆向: c9R.build — i = a ? "▼" : "▶"
    // 逆向: new xT({ text: new G(i, new cT({ color: R.colors.mutedForeground })) })
    const chevron = new RichText({
      text: new TextSpan({
        text: isExpanded ? "\u25BC" : "\u25B6",
        style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
      }),
    }) as unknown as Widget;

    // Assemble header row: [label, (trailing?), spacer, chevron]
    // 逆向: new G0({ cursor: "pointer", onClick: ..., child: new T0({ children: [s, SizedBox(1), A] }) })
    const rowChildren: Widget[] = [labelWidget];

    if (trailing) {
      rowChildren.push(new SizedBox({ width: 1 }) as unknown as Widget);
      rowChildren.push(trailing);
    }

    rowChildren.push(new SizedBox({ width: 1 }) as unknown as Widget);
    rowChildren.push(chevron);

    const headerRow = new GestureDetector({
      onTap: this._toggle,
      child: new Row({
        children: rowChildren,
      }) as unknown as Widget,
    }) as unknown as Widget;

    // Collapsed: just header
    // 逆向: parent pattern (misc_utils.js:6467) — if (!expanded) return header
    if (!isExpanded) {
      return headerRow;
    }

    // Expanded: header + child
    // 逆向: parent pattern (misc_utils.js:6468-6471) — Column([header, ...children])
    return new Column({
      children: [headerRow, child],
    }) as unknown as Widget;
  }
}
