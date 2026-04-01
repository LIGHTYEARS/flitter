import { describe, test, expect, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pruneOldLogs } from '../logger';

describe('pruneOldLogs', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      try { rmSync(tempDir, { recursive: true }); } catch { /* best effort */ }
    }
  });

  function createTempLogDir(): string {
    tempDir = mkdtempSync(join(tmpdir(), 'flitter-log-test-'));
    return tempDir;
  }

  function dateStr(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  test('deletes log files older than retention period', () => {
    const dir = createTempLogDir();
    writeFileSync(join(dir, `amp-${dateStr(10)}.log`), 'old');
    writeFileSync(join(dir, `amp-${dateStr(3)}.log`), 'recent');
    writeFileSync(join(dir, `amp-${dateStr(0)}.log`), 'today');

    pruneOldLogs(dir, 7);

    const remaining = readdirSync(dir);
    expect(remaining).toContain(`amp-${dateStr(3)}.log`);
    expect(remaining).toContain(`amp-${dateStr(0)}.log`);
    expect(remaining).not.toContain(`amp-${dateStr(10)}.log`);
  });

  test('does not delete non-matching files', () => {
    const dir = createTempLogDir();
    writeFileSync(join(dir, `amp-${dateStr(10)}.log`), 'old');
    writeFileSync(join(dir, 'other-file.txt'), 'keep');
    writeFileSync(join(dir, 'amp-not-a-date.log'), 'keep');

    pruneOldLogs(dir, 7);

    const remaining = readdirSync(dir);
    expect(remaining).toContain('other-file.txt');
    expect(remaining).toContain('amp-not-a-date.log');
  });

  test('retentionDays=0 skips cleanup', () => {
    const dir = createTempLogDir();
    writeFileSync(join(dir, `amp-${dateStr(100)}.log`), 'ancient');

    pruneOldLogs(dir, 0);

    const remaining = readdirSync(dir);
    expect(remaining).toContain(`amp-${dateStr(100)}.log`);
  });

  test('handles empty directory gracefully', () => {
    const dir = createTempLogDir();
    expect(() => pruneOldLogs(dir, 7)).not.toThrow();
  });
});
