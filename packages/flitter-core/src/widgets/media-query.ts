// MediaQuery + MediaQueryData — InheritedWidget providing terminal screen info
// Amp ref: nA (MediaQueryData), Q3 (MediaQuery)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Widget, InheritedWidget, BuildContext } from '../framework/widget';
import type { TerminalCapabilities as PlatformCapabilities } from '../terminal/platform';

// ---------------------------------------------------------------------------
// MediaQueryData (Amp: nA)
// ---------------------------------------------------------------------------

/**
 * Terminal capabilities descriptor.
 */
export interface TerminalCapabilities {
  readonly colorDepth: 'none' | 'ansi256' | 'truecolor';
  readonly mouseSupport: boolean;
  readonly emojiWidth: 'unknown' | 'narrow' | 'wide';
  readonly kittyGraphics: boolean;
}

/**
 * Immutable data class holding terminal screen information.
 * Provided to the widget tree via MediaQuery InheritedWidget.
 *
 * Amp ref: class nA
 */
export class MediaQueryData {
  readonly size: { readonly width: number; readonly height: number };
  readonly capabilities: TerminalCapabilities;

  constructor(opts: {
    size: { width: number; height: number };
    capabilities?: Partial<TerminalCapabilities>;
  }) {
    this.size = Object.freeze({
      width: Math.round(opts.size.width),
      height: Math.round(opts.size.height),
    });
    this.capabilities = Object.freeze({
      colorDepth: opts.capabilities?.colorDepth ?? 'ansi256',
      mouseSupport: opts.capabilities?.mouseSupport ?? false,
      emojiWidth: opts.capabilities?.emojiWidth ?? 'unknown',
      kittyGraphics: opts.capabilities?.kittyGraphics ?? false,
    });
  }

  /**
   * Convert platform-level detected capabilities into MediaQuery-level
   * capabilities for the widget tree.
   *
   * Amp ref: J3.createMediaQueryWrapper reads wB0.getCapabilities()
   * and passes them directly to nA constructor. In Flitter, the two
   * capability interfaces have different shapes, so this translation
   * is needed.
   */
  static fromPlatformCapabilities(
    platformCaps: PlatformCapabilities,
  ): TerminalCapabilities {
    // Determine colorDepth from the boolean flags
    let colorDepth: 'none' | 'ansi256' | 'truecolor';
    if (platformCaps.trueColor) {
      colorDepth = 'truecolor';
    } else if (platformCaps.ansi256) {
      colorDepth = 'ansi256';
    } else {
      colorDepth = 'none';
    }

    // Determine emojiWidth from boolean flag
    let emojiWidth: 'unknown' | 'narrow' | 'wide';
    if (platformCaps.emojiWidth === true) {
      // Terminal supports mode 2027 emoji width reporting
      // Default to 'wide' when the terminal is known to support it
      emojiWidth = 'wide';
    } else {
      emojiWidth = 'unknown';
    }

    return {
      colorDepth,
      mouseSupport: platformCaps.mouse,
      emojiWidth,
      kittyGraphics: platformCaps.kittyGraphics ?? false,
    };
  }

  /**
   * Static factory with safe defaults — constructs from terminal columns and rows.
   * Optionally accepts platform capabilities for real detection.
   * Capabilities default to conservative values (ansi256, no mouse, unknown emoji width).
   *
   * Amp ref: nA constructor takes (size, capabilities). The xF() fallback
   * provides conservative defaults when capabilities are null.
   */
  static fromTerminal(
    cols: number,
    rows: number,
    platformCaps?: PlatformCapabilities,
  ): MediaQueryData {
    const capabilities = platformCaps
      ? MediaQueryData.fromPlatformCapabilities(platformCaps)
      : undefined;

    return new MediaQueryData({
      size: { width: cols, height: rows },
      capabilities,
    });
  }

