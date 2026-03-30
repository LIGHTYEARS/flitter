// Byte-accurate UTF-8 buffer slicing utilities

/**
 * Slice a Buffer to at most `maxBytes` bytes without splitting a multi-byte
 * UTF-8 character. Returns a sub-Buffer whose byte length is <= maxBytes and
 * which ends on a valid UTF-8 character boundary.
 *
 * UTF-8 encoding rules:
 *   0xxxxxxx  -- 1-byte character (ASCII), safe to cut after
 *   110xxxxx  -- first byte of 2-byte sequence
 *   1110xxxx  -- first byte of 3-byte sequence
 *   11110xxx  -- first byte of 4-byte sequence
 *   10xxxxxx  -- continuation byte (never a valid start)
 *
 * If the byte at position `maxBytes` is a continuation byte (10xxxxxx), we
 * walk backwards to find the leading byte of that sequence. If the full
 * character does not fit within `maxBytes`, we exclude it entirely.
 */
export function safeUtf8Slice(buf: Buffer, maxBytes: number): Buffer {
  if (maxBytes >= buf.byteLength) return buf;
  if (maxBytes <= 0) return Buffer.alloc(0);

  let end = maxBytes;

  // If the byte at position `end` is a continuation byte (10xxxxxx), the
  // character spanning that position was not fully included. Walk back to
  // the leading byte of the sequence.
  while (end > 0 && (buf[end] & 0xc0) === 0x80) {
    end--;
  }

  // `end` now points at a lead byte (or we've walked back to 0).
  // Determine the expected byte length of the character starting at `end`.
  if (end > 0 || (buf[0] & 0x80) === 0) {
    const lead = buf[end];
    let charLen: number;
    if ((lead & 0x80) === 0) {
      charLen = 1;          // ASCII: 0xxxxxxx
    } else if ((lead & 0xe0) === 0xc0) {
      charLen = 2;          // 2-byte: 110xxxxx
    } else if ((lead & 0xf0) === 0xe0) {
      charLen = 3;          // 3-byte: 1110xxxx
    } else if ((lead & 0xf8) === 0xf0) {
      charLen = 4;          // 4-byte: 11110xxx
    } else {
      // Invalid lead byte -- skip it entirely to avoid broken output.
      return buf.subarray(0, end);
    }

    // If the entire character fits within the original maxBytes, include it.
    if (end + charLen <= maxBytes) {
      return buf.subarray(0, end + charLen);
    }
  }

  // The character at `end` does not fully fit within maxBytes; exclude it.
  return buf.subarray(0, end);
}
