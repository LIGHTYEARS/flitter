/**
 * ThreadReferenceWidget -- single-line thread reference indicator.
 *
 * Renders a compact "↳ Forked from: <title>" / "↳ Handed off from: <title>"
 * / "↳ Mentioned in: <title>" line, matching amp's E8R widget.
 *
 * 逆向: E8R (StatelessWidget) in chunk-006.js:32858-32903
 *
 * E8R.build():
 *   - Takes { type, title, threadID, labelColor, mutedColor, foregroundColor, onNavigate }
 *   - Returns new XT({ height: 1,
 *       child: new T0({ mainAxisAlignment: "end",
 *         children: [new G0({ cursor: "pointer", onClick: () => onNavigate(threadID),
 *           child: new uR({ padding: TR.only({ right: 2 }),
 *             child: new xT({ text: new G("", void 0, [
 *               new G("↳ ", new cT({ color: labelColor })),
 *               new G(`${label}: `, new cT({ color: mutedColor, dim: true })),
 *               new G(title, new cT({ color: foregroundColor }))
 *             ])})
 *           })
 *         }])
 *       })
 *   })
 *
 * Label resolution via az0() in modules/1961_unknown_nz0.js:
 *   "handoff" → "Handed off from"
 *   "fork"    → "Forked from"
 *   (no "mention" case in amp — Flitter extends with "Mentioned in")
 *
 * Title truncation:
 *   chunk-006.js:37000-37001:
 *     KT = 40;
 *     $T = B9(Q.title);   // grapheme split
 *     OT = $T.length > 40 ? $T.slice(0, 39).join("") + "…" : Q.title;
 *
 * Color assignment:
 *   chunk-006.js:36998:
 *     type === "handoff" ? h.handoffMode : r.primary
 *   mutedColor = r.mutedForeground
 *   foregroundColor = r.foreground
 *
 * @module thread-reference-widget
 */

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  EdgeInsets,
  GestureDetector,
  Padding,
  RichText,
  Row,
  SizedBox,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Thread reference type.
 *
 * 逆向: chunk-006.js:34757 — filter(h => h.type === "fork" || h.type === "handoff")
 *        "mention" is a Flitter extension for broader reference tracking.
 */
export type ThreadReferenceType = "fork" | "handoff" | "mention";

/**
 * Props for ThreadReferenceWidget.
 *
 * 逆向: E8R.props = { type, title, threadID, labelColor, mutedColor, foregroundColor, onNavigate }
 * We simplify by computing colors internally from type + theme defaults.
 */
export interface ThreadReferenceProps {
  /** Type of thread reference. */
  type: ThreadReferenceType;
  /** Title of the parent thread (displayed, may be truncated). */
  parentTitle: string;
  /** ID of the parent thread (for navigation). */
  parentThreadId: string;
  /** Optional callback when the user clicks to navigate to the parent thread. */
  onNavigate?: (threadId: string) => void;
}

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

/**
 * Maximum grapheme count for title truncation.
 *
 * 逆向: chunk-006.js:36999 — KT = 40
 */
const MAX_TITLE_LENGTH = 40;

/**
 * Primary color for fork / mention references.
 *
 * 逆向: chunk-006.js:36998 — r.primary → LT.blue (indexed 4)
 */
const PRIMARY_COLOR = Color.indexed(4);

/**
 * Handoff mode color.
 *
 * 逆向: chunk-006.js:36998 — h.handoffMode → LT.magenta (indexed 5)
 * 逆向: modules/2179_unknown_yS.js — handoffMode: Color.magenta()
 */
const HANDOFF_COLOR = Color.indexed(5);

/**
 * Muted foreground color for the label.
 *
 * 逆向: chunk-006.js:37007 — r.mutedForeground → default + dim
 */
const MUTED_COLOR = Color.default();

/**
 * Standard foreground for the title text.
 *
 * 逆向: chunk-006.js:37008 — r.foreground → default
 */
const FOREGROUND_COLOR = Color.default();

// ════════════════════════════════════════════════════
//  Label mapping
// ════════════════════════════════════════════════════

/**
 * Map thread reference type to display label.
 *
 * 逆向: az0() in modules/1961_unknown_nz0.js:1-8
 *   "handoff" → "Handed off from"
 *   "fork"    → "Forked from"
 *   "mention" → "Mentioned in" (Flitter extension)
 */
function getTypeLabel(type: ThreadReferenceType): string {
  switch (type) {
    case "handoff":
      return "Handed off from";
    case "fork":
      return "Forked from";
    case "mention":
      return "Mentioned in";
  }
}

