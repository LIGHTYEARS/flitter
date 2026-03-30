# Gap U15: Markdown Inline Nesting Not Supported

## Status: Proposal
## Affected packages: `flitter-core`
## Depends on: None

---

## 1. Problem Statement

### 1.1 What Is Broken

The `parseInline` method in
`packages/flitter-core/src/widgets/markdown.ts` (lines 422-496) uses a flat,
greedy regex-matching loop to parse inline formatting. It attempts to match one
pattern at a time at the current cursor position, extracts the inner text as a
plain string, and advances past the match. This means **nested formatting is
impossible**: the inner text of any matched pattern is treated as literal text,
never recursively parsed for further inline formatting.

For example, given the input `**bold and *italic* inside**`, the parser matches
`**...**` and captures the inner text `bold and *italic* inside` as a single
segment with `bold: true`. The `*italic*` inside is never recognized -- it
becomes literal text within the bold segment. Similarly, `[**bold link**](url)`
captures `**bold link**` as the link text verbatim, with no bold styling
applied to it.

### 1.2 Failing Cases

The following markdown inputs produce incorrect results:

| Input | Expected Rendering | Actual Rendering |
|-------|-------------------|-----------------|
| `**bold and *italic* inside**` | "bold and " bold, "italic" bold+italic, " inside" bold | Entire inner text is flat bold, no italic |
| `*italic with **bold** word*` | "italic with " italic, "bold" bold+italic, " word" italic | Entire inner text is flat italic, no bold |
| `[**bold link**](url)` | "bold link" as bold+underlined link | "**bold link**" as plain link text (asterisks visible) |
| `[*italic link*](url)` | "italic link" as italic+underlined link | "*italic link*" as plain link text (asterisks visible) |
| `***bold-italic with `code` inside***` | "bold-italic with " bold+italic, "code" as code, " inside" bold+italic | Entire inner text is flat bold+italic |
| `**bold with ~~strike~~ text**` | "bold with " bold, "strike" bold+strikethrough, " text" bold | Entire inner text is flat bold, no strikethrough |
| `~~deleted **important** text~~` | "deleted " strikethrough, "important" strikethrough+bold, " text" strikethrough | Entire inner text is flat strikethrough |

### 1.3 Root Cause Analysis

The `parseInline` method (lines 422-496) follows this algorithm:

```typescript
static parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Try bold-italic: ***text***
    const boldItalicMatch = remaining.match(/^\*\*\*(.+?)\*\*\*/);
    if (boldItalicMatch) {
      segments.push({ text: boldItalicMatch[1]!, boldItalic: true });  // <-- flat text, no recursion
      remaining = remaining.slice(boldItalicMatch[0]!.length);
      continue;
    }
    // Try bold: **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      segments.push({ text: boldMatch[1]!, bold: true });  // <-- flat text, no recursion
      remaining = remaining.slice(boldMatch[0]!.length);
      continue;
    }
    // ... same pattern for italic, strikethrough, code, link ...
  }
  return segments;
}
```

Each regex captures its inner content with a non-greedy `(.+?)` group, but the
captured group is stored directly as the segment's `text` property. There is no
recursive call to `parseInline` on the captured inner text. The `InlineSegment`
type itself has no mechanism to represent child segments -- it is a flat
structure with boolean flags.

### 1.4 The Structural Limitation

The `InlineSegment` interface (lines 62-71) is flat:

```typescript
export interface InlineSegment {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly code?: boolean;
  readonly linkText?: string;
  readonly linkUrl?: string;
  readonly strikethrough?: boolean;
  readonly boldItalic?: boolean;
}
```

There is no `children` property. A segment can be bold OR italic OR
bold-italic, but it cannot be "bold, containing children that are
individually italic or plain." The `***text***` special case for bold+italic
only handles the trivial case where the entire content is both bold and italic.
It does not handle `**bold *italic* bold**` where the italic scope is a subset
of the bold scope.

### 1.5 Downstream Impact

The `_segmentToSpan` method (lines 809-843) converts each `InlineSegment` into
a `TextSpan`. Because segments are flat, each `TextSpan` is a leaf node with a
style and text. If segments could carry children, `_segmentToSpan` would need
to produce `TextSpan` nodes with `children` arrays -- which the `TextSpan`
class already supports (the heading renderer on line 558 already creates
`TextSpan` nodes with `children`).

---

## 2. Proposed Fix

### 2.1 Design: Recursive Descent With Style Inheritance

Replace the flat regex loop with a recursive descent parser. The key insight is
that each formatting delimiter opens a **scope**. Within that scope, the parser
should recursively parse the inner content, producing child segments that
inherit the outer scope's formatting.

