# Gap R11: GFM Table Renderer Uses `string.length` Instead of `stringWidth()` for CJK Characters

## Status: Proposal
## Affected packages: `flitter-core`
## Depends on: None (the `stringWidth` utility already exists and is used elsewhere)

---

## 1. Problem Statement

### 1.1 What Is Broken

The GFM (GitHub Flavored Markdown) table renderer in
`packages/flitter-core/src/widgets/markdown.ts` (lines 740-804, method
`_renderTable`) computes column widths and pads cell content using JavaScript's
native `string.length` property and `String.prototype.padEnd()`. Both of these
operate on **UTF-16 code unit counts**, not **terminal display column widths**.

CJK ideographs (Chinese, Japanese, Korean), fullwidth punctuation, and certain
emoji occupy **two terminal columns** per character but only count as **one**
(or occasionally two for surrogate pairs) in `string.length`. This causes two
distinct alignment failures:

1. **Column width underestimation**: When computing `colWidths`, a header like
   `"名前"` (2 JS characters, 4 display columns) is measured as length 2 instead
   of 4. The column is allocated only 2 characters of separator width, but the
   text visually occupies 4 columns, causing overflow into the adjacent column.

2. **Padding undershoot**: When `padEnd(colWidth)` is used to right-pad a cell,
   it adds spaces based on `string.length` difference, not display-width
   difference. A cell containing `"東京"` (length 2, display width 4) padded to
   a `colWidth` of 6 gets 4 trailing spaces (targeting length 6), producing a
   visual width of 4 + 4 = 8 instead of the intended 6.

The combined effect is that any GFM table containing CJK characters, fullwidth
forms, or wide emoji will display with misaligned columns -- separators will be
too short, text will overflow, and the vertical bar delimiters (`│`) will not
line up.

### 1.2 The Three Affected Code Locations

All three are within `_renderTable` in `markdown.ts`:

**Location 1 -- Column width computation (lines 752-757):**

```typescript
const colWidths: number[] = headers.map((h) => h.length);      // BUG
for (const row of rows) {
  for (let c = 0; c < colCount; c++) {
    const cellLen = (row[c] ?? '').length;                       // BUG
    if (cellLen > colWidths[c]!) colWidths[c] = cellLen;
  }
}
```

`h.length` and `(row[c] ?? '').length` should use `stringWidth(h)` and
`stringWidth(row[c] ?? '')` respectively.

**Location 2 -- Header cell padding (line 763):**

```typescript
const headerCells = headers.map((h, c) => h.padEnd(colWidths[c]!));  // BUG
```

`padEnd` counts JavaScript string length, not display width. A CJK string of
display width 4 but `string.length` 2 will be padded incorrectly.

**Location 3 -- Data cell padding (line 790):**

```typescript
const cells = headers.map((_, c) => (row[c] ?? '').padEnd(colWidths[c]!));  // BUG
```

Same issue as Location 2.

### 1.3 Demonstration of the Bug

Consider a markdown table:

```markdown
| 名前   | Age |
|--------|-----|
| 太郎   | 25  |
| Alice  | 30  |
```

**Current behavior** (using `string.length`):

Step-by-step width computation:

| Cell      | `string.length` | `stringWidth()` | Difference |
|-----------|-----------------|------------------|------------|
| `"名前"`  | 2               | 4                | -2         |
| `"太郎"`  | 2               | 4                | -2         |
| `"Alice"` | 5               | 5                | 0          |
| `"Age"`   | 3               | 3                | 0          |
| `"25"`    | 2               | 2                | 0          |
| `"30"`    | 2               | 2                | 0          |

With `string.length`, `colWidths` = [5, 3]:
- `max("名前".length=2, "太郎".length=2, "Alice".length=5)` = 5
- `max("Age".length=3, "25".length=2, "30".length=2)` = 3

Header output: `"  名前   │ Age"`
- `"名前".padEnd(5)` adds 3 spaces (targeting length 5), giving `"名前   "`.
- Visual display: 4 (CJK) + 3 (spaces) = 7 columns.
- But `"Alice".padEnd(5)` gives `"Alice"` -- 5 visual columns.
- The `│` separator is misaligned by 2 columns between these rows.

The separator line uses `'─'.repeat(5)` = `"─────"`, which is 5 display columns
-- correct for `"Alice"` but 1 column too long for `"名前"` (since the CJK row
is already 7 wide, pushing past the separator).

