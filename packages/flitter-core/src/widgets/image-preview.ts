// ImagePreview — StatefulWidget for inline terminal image display via Kitty graphics protocol
// ImagePreviewProvider — InheritedWidget providing image preview context to descendants
// KittyImageWidget — SingleChildRenderObjectWidget + RenderKittyImage for Kitty protocol rendering
// Amp ref: Image display using Kitty graphics protocol (ESC_G sequences)
// Requirements: IMG-01, IMG-02, IMG-03

import { Key } from '../core/key';
import { Offset, Size } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import {
  Widget,
  StatefulWidget,
  State,
  InheritedWidget,
  type BuildContext,
} from '../framework/widget';
import {
  SingleChildRenderObjectWidget,
  RenderBox,
  RenderObject,
  type PaintContext,
} from '../framework/render-object';
import { SizedBox } from './sized-box';
import { MediaQuery } from './media-query';
import { ESC, ST } from '../terminal/renderer';

// ---------------------------------------------------------------------------
// Kitty Graphics Protocol Constants
// ---------------------------------------------------------------------------

/** Maximum base64 chunk size for Kitty graphics protocol (4096 bytes). */
export const KITTY_CHUNK_SIZE = 4096;

/** APC introducer for Kitty graphics: ESC_G */
const APC_G = `${ESC}_G`;

// ---------------------------------------------------------------------------
// Kitty Graphics Protocol Encoding Functions
// ---------------------------------------------------------------------------

/**
 * Encode raw PNG data into chunked Kitty graphics protocol escape sequences.
 *
 * The Kitty graphics protocol uses APC (Application Program Command) sequences:
 *   ESC_G a=T,f=100,s=<width>,v=<height>,m=1;<base64-chunk> ESC\   (first chunk, more coming)
 *   ESC_G m=1;<base64-chunk> ESC\                                    (middle chunks)
 *   ESC_G m=0;<base64-chunk> ESC\                                    (last chunk)
 *
 * Key parameters:
 *   a=T  — transmit and display
 *   f=100 — PNG format
 *   s=<width>,v=<height> — image size in pixels
 *   t=d  — direct transmission (data in payload)
 *   q=2  — quiet mode (no response needed)
 *   m=0  — last chunk, m=1 — more chunks coming
 *
 * @param pngData Raw PNG image data as Uint8Array
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @returns Array of escape sequence strings (one per chunk)
 */
export function encodeKittyGraphics(
  pngData: Uint8Array,
  width: number,
  height: number,
): string[] {
  // Base64-encode the entire PNG payload
  const base64 = uint8ArrayToBase64(pngData);

  // Split into chunks
  const chunks = splitIntoChunks(base64, KITTY_CHUNK_SIZE);
  const sequences: string[] = [];

  if (chunks.length === 0) {
    // Empty image — send a single empty last-chunk
    sequences.push(
      `${APC_G}a=T,f=100,t=d,s=${width},v=${height},q=2,m=0;${ST}`,
    );
    return sequences;
  }

  if (chunks.length === 1) {
    // Single chunk — m=0 (last/only chunk)
    sequences.push(
      `${APC_G}a=T,f=100,t=d,s=${width},v=${height},q=2,m=0;${chunks[0]}${ST}`,
    );
    return sequences;
  }

  // Multiple chunks
  for (let i = 0; i < chunks.length; i++) {
    if (i === 0) {
      // First chunk with all parameters, m=1 (more coming)
      sequences.push(
        `${APC_G}a=T,f=100,t=d,s=${width},v=${height},q=2,m=1;${chunks[i]}${ST}`,
      );
    } else if (i === chunks.length - 1) {
      // Last chunk, m=0
      sequences.push(`${APC_G}m=0;${chunks[i]}${ST}`);
    } else {
      // Middle chunk, m=1 (more coming)
      sequences.push(`${APC_G}m=1;${chunks[i]}${ST}`);
    }
  }

  return sequences;
}

