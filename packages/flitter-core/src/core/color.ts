// Color type supporting Named (16), Ansi256, and TrueColor (RGB).
// Produces SGR parameters for terminal escape sequences.
// Amp ref: amp-strings.txt — w0 Color type with .default(), .index(n), .rgb(r,g,b)

export type ColorMode = 'named' | 'ansi256' | 'rgb';

// Standard 256-color palette lookup table (indices 0-255 -> [r, g, b])
const ANSI256_TO_RGB: readonly [number, number, number][] = buildAnsi256Table();

function buildAnsi256Table(): [number, number, number][] {
  const table: [number, number, number][] = [];

  // 0-7: Standard colors
  const standardColors: [number, number, number][] = [
    [0, 0, 0],       // 0: black
    [128, 0, 0],     // 1: red
    [0, 128, 0],     // 2: green
    [128, 128, 0],   // 3: yellow
    [0, 0, 128],     // 4: blue
    [128, 0, 128],   // 5: magenta
    [0, 128, 128],   // 6: cyan
    [192, 192, 192],  // 7: white
  ];

  // 8-15: Bright colors
  const brightColors: [number, number, number][] = [
    [128, 128, 128], // 8: bright black (gray)
    [255, 0, 0],     // 9: bright red
    [0, 255, 0],     // 10: bright green
    [255, 255, 0],   // 11: bright yellow
    [0, 0, 255],     // 12: bright blue
    [255, 0, 255],   // 13: bright magenta
    [0, 255, 255],   // 14: bright cyan
    [255, 255, 255], // 15: bright white
  ];

  for (const c of standardColors) table.push(c);
  for (const c of brightColors) table.push(c);

  // 16-231: 6x6x6 color cube
  const cubeValues = [0, 95, 135, 175, 215, 255];
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        table.push([cubeValues[r]!, cubeValues[g]!, cubeValues[b]!]);
      }
    }
  }

  // 232-255: Grayscale ramp
  for (let i = 0; i < 24; i++) {
    const v = 8 + i * 10;
    table.push([v, v, v]);
  }

  return table;
}

// Cache for RGB -> Ansi256 nearest match
const rgbToAnsi256Cache = new Map<number, number>();