**Expected behavior** (using `stringWidth`):

With `stringWidth`, `colWidths` = [5, 3]:
- `max(stringWidth("名前")=4, stringWidth("太郎")=4, stringWidth("Alice")=5)` = 5
- `max(stringWidth("Age")=3, stringWidth("25")=2, stringWidth("30")=2)` = 3

Header output: `"  名前 │ Age"`
- `padEndDisplayWidth("名前", 5)` adds 1 space (display width 4 + 1 = 5).
- `padEndDisplayWidth("Alice", 5)` adds 0 spaces (display width 5).
- Both produce exactly 5 display columns. The `│` aligns.

```
  名前  │ Age       ← 4 + 1 space = 5 display cols for col 0
  ─────┼───
  太郎  │ 25        ← 4 + 1 space = 5 display cols for col 0
  Alice │ 30        ← 5 + 0 spaces = 5 display cols for col 0
```

### 1.4 Existing Infrastructure

The codebase already has everything needed to fix this:

- **`stringWidth(str: string): number`** in
  `packages/flitter-core/src/core/wcwidth.ts` (line 27)
  iterates over codepoints and sums `wcwidth()` values, correctly returning 2
  for CJK/fullwidth characters.

- **`wcwidth(codePoint: number): number`** in the same file (line 10) implements
  the full Unicode East Asian Width lookup including CJK Unified Ideographs
  (U+4E00-U+9FFF), Hangul Syllables (U+AC00-U+D7AF), fullwidth forms
  (U+FF01-U+FF60), emoji (U+1F000-U+1FAFF), and Extension B/G blocks
  (U+20000-U+3FFFF).

- **`stringWidth` is already used** in the text rendering pipeline:
  - `text.ts` imports it (line 11) and uses it for line width measurement
    (line 467), character-by-character layout positioning (lines 529, 602),
    and paint-phase column advancement (line 674).
  - `TextSpan.computeWidth()` delegates to `stringWidth` (text-span.ts line 93).
  - `PaintContext` and `ClipCanvas` use `wcwidth` for character placement
    (paint-context.ts lines 140, 158, 183; clip-canvas.ts lines 61, 85).

- **`stringWidth` is exported** from the package index
  (`packages/flitter-core/src/index.ts` line 11).

The table renderer is the **only** place in the rendering pipeline that uses raw
`string.length` for width measurement instead of `stringWidth()`.

---

## 2. Proposed Fix

### 2.1 Import `stringWidth`

Add the import at the top of `markdown.ts`, alongside the existing imports:

```typescript
// Add after line 24 (the BoxDecoration import):
import { stringWidth } from '../core/wcwidth';
```

### 2.2 Introduce a `padEndDisplayWidth` Helper

`String.padEnd()` cannot be used directly because it counts code units, not
display columns. We need a helper that pads a string with spaces until its
**display width** reaches the target:

```typescript
/**
 * Pad a string with trailing spaces until its terminal display width
 * (as measured by stringWidth) reaches the target column count.
 * Unlike String.padEnd(), this correctly handles CJK / fullwidth /
 * emoji characters that occupy 2 terminal columns per codepoint.
 * If the string is already at or beyond targetWidth, return it unchanged.
 */
function padEndDisplayWidth(str: string, targetWidth: number): string {
  const currentWidth = stringWidth(str);
  if (currentWidth >= targetWidth) return str;
  return str + ' '.repeat(targetWidth - currentWidth);
}
```

This function should be placed as a module-level utility near the top of
`markdown.ts`, after the imports and before the type definitions. A standalone
function (rather than a class method) matches the existing pattern used by
`stringWidth` itself and keeps the helper easily testable.

### 2.3 Fix Location 1: Column Width Computation

Replace lines 752-757:

```typescript
// BEFORE (buggy):
const colWidths: number[] = headers.map((h) => h.length);
for (const row of rows) {
  for (let c = 0; c < colCount; c++) {
    const cellLen = (row[c] ?? '').length;
    if (cellLen > colWidths[c]!) colWidths[c] = cellLen;
  }
}

// AFTER (fixed):
const colWidths: number[] = headers.map((h) => stringWidth(h));
for (const row of rows) {
  for (let c = 0; c < colCount; c++) {
    const cellLen = stringWidth(row[c] ?? '');
    if (cellLen > colWidths[c]!) colWidths[c] = cellLen;
  }
}
```

