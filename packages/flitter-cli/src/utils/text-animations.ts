// Text animation utilities (N9).
//
// Provides both simple backward-compatible pure functions and stateful
// animation classes that match AMP's approach:
//   - GlowText:    Per-character Perlin-noise color interpolation
//   - TextMorph:   Three-phase character morphing (fade, scramble, reveal)
//   - ScanningBar:  Bouncing highlight segment across a fixed-width bar

import { noise1D } from './perlin-animation';

// =========================================================================
// Backward-compatible pure function exports
// =========================================================================

/**
 * Apply a glow effect to text using ANSI escape codes.
 *
 * At high intensity (>= 0.5), text is bold + bright.
 * At low intensity (< 0.5), text is dim.
 * Intensity is clamped to [0, 1].
 */
export function glowText(text: string, intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  if (clamped >= 0.5) {
    // Bold + bright white
    return `\x1b[1;97m${text}\x1b[0m`;
  }
  // Dim
  return `\x1b[2m${text}\x1b[0m`;
}

/**
 * Linear interpolation between two strings based on progress [0, 1].
 *
 * At progress 0, returns `from`. At progress 1, returns `to`.
 * Intermediate values cross-fade character by character based on position.
 */
export function textMorph(from: string, to: string, progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return from;
  if (p >= 1) return to;

  const maxLen = Math.max(from.length, to.length);
  const cutoff = Math.floor(maxLen * p);

  const result: string[] = [];
  for (let i = 0; i < maxLen; i++) {
    if (i < cutoff) {
      result.push(i < to.length ? to[i] : ' ');
    } else {
      result.push(i < from.length ? from[i] : ' ');
    }
  }

  return result.join('');
}

/**
 * Generate a scanning bar animation string.
 *
 * Creates a bar of the given width with a highlight at the given position.
 * Position wraps around the width.
 *
 * @param width - Total width of the bar in characters
 * @param position - Current position of the scanning highlight (0-based)
 * @returns A string of `width` characters with the scan indicator
 */
export function scanningBar(width: number, position: number): string {
  if (width <= 0) return '';
  const pos = ((position % width) + width) % width; // Normalize to [0, width)
  const chars: string[] = [];
  for (let i = 0; i < width; i++) {
    if (i === pos) {
      chars.push('\u2588'); // Full block at scan position
    } else if (i === pos - 1 || i === pos + 1) {
      chars.push('\u2593'); // Dark shade adjacent
    } else {
      chars.push('\u2591'); // Light shade background
    }
  }
  return chars.join('');
}

// =========================================================================
// ANSI color helpers
// =========================================================================

/** Produce an ANSI SGR 24-bit foreground color escape sequence. */
function fg(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

/** ANSI reset sequence. */
const RESET = '\x1b[0m';

/** Linear interpolation between two numbers. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// =========================================================================
// GlowText class
// =========================================================================

export interface GlowTextOptions {
  /** The text to render. */
  text: string;
  /** Base color as [r, g, b]. Default: [180, 180, 180] (light gray). */
  baseColor?: [number, number, number];
  /** Glow color as [r, g, b]. Default: [255, 255, 255] (white). */
  glowColor?: [number, number, number];
  /** Glow intensity scaling factor [0, 1]. Default: 0.4. */
  glowIntensity?: number;
}

/**
 * Per-character Perlin-noise glow effect.
 *
 * Each character's color is interpolated between baseColor and glowColor
 * based on 1D Perlin noise sampled at (charIndex * 0.3 + t). This creates
 * a shimmering wave of brightness that moves across the text.
 *
 * Usage:
 *   const glow = new GlowText({ text: 'Hello', baseColor: [100,100,100], glowColor: [255,255,255] });
 *   process.stdout.write(glow.render(0));    // initial state
 *   process.stdout.write(glow.render(0.5));  // animated
 */
export class GlowText {
  readonly text: string;
  private readonly baseR: number;
  private readonly baseG: number;
  private readonly baseB: number;
  private readonly glowR: number;
  private readonly glowG: number;
  private readonly glowB: number;
  private readonly glowIntensity: number;

  constructor(options: GlowTextOptions) {
    this.text = options.text;
    const base = options.baseColor ?? [180, 180, 180];
    const glow = options.glowColor ?? [255, 255, 255];
    this.baseR = base[0];
    this.baseG = base[1];
    this.baseB = base[2];
    this.glowR = glow[0];
    this.glowG = glow[1];
    this.glowB = glow[2];
    this.glowIntensity = options.glowIntensity ?? 0.4;
  }

  /**
   * Render the glow text at time `t`.
   *
   * Returns a string with ANSI 24-bit color codes that interpolates
   * each character between baseColor and glowColor using Perlin noise.
   */
  render(t: number): string {
    const { text, baseR, baseG, baseB, glowR, glowG, glowB, glowIntensity } = this;
    const parts: string[] = [];

    for (let i = 0; i < text.length; i++) {
      // Sample 1D noise for this character position
      const n = (noise1D(i * 0.3 + t) + 1) * 0.5; // normalize to [0, 1]
      const blend = n * glowIntensity;

      const r = Math.round(lerp(baseR, glowR, blend));
      const g = Math.round(lerp(baseG, glowG, blend));
      const b = Math.round(lerp(baseB, glowB, blend));

      parts.push(`${fg(r, g, b)}${text[i]}`);
    }

    parts.push(RESET);
    return parts.join('');
  }
}

// =========================================================================
// TextMorph class
// =========================================================================