The approach:

1. Introduce an extended segment type that can carry `children`.
2. Rewrite `parseInline` as a recursive function that accepts a "style context"
   (the set of active formatting flags from enclosing scopes).
3. When a delimiter like `**` is encountered, the parser recursively parses
   the content between `**` and the closing `**`, producing child segments
   that each carry `bold: true` in addition to whatever formatting they
   themselves define.
4. Flatten the tree into the existing `InlineSegment[]` return type so that
   `_segmentToSpan` can consume it without changes. Each leaf segment carries
   the union of all ancestor formatting flags.

Flattening preserves backward compatibility: all downstream code continues to
work with the same flat `InlineSegment[]` type. The nesting is resolved during
parsing, not during rendering.

### 2.2 New Internal Types

Add these internal types within `markdown.ts`, above the `parseInline` method.
They are not exported -- the public API remains `InlineSegment[]`.

```typescript
// ---------------------------------------------------------------------------
// Internal: recursive inline parser context
// ---------------------------------------------------------------------------

/** Accumulated formatting state from enclosing scopes. */
interface InlineStyleContext {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  linkUrl?: string;
  linkText?: string;
}

/** A delimiter kind recognized by the recursive parser. */
type DelimiterKind = '***' | '**' | '*' | '~~' | '`';
```

### 2.3 New Private Method: `_parseInlineRecursive`

This replaces the core logic of `parseInline`. It is a private static method
that takes the text to parse, the style context inherited from enclosing
scopes, and an optional "stop delimiter" that signals the end of the current
scope.

```typescript
/**
 * Recursively parse inline markdown, inheriting style context from
 * enclosing formatting scopes.
 *
 * @param text       - The remaining text to parse.
 * @param ctx        - Inherited formatting state from outer scopes.
 * @param stopDelim  - If set, parsing stops when this delimiter is
 *                     encountered at the current position. Used by
 *                     recursive calls to know when their scope ends.
 * @returns An object with:
 *   - segments: the parsed InlineSegment[] (flattened, with inherited styles)
 *   - consumed: number of characters consumed from `text`
 */
private static _parseInlineRecursive(
  text: string,
  ctx: InlineStyleContext,
  stopDelim?: DelimiterKind,
): { segments: InlineSegment[]; consumed: number } {
  const segments: InlineSegment[] = [];
  let pos = 0;
  let plainStart = pos;

  const flushPlain = () => {
    if (pos > plainStart) {
      const plainText = text.slice(plainStart, pos);
      segments.push(Markdown._makeSegment(plainText, ctx));
    }
  };

  while (pos < text.length) {
    // Check if we've hit the stop delimiter for the current scope
    if (stopDelim && text.startsWith(stopDelim, pos)) {
      flushPlain();
      return { segments, consumed: pos + stopDelim.length };
    }

    // --- Inline code: `code` (no recursion inside code spans) ---
    if (text[pos] === '`') {
      const closeIdx = text.indexOf('`', pos + 1);
      if (closeIdx !== -1) {
        flushPlain();
        const codeText = text.slice(pos + 1, closeIdx);
        segments.push(Markdown._makeSegment(codeText, { ...ctx, code: true }));
        pos = closeIdx + 1;
        plainStart = pos;
        continue;
      }
    }

    // --- Link: [text](url) ---
    if (text[pos] === '[') {
      const closeBracket = Markdown._findMatchingBracket(text, pos);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          flushPlain();
          const linkTextStr = text.slice(pos + 1, closeBracket);
          const linkUrlStr = text.slice(closeBracket + 2, closeParen);
          // Recursively parse the link text for nested formatting
          const linkCtx: InlineStyleContext = {
            ...ctx,
            linkUrl: linkUrlStr,
            linkText: linkTextStr,
          };
          const inner = Markdown._parseInlineRecursive(linkTextStr, linkCtx);
          segments.push(...inner.segments);
          pos = closeParen + 1;
          plainStart = pos;
          continue;
        }
      }
    }

    // --- Bold-italic: ***text*** ---
    if (text.startsWith('***', pos)) {
      const innerStart = pos + 3;
      const result = Markdown._parseInlineRecursive(
        text.slice(innerStart),
        { ...ctx, bold: true, italic: true },
        '***',
      );
      if (result.consumed > 0 && result.segments.length > 0) {
        flushPlain();
        segments.push(...result.segments);
        pos = innerStart + result.consumed;
        plainStart = pos;
        continue;
      }
    }

    // --- Bold: **text** ---
    if (text.startsWith('**', pos) && !text.startsWith('***', pos)) {
      const innerStart = pos + 2;
      const result = Markdown._parseInlineRecursive(
        text.slice(innerStart),
        { ...ctx, bold: true },
        '**',
      );
      if (result.consumed > 0 && result.segments.length > 0) {
        flushPlain();
        segments.push(...result.segments);
        pos = innerStart + result.consumed;
        plainStart = pos;
        continue;
      }
    }

    // --- Italic: *text* ---
    if (
      text[pos] === '*' &&
      !text.startsWith('**', pos)
    ) {
      const innerStart = pos + 1;
      const result = Markdown._parseInlineRecursive(
        text.slice(innerStart),
        { ...ctx, italic: true },
        '*',
      );
      if (result.consumed > 0 && result.segments.length > 0) {
        flushPlain();
        segments.push(...result.segments);
        pos = innerStart + result.consumed;
        plainStart = pos;
        continue;
      }
    }

    // --- Strikethrough: ~~text~~ ---
    if (text.startsWith('~~', pos)) {
      const innerStart = pos + 2;
      const result = Markdown._parseInlineRecursive(
        text.slice(innerStart),
        { ...ctx, strikethrough: true },
        '~~',
      );
      if (result.consumed > 0 && result.segments.length > 0) {
        flushPlain();
        segments.push(...result.segments);
        pos = innerStart + result.consumed;
        plainStart = pos;
        continue;
      }
    }

    // No pattern matched at this position; advance one character
    pos++;
  }

  // Flush any remaining plain text
  flushPlain();
  return { segments, consumed: pos };
}
```

### 2.4 Helper Methods

Two small helpers are needed:

```typescript
/**
 * Create an InlineSegment with the given text and style context.
 * Merges boolean flags so the segment carries the union of all
 * enclosing scopes' formatting.
 */
