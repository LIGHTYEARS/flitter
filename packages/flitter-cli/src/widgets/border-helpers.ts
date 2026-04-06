// border-helpers.ts — Shared formatting and status helpers for border overlay builders.
//
// These helpers are migrated from HeaderBar (header-bar.ts) and StatusBar (status-bar.ts)
// to provide a common module imported by border-builders.ts. The original source widgets
// retain their own copies to avoid circular dependencies during the migration phase.
//
// Migrated helpers:
//   formatTokenCount  — from header-bar.ts (token count auto-scaling)
//   formatElapsed     — from header-bar.ts (milliseconds → compact duration)
//   thresholdColor    — from header-bar.ts (context-window % → threshold color)
//   shortenPath       — from status-bar.ts (filesystem path → display-friendly form)
//   getFooterText     — from status-bar.ts (app sub-state → contextual status string)

import { Color } from '../../../flitter-core/src/core/color';

// ---------------------------------------------------------------------------
// Formatting helpers — migrated from header-bar.ts
// ---------------------------------------------------------------------------

/**
 * Auto-scale a token count to k/M with 1 decimal place.
 * Returns a compact human-readable string (e.g. "1.2k", "3.5M", "42").
 *
 * Migrated from header-bar.ts. Identical implementation.
 */
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return `${count}`;
}

/**
 * Formats elapsed milliseconds into a compact duration string.
 * <60s → "12s", ≥60s → "1m 23s", ≥3600s → "1h 2m".
 *
 * Migrated from header-bar.ts. Identical implementation.
 */
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m ${sec}s`;
  const hr = Math.floor(min / 60);
  const remainMin = min % 60;
  return `${hr}h ${remainMin}m`;
}

/**
 * Returns threshold color for context window usage percentage.
 * <50% → blue (dim), 50-80% → yellow, >80% → red.
 *
 * Migrated from header-bar.ts. Identical implementation.
 */
export function thresholdColor(percent: number): Color {
  if (percent > 80) return Color.red;
  if (percent >= 50) return Color.yellow;
  return Color.blue;
}

// ---------------------------------------------------------------------------
// Status helpers — migrated from status-bar.ts
// ---------------------------------------------------------------------------

/**
 * Shortens a filesystem path for display in the status bar.
 * Replaces $HOME prefix with ~ and truncates from the left with "..."
 * if the result exceeds maxLen characters.
 *
 * Migrated from status-bar.ts. Identical implementation.
 */
export function shortenPath(fullPath: string, maxLen: number = 40): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  let p = fullPath;
  if (home && p.startsWith(home)) {
    p = '~' + p.slice(home.length);
  }
  if (p.length > maxLen) {
    p = '...' + p.slice(p.length - maxLen + 3);
  }
  return p;
}

/**
 * Returns the contextual footer/status text based on current app sub-states.
 *
 * Matches AMP's getFooterText from bottom-grid.ts with the following priority:
 *   1. isInterrupted       → 'Stream interrupted'
 *   2. isExecutingCommand  → 'Executing command...'
 *   3. isRunningShell      → 'Running shell...'
 *   4. isAutoCompacting    → 'Auto-compacting context...'
 *   5. isHandingOff        → 'Handing off to subagent...'
 *   6. isProcessing        → 'Streaming response...'
 *   7. default             → ''
 *
 * Migrated from status-bar.ts. Identical implementation.
 */
export function getFooterText(props: {
  isProcessing: boolean;
  isInterrupted: boolean;
  isExecutingCommand: boolean;
  isRunningShell: boolean;
  isAutoCompacting: boolean;
  isHandingOff: boolean;
}): string {
  if (props.isInterrupted) return 'Stream interrupted';
  if (props.isExecutingCommand) return 'Executing command...';
  if (props.isRunningShell) return 'Running shell...';
  if (props.isAutoCompacting) return 'Auto-compacting context...';
  if (props.isHandingOff) return 'Handing off to subagent...';
  if (props.isProcessing) return 'Streaming response...';
  return '';
}
