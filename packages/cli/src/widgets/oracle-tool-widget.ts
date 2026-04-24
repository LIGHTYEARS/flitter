/**
 * OracleToolWidget — displays Oracle subagent tool results.
 *
 * Oracle is a "senior advisor" subagent. This widget renders the Oracle tool
 * run inside the conversation view with:
 *   - Header: spinner (in-progress) or status icon (done/error/cancelled) + "Oracle" bold
 *   - Body (indented left/right 2 cols): input task text, progress messages,
 *     and output result, all rendered as plain text in a Column.
 *
 * 逆向: modules/1472_tui_components/misc_utils.js lines 7601-7628 — M9R (Oracle wrapper)
 * 逆向: modules/1472_tui_components/misc_utils.js lines 7466-7599 — L9R/qv (shared subagent renderer)
 *
 * Key amp patterns:
 *   M9R.build() — wraps L9R (qv) with name="Oracle", inputSection from toolUse.input.task,
 *                  outputSection from toolRun.result (for done/in-progress)
 *
 *   L9R.build() — StatefulWidget that produces:
 *     1. A header via x3 (ExpandableToolHeader) keyed on {name, status, detail}
 *     2. A body column inside uR (Padding) with padding TR(2,0,2,0) = left:2 right:2
 *     3. Body contains: input markdown, progress messages, thinking blocks, tool widgets, output
 *     4. The whole thing wrapped in d9R (a two-child Column: header + body)
 *
 *   For flitter we use ExpandableToolHeader for the header and a Padding+Column for the body.
 *   Thinking blocks and nested tool widgets are deferred (not yet implemented in flitter);
 *   only input/output/status text is rendered.
 *
 * @module oracle-tool-widget
 */

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  Container,
  EdgeInsets,
  RichText,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { ExpandableToolHeader, type ToolStatus } from "./expandable-tool-header.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Configuration for OracleToolWidget.
 *
 * Maps directly from a tool run's observable state.
 *
 * 逆向: M9R.build() — toolUse.input.task → inputSection, toolRun.result → outputSection
 *        toolRun.status → determines header icon and whether result is shown
 */
export interface OracleToolWidgetConfig {
  /**
   * Display name for the tool (defaults to "Oracle").
   * 逆向: M9R.build() — name: "Oracle"
   */
  toolName?: string;

  /**
   * Current execution status.
   * 逆向: L9R.build() — toolRun.status — controls header icon and progress rendering
   */
  status: ToolStatus;

  /**
   * Task input text (markdown).
   * 逆向: M9R.build() — inputSection: typeof R.input.task === "string" ? { content: R.input.task } : void 0
   */
  input?: string;

  /**
   * Output / result text (markdown).
   * 逆向: M9R.build() — outputSection: r ? { content: r } : void 0
   *        where r = a.status === "done" ? a.result : a.status === "in-progress" ? a.result : void 0
   */
  output?: string;

  /**
   * Error message (shown when status === "error" or "cancelled").
   * Flitter extension — amp uses the result field directly.
   */
  error?: string;

  /**
   * Progress messages emitted during execution.
   * 逆向: L9R.build() — R.progress messages pushed as Z3({markdown: k.message})
   */
  progress?: string[];
}

// ════════════════════════════════════════════════════
//  Color constants
// ════════════════════════════════════════════════════

/**
 * Muted foreground for secondary text.
 * 逆向: R.colors.mutedForeground — terminal default
 */
const MUTED_COLOR = Color.default();

// ════════════════════════════════════════════════════
//  OracleToolWidget
// ════════════════════════════════════════════════════

/**
 * OracleToolWidget — renders an Oracle subagent tool run.
 *
 * This is a StatelessWidget because ExpandableToolHeader owns all state
 * (expansion toggle + spinner animation). The Oracle wrapper itself has
 * no independent mutable state.
 *
 * 逆向: M9R extends B0 (StatelessWidget) — wraps L9R
 *        L9R extends wR (StatefulWidget) — manages thinking-block expansion state
 *
 * For this implementation we use StatelessWidget and delegate animation state
 * to ExpandableToolHeader (which already manages the braille spinner).
 */
export class OracleToolWidget extends StatelessWidget {
  readonly config: OracleToolWidgetConfig;