function findNearestAnsi256(r: number, g: number, b: number): number {
  const key = (r << 16) | (g << 8) | b;
  const cached = rgbToAnsi256Cache.get(key);
  if (cached !== undefined) return cached;

  let bestIdx = 16;
  let bestDist = Infinity;

  // Search indices 16-255 (color cube + grayscale)
  for (let i = 16; i < 256; i++) {
    const [pr, pg, pb] = ANSI256_TO_RGB[i]!;
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  rgbToAnsi256Cache.set(key, bestIdx);
  return bestIdx;
}

/**
 * Represents a terminal color supporting Named (16), Ansi256, and TrueColor modes.
 * Immutable value type that produces SGR escape sequence parameters.
 */
export class Color {
  readonly mode: ColorMode;
  /**
   * For named: 0-15 (or -1 for default)
   * For ansi256: 0-255
   * For rgb: (r << 16 | g << 8 | b)
   */
  readonly value: number;
  /** Alpha channel: 0.0 (fully transparent) to 1.0 (fully opaque). Default 1.0. */
  readonly alpha: number;

  private constructor(mode: ColorMode, value: number, alpha: number = 1.0) {
    this.mode = mode;
    this.value = value;
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  // --- Named color constants (0-15) ---
  static readonly black: Color = new Color('named', 0);
  static readonly red: Color = new Color('named', 1);
  static readonly green: Color = new Color('named', 2);
  static readonly yellow: Color = new Color('named', 3);
  static readonly blue: Color = new Color('named', 4);
  static readonly magenta: Color = new Color('named', 5);
  static readonly cyan: Color = new Color('named', 6);
  static readonly white: Color = new Color('named', 7);
  static readonly brightBlack: Color = new Color('named', 8);
  static readonly brightRed: Color = new Color('named', 9);
  static readonly brightGreen: Color = new Color('named', 10);
  static readonly brightYellow: Color = new Color('named', 11);
  static readonly brightBlue: Color = new Color('named', 12);
  static readonly brightMagenta: Color = new Color('named', 13);
  static readonly brightCyan: Color = new Color('named', 14);
  static readonly brightWhite: Color = new Color('named', 15);

  /** Sentinel meaning "no color set" — uses terminal default */
  static readonly defaultColor: Color = new Color('named', -1);

  // --- Factory constructors ---

  /** Create a named color by index (0-15) */
  static named(index: number): Color {
    if (index < 0 || index > 15) {
      throw new RangeError(`Named color index must be 0-15, got ${index}`);
    }
    return new Color('named', index);
  }

  /** Create an Ansi256 color by index (0-255) */
  static ansi256(index: number): Color {
    if (index < 0 || index > 255) {
      throw new RangeError(`Ansi256 color index must be 0-255, got ${index}`);
    }
    return new Color('ansi256', index);
  }

  /** Create a TrueColor RGB color */
  static rgb(r: number, g: number, b: number): Color {
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    return new Color('rgb', (r << 16) | (g << 8) | b);
  }

  // --- SGR output ---

  /**
   * Returns the SGR parameter string for foreground color.
   * Named 0-7: "30"-"37", Named 8-15: "90"-"97", Default: "39"
   * Ansi256: "38;5;N", RGB: "38;2;R;G;B"
   */
  toSgrFg(): string {
    switch (this.mode) {
      case 'named': {
        if (this.value === -1) return '39';
        if (this.value < 8) return String(30 + this.value);
        return String(90 + (this.value - 8));
      }
      case 'ansi256':
        return `38;5;${this.value}`;
      case 'rgb':
        return `38;2;${this.r};${this.g};${this.b}`;
    }
  }

  /**
   * Returns the SGR parameter string for background color.
   * Named 0-7: "40"-"47", Named 8-15: "100"-"107", Default: "49"
   * Ansi256: "48;5;N", RGB: "48;2;R;G;B"
   */
  toSgrBg(): string {
    switch (this.mode) {
      case 'named': {
        if (this.value === -1) return '49';
        if (this.value < 8) return String(40 + this.value);
        return String(100 + (this.value - 8));
      }
      case 'ansi256':
        return `48;5;${this.value}`;
      case 'rgb':
        return `48;2;${this.r};${this.g};${this.b}`;
    }
  }

  // --- RGB component accessors ---

  get r(): number {
    if (this.mode === 'rgb') return (this.value >> 16) & 0xff;
    throw new Error('r is only available on rgb colors');
  }

  get g(): number {
    if (this.mode === 'rgb') return (this.value >> 8) & 0xff;
    throw new Error('g is only available on rgb colors');
  }

  get b(): number {
    if (this.mode === 'rgb') return this.value & 0xff;
    throw new Error('b is only available on rgb colors');
  }

  // --- Conversion ---

  /**
   * Convert to nearest Ansi256 color.
   * Named colors map to their Ansi256 equivalent (0-15).
   * RGB finds nearest match in the 256-color palette.
   */
  toAnsi256(): Color {
    switch (this.mode) {
      case 'named': {
        if (this.value === -1) return Color.defaultColor;
        return Color.ansi256(this.value);
      }
      case 'ansi256':
        return this;
      case 'rgb': {
        const idx = findNearestAnsi256(this.r, this.g, this.b);
        return Color.ansi256(idx);
      }
    }
  }

  /**
   * Convert to RGB color.
   * Named and Ansi256 use the standard 256-color lookup table.
   * Default color cannot be converted (returns self).
   */
  toRgb(): Color {
    switch (this.mode) {
      case 'named': {
        if (this.value === -1) return this;
        const [r, g, b] = ANSI256_TO_RGB[this.value]!;
        return Color.rgb(r, g, b);
      }
      case 'ansi256': {
        const [r, g, b] = ANSI256_TO_RGB[this.value]!;
        return Color.rgb(r, g, b);
      }
      case 'rgb':
        return this;
    }
  }

  /**
   * Returns a new Color with the specified alpha, preserving mode and value.
   */
  withAlpha(alpha: number): Color {
    return new Color(this.mode, this.value, alpha);
  }

  equals(other: Color): boolean {
    return this.mode === other.mode && this.value === other.value && this.alpha === other.alpha;
  }

  toString(): string {
    const alphaSuffix = this.alpha < 1.0 ? `,a=${this.alpha.toFixed(2)}` : '';
    switch (this.mode) {
      case 'named': {
        if (this.value === -1) return `Color(default${alphaSuffix})`;
        return `Color(named:${this.value}${alphaSuffix})`;
      }
      case 'ansi256':
        return `Color(ansi256:${this.value}${alphaSuffix})`;
      case 'rgb':
        return `Color(rgb:${this.r},${this.g},${this.b}${alphaSuffix})`;
    }
  }
}

/**
 * Blend two colors using standard alpha compositing (front over back).
 * Formula: result = front * front.alpha + back * (1 - front.alpha)
 * Both colors are converted to RGB for blending. Result has alpha 1.0.
 * If front alpha is 1.0, returns front as-is. If front alpha is 0.0, returns back.
 */
export function blendColor(front: Color, back: Color): Color {
  const a = front.alpha;
  if (a >= 1.0) return front;
  if (a <= 0.0) return back;

  // Convert both to RGB for blending math
  const f = front.mode === 'rgb' ? front : front.toRgb();
  const b = back.mode === 'rgb' ? back : back.toRgb();

  // If either is defaultColor (can't convert to RGB), fall through
  if (f.mode !== 'rgb') return front;
  if (b.mode !== 'rgb') return front;

  const r = Math.round(f.r * a + b.r * (1 - a));
  const g = Math.round(f.g * a + b.g * (1 - a));
  const bl = Math.round(f.b * a + b.b * (1 - a));

  return Color.rgb(r, g, bl);
}

/**
 * Linearly interpolate between two colors at parameter t.
 * t is clamped to [0, 1]. Both colors are converted to RGB for interpolation.
 * Non-RGB colors that cannot be converted snap to nearest (a if t < 0.5, b otherwise).
 *
 * Example: lerpColor(Color.rgb(0,0,0), Color.rgb(255,255,255), 0.5) → Color.rgb(128,128,128)
 */
export function lerpColor(a: Color, b: Color, t: number): Color {
  const clamped = Math.max(0, Math.min(1, t));
  const rgbA = a.toRgb();
  const rgbB = b.toRgb();
  if (rgbA.mode !== 'rgb' || rgbB.mode !== 'rgb') {
    return clamped < 0.5 ? a : b;
  }
  const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * clamped);
  const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * clamped);
  const bl = Math.round(rgbA.b + (rgbB.b - rgbA.b) * clamped);
  return Color.rgb(r, g, bl);
}