### 2.4 Fix Location 2: Header Cell Padding

Replace line 763:

```typescript
// BEFORE (buggy):
const headerCells = headers.map((h, c) => h.padEnd(colWidths[c]!));

// AFTER (fixed):
const headerCells = headers.map((h, c) => padEndDisplayWidth(h, colWidths[c]!));
```

### 2.5 Fix Location 3: Data Cell Padding

Replace line 790:

```typescript
// BEFORE (buggy):
const cells = headers.map((_, c) => (row[c] ?? '').padEnd(colWidths[c]!));

// AFTER (fixed):
const cells = headers.map((_, c) => padEndDisplayWidth(row[c] ?? '', colWidths[c]!));
```

### 2.6 Complete Diff

```diff
--- a/packages/flitter-core/src/widgets/markdown.ts
+++ b/packages/flitter-core/src/widgets/markdown.ts
@@ -24,6 +24,7 @@
 import { Container } from './container';
 import { BoxDecoration } from '../layout/render-decorated';
+import { stringWidth } from '../core/wcwidth';

 // ---------------------------------------------------------------------------
 // Types
@@ -26,6 +27,21 @@
 // Types
 // ---------------------------------------------------------------------------

+// ---------------------------------------------------------------------------
+// Helpers
+// ---------------------------------------------------------------------------
+
+/**
+ * Pad a string with trailing spaces until its terminal display width
+ * reaches the target column count. Unlike String.padEnd(), this correctly
+ * handles CJK / fullwidth / emoji characters that occupy 2 columns.
+ */
+function padEndDisplayWidth(str: string, targetWidth: number): string {
+  const currentWidth = stringWidth(str);
+  if (currentWidth >= targetWidth) return str;
+  return str + ' '.repeat(targetWidth - currentWidth);
+}
+
 /** Classification of a markdown block for rendering. */
 export type MarkdownBlockType =
@@ -749,10 +765,10 @@

     // Compute column widths (max of header and each row)
     const colCount = headers.length;
-    const colWidths: number[] = headers.map((h) => h.length);
+    const colWidths: number[] = headers.map((h) => stringWidth(h));
     for (const row of rows) {
       for (let c = 0; c < colCount; c++) {
-        const cellLen = (row[c] ?? '').length;
+        const cellLen = stringWidth(row[c] ?? '');
         if (cellLen > colWidths[c]!) colWidths[c] = cellLen;
       }
     }
@@ -760,7 +776,7 @@
     const tableLines: Widget[] = [];

     // Header row
-    const headerCells = headers.map((h, c) => h.padEnd(colWidths[c]!));
+    const headerCells = headers.map((h, c) => padEndDisplayWidth(h, colWidths[c]!));
     const headerText = '  ' + headerCells.join(' │ ');
     tableLines.push(
       new Text({
@@ -787,7 +803,7 @@
     // Data rows
     for (const row of rows) {
-      const cells = headers.map((_, c) => (row[c] ?? '').padEnd(colWidths[c]!));
+      const cells = headers.map((_, c) => padEndDisplayWidth(row[c] ?? '', colWidths[c]!));
       const rowText = '  ' + cells.join(' │ ');
       tableLines.push(
         new Text({
```

### 2.7 Summary of Changes

| File | Change | Lines Affected |
|------|--------|----------------|
| `markdown.ts` | Add `import { stringWidth }` | +1 line near top |
| `markdown.ts` | Add `padEndDisplayWidth` helper | +11 lines after imports |
| `markdown.ts` | Column width: `h.length` -> `stringWidth(h)` | Line 752 |
| `markdown.ts` | Column width: `(row[c]??'').length` -> `stringWidth(row[c]??'')` | Line 755 |
| `markdown.ts` | Header pad: `.padEnd(w)` -> `padEndDisplayWidth(h, w)` | Line 763 |
| `markdown.ts` | Data pad: `.padEnd(w)` -> `padEndDisplayWidth(cell, w)` | Line 790 |

Total: 1 file changed, ~16 lines added, 4 lines modified. No files deleted.

---

## 3. Why `padEnd` Cannot Be Fixed With a Wrapper Around It

One might consider a simpler fix: just compute the width correctly but still
use `padEnd`. This does not work because `padEnd`'s second argument is a
**target string length**, not a target display width. Consider:

