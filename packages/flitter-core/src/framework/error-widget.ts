// ErrorWidget -- displayed when a build fails
// Amp ref: Error handling in buildScopes() -- catches errors, logs, continues
// In Flutter, ErrorWidget replaces a failed subtree to show error info.
// Gap ref: .gap/05-error-widget.md

import { Key } from '../core/key';
import { Color } from '../core/color';
import { Offset, Size } from '../core/types';
import {
  LeafRenderObjectWidget,
  RenderBox,
  type PaintContext,
} from './render-object';
import type { Widget } from './widget';

// ---------------------------------------------------------------------------
// FlutterErrorDetails -- structured error report for build failures
// ---------------------------------------------------------------------------

export interface FlutterErrorDetails {
  exception: unknown;
  message: string;
  stack?: string;
  widgetType?: string;
  context?: string;
}

// ---------------------------------------------------------------------------
// ErrorWidgetBuilder -- customizable factory for error presentation
// ---------------------------------------------------------------------------

export type ErrorWidgetBuilder = (details: FlutterErrorDetails) => Widget;

// ---------------------------------------------------------------------------
// RenderErrorBox -- renders a visible error indicator
// ---------------------------------------------------------------------------

export class RenderErrorBox extends RenderBox {
  private _message: string;

  constructor(message: string) {
    super();
    this._message = message;
  }

  get message(): string {
    return this._message;
  }

  set message(value: string) {
    if (this._message === value) return;
    this._message = value;
    this.markNeedsLayout();
  }

  // Layout: takes 1 row of height, fills available width.
  // If message is longer than available width, truncates with ellipsis.
  performLayout(): void {
    const constraints = this.constraints!;
    // Error indicator takes exactly 1 row, full available width
    const width = constraints.maxWidth === Infinity
      ? Math.min(this._message.length + 4, 80) // "[!] " prefix + message
      : constraints.maxWidth;
    // Clamp height to 1 row within constraints
    const height = Math.max(constraints.minHeight, Math.min(1, constraints.maxHeight));
    this.size = new Size(width, height);
  }

  // Paint: red background with white bold text "[!] <message>"
  paint(context: PaintContext, offset: Offset): void {
    if (typeof context.drawChar !== 'function') return;

    const errorStyle: Record<string, unknown> = {
      foreground: Color.white,
      background: Color.red,
      bold: true,
    };

    const prefix = '[!] ';
    const availWidth = this.size.width;
    const fullText = prefix + this._message;

    for (let col = 0; col < availWidth; col++) {
      const ch = col < fullText.length ? fullText[col]! : ' ';
      context.drawChar(offset.col + col, offset.row, ch, errorStyle);
    }
  }
}

// ---------------------------------------------------------------------------
// ErrorWidget
// ---------------------------------------------------------------------------

export class ErrorWidget extends LeafRenderObjectWidget {
  readonly message: string;
  readonly error?: Error;

  /**
   * Customizable builder. Applications can override this to provide
   * their own error display widget. Default creates an ErrorWidget.
   *
   * In Flutter: ErrorWidget.builder
   */
  static builder: ErrorWidgetBuilder = (details: FlutterErrorDetails) => {
    return new ErrorWidget({
      message: details.message,
      error: details.exception instanceof Error ? details.exception : undefined,
    });
  };

  constructor(opts: { message: string; error?: Error; key?: Key }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.message = opts.message;
    this.error = opts.error;
  }

  /** Factory: create ErrorWidget from an error */
  static fromError(error: Error): ErrorWidget {
    return new ErrorWidget({ message: error.message, error });
  }

  createRenderObject(): RenderErrorBox {
    return new RenderErrorBox(this.message);
  }

  updateRenderObject(renderObject: RenderErrorBox): void {
    renderObject.message = this.message;
  }
}
