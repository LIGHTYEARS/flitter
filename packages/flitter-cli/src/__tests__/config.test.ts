import { describe, expect, it } from 'bun:test';

import { parseArgs } from '../state/config';

describe('parseArgs', () => {
  it('parses cwd, editor, and debug flag for scaffold shell', () => {
    const config = parseArgs([
      'bun',
      'src/index.ts',
      '--cwd',
      '/tmp/project',
      '--editor',
      'nvim',
      '--debug',
    ]);

    expect(config.cwd).toBe('/tmp/project');
    expect(config.editor).toBe('nvim');
    expect(config.logLevel).toBe('debug');
    expect(config.logRetentionDays).toBe(7);
  });
});
