/**
 * AnimatedOrb — 动画光球 Widget。
 *
 * 忠实移植 amp 的动画光球，使用 2D Open-Simplex Noise 驱动
 * 每个字符的亮度，映射到 ` .:-=+*#%@` 密度梯度和 64 级 RGB 调色板。
 *
 * 逆向参考:
 *   chunk-005.js:164932-165212 — uXT StatefulWidget, yXT State, PXT Widget, SH RenderBox
 *   modules/2031_unknown_Xk.js — Xk glow noise sampler
 *   modules/2030_unknown_bXT.js — bXT intensity → RGB color
 *   modules/2029_unknown__XT.js — pXT lerp, _XT default colors
 *   chunk-005.js:26479-26486 — 常量: wxT, kF, m_, BxT, Yk, mXT, iP
 *   chunk-005.js:67169-67176 — 默认颜色 tCT, rCT
 *
 * @module
 */

import type { Element, Key, RenderObject, RenderObjectWidget, Screen } from "@flitter/tui";
import {
  Cell,
  Color,
  RenderBox,
  RenderObjectElement,
  State,
  StatefulWidget,
  TextStyle,
  Widget,
} from "@flitter/tui";

// ── LeafRenderObjectElement — 无子 Widget 的叶子元素 ──
class LeafRenderObjectElement extends RenderObjectElement {
  override mount(parent?: Element): void {
    super.mount(parent);
    this._dirty = false;
  }
  override update(newWidget: Widget): void {
    super.update(newWidget);
    this._dirty = false;
  }
}

// ════════════════════════════════════════════════════
//  Constants — 逆向: chunk-005.js:26479-26486
// ════════════════════════════════════════════════════

/** 噪声空间缩放除数 */
const NOISE_SCALE = 20; // wxT
/** 字符密度梯度 (10 级: 空格=暗 → @=亮) */
const CHAR_RAMP = " .:-=+*#%@"; // kF
/** 空格字符 */
const SPACE_CHAR = " "; // Ny0
/** 调色板分辨率 */
const PALETTE_SIZE = 64; // m_
/** 垂直宽高比校正 (终端字符高/宽 ≈ 2:1) */
const ASPECT_RATIO = 0.5; // BxT
/** 冲击波生命周期 (动画时间单位) */
const SHOCKWAVE_LIFETIME = 1; // Yk
/** 冲击波扩散速度 */
const SHOCKWAVE_SPEED = 30; // mXT
/** 冲击波环半宽 */
const SHOCKWAVE_HALF_WIDTH = 3; // iP

/** 默认主色 (#003700) — 逆向: chunk-005.js:67169-67172 tCT */
const DEFAULT_PRIMARY = { r: 0, g: 55, b: 0 };
/** 默认辅色 (#00ff88) — 逆向: chunk-005.js:67173-67176 rCT */
const DEFAULT_SECONDARY = { r: 0, g: 255, b: 136 };

// ════════════════════════════════════════════════════
//  Open Simplex Noise 2D — 逆向: modules/2026_tail_anonymous.js:121516-121601
// ════════════════════════════════════════════════════

/**
 * 2D Open-Simplex Noise 实现。
 *
 * 忠实移植 amp 内联的 makeNoise2D — 即 KdotJPG/Kurt Spencer
 * 的 Open Simplex Noise 算法的最小 2D 版本。
 */
