/**
 * Approximate token counter -- no WASM dependencies (KD-29)
 * ASCII/Latin: chars / 4
 * CJK (Chinese/Japanese/Korean): chars / 2
 */
import type { ThreadMessage } from "@flitter/schemas";

/** Check if a character code is CJK */
function isCJK(code: number): boolean {
  // CJK Unified Ideographs: 4E00-9FFF
  // CJK Extension A: 3400-4DBF
  // CJK Compatibility Ideographs: F900-FAFF
  // Hiragana: 3040-309F
  // Katakana: 30A0-30FF
  // Hangul Syllables: AC00-D7AF
  // CJK Symbols: 3000-303F
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x3040 && code <= 0x309f) ||
    (code >= 0x30a0 && code <= 0x30ff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0x3000 && code <= 0x303f)
  );
}

export function countTokensApprox(text: string): number {
  let asciiChars = 0;
  let cjkChars = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (isCJK(code)) {
      cjkChars++;
    } else {
      asciiChars++;
    }
  }
  return Math.ceil(asciiChars / 4) + Math.ceil(cjkChars / 2);
}

/** Count tokens for a single message */
export function countMessageTokens(
  message: ThreadMessage | { role: string; content?: unknown },
): number {
  if (!message.content || !Array.isArray(message.content)) return 0;
  let total = 0;
  for (const block of message.content) {
    if (block.type === "text" && typeof block.text === "string") {
      total += countTokensApprox(block.text);
    } else if (block.type === "tool_use") {
      // Count the tool input as JSON
      total += countTokensApprox(JSON.stringify(block.input ?? {}));
      total += countTokensApprox(block.name ?? "");
    } else if (block.type === "tool_result") {
      if (typeof block.content === "string") {
        total += countTokensApprox(block.content);
      } else if (Array.isArray(block.content)) {
        for (const sub of block.content) {
          if (sub.type === "text" && typeof sub.text === "string") {
            total += countTokensApprox(sub.text);
          }
        }
      }
    } else if (block.type === "summary") {
      total += countTokensApprox(block.summary?.summary ?? "");
    }
  }
  // Add overhead for role, structure
  total += 4; // per-message overhead
  return total;
}

/** Count tokens for entire thread */
export function countThreadTokens(thread: {
  messages: (ThreadMessage | { role: string; content?: unknown })[];
}): number {
  let total = 0;
  for (const msg of thread.messages) {
    total += countMessageTokens(msg);
  }
  return total;
}
