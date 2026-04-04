import { describe, expect, it } from 'bun:test';

import {
  TOOL_NAME_MAP,
  resolveToolName,
  resolveToolDisplayName,
  extractTitleDetail,
  setCwd,
  shortenPath,
} from '../widgets/tool-call/resolve-tool-name';
import {
  joinContentText,
  extractOutputText,
  extractShellOutput,
  looksLikeDiff,
  extractDiff,
  extractRawNumber,
  extractRawString,
  extractRawArray,
} from '../widgets/tool-call/tool-output-utils';
import {
  truncateText,
  truncateInline,
  OUTPUT_TRUNCATION_LIMIT,
  HEADER_TRUNCATION_LIMIT,
  INPUT_TRUNCATION_LIMIT,
  PREVIEW_TRUNCATION_LIMIT,
  TRUNCATION_SUFFIX,
  INLINE_TRUNCATION_SUFFIX,
  MAX_DISPLAY_ITEMS,
} from '../widgets/tool-call/truncation-limits';
import {
  toolStatusIcon,
  todoStatusIcon,
  arrowIcon,
} from '../widgets/tool-call/tool-icons';
import type { ToolCallItem, ToolCallResult } from '../state/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToolCall(overrides: Partial<ToolCallItem> = {}): ToolCallItem {
  return {
    type: 'tool_call',
    toolCallId: 'tc-1',
    title: 'Read /path/to/file.ts',
    kind: 'read',
    status: 'completed',
    collapsed: false,
    ...overrides,
  };
}

