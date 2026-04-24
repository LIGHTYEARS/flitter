/**
 * AnimatedProgressBar — animated comet/trail progress indicator.
 *
 * 逆向: amp-cli-reversed/modules/1472_tui_components/misc_utils.js lines 5981-6104
 *       X0R (StatefulWidget), Y0R (State), Q0R (LeafWidget), Z0R (RenderObject)
 *       amp-cli-reversed/modules/2814_unknown_sW0.js — sW0 alpha blending
 *
 * Renders a horizontal animated progress bar with a comet trail effect.
 * A bright head character (━) moves left-to-right across the bar width,
 * followed by dimming trail characters using alpha-decayed colors.
 *
 * The alpha falloff values from amp: [1, 0.7, 0.5, 0.35, 0.25, 0.15]
 * Since flitter's Color class has no alpha channel, we simulate the effect
 * by blending the color's RGB values toward black (0,0,0) at the given alpha.
 * For non-RGB colors, we use the dim TextStyle attribute for trail segments.
 *
 * @module
 */

import { Cell } from "../screen/cell.js";
import { Color } from "../screen/color.js";
import type { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import type { BoxConstraints } from "../tree/constraints.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "./padding.js";

// ════════════════════════════════════════════════════
//  Alpha trail constants
// ════════════════════════════════════════════════════

/**
 * Alpha falloff factors for the comet trail, from head to tail.
 *
 * 逆向: Z0R.paint — h = [1, 0.7, 0.5, 0.35, 0.25, 0.15]
 */
const TRAIL_ALPHA = [1, 0.7, 0.5, 0.35, 0.25, 0.15] as const;

/**
 * The heavy horizontal bar character used for the comet trail.
 *
 * 逆向: Z0R.paint — T.setChar(e + c, t, "\u2501", ...)
 */
const BAR_CHAR = "\u2501"; // ━

// ════════════════════════════════════════════════════
//  Color blending helper
// ════════════════════════════════════════════════════

/**
 * Blend a color toward black by the given alpha factor.
 *
 * 逆向: sW0 at amp-cli-reversed/modules/2814_unknown_sW0.js
 * Amp sets an alpha property on the color object. Since flitter's Color
 * has no alpha support, we simulate it by interpolating RGB toward (0,0,0).
 * For non-RGB colors (named, indexed), we convert to an approximate RGB
 * first using standard ANSI color values.
 *
 * @param color - Source color
 * @param alpha - Opacity factor (0 = invisible, 1 = full color)
 * @returns A new Color.rgb with blended values
 */
function blendColorAlpha(color: Color, alpha: number): Color {
  let r: number, g: number, b: number;

  if (color.kind === "rgb") {
    r = color.r;
    g = color.g;
    b = color.b;
  } else if (color.kind === "named" || color.kind === "index") {
    // Approximate named/indexed colors to RGB for blending
    const rgb = namedColorToRgb(color.index);
    r = rgb[0];
    g = rgb[1];
    b = rgb[2];
  } else {
    // default color — use white as base
    r = 255;
    g = 255;
    b = 255;
  }

  // Blend toward black: result = color * alpha
  return Color.rgb(Math.round(r * alpha), Math.round(g * alpha), Math.round(b * alpha));
}

/**
 * Approximate RGB values for the standard 16 ANSI colors.
 * Used when blending alpha on non-RGB colors.
 */
const ANSI_16_RGB: readonly [number, number, number][] = [
  [0, 0, 0], // 0: black
  [170, 0, 0], // 1: red
  [0, 170, 0], // 2: green
  [170, 85, 0], // 3: yellow
  [0, 0, 170], // 4: blue
  [170, 0, 170], // 5: magenta
  [0, 170, 170], // 6: cyan
  [170, 170, 170], // 7: white
  [85, 85, 85], // 8: bright black
  [255, 85, 85], // 9: bright red
  [85, 255, 85], // 10: bright green
  [255, 255, 85], // 11: bright yellow
  [85, 85, 255], // 12: bright blue
  [255, 85, 255], // 13: bright magenta
  [85, 255, 255], // 14: bright cyan
  [255, 255, 255], // 15: bright white
];

function namedColorToRgb(index: number): [number, number, number] {
  if (index >= 0 && index < 16) {
    return ANSI_16_RGB[index] as [number, number, number];
  }
  // For 256-color indices, use a simple approximation
  if (index < 232) {
    // 6x6x6 color cube (indices 16-231)
    const ci = index - 16;
    const cubeSteps = [0, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
    const r = cubeSteps[Math.floor(ci / 36)];
    const g = cubeSteps[Math.floor((ci % 36) / 6)];
    const b = cubeSteps[ci % 6];
    return [r, g, b];
  }
  // Grayscale ramp (indices 232-255)
  const gv = 8 + 10 * (index - 232);
  return [gv, gv, gv];
}

// ════════════════════════════════════════════════════
//  AnimatedProgressBarRenderObject
// ════════════════════════════════════════════════════

/**
 * RenderObject for the animated progress bar comet trail.
 *
 * 逆向: Z0R at misc_utils.js:6067-6104
 *
 * Paints ━ characters with alpha-decaying trail effect.
 * The head position is animated externally (by the State timer).
 */
export class AnimatedProgressBarRenderObject extends RenderBox {
  private _color: Color;
  private _trail: number;
  private _head: number;
  private _backgroundColor: Color;

  constructor(color: Color, trail: number, head: number, backgroundColor: Color) {
    super();
    this._color = color;
    this._trail = trail;
    this._head = head;
    this._backgroundColor = backgroundColor;
  }

  /**
   * Update rendering parameters.
   *
   * 逆向: Z0R.update — marks needsLayout when trail changes, always marks needsPaint
   */
  update(color: Color, trail: number, head: number, backgroundColor: Color): void {
    let needsLayout = false;
    if (trail !== this._trail) {
      this._trail = trail;
      needsLayout = true;
    }
    this._color = color;
    this._head = head;
    this._backgroundColor = backgroundColor;
    if (needsLayout) this.markNeedsLayout();
    this.markNeedsPaint();
  }

  // ────────────────────────────────────────────────────
  //  Layout
  // ────────────────────────────────────────────────────

  /**
   * Layout: take full available width, height = 1.
   *
   * 逆向: Z0R.performLayout — constrain(biggest.width, 1)
   */
  performLayout(): void {
    const constraints = this._lastConstraints as BoxConstraints;
    const biggest = constraints.biggest;
    const size = constraints.constrain(biggest.width, 1);
    this.setSize(size.width, size.height);
  }

  // ────────────────────────────────────────────────────
  //  Paint
  // ────────────────────────────────────────────────────

  /**
   * Paint the comet trail.
   *
   * 逆向: Z0R.paint at misc_utils.js:6089-6104
   *
   * For each trail segment (i = 0..trail), compute column position
   * as head - i (left-to-right direction). Skip out-of-bounds columns.
   * Apply alpha falloff from TRAIL_ALPHA array.
   */
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    const x = Math.floor(offsetX + this.offset.x);
    const y = Math.floor(offsetY + this.offset.y);
    const width = Math.floor(this.size.width);

    // 逆向: for (let i = 0; i <= this._trail && i < h.length; i++)
    for (let i = 0; i <= this._trail && i < TRAIL_ALPHA.length; i++) {
      // 逆向: left-to-right direction:
      // c = Math.floor(this._head) - i + this._leftOffset
      // (leftOffset = 0 in our simplified version)
      const col = Math.floor(this._head) - i;

      // 逆向: if (c < this._leftOffset || c >= r) continue
      if (col < 0 || col >= width) continue;

      // 逆向: let s = sW0(this._color, h[i])
      const blended = blendColorAlpha(this._color, TRAIL_ALPHA[i]);

      screen.setCell(
        x + col,
        y,
        new Cell(
          BAR_CHAR,
          new TextStyle({
            foreground: blended,
            background: this._backgroundColor,
          }),
        ),
      );
    }
  }

  // ── Accessors for testing ──────────────────────────

  /** @internal */
  get head(): number {
    return this._head;
  }

  /** @internal */
  get trail(): number {
    return this._trail;
  }

  /** @internal */
  get color(): Color {
    return this._color;
  }
}

// ════════════════════════════════════════════════════
//  AnimatedProgressBarLeaf (LeafRenderObjectWidget)
// ════════════════════════════════════════════════════

/**
 * Internal leaf widget that bridges state to the render object.
 *
 * 逆向: Q0R at misc_utils.js:6049-6065
 */
class AnimatedProgressBarLeaf extends Widget implements RenderObjectWidget {
  readonly barColor: Color;
  readonly trail: number;
  readonly head: number;
  readonly backgroundColor: Color;

  constructor(args: {
    key?: Key;
    color: Color;
    trail: number;
    head: number;
    backgroundColor: Color;
  }) {
    super({ key: args.key });
    this.barColor = args.color;
    this.trail = args.trail;
    this.head = args.head;
    this.backgroundColor = args.backgroundColor;
  }

  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new AnimatedProgressBarRenderObject(
      this.barColor,
      this.trail,
      this.head,
      this.backgroundColor,
    );
  }

  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof AnimatedProgressBarRenderObject) {
      renderObject.update(this.barColor, this.trail, this.head, this.backgroundColor);
    }
  }
}