/**
 * Build the complete Kitty graphics output string from PNG data.
 * Concatenates all chunked escape sequences into a single string.
 *
 * @param pngData Raw PNG image data
 * @param width Image width in pixels
 * @param height Image height in pixels
 * @returns Complete escape sequence string for terminal output
 */
export function buildKittyGraphicsPayload(
  pngData: Uint8Array,
  width: number,
  height: number,
): string {
  return encodeKittyGraphics(pngData, width, height).join('');
}

/**
 * Convert a Uint8Array to a base64 string.
 * Uses Buffer if available (Node/Bun), otherwise manual conversion.
 */
export function uint8ArrayToBase64(data: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64');
  }
  // Fallback for environments without Buffer
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  return btoa(binary);
}

/**
 * Split a string into chunks of the specified size.
 *
 * @param str The string to split
 * @param chunkSize Maximum characters per chunk
 * @returns Array of string chunks
 */
export function splitIntoChunks(str: string, chunkSize: number): string[] {
  if (str.length === 0) return [];
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// ImagePreviewData — data class for image preview context (IMG-03)
// ---------------------------------------------------------------------------

/**
 * Immutable data class holding image preview state.
 * Provided to descendants via ImagePreviewProvider InheritedWidget.
 */
export interface ImagePreviewData {
  /** Raw PNG image data. */
  readonly imageData: Uint8Array;
  /** Image width in pixels. */
  readonly width: number;
  /** Image height in pixels. */
  readonly height: number;
  /** Display state: 'loading', 'ready', 'error', 'unsupported'. */
  readonly displayState: 'loading' | 'ready' | 'error' | 'unsupported';
}

/**
 * Structural equality check for ImagePreviewData.
 */
function imagePreviewDataEquals(a: ImagePreviewData, b: ImagePreviewData): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.displayState === b.displayState &&
    a.imageData === b.imageData // reference equality for Uint8Array
  );
}

// ---------------------------------------------------------------------------
// ImagePreviewProvider — InheritedWidget (IMG-03)
// ---------------------------------------------------------------------------

/**
 * An InheritedWidget that propagates ImagePreviewData down the widget tree.
 * Follows the same pattern as Theme/AppTheme.
 *
 * Usage:
 *   new ImagePreviewProvider({
 *     data: { imageData, width, height, displayState: 'ready' },
 *     child: someWidget,
 *   })
 *
 * Descendants read the data via:
 *   ImagePreviewProvider.of(context)
 *   ImagePreviewProvider.maybeOf(context)
 *
 * Amp ref: Image preview context propagation
 */
export class ImagePreviewProvider extends InheritedWidget {
  readonly data: ImagePreviewData;

  constructor(opts: { data: ImagePreviewData; child: Widget; key?: Key }) {
    super({
      key: opts.key,
      child: opts.child,
    });
    this.data = opts.data;
  }

  /**
   * Look up the nearest ancestor ImagePreviewProvider and return its data.
   * Throws if no ImagePreviewProvider ancestor is found.
   */
  static of(context: BuildContext): ImagePreviewData {
    const result = ImagePreviewProvider.maybeOf(context);
    if (result === undefined) {
      throw new Error(
        'ImagePreviewProvider.of() called with a context that does not contain an ' +
          'ImagePreviewProvider ancestor. Ensure an ImagePreviewProvider widget is ' +
          'an ancestor of this widget.',
      );
    }
    return result;
  }

  /**
   * Look up the nearest ancestor ImagePreviewProvider and return its data,
   * or undefined if none is found.
   */
  static maybeOf(context: BuildContext): ImagePreviewData | undefined {
    if (typeof context.dependOnInheritedWidgetOfExactType === 'function') {
      const element = context.dependOnInheritedWidgetOfExactType(ImagePreviewProvider);
      if (element) {
        const widget = element.widget as ImagePreviewProvider;
        return widget.data;
      }
    }
    return undefined;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as ImagePreviewProvider;
    return !imagePreviewDataEquals(this.data, old.data);
  }
}

