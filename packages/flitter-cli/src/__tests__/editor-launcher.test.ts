// Tests for editor-launcher utility (I9).
//
// These tests verify the temp file creation/reading logic and environment
// variable resolution. Bun.spawn is tested indirectly via a trivial
// editor substitute using `sed` and `tee`.

import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import { launchEditor } from '../utils/editor-launcher';
import { writeFileSync, unlinkSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('launchEditor (I9)', () => {
  const origEditor = process.env.EDITOR;
  const origVisual = process.env.VISUAL;

  // A small script that acts as a fake editor: appends " edited" to the file
  const fakeEditorPath = join(tmpdir(), 'fake-editor.sh');

  beforeEach(() => {
    writeFileSync(fakeEditorPath, '#!/bin/sh\necho " edited" >> "$1"\n', 'utf-8');
    chmodSync(fakeEditorPath, 0o755);
  });

  afterEach(() => {
    // Restore original env
    if (origEditor !== undefined) process.env.EDITOR = origEditor;
    else delete process.env.EDITOR;
    if (origVisual !== undefined) process.env.VISUAL = origVisual;
    else delete process.env.VISUAL;

    try { unlinkSync(fakeEditorPath); } catch { /* ignore */ }
  });

  it('creates temp file and returns edited content', async () => {
    const result = await launchEditor('original', fakeEditorPath);

    // The fake editor appends " edited\n" to the file
    expect(result.success).toBe(true);
    expect(result.text).not.toBeNull();
    expect(result.text).toContain('original');
    expect(result.text).toContain('edited');
  });

  it('returns success with unchanged content when editor is no-op', async () => {
    // Use "true" as the editor -- it does nothing, file remains unchanged
    // EditorResult always returns the text on success (even if unchanged)
    const result = await launchEditor('unchanged content', 'true');
    expect(result.success).toBe(true);
    expect(result.text).toBe('unchanged content');
  });

  it('uses EDITOR env var', async () => {
    // Set EDITOR to "true" (no-op editor)
    process.env.EDITOR = 'true';
    delete process.env.VISUAL;

    const result = await launchEditor('test content');
    // "true" doesn't modify the file — success with unchanged text
    expect(result.success).toBe(true);
    expect(result.text).toBe('test content');
  });

  it('prefers VISUAL over EDITOR (AMP-aligned priority)', async () => {
    // Set VISUAL to our fake editor (appends " edited") and EDITOR to "true" (no-op)
    process.env.VISUAL = fakeEditorPath;
    process.env.EDITOR = 'true';

    const result = await launchEditor('priority test');
    // If VISUAL is used, the fake editor modifies the file
    expect(result.success).toBe(true);
    expect(result.text).toContain('priority test');
    expect(result.text).toContain('edited');
  });

  it('falls back to EDITOR when VISUAL is not set', async () => {
    delete process.env.VISUAL;
    process.env.EDITOR = fakeEditorPath;

    const result = await launchEditor('fallback test');
    expect(result.success).toBe(true);
    expect(result.text).toContain('fallback test');
    expect(result.text).toContain('edited');
  });

  it('returns failure when editor exits non-zero', async () => {
    const result = await launchEditor('will fail', 'false');
    expect(result.success).toBe(false);
    expect(result.text).toBeNull();
  });
});