  constructor(config: OracleToolWidgetConfig) {
    super();
    this.config = config;
  }

  /**
   * Build the Oracle widget tree.
   *
   * 逆向: L9R.build() (lines 7489-7598)
   *
   * Structure when there IS body content:
   *   d9R(header, body)         → Column([ExpandableToolHeader, Padding(body)])
   *     header  = x3({name, status, children: detail})
   *     body    = uR(padding: TR(2,0,2,0), child: Column([input?, progress*, output?]))
   *
   * Structure when body is empty:
   *   Returns just the header (ExpandableToolHeader with empty child).
   *
   * 逆向: L9R.build() lines 7576-7577 — if (A.length === 0) return shrink or just header
   *        lines 7585-7598 — if body has content, wrap in d9R
   */
  build(_context: BuildContext): Widget {
    const { toolName = "Oracle", status, input, output, error, progress } = this.config;

    // ── Build body children ──
    // 逆向: L9R.build() lines 7508-7575 — A array populated with Z3 (markdown) widgets
    const bodyChildren: Widget[] = [];

    // Input section (task text)
    // 逆向: L9R.build() line 7509 — if (t) A.push(new Z3({ markdown: t.content }))
    if (input && input.trim().length > 0) {
      bodyChildren.push(_makeTextWidget(input));
    }

    // Progress messages
    // 逆向: L9R.build() lines 7526-7528 — if (k?.message?.trim().length) A.push(new Z3({ markdown: k.message }))
    if (progress) {
      for (const msg of progress) {
        if (msg.trim().length > 0) {
          bodyChildren.push(_makeTextWidget(msg));
        }
      }
    }

    // Output section
    // 逆向: L9R.build() line 7573 — if (r && !n) A.push(new Z3({ markdown: r.content }))
    if (output && output.trim().length > 0) {
      bodyChildren.push(_makeTextWidget(output));
    }

    // Error section (flitter extension)
    if (error && error.trim().length > 0) {
      bodyChildren.push(_makeErrorWidget(error));
    }

    // ── Assemble body ──
    // 逆向: L9R.build() lines 7578-7598 — uR(padding: TR(2,0,2,0), child: Column(A))
    // TR(2,0,2,0) → left=2, top=0, right=2, bottom=0 → EdgeInsets.symmetric({ horizontal: 2 })
    const hasBody = bodyChildren.length > 0;

    const bodyWidget = hasBody
      ? (new Container({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Column({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: bodyChildren,
          }) as unknown as Widget,
        }) as unknown as Widget)
      : (_makeShrink() as unknown as Widget);

    // ── Header via ExpandableToolHeader ──
    // 逆向: L9R.build() lines 7503-7507 — x3({ name, status, children: detail })
    // The header is always shown (hideHeader is not exposed in our interface).
    const header = new ExpandableToolHeader({
      title: toolName,
      status,
      child: bodyWidget,
    });

    return header as unknown as Widget;
  }
}

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Create a plain text widget for a body section.
 *
 * In amp, body sections use Z3 (MarkdownText). For flitter we use
 * RichText with plain text until MarkdownText is available.
 *
 * 逆向: Z3({ markdown: content }) (misc_utils.js:7509, 7526, 7573)
 */
function _makeTextWidget(text: string): Widget {
  return new RichText({
    text: new TextSpan({
      text,
      style: new TextStyle({ foreground: Color.default() }),
    }),
  }) as unknown as Widget;
}

/**
 * Create a red-tinted text widget for error messages.
 *
 * 逆向: flitter extension — amp surfaces errors via the result field;
 *        we add explicit error styling for the error/cancelled states.
 */
function _makeErrorWidget(text: string): Widget {
  return new RichText({
    text: new TextSpan({
      text,
      style: new TextStyle({ foreground: Color.indexed(1) }), // red
    }),
  }) as unknown as Widget;
}

/**
 * Return a zero-size placeholder widget.
 *
 * 逆向: L9R.build() line 7577 — XT.shrink() → SizedBox(0)
 */
function _makeShrink(): Widget {
  return new RichText({
    text: new TextSpan({
      text: "",
      style: new TextStyle({ foreground: MUTED_COLOR }),
    }),
  }) as unknown as Widget;
}