  /**
   * Returns a new MediaQueryData with the specified fields replaced.
   */
  copyWith(opts: {
    size?: { width: number; height: number };
    capabilities?: Partial<TerminalCapabilities>;
  }): MediaQueryData {
    return new MediaQueryData({
      size: opts.size ?? this.size,
      capabilities: opts.capabilities
        ? { ...this.capabilities, ...opts.capabilities }
        : this.capabilities,
    });
  }

  /**
   * Structural equality check.
   */
  equals(other: MediaQueryData): boolean {
    return (
      this.size.width === other.size.width &&
      this.size.height === other.size.height &&
      this.capabilities.colorDepth === other.capabilities.colorDepth &&
      this.capabilities.mouseSupport === other.capabilities.mouseSupport &&
      this.capabilities.emojiWidth === other.capabilities.emojiWidth &&
      this.capabilities.kittyGraphics === other.capabilities.kittyGraphics
    );
  }

  toString(): string {
    return (
      `MediaQueryData(size: ${this.size.width}x${this.size.height}, ` +
      `color: ${this.capabilities.colorDepth}, ` +
      `mouse: ${this.capabilities.mouseSupport}, ` +
      `emoji: ${this.capabilities.emojiWidth}, ` +
      `kitty: ${this.capabilities.kittyGraphics})`
    );
  }
}

// ---------------------------------------------------------------------------
// MediaQuery InheritedWidget (Amp: Q3)
// ---------------------------------------------------------------------------

/**
 * An InheritedWidget that provides MediaQueryData to descendant widgets.
 *
 * Usage:
 *   new MediaQuery({
 *     data: MediaQueryData.fromTerminal(80, 24),
 *     child: app,
 *   })
 *
 * Descendant widgets look up the data via:
 *   MediaQuery.of(context)       // throws if not found
 *   MediaQuery.sizeOf(context)   // convenience for .size
 *   MediaQuery.capabilitiesOf(context) // convenience for .capabilities
 *
 * Amp ref: class Q3 extends Bt
 */
export class MediaQuery extends InheritedWidget {
  readonly data: MediaQueryData;

  constructor(opts: { data: MediaQueryData; child: Widget; key?: Key }) {
    super({
      key: opts.key,
      child: opts.child,
    });
    this.data = opts.data;
  }

  /**
   * Whether dependents should be notified when this widget is updated.
   * Returns true if the MediaQueryData has changed.
   */
  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as MediaQuery;
    return !this.data.equals(old.data);
  }

  // --- Static accessors ---

  /**
   * Returns the MediaQueryData from the nearest ancestor MediaQuery.
   * Throws if no MediaQuery is found in the ancestor chain.
   *
   * Registers a dependency so the calling widget rebuilds when MediaQueryData changes.
   */
  static of(context: BuildContext): MediaQueryData {
    const data = MediaQuery.maybeOf(context);
    if (data === undefined) {
      throw new Error(
        'MediaQuery.of() called with a context that does not contain a MediaQuery. ' +
          'No MediaQuery ancestor could be found. Ensure a MediaQuery widget is above ' +
          'this widget in the tree.',
      );
    }
    return data;
  }

  /**
   * Returns the MediaQueryData from the nearest ancestor MediaQuery,
   * or undefined if none is found.
   */
  static maybeOf(context: BuildContext): MediaQueryData | undefined {
    const ctx = context as unknown as { dependOnInheritedWidgetOfExactType?: (widgetType: Function) => { widget: Widget } | null };
    if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
      const element = ctx.dependOnInheritedWidgetOfExactType(MediaQuery);
      if (element) {
        const widget = element.widget as MediaQuery;
        return widget.data;
      }
    }
    return undefined;
  }

  /**
   * Convenience: returns just the size from the nearest MediaQuery.
   * Throws if no MediaQuery is found.
   */
  static sizeOf(context: BuildContext): { readonly width: number; readonly height: number } {
    return MediaQuery.of(context).size;
  }

  /**
   * Convenience: returns just the capabilities from the nearest MediaQuery.
   * Throws if no MediaQuery is found.
   */
  static capabilitiesOf(context: BuildContext): TerminalCapabilities {
    return MediaQuery.of(context).capabilities;
  }
}
