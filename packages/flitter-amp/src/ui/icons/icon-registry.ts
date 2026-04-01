import { stringWidth } from 'flitter-core/src/core/wcwidth';

import type { IconName } from './types';
import { UNICODE_ICONS } from './sets/unicode';

/**
 * Resolve a semantic icon to an AMP-compatible single-cell glyph.
 *
 * This project intentionally uses AMP's icon system only (no alternate sets).
 */
export function icon(name: IconName): string {
  const glyph = UNICODE_ICONS[name];
  // Enforce a strict 1-cell invariant to avoid layout issues.
  // (We rely on flitter-core's wcwidth behavior here.)
  if (stringWidth(glyph) !== 1) {
    return UNICODE_ICONS[name];
  }
  return glyph;
}

/**
 * Maps tool execution status to AMP-style status icon glyph.
 *
 * AMP ref: `packages/flitter-amp/.ref/amp-cli/status-icon-rR.js`.
 */
export function toolStatusIcon(status: string): string {
  switch (status) {
    case 'done':
    case 'completed':
      return icon('tool.status.done');
    case 'error':
    case 'failed':
    case 'cancelled':
    case 'rejected-by-user':
    case 'cancellation-requested':
      return icon('tool.status.error');
    case 'in-progress':
    case 'in_progress':
    case 'queued':
    case 'pending':
    case 'blocked-on-user':
    default:
      return icon('tool.status.pending');
  }
}
