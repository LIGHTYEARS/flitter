/**
 * Shared output extraction utilities for tool-call renderers.
 *
 * These pure functions encapsulate the common patterns for walking
 * ToolCallResult structures, so individual tool widgets do not need
 * to reimplement the same traversal logic.
 *
 * Design principles:
 *   - Every function takes a ToolCallResult (or undefined) as its first arg
 *   - Options are passed via a typed object with sensible defaults
 *   - Functions are pure and side-effect free for easy testing
 *   - The traversal order (rawOutput -> content[]) is consistent everywhere
 *
 * Ported from flitter-amp/src/widgets/tool-call/tool-output-utils.ts
 * — imports adapted from acp/types to state/types (flitter-cli native types).
 */

import type { ToolCallResult } from '../../state/types';
import { extractContentText } from '../../utils/raw-input';
import { asString } from '../../utils/raw-input';
import {
  OUTPUT_TRUNCATION_LIMIT,
  TRUNCATION_SUFFIX,
  truncateText,
} from './truncation-limits';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options controlling text extraction and truncation behavior. */
export interface ExtractTextOptions {
  /** Maximum character length before truncation. Default: OUTPUT_TRUNCATION_LIMIT (2000). */
  maxLength?: number;
  /** Suffix appended when text is truncated. Default: TRUNCATION_SUFFIX. */
  truncationSuffix?: string;
}

// ---------------------------------------------------------------------------
// Core: content array text joining
// ---------------------------------------------------------------------------

/**
 * Joins all text fragments found in a ToolCallResult.content array.
 *
 * Handles both shapes observed in the codebase:
 *   - Direct `text` property on the content item (cast access)
 *   - Nested `content.text` property
 *
 * Returns an empty string when content is absent or contains no text.
 */
export function joinContentText(result: ToolCallResult | undefined): string {
  if (!result?.content) return '';
  return result.content.map(extractContentText).join('\n');
}

// ---------------------------------------------------------------------------
// Generic text extraction (Pattern A)
// ---------------------------------------------------------------------------

/**
 * Extracts a plain-text representation of the tool output.
 *
 * Resolution order:
 *   1. rawOutput as a string (returned verbatim)
 *   2. rawOutput as an object (JSON-stringified with 2-space indent)
 *   3. content[] text join via joinContentText()
 *
 * The result is truncated to `maxLength` characters (default 2000).
 */
export function extractOutputText(
  result: ToolCallResult | undefined,
  options: ExtractTextOptions = {},
): string {
  const {
    maxLength = OUTPUT_TRUNCATION_LIMIT,
    truncationSuffix = TRUNCATION_SUFFIX,
  } = options;

  if (!result) return '';

  let text = '';

  if (result.rawOutput !== undefined) {
    const raw = result.rawOutput;
    if (typeof raw === 'string') {
      text = raw;
    } else {
      text = JSON.stringify(raw, null, 2);
    }
  } else {
    text = joinContentText(result);
  }

  return truncateText(text, maxLength, truncationSuffix);
}

// ---------------------------------------------------------------------------
// Bash-specific: stdout/stderr extraction (Pattern A variant)
// ---------------------------------------------------------------------------

/**
 * Extracts shell output from a ToolCallResult, preferring structured
 * stdout/stderr fields when rawOutput is an object.
 *
 * Resolution order:
 *   1. rawOutput is a string -> return it directly
 *   2. rawOutput has stdout/stderr keys -> join non-empty parts with newline
 *   3. rawOutput is another object shape -> JSON.stringify
 *   4. Fallback to content[] text join
 */
export function extractShellOutput(
  result: ToolCallResult | undefined,
  options: ExtractTextOptions = {},
): string {
  const {
    maxLength = OUTPUT_TRUNCATION_LIMIT,
    truncationSuffix = TRUNCATION_SUFFIX,
  } = options;

  if (!result) return '';

  let text = '';

  if (result.rawOutput !== undefined) {
    const raw = result.rawOutput;
    if (typeof raw === 'string') {
      text = raw;
    } else {
      const stdout = asString(raw['stdout']);
      const stderr = asString(raw['stderr']);
      if (stdout || stderr) {
        text = [stdout, stderr].filter(Boolean).join('\n');
      } else {
        text = JSON.stringify(raw, null, 2);
      }
    }
  } else {
    text = joinContentText(result);
  }

  return truncateText(text, maxLength, truncationSuffix);
}

// ---------------------------------------------------------------------------
// Diff extraction (Pattern B)
// ---------------------------------------------------------------------------

/**
 * Detects whether a string looks like a unified diff.
 *
 * Checks for the presence of hunk headers (@@) combined with
 * file markers (--- or +++).
 */
export function looksLikeDiff(text: string): boolean {
  return text.includes('@@') && (text.includes('---') || text.includes('+++'));
}

/**
 * Attempts to extract a unified diff string from the tool result.
 *
 * Checks rawOutput first (as string or stringified), then scans each
 * content[] entry. Returns null if no diff-like content is found.
 *
 * Tool-specific diff synthesis (e.g., EditFileTool's old_str/new_str
 * construction) should be handled by the caller after this function
 * returns null.
 */
export function extractDiff(result: ToolCallResult | undefined): string | null {
  if (!result) return null;

  // Check rawOutput
  if (result.rawOutput !== undefined) {
    const raw = result.rawOutput;
    const rawStr = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
    if (looksLikeDiff(rawStr)) return rawStr;
  }

  // Check content[] entries
  if (result.content) {
    for (const c of result.content) {
      const text = extractContentText(c);
      if (text && looksLikeDiff(text)) return text;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Metadata field extraction (Pattern C)
// ---------------------------------------------------------------------------

/**
 * Extracts a numeric field from rawOutput by checking a list of candidate
 * keys in order. Returns null if rawOutput is absent or none of the keys
 * are present with a numeric value.
 *
 * Usage:
 *   extractRawNumber(result, ['exit_code'])                     // BashTool
 *   extractRawNumber(result, ['count', 'matchCount', 'total'])  // GrepTool
 */
export function extractRawNumber(
  result: ToolCallResult | undefined,
  keys: string[],
): number | null {
  const raw = result?.rawOutput;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  for (const key of keys) {
    if (key in raw) {
      const val = raw[key];
      if (typeof val === 'number') return val;
    }
  }
  return null;
}

/**
 * Extracts a string field from rawOutput by checking a list of candidate
 * keys in order. Returns null if not found.
 */
export function extractRawString(
  result: ToolCallResult | undefined,
  keys: string[],
): string | null {
  const raw = result?.rawOutput;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  for (const key of keys) {
    if (key in raw) {
      const val = raw[key];
      if (typeof val === 'string') return val;
    }
  }
  return null;
}

/**
 * Extracts an array field from rawOutput by checking a list of candidate
 * keys in order. Returns an empty array if not found.
 *
 * Usage:
 *   extractRawArray<Record<string, unknown>>(result, ['results', 'links'])
 */
export function extractRawArray<T = unknown>(
  result: ToolCallResult | undefined,
  keys: string[],
): T[] {
  const raw = result?.rawOutput;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  for (const key of keys) {
    if (key in raw) {
      const val = raw[key];
      if (Array.isArray(val)) return val as T[];
    }
  }
  return [];
}
