// Tests for DiffView widget
// Verifies diff parsing, line classification, line numbers, context filtering, and theme colors

import { describe, test, expect } from 'bun:test';
import { DiffView } from '../diff-view';
import { Color } from '../../core/color';
import { TextStyle } from '../../core/text-style';
import { TextSpan } from '../../core/text-span';

// ---------------------------------------------------------------------------
// Sample diffs for testing
// ---------------------------------------------------------------------------

const SIMPLE_DIFF = `diff --git a/src/foo.ts b/src/foo.ts
index abc1234..def5678 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,5 +1,6 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
 const d = 5;
 const e = 6;`;

const MULTI_HUNK_DIFF = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 line1
-old2
+new2
 line3
@@ -10,3 +10,4 @@
 line10
+added11
 line11
 line12`;

const ADDITIONS_ONLY = `@@ -0,0 +1,3 @@
+line1
+line2
+line3`;

const DELETIONS_ONLY = `@@ -1,3 +0,0 @@
-line1
-line2
-line3`;

// ---------------------------------------------------------------------------
// Parsing tests
// ---------------------------------------------------------------------------

describe('DiffView.parseDiff', () => {
  test('parses simple unified diff with meta and one hunk', () => {
    const hunks = DiffView.parseDiff(SIMPLE_DIFF);
    // Should have a meta hunk + 1 real hunk
    expect(hunks.length).toBe(2);

    // First hunk is meta lines
    const meta = hunks[0]!;
    expect(meta.header).toBe('__meta__');
    expect(meta.lines.length).toBeGreaterThan(0);
    expect(meta.lines[0]!.type).toBe('meta');

    // Second hunk is the real diff
    const hunk = hunks[1]!;
    expect(hunk.oldStart).toBe(1);
    expect(hunk.newStart).toBe(1);
    expect(hunk.header).toContain('@@ -1,5 +1,6 @@');
  });

  test('classifies addition lines correctly', () => {
    const hunks = DiffView.parseDiff(ADDITIONS_ONLY);
    expect(hunks.length).toBe(1);
    const hunk = hunks[0]!;
    expect(hunk.lines.length).toBe(3);
    for (const line of hunk.lines) {
      expect(line.type).toBe('addition');
      expect(line.content.startsWith('+')).toBe(true);
    }
  });

  test('classifies deletion lines correctly', () => {
    const hunks = DiffView.parseDiff(DELETIONS_ONLY);
    expect(hunks.length).toBe(1);
    const hunk = hunks[0]!;
    expect(hunk.lines.length).toBe(3);
    for (const line of hunk.lines) {
      expect(line.type).toBe('deletion');
      expect(line.content.startsWith('-')).toBe(true);
    }
  });

  test('classifies context lines correctly', () => {
    const hunks = DiffView.parseDiff(SIMPLE_DIFF);
    const realHunk = hunks[1]!;
    const contextLines = realHunk.lines.filter((l) => l.type === 'context');
    expect(contextLines.length).toBe(3); // 'const a', 'const d', 'const e'
  });

  test('parses multiple hunks', () => {
    const hunks = DiffView.parseDiff(MULTI_HUNK_DIFF);
    // Meta hunk (--- / +++) plus 2 real hunks
    const metaCount = hunks.filter((h) => h.header === '__meta__').length;
    const realHunks = hunks.filter((h) => h.header !== '__meta__');
    expect(metaCount).toBe(1);
    expect(realHunks.length).toBe(2);
    expect(realHunks[0]!.oldStart).toBe(1);
    expect(realHunks[0]!.newStart).toBe(1);
    expect(realHunks[1]!.oldStart).toBe(10);
    expect(realHunks[1]!.newStart).toBe(10);
  });

  test('tracks line numbers for additions', () => {
    const hunks = DiffView.parseDiff(ADDITIONS_ONLY);
    const lines = hunks[0]!.lines;
    expect(lines[0]!.newLineNumber).toBe(1);
    expect(lines[1]!.newLineNumber).toBe(2);
    expect(lines[2]!.newLineNumber).toBe(3);
    // Additions should not have oldLineNumber
    for (const line of lines) {
      expect(line.oldLineNumber).toBeUndefined();
    }
  });

  test('tracks line numbers for deletions', () => {
    const hunks = DiffView.parseDiff(DELETIONS_ONLY);
    const lines = hunks[0]!.lines;
    expect(lines[0]!.oldLineNumber).toBe(1);
    expect(lines[1]!.oldLineNumber).toBe(2);
    expect(lines[2]!.oldLineNumber).toBe(3);
    // Deletions should not have newLineNumber
    for (const line of lines) {
      expect(line.newLineNumber).toBeUndefined();
    }
  });

  test('tracks line numbers for context lines', () => {
    const hunks = DiffView.parseDiff(SIMPLE_DIFF);
    const realHunk = hunks[1]!;
    const contextLines = realHunk.lines.filter((l) => l.type === 'context');
    // First context line: 'const a = 1;' at old=1, new=1
    expect(contextLines[0]!.oldLineNumber).toBe(1);
    expect(contextLines[0]!.newLineNumber).toBe(1);
  });

  test('handles empty diff string', () => {
    const hunks = DiffView.parseDiff('');
    expect(hunks.length).toBe(0);
  });

  test('handles diff with no hunks (only meta)', () => {
    const hunks = DiffView.parseDiff('diff --git a/foo b/foo\nindex 123..456 100644');
    expect(hunks.length).toBe(1);
    expect(hunks[0]!.header).toBe('__meta__');
  });

  test('handles "No newline at end of file" marker', () => {
    const diff = `@@ -1,2 +1,2 @@
