/**
 * LookAtToolWidget — displays "Look At" file inspection tool results.
 *
 * The "Look At" tool reads a file (optionally comparing to reference files)
 * with an objective goal. This widget renders the tool run in the
 * conversation view.
 *
 * Layout:
 *   ExpandableToolHeader("Look At", status)
 *     ├── header detail: path as hyperlink (fileReference, dim, underline) + objective (dim)
 *     └── body: optional "Comparing to:" section listing compareFiles
 *
 * 逆向: chunk-006.js line 29608 — N9R (StatelessWidget extends B0)
 *
 * N9R.build() structure:
 *   1. If path → push HyperLink(path, fileReference, dim, underline) into t[]
 *   2. If objective → push dim text into r[]
 *   3. If referenceFiles.length === 1 → h = Row(["comparing to: ", HyperLink(file)])
 *   4. If referenceFiles.length > 1 → h = Column(["comparing to:", ...file rows])
 *   5. Return x3({ name:"Look At", status, children:t, tail:r, content:h })
 *
 * Key amp patterns:
 *   - ki(path, T) — shortens the path for display (e.g., strips cwd prefix)
 *     In flitter we use the raw path (no cwd stripping yet).
 *   - JM(path, T) — builds a file:// URI for the hyperlink
 *     In flitter we use RichText with underline styling as a visual cue.
 *   - H3 — amp's hyperlink widget; flitter uses RichText + underline style.
 *
 * @module lookat-tool-widget
 */

