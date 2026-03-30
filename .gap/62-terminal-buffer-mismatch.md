# Gap P06 (#62): Terminal Output Buffer Byte/Character Mismatch

## Summary

The `appendOutput` closure inside `FlitterClient.createTerminal()` in
`packages/flitter-amp/src/acp/client.ts` uses `chunk.byteLength` to track
accumulated output size against the `outputByteLimit` parameter, but truncates
the decoded JavaScript string with `text.slice(0, remaining)`, which operates on
**UTF-16 code unit indices** (effectively character indices for all BMP
characters). For any multi-byte UTF-8 content -- CJK characters, emoji, accented
Latin characters, or even raw binary data misinterpreted as text -- the byte
count and character count diverge, producing incorrect truncation behavior.

## Affected Code

**File:** `packages/flitter-amp/src/acp/client.ts`
**Lines:** 143-155 (the `appendOutput` closure inside `createTerminal`)
**Interface:** lines 46-50 (`TerminalBuffer`)

```typescript
// Current buggy code (lines 143-155)
const appendOutput = (chunk: Buffer) => {
  if (buffer.limit !== null && buffer.byteCount >= buffer.limit) return;
  const text = chunk.toString();
  const bytes = chunk.byteLength;
  if (buffer.limit !== null && buffer.byteCount + bytes > buffer.limit) {
    const remaining = buffer.limit - buffer.byteCount;
    buffer.output += text.slice(0, remaining);   // BUG: character slice, not byte slice
    buffer.byteCount = buffer.limit;
  } else {
    buffer.output += text;
    buffer.byteCount += bytes;
  }
};
```

The `TerminalBuffer` interface stores both a decoded string and a byte counter:

```typescript
interface TerminalBuffer {
  output: string;
  byteCount: number;
  limit: number | null;
}
```

## Failure Modes

The mismatch between byte-domain arithmetic and character-domain slicing produces
four distinct failure categories:

### 1. Over-Inclusion (Exceeding the Byte Budget)

When `remaining` is computed in bytes but passed to `text.slice()` as a character
count, multi-byte characters occupy fewer character positions than byte
positions. A `remaining` value of 6 used as a character count on a string of CJK
characters (3 bytes each in UTF-8) takes 6 characters = 18 bytes, massively
overshooting the 6-byte budget. The buffer's `byteCount` is set to `limit`,
claiming compliance, while the actual stored string is three times the intended
size.

### 2. Under-Inclusion (Premature Cutoff)

Conversely, for mostly-ASCII text with multi-byte characters near the end, the
byte-valued `remaining` may be larger than the string's character count. If a
chunk decodes to 4 characters but is 8 bytes (due to multi-byte content),
`remaining` might be 6, causing `text.slice(0, 6)` to take all 4 characters --
which happens to be correct here only by coincidence. But if `remaining` is 3,
`text.slice(0, 3)` takes 3 characters that might represent anywhere from 3 to 12
bytes, with no predictable relationship to the byte budget.

### 3. Inaccurate `byteCount` Tracking

Even in the non-truncating branch (lines 152-153), the invariant
`byteCount === Buffer.byteLength(buffer.output, 'utf-8')` is never explicitly
maintained. The `byteCount` tracks raw `chunk.byteLength` sums while `output`
grows by decoded string concatenation. In the normal (non-truncating) case these
happen to stay in sync. But after a truncation event, `byteCount` is set to
`buffer.limit` while `buffer.output` may contain more or fewer actual bytes than
`limit` claims. This means subsequent chunks are incorrectly accepted or rejected
by the early-return guard on line 144.

### 4. Mid-Character Boundary Issues

When `remaining` falls in the middle of a multi-byte UTF-8 character sequence,
`text.slice()` on a JavaScript string cannot produce a broken character (since JS
strings are UTF-16), but the byte accounting is wrong regardless. The `byteCount`
claims `limit` bytes were consumed, while the actual string content either fully
includes or fully excludes the boundary character -- neither of which matches the
byte count.

## Root Cause Analysis

The fundamental error is mixing two incompatible measurement domains in a single
arithmetic expression:

```
remaining = buffer.limit - buffer.byteCount   // computed in BYTES (UTF-8)
text.slice(0, remaining)                       // consumed in CHARACTERS (UTF-16 code units)
```