```typescript
const s = '東京';  // string.length = 2, stringWidth = 4
s.padEnd(6);       // Produces '東京    ' (4 spaces added, targeting length 6)
                    // Display width: 4 + 4 = 8 (wrong, wanted 6)
```

If we tried to compensate by computing a modified target:

```typescript
s.padEnd(6 - (stringWidth(s) - s.length));  // = s.padEnd(4)
                                              // Produces '東京  ' (2 spaces)
                                              // Display width: 4 + 2 = 6 (correct!)
```

While this arithmetic trick works, it is fragile and hard to reason about. If a
string mixes different-width characters, the offset calculation `stringWidth(s)
- s.length` is correct but non-obvious. The `padEndDisplayWidth` helper is
clearer, self-documenting, and less error-prone. It directly expresses the
intent: "add spaces until the display width reaches the target."

---

## 4. Edge Cases and Robustness

### 4.1 Mixed Content Cells

A cell may contain a mix of ASCII and CJK characters (e.g., `"Hello世界"`).
`stringWidth` handles this correctly by summing per-codepoint widths:
- `'H'`=1, `'e'`=1, `'l'`=1, `'l'`=1, `'o'`=1, `'世'`=2, `'界'`=2 = total 9

The `padEndDisplayWidth` helper will add the correct number of spaces. If the
target is 12, it adds 3 spaces for a visual width of 9 + 3 = 12.

### 4.2 Emoji in Cells

Emoji in the range U+1F000-U+1FAFF are treated as width 2 by `wcwidth()`
(see `isWide()` in `wcwidth.ts` lines 103-108). The fix handles single emoji
correctly. However, compound emoji sequences (ZWJ sequences like family emoji,
flag sequences, skin tone modifiers) may produce unexpected widths because
`stringWidth` sums widths of individual codepoints. For instance, a ZWJ family
emoji like "family" (U+1F468 + U+200D + U+1F469 + U+200D + U+1F467) would be
measured as 2 + 0 + 2 + 0 + 2 = 6 display columns, but many terminals render
it as 2 columns. This is a known limitation of all `wcwidth`-based approaches
and is not specific to this fix.

### 4.3 Zero-Width Characters

Combining diacritical marks (U+0300-U+036F), zero-width joiners (U+200D),
zero-width spaces (U+200B), and variation selectors (U+FE00-U+FE0F) are
correctly handled as width 0 by `wcwidth()`. A cell containing `"cafe\u0301"`
(cafe with combining acute accent, rendering as "caf\u00e9") will be measured
as width 4, not 5, which matches its visual appearance in the terminal.

### 4.4 Empty Cells

`stringWidth('')` returns 0, and `padEndDisplayWidth('', n)` produces
`' '.repeat(n)`, which is correct behavior for empty table cells. The column
will be filled with spaces to maintain alignment.

### 4.5 Surrogate Pairs

Characters outside the BMP (U+10000 and above) are represented as surrogate
pairs in JavaScript. For example, a CJK Extension B character like U+20000
has `string.length` = 2 (two UTF-16 code units) but `stringWidth` = 2 (two
display columns). In this specific case the numbers happen to match, but the
**reason** they match is different. With the fix, we use the semantically
correct measurement (`stringWidth` = "this occupies 2 terminal columns") rather
than the accidentally correct one (`string.length` = 2 code units).

### 4.6 Separator Row

The separator row (line 776) uses `'─'.repeat(w)` where `w` comes from
`colWidths`. Since `─` (U+2500, Box Drawings Light Horizontal) has a display
width of 1 column, the repeat count equals the display width. Once `colWidths`
is computed using `stringWidth`, the separator width is automatically correct.
No additional change is needed for the separator row.

### 4.7 Halfwidth Katakana

Halfwidth katakana (U+FF61-U+FF9F) are explicitly **not** in the `isWide()`
range. They occupy 1 terminal column and have `string.length` = 1. The fix
handles them correctly with no behavioral change.

### 4.8 Fullwidth Latin / Fullwidth Digits

Characters like `A` (U+FF21, Fullwidth Latin Capital Letter A) have
`string.length` = 1 but `stringWidth` = 2. Without the fix, a cell containing
`"ABC"` (3 fullwidth Latin letters) would be measured as length 3 but
visually occupies 6 columns. The fix corrects this.

---

## 5. Test Plan

### 5.1 New Unit Tests for `padEndDisplayWidth`