// ════════════════════════════════════════════════════
//  AnimatedProgressBarState
// ════════════════════════════════════════════════════

/**
 * State for AnimatedProgressBar, manages the animation timer.
 *
 * 逆向: Y0R at misc_utils.js:6010-6047
 *
 * Uses setInterval to increment `this.progress` at the configured FPS.
 * When progress exceeds the widget width (plus trail), it wraps around.
 */
class AnimatedProgressBarState extends State<AnimatedProgressBar> {
  /** Current head position. 逆向: Y0R.progress = 0 */
  progress = 0;

  /** Animation timer handle. 逆向: Y0R.timer = null */
  timer: ReturnType<typeof setInterval> | null = null;

  /**
   * 逆向: Y0R.initState — this.restart()
   */
  override initState(): void {
    this.restart();
  }

  /**
   * 逆向: Y0R.didUpdateWidget — restart if trigger changed
   * We restart when color or speed changes.
   */
  override didUpdateWidget(oldWidget: AnimatedProgressBar): void {
    if (oldWidget.speed !== this.widget.speed) {
      this.restart();
    }
  }

  /**
   * 逆向: Y0R.dispose — this.stop()
   */
  override dispose(): void {
    this.stop();
  }

  /**
   * 逆向: Y0R.restart — stop, reset progress, start
   *
   * For left-to-right, initial progress = -trail so the head
   * enters from the left edge.
   */
  restart(): void {
    this.stop();
    // 逆向: this.progress = this.widget.direction === "right-to-left" ? 0 : -this.widget.trail
    this.progress = -this.widget.trail;
    this.start();
  }