In JavaScript/Node.js:
- `Buffer.byteLength` and `chunk.byteLength` measure UTF-8 byte counts
- `String.prototype.slice()` indexes by UTF-16 code units
- For ASCII (U+0000 to U+007F): 1 byte = 1 code unit (domains agree)
- For U+0080 to U+07FF: 2 bytes = 1 code unit (2x divergence)
- For U+0800 to U+FFFF (CJK, etc.): 3 bytes = 1 code unit (3x divergence)
- For U+10000+ (emoji, etc.): 4 bytes = 2 code units (surrogate pair)

The bug is latent for pure-ASCII workloads because the byte and character counts
are identical for ASCII. It manifests whenever terminal output includes non-ASCII
characters, which is common in internationalized environments, commands that
produce Unicode output, or even binary data that happens to pass through the
stdout/stderr pipe.

## Concrete Reproduction

### Scenario 1: CJK Output Overshoots Budget

```
outputByteLimit = 10

Chunk 1: Buffer.from("Hi \u4e16\u754c")
  Decoded: "Hi \u4e16\u754c" (5 characters)
  Bytes:   3 + 3 + 3 = 9 bytes  (actually: 'H'=1, 'i'=1, ' '=1, '\u4e16'=3, '\u754c'=3 = 9)
  byteCount + 9 = 9 <= 10  -->  else branch: byteCount = 9

Chunk 2: Buffer.from("\u4e16")
  Decoded: "\u4e16" (1 character)
  Bytes:   3
  byteCount + 3 = 12 > 10  -->  truncation branch
  remaining = 10 - 9 = 1
  text.slice(0, 1) = "\u4e16"  (1 character, but 3 bytes!)
  byteCount set to 10

RESULT: buffer.output = "Hi \u4e16\u754c\u4e16" = 12 bytes stored, byteCount claims 10.
```

### Scenario 2: Emoji Causes Surrogate Pair Confusion

```
outputByteLimit = 6

Chunk: Buffer.from("AB\ud83d\ude00CD")
  Decoded: "AB\ud83d\ude00CD" (5 characters, but 6 UTF-16 code units due to surrogate pair)
  Bytes:   1 + 1 + 4 + 1 + 1 = 8
  byteCount + 8 = 8 > 6  -->  truncation branch
  remaining = 6 - 0 = 6
  text.slice(0, 6) = "AB\ud83d\ude00CD"  (6 code units = all characters, 8 bytes!)
  byteCount set to 6

RESULT: buffer.output = "AB\ud83d\ude00CD" = 8 bytes stored, byteCount claims 6.
```

### Scenario 3: Under-Truncation with 2-Byte Characters

```
outputByteLimit = 4

Chunk: Buffer.from("\u00e9\u00e9\u00e9")  // e-acute, 2 bytes each in UTF-8
  Decoded: "\u00e9\u00e9\u00e9" (3 characters)
  Bytes:   6
  byteCount + 6 = 6 > 4  -->  truncation branch
  remaining = 4 - 0 = 4
  text.slice(0, 4) = "\u00e9\u00e9\u00e9"  (only 3 chars available, takes all 3 = 6 bytes)
  byteCount set to 4

RESULT: buffer.output is 6 bytes, byteCount claims 4.
```

## Protocol Context