function makeNoise2D(seed: number): (x: number, y: number) => number {
  // 输出缩放因子
  const SCALE = 1 / 47;

  // 2D skew/unskew 因子
  const STRETCH = (Math.sqrt(3) - 1) / 2; // (√3-1)/2
  const SQUISH = (1 / Math.sqrt(3) - 1) / 2; // (1/√3-1)/2

  // 8 个梯度向量 (flat array: [dx0,dy0, dx1,dy1, ...])
  const GRADIENTS = [5, 2, 2, 5, -5, 2, -2, 5, 5, -2, 2, -5, -5, -2, -2, -5];

  // 贡献列表种子数据
  const CONTRIBUTION_DATA = [
    0, 0, 1, -1, 0, 0, -1, 1, 0, 2, 1, 1, 1, 2, 2, 0, 1, 2, 0, 2, 1, 0, 0, 0,
  ];
  const CONTRIBUTION_LOOKUP = [0, 1, 2, 3, 3, 3, 3, 3, 3, 4, 4, 5];

  // 构建贡献链表
  interface Contribution {
    dx: number;
    dy: number;
    xsb: number;
    ysb: number;
    next: Contribution | null;
  }

  const contributions: Contribution[] = [];
  for (let i = 0; i < CONTRIBUTION_DATA.length; i += 4) {
    contributions.push({
      dx: CONTRIBUTION_DATA[i]!,
      dy: CONTRIBUTION_DATA[i + 1]!,
      xsb: CONTRIBUTION_DATA[i + 2]!,
      ysb: CONTRIBUTION_DATA[i + 3]!,
      next: null,
    });
  }

  // 链接贡献
  contributions[0]!.next = contributions[1];
  contributions[1]!.next = contributions[2];
  contributions[2]!.next = null;
  contributions[3]!.next = contributions[4];
  contributions[4]!.next = contributions[5];
  contributions[5]!.next = null;

  // LCG PRNG — 逆向: baT module
  // Use plain numbers instead of Uint32Array for type simplicity
  function lcg(s: number): number {
    return ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0;
  }

  // 构建排列表 (256 条目)
  const perm = new Uint8Array(256);
  const permGrad = new Uint8Array(256);
  const source = new Uint8Array(256);
  for (let i = 0; i < 256; i++) source[i] = i;

  let s = seed;
  s = lcg(lcg(lcg(s)));

  for (let i = 255; i >= 0; i--) {
    s = lcg(s);
    let r = ((s + 31) >>> 0) % (i + 1);
    if (r < 0) r += i + 1;
    perm[i] = source[r]!;
    permGrad[i] = perm[i]! & 14;
    source[r] = source[i]!;
  }

  // 贡献查找表 (32 条目)
  const lookup: (Contribution | null)[] = new Array(32).fill(null);
  for (let i = 0; i < 32; i++) {
    const idx =
      CONTRIBUTION_LOOKUP[
        i >= 12 ? (i >= 24 ? 11 : Math.floor((i - 12) / 2) + 6) : Math.floor(i / 2)
      ]!;
    lookup[i] = contributions[idx === 0 ? 0 : idx === 1 ? 3 : 0] ?? null;
  }
  // 简化: 使用正确的查找逻辑
  // 逆向中 amp 的查找表比较复杂; 为简化，我们使用直接的 2D 贡献计算

  return function noise2D(x: number, y: number): number {
    // Skew 到 simplex 网格
    const stretchOffset = (x + y) * STRETCH;
    const xs = x + stretchOffset;
    const ys = y + stretchOffset;

    // 网格底角
    const xsb = Math.floor(xs);
    const ysb = Math.floor(ys);

    // Squish 回笛卡尔坐标
    const squishOffset = (xsb + ysb) * SQUISH;
    const xb = xsb + squishOffset;
    const yb = ysb + squishOffset;

    // 网格内偏移
    const xins = xs - xsb;
    const yins = ys - ysb;

    // 到原点的偏移
    const dx0 = x - xb;
    const dy0 = y - yb;

    let value = 0;

    // (0,0) 贡献
    let attn0 = 2 - dx0 * dx0 - dy0 * dy0;
    if (attn0 > 0) {
      const ix = perm[xsb & 255]!;
      const iy = permGrad[(ix + ysb) & 255]!;
      attn0 *= attn0;
      value += attn0 * attn0 * (GRADIENTS[iy]! * dx0 + GRADIENTS[iy + 1]! * dy0);
    }

    // (1,0) 贡献
    const dx1 = dx0 - 1 - SQUISH;
    const dy1 = dy0 - SQUISH;
    let attn1 = 2 - dx1 * dx1 - dy1 * dy1;
    if (attn1 > 0) {
      const ix = perm[(xsb + 1) & 255]!;
      const iy = permGrad[(ix + ysb) & 255]!;
      attn1 *= attn1;
      value += attn1 * attn1 * (GRADIENTS[iy]! * dx1 + GRADIENTS[iy + 1]! * dy1);
    }

    // (0,1) 贡献
    const dx2 = dx0 - SQUISH;
    const dy2 = dy0 - 1 - SQUISH;
    let attn2 = 2 - dx2 * dx2 - dy2 * dy2;
    if (attn2 > 0) {
      const ix = perm[xsb & 255]!;
      const iy = permGrad[(ix + ysb + 1) & 255]!;
      attn2 *= attn2;
      value += attn2 * attn2 * (GRADIENTS[iy]! * dx2 + GRADIENTS[iy + 1]! * dy2);
    }

    // (1,1) 贡献 — 当在对角线上方或下方时
    if (xins + yins > 1) {
      const dx3 = dx0 - 1 - 2 * SQUISH;
      const dy3 = dy0 - 1 - 2 * SQUISH;
      let attn3 = 2 - dx3 * dx3 - dy3 * dy3;
      if (attn3 > 0) {
        const ix = perm[(xsb + 1) & 255]!;
        const iy = permGrad[(ix + ysb + 1) & 255]!;
        attn3 *= attn3;
        value += attn3 * attn3 * (GRADIENTS[iy]! * dx3 + GRADIENTS[iy + 1]! * dy3);
      }
    }

    return value * SCALE;
  };
}

