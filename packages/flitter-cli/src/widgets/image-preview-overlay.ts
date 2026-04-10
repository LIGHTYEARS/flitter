// ImagePreviewOverlay — Full-screen image preview with save dialog
//
// Matches AMP's ImagePreview widget (57 refs in AMP source).
// Displays an image in full-screen overlay using Kitty graphics protocol
// when supported, or shows a placeholder with image info when not.
//
// Key bindings:
//   Escape → dismiss overlay
//   s      → save image to file (prompts for path)
//   o      → open image in system default viewer (S3-5)
//
// The overlay is modal (absorbs all keys via FocusScope).
// Rendered via OverlayManager with IMAGE_PREVIEW priority (50).

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Center } from '../../../flitter-core/src/widgets/center';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import type { ImageAttachment } from '../state/types';
import { supportsKittyGraphics } from '../utils/kitty-graphics';
import { spawn } from 'node:child_process';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the ImagePreviewOverlay widget. */
interface ImagePreviewOverlayProps {
  /** The image to preview. */
  image: ImageAttachment;
  /** Callback to dismiss the overlay. */
  onDismiss: () => void;
  /** Optional callback to save the image to a file path. */
  onSave?: (path: string) => void;
  /**
   * S3-5: Optional callback invoked when the user presses 'o' to open the image externally.
   * If not provided, the default behavior uses `open` (macOS) to launch the system viewer.
   */
  onImageClick?: (filePath: string) => void;
  /** S3-5: Optional file path to the image on disk (required for external open). */
  filePath?: string;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.cyan;
const FG_COLOR = Color.white;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;

// ---------------------------------------------------------------------------
// ImagePreviewOverlay
// ---------------------------------------------------------------------------

/**
 * Full-screen image preview overlay matching AMP's ImagePreview widget.
 *
 * Displays the image using Kitty graphics protocol when supported.
 * Falls back to a text-based placeholder with image metadata.
 *
 * Layout:
 *   FocusScope (autofocus, absorbs all keys)
 *     Center
 *       Container (bordered cyan, padded, maxWidth: 60)
 *         Column
 *           "Image Preview" title
 *           Image content (Kitty or placeholder)
 *           Footer with keybind hints
 */
export class ImagePreviewOverlay extends StatelessWidget {
  private readonly image: ImageAttachment;
  private readonly onDismiss: () => void;
  private readonly onSave?: (path: string) => void;
  /** S3-5: Callback for opening image in external viewer. */
  private readonly onImageClick?: (filePath: string) => void;
  /** S3-5: File path to the image on disk. */
  private readonly filePath?: string;

  constructor(props: ImagePreviewOverlayProps) {
    super({});
    this.image = props.image;
    this.onDismiss = props.onDismiss;
    this.onSave = props.onSave;
    this.onImageClick = props.onImageClick;
    this.filePath = props.filePath;
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    const hasKitty = supportsKittyGraphics();
    const sizeKB = Math.round(this.image.data.byteLength / 1024);

    const contentChildren: Widget[] = [
      // Title
      new Text({
        text: new TextSpan({
          text: 'Image Preview',
          style: new TextStyle({ foreground: BORDER_COLOR, bold: true }),
        }),
      }),
      new SizedBox({ height: 1 }),
    ];

    if (hasKitty) {
      // Kitty graphics: show placeholder text indicating protocol rendering
      // Actual Kitty escape sequence rendering happens at the terminal paint level,
      // not in the widget tree. This placeholder indicates the image is being rendered.
      contentChildren.push(
        new Text({
          text: new TextSpan({
            text: `[Kitty graphics: ${this.image.mimeType}, ${sizeKB}KB]`,
            style: new TextStyle({ foreground: FG_COLOR }),
          }),
        }),
      );
    } else {
      // No Kitty support: show image info as text
      contentChildren.push(
        new Text({
          text: new TextSpan({
            text: `Image: ${this.image.mimeType}`,
            style: new TextStyle({ foreground: FG_COLOR }),
          }),
        }),
        new Text({
          text: new TextSpan({
            text: `Size: ${sizeKB}KB`,
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
        new Text({
          text: new TextSpan({
            text: '(Kitty graphics protocol not supported by this terminal)',
            style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
          }),
        }),
      );
    }

    // Footer hints
    contentChildren.push(new SizedBox({ height: 1 }));

    const footerChildren = [
      new TextSpan({
        text: 'Esc',
        style: new TextStyle({ foreground: KEYBIND_COLOR }),
      }),
      new TextSpan({
        text: ' close',
        style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
      }),
    ];

    if (this.onSave) {
      footerChildren.push(
        new TextSpan({
          text: '  ',
          style: new TextStyle({ foreground: MUTED_COLOR }),
        }),
        new TextSpan({
          text: 's',
          style: new TextStyle({ foreground: KEYBIND_COLOR }),
        }),
        new TextSpan({
          text: ' save',
          style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
        }),
      );
    }

    // S3-5: "Open externally" hint (when filePath is available or onImageClick is set)
    if (this.filePath || this.onImageClick) {
      footerChildren.push(
        new TextSpan({
          text: '  ',
          style: new TextStyle({ foreground: MUTED_COLOR }),
        }),
        new TextSpan({
          text: 'o',
          style: new TextStyle({ foreground: KEYBIND_COLOR }),
        }),
        new TextSpan({
          text: ' open externally',
          style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
        }),
      );
    }

    contentChildren.push(
      new Text({
        text: new TextSpan({ children: footerChildren }),
      }),
    );

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.onDismiss();
          return 'handled';
        }
        if (event.key === 's' && this.onSave) {
          // Save image — use default path based on timestamp
          const filename = `image-${Date.now()}.png`;
          this.onSave(filename);
          return 'handled';
        }
        // S3-5: 'o' key — open image in system default viewer
        if (event.key === 'o') {
          this._openExternally();
          return 'handled';
        }
        // Absorb all other keys while overlay is shown
        return 'handled';
      },
      child: new Center({
        child: new Container({
          decoration: new BoxDecoration({ border: Border.all(side) }),
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          constraints: new BoxConstraints({ maxWidth: 60 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: contentChildren,
          }),
        }),
      }),
    });
  }

  /**
   * S3-5: Open the image in the system default external viewer.
   *
   * If an `onImageClick` callback was provided, invokes that.
   * Otherwise, falls back to `child_process.spawn('open', [filePath])` on macOS.
   * If no filePath is available, saves a temp file first then opens it.
   */
  private _openExternally(): void {
    if (this.onImageClick && this.filePath) {
      this.onImageClick(this.filePath);
      return;
    }

    // Determine file path: use provided path or write to temp file
    let targetPath = this.filePath;
    if (!targetPath) {
      // Write image data to a temp file and open that
      const tmpDir = process.env.TMPDIR || '/tmp';
      const ext = this.image.mimeType.split('/')[1] || 'png';
      targetPath = `${tmpDir}/flitter-preview-${Date.now()}.${ext}`;
      try {
        const { writeFileSync } = require('node:fs');
        writeFileSync(targetPath, Buffer.from(this.image.data));
      } catch {
        // Unable to write temp file — silently fail
        return;
      }
    }

    if (this.onImageClick) {
      this.onImageClick(targetPath);
    } else {
      // Default: use macOS `open` command to launch system viewer.
      // Detached so the child process does not block the TUI.
      spawn('open', [targetPath], { detached: true, stdio: 'ignore' }).unref();
    }
  }
}
