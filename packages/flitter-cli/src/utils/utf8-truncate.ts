// UTF-8 safe string truncation.
//
// Truncates strings at byte boundaries without breaking multi-byte characters
// (emoji, CJK, combining marks, etc.). Uses TextEncoder/TextDecoder which are
// available in Bun/Node without polyfills.

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

/**
 * Return the UTF-8 byte length of a string.
 */
export function utf8ByteLength(str: string): number {
  return encoder.encode(str).byteLength;
}

/**
 * Truncate a string to at most `maxBytes` UTF-8 bytes without breaking
 * multi-byte characters.
 *
 * If the string already fits within `maxBytes` it is returned unchanged.
 * Otherwise the result is the longest prefix whose UTF-8 encoding does not
 * exceed `maxBytes`. Surrogate pairs and multi-byte sequences are never split.
 *
 * @param str - The input string.
 * @param maxBytes - Maximum number of UTF-8 bytes in the result.
 * @returns The (possibly truncated) string.
 */
export function utf8Truncate(str: string, maxBytes: number): string {
  if (maxBytes <= 0) return '';

  const encoded = encoder.encode(str);
  if (encoded.byteLength <= maxBytes) {
    return str;
  }

  // Slice to maxBytes, then decode with replacement to handle a split
  // multi-byte sequence at the boundary. We then re-encode to find out
  // if the decoded string fits; if the last character was a replacement
  // character produced by a split, we strip it.
  //
  // A more efficient approach: walk backwards from maxBytes to find a
  // valid UTF-8 continuation boundary.
  let end = maxBytes;

  // UTF-8 continuation bytes have the pattern 10xxxxxx (0x80..0xBF).
  // Walk back past any continuation bytes so we don't split a character.
  while (end > 0 && encoded[end]! >= 0x80 && encoded[end]! <= 0xBF) {
    end--;
  }

  // If we landed on a multi-byte leader, check that there are enough
  // continuation bytes to form a complete character. If not, skip
  // this leader byte too.
  if (end > 0) {
    const leadByte = encoded[end - 1]!;
    const expectedLen = _utf8CharLen(leadByte);
    if (expectedLen > 1) {
      // The leader is at (end - 1). The full character needs expectedLen bytes:
      // leader + (expectedLen - 1) continuation bytes. If our slice at `end`
      // does not include all of them, we must drop this partial character.
      const charStart = end - 1;
      if (charStart + expectedLen > maxBytes) {
        end = charStart;
      }
    }
  }

  // Decode the safe slice.
  const safeSlice = encoded.subarray(0, end);
  return decoder.decode(safeSlice);
}

/**
 * Return the expected byte length of a UTF-8 character given its leader byte.
 * Returns 1 for ASCII (0x00-0x7F) or unexpected continuation bytes.
 */
function _utf8CharLen(byte: number): number {
  if (byte < 0x80) return 1;        // 0xxxxxxx — ASCII
  if (byte < 0xC0) return 1;        // 10xxxxxx — continuation (shouldn't be a leader)
  if (byte < 0xE0) return 2;        // 110xxxxx
  if (byte < 0xF0) return 3;        // 1110xxxx
  return 4;                          // 11110xxx (4-byte sequence)
}