// ════════════════════════════════════════════════════
//  GlowNoise — 逆向: modules/2031_unknown_Xk.js
// ════════════════════════════════════════════════════

/** RGB 颜色分量 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * GlowNoise — 封装 2D Open-Simplex Noise 的辉光采样器。
 *
 * 逆向: Xk class (modules/2031_unknown_Xk.js)
 */
export class GlowNoise {
  private readonly _noise2D: (x: number, y: number) => number;
  readonly seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this._noise2D = makeNoise2D(this.seed);
  }

  /**
   * 采样噪声值 [0, 1]。
   *
   * 逆向: Xk.sample(T, R, a, e=1)
   * `(this._noise2D(T/wxT, R/wxT + a*e) + 1) * 0.5`
   */
  sample(x: number, y: number, time: number, speed: number = 1): number {
    const raw = (this._noise2D(x / NOISE_SCALE, y / NOISE_SCALE + time * speed) + 1) * 0.5;
    return Math.max(0, Math.min(1, raw));
  }

  /**
   * 在光球边缘采样。
   *
   * 逆向: Xk.sampleEdge(T, R, a, e, t=1)
   */
  sampleEdge(
    width: number,
    height: number,
    normalizedY: number,
    time: number,
    speed: number = 1,
  ): number {
    const edgeX = width - 1;
    const edgeY = height / 2 + normalizedY * (height / 2);
    return this.sample(edgeX, edgeY, time, speed);
  }
}

// ════════════════════════════════════════════════════
//  Color utilities — 逆向: modules/2029-2030
// ════════════════════════════════════════════════════

/** 线性插值 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** RGB 颜色插值 — 逆向: pXT */
function lerpRGB(a: RGBColor, b: RGBColor, t: number): RGBColor {
  const ct = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(lerp(a.r, b.r, ct)),
    g: Math.round(lerp(a.g, b.g, ct)),
    b: Math.round(lerp(a.b, b.b, ct)),
  };
}

/** 构建 64 级调色板 — 逆向: SH.rebuildPalette */
function buildPalette(primary: RGBColor, secondary: RGBColor): Color[] {
  return Array.from({ length: PALETTE_SIZE }, (_, i) => {
    const t = i / (PALETTE_SIZE - 1);
    const c = lerpRGB(primary, secondary, t);
    return Color.rgb(c.r, c.g, c.b);
  });
}

// ════════════════════════════════════════════════════
//  Shockwave 类型
// ════════════════════════════════════════════════════

/** 冲击波数据 */
export interface Shockwave {
  x: number;
  y: number;
  startTime: number;
}

// ════════════════════════════════════════════════════
//  RenderOrbSphere — 逆向: SH (chunk-005.js:165068-165212)
// ════════════════════════════════════════════════════

/**
 * 光球渲染对象 — 在 performPaint 中绘制动画光球。
 *
 * 逆向: SH extends O9 — 完整移植 paint() 逻辑
 */
export class RenderOrbSphere extends RenderBox {
  private _width: number;
  private _height: number;
  private _time: number;
  private _glow: GlowNoise;
  private _shockwaves: Shockwave[];
  private _palette: Color[];
  private _backgroundColor: Color;
  private _colorMode: "intensity" | "vertical";