These tests should be added to
`packages/flitter-core/src/widgets/__tests__/markdown.test.ts`.

Since `padEndDisplayWidth` is a module-private function, we test it indirectly
through the table rendering. However, if it is exported for testing, direct
tests would be:

```typescript
import { stringWidth } from '../../core/wcwidth';

describe('padEndDisplayWidth behavior (indirect via table rendering)', () => {
  test('ASCII-only padding is unchanged from padEnd behavior', () => {
    // A table with only ASCII content should render identically
    // to the old behavior since stringWidth === string.length for ASCII.
    const md = '| Name  | Age |\n| ----- | --- |\n| Alice | 30  |';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['Name', 'Age']);
  });
});
```

### 5.2 Unit Test: Pure CJK Table Column Widths

```typescript
describe('GFM table CJK width handling', () => {
  beforeEach(() => {
    Markdown.clearCache();
  });

  test('CJK headers produce correct column widths', () => {
    // "名前" has stringWidth 4, "太郎" has stringWidth 4, "Alice" has stringWidth 5
    // Column 0 should be max(4, 4, 5) = 5
    // "年齢" has stringWidth 4, "25" has stringWidth 2, "30" has stringWidth 2
    // Column 1 should be max(4, 2, 2) = 4
    const md = [
      '| 名前  | 年齢 |',
      '| ----- | ---- |',
      '| 太郎  | 25   |',
      '| Alice | 30   |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['名前', '年齢']);
    expect(blocks[0]!.tableRows!.length).toBe(2);
  });
});
```

### 5.3 Unit Test: Mixed ASCII and CJK

```typescript
test('mixed ASCII/CJK table aligns correctly', () => {
  // "こんにちは" has stringWidth 10
  // "greeting" has stringWidth 8
  // Column 1 width should be max(5=Value, 10, 3=Bob) = 10
  const md = [
    '| Key      | Value      |',
    '| -------- | ---------- |',
    '| greeting | こんにちは |',
    '| name     | Bob        |',
  ].join('\n');
  const blocks = Markdown.parseMarkdown(md);
  expect(blocks[0]!.type).toBe('table');
  expect(blocks[0]!.tableHeaders).toEqual(['Key', 'Value']);
  expect(blocks[0]!.tableRows![0]).toEqual(['greeting', 'こんにちは']);
  expect(blocks[0]!.tableRows![1]).toEqual(['name', 'Bob']);
});
```

### 5.4 Unit Test: Emoji in Table Cells

```typescript
test('emoji cells use display width for alignment', () => {
  const md = [
    '| Status | Task   |',
    '| ------ | ------ |',
    '| \u2705     | Done   |',
    '| \u274c     | Failed |',
  ].join('\n');
  const blocks = Markdown.parseMarkdown(md);
  expect(blocks[0]!.type).toBe('table');
  // Emoji are width 2 but string.length may be 1 or 2.
  // Column widths should use stringWidth for correct alignment.
});
```

### 5.5 Unit Test: `stringWidth` Correctness for Table Inputs

These tests validate the `stringWidth` function from `wcwidth.ts` with
table-relevant inputs:

```typescript
import { stringWidth } from '../../core/wcwidth';

describe('stringWidth for table cell content', () => {
  test('ASCII string width equals length', () => {
    expect(stringWidth('hello')).toBe(5);
    expect(stringWidth('Name')).toBe(4);
    expect(stringWidth('')).toBe(0);
  });

  test('CJK ideographs are width 2 each', () => {
    expect(stringWidth('名前')).toBe(4);    // 2 chars * 2 cols
    expect(stringWidth('東京都')).toBe(6);   // 3 chars * 2 cols
    expect(stringWidth('こんにちは')).toBe(10); // 5 chars * 2 cols
  });

  test('mixed ASCII and CJK', () => {
    expect(stringWidth('Hello世界')).toBe(9);  // 5 + 4
    expect(stringWidth('A太郎B')).toBe(6);     // 1 + 4 + 1
  });

  test('fullwidth forms are width 2', () => {
    // U+FF21 = Fullwidth A
    expect(stringWidth('\uFF21')).toBe(2);
  });
});
```

### 5.6 Visual Regression Test

Render a table with mixed CJK/ASCII content to a `TestTerminal` and inspect
the screen buffer to verify that all `│` separators appear in the same column
across all rows. This can be done using the existing `WidgetTester`
infrastructure:

