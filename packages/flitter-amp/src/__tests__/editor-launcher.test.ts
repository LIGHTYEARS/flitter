// Tests for EditorLauncher utility
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { resolveEditor } from '../utils/editor-launcher';

describe('resolveEditor', () => {
  let originalVisual: string | undefined;
  let originalEditor: string | undefined;

  beforeEach(() => {
    originalVisual = process.env.VISUAL;
    originalEditor = process.env.EDITOR;
  });

  afterEach(() => {
    // Restore original environment
    if (originalVisual !== undefined) {
      process.env.VISUAL = originalVisual;
    } else {
      delete process.env.VISUAL;
    }
    if (originalEditor !== undefined) {
      process.env.EDITOR = originalEditor;
    } else {
      delete process.env.EDITOR;
    }
  });

  it('should prefer $VISUAL when set', () => {
    process.env.VISUAL = 'code --wait';
    process.env.EDITOR = 'vim';
    expect(resolveEditor()).toBe('code --wait');
  });

  it('should fall back to $EDITOR when $VISUAL is unset', () => {
    delete process.env.VISUAL;
    process.env.EDITOR = 'nano';
    expect(resolveEditor()).toBe('nano');
  });

  it('should fall back to vi when both are unset (on non-Windows)', () => {
    delete process.env.VISUAL;
    delete process.env.EDITOR;
    // On Linux (our platform), should fall back to 'vi'
    expect(resolveEditor()).toBe('vi');
  });

  it('should return empty string VISUAL as truthy (edge case)', () => {
    // An empty VISUAL is falsy, so it should fall through
    process.env.VISUAL = '';
    process.env.EDITOR = 'emacs';
    expect(resolveEditor()).toBe('emacs');
  });
});