// ---------------------------------------------------------------------------
// KittyImageWidget — SingleChildRenderObjectWidget (IMG-02)
// ---------------------------------------------------------------------------

/**
 * A SingleChildRenderObjectWidget that renders an image using the Kitty
 * graphics protocol. Creates a RenderKittyImage that writes Kitty escape
 * sequences to the PaintContext during paint.
 *
 * The widget sizes itself in terminal cells based on the pixel dimensions
 * and an assumed cell size (typically 8x16 pixels per cell).
 *
 * Usage:
 *   new KittyImageWidget({
 *     imageData: pngBytes,
 *     width: 640,    // pixels
 *     height: 480,   // pixels
 *     cellWidth: 80, // terminal columns to occupy
 *     cellHeight: 30, // terminal rows to occupy
 *   })
 *
 * Amp ref: Kitty graphics protocol image rendering
 */
export class KittyImageWidget extends SingleChildRenderObjectWidget {
  readonly imageData: Uint8Array;
  /** Image width in pixels. */
  readonly pixelWidth: number;
  /** Image height in pixels. */
  readonly pixelHeight: number;
  /** Desired width in terminal cells (columns). */
  readonly cellWidth: number;
  /** Desired height in terminal cells (rows). */
  readonly cellHeight: number;

  constructor(opts: {
    key?: Key;
    imageData: Uint8Array;
    pixelWidth: number;
    pixelHeight: number;
    cellWidth: number;
    cellHeight: number;
    child?: Widget;
  }) {
    super({ key: opts.key, child: opts.child });
    this.imageData = opts.imageData;
    this.pixelWidth = opts.pixelWidth;
    this.pixelHeight = opts.pixelHeight;
    this.cellWidth = opts.cellWidth;
    this.cellHeight = opts.cellHeight;
  }

  createRenderObject(): RenderKittyImage {
    return new RenderKittyImage({
      imageData: this.imageData,
      pixelWidth: this.pixelWidth,
      pixelHeight: this.pixelHeight,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
    });
  }

  updateRenderObject(renderObject: RenderObject): void {
    const render = renderObject as RenderKittyImage;
    render.imageData = this.imageData;
    render.pixelWidth = this.pixelWidth;
    render.pixelHeight = this.pixelHeight;
    render.cellWidth = this.cellWidth;
    render.cellHeight = this.cellHeight;
  }
}

// ---------------------------------------------------------------------------
// RenderKittyImage — RenderBox for Kitty image display (IMG-02)
// ---------------------------------------------------------------------------

/**
 * A RenderBox that displays an image using the Kitty graphics protocol.
 *
 * Layout: sizes itself to cellWidth x cellHeight within parent constraints.
 * Paint: writes Kitty graphics escape sequences to the PaintContext.
 *
 * The escape sequences transmit the PNG data using chunked base64 encoding
 * and place the image at the render object's offset position.
 *
 * Amp ref: Kitty graphics protocol RenderObject
 */
export class RenderKittyImage extends RenderBox {
  private _imageData: Uint8Array;
  private _pixelWidth: number;
  private _pixelHeight: number;
  private _cellWidth: number;
  private _cellHeight: number;
  private _child: RenderBox | null = null;
  /** Cached payload string to avoid re-encoding on every paint. */
  private _cachedPayload: string | null = null;

  constructor(opts: {
    imageData: Uint8Array;
    pixelWidth: number;
    pixelHeight: number;
    cellWidth: number;
    cellHeight: number;
  }) {
    super();
    this._imageData = opts.imageData;
    this._pixelWidth = opts.pixelWidth;
    this._pixelHeight = opts.pixelHeight;
    this._cellWidth = opts.cellWidth;
    this._cellHeight = opts.cellHeight;
  }

  get imageData(): Uint8Array {
    return this._imageData;
  }

  set imageData(value: Uint8Array) {
    if (this._imageData === value) return;
    this._imageData = value;
    this._cachedPayload = null;
    this.markNeedsPaint();
  }