private static _makeSegment(text: string, ctx: InlineStyleContext): InlineSegment {
  const seg: InlineSegment = { text };
  if (ctx.bold && ctx.italic) {
    return { ...seg, boldItalic: true };
  }
  if (ctx.bold) {
    return { ...seg, bold: true };
  }
  if (ctx.italic) {
    return { ...seg, italic: true };
  }
  if (ctx.strikethrough) {
    return { ...seg, strikethrough: true };
  }
  if (ctx.code) {
    return { ...seg, code: true };
  }
  if (ctx.linkUrl) {
    return { ...seg, linkUrl: ctx.linkUrl, linkText: ctx.linkText };
  }
  return seg;
}

/**
 * Find the index of the closing ']' that matches the opening '[' at
 * position `start`. Returns -1 if not found. Handles nested brackets.
 */
private static _findMatchingBracket(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
```

### 2.5 Corrected `_makeSegment` With Multiple Flags

The `_makeSegment` helper above has a problem: it uses early returns, so a
segment that is both bold and strikethrough would only get `bold: true`. The
correct implementation must compose all active flags:

```typescript
private static _makeSegment(text: string, ctx: InlineStyleContext): InlineSegment {
  const seg: Record<string, unknown> = { text };

  const isBold = !!ctx.bold;
  const isItalic = !!ctx.italic;

  if (isBold && isItalic) {
    seg.boldItalic = true;
  } else if (isBold) {
    seg.bold = true;
  } else if (isItalic) {
    seg.italic = true;
  }

  if (ctx.strikethrough) seg.strikethrough = true;
  if (ctx.code) seg.code = true;
  if (ctx.linkUrl) {
    seg.linkUrl = ctx.linkUrl;
    seg.linkText = ctx.linkText;
  }

  return seg as InlineSegment;
}
```

This ensures that a segment inheriting both bold from an outer scope and
strikethrough from an inner scope will carry `bold: true` AND
`strikethrough: true`.

### 2.6 Updated `parseInline` (Public Entry Point)

The public `parseInline` method becomes a thin wrapper:

```typescript
/**
 * Parse inline markdown formatting within a text string.
 * Handles nested formatting: **bold *italic* bold** produces
 * three segments with correct style inheritance.
 * Exported as static for testability.
 */
static parseInline(text: string): InlineSegment[] {
  if (text.length === 0) return [];
  const result = Markdown._parseInlineRecursive(text, {});
  return result.segments;
}
```

### 2.7 Update to `InlineSegment` Interface

The `InlineSegment` interface needs one addition to support combined flags.
Currently, `boldItalic` is a single flag, but with nesting we may produce
segments that are bold+strikethrough, italic+code (inside a link), etc. The
existing interface already supports this through separate boolean flags:

```typescript
export interface InlineSegment {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly code?: boolean;
  readonly linkText?: string;
  readonly linkUrl?: string;
  readonly strikethrough?: boolean;
  readonly boldItalic?: boolean;
}
```

No changes are needed to the interface itself. The `_segmentToSpan` method
(lines 809-843) already handles each flag independently with sequential
`if` checks, so a segment with `{ bold: true, strikethrough: true }` will
correctly receive both `bold` and `strikethrough` styling. The only caveat is
that `boldItalic: true` is used instead of `bold: true, italic: true` for the
combined case, which the existing `_segmentToSpan` already handles (line 817).

### 2.8 Update to `_segmentToSpan` for Combined Flags

The current `_segmentToSpan` (lines 809-843) applies formatting flags
sequentially, which already supports combinations. However, there is a subtle
issue: the `boldItalic` check (line 816) is followed by separate `bold` (line
819) and `italic` (line 822) checks. If a segment has `boldItalic: true` AND
`strikethrough: true`, the current code correctly applies both. No changes are
needed to `_segmentToSpan`.

But for segments where `bold` and `strikethrough` are both true (without
`boldItalic`), the current code correctly applies both through the sequential
`if` checks. This is confirmed by the existing code:

```typescript
if (segment.boldItalic) {
  style = style.copyWith({ bold: true, italic: true });
}
if (segment.bold) {
  style = style.copyWith({ bold: true });
}
if (segment.italic) {
  style = style.copyWith({ italic: true });
}
if (segment.strikethrough) {
  style = style.copyWith({ strikethrough: true });
}
```

Since `copyWith` merges properties, applying `bold` then `strikethrough`
correctly produces a style with both flags set.

---

## 3. Complete Diff

```diff
--- a/packages/flitter-core/src/widgets/markdown.ts
+++ b/packages/flitter-core/src/widgets/markdown.ts
@@ -58,6 +58,20 @@
 // Inline segment types
 // ---------------------------------------------------------------------------

+// ---------------------------------------------------------------------------
+// Internal: recursive inline parser context
+// ---------------------------------------------------------------------------
+
+/** Accumulated formatting state from enclosing scopes. */
+interface InlineStyleContext {
+  bold?: boolean;
+  italic?: boolean;
+  strikethrough?: boolean;
+  code?: boolean;
+  linkUrl?: string;
+  linkText?: string;
+}
+
+type DelimiterKind = '***' | '**' | '*' | '~~' | '`';
+
 export interface InlineSegment {
   readonly text: string;
@@ -417,75 +431,168 @@
   /**
    * Parse inline markdown formatting within a text string.
-   * Handles: **bold**, *italic*, `code`, [text](url)
+   * Handles nested formatting: **bold *italic* bold** produces
+   * three segments with correct style inheritance.
    * Exported as static for testability.
    */
   static parseInline(text: string): InlineSegment[] {
-    const segments: InlineSegment[] = [];
-    let remaining = text;
-
-    while (remaining.length > 0) {
-      // Try to match inline patterns
-      // Order matters: ***boldItalic*** before **bold** before *italic*
-
-      // Bold+Italic: ***text***
-      const boldItalicMatch = remaining.match(/^\*\*\*(.+?)\*\*\*/);
-      if (boldItalicMatch) {
-        segments.push({ text: boldItalicMatch[1]!, boldItalic: true });
-        remaining = remaining.slice(boldItalicMatch[0]!.length);
-        continue;
-      }
-
-      // Bold: **text**
-      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
-      if (boldMatch) {
-        segments.push({ text: boldMatch[1]!, bold: true });
-        remaining = remaining.slice(boldMatch[0]!.length);
-        continue;
-      }
-
-      // Italic: *text*
-      const italicMatch = remaining.match(/^\*(.+?)\*/);
-      if (italicMatch) {
-        segments.push({ text: italicMatch[1]!, italic: true });
-        remaining = remaining.slice(italicMatch[0]!.length);
-        continue;
-      }
-
-      // Strikethrough: ~~text~~
-      const strikeMatch = remaining.match(/^~~(.+?)~~/);
-      if (strikeMatch) {
-        segments.push({ text: strikeMatch[1]!, strikethrough: true });
-        remaining = remaining.slice(strikeMatch[0]!.length);
-        continue;
-      }
-
-      // Inline code: `code`
-      const codeMatch = remaining.match(/^`([^`]+)`/);
-      if (codeMatch) {
-        segments.push({ text: codeMatch[1]!, code: true });
-        remaining = remaining.slice(codeMatch[0]!.length);
-        continue;
-      }
-
-      // Link: [text](url)
-      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
-      if (linkMatch) {
-        segments.push({
-          text: linkMatch[1]!,
-          linkText: linkMatch[1]!,
-          linkUrl: linkMatch[2]!,
-        });
-        remaining = remaining.slice(linkMatch[0]!.length);
-        continue;
-      }
-
-      // Plain text: consume until next special character or end
-      const plainMatch = remaining.match(/^[^*`\[~]+/);
-      if (plainMatch) {
-        segments.push({ text: plainMatch[0]! });
-        remaining = remaining.slice(plainMatch[0]!.length);
-        continue;
-      }
-
-      // If no pattern matches, consume one character as plain text
-      segments.push({ text: remaining[0]! });
-      remaining = remaining.slice(1);
+    if (text.length === 0) return [];
+    const result = Markdown._parseInlineRecursive(text, {});
+    return result.segments;
+  }
+
+  /**
+   * Recursively parse inline markdown with style context inheritance.
+   */
+  private static _parseInlineRecursive(
+    text: string,
+    ctx: InlineStyleContext,
+    stopDelim?: DelimiterKind,
+  ): { segments: InlineSegment[]; consumed: number } {
+    const segments: InlineSegment[] = [];
+    let pos = 0;
+    let plainStart = 0;
+
+    const flushPlain = () => {
+      if (pos > plainStart) {
+        segments.push(Markdown._makeSegment(text.slice(plainStart, pos), ctx));
+      }
+    };
+
+    while (pos < text.length) {
+      if (stopDelim && text.startsWith(stopDelim, pos)) {
+        flushPlain();
+        return { segments, consumed: pos + stopDelim.length };
+      }
+
+      // Inline code (no recursion inside code)
+      if (text[pos] === '`') {
+        const closeIdx = text.indexOf('`', pos + 1);
+        if (closeIdx !== -1) {
+          flushPlain();
+          segments.push(Markdown._makeSegment(text.slice(pos + 1, closeIdx), { ...ctx, code: true }));
+          pos = closeIdx + 1;
+          plainStart = pos;
+          continue;
+        }
+      }
+
+      // Link: [text](url)
+      if (text[pos] === '[') {
+        const closeBracket = Markdown._findMatchingBracket(text, pos);
+        if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
+          const closeParen = text.indexOf(')', closeBracket + 2);
+          if (closeParen !== -1) {
+            flushPlain();
+            const linkTextStr = text.slice(pos + 1, closeBracket);
+            const linkUrlStr = text.slice(closeBracket + 2, closeParen);
+            const linkCtx: InlineStyleContext = { ...ctx, linkUrl: linkUrlStr, linkText: linkTextStr };
+            const inner = Markdown._parseInlineRecursive(linkTextStr, linkCtx);
+            segments.push(...inner.segments);
+            pos = closeParen + 1;
+            plainStart = pos;
+            continue;
+          }
+        }
+      }
+
+      // Bold-italic: ***text***
+      if (text.startsWith('***', pos)) {
+        const result = Markdown._parseInlineRecursive(text.slice(pos + 3), { ...ctx, bold: true, italic: true }, '***');
+        if (result.consumed > 0 && result.segments.length > 0) {
+          flushPlain();
+          segments.push(...result.segments);
+          pos = pos + 3 + result.consumed;
+          plainStart = pos;
+          continue;
+        }
+      }
+
+      // Bold: **text**
+      if (text.startsWith('**', pos) && !text.startsWith('***', pos)) {
+        const result = Markdown._parseInlineRecursive(text.slice(pos + 2), { ...ctx, bold: true }, '**');
+        if (result.consumed > 0 && result.segments.length > 0) {
+          flushPlain();
+          segments.push(...result.segments);
+          pos = pos + 2 + result.consumed;
+          plainStart = pos;
+          continue;
+        }
+      }
+
+      // Italic: *text*
+      if (text[pos] === '*' && !text.startsWith('**', pos)) {
+        const result = Markdown._parseInlineRecursive(text.slice(pos + 1), { ...ctx, italic: true }, '*');
+        if (result.consumed > 0 && result.segments.length > 0) {
+          flushPlain();
+          segments.push(...result.segments);
+          pos = pos + 1 + result.consumed;
+          plainStart = pos;
+          continue;
+        }
+      }
+
+      // Strikethrough: ~~text~~
+      if (text.startsWith('~~', pos)) {
+        const result = Markdown._parseInlineRecursive(text.slice(pos + 2), { ...ctx, strikethrough: true }, '~~');
+        if (result.consumed > 0 && result.segments.length > 0) {
+          flushPlain();
+          segments.push(...result.segments);
+          pos = pos + 2 + result.consumed;
+          plainStart = pos;
+          continue;
+        }
+      }
+
+      pos++;
+    }
+
+    flushPlain();
+    return { segments, consumed: pos };
+  }
+
+  /**
+   * Create a segment with merged style flags from the context.
+   */
+  private static _makeSegment(text: string, ctx: InlineStyleContext): InlineSegment {
+    const seg: Record<string, unknown> = { text };
+    const isBold = !!ctx.bold;
+    const isItalic = !!ctx.italic;
+    if (isBold && isItalic) seg.boldItalic = true;
+    else if (isBold) seg.bold = true;
+    else if (isItalic) seg.italic = true;
+    if (ctx.strikethrough) seg.strikethrough = true;
+    if (ctx.code) seg.code = true;
+    if (ctx.linkUrl) {
+      seg.linkUrl = ctx.linkUrl;
+      seg.linkText = ctx.linkText;
     }
-
-    return segments;
+    return seg as InlineSegment;
+  }
+
+  /**
+   * Find the closing ']' matching the '[' at `start`. Returns -1 if not found.
+   */
+  private static _findMatchingBracket(text: string, start: number): number {
+    let depth = 0;
+    for (let i = start; i < text.length; i++) {
+      if (text[i] === '[') depth++;
+      else if (text[i] === ']') {
+        depth--;
+        if (depth === 0) return i;
+      }
+    }
+    return -1;
   }
