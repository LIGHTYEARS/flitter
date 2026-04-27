/**
 * ImagePreviewModal -- centered modal for image preview with metadata and actions.
 *
 * 逆向: qM/QQT (misc_utils.js:1380, interactive_widgets.js:451-631) — file preview
 *       w0R/B0R (misc_utils.js:5955, jetbrains_wizard.js:1806-1926) — attached variant
 *
 * Supports Kitty Graphics Protocol for terminals that support it (kitty, WezTerm, Ghostty).
 * JPEG/GIF images are transcoded to PNG before rendering.
 * Falls back to text placeholder for unsupported terminals.
 *
 * @module
 */

import type { BuildContext, Element, KeyEventResult, Widget } from "@flitter/tui";
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
  ImageWidget,
  RichText,
  SizedBox,
  State,
  StatefulWidget,
  supportsKittyGraphics,
  TextSpan,
  TextStyle,
  transcodeToKittyPng,
} from "@flitter/tui";
import { AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  ImagePreviewConfig
// ════════════════════════════════════════════════════

export interface ImagePreviewConfig {
  /** Path to image file on disk (optional). */
  filePath?: string;
  /** Image data as base64 (optional, used when no filePath). */
  imageData?: string;
  /** Media type (e.g., "image/png"). */
  mediaType?: string;
  /** File size in bytes. */
  fileSize?: number;
  /** Image index for attached images (shows "Image N+1" title). */
  imageIndex?: number;
  /** Called when dismissed. */
  onDismiss: () => void;
  /** Called when save is requested (optional -- if absent, save hint hidden). */
  onSave?: () => void;
  /** Called when remove is requested (optional -- if absent, remove hint hidden). */
  onRemove?: () => void;
}

// ════════════════════════════════════════════════════
//  Helper functions (exported for testing)
// ════════════════════════════════════════════════════

/**
 * Format media type: strips "image/" prefix and uppercases.
 * 逆向: tQ in 2447_unknown_rQ.js:1-3
 */
export function formatMediaType(mediaType: string): string {
  return mediaType.replace("image/", "").toUpperCase();
}

/**
 * Format file size: bytes to human-readable KB/MB.
 * 逆向: Zd0 in 2454_unknown_bIT.js:1-4 (also xgT in 2787_unknown_DH0.js:5-9)
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

/**
 * Extract filename from path or URL.
 * 逆向: _IT in 2454_unknown_bIT.js:5-12
 */
export function extractFilename(pathOrUrl: string): string {
  try {
    const segments = new URL(pathOrUrl).pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? pathOrUrl;
  } catch {
    // Not a URL — treat as file path.
    // 逆向: orT.basename(T) — equivalent to last segment after separator
    const parts = pathOrUrl.split(/[/\\]/);
    return parts[parts.length - 1] ?? pathOrUrl;
  }
}

// ════════════════════════════════════════════════════
//  ImagePreviewModal Widget
// ════════════════════════════════════════════════════

/**
 * 逆向: qM extends NR (StatefulWidget) in misc_utils.js:1380
 * Also covers w0R (attached variant) in misc_utils.js:5955
 */
export class ImagePreviewModal extends StatefulWidget {
  readonly config: ImagePreviewConfig;

  constructor(config: ImagePreviewConfig) {
    super();
    this.config = config;
  }

  createState(): ImagePreviewModalState {
    return new ImagePreviewModalState();
  }
}

// ════════════════════════════════════════════════════
//  ImagePreviewModalState
// ════════════════════════════════════════════════════

/**
 * State for ImagePreviewModal.
 * 逆向: QQT extends wR in interactive_widgets.js:451-631
 *       B0R extends wR in jetbrains_wizard.js:1806-1926
 * Unified via config flags (onSave / onRemove).
 */
export class ImagePreviewModalState extends State<ImagePreviewModal> {
  /** 逆向: QQT.build → Focus onKey: Escape -> onDismiss. Also 's'->save, 'r'->remove. */
  private _handleKey = (event: { key: string }): KeyEventResult => {
    const { onDismiss, onSave, onRemove } = this.widget.config;

    if (event.key === "Escape") {
      onDismiss();
      return "handled";
    }
    if (event.key === "s" && onSave) {
      onSave();
      return "handled";
    }
    if (event.key === "r" && onRemove) {
      onRemove();
      return "handled";
    }
    return "ignored";
  };

  /** 逆向: QQT uses _IT(filePath), B0R uses imageIndex → "Image {N+1}" */
  private _getTitle(): string {
    const { filePath, imageIndex } = this.widget.config;
    if (imageIndex !== undefined) {
      return `Image ${imageIndex + 1}`;
    }
    if (filePath) {
      return extractFilename(filePath);
    }
    return "Image";
  }

  /**
   * 逆向: QQT.build (interactive_widgets.js:517-631)
   * Focus(onKey) > Center > Container(border: primary rounded, padding: 2h 1v) >
   *   Column[title, metadata, placeholder, action hints]
   */
  build(context: BuildContext) {
    // 逆向: let R = $R.of(T), a = R.colors
    const appTheme = AppThemeController.maybeOf(context as unknown as Element);
    const primaryColor = appTheme?.keybind ?? Color.blue();
    const fgColor = Color.default();

    // ── Title ───────────────────────────────────────
    // 逆向: new xT({ text: new G(s, new cT({ bold: true, color: a.primary })) })
    const title = new RichText({
      text: new TextSpan({
        text: this._getTitle(),
        style: new TextStyle({ foreground: primaryColor, bold: true }),
      }),
    });

    // ── Metadata ── 逆向: QQT.build lines 545-555
    const metaParts: string[] = [];
    if (this.widget.config.mediaType) {
      metaParts.push(formatMediaType(this.widget.config.mediaType));
    }
    if (this.widget.config.fileSize !== undefined) {
      metaParts.push(formatFileSize(this.widget.config.fileSize));
    }
    const metaText = metaParts.length > 0 ? metaParts.join(", ") : "Unknown";

    const metadata = new RichText({
      text: new TextSpan({
        text: metaText,
        style: new TextStyle({ foreground: fgColor, dim: true }),
      }),
    });

    // ── Image content ── 逆向: QQT.build line 578-583
    // When Kitty is supported and image data is available, render the actual image;
    // otherwise show a text placeholder.
    let imageWidget: Widget;
    const { imageData, mediaType } = this.widget.config;
    if (supportsKittyGraphics() && imageData && mediaType) {
      const result = transcodeToKittyPng(imageData, mediaType);
      if (result.success) {
        imageWidget = new ImageWidget({
          base64Data: result.png,
          mediaType: "image/png",
          width: 60,
          height: 20,
        });
      } else {
        imageWidget = new RichText({
          text: new TextSpan({
            text: `(Cannot display: ${result.reason})`,
            style: new TextStyle({ foreground: fgColor, dim: true, italic: true }),
          }),
        });
      }
    } else {
      const altText = imageData
        ? "(Terminal does not support inline images)"
        : "(No image data available)";
      imageWidget = new RichText({
        text: new TextSpan({
          text: altText,
          style: new TextStyle({ foreground: fgColor, dim: true, italic: true }),
        }),
      });
    }

    // ── Action hints ── 逆向: QQT "Save Image"+"Close", B0R "Remove image"+"Close"
    const hintParts: TextSpan[] = [];
    if (this.widget.config.onSave) {
      hintParts.push(
        new TextSpan({
          text: "[s]",
          style: new TextStyle({ foreground: primaryColor, bold: true }),
        }),
        new TextSpan({
          text: " Save  ",
          style: new TextStyle({ foreground: fgColor }),
        }),
      );
    }
    if (this.widget.config.onRemove) {
      hintParts.push(
        new TextSpan({
          text: "[r]",
          style: new TextStyle({ foreground: primaryColor, bold: true }),
        }),
        new TextSpan({
          text: " Remove  ",
          style: new TextStyle({ foreground: fgColor }),
        }),
      );
    }
    hintParts.push(
      new TextSpan({
        text: "[Esc]",
        style: new TextStyle({ foreground: primaryColor, bold: true }),
      }),
      new TextSpan({
        text: " Close",
        style: new TextStyle({ foreground: fgColor }),
      }),
    );

    const actionHints = new RichText({
      text: new TextSpan({ text: "", children: hintParts }),
    });

    // ── Column ── 逆向: xR({ crossAxisAlignment: "stretch", mainAxisSize: "min" })
    const column = new Column({
      crossAxisAlignment: "start",
      mainAxisSize: "min",
      children: [
        title,
        new SizedBox({ height: 1 }),
        metadata,
        new SizedBox({ height: 1 }),
        imageWidget,
        new SizedBox({ height: 1 }),
        actionHints,
      ],
    });

    // ── Container ── 逆向: SR({ border: h9.all(e9(primary, 1, "rounded")), padding: TR.symmetric(2, 1) })
    const container = new Container({
      padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(primaryColor, 1, "rounded")),
      }),
      child: column,
    });

    // ── Center ── 逆向: N0({ child: container })
    const centered = new Center({ child: container });

    // ── Focus ── 逆向: C8({ canRequestFocus: false, onKey, child: Center(...) })
    return new Focus({
      autofocus: true,
      onKey: this._handleKey,
      debugLabel: "ImagePreviewModal",
      child: centered,
    });
  }
}