  get pixelWidth(): number {
    return this._pixelWidth;
  }

  set pixelWidth(value: number) {
    if (this._pixelWidth === value) return;
    this._pixelWidth = value;
    this._cachedPayload = null;
    this.markNeedsPaint();
  }

  get pixelHeight(): number {
    return this._pixelHeight;
  }

  set pixelHeight(value: number) {
    if (this._pixelHeight === value) return;
    this._pixelHeight = value;
    this._cachedPayload = null;
    this.markNeedsPaint();
  }

  get cellWidth(): number {
    return this._cellWidth;
  }

  set cellWidth(value: number) {
    if (this._cellWidth === value) return;
    this._cellWidth = value;
    this.markNeedsLayout();
  }

  get cellHeight(): number {
    return this._cellHeight;
  }

  set cellHeight(value: number) {
    if (this._cellHeight === value) return;
    this._cellHeight = value;
    this.markNeedsLayout();
  }

  get child(): RenderBox | null {
    return this._child;
  }

  set child(value: RenderBox | null) {
    if (this._child) {
      this.dropChild(this._child);
    }
    this._child = value;
    if (value) {
      this.adoptChild(value);
    }
  }

  /**
   * Layout: size to cellWidth x cellHeight constrained by parent.
   */
  performLayout(): void {
    const constraints = this.constraints!;
    this.size = constraints.constrain(
      new Size(this._cellWidth, this._cellHeight),
    );
  }

  /**
   * Paint: write Kitty graphics escape sequences to PaintContext.
   * The image is placed at the current offset position.
   */
  paint(context: PaintContext, offset: Offset): void {
    // Build and cache the Kitty graphics payload
    if (this._cachedPayload === null) {
      this._cachedPayload = buildKittyGraphicsPayload(
        this._imageData,
        this._pixelWidth,
        this._pixelHeight,
      );
    }

    // Write the escape sequence payload to the paint context
    // PaintContext implementations that support raw escape output
    // will handle the Kitty protocol sequences
    const ctx = context as unknown as { writeRawEscape?: (payload: string, col: number, row: number) => void };
    if (typeof ctx.writeRawEscape === 'function') {
      ctx.writeRawEscape(this._cachedPayload, offset.col, offset.row);
    }

    // Paint child if present (overlay content on top of image)
    if (this._child) {
      this._child.paint(context, offset.add(this._child.offset));
    }
  }

  /**
   * Get the cached Kitty graphics payload string (for testing/inspection).
   */
  getPayload(): string {
    if (this._cachedPayload === null) {
      this._cachedPayload = buildKittyGraphicsPayload(
        this._imageData,
        this._pixelWidth,
        this._pixelHeight,
      );
    }
    return this._cachedPayload;
  }

  visitChildren(visitor: (child: RenderObject) => void): void {
    if (this._child) {
      visitor(this._child);
    }
  }
}

// ---------------------------------------------------------------------------
// ImagePreview — StatefulWidget (IMG-01)
// ---------------------------------------------------------------------------

/**
 * A StatefulWidget that displays inline images in the terminal using the
 * Kitty graphics protocol.
 *
 * Checks terminal capabilities (via MediaQuery) for Kitty graphics support:
 * - If supported: renders the image using KittyImageWidget
 * - If not supported: falls back to an empty SizedBox
 *
 * Also wraps the output in an ImagePreviewProvider so descendant widgets
 * can access the image preview data.
 *
 * Usage:
 *   new ImagePreview({
 *     imageData: pngBytes,
 *     width: 640,
 *     height: 480,
 *   })
 *
 * Amp ref: Image preview with Kitty graphics protocol
 */