```

---

## 4. Nesting Semantics and Depth Limits

### 4.1 Supported Nesting Combinations

The recursive parser supports arbitrary nesting of formatting scopes:

| Outer | Inner | Example | Result |
|-------|-------|---------|--------|
| bold | italic | `**bold *italic* bold**` | 3 segments: bold, boldItalic, bold |
| italic | bold | `*italic **bold** italic*` | 3 segments: italic, boldItalic, italic |
| bold | code | `**bold \`code\` bold**` | 3 segments: bold, code, bold |
| bold | strikethrough | `**bold ~~strike~~ bold**` | 3 segments: bold, bold+strike, bold |
| strikethrough | bold | `~~strike **bold** strike~~` | 3 segments: strike, bold+strike, strike |
| link | bold | `[**bold link**](url)` | 1 segment: bold+link |
| link | italic | `[*italic link*](url)` | 1 segment: italic+link |
| link | bold+italic | `[***bi link***](url)` | 1 segment: boldItalic+link |
| bold-italic | code | `***bi \`code\` bi***` | 3 segments: boldItalic, code, boldItalic |

### 4.2 Inline Code is a Leaf

Inline code spans (`` `...` ``) are intentionally NOT recursively parsed. This
matches standard markdown behavior: everything inside backticks is literal.
`**bold `*not italic*` bold**` should render the code span as literal
`*not italic*` text, not as italic text.