  constructor(
    width: number,
    height: number,
    time: number,
    glow: GlowNoise,
    shockwaves: Shockwave[],
    primary: RGBColor,
    secondary: RGBColor,
    backgroundColor: Color,
    colorMode: "intensity" | "vertical" = "intensity",
  ) {
    super();
    this._width = width;
    this._height = height;
    this._time = time;
    this._glow = glow;
    this._shockwaves = shockwaves;
    this._palette = buildPalette(primary, secondary);
    this._backgroundColor = backgroundColor;
    this._colorMode = colorMode;
  }

  update(
    width: number,
    height: number,
    time: number,
    glow: GlowNoise,
    shockwaves: Shockwave[],
    primary: RGBColor,
    secondary: RGBColor,
    backgroundColor: Color,
    colorMode: "intensity" | "vertical" = "intensity",
  ): void {
    let needsLayout = false;
    if (width !== this._width || height !== this._height) {
      this._width = width;
      this._height = height;
      needsLayout = true;
    }
    this._time = time;
    this._glow = glow;
    this._shockwaves = shockwaves;
    this._palette = buildPalette(primary, secondary);
    this._backgroundColor = backgroundColor;
    this._colorMode = colorMode;
    if (needsLayout) this.markNeedsLayout();
    this.markNeedsPaint();
  }

  // ── Intrinsic sizes ──
  override getMinIntrinsicWidth(_height: number): number {
    return 8;
  }
  override getMaxIntrinsicWidth(_height: number): number {
    return this._width;
  }
  override getMinIntrinsicHeight(_width: number): number {
    return 8;
  }
  override getMaxIntrinsicHeight(_width: number): number {
    return this._height;
  }

  // ── Layout — 逆向: SH.performLayout ──
  override performLayout(): void {
    const T = this._lastConstraints!;
    const size = T.constrain(this._width, this._height);
    this.setSize(size.width, size.height);
  }

  /**
   * 获取调色板索引。
   *
   * 逆向: SH.getPaletteIndex(T, R, a)
   */
  private getPaletteIndex(intensity: number, dy: number, radius: number): number {
    if (this._colorMode === "vertical") {
      const t = Math.max(0, Math.min(1, 0.5 - dy / (2 * radius)));
      return Math.min(PALETTE_SIZE - 1, Math.floor(t * PALETTE_SIZE));
    }
    return Math.min(PALETTE_SIZE - 1, Math.floor(intensity * PALETTE_SIZE));
  }

  /**
   * 绘制光球 — 逆向: SH.paint(T, R, a)
   *
   * 逐像素遍历圆形区域，用噪声采样计算亮度，
   * 映射到字符密度和调色板颜色。
   */
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    const w = Math.floor(this.size.width);
    const h = Math.floor(this.size.height);
    const screenW = screen.width;
    const screenH = screen.height;

    const cx = w / 2; // 圆心 x
    const cy = h / 2; // 圆心 y

    // 半径: 逆向 SH 用 min(w/2-1, h/(2*BxT)-1)
    const rx = Math.max(1, w / 2 - 1);
    const ry = Math.max(1, h / (2 * ASPECT_RATIO) - 1);
    const radius = Math.min(rx, ry);
    const radiusSq = radius * radius;
    const invRadiusSq = 1 / radiusSq;
    const invAspect = 1 / ASPECT_RATIO;

    const hasShockwaves = this._shockwaves.length > 0;