import type { BuildContext, Element, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  Container,
  EdgeInsets,
  RichText,
  Row,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { type AppTheme, AppThemeController } from "./app-theme-controller.js";
import { ExpandableToolHeader, type ToolStatus } from "./expandable-tool-header.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * LookAtToolWidget configuration.
 *
 * 逆向: N9R.props:
 *   toolUse.input.path          → path
 *   toolUse.input.objective     → objective
 *   toolUse.input.referenceFiles → compareFiles
 *   toolRun.status              → status
 */
export interface LookAtToolWidgetConfig {
  /** Current execution status. */
  status: ToolStatus;
  /**
   * File path being inspected.
   * 逆向: N9R.build() — R.input.path (chunk-006.js:29622)
   */
  path?: string;
  /**
   * Goal / objective for reading the file.
   * 逆向: N9R.build() — R.input.objective (chunk-006.js:29635)
   */
  objective?: string;
  /**
   * Files to compare against.
   * 逆向: N9R.build() — R.input.referenceFiles (chunk-006.js:29639)
   */
  compareFiles?: string[];
  /**
   * Error message (populated when status === "error").
   * Flitter extension — amp doesn't surface this separately in N9R.
   */
  error?: string;
}

// ════════════════════════════════════════════════════
//  Color fallbacks
// ════════════════════════════════════════════════════

/** Fallback: muted dim foreground */
const MUTED_COLOR = Color.default();

/** Fallback: file reference / link color (cyan) */
const FILE_REF_COLOR = Color.indexed(6);

/** Fallback: error color (red) */
const ERROR_COLOR = Color.indexed(1);

// ════════════════════════════════════════════════════
//  LookAtToolWidget
// ════════════════════════════════════════════════════

/**
 * LookAtToolWidget — renders a "Look At" file inspection tool run.
 *
 * StatelessWidget because all state (expansion + spinner) is owned by
 * ExpandableToolHeader.
 *
 * 逆向: N9R extends B0 (StatelessWidget) (chunk-006.js:29608)
 */
export class LookAtToolWidget extends StatelessWidget {
  readonly config: LookAtToolWidgetConfig;

  constructor(config: LookAtToolWidgetConfig) {
    super();
    this.config = config;
  }

  /**
   * Build the LookAt widget tree.
   *
   * 逆向: N9R.build() (chunk-006.js:29614-29693)
   *
   * Structure:
   *   ExpandableToolHeader("Look At", status)
   *     child: Column([
   *       path-hyperlink?,     ← t[] in amp (header detail children)
   *       objective-text?,     ← r[] in amp (tail)
   *       compare-section?,    ← h in amp (content widget)
   *       error-text?,         ← flitter extension
   *     ])
   */
  build(context: BuildContext): Widget {
    const { status, path, objective, compareFiles, error } = this.config;

    // Resolve theme colors (graceful fallback if no provider in tree)
    let appTheme: AppTheme | null = null;
    try {
      appTheme = AppThemeController.of(context as unknown as Element);
    } catch {
      // No theme in tree — use hardcoded fallbacks
    }

    const fileRefColor = appTheme?.fileReference ?? FILE_REF_COLOR;
    const toolErrorColor = appTheme?.toolError ?? ERROR_COLOR;
    const mutedColor = MUTED_COLOR;

    const bodyChildren: Widget[] = [];

    // ── Path hyperlink ──
    // 逆向: N9R.build() lines 29622-29633
    //   t.push(new H3({ uri: JM(s, T), text: ki(s, T), style: fileReference + dim + underline }))
    if (path && path.trim().length > 0) {
      bodyChildren.push(
        new RichText({
          text: new TextSpan({
            text: path,
            style: new TextStyle({
              foreground: fileRefColor,
              dim: true,
              underline: true,
            }),
          }),
        }) as unknown as Widget,
      );
    }

    // ── Objective text ──
    // 逆向: N9R.build() lines 29635-29637
    //   r.push(new G(R.input.objective, new cT({ dim: true })))
    if (objective && objective.trim().length > 0) {
      bodyChildren.push(
        new RichText({
          text: new TextSpan({
            text: objective,
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        }) as unknown as Widget,
      );
    }

    // ── Compare files section ──
    // 逆向: N9R.build() lines 29638-29686
    //   Single file:  Row(["comparing to: ", HyperLink(file)])
    //   Multiple:     Column(["comparing to:", ...file rows with "  - " prefix])
    const files = compareFiles ?? [];
    if (files.length === 1) {
      // 逆向: lines 29641-29657 — T0 (Row) with "comparing to: " + H3(file)
      const compareRow = new Row({
        mainAxisSize: "min",
        children: [
          new RichText({
            text: new TextSpan({
              text: "comparing to: ",
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
          }) as unknown as Widget,
          new RichText({
            text: new TextSpan({
              text: files[0],
              style: new TextStyle({
                foreground: fileRefColor,
                dim: true,
                underline: true,
              }),
            }),
          }) as unknown as Widget,
        ],
      }) as unknown as Widget;
      bodyChildren.push(compareRow);
    } else if (files.length > 1) {
      // 逆向: lines 29658-29685 — xR (Column) with header + "  - " rows
      const compareFileRows: Widget[] = files.map(
        (f) =>
          new Row({
            mainAxisSize: "min",
            children: [
              new RichText({
                text: new TextSpan({
                  text: "  - ",
                  style: new TextStyle({ foreground: mutedColor, dim: true }),
                }),
              }) as unknown as Widget,
              new RichText({
                text: new TextSpan({
                  text: f,
                  style: new TextStyle({
                    foreground: fileRefColor,
                    dim: true,
                    underline: true,
                  }),
                }),
              }) as unknown as Widget,
            ],
          }) as unknown as Widget,
      );

      const compareSection = new Column({
        mainAxisSize: "min",
        crossAxisAlignment: "start",
        children: [
          new RichText({
            text: new TextSpan({
              text: "comparing to:",
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
          }) as unknown as Widget,
          ...compareFileRows,
        ],
      }) as unknown as Widget;
      bodyChildren.push(compareSection);
    }

    // ── Error text (flitter extension) ──
    if (status === "error" && error && error.trim().length > 0) {
      bodyChildren.push(
        new RichText({
          text: new TextSpan({
            text: error,
            style: new TextStyle({ foreground: toolErrorColor }),
          }),
        }) as unknown as Widget,
      );
    }

    // ── Assemble body ──
    const bodyWidget: Widget =
      bodyChildren.length > 0
        ? (new Container({
            padding: EdgeInsets.symmetric({ horizontal: 2 }),
            child: new Column({
              crossAxisAlignment: "start",
              mainAxisSize: "min",
              children: bodyChildren,
            }) as unknown as Widget,
          }) as unknown as Widget)
        : (_makeShrink() as unknown as Widget);

    return new ExpandableToolHeader({
      title: "Look At",
      status,
      child: bodyWidget,
    }) as unknown as Widget;
  }
}

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Return a zero-size placeholder widget.
 * 逆向: XT.shrink() / SizedBox(0)
 */
function _makeShrink(): Widget {
  return new RichText({
    text: new TextSpan({
      text: "",
      style: new TextStyle({ foreground: MUTED_COLOR }),
    }),
  }) as unknown as Widget;
}