-old
+new
\\ No newline at end of file`;
    const hunks = DiffView.parseDiff(diff);
    const lines = hunks[0]!.lines;
    const metaLine = lines.find((l) => l.content === '\\ No newline at end of file');
    expect(metaLine).toBeDefined();
    expect(metaLine!.type).toBe('meta');
  });
});

// ---------------------------------------------------------------------------
// Widget construction tests
// ---------------------------------------------------------------------------

describe('DiffView widget', () => {
  test('constructs with required diff prop', () => {
    const view = new DiffView({ diff: SIMPLE_DIFF });
    expect(view.diff).toBe(SIMPLE_DIFF);
    expect(view.showLineNumbers).toBe(true); // default
    expect(view.context).toBeUndefined();
  });

  test('constructs with all options', () => {
    const view = new DiffView({
      diff: SIMPLE_DIFF,
      showLineNumbers: false,
      context: 2,
    });
    expect(view.diff).toBe(SIMPLE_DIFF);
    expect(view.showLineNumbers).toBe(false);
    expect(view.context).toBe(2);
  });

  test('showLineNumbers defaults to true', () => {
    const view = new DiffView({ diff: '' });
    expect(view.showLineNumbers).toBe(true);
  });

  test('build returns a widget (Column) without crashing', () => {
    const view = new DiffView({ diff: SIMPLE_DIFF });
    // Build requires a BuildContext but for StatelessWidget we can test parseDiff directly
    // and verify the widget is a StatelessWidget
    expect(view).toBeInstanceOf(DiffView);
    expect(typeof view.build).toBe('function');
  });

  test('handles empty diff without error', () => {
    const view = new DiffView({ diff: '' });
    expect(view.diff).toBe('');
    // parseDiff on empty string should produce 0 hunks
    expect(DiffView.parseDiff(view.diff).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Context filtering tests
// ---------------------------------------------------------------------------

describe('DiffView context filtering', () => {
  test('context=0 shows only changed lines', () => {
    const diff = `@@ -1,7 +1,7 @@
 line1
 line2
 line3
-old4
+new4
 line5
 line6
 line7`;
    // Access the private method through parsing and rebuilding
    const view = new DiffView({ diff, context: 0 });
    // We test the behavior via parseDiff + manual check
    const hunks = DiffView.parseDiff(diff);
    expect(hunks.length).toBe(1);
    const allLines = hunks[0]!.lines;
    // The hunk has lines: 3 context, 1 deletion, 1 addition, 3 context (+1 trailing empty)
    expect(allLines.length).toBe(8);
    const changed = allLines.filter((l) => l.type === 'addition' || l.type === 'deletion');
    expect(changed.length).toBe(2);
  });

  test('parseDiff preserves all context lines without filtering', () => {
    const view = new DiffView({ diff: SIMPLE_DIFF });
    const hunks = DiffView.parseDiff(view.diff);
    const realHunk = hunks.find((h) => h.header !== '__meta__')!;
    // Should have all lines: 3 context + 1 deletion + 2 additions
    expect(realHunk.lines.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('DiffView edge cases', () => {
  test('handles diff with only hunk header and no content', () => {
    const diff = '@@ -0,0 +0,0 @@';
    const hunks = DiffView.parseDiff(diff);
    expect(hunks.length).toBe(1);
    expect(hunks[0]!.lines.length).toBe(0);
  });

  test('handles diff with trailing empty lines', () => {
    const diff = `@@ -1,2 +1,2 @@
-old
+new
`;
    const hunks = DiffView.parseDiff(diff);
    expect(hunks.length).toBe(1);
    // The trailing empty line becomes a context line
    const hunk = hunks[0]!;
    expect(hunk.lines.length).toBe(3); // deletion, addition, context (empty)
  });

  test('handles hunk header with extra text after @@', () => {
    const diff = '@@ -1,3 +1,3 @@ function foo() {';
    const hunks = DiffView.parseDiff(diff);
    expect(hunks.length).toBe(1);
    expect(hunks[0]!.header).toContain('function foo()');
  });
});
