/**
 * System prompt resolution utility.
 *
 * Resolves --system-prompt value: tries reading as file path first,
 * falls back to treating the value as raw text.
 *
 * 逆向: R3R() in 1983_unknown_R3R.js — amp checks sp/systemPrompt CLI options.
 * amp's sp option accepts "Custom system prompt text or file path" (chunk-006.js:38270-38271).
 * Flitter follows the same strategy: file path first, raw text fallback.
 */

import fs from "node:fs/promises";

/**
 * Resolve a system prompt value to its text content.
 *
 * Strategy (matching amp's dual-purpose sp flag):
 * 1. If the value looks like it could be a file path and exists, read it
 * 2. Otherwise, use the value as raw prompt text
 *
 * @param value - CLI --system-prompt value (file path or raw text)
 * @returns Resolved system prompt text
 */
export async function resolveSystemPromptText(value: string): Promise<string> {
  // Try reading as file path first
  try {
    const content = await fs.readFile(value, "utf-8");
    return content;
  } catch {
    // Not a readable file — treat as raw text
    return value;
  }
}