function makeResult(overrides: Partial<ToolCallResult> = {}): ToolCallResult {
  return {
    status: 'completed',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolveToolName / resolveToolDisplayName
// ---------------------------------------------------------------------------

describe('resolveToolName', () => {
  it('extracts first token from title', () => {
    expect(resolveToolName(makeToolCall({ title: 'Read /path' }))).toBe('Read');
  });

  it('falls back to kind when title is empty', () => {
    expect(resolveToolName(makeToolCall({ title: '', kind: 'bash' }))).toBe('bash');
  });

  it('falls back to "other" when both title and kind are empty', () => {
    expect(resolveToolName(makeToolCall({ title: '', kind: '' }))).toBe('other');
  });
});

describe('resolveToolDisplayName', () => {
  it('maps read_file -> Read', () => {
    expect(resolveToolDisplayName(makeToolCall({ title: 'read_file /x' }))).toBe('Read');
  });

  it('maps bash -> Bash', () => {
    expect(resolveToolDisplayName(makeToolCall({ title: 'bash echo hello' }))).toBe('Bash');
  });

  it('maps grep -> Grep', () => {
    expect(resolveToolDisplayName(makeToolCall({ title: 'grep pattern' }))).toBe('Grep');
  });

  it('maps write_file -> create_file', () => {
    expect(resolveToolDisplayName(makeToolCall({ title: 'write_file /out' }))).toBe('create_file');
  });

  it('maps web_search -> WebSearch', () => {
    expect(resolveToolDisplayName(makeToolCall({ title: 'web_search query' }))).toBe('WebSearch');
  });

  it('maps TodoWrite -> todo_write', () => {
    expect(resolveToolDisplayName(makeToolCall({ title: 'TodoWrite' }))).toBe('todo_write');
  });

  it('maps Task -> Task', () => {
    expect(resolveToolDisplayName(makeToolCall({ title: 'Task run something' }))).toBe('Task');
  });

  it('returns raw name when no mapping exists', () => {
    expect(resolveToolDisplayName(makeToolCall({ title: 'CustomTool arg' }))).toBe('CustomTool');
  });
});

describe('TOOL_NAME_MAP', () => {
  it('maps all Bash variants', () => {
    for (const key of ['execute_command', 'shell', 'run_command', 'terminal', 'bash', 'BashOutput', 'KillShell']) {
      expect(TOOL_NAME_MAP[key]).toBe('Bash');
    }
  });

  it('maps all Read variants', () => {
    for (const key of ['read_file', 'ReadFile']) {
      expect(TOOL_NAME_MAP[key]).toBe('Read');
    }
  });

  it('maps all Grep variants', () => {
    for (const key of ['search', 'grep', 'ripgrep', 'find_files', 'list_files']) {
      expect(TOOL_NAME_MAP[key]).toBe('Grep');
    }
  });

  it('maps edit variants', () => {
    for (const key of ['edit', 'str_replace_editor', 'EditTool']) {
      expect(TOOL_NAME_MAP[key]).toBe('edit_file');
    }
  });

  it('maps Skill -> skill', () => {
    expect(TOOL_NAME_MAP['Skill']).toBe('skill');
  });
});

describe('extractTitleDetail', () => {
  it('returns text after first space', () => {
    expect(extractTitleDetail(makeToolCall({ title: 'Read /path/to/file' }))).toBe('/path/to/file');
  });

  it('returns empty string when title has no space', () => {
    expect(extractTitleDetail(makeToolCall({ title: 'bash' }))).toBe('');
  });

  it('returns empty string when title is empty', () => {
    expect(extractTitleDetail(makeToolCall({ title: '' }))).toBe('');
  });
});

describe('shortenPath (resolve-tool-name)', () => {
  it('converts absolute path under cwd to relative', () => {
    setCwd('/home/user/project');
    expect(shortenPath('/home/user/project/src/index.ts')).toBe('src/index.ts');
  });

  it('returns original path when outside cwd', () => {
    setCwd('/home/user/project');
    expect(shortenPath('/other/path/file.ts')).toBe('/other/path/file.ts');
  });

  it('returns relative paths unchanged', () => {
    expect(shortenPath('relative/path.ts')).toBe('relative/path.ts');
  });

  it('returns empty string for empty input', () => {
    expect(shortenPath('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// tool-output-utils
// ---------------------------------------------------------------------------

describe('joinContentText', () => {
  it('returns empty string for undefined result', () => {
    expect(joinContentText(undefined)).toBe('');
  });

  it('joins nested content.text values', () => {
    const result = makeResult({
      content: [
        { type: 'text', content: { type: 'text', text: 'line1' } },
        { type: 'text', content: { type: 'text', text: 'line2' } },
      ],
    });
    expect(joinContentText(result)).toBe('line1\nline2');
  });
});

describe('extractOutputText', () => {
  it('returns empty string for undefined result', () => {
    expect(extractOutputText(undefined)).toBe('');
  });

  it('returns rawOutput string directly', () => {
    expect(extractOutputText(makeResult({ rawOutput: 'hello world' }))).toBe('hello world');
  });

  it('JSON-stringifies object rawOutput', () => {
    const result = makeResult({ rawOutput: { key: 'val' } });
    expect(extractOutputText(result)).toContain('"key"');
  });

  it('truncates long output', () => {
    const longText = 'x'.repeat(3000);
    const result = makeResult({ rawOutput: longText });
    const output = extractOutputText(result);
    expect(output.length).toBeLessThan(longText.length);
    expect(output).toContain('(truncated)');
  });
});

describe('extractShellOutput', () => {
  it('joins stdout and stderr', () => {
    const result = makeResult({ rawOutput: { stdout: 'out', stderr: 'err' } });
    expect(extractShellOutput(result)).toBe('out\nerr');
  });

  it('handles string rawOutput', () => {
    expect(extractShellOutput(makeResult({ rawOutput: 'direct' }))).toBe('direct');
  });

  it('falls back to content text', () => {
    const result = makeResult({
      content: [{ type: 'text', content: { type: 'text', text: 'fallback' } }],
    });
    expect(extractShellOutput(result)).toBe('fallback');
  });
});

describe('looksLikeDiff', () => {
  it('detects unified diff format', () => {
    expect(looksLikeDiff('--- a/file\n+++ b/file\n@@ -1 +1 @@')).toBe(true);
  });

  it('rejects plain text', () => {
    expect(looksLikeDiff('hello world')).toBe(false);
  });
});

describe('extractDiff', () => {
  it('returns null for undefined result', () => {
    expect(extractDiff(undefined)).toBeNull();
  });

  it('extracts diff from rawOutput string', () => {
    const diff = '--- a\n+++ b\n@@ -1 +1 @@\n-old\n+new';
    expect(extractDiff(makeResult({ rawOutput: diff }))).toBe(diff);
  });

  it('returns null when no diff-like content', () => {
    expect(extractDiff(makeResult({ rawOutput: 'plain text' }))).toBeNull();
  });
});

describe('extractRawNumber', () => {
  it('extracts numeric field by key', () => {
    expect(extractRawNumber(makeResult({ rawOutput: { exit_code: 0 } }), ['exit_code'])).toBe(0);
  });

  it('tries keys in order', () => {
    expect(extractRawNumber(makeResult({ rawOutput: { total: 42 } }), ['count', 'total'])).toBe(42);
  });

  it('returns null for missing keys', () => {
    expect(extractRawNumber(makeResult({ rawOutput: { other: 1 } }), ['count'])).toBeNull();
  });

  it('returns null for undefined result', () => {
    expect(extractRawNumber(undefined, ['count'])).toBeNull();
  });
});

describe('extractRawString', () => {
  it('extracts string field by key', () => {
    expect(extractRawString(makeResult({ rawOutput: { file: '/a.ts' } }), ['file'])).toBe('/a.ts');
  });

  it('returns null when key holds non-string', () => {
    expect(extractRawString(makeResult({ rawOutput: { file: 42 } }), ['file'])).toBeNull();
  });
});

describe('extractRawArray', () => {
  it('extracts array field', () => {
    const arr = [{ url: 'http://a.com' }];
    expect(extractRawArray(makeResult({ rawOutput: { results: arr } }), ['results'])).toEqual(arr);
  });

  it('returns empty array when missing', () => {
    expect(extractRawArray(makeResult({ rawOutput: { other: 1 } }), ['results'])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// truncation-limits
// ---------------------------------------------------------------------------

describe('truncation constants', () => {
  it('has expected tier values', () => {
    expect(HEADER_TRUNCATION_LIMIT).toBe(80);
    expect(INPUT_TRUNCATION_LIMIT).toBe(120);
    expect(PREVIEW_TRUNCATION_LIMIT).toBe(500);
    expect(OUTPUT_TRUNCATION_LIMIT).toBe(2000);
    expect(MAX_DISPLAY_ITEMS).toBe(10);
  });
});

describe('truncateText', () => {
  it('returns short text unchanged', () => {
    expect(truncateText('hello', 100)).toBe('hello');
  });

  it('truncates and appends suffix', () => {
    const result = truncateText('abcdef', 3);
    expect(result).toBe('abc' + TRUNCATION_SUFFIX);
  });
});

describe('truncateInline', () => {
  it('returns short text unchanged', () => {
    expect(truncateInline('short')).toBe('short');
  });

  it('truncates with ellipsis', () => {
    const long = 'x'.repeat(200);
    const result = truncateInline(long);
    expect(result.length).toBe(INPUT_TRUNCATION_LIMIT + INLINE_TRUNCATION_SUFFIX.length);
    expect(result.endsWith(INLINE_TRUNCATION_SUFFIX)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// tool-icons
// ---------------------------------------------------------------------------

describe('toolStatusIcon', () => {
  it('returns checkmark for completed', () => {
    expect(toolStatusIcon('completed')).toBe('\u2713');
  });

  it('returns cross for failed', () => {
    expect(toolStatusIcon('failed')).toBe('\u2717');
  });

  it('returns circle for in_progress', () => {
    expect(toolStatusIcon('in_progress')).toBe('\u25CB');
  });

  it('returns circle for pending', () => {
    expect(toolStatusIcon('pending')).toBe('\u25CB');
  });
});

describe('todoStatusIcon', () => {
  it('returns half circle for in_progress', () => {
    expect(todoStatusIcon('in_progress')).toBe('\u25D4');
  });

  it('returns checkmark for completed', () => {
    expect(todoStatusIcon('completed')).toBe('\u2713');
  });

  it('returns cross for cancelled', () => {
    expect(todoStatusIcon('cancelled')).toBe('\u2717');
  });

  it('returns empty circle for pending', () => {
    expect(todoStatusIcon('pending')).toBe('\u25CB');
  });

  it('returns empty circle for unknown status', () => {
    expect(todoStatusIcon('unknown')).toBe('\u25CB');
  });
});

describe('arrowIcon', () => {
  it('is a right arrow', () => {
    expect(arrowIcon).toBe('\u2192');
  });
});