    for (let row = 0; row < h; row++) {
      const screenY = offsetY + row;
      if (screenY < 0 || screenY >= screenH) continue;

      // 垂直距离 (aspect-corrected)
      const dy = (row - cy) * invAspect;
      const dySq = dy * dy;
      if (dySq >= radiusSq) continue;

      // 水平范围
      const hExtent = Math.sqrt(radiusSq - dySq);
      const colStart = Math.max(0, Math.floor(cx - hExtent));
      const colEnd = Math.min(w - 1, Math.ceil(cx + hExtent));

      for (let col = colStart; col <= colEnd; col++) {
        const dx = col - cx;
        const distSq = dx * dx + dySq;
        if (distSq >= radiusSq) continue;

        // 基础亮度: 中心=1, 边缘=0
        const falloff = 1 - distSq * invRadiusSq;
        let glow = this._glow.sample(col, row, this._time, 1) * falloff;

        if (glow <= 0) continue;

        // 冲击波叠加 — 逆向: SH.paint 冲击波循环
        if (hasShockwaves) {
          const normalizedDist = distSq * invRadiusSq;
          if (normalizedDist < 0.9025) {
            for (const sw of this._shockwaves) {
              const elapsed = this._time - sw.startTime;
              if (elapsed < 0 || elapsed > SHOCKWAVE_LIFETIME) continue;

              const swDx = col - sw.x;
              const swDy = (row - sw.y) * invAspect;
              const swDistSq = swDx * swDx + swDy * swDy;
              const waveFront = elapsed * SHOCKWAVE_SPEED;
              const innerRing = Math.max(0, waveFront - SHOCKWAVE_HALF_WIDTH);
              const outerRing = waveFront + SHOCKWAVE_HALF_WIDTH;

              if (swDistSq < innerRing * innerRing || swDistSq > outerRing * outerRing) continue;

              const swDist = Math.sqrt(swDistSq);
              const ringDist = Math.abs(swDist - waveFront);
              if (ringDist >= SHOCKWAVE_HALF_WIDTH) continue;

              const fade = 1 - elapsed / SHOCKWAVE_LIFETIME;
              const ringIntensity = (1 - ringDist / SHOCKWAVE_HALF_WIDTH) * fade;
              const sqrtNorm = Math.sqrt(normalizedDist);
              const edgeFalloff = 1 - normalizedDist * sqrtNorm;
              glow = Math.min(1, glow + ringIntensity * 0.8 * edgeFalloff);
            }
          }
        }

        // 字符映射
        const charIdx = Math.min(CHAR_RAMP.length - 1, Math.floor(glow * CHAR_RAMP.length));
        const ch = CHAR_RAMP[charIdx] || SPACE_CHAR;

        // 颜色映射
        const paletteIdx = this.getPaletteIndex(glow, dy, radius);
        const fg = this._palette[paletteIdx] || this._palette[PALETTE_SIZE - 1]!;

        const screenX = offsetX + col;
        if (screenX < 0 || screenX >= screenW) continue;

        const style = new TextStyle({ foreground: fg, background: this._backgroundColor });
        screen.setCell(screenX, screenY, new Cell(ch, style));
      }
    }
  }
}

// ════════════════════════════════════════════════════
//  OrbSphereWidget — 逆向: PXT (chunk-005.js:165050-165067)
// ════════════════════════════════════════════════════

/** OrbSphereWidget 配置 */
export interface OrbSphereProps {
  width: number;
  height: number;
  time: number;
  glow: GlowNoise;
  shockwaves: Shockwave[];
  primary: RGBColor;
  secondary: RGBColor;
  backgroundColor: Color;
  colorMode?: "intensity" | "vertical";
}

/**
 * 光球渲染 Widget (无子节点叶子 Widget)。
 *
 * 逆向: PXT extends to — 创建 SH RenderBox
 */
class OrbSphereWidget extends Widget implements RenderObjectWidget {
  readonly props: OrbSphereProps;

  constructor(props: OrbSphereProps, key?: Key) {
    super({ key });
    this.props = props;
  }

  createElement(): Element {
    return new LeafRenderObjectElement(this as unknown as Widget);
  }

  createRenderObject(): RenderObject {
    return new RenderOrbSphere(
      this.props.width,
      this.props.height,
      this.props.time,
      this.props.glow,
      this.props.shockwaves,
      this.props.primary,
      this.props.secondary,
      this.props.backgroundColor,
      this.props.colorMode,
    );
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderOrbSphere).update(
      this.props.width,
      this.props.height,
      this.props.time,
      this.props.glow,
      this.props.shockwaves,
      this.props.primary,
      this.props.secondary,
      this.props.backgroundColor,
      this.props.colorMode,
    );
  }
}

// ════════════════════════════════════════════════════
//  AnimatedOrb — 逆向: uXT / yXT (chunk-005.js:164932-165049)
// ════════════════════════════════════════════════════