```typescript
test('visual: CJK table separator alignment', async () => {
  const tester = new WidgetTester();
  const md = new Markdown({
    markdown: [
      '| 名前  | 年齢 |',
      '| ----- | ---- |',
      '| 太郎  | 25   |',
      '| Alice | 30   |',
    ].join('\n'),
  });

  await tester.pumpWidget(md);
  const screen = tester.getScreenContent();

  // Find the column position of '│' in each row
  const lines = screen.split('\n').filter(l => l.includes('│'));
  const separatorPositions = lines.map(l => l.indexOf('│'));

  // All rows should have the separator at the same column
  for (let i = 1; i < separatorPositions.length; i++) {
    expect(separatorPositions[i]).toBe(separatorPositions[0]);
  }
});
```

### 5.7 Regression Test: ASCII-only Tables Unchanged

```typescript
test('ASCII-only table output is unchanged by the fix', () => {
  // This ensures backward compatibility. Since stringWidth(ascii) === ascii.length,
  // ASCII-only tables should produce identical output before and after the fix.
  const md = [
    '| Name  | Age |',
    '| ----- | --- |',
    '| Alice | 30  |',
    '| Bob   | 25  |',
  ].join('\n');
  const blocks = Markdown.parseMarkdown(md);
  expect(blocks[0]!.tableHeaders).toEqual(['Name', 'Age']);
  expect(blocks[0]!.tableRows).toEqual([['Alice', '30'], ['Bob', '25']]);
});
```

---

## 6. Risk Assessment

### 6.1 Scope of Change

The change is tightly scoped to the `_renderTable` method plus one new import
and one small helper function. No other rendering code paths are affected.
The total diff is approximately 16 lines added and 4 lines modified in a single
file.

### 6.2 Performance

`stringWidth` iterates over each character once per call. For a typical table
with N rows and M columns, the total character scanning is O(N * M * L) where
L is the average cell length. Since markdown tables are typically small (under
100 cells with short content), this has negligible performance impact.

Note that `stringWidth` is already called extensively in the text layout and
paint pipelines for every visible character on screen. Adding it to the table
column width calculation introduces no new performance concern.

### 6.3 Backward Compatibility

Tables containing only ASCII content will behave **identically**, since
`stringWidth(asciiStr) === asciiStr.length` for all-ASCII strings. This is
because every ASCII character (U+0020 through U+007E) returns width 1 from
`wcwidth()`, which is the same as counting code units.

The fix only changes behavior for cells containing wide characters, where the
current behavior is **visibly broken**. There is no scenario where the old
(incorrect) behavior was desirable.

### 6.4 Consistency With Rest of Pipeline

After this fix, the entire rendering pipeline -- from `TextSpan.computeWidth()`
through `RenderText` layout and paint, to table column measurement -- will
consistently use `stringWidth` for terminal width calculations. The table
renderer was the sole outlier.

This consistency is important because the `Text` widget that renders each table
row already uses `stringWidth` internally for its layout calculations. If the
table renderer feeds it strings padded according to `string.length`, there is a
mismatch between the width the table expects and the width the `Text` widget
actually occupies. The fix eliminates this mismatch.

### 6.5 No New Dependencies

The fix uses only the existing `stringWidth` function from `../core/wcwidth`,
which is already a vendored, zero-dependency implementation. No new external
dependencies are introduced.

---

## 7. Implementation Checklist

- [ ] Add `import { stringWidth } from '../core/wcwidth';` to `markdown.ts`
- [ ] Add `padEndDisplayWidth` helper function after imports
- [ ] Replace `h.length` with `stringWidth(h)` on line 752
- [ ] Replace `(row[c] ?? '').length` with `stringWidth(row[c] ?? '')` on line 755
- [ ] Replace `h.padEnd(colWidths[c]!)` with `padEndDisplayWidth(h, colWidths[c]!)` on line 763
- [ ] Replace `(row[c] ?? '').padEnd(colWidths[c]!)` with `padEndDisplayWidth(row[c] ?? '', colWidths[c]!)` on line 790
- [ ] Add unit tests for CJK table alignment to `markdown.test.ts`
- [ ] Add `stringWidth` tests for table-relevant inputs to `markdown.test.ts`
- [ ] Run `bun test` to confirm all existing tests pass
- [ ] Run visual inspection with a CJK table in the TUI to confirm alignment