export class ImagePreview extends StatefulWidget {
  readonly imageData: Uint8Array;
  /** Image width in pixels. */
  readonly width: number;
  /** Image height in pixels. */
  readonly height: number;
  /** Desired width in terminal cells (auto-calculated if not provided). */
  readonly cellWidth?: number;
  /** Desired height in terminal cells (auto-calculated if not provided). */
  readonly cellHeight?: number;
  /** Assumed pixel width per terminal cell for auto-sizing. Default: 8. */
  readonly cellPixelWidth: number;
  /** Assumed pixel height per terminal cell for auto-sizing. Default: 16. */
  readonly cellPixelHeight: number;

  constructor(opts: {
    key?: Key;
    imageData: Uint8Array;
    width: number;
    height: number;
    cellWidth?: number;
    cellHeight?: number;
    cellPixelWidth?: number;
    cellPixelHeight?: number;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.imageData = opts.imageData;
    this.width = opts.width;
    this.height = opts.height;
    this.cellWidth = opts.cellWidth;
    this.cellHeight = opts.cellHeight;
    this.cellPixelWidth = opts.cellPixelWidth ?? 8;
    this.cellPixelHeight = opts.cellPixelHeight ?? 16;
  }

  createState(): ImagePreviewState {
    return new ImagePreviewState();
  }
}

// ---------------------------------------------------------------------------
// ImagePreviewState — State for ImagePreview (IMG-01)
// ---------------------------------------------------------------------------

/**
 * State for the ImagePreview widget.
 * Manages display state and checks terminal capabilities.
 */
export class ImagePreviewState extends State<ImagePreview> {
  private _displayState: 'loading' | 'ready' | 'error' | 'unsupported' = 'loading';
  private _kittySupported: boolean = false;

  get displayState(): 'loading' | 'ready' | 'error' | 'unsupported' {
    return this._displayState;
  }

  initState(): void {
    this._checkCapabilities();
  }

  didUpdateWidget(oldWidget: ImagePreview): void {
    if (
      oldWidget.imageData !== this.widget.imageData ||
      oldWidget.width !== this.widget.width ||
      oldWidget.height !== this.widget.height
    ) {
      this._checkCapabilities();
    }
  }

  private _checkCapabilities(): void {
    // Try to read Kitty graphics support from MediaQuery
    // This will be resolved during build() where context is available
    if (this.widget.imageData.length === 0) {
      this._displayState = 'error';
    } else {
      // Defer capability check to build() where context is available
      this._displayState = 'loading';
    }
  }

  build(context: BuildContext): Widget {
    // Check terminal capabilities via MediaQuery
    const mediaQueryData = MediaQuery.maybeOf(context);
    const kittySupported = mediaQueryData?.capabilities?.kittyGraphics ?? false;
    this._kittySupported = kittySupported;

    // Determine display state
    let displayState = this._displayState;
    if (!kittySupported) {
      displayState = 'unsupported';
    } else if (this.widget.imageData.length === 0) {
      displayState = 'error';
    } else {
      displayState = 'ready';
    }
    this._displayState = displayState;

    // Calculate cell dimensions
    const cellWidth =
      this.widget.cellWidth ??
      Math.max(1, Math.ceil(this.widget.width / this.widget.cellPixelWidth));
    const cellHeight =
      this.widget.cellHeight ??
      Math.max(1, Math.ceil(this.widget.height / this.widget.cellPixelHeight));

    // Build preview data for provider
    const previewData: ImagePreviewData = {
      imageData: this.widget.imageData,
      width: this.widget.width,
      height: this.widget.height,
      displayState,
    };

    // If Kitty graphics not supported, fall back to empty SizedBox
    if (displayState === 'unsupported' || displayState === 'error') {
      return new ImagePreviewProvider({
        data: previewData,
        child: new SizedBox({ width: 0, height: 0 }),
      });
    }

    // Render the image via KittyImageWidget
    return new ImagePreviewProvider({
      data: previewData,
      child: new KittyImageWidget({
        imageData: this.widget.imageData,
        pixelWidth: this.widget.width,
        pixelHeight: this.widget.height,
        cellWidth,
        cellHeight,
      }),
    });
  }
}