/**
 * Get label color based on thread reference type.
 *
 * 逆向: chunk-006.js:36998
 *   type === "handoff" ? h.handoffMode : r.primary
 */
function getLabelColor(type: ThreadReferenceType): Color {
  return type === "handoff" ? HANDOFF_COLOR : PRIMARY_COLOR;
}

// ════════════════════════════════════════════════════
//  Title truncation
// ════════════════════════════════════════════════════

/**
 * Truncate title to MAX_TITLE_LENGTH graphemes.
 *
 * 逆向: chunk-006.js:37000-37001
 *   $T = B9(Q.title);  // grapheme split
 *   OT = $T.length > 40 ? $T.slice(0, 39).join("") + "…" : Q.title;
 *
 * We use Array.from() for Unicode-safe splitting (approximates B9 grapheme split).
 */
export function truncateTitle(title: string): string {
  const graphemes = Array.from(title);
  if (graphemes.length > MAX_TITLE_LENGTH) {
    return graphemes.slice(0, MAX_TITLE_LENGTH - 1).join("") + "\u2026";
  }
  return title;
}

// ════════════════════════════════════════════════════
//  ThreadReferenceWidget
// ════════════════════════════════════════════════════

/**
 * Single-line thread reference indicator.
 *
 * 逆向: E8R extends B0 (StatelessWidget) in chunk-006.js:32858-32903
 *
 * Renders: ↳ {Label}: {Title}
 * Height constrained to 1 line. Right-aligned within parent.
 * Clickable if onNavigate is provided.
 */
export class ThreadReferenceWidget extends StatelessWidget {
  readonly props: ThreadReferenceProps;

  constructor(props: ThreadReferenceProps) {
    super();
    this.props = props;
  }

  /**
   * Build the thread reference indicator.
   *
   * 逆向: E8R.build() (chunk-006.js:32864-32902)
   *
   * Structure:
   *   SizedBox({ height: 1 })       — constrain to 1 line (amp: new XT({ height: 1 }))
   *     Row({ mainAxisAlignment: "end" })  — right-align (amp: new T0({ mainAxisAlignment: "end" }))
   *       GestureDetector (onClick → onNavigate)  — clickable (amp: new G0({ cursor: "pointer" }))
   *         Padding({ right: 2 })   — (amp: TR.only({ right: 2 }))
   *           RichText(TextSpan([   — (amp: new xT({ text: new G(...) }))
   *             "↳ " (labelColor)
   *             "{label}: " (muted, dim)
   *             "{title}" (foreground, underlined if navigable)
   *           ]))
   */
  build(_context: BuildContext): Widget {
    const { type, parentTitle, parentThreadId, onNavigate } = this.props;

    const label = getTypeLabel(type);
    const labelColor = getLabelColor(type);
    const displayTitle = truncateTitle(parentTitle);

    // 逆向: E8R.build → TextSpan tree
    const richText = new RichText({
      text: new TextSpan({
        children: [
          // "↳ " prefix in label color
          // 逆向: new G("↳ ", new cT({ color: t }))
          new TextSpan({
            text: "\u21B3 ",
            style: new TextStyle({ foreground: labelColor, dim: true }),
          }),
          // "{label}: " in muted + dim
          // 逆向: new G(`${c}: `, new cT({ color: r, dim: true }))
          new TextSpan({
            text: `${label}: `,
            style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
          }),
          // title in foreground (underlined if navigable)
          // 逆向: new G(a, new cT({ color: h }))
          new TextSpan({
            text: displayTitle,
            style: new TextStyle({
              foreground: FOREGROUND_COLOR,
              underline: onNavigate !== undefined,
            }),
          }),
        ],
      }),
    });

    // 逆向: new uR({ padding: TR.only({ right: 2 }), child: xT })
    const padded = new Padding({
      padding: EdgeInsets.only({ right: 2 }),
      child: richText,
    });

    // 逆向: new G0({ cursor: "pointer", onClick: () => onNavigate(threadID), child: padded })
    let clickable: Widget;
    if (onNavigate) {
      clickable = new GestureDetector({
        onTap: () => onNavigate(parentThreadId),
        child: padded,
      });
    } else {
      clickable = padded;
    }

    // 逆向: new T0({ mainAxisAlignment: "end", children: [clickable] })
    const row = new Row({
      mainAxisAlignment: "end",
      children: [clickable],
    });

    // 逆向: new XT({ height: 1, child: row })
    return new SizedBox({ height: 1, child: row });
  }
}