  /**
   * 逆向: Y0R.start — create interval if not already running
   *
   * Interval = max(16, round(1000 / max(1, fps)))
   * We use fps=60 like amp's default.
   */
  start(): void {
    if (this.timer) return;

    // 逆向: let T = Math.max(16, Math.round(1000 / Math.max(1, this.widget.fps)))
    const intervalMs = Math.max(16, Math.round(1000 / 60));

    this.timer = setInterval(() => {
      if (!this.mounted) return;
      this.setState(() => {
        this.progress += this.widget.speed;
      });
    }, intervalMs);
  }

  /**
   * 逆向: Y0R.stop — clear interval
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 逆向: Y0R.build — returns Q0R (the leaf render object widget)
   */
  build(_context: BuildContext): WidgetInterface {
    return new AnimatedProgressBarLeaf({
      color: this.widget.color,
      trail: this.widget.trail,
      head: this.progress,
      backgroundColor: this.widget.backgroundColor,
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  AnimatedProgressBar Widget (StatefulWidget)
// ════════════════════════════════════════════════════

/** AnimatedProgressBar constructor arguments. */
export interface AnimatedProgressBarArgs {
  /** Optional key */
  key?: Key;
  /** Comet head color. Default: cyan. */
  color?: Color;
  /** Number of trail segments behind the head. Default: 5. 逆向: X0R trail = 5 */
  trail?: number;
  /** Animation speed (cells per tick). Default: 1. 逆向: X0R speed = 1 */
  speed?: number;
  /** Background color for the bar cells. Default: terminal default. */
  backgroundColor?: Color;
}

/**
 * AnimatedProgressBar Widget.
 *
 * 逆向: X0R at misc_utils.js:5981-6008
 *
 * Renders an animated comet/trail progress bar. A bright head moves
 * left-to-right across the available width, followed by dimming trail
 * characters using alpha-decayed colors.
 *
 * @example
 * ```ts
 * new AnimatedProgressBar({ color: Color.cyan(), trail: 5, speed: 1 });
 * ```
 */
export class AnimatedProgressBar extends StatefulWidget {
  readonly color: Color;
  readonly trail: number;
  readonly speed: number;
  readonly backgroundColor: Color;

  constructor(args?: AnimatedProgressBarArgs) {
    super({ key: args?.key });
    this.color = args?.color ?? Color.cyan();
    this.trail = args?.trail ?? 5;
    this.speed = args?.speed ?? 1;
    this.backgroundColor = args?.backgroundColor ?? Color.default();
  }

  /**
   * 逆向: X0R.createState — return new Y0R()
   */
  createState(): State {
    return new AnimatedProgressBarState();
  }
}

// ── Export the blending helper for testing ──────────
export { blendColorAlpha as _blendColorAlpha };