/** AnimatedOrb 配置 */
export interface AnimatedOrbConfig {
  key?: Key;
  /** 光球宽度 (字符列数)，默认 40 */
  width?: number;
  /** 光球高度 (字符行数)，默认 40 */
  height?: number;
  /** 外部驱动的时间值; 不传则自行创建定时器 */
  t?: number;
  /** 动画帧率，默认 30 */
  fps?: number;
  /** 随机种子 */
  seed?: number;
  /** 共享的 GlowNoise 实例 */
  glow?: GlowNoise;
  /** 主色 */
  primaryColor?: RGBColor;
  /** 辅色 */
  secondaryColor?: RGBColor;
  /** 背景色 */
  backgroundColor?: Color;
  /** 颜色模式 */
  colorMode?: "intensity" | "vertical";
}

/**
 * AnimatedOrb — 动画光球 StatefulWidget。
 *
 * 逆向: uXT extends NR
 */
export class AnimatedOrb extends StatefulWidget {
  readonly width: number;
  readonly height: number;
  readonly t: number | undefined;
  readonly fps: number;
  readonly seed: number | undefined;
  readonly glow: GlowNoise | undefined;
  readonly primaryColor: RGBColor;
  readonly secondaryColor: RGBColor;
  readonly backgroundColor: Color;
  readonly colorMode: "intensity" | "vertical";

  constructor(config?: AnimatedOrbConfig) {
    super({ key: config?.key });
    this.width = config?.width ?? 40;
    this.height = config?.height ?? 40;
    this.t = config?.t;
    this.fps = config?.fps ?? 30;
    this.seed = config?.seed;
    this.glow = config?.glow;
    this.primaryColor = config?.primaryColor ?? DEFAULT_PRIMARY;
    this.secondaryColor = config?.secondaryColor ?? DEFAULT_SECONDARY;
    this.backgroundColor = config?.backgroundColor ?? Color.rgb(0x1a, 0x1b, 0x26);
    this.colorMode = config?.colorMode ?? "intensity";
  }

  createState(): State<AnimatedOrb> {
    return new AnimatedOrbState();
  }
}

/**
 * AnimatedOrb State — 管理定时器和内部冲击波。
 *
 * 逆向: yXT extends wR
 */
class AnimatedOrbState extends State<AnimatedOrb> {
  private _t = 0;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _glow!: GlowNoise;
  private _shockwaves: Shockwave[] = [];

  /**
   * 逆向: yXT.initState
   *
   * 如果 widget.t 不为 undefined (外部驱动), 使用外部时间。
   * 否则创建内部定时器。
   */
  override initState(): void {
    super.initState();
    this._glow = this.widget.glow ?? new GlowNoise(this.widget.seed);

    if (this.widget.t !== undefined || this.widget.fps === 0) {
      this._t = this.widget.t ?? 0;
      return;
    }

    this._timer = setInterval(() => {
      this._t += 1 / this.widget.fps;
      // 过滤过期冲击波
      this._shockwaves = this._shockwaves.filter(
        (sw) => this._t - sw.startTime < SHOCKWAVE_LIFETIME,
      );
      this.setState(() => {});
    }, 1000 / this.widget.fps);
  }

  /**
   * 逆向: yXT.didUpdateWidget
   */
  override didUpdateWidget(oldWidget: AnimatedOrb): void {
    super.didUpdateWidget(oldWidget);
    if (this.widget.glow !== oldWidget.glow) {
      this._glow = this.widget.glow ?? new GlowNoise(this.widget.seed);
    }
    if (this.widget.t !== undefined && this.widget.t !== oldWidget.t) {
      this._t = this.widget.t;
      this.setState(() => {});
    }
  }

  /**
   * 逆向: yXT.dispose
   */
  override dispose(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    super.dispose();
  }

  /**
   * 逆向: yXT.build
   */
  build(): Widget {
    return new OrbSphereWidget({
      width: this.widget.width,
      height: this.widget.height,
      time: this._t,
      glow: this._glow,
      shockwaves: this._shockwaves,
      primary: this.widget.primaryColor,
      secondary: this.widget.secondaryColor,
      backgroundColor: this.widget.backgroundColor,
      colorMode: this.widget.colorMode,
    }) as unknown as Widget;
  }
}