/** Characters used for the scramble phase of morphing. */
const MORPH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export interface TextMorphOptions {
  /** Initial text (also used as "from" text). */
  from: string;
  /** Target text to morph towards. */
  to: string;
}

/**
 * Three-phase character morphing animation.
 *
 * Morphs text from a source string to a target string across three phases:
 *   Phase 1 (0.0 - 0.3): Dim/fade the previous characters
 *   Phase 2 (0.3 - 0.7): Show random scramble characters
 *   Phase 3 (0.7 - 1.0): Reveal the target characters
 *
 * Each character position has its own phase threshold based on its index,
 * creating a wave-like morph from left to right.
 *
 * Usage:
 *   const morph = new TextMorph({ from: 'Hello', to: 'World' });
 *   morph.render(0);    // shows 'Hello'
 *   morph.render(0.5);  // mid-transition scramble
 *   morph.render(1);    // shows 'World'
 */
export class TextMorph {
  readonly from: string;
  readonly to: string;
  private readonly seed: number;

  constructor(options: TextMorphOptions) {
    this.from = options.from;
    this.to = options.to;
    this.seed = Math.floor(Math.abs(hashCode(options.from + options.to)) % 1000);
  }

  /**
   * Render the morph at a given progress value [0, 1].
   *
   * Returns a string with ANSI escape codes showing the current
   * state of the morph animation.
   *
   * @param progress - Animation progress from 0 (source) to 1 (target).
   */
  render(progress: number): string {
    const p = Math.max(0, Math.min(1, progress));
    const { from, to, seed } = this;
    const maxLen = Math.max(from.length, to.length);

    // Fully complete or identical strings
    if (p >= 1 || from === to) {
      return to;
    }
    if (p <= 0) {
      return from;
    }

    const parts: string[] = [];

    for (let i = 0; i < maxLen; i++) {
      // Each character has its own progress threshold based on position.
      // Characters at the start morph earlier than those at the end.
      const charThreshold = (i + 1) / (maxLen + 1);

      // Phase boundaries for this character
      const fadeEnd = charThreshold * 0.3;
      const scrambleEnd = charThreshold * 0.7;

      if (p >= charThreshold) {
        // Phase 3: Reveal target character
        const ch = i < to.length ? to[i] : '';
        if (ch) {
          parts.push(ch);
        }
      } else if (p < fadeEnd) {
        // Phase 1: Dim/fade the previous character
        const ch = i < from.length ? from[i] : ' ';
        const dimAmount = fadeEnd > 0 ? p / fadeEnd : 0;
        // Dim the character using ANSI dim + interpolated brightness
        const brightness = Math.round(200 * (1 - dimAmount * 0.5));
        parts.push(`${fg(brightness, brightness, brightness)}${ch}${RESET}`);
      } else {
        // Phase 2: Show scramble character
        const morphIdx = Math.floor(Math.abs((seed + i + p * 47) * 13.37)) % MORPH_CHARS.length;
        const ch = MORPH_CHARS[morphIdx]!;
        parts.push(`\x1b[2m${fg(128, 128, 128)}${ch}${RESET}`);
      }
    }

    return parts.join('');
  }
}

/**
 * Simple deterministic hash for generating a seed from a string.
 */
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}

// =========================================================================
// ScanningBar class
// =========================================================================

const DEFAULT_BAR_WIDTH = 20;
const HIGHLIGHT_LENGTH = 4;

export interface ScanningBarOptions {
  /** Total width of the bar in characters. Default: 20. */
  width?: number;
  /** Optional label prefix. Default: 'Scanning'. */
  label?: string;
}

/**
 * Bouncing highlight bar animation.
 *
 * A horizontal bar of fixed width with a bright highlight segment of
 * HIGHLIGHT_LENGTH=4 cells that bounces back and forth. Uses thick
 * bar characters for the highlight and thin for the background.
 *
 * Usage:
 *   const bar = new ScanningBar({ width: 20 });
 *   bar.render(0);   // highlight at far left
 *   bar.render(0.5); // highlight midway
 */
export class ScanningBar {
  readonly width: number;
  readonly label: string;

  constructor(options?: ScanningBarOptions) {
    this.width = options?.width ?? DEFAULT_BAR_WIDTH;
    this.label = options?.label ?? 'Scanning';
  }

  /**
   * Render the scanning bar at time `t`.
   *
   * The highlight bounces between position 0 and (width - HIGHLIGHT_LENGTH),
   * reversing direction at each edge. The cycle period is calculated so that
   * the highlight traverses the full width in both directions.
   *
   * @param t - Time parameter. Integer values step one position; fractional
   *            values interpolate smoothly.
   * @returns A string with the label prefix and the bar characters.
   */
  render(t: number): string {
    const { width, label } = this;
    if (width <= 0) return label ? `${label} ` : '';

    const maxPos = Math.max(1, width - HIGHLIGHT_LENGTH);
    // Bouncing position: triangle wave with period = 2 * maxPos
    const cycle = maxPos * 2;
    const raw = ((Math.floor(t) % cycle) + cycle) % cycle;
    const position = raw < maxPos ? raw : cycle - raw;

    const parts: string[] = [];
    if (label) {
      parts.push(`${label} `);
    }

    for (let i = 0; i < width; i++) {
      const inHighlight = i >= position && i < position + HIGHLIGHT_LENGTH;
      if (inHighlight) {
        parts.push('\u2501'); // heavy horizontal (━)
      } else {
        parts.push('\u2500'); // light horizontal (─)
      }
    }

    return parts.join('');
  }
}