The `outputByteLimit` parameter originates from the ACP `CreateTerminalRequest`
specification. It defines a **byte-denominated** cap on how much stdout/stderr
data the client should buffer before discarding further output. The
`terminalOutput` response (as noted in gap #59) includes a `truncated: boolean`
field that indicates whether the limit was reached. This makes byte-accurate
enforcement important -- if the buffer exceeds the limit while the `truncated`
flag is set, the agent may make incorrect decisions about how much output is
missing.

## Proposed Fix

### Strategy: Slice the Raw Buffer Before Decoding (Recommended)

Perform truncation on the raw `Buffer` object (which is byte-indexed by nature)
and only then decode the result to a UTF-8 string. This guarantees byte-accurate
limiting. However, naive byte slicing can split a multi-byte UTF-8 sequence in
the middle, which would produce a replacement character (U+FFFD) upon decoding.
To avoid that, we walk backwards from the slice point to find a valid UTF-8
character boundary and exclude any incomplete trailing character.

**Why this strategy over alternatives:**
- No double-encoding overhead (unlike encoding the decoded string back to
  measure its byte length)
- Zero overhead on the common non-truncating path
- O(1) overhead on the truncating path (at most 3 backward steps for UTF-8)
- Preserves the byte-domain semantics of `outputByteLimit` (unlike switching to
  character-based counting)
- Compatible with the ACP protocol expectation of byte-accurate budgets

### Alternative Rejected: Character-Based Counting

One could change `byteCount` and `limit` to track character counts so that
`text.slice()` is correct. This was rejected because:

1. The parameter is called `outputByteLimit` -- it is a **byte** budget specified
   by the agent protocol. Changing its semantics would break the ACP contract.
2. Byte-based limits are the correct abstraction for memory and transport
   budgets. A character-based limit would allow unbounded memory growth when the
   output is predominantly multi-byte (e.g., CJK text uses 3x the bytes).
3. The upstream ACP agent expects byte-accurate truncation.

## Solution Code

### New Helper: `safeUtf8Slice`

Add this function at module scope, above the `FlitterClient` class:

```typescript
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
function safeUtf8Slice(buf: Buffer, maxBytes: number): Buffer {
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
```

### Updated `appendOutput` Closure

Replace lines 143-155 in `createTerminal` with:

```typescript
const appendOutput = (chunk: Buffer) => {
  if (buffer.limit !== null && buffer.byteCount >= buffer.limit) return;

  const bytes = chunk.byteLength;

  if (buffer.limit !== null && buffer.byteCount + bytes > buffer.limit) {
    // Must truncate this chunk to stay within the byte budget.
    // Slice the raw buffer at a UTF-8-safe boundary, then decode.
    const remaining = buffer.limit - buffer.byteCount;
    const truncated = safeUtf8Slice(chunk, remaining);
    buffer.output += truncated.toString('utf-8');
    buffer.byteCount += truncated.byteLength;
  } else {
    buffer.output += chunk.toString('utf-8');
    buffer.byteCount += bytes;
  }
};
```

**Key changes from the original:**

1. **Line `buffer.output += text.slice(0, remaining)`** is replaced with
   `buffer.output += truncated.toString('utf-8')` where `truncated` is a
   byte-sliced buffer. This ensures truncation happens in the byte domain.

2. **Line `buffer.byteCount = buffer.limit`** is replaced with
   `buffer.byteCount += truncated.byteLength`. This is more accurate: if
   `safeUtf8Slice` backs up to exclude an incomplete character, the actual bytes
   consumed may be fewer than `remaining`. Setting `byteCount` to the precise
   value means a subsequent small chunk might still fit, which is the correct
   behavior. However, if exact limit-capping semantics are preferred (i.e., once
   truncation happens, no more data is accepted), the original
   `buffer.byteCount = buffer.limit` can be retained -- both are valid, but the
   precise approach wastes less budget.

### No Changes to `TerminalBuffer` Interface

```typescript
interface TerminalBuffer {
  output: string;
  byteCount: number;
  limit: number | null;
}
```

The interface is unchanged. The semantics of `byteCount` remain "total UTF-8
bytes consumed from chunks", and `limit` remains the byte-denominated cap.

### Full Patched `createTerminal` Method

For completeness, here is the entire method with the fix applied:

```typescript
async createTerminal(params: {
  command: string;
  args?: string[];
  cwd?: string | null;
  env?: Array<{ name: string; value: string }>;
  outputByteLimit?: number | null;
  sessionId: string;
}): Promise<{ terminalId: string }> {
  const terminalId = crypto.randomUUID();
  log.debug(`Agent creating terminal ${terminalId}: ${params.command} ${(params.args || []).join(' ')}`);

  const env = { ...process.env };
  if (params.env) {
    for (const { name, value } of params.env) {
      env[name] = value;
    }
  }

  const proc = spawn(params.command, params.args || [], {
    cwd: params.cwd || undefined,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  this.terminals.set(terminalId, proc);

  const buffer: TerminalBuffer = {
    output: '',
    byteCount: 0,
    limit: params.outputByteLimit ?? null,
  };
  this.terminalBuffers.set(terminalId, buffer);

  const appendOutput = (chunk: Buffer) => {
    if (buffer.limit !== null && buffer.byteCount >= buffer.limit) return;

    const bytes = chunk.byteLength;

    if (buffer.limit !== null && buffer.byteCount + bytes > buffer.limit) {
      const remaining = buffer.limit - buffer.byteCount;
      const truncated = safeUtf8Slice(chunk, remaining);
      buffer.output += truncated.toString('utf-8');
      buffer.byteCount += truncated.byteLength;
    } else {
      buffer.output += chunk.toString('utf-8');
      buffer.byteCount += bytes;
    }
  };

  proc.stdout?.on('data', appendOutput);
  proc.stderr?.on('data', appendOutput);

  return { terminalId };
}
```

## Testing Strategy

### Unit Tests for `safeUtf8Slice`

The helper function should be exported (or extracted to a utility module) for
direct unit testing:

```typescript
import { describe, it, expect } from 'vitest';

describe('safeUtf8Slice', () => {
  it('returns full buffer when maxBytes >= buffer length', () => {
    const buf = Buffer.from('hello');
    expect(safeUtf8Slice(buf, 10).toString()).toBe('hello');
    expect(safeUtf8Slice(buf, 5).toString()).toBe('hello');
  });

  it('truncates ASCII cleanly at any position', () => {
    const buf = Buffer.from('abcdef');
    expect(safeUtf8Slice(buf, 3).toString()).toBe('abc');
    expect(safeUtf8Slice(buf, 1).toString()).toBe('a');
  });

  it('does not split 2-byte UTF-8 characters (Latin Extended)', () => {
    // U+00E9 (e-acute) = 0xC3 0xA9 in UTF-8 = 2 bytes per character
    const buf = Buffer.from('\u00e9\u00e9\u00e9'); // 6 bytes total
    expect(safeUtf8Slice(buf, 1).toString()).toBe('');       // 1 byte: can't fit 2-byte char
    expect(safeUtf8Slice(buf, 2).toString()).toBe('\u00e9');  // exactly 2 bytes
    expect(safeUtf8Slice(buf, 3).toString()).toBe('\u00e9');  // 3 bytes: can't fit second
    expect(safeUtf8Slice(buf, 4).toString()).toBe('\u00e9\u00e9'); // exactly 4
  });

  it('does not split 3-byte UTF-8 characters (CJK)', () => {
    // U+4E16 (\u4e16) = 0xE4 0xB8 0x96 = 3 bytes
    // U+754C (\u754c) = 0xE7 0x95 0x8C = 3 bytes
    const buf = Buffer.from('\u4e16\u754c'); // 6 bytes
    expect(safeUtf8Slice(buf, 1).toString()).toBe('');       // can't fit 3-byte char
    expect(safeUtf8Slice(buf, 2).toString()).toBe('');       // still can't
    expect(safeUtf8Slice(buf, 3).toString()).toBe('\u4e16'); // exactly one char
    expect(safeUtf8Slice(buf, 4).toString()).toBe('\u4e16'); // 4 bytes: can't fit second
    expect(safeUtf8Slice(buf, 5).toString()).toBe('\u4e16'); // 5 bytes: still can't
    expect(safeUtf8Slice(buf, 6).toString()).toBe('\u4e16\u754c'); // exactly both
  });

  it('does not split 4-byte UTF-8 characters (emoji)', () => {
    // U+1F600 (grinning face) = 0xF0 0x9F 0x98 0x80 = 4 bytes
    const buf = Buffer.from('\ud83d\ude00hello'); // 4 + 5 = 9 bytes
    expect(safeUtf8Slice(buf, 1).toString()).toBe('');            // can't fit 4-byte char
    expect(safeUtf8Slice(buf, 3).toString()).toBe('');            // still can't
    expect(safeUtf8Slice(buf, 4).toString()).toBe('\ud83d\ude00'); // exactly fits
    expect(safeUtf8Slice(buf, 5).toString()).toBe('\ud83d\ude00h');
  });

  it('handles mixed ASCII and multi-byte correctly', () => {
    const buf = Buffer.from('ab\u4e16cd'); // 1+1+3+1+1 = 7 bytes
    expect(safeUtf8Slice(buf, 2).toString()).toBe('ab');
    expect(safeUtf8Slice(buf, 3).toString()).toBe('ab');       // can't fit \u4e16 at offset 2
    expect(safeUtf8Slice(buf, 4).toString()).toBe('ab');       // still can't (need 3 more)
    expect(safeUtf8Slice(buf, 5).toString()).toBe('ab\u4e16');
    expect(safeUtf8Slice(buf, 6).toString()).toBe('ab\u4e16c');
    expect(safeUtf8Slice(buf, 7).toString()).toBe('ab\u4e16cd');
  });

  it('handles empty buffer', () => {
    expect(safeUtf8Slice(Buffer.alloc(0), 5).toString()).toBe('');
  });

  it('handles maxBytes = 0', () => {
    expect(safeUtf8Slice(Buffer.from('hello'), 0).toString()).toBe('');
  });

  it('handles maxBytes = 1 with multi-byte first character', () => {
    const buf = Buffer.from('\u4e16'); // 3 bytes
    expect(safeUtf8Slice(buf, 1).toString()).toBe('');
  });

  it('handles consecutive emoji', () => {
    // Two emoji: 4 + 4 = 8 bytes
    const buf = Buffer.from('\ud83d\ude00\ud83d\ude01');
    expect(safeUtf8Slice(buf, 4).toString()).toBe('\ud83d\ude00');
    expect(safeUtf8Slice(buf, 7).toString()).toBe('\ud83d\ude00');  // can't fit second
    expect(safeUtf8Slice(buf, 8).toString()).toBe('\ud83d\ude00\ud83d\ude01');
  });
});
```

### Integration Tests for Buffer Limiting with Multi-Byte Output

```typescript
describe('createTerminal byte limiting with multi-byte content', () => {
  it('respects byte limit with CJK output', async () => {
    const client = new FlitterClient(mockCallbacks);
    const { terminalId } = await client.createTerminal({
      command: 'printf',
      args: ['\\xe4\\xb8\\x96\\xe7\\x95\\x8c\\x0a'],  // "\u4e16\u754c\n" = 7 bytes
      outputByteLimit: 4,
      sessionId: 'test',
    });

    await client.waitForTerminalExit({ terminalId, sessionId: 'test' });
    const result = await client.terminalOutput({ terminalId, sessionId: 'test' });

    // \u4e16 is 3 bytes, \u754c is 3 bytes. Only the first fits in 4 bytes.
    const actualBytes = Buffer.byteLength(result.terminal.output, 'utf-8');
    expect(actualBytes).toBeLessThanOrEqual(4);
    expect(result.terminal.output).toBe('\u4e16');  // 3 bytes
  });

  it('byteCount accurately reflects stored bytes after truncation', async () => {
    // This test verifies the fix for the core mismatch: after truncation,
    // byteCount should equal Buffer.byteLength(buffer.output, 'utf-8').
    const client = new FlitterClient(mockCallbacks);
    const { terminalId } = await client.createTerminal({
      command: 'printf',
      args: ['Hello \\xe4\\xb8\\x96\\xe7\\x95\\x8c'],  // "Hello \u4e16\u754c" = 11 bytes
      outputByteLimit: 8,
      sessionId: 'test',
    });

    await client.waitForTerminalExit({ terminalId, sessionId: 'test' });
    const result = await client.terminalOutput({ terminalId, sessionId: 'test' });

    // "Hello " = 6 bytes, "\u4e16" = 3 bytes (total 9 > 8), so only "Hello " + part
    // But 6 + 3 = 9 > 8, so \u4e16 is excluded. Output should be "Hello " (6 bytes).
    // Wait -- the entire chunk arrives at once. bytes = 11, 0 + 11 > 8.
    // remaining = 8. safeUtf8Slice(chunk, 8) will include "Hello \u4e16" (6+3=9 > 8),
    // so it backs up and returns "Hello " (6 bytes).
    const actualBytes = Buffer.byteLength(result.terminal.output, 'utf-8');
    expect(actualBytes).toBeLessThanOrEqual(8);
  });

  it('pure ASCII still works identically', async () => {
    const client = new FlitterClient(mockCallbacks);
    const { terminalId } = await client.createTerminal({
      command: 'printf',
      args: ['Hello World!'],  // 12 bytes, all ASCII
      outputByteLimit: 5,
      sessionId: 'test',
    });

    await client.waitForTerminalExit({ terminalId, sessionId: 'test' });
    const result = await client.terminalOutput({ terminalId, sessionId: 'test' });

    expect(result.terminal.output).toBe('Hello');
    expect(Buffer.byteLength(result.terminal.output, 'utf-8')).toBe(5);
  });

  it('no truncation when limit is null', async () => {
    const client = new FlitterClient(mockCallbacks);
    const { terminalId } = await client.createTerminal({
      command: 'printf',
      args: ['\\xe4\\xb8\\x96\\xe7\\x95\\x8c'],
      outputByteLimit: null,
      sessionId: 'test',
    });

    await client.waitForTerminalExit({ terminalId, sessionId: 'test' });
    const result = await client.terminalOutput({ terminalId, sessionId: 'test' });

    expect(result.terminal.output).toBe('\u4e16\u754c');
  });
});
```

## Edge Cases

| Scenario | Old Behavior | New Behavior |
|----------|-------------|-------------|
| Pure ASCII output | Correct (1 byte = 1 char) | Correct (no change) |
| CJK text at truncation boundary | `text.slice()` uses byte count as char index, overshoots byte budget | `safeUtf8Slice` backs up to exclude the incomplete character |
| Emoji at boundary (4-byte UTF-8) | `text.slice(0, remaining)` may include entire emoji despite `remaining < 4` | `safeUtf8Slice` excludes the emoji if it does not fully fit |
| 2-byte Latin Extended at boundary | Character index/byte index disagree by 2x factor | `safeUtf8Slice` correctly handles 2-byte boundary |
| Empty chunk | No-op (early return before any calculation) | No-op (unchanged) |
| Chunk arrives after limit reached | Early return on line 144 (correct) | Early return (unchanged) |
| `outputByteLimit` is `null` | No truncation (correct) | No truncation (unchanged) |
| `remaining` is 0 | `text.slice(0, 0)` returns `""` (coincidentally correct) | `safeUtf8Slice` returns empty buffer (correct) |
| Invalid UTF-8 in raw output (binary) | `toString()` replaces with U+FFFD | Same -- `safeUtf8Slice` operates on raw bytes, then decode handles replacement characters |
| Multiple chunks crossing boundary | byteCount drifts from actual string bytes | byteCount stays accurate after each chunk |
| `remaining = 1` with multi-byte first char | `text.slice(0, 1)` takes the full character (wrong byte count) | `safeUtf8Slice` returns empty (1 byte insufficient for multi-byte char) |

## Interaction with Gap #59 (ACP Type Safety)

Gap #59 proposes restructuring `terminalOutput` to return a flat shape with a
`truncated: boolean` field. The `truncated` flag is computed as:

```typescript
const truncated = buffer.limit !== null && buffer.byteCount >= buffer.limit;
```

With the current bug, `byteCount` may be set to `limit` even when the actual
stored bytes exceed it (or vice versa), making the `truncated` flag unreliable.
This fix ensures that `byteCount` accurately reflects reality, so the
`truncated` flag will be correct. The two fixes are independent but
complementary -- gap #59 fixes the response shape, gap #62 fixes the byte
accounting.

## Implementation Note: `byteCount` After Truncation

There is a design choice in the truncation branch regarding what value
`byteCount` should hold after truncation:

**Option A (conservative):** Set `byteCount = buffer.limit` to guarantee no more
data is accepted, even if `safeUtf8Slice` backed up and consumed fewer bytes than
`remaining`. This matches the original intent and is simpler.

**Option B (precise):** Set `byteCount += truncated.byteLength` to reflect the
exact bytes consumed. This allows a subsequent small chunk to fill the remaining
gap (e.g., if `remaining` was 5 and `safeUtf8Slice` backed up to 3, there are
still 2 bytes of budget left for the next ASCII-only chunk).

The solution code above uses **Option B** for maximum accuracy. Either option is
valid; the choice depends on whether "truncation happened" should be a permanent
gate or whether the system should opportunistically fill remaining budget.
If Option A is preferred, replace `buffer.byteCount += truncated.byteLength` with
`buffer.byteCount = buffer.limit`.

## Risk Assessment

- **Low risk**: The change is confined to a single closure and a new pure helper
  function with no side effects.
- **No API changes**: The `TerminalBuffer` interface, `createTerminal` method
  signature, and `terminalOutput` response shape are all unchanged.
- **Backward compatible**: For pure-ASCII workloads (the vast majority of
  terminal output in practice), behavior is identical. The fix only alters
  behavior when multi-byte characters appear near the truncation boundary.
- **Performance**: `safeUtf8Slice` does at most 3 backward steps (the maximum
  number of continuation bytes in a UTF-8 sequence is 3), so it is O(1) per
  truncation event. The fast path (no truncation needed) adds zero overhead --
  the only new work is in the truncation branch, which is already the slow path.
- **No new dependencies**: Uses only `Buffer.subarray()` and `Buffer.alloc()`,
  both part of Node.js core.

## Files to Modify

| File | Change |
|------|--------|
| `packages/flitter-amp/src/acp/client.ts` | Add `safeUtf8Slice` helper function at module scope; replace the body of the `appendOutput` closure (lines 143-155) with byte-safe truncation logic |

No other files need modification. If `safeUtf8Slice` should be reusable, it
could be extracted to a utility module (e.g., `packages/flitter-amp/src/utils/buffer.ts`),
but given that it is only used in one place, keeping it file-local is simpler.
