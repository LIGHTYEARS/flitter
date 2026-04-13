/**
 * Approximate token counter -- no WASM dependencies (KD-29)
 * ASCII/Latin: chars / 4
 * CJK (Chinese/Japanese/Korean): chars / 2
 */

/** Check if a character code is CJK */
function isCJK(code: number): boolean {
  // CJK Unified Ideographs: 4E00-9FFF
  // CJK Extension A: 3400-4DBF
  // CJK Compatibility Ideographs: F900-FAFF
  // Hiragana: 3040-309F
  // Katakana: 30A0-30FF
  // Hangul Syllables: AC00-D7AF
  // CJK Symbols: 3000-303F
  return (code >= 0x4E00 && code <= 0x9FFF) ||
    (code >= 0x3400 && code <= 0x4DBF) ||
    (code >= 0xF900 && code <= 0xFAFF) ||
    (code >= 0x3040 && code <= 0x309F) ||
    (code >= 0x30A0 && code <= 0x30FF) ||
    (code >= 0xAC00 && code <= 0xD7AF) ||
    (code >= 0x3000 && code <= 0x303F);
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
export function countMessageTokens(message: any): number {
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
export function countThreadTokens(thread: { messages: any[] }): number {
  let total = 0;
  for (const msg of thread.messages) {
    total += countMessageTokens(msg);
  }
  return total;
}