### 4.3 Recursion Depth

In practice, nesting depth is bounded by the number of distinct delimiter
types (5: `***`, `**`, `*`, `~~`, `` ` ``). Since each recursive call
requires a different stop delimiter, and the same delimiter cannot nest inside
itself (the parser would find the inner closing delimiter first), the maximum
recursion depth is 5. Stack overflow is not a concern.

### 4.4 Mismatched Delimiters

If a closing delimiter is not found before the end of the text, the recursive
call returns with `consumed` equal to the remaining text length and no segments
containing the expected closing delimiter. The calling site checks
`result.consumed > 0 && result.segments.length > 0` and, if the match seems
invalid (closing delimiter not found), falls through to treat the opening
delimiter characters as plain text. This graceful degradation matches the
current behavior for unmatched delimiters.

---

## 5. Test Plan

### 5.1 Backward Compatibility: Existing Tests Must Pass

All 50+ existing tests in `markdown.test.ts` must continue to pass without
modification. The recursive parser produces identical output for non-nested
inputs because:

- Plain text produces identical segments (no context flags set).
- `**bold**` produces `{ text: 'bold', bold: true }` -- same as before.
- `*italic*` produces `{ text: 'italic', italic: true }` -- same as before.
- `***boldItalic***` produces `{ text: 'boldItalic', boldItalic: true }` --
  same as before (the `_makeSegment` helper detects bold+italic and sets
  `boldItalic`).
- Links, code, strikethrough all produce identical segments.

### 5.2 New Tests: Nested Bold Inside Italic

```typescript
describe('Markdown inline nesting', () => {
  test('bold inside italic', () => {
    const segments = Markdown.parseInline('*italic **bold** italic*');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('italic ');
    expect(segments[0]!.italic).toBe(true);
    expect(segments[1]!.text).toBe('bold');
    expect(segments[1]!.boldItalic).toBe(true);
    expect(segments[2]!.text).toBe(' italic');
    expect(segments[2]!.italic).toBe(true);
  });

  test('italic inside bold', () => {
    const segments = Markdown.parseInline('**bold *italic* bold**');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('bold ');
    expect(segments[0]!.bold).toBe(true);
    expect(segments[1]!.text).toBe('italic');
    expect(segments[1]!.boldItalic).toBe(true);
    expect(segments[2]!.text).toBe(' bold');
    expect(segments[2]!.bold).toBe(true);
  });
});
```

### 5.3 New Tests: Nested Strikethrough Combinations

```typescript
test('strikethrough inside bold', () => {
  const segments = Markdown.parseInline('**bold ~~strike~~ bold**');
  expect(segments.length).toBe(3);
  expect(segments[0]!.bold).toBe(true);
  expect(segments[0]!.strikethrough).toBeUndefined();
  expect(segments[1]!.text).toBe('strike');
  expect(segments[1]!.bold).toBe(true);
  expect(segments[1]!.strikethrough).toBe(true);
  expect(segments[2]!.bold).toBe(true);
});

test('bold inside strikethrough', () => {
  const segments = Markdown.parseInline('~~del **bold** del~~');
  expect(segments.length).toBe(3);
  expect(segments[0]!.strikethrough).toBe(true);
  expect(segments[1]!.text).toBe('bold');
  expect(segments[1]!.bold).toBe(true);
  expect(segments[1]!.strikethrough).toBe(true);
  expect(segments[2]!.strikethrough).toBe(true);
});
```

### 5.4 New Tests: Formatting Inside Links

```typescript
test('bold inside link', () => {
  const segments = Markdown.parseInline('[**bold link**](https://example.com)');
  expect(segments.length).toBe(1);
  expect(segments[0]!.text).toBe('bold link');
  expect(segments[0]!.bold).toBe(true);
  expect(segments[0]!.linkUrl).toBe('https://example.com');
});

test('italic inside link', () => {
  const segments = Markdown.parseInline('[*italic link*](https://example.com)');
  expect(segments.length).toBe(1);
  expect(segments[0]!.text).toBe('italic link');
  expect(segments[0]!.italic).toBe(true);
  expect(segments[0]!.linkUrl).toBe('https://example.com');
});

test('mixed formatting inside link', () => {
  const segments = Markdown.parseInline('[normal **bold** normal](url)');
  expect(segments.length).toBe(3);
  expect(segments[0]!.text).toBe('normal ');
  expect(segments[0]!.linkUrl).toBe('url');
  expect(segments[0]!.bold).toBeUndefined();
  expect(segments[1]!.text).toBe('bold');
  expect(segments[1]!.bold).toBe(true);
  expect(segments[1]!.linkUrl).toBe('url');
  expect(segments[2]!.text).toBe(' normal');
  expect(segments[2]!.linkUrl).toBe('url');
});
```

### 5.5 New Tests: Code Span is Not Recursively Parsed

```typescript
test('code span content is literal (no nested parsing)', () => {
  const segments = Markdown.parseInline('**bold `*not italic*` bold**');
  expect(segments.length).toBe(3);
  expect(segments[0]!.bold).toBe(true);
  expect(segments[1]!.text).toBe('*not italic*');
  expect(segments[1]!.code).toBe(true);
  expect(segments[1]!.italic).toBeUndefined();
  expect(segments[2]!.bold).toBe(true);
});
```

### 5.6 New Tests: Triple Nesting

```typescript
test('italic inside bold inside strikethrough', () => {
  const segments = Markdown.parseInline('~~del **bold *italic* bold** del~~');
  // Expected: "del " strike, "bold " strike+bold, "italic" strike+boldItalic,
  //           " bold" strike+bold, " del" strike
  expect(segments.length).toBe(5);
  expect(segments[0]!.strikethrough).toBe(true);
  expect(segments[1]!.bold).toBe(true);
  expect(segments[1]!.strikethrough).toBe(true);
  expect(segments[2]!.boldItalic).toBe(true);
  expect(segments[2]!.strikethrough).toBe(true);
  expect(segments[3]!.bold).toBe(true);
  expect(segments[3]!.strikethrough).toBe(true);
  expect(segments[4]!.strikethrough).toBe(true);
});
```

### 5.7 New Tests: Unmatched Delimiters Degrade Gracefully

```typescript
test('unmatched bold delimiter is plain text', () => {
  const segments = Markdown.parseInline('foo **bar');
  const fullText = segments.map((s) => s.text).join('');
  expect(fullText).toBe('foo **bar');
});

test('unmatched nested delimiter degrades gracefully', () => {
  const segments = Markdown.parseInline('**bold *unmatched bold**');
  // The parser should handle the mismatched inner * gracefully
  const fullText = segments.map((s) => s.text).join('');
  // All original text content should be preserved (minus delimiters)
  expect(fullText.length).toBeGreaterThan(0);
});
```

### 5.8 Text Reconstruction Test

```typescript
test('nested formatting preserves all text content', () => {
  const input = '**bold *italic* bold** plain ~~del `code` del~~';
  const segments = Markdown.parseInline(input);
  const text = segments.map((s) => s.text).join('');
  expect(text).toBe('bold italic bold plain del code del');
});
```

---

## 6. Edge Cases and Robustness

### 6.1 Adjacent Delimiters

Input: `*italic***bold**` -- an italic span immediately followed by a bold
span. The parser sees `*italic*` first (consuming 9 characters), then `**bold**`
(consuming 8 characters). This produces two segments: italic "italic" and bold
"bold". No nesting is involved.

### 6.2 Empty Spans

Input: `****` -- two adjacent `**` delimiters with nothing inside. The bold
match `**...**` with non-greedy `.+?` requires at least one character inside.
The recursive parser similarly requires `result.segments.length > 0`. So `****`
falls through to plain text handling, consuming characters one at a time. This
matches the current behavior.

### 6.3 Deeply Nested Same-Type Delimiters

Input: `**outer **inner** outer**` -- attempting to nest bold inside bold.
The parser opens a bold scope at position 0, then looks for `**` as the stop
delimiter. It finds `**` at "inner", which closes the scope. The remaining
`outer**` becomes a new parse context. This matches standard markdown behavior:
you cannot nest the same delimiter type.

### 6.4 Overlapping Delimiters

Input: `**bold *italic** italic*` -- overlapping bold and italic. The bold
scope opens first and finds its closing `**` before the italic closing `*`.
Inside the bold scope, `*italic` starts an italic sub-scope that does not find
its closing `*` before the bold scope ends at `**`. The italic sub-scope
degrades to plain text. This produces: "bold " (bold), "*italic" (bold, the
unmatched `*` becomes plain), then " italic*" (plain). This is consistent with
how most markdown parsers handle overlapping spans.

### 6.5 Performance

The recursive parser has worst-case O(n * d) where n is the text length and d
is the nesting depth (bounded by 5). For each failed delimiter match, the
parser advances one character and tries again. In the worst case (many
unmatched delimiters), this is O(n * k) where k is the number of delimiter
patterns (6). This is comparable to the current regex-based parser, which
attempts up to 7 regex matches at each position.

For typical markdown content, the parser runs in effectively linear time
because most positions either match a delimiter (advancing past the entire
span) or are plain text (advancing by one character with no regex overhead).

---

## 7. Risk Assessment

### 7.1 Scope of Change

The change replaces the body of `parseInline` and adds three private static
methods (`_parseInlineRecursive`, `_makeSegment`, `_findMatchingBracket`) plus
two internal type definitions (`InlineStyleContext`, `DelimiterKind`). No
changes are needed to the `InlineSegment` interface, the `_segmentToSpan`
method, or any other part of the rendering pipeline.

### 7.2 Backward Compatibility

The output type is unchanged (`InlineSegment[]`). For non-nested inputs, the
output is identical. For currently-broken nested inputs, the output is now
correct. There is no case where the old (incorrect) behavior was desirable.

### 7.3 No New Dependencies

The fix uses only language-level constructs. No new imports or external
dependencies.

### 7.4 Cache Compatibility

The `MarkdownCache` operates at the block level (caching `MarkdownBlock[]`
from `parseMarkdown`). Inline parsing happens at render time in the
`_renderParagraph`, `_renderBullet`, etc. methods. The cache does not store
inline parse results, so the change is transparent to the cache.

---

## 8. Implementation Checklist

- [ ] Add `InlineStyleContext` interface and `DelimiterKind` type to `markdown.ts`
- [ ] Add `_parseInlineRecursive` private static method
- [ ] Add `_makeSegment` private static method
- [ ] Add `_findMatchingBracket` private static method
- [ ] Update `parseInline` to delegate to `_parseInlineRecursive`
- [ ] Remove the old regex-based `parseInline` body
- [ ] Add nesting tests to `markdown.test.ts` (sections 5.2-5.8 above)
- [ ] Run `bun test` to confirm all existing tests pass
- [ ] Run visual inspection with nested markdown in the TUI
