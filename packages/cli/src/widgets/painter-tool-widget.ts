/**
 * PainterToolWidget — displays AI image generation (Painter) tool results.
 *
 * The Painter tool generates images based on a prompt. In a terminal that
 * cannot display inline images, we show a text fallback per image entry.
 *
 * Layout:
 *   ExpandableToolHeader("Painter", status)
 *     ├── detail: prompt truncated to 80 chars (dim)
 *     └── body (when done + images):
 *           Column of image entries:
 *             [Image: <alt>] or [Generated Image <n>]
 *           Each entry is optionally prefixed with a toggle chevron.
 *
 * 逆向: chunk-006.js line 29696 — U9R (StatefulWidget), H9R (State)
 *
 * H9R.build() structure:
 *   1. If prompt → truncate to 80 chars, push dim text into r[]
 *   2. If error → push error text into h[]
 *   3. If done + result[] → for each image entry build label row +
 *      image block or fallback text
 *   4. Return x3({ name:"Painter", status, children:r, tail:h||void, content:i })
 *
 * Key amp patterns:
 *   - supportsKittyGraphics() — checks terminal capabilities;
 *     if false, shows "[Click to preview…]" fallback text.
 *     In flitter we always show fallback text (no kitty graphics yet).
 *   - toggleExpanded(n) / imageStates: per-image expand/collapse.
 *     We preserve this pattern using StatefulWidget + state map.
 *
 * @module painter-tool-widget
 */

