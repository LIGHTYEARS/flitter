// Core tool executor tests — verifies Bash, Read, Write, Edit, Grep, Glob executors.

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BashExecutor } from '../tools/bash-executor';
import type { BashStreamEvent } from '../state/types';
import { ReadExecutor } from '../tools/read-executor';
import { WriteExecutor } from '../tools/write-executor';
import { EditExecutor } from '../tools/edit-executor';
import { GrepExecutor } from '../tools/grep-executor';
import { GlobExecutor } from '../tools/glob-executor';
import type { ToolContext } from '../tools/executor';

// Create a temp directory for each test suite
const TEST_DIR = join(tmpdir(), `flitter-tool-test-${Date.now()}`);

function ctx(): ToolContext {
  return { cwd: TEST_DIR };
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch { /* ignore */ }
});

// ---------------------------------------------------------------------------
// Bash
// ---------------------------------------------------------------------------

describe('BashExecutor', () => {
  const bash = new BashExecutor();

  test('executes a simple command', async () => {
    const result = await bash.execute({ command: 'echo hello' }, ctx());
    expect(result.content.trim()).toBe('hello');
    expect(result.isError).toBeFalsy();
  });

  test('returns error for missing command', async () => {
    const result = await bash.execute({}, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('command parameter');
  });

  test('captures exit code on failure', async () => {
    const result = await bash.execute({ command: 'exit 42' }, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('42');
  });

  test('respects working directory', async () => {
    const result = await bash.execute({ command: 'pwd' }, ctx());
    expect(result.content.trim()).toBe(TEST_DIR);
  });

  test('captures stderr', async () => {
    const result = await bash.execute({ command: 'echo err >&2' }, ctx());
    expect(result.content).toContain('err');
  });

  test('respects abort signal', async () => {
    const ac = new AbortController();
    ac.abort();
    const result = await bash.execute(
      { command: 'sleep 10' },
      { ...ctx(), abortSignal: ac.signal },
    );
    expect(result.isError).toBe(true);
    expect(result.content).toContain('aborted');
  });
});

// ---------------------------------------------------------------------------
// BashExecutor.subscribe (Observable-style API matching AMP)
// ---------------------------------------------------------------------------

describe('BashExecutor.subscribe', () => {
  const bash = new BashExecutor();

  function subscribeCollect(
    input: { command?: string; timeout?: number },
    context: ToolContext,
  ): Promise<{ events: BashStreamEvent[]; completed: boolean; error?: Error }> {
    return new Promise((resolve) => {
      const events: BashStreamEvent[] = [];
      let completed = false;
      bash.subscribe(
        input as { command: string },
        context,
        {
          next: (event) => { events.push(event); },
          error: (err) => { resolve({ events, completed, error: err }); },
          complete: () => { completed = true; resolve({ events, completed }); },
        },
      );
    });
  }

  test('calls next with result then complete for a simple command', async () => {
    const { events, completed } = await subscribeCollect({ command: 'echo hello' }, ctx());
    expect(completed).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(1);
    const result = events.find(e => e.type === 'result');
    expect(result).toBeDefined();
    expect(result!.type === 'result' && result!.content.trim()).toBe('hello');
    expect(result!.type === 'result' && result!.isError).toBe(false);
  });

  test('calls next with error result for failing command', async () => {
    const { events, completed } = await subscribeCollect({ command: 'exit 42' }, ctx());
    expect(completed).toBe(true);
    const result = events.find(e => e.type === 'result');
    expect(result).toBeDefined();
    expect(result!.type === 'result' && result!.isError).toBe(true);
    expect(result!.type === 'result' && result!.content).toContain('42');
  });

  test('calls next with error for missing command then complete', async () => {
    const { events, completed } = await subscribeCollect({}, ctx());
    expect(completed).toBe(true);
    const result = events.find(e => e.type === 'result');
    expect(result).toBeDefined();
    expect(result!.type === 'result' && result!.isError).toBe(true);
    expect(result!.type === 'result' && result!.content).toContain('command parameter');
  });

  test('respects abort signal', async () => {
    const ac = new AbortController();
    ac.abort();
    const { events, completed } = await subscribeCollect(
      { command: 'sleep 10' },
      { ...ctx(), abortSignal: ac.signal },
    );
    expect(completed).toBe(true);
    const result = events.find(e => e.type === 'result');
    expect(result).toBeDefined();
    expect(result!.type === 'result' && result!.isError).toBe(true);
    expect(result!.type === 'result' && result!.content).toContain('aborted');
  });

  test('is non-blocking — returns void immediately', () => {
    let nextCalled = false;
    // subscribe should return synchronously without waiting for the command
    bash.subscribe(
      { command: 'echo test' },
      ctx(),
      {
        next: () => { nextCalled = true; },
        error: () => {},
        complete: () => {},
      },
    );
    // At this point the command hasn't completed yet — subscribe is fire-and-forget
    expect(nextCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

describe('ReadExecutor', () => {
  const read = new ReadExecutor();

  test('reads a file with line numbers', async () => {
    const fp = join(TEST_DIR, 'test.txt');
    writeFileSync(fp, 'line1\nline2\nline3\n');

    const result = await read.execute({ file_path: fp }, ctx());
    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('line1');
    expect(result.content).toContain('line2');
    expect(result.content).toContain('line3');
    // Check line numbers are present
    expect(result.content).toMatch(/1\t/);
    expect(result.content).toMatch(/2\t/);
  });

  test('returns error for missing file', async () => {
    const result = await read.execute({ file_path: '/nonexistent/path' }, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not found');
  });

  test('returns error for directory', async () => {
    const result = await read.execute({ file_path: TEST_DIR }, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('directory');
  });

  test('supports offset and limit', async () => {
    const fp = join(TEST_DIR, 'lines.txt');
    writeFileSync(fp, 'a\nb\nc\nd\ne\n');

    const result = await read.execute({ file_path: fp, offset: 2, limit: 2 }, ctx());
    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('b');
    expect(result.content).toContain('c');
    expect(result.content).not.toContain('\ta\n');
    expect(result.content).not.toContain('\td\n');
  });

  test('handles empty file', async () => {
    const fp = join(TEST_DIR, 'empty.txt');
    writeFileSync(fp, '');

    const result = await read.execute({ file_path: fp }, ctx());
    expect(result.content).toContain('empty');
  });
});

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

describe('WriteExecutor', () => {
  const write = new WriteExecutor();

  test('creates a new file', async () => {
    const fp = join(TEST_DIR, 'new.txt');
    const result = await write.execute({ file_path: fp, content: 'hello world\n' }, ctx());
    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('Created');
    expect(readFileSync(fp, 'utf-8')).toBe('hello world\n');
  });

  test('overwrites existing file', async () => {
    const fp = join(TEST_DIR, 'existing.txt');
    writeFileSync(fp, 'old content');
    const result = await write.execute({ file_path: fp, content: 'new content' }, ctx());
    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('Updated');
    expect(readFileSync(fp, 'utf-8')).toBe('new content');
  });

  test('creates parent directories', async () => {
    const fp = join(TEST_DIR, 'sub', 'dir', 'file.txt');
    const result = await write.execute({ file_path: fp, content: 'nested' }, ctx());
    expect(result.isError).toBeFalsy();
    expect(readFileSync(fp, 'utf-8')).toBe('nested');
  });

  test('returns error for missing parameters', async () => {
    const result = await write.execute({ file_path: '/tmp/x' }, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('content parameter');
  });
});

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

describe('EditExecutor', () => {
  const edit = new EditExecutor();

  test('replaces unique string', async () => {
    const fp = join(TEST_DIR, 'edit.txt');
    writeFileSync(fp, 'hello world');
    const result = await edit.execute({
      file_path: fp,
      old_string: 'world',
      new_string: 'earth',
    }, ctx());
    expect(result.isError).toBeFalsy();
    expect(readFileSync(fp, 'utf-8')).toBe('hello earth');
  });

  test('errors on non-unique string', async () => {
    const fp = join(TEST_DIR, 'dup.txt');
    writeFileSync(fp, 'foo bar foo');
    const result = await edit.execute({
      file_path: fp,
      old_string: 'foo',
      new_string: 'baz',
    }, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not unique');
  });

  test('replace_all replaces all occurrences', async () => {
    const fp = join(TEST_DIR, 'all.txt');
    writeFileSync(fp, 'foo bar foo baz foo');
    const result = await edit.execute({
      file_path: fp,
      old_string: 'foo',
      new_string: 'qux',
      replace_all: true,
    }, ctx());
    expect(result.isError).toBeFalsy();
    expect(readFileSync(fp, 'utf-8')).toBe('qux bar qux baz qux');
    expect(result.content).toContain('3 replacements');
  });

  test('errors when old_string not found', async () => {
    const fp = join(TEST_DIR, 'nope.txt');
    writeFileSync(fp, 'hello');
    const result = await edit.execute({
      file_path: fp,
      old_string: 'world',
      new_string: 'earth',
    }, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not found');
  });

  test('errors when file does not exist', async () => {
    const result = await edit.execute({
      file_path: '/nonexistent',
      old_string: 'a',
      new_string: 'b',
    }, ctx());
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Grep
// ---------------------------------------------------------------------------

describe('GrepExecutor', () => {
  const grep = new GrepExecutor();

  test('finds pattern in files', async () => {
    writeFileSync(join(TEST_DIR, 'a.txt'), 'hello world');
    writeFileSync(join(TEST_DIR, 'b.txt'), 'goodbye');

    const result = await grep.execute({
      pattern: 'hello',
      path: TEST_DIR,
      output_mode: 'files_with_matches',
    }, ctx());
    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('a.txt');
    expect(result.content).not.toContain('b.txt');
  });

  test('returns no matches message', async () => {
    writeFileSync(join(TEST_DIR, 'c.txt'), 'nothing here');

    const result = await grep.execute({
      pattern: 'zzzzz',
      path: TEST_DIR,
    }, ctx());
    expect(result.content).toContain('No matches');
  });

  test('errors on missing pattern', async () => {
    const result = await grep.execute({}, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('pattern');
  });
});

// ---------------------------------------------------------------------------
// Glob
// ---------------------------------------------------------------------------

describe('GlobExecutor', () => {
  const glob = new GlobExecutor();

  test('finds files by pattern', async () => {
    writeFileSync(join(TEST_DIR, 'app.ts'), '');
    writeFileSync(join(TEST_DIR, 'app.js'), '');
    writeFileSync(join(TEST_DIR, 'readme.md'), '');

    const result = await glob.execute({ pattern: '*.ts', path: TEST_DIR }, ctx());
    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('app.ts');
    expect(result.content).not.toContain('readme.md');
  });

  test('returns no files message when no matches', async () => {
    const result = await glob.execute({ pattern: '*.xyz', path: TEST_DIR }, ctx());
    expect(result.content).toContain('No files found');
  });

  test('errors on missing pattern', async () => {
    const result = await glob.execute({}, ctx());
    expect(result.isError).toBe(true);
    expect(result.content).toContain('pattern');
  });

  test('finds files in subdirectories', async () => {
    mkdirSync(join(TEST_DIR, 'sub'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'sub', 'deep.ts'), '');

    const result = await glob.execute({ pattern: '**/*.ts', path: TEST_DIR }, ctx());
    expect(result.isError).toBeFalsy();
    expect(result.content).toContain('deep.ts');
  });
});