import type { BuildContext, Element, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  Container,
  EdgeInsets,
  RichText,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { type AppTheme, AppThemeController } from "./app-theme-controller.js";
import { ExpandableToolHeader, type ToolStatus } from "./expandable-tool-header.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * A single generated image entry.
 * 逆向: H9R.build() — s = a.result (array of image objects with savedPath)
 *        In flitter the caller provides the parsed image data.
 */
export interface PainterImage {
  /** Optional URL or saved path to the image. */
  url?: string;
  /** Optional alt-text / description for fallback display. */
  alt?: string;
}

/**
 * PainterToolWidget configuration.
 *
 * 逆向: U9R.props:
 *   toolUse.input.prompt  → prompt
 *   toolRun.status        → status
 *   toolRun.result[]      → images (array of image objects)
 *   toolRun.error.message → error
 */
export interface PainterToolWidgetConfig {
  /** Current execution status. */
  status: ToolStatus;
  /**
   * Image generation prompt (optional).
   * 逆向: H9R.build() — c = R.input.prompt; truncated to 80 chars
   */
  prompt?: string;
  /**
   * Generated images (populated when status === "done").
   * 逆向: H9R.build() — s = a.result (done + array check)
   */
  images?: PainterImage[];
  /**
   * Error message (populated when status === "error").
   * 逆向: H9R.build() — a.status === "error" && a.error?.message
   */
  error?: string;
}

/** Per-image collapse state (mirrors H9R.imageStates map). */
interface ImageState {
  expanded: boolean;
}

// ════════════════════════════════════════════════════
//  Color fallbacks (used when AppThemeController not in tree)
// ════════════════════════════════════════════════════

/** Muted dim foreground for detail text. */
const MUTED_COLOR = Color.default();

/** Fallback error color (red). */
const ERROR_COLOR = Color.indexed(1);

/** Fallback fileReference / link color (cyan). */
const LINK_COLOR = Color.indexed(6);

// ════════════════════════════════════════════════════
//  PainterToolWidget
// ════════════════════════════════════════════════════

/**
 * PainterToolWidget — renders an AI image generation tool run.
 *
 * StatefulWidget because each image entry has independent expand/collapse state.
 *
 * 逆向: U9R extends NR (StatefulWidget) — U9R.createState() → new H9R()
 */
export class PainterToolWidget extends StatefulWidget {
  readonly config: PainterToolWidgetConfig;

  constructor(config: PainterToolWidgetConfig) {
    super();
    this.config = config;
  }

  createState(): PainterToolWidgetState {
    return new PainterToolWidgetState();
  }
}

// ════════════════════════════════════════════════════
//  PainterToolWidgetState
// ════════════════════════════════════════════════════

/**
 * State for PainterToolWidget.
 *
 * Mirrors H9R:
 *   imageStates: Map<number, ImageState>  — per-image expand/collapse
 *
 * 逆向: H9R.imageStates = new Map() (chunk-006.js:29707)
 */
export class PainterToolWidgetState extends State<PainterToolWidget> {
  /**
   * Per-image expand/collapse state.
   * 逆向: H9R.imageStates (chunk-006.js:29707)
   */
  private readonly _imageStates = new Map<number, ImageState>();

  /**
   * Get (or lazily create) the state for image at index n.
   * 逆向: H9R.getImageState(T) — if (!this.imageStates.has(T)) this.imageStates.set(T, { expanded: true, downloadStatus: null })
   */
  getImageState(index: number): ImageState {
    if (!this._imageStates.has(index)) {
      this._imageStates.set(index, { expanded: true });
    }
    return this._imageStates.get(index) as ImageState;
  }

  /**
   * Toggle the expanded state of image at index n.
   * 逆向: H9R.toggleExpanded(T) — setState(() => { R.expanded = !R.expanded })
   */
  toggleExpanded(index: number): void {
    const state = this.getImageState(index);
    this.setState(() => {
      state.expanded = !state.expanded;
    });
  }

  // ────────────────────────────────────────────────
  //  Build
  //  逆向: H9R.build() (chunk-006.js:29754-29869)
  // ────────────────────────────────────────────────

  build(context: BuildContext): Widget {
    const { status, prompt, images, error } = this.widget.config;

    // Resolve theme colors (graceful fallback if no provider in tree)
    let appTheme: AppTheme | null = null;
    try {
      appTheme = AppThemeController.of(context as unknown as Element);
    } catch {
      // No theme in tree — use hardcoded fallbacks
    }

    const toolErrorColor = appTheme?.toolError ?? ERROR_COLOR;
    const fileRefColor = appTheme?.fileReference ?? LINK_COLOR;
    const mutedColor = MUTED_COLOR;

    // ── r: header detail children (prompt text) ──
    // 逆向: H9R.build() lines 29764-29774 — if (c) { let s = c.length > 80 ? ... }
    const detailChildren: Widget[] = [];
    if (prompt && prompt.trim().length > 0) {
      const truncated = prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt;
      detailChildren.push(
        new RichText({
          text: new TextSpan({
            text: truncated,
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        }) as unknown as Widget,
      );
    }

    // ── h: tail children (error) ──
    // 逆向: H9R.build() lines 29775-29778 — if error push error text
    const tailChildren: Widget[] = [];
    if (status === "error" && error && error.trim().length > 0) {
      tailChildren.push(
        new RichText({
          text: new TextSpan({
            text: `  Error: ${error}`,
            style: new TextStyle({ foreground: toolErrorColor }),
          }),
        }) as unknown as Widget,
      );
    }

    // ── i: content widget (image list) ──
    // 逆向: H9R.build() lines 29779-29860 — if done + result array → build image blocks
    let contentWidget: Widget | undefined;
    if (status === "done" && images && images.length > 0) {
      const imageEntryWidgets: Widget[] = [];

      for (let index = 0; index < images.length; index++) {
        const img = images[index];
        const imgState = this.getImageState(index);

        // Label: "Generated Image" (singular) or "Image N" (plural)
        // 逆向: H9R.build() lines 29800-29803
        const labelText = images.length === 1 ? "Generated Image" : `Image ${index + 1}`;

        // Chevron for toggle
        // 逆向: H9R.build() lines 29788-29796 — onClick toggleExpanded(n)
        const chevron = new RichText({
          text: new TextSpan({
            text: imgState.expanded ? "\u25BC " : "\u25B6 ",
            style: new TextStyle({ foreground: fileRefColor }),
          }),
        }) as unknown as Widget;

        const label = new RichText({
          text: new TextSpan({
            text: labelText,
            style: new TextStyle({ foreground: mutedColor }),
          }),
        }) as unknown as Widget;

        // When expanded: show fallback text (no kitty graphics in flitter yet)
        // 逆向: H9R.build() lines 29838-29851 — else if (m.expanded && !A) →
        //        "[Click to preview, right-click to save - terminal does not support inline images]"
        const headerRow = new RichText({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: imgState.expanded ? "\u25BC " : "\u25B6 ",
                style: new TextStyle({ foreground: fileRefColor }),
              }),
              new TextSpan({
                text: labelText,
                style: new TextStyle({ foreground: mutedColor }),
              }),
            ],
          }),
        }) as unknown as Widget;

        const entryChildren: Widget[] = [headerRow];

        if (imgState.expanded) {
          // Fallback text (alt-text or generic)
          // 逆向: no kitty support path — show terminal-image fallback text
          const altText = img.alt ? `[Image: ${img.alt}]` : `[Generated Image ${index + 1}]`;

          entryChildren.push(
            new RichText({
              text: new TextSpan({
                text: `  ${altText}`,
                style: new TextStyle({ foreground: mutedColor, dim: true }),
              }),
            }) as unknown as Widget,
          );
        }

        // Suppress unused variable warnings from simpler variable builds above
        void chevron;
        void label;

        imageEntryWidgets.push(
          new Column({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: entryChildren,
          }) as unknown as Widget,
        );
      }

      if (imageEntryWidgets.length > 0) {
        contentWidget = new Container({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Column({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: imageEntryWidgets,
          }) as unknown as Widget,
        }) as unknown as Widget;
      }
    }

    // ── Assemble body widget ──
    // 逆向: H9R.build() lines 29862-29868 — x3({ name:"Painter", status, children:r, tail:h||void, content:i })
    // In flitter: wrap detail + tail + content into ExpandableToolHeader child
    const bodyChildren: Widget[] = [...detailChildren, ...tailChildren];
    if (contentWidget) {
      bodyChildren.push(contentWidget);
    }

    const bodyWidget: Widget =
      bodyChildren.length > 0
        ? (new Column({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: bodyChildren,
          }) as unknown as Widget)
        : (_makeShrink() as unknown as Widget);

    return new ExpandableToolHeader({
      title: "Painter",
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
